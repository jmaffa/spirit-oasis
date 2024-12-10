import * as THREE from 'three';


// generate a random bezier curve
function bezierCurve(isClockwise) {
    const points = [];
    const height = 0;
    const minRadius = isClockwise ? 0.75 : 1.8;
    const maxRadius = isClockwise ? 1.8 : 2.75;
    // const minRadius = 1;
    // const maxRadius = 2;

    const numDivisions = THREE.MathUtils.randInt(6, 12);
    const angleInterval = 2 * Math.PI / numDivisions;

    for (let i = 0; i < numDivisions; i++) {
        let theta;
        if (isClockwise) {
            theta = i * angleInterval;
        } else {
            theta = -i * angleInterval;
        }

        let r = THREE.MathUtils.randFloat(minRadius, maxRadius);
        if (i == 0 || i == numDivisions - 1) r = minRadius;
        const x = r * Math.cos(theta);
        const z = r * Math.sin(theta);
        const pt = new THREE.Vector3(x, height, z);
        points.push(pt);
    }
    points.push(points[0]);
    
    const curve = new THREE.CatmullRomCurve3(points);
    return curve;
}

function updateTui(tui, curve, fishTime) {
    const pos = curve.getPoint(fishTime);

    tui.position.copy(pos);
    const tangent = curve.getTangent(fishTime).normalize();
    const axis = new THREE.Vector3(1, 0,0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, tangent);
    tui.quaternion.copy(quaternion);
}

function updateLa(la, curve, fishTime) {
    const pos = curve.getPoint(fishTime);
    la.position.copy(pos);
    const tangent = curve.getTangent(fishTime).normalize();
    const axis = new THREE.Vector3(1, 0,0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, tangent);
    la.quaternion.copy(quaternion);
}

export { updateTui, updateLa, bezierCurve }