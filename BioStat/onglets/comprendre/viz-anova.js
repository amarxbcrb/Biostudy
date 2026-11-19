// Comprendre › ANOVA : on écarte les moyennes des groupes ou on resserre les valeurs, F = variance entre / variance dans.
import { titre, gh, astuce, esc } from '../../js/app.js';
import { jeu } from '../../js/rdatasets.js';
import { anova, moyenne, echantillon } from '../../js/stats.js';
import { fr, fP, repere, axes, svg, curseur, segment, brancher, chiffres, conclusion, explications, codeR, vec } from '../../js/dessin.js';

const NOMS = { sim: ['A', 'B', 'C'], reel: ['ctrl', 'trt1', 'trt2'] };
const E = { src: 'sim', kb: 1, kw: 1 };
const SIM = [echantillon(10, 5, 0.6, 21), echantillon(10, 5.5, 0.6, 22), echantillon(10, 5.9, 0.6, 23)];
let reel = null;

export function afficher(vue, v) {
  vue.innerHTML = titre(v.titre, 'L\'ANOVA compare la variabilité <b>entre</b> les groupes (les moyennes s\'écartent-elles ?) à la variabilité <b>dans</b> les groupes (le bruit). Leur rapport est F : grand F, petite p-value.') +
    `<div class="cols side"><div><div class="grp"><div id="fig"></div><p class="lgd"><span style="--c:var(--acc)"><i></i>Moyenne du groupe</span><span style="--c:var(--tx3)"><i></i>Moyenne générale</span></p></div>
    ${gh('Règle les groupes')}<div class="grp" id="ctl"><div class="sl2">${segment('src', [['sim', 'Simulées'], ['reel', 'Vraies données']], E.src)}</div>
      ${curseur('kb', 'Écart entre les moyennes', 0, 2.5, 0.05, E.kb, x => '× ' + fr(x))}${curseur('kw', 'Dispersion dans les groupes', 0.2, 2.5, 0.05, E.kw, x => '× ' + fr(x))}<div id="msg"></div></div></div>
    <div>${gh('Résultat')}<div class="grp" id="res"></div>
    ${explications(['Carré moyen « entre » = SCE entre / (k − 1) ; carré moyen « dans » = SCE dans / (N − k). F = entre / dans.',
      'Écarte les moyennes : la barre « entre » monte, F grandit. Augmente la dispersion : la barre « dans » monte, F baisse.',
      'Si F est significatif, au moins une moyenne diffère : on cherche lesquelles avec des comparaisons 2 à 2 (correction de Bonferroni).'])}
    <div id="code"></div></div></div>`;
  const maj = async () => {
    let base = SIM;
    if (E.src === 'reel') {
      try {
        reel ??= await jeu('datasets', 'PlantGrowth');
        vue.querySelector('#msg').innerHTML = astuce('Poids sec de 30 plantes : contrôle et 2 traitements. Données <b>PlantGrowth</b> de R, téléchargées depuis Rdatasets. À × 1, ce sont les vraies valeurs.', '', 'database');
      } catch (e) { vue.querySelector('#msg').innerHTML = astuce(esc(e.message), 'err', 'warn'); return; }
      const w = reel.col('weight'), g = reel.col('group');
      base = NOMS.reel.map(n => w.filter((_, i) => g[i] === n));
    } else vue.querySelector('#msg').innerHTML = '';
    // y' = moyenne générale + kb · (moyenne du groupe − moyenne générale) + kw · (y − moyenne du groupe)
    const m = moyenne(base.flat());
    const G = base.map(gr => { const mg = moyenne(gr); return gr.map(y => Math.round((m + E.kb * (mg - m) + E.kw * (y - mg)) * 100) / 100); });
    const r = anova(G), noms = NOMS[E.src], tous = G.flat(), lo = Math.min(...tous), hi = Math.max(...tous), mg = (hi - lo) * 0.1 || 1;
    const R = repere(240, 200, -0.5, 2.5, lo - mg, hi + mg, { g: 34, d: 6, h: 10, b: 22 });
    const cm = [r.sceF / r.ddlF, r.sceR / r.ddlR], B = repere(96, 200, 0, 2, 0, Math.max(...cm) * 1.15, { g: 6, d: 6, h: 10, b: 22 });
    const pts = G.map((gr, k) => gr.map((y, i) => `<circle class="${['pa', 'pb', 'pc'][k]}" cx="${(R.X(k) + (i % 5 - 2) * 5).toFixed(1)}" cy="${R.Y(y).toFixed(1)}" r="3"/>`).join('') +
      `<line class="mg" x1="${R.X(k) - 22}" x2="${R.X(k) + 22}" y1="${R.Y(moyenne(gr))}" y2="${R.Y(moyenne(gr))}"/><text class="gr" x="${R.X(k)}" y="${R.H - 6}" text-anchor="middle">${noms[k]}</text>`).join('');
    const barres = cm.map((c, k) => `<rect class="${k ? 'bd' : 'be'}" x="${B.X(k + 0.2)}" y="${B.Y(c)}" width="${B.X(0.6) - B.X(0)}" height="${B.Y(0) - B.Y(c)}" rx="6"/><text class="gr" x="${B.X(k + 0.5)}" y="${B.H - 6}" text-anchor="middle">${k ? 'dans' : 'entre'}</text>`).join('');
    vue.querySelector('#fig').innerHTML = `<div class="duo d2">${svg(R, `<line class="ref" x1="${R.m.g}" x2="${R.L - 6}" y1="${R.Y(r.m)}" y2="${R.Y(r.m)}"/>${pts}${axes(R, { tx: false, ty: true, ny: 4 })}`)}${svg(B, `${barres}<line class="ax" x1="6" x2="90" y1="${B.Y(0)}" y2="${B.Y(0)}"/>`)}</div>`;
    vue.querySelector('#res').innerHTML = chiffres([[fr(r.F, 4), `F (${r.ddlF} ; ${r.ddlR} ddl)`], [fr(cm[0], 3) + ' / ' + fr(cm[1], 3), 'entre / dans'], [fP(r.p), 'p-value']]) +
      conclusion(r.p, 'au moins une moyenne diffère des autres.', 'rien ne montre que les moyennes diffèrent.');
    vue.querySelector('#code').innerHTML = codeR(E.src === 'reel' && E.kb === 1 && E.kw === 1 ? 'summary(aov(weight ~ group, data = PlantGrowth))'
      : `y <- ${vec(tous)}\ngroupe <- factor(rep(c(${noms.map(n => `"${n}"`).join(', ')}), each = ${G[0].length}))\nsummary(aov(y ~ groupe))`);
  };
  brancher(vue.querySelector('#ctl'), (id, val) => { E[id] = val; maj(); });
  maj();
}
