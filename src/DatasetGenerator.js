import * as THREE from 'three';

export class DatasetGenerator {
    constructor(options = {}) {
        this.imageSize = options.imageSize || 512;
        this.imagesPerIllusion = options.imagesPerIllusion || 500;
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            preserveDrawingBuffer: true
        });
        this.renderer.setSize(this.imageSize, this.imageSize);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.isGenerating = false;
    }

    // ── Utility helpers ──────────────────────────────────────────────

    rand(min, max) {
        return min + Math.random() * (max - min);
    }

    randInt(min, max) {
        return Math.floor(this.rand(min, max + 1));
    }

    padIndex(i, digits = 3) {
        return String(i).padStart(digits, '0');
    }

    canvasToBlob(canvas) {
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Canvas toBlob failed'));
                } else {
                    resolve(blob);
                }
            }, 'image/png');
        });
    }

    async saveFile(dirHandle, filename, content) {
        const maxRetries = 3;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(content);
                await writable.close();
                return;
            } catch (error) {
                if (attempt < maxRetries - 1) {
                    await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
                } else {
                    throw error;
                }
            }
        }
    }

    async saveBlob(dirHandle, filename, blob) {
        await this.saveFile(dirHandle, filename, blob);
    }

    async saveJSON(dirHandle, filename, data) {
        await this.saveFile(dirHandle, filename, JSON.stringify(data, null, 2));
    }

    disposeScene(scene) {
        scene.traverse((obj) => {
            if (obj.geometry) {
                obj.geometry.dispose();
            }

            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach((m) => m.dispose());
                } else {
                    if (obj.material.map) {
                        obj.material.map.dispose();
                    }

                    obj.material.dispose();
                }
            }
        });
    }

    renderScene(scene, camera) {
        this.renderer.render(scene, camera);
        return this.renderer.domElement;
    }

    // ── Checker Shadow ───────────────────────────────────────────────

    generateCheckerShadowParams() {
        return {
            light_intensity: parseFloat(this.rand(1, 10).toFixed(2)),
            shadow_opacity: parseFloat(this.rand(0.15, 0.6).toFixed(2)),
            ambient_intensity: parseFloat(this.rand(0.01, 0.2).toFixed(2)),
            board_size: this.randInt(4, 7),
            is_illusion_active: Math.random() < 0.8
        };
    }

    buildCheckerShadowScene(params) {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);

        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.set(5, 6, 8);
        camera.lookAt(0, 0, 0);

        const boardSize = params.board_size;
        const tileSize = 1;

        for (let x = 0; x < boardSize; x++) {
            for (let z = 0; z < boardSize; z++) {
                const color = (x + z) % 2 === 0 ? 0xcecece : 0x787878;
                const geometry = new THREE.BoxGeometry(tileSize, 0.5, tileSize);
                const material = new THREE.MeshBasicMaterial({ color });
                const tile = new THREE.Mesh(geometry, material);
                tile.position.set(
                    x * tileSize - (boardSize * tileSize) / 2 + tileSize / 2,
                    -0.05,
                    z * tileSize - (boardSize * tileSize) / 2 + tileSize / 2
                );
                scene.add(tile);
            }
        }

        const shadowPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(boardSize * 1.2, boardSize * 1.2),
            new THREE.ShadowMaterial({ opacity: params.shadow_opacity })
        );
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.y = 0.21;
        shadowPlane.receiveShadow = true;
        scene.add(shadowPlane);

        if (params.is_illusion_active) {
            const cylinder = new THREE.Mesh(
                new THREE.CylinderGeometry(1, 1, 3, 32),
                new THREE.MeshBasicMaterial({ color: 0x6b9e6f })
            );
            cylinder.position.set(1.5, 1.5, -1.5);
            cylinder.castShadow = true;
            scene.add(cylinder);
        }

        const spotlight = new THREE.SpotLight(0xffffff, params.light_intensity);
        spotlight.position.set(4, 8, -10);
        spotlight.target.position.set(0, 0, 0);
        spotlight.angle = Math.PI / 6;
        spotlight.penumbra = 0.3;
        spotlight.castShadow = true;
        spotlight.shadow.bias = -0.002;
        spotlight.shadow.mapSize.set(2048, 2048);
        spotlight.shadow.camera.near = 5;
        spotlight.shadow.camera.far = 30;
        scene.add(spotlight);
        scene.add(spotlight.target);

        const ambient = new THREE.AmbientLight(0xffffff, params.ambient_intensity);
        scene.add(ambient);

        return { scene, camera };
    }

    // ── Mach Band ────────────────────────────────────────────────────

    generateMachBandParams() {
        return {
            contrast: parseFloat(this.rand(0.3, 1.0).toFixed(2)),
            band_count: this.randInt(4, 10),
            min_luminance: parseFloat(this.rand(0.05, 0.3).toFixed(2)),
            is_illusion_active: Math.random() < 0.8
        };
    }

    buildMachBandScene(params) {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);

        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.set(0, 0, 8.2);
        camera.lookAt(0, 0, 0);

        const backdrop = new THREE.Mesh(
            new THREE.PlaneGeometry(14, 9),
            new THREE.MeshBasicMaterial({ color: 0xf8fafc })
        );
        backdrop.position.z = -1;
        scene.add(backdrop);

        const texCanvas = document.createElement('canvas');
        texCanvas.width = 1600;
        texCanvas.height = 420;
        const ctx = texCanvas.getContext('2d');
        const imageData = ctx.createImageData(texCanvas.width, texCanvas.height);

        const bandCount = params.band_count;
        const segmentWidth = texCanvas.width / bandCount;

        for (let x = 0; x < texCanvas.width; x++) {
            let luminance;

            if (params.is_illusion_active) {
                const segmentIndex = Math.min(bandCount - 1, Math.floor(x / segmentWidth));
                const t = segmentIndex / (bandCount - 1);
                const value = params.min_luminance + t * params.contrast * (1 - params.min_luminance);
                luminance = Math.round(value * 255);
            } else {
                const t = x / texCanvas.width;
                const value = params.min_luminance + t * params.contrast * (1 - params.min_luminance);
                luminance = Math.round(value * 255);
            }

            for (let y = 0; y < texCanvas.height; y++) {
                const idx = (y * texCanvas.width + x) * 4;
                imageData.data[idx] = luminance;
                imageData.data[idx + 1] = luminance;
                imageData.data[idx + 2] = luminance;
                imageData.data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);

        const texture = new THREE.CanvasTexture(texCanvas);
        texture.colorSpace = THREE.SRGBColorSpace;

        const bandPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(9.2, 4.4),
            new THREE.MeshBasicMaterial({ map: texture })
        );
        bandPlane.position.y = 0.5;
        scene.add(bandPlane);

        const frame = new THREE.LineLoop(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-4.6, -1.7, 0.03),
                new THREE.Vector3(4.6, -1.7, 0.03),
                new THREE.Vector3(4.6, 2.7, 0.03),
                new THREE.Vector3(-4.6, 2.7, 0.03)
            ]),
            new THREE.LineBasicMaterial({ color: 0x0f172a })
        );
        scene.add(frame);

        return { scene, camera };
    }

    // ── Ponzo ────────────────────────────────────────────────────────

    generatePonzoParams() {
        return {
            rail_convergence: parseFloat(this.rand(0.15, 0.6).toFixed(2)),
            bar_length: parseFloat(this.rand(1.5, 3.5).toFixed(2)),
            bar_separation: parseFloat(this.rand(1.0, 3.0).toFixed(2)),
            is_illusion_active: Math.random() < 0.8
        };
    }

    buildPonzoScene(params) {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);

        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.set(0, 2.8, 8.3);
        camera.lookAt(0, 0.4, 0);

        const light = new THREE.DirectionalLight(0xffffff, 1.1);
        light.position.set(5, 5, -5);
        light.castShadow = true;
        light.shadow.radius = 6;
        light.shadow.mapSize.set(2048, 2048);
        scene.add(light);

        const ambient = new THREE.AmbientLight(0xffffff, 0.35);
        scene.add(ambient);

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(18, 18),
            new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.95, metalness: 0 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1.6;
        floor.receiveShadow = true;
        scene.add(floor);

        if (params.is_illusion_active) {
            const conv = params.rail_convergence;
            const railMaterial = new THREE.LineBasicMaterial({ color: 0x334155 });
            const leftPoints = [
                new THREE.Vector3(-3.2, -1.2, 1.2),
                new THREE.Vector3(-conv, 2.4, -2.6)
            ];
            const rightPoints = [
                new THREE.Vector3(3.2, -1.2, 1.2),
                new THREE.Vector3(conv, 2.4, -2.6)
            ];
            scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(leftPoints), railMaterial));
            scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(rightPoints), railMaterial.clone()));
        }

        const halfSep = params.bar_separation / 2;
        const barGeometry = new THREE.BoxGeometry(params.bar_length, 0.18, 0.18);

        const topBar = new THREE.Mesh(
            barGeometry,
            new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.45, metalness: 0.1 })
        );
        topBar.position.set(0, halfSep * 0.8, -halfSep * 0.5);
        topBar.castShadow = true;
        scene.add(topBar);

        const bottomBar = new THREE.Mesh(
            barGeometry.clone(),
            new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.45, metalness: 0.1 })
        );
        bottomBar.position.set(0, -halfSep * 0.3, halfSep * 0.3);
        bottomBar.castShadow = true;
        scene.add(bottomBar);

        return { scene, camera };
    }

    // ── Rotating Snakes ──────────────────────────────────────────────

    generateRotatingSnakesParams() {
        return {
            grid_rows: this.randInt(2, 4),
            grid_cols: this.randInt(3, 5),
            ring_count: this.randInt(3, 5),
            capsule_scale: parseFloat(this.rand(0.7, 1.3).toFixed(2)),
            is_illusion_active: Math.random() < 0.8
        };
    }

    buildRotatingSnakesScene(params) {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x49aef2);

        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.set(0, 9.5, 0.01);
        camera.lookAt(0, 0, 0);

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(32, 22),
            new THREE.MeshBasicMaterial({ color: 0x49aef2 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.2;
        scene.add(floor);

        const texCanvas = document.createElement('canvas');
        texCanvas.width = 64;
        texCanvas.height = 256;
        const texCtx = texCanvas.getContext('2d');
        texCtx.fillStyle = '#A020F0';
        texCtx.fillRect(0, 0, 64, Math.floor(256 * 0.30));
        texCtx.fillStyle = '#0f0f0f';
        texCtx.fillRect(0, Math.floor(256 * 0.30), 64, Math.floor(256 * 0.40));
        texCtx.fillStyle = '#F4E30F';
        texCtx.fillRect(0, Math.floor(256 * 0.70), 64, Math.ceil(256 * 0.30));

        const texture = new THREE.CanvasTexture(texCanvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;

        const sideMaterial = new THREE.MeshBasicMaterial({ map: texture });
        const topCapMaterial = new THREE.MeshBasicMaterial({ color: 0xf4e30f });
        const bottomCapMaterial = new THREE.MeshBasicMaterial({ color: 0xa020f0 });
        const materials = [sideMaterial, topCapMaterial, bottomCapMaterial];

        const baseRadius = 0.105;
        const baseLength = 0.44;
        const geometry = new THREE.CylinderGeometry(baseRadius, baseRadius, baseLength, 22, 1, false);
        const baseAxis = new THREE.Vector3(0, 1, 0);
        const tangent = new THREE.Vector3();

        const rows = params.grid_rows;
        const cols = params.grid_cols;
        const spacingX = 3.18;
        const spacingZ = 3.0;
        const offsetX = ((cols - 1) * spacingX) * 0.5;
        const offsetZ = ((rows - 1) * spacingZ) * 0.5;

        const allRings = [
            { radius: 1.12, segments: 28, scale: 1.0, phase: 0.12 },
            { radius: 0.77, segments: 23, scale: 0.83, phase: 0.58 },
            { radius: 0.49, segments: 18, scale: 0.68, phase: 1.06 },
            { radius: 0.28, segments: 13, scale: 0.54, phase: 1.58 },
            { radius: 0.15, segments: 9, scale: 0.42, phase: 2.0 }
        ];
        const rings = allRings.slice(0, params.ring_count);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const cx = col * spacingX - offsetX;
                const cz = row * spacingZ - offsetZ;

                for (const ring of rings) {
                    for (let i = 0; i < ring.segments; i++) {
                        let theta;

                        if (params.is_illusion_active) {
                            theta = (i / ring.segments) * Math.PI * 2 + ring.phase;
                        } else {
                            theta = Math.random() * Math.PI * 2;
                        }

                        const x = cx + Math.cos(theta) * ring.radius;
                        const z = cz + Math.sin(theta) * ring.radius;

                        const snake = new THREE.Mesh(geometry, materials);
                        const s = ring.scale * params.capsule_scale;
                        snake.scale.setScalar(s);
                        snake.position.set(x, 0.01 + 0.105 * s, z);

                        tangent.set(-Math.sin(theta), 0, Math.cos(theta)).normalize();
                        snake.quaternion.setFromUnitVectors(baseAxis, tangent);
                        scene.add(snake);
                    }
                }
            }
        }

        return { scene, camera };
    }

    // ── Zollner ──────────────────────────────────────────────────────

    generateZollnerParams() {
        return {
            cross_angle: parseFloat(this.rand(15, 55).toFixed(1)),
            stroke_length: parseFloat(this.rand(0.3, 1.0).toFixed(2)),
            line_spacing: parseFloat(this.rand(0.5, 1.5).toFixed(2)),
            stroke_spacing: parseFloat(this.rand(0.6, 1.3).toFixed(2)),
            is_illusion_active: Math.random() < 0.8
        };
    }

    buildZollnerScene(params) {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);

        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.set(0, 2.0, 7.6);
        camera.lookAt(0, 0, 0);

        const light = new THREE.DirectionalLight(0xffffff, 1.1);
        light.position.set(5, 5, -5);
        scene.add(light);

        const ambient = new THREE.AmbientLight(0xffffff, 0.35);
        scene.add(ambient);

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(18, 14),
            new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.92, metalness: 0 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -2.2;
        scene.add(floor);

        const mainMaterial = new THREE.LineBasicMaterial({ color: 0x0f172a });
        const halfSpacing = params.line_spacing / 2;
        const yValues = [halfSpacing, -halfSpacing];

        yValues.forEach((y, lineIndex) => {
            const points = [new THREE.Vector3(-4.6, y, 0), new THREE.Vector3(4.6, y, 0)];
            scene.add(new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(points),
                mainMaterial.clone()
            ));

            if (params.is_illusion_active) {
                const angle = lineIndex === 0
                    ? THREE.MathUtils.degToRad(params.cross_angle)
                    : THREE.MathUtils.degToRad(-params.cross_angle);
                const strokeMaterial = new THREE.LineBasicMaterial({ color: 0x334155 });

                for (let x = -4.1; x <= 4.1; x += params.stroke_spacing) {
                    const dx = Math.cos(angle) * params.stroke_length * 0.5;
                    const dy = Math.sin(angle) * params.stroke_length * 0.5;
                    const start = new THREE.Vector3(x - dx, y - dy, 0);
                    const end = new THREE.Vector3(x + dx, y + dy, 0);
                    scene.add(new THREE.Line(
                        new THREE.BufferGeometry().setFromPoints([start, end]),
                        strokeMaterial.clone()
                    ));
                }
            }
        });

        return { scene, camera };
    }

    // ── Main generation loop ─────────────────────────────────────────

    async generateAll(dirHandle, statusCallback = () => {}) {
        if (this.isGenerating) {
            return;
        }

        this.isGenerating = true;

        const illusions = [
            {
                name: 'checker_shadow',
                generateParams: () => this.generateCheckerShadowParams(),
                buildScene: (p) => this.buildCheckerShadowScene(p)
            },
            {
                name: 'mach_band',
                generateParams: () => this.generateMachBandParams(),
                buildScene: (p) => this.buildMachBandScene(p)
            },
            {
                name: 'ponzo',
                generateParams: () => this.generatePonzoParams(),
                buildScene: (p) => this.buildPonzoScene(p)
            },
            {
                name: 'rotating_snakes',
                generateParams: () => this.generateRotatingSnakesParams(),
                buildScene: (p) => this.buildRotatingSnakesScene(p)
            },
            {
                name: 'zollner',
                generateParams: () => this.generateZollnerParams(),
                buildScene: (p) => this.buildZollnerScene(p)
            }
        ];

        const totalImages = illusions.length * this.imagesPerIllusion;
        let globalCount = 0;

        try {
            for (const illusion of illusions) {
                let subDir = await dirHandle.getDirectoryHandle(illusion.name, { create: true });
                const labels = [];

                for (let i = 0; i < this.imagesPerIllusion; i++) {
                    if (i > 0 && i % 50 === 0) {
                        subDir = await dirHandle.getDirectoryHandle(illusion.name, { create: true });
                    }

                    const params = illusion.generateParams();
                    const filename = `${illusion.name}_${this.padIndex(i + 1)}.png`;

                    globalCount++;
                    statusCallback(
                        `[${globalCount}/${totalImages}] ${illusion.name} ${i + 1}/${this.imagesPerIllusion}`
                    );

                    const { scene, camera } = illusion.buildScene(params);
                    this.renderScene(scene, camera);

                    const blob = await this.canvasToBlob(this.renderer.domElement);
                    await this.saveBlob(subDir, filename, blob);

                    labels.push({ image: filename, ...params });
                    this.disposeScene(scene);

                    if (i % 5 === 0) {
                        await new Promise((resolve) => setTimeout(resolve, 0));
                    }
                }

                subDir = await dirHandle.getDirectoryHandle(illusion.name, { create: true });
                await this.saveJSON(subDir, `${illusion.name}_labels.json`, labels);
                statusCallback(`Completed ${illusion.name}: ${labels.length} images saved.`);
            }

            statusCallback(
                `Dataset generation complete! ${totalImages} images across ${illusions.length} illusions.`
            );
        } catch (error) {
            statusCallback(`Generation error: ${error.message}`);
            console.error('Dataset generation error:', error);
        } finally {
            this.isGenerating = false;
        }
    }

    async generateSingle(dirHandle, illusionKey, statusCallback = () => {}) {
        if (this.isGenerating) {
            return;
        }

        const config = {
            checker_shadow: {
                generateParams: () => this.generateCheckerShadowParams(),
                buildScene: (p) => this.buildCheckerShadowScene(p)
            },
            mach_band: {
                generateParams: () => this.generateMachBandParams(),
                buildScene: (p) => this.buildMachBandScene(p)
            },
            ponzo: {
                generateParams: () => this.generatePonzoParams(),
                buildScene: (p) => this.buildPonzoScene(p)
            },
            rotating_snakes: {
                generateParams: () => this.generateRotatingSnakesParams(),
                buildScene: (p) => this.buildRotatingSnakesScene(p)
            },
            zollner: {
                generateParams: () => this.generateZollnerParams(),
                buildScene: (p) => this.buildZollnerScene(p)
            }
        };

        const illusion = config[illusionKey];

        if (!illusion) {
            statusCallback(`Unknown illusion: ${illusionKey}`);
            return;
        }

        this.isGenerating = true;

        try {
            let subDir = await dirHandle.getDirectoryHandle(illusionKey, { create: true });
            const labels = [];

            for (let i = 0; i < this.imagesPerIllusion; i++) {
                if (i > 0 && i % 50 === 0) {
                    subDir = await dirHandle.getDirectoryHandle(illusionKey, { create: true });
                }

                const params = illusion.generateParams();
                const filename = `${illusionKey}_${this.padIndex(i + 1)}.png`;

                statusCallback(`[${i + 1}/${this.imagesPerIllusion}] ${illusionKey}`);

                const { scene, camera } = illusion.buildScene(params);
                this.renderScene(scene, camera);

                const blob = await this.canvasToBlob(this.renderer.domElement);
                await this.saveBlob(subDir, filename, blob);

                labels.push({ image: filename, ...params });
                this.disposeScene(scene);

                if (i % 5 === 0) {
                    await new Promise((resolve) => setTimeout(resolve, 0));
                }
            }

            subDir = await dirHandle.getDirectoryHandle(illusionKey, { create: true });
            await this.saveJSON(subDir, `${illusionKey}_labels.json`, labels);
            statusCallback(`Done! ${labels.length} ${illusionKey} images saved.`);
        } catch (error) {
            statusCallback(`Generation error: ${error.message}`);
            console.error('Dataset generation error:', error);
        } finally {
            this.isGenerating = false;
        }
    }

    dispose() {
        this.renderer.dispose();
    }
}
