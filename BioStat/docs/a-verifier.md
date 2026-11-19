# Points à vérifier

Ce fichier liste ce qui a été vérifié et ce qui ne l'a pas été.

## Exemples de sorties (tests.json)
- Les 25 exemples ont été exécutés dans R 4.6.0 (webR 0.6.0) et collés tels quels. Les 5 premiers, calculés d'abord par une réimplémentation, étaient identiques à R, à l'alignement d'une ligne près (corrigé).
- Pas d'exemple pour `km`, `logrank`, `cox` (package survival), `levene` (package car) : ces packages n'étaient pas téléchargeables depuis l'environnement de travail. `qqnorm` ne produit qu'un graphique.
- Corrélation de Spearman : pour n > 9, R n'énumère plus toutes les permutations (série d'Edgeworth) et peut afficher `p-value < 2.2e-16` pour une corrélation très forte. L'exemple utilise donc n = 9 ; sa p-value (0,003075) a été recalculée à l'identique par énumération des 9! permutations.

## Contenu du cours de tests intégré aux fiches (octobre 2026)
- Les informations du cours ont été rangées dans les fiches (conditions, « À savoir », « Exemples de situations »), sans citer de diapo (demande de l'utilisateur).
- Les exemples avec données ont été exécutés dans R 4.6.0 : χ² d'ajustement (11 / 4) → X-squared = 3.2667 ; débouchés Licence / Master → p-value = 0.04115 et effectifs théoriques ; McNemar des composteurs (72 et 12 discordants) → 42.857 sans correction, 41.44 avec la correction par défaut ; `prop.test(11, 15, p = 0.5, correct = FALSE)` → X-squared = 3.2667 (z² = χ²).
- Le cours cite `BSDA::z.test()` pour une proportion ; cette fonction compare une moyenne quand l'écart-type est connu : le site conseille `prop.test(…, correct = FALSE)`. À confirmer avec l'enseignant.
- Coquilles du cours non reprises : s² = S / √n (S / √n est l'erreur type), « échantillons indépendants » pour des séries appariées, écart des résidus « sur l'axe des abscisses » (ordonnées), « ni = nombre de séries » (effectif de la série i).

## Onglet Comprendre : calculs comparés à R 4.6.0 (webR 0.6.0)
- `js/stats.js` (déplacé depuis `onglets/comprendre/calculs.js`) comparé à R sur 50 cas, écart relatif < 1e-6 partout : `pnorm`, `qnorm`, `pt` (dont ddl décimaux), `pchisq`, `pf` ; test t de Student et de Welch (données simulées et ToothGrowth) ; Wilcoxon-Mann-Whitney exact sans ex aequo, exact avec ex aequo (InsectSprays C / D, comme R 4.6) et approximation normale corrigée pour n ≥ 50 ; χ² 2 × 3, 2 × 2 avec et sans Yates ; ANOVA (PlantGrowth : F = 4.846, p = 0.01591) ; Pearson (r, p), Spearman (ρ), pente et ordonnée de lm ; Shapiro-Wilk (n = 3, 5, 10, 11, 12, 50, 272 et données asymétriques), y compris p ≈ 9 × 10⁻¹⁶ pour faithful.
- La p-value de Spearman n'est pas calculée dans le navigateur (R utilise une loi exacte des rangs, algorithme AS 89) : le site renvoie vers `cor.test(…, method = "spearman")`.
- Q-Q plot : positions `ppoints(n)` et droite par les quartiles (quantile de type 7), comme `qqnorm()` et `qqline()` ; histogramme avec la règle de Sturges comme `hist()`. Comparaison visuelle seulement.

## Statistiques descriptives, ANOVA à 2 et 3 facteurs, interprétation (octobre 2026)
- Statistiques descriptives (`descriptives()`, `cinqNombres()` de `js/stats.js`) comparées à R 4.6.0 sur 5 séries : `length`, `mean`, `median`, `sd`, `var`, `min`, `quantile(…, 0.25 / 0.75)` (type 7), `max`, `IQR`, erreur type, `t.test(x)$conf.int`, `fivenum` et nombre de `boxplot.stats(x)$out` : écart relatif < 1e-9.
- ANOVA à 2 facteurs (`anova2()`, plan équilibré) comparée à `summary(aov(y ~ a * b))` : ToothGrowth (supp × dose : F = 15,57 / 92,0 / 4,11) et 3 jeux simulés, écart < 1e-6.
- Fiches anova-2 (ToothGrowth) et anova-3 (npk) : sorties exécutées dans R 4.6.0. npk vient d'un essai en blocs : l'exemple ignore `block` pour rester simple (dit dans la conclusion).
- Interprétation (`onglets/coder/interpretation.js`) : les 27 sorties R réelles de `tests.json` sont toutes lues ; phrases relues. Seuil 5 % ; p affichée « p < 0,001 » sous 0,001, sinon à 3 décimales.
- Aperçus des graphiques (`onglets/graphiques/apercu.js`) : dessinés par BioStat avec les vraies données (couleurs par défaut de ggplot2 vérifiées, boîtes avec quantiles de type 7 comme `stat_boxplot`, bande de confiance de `geom_smooth(method = "lm")` calculée) ; tailles, marges et découpage des barres d'histogramme approchés. ggplot2 n'a pas pu être exécuté ici pour comparer.

## Données extérieures (Rdatasets)
- Catalogue `datasets.csv` et CSV des jeux téléchargés depuis `https://raw.githubusercontent.com/vincentarelbundock/Rdatasets/master/` (réponse 200, en-tête `access-control-allow-origin: *` vérifiés). Dimensions des 13 jeux conseillés vérifiées dans R 4.6.0.
- Le code d'import proposé utilise l'adresse officielle `https://vincentarelbundock.github.io/Rdatasets/csv/…` (celle de l'index) : non joignable depuis l'environnement de travail, à confirmer une fois en ligne. `read.csv()` sur une URL n'a pas été testé dans webR (pas de bouton « Essayer » pour ces jeux).
- github.io, r-universe, crandb, Iconify et webr.r-wasm.org n'étaient pas joignables depuis l'environnement de travail.

## Onglet Graphiques (ggplot.json)
- ggplot2 n'a pas pu être installé dans l'environnement de travail : aucun code des fiches de mise en forme n'a été exécuté. Fonctions et arguments utilisés (documentés dans ggplot2 3.5) : `geom_boxplot(outlier.shape = NA)`, `geom_jitter(width)`, `geom_histogram(bins)`, `geom_point()`, `geom_smooth(method = "lm")`, `geom_bar()`, `labs(title, subtitle, x, y, caption, fill)`, `theme(plot.title, legend.position, text, axis.text, axis.text.x, axis.title)`, `element_text(size, face, angle, hjust)`, `guides(fill = "none")`, `guide_legend(nrow)`, `scale_fill_discrete(labels, breaks)`, `scale_fill_manual(values, labels)`, `scale_colour_manual(values)`, `scale_x_discrete(limits, labels)`, `theme_minimal()`, `theme_classic(base_size)`, `theme_bw()`, `theme_light()`, `coord_cartesian(ylim)`, `scale_y_log10()`, `scale_y_continuous(labels = scales::percent)`, `ggsave(width, height, units, dpi)`.
- Jeux de données des exemples (PlantGrowth, ToothGrowth, faithful, women, mtcars, iris) : fournis avec R, colonnes vérifiées dans R 4.6.0.

## Couleurs ggplot2 (couleurs.json)
- Palettes par défaut (2 à 6 groupes) : calculées comme `scales::hue_pal()`, `hcl(h = seq(15, 375, length = n + 1)[1:n], c = 100, l = 65)`, dans R 4.6.0.
- Okabe-Ito et niveaux de gris : `palette.colors(palette = "Okabe-Ito")` et `grey.colors(4, 0.2, 0.8)` (réglage de `scale_fill_grey()`) exécutés dans R 4.6.0.
- ColorBrewer : identique au paquet de référence `colorbrewer` 1.7.0.
- viridis : recalculé depuis la table officielle « option D » de viridisLite (interpolation dans l'espace Lab, comme `viridisLite::viridis()`).
- ggplot2 n'a pas pu être installé dans l'environnement de travail : les fonctions `scale_fill_*()` n'ont pas été exécutées, seuls leurs noms et arguments documentés sont utilisés.

## Comportements de R confirmés (R 4.6.0)
- `t.test(y ~ g, paired = TRUE)` provoque l'erreur « cannot use 'paired' in formula method » : le site utilise `t.test(x, y, paired = TRUE)`.
- `wilcox.test()` calcule une p-value exacte même avec des ex aequo ou des différences nulles (pas d'avertissement). Les anciennes versions de R utilisaient une approximation : le site le précise. Version de R où ce changement a eu lieu : non vérifiée.
- `cor.test(method = "spearman")` avertit toujours en cas d'ex aequo.
- `confint()` sur un `glm` affiche « Waiting for profiling to be done... ».

## Points de méthode laissés au cours
- ANOVA à mesures répétées : la vérification de la sphéricité n'a pas d'outil simple en R de base.
- McNemar : le site reprend le seuil du cours, au moins 10 paires discordantes (règle usuelle).
- Calculateur 2 × 2 : IC de Se, Sp, VPP, VPN par l'approximation normale (Wald), bornés à [0 ; 1], avec un avertissement si n·p < 5 ou n·(1 − p) < 5 (choix validé). z = 1,96.

## Ressources externes
- webR : `https://webr.r-wasm.org/latest/webr.mjs` (documentation officielle). Méthodes utilisées : `new WebR({ interactive, baseUrl })`, `init()`, `new webR.Shelter()`, `captureR()`, `purge()`. `baseUrl` est passé explicitement (`https://webr.r-wasm.org/latest/`) : sans lui, l'archive officielle 0.6.0 cherche ses fichiers à côté de la page.
- Le CDN n'est pas joignable depuis l'environnement de travail : le module a été testé dans Chromium en servant l'archive officielle `webr-0.6.0.tar.gz` (GitHub) à l'adresse du CDN. À confirmer une fois en ligne.
- Liens vers l'aide officielle (search.r-project.org) : format vérifié par recherche sur t.test, qqnorm (`/R/refmans/stats/html/<page>.html`), car::leveneTest et survival::survfit (`/CRAN/refmans/<package>/html/<page>.html`). La page de survfit() s'appelle `survfit.formula` (champ `aide`). Pages survdiff et coxph non ouvertes : nom supposé identique à la fonction.
- `webr::install("car")` : fonction documentée par webR, non testée (dépôt de packages inaccessible).

## Codeur R (manip.json)
- Gabarits « R de base » : tous exécutés dans R 4.6.0 sur un petit tableau de test, avec les résultats attendus (y compris `reshape()` dans les deux sens et les 4 types de `merge()`).
- Gabarits tidyverse (dplyr, tidyr, readr) et readxl : non exécutés, ces packages n'étant pas téléchargeables depuis l'environnement de travail. Ils n'utilisent que des fonctions et arguments documentés de ces packages.
- `tidyr::drop_na()`, `tidyr::pivot_longer()`, `tidyr::pivot_wider()`, `readr::read_csv()` font partie du tidyverse mais pas de dplyr : la colonne s'intitule « tidyverse (dplyr, tidyr, readr) ».
