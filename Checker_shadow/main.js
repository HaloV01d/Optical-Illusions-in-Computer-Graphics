
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(10, 10, 14);
camera.lookAt(0, 1, 0);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.SRGBEncoding;
renderer.setClearColor(0x222222);
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

// Shadows
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Create a render target (for reading RGB)
const rt = new THREE.WebGLRenderTarget(
  Math.floor(window.innerWidth * renderer.getPixelRatio()),
  Math.floor(window.innerHeight * renderer.getPixelRatio())
);

// Handle window resize
window.addEventListener("resize", () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

  // IMPORTANT: keep render target in sync
    rt.setSize(
    Math.floor(width * renderer.getPixelRatio()),
    Math.floor(height * renderer.getPixelRatio())
);
});

// Ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(ambientLight);

// Directional light with shadows
const DIRECTIONAL_LIGHT = new THREE.DirectionalLight(0xffffff, 1);
DIRECTIONAL_LIGHT.position.set(-6, 10, 6);
DIRECTIONAL_LIGHT.castShadow = true;

DIRECTIONAL_LIGHT.shadow.mapSize.width = 2048;
DIRECTIONAL_LIGHT.shadow.mapSize.height = 2048;

DIRECTIONAL_LIGHT.shadow.camera.near = 0.5;
DIRECTIONAL_LIGHT.shadow.camera.far = 50;
DIRECTIONAL_LIGHT.shadow.camera.left = -10;
DIRECTIONAL_LIGHT.shadow.camera.right = 10;
DIRECTIONAL_LIGHT.shadow.camera.top = 10;
DIRECTIONAL_LIGHT.shadow.camera.bottom = -10;

DIRECTIONAL_LIGHT.shadow.bias = -0.0003;
DIRECTIONAL_LIGHT.shadow.normalBias = 0.02;

scene.add(DIRECTIONAL_LIGHT);

// Function to create a checkerboard texture
function createCheckerboardTexture(size, squares) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d");
    const squareSize = size / squares;

    for (let y = 0; y < squares; y++) {
    for (let x = 0; x < squares; x++) {
        context.fillStyle = (x + y) % 2 === 0 ? "#cfcfcf" : "#3a3a3a";
      context.fillRect(x * squareSize, y * squareSize, squareSize, squareSize);
    }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    return texture;
}

// Create and add the checkerboard floor to the scene
const checkerTexture = createCheckerboardTexture(512, 8);
const floorGeometry = new THREE.PlaneGeometry(10, 10);
const floorMaterial = new THREE.MeshStandardMaterial({ map: checkerTexture });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
checkerTexture.colorSpace = THREE.SRGBColorSpace;
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Create and add the cylinder to the scene
const cylinderGeometry = new THREE.CylinderGeometry(1.2, 1.2, 5.0, 64);
const cylinderMaterial = new THREE.MeshStandardMaterial({
    color: 0x2e8b57,
    metalness: 0.05,
    roughness: 0.45,
});
const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
cylinder.position.set(0, 2.5, 0);
cylinder.castShadow = true;
cylinder.receiveShadow = false;
scene.add(cylinder);

// Orbit controls (guarded)
let controls;
try {
    if (THREE.OrbitControls) {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 1, 0);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.update();
    } else throw new Error('THREE.OrbitControls not found');
} catch (e) {
    console.warn('OrbitControls unavailable:', e);
    // Fallback stub so animate() can call controls.update()
    controls = { update: () => {} };
    if (typeof panel !== 'undefined' && panel) panel.textContent = 'OrbitControls not loaded; controls disabled.';
}

// Raycasting for mouse interaction
// IMPORTANT: Make sure your HTML has: <div id="rgbPanel"></div>
const panel = document.getElementById("rgbPanel");

// Raycaster and mouse vector
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Variables to store picked points
let pickedA = null;
let pickedB = null;

// Convert mouse position to NDC
function getMouseNDC(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    return {
    x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
    y: -(((event.clientY - rect.top) / rect.height) * 2 - 1),
    };
}

// Markers for picked points
const markerGeometry = new THREE.SphereGeometry(0.12, 24, 24);
const markerMaterialA = new THREE.MeshBasicMaterial({ color: 0xff3333 });
const markerMaterialB = new THREE.MeshBasicMaterial({ color: 0x33a1ff });

const markerA = new THREE.Mesh(markerGeometry, markerMaterialA);
const markerB = new THREE.Mesh(markerGeometry, markerMaterialB);

markerA.visible = false;
markerB.visible = false;

scene.add(markerA);
scene.add(markerB);

// Click to pick A then B
renderer.domElement.addEventListener("click", (event) => {
    const ndc = getMouseNDC(event);

  // IMPORTANT: actually update the mouse vector
    mouse.set(ndc.x, ndc.y);

    raycaster.setFromCamera(mouse, camera);

  // IMPORTANT: intersect the floor correctly
    const hits = raycaster.intersectObject(floor, false);
    if (hits.length === 0) return;

    const hitPoint = hits[0].point.clone();

  // Toggle: A then B then reset back to A
    if (!pickedA || (pickedA && pickedB)) {
    pickedA = { worldPos: hitPoint };
    pickedB = null;

    markerA.position.copy(hitPoint).add(new THREE.Vector3(0, 0.12, 0));
    markerA.visible = true;

    markerB.visible = false;

    if (panel) panel.textContent = "Picked A. Now click point B...";
    } else {
    pickedB = { worldPos: hitPoint };

    markerB.position.copy(hitPoint).add(new THREE.Vector3(0, 0.12, 0));
    markerB.visible = true;

    if (panel) panel.textContent = "Picked B. Reading RGB...";
    }
});

// Get checkerboard color from texture at given UV coordinates
function getCheckerboardColorAtUV(u, v) {
    const size = 512;
    const squares = 8;
    const squareSize = size / squares;
    
    // Normalize UV to checkerboard space
    u = u % 1;
    v = v % 1;
    if (u < 0) u += 1;
    if (v < 0) v += 1;
    
    const x = Math.floor((u * squares) % squares);
    const y = Math.floor((v * squares) % squares);
    
    // Determine color based on checkerboard pattern
    const isLight = (x + y) % 2 === 0;
    
    if (isLight) {
        return { r: 207, g: 207, b: 207 }; // #cfcfcf
    } else {
        return { r: 58, g: 58, b: 58 }; // #3a3a3a
    }
}

// Read the actual material color (not the rendered/lit color)
function readMaterialColor(worldPos) {
    // For floor geometry, convert world position to UV coordinates
    const geometry = floor.geometry;
    const material = floor.material;
    
    // World position relative to floor
    const localPos = worldPos.clone().sub(floor.position);
    
    // Assuming floor is 10x10 centered at origin
    const u = (localPos.x + 5) / 10;
    const v = (localPos.z + 5) / 10;
    
    return getCheckerboardColorAtUV(u, v);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    controls.update();

  // Render to offscreen target (for accurate pixel reads)
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);

  // Render to screen
    renderer.render(scene, camera);

  // If both points selected, display RGB
    if (pickedA && pickedB && panel) {
    const A = readMaterialColor(pickedA.worldPos);
    const B = readMaterialColor(pickedB.worldPos);

    panel.textContent =
`A RGB: (${A.r}, ${A.g}, ${A.b})
B RGB: (${B.r}, ${B.g}, ${B.b})

Tip: If A and B look different but RGB is the same,
that's the illusion effect! Your eyes are being fooled.`;
    }
}
animate();
