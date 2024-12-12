
import * as THREE from 'three';

const OCEAN_DEPTH = 5;

const INIT_BLOOM = 0.1
const OCEAN_BLOOM_THRESHHOLD_LOW = INIT_BLOOM;
const OCEAN_BLOOM_THRESHHOLD_HIGH = 5.0;
const INIT_WAVE = 0.05;
const WAVE_THRESHHOLD_LOW = INIT_WAVE;
const WAVE_THRESHHOLD_HIGH = 0.3;

const STAR_RADIUS = 12;
const STAR_PETAL_DEPTH = 8;
const STAR_PRONGS = 5;

// Shader adapted from https://www.shadertoy.com/view/llS3RK
const vertShader = `
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    uniform float time;
    uniform vec2 resolution;
    uniform float waveMultiplier;

    // Squares a vector
    float lengthSquared(vec2 v){
        return dot(v, v);
    }
    
    /*
     * Pseudorandom noise function to control the wave pattern
    */
    float noise(vec2 v){
        return fract(sin(fract(sin(v.x) * (4.13311)) + v.y) * 3.0011);
    }
            
        
    /*
     * Implementation of Worley noise. Sorts randomly selected grid points around a location by distance then calculates
     * final noise based on that distance.
    */
    float worley(vec2 v){
        // Make distance super high
        float dist = 1.0e30;

        // Grid points
        for (int d_x = -1; d_x <= 1; d_x++){
            for (int d_y = -1; d_y <= 1; d_y++){
                // Floor vec2 and add to offset
                vec2 pt = floor(v) + vec2(d_x, d_y);
                
                // Calculate minimum distance for point and add noise
                dist = min(dist, lengthSquared(v - pt + noise(pt)));
            }
        }

        // Amplitude, Sharpness, Frequency, Off-center
        return 3.0 * exp(-4.0 * abs(2.5 * dist - 1.0));
    }
    
    /*
     * Stacks layers of Worley noise amplified by time
    */ 
    float fworley(vec2 v){
        return sqrt(sqrt(sqrt(
            worley(v*5.0 + 0.05*time) *
            sqrt(worley(v * 50.0 + 0.12 + -0.1*time)) *
            sqrt(sqrt(worley(v * -10.0 + 0.03*time
        ))))));
    }

    void main() {
        vUv = uv;
        // Remap the texture planes because of extrude geometry
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
        waveHeight += cos(position.y * 10.0 + time) * (waveMultiplier * 0.5);

        // Worley noise modulation
        float worleyValue = fworley(uv * resolution / 1500.0); 
        displacedPosition.z += waveHeight * worleyValue; // Combine wave and Worley

        // Pass final world position
        vWorldPosition = (modelMatrix * vec4(displacedPosition, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
    }
`;

const fragShader = `
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    uniform float time;
    uniform vec2 resolution;
    uniform float bloom;
    uniform bool isDragging;
    uniform float fishHeight;

    // Squares a vector
    float lengthSquared(vec2 v){
        return dot(v, v);
    }
    
    /*
     * Pseudorandom noise function to control the wave pattern
    */
    float noise(vec2 v){
        return fract(sin(fract(sin(v.x) * (43.13311)) + v.y) * 31.0011);
    }

    /*
     * Implementation of Worley noise. Sorts randomly selected grid points around a location by distance then calculates
     * final noise based on that distance.
    */
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
        // Amplitude, Sharpness, Frequency, Off-center
        return bloom * exp(-6.0 * abs(2.5 * dist - 1.5));
    }

    float fworley(vec2 v){
        return sqrt(sqrt(sqrt(
            worley(v*5.0 + 0.05*time) *
            sqrt(worley(v * 50.0 + 0.12 + -0.1*time)) *
            sqrt(sqrt(worley(v * -10.0 + 0.03*time
        ))))));
    }

    vec3 applyToonShading(vec3 color, float intensity) {
        // Quantize to 4 color bands for toon effect
        float toonBands = 4.0;
        return floor(color * toonBands) / toonBands;
    }

    void main() {
        vec2 uv = vUv;

        // Compute the base Worley noise pattern
        float basePattern = fworley(uv * resolution / 1500.0);

        vec3 toonColor;
        // Toon Shading 
        toonColor = (1.0 - fishHeight) * applyToonShading(vec3(0.1, 0.8 * basePattern, pow(basePattern, 0.5 - basePattern)), basePattern) + fishHeight * applyToonShading(vec3(0.9, 0.1 * basePattern, 0.3 * pow(basePattern, 0.2 - basePattern)), basePattern);
        
        // if (isDragging){
        //   // toonColor = vec3(1, 0, 0);
        //   toonColor = fishHeight * applyToonShading(vec3(0.9, 0.1 * basePattern, 0.3 * pow(basePattern, 0.2 - basePattern)), basePattern);
        // }
        // else{
        //   toonColor = applyToonShading(vec3(0.1, 0.8 * basePattern, pow(basePattern, 0.5 - basePattern)), basePattern);
        // }
        // Final color output
        gl_FragColor = vec4(toonColor, 1.0);
    }
`;

const waterMaterial = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0.0 },
        resolution: {
            value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
        bloom: { value: INIT_BLOOM},
        waveMultiplier: {value: INIT_BLOOM},
        isDragging : {value: false},
        fishHeight : {value: 1.0}
    },
    vertexShader: vertShader,
    fragmentShader: fragShader,
});  

/**
 * Creates Star shaped geometry for the "ocean water" surrounding the island.
 * This "Star" has rounded corners to more closely resemble flower petals (per the scene reference)
 */
function createStar() {
  // Set up the shape and the angle step per iteration
  const shape = new THREE.Shape();
  const angleStep = (Math.PI * 2) / STAR_PRONGS;

  for (let i = 0; i < STAR_PRONGS; i++) {
    const startAngle = i * angleStep;
    const midAngle = startAngle + angleStep / 2;
    const endAngle = startAngle + angleStep;

    // Find starting point, midpoint (star point), end point (next inner point)
    const startX = Math.cos(startAngle) * STAR_RADIUS;
    const startY = Math.sin(startAngle) * STAR_RADIUS;

    const midX = Math.cos(midAngle) * (STAR_RADIUS + STAR_PETAL_DEPTH);
    const midY = Math.sin(midAngle) * (STAR_RADIUS + STAR_PETAL_DEPTH);

    const endX = Math.cos(endAngle) * STAR_RADIUS;
    const endY = Math.sin(endAngle) * STAR_RADIUS;

    if (i === 0) {
      // Start the shape at the first point
      shape.moveTo(startX, startY);
    }

    // From the starting point, use the "point" of the star to curve to the next inner intersection point
    shape.quadraticCurveTo(midX, midY, endX, endY);
  }

  shape.closePath();

  // Extrude star shape to a three dimensional shape
  const extrudeSettings = {
    depth: OCEAN_DEPTH,
    bevelEnabled: false,
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

/**
 * Creates Mesh for the ocean using the star shape and the waterMaterial.
 * @returns oceanMesh
 */
function createOceanMesh(){
    const oceanMesh = new THREE.Mesh(
      createStar(),
      waterMaterial
    );
    return oceanMesh
}

/**
 * Water animation method: handles water movement, wave simulation, and bloom effect
 */
function updateOcean(bloomOn, isDragging, fishHeight) {

  // if (isDragging){
  waterMaterial.uniforms.isDragging.value = isDragging;
  waterMaterial.uniforms.fishHeight.value = fishHeight - 2.0;
  // }
  // Increments time to simulate water movement
  waterMaterial.uniforms.time.value += 0.05;

  // Controls bloom instensity
  if (
    bloomOn &&
    waterMaterial.uniforms.bloom.value <= OCEAN_BLOOM_THRESHHOLD_HIGH
  ) {
    waterMaterial.uniforms.bloom.value += 0.05;
  }
  if (
    !bloomOn &&
    waterMaterial.uniforms.bloom.value >= OCEAN_BLOOM_THRESHHOLD_LOW
  ) {
    waterMaterial.uniforms.bloom.value -= 0.05;
  }

  // Controls wave movement
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

export { createOceanMesh, updateOcean };
