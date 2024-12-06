import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


let renderer, scene, camera;

let spotLight, lightHelper;

init();

function init() {
  // SET UP SCENE
  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0x18396d );

  // SET UP CAMERA
  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
  camera.position.set(3, 3, 6);

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

  // CREATE PLANE
  const planeGeometry = new THREE.PlaneGeometry(5, 5);
  const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff, side: THREE.DoubleSide });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2; // Rotate to lay flat horizontally
  plane.position.y = 0; // Position as the ground
  scene.add(plane);

  // MOUSE ROTATION CONTROLS
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 2;
  controls.maxDistance = 10;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI * 1 / 3;
  controls.target.set(0, 0, 0);
  controls.update();

  window.addEventListener("resize", onWindowResize);

}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
	renderer.render( scene, camera );
}

renderer.setAnimationLoop( animate );
