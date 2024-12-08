
import * as THREE from 'three';


// standard vertex shader just getting UV coordinate
const vertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

// adapted from https://www.shadertoy.com/view/llS3RK
const worleyShader = `
    uniform vec2 resolution;
    uniform float time;
    varying vec2 vUv;

    float lengthSquared(vec2 v){
        return dot(v, v);
    }
    
    float noise(vec2 v){
        return fract(sin(fract(sin(v.x) * (43.13311)) + v.y) * 31.0011);
    }
    
    float worley(vec2 v){
        // make distance super high
        float dist = 1.0e30;

        // Grid points
        for (int d_x = -1; d_x <= 1; d_x++){
            for (int d_y = -1; d_y <= 1; d_y++){
                // floor vec2 and add to offset
                vec2 pt = floor(v) + vec2(d_x, d_y);
                
                // calculate minimum distance for point and add noise
                dist = min(dist, lengthSquared(v - pt - noise(pt)));
            }
        }
        return 3.0 * exp(-4.0 * abs(2.5 * dist - 1.0));
    }

    float fworley(vec2 v){
        return sqrt(sqrt(sqrt(
            worley(v*5.0 + 0.05*time) *
            sqrt(worley(v * 50.0 + 0.12 + -0.1*time)) *
            sqrt(sqrt(worley(v * -10.0 + 0.03*time
        ))))));
    }

    void main() {
        vec2 uv = vUv;
        float t = fworley(uv * resolution / 1500.0);
        t *= exp(-lengthSquared(abs(0.7 * uv - 1.0)));
        gl_FragColor = vec4(t * vec3(0.1, 1.1 * t, pow(t, 0.5 - t)), 1.0);
    }
`;

// I think I will need to write a new shader using worley noise, and then focus on the up and down of it maybe
const waterMaterial = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0.0 },
        resolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
    },
    vertexShader: vertexShader,
    fragmentShader: worleyShader,
});  

function createHeart(){
    const x = 0, y = 0;

    const heartShape = new THREE.Shape();

    heartShape.moveTo(x + 5, y + 5);
    heartShape.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y);
    heartShape.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7);
    heartShape.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19);
    heartShape.bezierCurveTo(x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7);
    heartShape.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y);
    heartShape.bezierCurveTo(x + 7, y, x + 5, y + 5, x + 5, y + 5);

    const geometry = new THREE.ShapeGeometry(heartShape);
    return geometry;
}
function createStar(numPoints, outerRadius, innerRadius) {
  const shape = new THREE.Shape();
  const angle_step = Math.PI / (numPoints * 2);

  for (let i = 0; i < numPoints * 2; i++) {
    const angle = i * angle_step;
    const radius = i % 2 === 0 ? outerRadius : innerRadius; // Alternate between outer and inner
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    if (i === 0) {
      shape.moveTo(x, y); // Move to the first point
    } else {
      shape.lineTo(x, y); // Draw line to subsequent points
    }
  }

  shape.closePath(); // Close the shape to form a star

  // Create geometry from the shape
  const geometry = new THREE.ShapeGeometry(shape);
  return geometry;
}

function createOceanShape(){
  const shape = new THREE.Shape();

  const numPoints = 5; // 5 prongs
  const outerRadius = 1; // Outer radius
  const innerRadius = 0.5; // Inner radius
  const roundness = 0.2; // How rounded the corners are

  // Helper to create rounded corners between two points
  function addRoundedCorner(path, center, radius, startAngle, endAngle) {
    path.absarc(center.x, center.y, radius, startAngle, endAngle, false);
  }

  const angleStep = (Math.PI * 2) / (numPoints * 2); // Angle step for alternating points

  let vertices = [];
  for (let i = 0; i < numPoints * 2; i++) {
    const angle = i * angleStep;
    const radius = i % 2 === 0 ? outerRadius : innerRadius; // Alternate between outer and inner
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    vertices.push({ x, y });
  }

  // Draw the shape with rounded corners
  for (let i = 0; i < vertices.length; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % vertices.length];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;

    if (i === 0) {
      shape.moveTo(midX, midY); // Start at the midpoint for smooth rounding
    } else {
      addRoundedCorner(
        shape,
        { x: midX, y: midY },
        roundness,
        Math.atan2(current.y, current.x),
        Math.atan2(next.y, next.x)
      );
    }
  }

  shape.closePath();

  // Create the geometry from the shape
  const geometry = new THREE.ShapeGeometry(shape);
  return geometry;
}

function testStar(){
    const starShape = new THREE.Shape();
    const outerRadius = 5;
    const innerRadius = 3;
    const spikes = 5;

    for (let i = 0; i < spikes; i++) {
      const outerAngle = (i * 2 * Math.PI) / spikes;
      const innerAngle = outerAngle + Math.PI / spikes;

      const outerX = Math.cos(outerAngle) * outerRadius;
      const outerY = Math.sin(outerAngle) * outerRadius;
      const innerX = Math.cos(innerAngle) * innerRadius;
      const innerY = Math.sin(innerAngle) * innerRadius;

      if (i === 0) {
        starShape.moveTo(outerX, outerY);
      } else {
        starShape.lineTo(outerX, outerY);
      }
      starShape.lineTo(innerX, innerY);
    }
    starShape.closePath();

    const extrudeSettings = {
      depth: 5, // Thickness of the star
      bevelEnabled: true,
      bevelThickness: 1,
      bevelSize: 1,
      bevelSegments: 20,
    };

    const starGeometry = new THREE.ExtrudeGeometry(starShape, extrudeSettings);
    return starGeometry
}
function createOcean(){
    const oceanMesh = new THREE.Mesh(
      testStar(),
      waterMaterial
    );
    return oceanMesh
}


export { createOcean };
