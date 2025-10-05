# OrbitCanvas

#### Overview

`OrbitCanvas` is a React component that renders a 3D visualization of an asteroid’s orbit using **react-three-fiber** (a React wrapper for Three.js) and **drei** helpers. It displays a 3D coordinate system with axes, a grid, scale labels, a star field background, and the asteroid's current position along its orbital path. The component allows for interactive camera control via orbiting and zooming.

***

#### Props

* **orbitalData**: Required prop that contains the asteroid’s orbital information. Expected structure:
  * `orbit_path`: Object with arrays `x`, `y`, `z` representing the asteroid's orbit coordinates.
  * `asteroid_position`: Object with `x`, `y`, `z` representing the asteroid’s current position.

If `orbitalData` is not provided, the component renders nothing.

***

#### Subcomponents

**AxisScaleLabels**

* **Purpose:** Adds numeric labels along the X, Y, and Z axes to indicate scale.
* **Parameters:** `scale` (default: 4) determines how far labels extend in each direction.
* **Behavior:**
  * Generates numbers from `1` to `scale` and their negatives.
  * Positions `Text` elements slightly offset from the axes for visibility.
  * Rotates Z-axis labels to lie flat on the grid plane.
* **Rendering:** Uses `@react-three/drei`'s `Text` component for all axis labels.

**OrbitLine**

* **Purpose:** Draws a smooth line representing the asteroid's orbit.
* **Parameters:** `points` – array of `{x, y, z}` coordinates of the orbit path.
* **Behavior:**
  * Uses `THREE.CatmullRomCurve3` to interpolate points along the orbit.
  * Generates a `BufferGeometry` with 360 points for smooth visualization.
  * Rendered as a `line` with a cyan-colored `lineBasicMaterial`.

***

#### 3D Scene Composition

1. **Canvas Setup**
   * Uses `<Canvas>` from `@react-three/fiber`.
   * Initial camera position: `[5, 5, 5]` with field of view 60°.
   * Includes ambient and point lighting:
     * `ambientLight` for general illumination.
     * `pointLight` at the origin simulating the Sun with high intensity and peach color.
2. **Environment**
   * `Stars` from `drei` to simulate a background star field.
   * `OrbitControls` to enable mouse-based rotation, zoom, and pan.
3. **Coordinate System**
   * `axesHelper` and `gridHelper` render the 3D axes and ground grid.
   * Labels for axes: "X (AU)", "Y (AU)", "Z (AU)" using `Text`.
   * `AxisScaleLabels` provides numeric scale markers along all three axes.
4. **Objects in Scene**
   * **Sun or central point:** Rendered as a yellow sphere.
   * **Reference circle:** A transparent blue line representing a planar reference orbit in XY.
   * **Asteroid Orbit:** Drawn using the `OrbitLine` component based on `orbitalData.orbit_path`.
   * **Asteroid Current Position:** Rendered as a small red sphere at `orbitalData.asteroid_position`.

***

#### Rendering Behavior

* **OrbitLine Interpolation:**\
  Uses Catmull-Rom spline interpolation to ensure smooth curves between discrete orbit points.
* **Dynamic Label Placement:**\
  Axis labels are offset slightly to avoid overlap with axes and grid lines, ensuring readability.
* **Mesh Rendering:**\
  All spheres use `meshStandardMaterial`:
  * The central sphere is emissive yellow.
  * The asteroid sphere is solid red.
* **Transparency and Blending:**\
  The reference circle line is semi-transparent (`opacity=0.5`) with `lineBasicMaterial`.

***

#### Interaction

* Users can rotate, pan, and zoom the scene via `OrbitControls`.
* The scene provides a spatial context with axes, grid, and star background.
* Orbit and asteroid positions dynamically reflect data passed in via `orbitalData`.

***

#### Performance Optimizations

* **Memoization:**\
  `OrbitLine` uses `useMemo` to compute geometry only when the `points` prop changes, avoiding unnecessary recalculations.
* **Efficient Geometry:**\
  Only the required points for the orbit curve are generated (`getPoints(360)`), balancing smoothness and performance.

***

#### Summary

`OrbitCanvas` is a specialized visualization component for 3D asteroid orbital paths. It combines:

* 3D coordinate system with axes and numeric labels,
* Interactive camera control,
* Star field background,
* Orbit line interpolation,
* Dynamic positioning of the asteroid and central point.

It is fully reactive to updates in the `orbitalData` prop, making it suitable for real-time or simulation-based visualizations of orbital mechanics.
