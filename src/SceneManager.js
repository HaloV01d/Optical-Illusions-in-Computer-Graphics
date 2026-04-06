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
            <div class="illusion-actions" role="tablist" aria-label="Select illusion">
                <button class="illusion-btn" data-illusion="checker" role="tab" aria-selected="true">Checker Shadow</button>
                <button class="illusion-btn" data-illusion="mach" role="tab" aria-selected="false">Mach Bands</button>
                <button class="illusion-btn" data-illusion="ponzo" role="tab" aria-selected="false">Ponzo</button>
                <button class="illusion-btn" data-illusion="zollner" role="tab" aria-selected="false">Zollner</button>
                <button class="illusion-btn" data-illusion="snakes" role="tab" aria-selected="false">Rotating Snakes</button>
            </div>
        `;

        const buttons = this.switcherNode.querySelectorAll('.illusion-btn');
        buttons.forEach((button) => {
            button.addEventListener('click', () => {
                const key = button.getAttribute('data-illusion');
                if (!key) {
                    return;
                }

                this.switchTo(key);
            });
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

    updateSwitcherState(activeKey) { // Update the state of the illusion switcher buttons in the UI to reflect which illusion is currently active. This method iterates through the buttons in the switcher panel and toggles the 'is-active' class and 'aria-selected' attribute based on whether the button's associated illusion key matches the active key.
        if (!this.switcherNode) {
            return;
        }

        const buttons = this.switcherNode.querySelectorAll('.illusion-btn');
        buttons.forEach((button) => {
            const buttonKey = button.getAttribute('data-illusion');
            const isActive = buttonKey === activeKey;

            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
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
