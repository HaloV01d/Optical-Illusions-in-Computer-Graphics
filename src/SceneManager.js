import { CheckerShadowIllusion } from './Checker_Shadow.js';
import { MachBandIllusion } from './MachBand.js';
import { PonzoIllusion } from './Ponzo.js';
import { ZollnerIllusion } from './Zollner.js';
import { RotatingSnakesIllusion } from './RotatingSnakes.js';

class SceneManager { // The SceneManager class is responsible for managing the different illusions, handling the UI for switching between illusions, and updating the guide panel with instructions for each illusion. It maintains a reference to the current illusion and provides methods to switch illusions and update the UI accordingly.
    constructor() {
        this.current = null;
        this.currentKey = null;
        this.datasetDirHandle = null;
        this.isCapturing = false;

        this.factories = {
            checker: () => new CheckerShadowIllusion({ container: document.body }),
            mach: () => new MachBandIllusion({ container: document.body }),
            ponzo: () => new PonzoIllusion({ container: document.body }),
            zollner: () => new ZollnerIllusion({ container: document.body }),
            snakes: () => new RotatingSnakesIllusion({ container: document.body })
        };

        this.switcherNode = document.getElementById('illusionPanel');
        this.datasetNode = document.getElementById('datasetPanel');
        this.guideNode = document.getElementById('guidePanel');

        this.illusionNames = {
            checker: 'checker-shadow',
            mach: 'mach-bands',
            ponzo: 'ponzo',
            zollner: 'zollner',
            snakes: 'rotating-snakes'
        };

        this.boundPickDatasetFolder = this.pickDatasetFolder.bind(this);
        this.boundCaptureCurrentIllusion = this.captureCurrentIllusion.bind(this);
        this.boundCaptureAllIllusions = this.captureAllIllusions.bind(this);
    }

    init() {
        this.renderSwitcher();
        this.renderDatasetPanel();
        this.switchTo('checker');
    }

    renderSwitcher() {
        if (!this.switcherNode) {
            return;
        }

        this.switcherNode.innerHTML = `
            <div class="panel-title">Illusion Picker</div>
            <select id="illusionSelect" class="illusion-select" aria-label="Select illusion">
                <option value="checker">Checker Shadow</option>
                <option value="mach">Mach Bands</option>
                <option value="ponzo">Ponzo</option>
                <option value="zollner">Zollner</option>
                <option value="snakes">Rotating Snakes</option>
            </select>
        `;

        const select = this.switcherNode.querySelector('#illusionSelect');
        select.addEventListener('change', () => {
            if (select.value) {
                this.switchTo(select.value);
            }
        });
    }

    renderDatasetPanel() {
        if (!this.datasetNode) {
            return;
        }

        this.datasetNode.innerHTML = `
            <div class="panel-title">Dataset Capture</div>
            <div class="dataset-copy">Save PNG snapshots of the active illusion. Pick your local dataset folder once, then capture as needed.</div>
            <div class="dataset-actions">
                <button id="chooseDatasetBtn" class="dataset-btn" type="button">Choose dataset folder</button>
                <button id="captureDatasetBtn" class="dataset-btn" type="button">Capture current illusion</button>
                <button id="captureAllBtn" class="dataset-btn" type="button">Capture all illusions</button>
            </div>
            <div id="datasetStatus" class="dataset-status" role="status" aria-live="polite"></div>
        `;

        const chooseButton = this.datasetNode.querySelector('#chooseDatasetBtn');
        const captureButton = this.datasetNode.querySelector('#captureDatasetBtn');

        if (chooseButton) {
            chooseButton.addEventListener('click', this.boundPickDatasetFolder);
        }

        if (captureButton) {
            captureButton.addEventListener('click', this.boundCaptureCurrentIllusion);
        }

        const captureAllButton = this.datasetNode.querySelector('#captureAllBtn');
        if (captureAllButton) {
            captureAllButton.addEventListener('click', this.boundCaptureAllIllusions);
        }

        this.setDatasetStatus('Choose your dataset folder to enable direct saves.');
    }

    setDatasetStatus(message) {
        if (!this.datasetNode) {
            return;
        }

        const statusNode = this.datasetNode.querySelector('#datasetStatus');
        if (statusNode) {
            statusNode.textContent = message;
        }
    }

    getDatasetFilename() {
        const slug = this.illusionNames[this.currentKey] || this.currentKey || 'illusion';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        return `${slug}-${timestamp}.png`;
    }

    getRendererCanvas() {
        if (!this.current || !this.current.renderer || !this.current.renderer.domElement) {
            return null;
        }

        this.current.renderer.render(this.current.scene, this.current.camera);
        return this.current.renderer.domElement;
    }

    async canvasToBlob(canvas) {
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Unable to capture image from canvas.'));
                    return;
                }

                resolve(blob);
            }, 'image/png');
        });
    }

    async pickDatasetFolder() {
        if (!window.showDirectoryPicker) {
            this.setDatasetStatus('Folder picker unsupported here. Capture uses browser download instead.');
            return;
        }

        try {
            const rootHandle = await window.showDirectoryPicker({
                id: 'optical-illusions-dataset',
                mode: 'readwrite'
            });

            this.datasetDirHandle = await rootHandle.getDirectoryHandle('dataset', { create: true });
            this.setDatasetStatus('Dataset folder ready. Captures save directly into dataset.');
        } catch (error) {
            if (error && error.name === 'AbortError') {
                this.setDatasetStatus('Folder selection canceled.');
                return;
            }

            this.setDatasetStatus('Could not open dataset folder. Try again.');
            console.error(error);
        }
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    }

    async saveBlobToDataset(blob, filename) {
        if (!this.datasetDirHandle) {
            this.downloadBlob(blob, filename);
            this.setDatasetStatus(`Downloaded ${filename}. Select dataset folder for direct saves.`);
            return;
        }

        const permission = await this.datasetDirHandle.queryPermission({ mode: 'readwrite' });
        const needsRequest = permission !== 'granted';
        if (needsRequest) {
            const requested = await this.datasetDirHandle.requestPermission({ mode: 'readwrite' });
            if (requested !== 'granted') {
                this.downloadBlob(blob, filename);
                this.setDatasetStatus(`Permission denied. Downloaded ${filename} instead.`);
                return;
            }
        }

        const fileHandle = await this.datasetDirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        this.setDatasetStatus(`Saved ${filename} to dataset folder.`);
    }

    waitFrames(n) {
        return new Promise((resolve) => {
            let count = 0;
            const tick = () => {
                count++;
                if (count >= n) {
                    resolve();
                } else {
                    requestAnimationFrame(tick);
                }
            };
            requestAnimationFrame(tick);
        });
    }

    async captureAllIllusions() {
        if (this.isCapturing) {
            return;
        }

        this.isCapturing = true;
        const originalKey = this.currentKey;
        const keys = Object.keys(this.factories);
        let saved = 0;

        try {
            for (const key of keys) {
                this.setDatasetStatus(`Capturing ${this.illusionNames[key] || key}\u2026 (${saved + 1}/${keys.length})`);
                this.switchTo(key);
                await this.waitFrames(3);

                const canvas = this.getRendererCanvas();
                if (!canvas) {
                    continue;
                }

                const slug = this.illusionNames[key] || key;
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `${slug}-${timestamp}.png`;
                const blob = await this.canvasToBlob(canvas);
                await this.saveBlobToDataset(blob, filename);
                saved++;
            }

            this.setDatasetStatus(`Captured all ${saved} illusion${saved !== 1 ? 's' : ''}.`);
        } catch (error) {
            this.setDatasetStatus('Batch capture failed. Check the browser console.');
            console.error(error);
        } finally {
            this.isCapturing = false;
            if (originalKey) {
                this.switchTo(originalKey);
            }
        }
    }

    async captureCurrentIllusion() {
        if (this.isCapturing) {
            return;
        }

        const canvas = this.getRendererCanvas();
        if (!canvas) {
            this.setDatasetStatus('No active illusion available to capture yet.');
            return;
        }

        this.isCapturing = true;
        this.setDatasetStatus('Capturing image...');

        try {
            const filename = this.getDatasetFilename();
            const blob = await this.canvasToBlob(canvas);
            await this.saveBlobToDataset(blob, filename);
        } catch (error) {
            this.setDatasetStatus('Capture failed. Check the browser console for details.');
            console.error(error);
        } finally {
            this.isCapturing = false;
        }
    }

    switchTo(key) { // Switch to a different illusion based on the provided key. This method checks if the requested illusion is already active, and if not, it disposes of the current illusion (if any), creates a new instance of the requested illusion using the factory method, updates the switcher button states, updates the guide panel with instructions for the new illusion, and mounts the new illusion to set up its scene and interactions.
        if (this.currentKey === key) {
            return;
        }

        if (!this.factories[key]) {
            throw new Error(`Unknown illusion key: ${key}`);
        }

        if (this.current) {
            this.current.dispose();
            this.current = null;
        }

        this.current = this.factories[key]();
        this.currentKey = key;
        this.updateSwitcherState(key);
        this.updateGuidePanel();
        this.current.mount();
    }

    updateSwitcherState(activeKey) {
        if (!this.switcherNode) {
            return;
        }

        const select = this.switcherNode.querySelector('#illusionSelect');
        if (select) {
            select.value = activeKey;
        }
    }

    updateGuidePanel() { // Update the guide panel with the instructions for the current illusion. This method checks if there is a current illusion and if it has a getGuideMarkup method, and if so, it sets the inner HTML of the guide panel to the markup returned by that method. If there is no current illusion or it does not have a getGuideMarkup method, it clears the guide panel content.
        if (!this.guideNode || !this.current) {
            return;
        }

        if (typeof this.current.getGuideMarkup === 'function') {
            this.guideNode.innerHTML = this.current.getGuideMarkup();
            return;
        }

        this.guideNode.innerHTML = '';
    }
}

const manager = new SceneManager();
manager.init();
