// Main Black Hole Simulation using WebGL
class BlackHoleSimulation {
    constructor() {
        this.canvas = document.getElementById('blackhole-canvas');
        this.loading = document.getElementById('loading');
        
        // Simulation parameters
        this.params = {
            mass: 10,                    // Solar masses
            spin: 0.5,                   // 0-1
            accretionBrightness: 0.8,    // 0-1
            accretionColor: 0.5,         // 0-1 (cold to hot)
            accretionThickness: 0.3,     // 0.1-1
            lensingStrength: 1.0,        // 0-2
            cameraDistance: 20,          // Units
            cameraAngle: 30,             // Degrees
            autoRotate: true
        };
        
        // Animation state
        this.time = 0;
        this.rotation = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.lastFpsUpdate = this.lastTime;
        
        // Mouse interaction
        this.mouseDown = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        this.init();
    }
    
    init() {
        this.setupWebGL();
        this.createGeometry();
        this.setupEventListeners();
        this.updatePhysicsDisplay();
        this.animate();
        
        // Hide loading screen after initialization
        setTimeout(() => {
            this.loading.classList.add('hidden');
        }, 500);
    }
    
    setupWebGL() {
        const gl = this.canvas.getContext('webgl', {
            alpha: true,
            antialias: true,
            depth: true
        });
        
        if (!gl) {
            alert('WebGL nicht verfügbar! Bitte verwenden Sie einen modernen Browser.');
            return;
        }
        
        this.gl = gl;
        
        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Enable features
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        // Create shader programs
        this.programs = {
            grid: this.createProgram(Shaders.gridVertexShader, Shaders.gridFragmentShader),
            accretion: this.createProgram(Shaders.accretionVertexShader, Shaders.accretionFragmentShader),
            blackhole: this.createProgram(Shaders.blackholeVertexShader, Shaders.blackholeFragmentShader),
            stars: this.createProgram(Shaders.starVertexShader, Shaders.starFragmentShader)
        };
    }
    
    resizeCanvas() {
        const displayWidth = this.canvas.clientWidth;
        const displayHeight = this.canvas.clientHeight;
        
        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
            if (this.gl) {
                this.gl.viewport(0, 0, displayWidth, displayHeight);
            }
        }
    }
    
    createProgram(vertexSource, fragmentSource) {
        const gl = this.gl;
        
        // Create shaders
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexSource);
        gl.compileShader(vertexShader);
        
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.error('Vertex shader error:', gl.getShaderInfoLog(vertexShader));
            return null;
        }
        
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentSource);
        gl.compileShader(fragmentShader);
        
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.error('Fragment shader error:', gl.getShaderInfoLog(fragmentShader));
            return null;
        }
        
        // Create program
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program));
            return null;
        }
        
        return program;
    }
    
    createGeometry() {
        this.geometry = {
            grid: this.createGridGeometry(),
            accretion: this.createAccretionDiskGeometry(),
            blackhole: this.createSphereGeometry(1.0, 32, 32),
            stars: this.createStarsGeometry()
        };
    }
    
    createGridGeometry() {
        const gl = this.gl;
        const size = 20;
        const segments = 40;
        const step = size / segments;
        
        const vertices = [];
        const indices = [];
        
        // Create grid vertices
        for (let i = 0; i <= segments; i++) {
            for (let j = 0; j <= segments; j++) {
                const x = (i - segments / 2) * step;
                const z = (j - segments / 2) * step;
                vertices.push(x, 0, z);
            }
        }
        
        // Create grid indices
        for (let i = 0; i < segments; i++) {
            for (let j = 0; j < segments; j++) {
                const a = i * (segments + 1) + j;
                const b = a + 1;
                const c = a + (segments + 1);
                const d = c + 1;
                
                indices.push(a, b, c);
                indices.push(b, d, c);
            }
        }
        
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        
        return {
            vertexBuffer,
            indexBuffer,
            vertexCount: indices.length
        };
    }
    
    createAccretionDiskGeometry() {
        const gl = this.gl;
        const innerRadius = 1.5;
        const outerRadius = 5.0;
        const radialSegments = 60;
        const rings = 20;
        
        const vertices = [];
        const indices = [];
        
        for (let ring = 0; ring <= rings; ring++) {
            const v = ring / rings;
            const radius = innerRadius + (outerRadius - innerRadius) * v;
            const y = (Math.random() - 0.5) * 0.1 * this.params.accretionThickness;
            
            for (let segment = 0; segment <= radialSegments; segment++) {
                const u = segment / radialSegments;
                const theta = u * Math.PI * 2;
                
                const x = Math.cos(theta) * radius;
                const z = Math.sin(theta) * radius;
                
                vertices.push(x, y, z, u, v);
            }
        }
        
        for (let ring = 0; ring < rings; ring++) {
            for (let segment = 0; segment < radialSegments; segment++) {
                const a = ring * (radialSegments + 1) + segment;
                const b = a + 1;
                const c = a + (radialSegments + 1);
                const d = c + 1;
                
                indices.push(a, b, c);
                indices.push(b, d, c);
            }
        }
        
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        
        return {
            vertexBuffer,
            indexBuffer,
            vertexCount: indices.length
        };
    }
    
    createSphereGeometry(radius, widthSegments, heightSegments) {
        const gl = this.gl;
        const vertices = [];
        const indices = [];
        
        for (let y = 0; y <= heightSegments; y++) {
            const v = y / heightSegments;
            const phi = v * Math.PI;
            
            for (let x = 0; x <= widthSegments; x++) {
                const u = x / widthSegments;
                const theta = u * Math.PI * 2;
                
                const px = -radius * Math.cos(theta) * Math.sin(phi);
                const py = radius * Math.cos(phi);
                const pz = radius * Math.sin(theta) * Math.sin(phi);
                
                const nx = px / radius;
                const ny = py / radius;
                const nz = pz / radius;
                
                vertices.push(px, py, pz, nx, ny, nz);
            }
        }
        
        for (let y = 0; y < heightSegments; y++) {
            for (let x = 0; x < widthSegments; x++) {
                const a = y * (widthSegments + 1) + x;
                const b = a + 1;
                const c = a + (widthSegments + 1);
                const d = c + 1;
                
                indices.push(a, b, c);
                indices.push(b, d, c);
            }
        }
        
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        
        return {
            vertexBuffer,
            indexBuffer,
            vertexCount: indices.length
        };
    }
    
    createStarsGeometry() {
        const gl = this.gl;
        const starCount = 500;
        const vertices = [];
        
        for (let i = 0; i < starCount; i++) {
            // Random position in sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = 30 + Math.random() * 20;
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            const size = 1 + Math.random() * 2;
            
            vertices.push(x, y, z, size);
        }
        
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        
        return {
            vertexBuffer,
            vertexCount: starCount
        };
    }
    
    setupEventListeners() {
        // Sliders
        const controls = {
            'mass-slider': (val) => {
                this.params.mass = parseFloat(val);
                document.getElementById('mass-value').textContent = val + ' M☉';
                this.updatePhysicsDisplay();
            },
            'spin-slider': (val) => {
                this.params.spin = parseFloat(val);
                document.getElementById('spin-value').textContent = val;
            },
            'accretion-brightness-slider': (val) => {
                this.params.accretionBrightness = parseFloat(val);
                document.getElementById('accretion-brightness-value').textContent = val;
            },
            'accretion-color-slider': (val) => {
                this.params.accretionColor = parseFloat(val);
                document.getElementById('accretion-color-value').textContent = val;
            },
            'accretion-thickness-slider': (val) => {
                this.params.accretionThickness = parseFloat(val);
                document.getElementById('accretion-thickness-value').textContent = val;
            },
            'lensing-strength-slider': (val) => {
                this.params.lensingStrength = parseFloat(val);
                document.getElementById('lensing-strength-value').textContent = val;
            },
            'camera-distance-slider': (val) => {
                this.params.cameraDistance = parseFloat(val);
                document.getElementById('camera-distance-value').textContent = val;
            },
            'camera-angle-slider': (val) => {
                this.params.cameraAngle = parseFloat(val);
                document.getElementById('camera-angle-value').textContent = val + '°';
            }
        };
        
        for (const [id, handler] of Object.entries(controls)) {
            const slider = document.getElementById(id);
            slider.addEventListener('input', (e) => handler(e.target.value));
        }
        
        // Auto-rotate checkbox
        document.getElementById('auto-rotate-checkbox').addEventListener('change', (e) => {
            this.params.autoRotate = e.target.checked;
        });
        
        // Reset button
        document.getElementById('reset-button').addEventListener('click', () => {
            this.resetParameters();
        });
        
        // Mouse interaction
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouseDown = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.mouseDown) {
                const deltaX = e.clientX - this.lastMouseX;
                const deltaY = e.clientY - this.lastMouseY;
                
                this.rotation += deltaX * 0.005;
                this.params.cameraAngle = Math.max(0, Math.min(90, 
                    this.params.cameraAngle + deltaY * 0.1));
                
                document.getElementById('camera-angle-value').textContent = 
                    Math.round(this.params.cameraAngle) + '°';
                document.getElementById('camera-angle-slider').value = 
                    this.params.cameraAngle;
                
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.mouseDown = false;
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.mouseDown = false;
        });
    }
    
    resetParameters() {
        this.params = {
            mass: 10,
            spin: 0.5,
            accretionBrightness: 0.8,
            accretionColor: 0.5,
            accretionThickness: 0.3,
            lensingStrength: 1.0,
            cameraDistance: 20,
            cameraAngle: 30,
            autoRotate: true
        };
        
        // Update UI
        document.getElementById('mass-slider').value = 10;
        document.getElementById('mass-value').textContent = '10 M☉';
        document.getElementById('spin-slider').value = 0.5;
        document.getElementById('spin-value').textContent = '0.5';
        document.getElementById('accretion-brightness-slider').value = 0.8;
        document.getElementById('accretion-brightness-value').textContent = '0.8';
        document.getElementById('accretion-color-slider').value = 0.5;
        document.getElementById('accretion-color-value').textContent = '0.5';
        document.getElementById('accretion-thickness-slider').value = 0.3;
        document.getElementById('accretion-thickness-value').textContent = '0.3';
        document.getElementById('lensing-strength-slider').value = 1.0;
        document.getElementById('lensing-strength-value').textContent = '1.0';
        document.getElementById('camera-distance-slider').value = 20;
        document.getElementById('camera-distance-value').textContent = '20';
        document.getElementById('camera-angle-slider').value = 30;
        document.getElementById('camera-angle-value').textContent = '30°';
        document.getElementById('auto-rotate-checkbox').checked = true;
        
        this.updatePhysicsDisplay();
    }
    
    updatePhysicsDisplay() {
        const rs = Physics.calculateSchwarzschildRadius(this.params.mass);
        const eh = Physics.calculateEventHorizon(this.params.mass);
        
        document.getElementById('schwarzschild-radius').textContent = 
            Physics.formatValue(rs, 'km');
        document.getElementById('event-horizon').textContent = 
            Physics.formatValue(eh * 2, 'km');
    }
    
    createMatrices() {
        // Projection matrix
        const aspect = this.canvas.width / this.canvas.height;
        const fov = 45 * Math.PI / 180;
        const near = 0.1;
        const far = 100;
        
        const f = 1.0 / Math.tan(fov / 2);
        const rangeInv = 1.0 / (near - far);
        
        const projection = [
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (near + far) * rangeInv, -1,
            0, 0, near * far * rangeInv * 2, 0
        ];
        
        // View matrix
        const angleRad = this.params.cameraAngle * Math.PI / 180;
        const cameraY = this.params.cameraDistance * Math.sin(angleRad);
        const cameraZ = this.params.cameraDistance * Math.cos(angleRad);
        
        if (this.params.autoRotate) {
            this.rotation += 0.002;
        }
        
        const cosRot = Math.cos(this.rotation);
        const sinRot = Math.sin(this.rotation);
        
        const cameraX = cameraZ * sinRot;
        const cameraZFinal = cameraZ * cosRot;
        
        // Simple lookAt implementation
        const view = this.lookAt(
            [cameraX, cameraY, cameraZFinal],
            [0, 0, 0],
            [0, 1, 0]
        );
        
        return { projection, view };
    }
    
    lookAt(eye, center, up) {
        const z = this.normalize([
            eye[0] - center[0],
            eye[1] - center[1],
            eye[2] - center[2]
        ]);
        
        const x = this.normalize(this.cross(up, z));
        const y = this.cross(z, x);
        
        return [
            x[0], y[0], z[0], 0,
            x[1], y[1], z[1], 0,
            x[2], y[2], z[2], 0,
            -this.dot(x, eye), -this.dot(y, eye), -this.dot(z, eye), 1
        ];
    }
    
    normalize(v) {
        const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        return [v[0] / len, v[1] / len, v[2] / len];
    }
    
    cross(a, b) {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]
        ];
    }
    
    dot(a, b) {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.time += deltaTime * 0.001;
        
        // Update FPS
        this.frameCount++;
        if (currentTime - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
            document.getElementById('fps-counter').textContent = this.fps;
        }
        
        this.render();
    }
    
    render() {
        const gl = this.gl;
        
        // Clear
        gl.clearColor(0.0, 0.0, 0.05, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        const matrices = this.createMatrices();
        
        // Render stars (background)
        this.renderStars(matrices);
        
        // Render space-time grid
        this.renderGrid(matrices);
        
        // Render accretion disk
        this.renderAccretionDisk(matrices);
        
        // Render black hole
        this.renderBlackHole(matrices);
    }
    
    renderGrid(matrices) {
        const gl = this.gl;
        const program = this.programs.grid;
        
        gl.useProgram(program);
        
        // Set uniforms
        const projLoc = gl.getUniformLocation(program, 'projectionMatrix');
        const viewLoc = gl.getUniformLocation(program, 'modelViewMatrix');
        const timeLoc = gl.getUniformLocation(program, 'time');
        const massLoc = gl.getUniformLocation(program, 'mass');
        const lensingLoc = gl.getUniformLocation(program, 'lensingStrength');
        
        gl.uniformMatrix4fv(projLoc, false, matrices.projection);
        gl.uniformMatrix4fv(viewLoc, false, matrices.view);
        gl.uniform1f(timeLoc, this.time);
        gl.uniform1f(massLoc, this.params.mass);
        gl.uniform1f(lensingLoc, this.params.lensingStrength);
        
        // Set attributes
        const posLoc = gl.getAttribLocation(program, 'position');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.geometry.grid.vertexBuffer);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
        
        // Draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.geometry.grid.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.geometry.grid.vertexCount, gl.UNSIGNED_SHORT, 0);
    }
    
    renderAccretionDisk(matrices) {
        const gl = this.gl;
        const program = this.programs.accretion;
        
        gl.useProgram(program);
        
        // Set uniforms
        const projLoc = gl.getUniformLocation(program, 'projectionMatrix');
        const viewLoc = gl.getUniformLocation(program, 'modelViewMatrix');
        const timeLoc = gl.getUniformLocation(program, 'time');
        const spinLoc = gl.getUniformLocation(program, 'spin');
        const brightnessLoc = gl.getUniformLocation(program, 'brightness');
        const colorLoc = gl.getUniformLocation(program, 'colorTemp');
        const thicknessLoc = gl.getUniformLocation(program, 'thickness');
        
        gl.uniformMatrix4fv(projLoc, false, matrices.projection);
        gl.uniformMatrix4fv(viewLoc, false, matrices.view);
        gl.uniform1f(timeLoc, this.time);
        gl.uniform1f(spinLoc, this.params.spin);
        gl.uniform1f(brightnessLoc, this.params.accretionBrightness);
        gl.uniform1f(colorLoc, this.params.accretionColor);
        gl.uniform1f(thicknessLoc, this.params.accretionThickness);
        
        // Set attributes
        const posLoc = gl.getAttribLocation(program, 'position');
        const uvLoc = gl.getAttribLocation(program, 'uv');
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.geometry.accretion.vertexBuffer);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 20, 0);
        gl.enableVertexAttribArray(uvLoc);
        gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 20, 12);
        
        // Draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.geometry.accretion.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.geometry.accretion.vertexCount, gl.UNSIGNED_SHORT, 0);
    }
    
    renderBlackHole(matrices) {
        const gl = this.gl;
        const program = this.programs.blackhole;
        
        gl.useProgram(program);
        
        // Calculate scale based on mass
        const scale = this.params.mass * 0.1;
        const scaleMatrix = [
            scale, 0, 0, 0,
            0, scale, 0, 0,
            0, 0, scale, 0,
            0, 0, 0, 1
        ];
        
        // Multiply view * scale
        const modelView = this.multiplyMatrices(matrices.view, scaleMatrix);
        
        // Set uniforms
        const projLoc = gl.getUniformLocation(program, 'projectionMatrix');
        const viewLoc = gl.getUniformLocation(program, 'modelViewMatrix');
        const timeLoc = gl.getUniformLocation(program, 'time');
        
        gl.uniformMatrix4fv(projLoc, false, matrices.projection);
        gl.uniformMatrix4fv(viewLoc, false, modelView);
        gl.uniform1f(timeLoc, this.time);
        
        // Set attributes
        const posLoc = gl.getAttribLocation(program, 'position');
        const normalLoc = gl.getAttribLocation(program, 'normal');
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.geometry.blackhole.vertexBuffer);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 24, 0);
        gl.enableVertexAttribArray(normalLoc);
        gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 24, 12);
        
        // Draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.geometry.blackhole.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.geometry.blackhole.vertexCount, gl.UNSIGNED_SHORT, 0);
    }
    
    renderStars(matrices) {
        const gl = this.gl;
        const program = this.programs.stars;
        
        gl.useProgram(program);
        
        // Set uniforms
        const projLoc = gl.getUniformLocation(program, 'projectionMatrix');
        const viewLoc = gl.getUniformLocation(program, 'modelViewMatrix');
        const timeLoc = gl.getUniformLocation(program, 'time');
        const massLoc = gl.getUniformLocation(program, 'mass');
        const lensingLoc = gl.getUniformLocation(program, 'lensingStrength');
        
        gl.uniformMatrix4fv(projLoc, false, matrices.projection);
        gl.uniformMatrix4fv(viewLoc, false, matrices.view);
        gl.uniform1f(timeLoc, this.time);
        gl.uniform1f(massLoc, this.params.mass);
        gl.uniform1f(lensingLoc, this.params.lensingStrength);
        
        // Set attributes
        const posLoc = gl.getAttribLocation(program, 'position');
        const sizeLoc = gl.getAttribLocation(program, 'size');
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.geometry.stars.vertexBuffer);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(sizeLoc);
        gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, 16, 12);
        
        // Draw points
        gl.drawArrays(gl.POINTS, 0, this.geometry.stars.vertexCount);
    }
    
    multiplyMatrices(a, b) {
        const result = new Array(16);
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                result[i * 4 + j] = 
                    a[i * 4 + 0] * b[0 * 4 + j] +
                    a[i * 4 + 1] * b[1 * 4 + j] +
                    a[i * 4 + 2] * b[2 * 4 + j] +
                    a[i * 4 + 3] * b[3 * 4 + j];
            }
        }
        return result;
    }
}

// Initialize simulation when page loads
window.addEventListener('DOMContentLoaded', () => {
    new BlackHoleSimulation();
});
