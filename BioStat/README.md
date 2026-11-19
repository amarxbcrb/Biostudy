# BioStat · biostatistique avec R pas à pas

Outil de BioStudy (https://www.biostudy.xyz/BioStat/) pour ceux qui débutent avec R. Il ne remplace pas RStudio : il accompagne. Il aide à choisir le bon test (et à savoir pourquoi), écrit le code à coller dans RStudio, explique la mise en forme des graphiques et fait comprendre chaque test avec des visualisations interactives.

Le site est écrit en HTML, CSS et JavaScript natif (modules ES), sans framework, sans dépendance npm et sans serveur. Le design est celui des autres outils BioStudy (groupes façon Réglages iOS, capsules, barre en verre, thème clair et sombre) ; menu des outils (`/menu-flottant.js`), barre d'onglets (`/liquid-glass.js`) et pied de page (`/footer-global.js`) sont communs au site.

## Un dossier par onglet

```
BioStat/
  index.html            page : en-tête, zone de contenu, barre du bas (onglets + bouton rond de recherche)
  css/style.css         style commun (jetons, groupes, lignes, code, barre, recherche)
  js/app.js             socle : charge les onglets, routeur, recherche, briques communes (titre, blocCode, ligne…)
  js/rdatasets.js       données extérieures : catalogue Rdatasets (CSV), partagé par les onglets
  js/stats.js           lois et tests en fonctions pures (vérifiés contre R), partagés par Coder et Comprendre
  js/dessin.js          briques des figures SVG (repère, axes, curseurs, résultat chiffré)
  data/tests.json       les 32 tests (commun : Choisir, Comprendre, Coder, recherche)
  img/icones.svg        icônes Lucide
  onglets/
    choisir/            Choisir   : assistant pas à pas, « Pourquoi ce test ? », vue d'ensemble, fiches, pièges
    coder/              Coder     : opérations (R de base et tidyverse), statistiques descriptives, tester (webR),
                                    interpréter un résultat R (phrases scientifiques), 2 × 2, jeux de données
    graphiques/         Graphiques: composer sa palette, mise en forme ggplot2 avec aperçus, couleurs
    comprendre/         Comprendre: visualisations interactives (dont ANOVA à 2 facteurs), réviser
```

Chaque dossier contient `onglet.js` (titre, icône, couleur, pages, recherche), ses pages, ses données JSON et son `style.css`.
- **Supprimer un onglet** : supprimer son dossier. Il disparaît de la barre ; ses adresses renvoient vers le premier onglet. Si `coder/` manque, les boutons « Essayer ici » disparaissent aussi (plus rien pour exécuter le code).
- **Modifier un onglet** : ne toucher qu'à son dossier.
- **Ajouter un onglet** : créer `onglets/<id>/onglet.js` puis ajouter `<id>` à la liste `ONGLETS` en tête de `js/app.js` (elle fixe l'ordre de la barre).

Format de `onglet.js` :

```js
export default {
  titre: 'Graphiques', icone: 'chart', couleur: 'purple', css: 'style.css',
  pages: {                       // la première est l'accueil de l'onglet ; adresse = #/<page>/<paramètres>
    graphiques: [() => import('./graphiques.js'), 'Graphiques R'],
    forme: [() => import('./graphiques.js'), 'Graphiques R']
  },
  alias: { ancienne: 'graphiques' },   // facultatif : anciennes adresses
  async recherche() { return [{ t: 'titre', s: 'section', h: '#/forme/legende', x: ['texte cherché'] }]; }
};
```

Une page exporte `afficher(vue, paramètres, page)`. Les pages importent le socle par `../../js/app.js`.

## Lancer en local

Les modules ES et `fetch()` ne fonctionnent pas en ouvrant le fichier directement (`file://`). Lance un serveur **depuis la racine du dépôt** :

```sh
python3 -m http.server 8770
```

Puis ouvre <http://localhost:8770/BioStat/>. Les erreurs vers `/api/…` et Iconify sont normales en local.

## Mise en ligne

BioStat est publié avec le reste de biostudy.xyz par Cloudflare Pages : chaque push sur `main` est mis en ligne. Il est déclaré dans `menu-flottant.js` (`mf_toolsData`), `_routes.json`, `functions/_middleware.js` et `studio/index.html` (`OUTILS`), `sitemap.xml` et la page d'accueil.

## Vérifier

```sh
cd BioStat
node tools/check-data.mjs
```

Le script vérifie `data/tests.json` et les JSON de chaque onglet présent : feuilles et vue d'ensemble de l'arbre vers des tests existants, annotations présentes dans les sorties R, marqueurs des gabarits du Codeur, codes « autonomes » sans pastille, couleurs `#RRGGBB`, questions de révision, aucune mention de diapo. À lancer après chaque modification des JSON.

Les calculs (`js/stats.js`, fonctions pures) ont été comparés à R 4.6.0 : 50 cas de lois et de tests, 5 séries de statistiques descriptives, 4 ANOVA à 2 facteurs ; l'interprétation (`onglets/coder/interpretation.js`) lit les 27 sorties R réelles de `tests.json`. Voir `docs/a-verifier.md`.

## Données et ressources extérieures

- **Rdatasets** (<https://github.com/vincentarelbundock/Rdatasets>) : catalogue public d'environ 3 600 jeux de données des packages R, téléchargés en direct depuis `raw.githubusercontent.com` (CORS ouvert) par `js/rdatasets.js`. Utilisé par Coder › Jeux de données (recherche, aperçu, code d'import) et par les « Vraies données » de Comprendre (PlantGrowth, ToothGrowth, InsectSprays, women, faithful). Hors ligne : message d'erreur, le reste du site fonctionne.
- **webR**, chargé depuis `https://webr.r-wasm.org/latest/webr.mjs` **uniquement** au premier clic sur « Exécuter » (`onglets/coder/tester.js`, constante `WEBR_URL`).
- Liens vers l'aide officielle des fonctions (`search.r-project.org`) et vers la documentation des jeux de données (Rdatasets).

## Ajouter du contenu

Dans le code R des JSON, `<NOM>` (majuscules entre chevrons) s'affiche comme une pastille « à remplacer ». « Essayer ici » n'apparaît que pour un code autonome, qui crée lui-même ses données (exemples, pièges, situations marquées `autonome`).

### Un test : `data/tests.json`

Les commentaires `//` ci-dessous ne servent qu'à expliquer : le JSON n'en accepte pas, ne les recopie pas.

```json
{
  "id": "t-test-welch",            // identifiant unique, utilisé dans les liens
  "famille": "deux",               // une des "familles" en tête du fichier
  "titre": "Test t de Welch (2 groupes indépendants)",
  "type": "paramétrique",          // paramétrique, non paramétrique, exact, asymptotique, semi-paramétrique, condition
  "fonction": "t.test",
  "package": "stats",              // stats = R de base ; sinon car, survival… (préfixe pkg:: affiché)
  "aide": "survfit.formula",       // facultatif : nom de la page d'aide s'il diffère de la fonction
  "vignette": "boites",            // cloche, boites, groupes, rangs, paires, points, droite, tableau, proportion, sigmoide, survie, qq
  "resume": "…", "mots_cles": ["…"],
  "h0": "…", "h1": "…",
  "conditions": [{ "texte": "…", "code": "shapiro.test(<X>)" }],
  "code": "t.test(<VAR> ~ <GROUPE>, data = <DONNEES>)",
  "remarques": ["…"],              // facultatif : « À savoir »
  "situations": [{ "texte": "…", "code": "…", "autonome": false }],  // facultatif : « Exemples de situations »
  "exemple": {                     // facultatif
    "code": "…", "sortie": "sortie R copiée telle quelle",
    "notes": [{ "cible": "texte exact à surligner dans la sortie", "texte": "explication" }],
    "conclusion": "…"
  }
}
```

### Choisir : `onglets/choisir/arbre.json` et `pieges.json`

Chaque nœud de l'arbre a une étape, une question, une aide facultative et des choix. Un choix mène soit vers un autre nœud (`"vers": "id"`), soit vers une feuille, et porte un `pourquoi` (affiché dans « Pourquoi ce test ? ») :

```json
{ "texte": "Oui", "pourquoi": "…", "feuille": { "tests": ["t-test-student", "wilcox-mw"], "conseil": 0, "note": "facultatif" } }
```

`conseil` est l'indice du test conseillé dans `tests` (`null` si le choix dépend des conditions). `synthese` (Vue d'ensemble) : des groupes `{ titre, lignes }`, chaque ligne `{ cas, test, ch }` où `ch` est le chemin des réponses ; `check-data` vérifie qu'il mène à une feuille qui propose `test`.

Un piège : `{ "id", "titre", "mots_cles", "faux", "juste", "exemple" (facultatif), "code" (facultatif, autonome) }`.

### Coder : `onglets/coder/manip.json` et `donnees.json`

Chaque opération a un ou plusieurs cas (`variantes`). Un cas liste ses champs et ses deux gabarits, `base` et `dplyr`. Marqueurs :
- `{df}` : valeur du champ, écrite comme nom R (entre backticks si ce n'est pas un nom valide) ou telle quelle (types `cond`, `expr`) ;
- `{old:q}` : valeur entre guillemets (`c("a", "b")` pour une liste) ;
- `{ordre.b}` : valeur `b` de l'option choisie dans un champ de type `choix`.

Types de champ : `nom`, `noms` (liste), `texte`, `cond`, `expr`, `valeurs`, `nombres`, `choix`.

Chaque opération a aussi `groupe` (rubrique de l'accueil), `icone` et `couleur`. `donnees.json` : la source Rdatasets et les jeux conseillés (`package`, `item`, `texte`, `colonnes`, `pour`, `test`).

### Graphiques : `onglets/graphiques/ggplot.json` et `couleurs.json`

`ggplot.json` : des fiches `{ id, titre, sous, icone, couleur, groupe, sections: [{ titre, texte, code, apercu }] }`. `apercu` (facultatif) décrit le graphique que dessine `apercu.js` avec les vraies données (Rdatasets) : `{ jeu, geom: boxplot | histogram | point | bar, x, y, fill, colour, points, smooth, bins, titre, soustitre, xlab, ylab, caption, centre, legende, legendeTitre, labels, breaks, couleurs, ordre, axeLabels, theme, taille, angle, ylim, multi, note }`. Rendu approché de ggplot2, pas ggplot2 lui-même. `couleurs.json` : `familles` (palettes `{ nom, couleurs, code }`), `degrades`, `nommees` (`[nom, hex]`), `aide`, `exemple` ; codes `#RRGGBB`, toucher une pastille copie `"#RRGGBB"`.

### Comprendre : `onglets/comprendre/`

Les visualisations sont listées dans `VIZ` (`onglet.js`) ; chacune est un fichier `viz-<id>.js` qui exporte `afficher(vue, meta)`. Les calculs viennent de `js/stats.js`, les dessins de `js/dessin.js`. Questions de révision dans `quiz.json` :

```json
{ "id": "q17", "enonce": "…", "choix": ["chisq", "fisher", "mcnemar", "t-test-welch"], "reponse": "fisher", "explication": "…" }
```

## Taille

Le socle chargé sur chaque page (`index.html`, `css/style.css`, `js/app.js`) pèse environ 42 Ko. Les bibliothèques partagées (`js/stats.js`, `js/dessin.js`, `js/rdatasets.js`, 26 Ko) et chaque onglet ne sont téléchargés que lorsqu'une page en a besoin :

```sh
wc -c index.html css/style.css js/*.js | tail -1
for d in onglets/*; do echo "$d $(cat $d/*.js $d/*.css | wc -c)"; done
```
