# MeteorSimulation

#### Overview

`MeteorSimulation` is a React component that renders an interactive 3D Earth simulation using **Three.js**, including realistic textures, clouds, atmosphere, and dynamic meteor impacts. Users can interact with the Earth via mouse clicks, trigger meteor impacts, and adjust meteor parameters through a control panel. The component also provides smooth camera animations and scene reset functionality.

***

#### Structure

The component has three main areas:

1. **3D Canvas Area**
   * Rendered with Three.js inside a `div` referenced by `containerRef`.
   * Displays the Earth model, atmosphere, clouds, lights, and any meteors.
   * Handles window resizing and updates camera and renderer accordingly.
2. **Control Panel**
   * Located beside the canvas.
   * Contains sliders for meteor properties: **diameter**, **initial velocity**, **zoom**, and **mass**.
   * Includes an expandable section for advanced parameters.
   * Provides a **Reset View** button to restore the camera and remove meteors.
3. **Simulation Info / Results**
   * Placeholder `div` to display simulation-related messages or results.
   * Currently displays a default message until updated dynamically.

***

#### Three.js Scene Setup

* **Scene:** `sceneRef` stores the main `THREE.Scene`.
* **Camera:** Perspective camera (`cameraRef`) positioned along the z-axis.
* **Renderer:** WebGLRenderer (`rendererRef`) with tone mapping and device pixel ratio handling.
* **Earth Model:**
  * Added as a `THREE.Group` (`earthGroup`) with a tilt of 23.4°.
  * Includes:
    * **Earth Mesh:** Uses `MeshPhongMaterial` with day texture, bump map, and specular map.
    * **Night Lights Mesh:** Blended additive night texture for city lights.
    * **Clouds Mesh:** Semi-transparent sphere with additive blending.
    * **Atmosphere Mesh:** Transparent sphere for atmospheric effect.
* **Lighting:** Directional light (`sunLight`) simulates sunlight.
* **Controls:** `OrbitControls` allows mouse-based rotation, zoom, and pan.

***

#### Meteor Logic

The component allows user-triggered meteor impacts:

1. **Meteor Creation:**
   * Triggered on mouse click on the Earth mesh using a **raycaster**.
   * A new meteor mesh is created with:
     * Icosahedron geometry scaled according to diameter.
     * Standard material with emissive glow.
     * Trail and burn effects.
     * Particle system to simulate debris.
   * Meteor trajectory is calculated based on the clicked point, user-defined yaw and pitch, and initial velocity.
2. **Meteor Animation:**
   * Position is updated per frame.
   * Meteor burn intensity increases as it approaches Earth.
   * Trail geometry is updated dynamically.
   * Particles move outward from the meteor, simulating debris.
   * Point light follows the meteor to simulate glow.
3. **Cleanup:**
   * When the meteor reaches the Earth’s surface, all associated objects (mesh, burn, trail, light) are removed.

***

#### Interaction Handlers

* **Mouse Click:**
  * Computes the click position relative to the canvas.
  * Raycasts into the scene to detect the impact point on Earth.
  * Initiates camera transition and meteor creation.
* **Window Resize:**
  * Updates camera aspect ratio and renderer size on viewport changes.
* **Reset View:**
  * Removes any active meteors and lights.
  * Smoothly interpolates camera back to default position.
  * Resets Earth rotation control.

***

#### State and References

* **Refs for Three.js objects:** `sceneRef`, `cameraRef`, `rendererRef`, `curMeteorMeshRef`, `meteorLightRef`.
* **Rotation toggle:** `rotationRef` controls whether Earth rotates automatically.
* **Texture tracking:** `texturesRef` holds loaded textures for proper disposal.
* **Meteor-related meshes and particles:** Stored in refs to allow dynamic updates and cleanup.

***

#### Resource Management

* Textures, geometries, and materials are tracked and disposed on component unmount to prevent memory leaks.
* Animation loops (`requestAnimationFrame`) are canceled on cleanup.
* Event listeners are removed during cleanup.

***

#### User Controls

* **Sliders:** Adjust meteor diameter, velocity, mass, and zoom.
* **Advanced Parameters:** Expandable section for fine-tuning meteor mass.
* **Reset Button:** Restores camera to default and removes active meteors.

***

#### Animation Loop

* Uses `requestAnimationFrame` for both Earth rotation and meteor movement.
* Earth rotation is subtle for realism.
* Meteor movement incorporates a simple gravity approximation toward the Earth.
* Camera animations are interpolated for smooth transitions when a meteor is created or reset.

***

#### Summary

`MeteorSimulation` provides a fully interactive 3D Earth visualization with meteor impact simulation. It combines realistic rendering (textures, lighting, clouds, atmosphere) with dynamic physics-like effects (meteor trajectory, burn, debris particles) and user-controlled parameters. It also handles resource cleanup and scene management efficiently.
