import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export async function createPlayer(startPos, getPositionFromGrid) {
    const playerGroup = new THREE.Group();

    // 1. Tạo khối hộp (ẩn đi ngay sau khi load xong model cá)
    const playerHeight = 1;
    const playerGeometry = new THREE.BoxGeometry(0.8, playerHeight, 0.8);
    playerGeometry.translate(0, playerHeight / 2, 0); 
    const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const playerModel = new THREE.Mesh(playerGeometry, playerMaterial);
    
    playerModel.name = "boxModel";
    playerGroup.add(playerModel);
    playerGroup.position.copy(getPositionFromGrid(startPos.col, startPos.row));

    // 2. Load mô hình con cá
    const loader = new GLTFLoader();
    try {
        // Thay đường dẫn '/fish.glb' bằng tên file con cá của bạn
        const gltf = await loader.loadAsync('/fish.glb'); 
        const fish = gltf.scene;
        
        // Điều chỉnh scale của cá cho vừa 1 ô (nếu cần thiết, bạn có thể chỉnh thông số này)
        fish.scale.set(0.9, 0.9, 0.9); 
        fish.position.set(0, 0.67, 0);
        fish.rotation.y = Math.PI;
        fish.castShadow = true;

        // Thêm cá vào group
        playerGroup.add(fish);

        // Xóa khối hộp màu đỏ đi để chỉ giữ lại con cá
        const oldBox = playerGroup.getObjectByName("boxModel");
        if (oldBox) {
            playerGroup.remove(oldBox);
        }
    } catch (error) {
        console.warn("⚠️ Không tìm thấy file fish.glb, đang sử dụng khối hộp mặc định.");
    }

    return {
        group: playerGroup,
        gridPos: startPos,
        moveTo(col, row, getPositionFromGrid) {
            this.gridPos.col = col;
            this.gridPos.row = row;
            // Cập nhật vị trí trên scene
            this.group.position.copy(getPositionFromGrid(col, row));
        }
    };
}