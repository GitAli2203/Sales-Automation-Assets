// WebGL Shader Definitions for Black Hole Simulation

const Shaders = {
    // Vertex Shader for the space-time grid
    gridVertexShader: `
        precision mediump float;
        attribute vec3 position;
        attribute vec3 normal;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float time;
        uniform float mass;
        uniform float lensingStrength;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vDistortion;
        
        void main() {
            vPosition = position;
            vNormal = normal;
            
            // Calculate distance from black hole center
            float dist = length(position.xz);
            
            // Schwarzschild radius effect
            float schwarzschildRadius = mass * 0.3;
            float distortion = 0.0;
            
            if (dist > 0.1) {
                distortion = schwarzschildRadius / (dist * dist) * lensingStrength;
            }
            
            // Apply space-time curvature
            vec3 curved = position;
            curved.y -= distortion * 3.0;
            
            vDistortion = distortion;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(curved, 1.0);
        }
    `,
    
    // Fragment Shader for the space-time grid
    gridFragmentShader: `
        precision mediump float;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vDistortion;
        
        void main() {
            // Grid pattern (using fixed width instead of fwidth)
            vec2 gridPos = vPosition.xz;
            vec2 grid = abs(fract(gridPos - 0.5) - 0.5) / 0.05;
            float line = min(grid.x, grid.y);
            
            // Color based on distortion
            vec3 gridColor = vec3(0.2, 0.4, 0.8);
            float intensity = 1.0 - min(line, 1.0);
            
            // Glow effect near black hole
            float glow = vDistortion * 2.0;
            gridColor += vec3(glow * 0.5, glow * 0.3, glow * 0.8);
            
            gl_FragColor = vec4(gridColor * intensity, intensity * 0.5);
        }
    `,
    
    // Vertex Shader for accretion disk
    accretionVertexShader: `
        precision mediump float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float time;
        uniform float spin;
        varying vec2 vUv;
        varying vec3 vPosition;
        varying float vRotation;
        
        void main() {
            vUv = uv;
            vPosition = position;
            
            // Calculate rotation based on distance and spin
            float dist = length(position.xz);
            float rotationSpeed = spin * 2.0 / (dist + 0.5);
            vRotation = rotationSpeed * time;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    
    // Fragment Shader for accretion disk
    accretionFragmentShader: `
        precision mediump float;
        varying vec2 vUv;
        varying vec3 vPosition;
        varying float vRotation;
        uniform float brightness;
        uniform float colorTemp;
        uniform float thickness;
        uniform float time;
        
        void main() {
            // Distance from center
            float dist = length(vPosition.xz);
            
            // Radial falloff
            float radialFalloff = smoothstep(5.0, 1.0, dist);
            
            // Vertical falloff based on thickness
            float verticalFalloff = 1.0 - abs(vPosition.y) / (thickness * 0.5);
            verticalFalloff = clamp(verticalFalloff, 0.0, 1.0);
            
            // Spiral pattern
            float angle = atan(vPosition.z, vPosition.x);
            float spiral = sin(angle * 3.0 - dist * 5.0 + vRotation * 2.0) * 0.5 + 0.5;
            
            // Turbulence
            float turbulence = sin(dist * 10.0 + time * 2.0) * 0.2 + 
                              sin(angle * 8.0 + time * 1.5) * 0.2;
            
            // Color based on temperature (blue to red)
            vec3 coldColor = vec3(0.3, 0.5, 1.0);
            vec3 hotColor = vec3(1.0, 0.4, 0.1);
            vec3 diskColor = mix(coldColor, hotColor, colorTemp);
            
            // Inner glow (closer to black hole is hotter)
            float innerGlow = (1.0 - smoothstep(0.5, 2.0, dist)) * 0.5;
            diskColor += vec3(innerGlow * 1.5, innerGlow * 0.8, innerGlow * 0.3);
            
            // Combine effects
            float alpha = radialFalloff * verticalFalloff * brightness;
            alpha *= (spiral * 0.3 + 0.7 + turbulence);
            
            // Add some bright spots
            float brightSpots = smoothstep(0.85, 0.95, spiral) * radialFalloff;
            diskColor += vec3(brightSpots * 2.0);
            
            gl_FragColor = vec4(diskColor, alpha);
        }
    `,
    
    // Vertex Shader for black hole (event horizon)
    blackholeVertexShader: `
        precision mediump float;
        attribute vec3 position;
        attribute vec3 normal;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
            vNormal = normal;
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    
    // Fragment Shader for black hole (event horizon)
    blackholeFragmentShader: `
        precision mediump float;
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform float time;
        
        void main() {
            // Edge glow effect
            vec3 viewDir = normalize(vPosition);
            float edge = 1.0 - abs(dot(viewDir, vNormal));
            edge = pow(edge, 3.0);
            
            // Subtle color variation
            vec3 color = vec3(0.1, 0.05, 0.2);
            color += vec3(edge * 0.3, edge * 0.2, edge * 0.5);
            
            // Event horizon shimmer
            float shimmer = sin(vPosition.x * 10.0 + time) * 
                           sin(vPosition.y * 10.0 + time * 1.3) * 
                           sin(vPosition.z * 10.0 + time * 0.7) * 0.1;
            
            color += vec3(shimmer * edge);
            
            gl_FragColor = vec4(color, 1.0);
        }
    `,
    
    // Vertex Shader for stars
    starVertexShader: `
        precision mediump float;
        attribute vec3 position;
        attribute float size;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float mass;
        uniform float lensingStrength;
        varying float vSize;
        
        void main() {
            vSize = size;
            
            // Gravitational lensing effect
            vec3 lensed = position;
            float dist = length(position);
            if (dist > 0.1) {
                float lensing = (mass * 0.5) / (dist * dist) * lensingStrength;
                lensed = position * (1.0 + lensing * 0.1);
            }
            
            vec4 mvPosition = modelViewMatrix * vec4(lensed, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    
    // Fragment Shader for stars
    starFragmentShader: `
        precision mediump float;
        varying float vSize;
        uniform float time;
        
        void main() {
            // Circular star shape
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);
            
            if (dist > 0.5) {
                discard;
            }
            
            // Radial gradient
            float intensity = 1.0 - (dist * 2.0);
            intensity = pow(intensity, 2.0);
            
            // Twinkle effect
            float twinkle = sin(vSize * 100.0 + time * 2.0) * 0.2 + 0.8;
            
            // Star color (slight variations)
            vec3 color = vec3(1.0, 0.95 + vSize * 0.05, 0.9 + vSize * 0.1);
            
            gl_FragColor = vec4(color * intensity * twinkle, intensity);
        }
    `
};
