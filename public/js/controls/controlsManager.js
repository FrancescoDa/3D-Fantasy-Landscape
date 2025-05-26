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
  orbitControlsInstance.target.set(0, 2, 0);
  orbitControlsInstance.enabled = currentCameraMode === "orbit";

  // ... (setup PointerLockControls seperti sebelumnya) ...
  pointerLockControlsInstance = new PointerLockControls(camera, document.body);
  scene.add(pointerLockControlsInstance.getObject());

  pointerLockControlsInstance.addEventListener("lock", () => {
    console.log("PointerLock: Locked");
    toggleInfoPanel(false);
  });
  pointerLockControlsInstance.addEventListener("unlock", () => {
    console.log("PointerLock: Unlocked");
    toggleInfoPanel(true);
    if (currentCameraMode === "orbit") {
      orbitControlsInstance.enabled = true;
    }
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
    orbitControlsInstance.enabled = false;
    console.log("Mode Kamera: PointerLock (WASD). Klik untuk mengunci kursor.");
  } else {
    currentCameraMode = "orbit";
    if (pointerLockControlsInstance.isLocked) {
      pointerLockControlsInstance.unlock();
    }
    orbitControlsInstance.enabled = true;
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
