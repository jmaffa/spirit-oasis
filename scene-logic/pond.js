import * as THREE from 'three';
const textureLoader = new THREE.TextureLoader();
const waterTexture = textureLoader.load('textures/water.jpg');
import { renderTargetA } from './pond-simulation';

const planeGeometry = new THREE.PlaneGeometry(1, 1, 256, 256);

const INIT_BLOOM = 0.05
const BLOOM_THRESHHOLD_LOW = INIT_BLOOM;
const BLOOM_THRESHHOLD_HIGH = 1.3;


const vertexShader = `
    varying vec2 vUv;
    uniform sampler2D heightTexture; // Height texture from the simulation
    uniform float time;
    uniform float bloom;
    uniform bool isBloom;

    void main() {
        vUv = uv;
        vec3 pos = position;

        // Add height-based displacement
        float height = texture2D(heightTexture, vUv).r;
        pos.z += height * 0.2; // Adjust strength of ripple effect

        pos.z += sin(uv.x * 30.0 + time) * 0.04;
        pos.z += cos(uv.y * 40.0 + time) * 0.06;

        if (isBloom) {
            pos.z += sin(pos.x * 5.0 + time) * bloom * 0.2; // Make pond waves higher
            pos.z += sin(pos.y * 4.0 + time) * bloom * 0.2; // Make pond waves higher
        }
        pos.z = clamp(pos.z, -0.3, 0.27);

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = `
    uniform sampler2D waterTexture; // Use 2D texture instead of cubemap
    uniform vec3 uColor; // Base color of the water
    uniform float opacity; // Water transparency
    varying vec2 vUv; // UV coordinates from the vertex shader

    uniform bool isBloom;
    uniform float bloom;
    
    void main() {
        vec4 textureColor = texture2D(waterTexture, vUv); // Sample the texture
        vec3 baseColor = mix(textureColor.rgb, uColor, 0.5); // Blend with the base color
        vec3 bloomColor = vec3(0.2, 0.4, 0.8); 

        vec3 finalColor = baseColor;
        finalColor = mix(finalColor, vec3(0.0,0.2,0.4), 0.5); // Blue tint

        if (isBloom) {
            finalColor += bloomColor * bloom;
        }

        // Clamp values to ensure it still looks like water after bloom
        // finalColor = clamp(finalColor, vec3(0.0, 0.0, 0.1), vec3(0.1, 0.3, 0.8));
        float finalOpacity = clamp(opacity, 0.2, 0.8);

        gl_FragColor = vec4(finalColor, opacity); 
    }
`;

const waterMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
        time: { value: 0 },
        bloom: { value: INIT_BLOOM },
        isBloom: { value: false },
        waveMultiplier: {value: INIT_BLOOM},
        waterTexture: { value: waterTexture }, // Use the loaded texture
        heightTexture: { value: waterTexture },
        uColor: { value: new THREE.Color(0x156289) }, // Base color of the water
        opacity: { value: 0.5 }, 
    },
    transparent: true,
});

const waterMesh = new THREE.Mesh(planeGeometry, waterMaterial);

function updatePondWater(bloomOn) {
    waterMaterial.uniforms.time.value += 0.05;

    // Smoothly transition bloom intensity
    if (bloomOn) {
        waterMaterial.uniforms.bloom.value = Math.min(
            waterMaterial.uniforms.bloom.value + 0.01,
            BLOOM_THRESHHOLD_HIGH
        );
        waterMaterial.uniforms.isBloom.value = true;
    } else {
        waterMaterial.uniforms.bloom.value = Math.max(
            waterMaterial.uniforms.bloom.value - 0.01,
            BLOOM_THRESHHOLD_LOW
        );
        if (waterMaterial.uniforms.bloom.value <= BLOOM_THRESHHOLD_LOW) {
            waterMaterial.uniforms.isBloom.value = false;
        }
    }
}

export { waterMesh, updatePondWater };
