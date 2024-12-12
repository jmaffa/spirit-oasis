import * as THREE from "three";

function createMountainMesh(width, depth) {
  const mountainGeometry = new THREE.PlaneGeometry(width, depth, 35, 50)
  const vertices = mountainGeometry.attributes.position;

  for (let i = 0; i < vertices.count; i++){
    const x = vertices.getX(i);
    const y = vertices.getY(i);
    const z = Math.random() * 25.0 - 10.0;
    vertices.setZ(i,z);
  }
  vertices.needsUpdate = true;
  mountainGeometry.computeVertexNormals();

  const mountainMaterial = new THREE.MeshStandardMaterial({
    color : 0xd4e7f3,
    // color: 0xa2cfea,
    flatShading: true,
  });


  const mountainMesh = new THREE.Mesh(
    mountainGeometry,
    mountainMaterial
  );
  return mountainMesh;
}

function createSideLand(radius,depth){
  const landGeometry = new THREE.CylinderGeometry(radius, radius, depth, 32)
  const landMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4e7f3,
  });

  const landMesh = new THREE.Mesh(
    landGeometry,
    landMaterial
  )
  return landMesh
}

export { createMountainMesh, createSideLand };
