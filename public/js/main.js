// js/main.js
import * as THREE from "three";
import { createScene } from "./core/scene.js";
import { createCamera } from "./core/camera.js";
import { createRenderer, handleWindowResize } from "./core/renderer.js";
import { setupLighting } from "./core/lighting.js";
import {
  setupControls,
  updateControls,
  getOrbitControls,
  getCurrentCameraMode,
} from "./controls/controlsManager.js"; // Impor getCurrentCameraMode
import { loadGLTFModel } from "./loaders/modelLoader.js";
// --- NEW IMPORT ---
import { updateShots } from "./gameplay/shooting.js";

let scene, camera, renderer;
let clock;

function init() {
  scene = createScene();
  camera = createCamera();
  renderer = createRenderer();
  setupLighting(scene);

  // setupControls sekarang juga membutuhkan scene untuk shooting
  setupControls(camera, renderer.domElement, scene);

  clock = new THREE.Clock();

  loadGLTFModel(
    "assets/main_land.glb",
    scene,
    camera,
    getOrbitControls(),
    renderer,
    (model) => {
      console.log("Model loaded and scene is ready!");
      animate();
    }
  );

  window.addEventListener(
    "resize",
    () => handleWindowResize(camera, renderer),
    false
  );
}

function animate() {
  requestAnimationFrame(animate);
  const deltaTime = clock.getDelta();

  updateControls(deltaTime);

  // --- NEW: Update logika tembakan HANYA jika dalam mode pointerlock ---
  if (getCurrentCameraMode() === "pointerlock") {
    updateShots(deltaTime, scene); // Pass scene juga
  }
  // --- END NEW ---

  renderer.render(scene, camera);
}

init();

// import * as THREE from "three";
// import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
// import { OrbitControls } from "three/addons/controls/OrbitControls.js";
// import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

// let scene, camera, renderer;
// let orbitControls, pointerLockControls;
// let model;
// let clock = new THREE.Clock();

// let moveForward = false;
// let moveBackward = false;
// let moveLeft = false;
// let moveRight = false;
// let moveUp = false;
// let moveDown = false;

// const moveSpeed = 15.0; // Kecepatan WASD

// let currentCameraMode = "orbit"; // 'orbit' atau 'pointerlock'

// const loadingScreen = document.getElementById("loading-screen");
// const progressElement = document.getElementById("progress");

// let foggyWaterMaterial; // Variabel untuk material air

// // --- NEW: Variabel untuk efek tembakan cahaya ---
// let fireKeyIsPressed = false; // Untuk mencegah tembakan terus-menerus saat tombol ditahan
// const shots = []; // Array untuk menyimpan semua objek tembakan yang aktif
// const shotSpeed = 100.0; // Kecepatan "peluru" cahaya
// const shotLifetime = 1.0; // Durasi hidup cahaya dalam detik
// const shotLightIntensity = 100; // Intensitas cahaya tembakan
// const shotLightDistance = 100; // Jarak cahaya tembakan menyebar
// const shotVisualSize = 0.2; // Ukuran visual bola cahaya
// const shotColor = 0x0000ff; // Warna biru untuk tembakan
// // --- END NEW ---

// function init() {
//   // Scene
//   scene = new THREE.Scene();
//   scene.background = new THREE.Color(0x1a2a4a); // Warna langit malam yang lebih cerah (biru gelap)
//   scene.fog = new THREE.Fog(0x1a2a4a, 50, 200); // Kabut malam sesuai warna background

//   // Camera
//   camera = new THREE.PerspectiveCamera(
//     75,
//     window.innerWidth / window.innerHeight,
//     0.1,
//     1000
//   );
//   camera.position.set(0, 50, 0); // Atur posisi awal cukup tinggi agar tidak di bawah tanah saat loading
//   camera.lookAt(0,0,0);

//   // Renderer
//   renderer = new THREE.WebGLRenderer({ antialias: true });
//   renderer.setSize(window.innerWidth, window.innerHeight);
//   renderer.shadowMap.enabled = true;
//   renderer.shadowMap.type = THREE.PCFSoftShadowMap;
//   document.body.appendChild(renderer.domElement);

//   // Lighting
//   const ambientLight = new THREE.AmbientLight(0x777799, 0.7);
//   scene.add(ambientLight);

//   const directionalLight = new THREE.DirectionalLight(0xeeeeff, 0.8);
//   directionalLight.position.set(20, 50, 20);
//   directionalLight.castShadow = true;
//   directionalLight.shadow.mapSize.width = 2048;
//   directionalLight.shadow.mapSize.height = 2048;
//   directionalLight.shadow.camera.near = 0.5;
//   directionalLight.shadow.camera.far = 200;
//   directionalLight.shadow.camera.left = -100;
//   directionalLight.shadow.camera.right = 100;
//   directionalLight.shadow.camera.top = 100;
//   directionalLight.shadow.camera.bottom = -100;
//   scene.add(directionalLight);

//   // Controls
//   setupControls();

//   // Load Model
//   loadGLTFModel("assets/main_land.glb");

//   // Event Listeners
//   window.addEventListener("resize", onWindowResize, false);
//   document.addEventListener("keydown", onKeyDown, false);
//   document.addEventListener("keyup", onKeyUp, false);
//   document.addEventListener("click", () => {
//     if (currentCameraMode === "pointerlock" && !pointerLockControls.isLocked) {
//       pointerLockControls.lock();
//     }
//   });
// }

// function setupControls() {
//   // Orbit Controls (Mode Rotasi)
//   orbitControls = new OrbitControls(camera, renderer.domElement);
//   orbitControls.enableDamping = true;
//   orbitControls.dampingFactor = 0.05;
//   orbitControls.screenSpacePanning = false;
//   orbitControls.minDistance = 5;
//   orbitControls.maxDistance = 100;
//   orbitControls.maxPolarAngle = Math.PI / 2 - 0.05; // Batasi agar tidak bisa melihat dari bawah
//   orbitControls.target.set(0, 2, 0); // Target awal, akan diupdate setelah model dimuat
//   orbitControls.enabled = currentCameraMode === "orbit";

//   // Pointer Lock Controls (Mode WASD)
//   pointerLockControls = new PointerLockControls(camera, document.body);
//   scene.add(pointerLockControls.getObject()); // Objek kontrol (kamera) perlu ditambahkan ke scene
//   pointerLockControls.enabled = currentCameraMode === "pointerlock";

//   pointerLockControls.addEventListener("lock", () => {
//     console.log("PointerLock: Locked");
//     document.getElementById("info").style.display = "none"; // Sembunyikan info saat terkunci
//   });
//   pointerLockControls.addEventListener("unlock", () => {
//     console.log("PointerLock: Unlocked");
//     document.getElementById("info").style.display = "block"; // Tampilkan info saat tidak terkunci
//     if (currentCameraMode === "orbit") {
//       orbitControls.enabled = true;
//     }
//   });
// }

// function loadGLTFModel(path) {
//   const loader = new GLTFLoader();
//   loader.load(
//     path,
//     function (gltf) {
//       model = gltf.scene;
//       model.scale.set(1, 1, 1); // Sesuaikan skala jika perlu
//       model.position.set(0, 0, 0); // Sesuaikan posisi jika perlu

//       scene.add(model);
//       model.updateMatrixWorld(true); // Pastikan matriks dunia diperbarui

//       // Material air (biru, tanpa normal map, tanpa aliran)
//       foggyWaterMaterial = new THREE.MeshStandardMaterial({
//           color: 0x4488FF,    // Warna biru yang lebih kuat
//           metalness: 0.1,
//           roughness: 0.6,
//           transparent: true,
//           opacity: 0.7,
//           side: THREE.DoubleSide
//       });

//       // Aktifkan bayangan untuk semua mesh dalam model dan terapkan material air
//       model.traverse(function (node) {
//         if (node.isMesh) {
//           node.castShadow = true;
//           node.receiveShadow = true;

//           // Identifikasi dan terapkan material air berdasarkan nama materialnya
//           if (node.material && node.material.name === 'water' && foggyWaterMaterial) {
//               node.material = foggyWaterMaterial;
//               node.castShadow = false;
//               node.receiveShadow = false;
//           }

//           if (node.material && node.material.map) {
//             node.material.map.anisotropy =
//               renderer.capabilities.getMaxAnisotropy();
//           }
//         }
//       });

//       // Atur target OrbitControls dan posisi kamera agar selalu di atas model
//       const box = new THREE.Box3().setFromObject(model);
//       const center = box.getCenter(new THREE.Vector3());
//       const size = box.getSize(new THREE.Vector3());

//       // Atur target OrbitControls ke tengah model
//       orbitControls.target.copy(center);

//       // Hitung jarak kamera yang sesuai untuk menampilkan seluruh model
//       const maxDim = Math.max(size.x, size.y, size.z);
//       const fov = camera.fov * (Math.PI / 180);
//       let distance = Math.abs((maxDim / 2) / Math.tan(fov / 2));
//       distance *= 1.5; // Tambahkan margin agar model terlihat penuh

//       // Posisikan kamera:
//       // X dan Z: sedikit menyamping dari tengah agar pandangan awal lebih baik
//       camera.position.x = center.x + distance;
//       camera.position.z = center.z + distance;
//       // Y: Pastikan kamera berada di atas titik tertinggi model, ditambah offset
//       camera.position.y = box.max.y + Math.max(size.y * 0.5, 20);

//       // Arahkan kamera ke tengah model
//       camera.lookAt(center);

//       // Penting: Update controls agar perubahan posisi dan target kamera diterapkan
//       orbitControls.update();

//       loadingScreen.style.display = "none";
//       animate();
//     },
//     function (xhr) {
//       const percentLoaded = (xhr.loaded / xhr.total) * 100;
//       progressElement.textContent = Math.round(percentLoaded);
//       console.log(percentLoaded + "% loaded");
//     },
//     function (error) {
//       console.error("Error loading GLTF model:", error);
//       loadingScreen.innerHTML = "Gagal memuat model. Cek konsol.";
//     }
//   );
// }

// function onWindowResize() {
//   camera.aspect = window.innerWidth / window.innerHeight;
//   camera.updateProjectionMatrix();
//   renderer.setSize(window.innerWidth, window.innerHeight);
// }

// function onKeyDown(event) {
//   switch (event.code) {
//     case "KeyM":
//       toggleCameraMode();
//       break;
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
//     // --- NEW: Tombol 'R' untuk menembak cahaya biru ---
//     case "KeyR":
//       // Pastikan dalam mode pointerlock, kursor terkunci, dan tombol belum ditekan
//       if (currentCameraMode === "pointerlock" && !fireKeyIsPressed && pointerLockControls.isLocked) {
//         createBlueShot(); // Panggil fungsi untuk membuat tembakan
//         fireKeyIsPressed = true; // Set flag untuk mencegah spam tembakan
//       }
//       break;
//     // --- END NEW ---
//   }
// }

// function onKeyUp(event) {
//   switch (event.code) {
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
//     // --- NEW: Reset flag saat tombol 'R' dilepas ---
//     case "KeyR":
//       fireKeyIsPressed = false;
//       break;
//     // --- END NEW ---
//   }
// }

// function toggleCameraMode() {
//   if (currentCameraMode === "orbit") {
//     currentCameraMode = "pointerlock";
//     orbitControls.enabled = false;
//     if (pointerLockControls.isLocked) pointerLockControls.unlock();
//     console.log("Mode Kamera: PointerLock (WASD)");
//   } else {
//     currentCameraMode = "orbit";
//     if (pointerLockControls.isLocked) {
//       pointerLockControls.unlock();
//     }
//     orbitControls.enabled = true;
//     console.log("Mode Kamera: Orbit");
//   }
// }

// // --- NEW FUNCTION: Membuat tembakan cahaya biru ---
// function createBlueShot() {
//     const shotOrigin = camera.position.clone(); // Posisi awal tembakan adalah posisi kamera
//     const shotDirection = new THREE.Vector3();
//     camera.getWorldDirection(shotDirection); // Arah tembakan sesuai arah pandang kamera

//     // Buat cahaya PointLight
//     const light = new THREE.PointLight(shotColor, shotLightIntensity, shotLightDistance, 2); // Warna biru, intensitas, jarak, decay
//     light.position.copy(shotOrigin);
//     scene.add(light);

//     // Buat visual bola kecil (representasi "peluru" cahaya)
//     const sphereGeometry = new THREE.SphereGeometry(shotVisualSize, 8, 8); // Ukuran kecil
//     const sphereMaterial = new THREE.MeshBasicMaterial({ color: shotColor }); // Material dasar biru
//     const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
//     sphere.position.copy(shotOrigin);
//     scene.add(sphere);

//     // Simpan objek tembakan ke array untuk dianimasikan dan dihapus
//     shots.push({
//         light: light,
//         sphere: sphere,
//         direction: shotDirection,
//         life: shotLifetime // Durasi hidup
//     });
// }
// // --- END NEW FUNCTION ---

// function updatePlayerMovement(deltaTime) {
//   if (!pointerLockControls.isLocked) return;

//   if (moveForward) {
//     pointerLockControls.moveForward(moveSpeed * deltaTime);
//   }
//   if (moveBackward) {
//     pointerLockControls.moveForward(-moveSpeed * deltaTime);
//   }
//   if (moveLeft) {
//     pointerLockControls.moveRight(-moveSpeed * deltaTime);
//   }
//   if (moveRight) {
//     pointerLockControls.moveRight(moveSpeed * deltaTime);
//   }

//   if (moveUp) {
//     pointerLockControls.getObject().position.y += moveSpeed * deltaTime;
//   }
//   if (moveDown) {
//     pointerLockControls.getObject().position.y -= moveSpeed * deltaTime;
//   }
// }

// function animate() {
//   requestAnimationFrame(animate);
//   const deltaTime = clock.getDelta();

//   if (currentCameraMode === "orbit") {
//     orbitControls.update();
//   } else if (currentCameraMode === "pointerlock") {
//     updatePlayerMovement(deltaTime);

//     // --- NEW: Update dan hapus tembakan cahaya ---
//     for (let i = shots.length - 1; i >= 0; i--) { // Iterasi mundur agar aman saat menghapus elemen
//       const shot = shots[i];

//       // Gerakkan cahaya dan bola ke depan
//       shot.light.position.addScaledVector(shot.direction, shotSpeed * deltaTime);
//       shot.sphere.position.addScaledVector(shot.direction, shotSpeed * deltaTime);

//       // Kurangi durasi hidup
//       shot.life -= deltaTime;

//       // Hapus jika sudah melewati durasi hidup
//       if (shot.life <= 0) {
//         scene.remove(shot.light);
//         scene.remove(shot.sphere);
//         // Penting: Disposisi geometri dan material untuk mencegah memory leak
//         shot.sphere.geometry.dispose();
//         shot.sphere.material.dispose();
//         shots.splice(i, 1); // Hapus dari array
//       }
//     }
//     // --- END NEW ---
//   }

//   renderer.render(scene, camera);
// }

// // Mulai aplikasi
// init();
