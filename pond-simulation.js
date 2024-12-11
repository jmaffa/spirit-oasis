import * as THREE from 'three';
import { waterMesh } from './pond.js'

const simulationResolution = 256; // TODO claire check

const textureLoader = new THREE.TextureLoader();

// Create render targets for the simulation
const renderTargetA = new THREE.WebGLRenderTarget(simulationResolution, simulationResolution, {
    type: THREE.FloatType,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
});

const renderTargetB = renderTargetA.clone();

let currentRenderTarget = renderTargetA;
let nextRenderTarget = renderTargetB;

const dropFragmentShader = `
    precision highp float;
    precision highp int;

    uniform sampler2D uTexture; 
    uniform vec2 center; 
    uniform float radius;
    uniform float strength; 
    uniform float timeStep;

    varying vec2 coord;

    void main() {
        vec4 originalTexture = texture2D(uTexture, coord);

        // Highlight logic based on cursor
        float distance = length(center - coord);
        float ripple = smoothstep(radius, 0.0, distance) * strength;

        float wave = sin(distance * 30.0 - timeStep * 3.0) * ripple; // adjust 30 for wave height

        float newHeight = clamp(originalTexture.r + wave * 0.2, 0.0, 0.45); // adjust 0.4 for wave effect strength

        gl_FragColor = vec4(newHeight, 0, 0, 1.0);
        // Instead of affecting just the red channel, keep original texture's color
        // gl_FragColor = vec4(originalTexture.rgb * (1.0 - wave), originalTexture.a); // Modify color only slightly for wave effect
    }
`;

const vertexShader = `
    varying vec2 coord;

    void main() {
        coord = position.xy * 0.5 + 0.5;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;


// Set up drop simulation material
const dropMaterial = new THREE.ShaderMaterial({
    fragmentShader: dropFragmentShader,
    vertexShader,
    uniforms: {
        uTexture: { value: renderTargetA.texture },  
        center: { value: new THREE.Vector2() }, 
        radius: { value: 0.1 },
        strength: { value: 0.4 }, 
        timeStep: { value: 0.0 },
    },
});


const dropMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), dropMaterial);
dropMesh.frustumCulled = false;

const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

let time = 0.0;

function updateSimulation(renderer) {
    time += 0.016; // Increment time (simulate ~60fps)
    dropMaterial.uniforms.timeStep.value = time;

    // Set the current texture for reading
    dropMaterial.uniforms.uTexture.value = currentRenderTarget.texture;

    // Render to the next render target
    renderer.setRenderTarget(nextRenderTarget);
    renderer.render(dropMesh, orthoCamera);

    // Swap the render targets
    [currentRenderTarget, nextRenderTarget] = [nextRenderTarget, currentRenderTarget];

    // TODO: Do we need to update water mesh texture?
    waterMesh.material.uniforms.heightTexture.value = currentRenderTarget.texture;

    renderer.setRenderTarget(null);
}

function onMouseMove(event, renderer, camera) {
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObject(waterMesh);
    if (intersects.length > 0) {
        const point = intersects[0].uv;
        dropMaterial.uniforms.center.value.set(point.x, point.y);
        dropMaterial.uniforms.strength.value = 1.0;

        updateSimulation(renderer);
    }
}

export { updateSimulation, onMouseMove, renderTargetA };
