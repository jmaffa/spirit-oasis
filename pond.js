/*
 * INSPIRED BY WebGL Water
 * http://madebyevan.com/webgl-water/
 *
 */

import * as THREE from 'three';
const textureLoader = new THREE.TextureLoader();
const waterTexture = textureLoader.load('textures/xneg.jpg');

// TODO check
// Set texture wrapping and filtering for seamless tiling
waterTexture.wrapS = THREE.RepeatWrapping;
waterTexture.wrapT = THREE.RepeatWrapping;
waterTexture.minFilter = THREE.LinearFilter;
waterTexture.magFilter = THREE.LinearFilter;

const planeGeometry = new THREE.PlaneGeometry(1, 1, 256, 256);

const vertexShader = `
  varying vec2 uv_coord; // pass UV coordinates to the fragment shader
  void main() {
    uv_coord = uv; // take uv given by THREE js
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); // todo check - are matrices given by three js
  }
`;

const fragmentShader = `
  varying vec2 uv_coord; // Receive UV coordinates from the vertex shader
  uniform sampler2D waterTexture; // Reference to the texture (e.g., heightmap)
  uniform float time; // A time variable to animate the effect

  void main() {
    vec2 coords = uv_coord + vec2(sin(time * 0.1), cos(time * 0.1)) * 0.01; // Add a wavy motion
    float height = texture2D(waterTexture, coords).r; // Sample height from texture
    vec3 color = vec3(0.0, 0.5 + height * 0.5, 1.0); // Map height to color (blueish water)
    gl_FragColor = vec4(color, 1.0); // Set the output color
  }
`;

// FROM CLAIRE:
// the fragment shader above just displays a layer of the water (flat), and the commented code below is my
// attempt at adding cubemap. But right now no water is showing with that code

// const fragmentShader = `
//   varying vec2 uv_coord; // Receive UV coordinates from the vertex shader
//   uniform sampler2D waterTexture; // Reference to the texture (e.g., heightmap)
//   uniform float time; // A time variable to animate the effect
//   uniform samplerCube uCubemap; // TODO claire check

//   void main() {
//     vec2 coords = uv_coord + vec2(sin(time * 0.1), cos(time * 0.1)) * 0.02; // Add a wavy motion
//     float height = texture2D(waterTexture, coords).r; // Sample height from texture
    
//     vec3 reflectDir = normalize(vec3(uv_coord, height));
//     vec4 cubemapColor = textureCube(uCubemap, vReflectDir);
    
//     vec3 color = vec3(0.0, 0.5 + height * 0.5, 1.0); // Map height to color (blueish water)


//     gl_FragColor = mix(vec4(0.0, 0.5, 1.0, 0.5), cubemapColor, 0.5); // Mix water color with reflection
//   }
// `;

const waterMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
        waterTexture: { value: waterTexture }, // Pass the water texture
        time: { value: 0.0 } // Initialize the time variable
    },
    transparent: true, 
    opacity: 0.6, // TODO claire adjust
})

const renderTargetA = new THREE.WebGLRenderTarget(256, 256, { type: THREE.FloatType });
const renderTargetB = new THREE.WebGLRenderTarget(256, 256, { type: THREE.FloatType });

const waterMesh = new THREE.Mesh(planeGeometry, waterMaterial);

export { waterMesh };

// WEBGL CODE: 
// The data in the texture is (position.y, velocity.y, normal.x, normal.z)
// function Water() {
//     var vertexShader = '\
//       varying vec2 coord;\
//       void main() {\
//         coord = gl_Vertex.xy * 0.5 + 0.5;\
//         gl_Position = vec4(gl_Vertex.xyz, 1.0);\
//       }\
//     ';
//     this.plane = GL.Mesh.plane();
//     if (!GL.Texture.canUseFloatingPointTextures()) {
//       throw new Error('This demo requires the OES_texture_float extension');
//     }
//     var filter = GL.Texture.canUseFloatingPointLinearFiltering() ? gl.LINEAR : gl.NEAREST;
//     this.textureA = new GL.Texture(256, 256, { type: gl.FLOAT, filter: filter });
//     this.textureB = new GL.Texture(256, 256, { type: gl.FLOAT, filter: filter });
//     if ((!this.textureA.canDrawTo() || !this.textureB.canDrawTo()) && GL.Texture.canUseHalfFloatingPointTextures()) {
//       filter = GL.Texture.canUseHalfFloatingPointLinearFiltering() ? gl.LINEAR : gl.NEAREST;
//       this.textureA = new GL.Texture(256, 256, { type: gl.HALF_FLOAT_OES, filter: filter });
//       this.textureB = new GL.Texture(256, 256, { type: gl.HALF_FLOAT_OES, filter: filter });
//     }
//     this.dropShader = new GL.Shader(vertexShader, '\
//       const float PI = 3.141592653589793;\
//       uniform sampler2D texture;\
//       uniform vec2 center;\
//       uniform float radius;\
//       uniform float strength;\
//       varying vec2 coord;\
//       void main() {\
//         /* get vertex info */\
//         vec4 info = texture2D(texture, coord);\
//         \
//         /* add the drop to the height */\
//         float drop = max(0.0, 1.0 - length(center * 0.5 + 0.5 - coord) / radius);\
//         drop = 0.5 - cos(drop * PI) * 0.5;\
//         info.r += drop * strength;\
//         \
//         gl_FragColor = info;\
//       }\
//     ');
//     this.updateShader = new GL.Shader(vertexShader, '\
//       uniform sampler2D texture;\
//       uniform vec2 delta;\
//       varying vec2 coord;\
//       void main() {\
//         /* get vertex info */\
//         vec4 info = texture2D(texture, coord);\
//         \
//         /* calculate average neighbor height */\
//         vec2 dx = vec2(delta.x, 0.0);\
//         vec2 dy = vec2(0.0, delta.y);\
//         float average = (\
//           texture2D(texture, coord - dx).r +\
//           texture2D(texture, coord - dy).r +\
//           texture2D(texture, coord + dx).r +\
//           texture2D(texture, coord + dy).r\
//         ) * 0.25;\
//         \
//         /* change the velocity to move toward the average */\
//         info.g += (average - info.r) * 2.0;\
//         \
//         /* attenuate the velocity a little so waves do not last forever */\
//         info.g *= 0.995;\
//         \
//         /* move the vertex along the velocity */\
//         info.r += info.g;\
//         \
//         gl_FragColor = info;\
//       }\
//     ');
//     this.normalShader = new GL.Shader(vertexShader, '\
//       uniform sampler2D texture;\
//       uniform vec2 delta;\
//       varying vec2 coord;\
//       void main() {\
//         /* get vertex info */\
//         vec4 info = texture2D(texture, coord);\
//         \
//         /* update the normal */\
//         vec3 dx = vec3(delta.x, texture2D(texture, vec2(coord.x + delta.x, coord.y)).r - info.r, 0.0);\
//         vec3 dy = vec3(0.0, texture2D(texture, vec2(coord.x, coord.y + delta.y)).r - info.r, delta.y);\
//         info.ba = normalize(cross(dy, dx)).xz;\
//         \
//         gl_FragColor = info;\
//       }\
//     ');
//     this.sphereShader = new GL.Shader(vertexShader, '\
//       uniform sampler2D texture;\
//       uniform vec3 oldCenter;\
//       uniform vec3 newCenter;\
//       uniform float radius;\
//       varying vec2 coord;\
//       \
//       float volumeInSphere(vec3 center) {\
//         vec3 toCenter = vec3(coord.x * 2.0 - 1.0, 0.0, coord.y * 2.0 - 1.0) - center;\
//         float t = length(toCenter) / radius;\
//         float dy = exp(-pow(t * 1.5, 6.0));\
//         float ymin = min(0.0, center.y - dy);\
//         float ymax = min(max(0.0, center.y + dy), ymin + 2.0 * dy);\
//         return (ymax - ymin) * 0.1;\
//       }\
//       \
//       void main() {\
//         /* get vertex info */\
//         vec4 info = texture2D(texture, coord);\
//         \
//         /* add the old volume */\
//         info.r += volumeInSphere(oldCenter);\
//         \
//         /* subtract the new volume */\
//         info.r -= volumeInSphere(newCenter);\
//         \
//         gl_FragColor = info;\
//       }\
//     ');
//   }
