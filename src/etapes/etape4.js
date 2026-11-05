// Étape 4 : les collines, avec math.sin. Des hauteurs variées, mais pas de marche de plus de 2.
import {
  B,
  TAILLE,
  HAUTEUR,
  index,
  blocEn,
  nomDuBloc,
  ok,
  rate,
  compter,
  premierBloc,
  hauteurs,
  plusGrandeMarche,
  verifierCouches,
} from "../verifications.js";

export default {
  titre: "Les collines",
  duree: "25 min",
  lore: `
    <p>Ton monde est aussi plat qu'une table de billard. Il est temps de le <strong>froisser</strong>.</p>
    <p>Pour ça, chaque colonne doit avoir <em>sa propre</em> hauteur.</p>`,
  outils: [
    {
      titre: "Écrire sa propre fonction",
      texte: `<p>Tu peux ranger du code sous un nom, puis le réutiliser. <code>x</code>, <code>z</code>
        et <code>h</code> sont les <strong>paramètres</strong> : des variables qui reçoivent les valeurs
        données à l'appel.</p>`,
      code: `function colonne(x, z, h)
  set_block(x, 0, z, BEDROCK)
  -- ... les couches, avec h au lieu de SOL
  set_block(x, h, z, HERBE)
end

colonne(10, 10, 20)
colonne(11, 10, 25)`,
    },
    {
      titre: "math.sin, la vague",
      texte: `<p><code>math.sin(t)</code> monte et descend entre -1 et 1, comme une vague.</p>
        <p>Le <code>5</code> règle la <strong>hauteur</strong> de la vague, le <code>/ 8</code> sa
        <strong>largeur</strong>.</p>`,
      code: `for x = 0, TAILLE - 1 do
  local h = 20 + math.floor(5 * math.sin(x / 8))
  set_block(x, h, 0, HERBE)
end`,
    },
    {
      titre: "math.floor, arrondir vers le bas",
      texte:
        "<p>Les blocs sont à des hauteurs entières : <code>math.floor(4.7)</code> vaut <code>4</code>.</p>",
      code: "print(math.floor(4.7), math.floor(20 + 3 * math.sin(1)))",
    },
    {
      titre: "Deux vagues qui se croisent",
      texte:
        "<p>Une vague le long de x <strong>plus</strong> une vague le long de z : des collines dans les deux directions.</p>",
      code: "local h = 20 + math.floor(4 * math.sin(x / 8) + 4 * math.sin(z / 11))",
    },
  ],
  pieges: [
    "<code>math.sin(x)</code> tout seul ondule beaucoup trop vite : une vague tous les 6 blocs. Divise x pour élargir.",
    "Une fonction doit être écrite <strong>avant</strong> la ligne qui l'appelle.",
    "Avec une vague trop haute, <code>h</code> peut dépasser 63 (le ciel) ou descendre sous 5 (plus de place pour les couches).",
  ],
  objectif:
    "Fais onduler ton terrain avec <code>math.sin</code> : au moins <strong>8 hauteurs différentes</strong>, et jamais une marche de plus de <strong>2 blocs</strong> entre deux colonnes voisines. Les couches de l'étape 3 restent obligatoires.",
  indices: [
    "Transforme le contenu de tes boucles en une fonction <code>colonne(x, z, h)</code>, où <code>SOL</code> devient <code>h</code>.",
    "Dans la double boucle, calcule <code>h</code> pour chaque colonne, puis appelle <code>colonne(x, z, h)</code>.",
    "Si la vérification parle d'une marche trop haute, <strong>divise</strong> x et z par un plus grand nombre.",
  ],
  bonus: "Multiplie les deux vagues au lieu de les additionner. Que se passe-t-il ?",

  defis: [
    {
      nom: "Des collines douces avec les bonnes couches",
      verifier(monde) {
        const couches = verifierCouches(monde);
        if (!couches.ok) return couches;
        const sommets = hauteurs(monde);
        const differentes = new Set(sommets).size;
        if (differentes === 1) {
          return rate(
            "Toutes les colonnes ont la même hauteur : le terrain est encore plat. Calcule h pour chaque colonne.",
          );
        }
        if (differentes < 8)
          return rate(`Seulement ${differentes} hauteurs différentes. Augmente la hauteur de tes vagues.`);
        const { max, ou } = plusGrandeMarche(sommets);
        if (max > 2) {
          return rate(
            `Entre (${ou[0]}, ${ou[1]}) et (${ou[2]}, ${ou[3]}), le terrain fait une marche de ${max} blocs. Tes collines sont trop raides : divise x et z par de plus grands nombres.`,
          );
        }
        return ok(`${differentes} hauteurs différentes, et le terrain monte en douceur.`);
      },
    },
  ],
};
