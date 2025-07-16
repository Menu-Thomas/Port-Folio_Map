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

// === GLOBAL STATE VARIABLES ===
let interactionsDisabled = false; // Global flag to disable all 3D interactions

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
    ORIGINAL_LOOK_AT: { x: 0, y: 0, z: 0 }
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
  const radius = 7.5; // Reduced from 12 to 9 for closer view
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
      
      // Re-enable interactions after cinematic completes
      interactionsDisabled = false;
      window.interactionsDisabled = false;
      
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
  
  // Set global flag for guide system
  window.allAssetsLoaded = true;
  
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
const orbitRadius = 7.5; // Same radius as cinematic animation
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
  const radius = 7.5; // Same as cinematic animation
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
  
  // Disable all interactions while loading overlay is visible
  interactionsDisabled = true;
  window.interactionsDisabled = true;
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
window.interactionsDisabled = interactionsDisabled; // Expose to window for access from portfolio.html

// === Expose useful variables for guide system ===
window.getCurrentActiveHexType = () => currentActiveHexType;
window.getHoveredDrawer = () => hoveredDrawer;
window.getUnreadDrawers = () => unreadDrawers;

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
let trashModalClosed = false; // Track if user has manually closed the trash modal
let trashModalOpened = false; // Track if the trash modal was ever opened
let trashTruckClicked = false; // Track if user actually clicked on the trash truck
let convoyeurModalClosed = false; // Track if user has manually closed the convoyeur modal
let convoyeurModalOpened = false; // Track if the convoyeur modal was ever opened
let convoyeurClicked = false; // Track if user actually clicked on the convoyeur
let sensorSenseiModalClosed = false; // Track if user has manually closed the sensorSensei modal
let sensorSenseiModalOpened = false; // Track if the sensorSensei modal was ever opened

// === Drawer Management ===
const drawerModels = ['drawer1', 'drawer2', 'drawer3', 'drawer4', 'steering', 'pc', 'forge', 'mail-box', 'trashTruck', 'convoyeur', 'sensorSensei'];
const drawers = [];
const drawerOriginalPositions = new Map();
const unreadDrawers = new Set(['drawer1', 'drawer2', 'drawer3', 'drawer4', 'steering', 'forge', 'mail-box', 'trashTruck', 'convoyeur', 'sensorSensei', 'skillFlower']);

// === Skill Flowers and Language Flowers Management ===
const skillFlowers = []; // Array to store the 9 skillFlowers
const languageFlowers = []; // Array to store the 9 language flowers

// FIXED flower configuration based on actual user testing
// Mapping based on grid positions: (-1,1), (0,1), (1,1), (-1,0), (0,0), (1,0), (-1,-1), (0,-1), (1,-1)
const languageFlowerData = [
  { 
    name: 'unity', 
    model: 'unityFlower.glb',
    displayName: 'Unity Engine',
    category: 'Game Development',
    gridPosition: 'position-0'
  },        
  { 
    name: 'unreal', 
    model: 'UnrealFlower.glb',
    displayName: 'Unreal Engine',
    category: 'Game Development', 
    gridPosition: 'position-1'
  },      
  { 
    name: 'cpp', 
    model: 'c++Flower.glb',
    displayName: 'C++',
    category: 'Programming Language',
    gridPosition: 'position-2'
  },            
  { 
    name: 'csharp', 
    model: 'CFlower.glb',
    displayName: 'C#',
    category: 'Programming Language',
    gridPosition: 'position-3'
  },           
  { 
    name: 'python', 
    model: 'pythonFlower.glb',
    displayName: 'Python',
    category: 'Programming Language',
    gridPosition: 'position-4'
  },      
  { 
    name: 'java', 
    model: 'javaFlower.glb',
    displayName: 'Java',
    category: 'Programming Language',
    gridPosition: 'position-5'
  },          
  { 
    name: 'git', 
    model: 'gitFlower.glb',
    displayName: 'Git',
    category: 'Version Control',
    gridPosition: 'position-6'
  },            
  { 
    name: 'arduino', 
    model: 'arduinoFlower.glb',
    displayName: 'Arduino',
    category: 'Hardware Development',
    gridPosition: 'position-7'
  },    
  { 
    name: 'meta', 
    model: 'MetaFlower.glb',
    displayName: 'Meta Quest SDK',
    category: 'VR/AR Development',
    gridPosition: 'position-8'
  }           
];

const activeLanguageFlowers = new Set(); // Track which language flowers are currently visible
const languageFlowerRotations = new Map(); // Track rotation animations

// Helper function to get language flower info by grid index
function getLanguageFlowerInfo(gridIndex) {
  if (gridIndex >= 0 && gridIndex < languageFlowerData.length) {
    return languageFlowerData[gridIndex];
  }
  return null;
}

// Helper function to get language flower info by name
function getLanguageFlowerByName(name) {
  return languageFlowerData.find(flower => flower.name === name);
}

// === Drawer Configuration ===
const animatedDrawers = ['drawer1', 'drawer2', 'drawer3', 'drawer4', 'skillFlower1', 'skillFlower2', 'skillFlower3', 'skillFlower4', 'skillFlower5', 'skillFlower6', 'skillFlower7', 'skillFlower8', 'skillFlower9']; // Drawers that animate on hover
const clickAnimatedDrawers = ['pc', 'steering', 'trashTruck', 'convoyeur', 'sensorSensei']; // Drawers that animate camera on click
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
  'pc': 'home',
  'forge': 'forge',
  'mail-box': 'contact',
  'trashTruck': 'home',
  'convoyeur': 'home',
  'sensorSensei': 'projects',
  'skillFlower': 'cv' // All skillFlowers belong to CV theme
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
  },
  trashTruck: {
    x: 0, y: 0, z: 0,
    lookAt: { x: 0, y: 0, z: 0 }
  },
  convoyeur: {
    x: 0, y: 0, z: 0,
    lookAt: { x: 0, y: 0, z: 0 }
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
  //{ q: -1, r: 2, type: 'plain1' },
  { q: 0, r: 2, type: 'plain1' },
  //{ q: -1, r: 1, type: 'plain1' },
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
    let drawerTheme = drawerThemes[drawer];
    
    // Handle skillFlowers - they all belong to CV theme
    if (drawer.startsWith('skillFlower')) {
      drawerTheme = 'cv';
    }
    
    if (drawerTheme === themeId) {
      count++;
    }
  });
  return count;
}

function updateThemeUnreadBadges() {
  const themes = ['home', 'forge', 'contact', 'projects', 'cv'];
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

// === Theme-based Interaction Helper ===
function isDrawerClickableAtCurrentLocation(drawerType) {
  // If we're in orbital mode (no specific hex), only allow 'home' theme drawers
  if (currentActiveHexType === null) {
    console.log(`Drawer ${drawerType}: currentActiveHexType is null, allowing only home theme`);
    return drawerThemes[drawerType] === 'home';
  }
  
  // Get the theme of the current active hex
  const currentTheme = getCurrentHexTheme(currentActiveHexType);
  
  // Get the theme required for this drawer
  let drawerTheme = drawerThemes[drawerType];
  
  // Handle skillFlowers - they all belong to CV theme
  if (drawerType.startsWith('skillFlower')) {
    drawerTheme = 'cv';
  }
  
  console.log(`Drawer ${drawerType}: currentActiveHexType="${currentActiveHexType}", currentTheme="${currentTheme}", drawerTheme="${drawerTheme}"`);
  
  // Special debug for skillFlowers
  if (drawerType.startsWith('skillFlower')) {
    console.log(`SkillFlower debug: ${drawerType} - currentActiveHexType="${currentActiveHexType}", currentTheme="${currentTheme}", drawerTheme="${drawerTheme}", match: ${currentTheme === drawerTheme}`);
  }
  
  // Allow interaction if themes match
  return currentTheme === drawerTheme;
}

function getCurrentHexTheme(hexType) {
  // Define which hex types belong to which themes
  const hexThemes = {
    'home': 'home',
    'cv': 'cv', 
    'projects': 'projects',
    'contact': 'contact',
    'bridge': 'home',
    'champ1': 'home',
    'champ2': 'home',
    'forest1': 'home',
    'forest2': 'home', 
    'forest3': 'home',
    'marais': 'home',
    'marais2': 'home',
    'desert1': 'home',
    'desert2': 'home',
    'plain1': 'home',
    'forge2': 'forge'
  };
  
  return hexThemes[hexType] || 'home'; // Default to 'home' theme
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
  
  // Skip 3D interactions if loading overlay is visible
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay && !loadingOverlay.classList.contains('hidden')) {
    return; // Don't process 3D canvas hover if loading overlay is visible
  }
  
  // Check if mouse is over the navigation sidebar
  const navSidebar = document.getElementById('zoneNavSidebar');
  if (navSidebar && navSidebar.contains(event.target)) {
    // Hide drawer label and reset hover states when over nav
    drawerLabel.style.display = "none";
    if (hoveredDrawer && drawerOriginalPositions.has(hoveredDrawer) && animatedDrawers.includes(hoveredDrawer.userData.type)) {
      const orig = drawerOriginalPositions.get(hoveredDrawer);
      // Check if it's a skillFlower
      if (hoveredDrawer.userData.type.startsWith('skillFlower')) {
        gsap.to(hoveredDrawer.position, {
          x: orig.x,
          y: orig.y, // Return to original Y position
          z: orig.z,
          duration: 0.3,
          ease: 'power2.out',
        });
      } else {
        gsap.to(hoveredDrawer.position, {
          x: orig.x,
          z: orig.z,
          duration: 0.3,
          ease: 'power2.out',
        });
      }
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
        // Check if this drawer is interactive at current location/theme
        const isClickable = isDrawerClickableAtCurrentLocation(object.userData.type);
        
        // Only show hover effects and labels for clickable drawers
        if (!isClickable) {
          // Reset any existing hover state and don't show label
          if (hoveredDrawer && drawerOriginalPositions.has(hoveredDrawer) && animatedDrawers.includes(hoveredDrawer.userData.type)) {
            const orig = drawerOriginalPositions.get(hoveredDrawer);
            gsap.to(hoveredDrawer.position, {
              x: orig.x,
              z: orig.z,
              duration: CONFIG.ANIMATION.DRAWER_HOVER_DURATION,
              ease: CONFIG.ANIMATION.HOVER_EASE,
            });
            hoveredDrawer = null;
          }
          drawerLabel.style.display = "none";
          return; // Don't process hover for non-clickable drawers
        }
        
        foundDrawer = object;
        
        // FIXED: For skillFlowers, treat collision box and target drawer as the same object
        let normalizedDrawer = foundDrawer;
        let gridIndex = foundDrawer.userData.gridIndex;
        
        if (foundDrawer.userData.type && foundDrawer.userData.type.startsWith('skillFlower') && foundDrawer.userData.targetDrawer) {
          // If this is a collision box, use the target drawer for comparison and get gridIndex from either
          normalizedDrawer = foundDrawer.userData.targetDrawer;
          // Use gridIndex from collision box (foundDrawer) as it should be the same as target drawer
          gridIndex = foundDrawer.userData.gridIndex;
        }
        
        // === Only animate if in animatedDrawers AND clickable ===
        if (animatedDrawers.includes(object.userData.type)) {
          // FIXED: Compare using normalized drawer to avoid flickering between collision box and mesh
          if (hoveredDrawer !== normalizedDrawer) {
            // Animate previous hovered drawer back
            if (hoveredDrawer && drawerOriginalPositions.has(hoveredDrawer.userData.targetDrawer || hoveredDrawer)) {
              const targetDrawer = hoveredDrawer.userData.targetDrawer || hoveredDrawer;
              const orig = drawerOriginalPositions.get(targetDrawer);
              
              // Check if previous drawer was a skillFlower
              if (hoveredDrawer.userData.type.startsWith('skillFlower')) {
                gsap.to(targetDrawer.position, {
                  x: orig.x,
                  y: orig.y, // Return to original Y position
                  z: orig.z,
                  duration: CONFIG.ANIMATION.DRAWER_HOVER_DURATION,
                  ease: CONFIG.ANIMATION.HOVER_EASE,
                });
                
                // Hide language flower when stopping hover on any skillFlower
                if (hoveredDrawer.userData.type.startsWith('skillFlower') && hoveredDrawer.userData.gridIndex !== undefined) {
                  hideLanguageFlower(hoveredDrawer.userData.gridIndex);
                }
              } else {
                gsap.to(hoveredDrawer.position, {
                  x: orig.x,
                  z: orig.z,
                  duration: CONFIG.ANIMATION.DRAWER_HOVER_DURATION,
                  ease: CONFIG.ANIMATION.HOVER_EASE,
                });
              }
            }
            // Animate new hovered drawer
            if (foundDrawer.userData.type.startsWith('skillFlower')) {
              // Handle collision boxes by animating the target drawer
              const targetDrawer = foundDrawer.userData.targetDrawer || foundDrawer;
              const orig = drawerOriginalPositions.get(targetDrawer);
              
              if (orig) {
                gsap.to(targetDrawer.position, {
                  x: orig.x,
                  y: orig.y + 0.15, // Move up by 0.15 units
                  z: orig.z,
                  duration: CONFIG.ANIMATION.DRAWER_HOVER_DURATION,
                  ease: CONFIG.ANIMATION.HOVER_EASE,
                });
              }
              
              // FIXED: Show corresponding language flower using grid index from any skillFlower component
              if (gridIndex !== undefined) {
                const skillFlowerInfo = getLanguageFlowerInfo(gridIndex);
                console.log(`SkillFlower hover detected - Grid Index: ${gridIndex}, Type: ${foundDrawer.userData.type}, Expected: ${skillFlowerInfo?.displayName}`);
                showLanguageFlower(gridIndex);
              }
            } else {
              // For regular drawers, use the old movement
              gsap.to(foundDrawer.position, {
                x: 0.029,
                z: -0.0374,
                duration: CONFIG.ANIMATION.DRAWER_HOVER_DURATION,
                ease: CONFIG.ANIMATION.HOVER_EASE,
              });
            }
            hoveredDrawer = normalizedDrawer; // Store the normalized drawer (target drawer for collision boxes)
          }
        } else {
          // For non-animated drawers, just update hoveredDrawer reference (no animation)
          if (
            hoveredDrawer &&
            hoveredDrawer !== normalizedDrawer &&
            drawerOriginalPositions.has(hoveredDrawer) &&
            animatedDrawers.includes(hoveredDrawer.userData.type)
          ) {
            const orig = drawerOriginalPositions.get(hoveredDrawer);
            // Check if previous drawer was a skillFlower
            if (hoveredDrawer.userData.type.startsWith('skillFlower')) {
              gsap.to(hoveredDrawer.position, {
                x: orig.x,
                y: orig.y, // Return to original Y position
                z: orig.z,
                duration: 0.3,
                ease: 'power2.out',
              });
            } else {
              gsap.to(hoveredDrawer.position, {
                x: orig.x,
                z: orig.z,
                duration: 0.3,
                ease: 'power2.out',
              });
            }
          }
          hoveredDrawer = normalizedDrawer; // Store the normalized drawer
        }
        
        // Show label for clickable drawers only
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
              drawerLabel.style.opacity = "1";

              // Better positioning logic
              positionDrawerLabel(event.clientX, event.clientY);
              
              // Mark drawer as read (except forge - steering can be marked as read)
              if (isUnread && object.userData.type !== 'forge') {
                unreadDrawers.delete(object.userData.type);
                updateThemeUnreadBadges();
              }
            })
            .catch(error => {
              console.warn('Failed to load drawer info:', error);
              drawerLabel.innerHTML = '<div>Content unavailable</div>';
              drawerLabel.style.display = "block";
              drawerLabel.style.border = "1px solid #eee";
              drawerLabel.style.opacity = "1";
              positionDrawerLabel(event.clientX, event.clientY);
            });
        } else {
          // Custom messages for specific drawers
          let message = `<div>No info available.</div>`;
          if (object.userData.type === 'forge') {
            message = `<div>most significant conception experience</div>`;
          } else if (object.userData.type === 'steering') {
            message = `<div>most significant dev project</div>`;
          } else if (object.userData.type === 'trashTruck') {
            message = `<div>IoT + AR trash management project</div>`;
          } else if (object.userData.type === 'convoyeur') {
            message = `<div>Automated sorting system with NFC & WMS</div>`;
          } else if (object.userData.type === 'sensorSensei') {
            message = `<div>LoRa-powered environmental data relay</div>`;
          } else if (object.userData.type === 'skillFlower1') {
            message = `<div><strong>Unity Game Engine</strong><br/>3D game development and interactive experiences</div>`;
          } else if (object.userData.type === 'skillFlower2') {
            message = `<div><strong>Unreal Engine</strong><br/>Advanced real-time 3D creation and visualization</div>`;
          } else if (object.userData.type === 'skillFlower3') {
            message = `<div><strong>C++ Programming</strong><br/>High-performance system and game development</div>`;
          } else if (object.userData.type === 'skillFlower4') {
            message = `<div><strong>C# Development</strong><br/>Enterprise applications and Unity scripting</div>`;
          } else if (object.userData.type === 'skillFlower5') {
            message = `<div><strong>Python Programming</strong><br/>Data science, automation, and backend development</div>`;
          } else if (object.userData.type === 'skillFlower6') {
            message = `<div><strong>Java Development</strong><br/>Enterprise applications and cross-platform solutions</div>`;
          } else if (object.userData.type === 'skillFlower7') {
            message = `<div><strong>Git Version Control</strong><br/>Source code management and collaborative development</div>`;
          } else if (object.userData.type === 'skillFlower8') {
            message = `<div><strong>Arduino & IoT</strong><br/>Embedded systems and Internet of Things development</div>`;
          } else if (object.userData.type === 'skillFlower9') {
            message = `<div><strong>Meta & VR Development</strong><br/>Virtual reality and metaverse applications</div>`;
          }
          
          drawerLabel.innerHTML = message;
          drawerLabel.style.display = "block";
          drawerLabel.style.border = "1px solid #eee";
          drawerLabel.style.opacity = "1";
          positionDrawerLabel(event.clientX, event.clientY);
          
          // Mark drawer as read (except forge - steering can be marked as read)
          if (unreadDrawers.has(object.userData.type) && 
              object.userData.type !== 'forge') {
            unreadDrawers.delete(object.userData.type);
            updateThemeUnreadBadges();
          }
        }
      } else {
        // Not hovering a drawer, animate previous hovered drawer back
        if (
          hoveredDrawer &&
          drawerOriginalPositions.has(hoveredDrawer.userData.targetDrawer || hoveredDrawer) &&
          animatedDrawers.includes(hoveredDrawer.userData.type)
        ) {
          const targetDrawer = hoveredDrawer.userData.targetDrawer || hoveredDrawer;
          const orig = drawerOriginalPositions.get(targetDrawer);
          
          // Check if it's a skillFlower
          if (hoveredDrawer.userData.type.startsWith('skillFlower')) {
            gsap.to(targetDrawer.position, {
              x: orig.x,
              y: orig.y, // Return to original Y position
              z: orig.z,
              duration: 0.3,
              ease: 'power2.out',
            });
            
            // Hide language flower when stopping hover on any skillFlower
            if (hoveredDrawer.userData.type.startsWith('skillFlower') && hoveredDrawer.userData.gridIndex !== undefined) {
              hideLanguageFlower(hoveredDrawer.userData.gridIndex);
            }
          } else {
            gsap.to(targetDrawer.position, {
              x: orig.x,
              z: orig.z,
              duration: 0.3,
              ease: 'power2.out',
            });
          }
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
      // Check if it's a skillFlower
      if (hoveredDrawer.userData.type.startsWith('skillFlower')) {
        gsap.to(hoveredDrawer.position, {
          x: orig.x,
          y: orig.y, // Return to original Y position
          z: orig.z,
          duration: 0.3,
          ease: 'power2.out',
        });
        
        // Hide language flower when stopping hover on any skillFlower
        if (hoveredDrawer.userData.type.startsWith('skillFlower') && hoveredDrawer.userData.gridIndex !== undefined) {
          hideLanguageFlower(hoveredDrawer.userData.gridIndex);
        }
      } else {
        gsap.to(hoveredDrawer.position, {
          x: orig.x,
          z: orig.z,
          duration: 0.3,
          ease: 'power2.out',
        });
      }
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

// === Skill Flowers Grid Generation ===
function generateSkillFlowersGrid() {
  const cvHex = hexMap.find(hex => hex.type === 'cv');
  if (!cvHex) {
    console.error('CV hex not found');
    return;
  }
  
  const cvWorldPos = hexToWorld(cvHex.q, cvHex.r);
  const gridSpacing = { x: 0.2, z: 0.27 }; // Grid dimensions reduced by half
  const collisionBoxYOffset = -0.1; // Configurable Y offset for collision boxes (negative = lower)
  
  // 3x3 grid positions (center at 0,0 relative to CV hex)
  // NOTE: The coordinate system is relative to the camera's viewing angle
  // From the user's perspective when looking at the CV hex:
  // - Negative Z is "forward" (top row)
  // - Positive Z is "backward" (bottom row)  
  // - Negative X is "left" 
  // - Positive X is "right"
  const gridPositions = [
    { x: -gridSpacing.x, z: -gridSpacing.z }, // Index 0: Top-left -> Unity
    { x: 0, z: -gridSpacing.z },              // Index 1: Top-center -> Unreal
    { x: gridSpacing.x, z: -gridSpacing.z },  // Index 2: Top-right -> C++
    { x: -gridSpacing.x, z: 0 },              // Index 3: Middle-left -> C#
    { x: 0, z: 0 },                           // Index 4: Middle-center -> Python
    { x: gridSpacing.x, z: 0 },               // Index 5: Middle-right -> Java
    { x: -gridSpacing.x, z: gridSpacing.z },  // Index 6: Bottom-left -> Git
    { x: 0, z: gridSpacing.z },               // Index 7: Bottom-center -> Arduino
    { x: gridSpacing.x, z: gridSpacing.z }    // Index 8: Bottom-right -> Meta
  ];
  
  console.log('=== SkillFlower Grid Debug ===');
  console.log('CV hex world position:', cvWorldPos);
  console.log('Grid spacing:', gridSpacing);
  
  // Load skillFlower model and create 9 instances
  gridPositions.forEach((gridPos, index) => {
    const loader = new GLTFLoader();
    incrementTotalAssets(); // Register for loading tracking
    
    // Calculate final world position
    const finalWorldPos = {
      x: cvWorldPos.x + gridPos.x,
      y: 0,
      z: cvWorldPos.z + gridPos.z
    };
    
    const expectedFlower = languageFlowerData[index];
    console.log(`SkillFlower ${index}: Grid(${gridPos.x.toFixed(2)}, ${gridPos.z.toFixed(2)}) -> World(${finalWorldPos.x.toFixed(2)}, ${finalWorldPos.z.toFixed(2)}) -> ${expectedFlower?.displayName} (${expectedFlower?.name})`);
    
    // Additional debug: Show which position this represents in user view
    let viewPosition = 'unknown';
    if (gridPos.z < 0) viewPosition = 'top';
    else if (gridPos.z > 0) viewPosition = 'bottom';
    else viewPosition = 'middle';
    
    if (gridPos.x < 0) viewPosition += '-left';
    else if (gridPos.x > 0) viewPosition += '-right';
    else viewPosition += '-center';
    
    console.log(`  -> Visual position: ${viewPosition} (should show ${expectedFlower?.displayName})`);
    
    ErrorHandler.handleAsyncError(
      new Promise((resolve, reject) => {
        loader.load(
          `./public/models/skillFlower.glb`, // Use same skillFlower.glb model for all 9
          (gltf) => {
            try {
              processGLBMaterials(gltf);
              const skillFlower = gltf.scene;
              
              // Position at grid location relative to CV hex
              skillFlower.position.set(
                finalWorldPos.x,
                finalWorldPos.y,
                finalWorldPos.z
              );
              
              skillFlower.scale.set(1, 1, 1);
              skillFlower.userData.type = `skillFlower${index + 1}`;
              skillFlower.userData.gridIndex = index;
              
              // Create collision box for enhanced mouse detection
              const collisionGeometry = new THREE.BoxGeometry(0.05, 0.2, 0.05);
              const collisionMaterial = new THREE.MeshBasicMaterial({ 
                visible: false,
                transparent: true,
                opacity: 0 
              });
              const collisionBox = new THREE.Mesh(collisionGeometry, collisionMaterial);
              
              collisionBox.position.copy(skillFlower.position);
              collisionBox.position.y += collisionBoxYOffset; // Apply configurable Y offset
              collisionBox.userData.type = `skillFlower${index + 1}`;
              collisionBox.userData.targetDrawer = skillFlower;
              collisionBox.userData.gridIndex = index;
              
              scene.add(skillFlower);
              scene.add(collisionBox);
              
              skillFlowers.push(skillFlower);
              drawers.push(collisionBox);
              drawers.push(skillFlower); // FIXED: Add skillFlower mesh to drawers array too
              drawerOriginalPositions.set(skillFlower, skillFlower.position.clone());
              
              console.log(`SkillFlower ${index + 1} loaded at world position:`, skillFlower.position, `-> Maps to: ${expectedFlower?.displayName}`);
              markAssetLoaded();
              resolve(skillFlower);
            } catch (error) {
              reject(error);
            }
          },
          undefined,
          reject
        );
      }),
      `SkillFlower ${index + 1} loading`
    );
  });
}

// === Language Flowers Management ===
function loadLanguageFlowers() {
  console.log('Loading language flowers with enhanced mapping...');
  
  // Pre-initialize the array with the correct size to ensure proper indexing
  languageFlowers.length = languageFlowerData.length;
  
  languageFlowerData.forEach((flowerData, index) => {
    const loader = new GLTFLoader();
    incrementTotalAssets(); // Register for loading tracking
    
    ErrorHandler.handleAsyncError(
      new Promise((resolve, reject) => {
        loader.load(
          `./public/models/${flowerData.model}`,
          (gltf) => {
            try {
              processGLBMaterials(gltf);
              const languageFlower = gltf.scene;
              
              // FIXED: Start hidden below ground at origin (will be positioned correctly when shown)
              languageFlower.position.set(0, -2, 0);
              languageFlower.scale.set(1, 1, 1);
              languageFlower.visible = false;
              
              // Enhanced userData with complete flower information
              languageFlower.userData = {
                type: flowerData.name,
                displayName: flowerData.displayName,
                category: flowerData.category,
                gridPosition: flowerData.gridPosition,
                gridIndex: index
              };
              
              scene.add(languageFlower);
              // FIXED: Place language flower at the correct array index instead of pushing
              languageFlowers[index] = languageFlower;
              
              console.log(`Language flower loaded - Index: ${index}, Name: ${flowerData.name}, Display: ${flowerData.displayName}, Position: ${flowerData.gridPosition}`);
              markAssetLoaded();
              resolve(languageFlower);
            } catch (error) {
              reject(error);
            }
          },
          undefined,
          reject
        );
      }),
      `Language flower ${flowerData.displayName} (${flowerData.name}) loading`
    );
  });
  
  // Log the complete mapping for verification
  console.log('Language Flower Grid Mapping:');
  languageFlowerData.forEach((flower, index) => {
    console.log(`Grid ${index} (${flower.gridPosition}): ${flower.displayName} (${flower.name}) - ${flower.category}`);
  });
}

function showLanguageFlower(gridIndex) {
  const languageFlower = languageFlowers[gridIndex];
  const skillFlower = skillFlowers[gridIndex];
  const flowerInfo = getLanguageFlowerInfo(gridIndex);
  
  if (!languageFlower || !skillFlower || activeLanguageFlowers.has(gridIndex)) {
    console.warn(`Cannot show language flower at index ${gridIndex}:`, {
      hasLanguageFlower: !!languageFlower,
      hasSkillFlower: !!skillFlower,
      alreadyActive: activeLanguageFlowers.has(gridIndex)
    });
    return;
  }
  
  activeLanguageFlowers.add(gridIndex);
  languageFlower.visible = true;
  
  // Log what we're showing
  console.log(`Showing language flower: ${flowerInfo?.displayName || 'Unknown'} (${flowerInfo?.name || 'unknown'}) at grid position ${gridIndex} (${flowerInfo?.gridPosition || 'unknown'})`);
  
  // FIXED: Position directly above the corresponding skillFlower using exact coordinates
  const targetX = skillFlower.position.x;
  const targetY = skillFlower.position.y + 0.42; // Height above skillFlower
  const targetZ = skillFlower.position.z;
  
  // Set the language flower to the exact X,Z position of the skillFlower, but below ground
  languageFlower.position.set(targetX, targetY - 0.5, targetZ);
  
  // Animate rising to the target position
  gsap.to(languageFlower.position, {
    y: targetY,
    duration: 0.4,
    ease: 'back.out(1.4)'
  });
  
  // Start rotation animation
  const rotationAnim = gsap.to(languageFlower.rotation, {
    y: "+=6.283", // Full rotation (2π radians)
    duration: 2,
    ease: "none",
    repeat: -1
  });
  
  languageFlowerRotations.set(gridIndex, rotationAnim);
}

function hideLanguageFlower(gridIndex) {
  const languageFlower = languageFlowers[gridIndex];
  const skillFlower = skillFlowers[gridIndex];
  const flowerInfo = getLanguageFlowerInfo(gridIndex);
  
  if (!languageFlower || !activeLanguageFlowers.has(gridIndex)) return;
  
  console.log(`Hiding language flower: ${flowerInfo?.displayName || 'Unknown'} (${flowerInfo?.name || 'unknown'}) at grid position ${gridIndex}`);
  
  activeLanguageFlowers.delete(gridIndex);
  
  // Stop rotation
  const rotationAnim = languageFlowerRotations.get(gridIndex);
  if (rotationAnim) {
    rotationAnim.kill();
    languageFlowerRotations.delete(gridIndex);
  }
  
  // FIXED: Animate sinking down to below ground at the same X,Z coordinates
  const targetX = skillFlower ? skillFlower.position.x : languageFlower.position.x;
  const targetZ = skillFlower ? skillFlower.position.z : languageFlower.position.z;
  
  gsap.to(languageFlower.position, {
    y: languageFlower.position.y - 0.5,
    duration: 0.3,
    ease: 'power2.in',
    onComplete: () => {
      languageFlower.visible = false;
      languageFlower.rotation.y = 0; // Reset rotation
      // FIXED: Reset position to below ground at the correct X,Z coordinates for next show
      languageFlower.position.set(targetX, -2, targetZ);
    }
  });
}

// Initialize skill flowers and language flowers
generateSkillFlowersGrid();
loadLanguageFlowers();

// === Legacy Unity Flower Functions (keeping for compatibility) ===
function showUnityFlower() {
  // Legacy function - Unity flower is now at index 0 (top-left position)
  const unityFlower = getLanguageFlowerByName('unity');
  if (unityFlower) {
    const unityIndex = languageFlowerData.findIndex(flower => flower.name === 'unity');
    console.log(`Legacy showUnityFlower called - showing Unity at index ${unityIndex}`);
    showLanguageFlower(unityIndex);
  } else {
    console.warn('Unity flower not found in language flower data');
  }
}

function hideUnityFlower() {
  // Legacy function - Unity flower is now at index 0 (top-left position)
  const unityIndex = languageFlowerData.findIndex(flower => flower.name === 'unity');
  if (unityIndex !== -1) {
    console.log(`Legacy hideUnityFlower called - hiding Unity at index ${unityIndex}`);
    hideLanguageFlower(unityIndex);
  } else {
    console.warn('Unity flower not found in language flower data');
  }
}

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

    // Update language flowers positions to stay above their corresponding skillFlowers
    activeLanguageFlowers.forEach(gridIndex => {
      const languageFlower = languageFlowers[gridIndex];
      const skillFlower = skillFlowers[gridIndex];
      
      if (languageFlower && skillFlower && languageFlower.visible) {
        // Keep language flower positioned above its skillFlower
        languageFlower.position.x = skillFlower.position.x;
        languageFlower.position.z = skillFlower.position.z;
        // Y position is handled by animations, don't override here
      }
    });

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
    
    // Reset trash modal state when going back to overview
    trashModalClosed = false;
    trashModalOpened = false;
    trashTruckClicked = false;
    
    // Reset convoyeur modal state when going back to overview
    convoyeurModalClosed = false;
    convoyeurModalOpened = false;
    convoyeurClicked = false;
    
    // Reset sensorSensei modal state when going back to overview
    sensorSenseiModalClosed = false;
    sensorSenseiModalOpened = false;
    
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
  // FIRST: Check global interactions disabled flag
  if (interactionsDisabled) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return false;
  }
  
  // SECOND: Skip 3D interactions if loading overlay is visible
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay && !loadingOverlay.classList.contains('hidden')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return false;
  }
  
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
      
      // Reset trash modal state when navigating to different areas
      trashModalClosed = false;
      trashModalOpened = false;
      trashTruckClicked = false;
      
      // Reset convoyeur modal state when navigating to different areas
      convoyeurModalClosed = false;
      convoyeurModalOpened = false;
      convoyeurClicked = false;
      
      // Reset sensorSensei modal state when navigating to different areas
      sensorSenseiModalClosed = false;
      sensorSenseiModalOpened = false;
      
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
      // Check if this drawer is clickable at the current location/theme
      if (!isDrawerClickableAtCurrentLocation(object.userData.type)) {
        console.log(`Drawer ${object.userData.type} not clickable at current location/theme`);
        return; // Don't allow interaction if not at correct theme
      }
      
      // Mark drawer as read when clicked (except forge)
      if (unreadDrawers.has(object.userData.type) && object.userData.type !== 'forge') {
        unreadDrawers.delete(object.userData.type);
        updateThemeUnreadBadges();
      }
      
      // Handle objects that don't need camera movement (trashTruck, convoyeur, sensorSensei)
      if (object.userData.type === 'trashTruck' || object.userData.type === 'convoyeur' || object.userData.type === 'sensorSensei') {
        if (object.userData.type === 'trashTruck' && !trashModalClosed) {
          showTrashModal();
        }
        if (object.userData.type === 'convoyeur' && !convoyeurModalClosed) {
          showConvoyeurModal();
        }
        if (object.userData.type === 'sensorSensei' && !sensorSenseiModalClosed) {
          showSensorSenseiModal();
        }
        return; // Don't animate camera for these objects
      }
      
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
      // Check if forge is clickable at the current location/theme
      if (!isDrawerClickableAtCurrentLocation('forge')) {
        console.log('Forge not clickable at current location/theme');
        return; // Don't allow interaction if not at correct theme
      }
      
      // Mark forge as read
      if (unreadDrawers.has('forge')) {
        unreadDrawers.delete('forge');
        updateThemeUnreadBadges();
      }
      showForgeModal();
    }
    // Handle mail-box click for contact theme
    else if (object.userData.type === 'mail-box') {
      // Check if mail-box is clickable at the current location/theme
      if (!isDrawerClickableAtCurrentLocation('mail-box')) {
        console.log('Mail-box not clickable at current location/theme');
        return; // Don't allow interaction if not at correct theme
      }
      
      // Mark mail-box as read
      if (unreadDrawers.has('mail-box')) {
        unreadDrawers.delete('mail-box');
        updateThemeUnreadBadges();
      }
      
      // Show contact modal instead of navigating to a new page
      showContactModal();
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
    width: min(95vw, 1200px);
    height: min(90vh, 800px);
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

function showContactModal() {
  let existingModal = document.getElementById('contactModal');
  if (existingModal) return; // Already open
  
  const { modal, content } = createModalBase('contactModal');
  
  const iframe = document.createElement('iframe');
  iframe.src = 'sidepages/contact.html';
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    background: #fff;
  `;
  
  iframe.onerror = () => {
    content.innerHTML = '<div style="color: white; padding: 20px; text-align: center;">Error loading contact form</div>';
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

function showTrashModal() {
  let existingModal = document.getElementById('trashModal');
  if (existingModal) return; // Already open
  
  trashModalOpened = true; // Mark that the modal was opened
  
  const { modal, content } = createModalBase('trashModal', () => {
    trashModalClosed = true; // Mark that user has closed the modal
    
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
  });
  
  const iframe = document.createElement('iframe');
  iframe.src = 'sidepages/trashProject.html';
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    background: #fff;
  `;
  
  iframe.onerror = () => {
    content.innerHTML = '<div style="color: white; padding: 20px; text-align: center;">Error loading trash project content</div>';
  };

  content.appendChild(iframe);
  document.body.appendChild(modal);
}

function showConvoyeurModal() {
  let existingModal = document.getElementById('convoyeurModal');
  if (existingModal) return; // Already open
  
  convoyeurModalOpened = true; // Mark that the modal was opened
  
  const { modal, content } = createModalBase('convoyeurModal', () => {
    convoyeurModalClosed = true; // Mark that user has closed the modal
    
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
  });
  
  const iframe = document.createElement('iframe');
  iframe.src = 'sidepages/convoyeur.html';
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    background: #fff;
  `;
  
  iframe.onerror = () => {
    content.innerHTML = '<div style="color: white; padding: 20px; text-align: center;">Error loading convoyeur project content</div>';
  };

  content.appendChild(iframe);
  document.body.appendChild(modal);
}

function showSensorSenseiModal() {
  let existingModal = document.getElementById('sensorSenseiModal');
  if (existingModal) return; // Already open
  
  sensorSenseiModalOpened = true; // Mark that the modal was opened
  
  const { modal, content } = createModalBase('sensorSenseiModal', () => {
    sensorSenseiModalClosed = true; // Mark that user has closed the modal
    
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
  });
  
  const iframe = document.createElement('iframe');
  iframe.src = 'sidepages/sensorSensei.html';
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    background: #fff;
  `;
  
  iframe.onerror = () => {
    content.innerHTML = '<div style="color: white; padding: 20px; text-align: center;">Error loading sensor sensei project content</div>';
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
            
            // Position mail-box at contact hex location
            if (model === 'mail-box') {
              // Get contact hex position (q: 2, r: 2)
              const { x, z } = hexToWorld(2, 2);
              drawer.position.set(x, 0, z);
            }
            
            // Position trash truck at default position (matches hex coordinate system)
            if (model === 'trashTruck') {
              // Use default position (0, 0, 0) as it's already aligned to hex coordinates
              drawer.position.set(0, 0, 0);
            }
            
            // Position convoyeur at default position (matches hex coordinate system)
            if (model === 'convoyeur') {
              // Use default position (0, 0, 0) as it's already aligned to hex coordinates
              drawer.position.set(0, 0, 0);
            }
            
            // Position sensorSensei at projects hex location
            if (model === 'sensorSensei') {
              // Get projects hex position (q: 0, r: 1)
              const { x, z } = hexToWorld(0, 1);
              drawer.position.set(x, 0, z);
            }
            
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

// === Legacy Unity Flower Model Loading (now handled by language flowers system) ===
// This section has been replaced by the new language flowers system

// === Navigation Sidebar for Zones ===
const mainZones = [
  { type: 'home', label: 'Accueil', themeId: 'home' },
  { type: 'cv', label: 'CV', themeId: 'home' },
  { type: 'projects', label: 'Projets', themeId: 'home' },
  { type: 'contact', label: 'Contact', themeId: 'contact' },
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
  console.log(`Navigation started: currentActiveHexType set to "${currentActiveHexType}"`);
  
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
    onComplete: () => {
      console.log(`Navigation completed: currentActiveHexType is "${currentActiveHexType}"`);
    }
  });

  // Update active nav item
  updateNavActiveState(zoneType);
}

// Function to update nav active state
function updateNavActiveState(activeType) {
  try {
    const navList = document.getElementById('zoneNavList');
    if (!navList) {
      console.log('Navigation element not found, skipping nav update');
      return;
    }
    
    const navItems = navList.querySelectorAll('li');
    navItems.forEach(item => {
      // Find the zone that matches this nav item
      if (typeof mainZones !== 'undefined') {
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
      }
    });
  } catch (error) {
    console.log('Navigation update failed:', error.message);
  }
}

// Group zones by theme for better organization
if (typeof mainZones !== 'undefined') {
  const groupedZones = {
    'home': mainZones.filter(zone => zone.themeId === 'home'),
    'forge': mainZones.filter(zone => zone.themeId === 'forge'),
    'contact': mainZones.filter(zone => zone.themeId === 'contact'),
    'projects': mainZones.filter(zone => zone.themeId === 'projects'),
    'cv': mainZones.filter(zone => zone.themeId === 'cv')
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

}

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