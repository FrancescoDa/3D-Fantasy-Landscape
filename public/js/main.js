// js/main.js
import * as THREE from "three";
import * as TWEEN from "tween";
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import {
  loadAndAnimateOpeningScene,
  clearOpeningModel, getOpeningModel,
  isOpeningAnimDone,
  stopOpeningCameraAnimationAndSetFinalState,
  updateOpeningCharactersAnimation
} from "./core/openingSceneManager.js";

import { createScene } from "./core/scene.js";
import { createCamera } from "./core/camera.js";
import { createRenderer } from "./core/renderer.js";
import { setupLighting } from "./core/lighting.js";
import {
  setupControls,
  updateControls,
  disableControls,
  enableOrbitControls,
  enablePointerLockControls,
  getCurrentCameraMode,
  setCameraMode,
  getTakeItemActionStatus,
  resetTakeItemActionStatus,
} from "./controls/controlsManager.js";

import { loadGLTFModel } from "./loaders/modelLoader.js";
import { updateShots } from "./gameplay/shooting.js";
import {
  showLoadingScreen,
  hideLoadingScreen,
  hidePlayMenuScreen,
  showPlayMenuScreen,
  toggleInfoPanel,

  // Fungsi UI baru dari uiHelper.js
  showInteractButton,
  showDialogueBox,
  setDialogueText,
  setDialogueNextButtonText,
  getInteractButtonElement,      // Untuk event listener
  getDialogueNextButtonElement, // Untuk event listener

  // Fungsi tambahan untuk ambil item
  showItemTooltip,
  showItemModal,
  getItemModalCloseButtonElement,
} from "./utils/uiHelper.js";

let scene, camera, renderer, css2dRenderer;
let orbitControlsRef, pointerLockControlsRef;
let gameModel;
let playMenuManuallyShown = false;
const clock = new THREE.Clock();

let composer;
let currentAppState = 'INIT';

// --- Variabel untuk barel yang melayang ---
let barrel = null;
const floatingBarrels = [];
const BARREL_FLOATING_AMPLITUDE = 0.5; // Nama konstanta diubah agar konsisten
const BARREL_FLOATING_FREQUENCY = 2;   // Nama konstanta diubah agar konsisten

// --- Variabel untuk assassin yang melayang dan bercahaya (dari kode sebelumnya) ---
const assassins = [];
const ASSASSIN_PROXIMITY_THRESHOLD = 24;      // Jarak pemain harus sedekat ini untuk mengaktifkan assassin
const ASSASSIN_FLOATING_AMPLITUDE = 2;        // Seberapa tinggi assassin melayang (sesuaikan)
const ASSASSIN_FLOATING_FREQUENCY = 1.8;
const ASSASSIN_LIGHT_COLOR = 0x4B0082;
const ASSASSIN_LIGHT_INTENSITY_ACTIVE = 25;   // Intensitas cahaya saat assassin aktif
const ASSASSIN_LIGHT_DISTANCE = 8;            // Jarak cahaya assassin
const worldPositionVec = new THREE.Vector3(); // Reuse untuk world position checks

// --- Variabel untuk Interaksi Dialog Assassin Cowok ---
const interactiveAssassinsCowok = [];             // Menyimpan data assassin cowok yang bisa diajak bicara
const ASSASSIN_COWOK_INTERACTION_THRESHOLD = 24;  // Jarak untuk memicu tombol "Berinteraksi"
let currentInteractableAssassin = null;           // Assassin yang sedang dalam jangkauan
let isDialogueActive = false;
let currentDialogueTarget = null;                 // Assassin yang dialognya sedang aktif
let currentDialogueLineIndex = 0;

// --- Variabel untuk kendi yang melayang ---
const floatingKendis = [];            // Array untuk menyimpan data kendi
const KENDI_PROXIMITY_THRESHOLD = 24; // Jarak pemain harus sedekat ini (sesuaikan)
const KENDI_FLOATING_AMPLITUDE = 2;   // Seberapa tinggi kendi melayang (sesuaikan)
const KENDI_FLOATING_FREQUENCY = 1.8; // Seberapa cepat kendi melayang (sesuaikan)

// --- Variabel untuk diamond ---
const interactiveDiamonds = [];
const DIAMOND_PROXIMITY_THRESHOLD = 24;
const DIAMOND_FLOAT_HEIGHT = 2;
const DIAMOND_LERP_FACTOR = 0.05;           // Faktor Lerp untuk pergerakan diamond
const DIAMOND_LIGHT_COLOR = 0x8A2BE2;       // BlueViolet, atau bisa pakai ASSASSIN_LIGHT_COLOR
const DIAMOND_LIGHT_INTENSITY_ACTIVE = 30;  // Intensitas cahaya saat diamond aktif
const DIAMOND_LIGHT_DISTANCE = 4;           // Jarak cahaya diamond
const DIAMOND_LIGHT_DECAY = 1.5;            // Decay untuk cahaya diamond

// --- Variabel untuk koeceng ---
const activeKoecengs = [];              // Bisa lebih dari satu koeceng
const KOECENG_PROXIMITY_THRESHOLD = 26; // Jarak aktivasi
const KOECENG_JUMP_HEIGHT = 0.5;        // Ketinggian lompatan
const KOECENG_JUMP_FREQUENCY = 5;       // Seberapa cepat lompat
const KOECENG_RUN_SPEED = 3.0;          // Kecepatan lari (unit per detik)
const KOECENG_MAX_RUN_OFFSET = 12.0;    // Jarak lari maksimum dari posisi awal Z
const KOECENG_LERP_FACTOR = 0.03;       // Faktor Lerp untuk pergerakan koeceng

// --- Variabel untuk Item Keranjang Jamur ---
const collectibleItems = [];          // Array umum untuk semua item yang bisa diambil
const ITEM_PROXIMITY_THRESHOLD = 24;  // Jarak untuk tooltip dan pengambilan
let currentHoveredItem = null;        // Item yang sedang di-hover untuk tooltip
let isModalActive = false;            // Untuk melacak apakah modal item sedang aktif

// --- Variabel untuk teks di atas model ---
const TEXT_OFFSET_Y = 1.5;                        // Seberapa tinggi teks di atas pivot model (sesuaikan)
const TEXT_VISIBILITY_THRESHOLD_MULTIPLIER = 1.2; // Teks muncul sedikit lebih jauh dari aktivasi efek lain

function clearMainGameModelsAndInteractiveObjects(targetScene) {
  if (gameModel) {
    targetScene.remove(gameModel);
    gameModel.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(mat => mat.dispose());
        else child.material.dispose();
      }
      if (child.isCSS2DObject && child.element) child.element.remove();
    });
    gameModel = null;
  }
  assassins.length = 0;
  floatingKendis.length = 0;
  interactiveDiamonds.length = 0;
  activeKoecengs.length = 0;

  const objectsToRemove = [];
  targetScene.traverse(child => {
    if (child.isCSS2DObject && child.element && child.element.parentNode) {
      objectsToRemove.push(child);
    }
  });
  objectsToRemove.forEach(obj => {
    obj.element.remove();
    targetScene.remove(obj);
  });
  console.log("Model Map Utama dan objek interaktif dibersihkan.");
}

// Contoh Data Dialog (bisa dipindah ke file JSON nanti)
const assassinCowokDialogues = {
  // Tambahkan dialog untuk assassin_cowok_3 hingga assassin_cowok_22
  "assassin_cowok_default": [ // Fallback jika nama tidak ditemukan
    "Hmph. Kau lagi.",
    "Jangan buang waktuku kecuali ada yang penting.",
    "Ada apa?",
    "Aku sedang sibuk.",
    "Pergilah!!!"
  ]
};

// Data untuk item (bisa diperluas atau dari file JSON)
const itemsData = {
  "keranjang_jamur": {
    id: "keranjang_jamur_01", // ID unik jika ada beberapa
    displayName: "Jamur & Keranjang Telur",
    tooltipText: "[B] Ambil Jamur & Keranjang Telur",
    imagePath: "assets/img/keranjang_jamur.png", // SESUAI PATH
    description: "Kumpulan jamur segar dan beberapa telur yang baru diambil dari hutan.",
    modalTitle: "Kamu Menemukan:",
    isCollected: false, // Status awal
    modelNameInGLTF: "keranjang_jamur" // Nama mesh di file GLB
  }
  // Tambahkan item lain di sini jika perlu
};

function initializeThreeJS() {
  scene = createScene();
  camera = createCamera();
  renderer = createRenderer();
  setupLighting(scene);

  // --- Inisialisasi CSS2DRenderer ---
  css2dRenderer = new CSS2DRenderer();
  css2dRenderer.setSize(window.innerWidth, window.innerHeight);
  css2dRenderer.domElement.style.position = 'absolute';
  css2dRenderer.domElement.style.top = '0px';
  css2dRenderer.domElement.style.pointerEvents = 'none'; // Agar tidak mengganggu interaksi Three.js
  document.body.appendChild(css2dRenderer.domElement);

  const controls = setupControls(camera, renderer.domElement, scene);
  orbitControlsRef = controls.orbitControls;
  pointerLockControlsRef = controls.pointerLockControls;

  window.addEventListener("resize", () => {
    if (camera && renderer && composer) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
      css2dRenderer.setSize(window.innerWidth, window.innerHeight);
    }
  });

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.8, // strength (sesuaikan jika perlu)
    0.5, // radius (sesuaikan jika perlu)
    0.7  // threshold (sesuaikan jika perlu)
  );
  composer.addPass(bloomPass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  if (typeof disableControls === "function") disableControls();

  currentAppState = 'MENU_OPENING';
  playMenuManuallyShown = false;
  hidePlayMenuScreen();
  loadAndAnimateOpeningScene(scene, camera, renderer, (errorOccurred) => {
    if (errorOccurred) {
      console.warn("Opening scene dimuat dengan error, menu play mungkin bisa ditampilkan dengan 'P'.");
      // Jika error, mungkin langsung izinkan 'P' untuk menampilkan menu,
      // karena isOpeningAnimDone() akan true.
    } else {
      console.log("Animasi intro opening scene selesai (callback dari main.js).");
    }
  });
  animate();
}

// Fungsi untuk membuat label teks (CSS2DObject)
function createTextLabel(text, className = 'model-label') {
  const div = document.createElement('div');
  div.className = className;
  div.textContent = text;
  div.style.visibility = 'hidden'; // Sembunyikan secara default
  // Style dasar, bisa dioverride atau ditambahkan di CSS
  div.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  div.style.color = 'white';
  div.style.padding = '5px 10px';
  div.style.borderRadius = '5px';
  div.style.fontSize = '12px';
  div.style.fontFamily = 'Arial, sans-serif';
  div.style.textAlign = 'center';
  div.style.border = '1px solid rgba(255,255,255,0.3)';

  const label = new CSS2DObject(div);
  return label;
}

function switchToMainGame() {
  if (currentAppState === 'MENU_OPENING' || currentAppState === 'IN_GAME_PAUSED') { // atau state lain yang valid
    loadMainGame();
  }
}

function loadMainGame() {
  currentAppState = 'LOADING_MAIN_GAME';
  hidePlayMenuScreen();
  showLoadingScreen();
  toggleInfoPanel(false);
  if (typeof disableControls === "function") disableControls();

  clearOpeningModel(scene);
  // clearSceneModelsAndInteractiveObjects(scene);

  // Reset posisi kamera untuk game utama
  camera.position.set(0, 5, 15); // Posisi default untuk game
  camera.lookAt(0, 1, 0);
  if (orbitControlsRef) {
    orbitControlsRef.target.set(0, 1, 0); // Sesuaikan target OrbitControls
    orbitControlsRef.update();
  }


  loadGLTFModel(
    "assets/new/main_map_fantasy.glb",
    scene, camera, orbitControlsRef, renderer,
    (loadedModel) => {
      gameModel = loadedModel;
      scene.add(gameModel);
      console.log("Model Map Utama (Mystica) dimuat!");

      // Cari barrel di gameModel"
      const land_barrel_names = [
        "fence_etc", "fire", "hay", "HOuse_etc", "House", "Land_barrel", "land_barrel_1", "land_barrel_2", "land_barrel_3", "land_barrel_4", "land_barrel_5", "Roof_Singles", "Tree_stump", "tree"
      ];
      
      land_barrel_names.forEach(name => {
        barrel = gameModel.getObjectByName(name);
        if (barrel) {
          barrel.initialY = barrel.position.y;
          floatingBarrels.push(barrel);
          console.log(`${name} ditemukan di Map Utama!`);
        } else {
          console.warn(`${name} TIDAK ditemukan di Map Utama.`);
        }
      });

      setupInteractiveObjectsInMainMap(gameModel); // Setup objek interaktif

      currentAppState = 'IN_GAME';
      hideLoadingScreen();
      if (typeof setCameraMode === "function") setCameraMode('orbit'); // Default ke orbit
      else if (orbitControlsRef) orbitControlsRef.enabled = true; // Fallback jika setCameraMode tidak ada

      toggleInfoPanel(true); // Tampilkan info setelah game dimuat

    },
    null, // Progress
    (error) => {
      console.error("Gagal memuat Map Utama:", error);
      hideLoadingScreen();
      // Tampilkan error UI
    }
  );
}

function setupInteractiveObjectsInMainMap(containerModel) {
  // Kosongkan array sebelum mengisi ulang, untuk kasus restart game
  assassins.length = 0;
  floatingKendis.length = 0;
  interactiveDiamonds.length = 0;
  activeKoecengs.length = 0;
  interactiveAssassinsCowok.length = 0;
  collectibleItems.length = 0;

  const processedAssassinNames = new Set();

  containerModel.traverse((child) => {
    if (child.isObject3D) {
      // Assassin Girl
      for (let i = 1; i <= 8; i++) {
        const assassinName = `assassin_girl_${i}`;
        if (child.name === assassinName && !processedAssassinNames.has(assassinName)) { // Tambahkan cek ini
          processedAssassinNames.add(assassinName); // Tandai sebagai sudah diproses
          child.initialY = child.position.y;
          const light = new THREE.PointLight(ASSASSIN_LIGHT_COLOR, 0, ASSASSIN_LIGHT_DISTANCE, 1.5);
          light.position.set(0, 1, 0); child.add(light);
          const label = createTextLabel(`Assassin Girl`);
          label.position.set(0, TEXT_OFFSET_Y, 0); child.add(label);
          assassins.push({ model: child, light: light, label: label, initialY: child.initialY, isActive: false });
          break; // Keluar dari loop i jika nama cocok
        }
      }

      // Assassin Cowok
      for (let i = 1; i <= 22; i++) {
        const assassinName = `assassin_cowok_${i}`;
        if (child.name === assassinName) {
          const dialogueLines = assassinCowokDialogues[assassinName] || assassinCowokDialogues["assassin_cowok_default"];
          const label = createTextLabel(`Assassin Serem`); // Label nama (opsional)
          label.position.set(0, TEXT_OFFSET_Y + 0.8, 0); // Sesuaikan Y offset
          child.add(label); // Tambahkan label ke model assassin
          interactiveAssassinsCowok.push({
            model: child,
            name: assassinName,
            dialogueLines: dialogueLines,
            label: label // Simpan label jika ingin dikontrol visibilitasnya
          });
          console.log(`Assassin ${assassinName} siap untuk interaksi.`);
          break; // Keluar dari loop i setelah ditemukan
        }
      }

      // Kendi Hitam
      if (child.name === "kendi_hitam") {
        child.initialY = child.position.y;
        const label = createTextLabel('Kendi Hitam Ajaib');
        label.position.set(0, TEXT_OFFSET_Y, 0); child.add(label);
        floatingKendis.push({ model: child, label: label, initialY: child.initialY, isActive: false });
      }

      // Diamond
      if (child.name === "diamond") {
        const initialY = child.position.y;
        const initialRotation = new THREE.Euler().copy(child.rotation);
        const diamondLight = new THREE.PointLight(DIAMOND_LIGHT_COLOR, 0, DIAMOND_LIGHT_DISTANCE, DIAMOND_LIGHT_DECAY);
        diamondLight.position.set(0, 0.5, 0); child.add(diamondLight);
        const label = createTextLabel('Diamond Langka');
        label.position.set(0, TEXT_OFFSET_Y, 0); child.add(label);
        interactiveDiamonds.push({ model: child, light: diamondLight, label: label, initialY: initialY, initialRotation: initialRotation, targetY: initialY + DIAMOND_FLOAT_HEIGHT, isActive: false });
      }

      // Koeceng
      if (child.name === "koeceng") {
        const initialPosition = child.position.clone();
        const initialRotation = child.rotation.clone();
        const label = createTextLabel('Koeceng Lincah');
        label.position.set(0, TEXT_OFFSET_Y + 0.5, 0); child.add(label); // Adjust Y for koeceng
        activeKoecengs.push({ model: child, label: label, initialPosition: initialPosition, initialRotation: initialRotation, isActive: false, currentRunOffsetZ: 0 });
      }

      // Setup untuk Item Keranjang Jamur (dan item koleksi lainnya)
      Object.values(itemsData).forEach(itemDef => {
        if (child.name === itemDef.modelNameInGLTF && !itemDef.isCollected) {
          // Jika item belum diambil sebelumnya (misal dari save game, untuk sekarang selalu false)
          const label = createTextLabel(itemDef.displayName); // Label nama (opsional)
          label.position.set(0, TEXT_OFFSET_Y + 0.5, 0); // Sesuaikan Y offset
          // child.add(label); // Label mungkin tidak diperlukan jika ada tooltip

          collectibleItems.push({
            model: child,
            definition: itemDef, // Simpan definisi item lengkap
            label: label,       // Simpan label jika digunakan
            isVisible: true    // Status visibilitas model di scene
          });
          console.log(`Item koleksi "${itemDef.displayName}" (${child.name}) siap.`);
        }
      });
    }
  });
  console.log(`Setup interaktif: ${assassins.length} assassin Girl, ${interactiveAssassinsCowok.length} assassin cowok., ${floatingKendis.length} kendi, ${interactiveDiamonds.length} diamond, ${activeKoecengs.length} koeceng, ${collectibleItems.length} item koleksi ditemukan.`);
}

// --- Fungsi untuk Logika Dialog ---
function startDialogue(assassinData) {
  if (isDialogueActive || !assassinData || !assassinData.dialogueLines.length) return;

  isDialogueActive = true;
  currentDialogueTarget = assassinData;
  currentDialogueLineIndex = 0;

  if (typeof disableControls === "function") disableControls();
  showInteractButton(false); // Sembunyikan tombol "Berinteraksi"
  displayCurrentDialogueLine();
  showDialogueBox(true);
}

function displayCurrentDialogueLine() {
  if (!currentDialogueTarget || !isDialogueActive) return;

  const lines = currentDialogueTarget.dialogueLines;
  if (currentDialogueLineIndex < lines.length) {
    setDialogueText(lines[currentDialogueLineIndex]);
    if (currentDialogueLineIndex === lines.length - 1) {
      setDialogueNextButtonText("Selesai"); // Atau "Tutup", "End"
    } else {
      setDialogueNextButtonText("Next");
    }
  } else {
    // Seharusnya tidak sampai sini jika logika tombol Next benar
    endDialogue();
  }
}

function advanceDialogue() {
  if (!isDialogueActive || !currentDialogueTarget) return;

  currentDialogueLineIndex++;
  const lines = currentDialogueTarget.dialogueLines;
  if (currentDialogueLineIndex < lines.length) {
    displayCurrentDialogueLine();
  } else {
    endDialogue();
  }
}

function endDialogue() {
  isDialogueActive = false;
  showDialogueBox(false);
  currentDialogueTarget = null;
  currentDialogueLineIndex = 0;
  // Aktifkan kembali kontrol setelah sedikit delay agar UI hilang dulu
  setTimeout(() => {
    if (typeof enableCurrentCameraModeControls === "function") {
        enableCurrentCameraModeControls();
    }
  }, 100);
}

// --- Fungsi Baru untuk Logika Item ---
function handleItemInteraction(itemData) {
  if (!itemData || !itemData.model || itemData.definition.isCollected) return;

  console.log(`Mengambil item: ${itemData.definition.displayName}`);
  itemData.definition.isCollected = true; // Tandai sebagai sudah diambil
  itemData.model.visible = false;         // Sembunyikan model dari scene
  itemData.isVisible = false;             // Update status lokal
  currentHoveredItem = null;              // Tidak ada item yang di-hover lagi
  showItemTooltip(false);                 // Sembunyikan tooltip

  // Tampilkan modal
  isModalActive = true;
  if (typeof disableControls === "function") disableControls(); // Nonaktifkan kontrol pemain
  showItemModal(true, itemData.definition);
}

function closeModal() {
  isModalActive = false;
  showItemModal(false);
  // Aktifkan kembali kontrol setelah sedikit delay
  setTimeout(() => {
    if (typeof enableCurrentCameraModeControls === "function") {
      enableCurrentCameraModeControls();
    }
  }, 100);
}

function animate() {
  requestAnimationFrame(animate);
  const deltaTime = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  TWEEN.update(); // Selalu update TWEEN

  if (currentAppState === 'MENU_OPENING') {
    updateOpeningCharactersAnimation(elapsedTime);
    const currentOpeningModel = getOpeningModel();

    if (currentOpeningModel) {
      // openingModel.rotation.y += deltaTime * 0.05; // Contoh animasi kecil di menu
    }
  } else if (currentAppState === 'IN_GAME') {
    if (!isDialogueActive) { // Hanya update kontrol jika tidak ada dialog
        updateControls(deltaTime);
    }
    updateShots(deltaTime, scene);

    const playerPosition = camera.position;

    // Animasi melayang untuk Land_barrel
    floatingBarrels.forEach(barrel => {
      barrel.position.y = barrel.initialY + Math.sin(elapsedTime * BARREL_FLOATING_FREQUENCY) * BARREL_FLOATING_AMPLITUDE;
    });

    // Logika untuk assassin
    assassins.forEach((assassinData) => {
      assassinData.model.getWorldPosition(worldPositionVec);
      const distanceToPlayer = playerPosition.distanceTo(worldPositionVec);
      const isActiveNow = distanceToPlayer < ASSASSIN_PROXIMITY_THRESHOLD;

      if (isActiveNow) {
        if (!assassinData.isActive) {
          assassinData.isActive = true;
          assassinData.light.intensity = ASSASSIN_LIGHT_INTENSITY_ACTIVE;
        }
        const floatOffset = Math.sin(elapsedTime * ASSASSIN_FLOATING_FREQUENCY) * ASSASSIN_FLOATING_AMPLITUDE;
        assassinData.model.position.y = assassinData.initialY + Math.max(0, floatOffset);
      } else {
        if (assassinData.isActive) {
          assassinData.isActive = false;
          assassinData.light.intensity = 0;
          assassinData.model.position.y = assassinData.initialY;
        }
      }
      if (assassinData.label) {
        const labelVisibilityThreshold = ASSASSIN_PROXIMITY_THRESHOLD * TEXT_VISIBILITY_THRESHOLD_MULTIPLIER;
        assassinData.label.element.style.visibility = distanceToPlayer < labelVisibilityThreshold ? 'visible' : 'hidden';
      }
    });

    // Logika untuk Assassin Cowok Interaktif
    let closestInteractableAssassin = null;
    let minDistanceToAssassinCowok = Infinity;

    if (!isDialogueActive) { // Hanya cari target interaksi jika dialog tidak aktif
        interactiveAssassinsCowok.forEach(assassinData => {
            assassinData.model.getWorldPosition(worldPositionVec); // Dapatkan posisi dunia model
            const distanceToPlayer = playerPosition.distanceTo(worldPositionVec);

            // Kontrol visibilitas label nama (jika ada)
            if (assassinData.label) {
                const labelVisibilityThreshold = ASSASSIN_COWOK_INTERACTION_THRESHOLD * TEXT_VISIBILITY_THRESHOLD_MULTIPLIER;
                assassinData.label.element.style.visibility = distanceToPlayer < labelVisibilityThreshold ? 'visible' : 'hidden';
            }

            if (distanceToPlayer < ASSASSIN_COWOK_INTERACTION_THRESHOLD) {
                if (distanceToPlayer < minDistanceToAssassinCowok) {
                    minDistanceToAssassinCowok = distanceToPlayer;
                    closestInteractableAssassin = assassinData;
                }
            }
        });

        if (closestInteractableAssassin) {
            currentInteractableAssassin = closestInteractableAssassin;
            showInteractButton(true, `Berbicara dengan Assassin`);
        } else {
            currentInteractableAssassin = null;
            showInteractButton(false);
        }
    } else {
        // Jika dialog aktif, pastikan tombol interaksi tetap tersembunyi
        showInteractButton(false);
    }

    // Logika untuk kendi yang melayang
    floatingKendis.forEach((kendiData) => {
      kendiData.model.getWorldPosition(worldPositionVec);
      const distanceToPlayer = playerPosition.distanceTo(worldPositionVec);
      const isActiveNow = distanceToPlayer < KENDI_PROXIMITY_THRESHOLD;

      if (isActiveNow) {
        if (!kendiData.isActive) kendiData.isActive = true;
        const floatOffset = Math.sin(elapsedTime * KENDI_FLOATING_FREQUENCY) * KENDI_FLOATING_AMPLITUDE;
        kendiData.model.position.y = kendiData.initialY + Math.max(0, floatOffset);

      } else {
        if (kendiData.isActive) {
          kendiData.isActive = false;
          kendiData.model.position.y = kendiData.initialY;
        }
      }
      if (kendiData.label) {
        const labelVisibilityThreshold = KENDI_PROXIMITY_THRESHOLD * TEXT_VISIBILITY_THRESHOLD_MULTIPLIER;
        kendiData.label.element.style.visibility = distanceToPlayer < labelVisibilityThreshold ? 'visible' : 'hidden';
      }
    });

    // Logika Diamond
    interactiveDiamonds.forEach((diamondData) => {
      diamondData.model.getWorldPosition(worldPositionVec);
      const distanceToPlayer = playerPosition.distanceTo(worldPositionVec);
      const shouldBeActive = distanceToPlayer < DIAMOND_PROXIMITY_THRESHOLD;

      if (shouldBeActive) {
        if (!diamondData.isActive) diamondData.isActive = true;
        diamondData.model.position.y += (diamondData.targetY - diamondData.model.position.y) * DIAMOND_LERP_FACTOR;
        diamondData.light.intensity = DIAMOND_LIGHT_INTENSITY_ACTIVE;
        if (diamondData.label) diamondData.label.element.style.visibility = 'visible';
      } else {
        if (diamondData.isActive || Math.abs(diamondData.model.position.y - diamondData.initialY) > 0.01) {
          diamondData.model.position.y += (diamondData.initialY - diamondData.model.position.y) * DIAMOND_LERP_FACTOR;
          diamondData.light.intensity = 0;
        }
        if (Math.abs(diamondData.model.position.y - diamondData.initialY) < 0.01) {
          if (diamondData.isActive) { // Hanya snap jika tadinya aktif
            diamondData.model.position.y = diamondData.initialY;
            diamondData.model.rotation.copy(diamondData.initialRotation);
            diamondData.light.intensity = 0;
          }
          diamondData.isActive = false;
        }
        if (diamondData.label) diamondData.label.element.style.visibility = 'hidden';
      }
    });

    // KoecengnarrationTexts 
    activeKoecengs.forEach((koecengData) => {
      koecengData.model.getWorldPosition(worldPositionVec);
      const distanceToPlayer = playerPosition.distanceTo(worldPositionVec);
      const shouldBeActive = distanceToPlayer < KOECENG_PROXIMITY_THRESHOLD;

      if (shouldBeActive) {
        if (!koecengData.isActive) koecengData.isActive = true;
        const jumpOffset = Math.sin(elapsedTime * KOECENG_JUMP_FREQUENCY) * KOECENG_JUMP_HEIGHT;
        koecengData.model.position.y = koecengData.initialPosition.y + Math.max(0, jumpOffset);
        // Arah lari (asumsi Z positif model adalah depan)
        const runIncrement = KOECENG_RUN_SPEED * deltaTime;
        if (koecengData.currentRunOffsetZ + runIncrement <= KOECENG_MAX_RUN_OFFSET) {
          // Coba gerakkan ke arah kamera pemain jika ingin kucing "lari ke pemain"
          // Ini lebih kompleks, untuk sekarang kita pakai translateZ
          koecengData.model.translateZ(runIncrement); // Jika Z positif adalah depan model
          koecengData.currentRunOffsetZ += runIncrement;
        }
        if (koecengData.label) koecengData.label.element.style.visibility = 'visible';
      } else {
        if (koecengData.isActive) {
          koecengData.model.position.lerp(koecengData.initialPosition, KOECENG_LERP_FACTOR);
          // koecengData.model.rotation.slerp(koecengData.initialRotation, KOECENG_LERP_FACTOR * 0.5); // Rotasi kembali lebih lambat

          if (koecengData.model.position.distanceTo(koecengData.initialPosition) < 0.1) {
            koecengData.model.position.copy(koecengData.initialPosition);
            koecengData.model.rotation.copy(koecengData.initialRotation);
            koecengData.currentRunOffsetZ = 0;
            koecengData.isActive = false;
          }
        }
        if (koecengData.label) koecengData.label.element.style.visibility = 'hidden';
      }
    });

    // Logika untuk Item Koleksi (Keranjang Jamur, dll.)
    let closestHoverableItem = null;
    let minDistanceToItem = Infinity;

    if (!isDialogueActive && !isModalActive) { // Hanya cek item jika tidak ada UI lain aktif
      collectibleItems.forEach(itemData => {
        // Hanya proses item yang masih visible/belum diambil
        if (itemData.isVisible && itemData.model && itemData.model.visible) {
          itemData.model.getWorldPosition(worldPositionVec);
          const distanceToPlayer = playerPosition.distanceTo(worldPositionVec);

          // Kontrol visibilitas label nama (jika ada dan digunakan)
          if (itemData.label) {
            const labelVisibilityThreshold = ITEM_PROXIMITY_THRESHOLD * TEXT_VISIBILITY_THRESHOLD_MULTIPLIER;
            itemData.label.element.style.visibility = distanceToPlayer < labelVisibilityThreshold ? 'visible' : 'hidden';
          }

          if (distanceToPlayer < ITEM_PROXIMITY_THRESHOLD) {
            if (distanceToPlayer < minDistanceToItem) {
              minDistanceToItem = distanceToPlayer;
              closestHoverableItem = itemData;
            }
          }
        }
      });

      if (closestHoverableItem) {
        currentHoveredItem = closestHoverableItem;
        // Tampilkan tooltip di dekat pemain atau tengah layar
        // Untuk simpel, kita tampilkan di tengah bawah
        const tooltipX = window.innerWidth / 2 - 100; // Perkiraan
        const tooltipY = window.innerHeight - 80;    // Perkiraan
        showItemTooltip(true, currentHoveredItem.definition.tooltipText, tooltipX, tooltipY);

        // Cek apakah tombol "B" ditekan untuk mengambil item
        if (getTakeItemActionStatus()) {
          resetTakeItemActionStatus(); // Penting untuk reset flag
          handleItemInteraction(currentHoveredItem);
        }

      } else {
        currentHoveredItem = null;
        showItemTooltip(false);
        resetTakeItemActionStatus(); // Reset juga jika tidak ada item terdekat
      }
    } else {
        // Jika dialog atau modal aktif, sembunyikan tooltip dan reset flag
        showItemTooltip(false);
        resetTakeItemActionStatus();
    }
  } // Akhir dari 'IN_GAME'

  if (renderer && scene && camera && composer) {
    composer.render();
    if (css2dRenderer) {
      css2dRenderer.render(scene, camera);
    }
  }
}

// Event listener untuk tombol keyboard global
function globalKeyDownHandler(event) {
  if (event.key.toLowerCase() === 'p') {
    if (currentAppState === 'MENU_OPENING' && isOpeningAnimDone() && !playMenuManuallyShown) {
      console.log("Tombol 'P' ditekan, menampilkan Play Menu.");
      // Jika animasi kamera masih berjalan (misalnya user tekan 'P' sebelum selesai), hentikan
      if (TWEEN.getAll().length > 0) {
        stopOpeningCameraAnimationAndSetFinalState(camera); // Hentikan dan snap ke akhir
      }

      showPlayMenuScreen();
      playMenuManuallyShown = true; // Tandai bahwa menu sudah ditampilkan oleh 'P'
    } else if (currentAppState === 'MENU_OPENING' && playMenuManuallyShown) {
      console.log("Menu Play sudah ditampilkan.");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const playButton = document.getElementById("play-button");
  hidePlayMenuScreen();
  toggleInfoPanel(false);

  initializeThreeJS();

  // Event Listener untuk Tombol Tutup Modal Item
  const itemModalCloseBtn = getItemModalCloseButtonElement();
  if (itemModalCloseBtn) {
    itemModalCloseBtn.addEventListener('click', closeModal);
  }

  // Event Listener untuk Tombol "Berinteraksi"
  const interactBtn = getInteractButtonElement();
  if (interactBtn) {
    interactBtn.addEventListener('click', () => {
      if (currentInteractableAssassin && !isDialogueActive) {
        startDialogue(currentInteractableAssassin);
      }
    });
  }

  // Event Listener untuk Tombol "Next" pada Dialog
  const dialogueNextBtn = getDialogueNextButtonElement();
  if (dialogueNextBtn) {
    dialogueNextBtn.addEventListener('click', () => {
      if (isDialogueActive) {
        advanceDialogue();
      }
    });
  }

  if (playButton) {
    playButton.addEventListener("click", switchToMainGame);
  } else {
    console.error("Tombol Play (#play-button) tidak ditemukan!");
  }
  document.addEventListener('keydown', globalKeyDownHandler);
});
























// document.addEventListener("DOMContentLoaded", () => {
//   const playButton = document.getElementById("play-button");

//   showPlayMenuScreen();
//   toggleInfoPanel(false);

//   if (playButton) {
//     playButton.addEventListener("click", () => {
//       if (!renderer) {
//         initializeThreeJS();
//       }
//       startGame();
//     });
//   } else {
//     console.error("Tombol Play (#play-button) tidak ditemukan!");
//     document.body.innerHTML =
//       "<p style='color:white; text-align:center; margin-top: 50px;'>Error: Tombol Play tidak ditemukan. Gagal memulai aplikasi.</p>";
//   }
// });


// // js/main.js
// import * as THREE from "three";
// import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
// import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
// import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
// import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// import { createScene } from "./core/scene.js";
// import { createCamera } from "./core/camera.js";
// import { createRenderer, handleWindowResize } from "./core/renderer.js";
// import { setupLighting } from "./core/lighting.js";
// import {
//   setupControls,
//   updateControls,
//   getCurrentCameraMode,
// } from "./controls/controlsManager.js";
// import { loadGLTFModel } from "./loaders/modelLoader.js";
// import { updateShots } from "./gameplay/shooting.js";
// import {
//   showLoadingScreen,
//   hidePlayMenuScreen,
//   showPlayMenuScreen,
//   toggleInfoPanel,
// } from "./utils/uiHelper.js";

// let scene, camera, renderer;
// let orbitControlsRef, pointerLockControlsRef;
// let gameModel;
// const clock = new THREE.Clock();

// let composer;

// // --- Variabel untuk barel yang melayang ---
// let floatingBarrel = null; // Akan menyimpan referensi ke mesh Land_barrel
// const FLOATING_AMPLITUDE = 0.5; // Seberapa tinggi barel melayang (dalam unit Three.js)
// const FLOATING_FREQUENCY = 2;   // Seberapa cepat barel melayang (nilai lebih besar = lebih cepat)

// function initializeThreeJS() {
//   scene = createScene();
//   camera = createCamera();
//   renderer = createRenderer();
//   setupLighting(scene);

//   const controls = setupControls(camera, renderer.domElement, scene);
//   orbitControlsRef = controls.orbitControls;
//   pointerLockControlsRef = controls.pointerLockControls;

//   // Event listener untuk resize window
//   window.addEventListener("resize", () => {
//     if (camera && renderer && composer) {
//       camera.aspect = window.innerWidth / window.innerHeight;
//       camera.updateProjectionMatrix();
//       renderer.setSize(window.innerWidth, window.innerHeight);
//       composer.setSize(window.innerWidth, window.innerHeight); // Update composer size
//     }
//   });


//   // --- Setup Post-processing Composer ---
//   composer = new EffectComposer(renderer);
//   composer.addPass(new RenderPass(scene, camera));

//   const bloomPass = new UnrealBloomPass(
//     new THREE.Vector2(window.innerWidth, window.innerHeight),
//     1.5, // strength
//     0.4, // radius
//     0.85 // threshold
//   );
//   composer.addPass(bloomPass);

//   const outputPass = new OutputPass();
//   composer.addPass(outputPass);

//   animate(); // Mulai loop animasi setelah dasar-dasar siap
// }

// function startGame() {
//   hidePlayMenuScreen();
//   showLoadingScreen();

//   if (!orbitControlsRef) {
//     console.error("OrbitControls belum diinisialisasi sebelum memuat model!");
//   }

//   loadGLTFModel(
//     "assets/new/main_map_fantasy.glb", // GANTI DENGAN PATH MODEL ANDA
//     scene,
//     camera,
//     orbitControlsRef,
//     renderer,
//     (loadedModel) => {
//       gameModel = loadedModel;
//       console.log("Model Mystica dimuat!");

//       // --- Cari dan simpan Land_barrel ---
//       floatingBarrel = gameModel.getObjectByName("Land_barrel");
//       if (floatingBarrel) {
//         // Simpan posisi Y awal barel untuk perhitungan gerakan
//         floatingBarrel.initialY = floatingBarrel.position.y;
//         console.log("Land_barrel ditemukan dan siap melayang!");
//       } else {
//         console.warn("Land_barrel mesh tidak ditemukan dalam model. Pastikan namanya benar.");
//       }

//       if (getCurrentCameraMode() === "orbit") {
//         toggleInfoPanel(true);
//       } else {
//         toggleInfoPanel(false);
//       }
//     }
//   );
// }

// function animate() {
//   requestAnimationFrame(animate);
//   const deltaTime = clock.getDelta();
//   const elapsedTime = clock.getElapsedTime(); // Dapatkan waktu yang berlalu dari clock

//   updateControls(deltaTime);
//   updateShots(deltaTime, scene);

//   // --- Animasi melayang untuk Land_barrel ---
//   if (floatingBarrel) {
//     floatingBarrel.position.y = floatingBarrel.initialY + Math.sin(elapsedTime * FLOATING_FREQUENCY) * FLOATING_AMPLITUDE;
//   }

//   if (renderer && scene && camera && composer) {
//     composer.render(); // Render menggunakan composer, bukan langsung renderer
//   }
// }

// document.addEventListener("DOMContentLoaded", () => {
//   const playButton = document.getElementById("play-button");

//   showPlayMenuScreen();
//   toggleInfoPanel(false);

//   if (playButton) {
//     playButton.addEventListener("click", () => {
//       if (!renderer) {
//         initializeThreeJS();
//       }
//       startGame();
//     });
//   } else {
//     console.error("Tombol Play (#play-button) tidak ditemukan!");
//     document.body.innerHTML =
//       "<p style='color:white; text-align:center; margin-top: 50px;'>Error: Tombol Play tidak ditemukan. Gagal memulai aplikasi.</p>";
//   }
// });