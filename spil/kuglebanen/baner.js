// ===== Banerne i Kuglebanen =====
// Hver verden har 5 baner. Alle mål er i "kugle-enheder": kuglen er 1,1 bred.
// x = til højre, z = væk fra kameraet (negativ er fremad), y = op. y på en plade er dens overflade.
// retning (ψ): 0 = fremad (-z), π/2 = til højre (+x).
//
// Byggeklodser:
//   plade(x, y, z, bredde, dybde, {h, ry, stil, kant})   kant: "n" (fremad), "s" (bagud), "ø" (højre), "v" (venstre)
//   rund(x, y, z, r, {h, stil})                         rund plade
//   rampe(fra, til, bredde, {h, stil, kant})            skrå plade fra et punkt til et andet
//   sti(punkter, bredde, {stil, kant, bumpere})         en vej gennem punkterne, med runde hjørner
//   bumper, ring (donut man triller igennem), flyt (plade der sejler), drej (stang der drejer rundt),
//   fart (fartpil), søjle (en høj ting man skal udenom), flag (her starter man igen), mål
const plade = (x, y, z, b, d, o = {}) => ({ t: "plade", p: [x, y, z], b, d, ...o });
const rund = (x, y, z, r, o = {}) => ({ t: "rund", p: [x, y, z], r, ...o });
const rampe = (fra, til, b, o = {}) => ({ t: "rampe", fra, til, b, ...o });
const sti = (punkter, b, o = {}) => ({ t: "sti", punkter, b, ...o });
const bumper = (x, y, z) => ({ t: "bumper", p: [x, y, z] });
const ring = (x, y, z, ψ = 0) => ({ t: "ring", p: [x, y, z], ψ });
const flyt = o => ({ t: "flyt", ...o });
const drej = (x, y, z, l, fart) => ({ t: "drej", p: [x, y, z], l, fart });
const fart = (x, y, z, ψ = 0) => ({ t: "fart", p: [x, y, z], ψ });
const søjle = (x, y, z, r, h) => ({ t: "søjle", p: [x, y, z], r, h });
const flag = (x, y, z, ψ = 0) => ({ t: "flag", p: [x, y, z], ψ });
const mål = (x, y, z, ψ = 0) => ({ t: "mål", p: [x, y, z], ψ });

const ψ = (dx, dz) => Math.atan2(dx, -dz);
const midt = (a, b) => a.map((v, i) => (v + b[i]) / 2);
// Punkt på en cirkel (til vindeltrapper): vinkel i grader, 0 = nærmest kameraet
const cirkel = (cx, cz, r) => (a, y) => [r * Math.sin(a * Math.PI / 180), y, cz + r * Math.cos(a * Math.PI / 180)].map((v, i) => i === 0 ? v + cx : v);

// ---------------- Jungleøen ----------------
const J5 = cirkel(0, -14, 7.5);
const S5 = cirkel(0, -13, 7);

export const BANER = [
  {
    id: "jungle-1", verden: "jungle", navn: "Bananstien", start: [0, 0, 1.2], ψ: 0,
    dele: [
      plade(0, 0, 0, 5, 5),
      plade(0, 0, -5.6, 2.2, 6.4),
      plade(2.5, 0, -11, 7, 5),
      plade(-2.4, 0, -11, 2.8, 0.9, { h: 0.4 }),
      plade(-5.3, 0, -11, 3, 3),
      rampe([4.5, 0, -13.4], [4.5, 0.8, -18.5], 2.4),
      plade(4.5, 0.8, -21.3, 5, 5.6),
      bumper(5.3, 0, -9.6),
      mål(4.5, 0.8, -22.4),
    ],
    ting: [[1.2, 0, -1], [0, 0, -3.3], [0, 0, -5.4], [0, 0, -7.5], [1.6, 0, -10.2], [3.2, 0, -10.2], [-5.3, 0, -10.4], [-5.3, 0, -11.6], [4.5, 0.4, -16], [3, 0.8, -20.2]],
  },
  {
    id: "jungle-2", verden: "jungle", navn: "Slangevejen", start: [0, 0, 1], ψ: 0,
    dele: [
      rund(0, 0, 0, 2.6),
      sti([[0, 0, -1.5], [0, 0, -7], [5, 0, -11.5], [5, 0, -18], [-1, 0, -23], [-1, 0, -29.5]], 2.6, { bumpere: true }),
      plade(-1, 0, -32, 5, 5),
      mål(-1, 0, -33),
    ],
    ting: [[0, 0, -3], [0, 0, -5.2], [2.5, 0, -9.25], [5, 0, -14], [5, 0, -16], [2, 0, -20.5], [-1, 0, -25.5], [-1, 0, -27.5], [0.6, 0, -31]],
  },
  {
    id: "jungle-3", verden: "jungle", navn: "Hængebroerne", start: [0, 0, 1.2], ψ: 0,
    dele: [
      rund(0, 0, 0, 3),
      plade(0, 0, -5, 1.8, 4.4, { stil: "træ", kant: "øv" }),
      rund(0, 0, -9.5, 2.5),
      rampe([2.2, 0, -10.5], [6.3, 0.6, -13.6], 1.8, { stil: "træ", kant: true }),
      rund(7.5, 0.6, -14.5, 2.2),
      flag(7.5, 0.6, -14.8),
      plade(7.5, 0.6, -19.5, 1.5, 6.4, { stil: "træ" }),
      rund(7.5, 0.6, -24.5, 2.2),
      rampe([5.6, 0.6, -25.5], [1.8, 1.2, -28.5], 1.8, { stil: "træ", kant: true }),
      rund(0, 1.2, -30, 2.8),
      mål(-0.2, 1.2, -30.4, ψ(-1.8, -1.5)),
    ],
    ting: [[0, 0, -4], [0, 0, -6], [-1.3, 0, -9.5], [1.3, 0, -9.5], [4.25, 0.3, -12.05], [7.5, 0.6, -18], [7.5, 0.6, -21], [3.7, 0.9, -27], [1.2, 1.2, -29.4]],
  },
  {
    id: "jungle-4", verden: "jungle", navn: "Flåderne", start: [0, 0, 1.2], ψ: 0,
    dele: [
      plade(0, 0, 0, 5, 5),
      flyt({ form: "kasse", fra: [0, 0, -4.2], til: [0, 0, -9.8], b: 3, d: 3, h: 0.5, tid: 7, stil: "flåde" }),
      plade(0, 0, -14, 6, 5),
      flag(-2.2, 0, -13.4, Math.PI / 2),
      flyt({ form: "kasse", fra: [4.7, 0, -14], til: [8.8, 0, -14], b: 3, d: 3, h: 0.5, tid: 7, fase: 0.5, stil: "flåde" }),
      plade(13, 0, -14, 5, 5),
      rampe([13, 0, -16.4], [13, 0.8, -21.1], 2.2),
      plade(13, 0.8, -23.5, 5, 5),
      mål(13, 0.8, -24.4),
    ],
    ting: [[0, 0, -1.2], [0, 0, -7], [-1.8, 0, -15.2], [1.8, 0, -15.2], [6.75, 0, -14], [13, 0, -13], [13, 0.4, -18.75], [11.5, 0.8, -23], [14.5, 0.8, -23]],
  },
  {
    id: "jungle-5", verden: "jungle", navn: "Bjergtoppen", start: [0, 0, 1.2], ψ: 0, bjerg: [0, -14, 2.7],
    dele: [
      plade(0, 0, 0, 4.5, 4.5),
      sti([[0, 0, -2], J5(0, 0), J5(45, 0.45), J5(90, 0.9), J5(135, 1.35)], 2.4, { kant: true }),
      flag(...J5(135, 1.35).map((v, i) => i === 0 ? v + 0.6 : i === 2 ? v - 0.6 : v), Math.PI),
      sti([J5(135, 1.35), J5(180, 1.8), J5(225, 2.25), J5(270, 2.7), [-3.6, 2.7, -14]], 2.4),
      rund(0, 2.7, -14, 3.4, { stil: "top" }),
      mål(0.4, 2.7, -14, Math.PI / 2),
    ],
    ting: [[0, 0, -4.2], midt(J5(0, 0), J5(45, 0.45)), midt(J5(45, 0.45), J5(90, 0.9)), midt(J5(90, 0.9), J5(135, 1.35)),
      midt(J5(135, 1.35), J5(180, 1.8)), midt(J5(180, 1.8), J5(225, 2.25)), midt(J5(225, 2.25), J5(270, 2.7)), [-1.8, 2.7, -14.8], [-1.8, 2.7, -13.2]],
  },

  // ---------------- Børneværelset ----------------
  {
    id: "vaerelse-1", verden: "vaerelse", navn: "Bogstablen", start: [0, 0, 1.2], ψ: 0,
    dele: [
      plade(0, 0, 0, 4.4, 5.4, { stil: "bog" }),
      plade(0, 0.04, -5.6, 1.5, 7.2, { stil: "lineal", h: 0.16 }),
      plade(1, 0, -11, 4.2, 4.2, { stil: "klods", h: 1 }),
      rampe([3.0, 0, -11], [8.4, 0.95, -11], 3.0, { stil: "bog", h: 0.4 }),
      plade(10.5, 0.95, -11, 4.2, 4.4, { stil: "bog" }),
      mål(10.9, 0.95, -11, Math.PI / 2),
    ],
    ting: [[1.2, 0, -1.2], [0, 0.04, -4], [0, 0.04, -7], [-0.3, 0, -10.2], [-0.5, 0, -12.3], [2.1, 0, -12], [5.7, 0.475, -11], [9.4, 0.95, -12.2]],
  },
  {
    id: "vaerelse-2", verden: "vaerelse", navn: "Klodsbyen", start: [0, 0, 1], ψ: 0,
    dele: [
      plade(0, 0, 0, 4.2, 4.2, { stil: "klods", h: 1 }),
      plade(0, 0.04, -4.6, 1.4, 5.4, { stil: "lineal", h: 0.16 }),
      plade(0, 0, -9.2, 5.6, 5.6, { stil: "klods", h: 1 }),
      drej(0, 0, -9.2, 4.6, 0.8),
      plade(5.2, 0.04, -9.2, 5, 1.4, { stil: "lineal", h: 0.16 }),
      plade(10, 0, -9.2, 4.2, 4.2, { stil: "klods", h: 1 }),
      rampe([10, 0, -11.2], [10, 1.0, -16.2], 2.2, { stil: "bog", h: 0.4 }),
      plade(10, 1.0, -18.4, 4.2, 4.4, { stil: "bog" }),
      flag(11.6, 1.0, -17.2, -Math.PI / 2),
      plade(5.2, 1.0, -18.4, 5.8, 1.2, { stil: "blyant", h: 0.3 }),
      plade(0, 1.0, -18.4, 5, 5, { stil: "klods", h: 1 }),
      mål(-0.5, 1.0, -18.4, -Math.PI / 2),
    ],
    ting: [[0, 0.04, -3.5], [0, 0.04, -5.5], [-1.8, 0, -8], [1.8, 0, -10.4], [5.2, 0.04, -9.2], [10, 0, -8.6], [10, 0.5, -13.7], [6.5, 1.0, -18.4], [4, 1.0, -18.4]],
  },
  {
    id: "vaerelse-3", verden: "vaerelse", navn: "Bilbanen", start: [0, 2.5, 1], ψ: 0,
    dele: [
      plade(0, 2.5, 0, 4, 4, { stil: "bog" }),
      sti([[0, 2.5, -1.5], [0, 2.0, -7], [5, 1.5, -10], [5, 1.0, -16], [0, 0.6, -19], [-5, 0.3, -16], [-5, 0, -10]], 2.2, { stil: "bilbane", kant: true }),
      fart(5, 1.25, -13, 0),
      fart(-5, 0.15, -13, Math.PI),
      flag(0, 0.6, -19, ψ(-5, 3)),
      plade(-5, 0, -6.5, 4.4, 4.4, { stil: "bog" }),
      mål(-5, 0, -6.1, Math.PI),
    ],
    ting: [[0, 2.5, -1], [0, 2.25, -4.25], [2.5, 1.75, -8.5], [5, 1.4, -11], [2.5, 0.8, -17.5], [-2.5, 0.45, -17.5], [-5, 0.25, -15], [-5, 0.08, -11.6]],
  },
  {
    id: "vaerelse-4", verden: "vaerelse", navn: "Skrivebordet", start: [0, 0, 0], ψ: 0,
    dele: [
      plade(0, 0, -5, 14, 12, { stil: "bord", h: 0.5 }),
      søjle(-3, 0, -4, 1.0, 2.4),
      bumper(2.5, 0, -3.5),
      bumper(-1.2, 0, -7.8),
      bumper(3.4, 0, -7.0),
      plade(-4.6, 0.4, -8.6, 2.8, 2, { stil: "bog", h: 0.4 }),
      rampe([5, 0, -8], [5, 1.4, -14.6], 2.6, { stil: "bog", h: 0.4 }),
      plade(0, 1.4, -16.6, 12, 4, { stil: "hylde", h: 0.4 }),
      flag(-1, 1.4, -15.2, -Math.PI / 2),
      flyt({ form: "kasse", fra: [-7.5, 1.4, -16.6], til: [-11.4, 1.4, -16.6], b: 3, d: 1.6, h: 0.16, tid: 7, stil: "lineal" }),
      plade(-15, 1.4, -16.6, 4.2, 4.2, { stil: "klods", h: 1 }),
      mål(-15.4, 1.4, -16.6, -Math.PI / 2),
    ],
    ting: [[3, 0, -1], [-1, 0, -3], [-5.5, 0, -5.5], [1, 0, -6], [5, 0, -6.5], [5, 0.85, -12.5], [3, 1.4, -16.6], [-3, 1.4, -16.6], [-9.4, 1.4, -16.6]],
  },
  {
    id: "vaerelse-5", verden: "vaerelse", navn: "Tårnet", start: [0, 0, 1], ψ: 0,
    dele: [
      plade(0, 0, 0, 4, 4, { stil: "bog" }),
      rampe([0, 0, -2], [0, 0.9, -8], 2.2, { stil: "bog", h: 0.4 }),
      plade(0, 0.9, -10, 4, 4, { stil: "klods", h: 1 }),
      rampe([2, 0.9, -10], [8, 1.8, -10], 2.2, { stil: "bog", h: 0.4 }),
      plade(10, 1.8, -10, 4, 4, { stil: "klods", h: 1 }),
      rampe([10, 1.8, -12], [10, 2.7, -18], 2.2, { stil: "bog", h: 0.4 }),
      plade(10, 2.7, -20, 4, 4, { stil: "klods", h: 1 }),
      flag(11.6, 2.7, -21.6, -Math.PI / 2),
      flyt({ form: "kasse", fra: [6.5, 2.7, -20], til: [1.5, 2.7, -20], b: 3, d: 3, h: 0.6, tid: 7.5, stil: "klods" }),
      plade(-2, 2.7, -20, 4, 4, { stil: "klods", h: 1 }),
      rampe([-2, 2.7, -22], [-2, 3.6, -28.2], 1.8, { stil: "bog", h: 0.4 }),
      plade(-2, 3.6, -30.6, 5, 5, { stil: "bog" }),
      mål(-2, 3.6, -31.2),
    ],
    ting: [[0, 0.45, -5], [0, 0.9, -10], [5, 1.35, -10], [10, 1.8, -10], [10, 2.25, -15], [10, 2.7, -20], [4, 2.7, -20], [-2, 3.15, -25.1], [-2, 3.6, -29.5]],
  },

  // ---------------- Slikland ----------------
  {
    id: "slik-1", verden: "slik", navn: "Kiksestien", start: [0, 0, 1.2], ψ: 0,
    dele: [
      rund(0, 0, 0, 2.8, { stil: "kiks" }),
      plade(0, 0, -6.1, 2.2, 7, { stil: "choko", h: 0.5 }),
      plade(2.2, 0, -12.3, 7, 5.4, { stil: "kage", h: 1.2 }),
      ring(0.3, 0, -13.6, 0.75),
      plade(4.4, 0, -17.5, 1.6, 5.2, { stil: "vaffel", h: 0.5 }),
      rund(4.4, 0, -22.4, 2.5, { stil: "kage", h: 1.1 }),
      mål(4.4, 0, -22.7),
    ],
    ting: [[0, 0, -3.9], [0, 0, -6], [0, 0, -8.1], [-0.2, 0, -10.6], [4.6, 0, -11.2], [0.3, 0, -13.6], [4.4, 0, -17.5], [3, 0, -21.6]],
  },
  {
    id: "slik-2", verden: "slik", navn: "Donutbanen", start: [0, 0, 1], ψ: 0,
    dele: [
      rund(0, 0, 0, 2.6, { stil: "kiks" }),
      sti([[0, 0, -1.8], [0, 0, -9], [6, 0, -13], [6, 0, -20], [0, 0, -24]], 2.8, { stil: "choko", bumpere: true }),
      ring(0, 0, -5.5, 0),
      ring(3, 0, -11, ψ(6, -4)),
      ring(6, 0, -16.5, 0),
      ring(3, 0, -22, ψ(-6, -4)),
      rund(0, 0, -27, 3, { stil: "kage", h: 1.1 }),
      mål(0, 0, -27.6, ψ(-6, -4)),
    ],
    ting: [[0, 0, -3.5], [0, 0, -5.5], [0, 0, -7.5], [3, 0, -11], [6, 0, -14.5], [6, 0, -16.5], [6, 0, -18.5], [3, 0, -22], [-0.8, 0, -26]],
  },
  {
    id: "slik-3", verden: "slik", navn: "Lakridsbroerne", start: [0, 0, 1], ψ: 0,
    dele: [
      rund(0, 0, 0, 2.6, { stil: "skum" }),
      plade(0, 0, -5, 1.4, 5, { stil: "lakrids", h: 0.4 }),
      rund(0, 0, -9.6, 2.3, { stil: "skum" }),
      plade(3.9, 0, -9.6, 4.8, 1.4, { stil: "lakrids", h: 0.4 }),
      rund(8.3, 0, -9.6, 2.2, { stil: "skum" }),
      flag(9.6, 0, -8.4, Math.PI),
      flyt({ form: "rund", fra: [8.3, 0, -13.6], til: [8.3, 0, -18.5], r: 1.6, h: 0.5, tid: 7, stil: "kiks" }),
      rund(8.3, 0, -22.3, 2.2, { stil: "skum" }),
      rampe([6.4, 0, -23.4], [1.6, 0.8, -26.6], 1.4, { stil: "lakrids", h: 0.4 }),
      rund(0, 0.8, -27.6, 2.6, { stil: "kage", h: 1.1 }),
      mål(-0.3, 0.8, -28, ψ(-4.8, -3.2)),
    ],
    ting: [[0, 0, -4], [0, 0, -6], [0, 0, -9.6], [3.9, 0, -9.6], [8.3, 0, -11], [8.3, 0, -16], [8.3, 0, -22.3], [4, 0.4, -25], [0.6, 0.8, -27]],
  },
  {
    id: "slik-4", verden: "slik", navn: "Isbakken", start: [0, 3, 0.8], ψ: 0,
    dele: [
      plade(0, 3, 0, 5, 4, { stil: "vaffel", h: 0.5 }),
      rampe([0, 3, -1.9], [0, 1.5, -14.1], 5, { stil: "is" }),
      bumper(-1.3, 2.3, -6), bumper(1.3, 1.87, -9.5), bumper(-1.0, 1.5, -12.5),
      plade(0, 1.5, -16.5, 6, 5, { stil: "is" }),
      flag(2.6, 1.5, -16.5),
      rampe([0, 1.5, -18.9], [0, 0, -29.1], 3.4, { stil: "is" }),
      fart(0, 1.19, -21, 0),
      plade(0, 0, -32, 6, 6, { stil: "kage", h: 1.2, kant: "nøv" }),
      mål(0, 0, -33),
    ],
    ting: [[1.2, 2.74, -4], [-1.3, 2.25, -8], [1.3, 1.88, -11], [0, 1.5, -15.5], [-2, 1.5, -17.5], [0, 1.04, -22], [0, 0.6, -25], [0, 0.31, -27], [0, 0, -31]],
  },
  {
    id: "slik-5", verden: "slik", navn: "Kagetårnet", start: [0, 0, 1], ψ: 0, tårn: [0, -13, 3],
    dele: [
      plade(0, 0, 0, 4.5, 4.5, { stil: "vaffel" }),
      sti([[0, 0, -2], S5(0, 0), S5(45, 0.55), S5(90, 1.1), S5(135, 1.65)], 2.4, { stil: "choko", kant: true }),
      rampe(S5(135, 1.65), [2.77, 2.0, -18.85], 2.4, { stil: "choko", kant: true }),
      flag(7.9, 1.1, -13, Math.PI),
      rund(0, 2.0, -20, 3.2, { stil: "kage", h: 1.1 }),
      drej(0, 2.0, -20, 5.2, 0.75),
      sti([[-2.77, 2.0, -18.85], S5(225, 2.5), S5(270, 3.0), [-3.8, 3.0, -13]], 2.4, { stil: "choko" }),
      rund(0, 3.0, -13, 3.4, { stil: "kage", h: 1.2 }),
      mål(0.4, 3.0, -13, Math.PI / 2),
    ],
    ting: [[0, 0, -4], midt(S5(0, 0), S5(45, 0.55)), midt(S5(45, 0.55), S5(90, 1.1)), midt(S5(90, 1.1), S5(135, 1.65)), [3.6, 1.85, -18.5],
      [-1.8, 2.0, -21.2], midt([-2.77, 2.0, -18.85], S5(225, 2.5)), midt(S5(225, 2.5), S5(270, 3.0)), [-1.6, 3.0, -13]],
  },
];

export const VERDENER = ["jungle", "vaerelse", "slik"];
export const banerI = verden => BANER.filter(b => b.verden === verden);
