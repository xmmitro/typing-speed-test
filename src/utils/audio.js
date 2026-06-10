import { appKybrProfile } from "../states/store.js";

const audioCache = {};

export function playAudio(keyName, action) {
  const profile = appKybrProfile.profile.toLowerCase();
  const key = keyName.toUpperCase();

  let fileName = key;
  if (action === "press" && key === "GENERIC") {
    fileName = "GENERIC_R3";
  }

  const audioPath = `../assets/audio/${profile}/${action}/${fileName}.mp3`;

  if (!audioCache[audioPath]) {
    audioCache[audioPath] = new Audio(audioPath);
    audioCache[audioPath].preload = "auto";
  }

  const keyAudio = audioCache[audioPath];
  keyAudio.currentTime = 0;
  keyAudio.volume = 1;

  keyAudio.play().catch((error) => {
    console.warn(`Audio track missing or blocked: ${audioPath}`, error);
  });
}

export function normalizeKeyName(eventKey) {
  let key = eventKey.toUpperCase();
  if (key === " ") return "SPACE";
  if (key === "BACKSPACE") return "BACKSPACE";
  if (key === "ENTER") return "ENTER";

  return "GENERIC";
}
