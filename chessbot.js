/* خصم الشطرنج «الشاشة»: يُحسب في موبايل اللاعب بنفس محرك القواعد (chess.js)،
 * بحث بعمق حسب المستوى (سهل ١، متوسط ٢، صعب ٣) مع تقييم المادة ومواقع القطع. */
var ChessBot = (function () {
  'use strict';
  var VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  // مكافأة بسيطة للتمركز: المربعات الوسطى أفضل، وتقدّم البيادق مفيد
  function center(i) {
    var f = i & 7, r = i >> 3;
    var df = Math.abs(3.5 - f), dr = Math.abs(3.5 - r);
    return 14 - Math.round((df + dr) * 4);
  }
  function evalBoard(b) {
    var s = 0;
    for (var i = 0; i < 64; i++) {
      var p = b[i];
      if (p === '.') continue;
      var lp = p.toLowerCase(), white = p !== lp, v = VAL[lp];
      if (lp === 'n' || lp === 'b') v += center(i);
      else if (lp === 'p') v += (white ? (6 - (i >> 3)) : ((i >> 3) - 1)) * 6 + (center(i) > 6 ? 6 : 0);
      else if (lp === 'q') v += Math.round(center(i) / 2);
      s += white ? v : -v;
    }
    return s;
  }
  function order(s, ms) {
    // الأكل أولًا (يسرّع البحث)
    return ms.map(function (m) {
      var cap = s.b[m.t] !== '.' ? VAL[s.b[m.t].toLowerCase()] - VAL[s.b[m.f].toLowerCase()] / 10 : 0;
      return { m: m, k: cap + (m.p ? 800 : 0) };
    }).sort(function (a, b) { return b.k - a.k; }).map(function (x) { return x.m; });
  }
  var nodes = 0, LIMIT = 60000;
  function negamax(s, depth, alpha, beta) {
    nodes++;
    var ms = Chess.moves(s);
    if (!ms.length) return Chess.inCheck(s, s.t) ? -100000 - depth : 0;
    if (depth === 0 || nodes > LIMIT) return (s.t === 'w' ? 1 : -1) * evalBoard(s.b);
    ms = order(s, ms);
    for (var i = 0; i < ms.length; i++) {
      var v = -negamax(Chess.apply(s, ms[i]), depth - 1, -beta, -alpha);
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return alpha;
  }
  /** أفضل نقلة للدور الحالي. level: ٠ سهل، ١ متوسط، ٢ صعب. */
  function best(s, level) {
    var ms = Chess.moves(s);
    if (!ms.length) return null;
    var depth = [1, 2, 3][level] || 2;
    nodes = 0;
    var scored = order(s, ms).map(function (m) {
      return { m: m, v: -negamax(Chess.apply(s, m), depth - 1, -1e9, 1e9) };
    });
    // السهل يخطئ أحيانًا: يختار من بين أفضل النقلات عشوائيًا بفارق كبير
    var noise = [140, 30, 6][level];
    scored.forEach(function (x) { x.v += Math.random() * noise; });
    scored.sort(function (a, b) { return b.v - a.v; });
    return scored[0].m;
  }
  return { best: best, evalBoard: evalBoard };
})();
if (typeof module !== 'undefined') module.exports = ChessBot;
