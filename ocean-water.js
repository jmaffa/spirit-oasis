
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
// let BLOOM_ON = false;
// standard vertex shader just getting UV coordinate
const vertexShader = `
    varying vec2 vUv;
    void main() {
        // Simple flat UV mapping for each face
        // Map the position based on face index or local face coordinates
        if (position.x != 0.0) {
            vUv = vec2(position.x * 0.5 + 0.5, position.y * 0.5 + 0.5);  // Simple XY plane mapping
        } else {
            vUv = vec2(position.z * 0.5 + 0.5, position.y * 0.5 + 0.5);  // ZY plane mapping
        }

        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const vertShader = `
varying vec2 vUv;
varying vec3 vWorldPosition;

uniform float time;
uniform vec2 resolution;
uniform bool isBloom;
uniform float waveMultiplier;

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
        
        return 3.0 * exp(-6.0 * abs(2.5 * dist - 1.0));
    }
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
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    // // Add wave displacement
    vec3 displacedPosition = position;

    // // Wave effect (sinusoidal)
    float waveHeight;
    waveHeight = sin(position.x * 10.0 + time) * waveMultiplier; 
    waveHeight += cos(position.y * 15.0 + time * 1.5) * (waveMultiplier * 0.5);
    // waveHeight = sin(position.x * 10.0 + time) * 3.0; 
    // waveHeight += cos(position.y * 15.0 + time * 1.5) * 3.0;
    // if (isBloom){
    //     waveHeight = sin(position.x * 10.0 + time) * 0.2; 
    //     waveHeight += cos(position.y * 15.0 + time * 1.5) * 0.1;
    // }
    // else{
    //     waveHeight = sin(position.x * 10.0 + time) * 0.05; 
    //     waveHeight += cos(position.y * 15.0 + time * 1.5) * 0.03;
    // }
    

    // // Worley noise modulation
    float worleyValue = fworley(uv * resolution / 1500.0); 
    displacedPosition.z += waveHeight * worleyValue; // Combine wave and Worley

    if (isBloom){
        vWorldPosition = (modelMatrix * vec4(displacedPosition, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
    }
    else{
        vWorldPosition = (modelMatrix * vec4(displacedPosition, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
        // gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    
}

`;

const fragShader = `
varying vec2 vUv;
varying vec3 vWorldPosition;

uniform vec3 lightPosition; // World-space light position
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
        
        return bloom * exp(-6.0 * abs(2.5 * dist - 1.0));
    }
float fworley(vec2 v){
        return sqrt(sqrt(sqrt(
            worley(v*5.0 + 0.05*time) *
            sqrt(worley(v * 50.0 + 0.12 + -0.1*time)) *
            sqrt(sqrt(worley(v * -10.0 + 0.03*time
        ))))));
    }

vec3 computeNormal(vec3 worldPos) {
    vec3 dx = dFdx(worldPos);
    vec3 dy = dFdy(worldPos);
    return normalize(cross(dx, dy));
}

void main() {
        vec2 uv = vUv;
            // Radial distance from center (normalized)
        vec2 center = vec2(0.5, 0.5); // Screen center in UV coordinates
        float radialDist = length(uv - center);

        // Expanding radius over time
        float radius = time * 0.1; // Controls speed of expansion
        float falloff = smoothstep(radius, radius - 0.1, radialDist); // Gradual falloff near radius edge

        // Compute the base Worley noise pattern
        float basePattern = fworley(uv * resolution / 1500.0);

        // Modulate the bloom effect with falloff
        float bloomEffect = basePattern;
        if (isBloom) {
            // bloomEffect *= falloff; // Enhance with bloom effect
        }
        else{
            // float reverseFalloff = 1.0 - smoothstep(radius - 0.1, radius, radialDist);
            // bloomEffect = mix(basePattern, bloomEffect, reverseFalloff);
        }

        // Combine the base pattern and bloom effect
        float finalIntensity = bloomEffect;

        // Final color output
        gl_FragColor = vec4(finalIntensity * vec3(0.1, 0.8 * finalIntensity, pow(finalIntensity, 0.5 - finalIntensity)), 1.0);
    }

// void main() {
//     vec3 normal = computeNormal(vWorldPosition);

//     // Lighting: Phong reflection model
//     vec3 lightDir = normalize(lightPosition - vWorldPosition);
//     vec3 viewDir = normalize(-vWorldPosition); // Assume camera at origin
//     vec3 reflectDir = reflect(-lightDir, normal);

//     // Ambient, diffuse, specular components
//     vec3 ambient = vec3(0.1, 0.2, 0.3); // Ambient color
//     float diffuse = max(dot(lightDir, normal), 0.0);
//     float specular = pow(max(dot(viewDir, reflectDir), 0.0), 16.0);

//     // Worley noise coloring
//     float worleyValue = fworley(vUv * resolution / 1500.0);
//     vec3 worleyColor = vec3(0.1, 0.8, pow(worleyValue, 0.5)); 

//     // Combine Worley and lighting
//     vec3 finalColor = ambient + diffuse * worleyColor + specular * vec3(1.0);
//     gl_FragColor = vec4(finalColor, 1.0);
// }
`;

// adapted from https://www.shadertoy.com/view/llS3RK
const worleyShader = `
    uniform vec2 resolution;
    uniform float time;
    uniform float bloomTime;
    uniform bool isBloom;
    uniform float bloom;
    varying vec2 vUv;

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
        
        return bloom * exp(-6.0 * abs(2.5 * dist - 1.0));
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
        vec2 center = vec2(0.5, 0.5); // Screen center in UV coordinates
        float radialDist = length(uv - center);

        // Expanding radius over time
        float radius = time * 0.1; // Controls speed of expansion
        float falloff = smoothstep(radius, radius - 0.1, radialDist); // Gradual falloff near radius edge

        // Compute the base Worley noise pattern
        float basePattern = fworley(uv * resolution / 1500.0);

        // Modulate the bloom effect with falloff
        float bloomEffect = basePattern;
        if (isBloom) {
            // bloomEffect *= falloff; // Enhance with bloom effect
        }
        else{
            // float reverseFalloff = 1.0 - smoothstep(radius - 0.1, radius, radialDist);
            // bloomEffect = mix(basePattern, bloomEffect, reverseFalloff);
        }

        // Combine the base pattern and bloom effect
        float finalIntensity = bloomEffect;

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
        lightPosition: {value: new THREE.Vector3(0,2,0)},
        
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
    //   createStar(STAR_INNER_RADIUS, STAR_OUTER_RADIUS, STAR_SIDES),
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
