import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import MenuOverlay from "../components/MenuOverlay";
import { homeBagLink } from "../utils/homeNav";
import "./Materials.css";

const HDRI_PATH = new URL(
  "../map/hdri/table_mountain_1_puresky_2k.hdr",
  import.meta.url,
).href;

const BAG_MODEL_PATH = "/models/codebag.glb";
/** Même orientation que BagScene : face caméra (évite l’effet « de dos »). */
const BAG_FRONT_ROTATION_Y = Math.PI;

const MATERIALS = [
  {
    id: "oyster-filament",
    num: "01",
    name: "Recycled oyster shell",
    role: "3D-printed structure",
    description:
      "The outer shell is 3D-printed from a filament made of crushed oyster shells recovered from coastal waste. Naturally rigid and lightweight, it forms the bag’s structural frame without virgin plastic.",
    specs: [
      { label: "Source", value: "Oyster shells" },
      { label: "Process", value: "3D printing" },
      { label: "Weight", value: "Ultra-light" },
      { label: "End of life", value: "Circular" },
    ],
    accent: "#d4c4a0",
  },
  {
    id: "bioplastic-lining",
    num: "02",
    name: "Floral bioplastic",
    role: "Inner lining",
    description:
      "The inner bag is crafted from an eco-friendly bioplastic made of flowers and cauliflower — a soft, plant-based alternative to conventional synthetic liners.",
    specs: [
      { label: "Source", value: "Flowers & cauliflower" },
      { label: "Type", value: "Bioplastic" },
      { label: "Feel", value: "Soft, flexible" },
      { label: "Biodegradable", value: "Yes" },
    ],
    accent: "#3aaa60",
  },
  {
    id: "recycled-fabric",
    num: "03",
    name: "Recycled fabric trims",
    role: "Surface details",
    description:
      "Decorative details are made from upcycled fabric offcuts and bioplastic, applied to the surface for texture and character — each piece carries its own pattern.",
    specs: [
      { label: "Origin", value: "Textile waste" },
      { label: "Recycled", value: "100%" },
      { label: "Finish", value: "Hand-applied" },
      { label: "Care", value: "Spot clean" },
    ],
    accent: "#2a9adf",
  },
  {
    id: "coral-form",
    num: "04",
    name: "Coral-inspired design",
    role: "Organic form",
    description:
      "The bag’s silhouette echoes corals and other marine forms — porous structures, soft curves, and textures drawn from underwater life, shaped through digital craft.",
    specs: [
      { label: "Inspiration", value: "Marine corals" },
      { label: "Method", value: "Digital craft" },
      { label: "Texture", value: "Organic" },
      { label: "Uniqueness", value: "One of a kind" },
    ],
    accent: "#c4956a",
  },
];

function setGroupOpacity(group, opacity) {
  group.traverse((child) => {
    if ((child.isMesh || child.isLine) && child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        if (m && "opacity" in m) {
          m.transparent = opacity < 1;
          m.opacity = opacity;
        }
      }
    }
  });
}

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
    opacity: 1,
  });
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.62, 64, 64), mat));
  for (let i = 0; i < 12; i++) {
    const base = (i / 12) * Math.PI * 2;
    const pts = [];
    for (let t = 0; t <= 1; t += 0.04) {
      const a = base + t * Math.PI * 3.5;
      const r = 0.72 + t * 0.42;
      pts.push(
        new THREE.Vector3(
          Math.cos(a) * r * 0.4,
          (t - 0.5) * 2.3,
          Math.sin(a) * r * 0.4,
        ),
      );
    }
    const tube = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(pts),
      30,
      0.012,
      5,
    );
    const m = mat.clone();
    m.transparent = true;
    g.add(new THREE.Mesh(tube, m));
  }
  return g;
}

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
      opacity: 1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.y = angle;
    mesh.position.set(Math.sin(angle) * 0.14, 0, Math.cos(angle) * 0.14);
    g.add(mesh);
  }
  return g;
}

function buildNet() {
  const g = new THREE.Group();
  const R = 1.1;
  const ropeMat = new THREE.MeshStandardMaterial({
    color: 0x2070a0,
    metalness: 0.15,
    roughness: 0.6,
    transparent: true,
    opacity: 1,
  });
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
      new THREE.CatmullRomCurve3(pts, true),
      80,
      0.02,
      5,
    );
    g.add(new THREE.Mesh(tube, ropeMat.clone()));
  }
  for (let lon = 0; lon < 10; lon++) {
    const theta = (lon / 10) * Math.PI * 2;
    const pts = [];
    for (let t = 0; t <= 1; t += 0.04) {
      const phi = t * Math.PI;
      pts.push(
        new THREE.Vector3(
          R * Math.sin(phi) * Math.cos(theta),
          R * Math.cos(phi),
          R * Math.sin(phi) * Math.sin(theta),
        ),
      );
    }
    const tube = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(pts),
      30,
      0.02,
      5,
    );
    g.add(new THREE.Mesh(tube, ropeMat.clone()));
  }
  return g;
}

function buildTextile() {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(1.05, 96, 96);
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const nx = nrm.getX(i),
      ny = nrm.getY(i),
      nz = nrm.getZ(i);
    const u = Math.atan2(nz, nx) / (Math.PI * 2) + 0.5;
    const v = Math.acos(Math.max(-1, Math.min(1, ny))) / Math.PI;
    const weave = Math.sin(u * 36) * Math.cos(v * 18) * 0.048;
    pos.setXYZ(
      i,
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
    opacity: 1,
  });
  g.add(new THREE.Mesh(geo, mat));
  return g;
}

const BUILDERS = [buildOyster, buildAlgae, buildNet, buildTextile];

/** Viewer central : sac (aucune sélection) ou maquette matière + clic pour détail */
function MaterialsViewer({ focusMaterial, onOpenDetail }) {
  const mountRef = useRef(null);
  const focusRef = useRef(focusMaterial);
  const onOpenDetailRef = useRef(onOpenDetail);

  useEffect(() => {
    focusRef.current = focusMaterial;
  }, [focusMaterial]);
  useEffect(() => {
    onOpenDetailRef.current = onOpenDetail;
  }, [onOpenDetail]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      40,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 0.06, 3.65);

    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    new RGBELoader().load(HDRI_PATH, (tex) => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = pmrem.fromEquirectangular(tex).texture;
    });

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(3, 4, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xb8a0c8, 0.35);
    fill.position.set(-3, 2, 2);
    scene.add(fill);

    const spin = new THREE.Group();
    scene.add(spin);

    const bagWrapper = new THREE.Group();
    bagWrapper.visible = true;
    bagWrapper.rotation.y = BAG_FRONT_ROTATION_Y;
    bagWrapper.position.set(0, -0.07, 0);
    spin.add(bagWrapper);

    const materialRoots = BUILDERS.map((build) => {
      const g = build();
      g.visible = false;
      setGroupOpacity(g, 0);
      spin.add(g);
      return g;
    });

    new GLTFLoader().load(
      BAG_MODEL_PATH,
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const s = 1.42 / maxDim;
        model.scale.setScalar(s);
        model.position.set(
          -center.x * s,
          -center.y * s + (size.y * s) * 0.5,
          -center.z * s,
        );
        model.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = false;
            c.receiveShadow = false;
          }
        });
        bagWrapper.add(model);
      },
      undefined,
      () => console.warn("codebag.glb introuvable sur /materials"),
    );

    const matOpacities = [0, 0, 0, 0];
    let bagOpacity = 1;

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let pointerDown = false;
    let prevX = 0;
    let velY = 0;

    const DRAG_THRESH = 6;

    let lastCX = 0;
    let lastCY = 0;

    const onDown = (e) => {
      pointerDown = true;
      isDragging = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      prevX = e.clientX;
      velY = 0;
      lastCX = e.clientX;
      lastCY = e.clientY;
    };
    const onPointerMove = (e) => {
      lastCX = e.clientX;
      lastCY = e.clientY;
      const rect = renderer.domElement.getBoundingClientRect();

      if (pointerDown) {
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        if (!isDragging && (Math.abs(dx) > DRAG_THRESH || Math.abs(dy) > DRAG_THRESH)) {
          isDragging = true;
        }
        if (isDragging) {
          renderer.domElement.style.cursor = "grabbing";
          velY = (e.clientX - prevX) * 0.01;
          prevX = e.clientX;
        }
        return;
      }

      const fx = focusRef.current;
      if (fx !== null && materialRoots[fx]?.visible) {
        ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObject(materialRoots[fx], true);
        renderer.domElement.style.cursor =
          hits.length > 0 ? "pointer" : "grab";
      } else if (focusRef.current === null && bagWrapper.visible) {
        renderer.domElement.style.cursor = "grab";
      } else {
        renderer.domElement.style.cursor = "default";
      }
    };

    const onPointerLeave = () => {
      renderer.domElement.style.cursor = "";
      if (pointerDown) finishPointerUp(lastCX, lastCY);
    };

    const finishPointerUp = (clientX, clientY) => {
      if (!pointerDown) return;
      const wasDragging = isDragging;
      pointerDown = false;

      const rect = renderer.domElement.getBoundingClientRect();
      const fx = focusRef.current;

      if (!wasDragging && fx !== null && materialRoots[fx]) {
        ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObject(materialRoots[fx], true);
        if (hits.length > 0) {
          onOpenDetailRef.current?.(fx);
        }
      }
      isDragging = false;
    };

    const onUp = (e) => finishPointerUp(e.clientX, e.clientY);

    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (!isDragging) velY *= 0.92;

      const f = focusRef.current;
      const showBag = f === null;

      if (showBag) {
        bagOpacity += (1 - bagOpacity) * 0.09;
        bagWrapper.visible = bagOpacity > 0.01;
      } else {
        bagOpacity = 0;
        bagWrapper.visible = false;
      }

      if (bagWrapper.visible) {
        bagWrapper.traverse((child) => {
          if ((child.isMesh || child.isLine) && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            for (const m of mats) {
              if (m && "opacity" in m) {
                m.transparent = bagOpacity < 1;
                m.opacity = bagOpacity;
              }
            }
          }
        });
      }

      for (let i = 0; i < 4; i++) {
        const target = f === i ? 1 : 0;
        matOpacities[i] += (target - matOpacities[i]) * 0.1;
        setGroupOpacity(materialRoots[i], matOpacities[i]);
        materialRoots[i].visible = matOpacities[i] > 0.02;
      }

      const activeSpin =
        f === null ? velY * 0.85 + 0.0022 : velY + 0.003;
      spin.rotation.y += activeSpin;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      materialRoots.forEach((g) => {
        g.traverse((child) => {
          if (child.isMesh || child.isLine) {
            child.geometry?.dispose();
            const mats = Array.isArray(child.material)
              ? child.material
              : [child.material];
            mats.forEach((m) => m?.dispose?.());
          }
        });
      });
      bagWrapper.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose();
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m) => m?.dispose?.());
        }
      });
      pmrem.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="mat-viewer-canvas" />;
}

function MaterialDetailModal({ material, open, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => closeRef.current?.focus(), 50);
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !material) return null;

  return (
    <div
      className="mat-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="mat-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mat-modal-sheet-label mat-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{ "--accent": material.accent }}
      >
        <header className="mat-modal__head">
          <span className="mat-modal__sheet-label" id="mat-modal-sheet-label">
            Material sheet
          </span>
          <button
            ref={closeRef}
            type="button"
            className="mat-modal-close"
            aria-label="Close sheet"
            onClick={onClose}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path
                d="M4 4l8 8M12 4l-8 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>
        <div className="mat-modal__body">
          <span className="mat-modal-num" aria-describedby="mat-modal-sheet-label">
            {material.num}
          </span>
          <h2 id="mat-modal-title" className="mat-modal-title">
            {material.name}
          </h2>
          <p className="mat-modal-role">{material.role}</p>
          <p className="mat-modal-desc">{material.description}</p>
          <dl className="mat-modal-specs">
            {material.specs.map((s) => (
              <div key={s.label} className="mat-modal-spec">
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

export default function Materials() {
  /** null = vue sac (accueil viewer) ; 0..3 = uniquement la maquette matière — le sac est entièrement masqué */
  const [focusMaterial, setFocusMaterial] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailIndex, setDetailIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const menuOverlayRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const openDetail = useCallback((idx) => {
    setDetailIndex(idx);
    setDetailOpen(true);
  }, []);

  const closeDetail = useCallback(() => setDetailOpen(false), []);

  const leftOrbs = MATERIALS.slice(0, 2);
  const rightOrbs = MATERIALS.slice(2, 4);

  return (
    <div
      className="mat-page"
      style={{
        "--accent": focusMaterial != null ? MATERIALS[focusMaterial].accent : "#c9a0b8",
      }}
    >
      <header
        className={`top-nav top-nav--visible${menuOpen ? " top-nav--menu-open" : ""}`}
      >
        <Link
          to={homeBagLink.pathname}
          state={homeBagLink.state}
          className="brand-mark"
          aria-label="Hybrid home"
        >
          Hybrid
        </Link>
        <div className="nav-actions">
          <button
            type="button"
            className={`sound-button${soundMuted ? " sound-button--muted" : ""}`}
            aria-label={
              soundMuted ? "Unmute ambient sound" : "Mute ambient sound"
            }
            aria-pressed={soundMuted}
            onClick={() => setSoundMuted((muted) => !muted)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 14.5V9.5H8.1L12 6.2V17.8L8.1 14.5H5Z" />
              {!soundMuted && (
                <>
                  <path d="M15.2 9.2C16.3 10.1 16.9 11 16.9 12C16.9 13 16.3 13.9 15.2 14.8" />
                  <path d="M17.6 6.9C19.5 8.3 20.5 10 20.5 12C20.5 14 19.5 15.7 17.6 17.1" />
                </>
              )}
              {soundMuted && (
                <line
                  className="sound-button__mute-line"
                  x1="5"
                  y1="5"
                  x2="19"
                  y2="19"
                />
              )}
            </svg>
          </button>

          <button
            type="button"
            className={`menu-button ${menuOpen ? "menu-button--open" : ""}`}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => {
              if (menuOpen) menuOverlayRef.current?.requestClose?.();
              else setMenuOpen(true);
            }}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <main className="mat-main">
        <header className="mat-intro">
          <p className="mat-intro__eyebrow">Hybrid bag</p>
          <h1 className="mat-intro__title">What it&apos;s made of</h1>
          <p className="mat-lead">
            Hybrid was built from reclaimed matter and bio-based materials — 3D
            printing, floral bioplastic, recycled fabric, and forms inspired by
            marine life. Select a material to explore it in 3D, then click the
            shape for the full sheet.
          </p>
        </header>

        <section className="mat-stage" aria-label="Material selector">
          <div className="mat-orb-col mat-orb-col--left">
            {leftOrbs.map((m, i) => {
              const idx = i;
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`mat-orb ${focusMaterial === idx ? "is-active" : ""}`}
                  style={{ "--orb": m.accent }}
                  onClick={() =>
                    setFocusMaterial((prev) => (prev === idx ? null : idx))
                  }
                  aria-pressed={focusMaterial === idx}
                >
                  <span className="mat-orb__inner" />
                  <span className="mat-orb__label">{m.num}</span>
                  <span className="mat-orb__name">{m.name}</span>
                </button>
              );
            })}
          </div>

          <div className="mat-viewer-wrap">
            <div className="mat-viewer-glow" aria-hidden />
            <MaterialsViewer focusMaterial={focusMaterial} onOpenDetail={openDetail} />
            {focusMaterial != null && (
              <div className="mat-viewer-click-badge" role="status">
                <svg
                  className="mat-viewer-click-badge__icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M15 15l-2 5L9 9l11 4-5 2z" />
                  <path d="M9 9V6a3 3 0 016 0v3" opacity="0.55" />
                </svg>
                <span>Click the 3D shape for the full material sheet</span>
              </div>
            )}
            <p
              className={`mat-viewer-hint${focusMaterial != null ? " mat-viewer-hint--detail" : ""}`}
            >
              {focusMaterial == null
                ? "Drag to rotate the bag — or pick a material on the sides"
                : "Tip: cursor becomes a pointer on the shape — click without dragging to open"}
            </p>
            {focusMaterial != null && (
              <button
                type="button"
                className="mat-reset-bag"
                onClick={() => setFocusMaterial(null)}
              >
                Back to bag view
              </button>
            )}
          </div>

          <div className="mat-orb-col mat-orb-col--right">
            {rightOrbs.map((m, i) => {
              const idx = i + 2;
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`mat-orb ${focusMaterial === idx ? "is-active" : ""}`}
                  style={{ "--orb": m.accent }}
                  onClick={() =>
                    setFocusMaterial((prev) => (prev === idx ? null : idx))
                  }
                  aria-pressed={focusMaterial === idx}
                >
                  <span className="mat-orb__inner" />
                  <span className="mat-orb__label">{m.num}</span>
                  <span className="mat-orb__name">{m.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mat-showcase" aria-label="Material details">
          <header className="mat-section-head">
            <p className="mat-section-eyebrow">Up close</p>
            <h2 className="mat-section-title">Each material, in detail</h2>
          </header>

          <div className="mat-showcase__grid">
            {MATERIALS.map((m, i) => (
              <article
                key={m.id}
                className={`mat-showcase__card${i % 2 === 1 ? " mat-showcase__card--flip" : ""}`}
                style={{ "--accent": m.accent }}
              >
                <figure className="mat-showcase__media">
                  <img
                    src={`/materials/${m.id}.jpg`}
                    alt={`${m.name} — ${m.role}`}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <span className="mat-showcase__media-tag">{m.num}</span>
                </figure>
                <div className="mat-showcase__text">
                  <p className="mat-showcase__role">{m.role}</p>
                  <h3 className="mat-showcase__name">{m.name}</h3>
                  <p className="mat-showcase__desc">{m.description}</p>
                  <button
                    type="button"
                    className="mat-showcase__cta"
                    onClick={() => openDetail(i)}
                  >
                    Open material sheet
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M3 8h10M8 3l5 5-5 5"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mat-process" aria-label="Behind the scenes">
          <header className="mat-section-head">
            <p className="mat-section-eyebrow">Behind the scenes</p>
            <h2 className="mat-section-title">From matter to bag</h2>
            <p className="mat-section-lead">
              From sourcing reclaimed shells to printing the outer shell, every
              step of Hybrid was designed to keep waste, water and energy to a
              minimum.
            </p>
          </header>

          <div className="mat-process__grid">
            {[
              { num: "01", title: "Sourcing", caption: "Reclaimed oyster shells and floral waste collected from local producers." },
              { num: "02", title: "3D printing", caption: "The structural shell is printed layer by layer, no virgin plastic involved." },
              { num: "03", title: "Hand-finishing", caption: "Bioplastic lining, recycled trims and coral-like details applied by hand." },
            ].map((step) => (
              <article key={step.num} className="mat-process__card">
                <figure className="mat-process__media">
                  <img
                    src={`/materials/process-${step.num}.jpg`}
                    alt={step.title}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </figure>
                <div className="mat-process__text">
                  <p className="mat-process__num">{step.num}</p>
                  <h3 className="mat-process__title">{step.title}</h3>
                  <p className="mat-process__caption">{step.caption}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mat-final" aria-label="The final piece">
          <div className="mat-final__inner">
            <div className="mat-final__media">
              <img
                src="/materials/bag-final.jpg"
                alt="The finished Hybrid bag"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
            <div className="mat-final__text">
              <p className="mat-section-eyebrow">The result</p>
              <h2 className="mat-section-title">A bag that carries its story</h2>
              <p className="mat-section-lead">
                Every Hybrid bag is one of a kind — its texture, its trims, its
                tones change with the matter it&apos;s made of. Built to be used,
                designed to come back to the earth.
              </p>
            </div>
          </div>
        </section>

        <footer className="mat-footer">
          <Link
            to={homeBagLink.pathname}
            state={homeBagLink.state}
            className="mat-footer-link"
          >
            Back to home
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M3 8h10M8 3l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </footer>
      </main>

      <MaterialDetailModal
        material={MATERIALS[detailIndex]}
        open={detailOpen}
        onClose={closeDetail}
      />

      {menuOpen && (
        <MenuOverlay
          ref={menuOverlayRef}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}
