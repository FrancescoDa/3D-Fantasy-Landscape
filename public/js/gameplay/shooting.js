// js/gameplay/shooting.js
import * as THREE from "three";

const shots = [];                 // Array untuk menyimpan semua objek tembakan yang aktif
const shotSpeed = 100.0;
const shotLifetime = 1.0;
const shotLightIntensity = 250;   // Lebih terang untuk efek yang lebih kuat
const shotLightDistance = 150;    // Jarak cahaya lebih jauh
const shotVisualSize = 0.25;      // Bola sedikit lebih besar
const shotColor = new THREE.Color(0x0000ff);      // Biru
const shotCoreColor = new THREE.Color(0xffffff); // Warna inti (putih) untuk glow

const shotBirthDuration = 0.15;     // Durasi animasi kemunculan (dalam detik)

// --- CONSTANTS FOR TRAIL & LINES (Adjusted for more density/spread) ---
const maxParticles = 600;           // Maksimum partikel trail per tembakan (lebih banyak)
const particleLife = 0.8;           // Umur partikel trail (lebih lama agar menyebar)
const particleSize = 0.25;          // Ukuran dasar partikel (lebih besar)
const particleSpreadSpeed = 0.1;    // Seberapa cepat partikel menyebar dari pusat tembakan
const particleSpawnRate = 0.005;    // Detik antar spawn partikel baru (semakin kecil, semakin padat)

const linePointsCount = 8;          // Jumlah titik untuk garis "konstelasi" (lebih banyak titik)
const lineLagDistance = 0.7;        // Seberapa jauh setiap titik garis tertinggal dari titik sebelumnya
const lineJitterAmount = 0.1;       // Jumlah acak untuk "getaran" garis

let fireKeyIsPressed = false;       // Internal state untuk modul ini

// Helper function to create a circular texture (untuk partikel)
const createCircleTexture = (size, color) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  // Warna inti (center) dan transparansi tepi
  gradient.addColorStop(0, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 1)`);
  gradient.addColorStop(0.7, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 0.5)`);
  gradient.addColorStop(1, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 0)`);

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
};

// Inisialisasi tekstur partikel saat modul dimuat
const particleTexture = createCircleTexture(64, shotColor);


export function canShoot() {
  return !fireKeyIsPressed;
}

export function setFireKeyPressed(isPressed) {
  fireKeyIsPressed = isPressed;
}

export function createShot(camera, scene) {
  if (!canShoot()) return;

  const shotOrigin = camera.position.clone();
  const shotDirection = new THREE.Vector3();
  camera.getWorldDirection(shotDirection);

  // --- Bola Utama (dengan efek glow emissive dan inti yang lebih terang) ---
  const sphereGeometry = new THREE.SphereGeometry(shotVisualSize, 24, 24); // Resolusi lebih tinggi
  // Material untuk glow luar
  const sphereMaterial = new THREE.MeshStandardMaterial({
    color: shotColor,
    emissive: shotColor,
    emissiveIntensity: 0, // Mulai dari 0, akan dianimasikan
    roughness: 0.2,       // Lebih mengkilap
    metalness: 0.8,       // Lebih metalik
  });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.copy(shotOrigin);
  sphere.scale.setScalar(0); // Mulai skala dari 0, akan dianimasikan
  scene.add(sphere);

  // Material untuk inti yang lebih terang (putih/biru sangat terang)
  const coreSphereMaterial = new THREE.MeshBasicMaterial({
      color: shotCoreColor, // Putih terang atau biru yang sangat terang
      transparent: true,
      opacity: 0,           // Mulai dari 0, akan dianimasikan
      blending: THREE.AdditiveBlending, // Penting untuk efek glow
      depthWrite: false,    // Penting untuk transparansi yang benar
  });
  const coreSphere = new THREE.Mesh(
    new THREE.SphereGeometry(shotVisualSize * 0.7, 24, 24), // Sedikit lebih kecil dari bola utama
    coreSphereMaterial
  );
  coreSphere.position.copy(shotOrigin);
  coreSphere.scale.setScalar(0);
  scene.add(coreSphere);


  // --- Cahaya PointLight ---
  const light = new THREE.PointLight(
    shotColor,
    0, // Mulai intensitas dari 0, akan dianimasikan
    shotLightDistance,
    2
  );
  light.position.copy(shotOrigin);
  scene.add(light);

  // --- Sistem Partikel Trail (seperti asap/kabut) ---
  const particlePositions = new Float32Array(maxParticles * 3);
  const particleAlphas = new Float32Array(maxParticles);
  const particleGeom = new THREE.BufferGeometry();
  particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particleGeom.setAttribute('alpha', new THREE.BufferAttribute(particleAlphas, 1));
  particleGeom.setDrawRange(0, 0);

  const particleMat = new THREE.PointsMaterial({
    color: shotColor,
    size: particleSize,
    map: particleTexture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: false,
  });
  // Modifikasi shader untuk menggunakan atribut alpha custom
  particleMat.onBeforeCompile = (shader) => {
    shader.vertexShader = `
      attribute float alpha;
      varying float vAlpha;
      void main() {
        vAlpha = alpha;
        ${shader.vertexShader}
      }
    `;
    shader.fragmentShader = `
      varying float vAlpha;
      void main() {
        ${shader.fragmentShader}
        gl_FragColor.a *= vAlpha;
      }
    `;
  };

  const trailParticles = new THREE.Points(particleGeom, particleMat);
  scene.add(trailParticles);

  const particlesData = [];
  for (let i = 0; i < maxParticles; i++) {
    particlesData.push({
      position: new THREE.Vector3(),
      life: 0,
      velocity: new THREE.Vector3(),
      active: false,
    });
  }

  // --- Garis Konstelasi/Energi ---
  const linePositions = new Float32Array(linePointsCount * 3);
  const lineGeom = new THREE.BufferGeometry();
  lineGeom.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

  // Indeks untuk membentuk segmen garis yang lebih kompleks
  const lineIndices = [];
  for (let i = 0; i < linePointsCount - 1; i++) {
      lineIndices.push(i, i + 1); // Garis antar titik berurutan
  }
  // Tambahkan koneksi "acak" (bisa disesuaikan lebih lanjut)
  lineIndices.push(0, Math.floor(linePointsCount / 2));
  lineIndices.push(1, linePointsCount - 1);
  if (linePointsCount > 3) {
      lineIndices.push(Math.floor(linePointsCount / 4), Math.floor(linePointsCount * 3 / 4));
  }
  lineGeom.setIndex(lineIndices);

  const lineMat = new THREE.LineBasicMaterial({
    color: shotColor,
    linewidth: 2, // Catatan: linewidth mungkin tidak didukung di semua platform/browser
    transparent: true,
    opacity: 0, // Mulai dari 0, akan dianimasikan
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const lineMesh = new THREE.LineSegments(lineGeom, lineMat);
  scene.add(lineMesh);

  const linePoints = [];
  for (let i = 0; i < linePointsCount; i++) {
      linePoints.push(shotOrigin.clone());
  }


  shots.push({
    light: light,
    sphere: sphere,
    coreSphere: coreSphere, // Tambahkan inti bola
    direction: shotDirection,
    life: shotLifetime,
    birthProgress: 0,

    // Partikel Trail
    trailParticles: trailParticles,
    particleGeom: particleGeom,
    particlesData: particlesData,
    nextParticleSpawnTime: 0,
    particleCursor: 0,

    // Garis Konstelasi
    lineMesh: lineMesh,
    lineGeom: lineGeom,
    linePoints: linePoints,

    // Materials (untuk disposal)
    sphereMaterial: sphereMaterial,
    coreSphereMaterial: coreSphereMaterial,
    particleMat: particleMat,
    lineMat: lineMat,
  });

  setFireKeyPressed(true);
  console.log("Shot created!");
}

export function updateShots(deltaTime, scene) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const shot = shots[i];

    // --- LOGIKA ANIMASI KEMUNCULAN (BIRTH ANIMATION) ---
    if (shot.birthProgress < 1) {
      shot.birthProgress = Math.min(1, shot.birthProgress + deltaTime / shotBirthDuration);

      // Atur skala bola utama
      const currentSphereScale = shotVisualSize * shot.birthProgress;
      shot.sphere.scale.set(currentSphereScale, currentSphereScale, currentSphereScale);
      // Atur intensitas emissive bola utama
      shot.sphere.material.emissiveIntensity = shot.birthProgress * 3; // Lebih terang!

      // Atur skala inti bola
      const currentCoreSphereScale = shotVisualSize * 0.7 * shot.birthProgress;
      shot.coreSphere.scale.set(currentCoreSphereScale, currentCoreSphereScale, currentCoreSphereScale);
      shot.coreSphere.material.opacity = shot.birthProgress * 0.8; // Opacity inti

      // Atur intensitas cahaya PointLight
      shot.light.intensity = shotLightIntensity * shot.birthProgress;

      // Atur opacity garis konstelasi
      shot.lineMesh.material.opacity = shot.birthProgress;
    }

    // --- GERAKKAN TEMBAKAN UTAMA ---
    const moveAmount = shotSpeed * deltaTime;
    shot.light.position.addScaledVector(shot.direction, moveAmount);
    shot.sphere.position.addScaledVector(shot.direction, moveAmount);
    shot.coreSphere.position.copy(shot.sphere.position); // Inti mengikuti bola utama

    // --- UPDATE PARTIKEL TRAIL ---
    shot.nextParticleSpawnTime -= deltaTime;
    if (shot.nextParticleSpawnTime <= 0 && shot.life > 0) {
        shot.nextParticleSpawnTime = particleSpawnRate;

        const newParticle = shot.particlesData[shot.particleCursor];
        newParticle.active = true;
        newParticle.life = particleLife;

        newParticle.position.copy(shot.sphere.position);
        newParticle.position.addScaledVector(shot.direction, -shotVisualSize * 1.5); // Mulai sedikit di belakang bola

        // Beri kecepatan acak untuk menyebar dari pusat dan sedikit melambat
        newParticle.velocity.copy(shot.direction).multiplyScalar(-shotSpeed * 0.05); // Kecepatan dasar ke belakang
        // Tambahkan kecepatan menyebar secara acak (berputar)
        newParticle.velocity.x += (Math.random() - 0.5) * particleSpreadSpeed * shotSpeed;
        newParticle.velocity.y += (Math.random() - 0.5) * particleSpreadSpeed * shotSpeed;
        newParticle.velocity.z += (Math.random() - 0.5) * particleSpreadSpeed * shotSpeed;

        shot.particleCursor = (shot.particleCursor + 1) % maxParticles;
    }

    let activeParticlesCount = 0;
    const particlePositionsArray = shot.particleGeom.attributes.position.array;
    const particleAlphasArray = shot.particleGeom.attributes.alpha.array;

    for (let j = 0; j < maxParticles; j++) {
        const p = shot.particlesData[j];
        if (p.active) {
            p.life -= deltaTime;
            if (p.life <= 0) {
                p.active = false;
            } else {
                p.position.addScaledVector(p.velocity, deltaTime);

                particlePositionsArray[j * 3] = p.position.x;
                particlePositionsArray[j * 3 + 1] = p.position.y;
                particlePositionsArray[j * 3 + 2] = p.position.z;
                // Fade out partikel lebih halus (misal: kuadratik atau kubik)
                const fadeFactor = p.life / particleLife;
                particleAlphasArray[j] = fadeFactor * fadeFactor; // Fade kuadratik untuk awal yang lebih lambat lalu cepat

                activeParticlesCount++;
            }
        }
    }
    shot.particleGeom.attributes.position.needsUpdate = true;
    shot.particleGeom.attributes.alpha.needsUpdate = true;
    shot.particleGeom.setDrawRange(0, activeParticlesCount);


    // --- UPDATE GARIS KONSTELASI ---
    const linePositionsArray = shot.lineGeom.attributes.position.array;
    const spherePos = shot.sphere.position;

    // Titik pertama garis mengikuti bola utama, dengan lerp untuk smoothness
    shot.linePoints[0].lerpVectors(shot.linePoints[0], spherePos.clone().addScaledVector(shot.direction, -shotVisualSize * 0.5), 0.5);

    for (let j = 1; j < linePointsCount; j++) {
        // Setiap titik mengejar titik di depannya
        shot.linePoints[j].lerpVectors(
            shot.linePoints[j],
            shot.linePoints[j-1].clone().addScaledVector(shot.direction, -lineLagDistance),
            0.5 // Kecepatan pengejaran
        );
        // Tambahkan "getaran" acak yang ringan
        shot.linePoints[j].x += (Math.random() - 0.5) * lineJitterAmount;
        shot.linePoints[j].y += (Math.random() - 0.5) * lineJitterAmount;
        shot.linePoints[j].z += (Math.random() - 0.5) * lineJitterAmount;
    }

    // Salin posisi titik-titik dinamis ke BufferAttribute
    for (let j = 0; j < linePointsCount; j++) {
        const p = shot.linePoints[j];
        linePositionsArray[j * 3] = p.x;
        linePositionsArray[j * 3 + 1] = p.y;
        linePositionsArray[j * 3 + 2] = p.z;
    }
    shot.lineGeom.attributes.position.needsUpdate = true;


    // --- KURANGI UMUR TEMBAKAN UTAMA ---
    shot.life -= deltaTime;

    // --- HAPUS TEMBAKAN JIKA UMUR HABIS ---
    if (shot.life <= 0) {
      scene.remove(shot.light);
      scene.remove(shot.sphere);
      scene.remove(shot.coreSphere); // Hapus inti bola
      scene.remove(shot.trailParticles);
      scene.remove(shot.lineMesh);

      // Penting: Disposisi geometri dan material untuk mencegah kebocoran memori
      shot.sphere.geometry.dispose();
      shot.sphereMaterial.dispose(); // Gunakan reference yang disimpan
      shot.coreSphere.geometry.dispose();
      shot.coreSphereMaterial.dispose(); // Gunakan reference yang disimpan
      shot.particleGeom.dispose();
      shot.particleMat.dispose();
      shot.lineGeom.dispose();
      shot.lineMat.dispose();

      shots.splice(i, 1); // Hapus tembakan dari array
    }
  }
}