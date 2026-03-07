import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Parameters and state
const params = {
    selectedTile: [],
    tileColor: new THREE.Color(0xff0000) // Red color for selected tiles
};

const selectionColors = [0x2563eb, 0xf97316];

function highlightTile(tile, selectionIndex) {
    if (!tile.userData.selectionOutline) {
        const outlineGeometry = new THREE.EdgesGeometry(tile.geometry);
        const outlineMaterial = new THREE.LineBasicMaterial({ color: selectionColors[selectionIndex] || selectionColors[0] });
        const outline = new THREE.LineSegments(outlineGeometry, outlineMaterial);
        outline.scale.setScalar(1.03);
        outline.visible = false;
        tile.add(outline);
        tile.userData.selectionOutline = outline;
    }

    tile.userData.selectionOutline.material.color.setHex(selectionColors[selectionIndex] || selectionColors[0]);
    tile.userData.selectionOutline.visible = true;
}

function clearTileHighlight(tile) {
    if (tile.userData.selectionOutline) {
        tile.userData.selectionOutline.visible = false;
    }
}

function clearSelectedTiles() {
    params.selectedTile.forEach(clearTileHighlight);
    params.selectedTile = [];
}

function getTileFromHitObject(object) {
    let current = object;
    while (current && current.parent && current.parent !== boardGroup) {
        current = current.parent;
    }
    return current && current.parent === boardGroup ? current : null;
}

// Create the scene, camera, and renderer
const scene = new THREE.Scene(); // Create a new scene
scene.background = new THREE.Color(0xffffff); // Set the background color to white

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100); // Create a perspective camera with a field of view of 45 degrees, aspect ratio based on the window size, and near/far clipping planes at 0.1 and 100 units
camera.position.set(5, 6, 8); // Set the camera position
camera.lookAt(0, 0, 0); // Make the camera look at the origin

const renderer = new THREE.WebGLRenderer({ antialias: true }); // Create a WebGL renderer with antialiasing enabled
renderer.setSize(window.innerWidth, window.innerHeight); // Set the size of the renderer to match the window size
renderer.shadowMap.enabled = true; // Enable shadow mapping in the renderer
document.body.appendChild(renderer.domElement); // Append the renderer's canvas element to the document body

// Add a directional light to the scene
const light = new THREE.DirectionalLight(0xffffff, 1.1); // Create a directional light with white color and intensity of 1.1
light.position.set(5, 5, -5); // Set the position of the light
light.castShadow = true; // Enable shadow casting for the light
light.shadow.radius = 6;
light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048;
scene.add(light); // Add the light to the scene

// Add an ambient light to the scene
scene.add(new THREE.AmbientLight(0xffffff, 0.35)); // Add an ambient light to the scene with white color and intensity of 0.35

// Lighting picker UI (HSL + intensity)
const lightHueInput = document.getElementById('lightHue');
const lightSatInput = document.getElementById('lightSat');
const lightLightInput = document.getElementById('lightLight');
const lightIntensityInput = document.getElementById('lightIntensity');
const lightHueValue = document.getElementById('lightHueValue');
const lightSatValue = document.getElementById('lightSatValue');
const lightLightValue = document.getElementById('lightLightValue');
const lightIntensityValue = document.getElementById('lightIntensityValue');
const shadowSoftnessInput = document.getElementById('shadowSoftness');
const shadowSoftnessValue = document.getElementById('shadowSoftnessValue');
const lightPreview = document.getElementById('lightPreview');
const lightHex = document.getElementById('lightHex');

function updateLightControlValues() {
    lightHueValue.textContent = lightHueInput.value;
    lightSatValue.textContent = `${lightSatInput.value}%`;
    lightLightValue.textContent = `${lightLightInput.value}%`;
    lightIntensityValue.textContent = Number(lightIntensityInput.value).toFixed(2);
    shadowSoftnessValue.textContent = shadowSoftnessInput.value;
}

function updateLightPreview(hsl) {
    const previewColor = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
    const { hex } = colorToRGB(previewColor);
    lightPreview.style.backgroundColor = hex;
    lightHex.textContent = hex;
}

function syncLightSlidersFromScene() {
    const hsl = { h: 0, s: 0, l: 0 };
    light.color.getHSL(hsl);
    lightHueInput.value = Math.round(hsl.h * 360);
    lightSatInput.value = Math.round(hsl.s * 100);
    lightLightInput.value = Math.round(hsl.l * 100);
    lightIntensityInput.value = light.intensity;
    shadowSoftnessInput.value = light.shadow.radius;
    updateLightControlValues();
    updateLightPreview(hsl);
}

function handleLightInput() {
    const h = Number(lightHueInput.value) / 360;
    const s = Number(lightSatInput.value) / 100;
    const l = Number(lightLightInput.value) / 100;
    light.color.setHSL(h, s, l);
    light.intensity = Number(lightIntensityInput.value);
    updateLightControlValues();
    updateLightPreview({ h, s, l });
}

lightHueInput.addEventListener('input', handleLightInput);
lightSatInput.addEventListener('input', handleLightInput);
lightLightInput.addEventListener('input', handleLightInput);
lightIntensityInput.addEventListener('input', handleLightInput);
shadowSoftnessInput.addEventListener('input', () => {
    light.shadow.radius = Number(shadowSoftnessInput.value);
    updateLightControlValues();
});


// Create the chessboard
const boardSize = 5; // Define the size of the chessboard
const tileSize = 1; // Define the size of each square on the chessboard

const boardGroup = new THREE.Group(); // Create a group to hold the chessboard tiles

for (let x = 0; x < boardSize; x++) {
    for (let z = 0; z < boardSize; z++) {
        const color = (x + z) % 2 === 0 ? 0xcecece : 0x787878; // Alternate colors for the chessboard tiles
        const geometry = new THREE.BoxGeometry(tileSize, 0.5, tileSize); // Create a box geometry for the tile
        const material = new THREE.MeshStandardMaterial({ color }); // Create a standard material with the specified color
        const tile = new THREE.Mesh(geometry, material); // Create a mesh from the geometry and material
        tile.userData.baseColor = new THREE.Color(color);
        tile.position.set(x * tileSize - (boardSize * tileSize) / 2 + tileSize / 2, -0.05, z * tileSize - (boardSize * tileSize) / 2 + tileSize / 2); // Position the tile on the chessboard
        tile.receiveShadow = true; // Enable shadow reception for the tile
        boardGroup.add(tile); // Add the tile to the chessboard group
    }
}
scene.add(boardGroup); // Add the chessboard group to the scene

// Set up raycaster and mouse vector for tile selection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    // Calculate mouse position in normalized device coordinates (-1 to +1) for both components
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(boardGroup.children, true);

    if (intersects.length > 0) {
        const tile = getTileFromHitObject(intersects[0].object);
        if (!tile) {
            return;
        }

        // Keep both selected tiles outlined until the next click, then start a new pair.
        if (params.selectedTile.length === 2) {
            clearSelectedTiles();
        }

        // Prevent selecting the same tile twice in one comparison.
        if (params.selectedTile.includes(tile)) {
            return;
        }

        if (params.selectedTile.length < 2) {
            params.selectedTile.push(tile);
            highlightTile(tile, params.selectedTile.length - 1);
        }
        if (params.selectedTile.length === 2) {
            compareTiles();
        }
    }
});

// Helper function to convert color to RGB string
function colorToRGB(color) {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    return { r, g, b, hex: '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0').toUpperCase()).join('') };
}

syncLightSlidersFromScene();

// Parameters for tile selection
function compareTiles() { 
    const [A, B] = params.selectedTile; 
    const colorA = colorToRGB(A.userData.baseColor || A.material.color);
    const colorB = colorToRGB(B.userData.baseColor || B.material.color);
    
    console.log('Tile A color:', colorA); 
    console.log('Tile B color:', colorB);
    
    // Display on screen
    const panel = document.getElementById('colorPanel');
    const output = document.getElementById('colorOutput');
    
    output.innerHTML = `
        <div class="color-display">
            <div class="color-label">Tile A</div>
            <div><span class="color-box" style="background-color: ${colorA.hex};"></span></div>
            <div>RGB: (${colorA.r}, ${colorA.g}, ${colorA.b})</div>
            <div>HEX: ${colorA.hex}</div>
        </div>
        <div class="color-display">
            <div class="color-label">Tile B</div>
            <div><span class="color-box" style="background-color: ${colorB.hex};"></span></div>
            <div>RGB: (${colorB.r}, ${colorB.g}, ${colorB.b})</div>
            <div>HEX: ${colorB.hex}</div>
        </div>
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.2);">
            <div style="font-size: 12px; color: #aaa;">Are they the same?</div>
            <div style="font-weight: bold; color: ${colorA.hex === colorB.hex ? '#4ade80' : '#f87171'};">
                ${colorA.hex === colorB.hex ? '✓ YES - Identical colors!' : '✗ NO - Different colors'}
            </div>
        </div>
    `;
    
    panel.classList.add('show');
}

// Handle window resize
window.addEventListener('resize', () => { 
    camera.aspect = window.innerWidth / window.innerHeight; // Update the camera's aspect ratio to match the new window size
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Create a cylinder to represent a chess piece on the board
const cylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 3, 32), // Create a cylinder geometry with top and bottom radius of 1, height of 3, and 32 radial segments
    new THREE.MeshStandardMaterial({ color: 0x8ab090 }) // Create a standard material with green color for the cylinder
);
cylinder.position.set(1.2, 1.5, -1.5); // Position the cylinder on the chessboard
cylinder.castShadow = true; // Enable shadow casting for the cylinder
scene.add(cylinder); // Add the cylinder to the scene

// Add orbit controls to allow camera movement
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Enable damping (inertia) for smoother camera movement

// Animation loop to render the scene continuously
function animate() {
    requestAnimationFrame(animate); // Request the next frame to be rendered
    controls.update(); // Update the orbit controls
    renderer.render(scene, camera); // Render the scene from the perspective of the camera
}

animate(); // Start the animation loop