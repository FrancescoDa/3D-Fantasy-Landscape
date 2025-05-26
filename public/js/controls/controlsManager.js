// js/controls/controlsManager.js
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { toggleInfoPanel } from "../utils/uiHelper.js";
// --- NEW IMPORT ---
import {
  createShot,
  canShoot,
  setFireKeyPressed,
} from "../gameplay/shooting.js";

const moveSpeed = 40.0;
let currentCameraMode = "orbit"; // 'orbit' atau 'pointerlock'

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let moveUp = false;
let moveDown = false;

// ... (variabel moveSpeed, currentCameraMode, move flags tetap sama) ...
let orbitControlsInstance, pointerLockControlsInstance;
// --- Variabel camera dan scene akan di-pass dan disimpan ---
let managedCamera, managedScene;

// --- NEW: Variabel untuk menyimpan state OrbitControls saat di PointerLock ---
let lastOrbitTarget = new THREE.Vector3();
let lastOrbitPosition = new THREE.Vector3(); // Bisa juga hanya menyimpan target dan mengandalkan posisi saat ini
let wasInPointerLockMode = false; // Flag untuk menandai transisi

export function setupControls(camera, rendererDomElement, scene) {
  managedCamera = camera; // Simpan referensi kamera
  managedScene = scene; // Simpan referensi scene

  // ... (setup OrbitControls seperti sebelumnya) ...
  orbitControlsInstance = new OrbitControls(camera, rendererDomElement);
  orbitControlsInstance.enableDamping = true;
  orbitControlsInstance.dampingFactor = 0.05;
  orbitControlsInstance.screenSpacePanning = false;
  orbitControlsInstance.minDistance = 5;
  orbitControlsInstance.maxDistance = 100;
  orbitControlsInstance.maxPolarAngle = Math.PI / 2 - 0.05;
  orbitControlsInstance.target.set(0, 2, 0); // Set target awal
  lastOrbitTarget.copy(orbitControlsInstance.target); // Simpan target awal
  lastOrbitPosition.copy(camera.position); // Simpan posisi awal
  orbitControlsInstance.enabled = currentCameraMode === "orbit";

  // ... (setup PointerLockControls seperti sebelumnya) ...
  pointerLockControlsInstance = new PointerLockControls(camera, document.body);
  scene.add(pointerLockControlsInstance.getObject());

  pointerLockControlsInstance.addEventListener("lock", () => {
    console.log("PointerLock: Locked");
    toggleInfoPanel(false);

    // --- NEW: Saat masuk PointerLock, simpan state OrbitControls ---
    if (orbitControlsInstance.enabled) {
      // Jika sebelumnya orbit aktif
      lastOrbitTarget.copy(orbitControlsInstance.target);
      lastOrbitPosition.copy(managedCamera.position); // Simpan posisi kamera saat ini
    }
    wasInPointerLockMode = true;
  });

  pointerLockControlsInstance.addEventListener("unlock", () => {
    console.log("PointerLock: Unlocked");
    toggleInfoPanel(true);
    if (currentCameraMode === "orbit") {
      if (wasInPointerLockMode) {
        // Atur target OrbitControls ke posisi pemain saat ini (atau sedikit di depannya)
        // Opsi 1: Jadikan posisi pemain sebagai target baru
        // orbitControlsInstance.target.copy(managedCamera.position);
        // Ini akan membuat kamera "terpaku" pada pemain dan tidak bisa di-pan jauh.

        // Opsi 2: Jadikan titik di depan pemain sebagai target (lebih alami untuk orbit)
        const lookDirection = new THREE.Vector3();
        managedCamera.getWorldDirection(lookDirection);
        // Atur target sedikit di depan posisi kamera saat ini, di ground level
        const newTarget = managedCamera.position
          .clone()
          .add(lookDirection.multiplyScalar(10)); // Jarak 10 unit di depan
        newTarget.y = managedCamera.position.y - 2; // Asumsi ground adalah 2 unit di bawah mata pemain
        // Atau, jika Anda punya cara untuk mendeteksi ground, gunakan itu.
        // Untuk sederhana, kita bisa gunakan posisi terakhir orbit target jika pemain tidak banyak bergerak vertikal.
        // orbitControlsInstance.target.set(managedCamera.position.x, lastOrbitTarget.y, managedCamera.position.z);

        // Opsi yang lebih baik: Gunakan posisi kamera saat ini dan target yang disimpan/dihitung
        // Kamera sudah di posisi yang benar karena kita tidak mengubahnya.
        // Kita hanya perlu memastikan target OrbitControls masuk akal.
        // Cara paling sederhana adalah mengembalikan target ke posisi terakhirnya SEBELUM masuk mode pointer lock
        // atau hitung target baru berdasarkan posisi kamera saat ini.

        // Pendekatan yang paling mulus:
        // 1. Kamera sudah di posisi yang benar.
        // 2. OrbitControls akan mengorbit di sekitar targetnya.
        // Kita ingin targetnya berada di "sekitar" pemain.
        // Mungkin target terbaik adalah posisi pemain di ground.
        const playerPositionOnGround = managedCamera.position.clone();
        // Asumsikan tinggi pemain, atau jika Anda punya ground level, gunakan itu.
        // Jika kamera.position.y adalah tinggi mata, kurangi itu untuk mendapatkan ground.
        // Misalnya, jika mata pemain 2 unit di atas kaki:
        playerPositionOnGround.y -= 2; // Sesuaikan ini dengan tinggi "mata" pemain Anda
        orbitControlsInstance.target.copy(playerPositionOnGround);
      }

      orbitControlsInstance.enabled = true;

      orbitControlsInstance.update();
    }
    wasInPointerLockMode = false; 
  });

  document.addEventListener("keydown", onKeyDown, false);
  document.addEventListener("keyup", onKeyUp, false);
  document.addEventListener("click", () => {
    if (
      currentCameraMode === "pointerlock" &&
      !pointerLockControlsInstance.isLocked
    ) {
      pointerLockControlsInstance.lock();
    }
  });

  return {
    orbitControls: orbitControlsInstance,
    pointerLockControls: pointerLockControlsInstance,
  };
}

// ... (getCurrentCameraMode tetap sama) ...
export function getCurrentCameraMode() {
  return currentCameraMode;
}

function onKeyDown(event) {
  switch (event.code) {
    case "KeyM":
      toggleCameraModeInternal();
      break;
    // ... (case W, A, S, D, Space, Shift tetap sama) ...
    case "KeyW":
      moveForward = true;
      break;
    case "KeyA":
      moveLeft = true;
      break;
    case "KeyS":
      moveBackward = true;
      break;
    case "KeyD":
      moveRight = true;
      break;
    case "Space":
      moveUp = true;
      break;
    case "ShiftLeft":
    case "ShiftRight":
      moveDown = true;
      break;

    // --- MODIFIED/NEW CASE ---
    case "KeyR":
      if (
        currentCameraMode === "pointerlock" &&
        pointerLockControlsInstance.isLocked &&
        canShoot()
      ) {
        createShot(managedCamera, managedScene); // Pass camera dan scene
      }
      break;
    // --- END MODIFIED/NEW CASE ---
  }
}

function onKeyUp(event) {
  switch (event.code) {
    // ... (case W, A, S, D, Space, Shift tetap sama) ...
    case "KeyW":
      moveForward = false;
      break;
    case "KeyA":
      moveLeft = false;
      break;
    case "KeyS":
      moveBackward = false;
      break;
    case "KeyD":
      moveRight = false;
      break;
    case "Space":
      moveUp = false;
      break;
    case "ShiftLeft":
    case "ShiftRight":
      moveDown = false;
      break;

    // --- NEW CASE ---
    case "KeyR":
      setFireKeyPressed(false); // Reset flag di modul shooting
      break;
    // --- END NEW CASE ---
  }
}

// ... (toggleCameraModeInternal tetap sama) ...
function toggleCameraModeInternal() {
  if (currentCameraMode === "orbit") {
    currentCameraMode = "pointerlock";

    if (orbitControlsInstance.enabled) { // Jika orbit sedang aktif
        lastOrbitTarget.copy(orbitControlsInstance.target);
        lastOrbitPosition.copy(managedCamera.position);
    }

    orbitControlsInstance.enabled = false;
    wasInPointerLockMode = true;
    console.log("Mode Kamera: PointerLock (WASD). Klik untuk mengunci kursor.");
  } else {
    currentCameraMode = "orbit";
    if (pointerLockControlsInstance.isLocked) {
      pointerLockControlsInstance.unlock();
    } else {
      // Jika tidak terkunci tapi tetap beralih ke orbit
      if (wasInPointerLockMode) {
        const playerPositionOnGround = managedCamera.position.clone();
        playerPositionOnGround.y -= 2; // Sesuaikan
        orbitControlsInstance.target.copy(playerPositionOnGround);
      }
      orbitControlsInstance.enabled = true;
      orbitControlsInstance.update();
      wasInPointerLockMode = false;
    }
    console.log("Mode Kamera: Orbit");
  }
}

// ... (updateControls dan updatePlayerMovement tetap sama) ...
export function updateControls(deltaTime) {
  if (currentCameraMode === "orbit" && orbitControlsInstance.enabled) {
    orbitControlsInstance.update();
  } else if (
    currentCameraMode === "pointerlock" &&
    pointerLockControlsInstance.isLocked
  ) {
    updatePlayerMovement(deltaTime);
  }
}

function updatePlayerMovement(deltaTime) {
  if (!pointerLockControlsInstance.isLocked) return;

  const plcObject = pointerLockControlsInstance.getObject(); // Cache objek kamera

  if (moveForward)
    pointerLockControlsInstance.moveForward(moveSpeed * deltaTime);
  if (moveBackward)
    pointerLockControlsInstance.moveForward(-moveSpeed * deltaTime);
  if (moveLeft) pointerLockControlsInstance.moveRight(-moveSpeed * deltaTime);
  if (moveRight) pointerLockControlsInstance.moveRight(moveSpeed * deltaTime);
  if (moveUp) plcObject.position.y += moveSpeed * deltaTime;
  if (moveDown) plcObject.position.y -= moveSpeed * deltaTime;
}

// ... (getOrbitControls dan getPointerLockControls tetap sama) ...
export function getOrbitControls() {
  return orbitControlsInstance;
}
export function getPointerLockControls() {
  return pointerLockControlsInstance;
}
