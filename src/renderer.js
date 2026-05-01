import * as THREE from 'three';

export function createRenderer() {
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true, // Khử răng cưa giúp viền model mượt hơn
        alpha: false     // Nền không trong suốt
    });

    // Cài đặt kích thước bằng với cửa sổ trình duyệt
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Tối ưu độ nét cho các màn hình phân giải cao (Retina display)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Kích hoạt hệ thống đổ bóng (Shadow Map) - Rất cần cho Crossy Road
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Bóng đổ viền mềm

    // Gắn thẻ <canvas> vào HTML
    document.body.appendChild(renderer.domElement);

    return renderer;
}