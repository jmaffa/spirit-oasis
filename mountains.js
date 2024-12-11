import * as THREE from "three";

const vertShader = `
`
const fragShader = `
`
const material = new THREE.ShaderMaterial();

function createMountainMesh() {
  const mountainMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 2, 1),
    material
  );
  // TODO: Geometry
  // TODO: Material
  return oceanMesh;
}

export { createMountainMesh };
