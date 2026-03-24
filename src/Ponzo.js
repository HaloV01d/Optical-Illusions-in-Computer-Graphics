import * as THREE from 'three';
import { IllusionBase } from './IllusionBase.js';

const STATE_OBSERVE = 'observe'; // Initial state where the user can observe the illusion without interaction
const STATE_GUESS = 'guess'; // State where the user can click on one of the bars to make a guess about which looks longer
const STATE_REVEAL = 'reveal'; // State where the true lengths of the bars are revealed and the user's guess is evaluated

export class PonzoIllusion extends IllusionBase { // Implementation of the Ponzo illusion, where two bars of equal length appear different due to perspective cues
	constructor(options = {}) {
		super(options);
		this.state = STATE_OBSERVE;
		this.userGuess = null;

		this.bars = [];
		this.rails = [];
		this.measurementGroup = new THREE.Group();

		this.equalLength = 2.6; // The actual length of both bars, which will be revealed to the user
		this.camera.position.set(0, 2.8, 8.3); // Set the camera position to provide a good view of the illusion
		this.camera.lookAt(0, 0.4, 0); // Make the camera look at the center of the scene
		this.controls.enablePan = false; // Disable panning to keep the perspective consistent
	}

	getTitle() { // Return the title of the illusion to be displayed in the UI
		return 'Ponzo Illusion';
	}

	getGuideMarkup() { // Return the HTML markup for the guide panel, including instructions and buttons for interaction
		return `
			<div class="guide-title">Ponzo Illusion</div>
			<div class="guide-copy">Two horizontal bars have the same length, but perspective rails make one look longer. Choose first, then reveal.</div>
			<div class="guide-actions">
				<button id="ponzoStartGuess" class="guide-btn" type="button">Start Guess</button>
				<button id="ponzoReveal" class="guide-btn" type="button" disabled>Reveal Length</button>
				<button id="ponzoReset" class="guide-btn" type="button">Reset</button>
			</div>
			<div id="ponzoStatus" class="guide-status">Observe the bars, then press Start Guess.</div>
		`;
	}

	buildScene() { // Set up the 3D scene with perspective rails, two bars of equal length, and a floor plane for context
		const floor = new THREE.Mesh(
			new THREE.PlaneGeometry(18, 18),
			new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.95, metalness: 0 })
		);
		floor.rotation.x = -Math.PI / 2;
		floor.position.y = -1.6;
		floor.receiveShadow = true;
		this.scene.add(floor);

		this.buildRails();
		this.buildBars();
		this.buildMarkers();

		this.measurementGroup.visible = false;
		this.scene.add(this.measurementGroup);
	}

	onMount() { // Set up event listeners for the guide panel buttons when the illusion is mounted
		const startButton = document.getElementById('ponzoStartGuess');
		const revealButton = document.getElementById('ponzoReveal');
		const resetButton = document.getElementById('ponzoReset');

		this.boundStartGuess = () => this.startGuess();
		this.boundReveal = () => this.reveal();
		this.boundReset = () => this.reset();

		startButton?.addEventListener('click', this.boundStartGuess);
		revealButton?.addEventListener('click', this.boundReveal);
		resetButton?.addEventListener('click', this.boundReset);

		this.refreshGuideStatus();
	}

	onDispose() { // Clean up event listeners and other resources when the illusion is disposed
		const startButton = document.getElementById('ponzoStartGuess');
		const revealButton = document.getElementById('ponzoReveal');
		const resetButton = document.getElementById('ponzoReset');

		if (this.boundStartGuess) {
			startButton?.removeEventListener('click', this.boundStartGuess);
			revealButton?.removeEventListener('click', this.boundReveal);
			resetButton?.removeEventListener('click', this.boundReset);
		}

		this.hideColorPanel();
	}

	buildRails() { // Perspective rails that create the illusion of depth
		const railMaterial = new THREE.LineBasicMaterial({ color: 0x334155 });
		const leftPoints = [new THREE.Vector3(-3.2, -1.2, 1.2), new THREE.Vector3(-0.35, 2.4, -2.6)];
		const rightPoints = [new THREE.Vector3(3.2, -1.2, 1.2), new THREE.Vector3(0.35, 2.4, -2.6)];

		const leftRail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(leftPoints), railMaterial);
		const rightRail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(rightPoints), railMaterial.clone());

		this.rails.push(leftRail, rightRail);
		this.scene.add(leftRail);
		this.scene.add(rightRail);
	}

	buildBars() { // Two bars of equal length that will be compared by the user
		const barGeometry = new THREE.BoxGeometry(this.equalLength, 0.18, 0.18);

		const topBar = new THREE.Mesh(
			barGeometry,
			new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.45, metalness: 0.1 })
		);
		topBar.position.set(0, 1.1, -1.1);
		topBar.castShadow = true;
		topBar.userData.choice = 'top';

		const bottomBar = new THREE.Mesh(
			barGeometry.clone(),
			new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.45, metalness: 0.1 })
		);
		bottomBar.position.set(0, -0.25, 0.1);
		bottomBar.castShadow = true;
		bottomBar.userData.choice = 'bottom';

		this.bars.push(topBar, bottomBar);
		this.scene.add(topBar);
		this.scene.add(bottomBar);
	}

	buildMarkers() { // Visual markers that will be revealed to show the true lengths of the bars
		const markerMaterial = new THREE.LineBasicMaterial({ color: 0x111827 });
		const markerOffset = this.equalLength / 2;
		const yOffset = 0.35;

		this.bars.forEach((bar) => {
			const start = new THREE.Vector3(bar.position.x - markerOffset, bar.position.y + yOffset, bar.position.z);
			const end = new THREE.Vector3(bar.position.x + markerOffset, bar.position.y + yOffset, bar.position.z);
			const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([start, end]), markerMaterial);

			const tickLeft = new THREE.Line(
				new THREE.BufferGeometry().setFromPoints([
					new THREE.Vector3(start.x, start.y - 0.1, start.z),
					new THREE.Vector3(start.x, start.y + 0.1, start.z)
				]),
				markerMaterial
			);

			const tickRight = new THREE.Line(
				new THREE.BufferGeometry().setFromPoints([
					new THREE.Vector3(end.x, end.y - 0.1, end.z),
					new THREE.Vector3(end.x, end.y + 0.1, end.z)
				]),
				markerMaterial
			);

			this.measurementGroup.add(line, tickLeft, tickRight);
		});
	}

	handlePointerDown(event) {
		if (this.state !== STATE_GUESS) {
			return;
		}

		const intersections = this.getIntersections(event, this.bars);
		if (!intersections.length) {
			return;
		}

		const choice = intersections[0].object.userData.choice;
		if (!choice) {
			return;
		}

		this.userGuess = choice;
		this.refreshGuideStatus();

		const revealButton = document.getElementById('ponzoReveal');
		if (revealButton) {
			revealButton.disabled = false;
		}
	}

	startGuess() {
		this.state = STATE_GUESS;
		this.userGuess = null;
		this.measurementGroup.visible = false;
		this.bars[0].material.emissive = new THREE.Color(0x000000);
		this.bars[1].material.emissive = new THREE.Color(0x000000);

		const revealButton = document.getElementById('ponzoReveal');
		if (revealButton) {
			revealButton.disabled = true;
		}

		this.hideColorPanel();
		this.refreshGuideStatus();
	}

	reveal() { // Reveal the measurements and whether the user's guess was correct
		if (this.state !== STATE_GUESS || !this.userGuess) {
			return;
		}

		this.state = STATE_REVEAL;
		this.measurementGroup.visible = true;

		const correctChoice = 'equal';
		const guessedLabel = this.userGuess === 'top' ? 'Top bar' : 'Bottom bar';

		const html = `
			<div class="color-display">
				<div class="color-label">Your Guess</div>
				<div>${guessedLabel} looked longer.</div>
			</div>
			<div class="color-display">
				<div class="color-label">Measured Result</div>
				<div>Top bar: ${this.equalLength.toFixed(2)} units</div>
				<div>Bottom bar: ${this.equalLength.toFixed(2)} units</div>
				<div style="margin-top: 8px; color: #4ade80; font-weight: bold;">Result: ${correctChoice.toUpperCase()} LENGTH</div>
			</div>
		`;

		this.showColorPanel('Ponzo Reveal', html);
		this.refreshGuideStatus();
	}

	reset() { // Reset the illusion to the initial state for another attempt
		this.state = STATE_OBSERVE;
		this.userGuess = null;
		this.measurementGroup.visible = false;
		this.hideColorPanel();
		this.refreshGuideStatus();

		const revealButton = document.getElementById('ponzoReveal');
		if (revealButton) {
			revealButton.disabled = true;
		}
	}

	refreshGuideStatus() { // Update the status text in the guide panel based on the current state of the illusion
		const statusNode = document.getElementById('ponzoStatus');
		if (!statusNode) {
			return;
		}

		if (this.state === STATE_OBSERVE) {
			statusNode.textContent = 'Observe both bars. Press Start Guess when ready.';
			return;
		}

		if (this.state === STATE_GUESS && !this.userGuess) {
			statusNode.textContent = 'Click the bar that looks longer.';
			return;
		}

		if (this.state === STATE_GUESS && this.userGuess) {
			statusNode.textContent = `Selected: ${this.userGuess === 'top' ? 'Top bar' : 'Bottom bar'}. Press Reveal Length.`;
			return;
		}

		statusNode.textContent = 'Reveal complete. Press Reset to try again.';
	}
}

