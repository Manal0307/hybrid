import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

export const BOTTLE_SCROLL_VH = 4;

const DRACO_DECODER_PATH = "https://www.gstatic.com/draco/v1/decoders/";

/** Compense la conversion Blender → glTF (lumens / candela mal interprétés
 *  par three.js). Sans ça, l'éclairage Blender est ~50× trop sombre dans le
 *  navigateur. Ajuste si trop clair / trop sombre. */
const LIGHT_INTENSITY_BOOST = 50;

/**
 * Ciel équirectangulaire mauve/rose doux : sert à la fois de fond visible et
 * de carte d'environnement pour les reflets PBR. Palette accordée à la
 * `BagScene` (mauve nuit + horizon rose chaud) pour un raccord visuel fluide.
 */
function createBottleSkyTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  const g = ctx.createLinearGradient(0, 0, 0, 1024);
  // Dôme mauve doux → halo rose chaud à l'horizon → mauve plus profond en bas
  g.addColorStop(0.0, "#3a2c3a");
  g.addColorStop(0.18, "#4e3c4c");
  g.addColorStop(0.32, "#6a5260");
  g.addColorStop(0.42, "#967078");
  g.addColorStop(0.48, "#caa098");
  g.addColorStop(0.5, "#eac4c0");
  g.addColorStop(0.52, "#d8a8a8");
  g.addColorStop(0.6, "#a8848c");
  g.addColorStop(0.75, "#6e5660");
  g.addColorStop(0.9, "#48343e");
  g.addColorStop(1.0, "#2e2230");

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2048, 1024);

  // Léger halo central à l'horizon pour adoucir la transition
  const halo = ctx.createRadialGradient(1024, 512, 50, 1024, 512, 700);
  halo.addColorStop(0.0, "rgba(255, 232, 224, 0.18)");
  halo.addColorStop(0.5, "rgba(255, 220, 210, 0.06)");
  halo.addColorStop(1.0, "rgba(255, 210, 200, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 2048, 1024);

  // ─── Étoiles dans le dôme mauve ─────────────────────────────────────────
  // PRNG déterministe → mêmes étoiles à chaque chargement (pas de scintillement).
  let seed = 73127;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return seed / 4294967296;
  };

  // On évite la bande horizon claire (y ∈ ~[420, 600]) pour préserver le halo rose.
  // Densité plus forte vers le zénith (haut du dôme), plus rare vers la bande basse.
  const sampleStarY = () => {
    const r = rnd();
    if (r < 0.78) return rnd() * 380; // dôme mauve principal
    return 620 + rnd() * 380; // sous l'horizon (au cas où la caméra plonge)
  };

  // Étoiles principales : disques doux + halo subtil pour les plus grosses.
  for (let i = 0; i < 460; i++) {
    const x = rnd() * 2048;
    const y = sampleStarY();
    const r = rnd() * 1.4 + 0.28;
    // Atténue les étoiles trop proches de la bande horizon pour un fondu naturel.
    const horizonFade =
      y < 420 ? Math.min(1, (420 - y) / 80) : Math.min(1, (y - 620) / 80);
    const alpha = (0.22 + rnd() * 0.55) * horizonFade;
    ctx.fillStyle = `rgba(255, 248, 246, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Étoiles plus grosses (rares) avec un halo doux.
    if (r > 1.3 && horizonFade > 0.6) {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3.5);
      glow.addColorStop(0, `rgba(255, 240, 235, ${0.22 * horizonFade})`);
      glow.addColorStop(1, "rgba(255, 240, 235, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, r * 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Points très fins : densité « poussière d'étoiles » (1px), uniquement haut du dôme.
  for (let i = 0; i < 320; i++) {
    const x = rnd() * 2048;
    const y = rnd() * 360;
    ctx.fillStyle = `rgba(250, 240, 245, ${0.1 + rnd() * 0.3})`;
    ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

/* ════════════════════════════════════════════════════════════════════════════
   CAMÉRA MANUELLE (saisis tes valeurs Blender ici)
   ────────────────────────────────────────────────────────────────────────────
   Dans Blender, sélectionne Camera.001 → panneau N → onglet "Item" pour la
   Location et Rotation, puis onglet "Object Data Properties" (icône caméra
   verte dans Properties) → Lens pour le Focal Length / Field of View.
   ════════════════════════════════════════════════════════════════════════════ */
const BLENDER_CAMERA = {
  // Position de la caméra dans Blender (axes Blender : Z = haut)
  location: { x: -0.23127, y: -1.3755, z: 0.43646 },

  // Rotation Euler XYZ en degrés (panneau N → Rotation)
  rotation: { x: 101.6, y: -0.000064, z: 2 },

  // Field of View vertical en degrés.
  //   Calculé depuis : Focal Length 22mm, Sensor Size 34mm (Auto fit, render 16:9)
  //   → sensor_v = 34 × 9/16 = 19.125mm
  //   → FOV_v = 2 × atan(19.125 / (2 × 22)) ≈ 47°
  fov: 47,

  // Distances de clipping (Camera Properties → Lens → Clip Start / End)
  near: 0.2,
  far: 1000,
};

export default function BottleScene({ onReady }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // Exposition alignée sur la BagScene → continuité de luminosité au scroll.
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    let ready = false;

    const scene = new THREE.Scene();

    // ─── Ambiance mauve (raccord visuel avec la BagScene) ─────────────────
    // Le ciel sert à la fois de background et d'environment map : les reflets
    // PBR (bouteille, fruits) prennent une teinte chaude/mauve cohérente.
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const skyTex = createBottleSkyTexture();
    scene.background = skyTex;
    scene.environment = pmrem.fromEquirectangular(skyTex).texture;
    scene.environmentIntensity = 0.48;

    // Brume mauve très subtile → profondeur sans masquer les objets proches.
    scene.fog = new THREE.FogExp2(0x4a3848, 0.045);

    // Couches d'éclairage douces par-dessus les lampes Blender :
    //   - HemisphereLight : chaud rosé en haut, mauve frais en bas
    //   - AmbientLight : lift global discret pour ne pas écraser les contrastes
    scene.add(new THREE.HemisphereLight(0xf2d8d0, 0x6a4e6a, 0.22));
    scene.add(new THREE.AmbientLight(0x8a708a, 0.08));

    // Caméra de secours uniquement le temps du chargement.
    const fallbackCamera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );
    let activeCamera = fallbackCamera;

    const camInitialPos = new THREE.Vector3();
    let travelAmount = 0;
    /** Distance à parcourir au scroll, en % de la distance initiale de la
     *  caméra à l'origine. Positif = la caméra avance vers la scène. Mets
     *  une valeur négative pour reculer, 0 pour ne pas bouger. */
    const SCROLL_FORWARD_RATIO = 1.25;
    /** Plus la valeur est basse, plus le mouvement suit le scroll en douceur
     *  (plus « fluide », un peu plus de latence). Entre 2 et 8 en général. */
    const SCROLL_SMOOTH_LAMBDA = 5.5;
    /** Courbe d'easing appliquée à la progression du scroll. easeOutCubic :
     *  réactif au début (la caméra bouge dès les premiers pixels de scroll),
     *  puis ralentit en arrivant à destination. */
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    // Liste des fruits/légumes animés au scroll (lévitation + bobbing).
    let fruitNodes = [];

    Promise.all([
      gltfLoader.loadAsync("/models/bottle.glb"),
      gltfLoader.loadAsync("/models/fruits.glb"),
    ])
      .then(([bottleGltf, fruitsGltf]) => {
        scene.add(bottleGltf.scene);
        scene.add(fruitsGltf.scene);

        // Vire les caméras embarquées dans les GLB pour ne garder que la
        // caméra manuelle ci-dessous.
        scene.traverse((o) => {
          if (o.isPerspectiveCamera) o.removeFromParent();
        });

        scene.updateMatrixWorld(true);

        // ─── Préparation lévitation des fruits ─────────────────────────────
        // Choisit les « fruits » comme enfants directs du root du GLB ; si le
        // fichier les enveloppe dans un seul Empty, on descend d'un niveau.
        let fruitContainer = fruitsGltf.scene;
        if (
          fruitContainer.children.length === 1 &&
          !fruitContainer.children[0].isMesh
        ) {
          fruitContainer = fruitContainer.children[0];
        }
        fruitContainer.children.forEach((node, i) => {
          // Phases / amplitudes déterministes (mêmes valeurs à chaque rendu).
          const phase = (i * 1.91) % (Math.PI * 2);
          const bobAmp = 0.010 + ((i * 7) % 5) * 0.0035;   // ~0.010 → 0.024
          const liftAmp = 0.05 + ((i * 13) % 7) * 0.012;   // ~0.05 → 0.12
          const bobSpeed = 0.85 + ((i * 5) % 4) * 0.18;    // ~0.85 → 1.4
          fruitNodes.push({
            node,
            basePos: node.position.clone(),
            phase,
            bobAmp,
            liftAmp,
            bobSpeed,
          });
        });

        // ─── Boost de pigmentation des fruits/légumes ──────────────────────
        // Sature légèrement les couleurs et baisse l'influence de l'environment
        // map mauve : les fruits redeviennent francs sans casser l'ambiance.
        const _hsl = { h: 0, s: 0, l: 0 };
        fruitsGltf.scene.traverse((c) => {
          if (!c.isMesh) return;
          const mats = Array.isArray(c.material) ? c.material : [c.material];
          for (const m of mats) {
            if (!m || !m.color) continue;
            m.color.getHSL(_hsl);
            // Saturation +35% (avec un petit plancher pour les couleurs très ternes).
            _hsl.s = Math.min(1, _hsl.s * 1.35 + 0.05);
            // Luminosité légèrement abaissée → couleurs plus denses, pas délavées.
            _hsl.l = Math.max(0, _hsl.l * 0.94);
            m.color.setHSL(_hsl.h, _hsl.s, _hsl.l);
            // Réduit l'effet « teint mauve » imposé par l'environment.
            if (m.envMapIntensity !== undefined) {
              m.envMapIntensity = Math.min(m.envMapIntensity ?? 1, 0.6);
            }
            m.needsUpdate = true;
          }
        });

        // ─── Caméra manuelle reconstruite depuis les chiffres Blender ────
        const manualCam = new THREE.PerspectiveCamera(
          BLENDER_CAMERA.fov,
          container.clientWidth / container.clientHeight,
          BLENDER_CAMERA.near,
          BLENDER_CAMERA.far,
        );

        // Conversion d'axes Blender (Z up) → three.js (Y up, +Y Up glTF export) :
        //   three.x =  blender.x
        //   three.y =  blender.z
        //   three.z = -blender.y
        manualCam.position.set(
          BLENDER_CAMERA.location.x,
          BLENDER_CAMERA.location.z,
          -BLENDER_CAMERA.location.y,
        );

        // Rotation : on construit dans l'espace Blender puis on bascule.
        const blenderEuler = new THREE.Euler(
          THREE.MathUtils.degToRad(BLENDER_CAMERA.rotation.x),
          THREE.MathUtils.degToRad(BLENDER_CAMERA.rotation.y),
          THREE.MathUtils.degToRad(BLENDER_CAMERA.rotation.z),
          "XYZ",
        );
        const qBlender = new THREE.Quaternion().setFromEuler(blenderEuler);
        // Compensation : Blender caméra regarde -Z local, three.js -Z local
        // aussi, mais Blender place -Z monde où three.js a -Y monde après +Y Up.
        // Rotation supplémentaire de -90° autour de X pour convertir Z-up → Y-up.
        const qAxisSwap = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          -Math.PI / 2,
        );
        manualCam.quaternion.copy(qAxisSwap).multiply(qBlender);

        manualCam.updateMatrixWorld(true);
        activeCamera = manualCam;
        scene.add(activeCamera);

        camInitialPos.copy(activeCamera.position);
        travelAmount = camInitialPos.length() * SCROLL_FORWARD_RATIO;

        scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
          if (child.isLight) {
            child.intensity *= LIGHT_INTENSITY_BOOST;
            if (child.shadow) {
              child.castShadow = true;
              child.shadow.mapSize.set(2048, 2048);
              child.shadow.bias = -0.0005;
            }
          }
        });

        renderer.render(scene, activeCamera);
        ready = true;
        onReady?.();
      })
      .catch((err) => {
        console.error("BottleScene load error:", err);
        onReady?.();
      });

    let animId;
    const clock = new THREE.Clock();
    let smoothScrollProgress = 0;
    const forwardVec = new THREE.Vector3();
    function animate() {
      animId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const yVh = window.scrollY / window.innerHeight;
      renderer.domElement.style.display =
        yVh < BOTTLE_SCROLL_VH ? "block" : "none";
      if (!ready) {
        renderer.clear();
        return;
      }

      const rawProgress = Math.min(1, Math.max(0, yVh / BOTTLE_SCROLL_VH));
      const targetProgress = easeOutCubic(rawProgress);
      smoothScrollProgress = THREE.MathUtils.damp(
        smoothScrollProgress,
        targetProgress,
        SCROLL_SMOOTH_LAMBDA,
        dt,
      );
      smoothScrollProgress = THREE.MathUtils.clamp(smoothScrollProgress, 0, 1);

      if (yVh >= BOTTLE_SCROLL_VH) return;

      // Avance de la caméra au scroll (effet du site). Axe local -Z = devant
      // la caméra dans three.js. Le progress est lissé pour éviter les à-coups.
      if (camInitialPos.lengthSq() > 0) {
        forwardVec.set(0, 0, -1).applyQuaternion(activeCamera.quaternion);
        activeCamera.position
          .copy(camInitialPos)
          .addScaledVector(forwardVec, smoothScrollProgress * travelAmount);
      }

      // ─── Lévitation des fruits ────────────────────────────────────────────
      // Chaque fruit monte progressivement avec le scroll (`liftAmp`) et
      // ondule légèrement en continu (`bobAmp` * sin) pour suggérer la flottaison.
      if (fruitNodes.length > 0) {
        const elapsed = performance.now() * 0.001;
        for (const f of fruitNodes) {
          const lift = smoothScrollProgress * f.liftAmp;
          const bob = Math.sin(elapsed * f.bobSpeed + f.phase) * f.bobAmp;
          f.node.position.y = f.basePos.y + lift + bob;
        }
      }

      renderer.render(scene, activeCamera);
    }
    animate();

    function onResize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      activeCamera.aspect = w / h;
      activeCamera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      dracoLoader.dispose();
      pmrem.dispose();
      scene.background = null;
      if (scene.environment) scene.environment.dispose();
      skyTex.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement))
        container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} className="scene-container" />;
}
