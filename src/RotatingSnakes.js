import * as THREE from 'three';
import { IllusionBase } from './IllusionBase.js';

const STATE_OBSERVE = 'observe';
const STATE_REVEAL = 'reveal';

export class RotatingSnakesIllusion extends IllusionBase {
    constructor(options = {}) {
        super(options);
        this.state = STATE_OBSERVE;
        this.animationSpeed = 0.02;
        this.rotationAngle = 0;

        this.snakeGroup = new THREE.Group();
        this.referenceGuides = [];

        this.camera.position.set(0, 3.2, 8.5);
        this.camera.lookAt(0, 0, 0);
        this.controls.enablePan = false;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 14;
    }

    getTitle() {
        return 'Rotating Snakes Illusion';
    }

    getGuideMarkup() {
        return `
            <div class="guide-title">Rotating Snakes</div>
            <div class="guide-copy">Concentric circles arranged in patterns appear to rotate continuously, even though the image is completely static.</div>
            <div class="guide-actions">
                <button id="snakesReveal" class="guide-btn" type="button">Reveal Static Guides</button>
                <button id="snakesReset" class="guide-btn" type="button">Reset</button>
            </div>
            <div id="snakesStatus" class="guide-status">Observe and try not to blink.</div>
        `;
    }

    buildScene() {
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(18, 18),
            new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.92, metalness: 0 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -2.8;
        floor.receiveShadow = true;
        this.scene.add(floor);

        this.buildSnakes();
        this.buildReferenceGuides();

        this.scene.add(this.snakeGroup);
        this.setReferenceVisible(false);
    }

    onMount() {
        const revealButton = document.getElementById('snakesReveal');
        const resetButton = document.getElementById('snakesReset');

        this.boundReveal = () => this.revealGuides();
        this.boundReset = () => this.reset();

        revealButton?.addEventListener('click', this.boundReveal);
        resetButton?.addEventListener('click', this.boundReset);

        this.refreshGuideStatus();
    }

    onDispose() {
        const revealButton = document.getElementById('snakesReveal');
        const resetButton = document.getElementById('snakesReset');

        if (this.boundReveal) {
            revealButton?.removeEventListener('click', this.boundReveal);
            resetButton?.removeEventListener('click', this.boundReset);
        }

        this.hideColorPanel();
    }

    onFrame() {
        if (this.state === STATE_OBSERVE) {
            this.rotationAngle += this.animationSpeed;
            this.snakeGroup.rotation.z = this.rotationAngle;
        }
    }

    buildSnakes() {
        const numRings = 6;
        const baseRadius = 0.8;
        const ringSpacing = 0.65;
        const segmentsPerRing = 32;

        for (let ringIndex = 0; ringIndex < numRings; ringIndex++) {
            const radius = baseRadius + ringIndex * ringSpacing;
            const color1 = ringIndex % 2 === 0 ? 0xf59e0b : 0x3b82f6;
            const color2 = ringIndex % 2 === 0 ? 0xfecaca : 0xbfdbfe;

            for (let i = 0; i < segmentsPerRing; i++) {
                const angle1 = (i / segmentsPerRing) * Math.PI * 2;
                const angle2 = ((i + 1) / segmentsPerRing) * Math.PI * 2;

                const alternateSegment = Math.floor(i / 4) % 2 === 0;
                const color = alternateSegment ? color1 : color2;

                const geometry = new THREE.BufferGeometry();
                const points = [];

                points.push(
                    new THREE.Vector3(Math.cos(angle1) * radius, Math.sin(angle1) * radius, 0),
                    new THREE.Vector3(Math.cos(angle2) * radius, Math.sin(angle2) * radius, 0),
                    new THREE.Vector3(Math.cos(angle2) * (radius + ringSpacing * 0.7), Math.sin(angle2) * (radius + ringSpacing * 0.7), 0),
                    new THREE.Vector3(Math.cos(angle1) * (radius + ringSpacing * 0.7), Math.sin(angle1) * (radius + ringSpacing * 0.7), 0)
                );

                geometry.setFromPoints(points);
                const indices = [0, 1, 2, 0, 2, 3];
                geometry.setIndex(indices);

                const material = new THREE.MeshStandardMaterial({
                    color,
                    roughness: 0.6,
                    metalness: 0,
                    side: THREE.DoubleSide
                });

                const mesh = new THREE.Mesh(geometry, material);
                this.snakeGroup.add(mesh);
            }
        }
    }

    buildReferenceGuides() {
        const numRings = 6;
        const baseRadius = 0.8;
        const ringSpacing = 0.65;

        for (let ringIndex = 0; ringIndex < numRings; ringIndex++) {
            const radius = baseRadius + ringIndex * ringSpacing;

            const geometry = new THREE.BufferGeometry();
            const points = [];

            for (let i = 0; i <= 64; i++) {
                const angle = (i / 64) * Math.PI * 2;
                points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.01));
            }

            geometry.setFromPoints(points);
            const material = new THREE.LineBasicMaterial({
                color: 0x16a34a,
                linewidth: 2
            });

            const line = new THREE.Line(geometry, material);
            this.referenceGuides.push(line);
            this.scene.add(line);
        }
    }

    revealGuides() {
        this.state = STATE_REVEAL;
        this.snakeGroup.rotation.z = 0;
        this.rotationAngle = 0;
        this.setReferenceVisible(true);

        const html = `
            <div class="color-display">
                <div class="color-label">What You Are Seeing</div>
                <div>The alternating colors and concentric arrangement trigger motion perception in your visual cortex.</div>
            </div>
            <div class="color-display">
                <div class="color-label">Ground Truth</div>
                <div>All rings are completely static and concentric. There is no rotation whatsoever.</div>
            </div>
        `;

        this.showColorPanel('Rotating Snakes Reveal', html);
        this.refreshGuideStatus();
    }

    reset() {
        this.state = STATE_OBSERVE;
        this.rotationAngle = 0;
        this.snakeGroup.rotation.z = 0;
        this.setReferenceVisible(false);
        this.hideColorPanel();
        this.refreshGuideStatus();
    }

    setReferenceVisible(visible) {
        this.referenceGuides.forEach((guide) => {
            guide.visible = visible;
        });
    }

    refreshGuideStatus() {
        const statusNode = document.getElementById('snakesStatus');
        if (!statusNode) {
            return;
        }

        if (this.state === STATE_OBSERVE) {
            statusNode.textContent = 'Observe the spinning motion carefully.';
            return;
        }

        statusNode.textContent = 'Guides revealed. The rings are perfectly static.';
    }
}
