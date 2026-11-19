// Choisir › Pièges d'interprétation (pieges.json) : idée fausse, puis ce qu'il faut retenir.
import { esc, titre, ico, blocCode } from '../../js/app.js';
import { fichier } from './onglet.js';

export async function afficher(vue, [ancre]) {
  const { pieges } = await fichier('pieges.json');
  vue.innerHTML = titre('Pièges d\'interprétation', 'Les erreurs les plus fréquentes en lisant un test, et la bonne façon de dire les choses.') +
    `<div class="cols two">${pieges.map(p => `<section id="${p.id}" aria-labelledby="h-${p.id}"><p class="gh" id="h-${p.id}">${esc(p.titre)}</p><div class="grp">
      <div class="row top"><span class="pas" style="--pc:var(--c-pink)">${ico('x')}</span><div class="t"><small>Idée fausse</small><p>${esc(p.faux)}</p></div></div>
      <div class="row top"><span class="pas" style="--pc:var(--c-green)">${ico('check')}</span><div class="t"><small>Ce qu'il faut retenir</small><p>${esc(p.juste)}</p>
        ${p.exemple ? `<small>${esc(p.exemple)}</small>` : ''}${p.code ? blocCode(p.code, '', true, true) : ''}</div></div></div></section>`).join('')}</div>`;
  if (ancre) document.getElementById(ancre)?.scrollIntoView();
}
