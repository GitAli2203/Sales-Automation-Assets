// Physics calculations for black hole simulation

const Physics = {
    // Physical constants
    G: 6.67430e-11,              // Gravitational constant (m³/kg/s²)
    c: 299792458,                // Speed of light (m/s)
    solarMass: 1.989e30,         // Solar mass (kg)
    
    /**
     * Calculate Schwarzschild radius
     * rs = 2GM/c²
     * @param {number} mass - Mass in solar masses
     * @returns {number} Schwarzschild radius in kilometers
     */
    calculateSchwarzschildRadius: function(mass) {
        const massKg = mass * this.solarMass;
        const rs = (2 * this.G * massKg) / (this.c * this.c);
        return rs / 1000; // Convert to kilometers
    },
    
    /**
     * Calculate event horizon radius (same as Schwarzschild for non-rotating)
     * @param {number} mass - Mass in solar masses
     * @returns {number} Event horizon radius in kilometers
     */
    calculateEventHorizon: function(mass) {
        return this.calculateSchwarzschildRadius(mass);
    },
    
    /**
     * Calculate innermost stable circular orbit (ISCO)
     * For non-rotating: r_isco = 3 * rs
     * For rotating (Kerr): depends on spin parameter
     * @param {number} mass - Mass in solar masses
     * @param {number} spin - Spin parameter (0-1)
     * @returns {number} ISCO radius
     */
    calculateISCO: function(mass, spin) {
        const rs = this.calculateSchwarzschildRadius(mass);
        // Simplified formula (actual Kerr metric is more complex)
        const Z1 = 1 + Math.pow(1 - spin * spin, 1/3) * 
                   (Math.pow(1 + spin, 1/3) + Math.pow(1 - spin, 1/3));
        const Z2 = Math.sqrt(3 * spin * spin + Z1 * Z1);
        const rISCO = rs * (3 + Z2 - Math.sqrt((3 - Z1) * (3 + Z1 + 2 * Z2)));
        return rISCO;
    },
    
    /**
     * Calculate gravitational lensing deflection angle
     * @param {number} mass - Mass in solar masses
     * @param {number} impactParameter - Impact parameter
     * @returns {number} Deflection angle
     */
    calculateLensingAngle: function(mass, impactParameter) {
        if (impactParameter === 0) return 0;
        const rs = this.calculateSchwarzschildRadius(mass);
        // Simplified Einstein angle
        return (4 * rs) / impactParameter;
    },
    
    /**
     * Calculate orbital velocity at a given radius
     * v = sqrt(GM/r)
     * @param {number} mass - Mass in solar masses
     * @param {number} radius - Orbital radius
     * @returns {number} Orbital velocity
     */
    calculateOrbitalVelocity: function(mass, radius) {
        const massKg = mass * this.solarMass;
        const radiusM = radius * 1000;
        return Math.sqrt((this.G * massKg) / radiusM);
    },
    
    /**
     * Calculate accretion disk temperature based on radius
     * T ~ (GM*Mdot / (8πσr³))^(1/4)
     * Simplified model
     * @param {number} mass - Mass in solar masses
     * @param {number} radius - Distance from black hole
     * @param {number} colorTemp - Temperature parameter (0-1)
     * @returns {object} RGB color values
     */
    calculateAccretionTemperature: function(mass, radius, colorTemp) {
        // Temperature decreases with radius
        const baseTempFactor = 1.0 / Math.pow(radius, 0.75);
        const temp = baseTempFactor * (0.5 + colorTemp * 0.5);
        
        // Convert to color (blackbody approximation)
        let r, g, b;
        if (temp < 0.33) {
            // Cool - blue
            r = temp * 3.0;
            g = temp * 2.5;
            b = 1.0;
        } else if (temp < 0.66) {
            // Medium - white
            const t = (temp - 0.33) * 3.0;
            r = 0.33 + t * 0.67;
            g = 0.83 + t * 0.17;
            b = 1.0 - t * 0.3;
        } else {
            // Hot - red/orange
            const t = (temp - 0.66) * 3.0;
            r = 1.0;
            g = 1.0 - t * 0.6;
            b = 0.7 - t * 0.6;
        }
        
        return { r, g, b };
    },
    
    /**
     * Calculate space-time curvature at a point
     * @param {number} mass - Mass in solar masses
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     * @returns {number} Curvature magnitude
     */
    calculateSpacetimeCurvature: function(mass, x, y, z) {
        const dist = Math.sqrt(x * x + y * y + z * z);
        if (dist === 0) return 0;
        
        const rs = this.calculateSchwarzschildRadius(mass);
        // Simplified curvature calculation
        return (rs / (dist * dist)) * 100; // Scaled for visualization
    },
    
    /**
     * Calculate photon sphere radius
     * For Schwarzschild: r_photon = 1.5 * rs
     * @param {number} mass - Mass in solar masses
     * @returns {number} Photon sphere radius
     */
    calculatePhotonSphere: function(mass) {
        return this.calculateSchwarzschildRadius(mass) * 1.5;
    },
    
    /**
     * Calculate time dilation factor
     * t' = t * sqrt(1 - rs/r)
     * @param {number} mass - Mass in solar masses
     * @param {number} radius - Distance from black hole
     * @returns {number} Time dilation factor
     */
    calculateTimeDilation: function(mass, radius) {
        const rs = this.calculateSchwarzschildRadius(mass);
        if (radius <= rs) return 0; // At or inside event horizon
        return Math.sqrt(1 - rs / radius);
    },
    
    /**
     * Format physical values for display
     * @param {number} value - Value to format
     * @param {string} unit - Unit of measurement
     * @returns {string} Formatted string
     */
    formatValue: function(value, unit) {
        if (value >= 1e6) {
            return (value / 1e6).toFixed(2) + ' M' + unit;
        } else if (value >= 1e3) {
            return (value / 1e3).toFixed(2) + ' k' + unit;
        } else if (value >= 1) {
            return value.toFixed(2) + ' ' + unit;
        } else {
            return (value * 1000).toFixed(2) + ' m' + unit;
        }
    },
    
    /**
     * Apply relativistic effects to ray for rendering
     * @param {object} ray - Ray direction vector
     * @param {number} mass - Mass in solar masses
     * @param {object} position - Current position
     * @returns {object} Bent ray direction
     */
    applyGravitationalLensing: function(ray, mass, position) {
        const dist = Math.sqrt(
            position.x * position.x + 
            position.y * position.y + 
            position.z * position.z
        );
        
        if (dist === 0) return ray;
        
        const rs = this.calculateSchwarzschildRadius(mass);
        const bendingStrength = (rs / (dist * dist)) * 0.1; // Scaled for effect
        
        // Calculate bending direction (towards black hole)
        const toCenter = {
            x: -position.x / dist,
            y: -position.y / dist,
            z: -position.z / dist
        };
        
        // Apply bending
        return {
            x: ray.x + toCenter.x * bendingStrength,
            y: ray.y + toCenter.y * bendingStrength,
            z: ray.z + toCenter.z * bendingStrength
        };
    }
};
