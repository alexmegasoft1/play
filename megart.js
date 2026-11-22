/* ميجا: قناة فورية بين الموبايل/اللوحة والشاشة عبر وسيط رسائل عام (MQTT فوق WebSocket).
 * لا تمر عبر سيرفر لوحة التحكم. كل رسالة موقّعة بمفتاح الشاشة السري (HMAC-SHA256)،
 * فلا تقبل الشاشة أمرًا إلا ممن يملك المفتاح. */
(function (g) {
  'use strict';
  var BROKERS = ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt'];
  var te = new TextEncoder();

  function u8(arr) { return new Uint8Array(arr); }
  function strBytes(s) { var b = te.encode(s); return [b.length >> 8, b.length & 255].concat(Array.prototype.slice.call(b)); }
  function remLen(n) { var o = []; do { var d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; o.push(d); } while (n > 0); return o; }
  function packet(type, body) { return u8([type].concat(remLen(body.length), body)); }
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }

  /** موضوع القناة مشتق من المفتاح، فلا يظهر المفتاح نفسه للوسيط. */
  function topicOf(rk) {
    return crypto.subtle.digest('SHA-256', te.encode(rk)).then(function (h) { return 'megatv/' + hex(h).slice(0, 32); });
  }

  function MegaRT(rk, opts) {
    opts = opts || {};
    this.rk = rk;
    this.brokers = opts.brokers || g.MEGA_RT_BROKERS || BROKERS;
    this.onstate = opts.onstate || function () {};
    this.onstatus = opts.onstatus || function () {};
    /* سيرفر لوحة التحكم: طريق احتياطي إن تعذّرت القناة الفورية أو لم تكن الشاشة متصلة بها */
    this.server = (opts.server || '').replace(/\/+$/, '');
    this.tvAt = 0;
    this.status = null;
    this.ws = null;
    this.up = false;
    this.bi = 0;
    this.pid = 1;
    this.queue = [];
    this.stopped = false;
    var self = this;
    this.ready = Promise.all([
      topicOf(rk),
      crypto.subtle.importKey('raw', te.encode(rk), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
    ]).then(function (r) { self.topic = r[0]; self.key = r[1]; });
    this.ready.then(function () { self._open(); });
  }

  MegaRT.prototype._open = function () {
    if (this.stopped) return;
    var self = this, url = this.brokers[this.bi % this.brokers.length];
    var ws;
    try { ws = new WebSocket(url, ['mqtt']); } catch (e) { return this._retry(); }
    ws.binaryType = 'arraybuffer';
    this.ws = ws;
    var timer = setTimeout(function () { try { ws.close(); } catch (e) {} }, 8000);
    ws.onopen = function () {
      var id = 'mega-r-' + Math.random().toString(36).slice(2, 10);
      var body = strBytes('MQTT').concat([4, 2, 0, 60], strBytes(id));
      ws.send(packet(0x10, body));
    };
    ws.onmessage = function (ev) {
      var b = new Uint8Array(ev.data);
      if ((b[0] >> 4) === 2 && b[3] === 0) {
        clearTimeout(timer);
        self.up = true;
        self.onstate(true, url);
        self._ping = setInterval(function () { try { ws.send(u8([0xC0, 0])); } catch (e) {} }, 25000);
        // الاشتراك في حالة الشاشة، ثم طلبها فورًا
        ws.send(packet(0x82, [0, 1].concat(strBytes(self.topic + '/s'), [0])));
        var q = self.queue; self.queue = [];
        q.forEach(function (m) { self._pub(m); });
        self.send('hello', {});
        return;
      }
      if ((b[0] >> 4) === 3) self._incoming(b);
    };
    ws.onclose = ws.onerror = function () {
      clearTimeout(timer);
      clearInterval(self._ping);
      if (self.ws !== ws) return;
      self.ws = null;
      if (self.up) { self.up = false; self.onstate(false, url); }
      self.bi++;
      self._retry();
    };
  };

  /** رسالة من الشاشة (حالتها): نتحقق من توقيعها قبل قبولها. */
  MegaRT.prototype._incoming = function (b) {
    var self = this, i = 1, len = 0, mul = 1, c;
    do { c = b[i++]; len += (c & 127) * mul; mul *= 128; } while (c & 128);
    var tl = (b[i] << 8) | b[i + 1];
    var topic = new TextDecoder().decode(b.slice(i + 2, i + 2 + tl));
    var qos = (b[0] >> 1) & 3;
    var off = i + 2 + tl + (qos ? 2 : 0);
    if (topic !== this.topic + '/s') return;
    var env;
    try { env = JSON.parse(new TextDecoder().decode(b.slice(off))); } catch (e) { return; }
    if (!env || !env.m || !env.s) return;
    var sig = new Uint8Array(env.s.match(/../g).map(function (h) { return parseInt(h, 16); }));
    crypto.subtle.verify('HMAC', this.key, sig, te.encode(env.m)).then(function (ok) {
      if (!ok) return;
      var st = JSON.parse(env.m);
      self.tvAt = Date.now();
      self.status = st;
      self.onstatus(st);
    });
  };

  /** هل الشاشة متصلة بالقناة الآن؟ (وصلت حالتها خلال آخر ٤٥ ثانية) */
  MegaRT.prototype.live = function () { return this.up && Date.now() - this.tvAt < 45000; };

  /** إرسال عبر السيرفر (احتياطي): نفس الرسالة الموقّعة، ويتحقق منها السيرفر بمفتاح الشاشة. */
  MegaRT.prototype.viaServer = function (c, p, file) {
    var self = this;
    if (!this.server) return Promise.reject('لا يوجد طريق احتياطي');
    return this._sign(c, p).then(function (env) {
      var fd = new FormData();
      fd.append('tid', self.topic.slice(7));
      fd.append('env', env);
      if (file) fd.append('audio', file, file.name || 'voice.webm');
      return fetch(self.server + '/api/rt.php', { method: 'POST', body: fd }).then(function (r) { return r.json(); });
    }).then(function (res) {
      if (!res || !res.ok) throw (res && res.error) || 'تعذّر الإرسال';
      if (res.status) { self.status = res.status; self.onstatus(res.status, true); }
      return res;
    });
  };

  /** الإرسال الذكي: القناة الفورية إن كانت الشاشة متصلة بها، وإلا السيرفر. */
  MegaRT.prototype.smart = function (c, p) {
    var self = this;
    if (this.live()) return this.send(c, p, true).then(function (ok) { return ok ? 'rt' : self.viaServer(c, p).then(function () { return 'server'; }); });
    return this.viaServer(c, p).then(function () { return 'server'; });
  };

  MegaRT.prototype._retry = function () {
    var self = this;
    if (!this.stopped) setTimeout(function () { self._open(); }, 1500);
  };

  MegaRT.prototype._pub = function (text) {
    var body = strBytes(this.topic).concat(Array.prototype.slice.call(te.encode(text)));
    this.ws.send(packet(0x30, body));
  };

  /** إرسال أمر للشاشة: c نوع الأمر (key، cursor، type، nudge…) و p بياناته. يعيد true إن أُرسل فورًا.
   *  noQueue: لا تؤجل إن كانت القناة مقطوعة (ليستخدم المرسل طريقًا بديلًا). */
  MegaRT.prototype._sign = function (c, p) {
    var self = this;
    var m = JSON.stringify({ c: c, p: p || {}, t: Date.now(), n: Math.random().toString(36).slice(2, 12) });
    return this.ready.then(function () {
      return crypto.subtle.sign('HMAC', self.key, te.encode(m));
    }).then(function (sig) { return JSON.stringify({ m: m, s: hex(sig) }); });
  };

  MegaRT.prototype.send = function (c, p, noQueue) {
    var self = this;
    return this._sign(c, p).then(function (env) {
      if (self.up && self.ws) { self._pub(env); return true; }
      if (noQueue) return false;
      self.queue.push(env);
      if (self.queue.length > 20) self.queue.shift();
      return false;
    });
  };

  MegaRT.prototype.stop = function () {
    this.stopped = true;
    try { if (this.ws) this.ws.close(); } catch (e) {}
  };

  g.MegaRT = MegaRT;
})(window);
