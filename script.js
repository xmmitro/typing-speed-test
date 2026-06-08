document.addEventListener("DOMContentLoaded", () => {
  const appState = {
    difficulty: 'hard',
    duration: 60,
    mode: 'timed',
  };

  const allTimeScores = {
    wpm: "0",
    accuracy: "100%"
  };

  let passageBank = null;
  let currentTextArray = [];
  let characterIndex = 0;
  let isTimeRunning = false;
  let timerInterval = null;
  let timeLeft = 60;
  let isTestActive = false;
  let correctCount = 0;
  let incorrectCount = 0;
  let totalAttempts = 0;
  let totalInCorrected = 0;
  
  const selectionContainers = document.querySelectorAll(".selection-container");

  const wmpEl = document.querySelector('.js-wpm');
  const accuracyEl = document.querySelector('.js-accuracy');
  const timerEl = document.querySelector('.js-timer');

  const restartTestBtnEl = document.querySelector('.js-restart-test-btn');
  const startTestBtnEl = document.querySelector('.js-start-btn');

  const startContainerBtnEl = document.querySelector('.js-start-btn-container');


  const restartContainerBtnEl = document.querySelector('.js-restart-btn-container');
  const passageContainerEl = document.querySelector('.js-passage-container');
  const topSectionEl = document.querySelector('.js-top-section');

  const finalWpmEl = document.querySelector('.js-final-wpm');
  const finalAccuracyEl = document.querySelector('.js-final-accuracy');
  const finalCharsEl = document.querySelector('.js-final-chars');
  const goAgainBtnEl = document.querySelector('.js-restart-btn');
  
  const resultsPanel = document.querySelector('.js-results-panel');
  const shareResultEl = document.querySelector('.js-share-result-card');
  const shareBtn = document.querySelector('.js-share-btn');

  async function captureScreenshot() {
    try {
      const canvas = await html2canvas(shareResultEl, {
        backgroundColor: "#121212",
        useCORS: true
      });
      const image = canvas.toDataURL("image/png");

      window.open(image);

      const link = document.createElement('a');
      link.href = image;
      link.download = "my-result.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.log("Error: ", error);
    }
  }

  shareBtn.addEventListener('click', () => {
    captureScreenshot();
  });


  // html2canvas(document.querySelector("#capture")).then(canvas => {
  //   document.body.appendChild(canvas)
  // });

  // html2canvas(element, options);


  // Save to storage
  function saveToLocalstorage(key, value) {
    try {
      const serializedValue = typeof value === "string" ? value : JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
    } catch (error) {
      console.error(`Error saving key "${key}" to localStorage:`, error);
    }
  }

  function getFromLocalstorage(key) {
    try {
      const item = localStorage.getItem(key);

      if (item === null) return null;

      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    } catch (error) {
      console.error(`Error reading key "${key}" from localStorage:`, error);
      return null;
    }
  }

  function applyColorByAccuracy(element, accuracy) {
    element.textContent = `${accuracy}%`;

    if (accuracy < 0) {
      element.style.color = "hsl(355, 75%, 50%)";
    } else if (accuracy < 25) {
      element.style.color = "hsl(22, 85%, 52%)";
    } else if (accuracy < 50) {
      element.style.color = "hsl(42, 90%, 53%)";
    } else if (accuracy < 75) {
      element.style.color = "hsl(98, 60%, 52%)";
    } else {
      element.style.color = "hsl(145, 65%, 45%)";
    }
  };

  function timeCountDownColorChangeByElement(timerEl, totalSeconds) {
    if(!timerEl) return;

    if (totalSeconds <= 10) {
      timerEl.style.color = "hsl(354, 63%, 57%)";
    } else if (totalSeconds <= 30) {
      timerEl.style.color = "hsl(49, 85%, 70%)";
    } else {
      timerEl.style.color = "hsl(140, 63%, 57%)";
    }
  }

  selectionContainers.forEach((container) => {
    const type = container.getAttribute('data-type');
    const desktopButtons = container.querySelectorAll('.desktop-btns button');
    const dropdownWrapper = container.querySelector('.mobile-dropdown-wrapper');
    const dropdownTrigger = container.querySelector('.dropdown-trigger-btn');
    const triggerText = container.querySelector('.trigger-text');
    const dropdownItems = container.querySelectorAll('.dropdown-item');

    function updateStateAndUI(newValue) {
      if (type === 'mode') {
        if (newValue === 'passage') {
          appState.mode = 'passage';
        } else {
          appState.mode = 'timed';
          appState.duration = parseInt(newValue);
        }
      } else {
        appState[type] = newValue;
      }
      console.log(`Updated state ->`, appState);

      // Update Desktop buttons styling
      desktopButtons.forEach(btn => {
        if (btn.getAttribute('data-value') === newValue) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      // Update Mobile dropdown trigger display text
      const correspondingItem = container.querySelector(`.dropdown-item[data-value="${newValue}"]`);
      if (correspondingItem) {
        triggerText.textContent = correspondingItem.textContent.trim();
      }

      // Update Mobile list item selection checks
      dropdownItems.forEach(item => {
        if (item.getAttribute('data-value') === newValue) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
      
      initializeNewTypingPassage(appState.difficulty, appState.mode, appState.duration);
      if (startContainerBtnEl && startContainerBtnEl.classList.contains('hidden')) {
        isTestActive = true;
      } else {
        isTestActive = false;
      }
    }

    // Handler 1: Desktop Button Clicks
    desktopButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        btn.blur();
        const value = btn.getAttribute('data-value');
        updateStateAndUI(value);
      });
    });

    // Handler 2: Mobile Dropdown Toggle Expand/Collapse Menu
    dropdownTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownTrigger.blur();

      selectionContainers.forEach(other => {
        if (other !== container) {
          other.querySelector('.mobile-dropdown-wrapper').classList.remove('open');
        }
      });

      dropdownWrapper.classList.toggle('open');
    });

    // Handler 3: Mobile Floating List Option Selections
    dropdownItems.forEach(item => {
      item.addEventListener('click', () => {
        const value = item.getAttribute('data-value');
        updateStateAndUI(value);
        dropdownWrapper.classList.remove('open');
      });
    });
  });

  async function loadPassageData() {
    try {
      const response = await fetch('./data.json');
      const data = await response.json();
      passageBank = data;
    } catch (error) {
      console.error("Failed to load passage data:", error);
    }
  }

  function initializeNewTypingPassage(difficulty, mode, duration) {
    if (resultsPanel) {
      resultsPanel.classList.add('hidden');
    }

    const footerAttribution = document.querySelector('.js-attribution');

    const passageEl = document.querySelector('.js-passage');

    if (!passageBank || !passageEl) return;

    const targetArray = passageBank[difficulty];
    if (!targetArray || targetArray.length === 0) return;

    const randomIndex = Math.floor(Math.random() * targetArray.length);
    const randomPassageText = targetArray[randomIndex].text;
    
    // --- Reset Game State ---
    characterIndex = 0;
    isTimeRunning = false;
    isTestActive = false;
    totalAttempts = 0;
    totalInCorrected = 0;
    correctCount = 0;
    incorrectCount = 0;

    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    timeLeft = mode === 'timed' ? appState.duration : 0;

    if (wmpEl) wmpEl.textContent = "0";
    if (accuracyEl) accuracyEl.textContent = "100%";
    if (timerEl) {
      if (mode === 'timed') {
        const mins = Math.floor(appState.duration / 60);
        const secs = appState.duration % 60;
        timerEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      } else {
        timerEl.textContent = "0:00";
      }
    }

    // --- Clear Element ---
    passageEl.innerHTML = "";

    // --- Convert Text to HTML Array ---
    currentTextArray = randomPassageText.split('');
    
    currentTextArray.forEach((letter) => {
      const span = document.createElement('span');
      span.textContent = letter;
      passageEl.appendChild(span);
    });

    const spans = passageEl.querySelectorAll('span');
    if (spans.length > 0) {
      if (startContainerBtnEl && startContainerBtnEl.classList.contains('hidden')) {
        spans[0].classList.add('active-cursor');
      }
    }
  }

  function handleTyping(event) {
    if (!passageBank) return;

    if (resultsPanel && !resultsPanel.classList.contains('hidden')) {
      return;
    }

    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const passageEl = document.querySelector('.js-passage');
    const spans = passageEl.querySelectorAll('span');

    if (spans.length === 0) return;

    if (characterIndex >= spans.length && event.key !== 'Backspace') {
      return;
    }

    if (!isTimeRunning) {
      timeLeft = appState.mode === 'timed' ? appState.duration : 0;
      isTimeRunning = true;
      startTimer();
    }
    const currentSpan = spans[characterIndex];

    // --- Conditional Route A (Backspace) ---
    if (event.key === 'Backspace') {
      if (characterIndex > 0) {
        if (currentSpan) {
          currentSpan.classList.remove('active-cursor');
        }

        characterIndex--;
        let targetSpan = spans[characterIndex];

        targetSpan.classList.remove('correct', 'incorrect');
        targetSpan.classList.add('active-cursor');
      }
      calculateLiveStats();
      return;
    }

    // --- Conditional Route B (System Keys Escape) ---
    if (event.key.length > 1) return;
    if (!currentSpan) return;

    totalAttempts++;

    // Conditional Route C (Character Processing)
    if (event.key === currentSpan.textContent) {
      currentSpan.classList.add('correct');
      correctCount++;
    } else {
      currentSpan.classList.add('incorrect');
      incorrectCount++;
      totalInCorrected++;
    }

    currentSpan.classList.remove('active-cursor');
    characterIndex++;

    if (characterIndex < spans.length) {
      spans[characterIndex].classList.add('active-cursor');
    }
    calculateLiveStats();

    if (characterIndex >= spans.length) {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      isTimeRunning = false;
      showTestComplete();
    }
  }

  function startTimer() {
    const isTimedMode = appState.mode === 'timed';

    timerInterval = setInterval(() => {
      if (isTimedMode) {
        timeLeft -= 1;
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        timerEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        timeCountDownColorChangeByElement(timerEl, timeLeft);
      } else {
        timeLeft += 1;
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        timerEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      }

      calculateLiveStats();

      const isTimesUp = isTimedMode ? (timeLeft <= 0) : (timeLeft >= 900); // 15 min cap

      if (isTimesUp) {
        clearInterval(timerInterval);
        timerInterval = null;
        isTimeRunning = false;

        const spans = document.querySelectorAll('.js-passage span');
        if (spans[characterIndex]) {
          spans[characterIndex].classList.remove('active-cursor');
        }
        console.log("Test finished! Rendering final metrics panel...");
        showTestComplete();
      }
    }, 1000);
  }

  function showTestComplete() {
    isTestActive = false;

    // 1. Query all spans to count user inputs
    const passageEl = document.querySelector('.js-passage');
    const spans = passageEl.querySelectorAll('span') || [];

    // 2. Read live scores from the active header stats
    const currentWPM = document.querySelector('.js-wpm')?.textContent || "0";
    const currentAccuracyText = document.querySelector('.js-accuracy')?.textContent || "100%";

    const numericWPM = parseInt(currentWPM, 10) || 0;
    const savePB = parseInt(getFromLocalstorage('personalBestWPM'), 10) || 0;

    const highMsg = document.querySelector('.js-high-score');
    const baseMsg = document.querySelector('.js-baseline-score');
    const normMsg = document.querySelector('.js-normal-test');
    const footerAttribution = document.querySelector('.js-attribution');
    
    highMsg.classList.add('hidden');
    baseMsg.classList.add('hidden');
    normMsg.classList.add('hidden');
    footerAttribution.classList.add('hidden');

    if (savePB === 0 && numericWPM > 0) {
      baseMsg.classList.remove('hidden');
      saveToLocalstorage('personalBestWPM', numericWPM);
    } else if (numericWPM > savePB) {
      highMsg.classList.remove('hidden');
      saveToLocalstorage('personalBestWPM', numericWPM);
    } else {
      normMsg.classList.remove('hidden');
    }

    const newPB = getFromLocalstorage('personalBestWPM');
    document.querySelector('.desktop-best span').textContent = `${newPB} WPM`;
    document.querySelector('.mobile-best span').textContent = `${newPB} WPM`;

    const imgStandard = document.querySelector('.js-test-complete-img');
    const imgSmashed = document.querySelector('.js-smashed-img');
    const imgPatternConfetti = document.querySelector('.js-pattern-confetti');
    const imgCircle = document.querySelector('.img-circle');
    const imgCircle1 = document.querySelector('.img-circle-1');
    const imgStarTop = document.querySelector('.star-top');
    const imgStarBottom = document.querySelector('.star-bottom');

    if (highMsg.classList.contains('hidden')) {
      imgStandard.classList.remove('hidden');
      imgCircle.classList.remove('hidden');
      imgCircle1.classList.remove('hidden');
      imgStarTop.classList.remove('hidden');
      imgStarBottom.classList.remove('hidden');

      imgSmashed.classList.add('hidden');
      imgPatternConfetti.classList.add('hidden');
    } else {
      imgStandard.classList.add('hidden');
      imgCircle.classList.add('hidden');
      imgCircle1.classList.add('hidden');
      imgStarTop.classList.add('hidden');
      imgStarBottom.classList.add('hidden');

      imgSmashed.classList.remove('hidden');
      imgPatternConfetti.classList.remove('hidden');
    }

    const subMsgEl = document.querySelector('.js-sub-msg');

    if (savePB === 0 && numericWPM > 0) {
        baseMsg.classList.remove('hidden');
        subMsgEl.textContent = "You've set the bar. Now the real challenge begins, time to beat it.";
        saveToLocalstorage('personalBestWPM', numericWPM);
    } else if (numericWPM > savePB) {
        highMsg.classList.remove('hidden');
        subMsgEl.textContent = "You're getting faster. That was incredible typing!";
        saveToLocalstorage('personalBestWPM', numericWPM);
    } else {
        normMsg.classList.remove('hidden');
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

    if (finalCharsEl) finalCharsEl.innerHTML = `
    <div style="display: flex; gap: -3px;">
      <span style="color: hsl(140, 63%, 57%);">${correctCount}</span> 
      <span style="color: hsl(240, 1%, 59%);">/</span> 
      <span style="color: hsl(354, 63%, 57%);">${incorrectCount}</span>
    </div>
    `;

    // 4. Visual toggle: Unhide the results panel card
    if (resultsPanel) {
      resultsPanel.classList.remove('hidden');
    }

    // 5. Hide the workspace content and inputs
    restartContainerBtnEl.classList.add('hidden');
    passageContainerEl.classList.add('hidden');
    topSectionEl.classList.add('hidden');
  }

  function calculateLiveStats() {
    const isTimedMode = appState.mode === 'timed';
    let secondsElapsed = isTimedMode ? (appState.duration - timeLeft) : timeLeft;

    if (secondsElapsed <= 0) {
      if (wmpEl) wmpEl.textContent = "0";
      if (accuracyEl) accuracyEl.textContent = "100%";
      return;
    }

    const minutesElapsed = secondsElapsed / 60;

    const totalWords = characterIndex / 5;
    const currentWPM = Math.round(totalWords / minutesElapsed);

    let rawAccuracy = 100;
    if (totalAttempts > 0) {
      rawAccuracy = Math.max(0, ((totalAttempts - totalInCorrected) / totalAttempts) * 100);
    }

    wmpEl.textContent = currentWPM;

    // Updates the text content and applies the accuracy-based color gradient.
    applyColorByAccuracy(accuracyEl, Math.round(rawAccuracy));
  }

  document.addEventListener('keydown', (e) => {
    if (isTestActive && e.key === ' ') {
      e.preventDefault();
    }

    if ((e.key.length > 1 && e.key !== 'Backspace') || e.altKey || e.ctrlKey || e.metaKey) {
      return;
    }

    if (startContainerBtnEl && !startContainerBtnEl.classList.contains('hidden')) {
      passageContainerEl.classList.remove('hidden');
      restartContainerBtnEl.classList.remove('hidden');
      startContainerBtnEl.classList.add('hidden');
      const firstSpan = document.querySelector('.js-passage span');
      if (firstSpan) firstSpan.classList.add('active-cursor');

      isTestActive = true;
      e.preventDefault();
      return;
    }

    if (!isTestActive) return;

    handleTyping(e);
  });

  restartTestBtnEl.addEventListener('click', (e) => {
    e.stopPropagation();
    restartTestBtnEl.blur();

    timerEl.style.color = "hsl(0, 0%, 100%)";
    accuracyEl.style.color = "hsl(0, 0%, 100%)";
    initializeNewTypingPassage(appState.difficulty, appState.mode, appState.duration);
    isTestActive = true;
  });

  goAgainBtnEl.addEventListener('click', (e) => {
    e.stopPropagation();

    goAgainBtnEl.blur();
    resultsPanel.classList.add('hidden');
    const imgPatternConfetti = document.querySelector('.js-pattern-confetti');
    imgPatternConfetti.classList.add('hidden');
    restartContainerBtnEl.classList.remove('hidden');
    passageContainerEl.classList.remove('hidden');
    topSectionEl.classList.remove('hidden');

    timerEl.style.color = "hsl(0, 0%, 100%)";
    accuracyEl.style.color = "hsl(0, 0%, 100%)";
    const footerAttribution = document.querySelector('.js-attribution');
    footerAttribution.classList.remove('hidden');
    initializeNewTypingPassage(appState.difficulty, appState.mode, appState.duration);
    isTestActive = true;
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.mobile-dropdown-wrapper').forEach(el => {
      el.classList.remove('open');
    });
  });

  async function startApp() {
    await loadPassageData();

    const savePB = getFromLocalstorage('personalBestWPM') || 0;

    document.querySelector('.desktop-best span').textContent = `${savePB} WPM`;
    document.querySelector('.mobile-best span').textContent = `${savePB} WPM`;

    initializeNewTypingPassage(appState.difficulty, appState.mode, appState.duration);
  }
  
  startTestBtnEl.addEventListener('click', (e) => {
    e.stopPropagation();
    startTestBtnEl.blur();

    passageContainerEl.classList.remove('hidden');
    restartContainerBtnEl.classList.remove('hidden');
    startContainerBtnEl.classList.add('hidden');

    const firstSpan = document.querySelector('.js-passage span');
    if (firstSpan) firstSpan.classList.add('active-cursor');

    setTimeout(() => {
      isTestActive = true;
    }, 10);
  });

  startApp();
});
