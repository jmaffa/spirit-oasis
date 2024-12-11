import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DragControls } from 'three/addons/controls/DragControls.js';
import { FishGeometry, FishAnimation, FishReturning } from './fish.js';

let renderer, scene, camera;

let t = 0;

let fishPull;
let isFishPickedUp = false;
let isFishReturning = false;

let dragControls;

init();

function init() {
  // SET UP SCENE
  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0x18396d );

  // SET UP CAMERA
  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
  camera.position.set(3, 3, 6); // Positioned diagonally for an angled view

  // SET UP RENDERER
  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setAnimationLoop( animate );
  document.body.appendChild( renderer.domElement );

  // ADD SPOT LIGHT
  const spotLight = new THREE.SpotLight(0xffffff, 10);
  spotLight.position.set(2.5, 5, 2.5);
  spotLight.angle = Math.PI / 6;
  spotLight.castShadow = true;
  scene.add(spotLight);

  // CREATE CUBE
  const geometry = new THREE.BoxGeometry(1, 2, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  const cube = new THREE.Mesh(geometry, material);
  cube.position.set(0, 1, 0); // Adjust to lay flat
  cube.rotation.z = Math.PI / 2; // Rotate to lay on the long side
  scene.add(cube);

  fishPull = FishGeometry(scene);

  // MOUSE ROTATION CONTROLS
  const orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.minDistance = 2; // Minimum zoom distance
  orbitControls.maxDistance = 10; // Maximum zoom distance
  orbitControls.minPolarAngle = 0; // Allow camera to rotate straight up
  orbitControls.maxPolarAngle = Math.PI * 1 / 3; // Allow camera to rotate straight down
  orbitControls.target.set(0, 0, 0); // Focus the controls on the origin
  orbitControls.update();

  dragControls = new DragControls( [fishPull], camera, renderer.domElement)
  dragControls.addEventListener( 'dragstart', function ( event ) {
    orbitControls.enabled = false;
    isFishPickedUp = true;
    // event.object.material.emissive.set( 0xaaaaaa );
    spotLight.color.setHex(0x00ff00);
  } );
  
  dragControls.addEventListener( 'dragend', function ( event ) {
    orbitControls.enabled = true;
    event.object.material.emissive.set( 0x000000 );
    event.object.position.y = 0;
    spotLight.color.setHex(0xffffff);
    isFishPickedUp = false;
    isFishReturning = true;
  } );

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  if (!isFishPickedUp) {
    if (isFishReturning) {
      const position = fishPull.position;

  console.log(`Fish position: x=${position.x}, y=${position.y}, z=${position.z}`);

      let fishTargetPos = new THREE.Vector3(fishPull.position.x, 0, fishPull.position.z);
      isFishReturning = FishReturning(fishPull, fishPull.position, fishTargetPos);
      console.log("isFishReturning: " + isFishReturning);
    } else {
      FishAnimation(fishPull, t, 2, isFishReturning);
      t += 0.01;
      // console.log("fish is going");
    }
  }

  renderer.render(scene, camera);
}

renderer.setAnimationLoop( animate );
