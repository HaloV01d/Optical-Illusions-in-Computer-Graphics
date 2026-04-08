import * as THREE from 'three';
import { IllusionBase } from './IllusionBase.js';

const STATE_OBSERVE = 'observe';
const STATE_REVEAL = 'reveal';

export class ZollnerIllusion extends IllusionBase {
    constructor(options = {}) {
        super(options);
        this.state = STATE_OBSERVE;

        this.mainLines = [];
        this.referenceGuides = [];
        this.crossStrokes = [];

        this.camera.position.set(0, 2.0, 7.6);
        this.camera.lookAt(0, 0, 0);
        this.controls.enablePan = false;
        this.controls.minDistance = 5.5;
        this.controls.maxDistance = 12;
    }

    getTitle() { // Return the title of the illusion to be displayed in the UI
        return 'Zollner Illusion';
    }

    getGuideMarkup() { // Return the HTML markup for the guide panel, including instructions and buttons for interaction
        return `
            <div class="guide-title">Zollner Illusion</div>
            <div class="guide-copy">The two long horizontal lines are truly parallel, but the angled short strokes make them look tilted relative to each other.</div>
            <div class="guide-actions">
                <button id="zollnerReveal" class="guide-btn" type="button">Reveal Parallel Guides</button>
                <button id="zollnerReset" class="guide-btn" type="button">Reset</button>
            </div>
            <div id="zollnerStatus" class="guide-status">Observe first, then reveal the guides.</div>
        `;
    }

    buildScene() { // Set up the 3D scene with two long horizontal lines, short diagonal strokes that create the illusion of divergence, and reference guides that can be revealed to show the true parallel nature of the long lines. A floor plane is also added for context.
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(18, 14),
            new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.92, metalness: 0 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -2.2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        this.buildMainLines();
        this.buildCrossStrokes();
        this.buildReferenceGuides();

        this.setRevealVisible(false);
    }

    onMount() { // Set up event listeners for the guide panel buttons when the illusion is mounted
        const revealButton = document.getElementById('zollnerReveal');
        const resetButton = document.getElementById('zollnerReset');

        this.boundReveal = () => this.revealGuides();
        this.boundReset = () => this.reset();

        revealButton?.addEventListener('click', this.boundReveal);
        resetButton?.addEventListener('click', this.boundReset);

        this.refreshGuideStatus();
    }

    onDispose() { // Clean up any resources or event listeners when the illusion is disposed
        const revealButton = document.getElementById('zollnerReveal');
        const resetButton = document.getElementById('zollnerReset');

        if (this.boundReveal) {
            revealButton?.removeEventListener('click', this.boundReveal);
            resetButton?.removeEventListener('click', this.boundReset);
        }

        this.hideColorPanel();
    }

    buildMainLines() { // Create the two long horizontal lines that are the basis of the illusion, and add them to the scene
        const mainMaterial = new THREE.LineBasicMaterial({ color: 0x0f172a });
        const yValues = [0.72, -0.72];

        yValues.forEach((y) => {
            const points = [new THREE.Vector3(-4.6, y, 0), new THREE.Vector3(4.6, y, 0)];
            const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), mainMaterial.clone());
            this.mainLines.push(line);
            this.scene.add(line);
        });
    }

    buildCrossStrokes() { // Create the short diagonal strokes that intersect the long lines and create the illusion of divergence, and add them to the scene
        const strokeLength = 0.68;
        const spacing = 0.95;
        const topAngle = THREE.MathUtils.degToRad(38);
        const bottomAngle = THREE.MathUtils.degToRad(-38);
        const strokeMaterial = new THREE.LineBasicMaterial({ color: 0x334155 });

        this.mainLines.forEach((line, lineIndex) => {
            const y = line.geometry.attributes.position.getY(0);
            const angle = lineIndex === 0 ? topAngle : bottomAngle;

            for (let x = -4.1; x <= 4.1; x += spacing) {
                const dx = Math.cos(angle) * strokeLength * 0.5;
                const dy = Math.sin(angle) * strokeLength * 0.5;

                const start = new THREE.Vector3(x - dx, y - dy, 0);
                const end = new THREE.Vector3(x + dx, y + dy, 0);
                const stroke = new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints([start, end]),
                    strokeMaterial.clone()
                );

                this.crossStrokes.push(stroke);
                this.scene.add(stroke);
            }
        });
    }

    buildReferenceGuides() { // Create the reference guides that can be revealed to show the true parallel nature of the long lines, and add them to the scene
        const guideMaterial = new THREE.LineDashedMaterial({
            color: 0x16a34a,
            dashSize: 0.2,
            gapSize: 0.1,
            linewidth: 1
        });

        const floorY = -2.2;
        const topY = 0.95;
        const cornerX = [-4.6, 4.6];

        cornerX.forEach((x) => {
            const points = [new THREE.Vector3(x, floorY, 0.02), new THREE.Vector3(x, topY, 0.02)];
            const guide = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), guideMaterial.clone());
            guide.computeLineDistances();
            this.referenceGuides.push(guide);
            this.scene.add(guide);
        });
    }

    revealGuides() { // Change the state to reveal, make the reference guides visible, and display a color panel with explanations of what the user is seeing and the ground truth of the illusion
        this.state = STATE_REVEAL;
        this.setRevealVisible(true);

        const html = `
            <div class="color-display">
                <div class="color-label">What You Are Seeing</div>
                <div>Short diagonal strokes bias orientation processing, so the long lines seem to diverge.</div>
            </div>
            <div class="color-display">
                <div class="color-label">Ground Truth</div>
                <div>Both long lines are exactly horizontal and parallel.</div>
            </div>
        `;

        this.showColorPanel('Zollner Reveal', html);
        this.refreshGuideStatus();
    }

    reset() {
        this.state = STATE_OBSERVE;
        this.setRevealVisible(false);
        this.hideColorPanel();
        this.refreshGuideStatus();
    }

    setRevealVisible(visible) {
        this.referenceGuides.forEach((guide) => {
            guide.visible = visible;
        });
    }

    refreshGuideStatus() {
        const statusNode = document.getElementById('zollnerStatus');
        if (!statusNode) {
            return;
        }

        if (this.state === STATE_OBSERVE) {
            statusNode.textContent = 'Observe the long lines before revealing guides.';
            return;
        }

        statusNode.textContent = 'Guides revealed. The lines are parallel.';
    }
}
