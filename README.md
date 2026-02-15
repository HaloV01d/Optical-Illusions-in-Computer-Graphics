# Optical Illusions in Computer Graphics

A web-based interactive prototype designed to explore optical illusions using real-time 3D graphics. Built with **JavaScript**, **Three.js**, and **WebGL**.

## Overview

This project demonstrates how our visual perception can be deceived through computer graphics. It creates interactive 3D visualizations that reveal the mechanisms behind optical illusions and how the human visual system interprets color, brightness, and context.

## Checker Shadow Illusion

The Checker Shadow illusion is a classic demonstration of how our visual system perceives color and brightness contextually. In this interactive visualization:

- Two adjacent checkerboard squares appear to have different colors
- When examined under the same lighting conditions, they are actually identical
- The 3D scene reveals how the brain uses surrounding context, shadows, and assumptions about lighting to interpret color
- Explore the illusion from different angles using orbit controls and click on tiles to compare colors

## Project Structure

```
Optical-Illusions-in-Computer-Graphics/
├── index.html      # HTML entry point
├── package.json    # Dependencies and project configuration
├── README.md       # This file
└── src/
    └── main.js     # Three.js scene setup, geometry, lighting, and interactions
```

### Files

- **index.html** - Minimal HTML entry point that loads the main application
- **src/main.js** - Core application logic including:
  - Three.js scene, camera, and renderer setup
  - Checkerboard geometry creation
  - Directional and ambient lighting
  - Interactive tile selection with raycasting
  - OrbitControls for camera navigation
  - Color comparison functionality

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open your browser to view the interactive 3D optical illusion.

### Dependencies

- **three** - 3D graphics library for WebGL rendering
- **vite** - Fast build tool and development server
