import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function colorToRGB(color) { // Convert a THREE.Color object to RGB and HEX formats for display in the UI
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const hex = '#' + [r, g, b].map((channel) => channel.toString(16).padStart(2, '0').toUpperCase()).join('');
    return { r, g, b, hex };
}

export class IllusionBase { // Base class for optical illusions, providing common setup for the 3D scene, camera, renderer, controls, lighting, and UI elements, as well as lifecycle methods for mounting, disposing, and handling interactions
    constructor(options = {}) {
        this.container = options.container || document.body;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xffffff);

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(5, 6, 8);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        this.light = new THREE.DirectionalLight(0xffffff, 1.1);
        this.light.position.set(5, 5, -5);
        this.light.castShadow = true;
        this.light.shadow.radius = 6;
        this.light.shadow.mapSize.width = 2048;
        this.light.shadow.mapSize.height = 2048;
        this.scene.add(this.light);

        this.ambient = new THREE.AmbientLight(0xffffff, 0.35);
        this.scene.add(this.ambient);

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.isMounted = false;
        this.animationFrame = null;

        this.ui = {
            lightHueInput: document.getElementById('lightHue'),
            lightSatInput: document.getElementById('lightSat'),
            lightLightInput: document.getElementById('lightLight'),
            lightIntensityInput: document.getElementById('lightIntensity'),
            lightHueValue: document.getElementById('lightHueValue'),
            lightSatValue: document.getElementById('lightSatValue'),
            lightLightValue: document.getElementById('lightLightValue'),
            lightIntensityValue: document.getElementById('lightIntensityValue'),
            shadowSoftnessInput: document.getElementById('shadowSoftness'),
            shadowSoftnessValue: document.getElementById('shadowSoftnessValue'),
            lightPreview: document.getElementById('lightPreview'),
            lightHex: document.getElementById('lightHex'),
            colorPanel: document.getElementById('colorPanel'),
            colorOutput: document.getElementById('colorOutput')
        };

        this.boundResize = this.onResize.bind(this);
        this.boundPointerDown = this.onPointerDown.bind(this);
        this.boundAnimate = this.animate.bind(this);
        this.boundLightInput = this.handleLightInput.bind(this);
        this.boundShadowSoftnessInput = this.handleShadowSoftnessInput.bind(this);
    }

    mount() { // Mount the illusion by adding the renderer to the DOM, setting up event listeners, building the scene, and starting the animation loop
        if (this.isMounted) {
            return;
        }

        this.container.appendChild(this.renderer.domElement);
        window.addEventListener('resize', this.boundResize);
        window.addEventListener('pointerdown', this.boundPointerDown);
        this.bindLightInputs();
        this.syncLightSlidersFromScene();

        this.buildScene();
        this.onMount();

        this.isMounted = true;
        this.animate();
    }

    dispose() { // Dispose of the illusion by removing event listeners, stopping the animation loop, disposing of Three.js resources, and removing the renderer from the DOM
        if (!this.isMounted) {
            return;
        }

        this.onDispose();
        this.hideColorPanel();

        window.removeEventListener('resize', this.boundResize);
        window.removeEventListener('pointerdown', this.boundPointerDown);
        this.unbindLightInputs();

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        this.controls.dispose();
        this.disposeSceneResources();
        this.renderer.dispose();
        this.renderer.domElement.remove();

        this.isMounted = false;
    }

    disposeSceneResources() { // Traverse the scene and dispose of geometries and materials to free up GPU memory when the illusion is disposed
        this.scene.traverse((object) => {
            if (object.geometry) {
                object.geometry.dispose();
            }

            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach((material) => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
    }

    buildScene() { // Subclasses must implement this method to set up the specific 3D objects, materials, and other resources needed for their illusion. This base implementation throws an error to enforce that requirement.
        throw new Error('Subclasses must implement buildScene()');
    }

    onMount() {
        // Optional lifecycle hook for subclasses.
    }

    onDispose() {
        // Optional lifecycle hook for subclasses.
    }

    onFrame() {
        // Optional lifecycle hook for subclasses.
    }

    onLightChanged() {
        // Optional lifecycle hook for subclasses.
    }

    onPointerDown(event) { // Handle pointer down events, but ignore them if they originate from UI panels to prevent interference with the illusion interactions. If the event is not from a panel, delegate to the handlePointerDown method for subclasses to implement specific interaction logic.
        if (this.isEventFromPanel(event)) {
            return;
        }

        this.handlePointerDown(event);
    }

    handlePointerDown() {
        // Optional interaction hook for subclasses.
    }

    isEventFromPanel(event) { // Check if the pointer event originated from a UI panel (e.g., light control panel, color panel, illusion panel, guide panel) by checking if the event target is within any of those panels. This helps prevent pointer interactions with the illusion from being triggered when the user is interacting with the UI.
        const target = event.target;
        if (!(target instanceof Element)) {
            return false;
        }

        return Boolean(target.closest('#lightPanel, #colorPanel, #illusionPanel, #guidePanel'));
    }

    getNormalizedPointer(event) { // Convert the pointer event's client coordinates to normalized device coordinates (NDC) in the range [-1, 1] for use with raycasting in Three.js. This method updates the mouse vector with the normalized coordinates and returns it.
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        return this.mouse;
    }

    getIntersections(event, objects) { // Get the list of objects intersected by a ray cast from the camera through the pointer position. This method first normalizes the pointer coordinates, sets up the raycaster, and then returns the list of intersections with the specified objects in the scene.
        this.getNormalizedPointer(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);
        return this.raycaster.intersectObjects(objects, true);
    }

    onResize() { // Handle window resize events by updating the camera's aspect ratio, projection matrix, and the renderer's size to ensure the illusion continues to display correctly at different screen sizes.
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() { // Main animation loop for the illusion. This method updates controls, calls the onFrame hook, and renders the scene.
        this.animationFrame = requestAnimationFrame(this.boundAnimate);
        this.controls.update();
        this.onFrame();
        this.renderer.render(this.scene, this.camera);
    }

    bindLightInputs() { // Set up event listeners for the light control inputs in the UI to allow the user to adjust the directional light's color, intensity, and shadow softness in real time, and update the corresponding display values in the UI as well.
        const {
            lightHueInput,
            lightSatInput,
            lightLightInput,
            lightIntensityInput,
            shadowSoftnessInput
        } = this.ui;

        if (!lightHueInput || !lightSatInput || !lightLightInput || !lightIntensityInput || !shadowSoftnessInput) {
            return;
        }

        lightHueInput.addEventListener('input', this.boundLightInput);
        lightSatInput.addEventListener('input', this.boundLightInput);
        lightLightInput.addEventListener('input', this.boundLightInput);
        lightIntensityInput.addEventListener('input', this.boundLightInput);
        shadowSoftnessInput.addEventListener('input', this.boundShadowSoftnessInput);
    }

    unbindLightInputs() { // Remove event listeners for the light control inputs in the UI when the illusion is disposed to prevent memory leaks and unintended interactions after the illusion is no longer active.
        const {
            lightHueInput,
            lightSatInput,
            lightLightInput,
            lightIntensityInput,
            shadowSoftnessInput
        } = this.ui;

        if (!lightHueInput || !lightSatInput || !lightLightInput || !lightIntensityInput || !shadowSoftnessInput) {
            return;
        }

        lightHueInput.removeEventListener('input', this.boundLightInput);
        lightSatInput.removeEventListener('input', this.boundLightInput);
        lightLightInput.removeEventListener('input', this.boundLightInput);
        lightIntensityInput.removeEventListener('input', this.boundLightInput);
        shadowSoftnessInput.removeEventListener('input', this.boundShadowSoftnessInput);
    }

    updateLightControlValues() { // Update the display values in the UI for the light controls (hue, saturation, lightness, intensity, shadow softness) based on the current state of the directional light. This method is called whenever the light properties are changed to keep the UI in sync with the scene.
        const {
            lightHueInput,
            lightSatInput,
            lightLightInput,
            lightIntensityInput,
            shadowSoftnessInput,
            lightHueValue,
            lightSatValue,
            lightLightValue,
            lightIntensityValue,
            shadowSoftnessValue
        } = this.ui;

        if (!lightHueInput || !lightSatInput || !lightLightInput || !lightIntensityInput || !shadowSoftnessInput) {
            return;
        }

        lightHueValue.textContent = lightHueInput.value;
        lightSatValue.textContent = `${lightSatInput.value}%`;
        lightLightValue.textContent = `${lightLightInput.value}%`;
        lightIntensityValue.textContent = Number(lightIntensityInput.value).toFixed(2);
        shadowSoftnessValue.textContent = shadowSoftnessInput.value;
    }

    updateLightPreview(hsl) { // Update the light preview element in the UI to show the current color of the directional light based on its HSL values. This provides a visual indication of the light color as the user adjusts the controls.
        const { lightPreview, lightHex } = this.ui;
        if (!lightPreview || !lightHex) {
            return;
        }

        const previewColor = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
        const { hex } = colorToRGB(previewColor);
        lightPreview.style.backgroundColor = hex;
        lightHex.textContent = hex;
    }

    syncLightSlidersFromScene() { // Sync the light control sliders in the UI with the current properties of the directional light in the scene when the illusion is mounted, so that the sliders reflect the actual light settings from the start.
        const {
            lightHueInput,
            lightSatInput,
            lightLightInput,
            lightIntensityInput,
            shadowSoftnessInput
        } = this.ui;

        if (!lightHueInput || !lightSatInput || !lightLightInput || !lightIntensityInput || !shadowSoftnessInput) {
            return;
        }

        const hsl = { h: 0, s: 0, l: 0 };
        this.light.color.getHSL(hsl);
        lightHueInput.value = String(Math.round(hsl.h * 360));
        lightSatInput.value = String(Math.round(hsl.s * 100));
        lightLightInput.value = String(Math.round(hsl.l * 100));
        lightIntensityInput.value = String(this.light.intensity);
        shadowSoftnessInput.value = String(this.light.shadow.radius);

        this.updateLightControlValues();
        this.updateLightPreview(hsl);
    }

    handleLightInput() { // Handle input events from the light control sliders by updating the directional light's color and intensity based on the slider values, and then updating the display values in the UI to reflect the changes.
        const {
            lightHueInput,
            lightSatInput,
            lightLightInput,
            lightIntensityInput
        } = this.ui;

        if (!lightHueInput || !lightSatInput || !lightLightInput || !lightIntensityInput) {
            return;
        }

        const h = Number(lightHueInput.value) / 360;
        const s = Number(lightSatInput.value) / 100;
        const l = Number(lightLightInput.value) / 100;

        this.light.color.setHSL(h, s, l);
        this.light.intensity = Number(lightIntensityInput.value);

        this.updateLightControlValues();
        this.updateLightPreview({ h, s, l });
        this.onLightChanged();
    }

    handleShadowSoftnessInput() { // Handle input events from the shadow softness slider by updating the directional light's shadow radius based on the slider value, and then updating the display value in the UI to reflect the change.
        const { shadowSoftnessInput } = this.ui;
        if (!shadowSoftnessInput) {
            return;
        }

        this.light.shadow.radius = Number(shadowSoftnessInput.value);
        this.updateLightControlValues();
        this.onLightChanged();
    }

    getPixelColor(worldPosition) { // Sample the apparent rendered color at a world-space position by projecting it to screen space and reading back the WebGL pixel, so the result reflects current lighting, intensity, and shadows
        this.renderer.render(this.scene, this.camera);

        const ndc = worldPosition.clone().project(this.camera);
        const canvas = this.renderer.domElement;
        const rawX = Math.round((ndc.x * 0.5 + 0.5) * (canvas.width - 1));
        const rawY = Math.round((ndc.y * 0.5 + 0.5) * (canvas.height - 1));
        const x = Math.max(0, Math.min(canvas.width - 1, rawX));
        const y = Math.max(0, Math.min(canvas.height - 1, rawY));

        const gl = this.renderer.getContext();
        const pixel = new Uint8Array(4);
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

        const r = pixel[0];
        const g = pixel[1];
        const b = pixel[2];
        const hex = '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0').toUpperCase()).join('');
        return { r, g, b, hex };
    }

    showColorPanel(title, html) { // Show the color panel in the UI with the specified title and HTML content, which is used to display information about the colors of selected tiles or other relevant details for the illusion. This method updates the inner HTML of the color output element and makes the panel visible.
        const { colorPanel, colorOutput } = this.ui;
        if (!colorPanel || !colorOutput) {
            return;
        }

        colorOutput.innerHTML = `
            <div style="font-weight: bold; font-size: 16px; margin-bottom: 10px;">${title}</div>
            ${html}
        `;
        colorPanel.classList.add('show');
    }

    hideColorPanel() { // Hide the color panel in the UI and clear its content. This method removes the 'show' class from the color panel to hide it and clears the inner HTML of the color output element to reset it for future use.
        const { colorPanel, colorOutput } = this.ui;
        if (!colorPanel || !colorOutput) {
            return;
        }

        colorPanel.classList.remove('show');
        colorOutput.innerHTML = '';
    }
}
