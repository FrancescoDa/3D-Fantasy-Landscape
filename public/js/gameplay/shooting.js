// js/gameplay/shooting.js
import * as THREE from "three";

const shots = []; // Array untuk menyimpan semua objek tembakan yang aktif
const shotSpeed = 100.0;
const shotLifetime = 1.0;
const shotLightIntensity = 100;
const shotLightDistance = 100;
const shotVisualSize = 0.2;
const shotColor = 0x0000ff; // Biru

let fireKeyIsPressed = false; // Internal state untuk modul ini

export function canShoot() {
  return !fireKeyIsPressed;
}

export function setFireKeyPressed(isPressed) {
  fireKeyIsPressed = isPressed;
}

export function createShot(camera, scene) {
  if (!canShoot()) return; // Seharusnya sudah dicek di controlsManager, tapi jaga-jaga

  const shotOrigin = camera.position.clone();
  const shotDirection = new THREE.Vector3();
  camera.getWorldDirection(shotDirection);

  // Buat cahaya PointLight
  const light = new THREE.PointLight(
    shotColor,
    shotLightIntensity,
    shotLightDistance,
    2
  );
  light.position.copy(shotOrigin);
  scene.add(light);

  // Buat visual bola kecil
  const sphereGeometry = new THREE.SphereGeometry(shotVisualSize, 8, 8);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: shotColor });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.copy(shotOrigin);
  scene.add(sphere);

  shots.push({
    light: light,
    sphere: sphere,
    direction: shotDirection,
    life: shotLifetime,
  });

  setFireKeyPressed(true); // Set flag bahwa tembakan baru saja dilakukan
  console.log("Shot created!");
}

export function updateShots(deltaTime, scene) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const shot = shots[i];

    shot.light.position.addScaledVector(shot.direction, shotSpeed * deltaTime);
    shot.sphere.position.addScaledVector(shot.direction, shotSpeed * deltaTime);
    shot.life -= deltaTime;

    if (shot.life <= 0) {
      scene.remove(shot.light);
      scene.remove(shot.sphere);
      shot.sphere.geometry.dispose();
      shot.sphere.material.dispose();
      shots.splice(i, 1);
    }
  }
}
