import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const sharkTemplates = [];
const sharkAnimations = [];
export const sharksData = []; 

// Hàm khởi tạo và tải model Shark
export function loadSharkModel(loader) {
    return new Promise((resolve) => {
        loader.load('/Shark.glb', (gltf) => {
            sharkAnimations.splice(0, sharkAnimations.length, ...(gltf.animations || []));

            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    sharkTemplates.push(child);
                }
            });

            if (sharkTemplates.length > 0) {
                console.log("🦈 Đã tải thành công model Shark:", sharkTemplates.length);
            } else {
                console.warn("⚠️ Không tìm thấy đối tượng Shark nào trong file Shark.glb!");
            }
            resolve(sharkTemplates);
        });
    });
}

// Hàm spawn Shark
export function spawnSharks(scene, getPositionFromGrid, allAvailableRows, TILE_SIZE, MIN_COL, MAX_COL) {
    
    // Lọc bỏ hàng xuất phát (-22), hàng trên cùng (22) và các hàng lân cận (-21, 21)
    const validRows = allAvailableRows.filter(row => row !== -22 && row !== 22 && row !== -21 && row !== 21);
    validRows.sort(() => Math.random() - 0.5);
    const sharkRows = validRows.slice(0, 22); // Lấy 23 hàng cho cá mập

    sharkRows.forEach(row => {
        const numSharks = Math.floor(Math.random() * 2) + 1; 
        const colStep = Math.floor((MAX_COL - MIN_COL) / numSharks);

        for (let i = 0; i < numSharks; i++) {
            if (sharkTemplates.length === 0) break;

            let col = MIN_COL + i * colStep + Math.floor(Math.random() * (colStep - 2));
            
            const randomIndex = Math.floor(Math.random() * sharkTemplates.length);
            const originalObject = sharkTemplates[randomIndex].parent || sharkTemplates[randomIndex];
            
            // Clone toàn bộ đối tượng gốc (giữ nguyên cấu trúc phân cấp)
            const sharkGroup = originalObject.clone ? originalObject.clone() : new THREE.Group();
            
            // Nếu model nằm trong đối tượng cha, ta vẫn có thể scale và căn chỉnh trực tiếp nhóm lớn
            sharkGroup.scale.set(0.7, 0.7, 0.7);
            sharkGroup.rotation.y = 0;

            let mixer = null;
            if (sharkAnimations.length > 0) {
                mixer = new THREE.AnimationMixer(sharkGroup);
                sharkAnimations.forEach((clip) => {
                    mixer.clipAction(clip).play();
                });
            }

            const hitboxSize = { width: 2.4, height: 1.2, depth: 1.2 }; 
            const hitboxGeometry = new THREE.BoxGeometry(hitboxSize.width, hitboxSize.height, hitboxSize.depth);
            
            // Ẩn hitbox
            const hitboxMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xff0000, 
                wireframe: false, 
                transparent: true, 
                opacity: 0.0 
            });
            
            const hitboxMesh = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
            hitboxMesh.position.set(0, hitboxSize.height / 2, 0); 
            sharkGroup.add(hitboxMesh);

            const basePos = getPositionFromGrid(col, row);
            basePos.y += 0.5;
            sharkGroup.position.copy(basePos);

            const initialDirection = Math.random() > 0.5 ? 1 : -1;

            sharkGroup.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            scene.add(sharkGroup);

            sharksData.push({
                group: sharkGroup,
                mesh: sharkGroup, // Gán mesh bằng group để đồng bộ
                hitbox: hitboxMesh,
                hitboxSize: hitboxSize,
                mixer,
                col: col,
                row: row,
                speed: 0.05 + Math.random() * 0.05,
                direction: initialDirection,
                elapsed: Math.random() * Math.PI * 2,
                baseY: basePos.y,
                minCol: MIN_COL - 2,
                maxCol: MAX_COL + 2,
                getPositionFromGrid
            });
        }
    });

    const remainingRows = validRows.slice(27);
    return remainingRows;
}

export function updateSharks(delta) {
    sharksData.forEach(shark => {
        shark.elapsed += delta;

        if (shark.mixer) {
            shark.mixer.timeScale = 0.85 + shark.speed * 3;
            shark.mixer.update(delta);
        }

        shark.group.position.x += shark.speed * shark.direction;

        const swimBob = Math.max(0, Math.sin(shark.elapsed * 6)) * 0.05;
        const swimRoll = Math.sin(shark.elapsed * 8) * 0.08 * shark.direction;
        shark.group.position.y = shark.baseY + swimBob;

        // Xoay toàn bộ Group thay vì chỉ mesh con bên trong
        if (shark.direction === 1) {
            shark.group.rotation.y = Math.PI / 2;
        } else {
            shark.group.rotation.y = -Math.PI / 2;
        }

        shark.group.rotation.z = swimRoll;

        const currentX = shark.group.position.x;
        if (shark.direction === 1 && currentX > shark.maxCol) {
            shark.group.position.x = shark.minCol;
        } else if (shark.direction === -1 && currentX < shark.minCol) {
            shark.group.position.x = shark.maxCol;
        }
    });
}