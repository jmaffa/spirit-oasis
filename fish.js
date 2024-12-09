import * as THREE from 'three';

let tuiCurve = bezierCurve();
const fishSpeed = 0.01;

function bezierCurve() {
    const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(2, 3, 0),
        new THREE.Vector3(5, 0, 2),
        new THREE.Vector3(7, -3, -1),
    ];
      
    const curve = new THREE.CatmullRomCurve3(points);
    return curve;
}

function updateTui(tui, curve, fishTime) {
    const pos = curve.getPoint(fishTime);

    tui.position.copy(pos);
    // const tangent = curve.getTangent(t).normalize();
    // const axis = new THREE.Vector3(0, 1, 0);
    // const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, tangent);
    // tui.quaternion.copy(quaternion);
}

function updateLa(la) {

}

export { updateTui, updateLa, bezierCurve }