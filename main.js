import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
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
import Cubemap from './cubemap.js';

let renderer, scene, camera, cubemap;

let spotLight, lightHelper;

// let camera, scene, renderer;
let mixer, objects, clock;
let model, floor, floorPosition;
let postProcessing;
let controls;
let stats;
let waterMaterial;

init();

//TODO: this is mostly junk
function perlinNoise(x, y, z) {
  // Implementation of Perlin noise
  // This is a placeholder, you need to use a real Perlin noise function
  // return Math.sin(x + y + z);
  return Math.random();
}

function updateWaterColor() {
  // OPTION 1
  waterMaterial.uniforms.time.value += 0.02;

  // OPTION 2
  // const time = Date.now() * 0.001; // Get the current time in seconds
  // const color1 = new THREE.Color(0x0487e2); // Base color 1
  // const color2 = new THREE.Color(0x74ccf4); // Base color 2

  // // Interpolate between the two colors based on time
  // const factor = (Math.sin(time) + 1) / 2; // Factor oscillates between 0 and 1
  // waterMaterial.color = color1.lerp(color2, factor);
}

function setup_water(){
  // RANDOM INITIALIZATION
  clock = new THREE.Clock();

  // Positive Y direction is below the scene
  // This light is coming from below
  const waterAmbientLight = new THREE.HemisphereLight(0x333366, 0x74ccf4, 5);
  waterAmbientLight.position.set(0, 6, 0);
  scene.add(waterAmbientLight);

  // I think I will need to write a new shader using worley noise, and then focus on the up and down of it maybe
  waterMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0.0 },
      resolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float time;
        varying vec2 vUv;

        // Simple 2D noise function
        float noise(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        // Smooth noise function
        float smoothNoise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            float a = noise(i);
            float b = noise(i + vec2(1.0, 0.0));
            float c = noise(i + vec2(0.0, 1.0));
            float d = noise(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a) * u.y + (d - b - c + a) * u.x * u.y;
        }

        // Turbulent effect for water ripples
        float turbulence(vec2 p) {
            float value = 0.0;
            float size = 1.0;
            for (int i = 0; i < 6; i++) {
                value += smoothNoise(p * size) / size;
                size *= 2.0;
            }
            return value;
        }

        void main() {
            vec2 uv = vUv * 5.0; // Scale the noise pattern
            float n = turbulence(uv - time * 0.1); // Animate by subtracting time
            gl_FragColor = vec4(vec3(n * 0.5 + 0.5), 1.0); // Map noise to 0-1 range
        }
    `,
  });  

  const water = new THREE.Mesh(
    new THREE.BoxGeometry(50, 0.001, 50),
    waterMaterial
  );
  water.position.set(0, -2, 0);
  scene.add(water);

  // const waterPosY = positionWorld.y.sub(water.position.y);

  // let transition = waterPosY.add(0.1).saturate().oneMinus();
  // transition = waterPosY
  //   .lessThan(0)
  //   .select(transition, normalWorld.y.mix(transition, 0))
  //   .toVar();

  // const colorNode = transition.mix( material.colorNode, material.colorNode.add( waterLayer0 ) );

  // material.colorNode = colorNode;
  // floor.material.color = colorNode;

  // const scenePass = pass(scene, camera);
  // const scenePassColor = scenePass.getTextureNode();
  // const scenePassDepth = scenePass.getLinearDepthNode().remapClamp(0.3, 0.5);

  // const waterMask = objectPosition(camera).y.greaterThan(
  //   screenUV.y.sub(0.5).mul(camera.near)
  // );

  // const scenePassColorBlurred = gaussianBlur(scenePassColor);
  // scenePassColorBlurred.directionNode = waterMask.select(
  //   scenePassDepth,
  //   scenePass.getLinearDepthNode().mul(5)
  // );

  // const vignet = screenUV.distance(0.5).mul(1.35).clamp().oneMinus();

  // postProcessing = new THREE.PostProcessing(renderer);
  // postProcessing.outputNode = waterMask.select(
  //   scenePassColorBlurred,
  //   scenePassColorBlurred.mul(color(0x74ccf4)).mul(vignet)
  // );
}

function init() {
  // // SET UP SCENE
  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0x18396d );

  // // SET UP CAMERA
  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
  camera.position.set(3, 3, 6);

  // SET UP RENDERER
  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  // renderer.setAnimationLoop( animate );
  document.body.appendChild( renderer.domElement );

  // ADD SPOT LIGHT
  const spotLight = new THREE.SpotLight(0xffffff, 10);
  spotLight.position.set(2.5, 5, 2.5);
  spotLight.angle = Math.PI / 6;
  spotLight.castShadow = true;
  scene.add(spotLight);

  // TODO: WATER BELOW
  setup_water();

  // CREATE CUBE
  const geometry = new THREE.BoxGeometry(1, 2, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  const cube = new THREE.Mesh(geometry, material);
  cube.position.set(0, 1, 0); // Adjust to lay flat
  cube.rotation.z = Math.PI / 2; // Rotate to lay on the long side
  scene.add(cube);

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
  scene.add(pond);

  // ADD WATER MESH
  waterMesh.geometry = new THREE.PlaneGeometry(5, 5, 256, 256); // Match the pond's size
  waterMesh.rotation.x = -Math.PI / 2; // Lay flat
  waterMesh.position.y = 0; // Position at the top of the pond
  scene.add(waterMesh);

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

  // MOUSE ROTATION CONTROLS
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 2;
  controls.maxDistance = 10;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI * 1 / 3;
  controls.target.set(0, 0, 0);
  controls.update();

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
// stats.update();

// controls.update();
  // floor.position.y = floorPosition.y - 5;

  // if (model) {
  //   mixer.update(delta);

  //   model.position.y = floorPosition.y;
  // }

  // for (const object of objects.children) {
  //   object.position.y = Math.sin(clock.elapsedTime + object.id) * 0.3;
  //   object.rotation.y += delta * 0.3;
  // }

  // postProcessing.render();
  updateWaterColor();
	// renderer.render( scene, camera );
  
  // update the water's time uniform
  waterMesh.material.uniforms.time.value += 0.01;

  // TODO claire update cubemap texture potentially

  renderer.render(scene, camera);
}

// renderer.setAnimationLoop( animate );
