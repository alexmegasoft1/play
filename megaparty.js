/* ميجا: اللعب الجماعي عبر الإنترنت. يد اللعب على الموبايل تتصل بالشاشة عبر وسيط رسائل عام (MQTT فوق WebSocket)
 * بدل الشبكة المحلية، فتعمل مع أي راوتر وأي شبكة. كل رسالة مشفّرة وموقّعة بمفتاح الألعاب الموجود في الرمز فقط،
 * فلا يرى الوسيط الأسماء ولا الصور، ولا يستطيع أحد حقن رسائل.
 * MegaParty.socket() يعيد كائنًا بنفس واجهة WebSocket التي تستخدمها صفحة اللعب. */
(function (g) {
  'use strict';
  var BROKERS = g.MEGA_RT_BROKERS || ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt'];
  var te = new TextEncoder(), td = new TextDecoder();
  var S = crypto.subtle;

  function u8(a) { return new Uint8Array(a); }
  function strBytes(s) { var b = te.encode(s); return [b.length >> 8, b.length & 255].concat(Array.prototype.slice.call(b)); }
  function remLen(n) { var o = []; do { var d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; o.push(d); } while (n > 0); return o; }
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function b64(bytes) { var s = ''; for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
  function unb64(s) { var r = atob(s), o = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) o[i] = r.charCodeAt(i); return o; }
  function hmacKey(raw) { return S.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); }
  function sign(k, data) { return S.sign('HMAC', k, data).then(function (b) { return new Uint8Array(b); }); }
  function pkt(type, body) {
    var len = remLen(body.length), out = new Uint8Array(1 + len.length + body.length);
    out[0] = type; out.set(len, 1); out.set(body, 1 + len.length); return out;
  }
  function concat(a, b) { var o = new Uint8Array(a.length + b.length); o.set(a, 0); o.set(b, a.length); return o; }

  var P = {
    pk: '', hp: '', cid: '', enc: null, mac: null, ready: null,
    ws: null, up: false, bi: 0, outSeq: Date.now(), inSeq: 0, chain: Promise.resolve(), sock: null,
    onstate: function () {}
  };

  P.init = function (pk) {
    P.pk = pk;
    try { P.cid = sessionStorage.getItem('mega_cid') || ''; } catch (e) {}
    if (!/^[a-z0-9]{12}$/.test(P.cid)) {
      P.cid = Array.prototype.map.call(crypto.getRandomValues(new Uint8Array(12)), function (b) { return 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]; }).join('');
      try { sessionStorage.setItem('mega_cid', P.cid); } catch (e) {}
    }
    P.ready = hmacKey(te.encode(pk)).then(function (k) {
      return Promise.all([sign(k, te.encode('enc')), sign(k, te.encode('mac')), S.digest('SHA-256', te.encode('party:' + pk))]);
    }).then(function (r) {
      P.hp = hex(r[2]).slice(0, 32);
      return Promise.all([hmacKey(r[0]), hmacKey(r[1])]);
    }).then(function (k) { P.enc = k[0]; P.mac = k[1]; P._open(); });
    return P.ready;
  };

  P.topicIn = function () { return 'megap/' + P.hp; };
  P.topicMe = function () { return 'megap/' + P.hp + '/' + P.cid; };

  /* ---------- التشفير: HMAC-SHA256 في وضع العدّاد، ثم توقيع ---------- */
  P._xor = function (data, iv) {
    var n = Math.ceil(data.length / 32), jobs = [];
    for (var j = 0; j < n; j++) {
      var blk = new Uint8Array(16); blk.set(iv, 0);
      blk[12] = (j >>> 24) & 255; blk[13] = (j >>> 16) & 255; blk[14] = (j >>> 8) & 255; blk[15] = j & 255;
      jobs.push(sign(P.enc, blk));
    }
    return Promise.all(jobs).then(function (ks) {
      var out = new Uint8Array(data.length);
      for (var o = 0; o < data.length; o++) out[o] = data[o] ^ ks[o >> 5][o & 31];
      return out;
    });
  };
  P._sig = function (dir, i, d) { return sign(P.mac, te.encode(dir + '.' + P.cid + '.' + i + '.' + d)).then(function (s) { return hex(s).slice(0, 32); }); };

  /** إرسال نص للشاشة بالترتيب (التشفير غير متزامن، فنمرّره في سلسلة). */
  P.send = function (text) {
    var seq = ++P.outSeq;
    P.chain = P.chain.then(function () {
      var iv = crypto.getRandomValues(new Uint8Array(12)), i = b64(iv);
      return P._xor(te.encode(seq + '|' + text), iv).then(function (ct) {
        var d = b64(ct);
        return P._sig('u', i, d).then(function (s) {
          if (!P.up || !P.ws) return false;
          P.ws.send(pkt(0x30, concat(u8(strBytes(P.topicIn())), te.encode(JSON.stringify({ c: P.cid, i: i, d: d, s: s })))));
          return true;
        });
      });
    }).catch(function () { return false; });
    return P.chain;
  };

  P._incoming = function (b) {
    var i = 1, len = 0, mul = 1, c;
    do { c = b[i++]; len += (c & 127) * mul; mul *= 128; } while (c & 128);
    var tl = (b[i] << 8) | b[i + 1];
    var topic = td.decode(b.subarray(i + 2, i + 2 + tl));
    var off = i + 2 + tl + (((b[0] >> 1) & 3) ? 2 : 0);
    if (topic !== P.topicMe()) return;
    var env;
    try { env = JSON.parse(td.decode(b.subarray(off))); } catch (e) { return; }
    if (!env || env.c !== P.cid || !env.i || !env.d) return;
    P._sig('d', env.i, env.d).then(function (s) {
      if (s !== env.s) return null;
      return P._xor(unb64(env.d), unb64(env.i));
    }).then(function (pt) {
      if (!pt) return;
      var txt = td.decode(pt), bar = txt.indexOf('|');
      var seq = parseInt(txt.slice(0, bar), 10);
      if (!(seq > P.inSeq)) return; // مكرر عبر الوسيطين أو معاد إرساله
      P.inSeq = seq;
      if (P.sock) P.sock._from(txt.slice(bar + 1));
    }).catch(function () {});
  };

  /* ---------- الاتصال بالوسيط ---------- */
  P._open = function () {
    var url = BROKERS[P.bi % BROKERS.length], ws;
    try { ws = new WebSocket(url, ['mqtt']); } catch (e) { P.bi++; return setTimeout(P._open, 1200); }
    ws.binaryType = 'arraybuffer';
    P.ws = ws;
    var t = setTimeout(function () { try { ws.close(); } catch (e) {} }, 7000), ping = null;
    ws.onopen = function () {
      var id = 'mega-p-' + P.cid.slice(0, 6) + Math.random().toString(36).slice(2, 7);
      ws.send(pkt(0x10, u8(strBytes('MQTT').concat([4, 2, 0, 60], strBytes(id)))));
    };
    ws.onmessage = function (ev) {
      var b = new Uint8Array(ev.data);
      var type = b[0] >> 4;
      if (type === 2 && b[3] === 0) {
        clearTimeout(t);
        ws.send(pkt(0x82, u8([0, 1].concat(strBytes(P.topicMe()), [0]))));
        ping = setInterval(function () { try { ws.send(u8([0xC0, 0])); } catch (e) {} }, 25000);
        return;
      }
      if (type === 9) { // SUBACK: صار بإمكان الشاشة الرد علينا
        if (!P.up) { P.up = true; P.onstate(true); if (P.sock) P.sock._brokerUp(); }
        return;
      }
      if (type === 3) P._incoming(b);
    };
    ws.onclose = ws.onerror = function () {
      clearTimeout(t); clearInterval(ping);
      if (P.ws !== ws) return;
      P.ws = null;
      if (P.up) { P.up = false; P.onstate(false); }
      if (P.sock) P.sock._brokerDown();
      P.bi++;
      setTimeout(P._open, 1200);
    };
  };

  /** إعادة الاتصال فورًا (مثلًا عند الرجوع للصفحة بعد غياب). */
  P.kick = function () { if (!P.up && P.ws) { try { P.ws.close(); } catch (e) {} } };

  /** كائن بواجهة WebSocket: readyState و send و close و onopen و onmessage و onclose. */
  P.socket = function () {
    if (P.sock) P.sock.close();
    var s = { readyState: 0, onopen: null, onmessage: null, onclose: null, _rx: Date.now(), _t: null, _ping: null };
    P.sock = s;
    function fin() {
      if (s.readyState === 3) return;
      s.readyState = 3;
      clearTimeout(s._t); clearInterval(s._ping);
      if (P.sock === s) P.sock = null;
      if (s.onclose) setTimeout(function () { s.onclose({}); }, 0);
    }
    s._brokerUp = function () {
      if (s.readyState !== 0) return;
      P.send('{"_":"open"}');
      clearTimeout(s._t);
      s._t = setTimeout(fin, 7000); // الشاشة لم ترد: غير متصلة بالإنترنت الآن
    };
    s._brokerDown = function () { fin(); };
    s._from = function (txt) {
      s._rx = Date.now();
      if (txt.charAt(0) === '{' && txt.indexOf('{"_"') === 0) {
        var c = ''; try { c = JSON.parse(txt)._; } catch (e) {}
        if (c === 'ok' && s.readyState === 0) {
          clearTimeout(s._t);
          s.readyState = 1;
          P.everOpen = true;
          s._ping = setInterval(function () {
            if (Date.now() - s._rx > 15000) { fin(); return; }
            P.send('{"_":"ping"}');
          }, 5000);
          if (s.onopen) s.onopen({});
        } else if (c === 'reset' || c === 'bye') fin();
        return;
      }
      if (s.readyState === 1 && s.onmessage) s.onmessage({ data: txt });
    };
    s.send = function (txt) { if (s.readyState === 1) P.send(String(txt)); };
    s.close = function () { if (s.readyState === 1) P.send('{"_":"bye"}'); fin(); };
    if (P.up) s._brokerUp();
    return s;
  };

  g.addEventListener('pagehide', function () { if (P.sock && P.sock.readyState === 1) P.send('{"_":"bye"}'); });
  g.MegaParty = P;
})(window);
