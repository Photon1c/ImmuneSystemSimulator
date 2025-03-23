import * as THREE from 'three';
import { CellDynamics } from './cell_dynamics.js';
import { createSignalSphere } from './signal_viz.js';

export class RegulatoryTCell {
    constructor(scene) {
        this.scene = scene;
        this.suppressionRadius = 3.5;
        this.speed = 0.05;
        this.suppressionStrength = 0.8;
        this.pulseTimer = 0;
        this.pulseInterval = 30; // Pulse every half second at 60fps
        
        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 14, 14),
            new THREE.MeshStandardMaterial({ 
                color: 0x9933ff,  // violet
                emissive: 0x220022,
                emissiveIntensity: 0.3
            })
        );
        this.mesh.position.set(Math.random() * 10 - 5, 0.5, Math.random() * 10 - 5);
        scene.add(this.mesh);
    }

    update(chemicalField) {
        // Pulse timer for visual and suppression effects
        this.pulseTimer++;
        if (this.pulseTimer >= this.pulseInterval) {
            this.pulseTimer = 0;
            
            // Create suppression pulse effect
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const radius = this.suppressionRadius * 0.3;
                const offset = new THREE.Vector3(
                    Math.cos(angle) * radius,
                    0,
                    Math.sin(angle) * radius
                );
                createSignalSphere(this.scene, this.mesh.position.clone().add(offset), 0x9933ff);
            }

            // Pulse the emissive intensity
            this.mesh.material.emissiveIntensity = 0.6;
            setTimeout(() => {
                this.mesh.material.emissiveIntensity = 0.3;
            }, 100);

            // Stronger suppression during pulse
            this.suppressionStrength = 1.2;
        } else {
            this.suppressionStrength = 0.8;
        }

        // Emit suppression signal
        chemicalField.addSignal(this.mesh.position, this.suppressionStrength, 'pd1tim3');

        // Movement behavior
        const cxcl10Signal = chemicalField.getSignalAt(this.mesh.position, 'cxcl10');
        
        if (cxcl10Signal > 0.5) {
            // Move towards areas of immune activity
            const gradient = chemicalField.getGradient(this.mesh.position, 'cxcl10');
            if (gradient.lengthSq() > 0) {
                this.mesh.position.addScaledVector(gradient, this.speed * 1.2);
                
                // Create trail effect when following gradient
                if (Math.random() < 0.3) {
                    createSignalSphere(this.scene, this.mesh.position, 0x9933ff);
                }
            }
        } else {
            // Random movement with occasional speed bursts
            const randomDir = new THREE.Vector3(
                Math.random() * 2 - 1,
                0,
                Math.random() * 2 - 1
            ).normalize();
            
            const burstSpeed = Math.random() < 0.2 ? this.speed * 1.5 : this.speed * 0.7;
            this.mesh.position.addScaledVector(randomDir, burstSpeed);
        }

        // Keep cell within bounds
        const maxBound = 10;
        this.mesh.position.x = Math.max(-maxBound, Math.min(maxBound, this.mesh.position.x));
        this.mesh.position.z = Math.max(-maxBound, Math.min(maxBound, this.mesh.position.z));
    }
}
