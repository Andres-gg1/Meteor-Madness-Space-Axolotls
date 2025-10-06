import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export default function MeteorSimulation() {
  const containerRef = useRef(null);

  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const curMeteorMeshRef = useRef(null);
  const meteorLightRef = useRef(null);
  const rotationRef = useRef(true);
  const texturesRef = useRef([]);

  useEffect(() => {
    const container = containerRef.current || document.body;
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    const gravity = 9.81 / 6371;

    // Default values (median of sliders)
    const DEFAULT_ZOOM = 25;
    const DEFAULT_DIAMETER = 100000;
    const DEFAULT_VELOCITY = 40;
    const DEFAULT_MASS = 80;

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

    // materials + meshes
    const dayTex = trackTexture(loader.load("/three-textures/8k_earth_daymap.jpg"));
    const specTex = trackTexture(loader.load("/three-textures/earthspec1k.jpg"));
    const bumpTex = trackTexture(loader.load("/three-textures/earthbump1k.jpg"));

    const material = new THREE.MeshPhongMaterial({
      map: dayTex,
      specularMap: specTex,
      bumpMap: bumpTex,
      bumpScale: 0.04,
    });
    const earthMesh = new THREE.Mesh(geometry, material);
    earthGroup.add(earthMesh);

    const nightTex = trackTexture(loader.load("/three-textures/8k_earth_nightmap.jpg"));
    const lightsMat = new THREE.MeshBasicMaterial({
      map: nightTex,
      blending: THREE.AdditiveBlending,
    });
    const lightsMesh = new THREE.Mesh(geometry.clone(), lightsMat);
    earthGroup.add(lightsMesh);

    const cloudTex = trackTexture(loader.load("/three-textures/8k_earth_clouds.jpg"));
    const cloudMat = new THREE.MeshStandardMaterial({
      map: cloudTex,
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

    // Meteor logic
    const createMeteor = (
      collisionPoint,
      startDistance = 1.4,
      opts = { yawDeg: 0, pitchDeg: 0, velocity: 0.0007, diameter: 1000, density: 1, mass: 1000 }
    ) => {
      // remove previous
      if (curMeteorMeshRef.current) {
        scene.remove(curMeteorMeshRef.current);
        if (curMeteorMeshRef.current.trail) scene.remove(curMeteorMeshRef.current.trail);
        if (curMeteorMeshRef.current.burn) scene.remove(curMeteorMeshRef.current.burn);
      }

      const meteorRadiusMeters = opts.diameter / 2;
      const geometryMeteor = new THREE.IcosahedronGeometry(meteorRadiusMeters / 6371000, 3);
      const meteorTex = trackTexture(loader.load("/three-textures/meteor_texture.jpg"));
      const materialMeteor = new THREE.MeshStandardMaterial({
        map: meteorTex,
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
      const burnTex = trackTexture(loader.load("/three-textures/burn_glow.png"));
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
      const particleCount = 7000;
      const particleGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const velocities = new Float32Array(particleCount * 3);

      const meteorRadius = DEFAULT_DIAMETER / 2 / 6371000;
      const earthDir = meteorMesh.position.clone().normalize();
      let particleIndex = 0;
      const layers = 14;
      const perLayer = Math.floor(particleCount / layers);

      for (let layer = 0; layer < layers; layer++) {
        const r = meteorRadius - layer * (meteorRadius / layers) * (0.8 + Math.random() * 0.4);
        for (let i = 0; i < perLayer && particleIndex < particleCount; i++) {
          let x, y, z, dot;
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
          meteorLightRef.current.intensity = opts.diameter > 5000 ? 0.2 : opts.diameter > 2000 ? 0.15 : 0.05;
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
        const minVelocity = 0.9;
        const currentSpeed = velocityVector.length();

        if (dist > 1.1) {
            velocityVector.multiplyScalar(0.989);
            meteorMesh.material.emissiveIntensity = 6.0;
          } else if (dist > 1.05) {
            velocityVector.multiplyScalar(0.983
            );
            meteorMesh.material.emissiveIntensity = 7.0;
          } else if (dist > 1.02) {
            velocityVector.multiplyScalar(0.978);
            meteorMesh.material.emissiveIntensity = 8.0;
          } else {
            velocityVector.multiplyScalar(0.971);
          }
        } else {
          burn.material.opacity = 0;
        }

        if (dist < 1.035 && dist > 0.1) {
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
        const endPos = newPoint.clone().multiplyScalar(2.2).divideScalar(DEFAULT_ZOOM / 100 * 2 + 1);
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
          0.4,
          {
            velocity: DEFAULT_VELOCITY * 0.000001,
            diameter: DEFAULT_DIAMETER,
            mass: DEFAULT_MASS,
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

    // cleanup
    return () => {
      renderer.domElement.removeEventListener("click", onMouseClick);
      window.removeEventListener("resize", handleWindowResize);

      cancelAnimationFrame(animId);

      geometry.dispose();
      geometryCloud.dispose();
      geometryAtmos.dispose();

      [material, lightsMat, cloudMat, atmosMat].forEach((m) => {
        try {
          m && m.dispose && m.dispose();
        } catch (e) {}
      });

      texturesRef.current.forEach((t) => {
        try {
          t && t.dispose && t.dispose();
        } catch (e) {}
      });
      texturesRef.current = [];

      if (curMeteorMeshRef.current) {
        scene.remove(curMeteorMeshRef.current);
      }
      if (meteorLightRef.current) {
        scene.remove(meteorLightRef.current);
      }

      try {
        container.removeChild(renderer.domElement);
      } catch (e) {}
      renderer.dispose();

      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      curMeteorMeshRef.current = null;
      meteorLightRef.current = null;
    };
  }, []);

  return (
    <div className="w-full h-full bg-black">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.02), rgba(0,0,0,0.02))",
        }}
      ></div>
    </div>
  );
}