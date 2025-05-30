// js/main.js
import * as THREE from "three";
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { createScene } from "./core/scene.js";
import { createCamera } from "./core/camera.js";
import { createRenderer, handleWindowResize } from "./core/renderer.js";
import { setupLighting } from "./core/lighting.js";
import {
  setupControls,
  updateControls,
  getCurrentCameraMode,
  // ... (impor lainnya)
} from "./controls/controlsManager.js";
import { loadGLTFModel } from "./loaders/modelLoader.js";
import { updateShots } from "./gameplay/shooting.js";
import {
  showLoadingScreen,
  hidePlayMenuScreen,
  showPlayMenuScreen,
  toggleInfoPanel,
} from "./utils/uiHelper.js";

let scene, camera, renderer;
let orbitControlsRef, pointerLockControlsRef;
let gameModel;
const clock = new THREE.Clock();

let composer;

// --- NEW: Variabel untuk barel yang melayang ---
let floatingBarrel = null; // Akan menyimpan referensi ke mesh Land_barrel
const FLOATING_AMPLITUDE = 0.5; // Seberapa tinggi barel melayang (dalam unit Three.js)
const FLOATING_FREQUENCY = 2;   // Seberapa cepat barel melayang (nilai lebih besar = lebih cepat)
// --- END NEW ---


function initializeThreeJS() {
  scene = createScene();
  camera = createCamera();
  renderer = createRenderer();
  setupLighting(scene);

  const controls = setupControls(camera, renderer.domElement, scene);
  orbitControlsRef = controls.orbitControls;
  pointerLockControlsRef = controls.pointerLockControls;

  // Event listener untuk resize window
  window.addEventListener("resize", () => {
    if (camera && renderer && composer) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight); // Update composer size
    }
  });


  // --- NEW: Setup Post-processing Composer ---
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5, // strength
    0.4, // radius
    0.85 // threshold
  );
  composer.addPass(bloomPass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);
  // --- END NEW ---

  animate(); // Mulai loop animasi setelah dasar-dasar siap
}

function startGame() {
  hidePlayMenuScreen();
  showLoadingScreen();

  if (!orbitControlsRef) {
    console.error("OrbitControls belum diinisialisasi sebelum memuat model!");
  }

  loadGLTFModel(
    "assets/new/main_land.glb", // GANTI DENGAN PATH MODEL ANDA
    scene,
    camera,
    orbitControlsRef,
    renderer,
    (loadedModel) => {
      gameModel = loadedModel;
      console.log("Model Mystica dimuat!");

      // --- NEW: Cari dan simpan Land_barrel ---
      floatingBarrel = gameModel.getObjectByName("Land_barrel");
      if (floatingBarrel) {
        // Simpan posisi Y awal barel untuk perhitungan gerakan
        floatingBarrel.initialY = floatingBarrel.position.y;
        console.log("Land_barrel ditemukan dan siap melayang!");
      } else {
        console.warn("Land_barrel mesh tidak ditemukan dalam model. Pastikan namanya benar.");
      }
      // --- END NEW ---

      if (getCurrentCameraMode() === "orbit") {
        toggleInfoPanel(true);
      } else {
        toggleInfoPanel(false);
      }
    }
  );
}

function animate() {
  requestAnimationFrame(animate);
  const deltaTime = clock.getDelta();
  const elapsedTime = clock.getElapsedTime(); // Dapatkan waktu yang berlalu dari clock

  updateControls(deltaTime);
  updateShots(deltaTime, scene);

  // --- NEW: Animasi melayang untuk Land_barrel ---
  if (floatingBarrel) {
    // Gunakan Math.sin untuk gerakan naik-turun yang halus
    // elapsedTime * FLOATING_FREQUENCY mengontrol kecepatan siklus
    // Hasil Math.sin dikalikan FLOATING_AMPLITUDE untuk mengontrol tinggi gerakan
    // Ditambahkan ke floatingBarrel.initialY agar gerakan berpusat pada posisi awal
    floatingBarrel.position.y = floatingBarrel.initialY + Math.sin(elapsedTime * FLOATING_FREQUENCY) * FLOATING_AMPLITUDE;
  }
  // --- END NEW ---

  if (renderer && scene && camera && composer) {
    composer.render(); // Render menggunakan composer, bukan langsung renderer
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const playButton = document.getElementById("play-button");

  showPlayMenuScreen();
  toggleInfoPanel(false);

  if (playButton) {
    playButton.addEventListener("click", () => {
      if (!renderer) {
        initializeThreeJS();
      }
      startGame();
    });
  } else {
    console.error("Tombol Play (#play-button) tidak ditemukan!");
    document.body.innerHTML =
      "<p style='color:white; text-align:center; margin-top: 50px;'>Error: Tombol Play tidak ditemukan. Gagal memulai aplikasi.</p>";
  }
});