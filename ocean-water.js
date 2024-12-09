
import * as THREE from 'three';

const INIT_BLOOM = 0.05
const OCEAN_BLOOM_THRESHHOLD_LOW = INIT_BLOOM;
const OCEAN_BLOOM_THRESHHOLD_HIGH = 3.0;

const INIT_WAVE = 0.05;
const WAVE_THRESHHOLD_LOW = INIT_WAVE;
const WAVE_THRESHHOLD_HIGH = 0.3;


const STAR_RADIUS = 6;
const STAR_PETAL_DEPTH = 4;
const STAR_PRONGS = 5;

const vertShader = `
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    uniform float time;
    uniform vec2 resolution;
    uniform bool isBloom;
    uniform float waveMultiplier;

    // Squares a vector
    float lengthSquared(vec2 v){
        return dot(v, v);
    }
    
    // Pseudorandom noise function
    float noise(vec2 v){
        return fract(sin(fract(sin(v.x) * (4.13311)) + v.y) * 3.0011);
    }
            
        
    float worley(vec2 v){
        // make distance super high
        float dist = 1.0e30;

        // Grid points
        for (int d_x = -1; d_x <= 1; d_x++){
            for (int d_y = -1; d_y <= 1; d_y++){
                // floor vec2 and add to offset
                vec2 pt = floor(v) + vec2(d_x, d_y);
                
                // calculate minimum distance for point and add noise
                dist = min(dist, lengthSquared(v - pt - noise(pt)));
            }
        }

        // amplitude, sharpness, frequency, off-center
        return 3.0 * exp(-4.0 * abs(2.5 * dist - 1.0));
    }
    
    // Stacks layers of Worley noise
    float fworley(vec2 v){
        return sqrt(sqrt(sqrt(
            worley(v*5.0 + 0.05*time) *
            sqrt(worley(v * 50.0 + 0.12 + -0.1*time)) *
            sqrt(sqrt(worley(v * -10.0 + 0.03*time
        ))))));
    }


    void main() {
        vUv = uv;
        if (position.x != 0.0) {
            vUv = vec2(position.x * 0.5 + 0.5, position.y * 0.5 + 0.5);  // Simple XY plane mapping
        } else {
            vUv = vec2(position.z * 0.5 + 0.5, position.y * 0.5 + 0.5);  // ZY plane mapping
        }

        // Add wave displacement
        vec3 displacedPosition = position;

        // Wave effect
        float waveHeight;
        waveHeight = sin(position.x * 10.0 + time) * waveMultiplier; 
        waveHeight += cos(position.y * 15.0 + time * 1.5) * (waveMultiplier * 0.5);

        // Worley noise modulation
        float worleyValue = fworley(uv * resolution / 1500.0); 
        displacedPosition.z += waveHeight * worleyValue; // Combine wave and Worley

        vWorldPosition = (modelMatrix * vec4(displacedPosition, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
    }
`;

// adapted from https://www.shadertoy.com/view/llS3RK
const fragShader = `
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    uniform float time;
    uniform vec2 resolution;
    uniform float bloomTime;
    uniform bool isBloom;
    uniform float bloom;

    float lengthSquared(vec2 v){
        return dot(v, v);
    }
        
    float noise(vec2 v){
        return fract(sin(fract(sin(v.x) * (43.13311)) + v.y) * 31.0011);
    }
        
    
    float worley(vec2 v){
        // make distance super high
        float dist = 1.0e30;

        // Grid points
        for (int d_x = -1; d_x <= 1; d_x++){
            for (int d_y = -1; d_y <= 1; d_y++){
                // floor vec2 and add to offset
                vec2 pt = floor(v) + vec2(d_x, d_y);
                
                // calculate minimum distance for point and add noise
                dist = min(dist, lengthSquared(v - pt - noise(pt)));
            }
        }
        // amplitude, 
        return bloom * exp(-6.0 * abs(2.5 * dist - 1.5));
    }
    float fworley(vec2 v){
        return sqrt(sqrt(sqrt(
            worley(v*5.0 + 0.05*time) *
            sqrt(worley(v * 50.0 + 0.12 + -0.1*time)) *
            sqrt(sqrt(worley(v * -10.0 + 0.03*time
        ))))));
    }

    void main() {
        vec2 uv = vUv;
        // Radial distance from center (normalized)
        // vec2 center = vec2(0.5, 0.5); // Screen center in UV coordinates
        // float radialDist = length(uv - center);

        // Expanding radius over time
        // float radius = time * 0.1; // Controls speed of expansion
        // float falloff = smoothstep(radius, radius - 0.1, radialDist); // Gradual falloff near radius edge

        // Compute the base Worley noise pattern
        float basePattern = fworley(uv * resolution / 1500.0);

        // Combine the base pattern and bloom effect
        float finalIntensity = basePattern;

        // Final color output
        gl_FragColor = vec4(finalIntensity * vec3(0.1, 0.8 * finalIntensity, pow(finalIntensity, 0.5 - finalIntensity)), 1.0);
    }
`;

const waterMaterial = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0.0 },
        bloomTime: { value: 0.0},
        resolution: {
            value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
        bloom: { value: INIT_BLOOM},
        waveMultiplier: {value: INIT_BLOOM},
        isBloom : {value: false},        
    },
    vertexShader: vertShader,
    fragmentShader: fragShader,
});  

function createStar(prongs, radius, petalDepth) {
  const shape = new THREE.Shape();
  const angleStep = (Math.PI * 2) / prongs; // Angle between petals

  for (let i = 0; i < prongs; i++) {
    const startAngle = i * angleStep;
    const midAngle = startAngle + angleStep / 2;
    const endAngle = startAngle + angleStep;

    const startX = Math.cos(startAngle) * radius;
    const startY = Math.sin(startAngle) * radius;

    const midX = Math.cos(midAngle) * (radius + petalDepth);
    const midY = Math.sin(midAngle) * (radius + petalDepth);

    const endX = Math.cos(endAngle) * radius;
    const endY = Math.sin(endAngle) * radius;

    if (i === 0) {
      shape.moveTo(startX, startY); // Start the shape at the first point
    }

    // Add a quadratic curve for the petal
    shape.quadraticCurveTo(midX, midY, endX, endY);
  }

  shape.closePath(); // Close the shape to complete the flower

  const extrudeSettings = {
    depth: 5, // Thickness of the cylinder
    bevelEnabled: false, // Disable beveling
  };
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}


function createOceanMesh(){
    const oceanMesh = new THREE.Mesh(
      createStar(STAR_PRONGS, STAR_RADIUS, STAR_PETAL_DEPTH),
      waterMaterial
    );
    return oceanMesh
}

function updateWater(bloomOn) {
  waterMaterial.uniforms.time.value += 0.05;
  if (
    bloomOn &&
    waterMaterial.uniforms.bloom.value <= OCEAN_BLOOM_THRESHHOLD_HIGH
  ) {
    waterMaterial.uniforms.isBloom.value = bloomOn;
    waterMaterial.uniforms.bloom.value += 0.01;
    // waterMaterial.uniforms.bloomTime.value += 0.01;
  }
  if (
    !bloomOn &&
    waterMaterial.uniforms.bloom.value >= OCEAN_BLOOM_THRESHHOLD_LOW
  ) {
    waterMaterial.uniforms.isBloom.value = bloomOn;
    waterMaterial.uniforms.bloom.value -= 0.01;
    // waterMaterial.uniforms.bloomTime.value -= 0.01;
  }

  if (
    bloomOn &&
    waterMaterial.uniforms.waveMultiplier.value <= WAVE_THRESHHOLD_HIGH
  ) {
    waterMaterial.uniforms.waveMultiplier.value += 0.005;
  }

  if (
    !bloomOn &&
    waterMaterial.uniforms.waveMultiplier.value >= WAVE_THRESHHOLD_LOW
  ) {
    waterMaterial.uniforms.waveMultiplier.value -= 0.005;
  }
}

export { createOceanMesh, updateWater, INIT_BLOOM };
