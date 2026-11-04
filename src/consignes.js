// Le panneau des consignes : le texte de l'étape (lore, boîte à outils,
// pièges, objectif, défis, indices, bonus), et l'aide-mémoire des fonctions.
//
// La structure est connue de la plateforme d'atelier (plateforme.js) : en
// mode plateforme elle ne garde que `.entete-etape`, `.objectif` et `#defis`,
// le reste du texte étant affiché par la plateforme elle-même.
import { FONCTIONS } from "./api.js";
import { colorer } from "./editeur.js";

/** Un élément, avec une classe et un contenu HTML. */
export function el(balise, classe, html) {
  const e = document.createElement(balise);
  if (classe) e.className = classe;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

/** Un exemple de code, coloré, avec un bouton qui l'insère dans l'éditeur. */
function extrait(code, editeur) {
  const bloc = el("div", "extrait");
  const pre = el("pre");
  pre.textContent = code;
  colorer(code).then((html) => {
    pre.innerHTML = html;
  });
  bloc.append(pre);
  if (editeur) {
    const bouton = el("button", "copier", "⤵ Dans l'éditeur");
    bouton.title = "Insère cet exemple à l'endroit du curseur";
    bouton.addEventListener("click", () => editeur.inserer(code));
    bloc.append(bouton);
  }
  return bloc;
}

/**
 * Remplit `#consignes` avec l'étape `numero` (à partir de 1) sur `total`.
 * `onSuivant(numero)` : le bouton vers l'étape suivante, s'il y en a une.
 * La liste des défis (#defis) est créée vide : voir afficherDefis.
 */
export function afficherConsignes(etape, numero, total, { editeur, titreSuivant, onSuivant }) {
  const panneau = document.getElementById("consignes");
  panneau.replaceChildren();

  const entete = el("div", "entete-etape");
  entete.append(
    el("div", "surtitre", `Étape ${numero} sur ${total} · ${etape.duree}`),
    el("h1", null, etape.titre),
  );
  panneau.append(entete);
  panneau.append(el("h2", null, "Lore"), el("div", "lore", etape.lore));

  panneau.append(el("h2", null, "Boîte à outils"));
  etape.outils.forEach((outil, i) => {
    const carte = el("div", "callout outil");
    carte.append(el("h4", null, `🛠️ Outil #${i + 1} : ${outil.titre}`), el("div", null, outil.texte));
    if (outil.code) carte.append(extrait(outil.code, editeur));
    panneau.append(carte);
  });
  for (const piege of etape.pieges) panneau.append(el("div", "callout piege", `⚠️ ${piege}`));

  panneau.append(el("h2", null, "🥸 Mise en application"));
  panneau.append(el("p", "objectif", etape.objectif));
  const defis = el("ul", "defis");
  defis.id = "defis";
  panneau.append(defis);

  etape.indices.forEach((indice, i) => {
    const details = el("details", "indice");
    details.append(el("summary", null, `Indice ${i + 1}`), el("div", null, indice));
    panneau.append(details);
  });
  if (etape.bonus) {
    panneau.append(el("div", "callout bonus", `⭐ <strong>Pour aller plus loin</strong> : ${etape.bonus}`));
  }

  const aide = el("details", "aide-memoire");
  aide.append(el("summary", null, "📖 Aide-mémoire des fonctions"));
  const liste = el("dl");
  for (const f of FONCTIONS)
    liste.append(el("dt", null, `<code>${f.signature}</code>`), el("dd", null, f.doc));
  aide.append(liste);
  panneau.append(aide);

  if (numero < total) {
    const suivant = el("button", "bouton suivant", `Étape ${numero + 1} : ${titreSuivant} →`);
    suivant.id = "suivant";
    suivant.addEventListener("click", () => onSuivant(numero));
    panneau.append(suivant);
  }
}

/**
 * La liste des défis de l'étape. `resultats` : ce que la dernière
 * génération a donné (null avant la première) ; `reussites` : les défis
 * déjà réussis, qui restent verts. `tousReussis` allume le bouton suivant.
 */
export function afficherDefis(etape, resultats, reussites, tousReussis) {
  const liste = document.getElementById("defis");
  if (!liste) return;
  liste.replaceChildren(
    ...etape.defis.map((defi, i) => {
      const resultat = resultats?.[i];
      const reussi = resultat ? resultat.ok : reussites[i];
      const li = el("li", reussi ? "reussi" : resultat ? "rate" : "attente");
      li.append(el("span", "icone", reussi ? "✅" : resultat ? "❌" : "⬜"), el("strong", null, defi.nom));
      if (resultat) li.append(el("div", "message", resultat.message));
      else if (!reussi) li.append(el("div", "message", "Clique sur ▶ Générer pour vérifier."));
      return li;
    }),
  );
  const suivant = document.getElementById("suivant");
  if (suivant) suivant.classList.toggle("pret", tousReussis);
}
