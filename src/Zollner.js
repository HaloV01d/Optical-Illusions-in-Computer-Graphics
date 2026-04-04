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

    getTitle() {
        return 'Zollner Illusion';
    }

    getGuideMarkup() {
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

    buildScene() {
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

    onMount() {
        const revealButton = document.getElementById('zollnerReveal');
        const resetButton = document.getElementById('zollnerReset');

        this.boundReveal = () => this.revealGuides();
        this.boundReset = () => this.reset();

        revealButton?.addEventListener('click', this.boundReveal);
        resetButton?.addEventListener('click', this.boundReset);

        this.refreshGuideStatus();
    }

    onDispose() {
        const revealButton = document.getElementById('zollnerReveal');
        const resetButton = document.getElementById('zollnerReset');

        if (this.boundReveal) {
            revealButton?.removeEventListener('click', this.boundReveal);
            resetButton?.removeEventListener('click', this.boundReset);
        }

        this.hideColorPanel();
    }

    buildMainLines() {
        const mainMaterial = new THREE.LineBasicMaterial({ color: 0x0f172a });
        const yValues = [0.72, -0.72];

        yValues.forEach((y) => {
            const points = [new THREE.Vector3(-4.6, y, 0), new THREE.Vector3(4.6, y, 0)];
            const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), mainMaterial.clone());
            this.mainLines.push(line);
            this.scene.add(line);
        });
    }

    buildCrossStrokes() {
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

    buildReferenceGuides() {
        const guideMaterial = new THREE.LineDashedMaterial({
            color: 0x16a34a,
            dashSize: 0.2,
            gapSize: 0.1,
            linewidth: 1
        });

        this.mainLines.forEach((line) => {
            const y = line.geometry.attributes.position.getY(0);
            const points = [new THREE.Vector3(-4.6, y + 0.22, 0), new THREE.Vector3(4.6, y + 0.22, 0)];
            const guide = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), guideMaterial.clone());
            guide.computeLineDistances();
            this.referenceGuides.push(guide);
            this.scene.add(guide);
        });
    }

    revealGuides() {
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
