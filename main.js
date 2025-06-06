import * as THREE from 'https://esm.sh/three@0.150.1';
import { GLTFLoader } from 'https://esm.sh/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://esm.sh/three@0.150.1/examples/jsm/controls/OrbitControls.js';




// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 8, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 6; // plus proche = zoom max (augmente pour moins zoomer)
controls.maxDistance = 12; // plus loin = zoom min (diminue pour moins dézoomer)

// Lighting
const light = new THREE.PointLight(0xffffff, 0.9); // increased from 0.6
light.position.set(10, 15, 10);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.6)); // increased from 0.4
const dirLight = new THREE.DirectionalLight(0xffffff, 1.1); // increased from 0.8
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// Ocean background
const oceanGeometry = new THREE.PlaneGeometry(100, 100, 15, 15); // was 50, 50
oceanGeometry.rotateX(-Math.PI / 2);
const vertData = [], v3 = new THREE.Vector3();
for (let i = 0; i < oceanGeometry.attributes.position.count; i++) {
  v3.fromBufferAttribute(oceanGeometry.attributes.position, i);
  vertData.push({
    initH: v3.y,
    amplitude: THREE.MathUtils.randFloatSpread(2),
    phase: THREE.MathUtils.randFloat(0, Math.PI)
  });
}
const oceanMaterial = new THREE.MeshLambertMaterial({ color: '#446677' });
const oceanMesh = new THREE.Mesh(oceanGeometry, oceanMaterial);
oceanMesh.position.y = -0.25;
scene.add(oceanMesh);

// Axial hex coordinate to world
function hexToWorld(q, r, size = 1) {
  const x = size * Math.sqrt(3) * (q + r / 2);
  const z = size * 1.5 * r;
  return { x, z };
}

// Hex map (random example layout)
const hexMap = [
  { q: 0,  r: 0, type: 'home' },
  { q: 1,  r: 0, type: 'cv' },
  { q: 0,  r: 1, type: 'projects' },
  { q: -1, r: 1, type: 'champ1' },
  { q: -1, r: 0, type: 'champ2' },
  { q: -1, r: -1, type: 'forest1' },
  { q: 0,  r: -1, type: 'forest2' },
  { q: 1,  r: -1, type: 'marais' },
  { q: 2,  r: -1, type: 'contact' },
  { q: 2,  r: 0, type: 'desert1' },
  { q: 1,  r: 1, type: 'desert2' },
  { q: -2, r: 0, type: 'forest3' },
  { q: -2, r: 1, type: 'plain1' },
  { q: -2, r: 2, type: 'plain1' },
  { q: -1, r: 2, type: 'plain1' }
];

// Load hexes
const loader = new GLTFLoader();
const hexObjects = [];

hexMap.forEach(({ q, r, type }) => {
  const { x, z } = hexToWorld(q, r);
  loader.load(`./models/Hex-${type}.glb`, gltf => {
    const hex = gltf.scene;
    hex.position.set(x, 0, z);
    hex.scale.set(1, 1, 1);
    // Ajoute le type dans userData pour la détection du clic
    hex.userData.type = type;
    scene.add(hex);
    hexObjects.push(hex);
  });
});

// Raycasting
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let INTERSECTED = null;
let isDragging = false;
let dragStart = null;
let dragMoved = false; // NEW: track if mouse moved

window.addEventListener('mousemove', event => {
  // Calcule la position de la souris en tenant compte du décalage de la scène si la sidebar est ouverte
  let offsetX = event.clientX;
  let width = window.innerWidth;
  if (sidebar.style.display === 'block') {
    // La scène est à droite, donc on décale la souris
    offsetX = event.clientX - width / 2;
    width = width / 2;
    // Ignore les mouvements de souris sur la partie gauche (sidebar)
    if (event.clientX < window.innerWidth / 2) {
      mouse.x = 1000; // valeur hors champ pour désactiver le hover
      mouse.y = 1000;
      return;
    }
  }
  mouse.x = (offsetX / width) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('mousedown', (e) => {
  if (INTERSECTED) {
    isDragging = true;
    dragMoved = false; // reset
    dragStart = { x: e.clientX, y: e.clientY };
  }
});
window.addEventListener('mousemove', (e) => {
  if (isDragging && dragStart) {
    if (Math.abs(e.clientX - dragStart.x) > 5 || Math.abs(e.clientY - dragStart.y) > 5) {
      dragMoved = true;
    }
  }
});
window.addEventListener('mouseup', () => {
  dragStart = null;
  setTimeout(() => { isDragging = false; }, 10);
});

// Add a sidebar for page content
const sidebar = document.createElement('div');
sidebar.id = 'sidebar';
sidebar.style.position = 'fixed';
sidebar.style.top = '0';
sidebar.style.left = '0';
sidebar.style.width = '50vw';
sidebar.style.height = '100vh';
sidebar.style.background = 'rgba(30, 30, 40, 0.98)';
sidebar.style.color = '#fff';
sidebar.style.overflowY = 'auto';
sidebar.style.zIndex = '10';
sidebar.style.display = 'none';
sidebar.style.boxShadow = '2px 0 10px #0008';
sidebar.style.padding = '2em 2em 2em 2em';
document.body.appendChild(sidebar);

function showSidebar(contentHtml) {
  sidebar.innerHTML = `
    <button id="closeSidebar" style="position:absolute;top:1em;right:1.5em;font-size:2em;background:none;border:none;color:#fff;cursor:pointer;z-index:20;line-height:1;">&times;</button>
    <div style="margin-top:2.5em;">${contentHtml}</div>
  `;
  sidebar.style.display = 'block';
  document.getElementById('closeSidebar').onclick = () => {
    sidebar.style.display = 'none';
    updateSceneLayout();
  };
  updateSceneLayout();
}

// Utility to load HTML from file
async function loadSidebarPage(filename) {
  const res = await fetch(filename);
  return await res.text();
}

// Responsive: déplace la scène à droite si la sidebar est ouverte
function updateSceneLayout() {
  if (sidebar.style.display === 'block') {
    renderer.setSize(window.innerWidth / 2, window.innerHeight);
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.left = '50vw';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.width = '50vw';
    renderer.domElement.style.height = '100vh';
    camera.aspect = (window.innerWidth / 2) / window.innerHeight;
    camera.updateProjectionMatrix();
  } else {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = '';
    renderer.domElement.style.left = '';
    renderer.domElement.style.top = '';
    renderer.domElement.style.width = '100vw';
    renderer.domElement.style.height = '100vh';
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
}

window.addEventListener('click', async () => {
  if (INTERSECTED && (!isDragging || !dragMoved)) {
    let type = INTERSECTED.userData?.type || INTERSECTED.name;
    console.log('Clicked hex type:', type, 'name:', INTERSECTED.name, 'userData:', INTERSECTED.userData);
    let html = '';
    if (type === 'contact') {
      html = await loadSidebarPage('./sidepages/contact.html');
    } else if (type === 'home') {
      html = await loadSidebarPage('./sidepages/home.html');
    } else if (type === 'cv') {
      html = await loadSidebarPage('./sidepages/cv.html');
    } else if (type === 'projects') {
      html = await loadSidebarPage('./sidepages/projects.html');
    } else if (type === 'champ1' || type === 'champ2') {
      html = await loadSidebarPage('./sidepages/champs.html');
    } else if (type === 'forest1' || type === 'forest2' || type === 'forest3') {
      html = await loadSidebarPage('./sidepages/foret.html');
    } else if (type === 'marais' || type === 'marais2') {
      html = await loadSidebarPage('./sidepages/marais.html');
    } else if (type === 'desert1' || type === 'desert2') {
      html = await loadSidebarPage('./sidepages/desert.html');
    } else if (type === 'plain1') {
      html = await loadSidebarPage('./sidepages/plaine.html');
    } else {
      html = `<h2>${type ? type : 'Hexagone'}</h2><p>Page à venir...</p>`;
    }
    showSidebar(html);
  }
});

// Animation
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();

  vertData.forEach((vd, idx) => {
    const y = vd.initH + Math.sin(time + vd.phase) * vd.amplitude;
    oceanGeometry.attributes.position.setY(idx, y);
  });
  oceanGeometry.attributes.position.needsUpdate = true;
  oceanGeometry.computeVertexNormals();

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(hexObjects, true);

  for (const hex of hexObjects) {
    // On hover, move up, sinon revient à y=0
    if (INTERSECTED === hex) {
      hex.position.y = THREE.MathUtils.lerp(hex.position.y, 0.35, 0.08); // Lower and slower
    } else {
      hex.position.y = THREE.MathUtils.lerp(hex.position.y, 0, 0.08);
    }
  }

  if (intersects.length > 0) {
    let object = intersects[0].object;
    while (object.parent && !hexObjects.includes(object)) object = object.parent;
    INTERSECTED = object;
  } else {
    INTERSECTED = null;
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateSceneLayout();
});

// Equirectangular 360° background (JPG/PNG)
const textureLoader = new THREE.TextureLoader();
textureLoader.load('./textures/env.jpg', (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  scene.background = texture;
});

// Fix click/drag logic: open sidebar on mouseup if not dragging and on a hex
window.addEventListener('mouseup', async (e) => {
  if (INTERSECTED && !isDragging) {
    let type = INTERSECTED.userData?.type || INTERSECTED.name;
    console.log('Clicked hex type:', type, 'name:', INTERSECTED.name, 'userData:', INTERSECTED.userData);
    let html = '';
    if (type === 'contact') {
      html = await loadSidebarPage('./sidepages/contact.html');
    } else if (type === 'home') {
      html = await loadSidebarPage('./sidepages/home.html');
    } else if (type === 'cv') {
      html = await loadSidebarPage('./sidepages/cv.html');
    } else if (type === 'projects') {
      html = await loadSidebarPage('./sidepages/projects.html');
    } else if (type === 'champ1' || type === 'champ2') {
      html = await loadSidebarPage('./sidepages/champs.html');
    } else if (type === 'forest1' || type === 'forest2' || type === 'forest3') {
      html = await loadSidebarPage('./sidepages/foret.html');
    } else if (type === 'marais' || type === 'marais2') {
      html = await loadSidebarPage('./sidepages/marais.html');
    } else if (type === 'desert1' || type === 'desert2') {
      html = await loadSidebarPage('./sidepages/desert.html');
    } else if (type === 'plain1') {
      html = await loadSidebarPage('./sidepages/plaine.html');
    } else {
      html = `<h2>${type ? type : 'Hexagone'}</h2><p>Page à venir...</p>`;
    }
    showSidebar(html);
  }
  dragStart = null;
  setTimeout(() => { isDragging = false; }, 10);
});

// Close sidebar when clicking outside sidebar and not on a hex
window.addEventListener('mousedown', (e) => {
  // If sidebar is open
  if (sidebar.style.display === 'block') {
    // If click is on left half (sidebar), do nothing
    if (e.clientX < window.innerWidth / 2) return;
    // If click is on a hex, do nothing (let normal logic handle)
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(hexObjects, true);
    if (intersects.length > 0) return;
    // Otherwise, close sidebar
    sidebar.style.display = 'none';
    updateSceneLayout();
  }
});