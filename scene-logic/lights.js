import * as THREE from 'three';
// import godraysVertexShader from './shaders/godraysVertexShader.glsl';
// import godraysFragmentShader from './shaders/godraysFragmentShader.glsl';

const vertexShader = `
// Vertex Shader Example
out float intensity;
uniform vec3 viewVector;          // Vector pointing to the viewer
uniform float c;                  // Intensity coefficient
uniform float p;                  // Intensity power
uniform float op;                 // Opacity factor

// Varying
out float opacity;

void main() {
    opacity = 1.0;
    vec3 vNormal = normalize(normalMatrix * normal);
    vec3 vNormel = normalize(viewVector);
    intensity = pow(c - dot(vNormal, vNormel), p);
    opacity = op;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
  uniform vec3 glowColor;
  in float intensity;
  in float opacity;

  void main() {
    vec3 glow = glowColor * intensity;
    gl_FragColor = vec4(glow, opacity);
  }
`;

function getRayMaterial(camera) {
  const raysMaterial = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: {
      glowColor: { value: new THREE.Color(0xffffff) },
      coneHeight: { value: 5.0 },
      time: { value: 0.0 },
      op: { value: 0.02 },
      viewVector: { value: camera.position },  // Add the view vector uniform
      c: { value: 1 },  // Intensity coefficient
      p: { value: 1.9 },  // Intensity power
    },
    transparent: true, // Allow blending
    depthWrite: false, // Avoid writing to depth buffer
  });

  return raysMaterial;
}

function createCone(camera) {
  const radius = Math.random() * 2;  // Random radius between 0 and 2
  const height = 40;  // Fixed height for all cones
  // const geometry = new THREE.BoxGeometry(radius, height, 5);
  const geometry = new THREE.ConeGeometry(radius, height, 32);

  const cone = new THREE.Mesh(geometry, getRayMaterial(camera));

  const range = 5;
  cone.position.set(
      Math.random() * range - range/2,
      Math.random() * range - range/2,
      Math.random() * range - range/4
  );

  cone.rotation.x = -.5;
  cone.rotation.y = Math.random() * 0.5;

  return cone;
}

function generateCones(scene, camera) {
// Generate 20 cones and add them to the scene
  const cones = [];
  for (let i = 0; i < 20; i++) {
    const cone = createCone(camera);
    scene.add(cone);
    cones.push(cone);
  }

  return cones;
}

export {getRayMaterial, generateCones}