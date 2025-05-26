// js/loaders/modelLoader.js
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  updateLoadingProgress,
  hideLoadingScreen,
  showLoadingError,
} from "../utils/uiHelper.js";

// Material air bisa didefinisikan di sini atau di-pass sebagai argumen jika perlu kustomisasi lebih lanjut
const foggyWaterMaterial = new THREE.MeshStandardMaterial({
  color: 0x4488ff,
  metalness: 0.1,
  roughness: 0.6,
  transparent: true,
  opacity: 0.7,
  side: THREE.DoubleSide,
});

export function loadGLTFModel(
  path,
  scene,
  camera,
  orbitControls,
  renderer,
  onModelLoadedCallback
) {
  const loader = new GLTFLoader();
  loader.load(
    path,
    function (gltf) {
      const model = gltf.scene;
      model.scale.set(1, 1, 1);
      model.position.set(0, 0, 0);
      scene.add(model);
      model.updateMatrixWorld(true);

      model.traverse(function (node) {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;

          if (node.material && node.material.name === "water") {
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

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      if (orbitControls) {
        orbitControls.target.copy(center);
      }

      // Posisikan kamera:
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let distance = Math.abs(maxDim / 2 / Math.tan(fov / 2));
      distance *= 1.5;

      camera.position.x = center.x + distance;
      camera.position.z = center.z + distance;
      camera.position.y = box.max.y + Math.max(size.y * 0.5, 20);
      camera.lookAt(center);

      if (orbitControls) {
        orbitControls.update();
      }

      hideLoadingScreen();
      if (onModelLoadedCallback) onModelLoadedCallback(model); // Kirim model kembali
    },
    function (xhr) {
      const percentLoaded = (xhr.loaded / xhr.total) * 100;
      updateLoadingProgress(percentLoaded);
      console.log(percentLoaded + "% loaded");
    },
    function (error) {
      console.error("Error loading GLTF model:", error);
      showLoadingError("Gagal memuat model. Cek konsol.");
    }
  );
}
