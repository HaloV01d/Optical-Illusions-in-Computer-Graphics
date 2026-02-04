const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 4, 6);
camera.lookAt(0, 0, 0);


const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});

const ambientLight = new THREE.AmbientLight(0x404040); // baja intensidad
scene.add(ambientLight);

const DIRECTIONAL_LIGHT = new THREE.DirectionalLight(0xffffff, 1);
DIRECTIONAL_LIGHT.position.set(5, 10, 7.5);
DIRECTIONAL_LIGHT.castShadow = true;
scene.add(DIRECTIONAL_LIGHT);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

function createCheckerboardTexture(size, squares) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    const squareSize = size / squares;

    for (let y = 0; y < squares; y++) {
        for (let x = 0; x < squares; x++) {
            context.fillStyle = (x + y) % 2 === 0 ? '#cfcfcf' : '#3a3a3a';
            context.fillRect(x * squareSize, y * squareSize, squareSize, squareSize);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    return texture;
}

const checkerTexture = createCheckerboardTexture(512, 8);
const floorGeometry = new THREE.PlaneGeometry(10, 10);
const floorMaterial = new THREE.MeshStandardMaterial({ map: checkerTexture });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const cylinderGeometry = new THREE.CylinderGeometry(0.6, 0.6, 2.5, 64);

const cylinderMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00});

const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);

cylinderGeometry.castShadow = true;
cylinderGeometry.receiveShadow = false;

scene.add(cylinder)

DIRECTIONAL_LIGHT.shadow.mapSize.width = 2048;
DIRECTIONAL_LIGHT.shadow.mapSize.height = 2048;

DIRECTIONAL_LIGHT.shadow.camera.near = 0.5;
DIRECTIONAL_LIGHT.shadow.camera.far = 50;

DIRECTIONAL_LIGHT.shadow.camera.left = -8;
DIRECTIONAL_LIGHT.shadow.camera.right = 8;
DIRECTIONAL_LIGHT.shadow.camera.top = 8;
DIRECTIONAL_LIGHT.shadow.camera.bottom = -8;
