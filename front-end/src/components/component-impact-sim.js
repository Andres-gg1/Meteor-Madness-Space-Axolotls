import { useEffect, useRef, useState} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Link } from "react-router-dom";
import {URL} from '../App.js';


export default function MeteorDisplay() {
  const containerRef = useRef(null);

  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const curMeteorMeshRef = useRef(null);
  const meteorLightRef = useRef(null);
  const rotationRef = useRef(true);
  const texturesRef = useRef([]);
  const latitudeRef = useRef(0);
  const longitudeRef = useRef(0);
  const impactEnergyRef = useRef(0);

  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [impactEnergy, setImpactEnergy] = useState(0);

  useEffect(() => {
    const container = containerRef.current || document.body;
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    const gravity = 2.1 / 6371;

    // scene / camera / renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.z = 3;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // depending on your three version this property might differ, keep as you had:
    if (THREE.LinearSRGBColorSpace) renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Earth group + tilt
    const earthGroup = new THREE.Group();
    earthGroup.rotation.z = -23.4 * Math.PI / 180;
    scene.add(earthGroup);

    // controls
    const controls = new OrbitControls(camera, renderer.domElement);

    const detail = 16;
    const loader = new THREE.TextureLoader();

    // Utility to track textures for disposal later
    const trackTexture = (tex) => {
      if (tex && tex.dispose) texturesRef.current.push(tex);
      return tex;
    };

    // geometries
    const geometry = new THREE.IcosahedronGeometry(1, detail);
    const geometryCloud = new THREE.SphereGeometry(1.01, Math.max(8, detail ** 2));
    const geometryAtmos = new THREE.SphereGeometry(1.03, Math.max(8, detail ** 2));

    // materials + meshes (store loaded textures)
    const dayTex = trackTexture(loader.load("/textures/8k_earth_daymap.jpg"));
    const specTex = trackTexture(loader.load("/textures/earthspec1k.jpg"));
    const bumpTex = trackTexture(loader.load("/textures/earthbump1k.jpg"));

    const material = new THREE.MeshPhongMaterial({
      map: loader.load("/three-textures/8k_earth_daymap.jpg"),
      specularMap: loader.load("/three-textures/earthspec1k.jpg"),
      bumpMap: loader.load("/three-textures/earthbump1k.jpg"),
      bumpScale: 0.04,
    });
    const earthMesh = new THREE.Mesh(geometry, material);
    earthGroup.add(earthMesh);

    const nightTex = trackTexture(loader.load("/textures/8k_earth_nightmap.jpg"));
    const lightsMat = new THREE.MeshBasicMaterial({
      map: loader.load("/three-textures/8k_earth_nightmap.jpg"),
      blending: THREE.AdditiveBlending,
    });
    const lightsMesh = new THREE.Mesh(geometry.clone(), lightsMat);
    earthGroup.add(lightsMesh);

    const cloudTex = trackTexture(loader.load("/textures/8k_earth_clouds.jpg"));
    const cloudMat = new THREE.MeshStandardMaterial({
      map: loader.load("/three-textures/8k_earth_clouds.jpg"),
      blending: THREE.AdditiveBlending
    });
    const cloudMesh = new THREE.Mesh(geometryCloud, cloudMat);
    earthGroup.add(cloudMesh);

    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x93cfef,
      transparent: true,
      opacity: 0.1,
    });
    const atmosMesh = new THREE.Mesh(geometryAtmos, atmosMat);
    atmosMesh.renderOrder = 1;
    earthGroup.add(atmosMesh);

    // light
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
    sunLight.position.set(-2, 0.5, 1.5);
    scene.add(sunLight);

    // rotation
    function rotate() {
      earthMesh.rotation.y += 0.0005;
      lightsMesh.rotation.y += 0.0005;
      cloudMesh.rotation.y += 0.0003;
    }

    // animation loop
    let animId;
    function animate() {
      animId = requestAnimationFrame(animate);
      if (rotationRef.current) rotate();
      renderer.render(scene, camera);
    }
    animate();

    // raycasting / mouse
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    function getRelativeMouse(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
      };
    }

    // --- Meteor logic moved inside component (converted from your JS) ---
    const createMeteor = async (
      collisionPoint,
      startDistance = 1.4,
      opts = { yawDeg: 0, pitchDeg: 0, velocity: 0.0007, diameter: 1000, density: 1, mass: 1000 }
    ) => {
      try {
        const velocity = opts.velocity || 0.0007;
        const diameter = opts.diameter || 1000;
        const mass = opts.mass * 1000 || 1000;
        const angle = 90;
        const tilt = 23.4 * Math.PI / 180;

        const earthRotation = earthMesh.rotation.y;

// Clone and transform the collision point
const corrected = collisionPoint.clone();

// Undo the Earth's tilt to get to standard orientation
corrected.applyAxisAngle(new THREE.Vector3(0, 0, 1), tilt);

// Calculate latitude
const lat = 90 - (Math.acos(corrected.y / corrected.length()) * 180 / Math.PI);

// Calculate longitude
// In Three.js: X+ is right, Z+ is towards viewer, Y+ is up
// Standard map: 0° lon at prime meridian, positive east, negative west
// At rotation.y = 0, your texture shows prime meridian facing +Z direction
let lon = Math.atan2(corrected.x, corrected.z) * 180 / Math.PI;

// Adjust for Earth's current rotation (rotation is counterclockwise when viewed from above)
lon = lon - (earthRotation * 180 / Math.PI);

// Add texture offset if needed (some Earth textures have prime meridian at different UV coordinates)
// Adjust this value if coordinates are consistently off by a fixed amount
const textureOffset = 90; // Try -90, 0, 90, or 180 if needed
lon = lon + textureOffset;

// Normalize longitude to -180 to 180 range
while (lon > 180) lon -= 360;
while (lon < -180) lon += 360;

console.log(`Calculated coordinates: Lat ${lat.toFixed(2)}°, Lon ${lon.toFixed(2)}°`);

setLatitude(lat);
setLongitude(lon);  

        const response = await fetch(
          `${URL}/impact?velocity=${velocity}&mass=${mass}&diameter=${diameter}&angle=${angle}&latitude=${lat}&longitude=${lon}`
        );
        if (!response.ok) throw new Error("API request failed");

        const data = await response.json();

        // update your simulation results panel
        const resultsDiv = document.getElementById("simulationResults");
        setImpactEnergy(data.impact_energy);
        const energySpan = document.getElementById("energyValue");
        energySpan.textContent = `${data.impact_energy.toFixed(4)} J`;
        const energyTNTSpan = document.getElementById("energyTNTValue");
        energyTNTSpan.textContent = `${data.impact_energy_tnt.toFixed(4)} TNT tons`;
        const energyLossSpan = document.getElementById("energyLostValue");
        energyLossSpan.textContent = `${data.lost_energy.toFixed(4)} J`;
        const percentToSpaceSpan = document.getElementById("massSpaceValue");
        percentToSpaceSpan.textContent = `${data.percent_to_space.toFixed(2)}%`;
        const hiroshimaSpan = document.getElementById("hiroshimaValue");
        hiroshimaSpan.textContent = `${data.impact_energy_hiroshima.toFixed(3)} H-bombs`;

        // remove previous
        if (curMeteorMeshRef.current) {
          scene.remove(curMeteorMeshRef.current);
          if (curMeteorMeshRef.current.trail) scene.remove(curMeteorMeshRef.current.trail);
          if (curMeteorMeshRef.current.burn) scene.remove(curMeteorMeshRef.current.burn);
        }

        const meteorRadiusMeters = opts.diameter / 2;
        const geometryMeteor = new THREE.IcosahedronGeometry(meteorRadiusMeters / 6371000, 3);
        const meteorTex = trackTexture(loader.load("/textures/meteor_texture.jpg"));
        const materialMeteor = new THREE.MeshStandardMaterial({
          map: loader.load("/three-textures/meteor_texture.jpg"),
          emissive: 0xffff50,
          emissiveIntensity: 4.0,
          roughness: 0.4,
          metalness: 0.2,
        });
        const meteorMesh = new THREE.Mesh(geometryMeteor, materialMeteor);

        const dir = collisionPoint.clone().normalize();
        const start = dir.clone();

        const yaw = THREE.MathUtils.degToRad(opts.yawDeg || 0);
        const pitch = THREE.MathUtils.degToRad(opts.pitchDeg || 0);

        // add meteor point light
        const mLight = new THREE.PointLight(0xffaa55, 2.5, 2.5);
        scene.add(mLight);
        // Set light intensity based on meteor diameter (larger meteor = brighter light)
        //mLight.intensity = opts.diameter > 5000 ? 5.0 : opts.diameter > 2000 ? 3.5 : 0.01;
        mLight.intensity = 0;
        meteorLightRef.current = mLight;

        const yawMatrix = new THREE.Matrix4().makeRotationY(yaw);
        start.applyMatrix4(yawMatrix);

        const sideAxis = new THREE.Vector3().crossVectors(start, new THREE.Vector3(0, 1, 0)).normalize();
        const pitchMatrix = new THREE.Matrix4().makeRotationAxis(sideAxis, pitch);
        start.applyMatrix4(pitchMatrix);

        meteorMesh.position.copy(start.clone().multiplyScalar(startDistance + 1));

        const targetPos = dir.clone().multiplyScalar(1.1);
        const trajectory = targetPos.clone().sub(start).normalize();
        const velocityVector = trajectory.multiplyScalar(-1 * (opts.velocity || 0.0007));

        // trail
        const trailMaterial = new THREE.LineBasicMaterial({
          color: 0xff6600,
          transparent: true,
          opacity: 0.5,
        });
        const trailGeometry = new THREE.BufferGeometry().setFromPoints([start, meteorMesh.position]);
        const trail = new THREE.Line(trailGeometry, trailMaterial);
        scene.add(trail);
        meteorMesh.trail = trail;

        // burn texture
        const burnTex = trackTexture(loader.load("/textures/burn_glow.png"));
        const burnMaterial = new THREE.MeshStandardMaterial({
          map: burnTex,
          color: 0xff9933,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 1,
          emissive: 0xff9933,
          emissiveIntensity: 2,
        });
        const burn = new THREE.Mesh(geometryMeteor.clone(), burnMaterial);
        burn.scale.set(1.1, 1.1, 1.1);
        meteorMesh.add(burn);
        meteorMesh.burn = burn;

        // particles
        const particleCount = 5000;
        const particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);

        const meteorRadius = document.getElementById("diameterValue").innerText / 2 / 6371000;
        const earthDir = meteorMesh.position.clone().normalize();
        let particleIndex = 0;
        const layers = 14;
        const perLayer = Math.floor(particleCount / layers);

        for (let layer = 0; layer < layers; layer++) {
          const r = meteorRadius - layer * (meteorRadius / layers) * (0.8 + Math.random() * 0.4);
          for (let i = 0; i < perLayer && particleIndex < particleCount; i++) {
            let x, y, z, dot;
            // sample until point is roughly away-from-earth hemisphere
            let attempts = 0;
            do {
              const u = Math.random();
              const v = Math.random();
              const theta = Math.acos(2 * u - 1);
              const phi = 2 * Math.PI * v;
              x = r * Math.sin(theta) * Math.cos(phi);
              y = r * Math.sin(theta) * Math.sin(phi);
              z = r * Math.cos(theta);
              const point = new THREE.Vector3(x, y, z).normalize();
              dot = point.dot(earthDir);
              attempts++;
              if (attempts > 10) break;
            } while (dot > 0.2);

            positions[particleIndex * 3 + 0] = x;
            positions[particleIndex * 3 + 1] = y;
            positions[particleIndex * 3 + 2] = z;

            const surfaceNormal = new THREE.Vector3(x, y, z).normalize();
            const mix = 0.6;
            const dirVec = surfaceNormal.multiplyScalar(1 - mix).add(earthDir.clone().multiplyScalar(mix));
            dirVec.x += (Math.random() - 0.5) * 0.3;
            dirVec.y += (Math.random() - 0.5) * 0.3;
            dirVec.z += (Math.random() - 0.5) * 0.3;
            dirVec.normalize();

            const speed = 0.0002;
            velocities[particleIndex * 3 + 0] = dirVec.x * speed;
            velocities[particleIndex * 3 + 1] = dirVec.y * speed;
            velocities[particleIndex * 3 + 2] = dirVec.z * speed;

            particleIndex++;
          }
        }

        // ensure attribute sized correctly
        particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

        const particleMaterial = new THREE.PointsMaterial({
          color: 0xffaa33,
          size: 0.003,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });

        const particles = new THREE.Points(particleGeometry, particleMaterial);
        meteorMesh.add(particles);
        meteorMesh.particles = particles;
        meteorMesh.velocities = velocities;

        // animateMeteor
        let running = true;
        const animateMeteor = () => {
          if (!running) return;
          meteorMesh.position.add(velocityVector);

          // point light follow
          if (meteorLightRef.current) {
            const dirFromEarth = meteorMesh.position.clone().normalize();
            const offset = 0.013;
            const lightPos = meteorMesh.position.clone().add(dirFromEarth.clone().multiplyScalar(offset));
            meteorLightRef.current.position.copy(lightPos);
            meteorLightRef.current.intensity = opts.diameter > 5000 ? 0.5 : opts.diameter > 2000 ? 0.25 : 0.1;
          }

          // update trail
          const pts = [
            meteorMesh.position.clone(),
            meteorMesh.position.clone().sub(trajectory.clone().multiplyScalar(0.2)),
          ];
          trail.geometry.setFromPoints(pts);
          trailMaterial.opacity = Math.max(0.2, 0.8 - meteorMesh.position.length() / 2);

          const dist = meteorMesh.position.length();
          if (dist > 1.2) {
            const dirToEarth = meteorMesh.position.clone().normalize().negate();
            velocityVector.add(dirToEarth.multiplyScalar(gravity * 0.02));
          }
          if (dist < 1.20 && dist > 0.1) {
            // Fade in burn as meteor approaches
            burn.material.opacity = THREE.MathUtils.mapLinear(dist, 1.15, 1.02, 0.0, 1.0);

            // Slow down meteor proportionally, but never stop until dist <= 1
            // Use a minimum velocity threshold to prevent stopping
            const minVelocity = 0.00005;
            const currentSpeed = velocityVector.length();

            if (dist > 1.05) {
              // Gradually slow down, but keep above minVelocity
              const slowFactor = 0.985;
              velocityVector.multiplyScalar(slowFactor);
              if (velocityVector.length() < 0.0005) {
                velocityVector.setLength(0.0005);
              }
              else if (velocityVector.length() > 0.0010) {
                velocityVector.setLength(0.0010);
              }
              meteorMesh.material.emissiveIntensity = 6.0;
            } else if (dist > 1.04) {
              // Slow down more, but keep above minVelocity
              const slowFactor = 0.97;
              velocityVector.multiplyScalar(slowFactor);
              if (velocityVector.length() < 0.0001) {
                velocityVector.setLength(0.0001);
              }
              else if (velocityVector.length() > 0.0005) {
                velocityVector.setLength(0.0005);
              }
            } else if (dist > 1.02) {
              // Final approach, keep minimum speed
              if (velocityVector.length() < minVelocity) {
                velocityVector.setLength(minVelocity);
              }
            }
          } else {
            burn.material.opacity = 0;
          }

          if (dist < 1.01 && dist > 0.1) {
            const positionsArr = particles.geometry.attributes.position.array;
            const velArr = meteorMesh.velocities;
            for (let i = 0; i < particleCount; i++) {
              positionsArr[i * 3 + 0] += velArr[i * 3 + 0] * 0.99;
              positionsArr[i * 3 + 1] += velArr[i * 3 + 1] * 0.99;
              positionsArr[i * 3 + 2] += velArr[i * 3 + 2] * 0.99;
            }
            particles.geometry.attributes.position.needsUpdate = true;
          }

          if (dist <= 0.1) {
            burn.material.opacity = 0;
            if (meteorLightRef.current) {
              scene.remove(meteorLightRef.current);
              meteorLightRef.current = null;
            }
            scene.remove(meteorMesh);
            scene.remove(trail);
            scene.remove(burn);
            curMeteorMeshRef.current = null;
            running = false;
            return;
          }

          requestAnimationFrame(animateMeteor);
        };

        animateMeteor();

        curMeteorMeshRef.current = meteorMesh;
        scene.add(meteorMesh);
      }
      catch (error) {
        console.error("Error creating meteor:", error);
      }
    };

    // click handler
    function onMouseClick(event) {
      const rel = getRelativeMouse(event);
      mouse.x = rel.x;
      mouse.y = rel.y;

      raycaster.setFromCamera(mouse, camera);
      rotationRef.current = false;
      const intersects = raycaster.intersectObjects(earthGroup.children, true);

      if (intersects.length > 0) {
        const intersect = intersects[0];
        const offsetAngle = 20 * Math.PI / 180;

        const r = intersect.point.length();
        let theta = Math.acos(intersect.point.y / r);
        let phi = Math.atan2(intersect.point.z, intersect.point.x);

        theta = Math.min(theta + offsetAngle, Math.PI);
        phi += offsetAngle;

        const newPoint = new THREE.Vector3(
          r * Math.sin(theta) * Math.cos(phi),
          r * Math.cos(theta),
          r * Math.sin(theta) * Math.sin(phi)
        );

        // smooth camera transition
        const startPos = camera.position.clone();
        const endPos = newPoint.clone().multiplyScalar(2.2).divideScalar(document.getElementById("zoomValue").innerText / 100 * 2 + 1);
        const startLook = camera.getWorldDirection(new THREE.Vector3()).clone();
        const endLook = intersect.point.clone();
        let progress = 0;
        const duration = 60;

        function animateCamera() {
          progress++;
          const t = Math.min(progress / duration, 1);
          camera.position.lerpVectors(startPos, endPos, t);
          camera.lookAt(startLook.clone().lerp(endLook, t));
          if (t < 1) requestAnimationFrame(animateCamera);
        }
        animateCamera();

        createMeteor(
          intersect.point,
          parseFloat(document.getElementById("distValue").innerText),
          {
            velocity: parseFloat(document.getElementById("velValue").innerText) * 0.000001,
            diameter: parseFloat(document.getElementById("diameterValue").innerText),
            mass: parseFloat(document.getElementById("massValue").innerText),
          }
        );
      }
    }

    renderer.domElement.addEventListener("click", onMouseClick);

    // resize handler
    function handleWindowResize() {
      const newW = container.clientWidth || window.innerWidth;
      const newH = container.clientHeight || window.innerHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    }
    window.addEventListener("resize", handleWindowResize);

    // expose reset handler to button via DOM id (keeps parity with your original script)
    const resetButton = document.getElementById("resetButton");
    const onReset = () => {
      // remove meteor + light
      if (curMeteorMeshRef.current) {
        scene.remove(curMeteorMeshRef.current);
        if (curMeteorMeshRef.current.trail) scene.remove(curMeteorMeshRef.current.trail);
        if (curMeteorMeshRef.current.burn) scene.remove(curMeteorMeshRef.current.burn);
        curMeteorMeshRef.current = null;
      }
      if (meteorLightRef.current) {
        scene.remove(meteorLightRef.current);
        meteorLightRef.current = null;
      }

      // camera smooth reset
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
        camera.lookAt(startLook.clone().lerp(endLook, t));
        if (t < 1) requestAnimationFrame(animateCameraReset);
        else rotationRef.current = true;
      }
      animateCameraReset();
    };

    if (resetButton) resetButton.addEventListener("click", onReset);

    // cleanup
    return () => {
      // remove listeners
      renderer.domElement.removeEventListener("click", onMouseClick);
      window.removeEventListener("resize", handleWindowResize);
      if (resetButton) resetButton.removeEventListener("click", onReset);

      // cancel loops
      cancelAnimationFrame(animId);

      // dispose geometries, materials, textures
      geometry.dispose();
      geometryCloud.dispose();
      geometryAtmos.dispose();

      [material, lightsMat, cloudMat, atmosMat].forEach((m) => {
        try {
          m && m.dispose && m.dispose();
        } catch (e) {}
      });

      // dispose tracked textures
      texturesRef.current.forEach((t) => {
        try {
          t && t.dispose && t.dispose();
        } catch (e) {}
      });
      texturesRef.current = [];

      // remove objects from scene
      if (curMeteorMeshRef.current) {
        scene.remove(curMeteorMeshRef.current);
      }
      if (meteorLightRef.current) {
        scene.remove(meteorLightRef.current);
      }

      // remove renderer dom & dispose
      try {
        container.removeChild(renderer.domElement);
      } catch (e) {}
      renderer.dispose();

      // null refs
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      curMeteorMeshRef.current = null;
      meteorLightRef.current = null;
    };
  }, []);

  // Also provide an in-component Reset button (recommended) that works without relying on DOM id
  const handleResetClick = () => {
    const camera = cameraRef.current;
    if (!camera) return;

    // remove meteor and light
    const scene = sceneRef.current;
    if (curMeteorMeshRef.current) {
      if (curMeteorMeshRef.current.trail) scene.remove(curMeteorMeshRef.current.trail);
      if (curMeteorMeshRef.current.burn) scene.remove(curMeteorMeshRef.current.burn);
      scene.remove(curMeteorMeshRef.current);
      curMeteorMeshRef.current = null;
    }
    if (meteorLightRef.current) {
      scene.remove(meteorLightRef.current);
      meteorLightRef.current = null;
    }

    // camera reset tween
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
      camera.lookAt(startLook.clone().lerp(endLook, t));
      if (t < 1) requestAnimationFrame(animateCameraReset);
      else rotationRef.current = true;
    }
    animateCameraReset();
  };
  
  return (
    <div className="flex w-full h-full gap-4 bg-black">
      {/* Left: Three.js Canvas */}
      <div
        ref={containerRef}
        id="three-container"
        className="flex-1"
        style={{
          background:
          "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.02), rgba(0,0,0,0.02))",
        }}
      ></div>

      {/* Right: Control Panel */}
      <div className="w-80 flex flex-col bg-gray-800 text-white p-4 m-4 gap-4 rounded-xl shadow-2xl">
        {/* Top: Sliders and Advanced Parameters */}
        <div className="flex flex-col gap-4 overflow-auto">
          <div className="flex justify-center mb-2 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 p-2">
            <h2>Click anywhere in the Earth to launch a meteor with the specified parameters!</h2>
          </div>

          {/* Basic Sliders */}
                <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-0.5">
                  <label>
                Initial Distance: <span id="distValue">0.4</span> ua
              </label>
              <input
                type="range"
                min="0.2"
                max="1"
                step="0.01"
                defaultValue="0.4"
                onChange={(e) => (document.getElementById("distValue").innerText = e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-0.5">
              <label>
                Zoom: <span id="zoomValue">50</span> %
              </label>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                defaultValue="50"
                onChange={(e) => (document.getElementById("zoomValue").innerText = e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-0.5">
              <label>
                Diameter: <span id="diameterValue">1000</span> m
              </label>
              <input
                type="range"
                min="100"
                max="10000"
                step="100"
                defaultValue="1000"
                onChange={(e) => (document.getElementById("diameterValue").innerText = e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-0.5">
              <label>
                Initial Velocity: <span id="velValue">40000</span> m/s
              </label>
              <input
                type="range"
                min="10000"
                max="70000"
                step="100"
                defaultValue="40000"
                onChange={(e) => (document.getElementById("velValue").innerText = e.target.value)}
              />
            </div>
          </div>

          {/* Advanced Parameters */}
          <details className="bg-gray-700 p-1 rounded-md">
            <summary className="cursor-pointer font-semibold">Advanced Parameters</summary>
            <div className="flex flex-col gap-1 mt-2">

              <div className="flex flex-col gap-1">
                <label>
                  Mass: <span id="massValue">1000000000000</span>
                </label>
                <input
                  type="range"
                  min="1000000000"
                  max="1000000000000000"
                  step="1000000000"
                  defaultValue="1000000000000"
                  onChange={(e) => (document.getElementById("massValue").innerText = e.target.value)}
                />
              </div>
            </div>
          </details>
        </div>

        {/* Bottom: Simulation Info / Results */}
        <div
          id="simulationResults"
          className="flex-1 p-4 bg-gray-700 rounded-lg overflow-auto text-sm overflow-x-hidden"
        >
          <div className="text-center text-gray-400">
            <p className="font-semibold text-lg">Simulation Results</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-gray-300">
            <div className="flex flex-col items-start">
              <p>Energy: <span id="energyValue"></span></p>
              <p>Energy (TNT): <span id="energyTNTValue"></span></p>
              <p>Energy lost: <span id="energyLostValue"></span></p>
              <p>Mass to space: <span id="massSpaceValue"></span></p>
              <p>Equivalent to: <span id="hiroshimaValue"></span></p>
            </div>
          </div>
        </div>
        <div className="flex flex-row gap-4 h-16">
          <div className="flex gap-4 mt-4">
            <button
              onClick={handleResetClick}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold transition duration-300 text-center"
            >
              <p className="m-0 text-sm">Reset View</p>
            </button>
          </div>

          <div className="flex gap-4 mt-4">
            <Link
              to={`/impact-damage?lat=${latitude}&lon=${longitude}&energy=${impactEnergy}`}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition duration-300 text-center"
            >
              <p>Damage on Impact</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
