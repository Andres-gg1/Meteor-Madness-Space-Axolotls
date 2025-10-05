import * as THREE from "three"; //import three.js library
import { OrbitControls } from 'jsm/controls/OrbitControls.js';

// Use a fixed container so the scene can be smaller in the page
const container = document.getElementById('three-container') || document.body;
const w = container.clientWidth || window.innerWidth;
const h = container.clientHeight || window.innerHeight;
const gravity = 9.81/6371; // gravity for meteor acceleration

let curMeteorMesh; 

// Scene setup
let rotation = true; //Rotation control flag
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
camera.position.z = 3;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(w, h);
// append canvas to the container (if found) so it appears smaller
container.appendChild(renderer.domElement);
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
    const rel = getRelativeMouse(event);
    mouse.x = rel.x;
    mouse.y = rel.y;

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
        const endPos = newPoint.clone().multiplyScalar(2.2).divideScalar(1.7);
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

        updateMeteor(intersect.point);
    }
}
// Mouse events should be relative to the container
function getRelativeMouse(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    return {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((event.clientY - rect.top) / rect.height) * 2 + 1
    };
}

window.addEventListener('click', (e) => onMouseClick(e), false);

////////////////////////////////////////////////////////////////
// Meteor
//////////////////////////////////////////////////////////////////
function updateMeteor(collisionPoint, startDistance = 1.4, mass, volume, density, velocity, type, pitchDeg=0, yawDeg=0){
    scene.remove(curMeteorMesh);
    if (curMeteorMesh?.trail) scene.remove(curMeteorMesh.trail);
    if (curMeteorMesh?.burn) scene.remove(curMeteorMesh.burn);
    // Create a new meteor mesh
    const geometryMeteor = new THREE.IcosahedronGeometry(0.02, 3);
    const materialMeteor = new THREE.MeshStandardMaterial({
        map: loader.load("./textures/meteor_texture.jpg"),
        emissive: 0xffffff,
        emissiveIntensity: 0.15
    });
    let meteorMesh = new THREE.Mesh(geometryMeteor, materialMeteor);
    const dir = collisionPoint.clone().normalize();
    const target = dir.clone();
    const start = target.clone()
    const yaw = THREE.MathUtils.degToRad(yawDeg);
    const pitch = THREE.MathUtils.degToRad(pitchDeg);

    //  Apply yaw (rotate horizontally around Y-axis)
    const yawMatrix = new THREE.Matrix4().makeRotationY(yaw);
    start.applyMatrix4(yawMatrix);

    //Apply pitch (rotate vertically around axis perpendicular to Y and dir)
    const sideAxis = new THREE.Vector3().crossVectors(start, new THREE.Vector3(0, 1, 0)).normalize();
    const pitchMatrix = new THREE.Matrix4().makeRotationAxis(sideAxis, pitch);
    start.applyMatrix4(pitchMatrix);

    meteorMesh.position.copy(start.clone().multiplyScalar(startDistance));

    const targetPos = dir.clone().multiplyScalar(1.1); 
    const trajectory = targetPos.clone().sub(start).normalize();

    const velocityVector = trajectory.multiplyScalar(-1 * velocity || -0.0007);

    const trailMaterial = new THREE.LineBasicMaterial({ 
        color: 0xff6600,
        transparent: true,
        opacity: 0.5 
    });
    const trailGeometry = new THREE.BufferGeometry().setFromPoints([start, meteorMesh.position]);
    const trail = new THREE.Line(trailGeometry, trailMaterial);
    scene.add(trail);
    meteorMesh.trail = trail;

    const burnTexture = new THREE.TextureLoader().load("./textures/burn_glow.png");

    const burnMaterial = new THREE.MeshBasicMaterial({
        map: burnTexture,
        color: 0xff9933,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 1
    });
    const burn = new THREE.Mesh(geometryMeteor, burnMaterial);
    meteorMesh.burn = burn;
    meteorMesh.add(burn);

    const particleCount = 5000;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 0] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;

        const dir = new THREE.Vector3(
            (Math.random() - 0.5),
            (Math.random() - 0.5),
            (Math.random() - 0.5)
        ).normalize();
        velocities[i * 3 + 0] = dir.x * 0.0002; // speed multiplier
        velocities[i * 3 + 1] = dir.y * 0.0002;
        velocities[i * 3 + 2] = dir.z * 0.0002;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
        color: 0xffaa33,
        size: 0.003,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    meteorMesh.add(particles); 
    meteorMesh.particles = particles;
    meteorMesh.velocities = velocities;

    function animateMeteor() {
        if (!meteorMesh) return;
        meteorMesh.position.add(velocityVector);

        const pts = [meteorMesh.position.clone(), meteorMesh.position.clone().sub(trajectory.clone().multiplyScalar(0.2))];
        trail.geometry.setFromPoints(pts);
        trailMaterial.opacity = Math.max(0.2, 0.8 - meteorMesh.position.length() / 2);

        // Burn effect appears near atmosphere
        const dist = meteorMesh.position.length();
        if (dist > 1.2) {
            let dirToEarth = meteorMesh.position.clone().normalize().negate();
            velocityVector.add(dirToEarth.multiplyScalar(gravity * 0.02));
        }
        if (dist < 1.20 && dist > 0.1) {
            burn.material.opacity = THREE.MathUtils.mapLinear(dist, 1.15, 1.02, 0.0, 1.0);
            if (dist > 1.1) velocityVector.multiplyScalar(0.9825);
            else if (dist > 1.04) velocityVector.multiplyScalar(0.98);
            else if (dist > 1.02) velocityVector.multiplyScalar(0.974);
            
            const positionsArr = particles.geometry.attributes.position.array;
            const velArr = meteorMesh.velocities;

            for (let i = 0; i < particleCount; i++) {
                positionsArr[i * 3 + 0] += velArr[i * 3 + 0];
                positionsArr[i * 3 + 1] += velArr[i * 3 + 1];
                positionsArr[i * 3 + 2] += velArr[i * 3 + 2];
            }
            particles.geometry.attributes.position.needsUpdate = true;
        } else {
            burn.material.opacity = 0;
        }

        // Stop at collision
        if (dist <= 0.1) {
            burn.material.opacity = 0;
            scene.remove(meteorMesh);
            scene.remove(trail);
            scene.remove(burn);
            curMeteorMesh = null;
            return;
        }

        requestAnimationFrame(animateMeteor);
    }
    animateMeteor();

    curMeteorMesh = meteorMesh; 
    scene.add(meteorMesh);
}

let resetButton = document.getElementById('resetButton');
resetButton.addEventListener('click', () => {
    scene.remove(curMeteorMesh);
    console.log("Resetting meteor position and rotation.");
    // Smoothly transition camera back to default position and lookAt
    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(0, 0, 3);
    const startLook = camera.getWorldDirection(new THREE.Vector3()).clone();
    const endLook = new THREE.Vector3(0, 0, 0);
    let progress = 0;
    const duration = 60;

    function animateCameraReset() {
        progress++;
        const t = Math.min(progress / duration, 1);

        camera.position.lerpVectors(startPos, endPos, t);
        camera.lookAt(
            startLook.clone().lerp(endLook, t)
        );

        if (t < 1) {
            requestAnimationFrame(animateCameraReset);
        } else {
            rotation = true;
        }
    }

    animateCameraReset();
});

function handleWindowResize () {
    const newW = container.clientWidth || window.innerWidth;
    const newH = container.clientHeight || window.innerHeight;
    camera.aspect = newW / newH;
    camera.updateProjectionMatrix();
    renderer.setSize(newW, newH);
}
window.addEventListener('resize', handleWindowResize, false);