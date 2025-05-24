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

const moveSpeed = 10.0;
const lookSpeed = 0.002; // Untuk sensitivitas mouse di mode PointerLock

let currentCameraMode = "orbit"; // 'orbit' atau 'pointerlock'

const loadingScreen = document.getElementById("loading-screen");
const progressElement = document.getElementById("progress");

function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // Warna langit
  scene.fog = new THREE.Fog(0x87ceeb, 50, 200); // Kabut untuk efek kedalaman

  // Camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(10, 10, 10); // Posisi awal kamera

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true; // Aktifkan bayangan
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Cahaya ambient lembut
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2); // Cahaya matahari
  directionalLight.position.set(50, 80, 30);
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

  // Load Model
  loadGLTFModel("assets/main_land.glb"); // Ganti dengan path file Anda

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
  orbitControls.target.set(0, 2, 0); // Arahkan ke tengah model (sesuaikan jika perlu)
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
    // Saat unlock, kita ingin orbit controls mengambil alih jika mode orbit aktif
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

      // Aktifkan bayangan untuk semua mesh dalam model
      model.traverse(function (node) {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          // Perbaiki material jika perlu (misal, normal map yang tidak benar)
          if (node.material && node.material.map) {
            node.material.map.anisotropy =
              renderer.capabilities.getMaxAnisotropy();
          }
        }
      });

      scene.add(model);

      // Atur target OrbitControls ke tengah bounding box model jika belum diset
      if (orbitControls.target.length() === 0) {
        // jika target masih (0,0,0)
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        orbitControls.target.copy(center);
        // Posisikan kamera berdasarkan ukuran model
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs((maxDim / 2) * Math.tan(fov * 2)); // Heuristik
        cameraZ *= 1.5; // Mundur sedikit
        camera.position.z = center.z + cameraZ;
        camera.position.y = center.y + cameraZ / 3;
        camera.position.x = center.x;
        camera.lookAt(center);
      }
      orbitControls.update(); // Penting setelah mengubah target atau posisi kamera

      loadingScreen.style.display = "none"; // Sembunyikan layar loading
      animate(); // Mulai animasi setelah model dimuat
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
    case "KeyM": // Ganti mode kamera
      toggleCameraMode();
      break;
    // Kontrol WASD/QSDZ
    case "KeyW": // Maju (sesuai permintaan)
      moveForward = true;
      break;
    case "KeyA": // Kiri
      moveLeft = true;
      break;
    case "KeyS": // Mundur
      moveBackward = true;
      break;
    case "KeyD": // Kanan
      moveRight = true;
      break;
    case "Space": // Naik
      moveUp = true;
      break;
    case "ShiftLeft": // Turun
    case "ShiftRight":
      moveDown = true;
      break;
  }
}

function onKeyUp(event) {
  switch (event.code) {
    case "KeyWY":
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
    // Tidak perlu mengaktifkan pointerLockControls di sini, akan aktif saat user klik
    if (pointerLockControls.isLocked) pointerLockControls.unlock(); // Unlock dulu jika sedang locked
    document.body.requestPointerLock =
      document.body.requestPointerLock ||
      document.body.mozRequestPointerLock ||
      document.body.webkitRequestPointerLock;
    document.body.requestPointerLock(); // Minta lock
    console.log("Mode Kamera: PointerLock (WASD)");
  } else {
    currentCameraMode = "orbit";
    if (pointerLockControls.isLocked) {
      pointerLockControls.unlock();
    }
    // pointerLockControls.enabled = false; // Tidak perlu, karena lock/unlock event akan menanganinya
    orbitControls.enabled = true;
    console.log("Mode Kamera: Orbit");
  }
}

function updatePlayerMovement(deltaTime) {
  if (!pointerLockControls.isLocked) return; // Hanya bergerak jika pointer terkunci

  const velocity = new THREE.Vector3();
  const direction = new THREE.Vector3();

  // Dapatkan arah hadap kamera
  camera.getWorldDirection(direction);
  direction.y = 0; // Abaikan komponen Y untuk gerakan horizontal
  direction.normalize();

  if (moveForward) {
    velocity.add(direction.clone().multiplyScalar(moveSpeed));
  }
  if (moveBackward) {
    velocity.sub(direction.clone().multiplyScalar(moveSpeed));
  }

  // Untuk gerakan kiri/kanan (strafe)
  const right = new THREE.Vector3();
  right.crossVectors(camera.up, direction).normalize(); // Vektor ke kanan (tegak lurus hadap dan atas)

  if (moveLeft) {
    // PointerLockControls bergerak relatif terhadap kamera, jadi translateX negatif
    pointerLockControls.moveRight(-moveSpeed * deltaTime);
  }
  if (moveRight) {
    pointerLockControls.moveRight(moveSpeed * deltaTime);
  }

  // Untuk gerakan maju/mundur
  if (moveForward) {
    pointerLockControls.moveForward(moveSpeed * deltaTime);
  }
  if (moveBackward) {
    pointerLockControls.moveForward(-moveSpeed * deltaTime);
  }

  // Gerakan Vertikal
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
    orbitControls.update(); // Penting jika enableDamping = true
  } else if (
    currentCameraMode === "pointerlock" &&
    pointerLockControls.isLocked
  ) {
    updatePlayerMovement(deltaTime);
  }

  renderer.render(scene, camera);
}

// Mulai aplikasi
init();
