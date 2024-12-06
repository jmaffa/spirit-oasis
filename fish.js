import * as THREE from 'three';

function FishGeometry(scene) {
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

function FishAnimation(fish, t, fishRotationRadius) {
  // let newFishPositionX = fishRotationRadius * Math.cos(t);
  // let newFishPositionY = 0;
  // let newFishPositionZ = fishRotationRadius * Math.sin(t);
  // let newFishPosition = new THREE.Vector3(newFishPositionX, newFishPositionY, newFishPositionZ);

  fish.position.x = fishRotationRadius * Math.cos(t);
  fish.position.z = fishRotationRadius * Math.sin(t);
  
  // fish/cone tip should look in direction of the circle
  const velocity = new THREE.Vector3(
    -fishRotationRadius * Math.sin(t),
    0,
    fishRotationRadius * Math.cos(t)
  );

  fish.lookAt(
    fish.position.x + velocity.x,
    fish.position.y + velocity.y,
    fish.position.z + velocity.z
  );

  // tilt the fish/cone to lie flat
  fish.rotateX(Math.PI / 2);
}

function FishReturning(fish, target) {
  const speed = 0.01;
  fish.translateOnAxis(target - fish.position, speed);
}

export { FishGeometry, FishAnimation, FishReturning }
