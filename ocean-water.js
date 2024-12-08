
import * as THREE from 'three';

const INIT_BLOOM = 0.05
const OCEAN_BLOOM_THRESHHOLD_LOW = INIT_BLOOM;
const OCEAN_BLOOM_THRESHHOLD_HIGH = 3.0;
const STAR_INNER_RADIUS = 9;
const STAR_OUTER_RADIUS = 6;
const STAR_SIDES = 5;
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

// adapted from https://www.shadertoy.com/view/llS3RK
const worleyShader = `
    uniform vec2 resolution;
    uniform float time;
    // TODO: should take a uniform bool that is like controlling the bloom tbh too 
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
        
        return bloom * exp(-9.0 * abs(2.5 * dist - 1.0));
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
        float t = fworley(uv * resolution / 1500.0);

        float falloff = smoothstep(0.2, 0.8, t);  // smoothstep falloff based on distance from center
        // t *= falloff;

        // t *= exp(-lengthSquared(abs(0.7 * uv - 1.0)));
        // t *= exp(-lengthSquared(abs(0.3 * uv - 1.0)));  // Change the scaling factor to 0.3

        gl_FragColor = vec4(t * vec3(0.1, 1.1 * t, pow(t, 0.5 - t)), 1.0);
    }
`;

const waterMaterial = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0.0 },
        resolution: {
            value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
        bloom: { value: INIT_BLOOM}
    },
    vertexShader: vertexShader,
    fragmentShader: worleyShader,
});  

function createStar(innerRadius, outerRadius, points) {
  const shape = new THREE.Shape();
  const angleStep = Math.PI / points; // Angle between points

  // Create outer and inner points
  for (let i = 0; i < points; i++) {
    const angle = (i * Math.PI * 2) / points;

    // Outer point
    const outerX = Math.cos(angle) * outerRadius;
    const outerY = Math.sin(angle) * outerRadius;
    if (i === 0) {
      shape.moveTo(outerX, outerY);
    } else {
      shape.lineTo(outerX, outerY);
    }

    // Inner point
    const innerAngle = angle + angleStep;
    const innerX = Math.cos(innerAngle) * innerRadius;
    const innerY = Math.sin(innerAngle) * innerRadius;
    shape.lineTo(innerX, innerY);
  }

  shape.closePath(); // Close the path to complete the star

  const extrudeSettings = {
    depth: 5, // Thickness of the cylinder
    bevelEnabled: false, // Disable beveling
  };
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}



function createOceanMesh(){
    const oceanMesh = new THREE.Mesh(
      createStar(STAR_INNER_RADIUS, STAR_OUTER_RADIUS, STAR_SIDES),
      waterMaterial
    );
    return oceanMesh
}

function updateWater(bloomOn) {
  waterMaterial.uniforms.time.value += 0.05;
  if (
    bloomOn &&
    waterMaterial.uniforms.bloom.value < OCEAN_BLOOM_THRESHHOLD_HIGH
  ) {
    waterMaterial.uniforms.bloom.value += 0.01;
  }
  if (
    !bloomOn &&
    waterMaterial.uniforms.bloom.value > OCEAN_BLOOM_THRESHHOLD_LOW
  ) {
    waterMaterial.uniforms.bloom.value -= 0.01;
  }
}

export { createOceanMesh, updateWater, INIT_BLOOM };
