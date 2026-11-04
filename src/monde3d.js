// La vue 3D : la scène three.js, la grille et le cadre du monde, les trois
// flèches des axes, et les chunks du monde une fois généré.
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  EdgesGeometry,
  Fog,
  GridHelper,
  Group,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  NearestMipmapLinearFilter,
  PerspectiveCamera,
  Scene,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { BLOCS, TAILLE, HAUTEUR } from "./blocs.js";
import { dessinerAtlas } from "./textures.js";
import { maillerChunk, TAILLE_CHUNK } from "./maillage.js";
import { Vol } from "./deplacement.js";

const CIEL = 0x9fd3ff;
const COULEUR_GRILLE = 0x335577;
const COULEUR_CADRE = 0x5b7ea6;

/** Une lettre flottante, pour nommer un axe. */
function etiquette(texte, couleur) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.font = "bold 48px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 8;
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.strokeText(texte, 32, 34);
  ctx.fillStyle = couleur;
  ctx.fillText(texte, 32, 34);
  const sprite = new Sprite(new SpriteMaterial({ map: new CanvasTexture(canvas), depthTest: false }));
  sprite.scale.set(5, 5, 1);
  sprite.renderOrder = 10;
  return sprite;
}

/** Les trois flèches x (rouge), y (vert), z (bleu), depuis le coin (0, 0, 0). */
function reperes() {
  const groupe = new Group();
  const longueur = 20;
  const axes = [
    ["x", 0xff5555, [longueur, 0, 0]],
    ["y", 0x55dd55, [0, longueur, 0]],
    ["z", 0x5599ff, [0, 0, longueur]],
  ];
  for (const [nom, couleur, bout] of axes) {
    const geometrie = new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), new Vector3(...bout)]);
    const ligne = new Line(geometrie, new LineBasicMaterial({ color: couleur, depthTest: false }));
    ligne.renderOrder = 10;
    groupe.add(ligne);
    const lettre = etiquette(nom, "#" + couleur.toString(16).padStart(6, "0"));
    lettre.position.set(bout[0] * 1.15, bout[1] * 1.15, bout[2] * 1.15);
    groupe.add(lettre);
  }
  return groupe;
}

export class Monde3D {
  constructor(conteneur) {
    this.conteneur = conteneur;
    // preserveDrawingBuffer : une capture d'écran du canvas (export de scène,
    // tests) lit ce qui est affiché au lieu d'un cadre noir.
    this.renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    conteneur.appendChild(this.renderer.domElement);

    this.scene = new Scene();
    this.scene.background = new Color(CIEL);
    this.scene.fog = new Fog(CIEL, 90, 260);
    this.camera = new PerspectiveCamera(70, 1, 0.1, 600);
    this.vol = new Vol(this.camera, this.renderer.domElement);

    const { canvas, uv } = dessinerAtlas();
    const atlas = new CanvasTexture(canvas);
    atlas.magFilter = NearestFilter;
    atlas.minFilter = NearestMipmapLinearFilter;
    atlas.generateMipmaps = true;
    atlas.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    atlas.colorSpace = SRGBColorSpace;
    this.uvParBloc = BLOCS.map((b) => (b.faces ? b.faces.map((nom) => uv[nom]) : null));
    this.matSolide = new MeshBasicMaterial({ map: atlas, vertexColors: true });
    this.matEau = new MeshBasicMaterial({
      map: atlas,
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      side: DoubleSide,
    });

    const grille = new GridHelper(TAILLE, TAILLE / 8, COULEUR_GRILLE, COULEUR_CADRE);
    grille.position.set(TAILLE / 2, 0.01, TAILLE / 2);
    grille.material.transparent = true;
    grille.material.opacity = 0.5;
    this.scene.add(grille);

    const cadre = new LineSegments(
      new EdgesGeometry(new BoxGeometry(TAILLE, HAUTEUR, TAILLE)),
      new LineBasicMaterial({ color: COULEUR_GRILLE, transparent: true, opacity: 0.25 }),
    );
    cadre.position.set(TAILLE / 2, HAUTEUR / 2, TAILLE / 2);
    this.scene.add(cadre);
    this.scene.add(reperes());

    this.chunks = new Group();
    this.scene.add(this.chunks);
    this.recentrer();

    new ResizeObserver(() => this.redimensionner()).observe(conteneur);
    this.redimensionner();

    let precedent = performance.now();
    const boucle = (maintenant) => {
      // Après un onglet en arrière-plan, pas plus d'un dixième de seconde d'un coup.
      const dt = Math.min(0.1, (maintenant - precedent) / 1000);
      precedent = maintenant;
      this.vol.mettreAJour(dt);
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(boucle);
    };
    requestAnimationFrame(boucle);
  }

  redimensionner() {
    const { clientWidth, clientHeight } = this.conteneur;
    if (!clientWidth || !clientHeight) return;
    this.renderer.setSize(clientWidth, clientHeight);
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
  }

  /** La vue de départ : au-dessus du coin (0, 0), vers le centre du monde. */
  recentrer() {
    const depuis = [-45, 78, -45];
    const vers = [TAILLE / 2, 8, TAILLE / 2];
    const dx = vers[0] - depuis[0];
    const dz = vers[2] - depuis[2];
    const lacet = Math.atan2(-dx, -dz);
    const tangage = -Math.atan2(depuis[1] - vers[1], Math.hypot(dx, dz));
    this.vol.placer(depuis[0], depuis[1], depuis[2], lacet, tangage);
  }

  /** Remplace le monde affiché. Renvoie le nombre de triangles dessinés. */
  afficherMonde(monde) {
    this.vol.changerMonde(monde);
    for (const chunk of this.chunks.children) chunk.geometry.dispose();
    this.chunks.clear();
    let triangles = 0;
    const n = TAILLE / TAILLE_CHUNK;
    for (let cz = 0; cz < n; cz++)
      for (let cx = 0; cx < n; cx++) {
        const { solide, eau } = maillerChunk(monde, this.uvParBloc, cx, cz);
        for (const [tableaux, materiau] of [
          [solide, this.matSolide],
          [eau, this.matEau],
        ]) {
          if (!tableaux) continue;
          const geometrie = new BufferGeometry();
          geometrie.setAttribute("position", new BufferAttribute(tableaux.positions, 3));
          geometrie.setAttribute("uv", new BufferAttribute(tableaux.uvs, 2));
          geometrie.setAttribute("color", new BufferAttribute(tableaux.couleurs, 3));
          geometrie.setIndex(new BufferAttribute(tableaux.indices, 1));
          const mesh = new Mesh(geometrie, materiau);
          // L'eau après les solides, pour que la transparence les montre.
          if (materiau === this.matEau) mesh.renderOrder = 1;
          this.chunks.add(mesh);
          triangles += tableaux.indices.length / 3;
        }
      }
    return triangles;
  }
}
