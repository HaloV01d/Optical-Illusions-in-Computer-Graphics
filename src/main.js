import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

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
const light = new THREE.DirectionalLight(0xffffff, 1); // Create a directional light with white color and intensity of 1
light.position.set(5, 10, 5); // Set the position of the light
light.castShadow = true; // Enable shadow casting for the light
scene.add(light); // Add the light to the scene

// Add an ambient light to the scene
scene.add(new THREE.AmbientLight(0xffffff, 0.3)); // Add an ambient light to the scene with white color and intensity of 0.3

// Create the chessboard
const boardSize = 5; // Define the size of the chessboard
const tileSize = 1; // Define the size of each square on the chessboard

const boardGroup = new THREE.Group(); // Create a group to hold the chessboard tiles

for (let x = 0; x < boardSize; x++) {
    for (let z = 0; z < boardSize; z++) {
        const color = (x + z) % 2 === 0 ? 0xaaaaaa : 0x555555; // Alternate colors for the chessboard tiles
        const geometry = new THREE.BoxGeometry(tileSize, 0.1, tileSize); // Create a box geometry for the tile
        const material = new THREE.MeshStandardMaterial({ color }); // Create a standard material with the specified color
        const tile = new THREE.Mesh(geometry, material); // Create a mesh from the geometry and material
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

    const intersects = raycaster.intersectObjects(boardGroup.children);

    if (intersects.length > 0) {
        const tile = intersects[0].object;
        if (Params.selectedTile.length < 2) {
            Params.selectedTile.push(tile);
            tile.material.color.set(params.tileColor); // Change the color of the intersected tile to the selected tile color
        }
        if (Params.selectedTile.length === 2) {
            compareTiles();
        }
    }
});

// Parameters for tile selection
function compareTiles() { 
    const [A, B] = params.selectedTiles; 
    console.log('Tile A color:', A.material.color); 
    console.log('Tile B color:', B.material.color); 
    alert('The selected tiles have been compared. Check the console for color details.'); 
    params.selectedTiles = []; 
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Create a cylinder to represent a chess piece on the board
const cylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 3, 32), // Create a cylinder geometry with top and bottom radius of 1, height of 3, and 32 radial segments
    new THREE.MeshStandardMaterial({ color: 0x7ea684 }) // Create a standard material with green color for the cylinder
);
cylinder.position.set(1, 1.5, -1); // Position the cylinder on the chessboard
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