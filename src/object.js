import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

let targetObjectGroup = null;

export function loadTargetObject(scene, getPositionFromGrid, obstaclesData) {
    return new Promise((resolve) => {
        const loader = new GLTFLoader();
        loader.load('/object.glb', (gltf) => {
            targetObjectGroup = new THREE.Group();
            const obj = gltf.scene;

            obj.scale.set(1, 1, 1);
            obj.position.set(0, 0, 0);
            
            obj.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            targetObjectGroup.add(obj);
            targetObjectGroup.position.copy(getPositionFromGrid(0, 22));
            
            // Thiết lập hitbox bao quát cho object tại row 22
            const hitboxSize = { width: 1.0, height: 1.0, depth: 1.0 };
            const hitboxGeometry = new THREE.BoxGeometry(hitboxSize.width, hitboxSize.height, hitboxSize.depth);
            
            const hitboxMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x00ff00, 
                wireframe: false, 
                transparent: true, 
                opacity: 0.0 
            });
            
            const hitboxMesh = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
            hitboxMesh.position.set(0, hitboxSize.height / 2, 0);
            targetObjectGroup.add(hitboxMesh);

            scene.add(targetObjectGroup);

            obstaclesData.push({ col: 0, row: 22, type: 'object' });

            resolve({
                group: targetObjectGroup,
                hitbox: hitboxMesh,
                gridPos: { col: 0, row: 22 }
            });
        }, undefined, (error) => {
            console.warn("⚠️ Không tìm thấy file object.glb, bỏ qua object này.");
            resolve(null);
        });
    });
}