/* متحكم البلياردو على الموبايل: يظهر تلقائيًا حين تفتح الشاشةُ لعبةً تعلن MEGA_PAD = 'pool'.
   التصويب بعجلة دوّارة، والقوة بسحب العصا للخلف ثم الإفلات للضرب، والسبين بالنقر على الكرة. */
(function () {
  'use strict';
  function g(n) { return window[n]; }
  function send(o) { o.t = 'wp'; try { g('ws').send(JSON.stringify(o)); } catch (e) {} }
  function buzz(t) { if (navigator.vibrate) try { navigator.vibrate(t || 12); } catch (e) {} }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var css = document.createElement('style');
  css.textContent =
    '#pp{position:fixed;inset:0;z-index:60;display:none;background:radial-gradient(circle at 50% 40%,#0f5a36,#062716 70%,#03130b);color:#f1f3ee;font-family:inherit;user-select:none;-webkit-user-select:none;touch-action:none;overflow:hidden}' +
    '#pp.on{display:block}' +
    '#pp .top{position:absolute;top:0;left:0;right:0;height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;background:rgba(0,0,0,.35);border-bottom:1px solid rgba(255,255,255,.08)}' +
    '#pp .st{font-weight:800;font-size:17px}#pp .st.me{color:#7ff0ae}#pp .gr{font-size:13px;color:#cfe8d8;opacity:.85}' +
    '#pp .mb{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:8px 14px;font-weight:800;color:#fff;font-size:15px}' +
    '#pp .body{position:absolute;top:52px;left:0;right:0;bottom:0;display:grid;grid-template-columns:1.15fr .8fr 1fr;gap:10px;padding:10px 14px 14px}' +
    '#pp .col{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:0}' +
    '#pp .lbl{font-size:13px;color:#b8d6c4;font-weight:700}' +
    '#pp .dial{position:relative;width:min(40vw,62vh,270px);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 35% 30%,#3a3f45,#16191c 70%);border:3px solid #c9a24a;box-shadow:0 10px 30px rgba(0,0,0,.6),inset 0 0 0 10px rgba(255,255,255,.03)}' +
    '#pp .dial i{position:absolute;left:50%;top:4%;width:6px;height:14%;margin-left:-3px;border-radius:3px;background:#e9c46a}' +
    '#pp .dial b{position:absolute;inset:32%;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#ddd8c8 60%,#9b9586);box-shadow:0 4px 10px rgba(0,0,0,.5)}' +
    '#pp .fine{display:flex;gap:10px}#pp .fine button,#pp .dpad button,#pp .act{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:14px;font-weight:800;font-size:18px;min-width:58px;height:48px}' +
    '#pp .fine button.on{background:#e9c46a;color:#201700}' +
    '#pp .spin{position:relative;width:min(24vw,40vh,150px);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 34% 30%,#fff,#ece7d8 55%,#b9b3a2);box-shadow:0 6px 16px rgba(0,0,0,.55)}' +
    '#pp .spin:before,#pp .spin:after{content:"";position:absolute;background:rgba(0,0,0,.15)}#pp .spin:before{left:50%;top:10%;bottom:10%;width:1px}#pp .spin:after{top:50%;left:10%;right:10%;height:1px}' +
    '#pp .spin u{position:absolute;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:#e23b3b;border:2px solid #fff;left:50%;top:50%}' +
    '#pp .pw{position:relative;width:96px;flex:1;max-height:78vh;border-radius:24px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.15);overflow:hidden}' +
    '#pp .pw .fill{position:absolute;left:0;right:0;top:0;height:0;background:linear-gradient(#ffd166,#ef476f)}' +
    '#pp .pw .cue{position:absolute;left:50%;top:0;width:16px;height:70%;margin-left:-8px;border-radius:0 0 8px 8px;background:linear-gradient(#3f78c9 0 3%,#f4f2ea 3% 10%,#e2c088 10% 60%,#3d2113 60%);box-shadow:0 4px 10px rgba(0,0,0,.6)}' +
    '#pp .pw .val{position:absolute;bottom:8px;left:0;right:0;text-align:center;font-weight:900;font-size:20px;text-shadow:0 2px 4px #000}' +
    '#pp .pad{width:100%;flex:1;border-radius:22px;background:rgba(255,255,255,.06);border:2px dashed rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;text-align:center;color:#cfe8d8;font-weight:700;padding:10px}' +
    '#pp .act{width:100%;height:58px;font-size:20px;background:linear-gradient(#ffe08a,#e0aa38);color:#201700;border:0}' +
    '#pp .dpad{display:grid;grid-template-columns:repeat(3,72px);grid-template-rows:repeat(3,64px);gap:8px}#pp .dpad button{width:72px;height:64px;font-size:24px}' +
    '#pp .dpad .ok{background:#e9c46a;color:#201700;font-size:18px}' +
    '#pp .wait{position:absolute;inset:52px 0 0 0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.45);font-size:22px;font-weight:800;text-align:center;padding:20px}' +
    '#pp.dim .wait{display:flex}' +
    '#pp .rot{display:none}@media (orientation:portrait){#pp .body{grid-template-columns:1fr 1fr;grid-template-rows:1fr auto}#pp .c2{grid-column:1/3;grid-row:2;flex-direction:row}#pp .dial{width:min(44vw,250px)}#pp .pw{max-height:46vh}}';
  document.head.appendChild(css);

  var root = document.createElement('div');
  root.id = 'pp';
  document.body.appendChild(root);

  var on = false, ps = {}, view = '';
  var fine = true, aimAcc = 0, aimTimer = null, holdT = null;

  function flushAim() {
    aimTimer = null;
    if (Math.abs(aimAcc) < 1e-5) return;
    send({ a: 'aim', v: +aimAcc.toFixed(5) });
    aimAcc = 0;
  }
  function addAim(d) { aimAcc += d; if (!aimTimer) aimTimer = setTimeout(flushAim, 50); }

  function lock() {
    try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {}); } catch (e) {}
  }

  /* ---------- الواجهات ---------- */
  function topBar() {
    var mine = ps.mine && ps.s === 'aiming';
    var stTxt = ps.s === 'moving' ? 'الكرات تتحرك…'
      : ps.s === 'over' ? 'انتهت المباراة'
      : (ps.s === 'menu' || ps.s === 'intro' || ps.s === 'rules') ? 'القائمة على الشاشة'
      : ps.mine ? 'دورك 🎱' : 'دور ' + esc(ps.turn || '');
    var gr = (ps.g && (ps.g[0] || ps.g[1])) ? esc((ps.n || [])[0] || '') + ': ' + esc(ps.g[0] || '—') + ' · ' + esc((ps.n || [])[1] || '') + ': ' + esc(ps.g[1] || '—') : '';
    return '<div class="top"><div><div class="st' + (mine ? ' me' : '') + '">' + stTxt + '</div><div class="gr">' + gr + '</div></div>' +
      '<button class="mb" id="ppm">☰ القائمة</button></div>';
  }

  function viewName() {
    var s = ps.s || '';
    if (s === 'menu' || s === 'intro' || s === 'rules' || s === 'over') return 'nav';
    if (s === 'placing') return 'place';
    return 'aim';
  }

  function build() {
    view = viewName();
    var h = topBar() + '<div class="body">';
    if (view === 'nav') {
      h += '<div class="col"><div class="lbl">تنقّل في قائمة الشاشة</div><div class="dpad" dir="ltr">' +
        '<span></span><button data-k="ArrowUp">▲</button><span></span>' +
        '<button data-k="ArrowLeft">◀</button><button class="ok" data-k="Enter">موافق</button><button data-k="ArrowRight">▶</button>' +
        '<span></span><button data-k="ArrowDown">▼</button><span></span></div></div>' +
        '<div class="col c2"></div>' +
        '<div class="col"><button class="act" id="ppstart">🎱 ابدأ مباراة جديدة</button><div class="lbl" style="text-align:center">يبدأ بالإعدادات المختارة على الشاشة</div></div>';
    } else if (view === 'place') {
      h += '<div class="col" style="grid-column:1/3"><div class="lbl">الكرة البيضاء في يدك</div><div class="pad" id="pppad">حرّك إصبعك هنا لتحريك الكرة البيضاء على الطاولة</div></div>' +
        '<div class="col"><button class="act" id="ppplace">✔ ثبّت الكرة</button></div>';
    } else {
      h += '<div class="col"><div class="lbl">التصويب: أدر العجلة</div><div class="dial" id="ppdial"><i></i><b></b></div>' +
        '<div class="fine" dir="ltr"><button data-f="-1">◀</button><button id="ppfine" class="' + (fine ? 'on' : '') + '">' + (fine ? 'دقيق' : 'سريع') + '</button><button data-f="1">▶</button></div></div>' +
        '<div class="col c2"><div class="lbl">السبين (اضغط مرتين للتصفير)</div><div class="spin" id="ppspin"><u></u></div></div>' +
        '<div class="col"><div class="lbl">اسحب العصا لأسفل ثم اترك للضرب</div><div class="pw" id="pppw"><div class="fill"></div><div class="cue"></div><div class="val">٠٪</div></div></div>';
    }
    h += '</div><div class="wait" id="ppwait"></div>';
    root.innerHTML = h;
    bind();
    paint();
  }

  function paint() {
    var mine = ps.mine && (ps.s === 'aiming' || ps.s === 'placing');
    var waiting = viewName() !== 'nav' && !mine;
    root.classList.toggle('dim', waiting);
    var w = document.getElementById('ppwait');
    if (w) w.textContent = ps.s === 'moving' ? 'الكرات تتحرك…' : ps.s === 'over' ? 'انتهت المباراة' : 'انتظر دورك · يلعب الآن ' + (ps.turn || '');
    var u = root.querySelector('.spin u');
    if (u && !spinDrag) { u.style.left = (50 + (ps.sx || 0) * 40) + '%'; u.style.top = (50 + (ps.sy || 0) * 40) + '%'; }
    var st = root.querySelector('.top');
    if (st) { var tmp = document.createElement('div'); tmp.innerHTML = topBar(); st.replaceWith(tmp.firstChild); bindMenu(); }
  }

  var spinDrag = false;
  function bindMenu() {
    var mb = document.getElementById('ppm');
    if (mb) mb.onclick = function () { send({ a: 'menu' }); buzz(); };
  }
  function bind() {
    bindMenu();
    [].forEach.call(root.querySelectorAll('[data-k]'), function (b) {
      b.onclick = function () { send({ a: 'key', k: b.getAttribute('data-k') }); buzz(10); };
    });
    var stb = document.getElementById('ppstart');
    if (stb) stb.onclick = function () { send({ a: 'start' }); buzz(20); };

    // تحريك الكرة البيضاء
    var pad = document.getElementById('pppad');
    if (pad) {
      var last = null, acc = { x: 0, y: 0 }, tmr = null;
      var flush = function () { tmr = null; if (acc.x || acc.y) { send({ a: 'move', dx: Math.round(acc.x), dy: Math.round(acc.y) }); acc.x = acc.y = 0; } };
      pad.addEventListener('pointerdown', function (e) { last = { x: e.clientX, y: e.clientY }; try { pad.setPointerCapture(e.pointerId); } catch (x) {} });
      pad.addEventListener('pointermove', function (e) {
        if (!last) return;
        acc.x += (e.clientX - last.x) * 3.2; acc.y += (e.clientY - last.y) * 3.2;
        last = { x: e.clientX, y: e.clientY };
        if (!tmr) tmr = setTimeout(flush, 50);
      });
      var end = function () { last = null; };
      pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
    }
    var pl = document.getElementById('ppplace');
    if (pl) pl.onclick = function () { send({ a: 'place' }); buzz(20); };

    // عجلة التصويب
    var dial = document.getElementById('ppdial');
    if (dial) {
      var prev = null, rot = 0;
      var ang = function (e) { var r = dial.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)); };
      dial.addEventListener('pointerdown', function (e) { prev = ang(e); try { dial.setPointerCapture(e.pointerId); } catch (x) {} });
      dial.addEventListener('pointermove', function (e) {
        if (prev == null) return;
        var a = ang(e), d = a - prev;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        prev = a; rot += d;
        dial.style.transform = 'rotate(' + rot + 'rad)';
        addAim(d * (fine ? 0.12 : 0.5));
      });
      var stop = function () { prev = null; };
      dial.addEventListener('pointerup', stop); dial.addEventListener('pointercancel', stop);
    }
    var fb = document.getElementById('ppfine');
    if (fb) fb.onclick = function () { fine = !fine; fb.classList.toggle('on', fine); fb.textContent = fine ? 'دقيق' : 'سريع'; };
    [].forEach.call(root.querySelectorAll('[data-f]'), function (b) {
      var dir = +b.getAttribute('data-f');
      var stopH = function () { clearInterval(holdT); holdT = null; };
      b.addEventListener('pointerdown', function (e) {
        e.preventDefault(); stopH();
        var n = 0;
        addAim(dir * 0.0025); buzz(6);
        holdT = setInterval(function () { n++; addAim(dir * Math.min(0.03, 0.0025 * Math.pow(1.15, n))); }, 70);
      });
      b.addEventListener('pointerup', stopH); b.addEventListener('pointercancel', stopH); b.addEventListener('pointerleave', stopH);
    });

    // السبين
    var sp = document.getElementById('ppspin');
    if (sp) {
      var lastTap = 0, sTmr = null, sv = { x: 0, y: 0 };
      var setS = function (e) {
        var r = sp.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        var mm = Math.hypot(x, y); if (mm > 0.85) { x *= 0.85 / mm; y *= 0.85 / mm; }
        sv = { x: x, y: y };
        var u = sp.querySelector('u'); u.style.left = (50 + x * 40) + '%'; u.style.top = (50 + y * 40) + '%';
        if (!sTmr) sTmr = setTimeout(function () { sTmr = null; send({ a: 'spin', x: +sv.x.toFixed(2), y: +sv.y.toFixed(2) }); }, 60);
      };
      sp.addEventListener('pointerdown', function (e) {
        var t = Date.now();
        if (t - lastTap < 320) { sv = { x: 0, y: 0 }; var u = sp.querySelector('u'); u.style.left = u.style.top = '50%'; send({ a: 'spin', x: 0, y: 0 }); lastTap = 0; return; }
        lastTap = t; spinDrag = true; try { sp.setPointerCapture(e.pointerId); } catch (x) {} setS(e);
      });
      sp.addEventListener('pointermove', function (e) { if (spinDrag) setS(e); });
      var se = function () { spinDrag = false; };
      sp.addEventListener('pointerup', se); sp.addEventListener('pointercancel', se);
    }

    // القوة: سحب العصا للخلف ثم الإفلات
    var pw = document.getElementById('pppw');
    if (pw) {
      var y0 = null, pv = 0, pTmr = null;
      var fill = pw.querySelector('.fill'), cue = pw.querySelector('.cue'), val = pw.querySelector('.val');
      var show = function (p) {
        fill.style.height = (p * 100) + '%';
        cue.style.transform = 'translateY(' + (p * 55) + '%)';
        val.textContent = String(Math.round(p * 100)).replace(/[0-9]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }) + '٪';
      };
      pw.addEventListener('pointerdown', function (e) { y0 = e.clientY; pv = 0; show(0); try { pw.setPointerCapture(e.pointerId); } catch (x) {} });
      pw.addEventListener('pointermove', function (e) {
        if (y0 == null) return;
        var h = pw.getBoundingClientRect().height * 0.85;
        var p = Math.max(0, Math.min(1, (e.clientY - y0) / h));
        if (Math.round(p * 20) !== Math.round(pv * 20)) buzz(4);
        pv = p; show(p);
        if (!pTmr) pTmr = setTimeout(function () { pTmr = null; if (y0 != null) send({ a: 'power', v: +pv.toFixed(3) }); }, 70);
      });
      var fire = function () {
        if (y0 == null) return;
        y0 = null;
        if (pv >= 0.04) { send({ a: 'shoot', v: +pv.toFixed(3) }); buzz(35); }
        else send({ a: 'power', v: 0 });
        setTimeout(function () { show(0); }, 250);
      };
      pw.addEventListener('pointerup', fire);
      pw.addEventListener('pointercancel', function () { y0 = null; show(0); send({ a: 'power', v: 0 }); });
    }
  }

  function setOn(v) {
    if (v === on) return;
    on = v;
    root.classList.toggle('on', v);
    if (v) { lock(); build(); if (prevHide) prevHide(); }
  }
  // انقطاع الاتصال: نخفي المتحكم لتظهر رسالة إعادة الاتصال
  var prevHide = window.megaPadHide;
  window.megaPadHide = function () { setOn(false); if (prevHide) prevHide(); };

  // تحديثات حالة اللعبة من الشاشة
  var prevExtra = window.onExtra;
  window.onExtra = function (d) {
    if (d && d.t === 'wps') {
      ps = d.s || {};
      if (on) { if (viewName() !== view) build(); else paint(); }
      return;
    }
    if (prevExtra) prevExtra(d);
  };

  var inner = window.render;
  window.render = function () {
    var st = g('st') || {};
    if (st.webpad === 'pool') {
      if (st.wps) ps = st.wps;
      setOn(true);
      return;
    }
    setOn(false);
    inner();
  };
})();
