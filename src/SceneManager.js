import { CheckerShadowIllusion } from './Checker_Shadow.js';
import { MachBandIllusion } from './MachBand.js';
import { PonzoIllusion } from './Ponzo.js';
import { ZollnerIllusion } from './Zollner.js';
import { RotatingSnakesIllusion } from './RotatingSnakes.js';

class SceneManager { // The SceneManager class is responsible for managing the different illusions, handling the UI for switching between illusions, and updating the guide panel with instructions for each illusion. It maintains a reference to the current illusion and provides methods to switch illusions and update the UI accordingly.
    constructor() {
        this.current = null;
        this.currentKey = null;

        this.factories = {
            checker: () => new CheckerShadowIllusion({ container: document.body }),
            mach: () => new MachBandIllusion({ container: document.body }),
            ponzo: () => new PonzoIllusion({ container: document.body }),
            zollner: () => new ZollnerIllusion({ container: document.body }),
            snakes: () => new RotatingSnakesIllusion({ container: document.body })
        };

        this.switcherNode = document.getElementById('illusionPanel');
        this.guideNode = document.getElementById('guidePanel');
    }

    init() {
        this.renderSwitcher();
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
