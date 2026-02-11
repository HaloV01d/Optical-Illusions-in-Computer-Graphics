# Optical-Illusions-in-Computer-Graphics
Optical Illusions WebGL Prototype is a web-based interactive prototype designed to explore and generate optical illusions using real-time 3D graphics. The project is built with JavaScript and WebGL (via Three.js) and focuses on rapid prototyping, visual experimentation, and user interaction.

## Checker Shadow Illusion
The Checker Shadow illusion is a classic demonstration of how our visual system perceives color and brightness in context. In this interactive visualization, two adjacent checkerboard squares appear to have different colors, but when examined under the same lighting conditions, they are actually identical. This illusion reveals how the brain uses surrounding context, shadows, and assumptions about lighting to interpret color—rather than relying solely on the raw color values hitting the retina. The 3D scene allows you to interactively explore the illusion from different angles using orbit controls.

## Project Structure
```
Checker_shadow/
├── index.html      # Main HTML file with scene container and UI panel
├── styles.css      # Styling for the RGB color display panel
├── main.js         # Three.js scene setup, lighting, geometry, and color picking logic
```

- **index.html** - Sets up the DOM structure and loads Three.js libraries
- **styles.css** - Contains styles for the RGB display panel that shows picked colors
- **main.js** - Contains all Three.js initialization, scene creation, camera setup, lighting configuration, and interactive color-picking functionality
