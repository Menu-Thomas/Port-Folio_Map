import ReactDOM from "react-dom/client";
import * as THREE from 'https://esm.sh/three@0.150.1';
import { GLTFLoader } from 'https://esm.sh/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://esm.sh/three@0.150.1/examples/jsm/controls/OrbitControls.js'; // Use relative path for OrbitControls
import CircularText from "./CircularText.jsx";
import { gsap } from "gsap";

// === Scene Initialization ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

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

// Adjust hex map elements to be lower
hexMap.forEach(({ q, r, type }) => {
  const { x, z } = hexToWorld(q, r);
  loader.load(`./models/Hex-${type}.glb`, (gltf) => {
    const hex = gltf.scene;
    hex.position.set(x, -1, z); // Lowered y position to -1
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

window.addEventListener('mousemove', (event) => {
  const canvasBounds = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
  mouse.y = -((event.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;
});

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
  mesh.position.y = -1.25; // Lowered ocean position
  scene.add(mesh);

  return { geometry, vertData };
}
const { geometry: oceanGeometry, vertData: oceanVertData } = createOcean();

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

// === Background Setup ===
const textureLoader = new THREE.TextureLoader();
textureLoader.load('./textures/env.jpg', (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  scene.background = texture;
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
    if (hex.userData.type === 'plain1' || hex.userData.type === 'bridge') {
      hex.position.y = 0;
      continue;
    }

    if (INTERSECTED === hex) {
      hex.position.y = THREE.MathUtils.lerp(hex.position.y, 0.2, 0.08);
    } else {
      hex.position.y = THREE.MathUtils.lerp(hex.position.y, 0, 0.08);
    }
  }

  if (intersects.length > 0) {
    let object = intersects[0].object;
    while (object.parent && !hexObjects.includes(object)) object = object.parent;

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
// Target position for the camera
const targetPosition = { x: 0.45, y: 0.25, z: 0.14 };

// Add an event listener for the 'p' key
window.addEventListener('keydown', (event) => {
  if (event.key === 'p') {
    // Animate the camera position
    gsap.to(camera.position, {
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      duration: 2, // Duration of the animation in seconds
      ease: 'power3.inOut',
      onUpdate: () => {
        camera.lookAt(0, 2, 0);
      },
    });
  }
});

// === Helper Object ===
const helperGeometry = new THREE.SphereGeometry(0.1, 16, 16); // Small sphere
const helperMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const helper = new THREE.Mesh(helperGeometry, helperMaterial);
scene.add(helper);

// Set the helper's position
helper.position.set(0, 5, 0); // Replace with the desired coordinates

window.addEventListener('keydown', (event) => {
  const step = 0.05; // Movement step size
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