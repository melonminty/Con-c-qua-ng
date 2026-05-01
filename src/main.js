import "./style.css";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createCamera } from "./camera.js"; 
import { createRenderer } from "./renderer.js";
import { createLighting } from "./lighting.js"; 
import { createPlayer } from "./player.js"; 
import { loadSharkModel, spawnSharks, updateSharks, sharksData } from "./shark.js";

// ==========================================
// 1. CẤU HÌNH LƯỚI TỌA ĐỘ
// ==========================================
const TILE_SIZE = 1; 
const MIN_COL = -12;
const MAX_COL = 12;
const MIN_ROW = -22; 
const MAX_ROW = 22;  
const GROUND_HEIGHT = 0.67;

let playerGridPos = { col: 0, row: -22 }; 
const rockTemplates = []; 
const seaweedTemplates = [];
export const obstaclesData = []; 
const seaweedMixers = [];

function getPositionFromGrid(col, row) {
    return new THREE.Vector3(
        col * TILE_SIZE, 
        GROUND_HEIGHT, 
        -row * TILE_SIZE 
    );
}

// ==========================================
// 2. KHỞI TẠO CÁC THÀNH PHẦN (SCENE, CAMERA, RENDERER)
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color('#87CEEB');

const { camera, size: cameraSize } = createCamera();
const renderer = createRenderer();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const lighting = createLighting();
scene.add(lighting);

// 3. LOAD MAP 3D
const loader = new GLTFLoader();
loader.load('/map.glb', (gltf) => {
    gltf.scene.traverse((child) => {
        if (child.isMesh) {
            child.receiveShadow = true;
            child.castShadow = true;
        }
    });
    scene.add(gltf.scene);
});

let playerInstance;
// Khởi tạo Player
createPlayer(playerGridPos, getPositionFromGrid).then((obj) => {
    playerInstance = obj;
    scene.add(playerInstance.group);
});

// 4. LOAD CÁC ASSETS VÀ TÍCH HỢP ĐẢM BẢO KHÔNG TRÙNG HÀNG
loadSharkModel(loader).then(() => {
    // Tạo mảng toàn bộ các hàng có trong game (từ -22 đến 22)
    const allRows = [];
    for (let r = -22; r <= 22; r++) {
        allRows.push(r);
    }

    // Spawn cá mập (nhận lại các hàng còn lại dành cho đá)
    const remainingRockRows = spawnSharks(scene, getPositionFromGrid, allRows, TILE_SIZE, MIN_COL, MAX_COL);
    if (!remainingRockRows.includes(22)) {
        remainingRockRows.push(22);
    }
    // Load đá
    loader.load('/Rocks.glb', (gltf) => {
        gltf.scene.traverse((child) => {
            if (child.isMesh && child.name.includes('Rock')) {
                rockTemplates.push(child);
            }
        });

        if (rockTemplates.length > 0) {
            console.log("✅ Đã tải thành công các cục đá:", rockTemplates.length);
            // Chỉ spawn đá trên các hàng không có cá mập
            spawnRandomObstacles(remainingRockRows); 
        } else {
            console.warn("⚠️ Không tìm thấy cục đá nào, hãy kiểm tra lại tên!");
        }
    });
});

// Load rong biển
loader.load('/Seaweed.glb', (gltf) => {
    gltf.scene.traverse((child) => {
        if (child.isMesh) {
            if (gltf.animations && gltf.animations.length > 0) {
                const mixer = new THREE.AnimationMixer(child);
                gltf.animations.forEach((clip) => {
                    mixer.clipAction(clip, child).play();
                });
                seaweedMixers.push({ mesh: child, mixer });
            }
            seaweedTemplates.push(child);
        }
    });

    if (seaweedTemplates.length > 0) {
        console.log("✅ Đã nạp thành công rong biển:", seaweedTemplates.length);
    } else {
        console.warn("⚠️ Không tìm thấy đối tượng rong biển nào trong file Seaweed.glb!");
    }
});

// 5. THUẬT TOÁN SPAWN VẬT CẢN & RONG BIỂN
function spawnRandomObstacles(allowedRows) {
    allowedRows.forEach(row => {
        const numRocks = Math.floor(Math.random() * 2) + 2; // Random 0 hoặc 1 cục đá
        const usedCols = new Set();
        
        // --- Spawn Đá ---
        for (let i = 0; i < numRocks; i++) {
            let col = Math.floor(Math.random() * (MAX_COL - MIN_COL + 1)) + MIN_COL;
            if (usedCols.has(col)) continue;
            usedCols.add(col);
            const randomIndex = Math.floor(Math.random() * rockTemplates.length);
            const rockClone = rockTemplates[randomIndex].clone();

            rockClone.scale.set(1.5, 1.5, 1.5);
            const rockGroup = new THREE.Group();
            rockClone.position.set(0, 0, 0);
            rockGroup.add(rockClone);
            
            // Lấy vị trí trên lưới và nâng cao trục Y thêm +0.4 để không bị chìm xuống cát
            const pos = getPositionFromGrid(col, row);
            pos.y += 0.4; 
            rockGroup.position.copy(pos);

            const randomAngle = Math.random() * Math.PI * 2;
            rockGroup.rotation.set(0, randomAngle, 0);

            rockClone.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            scene.add(rockGroup);
            obstaclesData.push({ col, row, type: 'rock' }); 
        }

        // --- Spawn Rong Biển ---
        const numSeaweed = Math.floor(Math.random() * 3); // Random 0, 1 hoặc 2 cụm
        
        for (let i = 0; i < numSeaweed; i++) {
            let col = Math.floor(Math.random() * (MAX_COL - MIN_COL + 1)) + MIN_COL;
            if (usedCols.has(col)) continue;
            usedCols.add(col);

            if (seaweedTemplates.length > 0) {
                const randomIndex = Math.floor(Math.random() * seaweedTemplates.length);
                const originalMesh = seaweedTemplates[randomIndex];
                
                const seaweedClone = originalMesh.clone();

                const seaweedGroup = new THREE.Group();
                seaweedClone.position.set(0, 0, 0);
                seaweedGroup.add(seaweedClone);
                seaweedGroup.position.copy(getPositionFromGrid(col, row));

                const randomAngle = Math.random() * Math.PI * 2;
                seaweedGroup.rotation.set(0, randomAngle, 0);

                if (originalMesh.animations && originalMesh.animations.length > 0) {
                    const mixer = new THREE.AnimationMixer(seaweedClone);
                    originalMesh.animations.forEach((clip) => {
                        mixer.clipAction(clip, seaweedClone).play();
                    });
                    seaweedMixers.push({ mesh: seaweedClone, mixer });
                }

                seaweedClone.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                scene.add(seaweedGroup);
            }
        }
    });
}

// 7. ĐIỀU KHIỂN & VA CHẠM
window.addEventListener('keydown', (event) => {
    if (!playerInstance) return;

    const key = event.key.toLowerCase();
    
    let nextCol = playerInstance.gridPos.col;
    let nextRow = playerInstance.gridPos.row;

    if ((key === 'w' || key === 'arrowup') && nextRow < MAX_ROW) {
        nextRow += 1; 
    } else if ((key === 's' || key === 'arrowdown') && nextRow > MIN_ROW) {
        nextRow -= 1; 
    } else if ((key === 'a' || key === 'arrowleft') && nextCol > MIN_COL) {
        nextCol -= 1; 
    } else if ((key === 'd' || key === 'arrowright') && nextCol < MAX_COL) {
        nextCol += 1; 
    }

    const isObstacle = obstaclesData.some(obs => obs.col === nextCol && obs.row === nextRow);
    
    if (!isObstacle) {
        playerInstance.moveTo(nextCol, nextRow, getPositionFromGrid);
    }
});

function checkSharkCollision() {
    if (!playerInstance) return;
    const playerPos = getPositionFromGrid(playerInstance.gridPos.col, playerInstance.gridPos.row);

    for (const shark of sharksData) {
        const sharkPos = shark.group.position;
        const distanceX = Math.abs(playerPos.x - sharkPos.x);
        const distanceZ = Math.abs(playerPos.z - sharkPos.z);

        if (distanceX < 0.8 && distanceZ < 0.8) {
            triggerGameOver();
            break;
        }
    }
}

// Hàm kích hoạt màn hình Game Over
function triggerGameOver() {
    const resultContainer = document.getElementById('result-container');
    resultContainer.style.visibility = 'visible';
}

// Sự kiện khi nhấn nút "Chơi lại"
document.getElementById('restart-btn').addEventListener('click', () => {
    const resultContainer = document.getElementById('result-container');
    resultContainer.style.visibility = 'hidden';

    // Reset vị trí player về điểm bắt đầu
    if (playerInstance) {
        playerInstance.moveTo(0, -22, getPositionFromGrid);
    }
});

// 8. RENDER & CẬP NHẬT ANIMATION
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    for (const item of seaweedMixers) {
        item.mixer.update(delta);
    }
    updateSharks(delta);
    checkSharkCollision();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    const viewRatio = window.innerWidth / window.innerHeight;
    const width = viewRatio < 1 ? cameraSize : cameraSize * viewRatio;
    const height = viewRatio < 1 ? cameraSize / viewRatio : cameraSize;
    camera.left = width / -2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = height / -2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});