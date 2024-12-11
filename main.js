import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DragControls } from 'three/addons/controls/DragControls.js';
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
import { updateSimulation, onMouseMove } from './pond-simulation.js';
import { genBezier, animateFish } from './fish.js';
import { update } from 'three/examples/jsm/libs/tween.module.js';

let pointLight;

let renderer, scene, camera, cubemap, dragControls;
let tui, la;
const fishArr = [];
let tuiTime = 0;
let laTime = 0;
const redMoonHSL = [0, 1, 1];
let isTuiDragging, isLaDragging = false;

// Flag to toggle bloom effect in "ocean"
let bloomOn = false;
// Constants to change "ocean" position
const OCEAN_X = 0;
const OCEAN_Y = -3.8; // TODO need ocean to stay under island
const OCEAN_Z = 0;

const ISLAND_X = 0;
const ISLAND_Y = 1.5;
const ISLAND_Z = 0;

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

function setupIsland(){
  const loader = new GLTFLoader();
  loader.load(
    "assets/island_v2.glb", // URL to your .glb file
    (gltf) => {
      const model1 = gltf.scene; // Access the loaded model

      // Scale the model
      model1.scale.set(0.35, 0.35, 0.35);

      // Position the model
      model1.position.set(ISLAND_X, ISLAND_Y, ISLAND_Z);

      scene.add(model1);
    },
    (xhr) => {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded"); // Progress callback
    },
    (error) => {
      console.error("An error happened:", error); // Error callback
    }
  );
}
/**
 * Sets up fish
 */
function setUpFish() {
  const loader = new GLTFLoader();

  const scale = 0.07;
  loader.load("assets/white_fish.glb", function (gltf) {
    tui = gltf.scene;
    tui.scale.set(scale, -scale, scale);
    tui.position.set(0, 2.2, 2);
    scene.add(tui);
    fishArr.push(tui);
  });

  loader.load("assets/black_fish.glb", function (gltf) {
    la = gltf.scene;
    la.scale.set(scale, -scale, scale);
    la.position.set(0, 2.2, -2);
    scene.add(la);
    fishArr.push(la);
  });
}

function setUpPondWater() {
  waterMesh.geometry = new THREE.PlaneGeometry(5, 5, 256, 256); // TODO can adjust to fit island
  waterMesh.rotation.x = -Math.PI / 2; 
  waterMesh.position.y = 2.5; // Place the water mesh above slightly below surface of island

  scene.add(waterMesh);
  document.addEventListener('mousemove', (event) => onMouseMove(event, renderer, camera));
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

  pointLight = new THREE.PointLight(0xffffff, 10);
  pointLight.position.set(0,5,0);
  scene.add(pointLight);

  // CREATE OCEAN
  // TODO: Joe: Water shading.
  setupOcean();
  
  // CREATE ISLAND
  // TODO: need to replace file after baking wood texture
  setupIsland();

  // CREATE FISH
  setUpFish();

  // CREATE "MOUNTAIN LAND"
  // TODO: work on this
  setUpMountains();

  // CREATE POND WATER MESH
  setUpPondWater();

  // MOUSE ROTATION CONTROLS
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 2;
  controls.maxDistance = 10;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI * 1 / 3;
  controls.target.set(0, 0, 0);
  controls.update();

   // DRAG CONTROLS for fish
  dragControls = new DragControls( fishArr, camera, renderer.domElement)
  dragControls.transformGroup = true;
  dragControls.addEventListener( 'dragstart', function ( event ) {
    controls.enabled = false;
    if (event.object == tui) {
      isTuiDragging = true;
    } else if (event.object == la) {
      isLaDragging = true;
    }
  } );
  
  dragControls.addEventListener( 'dragend', function ( event ) {
    controls.enabled = true;
    if (event.object == tui) {
      console.log("tui");
      isTuiDragging = false;
    } else if (event.object == la) {
      isLaDragging = false;
    }
  } );
  
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

function animate() {

  // Moves water and controls bloom based on `b` keypress
  updateWater(bloomOn);
  
  // Update the water's time uniform
  waterMesh.material.uniforms.time.value += 0.03;

  updateSimulation(renderer);

  if (tui) {
    tuiTime = animateFish(tui, 0, pointLight, tuiTime, isTuiDragging);
  }

  if (la) {
    laTime = animateFish(la, 1, pointLight, laTime, isLaDragging);
  }

  if (tui && la) {
    pointLight.intensity = Math.max(tui.position.y, la.position.y) * 10 + 10; // light increases as fish position gets higher
  }

  renderer.render(scene, camera);
}