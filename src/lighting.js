import * as THREE from 'three';

export function createLighting() {
  const lightingGroup = new THREE.Group();
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
  lightingGroup.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
  directionalLight.position.set(15, 30, 15); 
  directionalLight.castShadow = true;
  const d = 30; 
  directionalLight.shadow.camera.left = -d;
  directionalLight.shadow.camera.right = d;
  directionalLight.shadow.camera.top = d * 1.5; 
  directionalLight.shadow.camera.bottom = -d * 1.5;
  directionalLight.shadow.camera.near = 1;
  directionalLight.shadow.camera.far = 200;
  directionalLight.shadow.mapSize.width = 2048; 
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.bias = -0.001; 

  lightingGroup.add(directionalLight);

  return lightingGroup;
}