import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  color,
  vec2,
  pass,
  linearDepth,
  normalWorld,
  triplanarTexture,
  texture,
  objectPosition,
  screenUV,
  viewportLinearDepth,
  viewportDepthTexture,
  viewportSharedTexture,
  mx_worley_noise_float,
  positionWorld,
  time,
} from "three/tsl";

import { waterMesh } from './pond.js';
import { createOceanMesh, updateWater, INIT_BLOOM } from './ocean-water.js';
import Cubemap from './cubemap.js';
import { updateSimulation, onMouseMove } from './pond-simulation.js';


let renderer, scene, camera, cubemap;

let spotLight, lightHelper;

// Flag to toggle bloom effect in "ocean"
let bloomOn = false;
// Constants to change "ocean" position
const OCEAN_X = 0;
const OCEAN_Y = -4; // CLAIRE lowered slightly
const OCEAN_Z = 0;

const ISLAND_X = 0;
const ISLAND_Y = 0;
const ISLAND_Z = 0;
const ISLAND_RADIUS = 3;

const BRIDGE_X = -4;
const BRIDGE_Y = 2;
const BRIDGE_Z = 2;

init();

/**
 * Sets event listeners for all interactable key presses
 */
function setupKeyPressInteraction() {
  // Handles "ocean" water bloom
  document.addEventListener("keydown", function (event) {
    if (event.key === "b") {
      bloomOn = !bloomOn; // Toggle the flag
      console.log("Flag flipped:", bloomOn);
    }
  });
}

/**
 * Sets up ocean and initializes its position
 */
function setupOcean(){
  const water = createOceanMesh()
  water.position.set(OCEAN_X, OCEAN_Y, OCEAN_Z);
  water.rotation.x = -Math.PI / 2;
  water.rotation.z = -Math.PI / 2;
  scene.add(water);
}

function setupIsland(){
  const islandGeometry = new THREE.CylinderGeometry(ISLAND_RADIUS, ISLAND_RADIUS, 5, 32);
  const islandMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  const island = new THREE.Mesh(
    islandGeometry,
    islandMaterial
  )
  island.position.set(ISLAND_X, ISLAND_Y, ISLAND_Z);
  scene.add(island);
}

function setUpMountains(){
  const mountainGeometry = new THREE.CylinderGeometry(10, 10, 50, 32);
  const mountainMaterial = new THREE.MeshBasicMaterial({
    color: 0x0000ff, // Inside color
    // transparent: true, // Make the material transparent/
    opacity: 0.8, // Control transparency level (0 = fully transparent, 1 = fully opaque)
    side: THREE.BackSide, // Render the inside of the cylinder
    wireframe: false, // Optional: Turn off wireframe if not needed
  });
  const mountain = new THREE.Mesh(
    mountainGeometry,
    mountainMaterial
  )
  mountain.position.set(0,-5,0);
  scene.add(mountain);
}

function setupBridges(){
  const loader = new GLTFLoader();
  loader.load(
    "assets/bridge.glb", // URL to your .glb file
    (gltf) => {
      const model1 = gltf.scene; // Access the loaded model
      const model2 = model1.clone();

      // Scale the model
      model1.scale.set(0.5, 0.5, 0.5);

      // Position the model
      model1.position.set(BRIDGE_X, BRIDGE_Y, BRIDGE_Z);
      model1.rotation.set(
        0, 
        // 0,
        (5 * Math.PI / 3), 
        0 // No rotation around the z-axis
      );

      // Add the model to the scene
      
      
      // Scale the model
      model2.scale.set(0.5, 0.5, 0.5);

      // Position the model
      model2.position.set(-BRIDGE_X, BRIDGE_Y, BRIDGE_Z);
      model2.rotation.set(
        0, // Rotate 45 degrees around the x-axis
        7 * Math.PI / 3, // Rotate 90 degrees around the y-axis
        // 0,
        0 // No rotation around the z-axis
      );
      scene.add(model1);
      scene.add(model2);

      // scene.add(model); // Add it to the scene
    },
    (xhr) => {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded"); // Progress callback
    },
    (error) => {
      console.error("An error happened:", error); // Error callback
    }
  );
}

function init() {
  // // SET UP SCENE
  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0x18396d );

  // // SET UP CAMERA
  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
  camera.position.set(3, 10, 6);

  // SET UP RENDERER
  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  // renderer.setAnimationLoop( animate );
  document.body.appendChild( renderer.domElement );

  // ADD SPOT LIGHT
  // const spotLight = new THREE.SpotLight(0xffffff, 10);
  // spotLight.position.set(0, 5, 0);
  // spotLight.angle = Math.PI / 6;
  // spotLight.castShadow = false;
  // scene.add(spotLight);

  const pointLight = new THREE.PointLight(0xffffff, 10);
  pointLight.position.set(0,5,0);
  scene.add(pointLight);

  // CREATE OCEAN
  // TODO: Joe: Water shading.
  setupOcean();
  
  // CREATE ISLAND
  // TODO: make this more exciting.
  // setupIsland();

  setupBridges();

  // CREATE "MOUNTAIN LAND"
  // TODO: work on this
  setUpMountains();

  // CREATE "MOUNTAIN LAND"
  // TODO: work on this
  // setUpMountains();
  
  // CREATE CUBE
  // const geometry = new THREE.BoxGeometry(1, 2, 1);
  // const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  // const cube = new THREE.Mesh(geometry, material);
  // cube.position.set(0, 1, 0); // Adjust to lay flat
  // cube.rotation.z = Math.PI / 2; // Rotate to lay on the long side
  // scene.add(cube);
  
  // CREATE POND CYLINDER WITH TRANSPARENCY
  const pondGeometry = new THREE.CylinderGeometry(2.5, 2.5, 0.5, 64); // radiusTop, radiusBottom, height, radialSegments
  const pondMaterial = new THREE.MeshStandardMaterial({
    color: 0x156289,
    emissive: 0x072534,
    metalness: 0.5,
    roughness: 0.7,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5,  // Control transparency for the sides of the pond
    refractionRatio: 0.98,  // Simulate refraction for water
  });

  // This creates the pond as a cylinder
  const pond = new THREE.Mesh(pondGeometry, pondMaterial);
  pond.position.y = 1.8; // Position it slightly below the water mesh to create the "pond" look
  scene.add(pond);

  // ADD WATER MESH AS A TEXTURE ON THE POND
  waterMesh.geometry = new THREE.PlaneGeometry(5, 5, 256, 256); // Water mesh size matches the pond
  waterMesh.rotation.x = -Math.PI / 2; // Flat water mesh
  waterMesh.position.y = 2.5; // Place the water mesh above the pond (slightly inside)

  // Add the water mesh on top of the pond
  scene.add(waterMesh);

  // MOUSE ROTATION CONTROLS
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 2;
  controls.maxDistance = 10;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI * 1 / 3;
  controls.target.set(0, 0, 0);
  controls.update();
  
  setupKeyPressInteraction();
  window.addEventListener("resize", onWindowResize);

  

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(animate);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

document.addEventListener('mousemove', (event) => onMouseMove(event, renderer, camera));
// window.addEventListener('mousemove', (event) => onMouseMove(event, renderer, camera));

function animate() {

  // TODO: post processing?
  // postProcessing.render();

  // Moves water and controls bloom based on `b` keypress
  updateWater(bloomOn);
  
  // update the water's time uniform
  waterMesh.material.uniforms.time.value += 0.03;

  // TODO claire update cubemap texture potentially

  updateSimulation(renderer);
  renderer.render(scene, camera);
}

// renderer.setAnimationLoop( animate );
