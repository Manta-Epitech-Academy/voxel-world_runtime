// Le panneau « Vérification » : l'étape en cours et la liste de ses défis,
// rien d'autre. Le texte de l'atelier, ses outils et ses indices sont
// affichés par la plateforme, à côté ; la page ne garde que ce qu'elle seule
// sait faire, vérifier le monde.
//
// La structure est connue de la plateforme (plateforme.js) : `.etape-nav`
// est caché quand un hôte choisit l'étape à la place du participant.

/** Un élément, avec une classe et un contenu HTML. */
export function el(balise, classe, html) {
  const e = document.createElement(balise);
  if (classe) e.className = classe;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

/**
 * Remplit `#verification` pour l'étape `numero` (à partir de 1) sur `total` :
 * une ligne d'en-tête avec deux flèches pour changer d'étape, et la liste
 * des défis (#defis), vide ici — voir afficherDefis.
 */
export function afficherVerification(etape, numero, total, { onChoisir }) {
  const panneau = document.getElementById("verification");
  panneau.replaceChildren();

  const entete = el("div", "entete-etape");
  const prec = el("button", "bouton discret etape-nav", "‹");
  prec.id = "etape-prec";
  prec.title = "Étape précédente";
  prec.disabled = numero <= 1;
  prec.addEventListener("click", () => onChoisir(numero - 2));
  const suiv = el("button", "bouton discret etape-nav", "›");
  suiv.id = "etape-suiv";
  suiv.title = "Étape suivante";
  suiv.disabled = numero >= total;
  suiv.addEventListener("click", () => onChoisir(numero));
  // Le titre seul : le sujet numérote ses étapes à sa façon (des étapes
  // intermédiaires sans défi), un numéro ici contredirait le sien.
  entete.append(prec, el("span", "titre-etape", etape.titre), suiv);
  panneau.append(entete);

  const defis = el("ul", "defis");
  defis.id = "defis";
  panneau.append(defis);
}

/**
 * La liste des défis de l'étape. `resultats` : ce que la dernière
 * génération a donné (null avant la première) ; `reussites` : les défis
 * déjà réussis, qui restent verts.
 */
export function afficherDefis(etape, resultats, reussites) {
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
}
