import * as THREE from 'three';

const height = 2.2;
let tuiCurve = genBezier(new THREE.Vector3(0, height, 2), true);
let laCurve = genBezier(new THREE.Vector3(0, height, -2), false);

const speed = 0.002;


function genBezier(initialPos, isClockwise) {
    const points = [initialPos];
    const minRadius = isClockwise ? 0.3 : 0.7;
    const maxRadius = isClockwise ? 0.7 : 1.2;

    const numDivisions = THREE.MathUtils.randInt(6, 12);
    const angleInterval = (2 * Math.PI) / numDivisions;

    let theta = Math.atan2(initialPos.z, initialPos.x);
    console.log("Initial theta: " + theta);

    for (let i = 0; i < numDivisions; i++) {
        theta += isClockwise ? angleInterval : -angleInterval;

        // Random radius within bounds
        let r = THREE.MathUtils.randFloat(minRadius, maxRadius);
        const x = r * Math.cos(theta);
        const z = r * Math.sin(theta);

        // console.log(`Point ${i + 1}: x=${x}, z=${z}, r=${r}, theta=${theta}`);
        const pt = new THREE.Vector3(x, height, z);
        points.push(pt);
    }

    const curve = new THREE.CatmullRomCurve3(points);
    return curve;
}

function updateFishPosition(fish, curve, fishTime) {
    const pos = curve.getPoint(fishTime);
    fish.position.copy(pos);
    const tangent = curve.getTangent(fishTime).normalize();
    const axis = new THREE.Vector3(1, 0,0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, tangent);
    fish.quaternion.copy(quaternion);
}

/**
 * 
 * @param {*} fish 
 * @param {*} fishInt 
 * @param {*} light 
 * @param {*} t 
 * @param {*} isDragging 
 */
function animateFish(fish, fishInt, light, t, isDragging) {
  if (fish.position.y < height-0.05) {fish.position.y = height-0.05;} // make sure fish can't be dragged too far down
    // if new cycle
    if (t > 1 && fish.position.y == height && !isDragging) {
      t = 0;
      const currentPos = fish.position.clone();
      if (fishInt == 0) { // tui
        tuiCurve = genBezier(currentPos, true);
      } else if (fishInt == 1) { // la
        laCurve = genBezier(currentPos, false);
      }
    } else 

    if (!isDragging) {
      if (fish.position.y == height) { // if fish is in place!
        if (fishInt == 0) { // tui
          updateFishPosition(fish, tuiCurve, t); // she should move
        } else if (fishInt == 1) { // la
          updateFishPosition(fish, laCurve, t); // she should move
        }
        t += speed;
      } else { // fish is not being dragged. she is falling!
        fish.position.y -= 0.35;
        fish.rotation.x = -Math.PI / 2;
        if (fish.position.y < height) {
          fish.position.y = height; // make sure she lands at zero
        }
      }
    } else {
      t = 0;
    }
    return t;
}

export { animateFish, genBezier }