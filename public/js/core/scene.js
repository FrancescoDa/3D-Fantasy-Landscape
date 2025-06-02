// js/core/scene.js
import * as THREE from "three";

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a2a4a); // Warna langit malam
  // scene.fog = new THREE.Fog(0x1a2a4a, 50, 200); // Kabut malam
  return scene;
}
