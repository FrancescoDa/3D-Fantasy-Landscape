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

// ... (variabel elemen UI untuk ambil barang) ...
const itemTooltipElement = document.getElementById("item-tooltip");
const itemModalOverlayElement = document.getElementById("item-modal-overlay");
const itemModalContentElement = document.getElementById("item-modal-content");
const itemModalTitleElement = document.getElementById("item-modal-title");
const itemModalImageElement = document.getElementById("item-modal-image");
const itemModalNameElement = document.getElementById("item-modal-name");
const itemModalDescriptionElement = document.getElementById("item-modal-description");
const itemModalCloseButton = document.getElementById("item-modal-close-button");

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

// Fungsi untuk Tooltip Item
export function showItemTooltip(visible, text, x, y) {
  if (!itemTooltipElement) return;
  if (visible && text) {
    itemTooltipElement.textContent = text;
    itemTooltipElement.style.display = 'block';
    // Posisi tooltip dekat kursor atau target
    // Perlu penyesuaian agar tidak keluar layar
    const tooltipRect = itemTooltipElement.getBoundingClientRect();
    let newX = x + 15; // Offset dari kursor/target
    let newY = y + 15;

    if (newX + tooltipRect.width > window.innerWidth) {
      newX = x - tooltipRect.width - 15;
    }
    if (newY + tooltipRect.height > window.innerHeight) {
      newY = y - tooltipRect.height - 15;
    }
    itemTooltipElement.style.left = `${Math.max(0, newX)}px`;
    itemTooltipElement.style.top = `${Math.max(0, newY)}px`;

    setTimeout(() => {
      itemTooltipElement.classList.remove("opacity-0");
    }, 20);
  } else {
    itemTooltipElement.classList.add("opacity-0");
    setTimeout(() => {
      itemTooltipElement.style.display = 'none';
    }, 200); // Durasi transisi opacity
  }
}

// Fungsi untuk Modal Item
export function showItemModal(visible, itemData = null) {
  if (!itemModalOverlayElement || !itemModalContentElement) return;
  if (visible && itemData) {
    if (itemModalTitleElement) itemModalTitleElement.textContent = itemData.modalTitle || "Item Diambil!";
    if (itemModalImageElement) itemModalImageElement.src = itemData.imagePath || "";
    if (itemModalNameElement) itemModalNameElement.textContent = itemData.displayName || "Item Misterius";
    if (itemModalDescriptionElement) itemModalDescriptionElement.textContent = itemData.description || "";

    itemModalOverlayElement.style.display = 'flex';
    itemModalOverlayElement.style.pointerEvents = 'auto';
    setTimeout(() => {
      itemModalOverlayElement.classList.remove("opacity-0");
      itemModalContentElement.classList.remove("opacity-0", "scale-95");
      itemModalContentElement.classList.add("scale-100");
    }, 20);
  } else {
    itemModalOverlayElement.classList.add("opacity-0");
    itemModalContentElement.classList.add("opacity-0", "scale-95");
    itemModalContentElement.classList.remove("scale-100");
    setTimeout(() => {
      itemModalOverlayElement.style.display = 'none';
      itemModalOverlayElement.style.pointerEvents = 'none';
    }, 300); // Durasi transisi opacity
  }
}

// Helper untuk mendapatkan tombol close modal
export function getItemModalCloseButtonElement() {
    return itemModalCloseButton;
}
