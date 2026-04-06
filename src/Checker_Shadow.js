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

    onLightChanged() {
        if (this.selectedTiles.length === 2) {
            this.compareTiles();
        }
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

    compareTiles() { // Compare the apparent rendered color and the base material color of the two selected tiles. The apparent color reflects current lighting intensity, hue, saturation, and shadow, while the base color is the raw material value.
        const [tileA, tileB] = this.selectedTiles;

        const baseA = colorToRGB(tileA.userData.baseColor || tileA.material.color);
        const baseB = colorToRGB(tileB.userData.baseColor || tileB.material.color);

        const posA = new THREE.Vector3();
        tileA.getWorldPosition(posA);
        posA.y += 0.26;

        const posB = new THREE.Vector3();
        tileB.getWorldPosition(posB);
        posB.y += 0.26;

        const apparentA = this.getPixelColor(posA);
        const apparentB = this.getPixelColor(posB);

        const baseSame = baseA.hex === baseB.hex;
        const apparentSame = apparentA.hex === apparentB.hex;

        const html = `
            <div class="color-display">
                <div class="color-label">Tile A — Apparent</div>
                <div><span class="color-box" style="background-color: ${apparentA.hex};"></span></div>
                <div>RGB: (${apparentA.r}, ${apparentA.g}, ${apparentA.b})</div>
                <div>HEX: ${apparentA.hex}</div>
            </div>
            <div class="color-display">
                <div class="color-label">Tile B — Apparent</div>
                <div><span class="color-box" style="background-color: ${apparentB.hex};"></span></div>
                <div>RGB: (${apparentB.r}, ${apparentB.g}, ${apparentB.b})</div>
                <div>HEX: ${apparentB.hex}</div>
            </div>
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.2);">
                <div style="font-size: 12px; color: #aaa;">Apparent colors match?</div>
                <div style="font-weight: bold; color: ${apparentSame ? '#4ade80' : '#f87171'}; margin-bottom: 8px;">
                    ${apparentSame ? 'YES — look identical under this light' : 'NO — look different under this light'}
                </div>
                <div style="font-size: 12px; color: #aaa;">Base material colors match?</div>
                <div style="font-weight: bold; color: ${baseSame ? '#4ade80' : '#f87171'};">
                    ${baseSame ? `YES — same base color (${baseA.hex})` : `NO — ${baseA.hex} vs ${baseB.hex}`}
                </div>
            </div>
        `;

        this.showColorPanel('Color Comparison', html);
    }
}
