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
import { createOceanMesh, updateWater } from './ocean-water.js';
import Cubemap from './cubemap.js';
import {setUpRain, setUpSplash, updateRain, updateSplash } from './waterfall.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';

import { ColorifyShader } from 'three/examples/jsm/Addons.js';

import { WatercolorShader } from './Watercolor.js';

import { updatePondWater, waterMesh } from './pond.js';
import { createOceanMesh, updateOcean, INIT_BLOOM } from './ocean-water.js';
import { updateSimulation, onMouseMove } from './pond-simulation.js';
import { genBezier, animateFish } from './fish.js';
import { update } from 'three/examples/jsm/libs/tween.module.js';

let pointLight1;
let pointLight2;

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
const OCEAN_Y = -3; // TODO need ocean to stay under island
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
  // const waterfall = createWaterfallMesh();
  // waterfall.position.set(5, 2, 5);
  // scene.add(waterfall);


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

// SET UP WATERCOLOR SHADER
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);

const textureLoader = new THREE.TextureLoader();
const paperTexture = textureLoader.load('./textures/paper.png')

const watercolorEffect = new ShaderPass(WatercolorShader);
watercolorEffect.uniforms['tPaper'].value = paperTexture; // Use previously loaded paper texture
watercolorEffect.uniforms['texel'].value = new THREE.Vector2(1.0 / window.innerWidth, 1.0 / window.innerHeight);

// TESTING: Colorify to Red 
const colorify = new ShaderPass(ColorifyShader);
colorify.uniforms["color"].value.setRGB(1,0,0);

composer.addPass(renderPass);
composer.addPass(watercolorEffect);
// composer.addPass(colorify);

function createRain(){
  // console.log('test')
  // const mesh = setUpRain();
  scene.add(setUpRain());
  const smokeParticles = setUpSplash();
  // for(let i = 0; i < smokeParticles.length; i++) {
  //   scene.add(smokeParticles[i]);
  // }
  scene.add(smokeParticles)
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

  pointLight1 = new THREE.PointLight(0xffffff, 30);
  pointLight1.position.set(0,5,3);
  pointLight1.scale.set(2,2,2);
  scene.add(pointLight1);

  pointLight2 = new THREE.PointLight(0xffffff, 0.5);
  pointLight2.position.set(0,3,0);
  pointLight2.scale.set(1,1,1);
  scene.add(pointLight2);

  const light = new THREE.AmbientLight(0x404040); // Soft white light
  scene.add(light);


  // CREATE OCEAN
  // TODO: Joe: Water shading.
  // setupOcean();
  
  // CREATE ISLAND
  // TODO: need to replace file after baking wood texture
  setupIsland();

  // CREATE FISH
  setUpFish();
  
  // CREATE "MOUNTAIN LAND"
  // TODO: work on this
  // setUpMountains();

  // create waterfall effect
  // const particleSystem = createParticleSystem();
  // scene.add(particleSystem);

  // CREATE OCEAN
  // TODO: Joe: Water shading.
  setupOcean();
  
  createRain();
  // CREATE ISLAND
  // TODO: make this more exciting.
  // setupIsland();

  // CREATE "MOUNTAIN LAND"
  // TODO: work on this
  setUpMountains();

  const testGeometry = new THREE.CylinderGeometry(1.0, 1.0, 10.0, 3); 
  const testMaterial = new THREE.MeshStandardMaterial({
    color: 0x156289,
  })
  const testMesh = new THREE.Mesh(
    testGeometry,
    testMaterial
  )
  testMesh.position.x = 1.0;
  testMesh.position.z = -7.0;
  // scene.add(testMesh)
  
  // CREATE CUBE
  // const geometry = new THREE.BoxGeometry(1, 2, 1);
  // const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  // const cube = new THREE.Mesh(geometry, material);
  // cube.position.set(0, 1, 0); // Adjust to lay flat
  // cube.rotation.z = Math.PI / 2; // Rotate to lay on the long side
  // scene.add(cube);

  // CREATE POND CYLINDER
  const pondGeometry = new THREE.CylinderGeometry(2.5, 2.5, 0.5, 64); // radiusTop, radiusBottom, height, radialSegments
  const pondMaterial = new THREE.MeshStandardMaterial({
    color: 0x156289,
    emissive: 0x072534,
    metalness: 0.5,
    roughness: 0.7,
    side: THREE.DoubleSide,
  }); // TODO claire check and modify

  const pond = new THREE.Mesh(pondGeometry, pondMaterial);
  pond.position.y = -0.25; // Position it slightly below w ater mesh
  // scene.add(pond);

  // ADD WATER MESH
  waterMesh.geometry = new THREE.PlaneGeometry(5, 5, 256, 256); // Match the pond's size
  waterMesh.rotation.x = -Math.PI / 2; // Lay flat
  waterMesh.position.y = 0; // Position at the top of the pond
  // scene.add(waterMesh);

  // LOAD CUBEMAP
  cubemap = new Cubemap({
    xpos: 'textures/xpos.png', // TODO claire - files need to include sky reflection
    xneg: 'textures/xneg.png',
    ypos: 'textures/ypos.png',
    yneg: 'textures/yneg.png',
    zpos: 'textures/zpos.png',
    zneg: 'textures/zneg.png',
  });

  scene.background = cubemap.texture;
  waterMesh.material.uniforms.uCubemap = { value: cubemap.texture };
  
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
  // TODO: post processing?
  // postProcessing.render();

  // Moves water and controls bloom based on `b` keypress
  updateWater(bloomOn);
  updateRain();
  updateSplash();

  // Moves water and controls bloom based on `b` keypress
  updateOcean(bloomOn);
  updatePondWater(bloomOn);
  
  // Update the water's time uniform
  waterMesh.material.uniforms.time.value += 0.03;

  updateSimulation(renderer);

  if (tui) {
    tuiTime = animateFish(tui, 0, pointLight2, tuiTime, isTuiDragging);
  }

  if (la) {
    laTime = animateFish(la, 1, pointLight2, laTime, isLaDragging);
  }

  if (tui && la) {
    pointLight2.intensity = Math.max(tui.position.y, la.position.y) * 10 + 10; // light increases as fish position gets higher
  }

  // renderer.render(scene, camera);
  composer.render(); // use this to render watercolor shader
}