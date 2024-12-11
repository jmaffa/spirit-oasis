varying vec3 vPos;
varying float vDepth;

void main() {
    vPos = position;
    vDepth = position.z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

}