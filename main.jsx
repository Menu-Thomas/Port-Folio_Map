import ReactDOM from "react-dom/client";
import * as THREE from 'https://esm.sh/three@0.150.1';
import { GLTFLoader } from 'https://esm.sh/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://esm.sh/three@0.150.1/examples/jsm/controls/OrbitControls.js';
import CircularText from "./CircularText.jsx";

// === Scene Initialization ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10); // Adjusted position to zoom closer
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 4; // Reduced minimum distance for closer zoom
controls.maxDistance = 10; // Adjusted maximum distance
controls.enableZoom = false; // Disable zoom functionality

// === Lighting Setup ===
function setupLighting() {
  const pointLight = new THREE.PointLight(0xffffff, 0.9);
  pointLight.position.set(10, 15, 10);
  scene.add(pointLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.1);
  directionalLight.position.set(5, 10, 5);
  scene.add(directionalLight);
}
setupLighting();

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
  gradient.addColorStop(1, '#2F2727');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  const material = new THREE.MeshLambertMaterial({ map: texture });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = -0.25;
  scene.add(mesh);

  return { geometry, vertData };
}
const { geometry: oceanGeometry, vertData: oceanVertData } = createOcean();

// === Hex Map Setup ===
const hexMap = [
  { q: 0, r: 0, type: 'home' },
  { q: 1, r: 0, type: 'cv' },
  { q: 0, r: 1, type: 'projects' },
  { q: 2, r: 2, type: 'contact' },
  { q: 1, r: 2, type: 'bridge' },
  { q: -2, r: 0, type: 'plain1' },
  { q: -1, r: 2, type: 'plain1' },
  { q: 0, r: 2, type: 'plain1' },
  { q: -1, r: 1, type: 'plain1' },
  { q: -2, r: -1, type: 'plain1' },
  { q: 0, r: -1, type: 'champ1' },
  { q: -1, r: 0, type: 'champ2' },
  { q: 1, r: 1, type: 'forest1' },
  { q: 3, r: -1, type: 'forest2' },
  { q: 2, r: 0, type: 'forest3' },
  { q: 1, r: -1, type: 'forest1' },
  { q: 2, r: -1, type: 'forest1' },
  { q: 2, r: -2, type: 'forest2' },
  { q: 1, r: -2, type: 'marais2' },
  { q: 0, r: -2, type: 'marais' },
  { q: -1, r: -2, type: 'marais2' },
  { q: -1, r: -1, type: 'marais' },
  { q: -2, r: 2, type: 'desert1' },
  { q: -3, r: 2, type: 'desert2' },
  { q: -3, r: 1, type: 'desert1' },
  { q: -2, r: 1, type: 'desert2' },
];

const loader = new GLTFLoader();
const hexObjects = [];

hexMap.forEach(({ q, r, type }) => {
  const { x, z } = hexToWorld(q, r);
  loader.load(`./models/Hex-${type}.glb`, (gltf) => {
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

// === Raycasting Setup ===
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let INTERSECTED = null;

// === Sidebar and Page Management ===
const sidebar = document.createElement('div');
sidebar.id = 'sidebar';
sidebar.style.position = 'relative';
sidebar.style.width = '100%';
sidebar.style.height = 'auto';
sidebar.style.marginTop = '1em';
sidebar.style.padding = '0'; // Initially hidden
document.body.appendChild(sidebar);

// Add a container for all pages
const pagesContainer = document.createElement('div');
pagesContainer.id = 'pagesContainer';
pagesContainer.style.width = '100%';
pagesContainer.style.display = 'flex';
pagesContainer.style.flexDirection = 'column';
pagesContainer.style.gap = '2em';
pagesContainer.style.transition = 'all 0.5s ease-in-out';
document.body.appendChild(pagesContainer);

// Preload pages
async function preloadPages() {
  const pages = [
    { type: 'home', file: './sidepages/home.html' },
    { type: 'cv', file: './sidepages/cv.html' },
    { type: 'projects', file: './sidepages/projects.html' },
    { type: 'contact', file: './sidepages/contact.html' },
  ];

  for (const page of pages) {
    const contentHtml = await loadSidebarPage(page.file);
    const pageElement = document.createElement('div');
    pageElement.className = 'page';
    pageElement.style.padding = '2em';
    pageElement.style.borderRadius = '10px';
    pageElement.style.opacity = '1';
    pageElement.style.transform = 'translateY(0)';
    pageElement.innerHTML = contentHtml;
    pagesContainer.appendChild(pageElement);
  }
}

// Call preloadPages to display all pages by default
preloadPages();

// Adjust scrolling behavior
document.body.style.overflowY = 'auto';
document.body.style.display = 'flex';
document.body.style.flexDirection = 'column';
document.body.style.alignItems = 'center';
document.body.style.gap = '1em';
document.body.style.margin = "0"; // Remove any margin from the body
document.body.style.padding = "0"; // Remove any padding from the body
document.body.style.overflowY = "scroll"; // Enable vertical scrolling
document.body.style.width = "100%"; // Ensure the body takes the full width
document.body.style.height = "100%"; // Ensure the body takes the full height
document.body.style.scrollBehavior = "smooth"; // Enable smooth scrolling
document.body.style.msOverflowStyle = "none"; // IE/Edge
document.body.style.scrollbarWidth = "none"; // Firefox
document.body.style.overflow = "hidden"; // Hide scrollbar visually
document.body.style.overflowY = "auto"; // Re-enable scrolling

renderer.domElement.style.position = "absolute"; // Ensure canvas is absolutely positioned
renderer.domElement.style.top = "0"; // Align canvas to the very top
renderer.domElement.style.left = "0"; // Align canvas to the very left
renderer.domElement.style.width = "100%"; // Ensure canvas takes the full width
renderer.domElement.style.height = "100%"; // Ensure canvas takes the full height
renderer.domElement.style.zIndex = "-1"; // Ensure it stays in the background

pagesContainer.style.position = "relative"; // Ensure pages are positioned relative to avoid overlap
pagesContainer.style.zIndex = "1"; // Ensure pages are above the canvas
pagesContainer.style.marginTop = "100vh"; // Push the pages below the "island" element

// Utility to load HTML from file
async function loadSidebarPage(filename) {
  const res = await fetch(filename);
  return await res.text();
}


window.addEventListener('click', async () => {
  if (INTERSECTED) {
    let type = INTERSECTED.userData?.type || INTERSECTED.name;

    // Skip click functionality for plain1 and bridge types
    if (type === 'plain1' || type === 'bridge') {
      return;
    }

    let html = '';
    if (type === 'contact') {
      html = await loadSidebarPage('./sidepages/contact.html');
    } else if (type === 'home') {
      html = await loadSidebarPage('./sidepages/home.html');
    } else if (type === 'cv') {
      html = await loadSidebarPage('./sidepages/cv.html');
    } else if (type === 'projects') {
      html = await loadSidebarPage('./sidepages/projects.html');
    } else {
      html = `<h2>${type ? type : 'Hexagone'}</h2><p>Page à venir...</p>`;
    }
    showPage(html);
  }
});

// Update mouse position on mouse move
window.addEventListener('mousemove', (event) => {
  const canvasBounds = renderer.domElement.getBoundingClientRect(); // Get canvas bounds
  mouse.x = ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
  mouse.y = -((event.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;
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

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(hexObjects, true);

  // Handle hover effects
  for (const hex of hexObjects) {
    // Skip hover animation for plain1 and bridge types
    if (hex.userData.type === 'plain1' || hex.userData.type === 'bridge') {
      hex.position.y = 0; // Ensure these hexes stay at y=0
      continue;
    }

    // On hover, move up slightly, otherwise reset to y=0
    if (INTERSECTED === hex) {
      hex.position.y = THREE.MathUtils.lerp(hex.position.y, 0.2, 0.08); // Subtle hover effect
    } else {
      hex.position.y = THREE.MathUtils.lerp(hex.position.y, 0, 0.08);
    }
  }

  if (intersects.length > 0) {
    let object = intersects[0].object;
    while (object.parent && !hexObjects.includes(object)) object = object.parent;

    // Skip interaction for plain1 and bridge types
    if (object.userData.type === 'plain1' || object.userData.type === 'bridge') {
      INTERSECTED = null;
    } else {
      INTERSECTED = object;
    }
  } else {
    INTERSECTED = null;
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

// Replace click functionality with scrolling to the corresponding page
window.addEventListener('click', () => {
  if (INTERSECTED) {
    const type = INTERSECTED.userData?.type || INTERSECTED.name;

    // Skip click functionality for plain1 and bridge types
    if (type === 'plain1' || type === 'bridge') {
      return;
    }

    // Scroll to the corresponding page
    const targetElement = document.getElementById(type);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    } else {
      console.warn(`No section found for hex type: ${type}`);
    }
  }
});

// === Resize Handler ===
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// === Background Setup ===
const textureLoader = new THREE.TextureLoader();
textureLoader.load('./textures/env.jpg', (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  scene.background = texture;
});

// === Particle Animation ===
const canvas2 = document.getElementById('bgCanvas');
const ctx2 = canvas2.getContext('2d');
let particles = [];
const particleCount = 300;

// Particle constructor
function Particle() {
  this.x = Math.random() * canvas2.width;
  this.y = canvas2.height + Math.random() * 300;
  this.speed = 1 + Math.random();
  this.radius = Math.random() * 3;
  this.opacity = (Math.random() * 100) / 1000;
}

// Initialize particles
for (let i = 0; i < particleCount; i++) {
  particles.push(new Particle());
}

// Animation loop
function loop() {
  requestAnimationFrame(loop);
  drawParticles();
}

// Draw particles
function drawParticles() {
  ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
  ctx2.globalCompositeOperation = 'lighter';
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    ctx2.beginPath();
    ctx2.fillStyle = `rgba(255,255,255,${p.opacity})`;
    ctx2.arc(p.x, p.y, p.radius, 0, Math.PI * 2, false);
    ctx2.fill();
    p.y -= p.speed;
    if (p.y <= -10) {
      particles[i] = new Particle();
    }
  }
}

// Start particle animation
loop();

// Resize handler to redraw the canvas
function resizeCanvas() {
  canvas2.width = window.innerWidth;
  canvas2.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Add circular text further down and to the right
const circularTextContainer = document.createElement("div");
circularTextContainer.id = "circularTextContainer";
circularTextContainer.style.position = "absolute"; // Use absolute positioning
circularTextContainer.style.top = "120px"; // Further down
circularTextContainer.style.left = "120px"; // Further to the right
circularTextContainer.style.transform = "translate(0, 0)"; // No centering needed
circularTextContainer.style.pointerEvents = "none"; // Ensure it doesn't block interactions
circularTextContainer.style.zIndex = "1"; // Ensure it appears above the canvas
renderer.domElement.parentElement.style.position = "relative"; // Ensure the canvas container is positioned relative
renderer.domElement.parentElement.appendChild(circularTextContainer);

const root = ReactDOM.createRoot(circularTextContainer);
root.render(
  <CircularText
    text="MENU*THOMAS*PORTFOLIO*"
    spinDuration={30}
    onHover="speedUp"
    className="small-circular-text" // Use updated styles
  />
);