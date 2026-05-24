import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  pauseDreamyAudio,
  pauseWaterAudio,
  playDreamyAudio,
  playWaterAudio,
  preloadAmbientAudio,
} from "../utils/ambientAudio";

const AmbientSoundContext = createContext(null);

const VOLUME = 0.45;
const WATER_VOLUME = 0.28;

export function AmbientSoundProvider({ children }) {
  const [muted, setMuted] = useState(false);
  const unlockedRef = useRef(false);
  const mutedRef = useRef(false);
  const waterActiveRef = useRef(false);

  const applyDreamy = useCallback(() => {
    if (mutedRef.current || !unlockedRef.current) {
      pauseDreamyAudio();
      return;
    }

    playDreamyAudio(VOLUME);
  }, []);

  const applyWater = useCallback(() => {
    if (mutedRef.current || !unlockedRef.current || !waterActiveRef.current) {
      pauseWaterAudio();
      return;
    }

    playWaterAudio(WATER_VOLUME);
  }, []);

  const applyAll = useCallback(() => {
    applyDreamy();
    applyWater();
  }, [applyDreamy, applyWater]);

  const unlock = useCallback(() => {
    unlockedRef.current = true;
    applyAll();
  }, [applyAll]);

  const setWaterActive = useCallback(
    (active) => {
      waterActiveRef.current = active;
      applyWater();
    },
    [applyWater],
  );

  const toggleMuted = useCallback(() => {
    unlockedRef.current = true;
    mutedRef.current = !mutedRef.current;
    const nextMuted = mutedRef.current;
    setMuted(nextMuted);

    if (nextMuted) {
      pauseDreamyAudio();
      pauseWaterAudio();
      return;
    }

    applyAll();
  }, [applyAll]);

  useEffect(() => {
    preloadAmbientAudio();
    unlockedRef.current = true;
    applyAll();
  }, [applyAll]);

  useEffect(() => {
    const onInteract = (event) => {
      if (event.target.closest(".sound-button")) return;
      if (mutedRef.current) return;
      unlock();
    };

    window.addEventListener("pointerdown", onInteract);
    window.addEventListener("keydown", onInteract);
    window.addEventListener("wheel", onInteract, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
      window.removeEventListener("wheel", onInteract);
    };
  }, [unlock]);

  return (
    <AmbientSoundContext.Provider
      value={{ muted, toggleMuted, unlock, setWaterActive }}
    >
      {children}
    </AmbientSoundContext.Provider>
  );
}

export function useAmbientSound() {
  const context = useContext(AmbientSoundContext);
  if (!context) {
    throw new Error("useAmbientSound must be used within AmbientSoundProvider");
  }
  return context;
}
