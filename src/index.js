import * as THREE from "three";
import { OrbitControls } from 'jsm/controls/OrbitControls.js';

const w = window.innerWidth;
const h = window.innerHeight;
let rotation = true;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

const earthGroup = new THREE.Group();
earthGroup.rotation.z = -23.4 * Math.PI / 180;
scene.add(earthGroup);
new OrbitControls(camera, renderer.domElement);
const detail = 12;
const loader = new THREE.TextureLoader();
const geometry = new THREE.IcosahedronGeometry(1, detail);
const material = new THREE.MeshPhongMaterial({
    map: loader.load("./textures/earthmap1k.jpg"),
    specularMap: loader.load("./textures/earthspec1k.jpg"),
    bumpMap: loader.load("./textures/earthbump1k.jpg"),
    bumpScale: 0.04,
});

const earthMesh = new THREE.Mesh(geometry, material);
earthGroup.add(earthMesh);

const lightsMat = new THREE.MeshBasicMaterial({
    map: loader.load("./textures/earthlights1k.jpg"),
    blending: THREE.AdditiveBlending,
});
const lightsMesh = new THREE.Mesh(geometry, lightsMat);
earthGroup.add(lightsMesh);

const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
sunLight.position.set(-2, 0.5, 1.5);
scene.add(sunLight);

function rotate(){
    earthMesh.rotation.y += 0.002;
    lightsMesh.rotation.y += 0.002;
}

function animate() {
    requestAnimationFrame(animate);
    if (rotation) rotate();
    renderer.render(scene, camera);
}


animate();


const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    rotation = false; // Stop rotation on click
    const intersects = raycaster.intersectObjects(earthGroup.children);
    if (intersects.length > 0) {
        const intersect = intersects[0];
        let lat = 90 - (Math.acos(intersect.point.y) * 180 / Math.PI);
        let lon = ((270 + (Math.atan2(intersect.point.x, intersect.point.z) * 180 / Math.PI)) % 360) - 180;
        const offsetAngle = 30 * Math.PI / 180; //offset

        const r = intersect.point.length();
        let theta = Math.acos(intersect.point.y / r); 
        let phi = Math.atan2(intersect.point.z, intersect.point.x); 

        theta = Math.min(theta + offsetAngle, Math.PI); // move down
        phi += offsetAngle; // move left

        const newPoint = new THREE.Vector3(
            r * Math.sin(theta) * Math.cos(phi),
            r * Math.cos(theta),
            r * Math.sin(theta) * Math.sin(phi)
        );

        
        camera.position.copy(newPoint.multiplyScalar(2.2));
        camera.lookAt(earthGroup.position);
    }
}
window.addEventListener('click', onMouseClick, false);


function handleWindowResize () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleWindowResize, false);