import {
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Link } from "react-router-dom";

const EXIT_MS = 420;

/* Accents glow — palette proche du ciel sac (mauve A78699, rose pâle, lavande) */
const ITEMS = [
  {
    num: "01", label: "Materials", sub: "Les matières du sac",
    to: "/materials", color: "#c9a0b8",
  },
  {
    num: "02", label: "Contact", sub: "Nous écrire",
    to: "#contact", color: "#b8a8dc",
  },
  {
    num: "03", label: "Process", sub: "How it's made",
    to: "/process", color: "#dba8c4",
  },
  {
    num: "04", label: "À Propos", sub: "Notre mission",
    to: "#about", color: "#a894cc",
  },
  {
    num: "05", label: "FAQ", sub: "Questions fréquentes",
    to: "#faq", color: "#9b8ac4",
  },
  {
    num: "06", label: "Mentions\nlégales", sub: "Confidentialité",
    to: "#legal", color: "#8f7eb0",
  },
];

const MenuOverlay = forwardRef(function MenuOverlay({ onClose }, ref) {
  const [exiting, setExiting] = useState(false);

  const beginClose = useCallback(() => {
    setExiting((v) => (v ? v : true));
  }, []);

  useImperativeHandle(ref, () => ({ requestClose: beginClose }), [beginClose]);

  useEffect(() => {
    if (!exiting) return;
    const id = window.setTimeout(() => onClose(), EXIT_MS);
    return () => clearTimeout(id);
  }, [exiting, onClose]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") beginClose();
    };
    window.addEventListener("keydown", onKey);

    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [beginClose]);

  return (
    <div
      className={`mo-overlay${exiting ? " mo-overlay--exiting" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Menu principal"
    >
      <div className="mo-backdrop" onClick={beginClose} />

      <div className="mo-panel">
        {/* Grid 3×2 */}
        <div className="mo-grid">
          {ITEMS.map((item, i) => (
            <Link
              key={item.num}
              to={item.to}
              className="mo-card"
              style={{ "--c": item.color, animationDelay: `${0.04 + i * 0.055}s` }}
              onClick={beginClose}
            >
              <span className="mo-card-num">{item.num}</span>
              <div className="mo-card-body">
                <span className="mo-card-label">
                  {item.label.split("\n").map((l, j) => <span key={j}>{l}</span>)}
                </span>
                <span className="mo-card-sub">{item.sub}</span>
              </div>
              {/* Glow orb */}
              <div className="mo-card-glow" />
            </Link>
          ))}
        </div>

        {/* Footer */}
        <p className="mo-footer">© 2025 Hybrid — Bruxelles</p>
      </div>
    </div>
  );
});

MenuOverlay.displayName = "MenuOverlay";

export default MenuOverlay;
