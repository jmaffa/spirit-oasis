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

import {setUpRain, setUpSplash, updateRain, updateSplash } from './waterfall.js';

import { createGrassPatch } from './Grass.js';

import {setUpWaterfallMesh, setUpSplash, updateWaterfall, updateSplash } from './waterfall.js';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';

import { ColorifyShader } from 'three/examples/jsm/Addons.js';

import { WatercolorShader } from './Watercolor.js';

import { updatePondWater, waterMesh } from './pond.js';
import { createOceanMesh, updateOcean } from './ocean-water.js';
import { updateSimulation, onMouseMove } from './pond-simulation.js';
import { animateFish } from './fish.js'; 
import { update } from 'three/examples/jsm/libs/tween.module.js';
import { createMountainMesh, createSideLand } from './mountains.js';
import { getRayMaterial, generateCones } from './lights.js';

let pointLight1, pointLight2;

let renderer, scene, camera, cubemap, dragControls;
let tui, la;
const fishArr = [];
let tuiTime = 0;
let laTime = 0;
const redMoonColor = new THREE.Color(1, 0, 0);
const whiteMoonColor = new THREE.Color(1, 1, 1);
let isTuiDragging, isLaDragging = false;
let godRays = [];

// Flag to toggle bloom effect in "ocean"
let bloomOn = false;
// Constants to change "ocean" position
const OCEAN_X = 0;
const OCEAN_Y = -3.5; // TODO need ocean to stay under island
const OCEAN_Z = 0;

const ISLAND_X = 0;
const ISLAND_Y = 1.5;
const ISLAND_Z = 0;

const clock = new THREE.Clock();

init();

/**
 * Sets event listeners for all interactable key presses
 */
function setupKeyPressInteraction() {
  // Handles "ocean" water bloom
  document.addEventListener("keydown", function (event) {
    if (event.key === "b") {
      bloomOn = !bloomOn; // Toggle the flag
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

/**
 * Sets up simple mountains / external land in the scene
 */
function setUpMountains(){
  const mountainMeshBack = createMountainMesh(30, 10);
  mountainMeshBack.position.set(0,3.0,-15.0);
  mountainMeshBack.rotation.x = -Math.PI / 2; 
  scene.add(mountainMeshBack)

  const mountainMeshRightBack = createMountainMesh(30, 10);
  mountainMeshRightBack.position.set(8.0, 3.0, -12.0);
  mountainMeshRightBack.rotation.x = -Math.PI / 2;
  mountainMeshRightBack.rotation.z = -Math.PI / 4;
  scene.add(mountainMeshRightBack)

  const mountainMeshLeftBack = createMountainMesh(30, 10);
  mountainMeshLeftBack.position.set(-8.0, 3.0, -12.0);
  mountainMeshLeftBack.rotation.x = -Math.PI / 2;
  mountainMeshLeftBack.rotation.z = Math.PI / 4;
  scene.add(mountainMeshLeftBack);

  const mountainMeshLeftFront = createMountainMesh(20, 5);
  mountainMeshLeftFront.position.set(-9.0, 3.0, 8.0);
  mountainMeshLeftFront.rotation.x = -Math.PI / 2;
  mountainMeshLeftFront.rotation.z = - Math.PI / 3;
  scene.add(mountainMeshLeftFront);

  const mountainMeshRightFront = createMountainMesh(20, 5);
  mountainMeshRightFront.position.set(9.0, 3.0, 8.0);
  mountainMeshRightFront.rotation.x = -Math.PI / 2;
  mountainMeshRightFront.rotation.z = Math.PI / 3;
  scene.add(mountainMeshRightFront);

  const mountainMeshOutsideFrontRight = createMountainMesh(30, 2);
  mountainMeshOutsideFrontRight.position.set(3.0, 3.0, 28.0);
  mountainMeshOutsideFrontRight.rotation.x = -Math.PI / 2;
  mountainMeshOutsideFrontRight.rotation.z = -Math.PI / 2;
  scene.add(mountainMeshOutsideFrontRight);

  const mountainMeshOutsideFrontLeft = createMountainMesh(30, 2);
  mountainMeshOutsideFrontLeft.position.set(-3.0, 3.0, 28.0);
  mountainMeshOutsideFrontLeft.rotation.x = -Math.PI / 2;
  mountainMeshOutsideFrontLeft.rotation.z = -Math.PI / 2;
  scene.add(mountainMeshOutsideFrontLeft);

  // Then the land connected to mountains and bridge
  const rightFrontLand = createSideLand();
  rightFrontLand.position.set(9.0, -6.0, 4.0);
  rightFrontLand.rotation.x = -Math.PI / 2;
  rightFrontLand.rotation.z = -Math.PI / 6;
  scene.add(rightFrontLand)

  const leftFrontLand = createSideLand();
  leftFrontLand.position.set(-9.0, -6.0, 4.0);
  leftFrontLand.rotation.x = -Math.PI / 2;
  leftFrontLand.rotation.z = Math.PI / 6;
  scene.add(leftFrontLand);

  const frontLand = createSideLand();
  frontLand.position.set(0, -6.0, 26.0);
  frontLand.rotation.x = -Math.PI / 2;
  scene.add(frontLand);

}

/**
 * Sets up island
 */
function setupIsland(){
  const loader = new GLTFLoader();
  loader.load(
    "assets/island_v2.glb", // URL to your .glb file
    (gltf) => {
      const model1 = gltf.scene; // Access the loaded model

      // Apply Toon Shader
      model1.traverse((child) => {
        if (child.isMesh) {
          const originalColor = child.material.color.clone();
          child.material = new THREE.MeshToonMaterial({
            color: originalColor,
            map: child.material.map,
          });
        }
      });

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

/**
 * Sets up watercolor shader
 */
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);

const textureLoader = new THREE.TextureLoader();
const paperTexture = textureLoader.load('./textures/paper.png')

const watercolorEffect = new ShaderPass(WatercolorShader);
watercolorEffect.uniforms['tPaper'].value = paperTexture; // Use previously loaded paper texture
watercolorEffect.uniforms['texel'].value = new THREE.Vector2(1.0 / window.innerWidth, 1.0 / window.innerHeight);

/**
 * Sets up waterfall
 */
function setUpWaterfall(){

  scene.add(setUpWaterfallMesh());
  scene.add(setUpSplash());
}

/**
 * Sets up grass
 */
async function setUpGrass() {
  const GRASS_MODEL_URL = 'assets/grass.glb';

  console.log("Loading grass patches...");

  for (let i = 0; i < 100; i++) {
    await createGrassPatch(scene, GRASS_MODEL_URL);
  }

  console.log("Grass patches loaded.");
}

function init() {
  // // SET UP SCENE
  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0x18396d );
  // scene.background = new THREE.Color(0xffffff);

  // // SET UP CAMERA
  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
  camera.position.set(3, 10, 6);

  // SET UP RENDERER
  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  // renderer.setAnimationLoop( animate );
  document.body.appendChild( renderer.domElement );

  pointLight1 = new THREE.PointLight(0xffffff, 30);
  pointLight1.position.set(0,5,3);
  pointLight1.scale.set(2,2,2);
  scene.add(pointLight1);

  pointLight2 = new THREE.PointLight(0xffffff, 8);
  pointLight2.position.set(0,3,0);
  pointLight2.scale.set(1,1,1);
  scene.add(pointLight2);

  const light = new THREE.AmbientLight(0x404040); // Soft white light
  scene.add(light);

  // CREATE FISH
  setUpFish();
  
  godRays = generateCones(scene, camera);
  // CREATE OCEAN
  setupOcean();
  
  createRain();
  // CREATE WATERFALL
  setUpWaterfall();

  // CREATE ISLAND
  setupIsland();

  // CREATE MOUNTAINS
  setUpMountains();
  
  // CREATE POND WATER MESH
  setUpPondWater();

  // MOUSE ROTATION CONTROLS
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 5;
  controls.maxDistance = 10;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI * 3 / 10;
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
  
  // LOAD GRASS THEN ANIMATE
  setUpGrass().then(() => {
    console.log("Assets loaded!");
    renderer.setAnimationLoop(animate); // start animation loop after loading
  }); 
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  // TODO: post processing?
  // postProcessing.render();

  // Animates waterfall movement and splash
  updateWaterfall();
  updateSplash();

  // Moves water and controls bloom based on `b` keypress
  updateOcean(bloomOn);
  updatePondWater(bloomOn);
  
  // Update the water's time uniform
  waterMesh.material.uniforms.time.value += 0.03;

  updateSimulation(renderer);

  if (tui) {
    tuiTime = animateFish(tui, 0, pointLight2, tuiTime, isTuiDragging, godRays);
  }

  if (la) {
    laTime = animateFish(la, 1, pointLight2, laTime, isLaDragging, godRays);
  }

  if (tui && la) {
    pointLight2.intensity = Math.max(tui.position.y, la.position.y) * 10 + 10; // light increases as fish position gets higher
  }

  // renderer.render(scene, camera);

  composer.render(); // use this to render watercolor shader
}