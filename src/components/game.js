import { appState, typingSession } from "../states/store.js";
import { applyColorByAccuracy, timeCountDownColorChangeByElement } from "../utils/ui-helpers.js";
import { saveToLocalstorage, getFromLocalstorage } from "../utils/storage.js";

const resultsPanel = document.querySelector(".js-results-panel");
const wmpEl = document.querySelector(".js-wpm");
const accuracyEl = document.querySelector(".js-accuracy");
const timerEl = document.querySelector(".js-timer");
const startContainerBtnEl = document.querySelector(".js-start-btn-container");
const finalWpmEl = document.querySelector('.js-final-wpm');
const finalAccuracyEl = document.querySelector('.js-final-accuracy');
const finalCharsEl = document.querySelector('.js-final-chars');
const restartContainerBtnEl = document.querySelector('.js-restart-btn-container');
const passageContainerEl = document.querySelector('.js-passage-container');
const topSectionEl = document.querySelector('.js-top-section');

export async function loadPassageData() {
  try {
    const response = await fetch("./data.json");
    const data = await response.json();
    typingSession.passageBank = data;
  } catch (error) {
    console.error("Failed to load passage data:", error);
  }
}

export function initializeNewTypingPassage(difficulty, mode, duration) {
  if (resultsPanel) {
    resultsPanel.classList.add("hidden");
  }

  const passageEl = document.querySelector(".js-passage");

  if (!typingSession.passageBank || !passageEl) return;

  const targetArray = typingSession.passageBank[difficulty];
  if (!targetArray || targetArray.length === 0) return;

  const randomIndex = Math.floor(Math.random() * targetArray.length);
  const randomPassageText = targetArray[randomIndex].text;

  // --- Reset Game State ---
  typingSession.characterIndex = 0;
  typingSession.isTimeRunning = false;
  typingSession.isTestActive = false;
  typingSession.totalAttempts = 0;
  typingSession.totalInCorrected = 0;
  typingSession.correctCount = 0;
  typingSession.incorrectCount = 0;
  typingSession.currentErrors = 0;

  if (typingSession.timerInterval) {
    clearInterval(typingSession.timerInterval);
    typingSession.timerInterval = null;
  }

  typingSession.timeLeft = mode === "timed" ? appState.duration : 0;

  if (wmpEl) wmpEl.textContent = "0";
  if (accuracyEl) accuracyEl.textContent = "100%";
  if (timerEl) {
    if (mode === "timed") {
      const mins = Math.floor(appState.duration / 60);
      const secs = appState.duration % 60;
      timerEl.textContent = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    } else {
      timerEl.textContent = "0:00";
    }
  }

  // --- Clear Element ---
  passageEl.innerHTML = "";

  // --- Convert Text to HTML Array ---
  typingSession.currentTextArray = randomPassageText.split("");

  typingSession.currentTextArray.forEach((letter) => {
    const span = document.createElement("span");
    span.textContent = letter;
    passageEl.appendChild(span);
  });

  const spans = passageEl.querySelectorAll("span");
  if (spans.length > 0) {
    if (
      startContainerBtnEl &&
      startContainerBtnEl.classList.contains("hidden")
    ) {
      spans[0].classList.add("active-cursor");
    }
  }
}

export function handleTyping(event) {
  if (!typingSession.passageBank) return;

  if (resultsPanel && !resultsPanel.classList.contains("hidden")) {
    return;
  }

  if (event.altKey || event.ctrlKey || event.metaKey) return;

  const passageEl = document.querySelector(".js-passage");
  const spans = passageEl.querySelectorAll("span");

  if (spans.length === 0) return;

  if (
    typingSession.characterIndex >= spans.length &&
    event.key !== "Backspace"
  ) {
    return;
  }

  if (!typingSession.isTimeRunning) {
    typingSession.timeLeft = appState.mode === "timed" ? appState.duration : 0;
    typingSession.isTimeRunning = true;
    startTimer();
  }
  const currentSpan = spans[typingSession.characterIndex];

  // --- Conditional Route A (Backspace) ---
  if (event.key === "Backspace") {
    if (typingSession.characterIndex > 0) {
      if (currentSpan) {
        currentSpan.classList.remove("active-cursor");
      }

      typingSession.characterIndex--;
      let targetSpan = spans[typingSession.characterIndex];

      if (targetSpan.classList.contains('correct')) {
        typingSession.currentErrors--;
      }

      if (targetSpan.classList.contains('incorrect')) {
        typingSession.incorrectCount--;
        typingSession.totalInCorrected--;
        typingSession.currentErrors = Math.max(0, typingSession.currentErrors - 1);
      }

      typingSession.totalAttempts = Math.max(0, typingSession.totalAttempts - 1);

      targetSpan.classList.remove("correct", "incorrect");
      targetSpan.classList.add("active-cursor");
      targetSpan.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    calculateLiveStats();
    return;
  }

  // --- Conditional Route B (System Keys Escape) ---
  if (event.key.length > 1) return;
  if (!currentSpan) return;

  typingSession.totalAttempts++;

  // Conditional Route C (Character Processing)
  if (event.key === currentSpan.textContent) {
    currentSpan.classList.add("correct");
    typingSession.correctCount++;
  } else {
    currentSpan.classList.add("incorrect");
    typingSession.incorrectCount++;
    typingSession.totalInCorrected++;
    typingSession.currentErrors++;
  }

  currentSpan.classList.remove("active-cursor");
  typingSession.characterIndex++;

  if (typingSession.characterIndex < spans.length) {
    spans[typingSession.characterIndex].classList.add("active-cursor");
    spans[typingSession.characterIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  calculateLiveStats();

  if (typingSession.characterIndex >= spans.length) {
    if (typingSession.timerInterval) {
      clearInterval(typingSession.timerInterval);
      typingSession.timerInterval = null;
    }
    typingSession.isTimeRunning = false;
    showTestComplete();
  }
}

function startTimer() {
  const isTimedMode = appState.mode === "timed";

  typingSession.timerInterval = setInterval(() => {
    if (isTimedMode) {
      typingSession.timeLeft -= 1;
      const mins = Math.floor(typingSession.timeLeft / 60);
      const secs = typingSession.timeLeft % 60;
      timerEl.textContent = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
      timeCountDownColorChangeByElement(timerEl, typingSession.timeLeft);
    } else {
      typingSession.timeLeft += 1;
      const mins = Math.floor(typingSession.timeLeft / 60);
      const secs = typingSession.timeLeft % 60;
      timerEl.textContent = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }

    calculateLiveStats();

    const isTimesUp = isTimedMode
      ? typingSession.timeLeft <= 0
      : typingSession.timeLeft >= 900; // 15 min cap

    if (isTimesUp) {
      clearInterval(typingSession.timerInterval);
      typingSession.timerInterval = null;
      typingSession.isTimeRunning = false;

      const spans = document.querySelectorAll(".js-passage span");
      if (spans[typingSession.characterIndex]) {
        spans[typingSession.characterIndex].classList.remove("active-cursor");
      }
      console.log("Test finished! Rendering final metrics panel...");
      showTestComplete();
    }
  }, 1000);
}

function fireStandard() {
  confetti({
    particleCount: 200,
    spread: 100,
    origin: { y: 0.6 }
  });
}

function fireSideCannons() {
  const duration = 1500;
  const end = Date.now() + duration;

  (function frame() {
    // Left cannon
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.8 }
    });

    // Right cannon
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.8 }
    });

    // Continue until duration ends
    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

function showTestComplete() {
  calculateLiveStats();

  typingSession.isTestActive = false;

  // 2. Read live scores from the active header stats
  const currentWPM = document.querySelector(".js-wpm")?.textContent || "0";
  const currentAccuracyText =
    document.querySelector(".js-accuracy")?.textContent || "100%";

  const numericWPM = parseInt(currentWPM, 10) || 0;
  const savePB = parseInt(getFromLocalstorage("personalBestWPM"), 10) || 0;

  const highMsg = document.querySelector(".js-high-score");
  const baseMsg = document.querySelector(".js-baseline-score");
  const normMsg = document.querySelector(".js-normal-test");
  const footerAttribution = document.querySelector(".js-attribution");

  highMsg.classList.add("hidden");
  baseMsg.classList.add("hidden");
  normMsg.classList.add("hidden");
  footerAttribution.classList.add("hidden");

  if (savePB === 0 && numericWPM > 0) {
    baseMsg.classList.remove("hidden");
    saveToLocalstorage("personalBestWPM", numericWPM);
  } else if (numericWPM > savePB) {
    highMsg.classList.remove("hidden");
    saveToLocalstorage("personalBestWPM", numericWPM);
  } else {
    normMsg.classList.remove("hidden");
  }

  const newPB = getFromLocalstorage("personalBestWPM");
  document.querySelector(".desktop-best span").textContent = `${newPB} WPM`;
  document.querySelector(".mobile-best span").textContent = `${newPB} WPM`;

  const imgStandard = document.querySelector(".js-test-complete-img");
  const imgSmashed = document.querySelector(".js-smashed-img");
  // const imgPatternConfetti = document.querySelector(".js-pattern-confetti");
  const imgCircle = document.querySelector(".img-circle");
  const imgCircle1 = document.querySelector(".img-circle-1");
  const imgStarTop = document.querySelector(".star-top");
  const imgStarBottom = document.querySelector(".star-bottom");

  if (highMsg.classList.contains("hidden")) {
    imgStandard.classList.remove("hidden");
    imgCircle.classList.remove("hidden");
    imgCircle1.classList.remove("hidden");
    imgStarTop.classList.remove("hidden");
    imgStarBottom.classList.remove("hidden");

    imgSmashed.classList.add("hidden");
    // imgPatternConfetti.classList.add("hidden");
  } else {
    imgStandard.classList.add("hidden");
    imgCircle.classList.add("hidden");
    imgCircle1.classList.add("hidden");
    imgStarTop.classList.add("hidden");
    imgStarBottom.classList.add("hidden");

    imgSmashed.classList.remove("hidden");
    // imgPatternConfetti.classList.remove("hidden");
    fireStandard();
    fireSideCannons();
  }

  const subMsgEl = document.querySelector(".js-sub-msg");

  if (savePB === 0 && numericWPM > 0) {
    baseMsg.classList.remove("hidden");
    subMsgEl.textContent =
      "You've set the bar. Now the real challenge begins, time to beat it.";
    saveToLocalstorage("personalBestWPM", numericWPM);
  } else if (numericWPM > savePB) {
    highMsg.classList.remove("hidden");
    subMsgEl.textContent = "You're getting faster. That was incredible typing!";
    saveToLocalstorage("personalBestWPM", numericWPM);
  } else {
    normMsg.classList.remove("hidden");
    subMsgEl.textContent = "Solid run. Keep pushing to beat your high score.";
  }

  // 3. Populate the new final results UI panel card
  if (finalWpmEl) finalWpmEl.textContent = currentWPM;

  if (finalAccuracyEl) {
    finalAccuracyEl.textContent = currentAccuracyText;

    const numericAccuracy = parseInt(currentAccuracyText, 10) || 0;
    const clampedAccuracy = Math.max(0, Math.min(100, numericAccuracy));

    // Updates the text content and applies the accuracy-based color gradient.
    applyColorByAccuracy(finalAccuracyEl, clampedAccuracy);
  }

  if (finalCharsEl)
    finalCharsEl.innerHTML = `
    <div style="display: flex; gap: -3px;">
      <span style="color: hsl(140, 63%, 57%);">${typingSession.correctCount}</span> 
      <span style="color: hsl(240, 1%, 59%);">/</span> 
      <span style="color: hsl(354, 63%, 57%);">${typingSession.incorrectCount}</span>
    </div>
    `;

  // 4. Visual toggle: Unhide the results panel card
  if (resultsPanel) {
    resultsPanel.classList.remove("hidden");
  }

  // 5. Hide the workspace content and inputs
  restartContainerBtnEl.classList.add("hidden");
  passageContainerEl.classList.add("hidden");
  topSectionEl.classList.add("hidden");
}

function calculateLiveStats() {
  const isTimedMode = appState.mode === "timed";
  let secondsElapsed = isTimedMode
    ? appState.duration - typingSession.timeLeft
    : typingSession.timeLeft;

  if (secondsElapsed <= 0) {
    if (wmpEl) wmpEl.textContent = "0";
    if (accuracyEl) accuracyEl.textContent = "100%";
    return;
  }

  const minutesElapsed = secondsElapsed / 60;

  const rawTotalWords = typingSession.characterIndex / 5;
  const grossWPM = rawTotalWords / minutesElapsed;

  const errorPenalty = typingSession.currentErrors / minutesElapsed;
  const netWPM = Math.max(0, Math.round(grossWPM - errorPenalty));

  let rawAccuracy = 100;
  if (typingSession.totalAttempts > 0) {
    rawAccuracy = Math.max(
      0,
      ((typingSession.totalAttempts - typingSession.totalInCorrected) /
        typingSession.totalAttempts) *
        100,
    );
  }

  if (wmpEl) {
    wmpEl.textContent = netWPM.toString();
  }

  // Updates the text content and applies the accuracy-based color gradient.
  if (accuracyEl) {
    applyColorByAccuracy(accuracyEl, Math.round(rawAccuracy));
  }
}
