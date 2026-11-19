// Comprendre › Test t à 2 groupes : deux échantillons réglables (ou ToothGrowth), Student ou Welch.
import { titre, gh, astuce, esc } from '../../js/app.js';
import { jeu } from '../../js/rdatasets.js';
import { dnorm, testT, echantillon, moyenne, variance } from '../../js/stats.js';
import { fr, fP, repere, axes, courbe, svg, curseur, segment, brancher, chiffres, conclusion, explications, codeR, vec } from '../../js/dessin.js';

const E = { src: 'sim', mA: 5.2, mB: 4.6, sA: 0.8, sB: 0.8, n: 12, eg: 'student' };
let reel = null;

export function afficher(vue, v) {
  vue.innerHTML = titre(v.titre, 'Le test compare l\'écart entre les deux moyennes à l\'incertitude sur cet écart. Écart plus grand, moins de dispersion ou plus de sujets : t grandit et la p-value baisse.') +
    `<div class="cols side"><div><div class="grp"><div id="fig"></div><p class="lgd"><span style="--c:var(--c-blue)"><i></i>Groupe A</span><span style="--c:var(--c-orange)"><i></i>Groupe B</span></p></div>
    ${gh('Règle les groupes')}<div class="grp" id="ctl"><div class="sl2">${segment('src', [['sim', 'Simulées'], ['reel', 'Vraies données']], E.src)}</div>
      <div id="sim">${curseur('mA', 'Moyenne A', 0, 10, 0.1, E.mA)}${curseur('mB', 'Moyenne B', 0, 10, 0.1, E.mB)}${curseur('sA', 'Écart-type A', 0.2, 3, 0.1, E.sA)}${curseur('sB', 'Écart-type B', 0.2, 3, 0.1, E.sB)}${curseur('n', 'Sujets par groupe', 3, 60, 1, E.n, x => String(x))}</div>
      <div class="sl2"><span class="lb">Test</span>${segment('eg', [['student', 'Student'], ['welch', 'Welch']], E.eg)}</div><div id="msg"></div></div></div>
    <div>${gh('Résultat')}<div class="grp" id="res"></div>
    ${explications(['t = (moyenne A − moyenne B) / erreur type de l\'écart. L\'erreur type diminue quand la dispersion baisse ou quand n augmente.',
      'Welch ne suppose pas des variances égales : ses degrés de liberté sont corrigés (souvent décimaux). C\'est le réglage par défaut de t.test().',
      'Deux courbes qui se chevauchent beaucoup peuvent quand même différer significativement si n est grand : regarde aussi la taille de l\'écart.'])}
    <div id="code"></div></div></div>`;
  const maj = async () => {
    vue.querySelector('#sim').hidden = E.src === 'reel';
    let a, b, code;
    const eg = E.eg === 'student';
    if (E.src === 'reel') {
      try {
        reel ??= await jeu('datasets', 'ToothGrowth');
        vue.querySelector('#msg').innerHTML = astuce('Longueur des odontoblastes de 60 cobayes selon le supplément : A = jus d\'orange (OJ), B = vitamine C (VC). Données <b>ToothGrowth</b> de R, téléchargées depuis Rdatasets.', '', 'database');
      } catch (e) { vue.querySelector('#msg').innerHTML = astuce(esc(e.message), 'err', 'warn'); return; }
      const len = reel.col('len'), supp = reel.col('supp');
      a = len.filter((_, i) => supp[i] === 'OJ'); b = len.filter((_, i) => supp[i] === 'VC');
      code = `t.test(len ~ supp, data = ToothGrowth${eg ? ', var.equal = TRUE' : ''})`;
    } else {
      vue.querySelector('#msg').innerHTML = '';
      a = echantillon(E.n, E.mA, E.sA, 11); b = echantillon(E.n, E.mB, E.sB, 12);
      code = `A <- ${vec(a)}\nB <- ${vec(b)}\nt.test(A, B${eg ? ', var.equal = TRUE' : ''})`;
    }
    const r = testT(a, b, eg), mA = moyenne(a), mB = moyenne(b), sA = Math.sqrt(variance(a)), sB = Math.sqrt(variance(b));
    const x0 = Math.min(mA - 3.5 * sA, mB - 3.5 * sB), x1 = Math.max(mA + 3.5 * sA, mB + 3.5 * sB);
    const fA = x => dnorm((x - mA) / sA) / sA, fB = x => dnorm((x - mB) / sB) / sB, ymax = Math.max(fA(mA), fB(mB)) * 1.08;
    const R = repere(340, 190, x0, x1, 0, ymax, { g: 8, d: 8, h: 14, b: 44 });
    const pts = (v, cls, y) => v.map(x => `<circle class="${cls}" cx="${R.X(x).toFixed(1)}" cy="${y}" r="2.6"/>`).join('');
    const yA = R.H - 28, yB = R.H - 18;
    vue.querySelector('#fig').innerHTML = svg(R, `<polygon class="fa" points="${R.X(x0)},${R.Y(0)} ${courbe(R, fA)} ${R.X(x1)},${R.Y(0)}"/><polygon class="fb" points="${R.X(x0)},${R.Y(0)} ${courbe(R, fB)} ${R.X(x1)},${R.Y(0)}"/>
      <polyline class="ca" points="${courbe(R, fA)}"/><polyline class="cbb" points="${courbe(R, fB)}"/>
      <line class="va" x1="${R.X(mA)}" y1="${R.Y(0)}" x2="${R.X(mA)}" y2="${R.Y(fA(mA))}"/><line class="vb" x1="${R.X(mB)}" y1="${R.Y(0)}" x2="${R.X(mB)}" y2="${R.Y(fB(mB))}"/>
      <text class="et" x="${(R.X(mA) + R.X(mB)) / 2}" y="${R.m.h - 2}" text-anchor="middle">écart = ${fr(mA - mB)}</text>
      ${axes({ ...R, m: { ...R.m, b: 19 } }, { nx: 5 })}${pts(a, 'pa', yA)}${pts(b, 'pb', yB)}`);
    vue.querySelector('#res').innerHTML = chiffres([[fr(r.t, 4), 't'], [fr(r.ddl, eg ? 6 : 4), 'ddl'], [fP(r.p), 'p-value']]) +
      conclusion(r.p, `les moyennes diffèrent (A : ${fr(mA)}, B : ${fr(mB)}).`, `rien ne montre que les moyennes diffèrent (A : ${fr(mA)}, B : ${fr(mB)}).`);
    vue.querySelector('#code').innerHTML = codeR(code);
  };
  brancher(vue.querySelector('#ctl'), (id, val) => { E[id] = val; maj(); });
  maj();
}
