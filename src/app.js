import { saveToLocalstorage, getFromLocalstorage } from "./utils/storage.js";
import { appState, appKybrProfile, allTimeScores, typingSession } from "./states/store.js";
import { applyColorByAccuracy, timeCountDownColorChangeByElement, hideTooltips, showTooltips, closeAllDropdowns } from "./utils/ui-helpers.js";
import { loadPassageData, initializeNewTypingPassage, handleTyping } from "./components/game.js";
import { playAudio, normalizeKeyName } from "./utils/audio.js";

document.addEventListener("DOMContentLoaded", () => {
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

  const goAgainBtnEl = document.querySelector('.js-restart-btn');
  
  const resultsPanel = document.querySelector('.js-results-panel');
  const shareResultEl = document.querySelector('.js-share-result-card');
  const shareBtn = document.querySelector('.js-share-btn');

  // 
  const kybrSelectionContainers = document.querySelector('.kybr-selection-container');
  const kybrDropdownWrapper = kybrSelectionContainers.querySelector('.kybr-mobile-dropdown-wrapper');
  const kybrDropdownTriggerBtn = kybrSelectionContainers.querySelector('.kybr-dropdown-trigger-btn');
  const kybrTriggerText = kybrSelectionContainers.querySelector('.kybr-trigger-text');
  const kybrMenuItems = kybrSelectionContainers.querySelectorAll('.kybr-dropdown-item');

  const hiddenInput = document.getElementById('hiddenInput');
  const textDisplay = document.querySelector('.js-passage');

  const isMobile = () =>
    window.matchMedia("(pointer: coarse)").matches ||
    navigator.maxTouchPoints > 0;

  async function captureScreenshot() {
    try {
      const canvas = await html2canvas(shareResultEl, {
        backgroundColor: "#121212",
        useCORS: true
      });
      const image = canvas.toDataURL("image/png");

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
      // console.log(`Updated state ->`, appState);

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
      const wasActive = typingSession.isTestActive;
      initializeNewTypingPassage(appState.difficulty, appState.mode, appState.duration);
      if (wasActive) {
        const firstSpan = document.querySelector('.js-passage span');

        if (firstSpan) {
          firstSpan.classList.add('active-cursor');
        }

        typingSession.isTestActive = true;

        if (isMobile()) {
          focusMobileInput();
        }
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

      const willOpen = !dropdownWrapper.classList.contains('open');

      closeAllDropdowns();

      if (willOpen) {
        dropdownWrapper.classList.add('open');
        hideTooltips();
      } else {
        showTooltips();
      }
    });

    // Handler 3: Mobile Floating List Option Selections
    dropdownItems.forEach(item => {
      item.addEventListener('click', () => {
        const value = item.getAttribute('data-value');
        updateStateAndUI(value);
        dropdownWrapper.classList.remove('open');
        showTooltips();
      });
    });
  });

  const storageKybrKey = kybrSelectionContainers.getAttribute('data-type');

  // 1. Initial configuration check from LocalStorage
  const savedKybrValue = localStorage.getItem(storageKybrKey);

  if (savedKybrValue) {
    kybrMenuItems.forEach(i => i.classList.remove('active'));
    
    kybrMenuItems.forEach(item => {
      if (item.getAttribute('data-value') === savedKybrValue) {
        item.classList.add('active');
        kybrTriggerText.textContent = item.textContent.trim();

        appKybrProfile.profile = savedKybrValue;
      }
    });
  }

  // 2. Open/Close dropdown toggle behavior
  kybrDropdownTriggerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = !kybrDropdownWrapper.classList.contains('open');

    closeAllDropdowns();

    if (willOpen) {
      kybrDropdownWrapper.classList.add('open');
      hideTooltips();
    } else {
      showTooltips();
    }
    
  });

  // 3. Selection process event handler mapping
  kybrMenuItems.forEach(item => {
    item.addEventListener('click', () => {
      const selectedValue = item.getAttribute('data-value');
      const itemText = item.textContent.trim();

      // clear old active elements and flag selected element target
      kybrMenuItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      // update main trigger text dynamically
      kybrTriggerText.textContent = itemText;

      // Save localStorage for tracking data property state parameter
      localStorage.setItem(storageKybrKey, selectedValue);

      // close layout list window following selection
      kybrDropdownWrapper.classList.remove('open');
      showTooltips();

      appKybrProfile.profile = selectedValue;

      // console.log(`Setting [${storageKybrKey}] changed to: ${selectedValue}`);

      if (typingSession.isTestActive) {
        const firstSpan = document.querySelector('.js-passage span');

        if (firstSpan && isMobile()) {
          focusMobileInput();
        }

        textDisplay.focus?.();
      }
    });
  });

  document.addEventListener('click', () => {
    closeAllDropdowns();
    showTooltips();
  });

  const heldKey = {};

  document.addEventListener('keydown', (e) => {
    if ((e.key.length > 1 && e.key !== 'Backspace') || e.altKey || e.ctrlKey || e.metaKey) {
      return;
    }
    if (e.repeat) return;

    const keyIdentifier = normalizeKeyName(e.key);
    if (heldKey[keyIdentifier] === true) return;

    heldKey[keyIdentifier] = true;

    if (typingSession.isTestActive) {
      playAudio(keyIdentifier, 'press');
    }
  });
  
  document.addEventListener('keyup', (e) => {
    if ((e.key.length > 1 && e.key !== 'Backspace') || e.altKey || e.ctrlKey || e.metaKey) {
      return;
    }

    const keyIdentifier = normalizeKeyName(e.key);
    heldKey[keyIdentifier] = false;

    if (typingSession.isTestActive) {
      playAudio(keyIdentifier, 'release');
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.key.length > 1 && e.key !== 'Backspace') || e.altKey || e.ctrlKey || e.metaKey) {
      return;
    }
    // console.log('keydown:', e.key, typingSession.isTestActive);
    
    if (startContainerBtnEl && !startContainerBtnEl.classList.contains('hidden')) {
      passageContainerEl.classList.remove('hidden');
      restartContainerBtnEl.classList.remove('hidden');
      startContainerBtnEl.classList.add('hidden');

      if (isMobile()) {
        focusMobileInput();
      }

      const firstSpan = document.querySelector('.js-passage span');
      if (firstSpan) firstSpan.classList.add('active-cursor');

      typingSession.isTestActive = true;
      e.preventDefault();
      return;
    }

    if (!typingSession.isTestActive) return;

    if (isMobile()) return;
    
    if (e.key === ' ') e.preventDefault();

    handleTyping(e);
  });

  textDisplay.addEventListener('click', () => {
    if (startContainerBtnEl && !startContainerBtnEl.classList.contains('hidden')) {
      startContainerBtnEl.classList.add('hidden');
      restartContainerBtnEl.classList.remove('hidden');
      passageContainerEl.classList.remove('hidden');
      const firstSpan = document.querySelector('.js-passage span');
      if (firstSpan) firstSpan.classList.add('active-cursor');
      typingSession.isTestActive = true;
    }

    if (isMobile()) {
      focusMobileInput();
    }
  });

  const SENTINEL = '\u200B';
  hiddenInput.value = SENTINEL;
  let lastInputValue = SENTINEL;

  hiddenInput.addEventListener('beforeinput', (e) => {
    if (!isMobile()) return;
    if (!typingSession.isTestActive) return;

    if (e.inputType === 'insertText' && e.data === ' ') {
      e.preventDefault();
      playAudio('space', 'press');
      handleTyping({ key: ' ', altKey: false, ctrlKey: false, metaKey: false });
      setTimeout(() => playAudio('space', 'release'), 80);
      return;
    }

    if (e.data) {
      for (const char of e.data) {
        const keyIdentifier = normalizeKeyName(char);
        playAudio(keyIdentifier, 'press');
        handleTyping({ key: char, altKey: false, ctrlKey: false, metaKey: false });
        setTimeout(() => playAudio(keyIdentifier, 'release'), 80);
      }
    }

    requestAnimationFrame(() => {
      hiddenInput.value = SENTINEL;
      lastInputValue = SENTINEL;
    });
  });

  hiddenInput.addEventListener("keydown", (e) => {
    if (!isMobile()) return;
    if (!typingSession.isTestActive) return;
    if (e.key === "Backspace") {
      e.preventDefault();
      playAudio('backspace', 'press');
      handleTyping({ key: "Backspace", altKey: false, ctrlKey: false, metaKey: false });
      setTimeout(() => playAudio('backspace', 'release'), 80);
    }
  });

  function focusMobileInput() {
    hiddenInput.value = SENTINEL;
    lastInputValue = SENTINEL;
    hiddenInput.focus();
    // Ensure sentinel survives focus on some Android browsers
    requestAnimationFrame(() => {
      hiddenInput.value = SENTINEL;
    });
  }
  
  restartTestBtnEl.addEventListener('click', (e) => {
    e.stopPropagation();
    restartTestBtnEl.blur();

    timerEl.style.color = "hsl(0, 0%, 100%)";
    accuracyEl.style.color = "hsl(0, 0%, 100%)";

    initializeNewTypingPassage(appState.difficulty, appState.mode, appState.duration);

    const firstSpan = document.querySelector('.js-passage span');

    if (firstSpan) {
      firstSpan.classList.add('active-cursor');
    }

    typingSession.isTestActive = true;

    if (isMobile()) focusMobileInput();
  });

  goAgainBtnEl.addEventListener('click', (e) => {
    e.stopPropagation();

    goAgainBtnEl.blur();
    resultsPanel.classList.add('hidden');
    // const imgPatternConfetti = document.querySelector('.js-pattern-confetti');
    // imgPatternConfetti.classList.add('hidden');
    restartContainerBtnEl.classList.remove('hidden');
    passageContainerEl.classList.remove('hidden');
    topSectionEl.classList.remove('hidden');

    timerEl.style.color = "hsl(0, 0%, 100%)";
    accuracyEl.style.color = "hsl(0, 0%, 100%)";
    const footerAttribution = document.querySelector('.js-attribution');
    footerAttribution.classList.remove('hidden');
    initializeNewTypingPassage(appState.difficulty, appState.mode, appState.duration);

    const firstSpan = document.querySelector('.js-passage span');

    setTimeout(() => {
      if (firstSpan) {
        firstSpan.classList.add('active-cursor');
  
        if (isMobile()) {
          firstSpan.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }
    },50);

    typingSession.isTestActive = true;
    if (isMobile()) focusMobileInput();
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
    
    typingSession.isTestActive = true;

    if (isMobile()) {
      focusMobileInput();
    }
  });

  startApp();
});
