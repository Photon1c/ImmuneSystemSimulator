// Dendritic Cell Script - dendritic_cell.js
import * as THREE from 'three';
import { createSignalSphere } from './signal_viz.js';

export class DendriticCell {
    constructor(scene, immuneSystemRef) {
        this.scene = scene;
        this.immuneSystem = immuneSystemRef;
        this.activated = false;
        this.activationTimer = 0;
        this.maxActivationDuration = 180; // 3 seconds at 60fps
        this.cxcl10Radius = 3.5;
        this.migrationSpeed = 0.06;  // Faster migration speed
        this.hasSpawnedCTL = false;
        this.activationOrigin = null;
        this.speed = 0.03;
        this.migrationDistance = 0;
        this.spawnDelay = 1000; // 1 second delay between CTL spawns

        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.35, 14, 14),
            new THREE.MeshStandardMaterial({ 
                color: 0xffa500,
                emissive: 0x000000,
                emissiveIntensity: 0.3
            })
        );
        this.mesh.position.set(Math.random() * 10 - 5, 0.5, Math.random() * 10 - 5);
        scene.add(this.mesh);
    }

    update(cancerCells, chemicalField) {
        if (!this.activated) {
            // Check for nearby cancer cells
            for (let cell of cancerCells) {
                const distance = this.mesh.position.distanceTo(cell.mesh.position);
                if (distance < 2.0) {
                    this.activated = true;
                    this.activationOrigin = this.mesh.position.clone();
                    this.mesh.material.color.set(0xff6600);
                    this.mesh.material.emissiveIntensity = 0.8;

                    // Initial activation burst
                    for (let i = 0; i < 12; i++) {
                        const angle = (i / 12) * Math.PI * 2;
                        const radius = 1.2;
                        const offset = new THREE.Vector3(
                            Math.cos(angle) * radius,
                            0,
                            Math.sin(angle) * radius
                        );
                        createSignalSphere(this.scene, this.mesh.position.clone().add(offset), 0xff6600);
                    }
                    break;
                }
            }

            // Follow cancer chemical gradient if not activated
            if (!this.activated) {
                const gradient = chemicalField.getGradient(this.mesh.position, 'cancer');
                if (gradient.lengthSq() > 0) {
                    this.mesh.position.addScaledVector(gradient, this.speed);
                } else {
                    // Random movement if no gradient
                    const randomDir = new THREE.Vector3(
                        Math.random() * 2 - 1,
                        0,
                        Math.random() * 2 - 1
                    ).normalize();
                    this.mesh.position.addScaledVector(randomDir, this.speed * 0.5);
                }
            }
        }

        if (this.activated) {
            this.activationTimer++;

            // Strong initial CXCL10 signal that fades over time
            const signalStrength = Math.max(0.5, 2.0 * (1 - this.activationTimer / this.maxActivationDuration));
            chemicalField.addSignal(this.mesh.position, signalStrength, 'cxcl10');

            // Visual effects during migration
            if (this.activationTimer % 15 === 0) {
                createSignalSphere(this.scene, this.mesh.position, 0xff6600);
            }

            // Move away from activation site
            if (this.activationOrigin) {
                const awayVector = this.mesh.position.clone().sub(this.activationOrigin).normalize();
                this.mesh.position.addScaledVector(awayVector, this.migrationSpeed);
                this.migrationDistance = this.mesh.position.distanceTo(this.activationOrigin);

                // Spawn CTLs when far enough
                if (this.migrationDistance > 3.5 && !this.hasSpawnedCTL) {
                    if (this.immuneSystem?.addTCell) {
                        // Spawn first CTL immediately
                        this.immuneSystem.addTCell(this.activationOrigin);
                        for (let i = 0; i < 8; i++) {
                            createSignalSphere(this.scene, this.activationOrigin, 0x00ffcc);
                        }

                        // Spawn second CTL after delay
                        setTimeout(() => {
                            this.immuneSystem.addTCell(this.activationOrigin);
                            for (let i = 0; i < 8; i++) {
                                createSignalSphere(this.scene, this.activationOrigin, 0x00ffcc);
                            }
                        }, this.spawnDelay);
                    }
                    this.hasSpawnedCTL = true;
                }

                // Remove self after spawning and moving far enough
                if (this.hasSpawnedCTL && this.migrationDistance > 5) {
                    // Final signal burst before removal
                    for (let i = 0; i < 8; i++) {
                        const angle = (i / 8) * Math.PI * 2;
                        const radius = 0.8;
                        const offset = new THREE.Vector3(
                            Math.cos(angle) * radius,
                            0,
                            Math.sin(angle) * radius
                        );
                        createSignalSphere(this.scene, this.mesh.position.clone().add(offset), 0xff6600);
                    }
                    this._removeSelf();
                    return;
                }
            }
        }

        // Keep within bounds
        const maxBound = 10;
        this.mesh.position.x = Math.max(-maxBound, Math.min(maxBound, this.mesh.position.x));
        this.mesh.position.z = Math.max(-maxBound, Math.min(maxBound, this.mesh.position.z));
    }

    _removeSelf() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.dead = true;
    }
}
