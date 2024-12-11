import * as THREE from "three";

const WATERFALL_PARTICLE_COUNT = 2500;
const WATERFALL_X = 8.0
const WATERFALL_X_OFFSET = -5.0
const WATERFALL_Y = 8.0;
const WATERFALL_Z = 2.0
const WATERFALL_Z_OFFSET = - 10.0
const WATERFALL_SPEED = 0.1
const WATERFALL_COLOR = 0x5b73e6;

const SPLASH_COUNT = 300
const SPLASH_CENTER = { x: 0, z: -7.8 };
const SPLASH_Y = 6.0
const SPLASH_Y_OFFSET = -4.0
const SPLASH_MAX_Y = 4.0
const SPLASH_MAX_DIST = 5.0

let waterdropMaterial, waterParticles;
let splashMesh;

/**
 * Simulates a waterfall particle system with falling particles
 * @returns Waterfall Mesh
 */
function setUpWaterfall(){
  // Create waterdrop as a flat plane
  const waterdropGeometry = new THREE.PlaneGeometry(0.1, 3.0);
  waterdropGeometry.rotateX(Math.PI / 2);

  waterdropMaterial = new THREE.MeshBasicMaterial({
    color: WATERFALL_COLOR,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
  });

  // Use InstancedMesh to create a lot of the same object
  waterParticles = new THREE.InstancedMesh(
    waterdropGeometry,
    waterdropMaterial,
    WATERFALL_PARTICLE_COUNT
  );

  const waterdrop = new THREE.Object3D();
  for (let i = 0; i < WATERFALL_PARTICLE_COUNT; i++) {
    // Randomize x and z positions within the square area
    const x = Math.random() * WATERFALL_X + WATERFALL_X_OFFSET;
    const z = Math.random() * WATERFALL_Z + WATERFALL_Z_OFFSET;
    const y = Math.random() * WATERFALL_Y; // Set the initial height

    waterdrop.position.set(x, y, z);
    waterdrop.rotation.set(Math.PI / 2, 0, 0); 

    waterdrop.updateMatrix();
    waterParticles.setMatrixAt(i, waterdrop.matrix);
  }

  return waterParticles;
}

/**
 * Handles animation of the waterfall.
 */
function updateWaterfall() {
    const waterdrop = new THREE.Object3D();

    for (let i = 0; i < WATERFALL_PARTICLE_COUNT; i++) {
      // Decompose the current matrix into position, rotation, and scale
      waterParticles.getMatrixAt(i, waterdrop.matrix);
      waterdrop.matrix.decompose(
        waterdrop.position,
        waterdrop.quaternion,
        waterdrop.scale
      );

      // Update the y position for the falling effect
      waterdrop.position.y -= WATERFALL_SPEED * 3.0; 
      // Add some X/Z variance to make it look more random
      waterdrop.position.x += (Math.random() - 0.5) * WATERFALL_SPEED;
      waterdrop.position.z += (Math.random() - 0.5) * WATERFALL_SPEED;
      waterdrop.rotation.x += (Math.random() - 0.5) * WATERFALL_SPEED;

      // Reset particle position if it falls below y = 0
      if (waterdrop.position.y < 0) {
        waterdrop.position.x = Math.random() * WATERFALL_X + WATERFALL_X_OFFSET;
        waterdrop.position.z = Math.random() * WATERFALL_Z + WATERFALL_Z_OFFSET;
        waterdrop.position.y = WATERFALL_Y;
      }

      waterdrop.updateMatrix();
      waterParticles.setMatrixAt(i, waterdrop.matrix);
    }

    // Mark it as needing update
    waterParticles.instanceMatrix.needsUpdate = true;
}

/**
 * Creates a particle system using a smoke texture to simulate the mist of a waterfall splashing
 * @returns Splash mesh
 */
function setUpSplash() {
    const textureLoader = new THREE.TextureLoader();
    const smokeTexture = textureLoader.load("textures/smoke.png");
    const smokeGeometry = new THREE.BufferGeometry();
    const smokeMaterial = new THREE.PointsMaterial({
      map: smokeTexture,
      transparent: true,
      opacity: 0.5,
      size: 5, 
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  // Smoke positions
  const positions = new Float32Array(SPLASH_COUNT * 3);
  // Initialize positions
  for (let i = 0; i < SPLASH_COUNT; i++) {
    // Place smoke at a random location in a circle around where the waterfall hits the ocean
    const angle = Math.random() * 2 * Math.PI;
    const radius = Math.sqrt(Math.random()) * SPLASH_MAX_DIST; 

    const offsetX = radius * Math.cos(angle); 
    const offsetZ = radius * Math.sin(angle); 

    positions[i * 3] = SPLASH_CENTER.x + offsetX;
    positions[i * 3 + 1] = Math.random() * SPLASH_Y + SPLASH_Y_OFFSET; 
    positions[i * 3 + 2] = SPLASH_CENTER.z + offsetZ;
  }

  smokeGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );

  splashMesh = new THREE.Points(smokeGeometry, smokeMaterial);
  return splashMesh;
}

/**
 * Handles splash animation
 */
function updateSplash(){
  // Get the position attribute from the points geometry
  const positions = splashMesh.geometry.attributes.position.array;
  // Update each smoke's position
  for (let i = 0; i < positions.length; i += 3) {
    // Move the smoke up
    positions[i + 1] += Math.random() * 0.008; 

    // If the smoke is above SPLASH_MAX_Y, reset its Y position
    if (positions[i + 1] > SPLASH_MAX_Y) {
      // Place smoke at a random location in a circle around where the waterfall hits the ocean
      const angle = Math.random() * 2 * Math.PI; 
      const radius = Math.sqrt(Math.random()) * SPLASH_MAX_DIST;

      const offsetX = radius * Math.cos(angle);
      const offsetZ = radius * Math.sin(angle);
      positions[i] = SPLASH_CENTER.x + offsetX;
      positions[i + 1] = Math.random() * SPLASH_Y + SPLASH_Y_OFFSET;
      positions[i * 3 + 2] = SPLASH_CENTER.z + offsetZ;
    }
  }

  // Mark the position attribute as needing an update
  splashMesh.geometry.attributes.position.needsUpdate = true;
}

export { setUpWaterfall, updateWaterfall, setUpSplash, updateSplash };
