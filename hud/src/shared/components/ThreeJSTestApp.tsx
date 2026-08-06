import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { UniverseGenerator, getStellarProperties, hashStringToInt } from '../generator';

export default function ThreeJSTestApp() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Dragging states
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });

  // Initialize camera exactly at the starting system coordinates!
  const startSys = UniverseGenerator.getStartingSystem('BobOS_V12', 0.45);

  // Camera angles/radius/panning inside Refs for buttery dragging
  const rotX = useRef(0.6); // slight tilt to look down on the 3D plane
  const rotY = useRef(0.4);
  const radius = useRef(1200);
  
  // Center camera precisely on the starting system coordinates!
  const panX = useRef(startSys.x);
  const panY = useRef(0);
  const panZ = useRef(startSys.y);

  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. StrictMode safety: Purge mount container entirely before appending duplicate canvas
    mountRef.current.innerHTML = '';

    // 2. Setup Three.js Scene, Camera, and WebGL Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617); // Deep space background

    // Pushed far clipping frustum from 15000 to 300000 to allow immense deep zoom-outs!
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 300000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    mountRef.current.appendChild(renderer.domElement);

    // 3. Add Lights (Ambient space lighting + directional light)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(500, 1000, 500);
    scene.add(dirLight);

    // 4. Endless Procedural Spawning Trackers
    const loadedSystemIds = new Set<string>();
    
    // Dedicated 3D Group to manage dynamic Adaptive Warp current lines
    const warpGroup = new THREE.Group();
    scene.add(warpGroup);

    const activePlanetMeshes: Array<{
      mesh: THREE.Mesh;
      starX: number;
      starZ: number;
      distance: number;
      speed: number;
      startAngle: number;
    }> = [];

    // Helper to draw horizontal 3D circle lines
    const createOrbitLine = (starX: number, starZ: number, orbitRadius: number, opacity = 0.15) => {
      const geometry = new THREE.BufferGeometry();
      const points: THREE.Vector3[] = [];
      const segments = 64;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(starX + Math.cos(theta) * orbitRadius, 0, starZ + Math.sin(theta) * orbitRadius));
      }
      geometry.setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity });
      return new THREE.Line(geometry, material);
    };

    // Helper to draw horizontal 3D warp vector segments (scaled dynamically!)
    const createWarpCurrentVector = (wx: number, wy: number, angle: number, cellSize: number) => {
      const geometry = new THREE.BufferGeometry();
      const len = cellSize * 0.12; // exactly 12% of cell size!
      const points = [
        new THREE.Vector3(wx, -12, wy),
        new THREE.Vector3(wx + Math.cos(angle) * len, -12, wy + Math.sin(angle) * len)
      ];
      geometry.setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.14 });
      return new THREE.Line(geometry, material);
    };

    // Spawn routine to dynamically create new 3D meshes as the user pans around!
    const spawnSystemsInCameraView = () => {
      // Calculate dynamic world boundaries based on zoom radius and current pan target
      const halfSize = Math.max(radius.current * 2.5, 6000); // Fetch a broad envelope around the screen
      
      const tlX = panX.current - halfSize;
      const brX = panX.current + halfSize;
      const tlZ = panZ.current - halfSize;
      const brZ = panZ.current + halfSize;

      const seedHash = hashStringToInt('BobOS_V12');

      // --- ADAPTIVE DYNAMIC GRID RESOLUTION (LOD) FOR WARP CURRENTS ---
      // We scale the cell size of the warp grid proportionally to radius.current (camera distance).
      // This guarantees that we always render a comfortable density (e.g. 24x24) of flow vectors on the screen
      // regardless of whether you are zoomed in close or zoomed far out into deep space!
      const warpCellSize = Math.max(300, Math.floor(radius.current * 0.25));

      // Purge old warp vectors before recalculating the adaptive grid
      // This is incredibly clean, fast, and has 0% memory footprint!
      while (warpGroup.children.length > 0) {
        const obj = warpGroup.children[0];
        warpGroup.remove(obj);
      }

      const startXWarp = Math.floor(tlX / warpCellSize) * warpCellSize;
      const endXWarp = Math.ceil(brX / warpCellSize) * warpCellSize;
      const startZWarp = Math.floor(tlZ / warpCellSize) * warpCellSize;
      const endZWarp = Math.ceil(brZ / warpCellSize) * warpCellSize;

      for (let wx = startXWarp; wx <= endXWarp; wx += warpCellSize) {
        for (let wz = startZWarp; wz <= endZWarp; wz += warpCellSize) {
          const flow = UniverseGenerator.getWarpCurrentAt(wx, wz, seedHash);
          const vectorLine = createWarpCurrentVector(wx, wz, flow.angle, warpCellSize);
          warpGroup.add(vectorLine);
        }
      }

      // Query the prozedural universe generator on the fly!
      const visibleSectors = UniverseGenerator.getSectorsInArea(tlX, brX, tlZ, brZ, 'BobOS_V12', 0.45);

      visibleSectors.forEach((sec) => {
        // Skip spawning if already rendered in scene!
        if (loadedSystemIds.has(sec.id)) return;
        loadedSystemIds.add(sec.id);

        const props = getStellarProperties(sec.mass);
        const coreRadius = props.radius * 4.5 + 8;

        // Determine spectral color
        let colorHex = 0x38bdf8;
        if (sec.spectralClass === 'BlackHole') colorHex = 0xa855f7;
        else if (props.temperature > 10000) colorHex = 0x38bdf8;
        else if (props.temperature > 6000) colorHex = 0xfef08a;
        else if (props.temperature > 4000) colorHex = 0xfb923c;
        else colorHex = 0xef4444;

        const starColor = new THREE.Color(colorHex);

        // --- LEVEL OF DETAIL (LOD) FOR PLANETARY ORBITS & CONES ---
        const showTacticalDetails = radius.current < 22000;

        if (showTacticalDetails) {
          // Draw FAINT Volumetric Nebulae discs in background y = -20
          const nebGeom = new THREE.RingGeometry(0.1, 400, 32);
          const nebMaterial = new THREE.MeshBasicMaterial({
            color: sec.spectralClass === 'BlackHole' ? 0xa855f7 : 0xec4899,
            transparent: true,
            opacity: 0.012,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
          });
          const nebMesh = new THREE.Mesh(nebGeom, nebMaterial);
          nebMesh.rotation.x = Math.PI / 2; // Flat on horizontal plane
          nebMesh.position.set(sec.x, -20, sec.y);
          scene.add(nebMesh);

          // Draw DETERMINISTIC Gravity Wells (Schwerkrafttrichter)
          if (sec.anomaly === 'GravityWell') {
            for (let rRing = 1; rRing <= 3; rRing++) {
              const gravLine = createOrbitLine(sec.x, sec.y, rRing * 45, 0.12);
              scene.add(gravLine);
            }
          }

          // Draw Asteroid Debris Belts (Kiper Belts)
          if (sec.debrisBelt) {
            const debrisLine = createOrbitLine(sec.x, sec.y, coreRadius + 25, 0.22);
            scene.add(debrisLine);
          }

          // SPECIAL DRAW: Pulsar Relativistic Cone Jets in 3D spacetime
          if (sec.spectralClass === 'Pulsar' && sec.anomalyAngle !== undefined) {
            const jetLength = 220;
            const coneGeom = new THREE.ConeGeometry(18, jetLength, 16);
            const coneMaterial = new THREE.MeshBasicMaterial({
              color: 0xa855f7,
              transparent: true,
              opacity: 0.2,
              blending: THREE.AdditiveBlending,
              depthWrite: false
            });

            const coneMesh1 = new THREE.Mesh(coneGeom, coneMaterial);
            const coneMesh2 = new THREE.Mesh(coneGeom, coneMaterial);

            const baseAngle = sec.anomalyAngle;
            
            coneMesh1.position.set(sec.x + Math.cos(baseAngle) * (jetLength / 2), 0, sec.y + Math.sin(baseAngle) * (jetLength / 2));
            coneMesh1.rotation.z = baseAngle - Math.PI / 2;
            scene.add(coneMesh1);

            coneMesh2.position.set(sec.x + Math.cos(baseAngle + Math.PI) * (jetLength / 2), 0, sec.y + Math.sin(baseAngle + Math.PI) * (jetLength / 2));
            coneMesh2.rotation.z = baseAngle + Math.PI / 2;
            scene.add(coneMesh2);
          }
        }

        // --- SPECIAL DRAW: 3D Black Holes with glowing flat Accretion Disks (Schwarzlöcher) ---
        if (sec.spectralClass === 'BlackHole') {
          const eventHorizonR = Math.max(3.0, coreRadius * 0.45);
          const diskR = coreRadius * 1.8;

          // Pitch black Event Horizon sphere in 3D center!
          const holeGeom = new THREE.SphereGeometry(eventHorizonR, 16, 16);
          const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
          const holeMesh = new THREE.Mesh(holeGeom, holeMat);
          holeMesh.position.set(sec.x, 0, sec.y);
          scene.add(holeMesh);

          // Glowing flat Accretion Ring around the hole
          const diskGeom = new THREE.RingGeometry(eventHorizonR + 2, diskR, 32);
          const diskMat = new THREE.MeshBasicMaterial({
            color: 0xa855f7,
            transparent: true,
            opacity: 0.75,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
          });
          const diskMesh = new THREE.Mesh(diskGeom, diskMat);
          diskMesh.rotation.x = Math.PI / 2; // Lie flat
          diskMesh.position.set(sec.x, 0, sec.y);
          scene.add(diskMesh);
        } else {
          // --- GPU POINT-SHADER STAR SYSTEM GEOMETRY ---
          const starGeom = new THREE.BufferGeometry();
          starGeom.setAttribute('position', new THREE.Float32BufferAttribute([sec.x, 0, sec.y], 3));

          // --- GLSL HIGH-PERFORMANCE CUSTOM SHADER MATERIAL ---
          const starShaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
              uColor: { value: starColor },
              uBaseSize: { value: coreRadius * 2.0 }
            },
            vertexShader: `
              uniform float uBaseSize;
              varying vec3 vColor;
              void main() {
                vColor = uColor; // Set color
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_Position = projectionMatrix * mvPosition;
                
                // Realperspective size division
                float projectedSize = (uBaseSize * 350.0) / -mvPosition.z;
                
                // CLAMP MINIMUM SCREEN-SPACE PIXEL SIZE AT 6.0px!
                // Eliminates pixel-disappearing, and prevents bloated beach-balls when zoomed close!
                gl_PointSize = max(6.0, projectedSize);
              }
            `,
            fragmentShader: `
              uniform vec3 uColor;
              void main() {
                // Draw a beautiful soft circular volumetric radial bloom directly on the GPU!
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                // Silky warm soft light fall-off
                float alpha = smoothstep(0.5, 0.08, dist);
                gl_FragColor = vec4(uColor, alpha);
              }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending, // Energy bloom mixing
            depthWrite: false
          });

          const starPoints = new THREE.Points(starGeom, starShaderMaterial);
          scene.add(starPoints);
        }

        // Render 3D Planets & Orbits (only at medium-to-close zooms!)
        if (showTacticalDetails && sec.system && sec.system.planets.length > 0) {
          sec.system.planets.forEach((planet: any) => {
            const orbitRadius = coreRadius + 14 + planet.distance * 35;

            // 1. Render Horizontal Orbit Line Loop
            const orbitLine = createOrbitLine(sec.x, sec.y, orbitRadius);
            scene.add(orbitLine);

            // 2. Render 3D Planet Sphere Mesh (Kept as physical meshes so they look solid next to the shader suns!)
            const pRadius = Math.max(2.5, planet.radius * 1.5);
            const planetGeometry = new THREE.SphereGeometry(pRadius, 8, 8);
            
            let pColor = 0xa8a29e;
            if (planet.type === 'Vulcanian') pColor = 0xef4444;
            else if (planet.type === 'Habitable') pColor = 0x10b981;
            else if (planet.type === 'Desert') pColor = 0xfb923c;
            else if (planet.type === 'GasGiant') pColor = 0x38bdf8;
            else if (planet.type === 'IceGiant') pColor = 0x818cf8;

            const planetMaterial = new THREE.MeshPhongMaterial({ color: pColor, shininess: 30 });
            const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
            
            scene.add(planetMesh);

            // Record for orbiting animations in the loop!
            activePlanetMeshes.push({
              mesh: planetMesh,
              starX: sec.x,
              starZ: sec.y,
              distance: orbitRadius,
              speed: Math.pow(1.0 / planet.distance, 1.5) * 0.45,
              startAngle: sec.x * 17 + sec.y * 31 + planet.orbitIndex * 89
            });
          });
        }
      });
    };

    // Initial spawn on mount
    spawnSystemsInCameraView();

    // 5. Add Coordinate grid indicators (Scaled up from 12000 to 240000 to prevent edge clipping!)
    const gridHelper = new THREE.GridHelper(240000, 96, 0x38bdf8, 0x1e293b);
    gridHelper.position.set(0, -10, 0); // Sit slightly below the stars
    (gridHelper.material as any).transparent = true;
    (gridHelper.material as any).opacity = 0.12;
    scene.add(gridHelper);

    // 6. Active Render & Animation Loop
    let animationFrameId: number;
    let frameCount = 0;

    const animate = () => {
      frameCount++;
      
      // Every 15 frames, query the generator and spawn new stars dynamically as we pan!
      if (frameCount % 15 === 0) {
        spawnSystemsInCameraView();
      }

      // Planet bodies also scale up slightly at deep zooms to preserve orbital readability
      const planetScaleFactor = Math.max(1.0, radius.current / 2500);

      // 1. Calculate Orbiting positions for all planets in 3D Spacetime
      const time = Date.now() * 0.00015;
      activePlanetMeshes.forEach((item) => {
        const angle = item.startAngle + time * item.speed;
        item.mesh.position.set(
          item.starX + Math.cos(angle) * item.distance,
          0,
          item.starZ + Math.sin(angle) * item.distance
        );
        item.mesh.scale.set(planetScaleFactor, planetScaleFactor, planetScaleFactor);
      });

      // 2. Compute camera spherical coords based on dragging
      camera.position.x = panX.current + radius.current * Math.sin(rotX.current) * Math.sin(rotY.current);
      camera.position.y = panY.current + radius.current * Math.cos(rotX.current);
      camera.position.z = panZ.current + radius.current * Math.sin(rotX.current) * Math.cos(rotY.current);
      
      // Camera always looks at our target center
      camera.lookAt(panX.current, 0, panZ.current);

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // 7. Handle Resizing
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.innerHTML = ''; // Safely purge container children!
      }
    };
  }, []);

  // 3D Spherical dragging inputs
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const deltaMove = {
      x: e.clientX - previousMousePosition.current.x,
      y: e.clientY - previousMousePosition.current.y
    };

    if (isDragging.current) {
      if (e.buttons === 1) {
        // Left Click drag rotates orbit camera
        rotY.current -= deltaMove.x * 0.005;
        rotX.current = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, rotX.current - deltaMove.y * 0.005));
      } else if (e.buttons === 2 || e.buttons === 4) {
        // Right Click or Scroll Click drag pans coordinate centers
        const factor = radius.current * 0.001;
        panX.current -= deltaMove.x * Math.cos(rotY.current) * factor;
        panZ.current += deltaMove.x * Math.sin(rotY.current) * factor;
      }
      
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
      forceUpdate(prev => prev + 1);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    // Pushed maximum zoom limit to 150000 meters for incredible, absolute galactic zooms!
    radius.current = Math.max(150, Math.min(150000, radius.current + e.deltaY * 2.0));
    forceUpdate(prev => prev + 1);
  };

  return (
    <div className="relative w-screen h-screen flex flex-col overflow-hidden bg-cyber-dark text-slate-300 font-mono select-none">
      <header className="bg-[#04060b] border-b border-slate-800 flex justify-between items-center px-4 h-10 shrink-0 z-10 select-none">
        <div className="flex items-center gap-3">
          <span className="font-bold text-cyber-blue">[≡] NASA_APOLLON_3D_WEBGL_THREEJS_PROTOTYPE</span>
          <span className="text-emerald-500 font-bold">● VOLUMETRIC_SPACETIME_ACTIVE</span>
        </div>
        <div className="flex gap-4 items-center text-xs text-cyber-gray">
          <div>DRAG: <strong className="text-white">LEFT (Rotate) • RIGHT (Pan)</strong></div>
          <div>PAN-CENTER: <strong className="text-white">X:{Math.round(panX.current)} Z:{Math.round(panZ.current)}</strong></div>
          <div>DISTANCE: <strong className="text-cyber-blue">{Math.round(radius.current)}m</strong></div>
          <a
            href="/sandbox"
            className="border border-slate-800 text-cyber-red font-bold px-3 py-1 rounded-sm no-underline hover:bg-red-500/10 transition-colors"
          >
            ← BACK TO COCKPIT
          </a>
        </div>
      </header>

      <div 
        ref={mountRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()} // Disable right click menu inside 3D canvas
        className="flex-1 w-full h-full block cursor-grab active:cursor-grabbing"
      />
    </div>
  );
}
