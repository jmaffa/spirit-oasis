/*
 * INSPIRED BY WebGL Water
 * http://madebyevan.com/webgl-water/
 *
 */

import * as THREE from 'three';
import Cubemap from './cubemap';
const textureLoader = new THREE.TextureLoader();
const waterImage = textureLoader.load('textures/xneg.jpg');
import { renderTargetA } from './pond-simulation';

const planeGeometry = new THREE.PlaneGeometry(1, 1, 256, 256);

const vertexShader = `
    varying vec2 vUv;
    uniform sampler2D heightTexture; // Height texture from the simulation
    uniform float time;

    void main() {
        vUv = uv;
        vec3 pos = position;

        // Add height-based displacement
        float height = texture2D(heightTexture, vUv).r;
        pos.z += height * 0.2; // Adjust strength of ripple effect (amplify if needed)

        // Optional: Add procedural ripple animation for visual enhancement
        pos.z += sin(uv.x * 50.0 + time) * 0.04;
        pos.z += cos(uv.y * 40.0 + time) * 0.04;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

// const fragmentShader = `
//     uniform sampler2D waterTexture; 

//     uniform float opacity; 
//     varying vec2 vUv; // UV coordinates from the vertex shader

//     void main() {
//         // Sample water texture for base color
//         vec4 color = texture2D(waterTexture, vUv);

//         gl_FragColor = vec4(color.rgb, opacity); // Apply transparency
//     }
//     `;

const fragmentShader = `
    varying vec2 vUv; // Receive UV coordinates from the vertex shader
    uniform sampler2D waterTexture; // Reference to the texture (e.g., heightmap)
    uniform float time; // A time variable to animate the effect
    uniform float opacity;
  
    void main() {
      vec2 coords = vUv + vec2(sin(time * 0.1), cos(time * 0.1)) * 0.01; // Add a wavy motion
      float height = texture2D(waterTexture, coords).r; // Sample height from texture
      vec3 color = vec3(0.0, 0.1 + height * 0.1, 1.0); // Map height to color (blueish water)
      gl_FragColor = vec4(color, opacity); 
    }
  `;

const waterMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
        time: { value: 0 },
        waterTexture: { value: waterImage },
        heightTexture: { value: renderTargetA.texture }, // Use the loaded texture
        opacity: { value: 0.7 }, // Transparency
    },
    transparent: true,
    // opacity: 0.6
});

const waterMesh = new THREE.Mesh(planeGeometry, waterMaterial);

export { waterMesh };