import * as THREE from 'three';
const textureLoader = new THREE.TextureLoader();
const waterTexture = textureLoader.load('textures/water.jpg');
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
        pos.z += sin(uv.x * 30.0 + time) * 0.04;
        pos.z += cos(uv.y * 40.0 + time) * 0.06;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

const fragmentShader = `
    varying vec2 vUv; // UV coordinates from the vertex shader
    uniform sampler2D waterTexture; // Use 2D texture instead of cubemap
    uniform float opacity; // Water transparency
    uniform vec3 uColor; // Base color of the water
    uniform float time;

    void main() {
        vec2 coords = vUv + vec2(sin(time * 0.1), cos(time * 0.1)) * 0.01;
        float height = texture2D(waterTexture, coords).r; // Sample height from texture

        vec4 textureColor = texture2D(waterTexture, vUv); // Sample the texture
        vec3 color = vec3(0.0, 0.1 + height * 0.2, 0.1);
        color = mix(textureColor.rgb, color, 0.7); // Blend with the base color
        color = mix(color, vec3(0.0,0.0,0.3), 0.6); // Blue tint

        gl_FragColor = vec4(color, opacity);
    }
`;

const waterMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
        time: { value: 0 },
        waterTexture: { value: waterTexture }, // Use the loaded texture
        heightTexture: { value: waterTexture },
        uColor: { value: new THREE.Color(0x156289) }, // Base color of the water
        opacity: { value: 0.5 }, 
    },
    transparent: true,
});

const waterMesh = new THREE.Mesh(planeGeometry, waterMaterial);

export { waterMesh };
