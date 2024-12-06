import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DragControls } from 'three/addons/controls/DragControls.js';
import { DragControls } from 'three/addons/controls/DragControls.js';

let renderer, scene, camera;

let t = 0;

let fish1;

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

  fish1 = fishGeometry();
  fish1 = fishGeometry();

  // MOUSE ROTATION CONTROLS
  const orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.minDistance = 2; // Minimum zoom distance
  orbitControls.maxDistance = 10; // Maximum zoom distance
  orbitControls.minPolarAngle = 0; // Allow camera to rotate straight up
  orbitControls.maxPolarAngle = Math.PI * 1 / 3; // Allow camera to rotate straight down
  orbitControls.target.set(0, 0, 0); // Focus the controls on the origin
  orbitControls.update();

  dragControls = new DragControls( [fish1], camera, renderer.domElement)
  dragControls.addEventListener( 'dragstart', function ( event ) {
    orbitControls.enabled = false;
    event.object.material.emissive.set( 0xaaaaaa );
    spotLight.color.setHex(0x00ff00);
  
  } );
  
  dragControls.addEventListener( 'dragend', function ( event ) {
    orbitControls.enabled = true;
    event.object.material.emissive.set( 0x000000 );
    event.object.position.y = 0;
    spotLight.color.setHex(0xffffff);
  } );

  window.addEventListener("resize", onWindowResize);
}


function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}


function animate() {
  const fishRotationRadius = 2;
  fish1.position.x = fishRotationRadius * Math.cos(t);
  fish1.position.z = fishRotationRadius * Math.sin(t);

  // fish/cone tip should look in direction of the circle
  const velocity = new THREE.Vector3(
    -fishRotationRadius * Math.sin(t),
    0,
    fishRotationRadius * Math.cos(t)
  );

  fish1.lookAt(
    fish1.position.x + velocity.x,
    fish1.position.y + velocity.y,
    fish1.position.z + velocity.z
  );

  // tilt the fish/cone to lie flat
  fish1.rotateX(Math.PI / 2);

  t += 0.01;

  renderer.render(scene, camera);
  const fishRotationRadius = 2;
  fish1.position.x = fishRotationRadius * Math.cos(t);
  fish1.position.z = fishRotationRadius * Math.sin(t);

  // fish/cone tip should look in direction of the circle
  const velocity = new THREE.Vector3(
    -fishRotationRadius * Math.sin(t),
    0,
    fishRotationRadius * Math.cos(t)
  );

  fish1.lookAt(
    fish1.position.x + velocity.x,
    fish1.position.y + velocity.y,
    fish1.position.z + velocity.z
  );

  // tilt the fish/cone to lie flat
  fish1.rotateX(Math.PI / 2);

  t += 0.01;

  renderer.render(scene, camera);
}

renderer.setAnimationLoop( animate );

function fishGeometry() {
  // sample pond 
  const samplePondGeo = new THREE.CylinderGeometry(3, 3, 1);
  const sampleMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff })
  sampleMaterial.transparent = true;
  sampleMaterial.opacity = 0.5;
  const sampleCyl = new THREE.Mesh(samplePondGeo, sampleMaterial);
  sampleCyl.position.y = 0;
  scene.add(sampleCyl);

  // sample fish geo
  const fishGeo = new THREE.ConeGeometry(0.25, 1);
  const fishMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const fish = new THREE.Mesh(fishGeo, fishMat);
  fish.position.y = -.25;
  fish.position.set(0, 0, 2);
  scene.add(fish);

  return fish;
}
