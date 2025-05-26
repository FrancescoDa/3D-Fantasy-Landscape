// js/utils/uiHelper.js
const loadingScreen = document.getElementById("loading-screen");
const progressElement = document.getElementById("progress");
const infoElement = document.getElementById("info");

export function updateLoadingProgress(percent) {
  if (progressElement) {
    progressElement.textContent = Math.round(percent);
  }
}

export function hideLoadingScreen() {
  if (loadingScreen) {
    // Menggunakan class opacity dari Tailwind untuk transisi
    loadingScreen.classList.add("opacity-0");
    setTimeout(() => {
      loadingScreen.style.display = "none";
    }, 500); // Sesuaikan dengan durasi transisi di CSS/Tailwind
  }
}

export function showLoadingError(message) {
  if (loadingScreen) {
    loadingScreen.innerHTML = message;
    loadingScreen.classList.remove("opacity-0"); // Pastikan terlihat jika ada error
    loadingScreen.style.display = "flex"; // Atau style display awal
  }
}

export function toggleInfoPanel(show) {
  if (infoElement) {
    infoElement.style.display = show ? "block" : "none";
  }
}
