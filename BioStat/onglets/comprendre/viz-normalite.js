// Comprendre › Normalité : histogramme, Q-Q plot (comme qqnorm / qqline de R) et test de Shapiro-Wilk.
import { titre, gh, ico, astuce, esc } from '../../js/app.js';
import { jeu } from '../../js/rdatasets.js';
import { qnorm, shapiro, echantillon } from '../../js/stats.js';
import { fr, fP, repere, axes, svg, curseur, segment, brancher, chiffres, conclusion, explications, codeR, vec } from '../../js/dessin.js';

const E = { src: 'normale', n: 30, graine: 1 };
let reel = null;

// Quantile de type 7 (réglage par défaut de quantile() dans R)
const q7 = (s, p) => { const h = (s.length - 1) * p, i = Math.floor(h); return s[i] + (h - i) * ((s[i + 1] ?? s[i]) - s[i]); };

export function afficher(vue, v) {
  vue.innerHTML = titre(v.titre, 'Beaucoup de tests supposent des données « normales » (en cloche). On le regarde avec un histogramme et un Q-Q plot, et on le teste avec Shapiro-Wilk (H0 : les données suivent la loi normale).') +
    `<div class="cols side"><div><div class="grp"><div id="fig"></div></div>
    ${gh('Les données')}<div class="grp" id="ctl"><div class="sl2">${segment('src', [['normale', 'Normales'], ['asym', 'Asymétriques'], ['reel', 'Réelles']], E.src)}</div>
      <div id="sim">${curseur('n', 'Nombre de valeurs', 10, 200, 1, E.n, x => String(x))}
      <button type="button" class="opt" id="tirer"><span>Tirer un autre échantillon</span>${ico('reset')}</button></div><div id="msg"></div></div></div>
    <div>${gh('Shapiro-Wilk')}<div class="grp" id="res"></div>
    ${explications(['Q-Q plot : chaque point compare une valeur observée à la valeur attendue si les données étaient normales. Points alignés sur la droite : distribution normale.',
      'Points en courbe (au-dessus de la droite aux deux bouts, ou en dessous) : asymétrie. Points en S : queues trop lourdes ou trop légères.',
      'Avec peu de valeurs, le test manque de puissance ; avec beaucoup, il rejette pour de tout petits écarts. Regarde toujours le graphique.'])}
    <div id="code"></div></div></div>`;
  const maj = async () => {
    vue.querySelector('#sim').hidden = E.src === 'reel';
    let x, nom = 'x';
    if (E.src === 'reel') {
      try { reel ??= (await jeu('datasets', 'faithful')).col('eruptions'); vue.querySelector('#msg').innerHTML = astuce('Durée (min) des 272 éruptions du geyser Old Faithful : données <b>faithful</b> de R, téléchargées depuis Rdatasets.', '', 'database'); }
      catch (e) { vue.querySelector('#msg').innerHTML = astuce(esc(e.message), 'err', 'warn'); return; }
      x = reel; nom = 'faithful$eruptions';
    } else {
      vue.querySelector('#msg').innerHTML = '';
      const z = echantillon(E.n, 0, 1, E.graine * 7 + E.n);
      x = E.src === 'normale' ? z.map(v => Math.round((50 + 10 * v) * 10) / 10) : z.map(v => Math.round(Math.exp(0.7 * v) * 100) / 10);
    }
    const s = [...x].sort((a, b) => a - b), n = s.length, a = n <= 10 ? 3 / 8 : 1 / 2;
    const th = s.map((_, i) => qnorm((i + 1 - a) / (n + 1 - 2 * a)));
    // histogramme (règle de Sturges, comme hist())
    const k = Math.ceil(Math.log2(n) + 1), lo = s[0], hi = s[n - 1], w = (hi - lo) / k || 1, cpt = Array(k).fill(0);
    s.forEach(v => cpt[Math.min(k - 1, Math.floor((v - lo) / w))]++);
    const H = repere(160, 170, lo, hi, 0, Math.max(...cpt), { g: 8, d: 6, h: 12, b: 24 });
    const hist = cpt.map((c, i) => `<rect class="bar" x="${H.X(lo + i * w) + 1}" y="${H.Y(c)}" width="${Math.max(0, H.X(lo + (i + 1) * w) - H.X(lo + i * w) - 2)}" height="${H.Y(0) - H.Y(c)}" rx="3"/>`).join('');
    // Q-Q plot et droite passant par les quartiles (qqline)
    const Q = repere(180, 170, -3, 3, s[0], s[n - 1], { g: 30, d: 6, h: 12, b: 24 });
    const y1 = q7(s, 0.25), y2 = q7(s, 0.75), x1 = qnorm(0.25), x2 = qnorm(0.75), pente = (y2 - y1) / (x2 - x1), y0 = y1 - pente * x1;
    const pts = s.map((v, i) => `<circle class="pt" cx="${Q.X(th[i]).toFixed(1)}" cy="${Q.Y(v).toFixed(1)}" r="2.6"/>`).join('');
    vue.querySelector('#fig').innerHTML = `<div class="duo">${svg(H, hist + axes(H, { nx: 3, lx: 'valeurs' }))}${svg(Q, `<line class="ref" x1="${Q.X(-3)}" y1="${Q.Y(y0 - 3 * pente)}" x2="${Q.X(3)}" y2="${Q.Y(y0 + 3 * pente)}"/>${pts}${axes(Q, { ty: true, nx: 3, ny: 3, lx: 'théorique' })}`, 'clip')}</div>`;
    const r = shapiro(x);
    vue.querySelector('#res').innerHTML = chiffres([[fr(r.W, 4), 'W'], [fP(r.p), 'p-value'], [String(n), 'valeurs']]) +
      conclusion(r.p, 'on rejette la normalité : préfère un test non paramétrique, ou un test robuste si les effectifs sont grands.', 'rien ne montre un écart à la loi normale (ce qui ne prouve pas qu\'elle est normale).');
    vue.querySelector('#code').innerHTML = codeR(E.src === 'reel' ? `shapiro.test(${nom})\nqqnorm(${nom}); qqline(${nom})\nhist(${nom})` : `x <- ${vec(x)}\nshapiro.test(x)\nqqnorm(x); qqline(x)\nhist(x)`);
  };
  brancher(vue.querySelector('#ctl'), (id, val) => { E[id] = val; maj(); });
  vue.querySelector('#tirer').addEventListener('click', () => { E.graine++; maj(); });
  maj();
}
