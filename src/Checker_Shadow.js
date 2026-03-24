import * as THREE from 'three';
import { IllusionBase, colorToRGB } from './IllusionBase.js';

const selectionColors = [0x2563eb, 0xf97316];

export class CheckerShadowIllusion extends IllusionBase { // Implementation of the Checker Shadow illusion, where two tiles of the same color appear different due to a shadow and surrounding context
    constructor(options = {}) {
        super(options);
        this.selectedTiles = [];
        this.boardGroup = new THREE.Group();
        this.camera.position.set(5, 6, 8);
    }

    getTitle() { // Return the title of the illusion to be displayed in the UI
        return 'Checker Shadow Illusion';
    }

    getGuideMarkup() { // Return the HTML markup for the guide panel, including instructions for interaction
        return `
            <div class="guide-title">Checker Shadow</div>
            <div class="guide-copy">Click two tiles and compare their true base colors. The shadow and context can trick your perception.</div>
        `;
    }

    buildScene() { // Set up the 3D scene with a checkerboard pattern, a shadow-casting cylinder, and appropriate lighting to create the illusion
        const boardSize = 5;
        const tileSize = 1;

        for (let x = 0; x < boardSize; x += 1) {
            for (let z = 0; z < boardSize; z += 1) {
                const color = (x + z) % 2 === 0 ? 0xcecece : 0x787878;
                const geometry = new THREE.BoxGeometry(tileSize, 0.5, tileSize);
                const material = new THREE.MeshStandardMaterial({ color });
                const tile = new THREE.Mesh(geometry, material);

                tile.userData.baseColor = new THREE.Color(color);
                tile.position.set(
                    x * tileSize - (boardSize * tileSize) / 2 + tileSize / 2,
                    -0.05,
                    z * tileSize - (boardSize * tileSize) / 2 + tileSize / 2
                );
                tile.receiveShadow = true;
                this.boardGroup.add(tile);
            }
        }

        this.scene.add(this.boardGroup);

        const cylinder = new THREE.Mesh(
            new THREE.CylinderGeometry(1, 1, 3, 32),
            new THREE.MeshStandardMaterial({ color: 0x8ab090 })
        );
        cylinder.position.set(1.2, 1.5, -1.5);
        cylinder.castShadow = true;
        this.scene.add(cylinder);
    }

    onDispose() { // Clean up any resources or event listeners when the illusion is disposed
        this.clearSelectedTiles();
        this.hideColorPanel();
    }

    handlePointerDown(event) { // Handle pointer down events to allow the user to select tiles and compare their colors
        const intersects = this.getIntersections(event, this.boardGroup.children);
        if (!intersects.length) {
            return;
        }

        const tile = this.getTileFromHitObject(intersects[0].object);
        if (!tile) {
            return;
        }

        if (this.selectedTiles.length === 2) {
            this.clearSelectedTiles();
        }

        if (this.selectedTiles.includes(tile)) {
            return;
        }

        this.selectedTiles.push(tile);
        this.highlightTile(tile, this.selectedTiles.length - 1);

        if (this.selectedTiles.length === 2) {
            this.compareTiles();
        }
    }

    getTileFromHitObject(object) { // Traverse up the object hierarchy to find the tile mesh that was clicked, since the hit object may be a child of the tile (e.g., the selection outline)
        let current = object;
        while (current && current.parent && current.parent !== this.boardGroup) {
            current = current.parent;
        }

        return current && current.parent === this.boardGroup ? current : null;
    }

    highlightTile(tile, selectionIndex) { // Highlight the selected tile by adding an outline, and set the outline color based on the selection index (first or second selection)
        if (!tile.userData.selectionOutline) {
            const outlineGeometry = new THREE.EdgesGeometry(tile.geometry);
            const outlineMaterial = new THREE.LineBasicMaterial({
                color: selectionColors[selectionIndex] || selectionColors[0]
            });
            const outline = new THREE.LineSegments(outlineGeometry, outlineMaterial);
            outline.scale.setScalar(1.03);
            outline.visible = false;
            tile.add(outline);
            tile.userData.selectionOutline = outline;
        }

        tile.userData.selectionOutline.material.color.setHex(selectionColors[selectionIndex] || selectionColors[0]);
        tile.userData.selectionOutline.visible = true;
    }

    clearTileHighlight(tile) { // Clear the highlight from a tile by hiding its selection outline, if it exists
        if (tile.userData.selectionOutline) {
            tile.userData.selectionOutline.visible = false;
        }
    }

    clearSelectedTiles() { // Clear the current selection of tiles and remove their highlights
        this.selectedTiles.forEach((tile) => this.clearTileHighlight(tile));
        this.selectedTiles = [];
    }

    compareTiles() { // Compare the base colors of the two selected tiles and display the results in a color panel, showing both RGB and HEX values and whether they are the same color
        const [tileA, tileB] = this.selectedTiles;
        const colorA = colorToRGB(tileA.userData.baseColor || tileA.material.color);
        const colorB = colorToRGB(tileB.userData.baseColor || tileB.material.color);

        const html = `
            <div class="color-display">
                <div class="color-label">Tile A</div>
                <div><span class="color-box" style="background-color: ${colorA.hex};"></span></div>
                <div>RGB: (${colorA.r}, ${colorA.g}, ${colorA.b})</div>
                <div>HEX: ${colorA.hex}</div>
            </div>
            <div class="color-display">
                <div class="color-label">Tile B</div>
                <div><span class="color-box" style="background-color: ${colorB.hex};"></span></div>
                <div>RGB: (${colorB.r}, ${colorB.g}, ${colorB.b})</div>
                <div>HEX: ${colorB.hex}</div>
            </div>
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.2);">
                <div style="font-size: 12px; color: #aaa;">Are they the same?</div>
                <div style="font-weight: bold; color: ${colorA.hex === colorB.hex ? '#4ade80' : '#f87171'};">
                    ${colorA.hex === colorB.hex ? 'YES - Identical colors!' : 'NO - Different colors'}
                </div>
            </div>
        `;

        this.showColorPanel('Color Comparison', html);
    }
}
