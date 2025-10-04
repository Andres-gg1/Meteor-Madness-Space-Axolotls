import * as THREE from "three"; //import three.js library
import { OrbitControls } from 'jsm/controls/OrbitControls.js';

//Window size
const w = window.innerWidth;
const h = window.innerHeight;

// Scene setup
let rotation = true; //Rotation control flag
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

//Earth model geometry and tilt
const earthGroup = new THREE.Group();
earthGroup.rotation.z = -23.4 * Math.PI / 180;
scene.add(earthGroup);
new OrbitControls(camera, renderer.domElement);
const detail = 16;
const loader = new THREE.TextureLoader();
const geometry = new THREE.IcosahedronGeometry(1, detail);
const geometryCloud = new THREE.SphereGeometry(1.01, detail**2);
const geometryAtmos = new THREE.SphereGeometry(1.03, detail**2);

//Earth's model mesh 
const material = new THREE.MeshPhongMaterial({
    map: loader.load("./textures/8k_earth_daymap.jpg"),
    specularMap: loader.load("./textures/earthspec1k.jpg"),
    bumpMap: loader.load("./textures/earthbump1k.jpg"),
    bumpScale: 0.04,
});
const earthMesh = new THREE.Mesh(geometry, material);
earthGroup.add(earthMesh);

//Lights mesh
const lightsMat = new THREE.MeshBasicMaterial({
    map: loader.load("./textures/8k_earth_nightmap.jpg"),
    blending: THREE.AdditiveBlending,
});
const lightsMesh = new THREE.Mesh(geometry, lightsMat);
earthGroup.add(lightsMesh);

//Clouds mesh
const cloudMat = new THREE.MeshStandardMaterial({
    map: loader.load("./textures/8k_earth_clouds.jpg"),
    blending: THREE.AdditiveBlending
})
const cloudMesh = new THREE.Mesh(geometryCloud, cloudMat)
earthGroup.add(cloudMesh)

//Atmosphere mesh
const atmosMat = new THREE.MeshBasicMaterial({
    color: 0x93cfef,
    transparent: true,
    opacity: 0.1
});
const atmosMesh = new THREE.Mesh(geometryAtmos, atmosMat)
earthGroup.add(atmosMesh)

//Sun lighting setup
const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
sunLight.position.set(-2, 0.5, 1.5);
scene.add(sunLight);

//Mesh rotation
function rotate(){
    earthMesh.rotation.y += 0.0005;
    lightsMesh.rotation.y += 0.0005;
    cloudMesh.rotation.y += 0.0003;
}

//Animation rendering loop
function animate() {
    requestAnimationFrame(animate);
    if (rotation) rotate();
    renderer.render(scene, camera);
}

animate();

//Declaring variables for mouse interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

//Mouse click interaction to focus on Earth's clicked point
function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    rotation = false; // Stop rotation on click
    const intersects = raycaster.intersectObjects(earthGroup.children);
    if (intersects.length > 0) { //If intersects with Earth (clicked on Earth)
        const intersect = intersects[0];
        let lat = 90 - (Math.acos(intersect.point.y) * 180 / Math.PI);
        let lon = ((270 + (Math.atan2(intersect.point.x, intersect.point.z) * 180 / Math.PI)) % 360) - 180;
        const offsetAngle = 20 * Math.PI / 180; //offset

        const r = intersect.point.length();
        let theta = Math.acos(intersect.point.y / r); 
        let phi = Math.atan2(intersect.point.z, intersect.point.x); 

        theta = Math.min(theta + offsetAngle, Math.PI); // move down
        phi += offsetAngle; // move left

        let newPoint = new THREE.Vector3(
            r * Math.sin(theta) * Math.cos(phi),
            r * Math.cos(theta),
            r * Math.sin(theta) * Math.sin(phi)
        );


        // Smooth camera transition to new position and lookAt
        const startPos = camera.position.clone();
        const endPos = newPoint.clone().multiplyScalar(2.2).divideScalar(1.5);
        const startLook = camera.getWorldDirection(new THREE.Vector3()).clone();
        const endLook = intersect.point.clone();
        let progress = 0;
        const duration = 60;

        function animateCamera() {
            progress++;
            const t = Math.min(progress / duration, 1);

            camera.position.lerpVectors(startPos, endPos, t);
            camera.lookAt(
            startLook.clone().lerp(endLook, t)
            );

            if (t < 1) {
            requestAnimationFrame(animateCamera);
            }
        }
        animateCamera();
    }
}
window.addEventListener('click', onMouseClick, false);



function handleWindowResize () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleWindowResize, false);