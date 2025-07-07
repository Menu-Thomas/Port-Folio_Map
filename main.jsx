import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import * as THREE from 'https://esm.sh/three@0.150.1';
import { GLTFLoader } from 'https://esm.sh/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://esm.sh/three@0.150.1/examples/jsm/controls/OrbitControls.js'; // Use relative path for OrbitControls
import CircularText from "./CircularText.jsx";
import RotatingText from "./RotatingText.jsx";
import { gsap } from "gsap";

// === Scene Initialization ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);
const originalPosition = { x: 0, y: 5, z: 10 };
const originalLookAtPosition = {x:0, y:0.5,z: 3}
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 1000);
camera.position.set(originalPosition.x, originalPosition.y, originalPosition.z);
camera.lookAt(originalLookAtPosition.x, originalLookAtPosition.y, originalLookAtPosition.z);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows for better quality
renderer.toneMapping = THREE.ACESFilmicToneMapping; // Better tone mapping
renderer.toneMappingExposure = 1.2; // Slightly brighter exposure
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.physicallyCorrectLights = true; // Enable physically correct lighting
document.body.appendChild(renderer.domElement);

//const controls = new OrbitControls(camera, renderer.domElement);

// === Lighting Setup ===
function setupLighting() {
  // Main directional light (sun) - improved settings
  const directionalLight = new THREE.DirectionalLight(0xfff4e6, 3.2); // Warm sunlight
  directionalLight.position.set(20, 25, 15);
  directionalLight.castShadow = true;
  
  // Improved shadow settings
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 100;
  directionalLight.shadow.camera.left = -20;
  directionalLight.shadow.camera.right = 20;
  directionalLight.shadow.camera.top = 20;
  directionalLight.shadow.camera.bottom = -20;
  directionalLight.shadow.bias = -0.0001;
  directionalLight.shadow.normalBias = 0.02;
  scene.add(directionalLight);

  // Ambient light for overall illumination - reduced intensity for more dramatic shadows
  const ambientLight = new THREE.AmbientLight(0x4a5568, 0.4);
  scene.add(ambientLight);

  // Key fill light - warmer tone
  const keyLight = new THREE.PointLight(0xfff8dc, 2.0, 60);
  keyLight.position.set(12, 15, 8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 60;
  keyLight.shadow.bias = -0.0001;
  scene.add(keyLight);

  // Rim light for better object definition - cooler tone
  const rimLight = new THREE.PointLight(0xa8d8ff, 1.5, 40);
  rimLight.position.set(-15, 12, -12);
  rimLight.castShadow = true;
  rimLight.shadow.mapSize.width = 512;
  rimLight.shadow.mapSize.height = 512;
  rimLight.shadow.camera.near = 0.1;
  rimLight.shadow.camera.far = 40;
  scene.add(rimLight);

  // Hemisphere light for natural outdoor lighting - adjusted colors
  const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x8b6914, 0.5);
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);

  // Additional accent light for underwater/mystic effect
  const accentLight = new THREE.PointLight(0x00ffff, 0.8, 25);
  accentLight.position.set(0, -2, 0); // Below the water level
  scene.add(accentLight);
}
setupLighting();

// === Fog Setup for Better Atmosphere ===
scene.fog = new THREE.Fog(0x87ceeb, 10, 50); // Light blue fog, starts at 10 units, fully opaque at 50 units

// === Hex Map Setup ===
const hexMap = [
  { q: 0, r: 0, type: 'home', cameraPos: { x: 0.5, y: 0.08, z: 0} },
  { q: 1, r: 0, type: 'cv', cameraPos: { x: 2.45, y: 0.5, z: 0.5 } },
  { q: 0, r: 1, type: 'projects', cameraPos: { x: 1.2, y: 1.0, z: 2.2 } },
  { q: 2, r: 2, type: 'contact', cameraPos: { x: 5.2, y: 0.8, z: 4.5 } },
  { q: 1, r: 2, type: 'bridge', cameraPos: { x: -1.5, y: 0.5, z: 0.4 } },
  { q: -2, r: 0, type: 'plain1' },
  { q: -1, r: 2, type: 'plain1' },
  { q: 0, r: 2, type: 'plain1' },
  { q: -1, r: 1, type: 'plain1' },
  { q: -2, r: -1, type: 'plain1' },
  { q: 0, r: -1, type: 'champ1', cameraPos: { x: -0.7, y: 0.7, z: -0.9 } },
  { q: -1, r: 0, type: 'champ2', cameraPos: { x: -1.5, y: 0.4, z: 0.4 } },
  { q: 1, r: 1, type: 'forest1', cameraPos: { x: 1.8, y: 0.65, z: 0 }},
  { q: 3, r: -1, type: 'forest2', cameraPos: { x: 5, y: 0.3, z: -0.1}},
  { q: 2, r: 0, type: 'forest3', cameraPos: { x: 1.8, y: 0.65, z: 0 } },
  { q: 1, r: -1, type: 'forge2', cameraPos: { x: 1.26, y: 0.3, z: -0.82 }},
  { q: 2, r: -1, type: 'forest1', cameraPos: { x: 1.8, y: 0.65, z: 0 } },
  { q: 2, r: -2, type: 'forest2', cameraPos: { x: 2, y: 0.25, z: -2}},
  { q: 1, r: -2, type: 'marais2', cameraPos: { x: -1, y: 0.75, z: -1.4 } },
  { q: 0, r: -2, type: 'marais', cameraPos: { x: -1, y: 0.75, z: -1.4 } },
  { q: -1, r: -2, type: 'marais2', cameraPos: { x: -1, y: 0.75, z: -1.4 } },
  { q: -1, r: -1, type: 'marais', cameraPos: { x: -1, y: 0.75, z: -1.4 } },
  { q: -2, r: 2, type: 'desert1', cameraPos: { x: -2.6, y: 1, z: 4.7} },
  { q: -3, r: 2, type: 'desert2', cameraPos: { x: -2.6, y: 1, z: 4.7} },
  { q: -3, r: 1, type: 'desert1', cameraPos: { x: -2.6, y: 1, z: 4.7} },
  { q: -2, r: 1, type: 'desert2', cameraPos: { x: -2.6, y: 1, z: 4.7} },
];

const loader = new GLTFLoader();
const hexObjects = [];

// === Drawer Models & Drawers Array (move these up before any usage) ===
const drawerModels = ['drawer1', 'drawer2', 'drawer3', 'drawer4', 'steering', 'pc', 'forge'];
const drawers = [];

// === List of drawers that should animate on hover ===
const animatedDrawers = ['drawer1', 'drawer2', 'drawer3', 'drawer4'];

// === List of drawers that should animate camera on click ===
const clickAnimatedDrawers = ['pc', 'steering'];

// Camera target positions for click-animated drawers
const drawerCameraTargets = {
  pc: {
    x: -0.05, y: 0.05, z: -0.15,
    lookAt: { x: -0.25, y: -0.04, z: -0.35 } // exemple, ajuste selon besoin
  },
  steering: {
    x: -0.1, y: 0.005, z: 0.16,
    lookAt: { x: -0.16, y: 0.005, z: 0.24 } // exemple, ajuste selon besoin
  },
  // Ajoute d'autres objets ici si besoin, ex:
  // steering: { x: 1, y: 2, z: 3, lookAt: { x: 0, y: 0, z: 0 } }
};

// Adjust hex map elements to be lower
hexMap.forEach(({ q, r, type }) => {
  const { x, z } = hexToWorld(q, r);
  loader.load(`./models/Hex-${type}.glb`, (gltf) => {
    processGLBMaterials(gltf); // Apply improved material processing
    const hex = gltf.scene;
    hex.position.set(x, 0, z);
    hex.scale.set(1, 1, 1);
    hex.userData = { type, q, r };
    scene.add(hex);
    hexObjects.push(hex);
  });
});

function hexToWorld(q, r, size = 1) {
  const x = size * Math.sqrt(3) * (q + r / 2);
  const z = size * 1.5 * r;
  return { x, z };
}

// === Ocean Setup ===
function createOcean() {
  const geometry = new THREE.PlaneGeometry(100, 100, 50, 50);
  geometry.rotateX(-Math.PI / 2);

  const vertData = [];
  const v3 = new THREE.Vector3();

  for (let i = 0; i < geometry.attributes.position.count; i++) {
    v3.fromBufferAttribute(geometry.attributes.position, i);

    const distanceFromCenter = Math.sqrt(v3.x * v3.x + v3.z * v3.z);
    const waveHeight = Math.sin(distanceFromCenter * 0.2 + Math.PI / 4) * 0.5;
    v3.y += waveHeight;

    vertData.push({
      initH: v3.y,
      amplitude: THREE.MathUtils.randFloatSpread(0.5),
      phase: THREE.MathUtils.randFloat(0, Math.PI),
    });

    geometry.attributes.position.setXYZ(i, v3.x, v3.y, v3.z);
  }
  geometry.attributes.position.needsUpdate = true;

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#1a82f7');
  gradient.addColorStop(0.7, '#1e3a8a');
  gradient.addColorStop(1, '#1f2937');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  // Improved ocean material with better lighting response
  const material = new THREE.MeshStandardMaterial({ 
    map: texture,
    transparent: true,
    opacity: 0.9,
    roughness: 0.1,
    metalness: 0.0,
    envMapIntensity: 0.8
  });
  
  // Apply environment map if available
  if (scene.environment) {
    material.envMap = scene.environment;
  }
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = -1; // Lowered ocean position further
  mesh.receiveShadow = true; // Enable shadow receiving
  scene.add(mesh);

  return { geometry, vertData };
}
const { geometry: oceanGeometry, vertData: oceanVertData } = createOcean();

// circular text 
//const circularTextContainer = document.createElement("div");
//circularTextContainer.id = "circularTextContainer";
//circularTextContainer.style.position = "absolute"; // Use absolute positioning
//circularTextContainer.style.top = "120px"; // Further down
//circularTextContainer.style.left = "120px"; // Further to the right
//circularTextContainer.style.transform = "translate(0, 0)"; // No centering needed
//circularTextContainer.style.pointerEvents = "none"; // Ensure it doesn't block interactions
//circularTextContainer.style.zIndex = "1"; // Ensure it appears above the canvas
//renderer.domElement.parentElement.style.position = "relative"; // Ensure the canvas container is positioned relative
//renderer.domElement.parentElement.appendChild(circularTextContainer);
//
//const root = ReactDOM.createRoot(circularTextContainer);
//root.render(
//  <CircularText
//    text="MENU*THOMAS*PORTFOLIO*"
//    spinDuration={30}
//    onHover="speedUp"
//    className="small-circular-text" 
//  />
//);

// Create rotating text container with fixed text
const rotatingTextContainer = document.createElement("div");
rotatingTextContainer.id = "rotatingTextContainer";
rotatingTextContainer.style.position = "absolute";
rotatingTextContainer.style.top = "5px"; // Top middle of the screen
rotatingTextContainer.style.left = "50%";
rotatingTextContainer.style.transform = "translateX(-50%)"; // Center horizontally
rotatingTextContainer.style.pointerEvents = "none";
rotatingTextContainer.style.zIndex = "1";
renderer.domElement.parentElement.appendChild(rotatingTextContainer);

const fixedText = "Welcome to my"; // Fixed text
let currentRotatingText = 'Portfolio'; // Default rotating text

const rootRotating = ReactDOM.createRoot(rotatingTextContainer);
function renderRotatingText() {
  rootRotating.render(
    <div className="rotating-text-container" style={{ position: "relative", textAlign: "center", gap: "0.5rem" }}>
      <span className="fixed-text" style={{ fontWeight: "bold", color: "#ffffff" }}>{fixedText}</span>
      <div>
        <RotatingText
          texts={[currentRotatingText,currentRotatingText]}
          staggerFrom={"last"}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          loop={false}
          exit={{ y: "-120%" }}
          staggerDuration={0.025}
          splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
          transition={{ type: "spring", damping: 30, stiffness: 400 }}
          rotationInterval={2000}
        />
      </div>
    </div>
  );
}
renderRotatingText(); // Initial render

// Update rotating text on hex hover and handle drawer hover animation
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let hoveredDrawer = null;

// === Drawer Hover Label Setup ===
const drawerLabel = document.createElement("div");
drawerLabel.id = "drawerLabel";
drawerLabel.style.position = "fixed";
drawerLabel.style.display = "none";
drawerLabel.style.background = "rgba(0,0,0,0.7)"; // transparent black
drawerLabel.style.color = "#fff";
drawerLabel.style.padding = "16px 24px";
drawerLabel.style.borderRadius = "12px";
drawerLabel.style.fontWeight = "normal";
drawerLabel.style.fontSize = "1rem";
drawerLabel.style.boxShadow = "0 2px 16px rgba(0,0,0,0.18)";
drawerLabel.style.pointerEvents = "none";
drawerLabel.style.zIndex = "100";
drawerLabel.style.maxWidth = "340px";
drawerLabel.style.lineHeight = "1.5";
drawerLabel.style.border = "1px solid #eee";
drawerLabel.style.transition = "opacity 0.2s";
document.body.appendChild(drawerLabel);

// Drawer info file mapping for each drawer
const drawerInfoFiles = {
  drawer1: "project1.html",
  drawer2: "project2.html",
  drawer3: "project3.html",
  drawer4: "project4.html"
};

window.addEventListener('mousemove', (event) => {
  // Check if mouse is over the navigation sidebar
  const navSidebar = document.getElementById('zoneNavSidebar');
  if (navSidebar && navSidebar.contains(event.target)) {
    // Hide drawer label and reset hover states when over nav
    drawerLabel.style.display = "none";
    if (hoveredDrawer && drawerOriginalPositions.has(hoveredDrawer) && animatedDrawers.includes(hoveredDrawer.userData.type)) {
      const orig = drawerOriginalPositions.get(hoveredDrawer);
      gsap.to(hoveredDrawer.position, {
        x: orig.x,
        z: orig.z,
        duration: 0.3,
        ease: 'power2.out',
      });
      hoveredDrawer = null;
    }
    return; // Don't process 3D canvas hover if over nav
  }

  const canvasBounds = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
  mouse.y = -((event.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects([...hexObjects, ...drawers], true); // Include both hexObjects and drawers

  let foundDrawer = null;

  if (intersects.length > 0) {
    let object = intersects[0].object;
    while (object.parent && !hexObjects.includes(object) && !drawers.includes(object)) object = object.parent;

    if (object.userData.type) {
      currentRotatingText = object.userData.type;
      renderRotatingText();

      // Drawer hover logic
      if (drawers.includes(object)) {
        foundDrawer = object;
        // === Only animate if in animatedDrawers ===
        if (animatedDrawers.includes(object.userData.type)) {
          if (hoveredDrawer !== foundDrawer) {
            // Animate previous hovered drawer back
            if (hoveredDrawer && drawerOriginalPositions.has(hoveredDrawer)) {
              const orig = drawerOriginalPositions.get(hoveredDrawer);
              gsap.to(hoveredDrawer.position, {
                x: orig.x,
                z: orig.z,
                duration: 0.3,
                ease: 'power2.out',
              });
            }
            // Animate new hovered drawer
            gsap.to(foundDrawer.position, {
              x: 0.029,
              z: -0.0374,
              duration: 0.3,
              ease: 'power2.out',
            });
            hoveredDrawer = foundDrawer;
          }
        } else {
          // For non-animated drawers, just update hoveredDrawer reference (no animation)
          if (
            hoveredDrawer &&
            hoveredDrawer !== foundDrawer &&
            drawerOriginalPositions.has(hoveredDrawer) &&
            animatedDrawers.includes(hoveredDrawer.userData.type)
          ) {
            const orig = drawerOriginalPositions.get(hoveredDrawer);
            gsap.to(hoveredDrawer.position, {
              x: orig.x,
              z: orig.z,
              duration: 0.3,
              ease: 'power2.out',
            });
          }
          hoveredDrawer = foundDrawer;
        }
        // Show label much further up and right of mouse with per-drawer HTML content
        const infoFile = drawerInfoFiles[object.userData.type];
        if (infoFile) {
          fetch(infoFile)
            .then(res => res.text())
            .then(html => {
              // Add unread indicator if drawer is unread
              const isUnread = unreadDrawers.has(object.userData.type);
              const unreadIndicator = isUnread ? `<div style="background: #ff4444; color: #fff; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: bold; margin-bottom: 8px; text-align: center;">UNREAD</div>` : '';
              
              drawerLabel.innerHTML = unreadIndicator + html;
              drawerLabel.style.display = "block";
              // Add border color based on read status
              drawerLabel.style.border = isUnread ? "2px solid #ff4444" : "1px solid #eee";
              // Initial position
              drawerLabel.style.left = `${event.clientX + 60}px`;
              drawerLabel.style.top = `${event.clientY - 180}px`;
              // After rendering, adjust if out of viewport
              requestAnimationFrame(() => {
                const rect = drawerLabel.getBoundingClientRect();
                let left = rect.left, top = rect.top;
                let needUpdate = false;
                if (rect.right > window.innerWidth) {
                  left = Math.max(window.innerWidth - rect.width - 8, 8);
                  needUpdate = true;
                }
                if (rect.left < 0) {
                  left = 8;
                  needUpdate = true;
                }
                if (rect.bottom > window.innerHeight) {
                  top = Math.max(window.innerHeight - rect.height - 8, 8);
                  needUpdate = true;
                }
                if (rect.top < 0) {
                  top = 8;
                  needUpdate = true;
                }
                if (needUpdate) {
                  drawerLabel.style.left = `${left}px`;
                  drawerLabel.style.top = `${top}px`;
                }
              });          // === Mark drawer as read (except forge and steering) ===
          if (unreadDrawers.has(object.userData.type) && object.userData.type !== 'forge' && object.userData.type !== 'steering') {
            unreadDrawers.delete(object.userData.type);
            updateThemeUnreadBadges();
          }
            });
        } else {
          // Custom messages for specific drawers
          let message = `<div>No info available.</div>`;
          if (object.userData.type === 'forge') {
            message = `<div>My conception bigger experience</div>`;
          } else if (object.userData.type === 'steering') {
            message = `<div>My biggest dev project</div>`;
          }
          
          drawerLabel.innerHTML = message;
          drawerLabel.style.display = "block";
          drawerLabel.style.left = `${event.clientX + 60}px`;
          drawerLabel.style.top = `${event.clientY - 180}px`;
          requestAnimationFrame(() => {
            const rect = drawerLabel.getBoundingClientRect();
            let left = rect.left, top = rect.top;
            let needUpdate = false;
            if (rect.right > window.innerWidth) {
              left = Math.max(window.innerWidth - rect.width - 8, 8);
              needUpdate = true;
            }
            if (rect.left < 0) {
              left = 8;
              needUpdate = true;
            }
            if (rect.bottom > window.innerHeight) {
              top = Math.max(window.innerHeight - rect.height - 8, 8);
              needUpdate = true;
            }
            if (rect.top < 0) {
              top = 8;
              needUpdate = true;
            }
            if (needUpdate) {
              drawerLabel.style.left = `${left}px`;
              drawerLabel.style.top = `${top}px`;
            }
          });
          // === Mark drawer as read (except forge and steering) ===
          if (unreadDrawers.has(object.userData.type) && object.userData.type !== 'forge' && object.userData.type !== 'steering') {
            unreadDrawers.delete(object.userData.type);
            updateThemeUnreadBadges();
          }
        }
      } else {
        // Not hovering a drawer, animate previous hovered drawer back
        if (
          hoveredDrawer &&
          drawerOriginalPositions.has(hoveredDrawer) &&
          animatedDrawers.includes(hoveredDrawer.userData.type)
        ) {
          const orig = drawerOriginalPositions.get(hoveredDrawer);
          gsap.to(hoveredDrawer.position, {
            x: orig.x,
            z: orig.z,
            duration: 0.3,
            ease: 'power2.out',
          });
          hoveredDrawer = null;
        } else if (hoveredDrawer && !animatedDrawers.includes(hoveredDrawer.userData.type)) {
          hoveredDrawer = null;
        }
        drawerLabel.style.display = "none";
      }
    }
  } else {
    currentRotatingText = 'Portfolio';
    renderRotatingText();
    // Animate previous hovered drawer back (only if animated)
    if (
      hoveredDrawer &&
      drawerOriginalPositions.has(hoveredDrawer) &&
      animatedDrawers.includes(hoveredDrawer.userData.type)
    ) {
      const orig = drawerOriginalPositions.get(hoveredDrawer);
      gsap.to(hoveredDrawer.position, {
        x: orig.x,
        z: orig.z,
        duration: 0.3,
        ease: 'power2.out',
      });
      hoveredDrawer = null;
    } else if (hoveredDrawer && !animatedDrawers.includes(hoveredDrawer.userData.type)) {
      hoveredDrawer = null;
    }
    drawerLabel.style.display = "none";
  }
});

// === GLB Material Processing ===
function processGLBMaterials(gltf) {
  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      // Enable shadow casting and receiving
      child.castShadow = true;
      child.receiveShadow = true;
      
      if (child.material) {
        // Ensure proper material properties for PBR rendering
        if (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial) {
          // Enable environment mapping if available
          if (scene.environment) {
            child.material.envMap = scene.environment;
            child.material.envMapIntensity = 0.8;
          }
          
          // Improve material properties for better lighting response
          if (child.material.metalness === undefined) child.material.metalness = 0.1;
          if (child.material.roughness === undefined) child.material.roughness = 0.7;
          
          // Enable proper normal mapping with better scale
          if (child.material.normalMap) {
            child.material.normalScale.set(1.2, 1.2);
          }
          
          // Add subtle emission for better visibility in dark areas
          if (!child.material.emissive) {
            child.material.emissive = new THREE.Color(0x000000);
          }
          
          // Update material
          child.material.needsUpdate = true;
        }
        
        // Handle multiple materials (arrays)
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => {
            if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
              if (scene.environment) {
                mat.envMap = scene.environment;
                mat.envMapIntensity = 0.8;
              }
              if (mat.metalness === undefined) mat.metalness = 0.1;
              if (mat.roughness === undefined) mat.roughness = 0.7;
              if (mat.normalMap) {
                mat.normalScale.set(1.2, 1.2);
              }
              if (!mat.emissive) {
                mat.emissive = new THREE.Color(0x000000);
              }
              mat.needsUpdate = true;
            }
          });
        }
      }
    }
  });
}

// === Background Setup ===
const textureLoader = new THREE.TextureLoader();
textureLoader.load('./textures/env.jpg', (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  
  // Set as both background and environment for reflections
  scene.background = texture;
  scene.environment = texture;
  
  // Process existing materials to use the new environment
  scene.traverse((child) => {
    if (child.isMesh && child.material) {
      if (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial) {
        child.material.envMap = texture;
        child.material.envMapIntensity = 0.8;
        child.material.needsUpdate = true;
      }
      if (Array.isArray(child.material)) {
        child.material.forEach(mat => {
          if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
            mat.envMap = texture;
            mat.envMapIntensity = 0.8;
            mat.needsUpdate = true;
          }
        });
      }
    }
  });
});

// === Animation Loop ===
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();

  // Animate ocean waves
  oceanVertData.forEach((vd, idx) => {
    const y = vd.initH + Math.sin(time + vd.phase) * vd.amplitude;
    oceanGeometry.attributes.position.setY(idx, y);
  });
  oceanGeometry.attributes.position.needsUpdate = true;
  oceanGeometry.computeVertexNormals();

  renderer.render(scene, camera);
}
animate();


// === Helper Object ===
const helperGeometry = new THREE.SphereGeometry(0.05, 10, 10); // Small sphere
const helperMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const helper = new THREE.Mesh(helperGeometry, helperMaterial);
scene.add(helper);

// Set the helper's position
helper.position.set(0, 3, 0); // Replace with the desired coordinates

window.addEventListener('keydown', (event) => {
  const step = 0.02; // Movement step size
  switch (event.key) {
    case 'a': // Move up
      helper.position.y += step;
      break;
    case 'e': // Move down
      helper.position.y -= step;
      break;
    case 'q': // Move left
      helper.position.x -= step;
      break;
    case 'd': // Move right
      helper.position.x += step;
      break;
    case 'z': // Move forward
      helper.position.z -= step;
      break;
    case 's': // Move backward
      helper.position.z += step;
      break;
  }
  console.log(helper.position); // Log the new position
});


let lookAtTarget = { x: originalLookAtPosition.x, y: originalLookAtPosition.y, z: originalLookAtPosition.z }; 

window.addEventListener('wheel', (event) => {
  if (event.deltaY > 0) { // Detect scroll down
    // Reset active nav state since we're going back to overview
    currentActiveHexType = null;
    updateNavActiveState(null);
    
    // Reset virtual modal state when going back to overview
    virtualModalClosed = false;
    steeringWheelClicked = false;
    
    gsap.to(camera.position, {
      x: originalPosition.x,
      y: originalPosition.y,
      z: originalPosition.z,
      duration: 2, // Duration of the animation in seconds
      ease: 'power3.inOut',
    });

    // Smoothly interpolate the lookAt position
    gsap.to(lookAtTarget, {
      x: originalLookAtPosition.x,
      y: originalLookAtPosition.y,
      z: originalLookAtPosition.z, // Reset lookAt to the original target
      duration: 2, // Match duration with camera movement
      ease: 'power3.inOut',
      onUpdate: () => {
        camera.lookAt(lookAtTarget.x, lookAtTarget.y, lookAtTarget.z); // Update lookAt dynamically
      },
    });
  }
});

window.addEventListener('click', (event) => {
  // Check if click is on the navigation sidebar
  const navSidebar = document.getElementById('zoneNavSidebar');
  if (navSidebar && navSidebar.contains(event.target)) {
    return; // Don't process 3D canvas clicks if clicking on nav
  }

  const canvasBounds = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
  mouse.y = -((event.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects([...hexObjects, ...drawers], true);

  if (intersects.length > 0) {
    let object = intersects[0].object;
    while (object.parent && !hexObjects.includes(object) && !drawers.includes(object)) object = object.parent;

    // Animation caméra pour hexagones classiques
    if (object.userData.q !== undefined && object.userData.r !== undefined) {
      currentActiveHexType = object.userData.type; // Update active type on 3D click
      
      // Reset virtual modal state when navigating to different areas
      virtualModalClosed = false;
      steeringWheelClicked = false;
      
      const hexPosition = object.position;
      const hexData = hexMap.find(hex => hex.q === object.userData.q && hex.r === object.userData.r);
      const cameraPos = hexData?.cameraPos || { x: 0, y: 5, z: 10 }; // Default camera position

      gsap.to(camera.position, {
        x: cameraPos.x,
        y: cameraPos.y,
        z: cameraPos.z,
        duration: 2,
        ease: 'power3.inOut',
      });

      gsap.to(lookAtTarget, {
        x: hexPosition.x,
        y: hexPosition.y,
        z: hexPosition.z,
        duration: 2,
        ease: 'power3.inOut',
        onUpdate: () => {
          camera.lookAt(lookAtTarget.x, lookAtTarget.y, lookAtTarget.z);
        },
      });

      // Update active nav item when clicking on 3D objects
      updateNavActiveState(object.userData.type);
    }
    // Animation caméra pour objets spéciaux (ex: pc)
    else if (object.userData.type && clickAnimatedDrawers.includes(object.userData.type)) {
      const camTarget = drawerCameraTargets[object.userData.type];
      if (camTarget) {
        // Set flag only if user clicked on steering wheel
        if (object.userData.type === 'steering') {
          steeringWheelClicked = true;
        }
        
        gsap.to(camera.position, {
          x: camTarget.x,
          y: camTarget.y,
          z: camTarget.z,
          duration: 2,
          ease: 'power3.inOut',
          onComplete: () => {
            if (object.userData.type === 'steering' && steeringWheelClicked && !virtualModalClosed) {
              showVirtualModal();
              steeringWheelClicked = false; // Reset flag after showing modal
            }
          }
        });
        // Utilise camTarget.lookAt si défini, sinon fallback sur l'objet
        const lookAt = camTarget.lookAt || object.position;
        gsap.to(lookAtTarget, {
          x: lookAt.x,
          y: lookAt.y,
          z: lookAt.z,
          duration: 2,
          ease: 'power3.inOut',
          onUpdate: () => {
            camera.lookAt(lookAtTarget.x, lookAtTarget.y, lookAtTarget.z);
          },
        });
      }
    }
    // Affiche forge.html si on clique sur l'objet forge
    else if (object.userData.type === 'forge') {
      // Mark forge as read
      if (unreadDrawers.has('forge')) {
        unreadDrawers.delete('forge');
        updateThemeUnreadBadges();
      }
      showForgeModal();
    }
  }
});

// === Modal state tracking ===
let virtualModalClosed = false; // Track if user has manually closed the virtual modal
let steeringWheelClicked = false; // Track if user actually clicked on the steering wheel

// === Modal for forge.html ===
function showForgeModal() {
  let modal = document.getElementById('forgeModal');
  if (modal) return; // Already open
  modal = document.createElement('div');
  modal.id = 'forgeModal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.background = 'rgba(0,0,0,0.65)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '9999';

  const content = document.createElement('div');
  content.style.background = '#222';
  content.style.borderRadius = '18px';
  content.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)';
  content.style.overflow = 'hidden';
  content.style.position = 'relative';
  content.style.width = 'min(90vw, 900px)';
  content.style.height = 'min(80vh, 600px)';
  content.style.display = 'flex';
  content.style.flexDirection = 'column';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '10px';
  closeBtn.style.right = '16px';
  closeBtn.style.background = 'rgba(0,0,0,0.5)';
  closeBtn.style.color = '#fff';
  closeBtn.style.border = 'none';
  closeBtn.style.fontSize = '1.5rem';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.zIndex = '2';
  closeBtn.onclick = () => modal.remove();

  const iframe = document.createElement('iframe');
  iframe.src = 'forge.html';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.background = '#fff';

  content.appendChild(closeBtn);
  content.appendChild(iframe);
  modal.appendChild(content);
  document.body.appendChild(modal);
}

// === Modal for virtual.html ===
function showVirtualModal() {
  let modal = document.getElementById('virtualModal');
  if (modal) return; // Already open
  modal = document.createElement('div');
  modal.id = 'virtualModal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.background = 'rgba(0,0,0,0.65)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '9999';

  const content = document.createElement('div');
  content.style.background = '#222';
  content.style.borderRadius = '18px';
  content.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)';
  content.style.overflow = 'hidden';
  content.style.position = 'relative';
  content.style.width = 'min(90vw, 900px)';
  content.style.height = 'min(80vh, 600px)';
  content.style.display = 'flex';
  content.style.flexDirection = 'column';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '10px';
  closeBtn.style.right = '16px';
  closeBtn.style.background = 'rgba(0,0,0,0.5)';
  closeBtn.style.color = '#fff';
  closeBtn.style.border = 'none';
  closeBtn.style.fontSize = '1.5rem';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.zIndex = '2';
  closeBtn.onclick = () => {
    virtualModalClosed = true; // Mark that user has closed the modal
    modal.remove();
  };

  const iframe = document.createElement('iframe');
  iframe.src = 'virtual.html';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.background = '#fff';

  content.appendChild(closeBtn);
  content.appendChild(iframe);
  modal.appendChild(content);
  document.body.appendChild(modal);
}

// Store original positions of drawers
const drawerOriginalPositions = new Map();

// === Unread Drawers Tracking ===
const unreadDrawers = new Set(['drawer1', 'drawer2', 'drawer3', 'drawer4','steering','forge']); // All drawers start as unread

// Function to get unread count for a specific theme
function getUnreadCountForTheme(themeId) {
  let count = 0;
  unreadDrawers.forEach(drawer => {
    if (drawerThemes[drawer] === themeId) {
      count++;
    }
  });
  return count;
}

// Function to update all theme unread badges
function updateThemeUnreadBadges() {
  const themes = ['home', 'forge'];
  themes.forEach(themeId => {
    const count = getUnreadCountForTheme(themeId);
    const badge = document.getElementById(`unread-badge-${themeId}`);
    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.style.opacity = '1';
      } else {
        badge.style.opacity = '0';
      }
    }
  });
}

drawerModels.forEach((model) => {
  loader.load(`./models/${model}.glb`, (gltf) => {
    processGLBMaterials(gltf); // Apply improved material processing
    const drawer = gltf.scene;
    drawer.scale.set(1, 1, 1);
    drawer.userData.type = model; // Store model name in userData
    scene.add(drawer);
    drawers.push(drawer);
    drawerOriginalPositions.set(drawer, drawer.position.clone()); // Ensure original position is stored
  });
});

// === Navigation Sidebar for Zones ===
const mainZones = [
  { type: 'home', label: 'Accueil', themeId: 'home' },
  { type: 'cv', label: 'CV', themeId: 'home' },
  { type: 'projects', label: 'Projets', themeId: 'home' },
  { type: 'contact', label: 'Contact', themeId: 'home' },
  { type: 'forge2', label: 'Conception', themeId: 'forge' },
];

// Define drawer-to-theme mapping
const drawerThemes = {
  'drawer1': 'home',
  'drawer2': 'home', 
  'drawer3': 'home',
  'drawer4': 'home',
  'steering': 'home',
  'forge': 'forge'
};

const navSidebar = document.createElement('nav');
navSidebar.id = 'zoneNavSidebar';
navSidebar.style.position = 'fixed';
navSidebar.style.top = '0';
navSidebar.style.left = '0';
navSidebar.style.height = '100vh';
navSidebar.style.width = '220px';
navSidebar.style.background = 'rgba(20, 20, 30, 0.97)';
navSidebar.style.color = '#fff';
navSidebar.style.padding = '36px 0 24px 0';
navSidebar.style.display = 'flex';
navSidebar.style.flexDirection = 'column';
navSidebar.style.alignItems = 'center';
navSidebar.style.zIndex = '300';
navSidebar.style.boxShadow = '2px 0 24px rgba(0,0,0,0.18)';
navSidebar.style.fontSize = '1.1rem';
navSidebar.style.fontWeight = 'bold';
navSidebar.style.letterSpacing = '0.02em';
navSidebar.innerHTML = `<div style="font-size:1.3rem;margin-bottom:18px;font-weight:bold;">Zones à explorer</div><ul id="zoneNavList" style="list-style:none;padding:0;margin:0;width:100%;"></ul>`;
document.body.appendChild(navSidebar);

// Empêche le raycast de passer à travers la nav bar
navSidebar.addEventListener('pointerdown', e => e.stopPropagation());
navSidebar.addEventListener('pointermove', e => e.stopPropagation());
navSidebar.addEventListener('pointerup', e => e.stopPropagation());
navSidebar.style.pointerEvents = 'auto';

// Décale le canvas 3D pour ne pas être sous la nav
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.left = '220px';
renderer.domElement.style.top = '0';
renderer.domElement.style.width = `calc(100vw - 220px)`;
renderer.domElement.style.height = '100vh';

const navList = document.getElementById('zoneNavList');

// Function to navigate to a hex zone directly
function navigateToZone(zoneType) {
  const hex = hexObjects.find(h => h.userData.type === zoneType);
  if (!hex) return;

  currentActiveHexType = zoneType;
  
  // Find the hex data for camera position
  const hexData = hexMap.find(h => h.type === zoneType);
  const cameraPos = hexData?.cameraPos || { x: 0, y: 5, z: 10 };
  const hexPosition = hex.position;

  // Animate camera to hex
  gsap.to(camera.position, {
    x: cameraPos.x,
    y: cameraPos.y,
    z: cameraPos.z,
    duration: 2,
    ease: 'power3.inOut',
  });

  gsap.to(lookAtTarget, {
    x: hexPosition.x,
    y: hexPosition.y,
    z: hexPosition.z,
    duration: 2,
    ease: 'power3.inOut',
    onUpdate: () => {
      camera.lookAt(lookAtTarget.x, lookAtTarget.y, lookAtTarget.z);
    },
  });

  // Update active nav item
  updateNavActiveState(zoneType);
}

// Function to update nav active state
function updateNavActiveState(activeType) {
  const navItems = navList.querySelectorAll('li');
  navItems.forEach(item => {
    // Find the zone that matches this nav item
    const zone = mainZones.find(z => z.label === item.textContent);
    if (zone && activeType && zone.type === activeType) {
      item.style.background = '#0a5a3d';
      item.style.color = '#fff';
      item.style.fontWeight = 'bold';
    } else {
      item.style.background = 'none';
      item.style.color = '#fff';
      item.style.fontWeight = 'normal';
    }
  });
}

// Group zones by theme for better organization
const groupedZones = {
  'home': mainZones.filter(zone => zone.themeId === 'home'),
  'forge': mainZones.filter(zone => zone.themeId === 'forge')
};

// Create navigation items grouped by theme
Object.entries(groupedZones).forEach(([themeId, zones]) => {

  
  // Create zone items for this theme
  zones.forEach(zone => {
    const li = document.createElement('li');
    li.style.cursor = 'pointer';
    li.style.margin = '0 0 8px 0';
    li.style.padding = '8px 24px';
    li.style.borderRadius = '8px 24px 24px 8px';
    li.style.transition = 'background 0.2s, color 0.2s';
    li.style.fontSize = '1rem';
    li.style.position = 'relative';
    
    // Add zone label
    const labelSpan = document.createElement('span');
    labelSpan.textContent = zone.label;
    li.appendChild(labelSpan);
    
    // Add unread badge for this theme (only on the first button of each theme)
    if (zones.indexOf(zone) === 0) {
      const badge = document.createElement('span');
      badge.id = `unread-badge-${themeId}`;
      badge.style.position = 'absolute';
      badge.style.right = '12px';
      badge.style.background = '#ff4444';
      badge.style.color = '#fff';
      badge.style.borderRadius = '10px';
      badge.style.padding = '2px 6px';
      badge.style.fontSize = '10px';
      badge.style.fontWeight = 'bold';
      badge.style.opacity = '0';
      badge.style.transition = 'opacity 0.3s';
      badge.style.minWidth = '16px';
      badge.style.textAlign = 'center';
      li.appendChild(badge);
    }
    
    li.onmouseenter = () => {
      // Only highlight if not already active
      if (currentActiveHexType !== zone.type) {
        li.style.background = '#1a82f7';
        li.style.color = '#fff';
      }
      
      // Highlight corresponding hex
      hexObjects.forEach(hex => {
        if (hex.userData.type === zone.type) {
          hex.traverse(child => {
            if (child.isMesh && child.material) {
              child.material.emissive = new THREE.Color(0x1a82f7);
              child.material.emissiveIntensity = 0.7;
            }
          });
        }
      });
    };
    
    li.onmouseleave = () => {
      // Restore highlight based on active state
      if (currentActiveHexType === zone.type) {
        li.style.background = '#0a5a3d';
        li.style.color = '#fff';
        li.style.fontWeight = 'bold';
      } else {
        li.style.background = 'none';
        li.style.color = '#fff';
        li.style.fontWeight = 'normal';
      }
      
      // Remove hex highlight
      hexObjects.forEach(hex => {
        if (hex.userData.type === zone.type) {
          hex.traverse(child => {
            if (child.isMesh && child.material && child.material.emissive) {
              child.material.emissive.setRGB(0,0,0);
              child.material.emissiveIntensity = 1;
            }
          });
        }
      });
    };
    
    li.onclick = () => {
      // Don't navigate if already active
      if (currentActiveHexType === zone.type) return;
      
      navigateToZone(zone.type);
    };
    
    navList.appendChild(li);
  });
});

// Initialize theme unread badges
updateThemeUnreadBadges();


// === Responsive 3D Canvas: Only fill area right of nav bar ===
function resize3DView() {
  const navWidth = 220;
  const width = window.innerWidth - navWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  renderer.domElement.style.width = width + 'px';
  renderer.domElement.style.height = height + 'px';
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize3DView);
resize3DView(); // Initial call

let currentActiveHexType = null; // Tracks the currently active hex type for navigation sync

