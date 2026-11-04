// Se déplacer dans le monde : le vol (libre), et la marche (gravité, saut,
// nage), avec le verrouillage du pointeur pour regarder à la souris.
//
// Les touches sont lues par leur `code` physique : KeyW est la touche sous
// le Z d'un clavier AZERTY et le W d'un QWERTY, donc ZQSD et WASD marchent
// tous les deux sans rien configurer.
import { TAILLE, HAUTEUR, B, index } from "./blocs.js";

// ---- la marche : un corps dans le monde -------------------------------

const DEMI_LARGEUR = 0.3;
const TAILLE_CORPS = 1.8;
/** La hauteur des yeux, au-dessus des pieds. */
export const HAUTEUR_YEUX = 1.62;
const VITESSE_MARCHE = 4.3;
const VITESSE_COURSE = 5.6;
const GRAVITE = 32;
const SAUT = 9;
const CHUTE_MAX = 60;
const NAGE = 3.5;
const EPSILON = 1e-4;

/** Le corps du marcheur : une boîte debout, qui tombe, saute et nage. */
export class Corps {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.vy = 0;
    this.auSol = false;
    this.dansEau = false;
    this.monde = null;
  }

  bloc(x, y, z) {
    if (!this.monde || x < 0 || x >= TAILLE || z < 0 || z >= TAILLE || y < 0 || y >= HAUTEUR) return B.AIR;
    return this.monde[index(x, y, z)];
  }

  solide(x, y, z) {
    const b = this.bloc(x, y, z);
    return b !== B.AIR && b !== B.EAU;
  }

  /** La boîte du corps, pieds en (x, y, z), touche-t-elle un bloc solide ? */
  touche(x, y, z) {
    for (let by = Math.floor(y); by <= Math.floor(y + TAILLE_CORPS - EPSILON); by++)
      for (let bz = Math.floor(z - DEMI_LARGEUR); bz <= Math.floor(z + DEMI_LARGEUR - EPSILON); bz++)
        for (let bx = Math.floor(x - DEMI_LARGEUR); bx <= Math.floor(x + DEMI_LARGEUR - EPSILON); bx++)
          if (this.solide(bx, by, bz)) return true;
    return false;
  }

  /** Remonte le corps au-dessus des blocs où il serait enfermé. */
  degager() {
    while (this.y < HAUTEUR + 2 && this.touche(this.x, this.y, this.z)) this.y = Math.floor(this.y) + 1;
  }

  /**
   * Avance d'une distance le long d'un axe, par petits pas, et s'arrête au
   * premier bloc. Renvoie true si quelque chose a bloqué le mouvement.
   */
  glisser(axe, distance) {
    const pas = Math.ceil(Math.abs(distance) / 0.2);
    const delta = distance / (pas || 1);
    for (let i = 0; i < pas; i++) {
      const avant = this[axe];
      this[axe] += delta;
      if (this.touche(this.x, this.y, this.z)) {
        if (axe === "y") {
          // Posé sur le bloc, ou la tête juste sous le plafond.
          this.y =
            delta < 0 ? Math.floor(this.y) + 1 : Math.floor(this.y + TAILLE_CORPS) - TAILLE_CORPS - EPSILON;
          if (this.touche(this.x, this.y, this.z)) this.y = avant;
        } else {
          this[axe] = avant;
        }
        return true;
      }
    }
    return false;
  }

  /** Un pas de simulation de `dt` secondes. `dx`, `dz` : la direction voulue au sol. */
  avancer(dt, { dx, dz, sauter, courir }) {
    const piedsDansEau =
      this.bloc(Math.floor(this.x), Math.floor(this.y + 0.1), Math.floor(this.z)) === B.EAU;
    const corpsDansEau =
      this.bloc(Math.floor(this.x), Math.floor(this.y + 0.9), Math.floor(this.z)) === B.EAU;
    this.dansEau = piedsDansEau || corpsDansEau;
    let vitesse = courir ? VITESSE_COURSE : VITESSE_MARCHE;
    if (this.dansEau) vitesse *= 0.6;
    this.glisser("x", dx * vitesse * dt);
    this.glisser("z", dz * vitesse * dt);
    if (this.dansEau) {
      this.vy = sauter ? NAGE : Math.max(this.vy - GRAVITE * 0.15 * dt, -2);
    } else {
      if (sauter && this.auSol) this.vy = SAUT;
      this.vy = Math.max(this.vy - GRAVITE * dt, -CHUTE_MAX);
    }
    const bloque = this.glisser("y", this.vy * dt);
    this.auSol = bloque && this.vy < 0;
    if (bloque) this.vy = 0;
  }
}

// ---- le vol, et la caméra -----------------------------------------------

const VITESSE_VOL = 36;
const BOOST = 3;
const SENSIBILITE = 0.0022;
/** Deux appuis sur Espace à moins de 300 ms : on change de mode. */
const DOUBLE_ESPACE_MS = 300;

/**
 * Pilote la caméra au clavier et à la souris, en vol ou en marche.
 * `onChangement(actif)` : le pointeur vient d'être pris ou rendu ;
 * `onMode(mode)` : on passe en "vol" ou en "marche".
 */
export class Vol {
  constructor(camera, element) {
    this.camera = camera;
    this.element = element;
    this.camera.rotation.order = "YXZ";
    this.lacet = 0;
    this.tangage = 0;
    this.touches = new Set();
    this.actif = false;
    this.mode = "vol";
    this.corps = new Corps();
    this.dernierEspace = 0;
    this.onChangement = null;
    this.onMode = null;

    element.addEventListener("click", () => {
      if (!this.actif && element.requestPointerLock) element.requestPointerLock();
    });
    document.addEventListener("pointerlockchange", () => {
      this.actif = document.pointerLockElement === element;
      if (!this.actif) this.touches.clear();
      this.onChangement?.(this.actif);
    });
    document.addEventListener("mousemove", (ev) => {
      if (!this.actif) return;
      this.lacet -= ev.movementX * SENSIBILITE;
      this.tangage -= ev.movementY * SENSIBILITE;
      this.tangage = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.tangage));
    });
    document.addEventListener("keydown", (ev) => {
      if (!this.actif) return;
      if (ev.code === "Space" || ev.code.startsWith("Arrow")) ev.preventDefault();
      if (ev.repeat) return;
      this.touches.add(ev.code);
      if (ev.code === "KeyF") this.basculer();
      if (ev.code === "Space") {
        const maintenant = performance.now();
        if (maintenant - this.dernierEspace < DOUBLE_ESPACE_MS) {
          this.basculer();
          this.dernierEspace = 0;
        } else {
          this.dernierEspace = maintenant;
        }
      }
    });
    document.addEventListener("keyup", (ev) => this.touches.delete(ev.code));
    window.addEventListener("blur", () => this.touches.clear());
  }

  /** Place la caméra (et repasse en vol si l'on marchait). */
  placer(x, y, z, lacet, tangage) {
    this.camera.position.set(x, y, z);
    this.lacet = lacet;
    this.tangage = tangage;
    if (this.mode === "marche") this.choisirMode("vol");
  }

  changerMonde(monde) {
    this.corps.monde = monde;
    if (this.mode === "marche") this.corps.degager();
  }

  basculer() {
    this.choisirMode(this.mode === "vol" ? "marche" : "vol");
  }

  choisirMode(mode) {
    this.mode = mode;
    if (mode === "marche") {
      const p = this.camera.position;
      Object.assign(this.corps, { x: p.x, y: p.y - HAUTEUR_YEUX, z: p.z, vy: 0 });
      if (!this.auDessusDuMonde()) this.reapparaitre();
      this.corps.degager();
    }
    this.onMode?.(mode);
  }

  auDessusDuMonde() {
    const { x, z } = this.corps;
    return x >= 0 && x < TAILLE && z >= 0 && z < TAILLE;
  }

  /** Tombé hors du monde : on repart du ciel, au centre. */
  reapparaitre() {
    Object.assign(this.corps, { x: TAILLE / 2 + 0.5, y: HAUTEUR, z: TAILLE / 2 + 0.5, vy: 0 });
    this.tangage = -0.15;
  }

  /** Un pas de `dt` secondes : lit les touches et déplace la caméra. */
  mettreAJour(dt) {
    const t = this.touches;
    const avant = (t.has("KeyW") || t.has("ArrowUp") ? 1 : 0) - (t.has("KeyS") || t.has("ArrowDown") ? 1 : 0);
    const cote =
      (t.has("KeyD") || t.has("ArrowRight") ? 1 : 0) - (t.has("KeyA") || t.has("ArrowLeft") ? 1 : 0);
    const courir = t.has("KeyR");
    const sin = Math.sin(this.lacet);
    const cos = Math.cos(this.lacet);
    // La direction au sol, dans le repère du monde ; pas plus vite en diagonale.
    let dx = -sin * avant + cos * cote;
    let dz = -cos * avant - sin * cote;
    const norme = Math.hypot(dx, dz);
    if (norme > 1) [dx, dz] = [dx / norme, dz / norme];
    const position = this.camera.position;

    if (this.mode === "vol") {
      const vertical = (t.has("Space") ? 1 : 0) - (t.has("ShiftLeft") || t.has("ShiftRight") ? 1 : 0);
      const vitesse = VITESSE_VOL * (courir ? BOOST : 1) * dt;
      // Avancer et reculer suivent le viseur : en regardant vers le bas, on
      // descend. Le pas de côté reste à plat, Espace et Maj restent verticaux.
      const cosT = Math.cos(this.tangage);
      let vx = -sin * cosT * avant + cos * cote;
      let vy = Math.sin(this.tangage) * avant;
      let vz = -cos * cosT * avant - sin * cote;
      const n = Math.hypot(vx, vy, vz);
      if (n > 1) {
        vx /= n;
        vy /= n;
        vz /= n;
      }
      position.x += vx * vitesse;
      position.z += vz * vitesse;
      position.y += (vy + vertical) * vitesse;
    } else {
      const corps = this.corps;
      // La physique avance par pas de 20 ms au plus, pour ne traverser aucun bloc.
      for (let reste = dt; reste > 0; reste -= 0.02) {
        corps.avancer(Math.min(reste, 0.02), { dx, dz, sauter: t.has("Space"), courir });
      }
      if (corps.y < -30) this.reapparaitre();
      position.set(corps.x, corps.y + HAUTEUR_YEUX, corps.z);
    }
    this.camera.rotation.set(this.tangage, this.lacet, 0);
  }
}
