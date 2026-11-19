// Coder › Interpréter un résultat : lecture des sorties de R (sans DOM) et phrases scientifiques prêtes pour un rapport.
// Reconnaît les tests « htest » (t.test, wilcox.test, chisq.test…), summary(aov()), summary(lm()), summary(glm(binomial))
// et les tableaux de comparaisons 2 à 2 (pairwise.*.test). Un format inconnu est signalé, jamais deviné.

const N = '-?(?:\\d+\\.?\\d*(?:e[-+]?\\d+)?|Inf)';
const num = s => +String(s).replace(/\s/g, '');
// Nombres à la française : statistiques à 2 décimales, estimations à 3 chiffres significatifs
export const f2 = x => Number.isInteger(+x) ? String(+x) : (Math.round(x * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: Math.abs(x) >= 100 ? 0 : 2, maximumFractionDigits: 2 });
export const f3 = x => (+(+x).toPrecision(3)).toLocaleString('fr-FR', { maximumFractionDigits: 10 });
const ddl = x => Number.isInteger(+x) ? String(+x) : f2(+x);
// p : « p < 0,001 » sous 0,001 ou si R affiche « < », sinon 3 décimales
export const fp = (p, signe = '=') => signe === '<' || p < 0.001 ? 'p < 0,001' : `p = ${p.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
const nomVar = s => s.trim().replace(/^[\w.]+\$(?=[\w.]+$)/, '');

const TESTS = [
  [/^One Sample t-test/, 't1', 'test t de Student pour un échantillon'],
  [/^Welch Two Sample t-test/, 't2', 'test t de Welch'],
  [/^Two Sample t-test/, 't2', 'test t de Student'],
  [/^Paired t-test/, 'tp', 'test t apparié'],
  [/^Wilcoxon signed rank/, 'ws', 'test des rangs signés de Wilcoxon'],
  [/^Wilcoxon rank sum/, 'wr', 'test de Wilcoxon-Mann-Whitney'],
  [/^Pearson's Chi-squared test/, 'chi', 'test du χ² d\'indépendance'],
  [/^Chi-squared test for given probabilities/, 'gof', 'test du χ² d\'ajustement'],
  [/^Fisher's Exact Test/, 'fisher', 'test exact de Fisher'],
  [/^McNemar's Chi-squared test/, 'mcnemar', 'test de McNemar'],
  [/^Pearson's product-moment correlation/, 'pearson', 'corrélation de Pearson'],
  [/^Spearman's rank correlation rho/, 'spearman', 'corrélation de Spearman'],
  [/^Kendall's rank correlation tau/, 'kendall', 'corrélation de Kendall'],
  [/^Shapiro-Wilk normality test/, 'shapiro', 'test de Shapiro-Wilk'],
  [/^Kruskal-Wallis rank sum test/, 'kruskal', 'test de Kruskal-Wallis'],
  [/^Friedman rank sum test/, 'friedman', 'test de Friedman'],
  [/^Bartlett test of homogeneity of variances/, 'bartlett', 'test de Bartlett'],
  [/^F test to compare two variances/, 'vartest', 'test F d\'égalité des variances'],
  [/^One-way analysis of means \(not assuming/, 'oneway', 'ANOVA de Welch'],
  [/^One-way analysis of means/, 'oneway', 'ANOVA à un facteur'],
  [/^1-sample proportions test/, 'prop1', 'test d\'une proportion'],
  [/^2-sample test for equality of proportions/, 'prop2', 'test de comparaison de deux proportions'],
  [/^Exact binomial test/, 'binom', 'test binomial exact']
];

// Découpe la sortie en blocs : un test, une table d'ANOVA (avec ses strates « Error: »), un modèle ou des comparaisons 2 à 2
function blocs(t) {
  const L = t.split('\n'), B = [];
  let pos = 0;
  for (const l of L) {
    const s = l.trim();
    const type = TESTS.some(([re]) => re.test(s)) ? 'htest' : /^Pairwise comparisons using/.test(s) ? 'paires' : /^Call:/.test(s) ? 'modele' : /^(Error: |Df\s+Sum Sq\s+Mean Sq)/.test(s) ? 'aov' : null;
    if (type && !(type === 'aov' && B.at(-1)?.type === 'aov')) B.push({ d: pos, type });
    pos += l.length + 1;
  }
  return B.map((b, k) => ({ ...b, texte: t.slice(b.d, k + 1 < B.length ? B[k + 1].d : t.length) }));
}

/* ---------- Tests « htest » ---------- */
function htest(s, d0) {
  const [re, type, nom] = TESTS.find(([r]) => r.test(s.trim()));
  const r = { type, nom, titre: s.trim().split('\n')[0].trim(), zones: [] };
  const z = (debut, ch, cls) => ch && r.zones.push({ d: d0 + debut, f: d0 + debut + ch.length, cls });
  r.yates = /continuity correction/.test(r.titre);
  r.data = (s.match(/^data:\s+(.*)$/m)?.[1] || '').trim();
  const l = s.match(/^.*p-value\s*([<=])\s*([\d.e+-]+).*$/m);
  if (!l) return null;
  r.signe = l[1]; r.p = num(l[2]);
  r.stats = {};
  for (const m of l[0].matchAll(new RegExp(`([^,=]+?)\\s*=\\s*(${N})`, 'g'))) {
    const k = m[1].trim();
    if (k === 'p-value') continue;
    r.stats[k] = num(m[2]);
    z(l.index + m.index + m[0].indexOf(m[1].trim()), m[0].trim(), /df$/.test(k) ? 'ddl' : 'stat');
  }
  const pv = l[0].indexOf('p-value');
  z(l.index + pv, l[0].slice(pv).split(',')[0].trim(), 'p');
  const ic = s.match(new RegExp(`(\\d+) percent confidence interval:\\n( *)((${N})\\s+(${N}))`));
  if (ic) { r.ic = [num(ic[4]), num(ic[5])]; r.niv = ic[1]; z(ic.index + ic[0].length - ic[3].length, ic[3], 'ic'); }
  const est = s.match(/sample estimates:\n(.*)\n(.*)/);
  if (est) {
    r.est = [];
    let fin = 0;
    for (const v of est[2].matchAll(/\S+/g)) { const f = v.index + v[0].length; r.est.push([est[1].slice(fin, f).trim(), num(v[0])]); fin = f; }
    const v = est[2].trim();
    z(est.index + est[0].length - est[2].length + est[2].indexOf(v), v, 'est');
  }
  const alt = s.match(/alternative hypothesis: (.*)/)?.[1] || '';
  r.uni = /greater|less/.test(alt) ? (/greater/.test(alt) ? 'supérieur' : 'inférieur') : '';
  r.h0 = alt.match(new RegExp(`(?:equal to|greater than|less than) (${N})`))?.[1];
  return r;
}

const sig = r => r.p < 0.05;
const statTxt = (r, sym, k, d) => `${sym}${d !== undefined ? `(${d})` : ''} = ${f2(r.stats[k])}`;
const icTxt = r => r.ic ? ` ; IC à ${r.niv} % : [${f3(r.ic[0])} ; ${f3(r.ic[1])}]` : '';
const deuxVar = r => { const m = r.data.match(/^(.+?) by (.+)$/) || r.data.match(/^(.+?) and (.+)$/); return m ? [nomVar(m[1]), nomVar(m[2])] : [nomVar(r.data), '']; };

function phrasesTest(r) {
  const S = sig(r), P = fp(r.p, r.signe), [a, b] = deuxVar(r), U = r.uni ? ` (test unilatéral : H1 « ${r.uni} »)` : '';
  const E = Object.fromEntries((r.est || []).map(([k, v]) => [k, v]));
  switch (r.type) {
    case 't1': return S
      ? `La moyenne de ${a} (${f3(E['mean of x'])}) diffère significativement de ${f3(r.h0)} (${r.nom} : ${statTxt(r, 't', 't', ddl(r.stats.df))} ; ${P}${icTxt(r)})${U}.`
      : `La moyenne de ${a} (${f3(E['mean of x'])}) ne diffère pas significativement de ${f3(r.h0)} (${r.nom} : ${statTxt(r, 't', 't', ddl(r.stats.df))} ; ${P}${icTxt(r)})${U}.`;
    case 't2': {
      const g = (r.est || []).map(([k, v]) => [k.replace(/^mean (in group|of) /, ''), v]);
      const qui = r.data.includes(' by ') ? `de ${a} selon ${b}` : `entre ${a} et ${b}`;
      const desc = g.length === 2 ? (r.data.includes(' by ') ? ` : ${f3(g[0][1])} pour ${g[0][0]} contre ${f3(g[1][1])} pour ${g[1][0]}` : ` : ${f3(g[0][1])} contre ${f3(g[1][1])}`) : '';
      const diff = g.length === 2 ? ` La différence des moyennes est estimée à ${f3(g[0][1] - g[1][1])}${r.ic ? ` (IC à ${r.niv} % : [${f3(r.ic[0])} ; ${f3(r.ic[1])}])` : ''}.` : '';
      return S ? `La moyenne ${qui} diffère significativement${desc} (${r.nom} : ${statTxt(r, 't', 't', ddl(r.stats.df))} ; ${P})${U}.${diff}`
        : `Le ${r.nom} ne met pas en évidence de différence significative de la moyenne ${qui}${desc} (${statTxt(r, 't', 't', ddl(r.stats.df))} ; ${P})${U}.${diff}`;
    }
    case 'tp': {
      const m = E['mean difference'] ?? E['mean of the differences'];
      return `La différence moyenne entre ${a} et ${b} (${f3(m)}) ${S ? 'est' : 'n\'est pas'} significativement différente de 0 (${r.nom} : ${statTxt(r, 't', 't', ddl(r.stats.df))} ; ${P}${icTxt(r)})${U}.`;
    }
    case 'ws': return b
      ? `Les différences entre ${a} et ${b} ${S ? 'sont' : 'ne sont pas'} significativement décalées par rapport à 0 (${r.nom} : V = ${f2(r.stats.V)} ; ${P})${U}.`
      : `La distribution de ${a} ${S ? 'est' : 'n\'est pas'} significativement décalée par rapport à ${f3(r.h0)} (${r.nom} : V = ${f2(r.stats.V)} ; ${P})${U}.`;
    case 'wr': return r.data.includes(' by ')
      ? `La distribution de ${a} ${S ? 'diffère significativement' : 'ne diffère pas significativement'} entre les deux groupes de ${b} (${r.nom} : W = ${f2(r.stats.W)} ; ${P})${U}.`
      : `Les distributions de ${a} et de ${b} ${S ? 'diffèrent significativement' : 'ne diffèrent pas significativement'} (${r.nom} : W = ${f2(r.stats.W)} ; ${P})${U}.`;
    case 'chi': {
      const qui = r.data.includes(' and ') ? `entre ${a} et ${b}` : `entre les deux variables du tableau ${nomVar(r.data)}`;
      return `${S ? 'Il existe une association significative' : 'Le test ne met pas en évidence d\'association significative'} ${qui} (${r.nom}${r.yates ? ', avec correction de Yates' : ''} : ${statTxt(r, 'χ²', 'X-squared', ddl(r.stats.df))} ; ${P}).`;
    }
    case 'gof': return `La répartition observée ${S ? 'diffère significativement' : 'ne diffère pas significativement'} de la répartition théorique (${r.nom} : ${statTxt(r, 'χ²', 'X-squared', ddl(r.stats.df))} ; ${P}).`;
    case 'fisher': return `${S ? 'Il existe une association significative' : 'Le test ne met pas en évidence d\'association significative'} entre les deux variables du tableau ${nomVar(r.data)} (${r.nom} : ${P}${E['odds ratio'] !== undefined ? ` ; odds ratio = ${f3(E['odds ratio'])}` : ''}${icTxt(r)}).`;
    case 'mcnemar': return `La proportion de réponses positives ${S ? 'change significativement' : 'ne change pas significativement'} entre les deux mesures appariées du tableau ${nomVar(r.data)} (${r.nom}${r.yates ? ', avec correction de continuité' : ''} : ${statTxt(r, 'χ²', 'McNemar\'s chi-squared', ddl(r.stats.df))} ; ${P}).`;
    case 'pearson': case 'spearman': case 'kendall': {
      const c = r.type === 'pearson' ? E.cor : r.type === 'spearman' ? E.rho : E.tau, sym = { pearson: 'r', spearman: 'ρ', kendall: 'τ' }[r.type];
      const sens = c > 0 ? 'positive' : 'négative', force = Math.abs(c) >= 0.5 ? 'forte' : 'faible';
      const st = r.type === 'pearson' ? ` ; ${statTxt(r, 't', 't', ddl(r.stats.df))}` : '';
      return S ? `Il existe une corrélation ${r.type === 'pearson' ? 'linéaire' : 'monotone'} ${sens} et ${force} (repère usuel : |${sym}| ≥ 0,5 = forte) entre ${a} et ${b} (${sym} = ${f3(c)}${st} ; ${P}${icTxt(r)}).`
        : `Le test ne met pas en évidence de corrélation significative entre ${a} et ${b} (${sym} = ${f3(c)}${st} ; ${P}${icTxt(r)}).`;
    }
    case 'shapiro': return S ? `La distribution de ${a} s'écarte significativement de la loi normale (${r.nom} : W = ${f3(r.stats.W)} ; ${P}).`
      : `La distribution de ${a} ne s'écarte pas significativement de la loi normale (${r.nom} : W = ${f3(r.stats.W)} ; ${P}) ; la normalité est acceptable, sans être démontrée.`;
    case 'kruskal': return `La distribution de ${a} ${S ? 'diffère significativement' : 'ne diffère pas significativement'} entre ${S ? 'au moins deux' : 'les'} groupes de ${b} (${r.nom} : ${statTxt(r, 'χ²', 'Kruskal-Wallis chi-squared', ddl(r.stats.df))} ; ${P}).`;
    case 'friedman': { const m = r.data.split(' and ').map(nomVar); return `Les valeurs de ${m[0]} ${S ? 'diffèrent significativement' : 'ne diffèrent pas significativement'} entre les niveaux de ${m[1]}, mesurés sur les mêmes ${m[2] || 'sujets'} (${r.nom} : ${statTxt(r, 'χ²', 'Friedman chi-squared', ddl(r.stats.df))} ; ${P}).`; }
    case 'bartlett': return S ? `Les variances de ${a} diffèrent significativement entre les groupes de ${b} (${r.nom} : ${statTxt(r, 'K²', 'Bartlett\'s K-squared', ddl(r.stats.df))} ; ${P}) : l'homogénéité des variances n'est pas respectée.`
      : `Les variances de ${a} ne diffèrent pas significativement entre les groupes de ${b} (${r.nom} : ${statTxt(r, 'K²', 'Bartlett\'s K-squared', ddl(r.stats.df))} ; ${P}) : l'homogénéité des variances est acceptable.`;
    case 'vartest': return `Les variances de ${a} ${S ? 'diffèrent significativement' : 'ne diffèrent pas significativement'} entre les deux groupes de ${b} (${r.nom} : F(${ddl(r.stats['num df'])} ; ${ddl(r.stats['denom df'])}) = ${f2(r.stats.F)} ; ${P}${E['ratio of variances'] !== undefined ? ` ; rapport des variances = ${f3(E['ratio of variances'])}` : ''}${icTxt(r)}).`;
    case 'oneway': return `La moyenne de ${a} ${S ? 'diffère significativement entre au moins deux' : 'ne diffère pas significativement entre les'} groupes de ${b} (${r.nom} : F(${ddl(r.stats['num df'])} ; ${ddl(r.stats['denom df'])}) = ${f2(r.stats.F)} ; ${P}).`;
    case 'prop1': { const m = r.data.match(/(\d+) out of (\d+), null probability (\S+)/); return `La proportion observée (${m ? `${m[1]} sur ${m[2]}, soit ` : ''}${f3(E.p)}) ${S ? 'diffère significativement' : 'ne diffère pas significativement'} de ${f3(m ? +m[3] : r.h0)} (${r.nom} : ${statTxt(r, 'χ²', 'X-squared', ddl(r.stats.df))} ; ${P}${icTxt(r)})${U}.`; }
    case 'prop2': return `Les deux proportions (${f3(E['prop 1'])} et ${f3(E['prop 2'])}) ${S ? 'diffèrent significativement' : 'ne diffèrent pas significativement'} (${r.nom} : ${statTxt(r, 'χ²', 'X-squared', ddl(r.stats.df))} ; ${P}${icTxt(r)}).`;
    case 'binom': return `La proportion observée (${r.stats['number of successes']} sur ${r.stats['number of trials']}, soit ${f3(E['probability of success'])}) ${S ? 'diffère significativement' : 'ne diffère pas significativement'} de ${f3(r.h0)} (${r.nom} : ${P}${icTxt(r)})${U}.`;
  }
  return '';
}

/* ---------- Tables d'ANOVA : summary(aov()), y compris les strates « Error: » ---------- */
function tableAov(s, d0) {
  const r = { type: 'aov', nom: 'ANOVA', titre: 'Table d\'ANOVA', zones: [], effets: [], repetees: /^Error:/m.test(s) };
  let pos = 0, attente = [];
  for (const l of s.split('\n')) {
    const m = l.match(new RegExp(`^(\\S+)\\s+(\\d+)\\s+(${N})\\s+(${N})\\s+(${N})\\s+(<\\s?[\\d.e-]+|${N})`));
    const mr = l.match(/^Residuals\s+(\d+)/);
    if (m) {
      const p = m[6].replace(/\s/g, '');
      const e = { nom: m[1], df: +m[2], F: num(m[5]), p: num(p.replace('<', '')), signe: p.startsWith('<') ? '<' : '=' };
      r.effets.push(e); attente.push(e);
      const iF = l.indexOf(m[5], m[1].length + m[2].length), iP = l.lastIndexOf(m[6]);
      r.zones.push({ d: d0 + pos + iF, f: d0 + pos + iF + m[5].length, cls: 'stat' }, { d: d0 + pos + iP, f: d0 + pos + iP + m[6].length, cls: 'p' });
    } else if (mr) { attente.forEach(e => (e.resid = +mr[1])); attente = []; } // ddl résiduels de la même strate
    pos += l.length + 1;
  }
  return r.effets.length ? r : null;
}
function phrasesAov(r) {
  const P = [];
  const lien = n => n.split(':').join(' × ');
  const inter = r.effets.filter(e => e.nom.includes(':'));
  for (const e of r.effets) {
    const st = `F(${e.df} ; ${e.resid}) = ${f2(e.F)} ; ${fp(e.p, e.signe)}`, S = e.p < 0.05;
    if (e.nom.includes(':')) {
      const f = e.nom.split(':');
      P.push(S ? `L'interaction ${lien(e.nom)} est significative (${st}) : l'effet de ${f[0]} dépend du niveau de ${f.slice(1).join(' et de ')}.` : `L'interaction ${lien(e.nom)} n'est pas significative (${st}).`);
    } else P.push(S ? `Le facteur ${e.nom} a un effet significatif sur la variable étudiée (${st}) : ${e.df === 1 ? 'les moyennes de ses deux niveaux diffèrent' : 'au moins deux de ses niveaux ont des moyennes différentes'}.` : `Le facteur ${e.nom} n'a pas d'effet significatif sur la variable étudiée (${st}).`);
  }
  if (inter.some(e => e.p < 0.05)) P.push('Une interaction est significative : interprète les effets principaux avec prudence et décris les moyennes de chaque combinaison de niveaux.');
  else if (r.effets.some(e => !e.nom.includes(':') && e.p < 0.05 && e.df > 1)) P.push(r.repetees ? 'Pour savoir quels temps (ou conditions) diffèrent, fais des comparaisons 2 à 2 appariées avec une correction : pairwise.t.test(…, paired = TRUE, p.adjust.method = "bonferroni").'
    : 'Pour savoir quels niveaux diffèrent, fais des comparaisons 2 à 2 avec une correction : TukeyHSD() ou pairwise.t.test(…, p.adjust.method = "bonferroni").');
  else if (r.effets.some(e => !e.nom.includes(':') && e.p < 0.05)) P.push('Un facteur à 2 niveaux significatif n\'a pas besoin de comparaisons 2 à 2 : il suffit de regarder quelle moyenne est la plus élevée.');
  return P;
}

/* ---------- Modèles : summary(lm()) et summary(glm(…, family = binomial)) ---------- */
function modele(s, d0) {
  const call = s.match(/^(lm|glm)\(formula = ([^,]+?) ~ ([^,]+?),([\s\S]*?)\)\s*$/m);
  if (!call) return null;
  const r = { type: call[1], nom: call[1] === 'lm' ? 'Régression linéaire' : 'Régression logistique', titre: call[1] === 'lm' ? 'Régression linéaire (lm)' : 'Modèle linéaire généralisé (glm)', zones: [], coefs: [] };
  r.y = call[2].trim(); r.logit = /binomial/.test(s);
  if (r.type === 'glm' && !r.logit) return null;
  const bloc = s.match(/Coefficients:\n.*\n([\s\S]*?)\n---/) || s.match(/Coefficients:\n.*\n([\s\S]*?)\n\n/);
  if (!bloc) return null;
  let pos = bloc.index + bloc[0].indexOf(bloc[1]);
  for (const l of bloc[1].split('\n')) {
    const m = l.match(new RegExp(`^(\\S+)\\s+(${N})\\s+(${N})\\s+(${N})\\s+(<\\s?[\\d.e-]+|${N})`));
    if (m) {
      const p = m[5].replace(/\s/g, '');
      r.coefs.push({ nom: m[1], est: num(m[2]), stat: num(m[4]), p: num(p.replace('<', '')), signe: p.startsWith('<') ? '<' : '=' });
      const iE = l.indexOf(m[2], m[1].length), iP = l.lastIndexOf(m[5]);
      r.zones.push({ d: d0 + pos + iE, f: d0 + pos + iE + m[2].length, cls: 'est' }, { d: d0 + pos + iP, f: d0 + pos + iP + m[5].length, cls: 'p' });
    }
    pos += l.length + 1;
  }
  const r2 = s.match(new RegExp(`Multiple R-squared:\\s+(${N})`));
  if (r2) { r.r2 = num(r2[1]); r.zones.push({ d: d0 + r2.index, f: d0 + r2.index + r2[0].length, cls: 'ic' }); }
  const fs = s.match(new RegExp(`F-statistic:\\s+(${N}) on (\\d+) and (\\d+) DF,\\s+p-value:\\s+([<=]?\\s?[\\d.e-]+)`));
  if (fs) r.F = { F: num(fs[1]), d1: fs[2], d2: fs[3], p: num(fs[4].replace(/[<=\s]/g, '')), signe: /</.test(fs[4]) ? '<' : '=' };
  return r.coefs.length ? r : null;
}
function phrasesModele(r) {
  const P = [];
  for (const c of r.coefs.filter(c => c.nom !== '(Intercept)')) {
    const S = c.p < 0.05, st = `${fp(c.p, c.signe)}`;
    if (r.logit) {
      const or = Math.exp(c.est);
      P.push(S ? `La variable ${c.nom} est significativement associée à ${r.y} (${st}) : chaque unité supplémentaire de ${c.nom} multiplie l'odds de ${r.y} par exp(${(+c.est.toPrecision(4)).toLocaleString('fr-FR')}) = ${f3(or)}, les autres variables du modèle étant fixées.`
        : `La variable ${c.nom} n'est pas significativement associée à ${r.y} (${st} ; odds ratio = ${f3(or)}).`);
    } else P.push(S ? `La pente de ${c.nom} est significativement différente de 0 (t = ${f2(c.stat)} ; ${st}) : quand ${c.nom} augmente d'une unité, ${r.y} ${c.est > 0 ? 'augmente' : 'diminue'} en moyenne de ${f3(Math.abs(c.est))}.`
      : `La pente de ${c.nom} n'est pas significativement différente de 0 (t = ${f2(c.stat)} ; ${st}) : le modèle ne met pas en évidence d'effet de ${c.nom} sur ${r.y}.`);
  }
  if (r.r2 !== undefined) P.push(`Le modèle explique ${f3(100 * r.r2)} % de la variabilité de ${r.y} (R² = ${f3(r.r2)})${r.F ? ` ; test global : F(${r.F.d1} ; ${r.F.d2}) = ${f2(r.F.F)}, ${fp(r.F.p, r.F.signe)}` : ''}.`);
  return P;
}

/* ---------- Comparaisons 2 à 2 : pairwise.t.test(), pairwise.wilcox.test() ---------- */
function paires(s, d0) {
  const L = s.split('\n'), i0 = L.findIndex((l, i) => i > 0 && /^\s{4,}\S/.test(l) && /^\S/.test(L[i + 1] || ''));
  if (i0 < 0) return null;
  const cols = L[i0].trim().split(/\s+/), r = { type: 'paires', nom: 'Comparaisons 2 à 2', titre: L[0].trim(), zones: [], paires: [] };
  r.methode = s.match(/P value adjustment method: (\S+)/)?.[1] || '';
  let pos = L.slice(0, i0 + 1).reduce((a, l) => a + l.length + 1, 0);
  for (const l of L.slice(i0 + 1)) {
    if (!l.trim() || /^P value/.test(l)) break;
    const [nom, ...v] = l.trim().split(/\s+/).reduce((a, x) => (x === '<' ? a.push('<') : a.at(-1) === '<' ? (a[a.length - 1] = '<' + x) : a.push(x), a), []);
    v.forEach((x, j) => { if (x !== '-' && x !== 'NA') { const p = num(x.replace('<', '')); r.paires.push({ a: nom, b: cols[j], p, signe: x.startsWith('<') ? '<' : '=' }); if (p < 0.05) { const k = l.indexOf(x.replace('<', '')); r.zones.push({ d: d0 + pos + k, f: d0 + pos + k + x.replace('<', '').length, cls: 'p' }); } } });
    pos += l.length + 1;
  }
  return r.paires.length ? r : null;
}
function phrasesPaires(r) {
  const S = r.paires.filter(x => x.p < 0.05), NS = r.paires.filter(x => x.p >= 0.05), m = r.methode && r.methode !== 'none' ? `, p-values ajustées par la méthode ${r.methode === 'bonferroni' ? 'de Bonferroni' : r.methode === 'holm' ? 'de Holm' : r.methode}` : '';
  const l = a => a.map(x => `${x.a} et ${x.b} (${fp(x.p, x.signe)})`).join(' ; ');
  return [S.length ? `Comparaisons 2 à 2${m} : ${S.length > 1 ? 'les groupes diffèrent significativement deux à deux pour' : 'différence significative entre'} ${l(S)}.` : `Comparaisons 2 à 2${m} : aucune paire de groupes ne diffère significativement.`,
    ...(NS.length && S.length ? [`Pas de différence significative entre ${l(NS)}.`] : [])];
}

/* ---------- Point d'entrée ---------- */
export function interpreter(texte) {
  const t = texte.replace(/\r/g, '').replace(/\t/g, '    ');
  const res = [];
  for (const b of blocs(t)) {
    let r = null, P = [];
    if (b.type === 'htest') { r = htest(b.texte, b.d); if (r) P = [phrasesTest(r)]; }
    else if (b.type === 'aov') { r = tableAov(b.texte, b.d); if (r) P = phrasesAov(r); }
    else if (b.type === 'modele') { r = modele(b.texte, b.d); if (r) P = phrasesModele(r); }
    else if (b.type === 'paires') { r = paires(b.texte, b.d); if (r) P = phrasesPaires(r); }
    if (r) res.push({ ...r, phrases: P.filter(Boolean), significatif: r.p !== undefined ? r.p < 0.05 : (r.effets || r.coefs || r.paires || []).some(x => x.p < 0.05 && x.nom !== '(Intercept)') });
  }
  return { texte: t, resultats: res };
}
