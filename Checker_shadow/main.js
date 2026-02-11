const scene = new THREE.Scene();

const BOARD_SIZE = 10;
const BOARD_SQUARES = 5;
const BOARD_THICKNESS = 1.2;
const BOARD_TOP_Y = 0.6;

const LIGHT_SQUARE = { r: 206, g: 206, b: 206 };
const DARK_SQUARE = { r: 120, g: 120, b: 120 };
const CYLINDER_COLOR = 0x98b298;

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(10, 10, 14);
camera.lookAt(0, BOARD_TOP_Y, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.SRGBEncoding;
renderer.setClearColor(0xdedede);
renderer.domElement.style.display = "block";
document.body.appendChild(renderer.domElement);

renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const rt = new THREE.WebGLRenderTarget(
    Math.floor(window.innerWidth * renderer.getPixelRatio()),
    Math.floor(window.innerHeight * renderer.getPixelRatio())
);

window.addEventListener("resize", () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    rt.setSize(
        Math.floor(width * renderer.getPixelRatio()),
        Math.floor(height * renderer.getPixelRatio())
    );
});

const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambientLight);

// Row-gradient fill from last row (row 5, +Z) toward first row (row 1, -Z).
const rowFillLight = new THREE.DirectionalLight(0xffffff, 0.22);
rowFillLight.position.set(0, 4.5, 9);
rowFillLight.target.position.set(0, BOARD_TOP_Y, -4);
rowFillLight.castShadow = false;
scene.add(rowFillLight);
scene.add(rowFillLight.target);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.35);
directionalLight.position.set(9.2, 6.6, -8.2);
directionalLight.target.position.set(-4.2, BOARD_TOP_Y, 4.5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 4096;
directionalLight.shadow.mapSize.height = 4096;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -10;
directionalLight.shadow.camera.right = 10;
directionalLight.shadow.camera.top = 10;
directionalLight.shadow.camera.bottom = -10;
directionalLight.shadow.bias = -0.0003;
directionalLight.shadow.normalBias = 0.02;
if (directionalLight.shadow.radius !== undefined) directionalLight.shadow.radius = 7;
if (directionalLight.shadow.blurSamples !== undefined) directionalLight.shadow.blurSamples = 8;
scene.add(directionalLight);
scene.add(directionalLight.target);

function rgbString(c) {
    return `rgb(${c.r}, ${c.g}, ${c.b})`;
}

function getSquareCenter(row, col) {
    const squareSize = BOARD_SIZE / BOARD_SQUARES;
    return {
        x: -BOARD_SIZE / 2 + (col - 0.5) * squareSize,
        z: -BOARD_SIZE / 2 + (row - 0.5) * squareSize,
    };
}

function createCheckerboardTexture(size, squares) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    const squareSize = size / squares;

    for (let y = 0; y < squares; y++) {
        for (let x = 0; x < squares; x++) {
            const isLight = (x + y) % 2 === 0;
            context.fillStyle = isLight ? rgbString(LIGHT_SQUARE) : rgbString(DARK_SQUARE);
            context.fillRect(x * squareSize, y * squareSize, squareSize, squareSize);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    if (texture.encoding !== undefined) texture.encoding = THREE.sRGBEncoding;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function createEdgeStripTexture(edge) {
    const squarePx = 128;
    const canvas = document.createElement("canvas");
    canvas.width = BOARD_SQUARES * squarePx;
    canvas.height = squarePx;
    const context = canvas.getContext("2d");

    for (let i = 0; i < BOARD_SQUARES; i++) {
        let row;
        let col;
        if (edge === "front") {
            row = BOARD_SQUARES - 1;
            col = i;
        } else if (edge === "back") {
            row = 0;
            col = i;
        } else if (edge === "left") {
            row = i;
            col = 0;
        } else {
            row = i;
            col = BOARD_SQUARES - 1;
        }

        const isLight = (row + col) % 2 === 0;
        context.fillStyle = isLight ? rgbString(LIGHT_SQUARE) : rgbString(DARK_SQUARE);
        context.fillRect(i * squarePx, 0, squarePx, squarePx);
    }

    const texture = new THREE.CanvasTexture(canvas);
    if (texture.encoding !== undefined) texture.encoding = THREE.sRGBEncoding;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
}

const checkerTexture = createCheckerboardTexture(512, BOARD_SQUARES);
const floorGeometry = new THREE.PlaneGeometry(BOARD_SIZE, BOARD_SIZE);
const floorMaterial = new THREE.MeshBasicMaterial({ map: checkerTexture });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = BOARD_TOP_Y;
floor.receiveShadow = false;
scene.add(floor);

const boardSideFront = createEdgeStripTexture("front");
const boardSideBack = createEdgeStripTexture("back");
const boardSideLeft = createEdgeStripTexture("left");
const boardSideRight = createEdgeStripTexture("right");

const boardBody = new THREE.Mesh(
    new THREE.BoxGeometry(BOARD_SIZE, BOARD_THICKNESS, BOARD_SIZE),
    [
        new THREE.MeshStandardMaterial({ map: boardSideRight, roughness: 0.9, metalness: 0.0 }),
        new THREE.MeshStandardMaterial({ map: boardSideLeft, roughness: 0.9, metalness: 0.0 }),
        new THREE.MeshStandardMaterial({ color: 0xb8b8b8, roughness: 0.9, metalness: 0.0 }),
        new THREE.MeshStandardMaterial({ color: 0x9d9d9d, roughness: 0.95, metalness: 0.0 }),
        new THREE.MeshStandardMaterial({ map: boardSideFront, roughness: 0.9, metalness: 0.0 }),
        new THREE.MeshStandardMaterial({ map: boardSideBack, roughness: 0.9, metalness: 0.0 }),
    ]
);
boardBody.position.y = BOARD_TOP_Y - BOARD_THICKNESS / 2 - 0.01;
boardBody.receiveShadow = true;
scene.add(boardBody);

const shadowCatcher = new THREE.Mesh(
    floorGeometry.clone(),
    new THREE.ShadowMaterial({ opacity: 0.24 })
);
shadowCatcher.rotation.x = -Math.PI / 2;
shadowCatcher.position.y = BOARD_TOP_Y + 0.002;
shadowCatcher.receiveShadow = true;
shadowCatcher.renderOrder = 1;
shadowCatcher.material.depthWrite = false;
shadowCatcher.material.polygonOffset = true;
shadowCatcher.material.polygonOffsetFactor = -1;
shadowCatcher.material.polygonOffsetUnits = -2;
scene.add(shadowCatcher);

const cylinderGeometry = new THREE.CylinderGeometry(1.2, 1.2, 5.0, 64);
const cylinderMaterial = new THREE.MeshStandardMaterial({
    color: CYLINDER_COLOR,
    metalness: 0.02,
    roughness: 0.42,
});
const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
const cylinderCenter = getSquareCenter(1.5, 4.5);
cylinder.position.set(cylinderCenter.x, BOARD_TOP_Y + 2.5, cylinderCenter.z);
cylinder.castShadow = true;
cylinder.receiveShadow = false;
scene.add(cylinder);

function createLabelTexture(text) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "bold 170px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 14;
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.fillStyle = "rgba(44,44,44,0.95)";
    ctx.strokeText(text, 128, 136);
    ctx.fillText(text, 128, 136);

    const texture = new THREE.CanvasTexture(canvas);
    if (texture.encoding !== undefined) texture.encoding = THREE.sRGBEncoding;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
}

function addBoardLabel(text, x, z) {
    const labelTexture = createLabelTexture(text);
    const labelMaterial = new THREE.MeshBasicMaterial({
        map: labelTexture,
        transparent: true,
        depthWrite: false,
    });
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), labelMaterial);
    label.rotation.x = -Math.PI / 2;
    label.position.set(x, BOARD_TOP_Y + 0.02, z);
    scene.add(label);
}

const aPos = getSquareCenter(1, 2);
const bPos = getSquareCenter(3, 3);
addBoardLabel("A", aPos.x, aPos.z);
addBoardLabel("B", bPos.x, bPos.z);

let controls;
try {
    if (THREE.OrbitControls) {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.target.set(0, BOARD_TOP_Y + 0.8, 0);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.update();
    } else {
        throw new Error("THREE.OrbitControls not found");
    }
} catch (e) {
    console.warn("OrbitControls unavailable:", e);
    controls = { update: () => {} };
}

const panel = document.getElementById("rgbPanel");
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let pickedA = null;
let pickedB = null;

function getMouseNDC(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    return {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -(((event.clientY - rect.top) / rect.height) * 2 - 1),
    };
}

const markerGeometry = new THREE.SphereGeometry(0.12, 24, 24);
const markerA = new THREE.Mesh(markerGeometry, new THREE.MeshBasicMaterial({ color: 0xff3333 }));
const markerB = new THREE.Mesh(markerGeometry, new THREE.MeshBasicMaterial({ color: 0x33a1ff }));
markerA.visible = false;
markerB.visible = false;
scene.add(markerA);
scene.add(markerB);

renderer.domElement.addEventListener("click", (event) => {
    const ndc = getMouseNDC(event);
    mouse.set(ndc.x, ndc.y);

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(floor, false);
    if (hits.length === 0) return;

    const hitPoint = hits[0].point.clone();

    if (!pickedA || (pickedA && pickedB)) {
        pickedA = { worldPos: hitPoint, ndc };
        pickedB = null;
        markerA.position.copy(hitPoint).add(new THREE.Vector3(0, 0.12, 0));
        markerA.visible = true;
        markerB.visible = false;
        if (panel) panel.textContent = "Picked A. Now click point B...";
    } else {
        pickedB = { worldPos: hitPoint, ndc };
        markerB.position.copy(hitPoint).add(new THREE.Vector3(0, 0.12, 0));
        markerB.visible = true;
        if (panel) panel.textContent = "Picked B. Reading RGB...";
    }
});

function getCheckerboardColorAtUV(u, v) {
    const squares = BOARD_SQUARES;
    u = ((u % 1) + 1) % 1;
    v = ((v % 1) + 1) % 1;

    const x = Math.floor((u * squares) % squares);
    const y = Math.floor((v * squares) % squares);
    const isLight = (x + y) % 2 === 0;

    return isLight ? LIGHT_SQUARE : DARK_SQUARE;
}

function readMaterialColor(worldPos) {
    const localPos = worldPos.clone().sub(floor.position);
    const u = (localPos.x + BOARD_SIZE / 2) / BOARD_SIZE;
    const v = (localPos.z + BOARD_SIZE / 2) / BOARD_SIZE;
    return getCheckerboardColorAtUV(u, v);
}

function readRenderedPixelColor(ndc) {
    const pixels = new Uint8Array(4);
    const pixelRatio = renderer.getPixelRatio();
    const x = Math.floor(((ndc.x + 1) / 2) * window.innerWidth * pixelRatio);
    const y = Math.floor((1 - (ndc.y + 1) / 2) * window.innerHeight * pixelRatio);
    const gl = renderer.getContext();
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    return {
        r: pixels[0],
        g: pixels[1],
        b: pixels[2],
        a: pixels[3],
    };
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();

    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);

    if (pickedA && pickedB && panel) {
        const matA = readMaterialColor(pickedA.worldPos);
        const matB = readMaterialColor(pickedB.worldPos);
        const rendA = readRenderedPixelColor(pickedA.ndc);
        const rendB = readRenderedPixelColor(pickedB.ndc);

        panel.textContent =
`MATERIAL COLORS (actual texture):
A Material: (${matA.r}, ${matA.g}, ${matA.b})
B Material: (${matB.r}, ${matB.g}, ${matB.b})

RENDERED COLORS (with shadow/lighting):
A Rendered: (${rendA.r}, ${rendA.g}, ${rendA.b})
B Rendered: (${rendB.r}, ${rendB.g}, ${rendB.b})

(Click to pick new points)`;
    }
}

animate();
