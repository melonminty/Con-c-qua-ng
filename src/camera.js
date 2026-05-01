import * as THREE from "three";

export function createCamera() {
  const size = 30; 
  const viewRatio = window.innerWidth / window.innerHeight;
  const width = viewRatio < 1 ? size : size * viewRatio;
  const height = viewRatio < 1 ? size / viewRatio : size;

  const camera = new THREE.OrthographicCamera(
    width / -2, 
    width / 2,  
    height / 2, 
    height / -2,
    1,         
    900         
  );
  camera.up.set(0, 1, 0); 
  camera.position.set(30, 30, 30); 
  camera.lookAt(0, 0, 0);
  return { camera, size }; 
}