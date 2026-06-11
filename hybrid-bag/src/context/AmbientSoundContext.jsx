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
  primeAmbientAudio,
  unmutePrimedAmbient,
} from "../utils/ambientAudio";

const AmbientSoundContext = createContext(null);

const VOLUME = 0.45;
const WATER_VOLUME = 0.28;

export function AmbientSoundProvider({ children }) {
  const [muted, setMuted] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const unlockedRef = useRef(false);
  const mutedRef = useRef(false);
  const waterActiveRef = useRef(false);
  const homeReadyRef = useRef(false);
  const dreamyPrimedRef = useRef(false);

  const applyDreamy = useCallback(() => {
    if (mutedRef.current || !unlockedRef.current) return;
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

  const attemptAutoStart = useCallback(() => {
    if (mutedRef.current) return;

    if (
      dreamyPrimedRef.current &&
      unmutePrimedAmbient(VOLUME, WATER_VOLUME, waterActiveRef.current)
    ) {
      unlockedRef.current = true;
      setUnlocked(true);
      return;
    }

    if (!unlockedRef.current) {
      unlockedRef.current = true;
      setUnlocked(true);
    }
    applyAll();
  }, [applyAll]);

  const notifyHomeLoadReady = useCallback(() => {
    homeReadyRef.current = true;
    attemptAutoStart();
  }, [attemptAutoStart]);

  const unlock = useCallback(() => {
    if (unlockedRef.current) {
      applyAll();
      return;
    }

    unlockedRef.current = true;
    setUnlocked(true);
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
    setUnlocked(true);
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
    void primeAmbientAudio().then((dreamyStarted) => {
      dreamyPrimedRef.current = dreamyStarted;
      if (homeReadyRef.current) attemptAutoStart();
    });
  }, [attemptAutoStart]);

  useEffect(() => {
    const onInteract = () => {
      unlock();
    };

    const capture = { capture: true, passive: true };
    const once = { capture: true, passive: true, once: true };

    window.addEventListener("pointerdown", onInteract, capture);
    window.addEventListener("touchstart", onInteract, capture);
    window.addEventListener("keydown", onInteract, capture);
    window.addEventListener("wheel", onInteract, once);
    window.addEventListener("scroll", onInteract, once);

    return () => {
      window.removeEventListener("pointerdown", onInteract, capture);
      window.removeEventListener("touchstart", onInteract, capture);
      window.removeEventListener("keydown", onInteract, capture);
      window.removeEventListener("wheel", onInteract, once);
      window.removeEventListener("scroll", onInteract, once);
    };
  }, [unlock]);

  return (
    <AmbientSoundContext.Provider
      value={{
        muted,
        unlocked,
        toggleMuted,
        unlock,
        notifyHomeLoadReady,
        setWaterActive,
      }}
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
