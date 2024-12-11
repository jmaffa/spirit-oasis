import * as THREE from "three";

// WATERFALL PARTICLE SYSTEM

const maxWaterfallParticleCount = 2500;
const WATERFALL_X = 8.0
const WATERFALL_X_OFFSET = -5.0
const WATERFALL_Y = 8.0;
const WATERFALL_Z = 2.0
const WATERFALL_Z_OFFSET = - 10.0
const WATERFALL_SPEED = 0.1

const SPLASH_COUNT = 300
const SPLASH_CENTER = { x: 0, z: -7.1 };
const SPLASH_Y = 6.0
const SPLASH_Y_OFFSET = -4.0
const SPLASH_MAX_Y = 4.0


let rainMaterial, rainParticles;
let splashMesh;

function setUpRain(){
  const rainGeometry = new THREE.PlaneGeometry(0.1, 3.0);
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
    maxWaterfallParticleCount
  );

  // Set random positions in a square area at y = 2
  const dummy = new THREE.Object3D();

  for (let i = 0; i < maxWaterfallParticleCount; i++) {
    // Randomize x and z positions within the square area
    const x = Math.random() * WATERFALL_X + WATERFALL_X_OFFSET;
    const z = Math.random() * WATERFALL_Z + WATERFALL_Z_OFFSET;
    const y = Math.random() * WATERFALL_Y; // Set the initial height

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

    for (let i = 0; i < count; i++) {
      // Decompose the current matrix into position, rotation, and scale
      rainParticles.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

      // Update the y position for the falling effect
      dummy.position.y -= WATERFALL_SPEED * 3.0; // Control speed with `delta`
      dummy.position.x += (Math.random() - 0.5) * WATERFALL_SPEED; // Small horizontal drift
      dummy.position.z += (Math.random() - 0.5) * WATERFALL_SPEED; // Small depth drift

      dummy.rotation.x += (Math.random() - 0.5) * WATERFALL_SPEED;
    //   dummy.rotation.z += (Math.random() - 0.5) * WATERFALL_SPEED;

      // Reset particle position if it falls below y = 0
      if (dummy.position.y < 0) {
        dummy.position.x = Math.random() * WATERFALL_X + WATERFALL_X_OFFSET;
        dummy.position.z = Math.random() * WATERFALL_Z + WATERFALL_Z_OFFSET;
        dummy.position.y = WATERFALL_Y; // Reset to top
      }

      // Update the matrix and set it back
      dummy.updateMatrix();
      rainParticles.setMatrixAt(i, dummy.matrix);
    }

    // Mark the instance matrix as needing an update
    rainParticles.instanceMatrix.needsUpdate = true;
}


function setUpSplash() {
    const textureLoader = new THREE.TextureLoader();
    const smokeTexture = textureLoader.load("textures/smoke1.png");
    const particleGeometry = new THREE.BufferGeometry();
    const pointMaterial = new THREE.PointsMaterial({
      map: smokeTexture,
      transparent: true,
      opacity: 0.5,
      size: 5, // Size of each point in the particle system
      sizeAttenuation: true, // Make the size of the points attenuate with distance,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  // Particle system parameters
  const positions = new Float32Array(SPLASH_COUNT * 3);
  const velocities = new Float32Array(SPLASH_COUNT * 3);

    const distanceThreshold = 5.0; // The radius around the waterfall splash where the smoke will appear
  // Initialize positions and velocities
  for (let i = 0; i < SPLASH_COUNT; i++) {
    let offsetX, offsetZ;
    do {
        offsetX = Math.random() * distanceThreshold * 2 - distanceThreshold; // Random offset in x
        offsetZ = Math.random() * distanceThreshold * 2 - distanceThreshold; // Random offset in z
      } while (
        Math.sqrt(Math.pow(offsetX, 2) + Math.pow(offsetZ, 2)) > distanceThreshold
    );

    positions[i * 3] = SPLASH_CENTER.x + offsetX; // X: Spread points along the X-axis (spacing 0.2)
    positions[i * 3 + 1] = Math.random() * SPLASH_Y + SPLASH_Y_OFFSET; // Y: All points at Y=0
    positions[i * 3 + 2] = SPLASH_CENTER.z + offsetZ; // Z: All points at Z=0
  }

  particleGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );
  particleGeometry.setAttribute(
    "velocity",
    new THREE.BufferAttribute(velocities, 3)
  );

  splashMesh = new THREE.Points(particleGeometry, pointMaterial);
  return splashMesh;
}

function updateSplash(){
  // Get the position attribute from the points geometry
  const positions = splashMesh.geometry.attributes.position.array;
  const resetY = Math.random() * SPLASH_Y + SPLASH_Y_OFFSET;

  // Update each particle's position
  for (let i = 0; i < positions.length; i += 3) {
    // Move the particle up (increment Y)
    positions[i + 1] += Math.random() * 0.008; // Increment Y position

    // If the particle is above SPLASH_MAX_Y, reset its Y position
    if (positions[i + 1] > SPLASH_MAX_Y) {
      positions[i + 1] = resetY; // Reset Y position to the start
    }
  }

  // Mark the position attribute as needing an update
  splashMesh.geometry.attributes.position.needsUpdate = true;
}

export { setUpRain, updateRain, setUpSplash, updateSplash };
