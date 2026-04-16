# Optical Illusions in Computer Graphics

Interactive web project for exploring classic visual illusions with real-time 3D graphics.

Built with JavaScript, Three.js, and WebGL.

## Overview

This project demonstrates how perception can be distorted by context, contrast, and spatial cues. Each illusion is presented as an interactive scene with controls and guide text so users can observe the effect and reveal the underlying geometry or measurements.

## Included Illusions

### Checker Shadow

- Click tiles to compare their true colors.
- Lighting and surrounding context can make equal or similar colors appear different.

### Mach Bands

- Uniform grayscale bands create illusory bright and dark rims at boundaries.
- Reveal mode overlays the luminance profile to show the physical stimulus.

### Ponzo

- Two bars with equal length are placed on converging perspective rails.
- Users can guess which looks longer and then reveal true measured equality.

### Zollner

- Long parallel lines are crossed by short angled strokes.
- The diagonals bias orientation perception so the parallels appear to diverge.

### Rotating Snakes

- Static concentric patterns appear to rotate due to local contrast arrangement.
- Reveal controls help confirm the scene is static.

## Core UI Features

- Illusion picker to switch scenes.
- Dataset capture panel to save illusion snapshots as PNG images.
- Guide panel with contextual instructions and reveal/reset actions.
- Lighting controls (shadow softness, HSL, intensity) shared across scenes.
- Color comparison panel used by applicable illusions.

## Dataset Capture

- Use the Dataset Capture panel to save an image of the active illusion.
- Choose a folder once, and the app creates/uses a dataset subfolder for direct saves.
- If folder access is not available in the browser, capture falls back to a normal file download.

## Dataset Generation

- `DatasetGenerator.js` can programmatically render batches of illusion images with randomized parameters (lighting, contrast, geometry, etc.).
- Each generated image is saved as a PNG alongside a JSON label file recording the rendering parameters and whether the illusion effect was active.
- Pre-generated label files live under `dataset/` organized by illusion type (e.g. `dataset/checker_shadow/checker_shadow_labels.json`).

## Project Structure

```text
Optical-Illusions-in-Computer-Graphics/
|-- index.html
|-- package.json
|-- README.md
|-- dataset/
|   |-- checker_shadow/
|   |   `-- checker_shadow_labels.json
|   |-- mach_band/
|   |   `-- mach_band_labels.json
|   |-- ponzo/
|   |   `-- ponzo_labels.json
|   |-- rotating_snakes/
|   |   `-- rotating_snakes_labels.json
|   `-- zollner/
|       `-- zollner_labels.json
`-- src/
    |-- Checker_Shadow.js
    |-- DatasetGenerator.js
    |-- IllusionBase.js
    |-- MachBand.js
    |-- Ponzo.js
    |-- RotatingSnakes.js
    |-- SceneManager.js
    `-- Zollner.js
```

## Getting Started

### Requirements

- Node.js version 18+ (recommended)
- npm

### Install

```bash
npm install
```

### Run (Development)

```bash
npx vite
```

Then open the local URL printed in the terminal (usually http://localhost:5173).

### Build

```bash
npx vite build
```

### Preview Production Build

```bash
npx vite preview
```

## Dependencies

- three: 3D rendering library
- vite: development server and bundler
