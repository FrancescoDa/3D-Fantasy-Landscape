// js/utils/uiHelper.js
const loadingScreen = document.getElementById("loading-screen");
const progressElement = document.getElementById("progress");
const infoElement = document.getElementById("info");
const playMenuScreen = document.getElementById("play-menu-screen"); // Baru

export function updateLoadingProgress(percent) {
  if (progressElement) {
    progressElement.textContent = Math.round(percent);
  }
}

export function showLoadingScreen() {
  // Baru
  if (loadingScreen) {
    loadingScreen.style.display = "flex";
    // Sedikit delay untuk memastikan display:flex diterapkan sebelum transisi opacity
    setTimeout(() => {
      loadingScreen.classList.remove("opacity-0");
    }, 20);
    if (progressElement) progressElement.textContent = "0"; // Reset progress
  }
}

export function hideLoadingScreen() {
  if (loadingScreen) {
    loadingScreen.classList.add("opacity-0");
    setTimeout(() => {
      loadingScreen.style.display = "none";
    }, 500);
  }
}

export function showLoadingError(message) {
  if (loadingScreen) {
    progressElement.parentElement.innerHTML = `<p class="text-red-500 text-xl">${message}</p>`; // Ganti konten loading dengan pesan error
    loadingScreen.style.display = "flex";
    loadingScreen.classList.remove("opacity-0");
  }
}

export function toggleInfoPanel(show) {
  if (infoElement) {
    infoElement.style.display = show ? "block" : "none";
  }
}

export function showPlayMenuScreen() {
  // Baru
  if (playMenuScreen) {
    playMenuScreen.style.display = "flex";
    setTimeout(() => {
      playMenuScreen.classList.remove("opacity-0");
    }, 20);
  }
}

export function hidePlayMenuScreen() {
  // Baru
  if (playMenuScreen) {
    playMenuScreen.classList.add("opacity-0");
    setTimeout(() => {
      playMenuScreen.style.display = "none";
    }, 500); // Sesuaikan dengan durasi transisi di CSS/Tailwind
  }
}
