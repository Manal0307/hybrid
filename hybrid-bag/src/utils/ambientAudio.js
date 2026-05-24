const AUDIO_SRC = "/audio/ambianceloop.mp3";
const WATER_SRC = "/audio/watersound2.mp3";

const GLOBAL_KEY = "__hybridAmbientAudio__";

function getStore() {
  if (typeof window === "undefined") {
    return {
      dreamy: null,
      dreamySrc: null,
      water: null,
      waterSrc: null,
      dreamyPlayId: 0,
      waterPlayId: 0,
    };
  }

  if (!window[GLOBAL_KEY]) {
    window[GLOBAL_KEY] = {
      dreamy: null,
      dreamySrc: null,
      water: null,
      waterSrc: null,
      dreamyPlayId: 0,
      waterPlayId: 0,
    };
  }

  return window[GLOBAL_KEY];
}

function createLoopingAudio(src) {
  const audio = new Audio(src);
  audio.loop = true;
  audio.preload = "auto";
  audio.load();
  return audio;
}

function getOrCreateAudio(key, srcKey, src) {
  const store = getStore();
  if (!store[key] || store[srcKey] !== src) {
    store[key]?.pause();
    store[key] = createLoopingAudio(src);
    store[srcKey] = src;
  }
  return store[key];
}

export function getDreamyAudio() {
  return getOrCreateAudio("dreamy", "dreamySrc", AUDIO_SRC);
}

export function getWaterAudio() {
  return getOrCreateAudio("water", "waterSrc", WATER_SRC);
}

export function preloadAmbientAudio() {
  getDreamyAudio();
  getWaterAudio();
}

export function playDreamyAudio(volume) {
  const store = getStore();
  const audio = getDreamyAudio();
  const playId = ++store.dreamyPlayId;

  audio.volume = volume;
  void audio
    .play()
    .then(() => {
      if (playId !== store.dreamyPlayId) {
        audio.pause();
        audio.volume = 0;
      }
    })
    .catch(() => {});
}

export function pauseDreamyAudio() {
  const store = getStore();
  store.dreamyPlayId += 1;

  const audio = store.dreamy;
  if (!audio) return;

  audio.volume = 0;
  audio.pause();
}

export function playWaterAudio(volume) {
  const store = getStore();
  const audio = getWaterAudio();
  const playId = ++store.waterPlayId;

  audio.volume = volume;
  void audio
    .play()
    .then(() => {
      if (playId !== store.waterPlayId) {
        audio.pause();
        audio.volume = 0;
      }
    })
    .catch(() => {});
}

export function pauseWaterAudio() {
  const store = getStore();
  store.waterPlayId += 1;

  const audio = store.water;
  if (!audio) return;

  audio.volume = 0;
  audio.pause();
}
