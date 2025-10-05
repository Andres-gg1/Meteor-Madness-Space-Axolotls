import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';


function MeteorSimulation() {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const curMeteorMeshRef = useRef(null);
  const rotationRef = useRef(true);
  const earthGroupRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;
    const gravity = 9.81 / 6371;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.z = 3;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(w, h);
    container.appendChild(renderer.domElement);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    rendererRef.current = renderer;

    // Earth model geometry and tilt
    const earthGroup = new THREE.Group();
    earthGroup.rotation.z = -23.4 * Math.PI / 180;
    scene.add(earthGroup);
    earthGroupRef.current = earthGroup;

    new OrbitControls(camera, renderer.domElement);

    const detail = 16;
    const loader = new THREE.TextureLoader();
    const geometry = new THREE.IcosahedronGeometry(1, detail);
    const geometryCloud = new THREE.SphereGeometry(1.01, detail ** 2);
    const geometryAtmos = new THREE.SphereGeometry(1.03, detail ** 2);

    // Earth's model mesh
    const material = new THREE.MeshPhongMaterial({
      map: loader.load("/three-textures/8k_earth_daymap.jpg"),
      specularMap: loader.load("/three-textures/earthspec1k.jpg"),
      bumpMap: loader.load("/three-textures/earthbump1k.jpg"),
      bumpScale: 0.04,
    });
    const earthMesh = new THREE.Mesh(geometry, material);
    earthGroup.add(earthMesh);

    // Lights mesh
    const lightsMat = new THREE.MeshBasicMaterial({
      map: loader.load("/three-textures/8k_earth_nightmap.jpg"),
      blending: THREE.AdditiveBlending,
    });
    const lightsMesh = new THREE.Mesh(geometry, lightsMat);
    earthGroup.add(lightsMesh);

    // Clouds mesh
    const cloudMat = new THREE.MeshStandardMaterial({
      map: loader.load("/three-textures/8k_earth_clouds.jpg"),
      blending: THREE.AdditiveBlending
    });
    const cloudMesh = new THREE.Mesh(geometryCloud, cloudMat);
    earthGroup.add(cloudMesh);

    // Atmosphere mesh
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x93cfef,
      transparent: true,
      opacity: 0.1
    });
    const atmosMesh = new THREE.Mesh(geometryAtmos, atmosMat);
    earthGroup.add(atmosMesh);

    // Sun lighting setup
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
    sunLight.position.set(-2, 0.5, 1.5);
    scene.add(sunLight);

    // Mesh rotation function
    function rotate() {
      earthMesh.rotation.y += 0.0005;
      lightsMesh.rotation.y += 0.0005;
      cloudMesh.rotation.y += 0.0003;
    }

    // Animation rendering loop
    function animate() {
      requestAnimationFrame(animate);
      if (rotationRef.current) rotate();
      renderer.render(scene, camera);
    }
    animate();

    // Mouse interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function getRelativeMouse(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((event.clientY - rect.top) / rect.height) * 2 + 1
      };
    }

    function onMouseClick(event) {
      const rel = getRelativeMouse(event);
      mouse.x = rel.x;
      mouse.y = rel.y;

      raycaster.setFromCamera(mouse, camera);
      rotationRef.current = false;
      const intersects = raycaster.intersectObjects(earthGroup.children);
      
      if (intersects.length > 0) {
        const intersect = intersects[0];
        const offsetAngle = 20 * Math.PI / 180;

        const r = intersect.point.length();
        let theta = Math.acos(intersect.point.y / r);
        let phi = Math.atan2(intersect.point.z, intersect.point.x);

        theta = Math.min(theta + offsetAngle, Math.PI);
        phi += offsetAngle;

        let newPoint = new THREE.Vector3(
          r * Math.sin(theta) * Math.cos(phi),
          r * Math.cos(theta),
          r * Math.sin(theta) * Math.sin(phi)
        );

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
          camera.lookAt(startLook.clone().lerp(endLook, t));

          if (t < 1) {
            requestAnimationFrame(animateCamera);
          }
        }
        animateCamera();

        updateMeteor(intersect.point);
      }
    }

    renderer.domElement.addEventListener('click', onMouseClick);

    // Meteor update function
    function updateMeteor(collisionPoint, startDistance = 1.4, velocity = 0.0007, pitchDeg = 0, yawDeg = 0) {
      if (curMeteorMeshRef.current) {
        scene.remove(curMeteorMeshRef.current);
        if (curMeteorMeshRef.current.trail) scene.remove(curMeteorMeshRef.current.trail);
        if (curMeteorMeshRef.current.burn) scene.remove(curMeteorMeshRef.current.burn);
      }

      const geometryMeteor = new THREE.IcosahedronGeometry(0.02, 3);
      const materialMeteor = new THREE.MeshStandardMaterial({
        map: loader.load("/three-textures/meteor_texture.jpg"),
        emissive: 0xffffff,
        emissiveIntensity: 0.15
      });
      let meteorMesh = new THREE.Mesh(geometryMeteor, materialMeteor);

      const dir = collisionPoint.clone().normalize();
      const target = dir.clone();
      const start = target.clone();
      const yaw = THREE.MathUtils.degToRad(yawDeg);
      const pitch = THREE.MathUtils.degToRad(pitchDeg);

      const yawMatrix = new THREE.Matrix4().makeRotationY(yaw);
      start.applyMatrix4(yawMatrix);

      const sideAxis = new THREE.Vector3().crossVectors(start, new THREE.Vector3(0, 1, 0)).normalize();
      const pitchMatrix = new THREE.Matrix4().makeRotationAxis(sideAxis, pitch);
      start.applyMatrix4(pitchMatrix);

      meteorMesh.position.copy(start.clone().multiplyScalar(startDistance));

      const targetPos = dir.clone().multiplyScalar(1.1);
      const trajectory = targetPos.clone().sub(start).normalize();
      const velocityVector = trajectory.multiplyScalar(-1 * velocity);

      const trailMaterial = new THREE.LineBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.5
      });
      const trailGeometry = new THREE.BufferGeometry().setFromPoints([start, meteorMesh.position]);
      const trail = new THREE.Line(trailGeometry, trailMaterial);
      scene.add(trail);
      meteorMesh.trail = trail;

      const burnTexture = new THREE.TextureLoader().load("/three-textures/burn_glow.png");
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
        velocities[i * 3 + 0] = dir.x * 0.0002;
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

        if (dist <= 0.1) {
          burn.material.opacity = 0;
          scene.remove(meteorMesh);
          scene.remove(trail);
          scene.remove(burn);
          curMeteorMeshRef.current = null;
          return;
        }

        requestAnimationFrame(animateMeteor);
      }
      animateMeteor();

      curMeteorMeshRef.current = meteorMesh;
      scene.add(meteorMesh);
    }

    // Window resize handler
    function handleWindowResize() {
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    }
    window.addEventListener('resize', handleWindowResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleWindowResize);
      renderer.domElement.removeEventListener('click', onMouseClick);
      container.removeChild(renderer.domElement);
      geometry.dispose();
      geometryCloud.dispose();
      geometryAtmos.dispose();
      material.dispose();
      lightsMat.dispose();
      cloudMat.dispose();
      atmosMat.dispose();
      renderer.dispose();
    };
  }, []);

  const handleReset = () => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    
    if (curMeteorMeshRef.current) {
      scene.remove(curMeteorMeshRef.current);
      if (curMeteorMeshRef.current.trail) scene.remove(curMeteorMeshRef.current.trail);
      if (curMeteorMeshRef.current.burn) scene.remove(curMeteorMeshRef.current.burn);
      curMeteorMeshRef.current = null;
    }

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

      if (t < 1) {
        requestAnimationFrame(animateCameraReset);
      } else {
        rotationRef.current = true;
      }
    }

    animateCameraReset();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div 
        ref={containerRef} 
        className="w-[70%] h-full rounded-xl shadow-2xl"
        style={{
          background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.02), rgba(0,0,0,0.02))'
        }}
      />
      <button 
        onClick={handleReset}
        className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition duration-300 font-semibold"
      >
        Reset View
      </button>
    </div>
  );
}

export default MeteorSimulation;