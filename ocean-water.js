
import * as THREE from 'three';

const vertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fragShader = `
    uniform float time;
    varying vec2 vUv;

    // Simple 2D noise function
    float noise(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    // Smooth noise function
    float smoothNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = noise(i);
        float b = noise(i + vec2(1.0, 0.0));
        float c = noise(i + vec2(0.0, 1.0));
        float d = noise(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y + (d - b - c + a) * u.x * u.y;
    }

    // Turbulent effect for water ripples
    float turbulence(vec2 p) {
        float value = 0.0;
        float size = 1.0;
        for (int i = 0; i < 6; i++) {
            value += smoothNoise(p * size) / size;
            size *= 2.0;
        }
        return value;
    }

    void main() {
        vec2 uv = vUv * 5.0; // Scale the noise pattern
        float n = turbulence(uv - time * 0.1); // Animate by subtracting time
        gl_FragColor = vec4(vec3(n * 0.5 + 0.5), 1.0); // Map noise to 0-1 range
    }
`;
// I think I will need to write a new shader using worley noise, and then focus on the up and down of it maybe
const waterMaterial = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0.0 },
        resolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
    },
    vertexShader: vertexShader,
    fragmentShader: fragShader,
});  

function createOcean(){
    const oceanMesh = new THREE.Mesh(
      new THREE.BoxGeometry(50, 0.001, 50),
      waterMaterial
    );
    return oceanMesh
}


export { createOcean };
