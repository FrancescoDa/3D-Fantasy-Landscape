// js/utils/uiHelper.js
const loadingScreen = document.getElementById("loading-screen");
const progressElement = document.getElementById("progress");
const infoElement = document.getElementById("info");
const playMenuScreen = document.getElementById("play-menu-screen");

// ... (variabel elemen UI untuk berinteraksi dengan karakter) ...
const interactButton = document.getElementById("interact-button");
const dialogueBoxContainer = document.getElementById("dialogue-box-container"); // Container untuk animasi
const dialogueBox = document.getElementById("dialogue-box");
const dialogueTextElement = document.getElementById("dialogue-text");
const dialogueNextButton = document.getElementById("dialogue-next-button");

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

// Fungsi untuk Tombol Interaksi
export function showInteractButton(visible, text = "Berinteraksi") {
  if (!interactButton) return;
  if (visible) {
    interactButton.textContent = text;
    interactButton.style.display = 'block';
    interactButton.style.pointerEvents = 'auto'; // Aktifkan event klik
    setTimeout(() => { // Delay untuk transisi
      interactButton.classList.remove("opacity-0");
      interactButton.style.transform = 'translateY(0)';
    }, 20);
  } else {
    interactButton.classList.add("opacity-0");
    interactButton.style.transform = 'translateY(100px)';
    interactButton.style.pointerEvents = 'none'; // Nonaktifkan event klik
    setTimeout(() => {
      interactButton.style.display = 'none';
    }, 300); // Sesuaikan dengan durasi transisi
  }
}

// Fungsi untuk Kotak Dialog
export function showDialogueBox(visible) {
  if (!dialogueBox || !dialogueBoxContainer) return;
  if (visible) {
    dialogueBoxContainer.style.pointerEvents = 'auto'; // Biarkan container menangkap event
    dialogueBox.style.pointerEvents = 'auto';      // Biarkan box (terutama tombol next) menangkap event
    // dialogueBox.style.display = 'block'; // Container yang diatur displaynya
    dialogueBoxContainer.style.display = 'flex'; // Jika container pakai flex
    setTimeout(() => {
      dialogueBox.classList.remove("opacity-0");
      dialogueBox.style.transform = 'translateY(0)';
    }, 20);
  } else {
    dialogueBox.classList.add("opacity-0");
    dialogueBox.style.transform = 'translateY(100%)';
    setTimeout(() => {
      // dialogueBox.style.display = 'none';
      dialogueBoxContainer.style.display = 'none';
      dialogueBoxContainer.style.pointerEvents = 'none';
      dialogueBox.style.pointerEvents = 'none';
    }, 300);
  }
}

export function setDialogueText(text) {
  if (dialogueTextElement) {
    dialogueTextElement.textContent = text;
  }
}

export function setDialogueNextButtonText(text) {
  if (dialogueNextButton) {
    dialogueNextButton.textContent = text;
  }
}

// Helper untuk mendapatkan referensi tombol jika perlu di luar uiHelper
export function getInteractButtonElement() {
  return interactButton;
}

export function getDialogueNextButtonElement() {
  return dialogueNextButton;
}
