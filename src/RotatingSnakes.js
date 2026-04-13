import * as THREE from 'three';
import { IllusionBase } from './IllusionBase.js';

export class RotatingSnakesIllusion extends IllusionBase { // Define a new class for the Rotating Snakes illusion that extends the base illusion class
    constructor(options = {}) {
        super(options);

        this.snakeField = new THREE.Group();

        this.camera.position.set(0, 9.5, 0.01);
        this.camera.lookAt(0, 0, 0);
        this.controls.enablePan = false;
        this.controls.enableRotate = false;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 14;
    }

    getTitle() { // Return the title of the illusion to be displayed in the UI
        return 'Rotating Snakes Illusion';
    }

    getGuideMarkup() { // Return the HTML markup for the guide panel, including instructions and buttons for interaction
        return `
            <div class="guide-title">Rotating Snakes</div>
            <div class="guide-copy">Static rotating-snakes style field made from spiral rings of capsules.</div>
            <div class="guide-status">No animation is used in this scene.</div>
        `;
    }

    buildScene() { // Set up the 3D scene with concentric circles arranged in patterns that create the illusion of continuous rotation, and add a floor plane for context
        this.scene.background = new THREE.Color(0x49aef2);

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(32, 22),
            new THREE.MeshBasicMaterial({ color: 0x49aef2 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.2;
        floor.renderOrder = -1;
        this.scene.add(floor);

        this.buildSnakeField();
        this.scene.add(this.snakeField);
    }

    buildSnakeField() {
        const texture = this.createBandTexture();
        const sideMaterial = new THREE.MeshBasicMaterial({ map: texture });
        const topCapMaterial = new THREE.MeshBasicMaterial({ color: 0xf4e30f });
        const bottomCapMaterial = new THREE.MeshBasicMaterial({ color: 0xa020f0 });

        const baseRadius = 0.105;
        const baseLength = 0.44;
        const geometry = new THREE.CylinderGeometry(baseRadius, baseRadius, baseLength, 22, 1, false);
        const materials = [sideMaterial, topCapMaterial, bottomCapMaterial];
        const baseAxis = new THREE.Vector3(0, 1, 0);
        const tangent = new THREE.Vector3();

        const rows = 3;
        const cols = 4;
        const spacingX = 3.18;
        const spacingZ = 3.0;
        const offsetX = ((cols - 1) * spacingX) * 0.5;
        const offsetZ = ((rows - 1) * spacingZ) * 0.5;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const cx = col * spacingX - offsetX;
                const cz = row * spacingZ - offsetZ;
                this.buildDisk(cx, cz, geometry, materials, baseAxis, tangent);
            }
        }
    }

    buildDisk(centerX, centerZ, geometry, materials, baseAxis, tangent) {
        const rings = [
            { radius: 1.12, segments: 28, scale: 1.0, phase: 0.12 },
            { radius: 0.77, segments: 23, scale: 0.83, phase: 0.58 },
            { radius: 0.49, segments: 18, scale: 0.68, phase: 1.06 },
            { radius: 0.28, segments: 13, scale: 0.54, phase: 1.58 }
        ];

        for (let ringIndex = 0; ringIndex < rings.length; ringIndex++) {
            const ring = rings[ringIndex];
            const layerPhase = ring.phase;

            for (let i = 0; i < ring.segments; i++) {
                const theta = (i / ring.segments) * Math.PI * 2 + layerPhase;
                const x = centerX + Math.cos(theta) * ring.radius;
                const z = centerZ + Math.sin(theta) * ring.radius;

                const snake = new THREE.Mesh(geometry, materials);
                snake.scale.setScalar(ring.scale);
                snake.position.set(x, 0.01 + 0.105 * ring.scale, z);

                tangent.set(-Math.sin(theta), 0, Math.cos(theta)).normalize();
                snake.quaternion.setFromUnitVectors(baseAxis, tangent);

                this.snakeField.add(snake);
            }
        }
    }

    createBandTexture() {
        const width = 64;
        const height = 256;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return new THREE.CanvasTexture(canvas);
        }

        ctx.fillStyle = '#A020F0';
        ctx.fillRect(0, 0, width, Math.floor(height * 0.30));
        ctx.fillStyle = '#0f0f0f';
        ctx.fillRect(0, Math.floor(height * 0.30), width, Math.floor(height * 0.40));
        ctx.fillStyle = '#F4E30F';
        ctx.fillRect(0, Math.floor(height * 0.70), width, Math.ceil(height * 0.30));

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.needsUpdate = true;
        return texture;
    }
}
