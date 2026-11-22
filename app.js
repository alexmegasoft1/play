/* سكربت لوحة تحكم الشاشة: الريموت، والجرس، والرسالة الصوتية، والرفع، والمتابعة اللحظية. */
(function () {
  'use strict';

  var meta = function (name) {
    var el = document.querySelector('meta[name="' + name + '"]');
    return el ? el.getAttribute('content') : '';
  };
  var CSRF = meta('csrf-token');
  var DEVICE = meta('device-id');
  // ريموت GitHub يضبط هذين: عنوان ajax.php على السيرفر، ودالة تعيد حقول الطلب الموقّع بمفتاح الشاشة
  var AJAX = window.MEGA_AJAX || 'ajax.php';
  var AUTH = typeof window.MEGA_AUTH === 'function' ? window.MEGA_AUTH : null;
  /** طلب قراءة (اللقطة والحالة) مع التوقيع إن وُجد. */
  function ajaxGet(op) {
    var url = AJAX + '?op=' + op + '&device=' + encodeURIComponent(DEVICE) + '&t=' + Date.now();
    if (!AUTH) return fetch(url, { credentials: 'same-origin' });
    return AUTH(op).then(function (f) {
      Object.keys(f).forEach(function (k) { url += '&' + k + '=' + encodeURIComponent(f[k]); });
      return fetch(url, { credentials: 'omit', cache: 'no-store' });
    });
  }

  /* ------------------------------------------------------------ */
  /* إشعار صغير أسفل الصفحة                                         */
  /* ------------------------------------------------------------ */
  var toastBox = document.createElement('div');
  toastBox.setAttribute('role', 'status');
  toastBox.className = 'fixed z-50 left-1/2 -translate-x-1/2 bottom-24 md:bottom-6 flex flex-col items-center gap-2 pointer-events-none';
  document.body.appendChild(toastBox);

  function toast(text, type) {
    var el = document.createElement('div');
    el.className = 'pointer-events-auto rounded-2xl px-5 py-3 shadow-lg text-sm font-bold ' +
      (type === 'error' ? 'bg-red-600 text-white' : type === 'reply' ? 'bg-amber-400 text-slate-900' : 'bg-ink text-white');
    el.textContent = text;
    toastBox.appendChild(el);
    setTimeout(function () { el.remove(); }, type === 'reply' ? 6000 : 2500);
  }
  window.megaToast = toast;

  /* القناة الفورية مع الشاشة: الأزرار والمؤشر والكتابة تذهب عبرها مباشرة، والسيرفر احتياطي فقط */
  var RT = null;
  try {
    if (window.MEGA_RT_KEY && window.MegaRT) {
      var paintRT = function () {
        var up = !!(RT && RT.live());
        document.querySelectorAll('[data-rt-state]').forEach(function (el) {
          el.textContent = up ? '⚡ اتصال فوري' : 'عبر السيرفر';
          el.className = el.className.replace(/\b(text|bg)-(emerald|slate)-\d+\b/g, '') + (up ? ' text-emerald-300' : ' text-slate-400');
        });
      };
      RT = new window.MegaRT(window.MEGA_RT_KEY, { onstate: paintRT, onstatus: paintRT });
      setInterval(paintRT, 10000);
    }
  } catch (e) { RT = null; }
  // القناة الفورية فقط إن كانت الشاشة نفسها متصلة بها (وصلت حالتها مؤخرًا)، وإلا السيرفر
  function viaRT(c, p) { return RT && RT.live() ? RT.send(c, p, true) : Promise.resolve(false); }
  window.megaRT = function () { return RT; };
  /* عمليات لا تحتاج تنبيه الشاشة (فورية أصلًا، أو تخص السيرفر وحده) */
  var NO_NUDGE = { key: 1, cursor: 1, type: 1, apk_chunk: 1, apk_clear: 1, dash_update: 1, dash_rollback: 1, party_master: 1 };

  function post(op, data, onProgress) {
    return postRaw(op, data, onProgress).then(function (res) {
      // أمر جديد للشاشة: ننبهها عبر القناة الفورية لتسأل السيرفر الآن بدل انتظار دورتها
      if (!NO_NUDGE[op]) viaRT('nudge', {});
      return res;
    });
  }

  function postRaw(op, data, onProgress) {
    if (AUTH) {
      return AUTH(op).then(function (f) {
        var form = data instanceof FormData ? data : new FormData();
        if (!(data instanceof FormData)) Object.keys(data || {}).forEach(function (k) { form.append(k, data[k]); });
        Object.keys(f).forEach(function (k) { form.append(k, f[k]); });
        return postXhr(op, form, onProgress);
      });
    }
    return postXhr(op, data, onProgress);
  }

  function postXhr(op, data, onProgress) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', AJAX + '?op=' + encodeURIComponent(op));
      if (!AUTH) xhr.setRequestHeader('X-CSRF', CSRF);
      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = function (e) {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
      }
      xhr.onload = function () {
        var res = {};
        try { res = JSON.parse(xhr.responseText); } catch (e) { res = { ok: false, error: 'استجابة غير متوقعة من الخادم.' }; }
        if (xhr.status >= 200 && xhr.status < 300 && res.ok) resolve(res); else reject(res.error || 'حدث خطأ.');
      };
      xhr.onerror = function () { reject('تعذّر الاتصال بالخادم.'); };
      var form = data instanceof FormData ? data : new FormData();
      if (!(data instanceof FormData)) {
        Object.keys(data || {}).forEach(function (k) { form.append(k, data[k]); });
      }
      form.append('device_id', DEVICE);
      xhr.send(form);
    });
  }

  /* ------------------------------------------------------------ */
  /* الريموت: إرسال الأزرار بالترتيب وبأقل تأخير                     */
  /* ------------------------------------------------------------ */
  var keyChain = Promise.resolve();
  function sendKey(key) {
    if (navigator.vibrate) navigator.vibrate(12);
    keyChain = keyChain.then(function () {
      return viaRT('key', { key: key }).then(function (sent) {
        if (!sent) return post('key', { key: key }).catch(function (err) { toast(err, 'error'); });
      });
    });
  }
  window.megaSendKey = sendKey;

  document.querySelectorAll('[data-key]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      sendKey(btn.getAttribute('data-key'));
    });
  });

  /* ------------------------------------------------------------ */
  /* المؤشر: تجميع حركة الإصبع وإرسالها بدفعات صغيرة متتالية        */
  /* ------------------------------------------------------------ */
  var cursorAcc = { dx: 0, dy: 0 };
  var cursorBusy = false;
  function flushCursor() {
    if (cursorBusy || (Math.abs(cursorAcc.dx) < 0.002 && Math.abs(cursorAcc.dy) < 0.002)) return;
    var dx = cursorAcc.dx, dy = cursorAcc.dy;
    cursorAcc.dx = 0; cursorAcc.dy = 0;
    cursorBusy = true;
    var mv = { action: 'move', dx: +dx.toFixed(4), dy: +dy.toFixed(4) };
    viaRT('cursor', mv)
      .then(function (sent) { if (!sent) return post('cursor', { action: 'move', dx: dx.toFixed(4), dy: dy.toFixed(4) }); })
      .catch(function () {})
      .finally(function () { cursorBusy = false; flushCursor(); });
  }
  function cursorAction(action, extra) {
    var data = { action: action };
    Object.keys(extra || {}).forEach(function (k) { data[k] = extra[k]; });
    keyChain = keyChain.then(function () {
      return viaRT('cursor', data).then(function (sent) {
        if (!sent) return post('cursor', data).catch(function (err) { toast(err, 'error'); });
      });
    });
  }

  /* لوحة اللمس: في وضع «تنقّل» السحب أسهم، وفي وضع «مؤشر» تحرّك المؤشر وتنقر */
  var pad = document.getElementById('touchpad');
  var remoteMode = 'touch';
  if (pad) {
    var STEP = 56;
    var start = null;
    var anchor = null;
    var last = null;
    var moved = 0;
    var longTimer = null;
    var longFired = false;
    var dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.opacity = '0';
    pad.appendChild(dot);
    var flash = document.getElementById('flash');
    var arrows = { up: '↑', down: '↓', left: '←', right: '→', ok: '●', back: '↩' };

    var local = function (e) {
      var r = pad.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
    };
    var showFlash = function (key) {
      if (!flash) return;
      flash.textContent = arrows[key] || '';
      flash.style.fontSize = '96px';
      flash.classList.remove('arrow-flash');
      void flash.offsetWidth;
      flash.classList.add('arrow-flash');
    };
    var ripple = function (p) {
      var r = document.createElement('span');
      r.className = 'ripple';
      r.style.left = p.x + 'px';
      r.style.top = p.y + 'px';
      pad.appendChild(r);
      setTimeout(function () { r.remove(); }, 500);
    };

    pad.addEventListener('pointerdown', function (e) {
      pad.setPointerCapture(e.pointerId);
      var p = local(e);
      start = { x: p.x, y: p.y, t: Date.now() };
      anchor = { x: p.x, y: p.y };
      last = { x: p.x, y: p.y };
      moved = 0;
      longFired = false;
      dot.style.left = p.x + 'px';
      dot.style.top = p.y + 'px';
      dot.style.opacity = '1';
      if (remoteMode === 'mouse') cursorAction('show');
      clearTimeout(longTimer);
      longTimer = setTimeout(function () {
        if (moved < 12) {
          longFired = true;
          if (remoteMode === 'mouse') {
            cursorAction('long');
          } else {
            sendKey('back');
            showFlash('back');
          }
          if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
        }
      }, 650);
    });

    pad.addEventListener('pointermove', function (e) {
      if (!start) return;
      var p = local(e);
      dot.style.left = p.x + 'px';
      dot.style.top = p.y + 'px';
      moved = Math.max(moved, Math.abs(p.x - start.x) + Math.abs(p.y - start.y));
      if (remoteMode === 'mouse') {
        cursorAcc.dx += (p.x - last.x) / p.w;
        cursorAcc.dy += (p.y - last.y) / p.h;
        last = { x: p.x, y: p.y };
        if (moved >= 12) clearTimeout(longTimer);
        flushCursor();
        return;
      }
      var dx = p.x - anchor.x;
      var dy = p.y - anchor.y;
      if (Math.abs(dx) >= STEP || Math.abs(dy) >= STEP) {
        var key = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        sendKey(key);
        showFlash(key);
        anchor = { x: p.x, y: p.y };
        clearTimeout(longTimer);
      }
    });

    var end = function (e) {
      if (!start) return;
      clearTimeout(longTimer);
      var p = local(e);
      if (!longFired && moved < 12 && Date.now() - start.t < 450) {
        if (remoteMode === 'mouse') {
          cursorAction('tap');
        } else {
          sendKey('ok');
          showFlash('ok');
        }
        ripple(p);
        if (navigator.vibrate) navigator.vibrate(12);
      }
      start = null;
      dot.style.opacity = '0';
    };
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);
  }

  /* شريط التمرير في وضع المؤشر */
  var strip = document.getElementById('scroll-strip');
  if (strip) {
    var sy = null;
    var acc = 0;
    strip.addEventListener('pointerdown', function (e) { strip.setPointerCapture(e.pointerId); sy = e.clientY; acc = 0; });
    strip.addEventListener('pointermove', function (e) {
      if (sy === null) return;
      acc += (e.clientY - sy) / strip.getBoundingClientRect().height;
      sy = e.clientY;
      if (Math.abs(acc) >= 0.12) {
        cursorAction('scroll', { dy: (-acc).toFixed(3) });
        acc = 0;
      }
    });
    var stripEnd = function () { sy = null; };
    strip.addEventListener('pointerup', stripEnd);
    strip.addEventListener('pointercancel', stripEnd);
  }

  /* التبديل بين التنقّل والمؤشر والأسهم */
  var modeButtons = document.querySelectorAll('[data-mode]');
  if (modeButtons.length) {
    var touchMode = document.getElementById('touch-mode');
    var dpadMode = document.getElementById('dpad-mode');
    var hint = document.getElementById('pad-hint');
    var applyMode = function (mode) {
      remoteMode = mode;
      touchMode.classList.toggle('hidden', mode === 'dpad');
      dpadMode.classList.toggle('hidden', mode !== 'dpad');
      if (strip) strip.classList.toggle('hidden', mode !== 'mouse');
      if (pad) pad.classList.toggle('mouse', mode === 'mouse');
      if (hint) {
        hint.textContent = mode === 'mouse'
          ? 'حرّك إصبعك لتحريك المؤشر · اضغط للنقر · اضغط مطولًا للضغط المطوّل'
          : 'اسحب للتنقل · اضغط للاختيار · اضغط مطولًا للرجوع';
      }
      modeButtons.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-mode') === mode ? 'true' : 'false'); });
      try { localStorage.setItem('remote-mode', mode); } catch (e) {}
    };
    var saved = 'touch';
    try { saved = localStorage.getItem('remote-mode') || 'touch'; } catch (e) {}
    applyMode(['touch', 'mouse', 'dpad'].indexOf(saved) >= 0 ? saved : 'touch');
    modeButtons.forEach(function (b) {
      b.addEventListener('click', function () { applyMode(b.getAttribute('data-mode')); });
    });
  }

  /* ------------------------------------------------------------ */
  /* عرض الشاشة: لقطات متتالية ما دامت الصفحة ظاهرة                  */
  /* ------------------------------------------------------------ */
  var screenToggle = document.getElementById('screen-toggle');
  var screenPanel = document.getElementById('screen-panel');
  if (screenToggle && screenPanel) {
    var screenImg = document.getElementById('screen-img');
    var screenStatus = document.getElementById('screen-status');
    var watching = false;
    var loading = false;
    var lastStart = 0;
    var waits = 0;

    var startShare = function () {
      lastStart = Date.now();
      post('screen', { action: 'start' }).catch(function (err) { toast(err, 'error'); });
    };
    var nextFrame = function () {
      if (!watching || loading || document.visibilityState !== 'visible') return;
      loading = true;
      ajaxGet('frame')
        .then(function (r) {
          if (r.status === 200) return r.blob().then(function (b) { return { blob: b }; });
          return r.json().then(function (j) { return { wait: true, error: j.error || '' }; });
        })
        .then(function (res) {
          loading = false;
          if (res.blob) {
            var url = URL.createObjectURL(res.blob);
            var old = screenImg.src;
            screenImg.src = url;
            if (old && old.indexOf('blob:') === 0) setTimeout(function () { URL.revokeObjectURL(old); }, 2000);
            screenImg.classList.remove('hidden');
            screenStatus.classList.add('hidden');
            waits = 0;
            setTimeout(nextFrame, 450);
          } else {
            waits++;
            if (res.error) {
              screenStatus.textContent = res.error;
            }
            screenStatus.classList.remove('hidden');
            // إعادة طلب المشاركة إن طال الانتظار (مثلًا بعد توقفها تلقائيًا)
            if (waits % 12 === 0 && Date.now() - lastStart > 15000) startShare();
            setTimeout(nextFrame, 900);
          }
        })
        .catch(function () { loading = false; setTimeout(nextFrame, 1500); });
    };
    var openScreen = function () {
      watching = true;
      screenPanel.classList.remove('hidden');
      screenToggle.classList.add('text-amber-400');
      screenStatus.textContent = 'جارٍ بدء المشاركة... قد تظهر على الشاشة نافذة «بدء المشاركة» لمرة واحدة.';
      startShare();
      nextFrame();
    };
    var closeScreen = function (stopTv) {
      watching = false;
      screenPanel.classList.add('hidden');
      screenToggle.classList.remove('text-amber-400');
      if (stopTv) post('screen', { action: 'stop' }).catch(function () {});
    };
    screenToggle.addEventListener('click', function () { watching ? closeScreen(true) : openScreen(); });
    document.getElementById('screen-stop').addEventListener('click', function () { closeScreen(true); });
    document.addEventListener('visibilitychange', function () { if (watching) nextFrame(); });
    /* النقر والسحب على الصورة: النقرة تنقر في نفس المكان، والسحب يمرّر الشاشة بنفس الاتجاه */
    screenImg.style.touchAction = 'none';
    var drag = null;
    var rel = function (e) {
      var r = screenImg.getBoundingClientRect();
      return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
    };
    screenImg.addEventListener('pointerdown', function (e) {
      screenImg.setPointerCapture(e.pointerId);
      var p = rel(e);
      drag = { sx: p.x, sy: p.y, lx: p.x, ly: p.y, moved: false };
    });
    screenImg.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var p = rel(e);
      var dx = p.x - drag.lx, dy = p.y - drag.ly;
      if (Math.abs(p.y - drag.sy) > 0.03 || Math.abs(p.x - drag.sx) > 0.03) drag.moved = true;
      // يُرسل السحب على مراحل ليتبع الإصبع أثناء الحركة الطويلة
      if (drag.moved && (Math.abs(dy) >= 0.12 || Math.abs(dx) >= 0.12)) {
        cursorAction('swipe_at', { x: drag.lx.toFixed(4), y: drag.ly.toFixed(4), dx: dx.toFixed(4), dy: dy.toFixed(4) });
        drag.lx = p.x;
        drag.ly = p.y;
      }
    });
    var dragEnd = function (e) {
      if (!drag) return;
      var p = rel(e);
      if (!drag.moved) {
        cursorAction('tap_at', { x: p.x.toFixed(4), y: p.y.toFixed(4) });
        if (navigator.vibrate) navigator.vibrate(12);
      } else {
        var dx = p.x - drag.lx, dy = p.y - drag.ly;
        if (Math.abs(dy) > 0.02 || Math.abs(dx) > 0.02) {
          cursorAction('swipe_at', { x: drag.lx.toFixed(4), y: drag.ly.toFixed(4), dx: dx.toFixed(4), dy: dy.toFixed(4) });
        }
      }
      drag = null;
    };
    screenImg.addEventListener('pointerup', dragEnd);
    screenImg.addEventListener('pointercancel', function () { drag = null; });
  }

  /* مؤقت النوم ومكتبتي */
  var sleepBtn = document.getElementById('sleep-btn');
  var sleepMenu = document.getElementById('sleep-menu');
  if (sleepBtn && sleepMenu) {
    sleepBtn.addEventListener('click', function () { sleepMenu.classList.toggle('hidden'); });
    sleepMenu.querySelectorAll('[data-sleep]').forEach(function (b) {
      b.addEventListener('click', function () {
        var m = parseInt(b.getAttribute('data-sleep'), 10);
        post('sleep', { minutes: m }).then(function () {
          toast(m > 0 ? 'ستنام الشاشة بعد ' + m + ' دقيقة' : 'أُلغي مؤقت النوم');
          sleepMenu.classList.add('hidden');
        }).catch(function (err) { toast(err, 'error'); });
      });
    });
  }
  var a11yBtn = document.getElementById('a11y-btn');
  if (a11yBtn) {
    a11yBtn.addEventListener('click', function () {
      post('open_a11y', {}).then(function () { toast('فُتحت صفحة التفعيل على الشاشة'); })
        .catch(function (err) { toast(err, 'error'); });
    });
  }
  var libraryBtn = document.getElementById('library-btn');
  if (libraryBtn) {
    libraryBtn.addEventListener('click', function () {
      post('open_library', {}).then(function () { toast('فُتحت «مكتبتي» على الشاشة'); })
        .catch(function (err) { toast(err, 'error'); });
    });
  }

  /* ------------------------------------------------------------ */
  /* الجرس                                                          */
  /* ------------------------------------------------------------ */
  var bell = document.getElementById('bell-btn');
  if (bell) {
    bell.addEventListener('click', function () {
      bell.disabled = true;
      post('bell', {}).then(function () { toast('رنّ الجرس على الشاشة'); })
        .catch(function (err) { toast(err, 'error'); })
        .finally(function () { setTimeout(function () { bell.disabled = false; }, 1500); });
    });
  }

  /* ------------------------------------------------------------ */
  /* الرسالة الصوتية                                                */
  /* ------------------------------------------------------------ */
  var recBtn = document.getElementById('rec-btn');
  if (recBtn) {
    var recLabel = document.getElementById('rec-label');
    var recIdle = recLabel.textContent;
    var recorder = null;
    var chunks = [];
    var started = 0;
    var timer = null;

    var pickType = function () {
      var types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
      for (var i = 0; i < types.length; i++) {
        if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(types[i])) return types[i];
      }
      return '';
    };

    var stopRecording = function () {
      if (recorder && recorder.state === 'recording') recorder.stop();
    };

    recBtn.addEventListener('click', function () {
      if (recorder && recorder.state === 'recording') { stopRecording(); return; }
      if (!navigator.mediaDevices || !window.MediaRecorder) {
        toast('المتصفح لا يدعم التسجيل الصوتي.', 'error');
        return;
      }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        var type = pickType();
        recorder = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream);
        chunks = [];
        recorder.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        recorder.onstop = function () {
          clearInterval(timer);
          stream.getTracks().forEach(function (t) { t.stop(); });
          recBtn.classList.remove('bg-red-600', 'text-white');
          recLabel.textContent = 'جارٍ الإرسال...';
          var mime = recorder.mimeType || 'audio/webm';
          var ext = mime.indexOf('mp4') >= 0 ? 'm4a' : mime.indexOf('ogg') >= 0 ? 'ogg' : 'webm';
          var blob = new Blob(chunks, { type: mime });
          var form = new FormData();
          form.append('audio', blob, 'voice.' + ext);
          post('voice', form).then(function () { toast('أُرسلت الرسالة الصوتية'); })
            .catch(function (err) { toast(err, 'error'); })
            .finally(function () { recLabel.textContent = recIdle; });
        };
        recorder.start();
        started = Date.now();
        recBtn.classList.add('bg-red-600', 'text-white');
        recLabel.textContent = 'جارٍ التسجيل... اضغط للإرسال';
        timer = setInterval(function () {
          var s = Math.floor((Date.now() - started) / 1000);
          recLabel.textContent = 'جارٍ التسجيل ' + s + ' ث... اضغط للإرسال';
          if (s >= 60) stopRecording();
        }, 500);
      }).catch(function () { toast('اسمح للمتصفح باستخدام الميكروفون.', 'error'); });
    });
  }

  /* ------------------------------------------------------------ */
  /* رفع ملفات المعرض مع شريط تقدّم                                 */
  /* ------------------------------------------------------------ */
  var uploadForm = document.getElementById('media-upload');
  if (uploadForm) {
    var input = document.getElementById('media-files');
    var list = document.getElementById('upload-progress');
    uploadForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var files = Array.prototype.slice.call(input.files || []);
      if (!files.length) { toast('اختر صورة أو فيديو أولًا.', 'error'); return; }
      var show = document.getElementById('media-show').checked ? '1' : '';
      var chain = Promise.resolve();
      files.forEach(function (file) {
        var row = document.createElement('div');
        row.className = 'text-sm space-y-1';
        row.innerHTML = '<div class="flex justify-between gap-2"><span class="truncate"></span><span class="pct text-slate-500">0٪</span></div><div class="h-2 rounded-full bg-slate-200 overflow-hidden"><div class="bar h-full bg-amber-400" style="width:0%"></div></div>';
        row.querySelector('.truncate').textContent = file.name;
        list.appendChild(row);
        chain = chain.then(function () {
          var form = new FormData();
          form.append('file', file);
          form.append('show', show);
          return post('media_upload', form, function (p) {
            row.querySelector('.bar').style.width = p + '%';
            row.querySelector('.pct').textContent = p + '٪';
          }).then(function () {
            row.querySelector('.pct').textContent = 'تم';
          }).catch(function (err) {
            row.querySelector('.pct').textContent = err;
            row.querySelector('.bar').className = 'bar h-full bg-red-500';
          });
        });
      });
      chain.then(function () { setTimeout(function () { location.reload(); }, 800); });
    });
  }

  /* ------------------------------------------------------------ */
  /* رفع صور الواجهة                                                */
  /* ------------------------------------------------------------ */
  var slideForm = document.getElementById('slide-upload');
  if (slideForm) {
    slideForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var files = Array.prototype.slice.call(document.getElementById('slide-files').files || []);
      if (!files.length) { toast('اختر صورة أولًا.', 'error'); return; }
      var kind = document.getElementById('slide-kind').value;
      var box = document.getElementById('slide-progress');
      var chain = Promise.resolve();
      files.forEach(function (file) {
        var row = document.createElement('div');
        row.className = 'text-sm flex justify-between gap-2';
        row.innerHTML = '<span class="truncate"></span><span class="pct text-slate-500">0٪</span>';
        row.firstChild.textContent = file.name;
        box.appendChild(row);
        chain = chain.then(function () {
          var form = new FormData();
          form.append('file', file);
          form.append('kind', kind);
          return post('slide_upload', form, function (p) { row.querySelector('.pct').textContent = p + '٪'; })
            .then(function () { row.querySelector('.pct').textContent = 'تم'; })
            .catch(function (err) { row.querySelector('.pct').textContent = err; });
        });
      });
      chain.then(function () { setTimeout(function () { location.reload(); }, 700); });
    });
  }

  /* ------------------------------------------------------------ */
  /* المتابعة اللحظية: الحالة والردود (فقط والصفحة ظاهرة)           */
  /* ------------------------------------------------------------ */
  var statusDot = document.getElementById('live-dot');
  var statusText = document.getElementById('live-text');
  var repliesBox = document.getElementById('live-replies');
  var known = {};
  var first = true;

  function poll() {
    if (!DEVICE || document.visibilityState !== 'visible') return;
    ajaxGet('live')
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.ok) return;
        if (window.MEGA_ON_LIVE) window.MEGA_ON_LIVE(res);
        if (statusDot) statusDot.className = statusDot.className.replace(/bg-\S+/g, '') + (res.online ? ' bg-green-500' : ' bg-slate-500');
        if (statusText) statusText.textContent = (res.online ? 'متصلة الآن' : 'غير متصلة') + ' · آخر اتصال ' + res.last_seen;
        var nowText = document.getElementById('now-text');
        if (nowText) {
          nowText.textContent = res.online && res.now ? 'على الشاشة الآن: ' + res.now : '';
          nowText.classList.toggle('hidden', !(res.online && res.now));
        }
        setAmbientState(!!res.ambient_on);
        var html = '';
        res.items.forEach(function (item) {
          var key = item.id + ':' + (item.reply || '');
          if (!first && item.reply && !known[key]) toast('ردّت الشاشة: ' + item.reply, 'reply');
          known[key] = true;
          if (repliesBox && item.reply) {
            html += '<li class="flex justify-between gap-3 py-2 text-sm"><span><b>' + escapeHtml(item.reply) + '</b> <span class="text-slate-500">على «' + escapeHtml(item.text || 'الجرس') + '»</span></span><span class="text-slate-500 whitespace-nowrap">' + escapeHtml(item.replied || '') + '</span></li>';
          }
        });
        if (repliesBox) repliesBox.innerHTML = html || '<li class="py-2 text-sm text-slate-500">لا توجد ردود بعد.</li>';
        first = false;
      }).catch(function () {});
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  if (DEVICE) {
    poll();
    setInterval(poll, 4000);
    document.addEventListener('visibilitychange', poll);
  }

  /* رسائل جاهزة */
  document.querySelectorAll('.preset').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var field = document.getElementById('text');
      if (!field) return;
      field.value = btn.getAttribute('data-preset');
      field.focus();
    });
  });
  /* ------------------------------------------------------------ */
  /* الإصدار ٦: الشاشات المضمّنة، شاشة العرض، الكتابة، والمدن         */
  /* ------------------------------------------------------------ */
  var screenNames = { youtube: 'يوتيوب', whatsapp: 'واتساب ويب', weather: 'الطقس', globe: 'الكرة الأرضية', fun: 'ألعاب ومرح', draw: 'ارسم من موبايلك', party: 'العب مع العائلة' };
  document.querySelectorAll('[data-screen]').forEach(function (b) {
    b.addEventListener('click', function () {
      var screen = b.getAttribute('data-screen');
      post('open_screen', { screen: screen }).then(function () { toast('فُتح «' + screenNames[screen] + '» على الشاشة'); })
        .catch(function (err) { toast(err, 'error'); });
    });
  });

  var ambientBtn = document.getElementById('ambient-btn');
  var ambientStatus = document.getElementById('amb-status');
  function setAmbientState(on) {
    if (ambientBtn) {
      ambientBtn.setAttribute('data-on', on ? '1' : '0');
      var label = document.getElementById('ambient-label');
      if (label) label.textContent = on ? 'إيقاف شاشة العرض' : 'تشغيل شاشة العرض';
      ambientBtn.classList.toggle('bg-violet-500/20', on);
      ambientBtn.classList.toggle('border-violet-400/50', on);
      ambientBtn.classList.toggle('bg-ink-2', !on);
      ambientBtn.classList.toggle('border-white/10', !on);
    }
    if (ambientStatus) {
      ambientStatus.textContent = on ? 'تعمل الآن على الشاشة' : 'متوقفة';
      ambientStatus.className = 'text-xs rounded-full px-3 py-1 ' + (on ? 'bg-violet-100 text-violet-800' : 'bg-slate-100 text-slate-600');
    }
  }
  function ambient(action) {
    post('ambient', { action: action }).then(function () {
      setAmbientState(action === 'start');
      toast(action === 'start' ? 'شُغّلت شاشة العرض' : 'أُوقفت شاشة العرض');
    }).catch(function (err) { toast(err, 'error'); });
  }
  if (ambientBtn) {
    ambientBtn.addEventListener('click', function () {
      ambient(ambientBtn.getAttribute('data-on') === '1' ? 'stop' : 'start');
    });
  }
  document.querySelectorAll('[data-ambient]').forEach(function (b) {
    b.addEventListener('click', function () { ambient(b.getAttribute('data-ambient')); });
  });

  var ambientForm = document.getElementById('ambient-form');
  if (ambientForm) {
    ambientForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = new FormData(ambientForm);
      ['night_dim', 'show_info', 'guest_no_photos'].forEach(function (k) { if (!f.has(k)) f.append(k, '0'); });
      post('ambient_save', f).then(function () { toast('حُفظت إعدادات شاشة العرض'); })
        .catch(function (err) { toast(err, 'error'); });
    });
  }

  /* الكتابة على الشاشة: إرسال، ومرآة لحظية، وإملاء صوتي، ولصق، ونسخ من الشاشة */
  var typeForm = document.getElementById('type-form');
  if (typeForm) {
    var typeInput = document.getElementById('type-text');
    var typeLive = document.getElementById('type-live');
    var typeStatus = document.getElementById('type-status');
    var liveTimer = null;
    var lastSent = '';
    var typeChain = Promise.resolve();
    var status = function (text) {
      if (!typeStatus) return;
      typeStatus.textContent = text || '';
      typeStatus.classList.toggle('hidden', !text);
    };
    var sendType = function (data, quiet) {
      typeChain = typeChain.then(function () {
        return viaRT('type', data).then(function (sent) {
          return sent ? null : post('type', data);
        }).then(function () { if (!quiet) toast('كُتب على الشاشة'); })
          .catch(function (err) { toast(err, 'error'); });
      });
      return typeChain;
    };
    try { typeLive.checked = localStorage.getItem('mega_type_live') === '1'; } catch (e) {}
    typeLive.addEventListener('change', function () {
      try { localStorage.setItem('mega_type_live', typeLive.checked ? '1' : '0'); } catch (e) {}
      lastSent = '';
      status(typeLive.checked ? 'المرآة اللحظية تعمل: ما تكتبه هنا يحلّ محل نص الخانة على الشاشة' : '');
    });
    typeInput.addEventListener('input', function () {
      if (!typeLive.checked) return;
      clearTimeout(liveTimer);
      liveTimer = setTimeout(function () {
        var v = typeInput.value;
        if (v === lastSent) return;
        lastSent = v;
        sendType({ text: v, replace: 1 }, true);
      }, 450);
    });
    typeForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = typeInput.value;
      if (!text.trim()) return;
      if (typeLive.checked) {
        lastSent = text;
        sendType({ text: text, replace: 1 });
      } else {
        sendType({ text: text }).then(function () { typeInput.value = ''; });
      }
    });
    document.getElementById('type-back').addEventListener('click', function () {
      if (typeLive.checked) {
        typeInput.value = typeInput.value.slice(0, -1);
        lastSent = typeInput.value;
        sendType({ text: typeInput.value, replace: 1 }, true);
      } else {
        sendType({ text: '', backspace: 1 }, true);
      }
    });
    document.getElementById('type-clear').addEventListener('click', function () {
      typeInput.value = '';
      lastSent = '';
      sendType({ text: '', replace: 1 }, true).then(function () { toast('مُسحت الخانة على الشاشة'); });
    });
    document.getElementById('type-enter').addEventListener('click', function () { sendKey('ok'); });

    document.getElementById('type-paste').addEventListener('click', function () {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        toast('المتصفح لا يسمح بقراءة الحافظة، الصق يدويًا في الخانة', 'error');
        typeInput.focus();
        return;
      }
      navigator.clipboard.readText().then(function (t) {
        if (!t) { toast('الحافظة فارغة', 'error'); return; }
        typeInput.value = typeLive.checked ? t : (typeInput.value + t);
        typeInput.dispatchEvent(new Event('input'));
        if (!typeLive.checked) sendType({ text: t }).then(function () { typeInput.value = ''; });
      }).catch(function () {
        toast('اسمح للمتصفح بالوصول إلى الحافظة، أو الصق يدويًا', 'error');
        typeInput.focus();
      });
    });

    // نسخ النص من الشاشة إلى الموبايل
    var tvBox = document.getElementById('tv-text-box');
    var tvText = document.getElementById('tv-text');
    var copyText = function (t) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(t).then(function () { return true; }, function () { return false; });
      }
      var ta = document.createElement('textarea');
      ta.value = t; document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      return Promise.resolve(ok);
    };
    document.getElementById('type-copy').addEventListener('click', function () {
      status('جارٍ قراءة النص من الشاشة…');
      post('read_text', {}).then(function (r) {
        var since = r.since || 0, tries = 0;
        var poll = function () {
          post('tv_text', {}).then(function (d) {
            if (d.at >= since) {
              status('');
              tvText.textContent = d.text || '(الخانة فارغة)';
              tvBox.classList.remove('hidden');
              if (d.text) copyText(d.text).then(function (ok) { if (ok) toast('نُسخ النص إلى حافظة الموبايل'); });
              return;
            }
            if (++tries > 14) { status(''); toast('لم تصل إجابة من الشاشة، تأكد أنها متصلة', 'error'); return; }
            setTimeout(poll, 700);
          }).catch(function (err) { status(''); toast(err, 'error'); });
        };
        setTimeout(poll, 800);
      }).catch(function (err) { status(''); toast(err, 'error'); });
    });
    document.getElementById('tv-text-copy').addEventListener('click', function () {
      copyText(tvText.textContent || '').then(function (ok) { toast(ok ? 'نُسخ النص' : 'حدّد النص وانسخه يدويًا', ok ? undefined : 'error'); });
    });

    // الإملاء الصوتي: الكلام يتحول إلى نص ويُكتب على الشاشة
    var mic = document.getElementById('type-mic');
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    var rec = null, listening = false;
    mic.addEventListener('click', function () {
      if (!SR) { toast('المتصفح لا يدعم الإملاء الصوتي، استخدم زر الميكروفون في كيبورد الموبايل', 'error'); typeInput.focus(); return; }
      if (listening && rec) { rec.stop(); return; }
      rec = new SR();
      rec.lang = 'ar-SA';
      rec.interimResults = true;
      rec.continuous = false;
      var base = typeInput.value;
      rec.onstart = function () { listening = true; mic.classList.add('bg-red-500'); status('تحدّث الآن… 🎤'); };
      rec.onresult = function (ev) {
        var interim = '', finalText = '';
        for (var i = ev.resultIndex; i < ev.results.length; i++) {
          if (ev.results[i].isFinal) finalText += ev.results[i][0].transcript; else interim += ev.results[i][0].transcript;
        }
        typeInput.value = (base ? base + ' ' : '') + (finalText || interim);
        if (finalText) {
          if (typeLive.checked) {
            lastSent = typeInput.value;
            sendType({ text: typeInput.value, replace: 1 }, true);
          } else {
            var whole = typeInput.value;
            typeInput.value = '';
            sendType({ text: whole });
          }
          base = typeInput.value;
        }
      };
      rec.onerror = function (ev) { if (ev.error === 'not-allowed') toast('اسمح للمتصفح باستخدام الميكروفون', 'error'); };
      rec.onend = function () { listening = false; mic.classList.remove('bg-red-500'); status(''); };
      try { rec.start(); } catch (e) { toast('تعذّر تشغيل الميكروفون', 'error'); }
    });
  }

  /* تحديث ملفات اللوحة من ملف مضغوط */
  var dashForm = document.getElementById('dash-form');
  if (dashForm) {
    var dashFile = document.getElementById('dash-file');
    dashFile.addEventListener('change', function () {
      var f = dashFile.files[0];
      document.getElementById('dash-name').textContent = f ? f.name + ' · ' + Math.round(f.size / 1024) + ' ك.ب' : 'لم يُختر ملف';
    });
    dashForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = dashFile.files[0];
      if (!f) { toast('اختر ملف التحديث أولًا', 'error'); return; }
      var btn = dashForm.querySelector('button:not([type])');
      btn.disabled = true; btn.textContent = 'جارٍ التحديث…';
      var fd = new FormData();
      fd.append('zip', f);
      post('dash_update', fd).then(function (r) {
        toast('حُدّثت اللوحة' + (r.version ? ' إلى ' + r.version : '') + ' (' + r.files + ' ملف)');
        setTimeout(function () { location.reload(); }, 1500);
      }).catch(function (err) { toast(err, 'error'); btn.disabled = false; btn.textContent = 'تحديث اللوحة'; });
    });
    var rb = document.getElementById('dash-rollback');
    if (rb) rb.addEventListener('click', function () {
      if (!confirm('الرجوع إلى نسخة اللوحة السابقة؟')) return;
      post('dash_rollback', {}).then(function () { toast('رجعت اللوحة للنسخة السابقة'); setTimeout(function () { location.reload(); }, 1200); })
        .catch(function (err) { toast(err, 'error'); });
    });
  }

  /* رفع نسخة اللانشر على أجزاء ثم تثبيتها على الشاشة */
  var apkForm = document.getElementById('apk-form');
  if (apkForm) {
    var apkFile = document.getElementById('apk-file');
    var apkVersion = document.getElementById('apk-version');
    var apkBar = document.getElementById('apk-progress');
    apkFile.addEventListener('change', function () {
      var f = apkFile.files[0];
      document.getElementById('apk-name').textContent = f ? f.name + ' · ' + (f.size / 1048576).toFixed(1) + ' م.ب' : 'لم يُختر ملف';
      var m = f && f.name.match(/(\d+\.\d+\.\d+)/);
      if (m) apkVersion.value = m[1];
    });
    apkForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = apkFile.files[0];
      if (!f) { toast('اختر ملف APK أولًا', 'error'); return; }
      if (!/^\d+\.\d+\.\d+$/.test(apkVersion.value.trim())) { toast('اكتب رقم الإصدار بالشكل 8.0.1', 'error'); return; }
      var size = 2 * 1024 * 1024, total = Math.ceil(f.size / size), id = '';
      for (var k = 0; k < 24; k++) id += '0123456789abcdef'[Math.floor(Math.random() * 16)];
      var btn = apkForm.querySelector('button:not([type])');
      btn.disabled = true;
      apkBar.classList.remove('hidden');
      var send = function (i, retry) {
        var fd = new FormData();
        fd.append('upload_id', id); fd.append('index', i); fd.append('total', total);
        fd.append('version', apkVersion.value.trim());
        fd.append('chunk', f.slice(i * size, Math.min(f.size, (i + 1) * size)), 'chunk.bin');
        return post('apk_chunk', fd).then(function (r) {
          apkBar.firstElementChild.style.width = Math.round(((i + 1) / total) * 100) + '%';
          if (r.done) {
            toast('رُفعت النسخة ' + r.offer.version + '، وستظهر للشاشة خلال ثوانٍ');
            setTimeout(function () { location.reload(); }, 1200);
            return;
          }
          return send(i + 1, 0);
        }, function (err) {
          if (retry < 2) return send(i, retry + 1);
          throw err;
        });
      };
      send(0, 0).catch(function (err) { toast(err, 'error'); }).then(function () { btn.disabled = false; });
    });
    var apkInstall = document.getElementById('apk-install');
    if (apkInstall) apkInstall.addEventListener('click', function () {
      post('install_update', {}).then(function () { toast('أُرسل أمر التثبيت، تابع الشاشة'); })
        .catch(function (err) { toast(err, 'error'); });
    });
    var apkClear = document.getElementById('apk-clear');
    if (apkClear) apkClear.addEventListener('click', function () {
      if (!confirm('حذف النسخة المرفوعة؟')) return;
      post('apk_clear', {}).then(function () { location.reload(); }).catch(function (err) { toast(err, 'error'); });
    });
  }

  /* مدن الطقس والكرة الأرضية */
  var cityList = document.getElementById('city-list');
  if (cityList) {
    var cities = [];
    try { cities = JSON.parse(document.getElementById('cities-data').textContent) || []; } catch (e) { cities = []; }
    var defaults = [];
    try { defaults = JSON.parse(document.getElementById('cities-default').textContent) || []; } catch (e) { defaults = []; }

    var editing = -1;
    var renderCities = function () {
      cityList.innerHTML = cities.map(function (c, i) {
        var extra = (c.fact ? ' <span class="text-xs rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">معلومة مخصصة</span>' : '') +
          (c.image ? ' <span class="text-xs rounded-full bg-sky-100 text-sky-800 px-2 py-0.5">صورة</span>' : '');
        var editor = i !== editing ? '' :
          '<div class="basis-full grid gap-2 mt-2">' +
          '<label class="text-xs text-slate-500">معلومة تظهر بدل ويكيبيديا (اتركها فارغة لجلبها من ويكيبيديا تلقائيًا)</label>' +
          '<textarea data-f="fact" rows="3" maxlength="600" class="border border-slate-300 rounded-xl px-3 py-2 text-sm">' + escapeHtml(c.fact || '') + '</textarea>' +
          '<label class="text-xs text-slate-500">رابط صورة (https)</label>' +
          '<input data-f="image" dir="ltr" class="border border-slate-300 rounded-xl px-3 py-2 text-sm text-left" value="' + escapeHtml(c.image || '') + '">' +
          '<label class="text-xs text-slate-500">اسم مقالة ويكيبيديا إن اختلف عن اسم المدينة</label>' +
          '<input data-f="wiki" class="border border-slate-300 rounded-xl px-3 py-2 text-sm" value="' + escapeHtml(c.wiki || '') + '">' +
          '<button type="button" data-done="' + i + '" class="justify-self-start bg-amber-400 text-slate-900 rounded-lg px-3 py-1.5 text-sm font-bold">تم</button></div>';
        return '<li class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 px-4 py-3" data-i="' + i + '">' +
          '<span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ' + (i === 0 ? 'bg-amber-400 text-slate-900' : 'bg-slate-100 text-slate-600') + '">' + (i + 1) + '</span>' +
          '<span class="flex-1 min-w-0"><b>' + escapeHtml(c.name) + '</b> <span class="text-sm text-slate-500">' + escapeHtml(c.country || '') + '</span>' +
          (i === 0 ? ' <span class="text-xs text-amber-700 font-bold">· موقع الشاشة</span>' : '') + extra + '</span>' +
          '<button type="button" data-edit="' + i + '" class="border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold">' + (i === editing ? 'إغلاق' : 'معلومة وصورة') + '</button>' +
          (i > 0 ? '<button type="button" data-up="' + i + '" class="border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold">' + (i === 1 ? 'اجعلها موقع الشاشة' : 'لأعلى') + '</button>' : '') +
          '<button type="button" data-del="' + i + '" class="border border-red-200 text-red-700 rounded-lg px-2 py-1 text-xs font-bold">حذف</button>' +
          editor + '</li>';
      }).join('') || '<li class="text-sm text-slate-500">لا توجد مدن؛ أضف مدينة واحدة على الأقل.</li>';
    };
    cityList.addEventListener('input', function (e) {
      var f = e.target.getAttribute('data-f');
      var li = e.target.closest('[data-i]');
      if (f && li) cities[parseInt(li.getAttribute('data-i'), 10)][f] = e.target.value;
    });
    cityList.addEventListener('click', function (e) {
      var ed = e.target.closest('[data-edit]');
      var done = e.target.closest('[data-done]');
      if (ed) { var k = parseInt(ed.getAttribute('data-edit'), 10); editing = editing === k ? -1 : k; renderCities(); }
      if (done) { editing = -1; renderCities(); toast('لا تنسَ «حفظ المدن»'); }
    });
    renderCities();

    cityList.addEventListener('click', function (e) {
      var up = e.target.closest('[data-up]');
      var del = e.target.closest('[data-del]');
      if (up) {
        var i = parseInt(up.getAttribute('data-up'), 10);
        var t = cities[i - 1]; cities[i - 1] = cities[i]; cities[i] = t;
        renderCities();
      } else if (del) {
        cities.splice(parseInt(del.getAttribute('data-del'), 10), 1);
        renderCities();
      }
    });

    var search = document.getElementById('city-search');
    var results = document.getElementById('city-results');
    var found = [];
    var timer = null;
    search.addEventListener('input', function () {
      clearTimeout(timer);
      var q = search.value.trim();
      if (q.length < 2) { results.classList.add('hidden'); return; }
      timer = setTimeout(function () {
        var om = fetch('https://geocoding-api.open-meteo.com/v1/search?count=6&language=ar&name=' + encodeURIComponent(q))
          .then(function (r) { return r.json(); })
          .then(function (d) { return ((d && d.results) || []).map(function (c) { return { name: c.name, country: c.country || '', sub: [c.admin1, c.country].filter(Boolean).join('، '), lat: c.latitude, lon: c.longitude }; }); })
          .catch(function () { return []; });
        // خرائط OpenStreetMap تعرف القرى الصغيرة أيضًا
        var osm = fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=1&accept-language=ar&q=' + encodeURIComponent(q))
          .then(function (r) { return r.json(); })
          .then(function (d) { return (d || []).map(function (c) { var a = c.address || {}; return { name: c.name || (c.display_name || '').split('،')[0].split(',')[0], country: a.country || '', sub: (c.display_name || '').split(/[،,]/).slice(1, 4).join('، '), lat: +c.lat, lon: +c.lon }; }); })
          .catch(function () { return []; });
        Promise.all([om, osm]).then(function (lists) {
            var seen = {};
            found = lists[0].concat(lists[1]).filter(function (c) {
              var k = c.name + '|' + c.lat.toFixed(1) + '|' + c.lon.toFixed(1);
              if (seen[k]) return false;
              seen[k] = 1;
              return true;
            }).slice(0, 10);
            results.innerHTML = found.map(function (c, i) {
              return '<button type="button" data-pick="' + i + '" class="block w-full text-right px-4 py-3 hover:bg-amber-50 border-b border-slate-100">' +
                '<b>' + escapeHtml(c.name) + '</b> <span class="text-sm text-slate-500">' + escapeHtml(c.sub) + '</span></button>';
            }).join('') || '<div class="px-4 py-3 text-sm text-slate-500">لا توجد نتائج. جرّب الإضافة اليدوية بالإحداثيات.</div>';
            results.classList.remove('hidden');
          }).catch(function () { toast('تعذّر البحث عن المدينة.', 'error'); });
      }, 350);
    });
    results.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pick]');
      if (!b) return;
      var c = found[parseInt(b.getAttribute('data-pick'), 10)];
      if (!c) return;
      if (cities.length >= 16) { toast('الحد الأقصى ١٦ مدينة.', 'error'); return; }
      cities.push({ name: c.name, country: c.country || '', lat: +(+c.lat).toFixed(4), lon: +(+c.lon).toFixed(4) });
      renderCities();
      search.value = '';
      results.classList.add('hidden');
      toast('أُضيفت ' + c.name + ' · لا تنسَ الحفظ');
    });
    var mcErr = document.getElementById('mc-error');
    var parseCoords = function (txt) {
      txt = (txt || '').trim();
      var m = txt.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/) ||
        txt.match(/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/) ||
        txt.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/) ||
        txt.match(/^(-?\d+(?:\.\d+)?)\s*[,،\s]\s*(-?\d+(?:\.\d+)?)$/);
      if (!m) return null;
      var lat = parseFloat(m[1]), lon = parseFloat(m[2]);
      if (isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
      return { lat: lat, lon: lon };
    };
    if (document.getElementById('mc-add')) {
      document.getElementById('mc-add').addEventListener('click', function () {
        var name = document.getElementById('mc-name').value.trim();
        var pos = parseCoords(document.getElementById('mc-coords').value);
        if (!name) { mcErr.textContent = 'اكتب اسم المكان.'; return; }
        if (!pos) { mcErr.textContent = 'الإحداثيات غير مفهومة. مثال: 30.9123, 30.2456'; return; }
        if (cities.length >= 16) { mcErr.textContent = 'الحد الأقصى ١٦ مدينة.'; return; }
        mcErr.textContent = '';
        cities.push({ name: name, country: document.getElementById('mc-country').value.trim(), lat: +pos.lat.toFixed(4), lon: +pos.lon.toFixed(4) });
        document.getElementById('mc-name').value = '';
        document.getElementById('mc-coords').value = '';
        renderCities();
        toast('أُضيفت ' + name + ' · لا تنسَ الحفظ');
      });
      ['mc-name', 'mc-coords'].forEach(function (id) { document.getElementById(id).addEventListener('input', function () { mcErr.textContent = ''; }); });
    }
    document.getElementById('cities-reset').addEventListener('click', function () {
      cities = defaults.slice();
      renderCities();
    });
    document.getElementById('cities-save').addEventListener('click', function () {
      post('cities_save', { cities: JSON.stringify(cities) }).then(function (res) {
        cities = res.cities || cities;
        renderCities();
        toast('حُفظت المدن وستظهر على الشاشة خلال ثوانٍ');
      }).catch(function (err) { toast(err, 'error'); });
    });
  }

  /* منع التكبير بالضغط مرتين أو بإصبعين (سفاري يتجاهل إعداد الصفحة أحيانًا) */
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); });

  /* مناسبات العائلة */
  var evList = document.getElementById('event-list');
  if (evList) {
    var evs = [];
    try { evs = JSON.parse(document.getElementById('events-data').textContent) || []; } catch (x) { evs = []; }
    var evErr = document.getElementById('ev-error');
    var renderEvents = function () {
      evList.innerHTML = evs.map(function (ev, i) {
        return '<li class="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">' +
          '<span class="flex-1"><b>' + escapeHtml(ev.name) + '</b> <span class="text-sm text-slate-500" dir="ltr">' + escapeHtml(ev.date) + '</span>' +
          (ev.yearly ? ' <span class="text-xs rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">كل سنة</span>' : '') + '</span>' +
          '<button type="button" data-evdel="' + i + '" class="border border-red-200 text-red-700 rounded-lg px-2 py-1 text-xs font-bold">حذف</button></li>';
      }).join('') || '<li class="text-sm text-slate-500">لا توجد مناسبات بعد.</li>';
    };
    renderEvents();
    evList.addEventListener('click', function (e) {
      var b = e.target.closest('[data-evdel]');
      if (!b) return;
      evs.splice(parseInt(b.getAttribute('data-evdel'), 10), 1);
      renderEvents();
    });
    ['ev-name', 'ev-date'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', function () { evErr.textContent = ''; });
    });
    document.getElementById('ev-add').addEventListener('click', function () {
      var name = document.getElementById('ev-name').value.trim();
      var date = document.getElementById('ev-date').value;
      if (!name) { evErr.textContent = 'اكتب اسم المناسبة.'; return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { evErr.textContent = 'اختر تاريخ المناسبة.'; return; }
      evs.push({ name: name, date: date, yearly: document.getElementById('ev-yearly').checked });
      document.getElementById('ev-name').value = '';
      renderEvents();
      toast('أُضيفت · لا تنسَ الحفظ');
    });
    document.getElementById('events-save').addEventListener('click', function () {
      post('events_save', { events: JSON.stringify(evs) }).then(function (res) {
        evs = res.events || evs;
        renderEvents();
        toast('حُفظت المناسبات وستظهر على الشاشة خلال ثوانٍ');
      }).catch(function (err) { toast(err, 'error'); });
    });
  }

  /* أسماء أجهزة الشبكة */
  var pnWifi = document.getElementById('pn-wifi');
  if (pnWifi) {
    var pnSend = function (data, msg) {
      post('party_net', data).then(function () { toast(msg); }).catch(function (err) { toast(err, 'error'); });
    };
    pnWifi.addEventListener('submit', function (e) {
      e.preventDefault();
      var ssid = document.getElementById('pn-ssid').value.trim();
      if (!ssid) { toast('اكتب اسم الشبكة.', 'error'); return; }
      pnSend({ what: 'wifi', ssid: ssid, pass: document.getElementById('pn-pass').value, open: document.getElementById('pn-open').checked ? 1 : '' }, 'أُرسلت بيانات الشبكة للشاشة');
      document.getElementById('pn-pass').value = '';
    });
    document.getElementById('pn-clear').onclick = function () { pnSend({ what: 'wifi', ssid: '', pass: '', open: '' }, 'أُزيل رمز الواي فاي'); };
    [].forEach.call(document.querySelectorAll('.pn-hs'), function (b) {
      b.onclick = function () {
        var on = b.getAttribute('data-on');
        pnSend({ what: 'hotspot', on: on }, on ? 'جارٍ تشغيل شبكة الشاشة… قد تظهر على الشاشة نافذة إذن، وافق عليها بالريموت' : 'جارٍ إيقاف شبكة الشاشة');
      };
    });
    document.getElementById('pn-check').onclick = function () { pnSend({ what: 'check' }, 'جارٍ الفحص، حدّث الصفحة بعد لحظات'); };
  }

  var newsForm = document.getElementById('news-form');
  if (newsForm) {
    newsForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var ids = [].map.call(newsForm.querySelectorAll('.news-src:checked'), function (c) { return c.value; });
      post('news_save', { on: document.getElementById('news-on').checked ? 1 : '', sources: JSON.stringify(ids) })
        .then(function () { toast('حُفظت إعدادات الأخبار'); })
        .catch(function (err) { toast(err, 'error'); });
    });
  }

  var lanForm = document.getElementById('lan-form');
  if (lanForm) {
    lanForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var names = {};
      [].forEach.call(lanForm.querySelectorAll('[data-lan]'), function (i) {
        if (i.value.trim()) names[i.getAttribute('data-lan')] = i.value.trim();
      });
      post('lan_names_save', { names: JSON.stringify(names) }).then(function () { toast('حُفظت الأسماء وستظهر على الشاشة خلال ثوانٍ'); })
        .catch(function (err) { toast(err, 'error'); });
    });
  }

  /* تعيين المتحكم في اللعب الجماعي من اللوحة */
  document.querySelectorAll('[data-master]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = parseInt(btn.getAttribute('data-master'), 10);
      viaRT('master', { id: id }).then(function (sent) {
        return sent ? null : post('party_master', { pid: id });
      }).then(function () {
        document.querySelectorAll('[data-master]').forEach(function (b) { b.classList.toggle('ring-2', b === btn); });
        toast('أصبح المتحكم: ' + btn.textContent.replace('👑', '').trim());
      }).catch(function (err) { toast(err, 'error'); });
    });
  });

  /* رابط ريموت GitHub ورمزه */
  var ghBox = document.getElementById('gh-remote');
  if (ghBox && window.MEGA_RT_KEY) {
    // مع عنوان هذه اللوحة: طريق احتياطي تلقائي لريموت GitHub إن تعذّرت القناة الفورية
    var ghBase = location.origin + location.pathname.replace(/\/[^\/]*$/, '');
    var ghUrl = 'https://alexmegasoft1.github.io/play/remote.html#k=' + window.MEGA_RT_KEY + '&s=' + encodeURIComponent(ghBase);
    var ghLink = document.getElementById('gh-link');
    if (ghLink) ghLink.href = ghUrl;
    var ghCopy = document.getElementById('gh-copy');
    if (ghCopy) ghCopy.addEventListener('click', function () {
      (navigator.clipboard ? navigator.clipboard.writeText(ghUrl) : Promise.reject()).then(function () { toast('نُسخ الرابط'); }, function () { prompt('انسخ الرابط:', ghUrl); });
    });
    var ghQr = document.getElementById('gh-qr');
    if (ghQr && window.QRCode) { try { new window.QRCode(ghQr, { text: ghUrl, width: 180, height: 180 }); } catch (e) {} }
  }
})();
