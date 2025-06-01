// js/core/openingSceneManager.js
import * as THREE from "three";
import * as TWEEN from "tween";
import { loadGLTFModel } from "../loaders/modelLoader.js";
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

let openingModelInstance = null;
let isOpeningAnimationComplete = false;
const openingCharacters = []; // Array untuk menyimpan karakter di scene opening

// Konstanta untuk animasi karakter di opening scene
const OPENING_CHAR_FLOAT_AMPLITUDE = 0.2;   // Ketinggian melayang
const OPENING_CHAR_FLOAT_FREQUENCY = 1.5;   // Kecepatan melayang
const OPENING_CHAR_LIGHT_COLOR = 0x00FF00;  // Warna cahaya efek (hijau neon)
const OPENING_CHAR_LIGHT_INTENSITY = 5;     // Intensitas cahaya (sesuaikan dengan bloom)
const OPENING_CHAR_LIGHT_DISTANCE = 5;      // Jangkauan cahaya
const OPENING_CHAR_LIGHT_OFFSET_Y = 0.5;    // Posisi cahaya Y relatif terhadap karakter

// --- Variabel untuk teks narasi ---
let narrationTexts = []; // Array untuk menyimpan objek CSS2D narasi
let currentNarrationIndex = -1;
let narrationTimeoutId = null;
const NARRATION_TEXT_OFFSET_X = 1.5;          // Jarak teks ke kanan karakter (sesuaikan)
const NARRATION_TEXT_OFFSET_Y = 0.6;        // Ketinggian teks (sesuaikan)
const NARRATION_DISPLAY_DURATION = 5000;    // Durasi setiap teks (ms)
const NARRATION_FADE_DURATION = 500;        // Durasi fade in/out (ms)

// Fungsi helper untuk membuat label teks narasi
function createNarrationLabel(text) {
    const div = document.createElement('div');
    div.className = 'narration-label';      // Class untuk styling
    div.innerHTML = text;                   // innerHTML agar bisa pakai <br> jika perlu
    div.style.position = 'absolute';        // Diperlukan oleh CSS2DObject
    div.style.backgroundColor = 'rgba(10, 20, 40, 0.85)';
    div.style.color = '#E0E0FF';
    div.style.padding = '10px 15px';        // 10 px atas-bawah, 15 px kiri-kanan
    div.style.borderRadius = '8px';
    div.style.border = '1px solid rgba(100, 100, 255, 0.5)';
    div.style.maxWidth = '380px';           // Batasi lebar agar tidak terlalu panjang
    div.style.fontSize = '25px';
    div.style.fontFamily = "'Palatino Linotype', 'Book Antiqua', Palatino, serif"; // Font fantasi
    div.style.opacity = '0';                // Mulai transparan
    div.style.transition = `opacity ${NARRATION_FADE_DURATION}ms ease-in-out`;
    div.style.pointerEvents = 'none';       // Agar tidak mengganggu interaksi

    const label = new CSS2DObject(div);
    label.visible = false;                  // Mulai tidak terlihat (selain opacity)
    return label;
}

export function loadAndAnimateOpeningScene(scene, camera, renderer, onAnimationComplete) {
    // Bersihkan model opening sebelumnya jika ada (misalnya, jika fungsi ini dipanggil lagi)
    if (openingModelInstance) {
        scene.remove(openingModelInstance);
        openingModelInstance.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
        openingModelInstance = null;
    }
    isOpeningAnimationComplete = false;
    openingCharacters.length = 0;       // Kosongkan array karakter
    narrationTexts = [];                // Kosongkan array teks narasi
    currentNarrationIndex = -1;
    if (narrationTimeoutId) clearTimeout(narrationTimeoutId);

    // Atur posisi kamera awal untuk animasi intro
    camera.position.set(25, 18, 30);    // Sesuaikan dengan ukuran dan layout map_opening
    camera.lookAt(0, 3, 0);             // Titik yang dilihat kamera, sesuaikan

    loadGLTFModel(
        "assets/new/map_opening.glb",   // Pastikan path ini benar
        scene,
        camera,                         // Kamera tidak perlu di-pass ke loader jika sudah diatur di atas
        null,                           // OrbitControls tidak relevan di sini
        renderer,                       // Renderer diperlukan untuk callback progress (opsional)
        (loadedModel) => {
            openingModelInstance = loadedModel;
            scene.add(openingModelInstance);
            console.log("Model Map Opening dimuat oleh openingSceneManager.");

            // Cari dan siapkan karakter utama di scene opening
            for (let i = 1; i <= 6; i++) {
                const charName = `main_character_${i}`;
                const characterModel = openingModelInstance.getObjectByName(charName);
                if (characterModel) {
                    console.log(`${charName} ditemukan di map opening.`);
                    characterModel.initialY = characterModel.position.y; // Simpan Y awal untuk melayang

                    let charLight = null; // Variabel untuk cahaya, hanya diisi untuk char_1

                    // Tambahkan efek cahaya HANYA untuk main_character_1
                    if (charName === 'main_character_1') {
                        charLight = new THREE.PointLight(
                            OPENING_CHAR_LIGHT_COLOR,
                            OPENING_CHAR_LIGHT_INTENSITY,
                            OPENING_CHAR_LIGHT_DISTANCE,
                            OPENING_CHAR_LIGHT_OFFSET_Y
                        );
                        charLight.position.set(0, OPENING_CHAR_LIGHT_OFFSET_Y, 0);
                        characterModel.add(charLight);
                        console.log(`Efek penyihir ditambahkan ke ${charName}`);

                        // Buat dan tambahkan label narasi untuk main_character_1
                        const texts = [
                            "Selamat Datang di <strong>MYSTICA FANTASY</strong>!",
                            "Perkenalkan, namaku <em>Alira Moonveil</em>.",
                            "Yuk, ikuti aku untuk menjelajahi Pulau Sang Penyihir!"
                        ];
                        texts.forEach(text => {
                            const label = createNarrationLabel(text);
                            // Posisikan relatif terhadap karakter
                            label.position.set(NARRATION_TEXT_OFFSET_X, NARRATION_TEXT_OFFSET_Y, 0);
                            characterModel.add(label); // Tambahkan sebagai child dari karakter
                            narrationTexts.push(label);
                        });
                    }

                    openingCharacters.push({
                        model: characterModel,
                        light: charLight, // Simpan referensi cahaya
                        initialY: characterModel.initialY,
                        isSpecial: (charName === 'main_character_1')
                    });
                } else {
                    // console.warn(`${charName} tidak ditemukan di map opening.`);
                }
            }
            console.log(`Ditemukan ${openingCharacters.length} karakter utama di opening scene.`);

            // Mulai animasi kamera setelah model dimuat
            createIntroCameraAnimation(camera, () => {
                isOpeningAnimationComplete = true;
                startNarrationSequence();   // Mulai tampilkan teks narasi
                if (typeof onAnimationComplete === 'function') {
                    onAnimationComplete();  // Callback jika ada tindakan lain setelah animasi
                }
            });
        },
        null, // Progress callback (opsional)
        (error) => {
            console.error("Gagal memuat Map Opening:", error);
            isOpeningAnimationComplete = true;

            if (typeof onAnimationCompleteCallback === 'function') {
                onAnimationCompleteCallback(true); // Kirim flag error
            }
        }
    );
}

function startNarrationSequence() {
    if (narrationTexts.length === 0) return;
    // Pastikan semua teks disembunyikan di awal jika fungsi ini dipanggil ulang
    narrationTexts.forEach(label => {
        label.visible = false;
        label.element.style.opacity = '0';
    });
    currentNarrationIndex = -1; // Reset
    if (narrationTimeoutId) clearTimeout(narrationTimeoutId); // Hapus timeout lama
    showNextNarrationText();
}

function showNextNarrationText() {
    // Hapus timeout sebelumnya jika ada (untuk kasus di mana 'P' ditekan)
    if (narrationTimeoutId) clearTimeout(narrationTimeoutId);

    const proceedToNext = () => {
        currentNarrationIndex++; // Pindah ke indeks teks berikutnya

        // Sembunyikan teks sebelumnya (jika ada)
        if (currentNarrationIndex < narrationTexts.length) {
            const currentLabel = narrationTexts[currentNarrationIndex];
            currentLabel.visible = true;
            // Timeout kecil agar 'visible' diterapkan sebelum transisi opacity
            setTimeout(() => {
                currentLabel.element.style.opacity = '1'; // Fade in teks baru
            }, 20);

            // Jadwalkan untuk menyembunyikan teks ini dan menampilkan berikutnya (atau selesai)
            narrationTimeoutId = setTimeout(() => {
                // Mulai fade out teks saat ini
                currentLabel.element.style.opacity = '0';
                // Setelah fade out selesai, baru panggil proceedToNext lagi (jika ada teks berikutnya)
                setTimeout(() => {
                    currentLabel.visible = false;   // Sembunyikan total setelah fade out
                    if (currentNarrationIndex < narrationTexts.length - 1) {
                        proceedToNext();            // Panggil lagi untuk teks berikutnya
                    } else {
                        console.log("Narasi selesai, semua teks telah ditampilkan dan di-fade out.");
                    }
                }, NARRATION_FADE_DURATION);
            }, NARRATION_DISPLAY_DURATION);         // Teks akan terlihat selama durasi ini sebelum mulai fade out
        } else {
            console.log("Akhir dari sekuens narasi (sudah tidak ada teks lagi).");
        }
    };

    // Jika ini bukan panggilan pertama (ada teks sebelumnya yang perlu di-fade out dulu)
    if (currentNarrationIndex >= 0 && narrationTexts[currentNarrationIndex]) {
        const previousLabel = narrationTexts[currentNarrationIndex];
        previousLabel.element.style.opacity = '0';              // Mulai fade out teks sebelumnya
        // Tunggu fade out selesai sebelum memanggil proceedToNext
        narrationTimeoutId = setTimeout(() => {
            if (previousLabel) previousLabel.visible = false;   // Sembunyikan total
            proceedToNext();                                    // Lanjutkan ke teks berikutnya setelah fade out
        }, NARRATION_FADE_DURATION);
    } else {
        // Ini adalah panggilan pertama, langsung tampilkan teks pertama
        proceedToNext();
    }
}

function createIntroCameraAnimation(camera, onCompleteCallback) {
    if (TWEEN.getAll().length > 0) {
        TWEEN.removeAll(); // Hentikan tween yang sedang berjalan
    }

    // Posisi awal kamera sudah diatur di loadAndAnimateOpeningScene
    const startPosition = camera.position.clone();

    // Posisi akhir kamera (lebih ke depan, mungkin sedikit lebih rendah)
    const endPosition = new THREE.Vector3(0, 8, 22);    // Sesuaikan dengan map_opening
    const lookAtTarget = new THREE.Vector3(0, 3, 0);    // Titik yang dilihat, sesuaikan

    new TWEEN.Tween(startPosition)
        .to(endPosition, 5000)                          // Durasi animasi 5 detik
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => {
            camera.position.copy(startPosition);        // Update posisi kamera dari tween
            camera.lookAt(lookAtTarget);
        })
        .onComplete(() => {
            if (typeof onCompleteCallback === 'function') {
                onCompleteCallback();
            }
        })
        .start();
}

export function stopOpeningCameraAnimationAndSetFinalState(camera) {
    TWEEN.removeAll(); // Hentikan semua animasi TWEEN
    // Langsung ke posisi & orientasi akhir animasi
    const endPosition = new THREE.Vector3(0, 8, 22);
    const lookAtTarget = new THREE.Vector3(0, 3, 0);
    camera.position.copy(endPosition);
    camera.lookAt(lookAtTarget);
    isOpeningAnimationComplete = true; // Pastikan flag diset
    console.log("Animasi intro kamera dihentikan, posisi akhir diterapkan.");
}

// Fungsi baru untuk mengupdate animasi karakter di scene opening
export function updateOpeningCharactersAnimation(elapsedTime) {
    openingCharacters.forEach(charData => {
        // Animasi melayang
        charData.model.position.y = charData.initialY + Math.sin(elapsedTime * OPENING_CHAR_FLOAT_FREQUENCY) * OPENING_CHAR_FLOAT_AMPLITUDE;

        // HANYA main_character_1 yang memiliki animasi cahaya (jika ada)
        if (charData.isSpecial && charData.light) {
            // Opsional: Animasi intensitas cahaya (berdenyut) untuk karakter spesial
            // charData.light.intensity = WITCH_EFFECT_LIGHT_INTENSITY * (0.6 + Math.sin(elapsedTime * 1.8) * 0.4);
        }
    });
}

export function getOpeningModel() { return openingModelInstance; }

export function isOpeningAnimDone() { return isOpeningAnimationComplete; }

export function clearOpeningModel(scene) {
    if (narrationTimeoutId) clearTimeout(narrationTimeoutId);
    narrationTexts.forEach(label => {
        if (label.element.parentNode) { // Hapus elemen HTML dari DOM
            label.element.remove();
        }
        // CSS2DObject mungkin perlu dihapus dari parent-nya juga jika tidak otomatis
        if (label.parent) {
            label.parent.remove(label);
        }
    });
    narrationTexts = [];
    currentNarrationIndex = -1;

    if (openingModelInstance) {
        openingCharacters.forEach(charData => {
            if (charData.light && charData.light.parent) { // Hanya jika ada cahaya
                charData.light.parent.remove(charData.light);
            }
        });
        openingCharacters.length = 0; // Kosongkan array

        scene.remove(openingModelInstance);
        openingModelInstance.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
        openingModelInstance = null;
        console.log("Model Map Opening dibersihkan.");
    }
    isOpeningAnimationComplete = false;
}