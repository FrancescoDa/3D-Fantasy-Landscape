// js/core/lighting.js
import * as THREE from "three";

export function setupLighting(scene) {
  const ambientLight = new THREE.AmbientLight(0x777799, 2.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xeeeeff, 3.8);
  directionalLight.position.set(20, 50, 20);
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
}
