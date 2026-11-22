/* يد اللعب بالعرض: تصميم يحاكي يد ألعاب الفيديو (أسهم يسارًا، وأربعة أزرار ملونة يمينًا، ولوحة وسطى).
 * تعمل في ألعاب الأسئلة وصح أم خطأ وذاكرة الألوان وترتيب الأرقام وسباق الضغط.
 * الشطرنج والدومينو ولوحة المتحكم في غرفة الانتظار تبقى بتصميمها العمودي.
 * في الوضع العمودي تُدار اليد ٩٠ درجة تلقائيًا، فيمسك اللاعب الموبايل بالعرض حتى على آيفون. */
(function () {
  'use strict';
  var COL = ['#E21B3C', '#1368CE', '#D89E00', '#26890C'], SHP = ['▲', '◆', '●', '■'];
  var TFC = ['#16A34A', '#DC2626'], TFS = ['✓', '✗'];
  // مواضع الأزرار الأربعة: أعلى، يمين، أسفل، يسار
  var POS = ['t', 'r', 'b', 'l'];

  var css = document.createElement('style');
  css.textContent =
    '#gp{position:fixed;left:0;top:0;z-index:15;display:none;background:radial-gradient(ellipse at 50% 0%,#1C2647,#070A16 70%);color:#fff;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;font-family:Cairo,Tahoma,sans-serif}' +
    '#gp.on{display:block}' +
    '#gp .body{position:absolute;left:3%;right:3%;top:9%;bottom:4%}' +
    '#gp .shell{position:absolute;left:12%;right:12%;top:0;height:64%;border-radius:calc(var(--u)*1.1) calc(var(--u)*1.1) calc(var(--u)*.6) calc(var(--u)*.6);background:linear-gradient(180deg,#2A3150,#151A2E 70%);box-shadow:inset 0 2px 0 rgba(255,255,255,.12),0 18px 40px rgba(0,0,0,.6)}' +
    '#gp .grip{position:absolute;bottom:0;width:38%;height:92%;background:linear-gradient(180deg,#262D4A,#12172A 80%);box-shadow:inset 0 2px 0 rgba(255,255,255,.1),0 18px 40px rgba(0,0,0,.6)}' +
    '#gp .grip.gl{left:0;border-radius:calc(var(--u)*1.3) calc(var(--u)*.9) calc(var(--u)*.5) calc(var(--u)*2.4)}' +
    '#gp .grip.gr{right:0;border-radius:calc(var(--u)*.9) calc(var(--u)*1.3) calc(var(--u)*2.4) calc(var(--u)*.5)}' +
    '#gp .light{position:absolute;left:30%;right:30%;top:-3.2%;height:calc(var(--u)*.16);border-radius:99px;background:var(--lc,#F2B544);box-shadow:0 0 calc(var(--u)*.5) var(--lc,#F2B544);opacity:.9}' +
    '#gp .zone{position:absolute;top:8%;width:30%;height:62%;display:flex;align-items:center;justify-content:center}' +
    '#gp .zl{left:3%}#gp .zr{right:3%}' +
    /* الأسهم */
    '#gp .dpad{position:relative;width:calc(var(--u)*3);height:calc(var(--u)*3)}' +
    '#gp .dpad b{position:absolute;width:calc(var(--u)*1.02);height:calc(var(--u)*1.02);background:linear-gradient(180deg,#3A4266,#20263F);box-shadow:inset 0 2px 0 rgba(255,255,255,.12),0 4px 8px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:calc(var(--u)*.42);color:#9AA6C8;transition:transform .06s,filter .06s}' +
    '#gp .dpad .t{left:calc(var(--u)*.99);top:0;border-radius:calc(var(--u)*.22) calc(var(--u)*.22) 4px 4px}' +
    '#gp .dpad .b{left:calc(var(--u)*.99);bottom:0;border-radius:4px 4px calc(var(--u)*.22) calc(var(--u)*.22)}' +
    '#gp .dpad .l{top:calc(var(--u)*.99);left:0;border-radius:calc(var(--u)*.22) 4px 4px calc(var(--u)*.22)}' +
    '#gp .dpad .r{top:calc(var(--u)*.99);right:0;border-radius:4px calc(var(--u)*.22) calc(var(--u)*.22) 4px}' +
    '#gp .dpad .c{left:calc(var(--u)*.99);top:calc(var(--u)*.99);border-radius:4px;pointer-events:none}' +
    /* الأزرار الأربعة */
    '#gp .face{position:relative;width:calc(var(--u)*3.3);height:calc(var(--u)*3.3)}' +
    '#gp .fb{position:absolute;width:calc(var(--u)*1.18);height:calc(var(--u)*1.18);border-radius:50%;background:radial-gradient(circle at 50% 35%,#2C3354,#141830);box-shadow:inset 0 2px 0 rgba(255,255,255,.14),0 5px 10px rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;font-size:calc(var(--u)*.6);font-weight:900;color:var(--c);text-shadow:0 0 calc(var(--u)*.3) var(--c);transition:transform .06s,opacity .2s,box-shadow .2s}' +
    '#gp .fb.t{left:calc(var(--u)*1.06);top:0}#gp .fb.b{left:calc(var(--u)*1.06);bottom:0}#gp .fb.l{top:calc(var(--u)*1.06);left:0}#gp .fb.r{top:calc(var(--u)*1.06);right:0}' +
    '#gp .fb.sel{background:var(--c);color:#fff;box-shadow:0 0 0 4px #fff,0 0 calc(var(--u)*.6) var(--c)}#gp .fb.dim{opacity:.18}#gp .fb.off{opacity:.08;pointer-events:none}' +
    '#gp .hit{transform:scale(.88);filter:brightness(1.5)}' +
    /* اللوحة الوسطى */
    '#gp .pad{position:absolute;left:31%;right:31%;top:2%;height:61%;border-radius:calc(var(--u)*.35);background:linear-gradient(180deg,#0E1428,#0A0F20);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),inset 0 8px 18px rgba(0,0,0,.5);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:calc(var(--u)*.12);padding:calc(var(--u)*.18);text-align:center;overflow:hidden}' +
    '#gp .pad .k{font-size:calc(var(--u)*.3);color:#8FA0C8}' +
    '#gp .pad .big{font-size:calc(var(--u)*.6);font-weight:900;line-height:1.25}' +
    '#gp .pad .qt{flex-shrink:0;font-size:calc(var(--u)*.3);font-weight:800;line-height:1.35;width:100%;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}' +
    '#gp .pad .mid{font-size:calc(var(--u)*.38);font-weight:800;line-height:1.35}' +
    '#gp .bar{width:100%;height:calc(var(--u)*.1);border-radius:9px;background:#1F2A44;overflow:hidden}#gp .bar i{display:block;height:100%;background:#F2B544;width:100%}' +
    '#gp .opts{width:100%;display:grid;grid-template-columns:1fr 1fr;gap:calc(var(--u)*.1)}' +
    '#gp .op{display:flex;align-items:center;gap:6px;border-radius:12px;padding:calc(var(--u)*.08) calc(var(--u)*.14);background:#161E38;font-size:calc(var(--u)*.27);font-weight:800;min-height:calc(var(--u)*.5);text-align:right;line-height:1.25;transition:opacity .2s}' +
    '#gp .op i{font-style:normal;color:var(--c);font-size:calc(var(--u)*.38);flex-shrink:0}#gp .op.sel{background:var(--c)}#gp .op.sel i{color:#fff}#gp .op.dim{opacity:.25}' +
    '#gp .dots{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}#gp .dots i{width:calc(var(--u)*.3);height:calc(var(--u)*.3);border-radius:50%;background:#1F2A44;display:block}' +
    '#gp .nums{width:100%;display:flex;flex-wrap:wrap;gap:calc(var(--u)*.1);justify-content:center;direction:ltr}' +
    '#gp .nums button{border:0;border-radius:12px;min-width:calc(var(--u)*1.05);height:calc(var(--u)*.78);font-size:calc(var(--u)*.4);font-weight:900;color:#fff;font-family:inherit;transition:opacity .15s,transform .06s}#gp .nums button.used{opacity:.25}' +
    '#gp .res{border-radius:calc(var(--u)*.3);padding:calc(var(--u)*.2) calc(var(--u)*.4);width:100%}' +
    /* أزرار صغيرة والزر الدائري في المنتصف */
    '#gp .mini{position:absolute;top:2%;height:calc(var(--u)*.56);padding:0 calc(var(--u)*.3);border:0;border-radius:99px;background:#2A3254;color:#E2E8F0;font-family:inherit;font-weight:800;font-size:calc(var(--u)*.28);box-shadow:inset 0 1px 0 rgba(255,255,255,.15)}' +
    '#gp .mini.ml{right:69.5%}#gp .mini.mr{left:69.5%}#gp .mini.p{background:#F2B544;color:#0B1020}' +
    '#gp .home{position:absolute;left:50%;top:66%;width:calc(var(--u)*.9);height:calc(var(--u)*.9);margin-left:calc(var(--u)*-.45);border-radius:50%;background:#0B1020 center/cover no-repeat;box-shadow:0 0 0 3px #3A4266,0 4px 10px rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:calc(var(--u)*.45);color:#F2B544}' +
    '#gp .who{position:absolute;left:50%;top:88%;transform:translateX(-50%);display:flex;gap:8px;align-items:center;white-space:nowrap;font-weight:800;font-size:calc(var(--u)*.3)}' +
    '#gp .who b{background:#F2B544;color:#0B1020;border-radius:99px;padding:2px 12px}' +
    '#gp .hint{position:absolute;left:0;right:0;top:1.5%;text-align:center;font-size:calc(var(--u)*.24);color:#5E6C93}' +
    '.toast{z-index:30!important}#pk{z-index:40!important}';
  document.head.appendChild(css);

  var gp = document.createElement('div');
  gp.id = 'gp';
  gp.innerHTML =
    '<div class="hint" id="gph"></div>' +
    '<div class="body"><div class="grip gl"></div><div class="grip gr"></div><div class="shell"><div class="light"></div></div>' +
    '<div class="zone zl"><div class="dpad"><b class="t" data-d="0">▲</b><b class="r" data-d="1">▶</b><b class="b" data-d="2">▼</b><b class="l" data-d="3">◀</b><b class="c"></b></div></div>' +
    '<div class="zone zr"><div class="face" id="gpf"></div></div>' +
    '<div class="pad" id="gpp"></div>' +
    '<button class="mini ml" id="gpml"></button><button class="mini mr" id="gpmr"></button>' +
    '<div class="home" id="gphm"></div><div class="who" id="gpw"></div></div>';
  document.body.appendChild(gp);
  var face = document.getElementById('gpf'), pad = document.getElementById('gpp');

  function g(n) { return window[n]; }
  function arN(n) { return g('ar') ? g('ar')(n) : String(n); }
  function escT(t) { return g('esc') ? g('esc')(t) : String(t); }
  function vib(t) { if (navigator.vibrate) navigator.vibrate(t || 12); }
  function sendRaw(o) { try { g('ws').send(typeof o === 'string' ? o : JSON.stringify(o)); } catch (e) {} }

  /* ---------- القياس والتدوير ---------- */
  function layout() {
    var W = window.innerWidth, H = window.innerHeight, rot = H > W;
    var w = rot ? H : W, h = rot ? W : H;
    gp.style.width = w + 'px'; gp.style.height = h + 'px';
    gp.style.transformOrigin = '0 0';
    gp.style.transform = rot ? 'translate(' + W + 'px,0) rotate(90deg)' : 'none';
    gp.style.setProperty('--u', Math.min(h * 0.17, w * 0.075) + 'px');
    document.getElementById('gph').textContent = rot ? 'أمسك الموبايل بالعرض 🔄' : '';
  }
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', function () { setTimeout(layout, 250); });

  /* ملء الشاشة وتثبيتها بالعرض على أندرويد (يتطلب لمسة من اللاعب) */
  var triedLock = false;
  function lockLandscape() {
    if (triedLock) return;
    triedLock = true;
    var el = document.documentElement;
    var fs = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!fs || !screen.orientation || !screen.orientation.lock) return;
    try {
      Promise.resolve(fs.call(el)).then(function () { return screen.orientation.lock('landscape'); }).then(layout, function () {});
    } catch (e) {}
  }
  function unlockLandscape() {
    if (!triedLock) return;
    triedLock = false;
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
    try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); } catch (e) {}
  }
  gp.addEventListener('pointerdown', lockLandscape);

  /* ---------- الحالة المحلية للجولة ---------- */
  var key = '', seq = [], taps = 0, timer = null, active = false;

  function countdown(ms) {
    clearInterval(timer);
    var el = document.getElementById('gpt');
    if (!el || !(ms > 0)) return;
    var end = Date.now() + ms, tot = ms;
    timer = setInterval(function () {
      var l = Math.max(0, end - Date.now());
      el.style.width = (l / tot * 100) + '%';
      if (!l) clearInterval(timer);
    }, 100);
  }

  function faceButtons(n, labels, colors, state) {
    var h = '';
    for (var i = 0; i < 4; i++) {
      var cls = 'fb ' + POS[i];
      if (i >= n) cls += ' off';
      else if (state && state.sel != null) cls += state.sel === i ? ' sel' : ' dim';
      h += '<b class="' + cls + '" data-f="' + i + '" style="--c:' + (colors[i] || '#555') + '">' + (i < n ? labels[i] : '') + '</b>';
    }
    face.innerHTML = h;
  }

  /** تحويل زر الوجه أو السهم إلى خيار حسب اللعبة. */
  var onPress = null;
  function press(i, el) {
    if (el) { el.classList.add('hit'); setTimeout(function () { el.classList.remove('hit'); }, 110); }
    if (onPress) onPress(i);
  }
  gp.addEventListener('pointerdown', function (e) {
    var t = e.target.closest ? e.target.closest('[data-f],[data-d],[data-o],[data-j]') : null;
    if (!t) return;
    e.preventDefault();
    if (t.hasAttribute('data-j')) { pressNum(+t.getAttribute('data-j'), t); return; }
    var i = +(t.getAttribute('data-f') || t.getAttribute('data-d') || t.getAttribute('data-o'));
    press(i, t);
  });

  function header() {
    var st = g('st');
    var ph = document.getElementById('gphm'), p = g('photo'), nm = g('name') || '';
    if (p) { ph.style.backgroundImage = 'url(' + p + ')'; ph.textContent = ''; } else { ph.style.backgroundImage = ''; ph.textContent = nm.charAt(0); }
    document.getElementById('gpw').innerHTML = escT(nm) + ' <b>' + arN(st.score || 0) + '</b>';
    var mc = g('myColor');
    gp.style.setProperty('--lc', mc ? '#' + (mc & 0xFFFFFF).toString(16).padStart(6, '0') : '#F2B544');
    // أزرار المتحكم الصغيرة (مثل أزرار المشاركة والخيارات)
    var l = document.getElementById('gpml'), r = document.getElementById('gpmr'), ph2 = st.phase;
    var over = ph2 === 'podium' || ph2 === 'tapResult';
    if (st.master) {
      r.style.display = ''; r.textContent = '🎮 غيّر اللعبة'; r.className = 'mini mr';
      r.onclick = function () { if (window.megaOpenPicker) window.megaOpenPicker(); };
      var a = over ? 'again' : (/^(question|reveal|seqInput|seqReveal)$/.test(ph2) ? 'next' : '');
      l.style.display = a ? '' : 'none'; l.className = 'mini ml p';
      l.textContent = a === 'again' ? 'مرة أخرى 🔁' : 'التالي ⏭';
      l.onclick = function () { sendRaw({ t: 'host', a: a }); };
    } else { l.style.display = 'none'; r.style.display = 'none'; }
  }

  function resultCard(ok, title, lines) {
    return '<div class="res" style="background:' + (ok ? '#16A34A' : '#DC2626') + '"><div class="big">' + title + '</div>' + lines + '</div>';
  }

  function renderPad() {
    var st = g('st'), ph = st.phase, buzz = g('buzz') || vib;
    var k = ph + '|' + (st.round || '') + '|' + (st.q || '');
    if (k !== key) { key = k; seq = []; taps = st.taps || 0; }
    onPress = null;
    header();
    var h = '';
    if (ph === 'lobby') {
      faceButtons(4, SHP, COL, null);
      h = '<div class="big">أنت في اللعبة! 🎉</div><div class="mid" style="color:#A7B0C4">انتظر بدء اللعبة · اللاعبون: ' + arN(st.players || 1) + '</div>' +
        (st.masterName ? '<div class="k">👑 المتحكم: ' + escT(st.masterName) + '</div>' : '');
      pad.innerHTML = h;
      onPress = function () { vib(8); };
      return;
    }
    if (ph === 'question') {
      var tf = !!st.tf, n = tf ? 2 : (st.n || 4), labels = tf ? TFS : SHP, cols = tf ? TFC : COL, o = st.opts || [];
      faceButtons(n, labels, cols, { sel: st.answer });
      h = '<div class="k">السؤال ' + arN(st.round) + ' من ' + arN(st.rounds) + '</div><div class="bar"><i id="gpt"></i></div>' +
        (st.q ? '<div class="qt"' + (String(st.q).length > 60 ? ' style="font-size:calc(var(--u)*.25)"' : '') + '>' + escT(st.q) + '</div>' : '') + '<div class="opts">';
      for (var i = 0; i < n; i++) {
        h += '<div class="op' + (st.answer != null ? (st.answer === i ? ' sel' : ' dim') : '') + '" data-o="' + i + '" style="--c:' + cols[i] + '"><i>' + labels[i] + '</i><span>' + escT(o[i] || '') + '</span></div>';
      }
      pad.innerHTML = h + '</div>';
      countdown(st.left);
      onPress = function (i) {
        if (st.answer != null || i >= n) return;
        st.answer = i;
        sendRaw({ t: 'answer', i: i });
        buzz(20);
        renderPad();
      };
      return;
    }
    if (ph === 'reveal') {
      var ok = st.answer === st.correct, o2 = st.opts || [];
      faceButtons(st.tf ? 2 : (st.n || 4), st.tf ? TFS : SHP, st.tf ? TFC : COL, { sel: st.correct });
      pad.innerHTML = resultCard(ok, ok ? 'إجابة صحيحة!' : (st.answer == null ? 'انتهى الوقت' : 'إجابة خاطئة'),
        '<div class="mid">الإجابة: ' + escT(o2[st.correct] || '') + '</div><div class="mid">+' + arN(st.gained || 0) + ' · ترتيبك ' + arN(st.rank) + '</div>');
      return;
    }
    if (ph === 'memShow') {
      faceButtons(4, SHP, COL, null);
      pad.innerHTML = '<div class="big">👀 انظر إلى الشاشة</div><div class="mid" style="color:#A7B0C4">احفظ ترتيب الألوان (' + arN(st.len) + ')</div><div class="k">الجولة ' + arN(st.round) + ' من ' + arN(st.rounds) + '</div>';
      return;
    }
    if (ph === 'seqInput') {
      var mem = st.mode === 'memory', it = st.items || [], len = st.len || it.length;
      if (st.done) {
        faceButtons(mem ? 4 : 0, SHP, COL, null);
        pad.innerHTML = '<div class="big">تم الإرسال ✓</div><div class="mid" style="color:#A7B0C4">انتظر بقية اللاعبين…</div>';
        return;
      }
      faceButtons(mem ? 4 : 0, SHP, COL, null);
      h = '<div class="k">' + (mem ? 'اضغط الألوان بالترتيب نفسه' : 'اضغط الأرقام من الأصغر إلى الأكبر') + '</div><div class="bar"><i id="gpt"></i></div><div class="dots" id="gpd">';
      for (var d = 0; d < len; d++) h += '<i></i>';
      h += '</div>';
      if (!mem) {
        h += '<div class="nums">';
        for (var j = 0; j < it.length; j++) h += '<button data-j="' + j + '" style="background:' + COL[j % 4] + '">' + escT(it[j]) + '</button>';
        h += '</div>';
      }
      h += '<button class="mini" style="position:static;margin-top:4px" id="gprs">إعادة من البداية</button>';
      pad.innerHTML = h;
      countdown(st.left);
      paintSeq();
      document.getElementById('gprs').onclick = function () { seq = []; paintSeq(); };
      onPress = function (i) { if (mem) addSeq(i); };
      return;
    }
    if (ph === 'seqReveal') {
      faceButtons(st.mode === 'memory' ? 4 : 0, SHP, COL, null);
      pad.innerHTML = resultCard(st.ok, st.ok ? 'ترتيب صحيح!' : (st.done ? 'ترتيب خاطئ' : 'انتهى الوقت'),
        '<div class="mid">+' + arN(st.gained || 0) + ' · ترتيبك ' + arN(st.rank) + '</div>');
      return;
    }
    if (ph === 'tapRace') {
      faceButtons(4, SHP, COL, null);
      pad.innerHTML = '<div class="k">اضغط أي زر بأسرع ما يمكن!</div><div class="bar"><i id="gpt"></i></div><div class="big" style="font-size:calc(var(--u)*1.2)" id="gptc">' + arN(taps) + '</div><div class="k">ضغطة</div>';
      countdown(st.left);
      onPress = function () {
        taps++;
        var c = document.getElementById('gptc'); if (c) c.textContent = arN(taps);
        sendRaw('{"t":"tap"}');
        vib(8);
      };
      return;
    }
    if (ph === 'tapResult' || ph === 'podium') {
      faceButtons(4, SHP, COL, null);
      pad.innerHTML = '<div class="big">' + (st.rank === 1 ? 'أنت الفائز! 🏆' : 'ترتيبك ' + arN(st.rank)) + '</div><div class="mid" style="color:#A7B0C4">' +
        (ph === 'tapResult' ? 'ضغطاتك: ' + arN(st.taps) : 'نقاطك: ' + arN(st.score)) + '</div>';
      return;
    }
  }

  function paintSeq() {
    var st = g('st'), mem = st.mode === 'memory';
    [].forEach.call(pad.querySelectorAll('#gpd i'), function (d, x) { d.style.background = x < seq.length ? (mem ? COL[seq[x]] : '#F2B544') : '#1F2A44'; });
    if (!mem) [].forEach.call(pad.querySelectorAll('.nums button'), function (b) { b.classList.toggle('used', seq.indexOf(+b.getAttribute('data-j')) >= 0); });
  }
  function addSeq(j) {
    var st = g('st'), len = st.len || (st.items || []).length;
    if (st.done || seq.length >= len) return;
    seq.push(j); vib(12); paintSeq();
    if (seq.length >= len) { sendRaw({ t: 'seq', s: seq }); st.done = true; setTimeout(renderPad, 150); }
  }
  function pressNum(j, el) {
    if (seq.indexOf(j) >= 0) return;
    el.classList.add('hit'); setTimeout(function () { el.classList.remove('hit'); }, 110);
    addSeq(j);
  }

  /* ---------- الربط مع صفحة اللعب ---------- */
  var PH = { lobby: 1, question: 1, reveal: 1, memShow: 1, seqInput: 1, seqReveal: 1, tapRace: 1, tapResult: 1, podium: 1 };
  var inner = window.render;
  window.render = function () {
    inner();
    var st = g('st') || {};
    var use = PH[st.phase] && !(st.phase === 'lobby' && st.master) && !window.MEGA_NO_PAD;
    if (use) {
      if (!active) { active = true; gp.classList.add('on'); layout(); }
      renderPad();
    } else if (active) {
      active = false; clearInterval(timer); gp.classList.remove('on'); unlockLandscape();
    }
  };
  // انقطاع الاتصال: نخفي اليد لتظهر رسالة إعادة الاتصال
  window.megaPadHide = function () { if (active) { active = false; clearInterval(timer); gp.classList.remove('on'); } };
})();
