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

// Import SEO Manager and Analytics (will be loaded dynamically)
let SEOManager = null;
let AnalyticsTracker = null;
let analytics = null;

if (typeof window !== 'undefined') {
  // Load SEO Manager dynamically
  import('./js/seo-manager.js').then(module => {
    SEOManager = module.default || window.SEOManager;
    if (SEOManager) {
      const seoManager = new SEOManager();
      seoManager.init();
      window.seoManager = seoManager; // Make available globally
    }
  }).catch(err => console.warn('SEO Manager not loaded:', err));

  // Load Analytics dynamically
  import('./js/analytics.js').then(module => {
    AnalyticsTracker = module.default || window.AnalyticsTracker;
    if (AnalyticsTracker) {
      analytics = new AnalyticsTracker();
      window.analytics = analytics; // Make available globally
      
      // Track portfolio load
      analytics.track('portfolio_load', {
        webgl_supported: webGLSupported,
        touch_device: isTouchDevice
      });
    }
  }).catch(err => console.warn('Analytics not loaded:', err));
}

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
  
  // Ensure fresh state after all assets are loaded
  initializeFreshState();
  
  // Initialize badges once all assets are loaded
  updateThemeUnreadBadges();
  
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
let currentHoveredSkillFlowerIndex = null; // Track currently hovered skillFlower to prevent duplicate language flower triggers

// === Touch Support Variables ===
let isTouchDevice = false;
let touchStart = { x: 0, y: 0 };
let lastTouchTime = 0;
let touchMoved = false;
const TOUCH_SENSITIVITY = 0.008;
const TAP_THRESHOLD = 10; // pixels
const DOUBLE_TAP_DELAY = 300; // ms

// === Mobile Navigation Variables ===
let isMobileDevice = false;
let isNavigationOpen = false;

// Detect touch device
function detectTouchDevice() {
  isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  isMobileDevice = window.innerWidth <= 768 || isTouchDevice;
  
  // Force mobile detection for testing - remove this line later
  if (window.innerWidth <= 768) {
    isTouchDevice = true;
    isMobileDevice = true;
  }
  
  if (isTouchDevice) {
    console.log('Touch device detected - enabling mobile controls');
    console.log('isMobileDevice:', isMobileDevice);
    console.log('Window width:', window.innerWidth);
    
    // Add mobile-specific styles
    document.body.style.touchAction = 'manipulation'; // Changed from 'none' to allow some touch behaviors
    
    // Add mobile UI indicators
    const mobileInfo = document.createElement('div');
    mobileInfo.id = 'mobile-info';
    mobileInfo.innerHTML = '👆 Glissez pour explorer • Tapez pour sélectionner';
    mobileInfo.style.cssText = `
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.7); color: white; padding: 8px 16px;
      border-radius: 20px; font-size: 12px; z-index: 1000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    document.body.appendChild(mobileInfo);
    
    // Add touch indicator animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ping {
        0% { transform: scale(1); opacity: 1; }
        100% { transform: scale(2); opacity: 0; }
      }
      @keyframes fadeOut {
        0% { opacity: 1; }
        100% { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    
    // Auto-hide mobile info after 5 seconds
    setTimeout(() => {
      if (mobileInfo.parentElement) {
        mobileInfo.style.animation = 'fadeOut 0.5s ease-out forwards';
        setTimeout(() => mobileInfo.remove(), 500);
      }
    }, 5000);
  }
  
  return isTouchDevice;
}

detectTouchDevice();

// === Global Keyboard Shortcuts ===
document.addEventListener('keydown', (event) => {
  // Camera Editor Toggle (Ctrl + E)
  if (event.ctrlKey && event.key.toLowerCase() === 'e') {
    event.preventDefault();
    cameraEditor.toggle();
    return;
  }
  
  // Debug Light Manager (Ctrl + L)
  if (event.ctrlKey && event.key.toLowerCase() === 'l') {
    event.preventDefault();
    ImportedLightManager.debugLights();
    return;
  }
  
  // Quick position print (Ctrl + P) - only when editor is not active
  if (event.ctrlKey && event.key.toLowerCase() === 'p' && !cameraEditor.isActive) {
    event.preventDefault();
    console.log('📍 Current Camera Position:');
    console.log(`Position: { x: ${camera.position.x.toFixed(3)}, y: ${camera.position.y.toFixed(3)}, z: ${camera.position.z.toFixed(3)} }`);
    console.log(`Looking at: { x: ${lookAtTarget.x.toFixed(3)}, y: ${lookAtTarget.y.toFixed(3)}, z: ${lookAtTarget.z.toFixed(3)} }`);
    return;
  }
});

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
window.getUnreadCountForTheme = getUnreadCountForTheme;

// === Error Handling ===
class ErrorHandler {
  static logError(error, context = '') {
    console.error(`[Portfolio Error${context ? ` - ${context}` : ''}]:`, error);
    
    // Send error to analytics if available
    if (typeof gtag !== 'undefined') {
      gtag('event', 'exception', {
        description: `${context}: ${error.message}`,
        fatal: false
      });
    }
    
    // Show user-friendly error message if needed
    if (context.includes('Critical')) {
      this.showUserError('Erreur critique lors du chargement. Veuillez actualiser la page.', true);
    }
  }
  
  static showUserError(message, persistent = false) {
    // Show user-friendly error message
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span>⚠️</span>
        <span>${message}</span>
        ${persistent ? '<button onclick="this.parentElement.parentElement.remove()" style="margin-left: auto; background: none; border: 1px solid white; color: white; padding: 2px 8px; cursor: pointer;">✕</button>' : ''}
      </div>
    `;
    errorDiv.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10000;
      background: #ff4444; color: white; padding: 15px; border-radius: 8px;
      font-family: Arial, sans-serif; max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideInRight 0.3s ease-out;
    `;
    
    // Add animation styles if not present
    if (!document.getElementById('error-animations')) {
      const style = document.createElement('style');
      style.id = 'error-animations';
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(errorDiv);
    
    if (!persistent) {
      setTimeout(() => {
        if (errorDiv.parentElement) {
          errorDiv.style.animation = 'slideInRight 0.3s ease-out reverse';
          setTimeout(() => errorDiv.remove(), 300);
        }
      }, 5000);
    }
  }
  
  static handleAsyncError(promise, context = '') {
    return promise.catch(error => {
      this.logError(error, context);
      
      // Show user error for critical failures
      if (context.includes('Critical') || context.includes('Environment') || context.includes('WebGL')) {
        this.showUserError(`Erreur: ${context}. Certaines fonctionnalités peuvent être limitées.`, true);
      }
      
      return null; // Return null instead of throwing to allow graceful degradation
    });
  }
  
  static checkWebGLSupport() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        throw new Error('WebGL not supported');
      }
      
      // Test for essential extensions
      const extensions = [
        'OES_element_index_uint',
        'WEBGL_depth_texture'
      ];
      
      extensions.forEach(ext => {
        if (!gl.getExtension(ext)) {
          console.warn(`WebGL extension ${ext} not available`);
        }
      });
      
      return true;
    } catch (error) {
      this.logError(error, 'WebGL Support Check');
      this.showUserError('Votre navigateur ne supporte pas WebGL. Certaines fonctionnalités peuvent ne pas fonctionner.', true);
      return false;
    }
  }
  
  static checkRequiredElements() {
    const requiredSelectors = [
      'body',
      '#loadingOverlay'
    ];
    
    // Note: #zoneNavSidebar is created dynamically by main.js navigation system
    const missingElements = [];
    
    requiredSelectors.forEach(selector => {
      const element = selector === 'body' ? document.body : document.querySelector(selector);
      if (!element) {
        missingElements.push(selector);
      }
    });
    
    if (missingElements.length > 0) {
      this.logError(new Error(`Missing required elements: ${missingElements.join(', ')}`), 'DOM Check');
      return false;
    }
    
    return true;
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
// Enable performance monitoring
performanceMonitor.enabled = true;

// === INITIALIZATION CHECKS ===
// Check WebGL support before initializing Three.js
const webGLSupported = ErrorHandler.checkWebGLSupport();
const domElementsValid = ErrorHandler.checkRequiredElements();

if (!webGLSupported || !domElementsValid) {
  console.error('Critical startup checks failed');
  // Continue with degraded functionality
}

// === Production Configuration ===
const isProduction = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');

// === Debug Logging Control ===
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error
};

function setupLogging() {
  if (isProduction) {
    // In production, reduce console noise but keep errors
    console.log = function(...args) {
      // Only log important messages in production
      const message = args.join(' ');
      if (message.includes('loaded successfully') || message.includes('Critical') || message.includes('Error')) {
        originalConsole.log(...args);
      }
    };
  }
}

setupLogging();

// === Asset Validation System ===
class AssetValidator {
  static requiredAssets = {
    models: [
      'Hex.glb', 'skillFlower.glb', 'drawer1.glb', 'drawer2.glb', 
      'drawer3.glb', 'drawer4.glb', 'steering.glb', 'pc.glb', 
      'forge.glb', 'mail-box.glb', 'trashTruck.glb', 'convoyeur.glb',
      'sensorSensei.glb', 'unityFlower.glb', 'UnrealFlower.glb',
      'c++Flower.glb', 'CFlower.glb', 'pythonFlower.glb', 'javaFlower.glb',
      'gitFlower.glb', 'arduinoFlower.glb', 'MetaFlower.glb'
    ],
    textures: [
      'env.jpg', 'hex-texture.png'
    ],
    pages: [
      'project1.html', 'project2.html', 'project3.html', 'project4.html',
      'forge.html', 'virtual.html', 'sidepages/contact.html',
      'sidepages/trashProject.html', 'sidepages/convoyeur.html', 
      'sidepages/sensorSensei.html'
    ]
  };

  static async validateAsset(path, type = 'model') {
    try {
      const response = await fetch(path, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.warn(`Asset validation failed for ${path}:`, error);
      return false;
    }
  }

  static async validateAllAssets() {
    const results = {
      models: [],
      textures: [],
      pages: []
    };

    // Validate models
    for (const model of this.requiredAssets.models) {
      const path = `./public/models/${model}`;
      const exists = await this.validateAsset(path);
      results.models.push({ name: model, exists, path });
    }

    // Validate textures  
    for (const texture of this.requiredAssets.textures) {
      const path = `./public/textures/${texture}`;
      const exists = await this.validateAsset(path);
      results.textures.push({ name: texture, exists, path });
    }

    // Validate pages
    for (const page of this.requiredAssets.pages) {
      const exists = await this.validateAsset(page);
      results.pages.push({ name: page, exists, path: page });
    }

    this.reportValidationResults(results);
    return results;
  }

  static reportValidationResults(results) {
    const missing = [];
    
    ['models', 'textures', 'pages'].forEach(type => {
      results[type].forEach(asset => {
        if (!asset.exists) {
          missing.push(`${type}: ${asset.name}`);
        }
      });
    });

    if (missing.length > 0) {
      console.warn('Missing assets detected:', missing);
      if (!isProduction) {
        ErrorHandler.showUserError(
          `⚠️ ${missing.length} assets manquants détectés. Vérifiez la console pour plus de détails.`,
          true
        );
      }
    } else {
      console.log('All assets validated successfully');
    }
  }
}

// Validate assets in development mode
if (!isProduction) {
  AssetValidator.validateAllAssets();
}

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
let medicalModalClosed = false; // Track if user has manually closed the medical modal
let medicalModalOpened = false; // Track if the medical modal was ever opened
let forviaCarModalClosed = false; // Track if user has manually closed the forviaCAR modal
let forviaCarModalOpened = false; // Track if the forviaCAR modal was ever opened

// === Drawer Management ===
const drawerModels = ['drawer1', 'drawer2', 'drawer3', 'drawer4', 'steering', 'pc', 'forge', 'mail-box', 'trashTruck', 'convoyeur', 'sensorSensei', 'medical', 'forviaCAR'];
const drawers = [];
const interactiveObjects = []; // Separate array for collision detection optimization
const drawerOriginalPositions = new Map();
const unreadDrawers = new Set([
  'drawer1', 'drawer2', 'drawer3', 'drawer4', 
  'steering', 'forge', 'mail-box', 'trashTruck', 'convoyeur', 'sensorSensei', 'medical', 'forviaCAR',
  // Individual skillFlowers for CV theme badges
  'skillFlower1', 'skillFlower2', 'skillFlower3', 'skillFlower4', 'skillFlower5',
  'skillFlower6', 'skillFlower7', 'skillFlower8', 'skillFlower9'
]);

// === Drawer Management Utilities ===
function addToDrawers(object, isInteractive = true) {
  if (!drawers.includes(object)) {
    drawers.push(object);
    if (isInteractive) {
      interactiveObjects.push(object);
    }
  }
}

function optimizeDrawersArray() {
  // Remove duplicates and organize for better performance
  const uniqueDrawers = [...new Set(drawers)];
  drawers.length = 0;
  drawers.push(...uniqueDrawers);
  
  console.log(`Optimized drawers array: ${drawers.length} unique objects`);
}

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
const stayUpSkillFlowers = new Set(); // Track which skill flowers should stay up permanently
const stayUpLanguageFlowers = new Set(); // Track which language flowers should stay up permanently

// === Fresh State Initialization ===
function initializeFreshState() {
  // Clear all persistent states to ensure clean startup on each page load
  activeLanguageFlowers.clear();
  languageFlowerRotations.clear();
  stayUpSkillFlowers.clear();
  stayUpLanguageFlowers.clear();
  
  // Reset hover tracking
  currentHoveredSkillFlowerIndex = null;
  hoveredDrawer = null;
  
  // Kill any existing GSAP animations to prevent conflicts
  if (typeof gsap !== 'undefined') {
    gsap.killTweensOf("*"); // Kill all existing animations
  }
  
  console.log('Portfolio state initialized fresh for this session');
}

// Initialize fresh state immediately
initializeFreshState();

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
const clickAnimatedDrawers = ['pc', 'steering', 'trashTruck', 'convoyeur', 'sensorSensei', 'medical', 'forviaCAR']; // Drawers that animate camera on click
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
  'steering': 'garage',
  'pc': 'home',
  'forge': 'forge',
  'mail-box': 'contact',
  'trashTruck': 'home',
  'convoyeur': 'home',
  'sensorSensei': 'projects',
  'medical': 'garage',
  'forviaCAR': 'garage',
  'skillFlower': 'cv' // All skillFlowers belong to CV theme
};

// Camera target positions for click-animated drawers
const drawerCameraTargets = {
  pc: {
    x: -0.05, y: 0.05, z: -0.15,
    lookAt: { x: -0.25, y: -0.04, z: -0.35 }
  },
  steering: {
    x: -1.738, y: 0.018, z: 0.160,
    lookAt: { x: -2.256, y: -0.070, z: 1.011 }
  },
  trashTruck: {
    x: 0, y: 0, z: 0,
    lookAt: { x: 0, y: 0, z: 0 }
  },
  convoyeur: {
    x: 0, y: 0, z: 0,
    lookAt: { x: 0, y: 0, z: 0 }
  },
  sensorSensei: {
    x: 0, y: 0, z: 0,
    lookAt: { x: 0, y: 0, z: 0 }
  },
  medical: {
    x: -1.738, y: 0.018, z: 0.160,
    lookAt: { x: -2.256, y: -0.070, z: 1.011 }
  },
  forviaCAR: {
    x: -1.738, y: 0.018, z: 0.160,
    lookAt: { x: -2.256, y: -0.070, z: 1.011 }
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
  { q: -1, r: 0, type: 'garage', cameraPos: { x: -1.4, y: 0.15, z: 0.1 } },
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
            processGLBMaterials(gltf, `Hex-${type}.glb`);
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
        (progress) => {
          // Loading progress
          const percent = (progress.loaded / progress.total) * 100;
          console.log(`Loading ${type}: ${percent.toFixed(1)}%`);
        },
        (error) => {
          console.error(`Failed to load Hex-${type}.glb:`, error);
          
          // Create fallback hex geometry
          const fallbackGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 6);
          const fallbackMaterial = new THREE.MeshStandardMaterial({ 
            color: type === 'home' ? 0x4a9eff : 
                   type === 'cv' ? 0x9c27b0 :
                   type === 'projects' ? 0xff9800 :
                   type === 'contact' ? 0x4caf50 : 
                   type.includes('forge') ? 0xff5722 : 0x607d8b
          });
          
          const fallbackHex = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
          fallbackHex.position.set(x, 0, z);
          fallbackHex.userData = { type, q, r, fallback: true };
          fallbackHex.castShadow = true;
          fallbackHex.receiveShadow = true;
          
          scene.add(fallbackHex);
          hexObjects.push(fallbackHex);
          
          loadedHexCount++;
          markAssetLoaded(); // Still mark as loaded even with fallback
          
          console.warn(`Using fallback geometry for ${type} hex`);
          reject(error);
        }
      );
    }),
    `Critical - Hex loading - ${type}`
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
      emissive: new THREE.Color(0x000000), // Ensure emissive is always a Color
      normalScale: new THREE.Vector2(1, 1) // Ensure normalScale is always a Vector2
    });
    
    // Temporarily disable environment mapping to avoid uniform issues
    /*
    // Safely apply environment map if available
    try {
      if (scene.environment && scene.environment.isTexture) {
        // Additional validation for environment texture
        if (scene.environment.image && (scene.environment.image.width > 0 || scene.environment.image.length > 0)) {
          material.envMap = scene.environment;
          material.envMapIntensity = 0.8;
        } else {
          console.warn('Ocean: Environment texture appears invalid, not applying envMap');
        }
      }
    } catch (envError) {
      console.warn('Environment map assignment failed for ocean:', envError);
    }
    */
    
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
  const themes = ['home', 'garage', 'forge', 'contact', 'projects', 'cv'];
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
    'garage': 'garage',
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
        // Only animate back down if this skillFlower is not marked to stay up
        if (hoveredDrawer.userData.gridIndex === undefined || !stayUpSkillFlowers.has(hoveredDrawer.userData.gridIndex)) {
          gsap.to(hoveredDrawer.position, {
            x: orig.x,
            y: orig.y, // Return to original Y position
            z: orig.z,
            duration: 0.3,
            ease: 'power2.out',
          });
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
                // Only animate back down if this skillFlower is not marked to stay up
                if (hoveredDrawer.userData.gridIndex === undefined || !stayUpSkillFlowers.has(hoveredDrawer.userData.gridIndex)) {
                  gsap.to(targetDrawer.position, {
                    x: orig.x,
                    y: orig.y, // Return to original Y position
                    z: orig.z,
                    duration: CONFIG.ANIMATION.DRAWER_HOVER_DURATION,
                    ease: CONFIG.ANIMATION.HOVER_EASE,
                  });
                }
                
                // Hide language flower when stopping hover on any skillFlower
                if (hoveredDrawer.userData.type.startsWith('skillFlower') && hoveredDrawer.userData.gridIndex !== undefined) {
                  hideLanguageFlower(hoveredDrawer.userData.gridIndex);
                  currentHoveredSkillFlowerIndex = null; // Reset tracking
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
                // Mark this skillFlower to stay up permanently
                if (gridIndex !== undefined) {
                  stayUpSkillFlowers.add(gridIndex);
                  
                  // Only animate up if it's not already in the up position
                  // Check if the flower is not already elevated (y position higher than original)
                  if (targetDrawer.position.y <= orig.y + 0.05) { // Small tolerance for floating point precision
                    gsap.to(targetDrawer.position, {
                      x: orig.x,
                      y: orig.y + 0.15, // Move up by 0.15 units
                      z: orig.z,
                      duration: CONFIG.ANIMATION.DRAWER_HOVER_DURATION,
                      ease: CONFIG.ANIMATION.HOVER_EASE,
                    });
                  }
                } else {
                  // Fallback if gridIndex is undefined
                  gsap.to(targetDrawer.position, {
                    x: orig.x,
                    y: orig.y + 0.15, // Move up by 0.15 units
                    z: orig.z,
                    duration: CONFIG.ANIMATION.DRAWER_HOVER_DURATION,
                    ease: CONFIG.ANIMATION.HOVER_EASE,
                  });
                }
              }
              
              // FIXED: Show corresponding language flower using grid index from any skillFlower component
              if (gridIndex !== undefined) {
                // Only trigger language flower if we're hovering a different skillFlower
                if (currentHoveredSkillFlowerIndex !== gridIndex) {
                  const skillFlowerInfo = getLanguageFlowerInfo(gridIndex);
                  console.log(`SkillFlower hover detected - Grid Index: ${gridIndex}, Type: ${foundDrawer.userData.type}, Expected: ${skillFlowerInfo?.displayName}`);
                  showLanguageFlower(gridIndex);
                  currentHoveredSkillFlowerIndex = gridIndex;
                }
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
              // Only animate back down if this skillFlower is not marked to stay up
              if (hoveredDrawer.userData.gridIndex === undefined || !stayUpSkillFlowers.has(hoveredDrawer.userData.gridIndex)) {
                gsap.to(hoveredDrawer.position, {
                  x: orig.x,
                  y: orig.y, // Return to original Y position
                  z: orig.z,
                  duration: 0.3,
                  ease: 'power2.out',
                });
              }
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
          } else if (object.userData.type === 'medical') {
            message = `<div>VivaTech Medical App - 3D Eye-Tracking Telemedicine</div>`;
          } else if (object.userData.type === 'forviaCAR') {
            message = `<div>FORVIA Car Project - Interactive Car Interior CES 2023</div>`;
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
            // Only animate back down if this skillFlower is not marked to stay up
            if (hoveredDrawer.userData.gridIndex === undefined || !stayUpSkillFlowers.has(hoveredDrawer.userData.gridIndex)) {
              gsap.to(targetDrawer.position, {
                x: orig.x,
                y: orig.y, // Return to original Y position
                z: orig.z,
                duration: 0.3,
                ease: 'power2.out',
              });
            }
            
            // Hide language flower when stopping hover on any skillFlower
            if (hoveredDrawer.userData.type.startsWith('skillFlower') && hoveredDrawer.userData.gridIndex !== undefined) {
              hideLanguageFlower(hoveredDrawer.userData.gridIndex);
              currentHoveredSkillFlowerIndex = null; // Reset tracking
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
        // Only animate back down if this skillFlower is not marked to stay up
        if (hoveredDrawer.userData.gridIndex === undefined || !stayUpSkillFlowers.has(hoveredDrawer.userData.gridIndex)) {
          gsap.to(hoveredDrawer.position, {
            x: orig.x,
            y: orig.y, // Return to original Y position
            z: orig.z,
            duration: 0.3,
            ease: 'power2.out',
          });
        }
        
        // Hide language flower when stopping hover on any skillFlower
        if (hoveredDrawer.userData.type.startsWith('skillFlower') && hoveredDrawer.userData.gridIndex !== undefined) {
          hideLanguageFlower(hoveredDrawer.userData.gridIndex);
          currentHoveredSkillFlowerIndex = null; // Reset tracking
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

// === Material Validation Utility ===
function validateSceneMaterials() {
  let invalidMaterials = 0;
  
  scene.traverse((child) => {
    if (child.isMesh && child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      
      materials.forEach((material, index) => {
        if (material) {
          try {
            // Check for common uniform issues
            if (material.envMap && !material.envMap.isTexture) {
              console.warn(`Invalid envMap on material ${index} of ${child.name || 'unnamed object'}`);
              material.envMap = null;
              invalidMaterials++;
            }
            
            // Ensure normal scale is a Vector2
            if (material.normalScale && !(material.normalScale instanceof THREE.Vector2)) {
              material.normalScale = new THREE.Vector2(1, 1);
              invalidMaterials++;
            }
            
            // Ensure emissive is a Color
            if (material.emissive && !(material.emissive instanceof THREE.Color)) {
              material.emissive = new THREE.Color(0x000000);
              invalidMaterials++;
            }

            // Check for invalid uniforms that might cause .value errors
            if (material.uniforms) {
              Object.keys(material.uniforms).forEach(uniformName => {
                const uniform = material.uniforms[uniformName];
                if (uniform && typeof uniform === 'object' && uniform.value === undefined) {
                  console.warn(`Invalid uniform ${uniformName} on material ${index} of ${child.name || 'unnamed object'}`);
                  // Don't delete, just ensure it has a valid value
                  uniform.value = 0; // Safe default for most uniform types
                  invalidMaterials++;
                }
              });
            }

            // Ensure proper material flags
            if (material.transparent === undefined) material.transparent = false;
            if (material.alphaTest === undefined) material.alphaTest = 0;
            if (material.side === undefined) material.side = THREE.FrontSide;
            
          } catch (validationError) {
            console.warn(`Material validation error on ${child.name || 'unnamed object'}:`, validationError);
            invalidMaterials++;
          }
        }
      });
    }
  });
  
  if (invalidMaterials > 0) {
    console.log(`Fixed ${invalidMaterials} invalid material properties`);
  }
}

// === Problematic Material Isolation ===
function isolateProblematicMaterials() {
  let isolatedCount = 0;
  const fallbackMaterial = new THREE.MeshBasicMaterial({ color: 0x808080, transparent: true, opacity: 0.5 });
  
  scene.traverse((child) => {
    if (child.isMesh && child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      
      materials.forEach((material, index) => {
        if (material) {
          try {
            // Test if material has problematic uniforms
            let hasProblematicUniforms = false;
            
            if (material.uniforms) {
              Object.keys(material.uniforms).forEach(uniformName => {
                const uniform = material.uniforms[uniformName];
                if (uniform && typeof uniform === 'object' && uniform.value === undefined) {
                  hasProblematicUniforms = true;
                }
              });
            }
            
            // If material has issues, temporarily replace it
            if (hasProblematicUniforms) {
              console.warn(`Isolating problematic material on ${child.name || 'unnamed object'}[${index}]`);
              
              if (Array.isArray(child.material)) {
                child.material[index] = fallbackMaterial;
              } else {
                child.material = fallbackMaterial;
              }
              
              isolatedCount++;
              
              // Mark the object for material restoration later
              child.userData.materialIsolated = true;
            }
          } catch (isolationError) {
            console.warn(`Material isolation error on ${child.name || 'unnamed object'}:`, isolationError);
            
            // As a last resort, use fallback material
            if (Array.isArray(child.material)) {
              child.material[index] = fallbackMaterial;
            } else {
              child.material = fallbackMaterial;
            }
            isolatedCount++;
            child.userData.materialIsolated = true;
          }
        }
      });
    }
  });
  
  if (isolatedCount > 0) {
    console.log(`Isolated ${isolatedCount} problematic materials with fallback materials`);
  }
}

// === GLB Material and Light Processing ===
function processGLBMaterials(gltf, sourceName = 'unknown') {
  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      // Enable shadow casting and receiving
      child.castShadow = true;
      child.receiveShadow = true;
      
      if (child.material) {
        // Ensure proper material properties for PBR rendering
        if (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial) {
          // Safely apply environment mapping
          try {
            if (scene.environment && scene.environment.isTexture) {
              child.material.envMap = scene.environment;
              child.material.envMapIntensity = 0.8;
            }
            
            // Improve material properties for better lighting response
            if (child.material.metalness === undefined) child.material.metalness = 0.1;
            if (child.material.roughness === undefined) child.material.roughness = 0.7;
            
            // Enable proper normal mapping with better scale
            if (child.material.normalMap) {
              child.material.normalScale = child.material.normalScale || new THREE.Vector2(1.2, 1.2);
            }
            
            // Add subtle emission for better visibility in dark areas
            if (!child.material.emissive) {
              child.material.emissive = new THREE.Color(0x000000);
            }
            
            // Update material
            child.material.needsUpdate = true;
          } catch (materialError) {
            console.warn(`Material processing error for ${sourceName}:`, materialError);
          }
        }
        
        // Handle multiple materials (arrays)
        if (Array.isArray(child.material)) {
          child.material.forEach((mat, index) => {
            if (mat && (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial)) {
              try {
                if (scene.environment && scene.environment.isTexture) {
                  mat.envMap = scene.environment;
                  mat.envMapIntensity = 0.8;
                }
                if (mat.metalness === undefined) mat.metalness = 0.1;
                if (mat.roughness === undefined) mat.roughness = 0.7;
                if (mat.normalMap) {
                  mat.normalScale = mat.normalScale || new THREE.Vector2(1.2, 1.2);
                }
                if (!mat.emissive) {
                  mat.emissive = new THREE.Color(0x000000);
                }
                mat.needsUpdate = true;
              } catch (materialError) {
                console.warn(`Material array processing error for ${sourceName}[${index}]:`, materialError);
              }
            }
          });
        }
      }
    }
    
    // Process cameras imported from GLB files
    if (child.isCamera) {
      console.log('Found embedded camera:', child.name || 'unnamed', 'in', sourceName);
      
      // Register the camera for position editing
      if (cameraEditor) {
        cameraEditor.registerEmbeddedCamera(child, sourceName);
      }
    }
    
    // Process lights imported from GLB files
    if (child.isLight) {
      console.log('Found imported light:', child.type, 'with intensity:', child.intensity);
      
      // Register the light for management
      ImportedLightManager.registerLight(child, sourceName);
      
      // Handle SpotLight specifically
      if (child.type === 'SpotLight') {
        // Reduce intensity to prevent overwhelming brightness
        const originalIntensity = child.intensity;
        child.intensity = Math.min(originalIntensity * 0.3, 2.0); // Reduce to 30% of original, max 2.0
        
        // Configure shadow settings for better quality and prevent light bleeding
        child.castShadow = true;
        child.shadow.mapSize.width = 1024;
        child.shadow.mapSize.height = 1024;
        child.shadow.camera.near = 0.1;
        child.shadow.camera.far = Math.min(child.distance || 50, 30); // Limit shadow distance
        child.shadow.bias = -0.0005; // Prevent shadow acne
        child.shadow.normalBias = 0.02; // Prevent peter panning
        
        // Limit the spotlight angle to prevent excessive spread
        if (child.angle > Math.PI / 3) { // If angle > 60 degrees
          child.angle = Math.PI / 4; // Limit to 45 degrees
        }
        
        // Set penumbra for softer light edges (prevents harsh cutoffs)
        child.penumbra = Math.max(child.penumbra || 0, 0.2); // Min 20% penumbra
        
        // Limit distance to prevent light bleeding through walls
        if (child.distance === 0 || child.distance > 20) {
          child.distance = 15; // Set reasonable max distance
        }
        
        // Add decay for more realistic falloff
        child.decay = Math.max(child.decay || 1, 1.5); // Ensure some decay
        
        console.log(`Adjusted SpotLight: intensity ${originalIntensity} -> ${child.intensity}, angle: ${(child.angle * 180 / Math.PI).toFixed(1)}°, distance: ${child.distance}`);
      }
      
      // Handle PointLight
      else if (child.type === 'PointLight') {
        const originalIntensity = child.intensity;
        child.intensity = Math.min(originalIntensity * 0.4, 3.0); // Reduce intensity
        
        // Configure shadows
        child.castShadow = true;
        child.shadow.mapSize.width = 512;
        child.shadow.mapSize.height = 512;
        child.shadow.camera.near = 0.1;
        child.shadow.camera.far = Math.min(child.distance || 30, 20);
        child.shadow.bias = -0.0005;
        
        // Limit distance
        if (child.distance === 0 || child.distance > 25) {
          child.distance = 20;
        }
        
        child.decay = Math.max(child.decay || 1, 1.2);
        
        console.log(`Adjusted PointLight: intensity ${originalIntensity} -> ${child.intensity}, distance: ${child.distance}`);
      }
      
      // Handle DirectionalLight
      else if (child.type === 'DirectionalLight') {
        const originalIntensity = child.intensity;
        child.intensity = Math.min(originalIntensity * 0.5, 2.0);
        
        // Configure shadows with smaller area to prevent conflicts
        child.castShadow = true;
        child.shadow.mapSize.width = 1024;
        child.shadow.mapSize.height = 1024;
        child.shadow.camera.near = 0.5;
        child.shadow.camera.far = 50;
        child.shadow.camera.left = -10;
        child.shadow.camera.right = 10;
        child.shadow.camera.top = 10;
        child.shadow.camera.bottom = -10;
        child.shadow.bias = -0.0001;
        child.shadow.normalBias = 0.02;
        
        console.log(`Adjusted DirectionalLight: intensity ${originalIntensity} -> ${child.intensity}`);
      }
      
      // For any other light types, just reduce intensity
      else if (child.intensity !== undefined) {
        const originalIntensity = child.intensity;
        child.intensity = Math.min(originalIntensity * 0.4, 2.0);
        console.log(`Adjusted ${child.type}: intensity ${originalIntensity} -> ${child.intensity}`);
      }
    }
  });
}

// === Light Management Utilities ===
class ImportedLightManager {
  static importedLights = new Set();
  
  // Register an imported light for management
  static registerLight(light, source = 'unknown') {
    this.importedLights.add(light);
    light.userData.source = source;
    light.userData.originalIntensity = light.intensity;
    console.log(`Registered imported ${light.type} from ${source}`);
  }
  
  // Adjust all imported lights intensity
  static adjustAllLights(intensityMultiplier = 0.3) {
    this.importedLights.forEach(light => {
      if (light.userData.originalIntensity !== undefined) {
        light.intensity = light.userData.originalIntensity * intensityMultiplier;
      }
    });
    console.log(`Adjusted ${this.importedLights.size} imported lights by factor ${intensityMultiplier}`);
  }
  
  // Toggle all imported lights
  static toggleAllLights(enabled = true) {
    this.importedLights.forEach(light => {
      light.visible = enabled;
    });
    console.log(`${enabled ? 'Enabled' : 'Disabled'} ${this.importedLights.size} imported lights`);
  }
  
  // Get all lights of a specific type
  static getLightsByType(type) {
    return Array.from(this.importedLights).filter(light => light.type === type);
  }
  
  // Remove a light from management
  static unregisterLight(light) {
    this.importedLights.delete(light);
  }
  
  // Debug: List all imported lights
  static debugLights() {
    console.log('=== Imported Lights Debug ===');
    this.importedLights.forEach((light, index) => {
      console.log(`${index + 1}. ${light.type} from ${light.userData.source || 'unknown'}`);
      console.log(`   - Intensity: ${light.intensity} (original: ${light.userData.originalIntensity})`);
      console.log(`   - Position: (${light.position.x.toFixed(2)}, ${light.position.y.toFixed(2)}, ${light.position.z.toFixed(2)})`);
      if (light.type === 'SpotLight') {
        console.log(`   - Angle: ${(light.angle * 180 / Math.PI).toFixed(1)}°, Distance: ${light.distance}`);
      }
      console.log(`   - Shadows: ${light.castShadow}, Visible: ${light.visible}`);
    });
    console.log('=============================');
  }
}

// Make the light manager available globally for debugging
window.ImportedLightManager = ImportedLightManager;

// === Camera Position Editor System ===
class CameraPositionEditor {
  constructor() {
    this.isActive = false;
    this.currentTarget = null;
    this.embeddedCameras = new Map(); // Store cameras found in GLB files
    this.tempMarkers = new Set(); // Store temporary position markers
    this.originalCameraPosition = null;
    this.originalCameraTarget = null;
  }

  // Register a camera found in a GLB file
  registerEmbeddedCamera(camera, sourceName) {
    const key = `${sourceName}_${camera.name || 'camera'}`;
    this.embeddedCameras.set(key, {
      camera: camera,
      source: sourceName,
      position: camera.position.clone(),
      target: camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(-1).add(camera.position)
    });
    console.log(`Registered embedded camera: ${key} from ${sourceName}`);
  }

  // Toggle editor mode
  toggle() {
    this.isActive = !this.isActive;
    
    if (this.isActive) {
      this.activate();
    } else {
      this.deactivate();
    }
  }

  activate() {
    console.log('🎥 Camera Position Editor ACTIVATED');
    console.log('Controls:');
    console.log('- Z: Move forward (camera direction)');
    console.log('- S: Move backward');
    console.log('- Q: Move left');  
    console.log('- D: Move right');
    console.log('- A: Move up');
    console.log('- E: Move down');
    console.log('- Mouse: Look around (hold left button and drag)');
    console.log('- Click objects: Set look-at target');
    console.log('- P: Print current position');
    console.log('- M: Place marker at current position');
    console.log('- C: Clear all markers');
    console.log('- ESC: Exit editor');
    console.log('※ Works with both AZERTY and QWERTY layouts');

    // Store original camera state
    this.originalCameraPosition = camera.position.clone();
    this.originalCameraTarget = lookAtTarget ? { ...lookAtTarget } : { x: 0, y: 0, z: 0 };

    // Initialize camera rotation tracking
    this.cameraRotation = {
      x: camera.rotation.x,
      y: camera.rotation.y
    };

    // Set proper rotation order for camera
    camera.rotation.order = 'YXZ';

    // Disable cinematic mode and orbital controls
    cinematicMode = true; // Prevent other interactions
    
    // Create editor UI
    this.createEditorUI();
    
    // Add event listeners
    this.addEventListeners();

    // Show embedded cameras if any
    this.displayEmbeddedCameras();
  }

  deactivate() {
    console.log('🎥 Camera Position Editor DEACTIVATED');
    
    // Restore original camera state
    if (this.originalCameraPosition) {
      camera.position.copy(this.originalCameraPosition);
    }
    if (this.originalCameraTarget) {
      camera.lookAt(this.originalCameraTarget.x, this.originalCameraTarget.y, this.originalCameraTarget.z);
    }

    // Reset camera rotation tracking
    this.cameraRotation = null;

    // Re-enable normal interactions
    cinematicMode = false;
    
    // Remove editor UI
    this.removeEditorUI();
    
    // Remove event listeners
    this.removeEventListeners();

    // Clear temporary markers
    this.clearMarkers();
  }

  createEditorUI() {
    // Create editor panel
    const panel = document.createElement('div');
    panel.id = 'camera-editor-panel';
    panel.style.cssText = `
      position: fixed; top: 20px; left: 20px; z-index: 10000;
      background: rgba(0,0,0,0.9); color: white; padding: 20px;
      border-radius: 12px; font-family: monospace; font-size: 12px;
      min-width: 300px; max-height: 80vh; overflow-y: auto;
      border: 2px solid #00ff00; box-shadow: 0 0 20px rgba(0,255,0,0.3);
    `;

    panel.innerHTML = `
      <div style="color: #00ff00; font-weight: bold; margin-bottom: 15px;">
        🎥 CAMERA POSITION EDITOR
      </div>
      
      <div id="camera-position-display" style="margin-bottom: 15px; padding: 10px; background: rgba(0,255,0,0.1); border-radius: 6px;">
        <div>Position: <span id="pos-display">0, 0, 0</span></div>
        <div>Looking at: <span id="target-display">0, 0, 0</span></div>
      </div>

      <div style="margin-bottom: 15px;">
        <button id="print-position" style="background: #333; color: white; border: 1px solid #666; padding: 5px 10px; margin: 2px; cursor: pointer; border-radius: 4px;">Print Position (P)</button>
        <button id="place-marker" style="background: #333; color: white; border: 1px solid #666; padding: 5px 10px; margin: 2px; cursor: pointer; border-radius: 4px;">Place Marker (M)</button>
        <button id="clear-markers" style="background: #333; color: white; border: 1px solid #666; padding: 5px 10px; margin: 2px; cursor: pointer; border-radius: 4px;">Clear Markers (C)</button>
        <button id="export-positions" style="background: #0066cc; color: white; border: 1px solid #0088ff; padding: 5px 10px; margin: 2px; cursor: pointer; border-radius: 4px;">Export Code</button>
      </div>

      <div id="embedded-cameras" style="margin-bottom: 15px;">
        <div style="color: #ffaa00; font-weight: bold;">Embedded Cameras:</div>
        <div id="embedded-cameras-list" style="margin-top: 5px;"></div>
      </div>

      <div id="markers-list" style="margin-bottom: 15px;">
        <div style="color: #ff6600; font-weight: bold;">Placed Markers:</div>
        <div id="markers-content" style="margin-top: 5px;"></div>
      </div>

      <div style="color: #888; font-size: 10px; line-height: 1.4;">
        <strong>Controls:</strong><br>
        Physical Keys (works with any layout):<br>
        Top row left/right: Move forward/back<br>
        Bottom row left/right: Move left/right<br>
        Corner keys: Move up/down<br>
        Mouse drag: Look around<br>
        Click: Set target<br>
        P/M/C/ESC: Print/Mark/Clear/Exit
      </div>
    `;

    document.body.appendChild(panel);

    // Add button event listeners
    document.getElementById('print-position').onclick = () => this.printCurrentPosition();
    document.getElementById('place-marker').onclick = () => this.placeMarker();
    document.getElementById('clear-markers').onclick = () => this.clearMarkers();
    document.getElementById('export-positions').onclick = () => this.exportPositions();

    // Start position update loop
    this.updatePositionDisplay();
  }

  removeEditorUI() {
    const panel = document.getElementById('camera-editor-panel');
    if (panel) panel.remove();
  }

  addEventListeners() {
    this.keydownHandler = (event) => this.handleKeyDown(event);
    this.mousemoveHandler = (event) => this.handleMouseMove(event);
    this.clickHandler = (event) => this.handleClick(event);

    document.addEventListener('keydown', this.keydownHandler);
    document.addEventListener('mousemove', this.mousemoveHandler);
    document.addEventListener('click', this.clickHandler);

    // Disable right-click context menu during editing
    document.addEventListener('contextmenu', this.preventContext = (e) => e.preventDefault());
  }

  removeEventListeners() {
    if (this.keydownHandler) document.removeEventListener('keydown', this.keydownHandler);
    if (this.mousemoveHandler) document.removeEventListener('mousemove', this.mousemoveHandler);
    if (this.clickHandler) document.removeEventListener('click', this.clickHandler);
    if (this.preventContext) document.removeEventListener('contextmenu', this.preventContext);
  }

  handleKeyDown(event) {
    if (!this.isActive) return;

    const moveSpeed = event.shiftKey ? 0.2 : 0.05; // Much smaller movement steps
    const direction = new THREE.Vector3();
    const key = event.key.toLowerCase(); // Use actual character typed

    // Use character-based movement for universal AZERTY/QWERTY support
    switch(key) {
      case 'z': // Z = Forward (camera direction) - works on both layouts
        camera.getWorldDirection(direction);
        camera.position.add(direction.multiplyScalar(moveSpeed));
        break;
      case 's': // S = Backward (opposite camera direction)
        camera.getWorldDirection(direction);
        camera.position.add(direction.multiplyScalar(-moveSpeed));
        break;
      case 'q': // Q = Left (camera relative) - works on both layouts
        camera.getWorldDirection(direction);
        const leftVector = new THREE.Vector3().crossVectors(direction, camera.up).normalize();
        camera.position.add(leftVector.multiplyScalar(-moveSpeed));
        break;
      case 'd': // D = Right (camera relative)
        camera.getWorldDirection(direction);
        const rightVector = new THREE.Vector3().crossVectors(direction, camera.up).normalize();
        camera.position.add(rightVector.multiplyScalar(moveSpeed));
        break;
      case 'a': // A = Up (world space)
        camera.position.y += moveSpeed;
        break;
      case 'e': // E = Down (world space)
        camera.position.y -= moveSpeed;
        break;
      case 'p': // Print position
        this.printCurrentPosition(); 
        break;
      case 'm': // Place marker
        this.placeMarker(); 
        break;
      case 'c': // Clear markers
        this.clearMarkers(); 
        break;
      case 'escape': // Exit editor
        this.toggle(); 
        break;
    }
  }

  handleMouseMove(event) {
    if (!this.isActive) return;

    // Proper mouse look implementation
    if (event.buttons === 1) { // Left mouse button held
      const sensitivity = 0.002;
      const deltaX = event.movementX * sensitivity;
      const deltaY = event.movementY * sensitivity;

      // Store current rotation values
      if (!this.cameraRotation) {
        this.cameraRotation = {
          x: camera.rotation.x,
          y: camera.rotation.y
        };
      }

      // Update rotation values
      this.cameraRotation.y -= deltaX; // Horizontal rotation (left/right)
      this.cameraRotation.x -= deltaY; // Vertical rotation (up/down)
      
      // Clamp vertical rotation to prevent flipping
      this.cameraRotation.x = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, this.cameraRotation.x));

      // Apply rotation using Euler angles in the correct order
      camera.rotation.order = 'YXZ'; // Yaw, Pitch, Roll order
      camera.rotation.y = this.cameraRotation.y;
      camera.rotation.x = this.cameraRotation.x;
      camera.rotation.z = 0; // No roll
    }
  }

  handleClick(event) {
    if (!this.isActive) return;
    
    // Cast ray to find clicked object
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects([...hexObjects, ...drawers], true);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      this.currentTarget = point.clone();
      camera.lookAt(point);
      console.log(`🎯 Set look-at target: (${point.x.toFixed(3)}, ${point.y.toFixed(3)}, ${point.z.toFixed(3)})`);
    }
  }

  printCurrentPosition() {
    const pos = camera.position;
    
    // Calculate current look direction from camera rotation
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    const lookAt = {
      x: pos.x + direction.x,
      y: pos.y + direction.y,
      z: pos.z + direction.z
    };
    
    console.log('📍 CURRENT CAMERA POSITION:');
    console.log(`Position: { x: ${pos.x.toFixed(3)}, y: ${pos.y.toFixed(3)}, z: ${pos.z.toFixed(3)} }`);
    console.log(`LookAt: { x: ${lookAt.x.toFixed(3)}, y: ${lookAt.y.toFixed(3)}, z: ${lookAt.z.toFixed(3)} }`);
    console.log('Code format:');
    console.log(`cameraPos: { x: ${pos.x.toFixed(2)}, y: ${pos.y.toFixed(2)}, z: ${pos.z.toFixed(2)} },`);
    console.log(`lookAt: { x: ${lookAt.x.toFixed(2)}, y: ${lookAt.y.toFixed(2)}, z: ${lookAt.z.toFixed(2)} }`);
  }

  placeMarker() {
    const pos = camera.position.clone();
    
    // Calculate current look direction from camera rotation
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    const target = new THREE.Vector3(
      pos.x + direction.x * 5, // Project 5 units forward
      pos.y + direction.y * 5,
      pos.z + direction.z * 5
    );
    
    // Create visual marker
    const markerGeometry = new THREE.SphereGeometry(0.1, 8, 6);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(pos);
    
    // Add line to show look direction
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([pos, target]);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff00ff });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(line);
    marker.userData.line = line;
    
    marker.userData.position = pos.clone();
    marker.userData.target = target.clone();
    marker.userData.id = Date.now();
    
    scene.add(marker);
    this.tempMarkers.add(marker);
    
    console.log(`📌 Placed marker ${this.tempMarkers.size} at position (${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)})`);
    this.updateMarkersDisplay();
  }

  clearMarkers() {
    this.tempMarkers.forEach(marker => {
      scene.remove(marker);
      if (marker.userData.line) {
        scene.remove(marker.userData.line);
      }
    });
    this.tempMarkers.clear();
    console.log('🗑️ Cleared all markers');
    this.updateMarkersDisplay();
  }

  updatePositionDisplay() {
    if (!this.isActive) return;

    const pos = camera.position;
    
    // Calculate current look direction from camera rotation
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    const lookAt = {
      x: pos.x + direction.x,
      y: pos.y + direction.y,
      z: pos.z + direction.z
    };
    
    const posDisplay = document.getElementById('pos-display');
    const targetDisplay = document.getElementById('target-display');
    
    if (posDisplay) {
      posDisplay.textContent = `${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)}`;
    }
    if (targetDisplay) {
      targetDisplay.textContent = `${lookAt.x.toFixed(3)}, ${lookAt.y.toFixed(3)}, ${lookAt.z.toFixed(3)}`;
    }

    // Continue updating
    requestAnimationFrame(() => this.updatePositionDisplay());
  }

  updateMarkersDisplay() {
    const container = document.getElementById('markers-content');
    if (!container) return;

    if (this.tempMarkers.size === 0) {
      container.innerHTML = '<div style="color: #666;">No markers placed</div>';
      return;
    }

    let html = '';
    let index = 1;
    this.tempMarkers.forEach(marker => {
      const pos = marker.userData.position;
      const target = marker.userData.target;
      html += `
        <div style="margin: 5px 0; padding: 8px; background: rgba(255,0,255,0.1); border-radius: 4px; font-size: 10px;">
          <strong>Marker ${index}:</strong><br>
          Pos: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})<br>
          Target: (${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)})
        </div>
      `;
      index++;
    });
    container.innerHTML = html;
  }

  displayEmbeddedCameras() {
    const container = document.getElementById('embedded-cameras-list');
    if (!container) return;

    if (this.embeddedCameras.size === 0) {
      container.innerHTML = '<div style="color: #666;">No embedded cameras found</div>';
      return;
    }

    let html = '';
    this.embeddedCameras.forEach((camData, key) => {
      const pos = camData.position;
      const target = camData.target;
      html += `
        <div style="margin: 5px 0; padding: 8px; background: rgba(255,170,0,0.1); border-radius: 4px; font-size: 10px;">
          <strong>${key}:</strong><br>
          Pos: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})<br>
          Target: (${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)})<br>
          <button onclick="cameraEditor.jumpToEmbeddedCamera('${key}')" style="background: #666; color: white; border: none; padding: 2px 6px; margin-top: 4px; cursor: pointer; border-radius: 2px; font-size: 9px;">Jump to</button>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  jumpToEmbeddedCamera(key) {
    const camData = this.embeddedCameras.get(key);
    if (!camData) return;

    camera.position.copy(camData.position);
    camera.lookAt(camData.target);
    this.currentTarget = camData.target.clone();
    
    console.log(`🎥 Jumped to embedded camera: ${key}`);
  }

  exportPositions() {
    console.log('\n🎯 CAMERA POSITIONS EXPORT:');
    console.log('='.repeat(50));
    
    // Export embedded cameras
    if (this.embeddedCameras.size > 0) {
      console.log('\n// Embedded cameras found in GLB files:');
      this.embeddedCameras.forEach((camData, key) => {
        const pos = camData.position;
        const target = camData.target;
        console.log(`// ${key}:`);
        console.log(`{ x: ${pos.x.toFixed(2)}, y: ${pos.y.toFixed(2)}, z: ${pos.z.toFixed(2)} }, // Position`);
        console.log(`{ x: ${target.x.toFixed(2)}, y: ${target.y.toFixed(2)}, z: ${target.z.toFixed(2)} }, // LookAt`);
        console.log('');
      });
    }

    // Export placed markers
    if (this.tempMarkers.size > 0) {
      console.log('\n// Manually placed markers:');
      let index = 1;
      this.tempMarkers.forEach(marker => {
        const pos = marker.userData.position;
        const target = marker.userData.target;
        console.log(`// Marker ${index}:`);
        console.log(`cameraPos: { x: ${pos.x.toFixed(2)}, y: ${pos.y.toFixed(2)}, z: ${pos.z.toFixed(2)} },`);
        console.log(`lookAt: { x: ${target.x.toFixed(2)}, y: ${target.y.toFixed(2)}, z: ${target.z.toFixed(2)} },`);
        console.log('');
        index++;
      });
    }

    // Current position
    const currentPos = camera.position;
    const currentTarget = this.currentTarget || { x: 0, y: 0, z: 0 };
    console.log('\n// Current camera position:');
    console.log(`cameraPos: { x: ${currentPos.x.toFixed(2)}, y: ${currentPos.y.toFixed(2)}, z: ${currentPos.z.toFixed(2)} },`);
    console.log(`lookAt: { x: ${currentTarget.x.toFixed(2)}, y: ${currentTarget.y.toFixed(2)}, z: ${currentTarget.z.toFixed(2)} },`);
    
    console.log('='.repeat(50));
  }
}

// Create global camera editor instance
const cameraEditor = new CameraPositionEditor();
window.cameraEditor = cameraEditor;

// === Camera Position Utilities (Global Access) ===
window.cameraUtils = {
  // Quick access functions
  startEditor: () => cameraEditor.toggle(),
  printPosition: () => {
    console.log('📍 Current Camera Position:');
    console.log(`Position: { x: ${camera.position.x.toFixed(3)}, y: ${camera.position.y.toFixed(3)}, z: ${camera.position.z.toFixed(3)} }`);
    console.log(`Looking at: { x: ${lookAtTarget.x.toFixed(3)}, y: ${lookAtTarget.y.toFixed(3)}, z: ${lookAtTarget.z.toFixed(3)} }`);
  },
  
  // Move camera to specific position
  setPosition: (x, y, z, lookX = 0, lookY = 0, lookZ = 0) => {
    camera.position.set(x, y, z);
    camera.lookAt(lookX, lookY, lookZ);
    lookAtTarget = { x: lookX, y: lookY, z: lookZ };
    console.log(`📷 Camera moved to (${x}, ${y}, ${z}) looking at (${lookX}, ${lookY}, ${lookZ})`);
  },
  
  // Useful preset positions
  presets: {
    overview: () => window.cameraUtils.setPosition(0, 8, 12, 0, 0, 0),
    topDown: () => window.cameraUtils.setPosition(0, 15, 0, 0, 0, 0),
    closeUp: () => window.cameraUtils.setPosition(2, 2, 4, 0, 0, 0),
    sideView: () => window.cameraUtils.setPosition(10, 4, 0, 0, 0, 0)
  },
  
  // Help function
  help: () => {
    console.log('\n🎥 CAMERA UTILITIES HELP:');
    console.log('='.repeat(40));
    console.log('cameraUtils.startEditor()     - Open camera position editor');
    console.log('cameraUtils.printPosition()   - Print current camera position');
    console.log('cameraUtils.setPosition(x,y,z,lx,ly,lz) - Set camera position and target');
    console.log('cameraUtils.presets.overview() - Go to overview position');
    console.log('cameraUtils.presets.topDown()  - Go to top-down view');
    console.log('cameraUtils.presets.closeUp()  - Go to close-up view');
    console.log('cameraUtils.presets.sideView() - Go to side view');
    console.log('\n🎮 KEYBOARD SHORTCUTS:');
    console.log('Ctrl + E  - Toggle camera editor');
    console.log('Ctrl + L  - Debug lights');
    console.log('Ctrl + P  - Quick position print');
    console.log('='.repeat(40));
  }
};

// Show help on load (in development)
if (!isProduction) {
  console.log('\n🎥 Camera positioning system loaded!');
  console.log('Type "cameraUtils.help()" for available commands.');
  console.log('Press Ctrl + E to start the camera editor.');
}

// === Environment Texture Loading ===
const textureLoader = new THREE.TextureLoader();

// Register environment texture for loading tracking
incrementTotalAssets();

// Try multiple environment texture formats
const envTexturePaths = [
  './public/textures/env.jpg',
  './public/textures/env.png',
  './public/textures/env.hdr'
];

let envTextureLoaded = false;

function loadEnvironmentTexture(paths, index = 0) {
  if (index >= paths.length) {
    // All texture formats failed, create fallback
    console.warn('All environment textures failed, creating fallback');
    const fallbackTexture = createFallbackEnvironment();
    scene.background = fallbackTexture;
    scene.environment = fallbackTexture;
    markAssetLoaded();
    return;
  }
  
  ErrorHandler.handleAsyncError(
    new Promise((resolve, reject) => {
      textureLoader.load(
        paths[index],
        (texture) => {
          try {
            if (envTextureLoaded) return; // Prevent double loading
            envTextureLoaded = true;
            
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
            
            console.log(`Environment texture loaded successfully: ${paths[index]}`);
            markAssetLoaded();
            resolve(texture);
          } catch (error) {
            reject(error);
          }
        },
        undefined,
        (error) => {
          console.warn(`Failed to load ${paths[index]}, trying next format...`);
          reject(error);
        }
      );
    }),
    `Environment texture loading - ${paths[index]}`
  ).then((result) => {
    if (!result && !envTextureLoaded) {
      // Try next texture format
      loadEnvironmentTexture(paths, index + 1);
    }
  });
}

function createFallbackEnvironment() {
  // Create a simple gradient environment texture as fallback
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#87CEEB'); // Sky blue
  gradient.addColorStop(0.7, '#FFD4A3'); // Warm horizon
  gradient.addColorStop(1, '#8B4513'); // Ground brown
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  
  return texture;
}

// Start loading environment textures
loadEnvironmentTexture(envTexturePaths);

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
              processGLBMaterials(gltf, 'skillFlower.glb');
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
              processGLBMaterials(gltf, flowerData.model);
              const languageFlower = gltf.scene;
              
              // FIXED: Start hidden below ground at origin (will be positioned correctly when shown)
              languageFlower.position.set(0, -2, 0);
              languageFlower.scale.set(1, 1, 1);
              languageFlower.visible = false;
              
              // Enhanced userData with complete flower information - reset for fresh state
              languageFlower.userData = {
                type: flowerData.name,
                displayName: flowerData.displayName,
                category: flowerData.category,
                gridPosition: flowerData.gridPosition,
                gridIndex: index,
                isAnimating: false // Ensure fresh animation state
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
  
  // Enhanced checks to prevent duplicate animations
  if (!languageFlower || !skillFlower) {
    console.warn(`Cannot show language flower at index ${gridIndex}:`, {
      hasLanguageFlower: !!languageFlower,
      hasSkillFlower: !!skillFlower
    });
    return;
  }
  
  // If already active or currently animating, don't start another animation
  if (activeLanguageFlowers.has(gridIndex)) {
    console.log(`Language flower ${flowerInfo?.displayName} already active at grid ${gridIndex} - skipping duplicate show`);
    return;
  }
  
  // Check if there's already a running animation on this language flower
  if (languageFlower.userData && languageFlower.userData.isAnimating) {
    console.log(`Language flower ${flowerInfo?.displayName} currently animating at grid ${gridIndex} - skipping duplicate show`);
    return;
  }
  
  // Mark as active and animating immediately to prevent duplicates
  activeLanguageFlowers.add(gridIndex);
  stayUpLanguageFlowers.add(gridIndex); // Mark this language flower to stay up permanently
  languageFlower.visible = true;
  languageFlower.userData = languageFlower.userData || {};
  languageFlower.userData.isAnimating = true;
  
  // Kill any existing animations on this language flower to prevent conflicts
  gsap.killTweensOf(languageFlower.position);
  gsap.killTweensOf(languageFlower.rotation);
  
  // Clear any existing rotation animation tracking
  const existingRotation = languageFlowerRotations.get(gridIndex);
  if (existingRotation) {
    existingRotation.kill();
    languageFlowerRotations.delete(gridIndex);
  }
  
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
    ease: 'back.out(1.4)',
    onComplete: () => {
      // Clear the animating flag when animation completes
      if (languageFlower.userData) {
        languageFlower.userData.isAnimating = false;
      }
    }
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
  
  // Don't hide if marked to stay up permanently
  if (stayUpLanguageFlowers.has(gridIndex)) {
    console.log(`Language flower ${flowerInfo?.displayName || 'Unknown'} at grid ${gridIndex} marked to stay up - not hiding`);
    return;
  }
  
  console.log(`Hiding language flower: ${flowerInfo?.displayName || 'Unknown'} (${flowerInfo?.name || 'unknown'}) at grid position ${gridIndex}`);
  
  // Clear animation state immediately to prevent conflicts
  if (languageFlower.userData) {
    languageFlower.userData.isAnimating = false;
  }
  
  // Kill any running animations immediately
  gsap.killTweensOf(languageFlower.position);
  gsap.killTweensOf(languageFlower.rotation);
  
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
      // Clear any remaining animation flags
      if (languageFlower.userData) {
        languageFlower.userData.isAnimating = false;
      }
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
let lastErrorTime = 0;
let errorCount = 0;
let lastMaterialValidation = 0;
const MAX_ERRORS_PER_SECOND = 5;
const MATERIAL_VALIDATION_INTERVAL = 10; // seconds

function animate() {
  requestAnimationFrame(animate);
  
  try {
    const time = clock.getElapsedTime();

    // Validate materials periodically to prevent uniform errors
    if (time - lastMaterialValidation > MATERIAL_VALIDATION_INTERVAL) {
      validateSceneMaterials();
      lastMaterialValidation = time;
    }

    // Animate ocean waves if ocean data is available
    if (oceanVertData && oceanVertData.length > 0) {
      try {
        oceanVertData.forEach((vd, idx) => {
          if (vd && typeof vd.initH === 'number' && typeof vd.phase === 'number' && typeof vd.amplitude === 'number') {
            const y = vd.initH + Math.sin(time + vd.phase) * vd.amplitude;
            oceanGeometry.attributes.position.setY(idx, y);
          }
        });
        oceanGeometry.attributes.position.needsUpdate = true;
        oceanGeometry.computeVertexNormals();
      } catch (oceanError) {
        // Only log ocean errors occasionally to avoid spam
        if (time - lastErrorTime > 1) {
          console.warn('Ocean animation error:', oceanError);
          lastErrorTime = time;
        }
      }
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

    // Safe rendering with error handling
    try {
      renderer.render(scene, camera);
    } catch (renderError) {
      // Limit error reporting to prevent spam
      const currentTime = performance.now();
      if (currentTime - lastErrorTime > 1000) { // Only report once per second
        ErrorHandler.logError(renderError, 'Rendering');
        lastErrorTime = currentTime;
        errorCount = 0;
        
        // If it's a uniform/shader error, try to isolate and fix problematic materials
        if (renderError.message && renderError.message.includes('value')) {
          console.warn('Detected uniform value error, attempting material isolation...');
          isolateProblematicMaterials();
        }
      } else {
        errorCount++;
        if (errorCount > MAX_ERRORS_PER_SECOND) {
          // Too many errors, skip this frame
          return;
        }
      }
    }
  } catch (error) {
    // Only log animation loop errors occasionally to prevent console spam
    const currentTime = performance.now();
    if (currentTime - lastErrorTime > 1000) { // Only report once per second
      ErrorHandler.logError(error, 'Animation loop');
      lastErrorTime = currentTime;
      errorCount = 0;
    }
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
    
    // Reset medical modal state when going back to overview
    medicalModalClosed = false;
    medicalModalOpened = false;
    
    // Reset forviaCAR modal state when going back to overview
    forviaCarModalClosed = false;
    forviaCarModalOpened = false;
    
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
      
      // Reset medical modal state when navigating to different areas
      medicalModalClosed = false;
      medicalModalOpened = false;
      
      // Reset forviaCAR modal state when navigating to different areas
      forviaCarModalClosed = false;
      forviaCarModalOpened = false;
      
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
      
      // Handle objects that don't need camera movement (trashTruck, convoyeur, sensorSensei, medical, forviaCAR)
      if (object.userData.type === 'trashTruck' || object.userData.type === 'convoyeur' || object.userData.type === 'sensorSensei' || object.userData.type === 'medical' || object.userData.type === 'forviaCAR') {
        if (object.userData.type === 'trashTruck' && !trashModalClosed) {
          showTrashModal();
        }
        if (object.userData.type === 'convoyeur' && !convoyeurModalClosed) {
          showConvoyeurModal();
        }
        if (object.userData.type === 'sensorSensei' && !sensorSenseiModalClosed) {
          showSensorSenseiModal();
        }
        if (object.userData.type === 'medical' && !medicalModalClosed) {
          showMedicalModal();
        }
        if (object.userData.type === 'forviaCAR' && !forviaCarModalClosed) {
          showForviaCarModal();
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

// === Touch Event Handlers for Mobile Support ===
if (isTouchDevice) {
  // Touch start
  window.addEventListener('touchstart', (event) => {
    if (cinematicMode || isOrbiting) return;
    
    // Check if touch is on UI elements - don't interfere
    const loadingOverlay = document.getElementById('loadingOverlay');
    const navSidebar = document.getElementById('zoneNavSidebar');
    const toggleButton = document.getElementById('mobile-nav-toggle');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    
    // Allow loading overlay interactions
    if (loadingOverlay && !loadingOverlay.classList.contains('hidden')) {
      if (loadingOverlay.contains(event.target)) {
        return; // Let loading overlay handle its own touch events
      }
    }
    
    // Allow navigation interactions
    if ((navSidebar && navSidebar.contains(event.target)) || 
        (toggleButton && toggleButton.contains(event.target)) ||
        (mobileNavOverlay && mobileNavOverlay.contains(event.target))) {
      return; // Let navigation handle its own touch events
    }
    
    const touch = event.touches[0];
    touchStart.x = touch.clientX;
    touchStart.y = touch.clientY;
    touchMoved = false;
    
    // Only prevent default for 3D canvas interactions
    const canvasBounds = renderer.domElement.getBoundingClientRect();
    const isOnCanvas = touch.clientX >= canvasBounds.left && 
                      touch.clientX <= canvasBounds.right &&
                      touch.clientY >= canvasBounds.top && 
                      touch.clientY <= canvasBounds.bottom;
    
    if (isOnCanvas) {
      event.preventDefault();
    }
  }, { passive: false });
  
  // Touch move for orbital camera controls
  window.addEventListener('touchmove', (event) => {
    if (cinematicMode || event.touches.length !== 1) return;
    
    // Check if touch is on UI elements - don't interfere
    const loadingOverlay = document.getElementById('loadingOverlay');
    const navSidebar = document.getElementById('zoneNavSidebar');
    const toggleButton = document.getElementById('mobile-nav-toggle');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    
    // Allow loading overlay interactions
    if (loadingOverlay && !loadingOverlay.classList.contains('hidden')) {
      if (loadingOverlay.contains(event.target)) {
        return; // Let loading overlay handle its own touch events
      }
    }
    
    // Allow navigation interactions
    if ((navSidebar && navSidebar.contains(event.target)) || 
        (toggleButton && toggleButton.contains(event.target)) ||
        (mobileNavOverlay && mobileNavOverlay.contains(event.target))) {
      return; // Let navigation handle its own touch events
    }
    
    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    
    // Check if movement is significant enough to be considered a drag
    if (Math.abs(deltaX) > TAP_THRESHOLD || Math.abs(deltaY) > TAP_THRESHOLD) {
      touchMoved = true;
      
      // Orbital camera rotation (only horizontal for simplicity on mobile)
      if (currentActiveHexType === null) { // Only in orbital mode
        currentCameraAngle += deltaX * TOUCH_SENSITIVITY;
        
        const newCameraPos = {
          x: orbitCenter.x + orbitRadius * Math.cos(currentCameraAngle),
          y: orbitHeight,
          z: orbitCenter.z + orbitRadius * Math.sin(currentCameraAngle)
        };
        
        camera.position.set(newCameraPos.x, newCameraPos.y, newCameraPos.z);
        camera.lookAt(orbitCenter.x, orbitCenter.y, orbitCenter.z);
        
        touchStart.x = touch.clientX;
        touchStart.y = touch.clientY;
      }
    }
    
    // Only prevent default for 3D canvas interactions
    const canvasBounds = renderer.domElement.getBoundingClientRect();
    const isOnCanvas = touch.clientX >= canvasBounds.left && 
                      touch.clientX <= canvasBounds.right &&
                      touch.clientY >= canvasBounds.top && 
                      touch.clientY <= canvasBounds.bottom;
    
    if (isOnCanvas) {
      event.preventDefault();
    }
  }, { passive: false });
  
  // Touch end - handle tap
  window.addEventListener('touchend', (event) => {
    console.log('Touch end event triggered');
    console.log('cinematicMode:', cinematicMode);
    console.log('touchMoved:', touchMoved);
    console.log('event.target:', event.target);
    
    if (cinematicMode) return;
    
    // Check if touch is on UI elements - don't interfere
    const loadingOverlay = document.getElementById('loadingOverlay');
    const navSidebar = document.getElementById('zoneNavSidebar');
    const toggleButton = document.getElementById('mobile-nav-toggle');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    
    console.log('loadingOverlay exists:', !!loadingOverlay);
    console.log('loadingOverlay hidden:', loadingOverlay ? loadingOverlay.classList.contains('hidden') : 'n/a');
    
    // Allow loading overlay interactions
    if (loadingOverlay && !loadingOverlay.classList.contains('hidden')) {
      if (loadingOverlay.contains(event.target)) {
        console.log('Touch on loading overlay - letting it handle the event');
        return; // Let loading overlay handle its own touch events
      }
    }
    
    // Allow navigation interactions
    if ((navSidebar && navSidebar.contains(event.target)) || 
        (toggleButton && toggleButton.contains(event.target)) ||
        (mobileNavOverlay && mobileNavOverlay.contains(event.target))) {
      console.log('Touch on navigation - letting it handle the event');
      return; // Let navigation handle its own touch events
    }
    
    // If no significant movement, treat as tap
    if (!touchMoved) {
      const touch = event.changedTouches[0];
      const currentTime = Date.now();
      
      console.log('Processing tap - no movement detected');
      console.log('Touch coordinates:', touch.clientX, touch.clientY);
      
      // Only handle taps on the 3D canvas
      const canvasBounds = renderer.domElement.getBoundingClientRect();
      const isOnCanvas = touch.clientX >= canvasBounds.left && 
                        touch.clientX <= canvasBounds.right &&
                        touch.clientY >= canvasBounds.top && 
                        touch.clientY <= canvasBounds.bottom;
      
      console.log('Canvas bounds:', canvasBounds);
      console.log('Is on canvas:', isOnCanvas);
      
      if (isOnCanvas) {
        console.log('Calling handleInteraction for touch tap');
        
        // Add visual feedback for mobile touches
        const touchIndicator = document.createElement('div');
        touchIndicator.style.cssText = `
          position: fixed; top: ${touch.clientY - 10}px; left: ${touch.clientX - 10}px;
          width: 20px; height: 20px; border-radius: 50%;
          background: rgba(255, 0, 0, 0.7); pointer-events: none;
          z-index: 10000; animation: ping 0.5s ease-out forwards;
        `;
        document.body.appendChild(touchIndicator);
        setTimeout(() => touchIndicator.remove(), 500);
        
        // Call handleInteraction with separate coordinates
        handleInteraction(touch.clientX, touch.clientY);
        
        lastTouchTime = currentTime;
      }
    }
    
    touchMoved = false;
    // Only prevent default for 3D canvas interactions
    const touch = event.changedTouches[0];
    const canvasBounds = renderer.domElement.getBoundingClientRect();
    const isOnCanvas = touch.clientX >= canvasBounds.left && 
                      touch.clientX <= canvasBounds.right &&
                      touch.clientY >= canvasBounds.top && 
                      touch.clientY <= canvasBounds.bottom;
    
    if (isOnCanvas) {
      event.preventDefault();
    }
  }, { passive: false });
}

// === Shared Interaction Handler ===
function handleInteraction(event) {
  console.log('handleInteraction called with event:', event);
  
  // FIRST: Check global interactions disabled flag
  if (interactionsDisabled) {
    console.log('Interactions disabled - stopping');
    event.preventDefault();
    event.stopImmediatePropagation();
    return false;
  }
  
  // SECOND: Skip 3D interactions if loading overlay is visible
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay && !loadingOverlay.classList.contains('hidden')) {
    console.log('Loading overlay is visible - stopping 3D interactions');
    event.preventDefault();
    event.stopImmediatePropagation();
    return false;
  }
  
  // Skip interactions during cinematic mode or if currently orbiting
  if (cinematicMode || isOrbiting) {
    console.log('Cinematic mode or orbiting - stopping');
    return;
  }
  
  // Check if click is on the navigation sidebar
  const navSidebar = document.getElementById('zoneNavSidebar');
  if (navSidebar && navSidebar.contains(event.target)) {
    console.log('Event on navigation sidebar - stopping');
    return; // Don't process 3D canvas clicks if clicking on nav
  }

  const canvasBounds = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
  mouse.y = -((event.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;

  console.log('Mouse coordinates calculated:', mouse.x, mouse.y);

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects([...hexObjects, ...drawers], true);

  console.log('Raycaster intersects:', intersects.length);

  if (intersects.length > 0) {
    let object = intersects[0].object;
    while (object.parent && !hexObjects.includes(object) && !drawers.includes(object)) object = object.parent;

    console.log('Found object:', object.userData.type);

    // Animation caméra pour hexagones classiques
    if (object.userData.q !== undefined && object.userData.r !== undefined) {
      console.log('Hex object clicked:', object.userData.type);
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
      
      // Reset medical modal state when navigating to different areas
      medicalModalClosed = false;
      medicalModalOpened = false;
      
      // Reset forviaCAR modal state when navigating to different areas
      forviaCarModalClosed = false;
      forviaCarModalOpened = false;
      
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
      
      // Handle objects that don't need camera movement (trashTruck, convoyeur, sensorSensei, medical, forviaCAR)
      if (object.userData.type === 'trashTruck' || object.userData.type === 'convoyeur' || object.userData.type === 'sensorSensei' || object.userData.type === 'medical' || object.userData.type === 'forviaCAR') {
        if (object.userData.type === 'trashTruck' && !trashModalClosed) {
          showTrashModal();
        }
        if (object.userData.type === 'convoyeur' && !convoyeurModalClosed) {
          showConvoyeurModal();
        }
        if (object.userData.type === 'sensorSensei' && !sensorSenseiModalClosed) {
          showSensorSenseiModal();
        }
        if (object.userData.type === 'medical' && !medicalModalClosed) {
          showMedicalModal();
        }
        if (object.userData.type === 'forviaCAR' && !forviaCarModalClosed) {
          showForviaCarModal();
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
}

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

function showMedicalModal() {
  let existingModal = document.getElementById('medicalModal');
  if (existingModal) return; // Already open
  
  medicalModalOpened = true; // Mark that the modal was opened
  
  const { modal, content } = createModalBase('medicalModal', () => {
    medicalModalClosed = true; // Mark that user has closed the modal
    
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
  iframe.src = 'sidepages/medicalApp.html';
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    background: #fff;
  `;
  
  iframe.onerror = () => {
    content.innerHTML = '<div style="color: white; padding: 20px; text-align: center;">Error loading medical app project content</div>';
  };

  content.appendChild(iframe);
  document.body.appendChild(modal);
}

function showForviaCarModal() {
  let existingModal = document.getElementById('forviaCarModal');
  if (existingModal) return; // Already open
  
  forviaCarModalOpened = true; // Mark that the modal was opened
  
  const { modal, content } = createModalBase('forviaCarModal', () => {
    forviaCarModalClosed = true; // Mark that user has closed the modal
    
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
  iframe.src = 'sidepages/forviaCar.html';
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    background: #fff;
  `;
  
  iframe.onerror = () => {
    content.innerHTML = '<div style="color: white; padding: 20px; text-align: center;">Error loading FORVIA car project content</div>';
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
            processGLBMaterials(gltf, `${model}.glb`);
            const drawer = gltf.scene;
            drawer.scale.set(1, 1, 1);
            drawer.userData.type = model;
            
            // Position mail-box at contact hex location
            if (model === 'mail-box') {
              // Get contact hex position (q: 2, r: 2)
              const { x, z } = hexToWorld(2, 2);
              drawer.position.set(x, 0, z);
            }
            
            // Position steering at garage hex location
            if (model === 'steering') {
              // Get garage hex position (q: -1, r: 0)
              const { x, z } = hexToWorld(-1, 0);
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
            
            // Position medical at garage hex location
            if (model === 'medical') {
              // Get garage hex position (q: -1, r: 0)
              const { x, z } = hexToWorld(-1, 0);
              drawer.position.set(x, 0, z); // Position at exact garage hex center (0,0,0 relative)
            }
            
            // Position forviaCAR at garage hex location
            if (model === 'forviaCAR') {
              // Get garage hex position (q: -1, r: 0)
              const { x, z } = hexToWorld(-1, 0);
              drawer.position.set(x, 0, z); // Position at exact garage hex center (0,0,0 relative)
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
  { type: 'garage', label: 'Garage', themeId: 'garage' },
  { type: 'cv', label: 'CV', themeId: 'cv' },
  { type: 'projects', label: 'Projets', themeId: 'projects' },
  { type: 'contact', label: 'Contact', themeId: 'contact' },
  { type: 'forge2', label: 'Conception', themeId: 'forge' },
];

// === Mobile Navigation Toggle ===
function toggleMobileNavigation() {
  const navSidebar = document.getElementById('zoneNavSidebar');
  const overlay = document.getElementById('mobile-nav-overlay');
  
  if (!navSidebar) return;
  
  isNavigationOpen = !isNavigationOpen;
  
  if (isNavigationOpen) {
    // Open navigation
    navSidebar.style.transform = 'translateX(0)';
    if (overlay) overlay.style.display = 'block';
  } else {
    // Close navigation
    navSidebar.style.transform = 'translateX(-100%)';
    if (overlay) overlay.style.display = 'none';
  }
}

// === Create Mobile Navigation Toggle Button ===
function createMobileNavToggle() {
  if (!isMobileDevice) return;
  
  const toggleButton = document.createElement('button');
  toggleButton.id = 'mobile-nav-toggle';
  toggleButton.innerHTML = '☰';
  toggleButton.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    z-index: 400;
    background: rgba(20, 20, 30, 0.9);
    color: white;
    border: none;
    width: 50px;
    height: 50px;
    border-radius: 25px;
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    transition: all 0.3s ease;
    touch-action: manipulation;
  `;
  
  toggleButton.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMobileNavigation();
  });
  
  // Prevent 3D interactions
  toggleButton.addEventListener('touchstart', (e) => e.stopPropagation());
  toggleButton.addEventListener('touchmove', (e) => e.stopPropagation());
  toggleButton.addEventListener('touchend', (e) => e.stopPropagation());
  
  document.body.appendChild(toggleButton);
  
  // Create overlay for mobile navigation
  const overlay = document.createElement('div');
  overlay.id = 'mobile-nav-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    z-index: 299;
    display: none;
    touch-action: none;
  `;
  
  overlay.addEventListener('click', () => {
    toggleMobileNavigation();
  });
  
  document.body.appendChild(overlay);
  
  // Apply mobile-specific navigation styling if on mobile device
  if (isMobileDevice) {
    setTimeout(() => {
      const navSidebar = document.getElementById('zoneNavSidebar');
      if (navSidebar) {
        // Mobile-specific navigation styling  
        navSidebar.style.transform = 'translateX(-100%)';
        navSidebar.style.zIndex = '1000';
        
        // Make navigation items touch-friendly on mobile
        const navItems = navSidebar.querySelectorAll('div');
        navItems.forEach(item => {
          if (item.style.cursor === 'pointer') {
            item.style.minHeight = '44px'; // Touch target minimum
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.padding = '12px 20px';
            item.style.fontSize = '16px';
            item.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            
            // Enhanced touch feedback
            item.addEventListener('touchstart', () => {
              item.style.backgroundColor = 'rgba(255,255,255,0.1)';
            });
            item.addEventListener('touchend', () => {
              setTimeout(() => {
                item.style.backgroundColor = 'transparent';
              }, 150);
            });
          }
        });
      }
    }, 100); // Small delay to ensure navigation is created
  }
}

// Define drawer-to-theme mapping (already declared at top)

const navSidebar = document.createElement('nav');
navSidebar.id = 'zoneNavSidebar';

// Base styles for navigation
const baseNavStyles = {
  position: 'fixed',
  top: '0',
  left: '0',
  height: '100vh',
  background: 'rgba(20, 20, 30, 0.97)',
  color: '#fff',
  padding: '36px 0 24px 0',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  zIndex: '300',
  boxShadow: '2px 0 24px rgba(0,0,0,0.18)',
  fontSize: '1.1rem',
  fontWeight: 'bold',
  letterSpacing: '0.02em'
};

// Apply responsive styles
if (isMobileDevice) {
  // Mobile styles
  Object.assign(navSidebar.style, baseNavStyles);
  navSidebar.style.width = '280px'; // Wider for mobile touch targets
  navSidebar.style.transform = 'translateX(-100%)'; // Hidden by default
  navSidebar.style.transition = 'transform 0.3s ease';
  navSidebar.style.fontSize = '1.2rem'; // Larger text for mobile
  navSidebar.style.padding = '60px 0 24px 0'; // More top padding for toggle button
} else {
  // Desktop styles
  Object.assign(navSidebar.style, baseNavStyles);
  navSidebar.style.width = CONFIG.NAVIGATION.SIDEBAR_WIDTH + 'px';
}

navSidebar.innerHTML = `<div style="font-size:1.3rem;margin-bottom:18px;font-weight:bold;">${isMobileDevice ? 'Navigation' : 'Zones à explorer'}</div><ul id="zoneNavList" style="list-style:none;padding:0;margin:0;width:100%;"></ul>`;
document.body.appendChild(navSidebar);

// Empêche le raycast de passer à travers la nav bar
navSidebar.addEventListener('pointerdown', e => e.stopPropagation());
navSidebar.addEventListener('pointermove', e => e.stopPropagation());
navSidebar.addEventListener('pointerup', e => e.stopPropagation());
navSidebar.style.pointerEvents = 'auto';

// Position 3D canvas responsively
renderer.domElement.style.position = 'absolute';
if (isMobileDevice) {
  // Mobile: Full screen canvas, navigation slides over
  renderer.domElement.style.left = '0';
  renderer.domElement.style.top = '0';
  renderer.domElement.style.width = '100vw';
  renderer.domElement.style.height = '100vh';
} else {
  // Desktop: Canvas offset by navigation width
  renderer.domElement.style.left = CONFIG.NAVIGATION.SIDEBAR_WIDTH + 'px';
  renderer.domElement.style.top = '0';
  renderer.domElement.style.width = `calc(100vw - ${CONFIG.NAVIGATION.SIDEBAR_WIDTH}px)`;
  renderer.domElement.style.height = '100vh';
}

// Create mobile navigation toggle after sidebar is created
createMobileNavToggle();

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
    'garage': mainZones.filter(zone => zone.themeId === 'garage'),
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
              // Handle single material
              if (!Array.isArray(child.material)) {
                // Only modify materials that already have emissive properties
                if (child.material.emissive !== undefined) {
                  child.material.emissive = new THREE.Color(0x1a82f7);
                  child.material.emissiveIntensity = 0.7;
                }
              } else {
                // Handle material arrays
                child.material.forEach(mat => {
                  if (mat && mat.emissive !== undefined) {
                    mat.emissive = new THREE.Color(0x1a82f7);
                    mat.emissiveIntensity = 0.7;
                  }
                });
              }
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
            if (child.isMesh && child.material) {
              // Handle single material
              if (!Array.isArray(child.material)) {
                if (child.material.emissive !== undefined) {
                  child.material.emissive.setRGB(0,0,0);
                  child.material.emissiveIntensity = 0;
                }
              } else {
                // Handle material arrays
                child.material.forEach(mat => {
                  if (mat && mat.emissive !== undefined) {
                    mat.emissive.setRGB(0,0,0);
                    mat.emissiveIntensity = 0;
                  }
                });
              }
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

// Also initialize badges after a short delay to ensure DOM is ready
setTimeout(() => {
  updateThemeUnreadBadges();
}, 1000);

// Expose navigation function to window for external access
window.navigateToZone = navigateToZone;


// === Responsive 3D Canvas: Only fill area right of nav bar ===
function resize3DView() {
  let width, height;
  
  if (isMobileDevice) {
    // Mobile: Full screen canvas
    width = window.innerWidth;
    height = window.innerHeight;
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100vw';
    renderer.domElement.style.height = '100vh';
  } else {
    // Desktop: Canvas offset by navigation width
    const navWidth = CONFIG.NAVIGATION.SIDEBAR_WIDTH;
    width = window.innerWidth - navWidth;
    height = window.innerHeight;
    renderer.domElement.style.left = navWidth + 'px';
    renderer.domElement.style.width = `calc(100vw - ${navWidth}px)`;
    renderer.domElement.style.height = '100vh';
  }
  
  renderer.setSize(width, height);
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

// === Debug Console Commands for Light Management ===
if (typeof window !== 'undefined') {
  // Debug functions available in browser console
  window.debugLights = () => ImportedLightManager.debugLights();
  window.adjustLightIntensity = (multiplier) => ImportedLightManager.adjustAllLights(multiplier);
  window.toggleImportedLights = (enabled) => ImportedLightManager.toggleAllLights(enabled);
  window.getSpotLights = () => ImportedLightManager.getLightsByType('SpotLight');
  window.getPointLights = () => ImportedLightManager.getLightsByType('PointLight');
  
  // Quick commands for common adjustments
  window.dimLights = () => {
    ImportedLightManager.adjustAllLights(0.1);
    console.log('Dimmed all imported lights to 10% intensity');
  };
  
  window.brightLights = () => {
    ImportedLightManager.adjustAllLights(0.8);
    console.log('Increased all imported lights to 80% intensity');
  };
  
  window.resetLights = () => {
    ImportedLightManager.adjustAllLights(0.3); // Back to default 30%
    console.log('Reset all imported lights to default 30% intensity');
  };

  // Specific spotlight controls
  window.adjustSpotLights = (intensity, angle, distance) => {
    const spotLights = ImportedLightManager.getLightsByType('SpotLight');
    spotLights.forEach(light => {
      if (intensity !== undefined) light.intensity = intensity;
      if (angle !== undefined) light.angle = angle * Math.PI / 180; // Convert degrees to radians
      if (distance !== undefined) light.distance = distance;
    });
    console.log(`Adjusted ${spotLights.length} spotlights - intensity: ${intensity}, angle: ${angle}°, distance: ${distance}`);
  };

  console.log(`
=== Portfolio Light Debug Commands ===
debugLights() - Show all imported lights info
adjustLightIntensity(0.5) - Adjust all lights intensity (0.5 = 50%)
toggleImportedLights(false) - Enable/disable all imported lights
dimLights() - Quickly dim all lights to 10%
brightLights() - Increase all lights to 80%
resetLights() - Reset to default 30%
adjustSpotLights(intensity, angle, distance) - Control spotlights specifically
getSpotLights() - Get all spotlight objects
====================================
  `);
}

// Update camera angle when cinematic animation completes
function updateCameraAngleFromPosition() {
  const deltaX = camera.position.x - orbitCenter.x;
  const deltaZ = camera.position.z - orbitCenter.z;
  currentCameraAngle = Math.atan2(deltaZ, deltaX);
}
