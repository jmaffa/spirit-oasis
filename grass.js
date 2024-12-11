import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let grassBlade;
const GRASS_COUNT = 1000;

const POND_CENTER = new THREE.Vector2(0, 0);  // center of pond 
const POND_RADIUS = 1.7;  // pond radius

class GrassMaterial extends THREE.ShaderMaterial {
  uniforms = {
    fTime: { value: 0.0 },
    vPlayerPosition: { value: new THREE.Vector3(0.0, -1.0, 0.0) },
    fPlayerColliderRadius: { value: 1.1 }
  };

  vertexShader = `
    uniform float fTime;
    uniform vec3 vPlayerPosition;
    uniform float fPlayerColliderRadius;
  
    varying float fDistanceFromGround;

    float rand(vec2 n) { 
      return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
    }
    
    float createNoise(vec2 n) {
      vec2 d = vec2(0.0, 1.0);
      vec2 b = floor(n);
      vec2 f = smoothstep(vec2(0.0), vec2(1.0), fract(n));

      return mix(mix(rand(b), rand(b + d.yx), f.x), mix(rand(b + d.xy), rand(b + d.yy), f.x), f.y);
    }

    vec3 localToWorld(vec3 target) {
      return (modelMatrix * instanceMatrix * vec4(target, 1.0)).xyz;
    }

    void main() {
      fDistanceFromGround = max(0.0, position.y);
      vec3 worldPosition = localToWorld(position);
      
      float noise = createNoise(vec2(position.x, position.z)) * 0.6 + 0.4;
      float distanceFromPlayer = length(vPlayerPosition - worldPosition);

      vec3 sway = 0.1 * vec3(
        cos(fTime) * noise * fDistanceFromGround,
        0.0,
        0.0
      );
      
      vec3 vNormal = normalize(vPlayerPosition - worldPosition);
      vNormal.y = abs(vNormal.y);

      float fOffset = fPlayerColliderRadius - distanceFromPlayer;
      vec3 vPlayerOffset = -(vNormal * fOffset);

      worldPosition += mix(
        sway * min(1.0, distanceFromPlayer / 4.0),
        vPlayerOffset,
        float(distanceFromPlayer < fPlayerColliderRadius)
      );

      gl_Position = projectionMatrix * viewMatrix * vec4(worldPosition, 1.0);
    }
  `;

  fragmentShader = `
    varying float fDistanceFromGround;
  
    void main() {
      vec3 colorDarkest = vec3(24.0 / 255.0, 30.0 / 255.0, 41.0 / 255.0);
      vec3 colorBrightest = vec3(88.0 / 255.0, 176.0 / 255.0, 110.0 / 255.0);

      vec3 color = mix(
        colorDarkest,
        colorBrightest,
        fDistanceFromGround / 2.0
      );

      gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    }
  `;
  
  constructor(props) {
    super(props);
  }
}

// create grass patch
export const createGrassPatch = async (scene, grassModelURL) => {
  if (!grassBlade) {
    const loader = new GLTFLoader();

    // load model
    const gltf = await new Promise((resolve, reject) => {
      loader.load(
        grassModelURL,
        (gltf) => resolve(gltf),
        (xhr) => console.log(`Grass loading: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`),
        (error) => reject(error)
      );
    });

    console.log("Grass model fully loaded!");

    grassBlade = {
      clock: new THREE.Clock(),
      mesh: new THREE.InstancedMesh(
        gltf.scene.children[0].geometry.clone(),
        new GrassMaterial({ side: THREE.DoubleSide }),
        GRASS_COUNT
      ),
      instances: [],
      update: () => {
        grassBlade.instances.forEach((grass, index) => {
          grass.updateMatrix();
          grassBlade.mesh.setMatrixAt(index, grass.matrix);
        });

        grassBlade.mesh.instanceMatrix.needsUpdate = true;
        grassBlade.mesh.material.uniforms.fTime.value = grassBlade.clock.getElapsedTime();
        requestAnimationFrame(grassBlade.update);
      }
    };

    scene.add(grassBlade.mesh);
    grassBlade.mesh.position.y = -2.0;
    grassBlade.update();

    // init glass insantace
    const empty = new THREE.Object3D();
    empty.scale.setScalar(0.0);
    empty.updateMatrix();

    for (let i = 0; i < GRASS_COUNT; i++) {
      grassBlade.mesh.setMatrixAt(i, empty.matrix);
      grassBlade.mesh.setColorAt(i, new THREE.Color(Math.random() * 0xffffff));
    }

    grassBlade.mesh.instanceColor.needsUpdate = true;
    grassBlade.mesh.instanceMatrix.needsUpdate = true;
  }

  let grassPosition; 

  do {
    const x = Math.random() * 4.2 - 2.3;   // grass X range
    const z = Math.random() * 7 - 3.3;    // grass Z range
    grassPosition = new THREE.Vector2(x, z);
  } while (grassPosition.distanceTo(POND_CENTER) < POND_RADIUS);

  // create grass instance
  const grass = new THREE.Object3D();
  grass.position.set(grassPosition.x, 4.8, grassPosition.y);  // Slightly above ground
  grass.rotation.y = Math.random() * Math.PI * 2.0;
  grass.scale.setScalar(Math.random() * 0.1);

  grassBlade.instances.push(grass);
};
