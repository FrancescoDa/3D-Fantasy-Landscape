// js/controls/controlsManager.js
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { toggleInfoPanel } from "../utils/uiHelper.js";
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

let orbitControlsInstance, pointerLockControlsInstance;
let managedCamera, managedScene;

let lastOrbitTarget = new THREE.Vector3();
let lastOrbitPosition = new THREE.Vector3();
let wasInPointerLockMode = false;

export function setupControls(camera, rendererDomElement, scene) {
  managedCamera = camera;
  managedScene = scene;

  orbitControlsInstance = new OrbitControls(camera, rendererDomElement);
  orbitControlsInstance.enableDamping = true;
  orbitControlsInstance.dampingFactor = 0.05;
  orbitControlsInstance.screenSpacePanning = false;
  orbitControlsInstance.minDistance = 1;                      // Kurangi minDistance agar bisa lebih dekat
  orbitControlsInstance.maxDistance = 200;                    // Tingkatkan maxDistance
  orbitControlsInstance.maxPolarAngle = Math.PI / 2 - 0.01;   // Sedikit di atas horizontal
  orbitControlsInstance.target.set(0, 2, 0);
  lastOrbitTarget.copy(orbitControlsInstance.target);
  lastOrbitPosition.copy(camera.position);
  orbitControlsInstance.enabled = currentCameraMode === "orbit";

  pointerLockControlsInstance = new PointerLockControls(camera, document.body);
  // Jangan tambahkan getObject() ke scene di sini jika Anda ingin kamera global
  // scene.add(pointerLockControlsInstance.getObject());

  pointerLockControlsInstance.addEventListener("lock", () => {
    console.log("PointerLock: Locked");
    if (typeof toggleInfoPanel === "function") toggleInfoPanel(false);

    if (currentCameraMode === "pointerlock" && orbitControlsInstance && orbitControlsInstance.enabled) {
        // Simpan state orbit hanya jika beralih DARI orbit KE pointerlock
        lastOrbitTarget.copy(orbitControlsInstance.target);
        lastOrbitPosition.copy(managedCamera.position);
    }
    wasInPointerLockMode = true; // Tandai bahwa kita pernah masuk mode pointer lock
  });

  pointerLockControlsInstance.addEventListener("unlock", () => {
    console.log("PointerLock: Unlocked");
    // Hanya tampilkan info dan aktifkan orbit jika mode saat ini memang orbit
    if (currentCameraMode === "orbit") {
        if (typeof toggleInfoPanel === "function") toggleInfoPanel(true);
        if (orbitControlsInstance) {
            // Tidak perlu lagi restore state orbit yang kompleks di sini,
            // karena setCameraMode akan menanganinya.
            orbitControlsInstance.enabled = true;
            orbitControlsInstance.update(); // Penting setelah mengaktifkan kembali
        }
    }
    // wasInPointerLockMode tidak direset di sini, biarkan toggleCameraModeInternal yg urus
  });

  document.addEventListener("keydown", onKeyDown, false);
  document.addEventListener("keyup", onKeyUp, false);
  document.addEventListener("click", () => {
    if (
      currentCameraMode === "pointerlock" &&
      pointerLockControlsInstance && // Pastikan instance ada
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

export function getCurrentCameraMode() {
  return currentCameraMode;
}

// --- FUNGSI BARU YANG PERLU DIEKSPOR ---
export function disableControls() {
  if (orbitControlsInstance) {
    orbitControlsInstance.enabled = false;
  }
  if (pointerLockControlsInstance) {
    if (pointerLockControlsInstance.isLocked) {
      pointerLockControlsInstance.unlock();
    }
    // Untuk PointerLockControls, 'enabled' tidak ada. Kita hanya mengontrol lock/unlock.
    // Untuk menonaktifkannya sepenuhnya agar tidak bisa lock, kita bisa remove event listener click
    // tapi untuk sekarang, unlock saja sudah cukup.
  }
  console.log("Controls disabled");
}

export function enableOrbitControls() {
  if (pointerLockControlsInstance && pointerLockControlsInstance.isLocked) {
    pointerLockControlsInstance.unlock();
  }
  if (orbitControlsInstance) {
    // Jika sebelumnya dalam mode pointer lock dan ada state yang disimpan
    if (wasInPointerLockMode && managedCamera) {
        // Kembalikan posisi dan target kamera dari state pointer lock sebelumnya
        // Untuk sederhana, kita bisa set target ke depan kamera saat ini
        const lookDirection = new THREE.Vector3();
        managedCamera.getWorldDirection(lookDirection);
        const newTarget = managedCamera.position.clone().add(lookDirection.multiplyScalar(10));
        newTarget.y = Math.max(0, managedCamera.position.y - 2); // Target di ground, tidak di bawah 0
        orbitControlsInstance.target.copy(newTarget);
        // orbitControlsInstance.position.copy(lastOrbitPosition); // Jika ingin restore posisi juga
    }
    orbitControlsInstance.enabled = true;
    orbitControlsInstance.update(); // Update setelah mengaktifkan
  }
  currentCameraMode = "orbit";
  if (typeof toggleInfoPanel === "function") toggleInfoPanel(true);
  console.log("OrbitControls enabled");
  wasInPointerLockMode = false; // Reset flag setelah berhasil switch ke orbit
}

export function enablePointerLockControls() {
  if (orbitControlsInstance) {
    // Simpan state orbit controls sebelum dinonaktifkan jika belum disimpan
    if (orbitControlsInstance.enabled) {
        lastOrbitTarget.copy(orbitControlsInstance.target);
        lastOrbitPosition.copy(managedCamera.position);
    }
    orbitControlsInstance.enabled = false;
  }
  // PointerLockControls tidak punya properti 'enabled'.
  // Kita akan mengandalkan event 'click' untuk me-lock.
  currentCameraMode = "pointerlock";
  if (typeof toggleInfoPanel === "function") toggleInfoPanel(false);
  console.log("PointerLockControls enabled (klik untuk lock)");
  // Tidak perlu memanggil lock() di sini, biarkan user yang klik
}

export function setCameraMode(mode) {
  if (mode === "orbit") {
    enableOrbitControls();
  } else if (mode === "pointerlock") {
    enablePointerLockControls();
  } else {
    console.warn("Mode kamera tidak dikenal:", mode);
    disableControls(); // Fallback, nonaktifkan semua jika mode tidak dikenal
  }
}
// --- AKHIR FUNGSI BARU ---


function onKeyDown(event) {
  switch (event.code) {
    case "KeyM":
      toggleCameraModeInternal();
      break;
    case "KeyW": moveForward = true; break;
    case "KeyA": moveLeft = true; break;
    case "KeyS": moveBackward = true; break;
    case "KeyD": moveRight = true; break;
    case "Space": moveUp = true; break;
    case "ShiftLeft": case "ShiftRight": moveDown = true; break;
    case "KeyR":
      if (currentCameraMode === "pointerlock" && pointerLockControlsInstance && pointerLockControlsInstance.isLocked && canShoot()) {
        createShot(managedCamera, managedScene);
      }
      break;
  }
}

function onKeyUp(event) {
  switch (event.code) {
    case "KeyW": moveForward = false; break;
    case "KeyA": moveLeft = false; break;
    case "KeyS": moveBackward = false; break;
    case "KeyD": moveRight = false; break;
    case "Space": moveUp = false; break;
    case "ShiftLeft": case "ShiftRight": moveDown = false; break;
    case "KeyR": setFireKeyPressed(false); break;
  }
}

function toggleCameraModeInternal() {
  if (currentCameraMode === "orbit") {
    setCameraMode("pointerlock"); // Gunakan fungsi setCameraMode
  } else {
    setCameraMode("orbit"); // Gunakan fungsi setCameraMode
  }
}

export function updateControls(deltaTime) {
  if (currentCameraMode === "orbit" && orbitControlsInstance && orbitControlsInstance.enabled) {
    orbitControlsInstance.update();
  } else if (currentCameraMode === "pointerlock" && pointerLockControlsInstance && pointerLockControlsInstance.isLocked) {
    updatePlayerMovement(deltaTime);
  }
}

function updatePlayerMovement(deltaTime) {
  if (!pointerLockControlsInstance || !pointerLockControlsInstance.isLocked) return;

  // PointerLockControls menggerakkan kamera itu sendiri, bukan getObject() jika kamera global
  // const plcObject = pointerLockControlsInstance.getObject();

  if (moveForward) pointerLockControlsInstance.moveForward(moveSpeed * deltaTime);
  if (moveBackward) pointerLockControlsInstance.moveForward(-moveSpeed * deltaTime);
  if (moveLeft) pointerLockControlsInstance.moveRight(-moveSpeed * deltaTime);
  if (moveRight) pointerLockControlsInstance.moveRight(moveSpeed * deltaTime);

  // Untuk pergerakan atas/bawah, kita modifikasi posisi y dari kamera langsung
  if (moveUp) managedCamera.position.y += moveSpeed * deltaTime;
  if (moveDown) managedCamera.position.y -= moveSpeed * deltaTime;
}

export function getOrbitControls() {
  return orbitControlsInstance;
}
export function getPointerLockControls() {
  return pointerLockControlsInstance;
}

export function enableCurrentCameraModeControls() {
  if (currentCameraMode === 'orbit') {
    enableOrbitControls();
  } else if (currentCameraMode === 'pointerlock') {
    enablePointerLockControls();
    // Mungkin perlu lock otomatis jika pengguna menginginkannya setelah dialog
    // if (pointerLockControlsInstance && !pointerLockControlsInstance.isLocked) {
    //   pointerLockControlsInstance.lock();
    // }
  }
}



// // js/controls/controlsManager.js
// import * as THREE from "three";
// import { OrbitControls } from "three/addons/controls/OrbitControls.js";
// import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
// import { toggleInfoPanel } from "../utils/uiHelper.js";
// import {
//   createShot,
//   canShoot,
//   setFireKeyPressed,
// } from "../gameplay/shooting.js";

// const moveSpeed = 40.0;
// let currentCameraMode = "orbit"; // 'orbit' atau 'pointerlock'

// let moveForward = false;
// let moveBackward = false;
// let moveLeft = false;
// let moveRight = false;
// let moveUp = false;
// let moveDown = false;

// // ... (variabel moveSpeed, currentCameraMode, move flags tetap sama) ...
// let orbitControlsInstance, pointerLockControlsInstance;
// // --- Variabel camera dan scene akan di-pass dan disimpan ---
// let managedCamera, managedScene;

// // --- NEW: Variabel untuk menyimpan state OrbitControls saat di PointerLock ---
// let lastOrbitTarget = new THREE.Vector3();
// let lastOrbitPosition = new THREE.Vector3(); // Bisa juga hanya menyimpan target dan mengandalkan posisi saat ini
// let wasInPointerLockMode = false; // Flag untuk menandai transisi

// export function setupControls(camera, rendererDomElement, scene) {
//   managedCamera = camera; // Simpan referensi kamera
//   managedScene = scene; // Simpan referensi scene

//   // ... (setup OrbitControls seperti sebelumnya) ...
//   orbitControlsInstance = new OrbitControls(camera, rendererDomElement);
//   orbitControlsInstance.enableDamping = true;
//   orbitControlsInstance.dampingFactor = 0.05;
//   orbitControlsInstance.screenSpacePanning = false;
//   orbitControlsInstance.minDistance = 5;
//   orbitControlsInstance.maxDistance = 100;
//   orbitControlsInstance.maxPolarAngle = Math.PI / 2 - 0.05;
//   orbitControlsInstance.target.set(0, 2, 0); // Set target awal
//   lastOrbitTarget.copy(orbitControlsInstance.target); // Simpan target awal
//   lastOrbitPosition.copy(camera.position); // Simpan posisi awal
//   orbitControlsInstance.enabled = currentCameraMode === "orbit";

//   // ... (setup PointerLockControls seperti sebelumnya) ...
//   pointerLockControlsInstance = new PointerLockControls(camera, document.body);
//   scene.add(pointerLockControlsInstance.getObject());

//   pointerLockControlsInstance.addEventListener("lock", () => {
//     console.log("PointerLock: Locked");
//     toggleInfoPanel(false);

//     // --- NEW: Saat masuk PointerLock, simpan state OrbitControls ---
//     if (orbitControlsInstance.enabled) {
//       // Jika sebelumnya orbit aktif
//       lastOrbitTarget.copy(orbitControlsInstance.target);
//       lastOrbitPosition.copy(managedCamera.position); // Simpan posisi kamera saat ini
//     }
//     wasInPointerLockMode = true;
//   });

//   pointerLockControlsInstance.addEventListener("unlock", () => {
//     console.log("PointerLock: Unlocked");
//     toggleInfoPanel(true);
//     if (currentCameraMode === "orbit") {
//       if (wasInPointerLockMode) {
//         const lookDirection = new THREE.Vector3();
//         managedCamera.getWorldDirection(lookDirection);
//         // Atur target sedikit di depan posisi kamera saat ini, di ground level
//         const newTarget = managedCamera.position
//           .clone()
//           .add(lookDirection.multiplyScalar(10)); // Jarak 10 unit di depan
//         newTarget.y = managedCamera.position.y - 2; // Asumsi ground adalah 2 unit di bawah mata pemain
//         const playerPositionOnGround = managedCamera.position.clone();
//         // Asumsikan tinggi pemain, atau jika Anda punya ground level, gunakan itu.
//         // Jika kamera.position.y adalah tinggi mata, kurangi itu untuk mendapatkan ground.
//         // Misalnya, jika mata pemain 2 unit di atas kaki:
//         playerPositionOnGround.y -= 2; // Sesuaikan ini dengan tinggi "mata" pemain Anda
//         orbitControlsInstance.target.copy(playerPositionOnGround);
//       }

//       orbitControlsInstance.enabled = true;

//       orbitControlsInstance.update();
//     }
//     wasInPointerLockMode = false; 
//   });

//   document.addEventListener("keydown", onKeyDown, false);
//   document.addEventListener("keyup", onKeyUp, false);
//   document.addEventListener("click", () => {
//     if (
//       currentCameraMode === "pointerlock" &&
//       !pointerLockControlsInstance.isLocked
//     ) {
//       pointerLockControlsInstance.lock();
//     }
//   });

//   return {
//     orbitControls: orbitControlsInstance,
//     pointerLockControls: pointerLockControlsInstance,
//   };
// }

// // ... (getCurrentCameraMode tetap sama) ...
// export function getCurrentCameraMode() {
//   return currentCameraMode;
// }

// function onKeyDown(event) {
//   switch (event.code) {
//     case "KeyM":
//       toggleCameraModeInternal();
//       break;
//     // ... (case W, A, S, D, Space, Shift tetap sama) ...
//     case "KeyW":
//       moveForward = true;
//       break;
//     case "KeyA":
//       moveLeft = true;
//       break;
//     case "KeyS":
//       moveBackward = true;
//       break;
//     case "KeyD":
//       moveRight = true;
//       break;
//     case "Space":
//       moveUp = true;
//       break;
//     case "ShiftLeft":
//     case "ShiftRight":
//       moveDown = true;
//       break;

//     // --- MODIFIED/NEW CASE ---
//     case "KeyR":
//       if (
//         currentCameraMode === "pointerlock" &&
//         pointerLockControlsInstance.isLocked &&
//         canShoot()
//       ) {
//         createShot(managedCamera, managedScene); // Pass camera dan scene
//       }
//       break;
//     // --- END MODIFIED/NEW CASE ---
//   }
// }

// function onKeyUp(event) {
//   switch (event.code) {
//     // ... (case W, A, S, D, Space, Shift tetap sama) ...
//     case "KeyW":
//       moveForward = false;
//       break;
//     case "KeyA":
//       moveLeft = false;
//       break;
//     case "KeyS":
//       moveBackward = false;
//       break;
//     case "KeyD":
//       moveRight = false;
//       break;
//     case "Space":
//       moveUp = false;
//       break;
//     case "ShiftLeft":
//     case "ShiftRight":
//       moveDown = false;
//       break;

//     // --- NEW CASE ---
//     case "KeyR":
//       setFireKeyPressed(false); // Reset flag di modul shooting
//       break;
//     // --- END NEW CASE ---
//   }
// }

// // ... (toggleCameraModeInternal tetap sama) ...
// function toggleCameraModeInternal() {
//   if (currentCameraMode === "orbit") {
//     currentCameraMode = "pointerlock";

//     if (orbitControlsInstance.enabled) { // Jika orbit sedang aktif
//         lastOrbitTarget.copy(orbitControlsInstance.target);
//         lastOrbitPosition.copy(managedCamera.position);
//     }

//     orbitControlsInstance.enabled = false;
//     wasInPointerLockMode = true;
//     console.log("Mode Kamera: PointerLock (WASD). Klik untuk mengunci kursor.");
//   } else {
//     currentCameraMode = "orbit";
//     if (pointerLockControlsInstance.isLocked) {
//       pointerLockControlsInstance.unlock();
//     } else {
//       // Jika tidak terkunci tapi tetap beralih ke orbit
//       if (wasInPointerLockMode) {
//         const playerPositionOnGround = managedCamera.position.clone();
//         playerPositionOnGround.y -= 2; // Sesuaikan
//         orbitControlsInstance.target.copy(playerPositionOnGround);
//       }
//       orbitControlsInstance.enabled = true;
//       orbitControlsInstance.update();
//       wasInPointerLockMode = false;
//     }
//     console.log("Mode Kamera: Orbit");
//   }
// }

// // ... (updateControls dan updatePlayerMovement tetap sama) ...
// export function updateControls(deltaTime) {
//   if (currentCameraMode === "orbit" && orbitControlsInstance.enabled) {
//     orbitControlsInstance.update();
//   } else if (
//     currentCameraMode === "pointerlock" &&
//     pointerLockControlsInstance.isLocked
//   ) {
//     updatePlayerMovement(deltaTime);
//   }
// }

// function updatePlayerMovement(deltaTime) {
//   if (!pointerLockControlsInstance.isLocked) return;

//   const plcObject = pointerLockControlsInstance.getObject(); // Cache objek kamera

//   if (moveForward)
//     pointerLockControlsInstance.moveForward(moveSpeed * deltaTime);
//   if (moveBackward)
//     pointerLockControlsInstance.moveForward(-moveSpeed * deltaTime);
//   if (moveLeft) pointerLockControlsInstance.moveRight(-moveSpeed * deltaTime);
//   if (moveRight) pointerLockControlsInstance.moveRight(moveSpeed * deltaTime);
//   if (moveUp) plcObject.position.y += moveSpeed * deltaTime;
//   if (moveDown) plcObject.position.y -= moveSpeed * deltaTime;
// }

// // ... (getOrbitControls dan getPointerLockControls tetap sama) ...
// export function getOrbitControls() {
//   return orbitControlsInstance;
// }
// export function getPointerLockControls() {
//   return pointerLockControlsInstance;
// }
