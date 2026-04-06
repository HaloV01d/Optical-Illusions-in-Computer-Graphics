import * as THREE from 'three';
import { IllusionBase } from './IllusionBase.js';

const STATE_OBSERVE = 'observe';
const STATE_REVEAL = 'reveal';

export class MachBandIllusion extends IllusionBase {
    constructor(options = {}) {
        super(options);
        this.state = STATE_OBSERVE;
        this.bandTexture = null;
        this.profileGroup = new THREE.Group();
        this.boundaries = [];
        this.samples = [];
        this.perceivedSamples = [];

        this.camera.position.set(0, 0, 8.2);
        this.camera.lookAt(0, 0, 0);
        this.controls.enablePan = false;
        this.controls.enableRotate = false;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 12;
    }

    getTitle() {
        return 'Mach Band Illusion';
    }

    getGuideMarkup() {
        return `
            <div class="guide-title">Mach Bands</div>
            <div class="guide-copy">This version matches the classic grayscale-strip demonstration: each vertical band is uniformly shaded, but the boundaries appear to have extra bright and dark rims. Stare at the edges, then reveal the actual profile.</div>
            <div class="guide-actions">
                <button id="machReveal" class="guide-btn" type="button">Reveal Profile</button>
                <button id="machReset" class="guide-btn" type="button">Reset</button>
            </div>
            <div id="machStatus" class="guide-status">Observe the illusory rims where the gray bands touch.</div>
        `;
    }

    buildScene() {
        this.light.visible = false;
        this.ambient.visible = false;

        const backdrop = new THREE.Mesh(
            new THREE.PlaneGeometry(14, 9),
            new THREE.MeshBasicMaterial({ color: 0xf8fafc })
        );
        backdrop.position.z = -1;
        this.scene.add(backdrop);

        this.samples = this.createSamples();
        this.boundaries = this.getBoundaryPositions(this.samples);
        this.perceivedSamples = this.createPerceivedSamples(this.samples);

        const bandPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(9.2, 4.4),
            new THREE.MeshBasicMaterial({ map: this.createBandTexture(this.samples) })
        );
        bandPlane.position.y = 0.5;
        this.scene.add(bandPlane);

        const frame = new THREE.LineLoop(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-4.6, -1.7, 0.03),
                new THREE.Vector3(4.6, -1.7, 0.03),
                new THREE.Vector3(4.6, 2.7, 0.03),
                new THREE.Vector3(-4.6, 2.7, 0.03)
            ]),
            new THREE.LineBasicMaterial({ color: 0x0f172a })
        );
        this.scene.add(frame);

        this.buildProfileOverlay();
        this.profileGroup.visible = false;
        this.scene.add(this.profileGroup);
    }

    onMount() {
        const revealButton = document.getElementById('machReveal');
        const resetButton = document.getElementById('machReset');

        this.boundReveal = () => this.revealProfile();
        this.boundReset = () => this.reset();

        revealButton?.addEventListener('click', this.boundReveal);
        resetButton?.addEventListener('click', this.boundReset);
        this.refreshGuideStatus();
    }

    onDispose() {
        const revealButton = document.getElementById('machReveal');
        const resetButton = document.getElementById('machReset');

        if (this.boundReveal) {
            revealButton?.removeEventListener('click', this.boundReveal);
            resetButton?.removeEventListener('click', this.boundReset);
        }

        this.hideColorPanel();

        if (this.bandTexture) {
            this.bandTexture.dispose();
            this.bandTexture = null;
        }
    }

    createSamples() {
        return [0.14, 0.26, 0.38, 0.5, 0.62, 0.74, 0.86];
    }

    createPerceivedSamples(samples) {
        return samples.map((sample, index) => {
            if (index === 0 || index === samples.length - 1) {
                return sample;
            }

            return sample;
        });
    }

    getBoundaryPositions(samples) {
        const segmentWidth = 1 / samples.length;
        const positions = [];

        for (let index = 1; index < samples.length; index += 1) {
            positions.push(index * segmentWidth);
        }

        return positions;
    }

    createBandTexture(samples) {
        const canvas = document.createElement('canvas');
        canvas.width = 1600;
        canvas.height = 420;
        const context = canvas.getContext('2d');

        if (!context) {
            throw new Error('Unable to create canvas context for Mach band texture.');
        }

        const imageData = context.createImageData(canvas.width, canvas.height);
        const segmentWidth = canvas.width / samples.length;

        for (let x = 0; x < canvas.width; x += 1) {
            const segmentIndex = Math.min(samples.length - 1, Math.floor(x / segmentWidth));
            const value = samples[segmentIndex];
            const luminance = Math.round(value * 255);

            for (let y = 0; y < canvas.height; y += 1) {
                const index = (y * canvas.width + x) * 4;
                imageData.data[index] = luminance;
                imageData.data[index + 1] = luminance;
                imageData.data[index + 2] = luminance;
                imageData.data[index + 3] = 255;
            }
        }

        context.putImageData(imageData, 0, 0);

        this.bandTexture = new THREE.CanvasTexture(canvas);
        this.bandTexture.colorSpace = THREE.SRGBColorSpace;
        this.bandTexture.needsUpdate = true;
        return this.bandTexture;
    }

    buildProfileOverlay() {
        const graphWidth = 8.6;
        const graphHeight = 1.8;
        const graphOriginX = -graphWidth / 2;
        const graphOriginY = -2.2;

        const axisMaterial = new THREE.LineBasicMaterial({ color: 0x334155 });
        const axisPoints = [
            new THREE.Vector3(graphOriginX, graphOriginY, 0.05),
            new THREE.Vector3(graphOriginX + graphWidth, graphOriginY, 0.05),
            new THREE.Vector3(graphOriginX, graphOriginY, 0.05),
            new THREE.Vector3(graphOriginX, graphOriginY + graphHeight, 0.05)
        ];
        const axisGeometry = new THREE.BufferGeometry().setFromPoints(axisPoints);
        const axes = new THREE.LineSegments(axisGeometry, axisMaterial);
        this.profileGroup.add(axes);

        const actualProfile = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(this.createStepProfilePoints(graphOriginX, graphOriginY, graphWidth, graphHeight, this.samples, 0.06)),
            new THREE.LineBasicMaterial({ color: 0xdc2626 })
        );
        this.profileGroup.add(actualProfile);

        const perceivedProfile = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(this.createPerceivedProfilePoints(graphOriginX, graphOriginY, graphWidth, graphHeight, this.samples, 0.08)),
            new THREE.LineBasicMaterial({ color: 0x2563eb })
        );
        this.profileGroup.add(perceivedProfile);

        this.boundaries.forEach((boundary) => {
            const x = graphOriginX + boundary * graphWidth;
            const guide = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(x, graphOriginY - 0.1, 0.04),
                    new THREE.Vector3(x, graphOriginY + graphHeight + 0.1, 0.04)
                ]),
                new THREE.LineBasicMaterial({ color: 0x16a34a })
            );
            this.profileGroup.add(guide);
        });
    }

    createStepProfilePoints(originX, originY, width, height, samples, z) {
        const bandWidth = width / samples.length;
        const points = [new THREE.Vector3(originX, originY + samples[0] * height, z)];

        samples.forEach((sample, index) => {
            const leftX = originX + index * bandWidth;
            const rightX = leftX + bandWidth;
            const y = originY + sample * height;

            if (index > 0) {
                points.push(new THREE.Vector3(leftX, y, z));
            }

            points.push(new THREE.Vector3(rightX, y, z));

            if (index < samples.length - 1) {
                const nextY = originY + samples[index + 1] * height;
                points.push(new THREE.Vector3(rightX, nextY, z));
            }
        });

        return points;
    }

    createPerceivedProfilePoints(originX, originY, width, height, samples, z) {
        const bandWidth = width / samples.length;
        const points = [];
        const rimWidth = bandWidth * 0.16;
        const overshoot = 0.06;

        for (let index = 0; index < samples.length; index += 1) {
            const leftX = originX + index * bandWidth;
            const rightX = leftX + bandWidth;
            const baseY = originY + samples[index] * height;
            const leftY = baseY - (index > 0 ? overshoot * height : 0);
            const midY = baseY;
            const rightY = baseY + (index < samples.length - 1 ? overshoot * height : 0);

            if (!points.length) {
                points.push(new THREE.Vector3(leftX, midY, z));
            }

            if (index > 0) {
                points.push(new THREE.Vector3(leftX + rimWidth, leftY, z));
            }

            points.push(new THREE.Vector3(leftX + bandWidth * 0.5, midY, z));

            if (index < samples.length - 1) {
                points.push(new THREE.Vector3(rightX - rimWidth, rightY, z));
            }

            points.push(new THREE.Vector3(rightX, midY, z));
        }

        return points;
    }

    revealProfile() {
        this.state = STATE_REVEAL;
        this.profileGroup.visible = true;

        const html = `
            <div class="color-display">
                <div class="color-label">What You Perceive</div>
                <div>Each shared edge looks like it has a dark rim on the darker side and a bright rim on the lighter side, even though those rims are not drawn.</div>
            </div>
            <div class="color-display">
                <div class="color-label">Ground Truth</div>
                <div>The red staircase is the actual luminance: each strip is flat and uniform. The blue line sketches the perceived overshoot near boundaries, which is the Mach band effect.</div>
            </div>
        `;

        this.showColorPanel('Mach Band Reveal', html);
        this.refreshGuideStatus();
    }

    reset() {
        this.state = STATE_OBSERVE;
        this.profileGroup.visible = false;
        this.hideColorPanel();
        this.refreshGuideStatus();
    }

    refreshGuideStatus() {
        const statusNode = document.getElementById('machStatus');
        if (!statusNode) {
            return;
        }

        if (this.state === STATE_OBSERVE) {
            statusNode.textContent = 'Observe the illusory rims where the gray bands touch.';
            return;
        }

        statusNode.textContent = 'Profile revealed. The actual image is just a staircase of uniform gray strips.';
    }
}