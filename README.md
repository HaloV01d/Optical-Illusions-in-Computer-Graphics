# Optical Illusions in Computer Graphics

A web-based interactive prototype designed to explore optical illusions using real-time 3D graphics. Built with **JavaScript**, **Three.js**, and **WebGL**.

## Overview

This project demonstrates how our visual perception can be deceived through computer graphics. It creates interactive 3D visualizations that reveal the mechanisms behind optical illusions and how the human visual system interprets color, brightness, and context.

## Included Illusions

### Checker Shadow Illusion

The Checker Shadow illusion is a classic demonstration of how our visual system perceives color and brightness contextually. In this interactive visualization:

- Two adjacent checkerboard squares appear to have different colors
- When examined under the same lighting conditions, they are actually identical
- The 3D scene reveals how the brain uses surrounding context, shadows, and assumptions about lighting to interpret color
- Explore the illusion from different angles using orbit controls and click on tiles to compare colors

### Ponzo Illusion

- Two bars with the same true length are placed on converging perspective rails
- The upper bar often appears longer due to depth cues
- You can guess which looks longer and then reveal measured equality

### Zollner Illusion

- Two long parallel lines are crossed by short diagonal strokes
- The angled strokes bias orientation perception so the long lines appear non-parallel
- Use the reveal control to overlay parallel guide lines and verify the geometry

## Project Structure

```
Optical-Illusions-in-Computer-Graphics/
├── index.html      # HTML entry point
├── package.json    # Dependencies and project configuration
├── README.md       # This file
└── src/
  ├── IllusionBase.js      # Shared scene, camera, lighting, UI, and interaction utilities
  ├── SceneManager.js      # Illusion switching and guide panel management
  ├── Checker_Shadow.js    # Checker Shadow illusion implementation
  ├── Ponzo.js             # Ponzo illusion implementation
  └── Zollner.js           # Zollner illusion implementation
```

### Files

- **index.html** - HTML entry point and UI panels for controls, picker, and guide text
- **src/IllusionBase.js** - Reusable Three.js scaffolding and shared UI behavior
- **src/SceneManager.js** - Registers illusions and handles switching between them
- **src/Checker_Shadow.js** - Checker Shadow interactions and color comparison logic
- **src/Ponzo.js** - Ponzo guessing flow and length reveal markers
- **src/Zollner.js** - Zollner line orientation illusion and parallel guide reveal

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npx vite 
```

Open your browser to view the interactive 3D optical illusion.

### Dependencies

- **three** - 3D graphics library for WebGL rendering
- **vite** - Fast build tool and development server
