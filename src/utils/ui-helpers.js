export function applyColorByAccuracy(element, accuracy) {
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
}

export function timeCountDownColorChangeByElement(timerEl, totalSeconds) {
  if (!timerEl) return;

  if (totalSeconds <= 10) {
    timerEl.style.color = "hsl(354, 63%, 57%)";
  } else if (totalSeconds <= 30) {
    timerEl.style.color = "hsl(49, 85%, 70%)";
  } else {
    timerEl.style.color = "hsl(140, 63%, 57%)";
  }
}

const tooltipEls = document.querySelectorAll(".tooltip");
const kybrSelectionContainers = document.querySelector('.kybr-selection-container');
const kybrDropdownWrapper = kybrSelectionContainers.querySelector('.kybr-mobile-dropdown-wrapper');

export function hideTooltips() {
  tooltipEls.forEach((tooltip) => {
    tooltip.classList.add("hidden");
  });
}

export function showTooltips() {
  tooltipEls.forEach((tooltip) => {
    tooltip.classList.remove("hidden");
  });
}

export function closeAllDropdowns() {
  document.querySelectorAll(".mobile-dropdown-wrapper").forEach((dropdown) => {
    dropdown.classList.remove("open");
  });

  kybrDropdownWrapper.classList.remove("open");
}
