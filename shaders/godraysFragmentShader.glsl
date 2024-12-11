uniform vec3 lightColor;   // Color of the light
uniform float intensity;   // Intensity of the rays
uniform float coneHeight;  // Height of the cone
uniform float time;        // For animated effects like flickering

varying vec3 vPos;
varying float vDepth;

void main() {
    // Distance from the center of the cone (XY plane)
    float radialDistance = length(vPos.xy);
    
    // Normalize depth and radial distance for gradients
    float depthFactor = vDepth / coneHeight;
    float radialFactor = radialDistance / coneHeight;

    // Compute light intensity based on distance from cone axis and depth
    float lightFactor = (1.0 - radialFactor) * (1.0 - depthFactor) * intensity;

    // Add flicker effect (optional)
    lightFactor *= 0.9 + 0.1 * sin(10.0 * time + radialDistance * 10.0);

    // Final color with transparency
    vec3 color = lightColor * lightFactor;
    gl_FragColor = vec4(color, lightFactor); // LightFactor acts as alpha
}