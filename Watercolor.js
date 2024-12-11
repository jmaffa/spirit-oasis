import * as THREE from 'three';

// Updated WatercolorShader with Enhanced Paper Texture and Fuzzy Edges
export const WatercolorShader = {
    name: "WatercolorShader",
    uniforms: {
        tDiffuse: { value: null },
        tPaper: { value: null },
        texel: { value: new THREE.Vector2(1.0 / 512, 1.0 / 512) },
        scale: { value: 0.02 }, // Enhanced Wobble Effect
        threshold: { value: 3.0 }, // Softer Edge Detection
        darkening: { value: 2.0 }, // Stronger Edge Darkening
        pigment: { value: 1.3 }, // More Pigment Dispersion
    },

    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,

    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D tPaper;

        uniform vec2 texel;
        uniform float scale;
        uniform float threshold;
        uniform float darkening;
        uniform float pigment;

        varying vec2 vUv;

        float sobel(sampler2D tex, vec2 uv) {
            vec3 hr = vec3(0.0);
            vec3 vt = vec3(0.0);
            
            for (int i = -1; i <= 1; i++) {
                for (int j = -1; j <= 1; j++) {
                    vec2 offset = vec2(i, j) * texel;
                    vec3 color = texture2D(tex, uv + offset).rgb;
                    hr += color * float(j);
                    vt += color * float(i);
                }
            }
            return sqrt(dot(hr, hr) + dot(vt, vt));
        }

        vec2 wobble(sampler2D tex, vec2 uv) {
            vec2 distortion = texture2D(tex, uv).xy - 0.5;
            distortion *= scale * 0.2;  // Enhance Paper Effect
            return uv + distortion;
        }

        vec4 edgeDarkening(sampler2D tex, vec2 uv) {
            vec4 c = texture2D(tex, uv);
            return mix(c, vec4(0.0), 1.0 - darkening);
        }

        float granulation(sampler2D tex, vec2 uv, float beta) {
            vec4 c = texture2D(tex, uv);
            float intensity = (c.r + c.g + c.b) / 3.0;
            return mix(1.0, beta, intensity - 0.5);
        }

        void main() {
            vec2 uv = wobble(tPaper, vUv);
            float pd = granulation(tPaper, vUv, pigment);
            float edge = sobel(tDiffuse, uv);

            vec4 baseColor = texture2D(tDiffuse, uv);
            if (edge > threshold) {
                gl_FragColor = mix(baseColor, pd * edgeDarkening(tDiffuse, uv), smoothstep(threshold, threshold + 0.2, edge));
            } else {
                gl_FragColor = baseColor * pd;
            }
        }
    `
};