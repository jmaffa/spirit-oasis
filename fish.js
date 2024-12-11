import * as THREE from 'three';

let tuiCurve = genBezier(new THREE.Vector3(0, 0, 2), true);
let laCurve = genBezier(new THREE.Vector3(0, 0, -2), false);

const speed = 0.002;

function genBezier(initialPos, isClockwise) {
    const points = [initialPos];
    const height = 0;
    const minRadius = isClockwise ? 0.75 : 1.9;
    const maxRadius = isClockwise ? 1.8 : 2.75;

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
 * @param {*} spotLight 
 * @param {*} t 
 * @param {*} isDragging 
 */
function animateFish(fish, fishInt, spotLight, t, isDragging) {
  if (fish.position.y < -0.05) {fish.position.y = -0.05;} // make sure fish can't be dragged too far down
    // if new cycle
    if (t > 1 && fish.position.y == 0 && !isDragging) {
      t = 0;
      if (fishInt == 0) { // tui
        tuiCurve = genBezier(fish.position, true);
      } else if (fishInt == 1) { // la
        laCurve = genBezier(fish.position, false);
      }
    }

    if (!isDragging) {
      if (fish.position.y == 0) { // if la is in place!
        if (fishInt == 0) { // tui
          updateFishPosition(fish, tuiCurve, t); // she should move
        } else if (fishInt == 1) { // la
          updateFishPosition(fish, laCurve, t); // she should move
        }
        t += speed;
      } else { // la is not being dragged. she is falling!
        fish.position.y -= 0.35;
        fish.rotation.x = -Math.PI / 2;
        if (fish.position.y < 0) {
          fish.position.y = 0; // make sure she lands at zero
        }
      }
    } else {
      t = 0;
    }
    return t;
}

export { animateFish, genBezier }