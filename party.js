/* إضافات صفحة اللعب على الموبايل: المتحكم، والشطرنج، والدومينو، والأصوات. */
(function () {
  var GAMES = [['❓', 'مسابقة الأسئلة'], ['✅', 'صح أم خطأ'], ['🎨', 'ذاكرة الألوان'], ['🔢', 'ترتيب الأرقام'],
    ['👆', 'سباق الضغط'], ['♟️', 'شطرنج'], ['🎲', 'دومينو']];
  var CATS = [['mix', 'خليط'], ['math', 'حساب ذهني'], ['geo', 'جغرافيا'], ['gen', 'معلومات عامة'], ['sci', 'علوم'],
    ['isl', 'ثقافة إسلامية'], ['ar', 'لغة عربية'], ['ani', 'حيوانات'], ['prov', 'أكمل المثل']];
  var LEVELS = ['سهل', 'متوسط', 'صعب'];

  var css = document.createElement('style');
  css.textContent =
    '.chips{display:flex;flex-wrap:wrap;gap:8px}.chip{border:0;border-radius:999px;padding:10px 14px;font-size:16px;font-weight:800;background:#1F2A44;color:#fff;font-family:inherit}' +
    '.chip.on{background:#F2B544;color:#0B1020}.sec{font-size:14px;color:#A7B0C4;margin:6px 0 4px}' +
    '#hb{position:fixed;left:0;right:0;bottom:0;display:none;gap:8px;padding:10px 12px;background:#111833;border-top:1px solid #26314F;z-index:9}' +
    '#hb button{flex:1;border:0;border-radius:14px;padding:13px 6px;font-size:16px;font-weight:800;font-family:inherit;background:#1F2A44;color:#fff}' +
    '#hb button.p{background:#F2B544;color:#0B1020}body.hb main{padding-bottom:84px}' +
    '.toast{position:fixed;top:70px;left:50%;transform:translateX(-50%);background:#DC2626;color:#fff;padding:12px 18px;border-radius:14px;font-weight:800;z-index:10;max-width:90vw;text-align:center}' +
    '.board{display:grid;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(8,1fr);width:min(96vw,62vh);aspect-ratio:1;margin:0 auto;border:6px solid #5B3A1E;border-radius:10px;overflow:hidden;direction:ltr}' +
    '.sq{position:relative;display:flex;align-items:center;justify-content:center}.sq img{width:92%;height:92%;pointer-events:none}' +
    '.sq.l{background:#EEDDBB}.sq.d{background:#B07F4F}.sq.last.l{background:#F6EB72}.sq.last.d{background:#DCC34B}.sq.sel{outline:4px solid #2563EB;outline-offset:-4px}' +
    '.sq.chk{background:#E05252!important}.sq .dot{position:absolute;width:30%;height:30%;border-radius:50%;background:rgba(20,20,30,.35)}' +
    '.sq .ring{position:absolute;inset:6%;border-radius:50%;border:4px solid rgba(20,20,30,.35)}' +
    '.ply{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:14px;background:#1F2A44;font-weight:800}.ply.on{background:#F2B544;color:#0B1020}' +
    '.promo{display:flex;gap:10px;justify-content:center}.promo button{width:68px;height:68px;border:0;border-radius:14px;background:#EEDDBB}.promo img{width:90%}' +
    '.hand{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;direction:ltr}' +
    '.dt{position:relative;display:flex;flex-direction:column;width:62px;height:124px;background:linear-gradient(135deg,#FFFDF6,#F1EADB 60%,#DCD2BC);border-radius:11px;border:1px solid #8C826C;padding:5px;gap:4px;box-shadow:0 5px 12px rgba(0,0,0,.5),inset 0 0 0 2px rgba(255,255,255,.6);transition:transform .12s}' +
    '.dt:after{content:"";position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#FFE7A3,#B8862B)}' +
    '.pile{display:flex;align-items:center;justify-content:center;gap:14px;margin:4px auto}' +
    '.pile .stk{position:relative;width:74px;height:58px}' +
    '.pile .bk{position:absolute;width:30px;height:54px;border-radius:7px;background:linear-gradient(135deg,#2B4BB8,#1E2F7A 55%,#16205A);border:1px solid rgba(255,255,255,.35);box-shadow:0 3px 6px rgba(0,0,0,.5)}' +
    '.pile .bk:after{content:"";position:absolute;inset:5px;border:1px solid rgba(255,220,150,.45);border-radius:4px}' +
    '.pile b{font-size:17px;color:#FCE7B2}' +
    '.drawbtn{background:linear-gradient(135deg,#2B4BB8,#1E2F7A);color:#fff;border:2px solid #FCE7B2;animation:pl 1.2s ease-in-out infinite}' +
    '@keyframes pl{50%{box-shadow:0 0 0 8px rgba(252,231,178,.18)}}' +
    '.dt.new{animation:dn .6s ease-out}@keyframes dn{from{transform:translateY(-60px) rotate(-12deg);opacity:0}}' +
    '.dt.no{opacity:.35}.dt.go{box-shadow:0 0 0 4px #22C55E,0 5px 12px rgba(0,0,0,.5)}.dt.go:active{transform:translateY(-6px)}' +
    '.dh{flex:1;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr)}' +
    '.dh+.dh{border-top:2px solid #7A705C}.dh i{display:block;width:72%;height:72%;margin:auto;border-radius:50%}.dh i.on{background:radial-gradient(circle at 35% 35%,#4B5563,#111318)}';
  document.head.appendChild(css);

  var hb = document.createElement('div');
  hb.id = 'hb';
  document.body.appendChild(hb);

  /* ---------- الأصوات ---------- */
  var ac = null;
  function unlock() {
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
    } catch (e) {}
  }
  document.addEventListener('touchstart', unlock, { passive: true });
  document.addEventListener('mousedown', unlock);
  function note(f, t0, d, type, vol) {
    if (!ac) return;
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'triangle';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, ac.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.25, ac.currentTime + t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t0 + d);
    o.connect(g); g.connect(ac.destination);
    o.start(ac.currentTime + t0); o.stop(ac.currentTime + t0 + d + 0.05);
  }
  function snd(kind) {
    unlock();
    if (!ac) return;
    if (kind === 'ok') { note(880, 0, 0.15); note(1318, 0.1, 0.35); }
    else if (kind === 'bad') { note(196, 0, 0.25, 'sawtooth', 0.12); note(147, 0.2, 0.35, 'sawtooth', 0.12); }
    else if (kind === 'win') {
      [392, 523, 659, 784].forEach(function (f, i) { note(f, i * 0.16, 0.2); });
      note(1046, 0.66, 0.9); note(784, 0.66, 0.9, 'triangle', 0.15); note(523, 0.66, 0.9, 'triangle', 0.12);
    } else if (kind === 'tick') { note(1200, 0, 0.06, 'square', 0.06); }
  }
  window.megaSound = snd;

  function toast(text) {
    var t = document.createElement('div');
    t.className = 'toast'; t.textContent = text;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3500);
  }
  window.onExtra = function (d) {
    if (d.t === 'msg') toast(d.text || '');
  };

  function send(o) { try { ws.send(JSON.stringify(o)); } catch (e) {} }
  function host(a, extra) {
    var o = { t: 'host', a: a };
    for (var k in (extra || {})) o[k] = extra[k];
    send(o);
  }

  /* ---------- لوحة المتحكم في غرفة الانتظار ---------- */
  function masterLobby() {
    var g = st.game || 0, h = '<div class="center" style="justify-content:flex-start;gap:10px;text-align:right;align-items:stretch">';
    h += '<div class="big" style="font-size:26px;text-align:center">👑 أنت المتحكم</div>';
    h += '<div class="muted" style="text-align:center;font-size:14px">اختر اللعبة والإعدادات ثم ابدأ، وستظهر على الشاشة للجميع</div>';
    h += '<div class="sec">اللعبة</div><div class="chips">';
    GAMES.forEach(function (x, i) { h += '<button class="chip' + (i === g ? ' on' : '') + '" data-g="' + i + '">' + x[0] + ' ' + x[1] + '</button>'; });
    h += '</div>';
    if (g === 0) {
      h += '<div class="sec">التصنيف</div><div class="chips">';
      CATS.forEach(function (x) { h += '<button class="chip' + (x[0] === st.cat ? ' on' : '') + '" data-c="' + x[0] + '">' + x[1] + '</button>'; });
      h += '</div>';
    }
    if (g <= 3) {
      h += '<div class="sec">المستوى</div><div class="chips">';
      LEVELS.forEach(function (x, i) { h += '<button class="chip' + (i === st.level ? ' on' : '') + '" data-l="' + i + '">' + x + '</button>'; });
      h += '</div>';
    }
    if (g === 6) {
      h += '<div class="sec">النظام</div><div class="chips">' +
        '<button class="chip' + (!st.teams ? ' on' : '') + '" data-t="0">فردي</button>' +
        '<button class="chip' + (st.teams ? ' on' : '') + '" data-t="1">زوجي (فرق، ٤ لاعبين)</button></div>';
    }
    var r = st.roster || [];
    h += '<div class="sec">اللاعبون (' + ar(r.length) + ')</div><div class="chips">';
    r.forEach(function (p) { h += '<button class="chip' + (p.id === st.id ? ' on' : '') + '" data-m="' + p.id + '">' + (p.id === st.id ? '👑 ' : '') + esc(p.name) + '</button>'; });
    h += '</div><div class="muted" style="font-size:12px">اضغط اسم لاعب لتنقل إليه التحكم</div>';
    h += '<button class="btn" id="hs" style="margin-top:8px">ابدأ اللعبة ▶</button></div>';
    m.innerHTML = h;
    [].forEach.call(m.querySelectorAll('[data-g]'), function (b) { b.onclick = function () { host('set', { game: +b.getAttribute('data-g') }); }; });
    [].forEach.call(m.querySelectorAll('[data-c]'), function (b) { b.onclick = function () { host('set', { cat: b.getAttribute('data-c') }); }; });
    [].forEach.call(m.querySelectorAll('[data-l]'), function (b) { b.onclick = function () { host('set', { level: +b.getAttribute('data-l') }); }; });
    [].forEach.call(m.querySelectorAll('[data-t]'), function (b) { b.onclick = function () { host('set', { teams: b.getAttribute('data-t') === '1' }); }; });
    [].forEach.call(m.querySelectorAll('[data-m]'), function (b) {
      b.onclick = function () {
        var id = +b.getAttribute('data-m');
        if (id !== st.id && confirm('نقل التحكم إلى ' + b.textContent + '؟')) host('master', { id: id });
      };
    });
    document.getElementById('hs').onclick = function () { unlock(); host('start'); };
  }

  /* ---------- شريط المتحكم أثناء اللعب ---------- */
  function hostBar() {
    var ph = st.phase, show = st.master && ph !== 'lobby', h = '';
    if (show) {
      var over = ph === 'podium' || ph === 'tapResult' || (ph === 'chess' && st.result) || (ph === 'domino' && st.result);
      if (ph === 'question' || ph === 'reveal' || ph === 'seqInput' || ph === 'seqReveal') h += '<button class="p" data-h="next">التالي ⏭</button>';
      if (over) h += '<button class="p" data-h="again">العب مرة أخرى 🔁</button>';
      h += '<button data-h="pick">🎮 غيّر اللعبة</button>';
    }
    hb.innerHTML = h;
    hb.style.display = show ? 'flex' : 'none';
    document.body.classList.toggle('hb', !!show);
    [].forEach.call(hb.querySelectorAll('[data-h]'), function (b) {
      b.onclick = function () {
        var a = b.getAttribute('data-h');
        if (a === 'pick') { openPicker(); return; }
        host(a);
      };
    });
  }

  /* ---------- اختيار لعبة أخرى في أي وقت ---------- */
  var pk = { g: 0, c: 'mix', l: 1 };
  window.megaOpenPicker = function () { openPicker(); };
  function openPicker() {
    pk = { g: st.game || 0, c: st.cat || 'mix', l: st.level == null ? 1 : st.level, t: !!st.teams };
    drawPicker();
  }
  function drawPicker() {
    var old = document.getElementById('pk');
    if (old) old.remove();
    var d = document.createElement('div');
    d.id = 'pk';
    d.style.cssText = 'position:fixed;inset:0;background:rgba(5,8,20,.96);z-index:20;overflow:auto;padding:18px 16px 30px;display:flex;flex-direction:column;gap:8px';
    var h = '<div class="big" style="font-size:24px;text-align:center">🎮 اختر اللعبة</div><div class="chips">';
    GAMES.forEach(function (x, i) { h += '<button class="chip' + (i === pk.g ? ' on' : '') + '" data-pg="' + i + '">' + x[0] + ' ' + x[1] + '</button>'; });
    h += '</div>';
    if (pk.g === 0) {
      h += '<div class="sec">التصنيف</div><div class="chips">';
      CATS.forEach(function (x) { h += '<button class="chip' + (x[0] === pk.c ? ' on' : '') + '" data-pc="' + x[0] + '">' + x[1] + '</button>'; });
      h += '</div>';
    }
    if (pk.g <= 3) {
      h += '<div class="sec">المستوى</div><div class="chips">';
      LEVELS.forEach(function (x, i) { h += '<button class="chip' + (i === pk.l ? ' on' : '') + '" data-pl="' + i + '">' + x + '</button>'; });
      h += '</div>';
    }
    if (pk.g === 6) {
      h += '<div class="sec">النظام</div><div class="chips"><button class="chip' + (!pk.t ? ' on' : '') + '" data-pt="0">فردي</button>' +
        '<button class="chip' + (pk.t ? ' on' : '') + '" data-pt="1">زوجي (فرق)</button></div>';
    }
    h += '<button class="btn" id="pkgo" style="margin-top:10px">ابدأها الآن ▶</button>' +
      '<button class="btn ghost" id="pklobby">غرفة الانتظار</button><button class="btn ghost" id="pkx">إلغاء</button>';
    d.innerHTML = h;
    document.body.appendChild(d);
    [].forEach.call(d.querySelectorAll('[data-pg]'), function (b) { b.onclick = function () { pk.g = +b.getAttribute('data-pg'); drawPicker(); }; });
    [].forEach.call(d.querySelectorAll('[data-pc]'), function (b) { b.onclick = function () { pk.c = b.getAttribute('data-pc'); drawPicker(); }; });
    [].forEach.call(d.querySelectorAll('[data-pl]'), function (b) { b.onclick = function () { pk.l = +b.getAttribute('data-pl'); drawPicker(); }; });
    [].forEach.call(d.querySelectorAll('[data-pt]'), function (b) { b.onclick = function () { pk.t = b.getAttribute('data-pt') === '1'; drawPicker(); }; });
    document.getElementById('pkgo').onclick = function () { unlock(); host('switch', { game: pk.g, cat: pk.c, level: pk.l, teams: pk.t }); d.remove(); };
    document.getElementById('pklobby').onclick = function () { host('lobby'); d.remove(); };
    document.getElementById('pkx').onclick = function () { d.remove(); };
  }

  /* ---------- الشطرنج ---------- */
  var sel = -1, pendingPromo = null, lastBoard = '';
  // صور القطع: من الشاشة محليًا، أو مضمّنة في الصفحة عند اللعب عبر الإنترنت
  function pieceSrc(k) { return (window.MEGA_PIECES && window.MEGA_PIECES[k]) || '/chess/' + k + '.png'; }
  function img(p) { return pieceSrc((p === p.toUpperCase() ? 'w' : 'b') + p.toUpperCase()); }
  var VAL = { q: 9, r: 5, b: 3, n: 3, p: 1 }, CNT = { q: 1, r: 2, b: 2, n: 2, p: 8 };
  // القطع المأكولة من لون معيّن مع مجموع قيمتها
  function taken(b, white) {
    var out = [], sum = 0;
    ['q', 'r', 'b', 'n', 'p'].forEach(function (k) {
      var ch = white ? k.toUpperCase() : k, left = b.split(ch).length - 1;
      for (var i = left; i < CNT[k]; i++) { out.push(ch); sum += VAL[k]; }
    });
    return { list: out, sum: sum };
  }
  function takenRow(t, adv) {
    var h = '<div style="display:flex;align-items:center;gap:2px;min-height:30px;direction:ltr;padding:0 6px">' + (t.list.length ? '<span style="display:inline-flex;background:#EEDDBB;border-radius:8px;padding:2px 8px 2px 2px">' : '<span>');
    t.list.forEach(function (p) { h += '<img src="' + img(p) + '" style="width:24px;height:24px;margin-right:-6px">'; });
    h += '</span>';
    if (adv > 0) h += '<span style="margin-left:12px;color:#4ADE80;font-weight:800">+' + ar(adv) + '</span>';
    return h + '</div>';
  }
  function renderChess() {
    var s = st.chess || Chess.start();
    s = { b: s.b, t: s.t, c: s.c || '', ep: s.ep == null ? -1 : s.ep, h: s.h || 0, n: s.n || 1 };
    if (s.b !== lastBoard) { sel = -1; pendingPromo = null; lastBoard = s.b; }
    var me = st.color, myTurn = !!me && me === s.t && !st.result;
    var legal = myTurn ? Chess.moves(s) : [];
    var targets = sel >= 0 ? legal.filter(function (x) { return x.f === sel; }) : [];
    var chk = Chess.inCheck(s, s.t) ? s.b.indexOf(s.t === 'w' ? 'K' : 'k') : -1;
    var last = st.last || [];
    var byW = taken(s.b, false), byB = taken(s.b, true), d = byW.sum - byB.sum;
    var h = '<div class="ply' + (s.t === 'b' && !st.result ? ' on' : '') + '"><img src="' + pieceSrc('bK') + '" style="width:28px">' + esc(st.black) + (me === 'b' ? ' (أنت)' : '') + '</div>';
    h += takenRow(byB, -d);
    h += '<div class="board">';
    for (var v = 0; v < 64; v++) {
      var i = me === 'b' ? 63 - v : v, p = s.b[i];
      var light = (((i >> 3) + (i & 7)) % 2) === 0;
      var cls = 'sq ' + (light ? 'l' : 'd') + (last.indexOf(i) >= 0 ? ' last' : '') + (i === sel ? ' sel' : '') + (i === chk ? ' chk' : '');
      var t = targets.filter(function (x) { return x.t === i; })[0];
      h += '<div class="' + cls + '" data-i="' + i + '">' + (p !== '.' ? '<img src="' + img(p) + '">' : '') +
        (t ? (p !== '.' || t.e ? '<span class="ring"></span>' : '<span class="dot"></span>') : '') + '</div>';
    }
    h += '</div>';
    h += takenRow(byW, d);
    h += '<div class="ply' + (s.t === 'w' && !st.result ? ' on' : '') + '"><img src="' + pieceSrc('wK') + '" style="width:28px">' + esc(st.white) + (me === 'w' ? ' (أنت)' : '') + '</div>';
    if (pendingPromo) {
      h += '<div class="muted" style="text-align:center">رقِّ البيدق إلى:</div><div class="promo">';
      ['q', 'r', 'b', 'n'].forEach(function (x) { h += '<button data-p="' + x + '"><img src="' + img(me === 'w' ? x.toUpperCase() : x) + '"></button>'; });
      h += '</div>';
    }
    var info = st.result ? st.result
      : !me ? 'أنت تشاهد المباراة'
      : myTurn ? (st.status === 'check' ? 'كش! أنقذ ملكك' : 'دورك: اضغط قطعة ثم المربع')
      : 'دور ' + (s.t === 'w' ? st.white : st.black);
    h += '<div class="q" style="font-size:18px">' + esc(info) + '</div>';
    if (me && !st.result) h += '<button class="btn ghost" id="rsg" style="font-size:16px;padding:10px">استسلام</button>';
    m.innerHTML = h;
    [].forEach.call(m.querySelectorAll('.sq'), function (el) {
      el.onclick = function () {
        if (!myTurn) return;
        var i = +el.getAttribute('data-i');
        var mv = targets.filter(function (x) { return x.t === i; });
        if (sel >= 0 && mv.length) {
          if (mv.length > 1) { pendingPromo = mv; renderChess(); return; }
          play(s, mv[0]);
          return;
        }
        sel = Chess.col(s.b[i]) === me ? i : -1;
        pendingPromo = null;
        snd('tick');
        renderChess();
      };
    });
    [].forEach.call(m.querySelectorAll('[data-p]'), function (b) {
      b.onclick = function () {
        var x = b.getAttribute('data-p');
        play(s, pendingPromo.filter(function (mv) { return mv.p === x; })[0]);
      };
    });
    var r = document.getElementById('rsg');
    if (r) r.onclick = function () { if (confirm('تستسلم وتنهي المباراة؟')) send({ t: 'chess_resign' }); };
  }
  function play(s, mv) {
    var ns = Chess.apply(s, mv), status = Chess.status(ns);
    send({ t: 'chess', s: ns, m: [mv.f, mv.t], st: status });
    st.chess = ns; st.last = [mv.f, mv.t]; st.status = status;
    sel = -1; pendingPromo = null; lastBoard = ns.b;
    snd('tick');
    if (navigator.vibrate) navigator.vibrate(15);
    renderChess();
  }

  /* ---------- الدومينو ---------- */
  var PIPS = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
  function half(n) {
    var h = '<div class="dh">';
    for (var k = 0; k < 9; k++) h += '<i' + (PIPS[n].indexOf(k) >= 0 ? ' class="on"' : '') + '></i>';
    return h + '</div>';
  }
  var pickTile = -1, lastHandN = 0;
  function renderDomino() {
    var hand = st.hand || [], pl = st.playable || [], my = st.myTurn, ends = st.ends;
    var canAny = pl.some(function (x) { return x; });
    var h = '';
    if (st.teams) {
      var ts = st.teamScore || [0, 0];
      h += '<div class="q" style="font-size:15px">' + (st.partner ? '🤝 شريكك: ' + esc(st.partner) + ' · ' : '') + 'النقاط: ' + ar(ts[0]) + ' – ' + ar(ts[1]) + '</div>';
    }
    if (st.match && st.match.length) {
      // نقاط المباراة حتى ١٠١
      h += '<div class="muted" style="text-align:center;font-size:13px">الجولة ' + ar(st.round || 1) + ' · الهدف ' + ar(st.target || 101) + '</div><div class="chips" style="justify-content:center">';
      (st.teams ? [{ name: 'فريقكم', pts: (st.teamScore || [0, 0])[st.myTeam || 0], me: true }, { name: 'الخصم', pts: (st.teamScore || [0, 0])[1 - (st.myTeam || 0)] }] : st.match).forEach(function (r) {
        h += '<span class="chip"' + (r.me ? ' style="background:#7C5A10"' : '') + '>' + esc(r.name) + ': ' + ar(r.pts) + '</span>';
      });
      h += '</div>';
    }
    h += '<div class="chips" style="justify-content:center">';
    (st.others || []).forEach(function (o) { h += '<span class="chip"' + (o.mate ? ' style="background:#166534"' : '') + '>' + (o.mate ? '🤝 ' : '') + esc(o.name) + ': ' + ar(o.n) + '</span>'; });
    h += '</div>';
    if (st.bone > 0) {
      // كومة السحب: أوراق مقلوبة متراكبة وعددها
      var stk = '';
      for (var b = 0; b < Math.min(5, st.bone); b++) stk += '<i class="bk" style="left:' + (b * 9) + 'px;top:' + (b % 2 ? 2 : 0) + 'px;transform:rotate(' + ((b - 2) * 4) + 'deg)"></i>';
      h += '<div class="pile"><div class="stk">' + stk + '</div><b>الكومة: ' + ar(st.bone) + '</b></div>';
    }
    h += '<div class="q" style="font-size:18px">' + (st.result ? esc(st.result) : ends ? '<span dir="ltr" style="display:inline-flex;gap:14px"><span dir="rtl">يسار ' + ar(ends[0]) + ' ◀</span><span>·</span><span dir="rtl">▶ يمين ' + ar(ends[1]) + '</span></span>' : 'الطاولة فارغة') + '</div>';
    if (!st.result) h += '<div class="muted" style="text-align:center">' + esc(st.note || '') + '</div>';
    else h += '<div class="muted" style="text-align:center">' + (st.matchOver ? 'انتهت المباراة! المتحكم يبدأ مباراة جديدة' : 'الجولة التالية تبدأ تلقائيًا…') + '</div>';
    if (!st.seated) {
      m.innerHTML = h + '<div class="center muted">أنت تشاهد هذه الجولة (أربعة لاعبين كحد أقصى)</div>';
      return;
    }
    h += '<div class="big" style="font-size:22px;text-align:center;color:' + (my ? '#22C55E' : '#A7B0C4') + '">' +
      (st.result ? '' : my ? 'دورك!' : 'دور ' + esc(st.turnName)) + '</div>';
    h += '<div class="hand">';
    var grew = hand.length > lastHandN && lastHandN > 0 && !!ends;
    hand.forEach(function (t, i) {
      h += '<div class="dt' + (grew && i === hand.length - 1 ? ' new' : '') + (my && pl[i] ? ' go' : (my ? ' no' : '')) + '" data-t="' + i + '">' + half(t[0]) + half(t[1]) + '</div>';
    });
    h += '</div>';
    if (pickTile >= 0 && my) {
      h += '<div class="muted" style="text-align:center">الحجر يركب في الطرفين، اختر المكان:</div>' +
        '<div class="row" dir="ltr" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><button class="btn" dir="rtl" data-s="L">يسار الطاولة (' + ar(ends[0]) + ') ◀</button>' +
        '<button class="btn" dir="rtl" data-s="R">▶ يمين الطاولة (' + ar(ends[1]) + ')</button></div>';
    }
    if (my && !canAny && !st.result) {
      h += st.bone > 0
        ? '<button class="btn drawbtn" id="dd">🂠 اسحب ورقة من الكومة (' + ar(st.bone) + ')</button>'
        : '<button class="btn" id="dp">لا يوجد حجر مناسب والكومة فارغة: دُقّ ومرّر الدور</button>';
    }
    lastHandN = hand.length;
    if (my && !ends && !st.result) h += '<div class="muted" style="text-align:center">ابدأ بالحجر المضيء</div>';
    m.innerHTML = h;
    [].forEach.call(m.querySelectorAll('[data-t]'), function (el) {
      el.onclick = function () {
        var i = +el.getAttribute('data-t');
        if (!my || !pl[i]) return;
        var t = hand[i];
        var both = ends && t.indexOf(ends[0]) >= 0 && t.indexOf(ends[1]) >= 0 && ends[0] !== ends[1];
        if (both) { pickTile = i; renderDomino(); return; }
        pickTile = -1;
        send({ t: 'dom', a: 'play', i: i, side: ends && t.indexOf(ends[0]) >= 0 ? 'L' : 'R' });
        snd('tick');
      };
    });
    [].forEach.call(m.querySelectorAll('[data-s]'), function (b) {
      b.onclick = function () { send({ t: 'dom', a: 'play', i: pickTile, side: b.getAttribute('data-s') }); pickTile = -1; snd('tick'); };
    });
    var dp = document.getElementById('dp'); if (dp) dp.onclick = function () { send({ t: 'dom', a: 'pass' }); };
    var dd = document.getElementById('dd'); if (dd) dd.onclick = function () { dd.disabled = true; send({ t: 'dom', a: 'draw' }); snd('tick'); };
  }

  /* ---------- ربط العرض ---------- */
  var baseRender = window.render, prevPhase = '', prevResult = '', prevRev = '';
  window.render = function () {
    document.getElementById('sc').textContent = ar(st.score || 0);
    var ph = st.phase;
    if (ph !== 'domino') pickTile = -1;
    if (ph === 'lobby' && st.master) masterLobby();
    else if (ph === 'chess') renderChess();
    else if (ph === 'domino') renderDomino();
    else {
      baseRender();
      if (ph === 'lobby' && st.masterName) {
        var d = document.createElement('div');
        d.className = 'muted'; d.style.textAlign = 'center';
        d.textContent = '👑 المتحكم: ' + st.masterName + ' (هو من يختار اللعبة ويبدؤها)';
        m.appendChild(d);
      }
    }
    // الأصوات: صح أو خطأ، والفوز
    var rev = ph + '|' + (st.round || '') + '|' + (st.answer == null ? '' : st.answer);
    if ((ph === 'reveal' || ph === 'seqReveal') && rev !== prevRev) snd((ph === 'reveal' ? st.answer === st.correct : st.ok) ? 'ok' : 'bad');
    if ((ph === 'podium' || ph === 'tapResult') && prevPhase !== ph && st.rank === 1) snd('win');
    if (st.result && st.result !== prevResult && (ph === 'chess' || ph === 'domino')) {
      snd(st.result.indexOf('فاز ' + st.name) >= 0 ? 'win' : (st.result.indexOf('تعادل') === 0 ? 'ok' : 'bad'));
    }
    prevRev = rev; prevPhase = ph; prevResult = st.result || '';
    hostBar();
  };
})();
