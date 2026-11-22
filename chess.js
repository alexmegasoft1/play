/* محرك شطرنج صغير: الحركات القانونية، والكش، والكش مات، والتعادل. */
var Chess = (function () {
  var N = -8, S = 8, E = 1, W = -1;
  var KN = [-17, -15, -10, -6, 6, 10, 15, 17];
  var KG = [-9, -8, -7, -1, 1, 7, 8, 9];
  function start() {
    return { b: 'rnbqkbnrpppppppp' + '................................' + 'PPPPPPPPRNBQKBNR', t: 'w', c: 'KQkq', ep: -1, h: 0, n: 1 };
  }
  function col(p) { return p === '.' ? '' : (p === p.toUpperCase() ? 'w' : 'b'); }
  function file(i) { return i & 7; }
  function rank(i) { return i >> 3; }
  function onBoard(i) { return i >= 0 && i < 64; }
  // هل المربع i مهدد من اللون by؟
  function attacked(b, i, by) {
    var f = file(i), r = rank(i), k, j, p;
    // البيادق
    var pr = by === 'w' ? r + 1 : r - 1, pawn = by === 'w' ? 'P' : 'p';
    if (pr >= 0 && pr < 8) {
      if (f > 0 && b[pr * 8 + f - 1] === pawn) return true;
      if (f < 7 && b[pr * 8 + f + 1] === pawn) return true;
    }
    // الحصان
    var kn = by === 'w' ? 'N' : 'n';
    for (k = 0; k < 8; k++) {
      j = i + KN[k];
      if (onBoard(j) && Math.abs(file(j) - f) <= 2 && b[j] === kn) return true;
    }
    // الملك
    var kg = by === 'w' ? 'K' : 'k';
    for (k = 0; k < 8; k++) {
      j = i + KG[k];
      if (onBoard(j) && Math.abs(file(j) - f) <= 1 && b[j] === kg) return true;
    }
    // الخطوط المستقيمة والمائلة
    var rq = by === 'w' ? 'RQ' : 'rq', bq = by === 'w' ? 'BQ' : 'bq';
    var dirs = [[1, 0, rq], [-1, 0, rq], [0, 1, rq], [0, -1, rq], [1, 1, bq], [1, -1, bq], [-1, 1, bq], [-1, -1, bq]];
    for (k = 0; k < 8; k++) {
      var df = dirs[k][0], dr = dirs[k][1], ff = f + df, rr = r + dr;
      while (ff >= 0 && ff < 8 && rr >= 0 && rr < 8) {
        p = b[rr * 8 + ff];
        if (p !== '.') { if (dirs[k][2].indexOf(p) >= 0) return true; break; }
        ff += df; rr += dr;
      }
    }
    return false;
  }
  function kingAt(b, c) { return b.indexOf(c === 'w' ? 'K' : 'k'); }
  function inCheck(s, c) { var k = kingAt(s.b, c); return k >= 0 && attacked(s.b, k, c === 'w' ? 'b' : 'w'); }
  // الحركات الممكنة دون فحص ترك الملك مكشوفًا
  function pseudo(s) {
    var b = s.b, me = s.t, op = me === 'w' ? 'b' : 'w', out = [], i, k, j, p;
    function add(f, t) {
      var pc = b[f].toLowerCase(), tr = rank(t);
      if (pc === 'p' && (tr === 0 || tr === 7)) { ['q', 'r', 'b', 'n'].forEach(function (x) { out.push({ f: f, t: t, p: x }); }); }
      else out.push({ f: f, t: t });
    }
    for (i = 0; i < 64; i++) {
      p = b[i];
      if (col(p) !== me) continue;
      var f = file(i), r = rank(i), lp = p.toLowerCase();
      if (lp === 'p') {
        var dir = me === 'w' ? N : S, startRank = me === 'w' ? 6 : 1;
        j = i + dir;
        if (onBoard(j) && b[j] === '.') {
          add(i, j);
          if (r === startRank && b[j + dir] === '.') out.push({ f: i, t: j + dir });
        }
        [-1, 1].forEach(function (d) {
          var ff = f + d;
          if (ff < 0 || ff > 7) return;
          var t = i + dir + d;
          if (!onBoard(t)) return;
          if (col(b[t]) === op) add(i, t);
          else if (t === s.ep) out.push({ f: i, t: t, e: 1 });
        });
      } else if (lp === 'n' || lp === 'k') {
        var set = lp === 'n' ? KN : KG, lim = lp === 'n' ? 2 : 1;
        for (k = 0; k < 8; k++) {
          j = i + set[k];
          if (!onBoard(j) || Math.abs(file(j) - f) > lim) continue;
          if (col(b[j]) !== me) out.push({ f: i, t: j });
        }
        if (lp === 'k') {
          // التبييت
          var home = me === 'w' ? 60 : 4, rights = me === 'w' ? 'KQ' : 'kq';
          if (i === home && !attacked(b, i, op)) {
            if (s.c.indexOf(rights[0]) >= 0 && b[i + 1] === '.' && b[i + 2] === '.' &&
                b[i + 3] === (me === 'w' ? 'R' : 'r') && !attacked(b, i + 1, op) && !attacked(b, i + 2, op)) {
              out.push({ f: i, t: i + 2, c: 1 });
            }
            if (s.c.indexOf(rights[1]) >= 0 && b[i - 1] === '.' && b[i - 2] === '.' && b[i - 3] === '.' &&
                b[i - 4] === (me === 'w' ? 'R' : 'r') && !attacked(b, i - 1, op) && !attacked(b, i - 2, op)) {
              out.push({ f: i, t: i - 2, c: 1 });
            }
          }
        }
      } else {
        var ds = [];
        if (lp === 'r' || lp === 'q') ds.push([1, 0], [-1, 0], [0, 1], [0, -1]);
        if (lp === 'b' || lp === 'q') ds.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
        for (k = 0; k < ds.length; k++) {
          var ff2 = f + ds[k][0], rr2 = r + ds[k][1];
          while (ff2 >= 0 && ff2 < 8 && rr2 >= 0 && rr2 < 8) {
            j = rr2 * 8 + ff2;
            if (b[j] === '.') out.push({ f: i, t: j });
            else { if (col(b[j]) === op) out.push({ f: i, t: j }); break; }
            ff2 += ds[k][0]; rr2 += ds[k][1];
          }
        }
      }
    }
    return out;
  }
  function apply(s, m) {
    var b = s.b.split(''), p = b[m.f], me = s.t, cap = b[m.t] !== '.';
    b[m.t] = m.p ? (me === 'w' ? m.p.toUpperCase() : m.p) : p;
    b[m.f] = '.';
    if (m.e) { b[m.t + (me === 'w' ? S : N)] = '.'; cap = true; }
    if (m.c) {
      if (m.t > m.f) { b[m.f + 1] = b[m.f + 3]; b[m.f + 3] = '.'; }
      else { b[m.f - 1] = b[m.f - 4]; b[m.f - 4] = '.'; }
    }
    var c = s.c;
    function drop(x) { c = c.replace(x, ''); }
    if (p === 'K') { drop('K'); drop('Q'); }
    if (p === 'k') { drop('k'); drop('q'); }
    [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']].forEach(function (x) { if (m.f === x[0] || m.t === x[0]) drop(x[1]); });
    var ep = -1;
    if (p.toLowerCase() === 'p' && Math.abs(m.t - m.f) === 16) ep = (m.t + m.f) / 2;
    return {
      b: b.join(''), t: me === 'w' ? 'b' : 'w', c: c, ep: ep,
      h: (p.toLowerCase() === 'p' || cap) ? 0 : s.h + 1, n: s.n + (me === 'b' ? 1 : 0)
    };
  }
  function moves(s) {
    return pseudo(s).filter(function (m) { return !inCheck(apply(s, m), s.t); });
  }
  function insufficient(b) {
    var rest = b.replace(/[.kK]/g, '');
    return rest === '' || rest === 'n' || rest === 'N' || rest === 'b' || rest === 'B';
  }
  function status(s) {
    var ms = moves(s), ch = inCheck(s, s.t);
    if (!ms.length) return ch ? 'mate' : 'stalemate';
    if (s.h >= 100) return 'fifty';
    if (insufficient(s.b)) return 'insufficient';
    return ch ? 'check' : 'play';
  }
  function perft(s, d) {
    if (d === 0) return 1;
    var ms = moves(s), n = 0;
    for (var i = 0; i < ms.length; i++) n += perft(apply(s, ms[i]), d - 1);
    return n;
  }
  function sq(i) { return 'abcdefgh'[file(i)] + (8 - rank(i)); }
  return { start: start, moves: moves, apply: apply, status: status, inCheck: inCheck, perft: perft, sq: sq, col: col };
})();
if (typeof module !== 'undefined') module.exports = Chess;
