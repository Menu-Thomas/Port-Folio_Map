/**
 * Interactive Portfolio Map - Thomas Menu
 * A Three.js-based hexagonal portfolio interface with smooth animations and interactivity
 * 
 * Features:
 * - Hexagonal grid world map
 * - Interactive drawer objects with hover effects
 * - Smooth camera animations
 * - Dynamic lighting and ocean simulation
 * - Modal integration for project details
 * - Navigation sidebar with unread indicators
 * 
 * @author Thomas Menu
 * @version 2.0.0
 */

import * as THREE from 'https://esm.sh/three@0.150.1';
import { GLTFLoader } from 'https://esm.sh/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';
import { gsap } from 'https://esm.sh/gsap@3.12.2';

// === CONFIGURATION CONSTANTS ===
const CONFIG = {
  SCENE: {
    BACKGROUND_COLOR: 0x111111,
    FOG_COLOR: 0xffd4a3,
    FOG_NEAR: 15,
    FOG_FAR: 60
  },
  CAMERA: {
    FOV: 60,
    NEAR: 0.05,
    FAR: 1000,
    ORIGINAL_POSITION: { x: 0, y: 4.5, z: 8 },
    ORIGINAL_LOOK_AT: { x: 0, y: 0.5, z: 3 }
  },
  RENDERER: {
    TONE_MAPPING_EXPOSURE: 1.4,
    SHADOW_MAP_SIZE: 2048
  },
  ANIMATION: {
    CAMERA_DURATION: 2,
    DRAWER_HOVER_DURATION: 0.3,
    EASE: 'power3.inOut',
    HOVER_EASE: 'power2.out'
  },
  NAVIGATION: {
    SIDEBAR_WIDTH: 220
  }
};

// === LOADING COMPLETION SYSTEM ===
let totalAssetsToLoad = 0;
let assetsLoaded = 0;
let allAssetsLoaded = false;
let cinematicMode = false;

function incrementTotalAssets() {
  totalAssetsToLoad++;
}

function markAssetLoaded() {
  assetsLoaded++;
  console.log(`Asset loaded: ${assetsLoaded}/${totalAssetsToLoad}`);
  
  if (assetsLoaded === totalAssetsToLoad && !allAssetsLoaded) {
    allAssetsLoaded = true;
    console.log('All assets loaded successfully');
    
    // Signal to loading page that portfolio assets are ready
    sessionStorage.setItem('portfolioAssetsLoaded', 'true');
    
    onAllAssetsLoaded();
  }
}

// === Cinematic Entrance Animation ===
function startCinematicEntrance() {
  console.log('=== STARTING CINEMATIC ENTRANCE ANIMATION ===');
  console.log('Call stack:', new Error().stack);
  
  // Set cinematic mode and disable cursor interactions
  cinematicMode = true;
  document.body.style.cursor = 'wait';
  
  // Simple orbit parameters
  const centerX = 0;
  const centerZ = 0;
  const radius = 9; // Reduced from 12 to 9 for closer view
  const height = 6;
  const orbitDuration = 3; // 3 seconds for half turn
  
  // Start behind the island (270° or -90°)
  const startAngle = -Math.PI / 2;
  // End in front of the island (90°)
  const endAngle = Math.PI / 2;
  
  // Camera is already positioned correctly from initialization
  // Look at center of the island - adjusted to feel more centered on screen
  const lookAtCenter = { x: centerX, y: 0.3, z: centerZ };
  // Don't call camera.lookAt here since it's already set correctly during initialization
  
  // Create simple orbit animation starting from current position
  gsap.to({}, {
    duration: orbitDuration,
    ease: "power2.inOut",
    onUpdate: function() {
      const progress = this.progress();
      // Interpolate from start angle (behind) to end angle (front)
      const currentAngle = startAngle + (endAngle - startAngle) * progress;
      
      // Update camera position
      camera.position.x = centerX + radius * Math.cos(currentAngle);
      camera.position.z = centerZ + radius * Math.sin(currentAngle);
      camera.position.y = height;
      
      // Always look at the center
      camera.lookAt(lookAtCenter.x, lookAtCenter.y, lookAtCenter.z);
    },
    onComplete: () => {
      // Animation complete - enable controls
      console.log('Cinematic entrance complete - controls enabled');
      cinematicMode = false;
      document.body.style.cursor = 'default';
      
      // Update orbital camera angle to current position
      updateCameraAngleFromPosition();
      
      // Sync lookAtTarget with the actual camera look-at direction
      lookAtTarget.x = lookAtCenter.x;
      lookAtTarget.y = lookAtCenter.y;
      lookAtTarget.z = lookAtCenter.z;
    }
  });
  
  return true; // Animation started
}

function onAllAssetsLoaded() {
  // Signal that portfolio assets are loaded
  sessionStorage.setItem('portfolioAssetsLoaded', 'true');
  console.log('Assets loaded, waiting for overlay to be manually dismissed...');
  
  // Wait for loading overlay to be hidden before starting cinematic animation
  function checkAndStartCinematic() {
    const overlayHidden = sessionStorage.getItem('loadingOverlayHidden');
    const overlayElement = document.getElementById('loadingOverlay');
    
    // Double check - ensure overlay is actually hidden
    const isOverlayActuallyHidden = overlayHidden === 'true' && 
      (!overlayElement || overlayElement.classList.contains('hidden'));
    
    if (isOverlayActuallyHidden) {
      console.log('Overlay confirmed hidden, starting cinematic animation...');
      // Start cinematic animation if conditions are met
      if (!virtualModalOpened || virtualModalClosed) {
        // Small delay to ensure everything is ready
        setTimeout(() => {
          startCinematicEntrance();
        }, 500); // 500ms delay after overlay is hidden
      }
    } else {
      // Check again in 100ms
      setTimeout(checkAndStartCinematic, 100);
    }
  }
  
  // Start checking for overlay hidden signal
  checkAndStartCinematic();
}

// === Orbital Camera Controls Variables ===
let isOrbiting = false;
let previousMouseX = 0;
let currentCameraAngle = Math.PI / 2; // Start at front of island (end position of cinematic)
const orbitRadius = 9; // Same radius as cinematic animation
const orbitHeight = 6; // Same height as cinematic animation
const orbitCenter = { x: 0, y: 0.3, z: 0 }; // Same center as cinematic animation
const orbitSensitivity = 0.005; // How fast the camera rotates

// === Scene Initialization ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.SCENE.BACKGROUND_COLOR);

const camera = new THREE.PerspectiveCamera(
  CONFIG.CAMERA.FOV, 
  window.innerWidth / window.innerHeight, 
  CONFIG.CAMERA.NEAR, 
  CONFIG.CAMERA.FAR
);

// Check if we should use cinematic camera position (when loading overlay is present)
const loadingOverlay = document.getElementById('loadingOverlay');
const shouldUseCinematicStart = loadingOverlay && !loadingOverlay.classList.contains('hidden');

if (shouldUseCinematicStart) {
  // Use exact same parameters as cinematic animation to prevent any jumps
  const centerX = 0;
  const centerZ = 0;
  const radius = 9; // Same as cinematic animation
  const height = 6; // Same as cinematic animation
  const startAngle = -Math.PI / 2; // Behind the island - same as cinematic
  
  // Position camera at exact starting position of cinematic animation
  camera.position.set(
    centerX + radius * Math.cos(startAngle),
    height,
    centerZ + radius * Math.sin(startAngle)
  );
  
  // Look at exact same center as cinematic animation
  const lookAtCenter = { x: centerX, y: 0.3, z: centerZ };
  camera.lookAt(lookAtCenter.x, lookAtCenter.y, lookAtCenter.z);
  
  // Set currentCameraAngle to match the starting position (prevents orbital controls from moving camera)
  currentCameraAngle = startAngle;
} else {
  // Normal position for direct access
  camera.position.set(
    CONFIG.CAMERA.ORIGINAL_POSITION.x, 
    CONFIG.CAMERA.ORIGINAL_POSITION.y, 
    CONFIG.CAMERA.ORIGINAL_POSITION.z
  );
  camera.lookAt(
    CONFIG.CAMERA.ORIGINAL_LOOK_AT.x, 
    CONFIG.CAMERA.ORIGINAL_LOOK_AT.y, 
    CONFIG.CAMERA.ORIGINAL_LOOK_AT.z
  );
}

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = CONFIG.RENDERER.TONE_MAPPING_EXPOSURE;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.useLegacyLights = false; // Modern lighting
document.body.appendChild(renderer.domElement);

// === Mouse and Raycaster Setup ===
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let hoveredDrawer = null;

// === Application State Variables ===
let currentActiveHexType = null; // Tracks the currently active hex type for navigation sync
let lookAtTarget = { 
  x: 0, // Will be set to orbitCenter.x after cinematic or orbital center
  y: 0.3, // Will be set to orbitCenter.y after cinematic or orbital center  
  z: 0 // Will be set to orbitCenter.z after cinematic or orbital center
};

// === Error Handling ===
class ErrorHandler {
  static logError(error, context = '') {
    console.error(`[Portfolio Error${context ? ` - ${context}` : ''}]:`, error);
    
    // Show user-friendly error message if needed
    if (context.includes('Critical')) {
      this.showUserError('An error occurred while loading the portfolio. Please refresh the page.');
    }
  }
  
  static showUserError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10000;
      background: #ff4444; color: white; padding: 15px; border-radius: 8px;
      font-family: Arial, sans-serif; max-width: 300px;
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => errorDiv.remove(), 5000);
  }
  
  static handleAsyncError(promise, context = '') {
    return promise.catch(error => {
      this.logError(error, context);
      return null; // Return null instead of throwing to allow graceful degradation
    });
  }
}

// === Performance Monitor ===
class PerformanceMonitor {
  constructor() {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fps = 0;
    this.enabled = false; // Only enable in development
  }

  update() {
    if (!this.enabled) return;
    
    this.frameCount++;
    const currentTime = performance.now();
    
    if (currentTime >= this.lastTime + 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
      this.frameCount = 0;
      this.lastTime = currentTime;
      
      if (this.fps < 30) {
        console.warn(`Low FPS detected: ${this.fps}`);
      }
    }
  }

  getFPS() {
    return this.fps;
  }
}

const performanceMonitor = new PerformanceMonitor();

// === Modal State Tracking ===
let virtualModalClosed = false; // Track if user has manually closed the virtual modal
let virtualModalOpened = false; // Track if the virtual modal was ever opened
let steeringWheelClicked = false; // Track if user actually clicked on the steering wheel

// === Drawer Management ===
const drawerModels = ['drawer1', 'drawer2', 'drawer3', 'drawer4', 'steering', 'pc', 'forge'];
const drawers = [];
const drawerOriginalPositions = new Map();
const unreadDrawers = new Set(['drawer1', 'drawer2', 'drawer3', 'drawer4', 'steering', 'forge']);

// === Drawer Configuration ===
const animatedDrawers = ['drawer1', 'drawer2', 'drawer3', 'drawer4']; // Drawers that animate on hover
const clickAnimatedDrawers = ['pc', 'steering']; // Drawers that animate camera on click
const drawerInfoFiles = {
  drawer1: "project1.html",
  drawer2: "project2.html", 
  drawer3: "project3.html",
  drawer4: "project4.html"
};

// === Theme Configuration ===
const drawerThemes = {
  'drawer1': 'home',
  'drawer2': 'home',
  'drawer3': 'home', 
  'drawer4': 'home',
  'steering': 'home',
  'forge': 'forge'
};

// Camera target positions for click-animated drawers
const drawerCameraTargets = {
  pc: {
    x: -0.05, y: 0.05, z: -0.15,
    lookAt: { x: -0.25, y: -0.04, z: -0.35 }
  },
  steering: {
    x: -0.1, y: 0.005, z: 0.16,
    lookAt: { x: -0.16, y: 0.005, z: 0.24 }
  }
};

// === Lighting Setup ===
function setupLighting() {
  // Main directional light (golden hour sun) - warm golden tones
  const directionalLight = new THREE.DirectionalLight(0xffb347, 3.8); // Slightly reduced intensity
  directionalLight.position.set(15, 20, 10); // Lower angle for golden hour
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

  // Ambient light with golden hour warmth
  const ambientLight = new THREE.AmbientLight(0xffd4a3, 0.8); // Warm golden ambient
  scene.add(ambientLight);

  // Key fill light - golden rim lighting
  const keyLight = new THREE.PointLight(0xffa500, 3.0, 60); // Orange golden light
  keyLight.position.set(10, 18, 12);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 60;
  keyLight.shadow.bias = -0.0001;
  scene.add(keyLight);

  // Secondary warm light for depth
  const secondaryLight = new THREE.PointLight(0xff8c42, 2.5, 45);
  secondaryLight.position.set(-8, 15, 8);
  scene.add(secondaryLight);

  // Hemisphere light for natural golden hour atmosphere
  const hemiLight = new THREE.HemisphereLight(0xffd4a3, 0xd2691e, 0.7); // Golden sky to warm ground
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);

  // Warm back light for atmospheric glow
  const backLight = new THREE.PointLight(0xffc649, 2.0, 35);
  backLight.position.set(-12, 8, -15);
  scene.add(backLight);

  // Subtle accent light for underwater areas
  const accentLight = new THREE.PointLight(0x4da6ff, 1.2, 25); // Cooler blue for contrast
  accentLight.position.set(0, -1, 0);
  scene.add(accentLight);
}
setupLighting();

// === Fog Setup for Better Atmosphere ===
scene.fog = new THREE.Fog(CONFIG.SCENE.FOG_COLOR, CONFIG.SCENE.FOG_NEAR, CONFIG.SCENE.FOG_FAR);

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

// Load hex objects with error handling
let loadedHexCount = 0;
const totalHexCount = hexMap.length;

// Register hex assets for loading tracking
hexMap.forEach(() => incrementTotalAssets());

hexMap.forEach(({ q, r, type }) => {
  const { x, z } = hexToWorld(q, r);
  
  ErrorHandler.handleAsyncError(
    new Promise((resolve, reject) => {
      loader.load(
        `./public/models/Hex-${type}.glb`,
        (gltf) => {
          try {
            processGLBMaterials(gltf);
            const hex = gltf.scene;
            hex.position.set(x, 0, z);
            hex.scale.set(1, 1, 1);
            hex.userData = { type, q, r };
            scene.add(hex);
            hexObjects.push(hex);
            
            loadedHexCount++;
            markAssetLoaded(); // Mark this asset as loaded
            
            if (loadedHexCount === totalHexCount) {
              console.log('All hex objects loaded successfully');
            }
            resolve(hex);
          } catch (error) {
            reject(error);
          }
        },
        undefined,
        reject
      );
    }),
    `Hex loading - ${type}`
  );
});

// === Ocean Setup ===
function createOcean() {
  try {
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

    // Create ocean texture
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
    mesh.position.y = -1;
    mesh.receiveShadow = true;
    scene.add(mesh);

    return { geometry, vertData };
  } catch (error) {
    ErrorHandler.logError(error, 'Ocean creation');
    // Return minimal ocean if creation fails
    const geometry = new THREE.PlaneGeometry(10, 10);
    return { geometry, vertData: [] };
  }
}
const { geometry: oceanGeometry, vertData: oceanVertData } = createOcean();

// === Display Text Update Function ===
function updateDisplayText(text) {
  // Update page title and potentially other UI elements
  document.title = `Portfolio - ${text}`;
}

// === Utility Functions ===
function hexToWorld(q, r, size = 1) {
  const x = size * Math.sqrt(3) * (q + r / 2);
  const z = size * 1.5 * r;
  return { x, z };
}

// === Helper Functions for Unread Tracking ===
function getUnreadCountForTheme(themeId) {
  let count = 0;
  unreadDrawers.forEach(drawer => {
    if (drawerThemes[drawer] === themeId) {
      count++;
    }
  });
  return count;
}

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

// === Label Positioning Helper ===
function positionDrawerLabel(mouseX, mouseY) {
  // Initial position
  drawerLabel.style.left = `${mouseX + 60}px`;
  drawerLabel.style.top = `${mouseY - 180}px`;
  
  // Adjust if out of viewport
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
}

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

window.addEventListener('mousemove', (event) => {
  // Skip interactions during cinematic mode
  if (cinematicMode) return;
  
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
      updateDisplayText(object.userData.type);

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
                duration: CONFIG.ANIMATION.DRAWER_HOVER_DURATION,
                ease: CONFIG.ANIMATION.HOVER_EASE,
              });
            }
            // Animate new hovered drawer
            gsap.to(foundDrawer.position, {
              x: 0.029,
              z: -0.0374,
              duration: CONFIG.ANIMATION.DRAWER_HOVER_DURATION,
              ease: CONFIG.ANIMATION.HOVER_EASE,
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
        // Show label with better positioning logic
        const infoFile = drawerInfoFiles[object.userData.type];
        if (infoFile) {
          fetch(infoFile)
            .then(res => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.text();
            })
            .then(html => {
              // Add unread indicator if drawer is unread
              const isUnread = unreadDrawers.has(object.userData.type);
              const unreadIndicator = isUnread ? 
                `<div style="background: #ff4444; color: #fff; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: bold; margin-bottom: 8px; text-align: center;">UNREAD</div>` : '';
              
              drawerLabel.innerHTML = unreadIndicator + html;
              drawerLabel.style.display = "block";
              drawerLabel.style.border = isUnread ? "2px solid #ff4444" : "1px solid #eee";
              

              // Better positioning logic
              positionDrawerLabel(event.clientX, event.clientY);
              
              // Mark drawer as read (except forge and steering)
              if (isUnread && object.userData.type !== 'forge' && object.userData.type !== 'steering') {
                unreadDrawers.delete(object.userData.type);
                updateThemeUnreadBadges();
              }
            })
            .catch(error => {
              console.warn('Failed to load drawer info:', error);
              drawerLabel.innerHTML = '<div>Content unavailable</div>';
              drawerLabel.style.display = "block";
              positionDrawerLabel(event.clientX, event.clientY);
            });
        } else {
          // Custom messages for specific drawers
          let message = `<div>No info available.</div>`;
          if (object.userData.type === 'forge') {
            message = `<div>most significant conception experience</div>`;
          } else if (object.userData.type === 'steering') {
            message = `<div>most significant dev project</div>`;
          }
          
          drawerLabel.innerHTML = message;
          drawerLabel.style.display = "block";
          positionDrawerLabel(event.clientX, event.clientY);
          
          // Mark drawer as read
          if (unreadDrawers.has(object.userData.type) && 
              object.userData.type !== 'forge' && 
              object.userData.type !== 'steering') {
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
    updateDisplayText('Portfolio');
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

// === Environment Texture Loading ===
const textureLoader = new THREE.TextureLoader();

// Register environment texture for loading tracking
incrementTotalAssets();

ErrorHandler.handleAsyncError(
  new Promise((resolve, reject) => {
    textureLoader.load(
      './public/textures/env.jpg',
      (texture) => {
        try {
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
          
          console.log('Environment texture loaded successfully');
          markAssetLoaded(); // Mark this asset as loaded
          resolve(texture);
        } catch (error) {
          reject(error);
        }
      },
      undefined,
      reject
    );
  }),
  'Environment texture loading'
);

// === Animation Loop ===
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  
  try {
    const time = clock.getElapsedTime();

    // Animate ocean waves if ocean data is available
    if (oceanVertData && oceanVertData.length > 0) {
      oceanVertData.forEach((vd, idx) => {
        const y = vd.initH + Math.sin(time + vd.phase) * vd.amplitude;
        oceanGeometry.attributes.position.setY(idx, y);
      });
      oceanGeometry.attributes.position.needsUpdate = true;
      oceanGeometry.computeVertexNormals();
    }

    // Update performance monitor
    performanceMonitor.update();

    renderer.render(scene, camera);
  } catch (error) {
    ErrorHandler.logError(error, 'Animation loop');
  }
}
animate();

// === Event Listeners === 

window.addEventListener('wheel', (event) => {
  // Skip interactions during cinematic mode
  if (cinematicMode) return;
  
  if (event.deltaY > 0) { // Detect scroll down
    // Reset active nav state since we're going back to overview
    currentActiveHexType = null;
    updateNavActiveState(null);
    
    // Reset virtual modal state when going back to overview
    virtualModalClosed = false;
    virtualModalOpened = false;
    steeringWheelClicked = false;
    
    // Return to orbital position instead of fixed original position
    const orbitalPosition = {
      x: orbitCenter.x + orbitRadius * Math.cos(currentCameraAngle),
      y: orbitHeight,
      z: orbitCenter.z + orbitRadius * Math.sin(currentCameraAngle)
    };
    
    // Animate camera position
    gsap.to(camera.position, {
      x: orbitalPosition.x,
      y: orbitalPosition.y,
      z: orbitalPosition.z,
      duration: CONFIG.ANIMATION.CAMERA_DURATION,
      ease: CONFIG.ANIMATION.EASE,
    });

    // Smoothly animate look-at target to the center of the island (orbital mode)
    gsap.to(lookAtTarget, {
      x: orbitCenter.x,
      y: orbitCenter.y,
      z: orbitCenter.z,
      duration: CONFIG.ANIMATION.CAMERA_DURATION,
      ease: CONFIG.ANIMATION.EASE,
      onUpdate: () => {
        camera.lookAt(lookAtTarget.x, lookAtTarget.y, lookAtTarget.z);
      },
      onComplete: () => {
        // Update orbital camera angle to match the current position
        updateCameraAngleFromPosition();
      }
    });
  }
});

window.addEventListener('click', (event) => {
  // Skip interactions during cinematic mode or if currently orbiting
  if (cinematicMode || isOrbiting) return;
  
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
      
      // Stop any ongoing orbital movement
      isOrbiting = false;
      document.body.style.cursor = 'default';
      
      // Reset virtual modal state when navigating to different areas
      virtualModalClosed = false;
      virtualModalOpened = false;
      steeringWheelClicked = false;
      
      const hexPosition = object.position;
      const hexData = hexMap.find(hex => hex.q === object.userData.q && hex.r === object.userData.r);
      const cameraPos = hexData?.cameraPos || { x: 0, y: 5, z: 10 }; // Default camera position

      // Store current camera position to ensure smooth transition
      const currentPos = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
      };

      gsap.to(camera.position, {
        x: cameraPos.x,
        y: cameraPos.y,
        z: cameraPos.z,
        duration: CONFIG.ANIMATION.CAMERA_DURATION,
        ease: CONFIG.ANIMATION.EASE,
      });

      gsap.to(lookAtTarget, {
        x: hexPosition.x,
        y: hexPosition.y,
        z: hexPosition.z,
        duration: CONFIG.ANIMATION.CAMERA_DURATION,
        ease: CONFIG.ANIMATION.EASE,
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
          duration: CONFIG.ANIMATION.CAMERA_DURATION,
          ease: CONFIG.ANIMATION.EASE,
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
          duration: CONFIG.ANIMATION.CAMERA_DURATION,
          ease: CONFIG.ANIMATION.EASE,
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

// === Modal Functions ===
function createModalBase(id, onClose = null) {
  const modal = document.createElement('div');
  modal.id = id;
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: #222;
    border-radius: 18px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.25);
    overflow: hidden;
    position: relative;
    width: min(90vw, 900px);
    height: min(80vh, 600px);
    display: flex;
    flex-direction: column;
  `;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `
    position: absolute;
    top: 10px;
    right: 16px;
    background: rgba(0,0,0,0.5);
    color: #fff;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    z-index: 2;
    border-radius: 4px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  closeBtn.onclick = () => {
    if (onClose) onClose();
    modal.remove();
  };

  content.appendChild(closeBtn);
  modal.appendChild(content);
  
  return { modal, content };
}

function showForgeModal() {
  let existingModal = document.getElementById('forgeModal');
  if (existingModal) return; // Already open
  
  const { modal, content } = createModalBase('forgeModal');
  
  const iframe = document.createElement('iframe');
  iframe.src = 'forge.html';
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    background: #fff;
  `;
  
  iframe.onerror = () => {
    content.innerHTML = '<div style="color: white; padding: 20px; text-align: center;">Error loading content</div>';
  };

  content.appendChild(iframe);
  document.body.appendChild(modal);
}

function showVirtualModal() {
  let existingModal = document.getElementById('virtualModal');
  if (existingModal) return; // Already open
  
  virtualModalOpened = true; // Mark that the modal was opened
  
  const { modal, content } = createModalBase('virtualModal', () => {
    virtualModalClosed = true; // Mark that user has closed the modal
    
    // Check if we should start the cinematic animation
    const urlParams = new URLSearchParams(window.location.search);
    const fromLoading = urlParams.get('from') === 'loading' || document.referrer.includes('index.html');
    const overlayHidden = sessionStorage.getItem('loadingOverlayHidden') === 'true';
    const overlayElement = document.getElementById('loadingOverlay');
    const isOverlayActuallyHidden = overlayHidden && (!overlayElement || overlayElement.classList.contains('hidden'));
    
    if (fromLoading && isOverlayActuallyHidden) {
      // Only start cinematic animation if loading overlay has been manually dismissed
      console.log('Virtual modal closed and overlay already dismissed, starting cinematic animation');
      startCinematicEntrance();
    } else if (!isOverlayActuallyHidden) {
      // If overlay is still visible, don't start animation
      console.log('Virtual modal closed but loading overlay still visible, not starting animation');
    } else {
      // Return to orbital position instead of fixed original position
      const orbitalPosition = {
        x: orbitCenter.x + orbitRadius * Math.cos(currentCameraAngle),
        y: orbitHeight,
        z: orbitCenter.z + orbitRadius * Math.sin(currentCameraAngle)
      };
      
      // Animate camera position
      gsap.to(camera.position, {
        x: orbitalPosition.x,
        y: orbitalPosition.y,
        z: orbitalPosition.z,
        duration: CONFIG.ANIMATION.CAMERA_DURATION,
        ease: CONFIG.ANIMATION.EASE,
      });
      
      // Smoothly animate look-at target to orbital center
      gsap.to(lookAtTarget, {
        x: orbitCenter.x,
        y: orbitCenter.y,
        z: orbitCenter.z,
        duration: CONFIG.ANIMATION.CAMERA_DURATION,
        ease: CONFIG.ANIMATION.EASE,
        onUpdate: () => {
          camera.lookAt(lookAtTarget.x, lookAtTarget.y, lookAtTarget.z);
        },
        onComplete: () => {
          // Update orbital camera angle to match the current position
          updateCameraAngleFromPosition();
        }
      });
    }
  });
  
  const iframe = document.createElement('iframe');
  iframe.src = 'virtual.html';
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    background: #fff;
  `;
  
  iframe.onerror = () => {
    content.innerHTML = '<div style="color: white; padding: 20px; text-align: center;">Error loading virtual content</div>';
  };

  content.appendChild(iframe);
  document.body.appendChild(modal);
}

// Store original positions of drawers
// (drawerOriginalPositions already declared at top)


// === Unread Drawers Tracking Functions ===
// (Functions already declared at top)


// === Load Drawer Models ===
let loadedDrawerCount = 0;
const totalDrawerCount = drawerModels.length;

// Register drawer assets for loading tracking
drawerModels.forEach(() => incrementTotalAssets());

drawerModels.forEach((model) => {
  ErrorHandler.handleAsyncError(
    new Promise((resolve, reject) => {
      loader.load(
        `./public/models/${model}.glb`,
        (gltf) => {
          try {
            processGLBMaterials(gltf);
            const drawer = gltf.scene;
            drawer.scale.set(1, 1, 1);
            drawer.userData.type = model;
            scene.add(drawer);
            drawers.push(drawer);
            drawerOriginalPositions.set(drawer, drawer.position.clone());
            
            loadedDrawerCount++;
            markAssetLoaded(); // Mark this asset as loaded
            
            if (loadedDrawerCount === totalDrawerCount) {
              console.log('All drawer models loaded successfully');
              // Initialize unread badges after all drawers are loaded
              updateThemeUnreadBadges();
            }
            resolve(drawer);
          } catch (error) {
            reject(error);
          }
        },
        undefined,
        reject
      );
    }),
    `Drawer loading - ${model}`
  );
});

// === Navigation Sidebar for Zones ===
const mainZones = [
  { type: 'home', label: 'Accueil', themeId: 'home' },
  { type: 'cv', label: 'CV', themeId: 'home' },
  { type: 'projects', label: 'Projets', themeId: 'home' },
  { type: 'contact', label: 'Contact', themeId: 'home' },
  { type: 'forge2', label: 'Conception', themeId: 'forge' },
];

// Define drawer-to-theme mapping (already declared at top)

const navSidebar = document.createElement('nav');
navSidebar.id = 'zoneNavSidebar';
navSidebar.style.position = 'fixed';
navSidebar.style.top = '0';
navSidebar.style.left = '0';
navSidebar.style.height = '100vh';
navSidebar.style.width = CONFIG.NAVIGATION.SIDEBAR_WIDTH + 'px';
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
renderer.domElement.style.left = CONFIG.NAVIGATION.SIDEBAR_WIDTH + 'px';
renderer.domElement.style.top = '0';
renderer.domElement.style.width = `calc(100vw - ${CONFIG.NAVIGATION.SIDEBAR_WIDTH}px)`;
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
  const navWidth = CONFIG.NAVIGATION.SIDEBAR_WIDTH;
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

// Cinematic entrance will be triggered by onAllAssetsLoaded() when appropriate

// === Orbital Camera Controls ===
// Variables declared earlier in the file near scene initialization

// Mouse down event - start orbiting
window.addEventListener('mousedown', (event) => {
  // Skip if in cinematic mode or clicking on UI elements
  if (cinematicMode) return;
  
  // Skip if currently viewing a hex (not in orbital mode)
  if (currentActiveHexType !== null) return;
  
  // Check if click is on the navigation sidebar
  const navSidebar = document.getElementById('zoneNavSidebar');
  if (navSidebar && navSidebar.contains(event.target)) {
    return; // Don't start orbiting if clicking on nav
  }
  
  // Only allow orbiting with left mouse button
  if (event.button === 0) {
    previousMouseX = event.clientX;
    // We'll set isOrbiting to true in mousemove if the mouse actually moves
  }
});

// Mouse move event - update orbit rotation
window.addEventListener('mousemove', (event) => {
  if (cinematicMode) return;
  
  // Skip if currently viewing a hex (not in orbital mode)
  if (currentActiveHexType !== null) return;
  
  // Start orbiting if mouse is pressed and moved (drag detected)
  if (!isOrbiting && event.buttons === 1 && previousMouseX !== 0) {
    const deltaX = Math.abs(event.clientX - previousMouseX);
    if (deltaX > 3) { // Only start orbiting if mouse moved more than 3 pixels
      isOrbiting = true;
      document.body.style.cursor = 'grabbing';
    }
  }
  
  if (!isOrbiting) return;
  
  const deltaX = event.clientX - previousMouseX;
  currentCameraAngle -= deltaX * orbitSensitivity; // Negative for natural feel
  
  // Update camera position based on angle
  camera.position.x = orbitCenter.x + orbitRadius * Math.cos(currentCameraAngle);
  camera.position.z = orbitCenter.z + orbitRadius * Math.sin(currentCameraAngle);
  camera.position.y = orbitHeight;
  
  // Always look at the center of the island
  camera.lookAt(orbitCenter.x, orbitCenter.y, orbitCenter.z);
  
  // Keep lookAtTarget synchronized with orbital look-at
  lookAtTarget.x = orbitCenter.x;
  lookAtTarget.y = orbitCenter.y;
  lookAtTarget.z = orbitCenter.z;
  
  previousMouseX = event.clientX;
});

// Mouse up event - stop orbiting
window.addEventListener('mouseup', (event) => {
  if (event.button === 0) {
    isOrbiting = false;
    previousMouseX = 0;
    document.body.style.cursor = 'default';
  }
});

// Mouse leave event - stop orbiting if mouse leaves window
window.addEventListener('mouseleave', () => {
  if (isOrbiting) {
    isOrbiting = false;
    previousMouseX = 0;
    document.body.style.cursor = 'default';
  }
});

// Update camera angle when cinematic animation completes
function updateCameraAngleFromPosition() {
  const deltaX = camera.position.x - orbitCenter.x;
  const deltaZ = camera.position.z - orbitCenter.z;
  currentCameraAngle = Math.atan2(deltaZ, deltaX);
}

