/* ريموت GitHub: نفس صفحة ريموت اللوحة وسكربتها، مع ربطها بالشاشة بمفتاحها بدل تسجيل الدخول.
 * - الأوامر الفورية (الأسهم والمؤشر والكتابة) عبر القناة الفورية، وإن تعذّرت فعبر السيرفر.
 * - بقية العمليات (عرض الشاشة، النسخ من الشاشة، الرسالة الصوتية…) عبر سيرفر اللوحة بطلبات موقّعة بمفتاح الشاشة.
 * المفتاح وعنوان السيرفر بعد # في الرابط، فلا يُرسلان إلى GitHub. */
(function () {
  'use strict';
  var q = {};
  (location.hash.replace(/^#/, '') + '&' + location.search.replace(/^\?/, '')).split('&').forEach(function (kv) {
    var i = kv.indexOf('='); if (i > 0) q[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
  });
  var key = /^[0-9a-f]{32}$/.test(q.k || '') ? q.k : '';
  var server = /^(https:\/\/|http:\/\/(127\.0\.0\.1|localhost)[:\/])\S+$/.test(q.s || '') ? q.s.replace(/\/+$/, '') : '';
  try {
    if (key) { localStorage.setItem('mega_rk', key); if (server) localStorage.setItem('mega_srv', server); }
    else { key = localStorage.getItem('mega_rk') || ''; server = server || localStorage.getItem('mega_srv') || ''; }
  } catch (e) {}
  if (!key) {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.innerHTML = '<div style="max-width:420px;margin:40px auto;padding:20px;font-family:Cairo,Tahoma;line-height:1.9;text-align:center">هذا الريموت يحتاج مفتاح شاشتك. افتحه من لوحة التحكم: «الريموت» ← «ريموت الموبايل الكامل»، أو امسح الرمز الظاهر هناك.</div>';
    });
    return;
  }

  window.MEGA_RT_KEY = key;
  if (server) window.MEGA_AJAX = server + '/ajax.php';

  var te = new TextEncoder();
  function hex(b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  var ready = Promise.all([
    crypto.subtle.importKey('raw', te.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    crypto.subtle.digest('SHA-256', te.encode(key))
  ]).then(function (r) { return { k: r[0], tid: hex(r[1]).slice(0, 32) }; });

  /** حقول الطلب الموقّع لعملية من ajax.php (يستخدمها سكربت اللوحة). */
  window.MEGA_AUTH = function (op) {
    if (!server) return Promise.reject('افتح الريموت من رابط لوحة التحكم الجديد ليعمل هذا الزر.');
    var m = JSON.stringify({ c: 'ajax:' + op, p: {}, t: Date.now(), n: Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 6) });
    return ready.then(function (x) {
      return crypto.subtle.sign('HMAC', x.k, te.encode(m)).then(function (s) {
        return { rt_tid: x.tid, rt_env: JSON.stringify({ m: m, s: hex(s) }) };
      });
    });
  };

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /** ما يعرضه ريموت اللوحة من بيانات الشاشة (الاسم، روابط البيت، المتحكم، التفعيل). */
  var lastParty = '';
  window.MEGA_ON_LIVE = function (res) {
    var nm = document.getElementById('gh-name');
    if (nm && res.name) { nm.textContent = res.name; document.title = 'الريموت · ' + res.name; }
    var local = String(res.local || '').replace(/\/+$/, '');
    document.querySelectorAll('[data-lan]').forEach(function (a) {
      if (local) { a.href = local + a.getAttribute('data-lan'); a.classList.remove('hidden'); } else a.classList.add('hidden');
    });
    var a11y = document.getElementById('gh-a11y');
    if (a11y) a11y.classList.toggle('hidden', res.a11y !== false);
    var ps = res.party || [], sig = JSON.stringify(ps);
    var box = document.getElementById('gh-master');
    if (box && sig !== lastParty) {
      lastParty = sig;
      box.classList.toggle('hidden', ps.length < 2);
      var list = document.getElementById('gh-masters');
      list.innerHTML = ps.map(function (p) {
        return '<button type="button" data-gh-master="' + (p.id | 0) + '" class="rbtn h-11 px-4 rounded-xl bg-white/10 border border-white/10 text-sm font-bold' + (p.m ? ' ring-2 ring-amber-400' : '') + '">' + (p.m ? '👑 ' : '') + esc(p.name) + '</button>';
      }).join('');
    }
  };

  // تعيين المتحكم: القناة الفورية إن كانت الشاشة متصلة بها، وإلا السيرفر
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-gh-master]') : null;
    if (!b) return;
    var id = parseInt(b.getAttribute('data-gh-master'), 10);
    var rt = window.megaRT ? window.megaRT() : null;
    var done = function () { if (window.megaToast) window.megaToast('أصبح المتحكم: ' + b.textContent.replace('👑 ', '')); };
    var viaServer = function () {
      return window.MEGA_AUTH('party_master').then(function (f) {
        var fd = new FormData(); fd.append('pid', id);
        Object.keys(f).forEach(function (k) { fd.append(k, f[k]); });
        return fetch(window.MEGA_AJAX + '?op=party_master', { method: 'POST', body: fd }).then(function (r) { return r.json(); });
      }).then(function (r) { if (!r.ok) throw r.error; done(); });
    };
    (rt && rt.live() ? rt.send('master', { id: id }, true).then(function (ok) { if (ok) done(); else return viaServer(); }) : viaServer())
      .catch(function (err) { if (window.megaToast) window.megaToast(typeof err === 'string' ? err : 'تعذّر الإرسال', 'error'); });
  });

  if (!server) {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(function () { if (window.megaToast) window.megaToast('افتح الريموت من رابط لوحة التحكم الجديد لتعمل كل الأزرار', 'error'); }, 800);
    });
  }
})();
