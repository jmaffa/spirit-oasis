import * as THREE from 'three';

export default class Cubemap {
  constructor(paths) {
    const loader = new THREE.CubeTextureLoader();
    this.texture = loader.load([
      paths.xpos,
      paths.xneg,
      paths.ypos,
      paths.yneg,
      paths.zpos,
      paths.zneg,
    ]);
  }

  update(renderer, scene, camera) {
    // Can add dynamic updates here if required
  }
}