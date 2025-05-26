import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

let scene, camera, renderer;
let orbitControls, pointerLockControls;
let model;
let clock = new THREE.Clock();

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let moveUp = false;
let moveDown = false;

// --- PERUBAHAN: Tingkatkan kecepatan WASD ---
const moveSpeed = 50.0; // Sebelumnya 10.0, ditingkatkan menjadi 15.0 (sesuaikan jika perlu)

let currentCameraMode = "orbit"; // 'orbit' atau 'pointerlock'

const loadingScreen = document.getElementById("loading-screen");
const progressElement = document.getElementById("progress");

// Variabel untuk material air, dideklarasikan di sini agar tetap ada (meskipun tidak dianimate)
let foggyWaterMaterial;

function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a2a4a); // Warna langit malam yang lebih cerah (biru gelap)
  scene.fog = new THREE.Fog(0x1a2a4a, 50, 200); // Kabut malam sesuai warna background

  // Camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 50, 0); // Atur posisi awal cukup tinggi agar tidak di bawah tanah saat loading
  camera.lookAt(0,0,0);


  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true; // Aktifkan bayangan
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x777799, 0.7); // Cahaya ambient kebiruan/abu-abu, intensitas lebih tinggi
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xeeeeff, 0.8); // Cahaya "bulan" kebiruan terang, intensitas lebih tinggi
  directionalLight.position.set(20, 50, 20); // Sesuaikan posisi bulan
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 200;
  directionalLight.shadow.camera.left = -100;
  directionalLight.shadow.camera.right = 100;
  directionalLight.shadow.camera.top = 100;
  directionalLight.shadow.camera.bottom = -100;
  scene.add(directionalLight);
  // scene.add(new THREE.CameraHelper(directionalLight.shadow.camera)); // Untuk debug bayangan

  // Controls
  setupControls();

  // --- PERUBAHAN: Langsung panggil loadGLTFModel, tidak perlu loadAssets terpisah ---
  loadGLTFModel("assets/main_land.glb");

  // Event Listeners
  window.addEventListener("resize", onWindowResize, false);
  document.addEventListener("keydown", onKeyDown, false);
  document.addEventListener("keyup", onKeyUp, false);
  document.addEventListener("click", () => {
    if (currentCameraMode === "pointerlock" && !pointerLockControls.isLocked) {
      pointerLockControls.lock();
    }
  });
}

function setupControls() {
  // Orbit Controls (Mode Rotasi)
  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.05;
  orbitControls.screenSpacePanning = false;
  orbitControls.minDistance = 5;
  orbitControls.maxDistance = 100;
  orbitControls.maxPolarAngle = Math.PI / 2 - 0.05; // Batasi agar tidak bisa melihat dari bawah
  orbitControls.target.set(0, 2, 0); // Target awal, akan diupdate setelah model dimuat
  orbitControls.enabled = currentCameraMode === "orbit";

  // Pointer Lock Controls (Mode WASD)
  pointerLockControls = new PointerLockControls(camera, document.body);
  scene.add(pointerLockControls.getObject()); // Objek kontrol (kamera) perlu ditambahkan ke scene
  pointerLockControls.enabled = currentCameraMode === "pointerlock";

  pointerLockControls.addEventListener("lock", () => {
    console.log("PointerLock: Locked");
    document.getElementById("info").style.display = "none"; // Sembunyikan info saat terkunci
  });
  pointerLockControls.addEventListener("unlock", () => {
    console.log("PointerLock: Unlocked");
    document.getElementById("info").style.display = "block"; // Tampilkan info saat tidak terkunci
    if (currentCameraMode === "orbit") {
      orbitControls.enabled = true;
    }
  });
}

function loadGLTFModel(path) {
  const loader = new GLTFLoader();
  loader.load(
    path,
    function (gltf) {
      model = gltf.scene;
      model.scale.set(1, 1, 1); // Sesuaikan skala jika perlu
      model.position.set(0, 0, 0); // Sesuaikan posisi jika perlu

      scene.add(model);
      model.updateMatrixWorld(true); // Pastikan matriks dunia diperbarui

      // --- PERUBAHAN: Define the foggy water material di sini lagi ---
      // Material air tanpa normal map
      foggyWaterMaterial = new THREE.MeshStandardMaterial({
          color: 0x4488FF,    // Warna biru yang lebih kuat
          metalness: 0.1,
          roughness: 0.6,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide
      });
      // --- END PERUBAHAN ---

      // Aktifkan bayangan untuk semua mesh dalam model dan terapkan material air
      model.traverse(function (node) {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;

          // Identifikasi dan terapkan material air berdasarkan nama materialnya
          if (node.material && node.material.name === 'water' && foggyWaterMaterial) {
              node.material = foggyWaterMaterial;
              node.castShadow = false;
              node.receiveShadow = false;
          }

          if (node.material && node.material.map) {
            node.material.map.anisotropy =
              renderer.capabilities.getMaxAnisotropy();
          }
        }
      });

      // Atur target OrbitControls dan posisi kamera agar selalu di atas model
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      // Atur target OrbitControls ke tengah model
      orbitControls.target.copy(center);

      // Hitung jarak kamera yang sesuai untuk menampilkan seluruh model
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let distance = Math.abs((maxDim / 2) / Math.tan(fov / 2));
      distance *= 1.5; // Tambahkan margin agar model terlihat penuh

      // Posisikan kamera:
      // X dan Z: sedikit menyamping dari tengah agar pandangan awal lebih baik
      camera.position.x = center.x + distance;
      camera.position.z = center.z + distance;
      // Y: Pastikan kamera berada di atas titik tertinggi model, ditambah offset
      camera.position.y = box.max.y + Math.max(size.y * 0.5, 20); 

      // Arahkan kamera ke tengah model
      camera.lookAt(center);

      // Penting: Update controls agar perubahan posisi dan target kamera diterapkan
      orbitControls.update();

      loadingScreen.style.display = "none";
      animate();
    },
    function (xhr) {
      const percentLoaded = (xhr.loaded / xhr.total) * 100;
      progressElement.textContent = Math.round(percentLoaded);
      console.log(percentLoaded + "% loaded");
    },
    function (error) {
      console.error("Error loading GLTF model:", error);
      loadingScreen.innerHTML = "Gagal memuat model. Cek konsol.";
    }
  );
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
  switch (event.code) {
    case "KeyM":
      toggleCameraMode();
      break;
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
  }
}

function onKeyUp(event) {
  switch (event.code) {
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
  }
}

function toggleCameraMode() {
  if (currentCameraMode === "orbit") {
    currentCameraMode = "pointerlock";
    orbitControls.enabled = false;
    if (pointerLockControls.isLocked) pointerLockControls.unlock();
    console.log("Mode Kamera: PointerLock (WASD)");
  } else {
    currentCameraMode = "orbit";
    if (pointerLockControls.isLocked) {
      pointerLockControls.unlock();
    }
    orbitControls.enabled = true;
    console.log("Mode Kamera: Orbit");
  }
}

function updatePlayerMovement(deltaTime) {
  if (!pointerLockControls.isLocked) return;

  if (moveForward) {
    pointerLockControls.moveForward(moveSpeed * deltaTime);
  }
  if (moveBackward) {
    pointerLockControls.moveForward(-moveSpeed * deltaTime);
  }
  if (moveLeft) {
    pointerLockControls.moveRight(-moveSpeed * deltaTime);
  }
  if (moveRight) {
    pointerLockControls.moveRight(moveSpeed * deltaTime);
  }

  if (moveUp) {
    pointerLockControls.getObject().position.y += moveSpeed * deltaTime;
  }
  if (moveDown) {
    pointerLockControls.getObject().position.y -= moveSpeed * deltaTime;
  }
}

function animate() {
  requestAnimationFrame(animate);
  const deltaTime = clock.getDelta();

  if (currentCameraMode === "orbit") {
    orbitControls.update();
  } else if (currentCameraMode === "pointerlock") {
    updatePlayerMovement(deltaTime);
  }

  renderer.render(scene, camera);
}

// Mulai aplikasi
init();