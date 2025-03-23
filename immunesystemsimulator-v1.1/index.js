import { setupScene } from './scene.js';
import { ImmuneSystem } from './immune_system.js';
import { setupControls } from './controls.js';

document.addEventListener('DOMContentLoaded', () => {
    const { scene, camera, renderer, controls } = setupScene();
    const immuneSystem = new ImmuneSystem(scene);
    
    setupControls(immuneSystem);
    
    function animate() {
        requestAnimationFrame(animate);
        immuneSystem.update();
        controls.update();
        renderer.render(scene, camera);
    }
    
    animate();
});
