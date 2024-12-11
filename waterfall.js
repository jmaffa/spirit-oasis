import * as THREE from "three";
import { clamp } from "three/src/math/MathUtils.js";

const vertShader = `
    varying vec2 vUv;

    void main() {
        vUv = uv; // Pass UV coordinates to the fragment shader
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;
const fragShader = `
    // uniform sampler2D iChannel0; // Background texture
    uniform vec2 resolution;    // Resolution
    uniform float time;         // Time for animation

    varying vec2 vUv;

    // Function definitions (adapted from your code)
    float get_mask(vec2 uv) {
        uv.y *= 4.0;
        uv.y -= 1.0;
        uv.x *= 0.6;
        uv.x *= pow(uv.y, 0.38);
        uv.x = abs(uv.x);
        return smoothstep(0.65, 1.0, uv.x) * step(0.0, uv.y);
    }

    // float snoise(vec3 v) {
    //     // Placeholder for your noise function. Use a Perlin noise implementation or similar.
    //     return fract(sin(dot(v, vec3(12.9898, 78.233, 45.5432))) * 43758.5453);
    // }

    // GLSL Simplex Noise
vec4 permute(vec4 x) {
    return mod(((x*34.0)+1.0)*x, 289.0);
}

vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) { 
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    //  x0, x1, x2, x3
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy; 
    vec3 x3 = x0 - D.yyy;

    // Permutations
    i = mod(i, 289.0); 
    vec4 p = permute(permute(permute( 
                i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
                i.y + vec4(0.0, i1.y, i2.y, 1.0)) + 
                i.x + vec4(0.0, i1.x, i2.x, 1.0));

    // Gradients
    float n_ = 1.0/7.0; // N points are the corners of a stretched cube
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  // Modulo 7
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_); 

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    // Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix contributions from the four corners
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}


    float fbm(vec3 p, out vec3 gradient) {
        float value = 0.0;
        float amplitude = 0.3;
        float frequency = 1.0;
        float rotation = 1.5;
        vec3 grad = vec3(0.0);
        for (int i = 0; i < 4; i++) {
            float noise = snoise(frequency * p - gradient);
            value += amplitude * noise;
            grad.z = 0.0;
            gradient += amplitude * grad * 0.3;
            frequency *= 2.0;
            amplitude *= 0.5;
            rotation *= 2.0;
        }
        return value;
    }

    void main() {
        vec2 uv = vUv;
        uv.x = uv.x * 2.0 - 1.0;
        uv.x *= resolution.x / resolution.y;

        float mask = get_mask(uv);

        vec3 solidBackground = vec3(0.1, 0.2, 0.3); // Solid background color (e.g., dark blue)

        vec3 p = vec3(uv, 0.0);
        p.x *= pow(p.y, 0.5);
        p.y = pow(p.y, 0.5);

        vec3 gradient = vec3(0.0);
        float noise = fbm(p + vec3(0.0, time * 0.6, 0.0), gradient);
        noise = noise * 0.5 + 0.5;
        vec3 col = mix(vec3(noise) * vec3(0.6, 0.6, 0.9) * 2.0, solidBackground, mask);
        gl_FragColor = vec4(col, 1.0);
    }
`;
const material = new THREE.ShaderMaterial({
    uniforms : {
         resolution : {value : new THREE.Vector2(window.innerWidth, window.innerHeight) },
         time : { value : 0.0 },
    },
    vertexShader : vertShader,
    fragmentShader : fragShader
});

function createWaterfallMesh() {
  // TODO: Geometry
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(8, 10, 8),
    material
  );
  return mesh;
}
function updateWaterfall(){
    material.uniforms.time.value += 0.01;
}


// Waterfall splash particle effect
// // Create a geometry to hold particles
const particleCount = 100;
const particleGeometry = new THREE.BufferGeometry();
const particleVertShader = `
    uniform float time;
    attribute vec3 velocity;
    void main() {
        vec3 newPosition = position + velocity * time;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        gl_PointSize = 5.0; // Size of the particle
    }
`;

const particleFragShader = `
    void main(){
        gl_FragColor = vec4(0.6, 0.6, 0.9, 1.0); // Water-like color
    }
`;
const particleMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0.0 },
    fragDeltaTime: { value: 1.0}
  },
  vertexShader: particleVertShader, // Your vertex shader source
  fragmentShader: particleFragShader, // Your fragment shader source
//   transparent: true,
});

function createParticleSystem(){
    return newParticleRandom();

}

function newParticleRandom(){
  // Particle system parameters
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);

  // Initialize positions and velocities
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = Math.random() * 3.0 - 0.25; // X: Spread points along the X-axis (spacing 0.2)
    positions[i * 3 + 1] = Math.random(); // Y: All points at Y=0
    positions[i * 3 + 2] = Math.random() * 3.0 - 0.25; // Z: All points at Z=0
    velocities[i * 3] = 0; 
    velocities[i * 3 + 1] = -Math.random() * 0.02 - 0.01; 
    velocities[i * 3 + 2] = 0; 
  }

  particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute("velocity", new THREE.BufferAttribute(velocities, 3));

  const points = new THREE.Points(particleGeometry, particleMaterial);
  return points;
}



function animateParticles() {
  const positions = particleGeometry.attributes.position.array;
  const velocities = particleGeometry.attributes.velocity.array;
  const frameDeltaTime = particleMaterial.uniforms.fragDeltaTime.value;

  // Define vertical limits (Y-axis)
  const Y_MIN = -0.5;
  const Y_MAX = 0.5;

  // Optional: Damping factor for vertical velocity to prevent endless downward drift
  const verticalDamping = 0.99;

  for (let i = 0; i < particleCount; i++) {
    const index = i * 3;

    // Update X and Z positions based on velocity and current frame's time step
    positions[index] += velocities[index] * frameDeltaTime;
    positions[index + 2] += velocities[index + 2] * frameDeltaTime;

    // Update Y position (with velocity applied)
    positions[index + 1] += velocities[index + 1] * frameDeltaTime;

    // Apply vertical damping to slow down the downward movement
    velocities[index + 1] *= verticalDamping;

    // Check if the particle has fallen out of bounds on the Y-axis
    if (positions[index + 1] < Y_MIN) {
      // Reset position and reverse velocity to simulate bounce
      positions[index + 1] = Y_MIN;
      velocities[index + 1] = Math.abs(velocities[index + 1]); // Bounce upward
    } else if (positions[index + 1] > Y_MAX) {
      // Reset position and reverse velocity to simulate bounce
      positions[index + 1] = Y_MAX;
      velocities[index + 1] = -Math.abs(velocities[index + 1]); // Bounce downward
    }

    // Reset particle position if it moves out of X/Z bounds
    if (
      positions[index] < -2.0 ||
      positions[index] > 2.0 ||
      positions[index + 2] < -2.0 ||
      positions[index + 2] > 2.0
    ) {
      // Randomize X and Z position within bounds
      positions[index] = Math.random() * 3.0 - 1.5;
      positions[index + 2] = Math.random() * 3.0 - 1.5;

      // Randomize velocity for X and Z
      velocities[index] = Math.random() * 0.02 - 0.01;
      velocities[index + 2] = Math.random() * 0.02 - 0.01;
    }
  }

  // Flag to update the geometry
  particleGeometry.attributes.position.needsUpdate = true;
}
function updateWaterfallParticles(delta) {
  particleMaterial.uniforms.time.value += delta * 5.0;
  animateParticles();
}


// NEW WATERFALL ATTEMPT?? IDK whole thing particle system?

const maxParticleCount = 2500;
const instanceCount = maxParticleCount / 2;
let rainMaterial, rainParticles;

function setUpRain(){
  const rainGeometry = new THREE.PlaneGeometry(0.1, 2);
//   const rainGeometry = new THREE.CapsuleGeometry(1, 1, 4, 8);
  rainGeometry.rotateX(Math.PI / 2);

  rainMaterial = new THREE.MeshBasicMaterial({
    color: 0x5B73E6,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  rainParticles = new THREE.InstancedMesh(
    rainGeometry,
    rainMaterial,
    maxParticleCount
  );

//   const rainTest = new THREE.Mesh(
//     new THREE.CylinderGeometry(3, 3, 3, 16),
//     rainMaterial
//   );

  // Set random positions in a square area at y = 2
  const dummy = new THREE.Object3D();
  const squareSize = 10; // Size of the square area (e.g., 10x10 units)

  for (let i = 0; i < maxParticleCount; i++) {
    // Randomize x and z positions within the square area
    // TODO: WATERFALL LOCATION
    const x = Math.random() * 8.0 - 5.0;
    const z = Math.random() * 2.0 - 10;
    const y = Math.random() * 8.0; // Set the initial height

    dummy.position.set(x, y, z);
    dummy.rotation.set(Math.PI / 2, 0, 0); // Optional: You can set random rotations if desired

    dummy.updateMatrix();
    rainParticles.setMatrixAt(i, dummy.matrix);
  }

  return rainParticles;
}

function updateRain() {
    const dummy = new THREE.Object3D();
    const count = rainParticles.count;
    const delta = 0.1

    for (let i = 0; i < count; i++) {
      // Decompose the current matrix into position, rotation, and scale
      rainParticles.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

      // Update the y position for the falling effect
      dummy.position.y -= delta * 2; // Control speed with `delta`
      dummy.position.x += (Math.random() - 0.5) * delta; // Small horizontal drift
      dummy.position.z += (Math.random() - 0.5) * delta; // Small depth drift

      dummy.rotation.x += (Math.random() - 0.5) * delta;
      dummy.rotation.z += (Math.random() - 0.5) * delta;

      // Reset particle position if it falls below y = 0
      if (dummy.position.y < 0) {
        // TODO: WATERFALL LOCATION
        dummy.position.x = Math.random() * 8.0 - 5.0;
        dummy.position.z = Math.random() * 2.0 - 10;
        dummy.position.y = 8; // Reset to top
      }

      // Update the matrix and set it back
      dummy.updateMatrix();
      rainParticles.setMatrixAt(i, dummy.matrix);
    }

    // Mark the instance matrix as needing an update
    rainParticles.instanceMatrix.needsUpdate = true;
}


// function setUpSplash(){
//   // Texture loader
//   const textureLoader = new THREE.TextureLoader();
//   const smokeTexture = textureLoader.load("textures/smoke1.png");

//   // Smoke particles material
//   const smokeMaterial = new THREE.PointsMaterial({
//     map: smokeTexture,
//     transparent: true,
//     opacity: 0.8,
//     size: 2, // Size of the points (adjust to scale particles down)
//     sizeAttenuation: true, // Make the points size attenuate with distance
//   });

//   // Smoke particles
//   const smokeParticles = [];
//   const smokeCount = 200;
//   const particlePositions = [];

//   const splashCenter = { x: 1, z: -7 }; // The center coordinates of the waterfall splash
//   const distanceThreshold = 2.0; // The radius around the waterfall splash where the smoke will appear

//   for (let i = 0; i < smokeCount; i++) {
//     // Generate random positions near the splash center, within the distance threshold
//     let offsetX, offsetZ;
//     do {
//       offsetX = Math.random() * distanceThreshold * 2 - distanceThreshold; // Random offset in x
//       offsetZ = Math.random() * distanceThreshold * 2 - distanceThreshold; // Random offset in z
//     } while (
//       Math.sqrt(Math.pow(offsetX, 2) + Math.pow(offsetZ, 2)) > distanceThreshold
//     );

//     const posX = splashCenter.x + offsetX;
//     const posZ = splashCenter.z + offsetZ;

//     // Random height to fill space around the splash
//     const posY = Math.random() * 3.0;

//     particlePositions.push(posX, posY, posZ);
//   }

//   // Create geometry with particle positions
//   const particleGeometry = new THREE.BufferGeometry();
//   particleGeometry.setAttribute(
//     "position",
//     new THREE.Float32BufferAttribute(particlePositions, 3)
//   );

// //   // Now transform all the points
// //   const positionArray = particlePositions;

// //   // Transform all points by applying an offset to their positions
// //   const transformOffset = new THREE.Vector3(0, 0, 0); // You can change this to apply a translation

// //   for (let i = 0; i < positionArray.length; i += 3) {
// //     positionArray[i] += transformOffset.x; // Modify X position
// //     positionArray[i + 1] += transformOffset.y; // Modify Y position
// //     positionArray[i + 2] += transformOffset.z; // Modify Z position
// //   }

//   // Create the point cloud object
//   const smokeEffect = new THREE.Points(particleGeometry, smokeMaterial);

//   return smokeEffect;
// }

function setUpSplash() {
    const textureLoader = new THREE.TextureLoader();
    const smokeTexture = textureLoader.load("textures/smoke1.png");
    const particleGeometry = new THREE.BufferGeometry();
    const pointMaterial = new THREE.PointsMaterial({
      map: smokeTexture,
      transparent: true,
      opacity: 0.8,
      size: 5, // Size of each point in the particle system
      sizeAttenuation: true, // Make the size of the points attenuate with distance
    });
    const smokeCount = 50;
  // Particle system parameters
  const positions = new Float32Array(smokeCount * 3);
  const velocities = new Float32Array(smokeCount * 3);

  // Initialize positions and velocities
  for (let i = 0; i < smokeCount; i++) {
    const posX = Math.random() * 5.0;
      const posZ = Math.random() * 5.0;
      const posY = Math.random() * 2.0;
    positions[i * 3] = Math.random() * 1.0; // X: Spread points along the X-axis (spacing 0.2)
    positions[i * 3 + 1] = Math.random() * 2.0; // Y: All points at Y=0
    positions[i * 3 + 2] = Math.random() * -7.0; // Z: All points at Z=0
    velocities[i * 3] = 0;
    velocities[i * 3 + 1] = -Math.random() * 0.02 - 0.01;
    velocities[i * 3 + 2] = 0;
  }

  particleGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );
  particleGeometry.setAttribute(
    "velocity",
    new THREE.BufferAttribute(velocities, 3)
  );

  const points = new THREE.Points(particleGeometry, pointMaterial);
  return points;
}
function setUpSplashOLDOLD(){
  const textureLoader = new THREE.TextureLoader();
  const smokeTexture = textureLoader.load("textures/smoke1.png");

  // Smoke particles material
  const pointMaterial = new THREE.PointsMaterial({
    map: smokeTexture,
    transparent: true,
    opacity: 0.8,
    size: 5, // Size of each point in the particle system
    sizeAttenuation: true, // Make the size of the points attenuate with distance
  });

  const testMaterial = new THREE.MeshStandardMaterial({
    color: 0x156289,
  });

  const smokeCount = 50;
  const positions = new Float32Array(smokeCount * 3);
  const particleUVs = new Float32Array(smokeCount * 2);
  for (let i = 0; i < smokeCount; i++) {
    //   const posX = Math.random() * 5.0;
    //   const posZ = Math.random() * 5.0;
    //   const posY = Math.random() * 2.0;
    const posX = i * 1.0; // Adjust the spacing as needed
    const posY = Math.random() * 1.0; // Random height for each particle
    const posZ = 0; // Place them all in the same Z plane for now

    positions[i * 3] = posX; // X: Spread points along the X-axis (spacing 0.2)
    positions[i * 3 + 1] = posY; // Y: All points at Y=0
    positions[i * 3 + 2] = posZ; // Z: All points at Z=0

    particleUVs[i * 3] = 0;
    particleUVs[i * 3 + 1] = 0;
    //   positions.push(posX, posY, posZ);
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  particleGeometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(particleUVs, 2)
  ); // Adding UVs for the texture

//   const smokeEffect = new THREE.Points(particleGeometry, testMaterial);
  return smokeEffect;
}
function setUpSplashOld(){
  // Texture loader
  const textureLoader = new THREE.TextureLoader();
  const smokeTexture = textureLoader.load("textures/smoke1.png");

  // Smoke particles material
  const pointMaterial = new THREE.PointsMaterial({
    map: smokeTexture,
    transparent: true,
    opacity: 0.8,
    size: 5, // Size of each point in the particle system
    sizeAttenuation: true, // Make the size of the points attenuate with distance
  });


  const smokeMaterial = new THREE.SpriteMaterial({
    map: smokeTexture,
    transparent: true,
    opacity: 0.3,
  });
  
  // Smoke particles
  const smokeParticles = [];
  const smokeCount = 50;

  const splashCenter = { x: 1, z: -7 }; // The center coordinates of the waterfall splash
  const distanceThreshold = 2.0; // The radius around the waterfall splash where the smoke will appear

  for (let i = 0; i < smokeCount; i++) {
    const particle = new THREE.Sprite(smokeMaterial);

    // Generate random positions near the splash center, within the distance threshold
    let offsetX, offsetZ;
    do {
      offsetX = Math.random() * distanceThreshold * 2 - distanceThreshold; // Random offset in x
      offsetZ = Math.random() * distanceThreshold * 2 - distanceThreshold; // Random offset in z
    } while (
      Math.sqrt(Math.pow(offsetX, 2) + Math.pow(offsetZ, 2)) > distanceThreshold
    );

    particle.position.set(
      splashCenter.x + offsetX,
      Math.random() * 1.0,
      splashCenter.z + offsetZ
    );
    particle.scale.set(10, 10, 1);

    smokeParticles.push(particle);
  }
  return smokeParticles;
}

export { createWaterfallMesh, updateWaterfall, createParticleSystem, updateWaterfallParticles, setUpRain, updateRain, setUpSplash };
