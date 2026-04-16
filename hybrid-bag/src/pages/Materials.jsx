import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import "./Materials.css";

const HDRI_PATH = new URL("../map/hdri/table_mountain_1_puresky_2k.hdr", import.meta.url).href;

/* ══════════════════════════════════════════════════════════════════
   Matières du sac
══════════════════════════════════════════════════════════════════ */
const MATERIALS = [
  {
    id: "oyster-filament",
    num: "01",
    name: "Filament d'Huître",
    role: "Structure du sac",
    description:
      "Les coquilles d'huîtres récupérées sont broyées puis extrudées en filaments calcaires ultra-résistants. Naturellement rigides, ils forment l'ossature structurelle du sac sans recourir à aucun polymère synthétique.",
    specs: [
      { label: "Provenance", value: "Bretagne, FR" },
      { label: "Résistance", value: "+340%" },
      { label: "Poids", value: "Très léger" },
      { label: "Fin de vie", value: "Compostable" },
    ],
    accent: "#d4c4a0",
  },
  {
    id: "algae-bio",
    num: "02",
    name: "Biomaterial Algue",
    role: "Corps du sac",
    description:
      "Extrait d'algues brunes cultivées sans pesticides en bassins fermés, ce biomatériau souple remplace le cuir traditionnel. Sa texture naturelle évolue légèrement avec le temps — comme un être vivant.",
    specs: [
      { label: "Source", value: "Algue brune" },
      { label: "Eau utilisée", value: "−92%" },
      { label: "Texture", value: "Cuir végétal" },
      { label: "Biodégradable", value: "Oui" },
    ],
    accent: "#3aaa60",
  },
  {
    id: "recycled-net",
    num: "03",
    name: "Filet Recyclé",
    role: "Décoration extérieure",
    description:
      "Filets de pêche récupérés dans les océans, nettoyés et retissés à la main dans notre atelier. Chaque filet est unique. Appliqué en surface, il crée un motif organique irréproductible.",
    specs: [
      { label: "Origine", value: "Plastique marin" },
      { label: "Recyclage", value: "100%" },
      { label: "Pattern", value: "Unique" },
      { label: "Lavable", value: "Oui" },
    ],
    accent: "#2a9adf",
  },
  {
    id: "recycled-textile",
    num: "04",
    name: "Textile Recyclé",
    role: "Pochette intérieure",
    description:
      "Les poches intérieures sont doublées d'un textile doux issu de bouteilles PET recyclées. Résistant à l'abrasion, facile d'entretien, il protège vos affaires tout en fermant la boucle du plastique.",
    specs: [
      { label: "Source", value: "Bouteilles PET" },
      { label: "Douceur", value: "Grade A" },
      { label: "Entretien", value: "Machine 30°" },
      { label: "Durée de vie", value: "20 ans" },
    ],
    accent: "#c4956a",
  },
];

const STATS = [
  { value: 100, suffix: "%", label: "Bio-sourcé" },
  { value: 0,   suffix: "",  label: "Plastique vierge" },
  { value: 3,   suffix: "",  label: "Continents" },
  { value: 84,  suffix: "%", label: "CO₂ évité" },
];

const PROCESS_STEPS = [
  {
    num: "01", title: "Source",
    body: "Raw bio-materials are harvested from regenerative farms and ocean clean-up initiatives across three continents.",
  },
  {
    num: "02", title: "Transform",
    body: "Through proprietary low-energy processes, raw matter becomes high-grade textile, composite, and leather alternatives.",
  },
  {
    num: "03", title: "Craft",
    body: "Each bag is assembled by hand in our Brussels atelier, where traditional craftsmanship meets programmable design.",
  },
];

/* ══════════════════════════════════════════════════════════════════
   Three.js — builders (un groupe par matière)
══════════════════════════════════════════════════════════════════ */

/** Applique l'opacité à tous les meshes/lignes d'un groupe. */
function setGroupOpacity(group, opacity) {
  group.traverse((child) => {
    if ((child.isMesh || child.isLine) && child.material) {
      child.material.opacity = opacity;
    }
  });
}

/** 01 — Filament d'Huître : perle irisée + filaments hélicoïdaux */
function buildOyster() {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xf0e0cc,
    metalness: 0.02,
    roughness: 0.08,
    iridescence: 1.0,
    iridescenceIOR: 1.5,
    iridescenceThicknessRange: [100, 400],
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    transparent: true,
  });

  // Perle centrale
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.62, 64, 64), mat));

  // Filaments hélicoïdaux
  for (let i = 0; i < 12; i++) {
    const base = (i / 12) * Math.PI * 2;
    const pts = [];
    for (let t = 0; t <= 1; t += 0.04) {
      const a = base + t * Math.PI * 3.5;
      const r = 0.72 + t * 0.42;
      pts.push(new THREE.Vector3(
        Math.cos(a) * r * 0.4,
        (t - 0.5) * 2.3,
        Math.sin(a) * r * 0.4,
      ));
    }
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.012, 5);
    g.add(new THREE.Mesh(tube, mat.clone()));
  }
  return g;
}

/** 02 — Biomaterial Algue : frondes de kelp ondulantes */
function buildAlgae() {
  const g = new THREE.Group();

  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    const geo = new THREE.PlaneGeometry(0.3, 2.4, 4, 36);
    const pos = geo.attributes.position;
    for (let j = 0; j < pos.count; j++) {
      const y = pos.getY(j);
      const wobble = Math.sin(y * 2.8 + i * 1.1) * (0.08 + (y + 1.2) * 0.07);
      pos.setX(j, pos.getX(j) + wobble);
      pos.setZ(j, Math.sin(y * 1.8 + i * 0.9) * 0.06);
    }
    geo.computeVertexNormals();

    const l = i / 7;
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x156628).lerp(new THREE.Color(0x3db860), l),
      metalness: 0,
      roughness: 0.55,
      transmission: 0.2,
      thickness: 0.4,
      side: THREE.DoubleSide,
      transparent: true,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.y = angle;
    mesh.position.set(Math.sin(angle) * 0.14, 0, Math.cos(angle) * 0.14);
    g.add(mesh);
  }
  return g;
}

/** 03 — Filet Recyclé : sphère de cordages tressés */
function buildNet() {
  const g = new THREE.Group();
  const R = 1.1;

  const ropeMat = new THREE.MeshStandardMaterial({
    color: 0x2070a0,
    metalness: 0.15,
    roughness: 0.6,
    transparent: true,
  });

  // Cercles de latitude
  for (let lat = 1; lat < 8; lat++) {
    const phi = (lat / 8) * Math.PI;
    const y = R * Math.cos(phi);
    const r = R * Math.sin(phi);
    const pts = [];
    for (let t = 0; t <= 1; t += 0.025) {
      const a = t * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    pts.push(pts[0].clone());
    const tube = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(pts, true), 80, 0.02, 5,
    );
    g.add(new THREE.Mesh(tube, ropeMat.clone()));
  }

  // Arcs de longitude
  for (let lon = 0; lon < 10; lon++) {
    const theta = (lon / 10) * Math.PI * 2;
    const pts = [];
    for (let t = 0; t <= 1; t += 0.04) {
      const phi = t * Math.PI;
      pts.push(new THREE.Vector3(
        R * Math.sin(phi) * Math.cos(theta),
        R * Math.cos(phi),
        R * Math.sin(phi) * Math.sin(theta),
      ));
    }
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.02, 5);
    g.add(new THREE.Mesh(tube, ropeMat.clone()));
  }
  return g;
}

/** 04 — Textile Recyclé : sphère avec motif de tissage en relief */
function buildTextile() {
  const g = new THREE.Group();

  const geo = new THREE.SphereGeometry(1.05, 96, 96);
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;

  for (let i = 0; i < pos.count; i++) {
    const nx = nrm.getX(i), ny = nrm.getY(i), nz = nrm.getZ(i);
    // Coordonnées sphériques → motif tissé
    const u = Math.atan2(nz, nx) / (Math.PI * 2) + 0.5;
    const v = Math.acos(Math.max(-1, Math.min(1, ny))) / Math.PI;
    const weave = Math.sin(u * 36) * Math.cos(v * 18) * 0.048;
    pos.setXYZ(i,
      pos.getX(i) + nx * weave,
      pos.getY(i) + ny * weave,
      pos.getZ(i) + nz * weave,
    );
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x8a5c38,
    metalness: 0.05,
    roughness: 0.9,
    transparent: true,
  });

  g.add(new THREE.Mesh(geo, mat));
  return g;
}

const BUILDERS = [buildOyster, buildAlgae, buildNet, buildTextile];

/* ══════════════════════════════════════════════════════════════════
   InteractiveScene — renderer Three.js persistent
══════════════════════════════════════════════════════════════════ */
function InteractiveScene({ activeIdx }) {
  const mountRef = useRef(null);
  const activeIdxRef = useRef(activeIdx);

  useEffect(() => { activeIdxRef.current = activeIdx; }, [activeIdx]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 4);

    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    new RGBELoader().load(HDRI_PATH, (tex) => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = pmrem.fromEquirectangular(tex).texture;
    });

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(3, 4, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x88aaff, 0.3);
    fill.position.set(-3, 2, 2);
    scene.add(fill);

    // Construire les 4 groupes
    const groups = BUILDERS.map((build) => build());
    const opacities = [1, 0, 0, 0];
    groups.forEach((g, i) => {
      setGroupOpacity(g, i === 0 ? 1 : 0);
      g.visible = i === 0;
      scene.add(g);
    });

    // Drag pour rotation
    let velY = 0, isDragging = false, prevX = 0;
    const onDown = (e) => { isDragging = true; prevX = e.clientX; velY = 0; };
    const onMove = (e) => { if (!isDragging) return; velY = (e.clientX - prevX) * 0.009; prevX = e.clientX; };
    const onUp = () => { isDragging = false; };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointerleave", onUp);

    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const ai = activeIdxRef.current;

      if (!isDragging) velY *= 0.92;

      groups.forEach((g, i) => {
        const target = i === ai ? 1 : 0;
        opacities[i] += (target - opacities[i]) * 0.07;
        setGroupOpacity(g, opacities[i]);
        g.visible = opacities[i] > 0.005;
        if (i === ai && g.visible) {
          g.rotation.y += isDragging ? velY : velY + 0.004;
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointerleave", onUp);
      groups.forEach((g) => {
        g.traverse((child) => {
          if (child.isMesh || child.isLine) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
            else child.material.dispose();
          }
        });
      });
      pmrem.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []); // eslint-disable-line

  return <div ref={mountRef} className="mat-scene-canvas" />;
}

/* ══════════════════════════════════════════════════════════════════
   Animated counter
══════════════════════════════════════════════════════════════════ */
function Counter({ value, suffix }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min((now - start) / 1600, 1);
          setDisplay(Math.round((1 - Math.pow(1 - t, 3)) * value));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);

  return <span ref={ref} className="mat-stat-value">{display}{suffix}</span>;
}

/* ── Scroll reveal ─────────────────────────────────────────────── */
function useReveal() {
  const els = useRef([]);
  const register = useCallback((el) => {
    if (el && !els.current.includes(el)) els.current.push(el);
  }, []);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );
    els.current.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
  return register;
}

/* ══════════════════════════════════════════════════════════════════
   Page
══════════════════════════════════════════════════════════════════ */
export default function Materials() {
  const [activeIdx, setActiveIdx] = useState(0);
  const reveal = useReveal();
  const active = MATERIALS[activeIdx];

  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="mat-page" style={{ "--accent": active.accent }}>

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <header className="mat-nav">
        <Link to="/" className="mat-nav-back">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Hybrid
        </Link>
        <span className="mat-nav-title">Materials</span>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="mat-hero">
        <span className="mat-eyebrow">Hybrid Programmable Bag</span>
        <h1 className="mat-hero-title">Materials</h1>
        <p className="mat-hero-sub">
          Quatre matières. Une seule conviction :<br />
          la nature fait mieux que le pétrole.
        </p>
      </section>

      {/* ── Scene interactive ───────────────────────────────────── */}
      <section className="mat-scene">

        {/* Sélecteur gauche */}
        <div className="mat-selector">
          {MATERIALS.map((m, i) => (
            <button
              key={m.id}
              className={`mat-sel-item ${activeIdx === i ? "active" : ""}`}
              style={{ "--accent": m.accent }}
              onClick={() => setActiveIdx(i)}
            >
              <span className="mat-sel-num">{m.num}</span>
              <div className="mat-sel-text">
                <span className="mat-sel-name">{m.name}</span>
                <span className="mat-sel-role">{m.role}</span>
              </div>
              <div className="mat-sel-bar" />
            </button>
          ))}
        </div>

        {/* Droite : canvas + info */}
        <div className="mat-scene-right">
          <div className="mat-scene-canvas-wrap">
            <InteractiveScene activeIdx={activeIdx} />
            <p className="mat-viewer-hint">Drag to rotate</p>
          </div>

          <div className="mat-scene-info" key={active.id}>
            <div className="mat-scene-info-top">
              <span className="mat-tag" style={{ color: active.accent }}>{active.role}</span>
              <h2 className="mat-scene-name">{active.name}</h2>
              <p className="mat-scene-desc">{active.description}</p>
            </div>
            <dl className="mat-specs">
              {active.specs.map((s) => (
                <div key={s.label} className="mat-spec">
                  <dt>{s.label}</dt>
                  <dd style={{ color: active.accent }}>{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────── */}
      <section className="mat-stats">
        {STATS.map((s) => (
          <div key={s.label} className="mat-stat reveal" ref={reveal}>
            <Counter value={s.value} suffix={s.suffix} />
            <span className="mat-stat-label">{s.label}</span>
          </div>
        ))}
      </section>

      {/* ── Process ─────────────────────────────────────────────── */}
      <section className="mat-process">
        <div className="mat-process-header reveal" ref={reveal}>
          <span className="mat-eyebrow">Comment c&apos;est fait</span>
          <h2>The Process</h2>
        </div>
        <div className="mat-process-steps">
          {PROCESS_STEPS.map((step) => (
            <div key={step.num} className="mat-step reveal" ref={reveal}>
              <span className="mat-step-num">{step.num}</span>
              <h3 className="mat-step-title">{step.title}</h3>
              <p className="mat-step-body">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Video ───────────────────────────────────────────────── */}
      <section className="mat-video-section">
        <div className="mat-video-header reveal" ref={reveal}>
          <span className="mat-eyebrow">Derrière les coulisses</span>
          <h2>The Making Of</h2>
        </div>
        <div className="mat-video-wrap">
          <iframe
            src="https://www.youtube.com/embed/nusOkCRcjlw?rel=0&modestbranding=1"
            title="Hybrid materials video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </section>

      {/* ── Return ──────────────────────────────────────────────── */}
      <section className="mat-return">
        <div className="reveal" ref={reveal}>
          <h2>Retourner à<br /><em>l&apos;essentiel.</em></h2>
          <Link to="/" className="mat-return-link">
            <span>Voir le sac</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M8 3l5 5-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </section>

    </div>
  );
}
