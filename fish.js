import * as THREE from 'three';

function genBezier(initialPos, isClockwise) {
    const points = [initialPos];
    const height = 0;
    const minRadius = isClockwise ? 0.75 : 1.8;
    const maxRadius = isClockwise ? 1.8 : 2.75;

    const numDivisions = THREE.MathUtils.randInt(6, 12);
    const angleInterval = 2 * Math.PI / numDivisions;
    
    let theta = Math.atan(initialPos.z / initialPos.x);
    console.log("theta "+ theta);
    
    for (let i = 0; i < numDivisions; i++) {
        if (isClockwise) {
            theta += angleInterval;
        } else {
            theta -= angleInterval;
        }
        let r = THREE.MathUtils.randFloat(minRadius, maxRadius);
        const x = r * Math.cos(theta);
        const z = r * Math.sin(theta);
        const pt = new THREE.Vector3(x, height, z);
        points.push(pt);
    }

    const curve = new THREE.CatmullRomCurve3(points);
    return curve;

}

// generate a random bezier curve
function bezierCurve(initialPos, isClockwise) {
    const points = [initialPos];
    const height = 0;
    const minRadius = isClockwise ? 0.75 : 1.8;
    const maxRadius = isClockwise ? 1.8 : 2.75;
    // const minRadius = 1;
    // const maxRadius = 2;

    const numDivisions = THREE.MathUtils.randInt(6, 12);
    const angleInterval = 2 * Math.PI / numDivisions;

    if (initialPos.y != 0) {
        console.log(" not at y = 0, bringing there first");
        points.push(new THREE.Vector3(initialPos.x, 0, initialPos.z));
    }
    for (let i = 0; i < numDivisions; i++) {
        let theta;
        if (isClockwise) {
            theta = i * angleInterval;
        } else {
            theta = -i * angleInterval;
        }

        let r = THREE.MathUtils.randFloat(minRadius, maxRadius);
        const x = r * Math.cos(theta);
        const z = r * Math.sin(theta);
        const pt = new THREE.Vector3(x, height, z);
        points.push(pt);
    }
    // points.push(initialPos);
    
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

export { updateTui, updateLa, bezierCurve, genBezier }