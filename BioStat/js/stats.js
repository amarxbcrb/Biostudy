// Lois et tests en fonctions pures (sans DOM), partagés par les onglets (Comprendre, Coder) : mêmes valeurs que R.
// Vérifiées contre R 4.6.0 (webR) : voir docs/a-verifier.md.

/* ---------- Fonctions spéciales ---------- */
const LG = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
// log Γ(x), approximation de Lanczos (g = 7)
export function lgamma(x) {
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
  x -= 1;
  let a = LG[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += LG[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
// Bêta incomplète régularisée I_x(a, b), fraction continue (Lentz)
function fracBeta(a, b, x) {
  const TINY = 1e-300;
  let c = 1, d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 1000; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY; c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY; d = 1 / d; h *= d * c;
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY; c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY; d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return h;
}
export function ibeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log1p(-x));
  return x < (a + 1) / (a + b + 2) ? bt * fracBeta(a, b, x) / a : 1 - bt * fracBeta(b, a, 1 - x) / b;
}
// Gamma incomplète régularisée P(a, x) (série) et Q(a, x) = 1 − P (fraction continue)
export function gammaP(a, x) {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let s = 1 / a, t = s;
    for (let n = 1; n < 1000; n++) { t *= x / (a + n); s += t; if (Math.abs(t) < Math.abs(s) * 1e-16) break; }
    return s * Math.exp(-x + a * Math.log(x) - lgamma(a));
  }
  return 1 - gammaQ(a, x);
}
export function gammaQ(a, x) {
  if (x < a + 1) return 1 - gammaP(a, x);
  const TINY = 1e-300;
  let b = x + 1 - a, c = 1 / TINY, d = 1 / b, h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < TINY) d = TINY;
    c = b + an / c; if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
}

/* ---------- Lois : densités et probabilités (queue haute = « au-delà ») ---------- */
export const dnorm = x => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
// P(Z ≤ z)
export const pnorm = z => z < 0 ? gammaQ(0.5, z * z / 2) / 2 : 1 - gammaQ(0.5, z * z / 2) / 2;
const AK = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
const BK = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
const CK = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
const DK = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
// Quantile de la loi normale : algorithme d'Acklam puis une correction de Halley
export function qnorm(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const pl = 0.02425;
  let x;
  if (p < pl || p > 1 - pl) {
    const q = Math.sqrt(-2 * Math.log(p < pl ? p : 1 - p));
    x = (((((CK[0] * q + CK[1]) * q + CK[2]) * q + CK[3]) * q + CK[4]) * q + CK[5]) / ((((DK[0] * q + DK[1]) * q + DK[2]) * q + DK[3]) * q + 1);
    if (p > pl) x = -x;
  } else {
    const q = p - 0.5, r = q * q;
    x = (((((AK[0] * r + AK[1]) * r + AK[2]) * r + AK[3]) * r + AK[4]) * r + AK[5]) * q / (((((BK[0] * r + BK[1]) * r + BK[2]) * r + BK[3]) * r + BK[4]) * r + 1);
  }
  const e = pnorm(x) - p, u = e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2);
  return x - u / (1 + x * u / 2);
}
export const dt = (t, n) => Math.exp(lgamma((n + 1) / 2) - lgamma(n / 2) - 0.5 * Math.log(n * Math.PI) - (n + 1) / 2 * Math.log1p(t * t / n));
// P(T ≤ t), loi de Student à n ddl
export const pt = (t, n) => { const q = ibeta(n / (n + t * t), n / 2, 0.5) / 2; return t > 0 ? 1 - q : q; };
export const dchisq = (x, k) => x <= 0 ? 0 : Math.exp((k / 2 - 1) * Math.log(x) - x / 2 - k / 2 * Math.log(2) - lgamma(k / 2));
// P(X² > x)
export const pchisqSup = (x, k) => x <= 0 ? 1 : gammaQ(k / 2, x / 2);
export const df = (x, a, b) => x <= 0 ? 0 : Math.exp(lgamma((a + b) / 2) - lgamma(a / 2) - lgamma(b / 2) + a / 2 * Math.log(a / b) + (a / 2 - 1) * Math.log(x) - (a + b) / 2 * Math.log1p(a * x / b));
// P(F > f)
export const pfSup = (f, a, b) => f <= 0 ? 1 : ibeta(b / (b + a * f), b / 2, a / 2);
// Quantile par dichotomie d'une fonction de répartition croissante
export function quantile(F, p, lo, hi) {
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (F(m) < p) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/* ---------- Statistiques de base ---------- */
export const somme = v => v.reduce((a, b) => a + b, 0);
export const moyenne = v => somme(v) / v.length;
export const variance = v => { const m = moyenne(v); return somme(v.map(x => (x - m) ** 2)) / (v.length - 1); };
// Rangs, ex aequo au rang moyen (comme rank() de R)
export function rangs(v) {
  const o = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(v.length);
  for (let i = 0; i < o.length;) {
    let j = i;
    while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++;
    for (let k = i; k <= j; k++) r[o[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
}

/* ---------- Tests ---------- */
// Test t à 2 échantillons : Student (variances égales) ou Welch, bilatéral
export function testT(a, b, egales) {
  const n1 = a.length, n2 = b.length, m1 = moyenne(a), m2 = moyenne(b), v1 = variance(a), v2 = variance(b);
  let se, ddl;
  if (egales) { const sp = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2); se = Math.sqrt(sp * (1 / n1 + 1 / n2)); ddl = n1 + n2 - 2; }
  else { const e1 = v1 / n1, e2 = v2 / n2; se = Math.sqrt(e1 + e2); ddl = (e1 + e2) ** 2 / (e1 * e1 / (n1 - 1) + e2 * e2 / (n2 - 1)); }
  const t = (m1 - m2) / se;
  return { t, ddl, p: 2 * pt(-Math.abs(t), ddl), m1, m2 };
}

// Wilcoxon-Mann-Whitney : W = somme des rangs de a − n1(n1 + 1)/2, comme wilcox.test(a, b) de R.
// p exacte (loi des sommes de rangs, ex aequo compris) si n1 et n2 < 50, sinon approximation normale corrigée.
export function testW(a, b) {
  const n1 = a.length, n2 = b.length, r = rangs([...a, ...b]);
  const R1 = somme(r.slice(0, n1)), W = R1 - n1 * (n1 + 1) / 2;
  const exAequo = new Set(r).size < r.length;
  if (n1 < 50 && n2 < 50) {
    // nombre de façons de choisir n1 rangs (doublés pour rester entiers) donnant chaque somme
    const r2 = r.map(x => Math.round(2 * x)), max = somme(r2);
    let f = Array.from({ length: n1 + 1 }, () => new Float64Array(max + 1));
    f[0][0] = 1;
    for (const x of r2) for (let k = n1; k >= 1; k--) { const fk = f[k], fp = f[k - 1]; for (let s = max; s >= x; s--) fk[s] += fp[s - x]; }
    const tot = somme(Array.from(f[n1])), s0 = Math.round(2 * R1);
    let inf = 0, sup = 0;
    f[n1].forEach((c, s) => { if (s <= s0) inf += c; if (s >= s0) sup += c; });
    return { W, R1, rangs: r, exact: true, exAequo, p: Math.min(1, 2 * Math.min(inf, sup) / tot) };
  }
  const N = n1 + n2, t = {};
  r.forEach(x => (t[x] = (t[x] || 0) + 1));
  const sigma = Math.sqrt(n1 * n2 / 12 * (N + 1 - somme(Object.values(t).map(c => c ** 3 - c)) / (N * (N - 1))));
  const z0 = W - n1 * n2 / 2, z = (z0 - Math.sign(z0) * 0.5) / sigma;
  return { W, R1, rangs: r, exact: false, exAequo, p: 2 * pnorm(-Math.abs(z)) };
}

// χ² d'indépendance sur un tableau (lignes × colonnes) ; correction de Yates pour un 2 × 2 si yates
export function testChi2(T, yates) {
  const L = T.map(somme), C = T[0].map((_, j) => somme(T.map(l => l[j]))), N = somme(L);
  const E = T.map((l, i) => l.map((_, j) => L[i] * C[j] / N));
  const corr = yates && T.length === 2 && T[0].length === 2;
  // Yates (R) : |O − C| diminué de min(0,5 ; |O − C|) dans chaque case
  const contrib = T.map((l, i) => l.map((o, j) => { const e = E[i][j], d = Math.abs(o - e); return (d - (corr ? Math.min(0.5, d) : 0)) ** 2 / e; }));
  const x2 = somme(contrib.flat()), ddl = (T.length - 1) * (T[0].length - 1);
  return { E, contrib, x2, ddl, p: pchisqSup(x2, ddl) };
}

// ANOVA à un facteur : SCE entre et dans les groupes, F, p
export function anova(G) {
  const tout = G.flat(), m = moyenne(tout), N = tout.length, k = G.length;
  const sceF = somme(G.map(g => g.length * (moyenne(g) - m) ** 2));
  const sceR = somme(G.map(g => { const mg = moyenne(g); return somme(g.map(x => (x - mg) ** 2)); }));
  const F = sceF / (k - 1) / (sceR / (N - k));
  return { sceF, sceR, ddlF: k - 1, ddlR: N - k, F, p: pfSup(F, k - 1, N - k), m };
}

// Corrélation de Pearson (test t à n − 2 ddl) et ρ de Spearman (Pearson sur les rangs)
export function pearson(x, y) {
  const mx = moyenne(x), my = moyenne(y);
  let sxy = 0, sxx = 0, syy = 0;
  x.forEach((v, i) => { sxy += (v - mx) * (y[i] - my); sxx += (v - mx) ** 2; syy += (y[i] - my) ** 2; });
  const r = sxy / Math.sqrt(sxx * syy), n = x.length, t = r * Math.sqrt((n - 2) / (1 - r * r));
  return { r, t, ddl: n - 2, p: 2 * pt(-Math.abs(t), n - 2), pente: sxy / sxx, ord: my - sxy / sxx * mx };
}
export const spearman = (x, y) => pearson(rangs(x), rangs(y)).r;

// Shapiro-Wilk : W et p par l'algorithme de Royston (1995), celui de shapiro.test() (swilk.c)
const poly = (c, x) => { let r = c[0]; if (c.length > 1) { let p = x * c[c.length - 1]; for (let j = c.length - 2; j > 0; j--) p = (p + c[j]) * x; r += p; } return r; };
export function shapiro(v) {
  const x = [...v].sort((a, b) => a - b), n = x.length, nn2 = Math.floor(n / 2), a = new Array(nn2 + 1);
  if (n < 3) return null;
  if (n === 3) a[1] = Math.SQRT1_2;
  else {
    const an25 = n + 0.25, m = [];
    let summ2 = 0;
    for (let i = 1; i <= nn2; i++) { m[i - 1] = qnorm((i - 0.375) / an25); summ2 += m[i - 1] ** 2; }
    summ2 *= 2;
    const ssumm2 = Math.sqrt(summ2), rsn = 1 / Math.sqrt(n);
    const a1 = poly([0, 0.221157, -0.147981, -2.07119, 4.434685, -2.706056], rsn) - m[0] / ssumm2;
    let i1, fac;
    if (n > 5) {
      i1 = 3;
      const a2 = -m[1] / ssumm2 + poly([0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633], rsn);
      fac = Math.sqrt((summ2 - 2 * m[0] ** 2 - 2 * m[1] ** 2) / (1 - 2 * a1 ** 2 - 2 * a2 ** 2));
      a[2] = a2;
    } else {
      i1 = 2;
      fac = Math.sqrt((summ2 - 2 * m[0] ** 2) / (1 - 2 * a1 ** 2));
    }
    a[1] = a1;
    for (let i = i1; i <= nn2; i++) a[i] = -m[i - 1] / fac;
  }
  const range = x[n - 1] - x[0];
  if (range < 1e-19) return null;
  let sx = x[0] / range, sa = -a[1];
  for (let i = 1, j = n - 1; i < n; j--) {
    sx += x[i] / range;
    i++;
    if (i !== j) sa += Math.sign(i - j) * a[Math.min(i, j)];
  }
  sa /= n; sx /= n;
  let ssa = 0, ssx = 0, sax = 0;
  for (let i = 0, j = n - 1; i < n; i++, j--) {
    const asa = i !== j ? Math.sign(i - j) * a[1 + Math.min(i, j)] - sa : -sa, xsx = x[i] / range - sx;
    ssa += asa * asa; ssx += xsx * xsx; sax += asa * xsx;
  }
  const s2 = Math.sqrt(ssa * ssx), w1 = (s2 - sax) * (s2 + sax) / (ssa * ssx), W = 1 - w1;
  if (n === 3) return { W, p: Math.max(0, 1.90985931710274 * (Math.asin(Math.sqrt(W)) - 1.04719755119660)) };
  let y = Math.log(w1), mu, s;
  const lx = Math.log(n);
  if (n <= 11) {
    const g = poly([-2.273, 0.459], n);
    if (y >= g) return { W, p: 1e-99 };
    y = -Math.log(g - y);
    mu = poly([0.544, -0.39978, 0.025054, -6.714e-4], n);
    s = Math.exp(poly([1.3822, -0.77857, 0.062767, -0.0020322], n));
  } else {
    mu = poly([-1.5861, -0.31082, -0.083751, 0.0038915], lx);
    s = Math.exp(poly([-0.4803, -0.082676, 0.0030302], lx));
  }
  return { W, p: pnorm((mu - y) / s) };
}

/* ---------- Échantillons reproductibles ---------- */
// Générateur pseudo-aléatoire à graine (mulberry32) puis loi normale (Box-Muller)
export function alea(graine) {
  let s = graine >>> 0;
  const u = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { u, n: () => Math.sqrt(-2 * Math.log(u() || 1e-12)) * Math.cos(2 * Math.PI * u()) };
}
// n valeurs de moyenne et d'écart-type exactement m et s (centrées-réduites puis remises à l'échelle), arrondies à 0,01
export function echantillon(n, m, s, graine) {
  const g = alea(graine), z = Array.from({ length: n }, g.n), mz = moyenne(z), sz = Math.sqrt(variance(z));
  return z.map(x => Math.round((m + s * (x - mz) / sz) * 100) / 100);
}

/* ---------- Statistiques descriptives (comme summary(), sd(), IQR() de R) ---------- */
// Quantile de type 7, le réglage par défaut de quantile() et de summary()
export const quantile7 = (v, p) => { const s = [...v].sort((a, b) => a - b), h = (s.length - 1) * p, i = Math.floor(h); return s[i] + (h - i) * ((s[i + 1] ?? s[i]) - s[i]); };
// Quantile de la loi de Student (dichotomie sur pt)
export const qt = (p, n) => quantile(x => pt(x, n), p, -1e4, 1e4);
export function descriptives(v) {
  const n = v.length, m = moyenne(v), s = n > 1 ? Math.sqrt(variance(v)) : NaN, se = s / Math.sqrt(n), q = qt(0.975, n - 1);
  const cpt = new Map(); v.forEach(x => cpt.set(x, (cpt.get(x) || 0) + 1));
  const fmax = Math.max(...cpt.values());
  return {
    n, moyenne: m, mediane: quantile7(v, 0.5), sd: s, variance: s * s, min: Math.min(...v), max: Math.max(...v),
    q1: quantile7(v, 0.25), q3: quantile7(v, 0.75), iqr: quantile7(v, 0.75) - quantile7(v, 0.25), se, ic: [m - q * se, m + q * se],
    cv: 100 * s / Math.abs(m), modes: fmax > 1 ? [...cpt].filter(([, c]) => c === fmax).map(([x]) => x).sort((a, b) => a - b) : [], fmode: fmax
  };
}

/* ---------- ANOVA à 2 facteurs croisés, plan équilibré (mêmes sommes que summary(aov(y ~ A * B))) ---------- */
// y : valeurs ; a, b : niveau de chaque valeur. Renvoie null si le plan n'est pas équilibré.
export function anova2(y, a, b) {
  const LA = [...new Set(a)], LB = [...new Set(b)], N = y.length, cell = {}, m = moyenne(y);
  y.forEach((v, i) => (cell[a[i] + '\u0001' + b[i]] ??= []).push(v));
  const r = cell[LA[0] + '\u0001' + LB[0]]?.length;
  if (!r || Object.keys(cell).length !== LA.length * LB.length || Object.values(cell).some(c => c.length !== r)) return null;
  const mA = Object.fromEntries(LA.map(l => [l, moyenne(y.filter((_, i) => a[i] === l))]));
  const mB = Object.fromEntries(LB.map(l => [l, moyenne(y.filter((_, i) => b[i] === l))]));
  const ssA = r * LB.length * somme(LA.map(l => (mA[l] - m) ** 2)), ssB = r * LA.length * somme(LB.map(l => (mB[l] - m) ** 2));
  let ssAB = 0, ssE = 0;
  for (const la of LA) for (const lb of LB) {
    const c = cell[la + '\u0001' + lb], mc = moyenne(c);
    ssAB += r * (mc - mA[la] - mB[lb] + m) ** 2;
    ssE += somme(c.map(v => (v - mc) ** 2));
  }
  const dfA = LA.length - 1, dfB = LB.length - 1, dfAB = dfA * dfB, dfE = N - LA.length * LB.length, msE = ssE / dfE;
  const ligne = (ss, df) => ({ ss, df, ms: ss / df, F: ss / df / msE, p: pfSup(ss / df / msE, df, dfE) });
  return { A: ligne(ssA, dfA), B: ligne(ssB, dfB), AB: ligne(ssAB, dfAB), E: { ss: ssE, df: dfE, ms: msE }, moyennes: { A: mA, B: mB, cell: Object.fromEntries(Object.entries(cell).map(([k, c]) => [k, moyenne(c)])) } };
}

/* ---------- Saisie de valeurs et boîte à moustaches ---------- */
// Lecture : « nom : valeurs » sur chaque ligne = un groupe. Séparateurs : espaces, retours à la ligne, « ; ».
// Virgule : séparateur si elle est suivie d'un espace (« 1.5, 2 »), sinon virgule décimale (« 1,5 2 »).
export function lireValeurs(t) {
  const lignes = t.split('\n').map(l => l.trim()).filter(Boolean), groupes = [], mauvais = [];
  const parGroupe = lignes.some(l => /^[^:\d-][^:]*:/.test(l));
  const sepVirgule = /,\s/.test(t);
  const nombres = s => {
    const v = [];
    let na = 0;
    for (let x of (sepVirgule ? s.replace(/,/g, ' ') : s).split(/[\s;]+/).filter(Boolean)) {
      if (/^NA$/i.test(x)) { na++; continue; }
      x = sepVirgule ? x : x.replace(',', '.');
      if (/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(x)) v.push(+x); else mauvais.push(x);
    }
    return { v, na };
  };
  if (parGroupe) for (const l of lignes) { const k = l.indexOf(':'); if (k < 0) { groupes.length && groupes.at(-1).v.push(...nombres(l).v); continue; } groupes.push({ nom: l.slice(0, k).trim(), ...nombres(l.slice(k + 1)) }); }
  else groupes.push({ nom: '', ...nombres(lignes.join(' ')) });
  return { groupes: groupes.filter(g => g.v.length), mauvais };
}

// Charnières de Tukey (fivenum de R), utilisées par boxplot() pour la boîte et les valeurs atypiques
export function cinqNombres(v) {
  const x = [...v].sort((a, b) => a - b), n = x.length, n4 = Math.floor((n + 3) / 2) / 2, d = [1, n4, (n + 1) / 2, n + 1 - n4, n];
  const h = d.map(k => 0.5 * (x[Math.floor(k) - 1] + x[Math.ceil(k) - 1]));
  const e = 1.5 * (h[3] - h[1]), atyp = x.filter(y => y < h[1] - e || y > h[3] + e), dans = x.filter(y => y >= h[1] - e && y <= h[3] + e);
  return { h, moustaches: [Math.min(...dans), Math.max(...dans)], atyp };
}
