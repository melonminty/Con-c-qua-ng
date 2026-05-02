import "./style.css";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createCamera } from "./camera.js"; 
import { createRenderer } from "./renderer.js";
import { createLighting } from "./lighting.js"; 
import { createPlayer } from "./player.js"; 
import { loadSharkModel, spawnSharks, updateSharks, sharksData } from "./shark.js";
import { loadTargetObject } from "./object.js";
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

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
let seaweedTemplateScene = null;
let seaweedAnimations = [];
export const obstaclesData = []; 
const seaweedMixers = [];

let isGameOver = false;
let isGameStarted = false;
let targetObjectInstance = null;

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
    setTimeout(() => {
        isGameStarted = true;
    }, 1000);
});

let isMoving = false;
let targetPosition = new THREE.Vector3();
let startPosition = new THREE.Vector3();
let moveProgress = 0;
const moveDuration = 0.15; // Thời gian lướt (tính bằng giây), bạn có thể chỉnh nhanh/chậm tại đây


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

    // Load object tại hàng 22
    loadTargetObject(scene, getPositionFromGrid, obstaclesData).then((objInstance) => {
        targetObjectInstance = objInstance;
    });

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
    // store the whole scene as a template and keep the animation clips
    seaweedTemplateScene = gltf.scene;
    seaweedAnimations = gltf.animations || [];

    // ensure meshes have shadow properties (on the template)
    seaweedTemplateScene.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    if (seaweedTemplateScene) {
        console.log("✅ Đã nạp thành công rong biển (scene template)");
    } else {
        console.warn("⚠️ Không tìm thấy đối tượng rong biển nào trong file Seaweed.glb!");
    }
});

// 5. THUẬT TOÁN SPAWN VẬT CẢN & RONG BIỂN
function spawnRandomObstacles(allowedRows) {
    const rockRows = allowedRows.filter(row => row !== 22);

    rockRows.forEach(row => {
        const numRocks = Math.floor(Math.random() * 2) + 3; // Random 0 hoặc 1 cục đá
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
            if (row === 22 && col === 0) continue;
            if (usedCols.has(col)) continue;
            usedCols.add(col);

            if (seaweedTemplateScene) {
                // deep-clone the whole glTF scene so animation/skinning stays intact
                const clonedScene = SkeletonUtils.clone(seaweedTemplateScene);

                const seaweedGroup = new THREE.Group();
                seaweedGroup.add(clonedScene);
                // small random offset within the tile center for variety
                const tilePos = getPositionFromGrid(col, row);
                const offsetX = (Math.random() - 0.5) * 0.6;
                const offsetZ = (Math.random() - 0.5) * 0.6;
                seaweedGroup.position.set(tilePos.x + offsetX, tilePos.y, tilePos.z + offsetZ);

                const randomAngle = Math.random() * Math.PI * 2;
                seaweedGroup.rotation.set(0, randomAngle, 0);

                // optional scale variation
                const scale = 0.8 + Math.random() * 0.6;
                seaweedGroup.scale.set(scale, scale, scale);

                // setup animation mixer for this clone
                if (seaweedAnimations && seaweedAnimations.length > 0) {
                    const mixer = new THREE.AnimationMixer(clonedScene);
                    seaweedAnimations.forEach((clip) => {
                        mixer.clipAction(clip, clonedScene).play();
                    });
                    seaweedMixers.push({ mesh: clonedScene, mixer });
                }

                scene.add(seaweedGroup);
            }
        }
    });

    if (allowedRows.includes(22)) {
        const row = 22;
        const usedCols = new Set();
        const numSeaweed = Math.floor(Math.random() * 3);

        for (let i = 0; i < numSeaweed; i++) {
            let col = Math.floor(Math.random() * (MAX_COL - MIN_COL + 1)) + MIN_COL;
            if (col === 0) continue;
            if (usedCols.has(col)) continue;
            usedCols.add(col);

            if (seaweedTemplateScene) {
                const clonedScene = SkeletonUtils.clone(seaweedTemplateScene);

                const seaweedGroup = new THREE.Group();
                seaweedGroup.add(clonedScene);

                const tilePos = getPositionFromGrid(col, row);
                const offsetX = (Math.random() - 0.5) * 0.6;
                const offsetZ = (Math.random() - 0.5) * 0.6;
                seaweedGroup.position.set(tilePos.x + offsetX, tilePos.y, tilePos.z + offsetZ);

                const randomAngle = Math.random() * Math.PI * 2;
                seaweedGroup.rotation.set(0, randomAngle, 0);

                const scale = 0.8 + Math.random() * 0.6;
                seaweedGroup.scale.set(scale, scale, scale);

                if (seaweedAnimations && seaweedAnimations.length > 0) {
                    const mixer = new THREE.AnimationMixer(clonedScene);
                    seaweedAnimations.forEach((clip) => {
                        mixer.clipAction(clip, clonedScene).play();
                    });
                    seaweedMixers.push({ mesh: clonedScene, mixer });
                }

                scene.add(seaweedGroup);
            }
        }
    }
}

// 7. ĐIỀU KHIỂN & VA CHẠM
window.addEventListener('keydown', (event) => {
    // Chặn nhận phím nếu đang lướt, nhân vật chưa được load, hoặc game kết thúc
    if (!playerInstance || isGameOver || isMoving) return;

    const key = event.key.toLowerCase();
    
    let nextCol = playerInstance.gridPos.col;
    let nextRow = playerInstance.gridPos.row;
    let targetRotationY = playerInstance.group.rotation.y; // Lưu hướng xoay

    if ((key === 'w' || key === 'arrowup') && nextRow < MAX_ROW) {
        nextRow += 1; 
        targetRotationY = Math.PI; // Xoay xuống/lên tùy theo góc nhìn, ở đây quy ước hướng lên
    } else if ((key === 's' || key === 'arrowdown') && nextRow > MIN_ROW) {
        nextRow -= 1; 
        targetRotationY = 0; 
    } else if ((key === 'a' || key === 'arrowleft') && nextCol > MIN_COL) {
        nextCol -= 1; 
        targetRotationY = -Math.PI / 2; // Xoay trái
    } else if ((key === 'd' || key === 'arrowright') && nextCol < MAX_COL) {
        nextCol += 1; 
        targetRotationY = Math.PI / 2; // Xoay phải
    }

    const isObstacle = obstaclesData.some(obs => 
        obs.col === nextCol && obs.row === nextRow && !(obs.col === 0 && obs.row === 22)
    );
    
    if (!isObstacle) {
        // Khởi tạo quá trình lướt (Lerp)
        isMoving = true;
        moveProgress = 0;
        startPosition.copy(playerInstance.group.position);
        targetPosition.copy(getPositionFromGrid(nextCol, nextRow));
        
        playerInstance.gridPos.col = nextCol;
        playerInstance.gridPos.row = nextRow;
        
        // Thiết lập hướng cho model bên trong (giữ nguyên animation/skeleton)
        const fishModel = playerInstance.group.getObjectByName("fishModel") || playerInstance.group.children[1];
        if (fishModel) {
            // Xoay trục Y của model bên trong group mà không làm hỏng AnimationMixer
            fishModel.rotation.y = targetRotationY;
        }
    }
});

let allowCollision = false;
setTimeout(() => { allowCollision = true; }, 500);

function checkSharkCollision() {
    if (!playerInstance) return;
    if (!allowCollision) return;
    const playerPos = getPositionFromGrid(playerInstance.gridPos.col, playerInstance.gridPos.row);

    for (const shark of sharksData) {
        const sharkPos = shark.group.position;
        const distanceX = Math.abs(playerPos.x - sharkPos.x);
        const distanceZ = Math.abs(playerPos.z - sharkPos.z);

        if (distanceX < 0.8 && distanceZ < 0.8) {
            console.warn('Collision detected — player:', playerPos, 'shark:', sharkPos, 'dX=', distanceX, 'dZ=', distanceZ);
            triggerGameOver();
            break;
        }
    }
}

function checkWinCollision() {
    if (!playerInstance || !targetObjectInstance || isGameOver || !isGameStarted) return;

    const playerBox = new THREE.Box3().setFromObject(playerInstance.group);
    const objectBox = new THREE.Box3().setFromObject(targetObjectInstance.group);

    if (playerBox.intersectsBox(objectBox)) {
        triggerWin();
    }
}

function triggerGameOver() {
    isGameOver = true;
    const resultContainer = document.getElementById('result-container');
    resultContainer.style.visibility = 'visible';
}

function triggerWin() {
    isGameOver = true;
    
    const gameOverContainer = document.getElementById('result-container');
    if (gameOverContainer) {
        gameOverContainer.style.visibility = 'hidden';
    }
    
    const winContainer = document.getElementById('win-container');
    winContainer.style.display = 'flex';
    
    const imgElement = document.getElementById('win-image');
    imgElement.src = "/image.png"; 
    imgElement.style.display = 'block';
}

document.getElementById('restart-btn').addEventListener('click', () => {
    const resultContainer = document.getElementById('result-container');
    resultContainer.style.visibility = 'hidden';
    isGameOver = false;

    if (playerInstance) {
        playerInstance.moveTo(0, -22, getPositionFromGrid);
    }
});

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (isMoving) {
        moveProgress += delta / moveDuration;
        if (moveProgress >= 1) {
            moveProgress = 1;
            isMoving = false;
        }
        // Nội suy vị trí của group chứa model
        playerInstance.group.position.lerpVectors(startPosition, targetPosition, moveProgress);
    }
    // ---------------------------------

    // --- Cập nhật camera follow theo vị trí player ---
    if (playerInstance && playerInstance.group) {
        const targetX = playerInstance.group.position.x;
        const targetZ = playerInstance.group.position.z;
        
        camera.position.x = targetX + 25;
        camera.position.z = targetZ + 25;
        camera.lookAt(targetX, 0, targetZ);
    }

    if (playerInstance && typeof playerInstance.update === 'function') {
        playerInstance.update(delta);
    }
    for (const item of seaweedMixers) {
        item.mixer.update(delta);
    }
    updateSharks(delta);
    checkSharkCollision();
    checkWinCollision();
    
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