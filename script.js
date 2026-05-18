class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    mult(n) {
        this.x *= n;
        this.y *= n;
        return this;
    }

    div(n) {
        this.x /= n;
        this.y /= n;
        return this;
    }

    mag() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    magSq() {
        return this.x * this.x + this.y * this.y;
    }

    normalize() {
        let m = this.mag();
        if (m !== 0) {
            this.div(m);
        }
        return this;
    }

    setMag(n) {
        this.normalize();
        this.mult(n);
        return this;
    }

    limit(max) {
        if (this.magSq() > max * max) {
            this.setMag(max);
        }
        return this;
    }

    dist(v) {
        let dx = this.x - v.x;
        let dy = this.y - v.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    heading() {
        return Math.atan2(this.y, this.x);
    }

    static add(v1, v2) {
        return new Vector(v1.x + v2.x, v1.y + v2.y);
    }

    static sub(v1, v2) {
        return new Vector(v1.x - v2.x, v1.y - v2.y);
    }

    static mult(v, n) {
        return new Vector(v.x * n, v.y * n);
    }

    static div(v, n) {
        return new Vector(v.x / n, v.y / n);
    }

    static dist(v1, v2) {
        return v1.dist(v2);
    }

    static random2D() {
        let angle = Math.random() * Math.PI * 2;
        return new Vector(Math.cos(angle), Math.sin(angle));
    }
}

class Boid {
    constructor(x, y) {
        this.position = new Vector(x, y);
        this.velocity = Vector.random2D();
        this.velocity.setMag(Math.random() * 2 + 2);
        this.acceleration = new Vector();
        this.maxForce = 0.05;
        this.maxSpeed = 4;
        
        // Colorful glass look: random bright hues with transparency
        const hues = [0, 45, 180, 280, 320]; // Red, Orange, Cyan, Purple, Pink
        const baseHue = hues[Math.floor(Math.random() * hues.length)];
        const hue = baseHue + (Math.random() * 40 - 20); // slight variation
        
        this.colorFill = `hsla(${hue}, 90%, 65%, 0.4)`;
        this.colorStroke = `hsla(${hue}, 100%, 80%, 0.9)`;
    }

    edges(width, height) {
        let margin = 100;
        let turnFactor = 0.2;

        // Smooth steering away from borders
        if (this.position.x < margin) {
            this.acceleration.x += turnFactor;
        } else if (this.position.x > width - margin) {
            this.acceleration.x -= turnFactor;
        }

        if (this.position.y < margin) {
            this.acceleration.y += turnFactor;
        } else if (this.position.y > height - margin) {
            this.acceleration.y -= turnFactor;
        }

        // Hard boundary bounce
        if (this.position.x > width) {
            this.position.x = width;
            this.velocity.x *= -1;
        } else if (this.position.x < 0) {
            this.position.x = 0;
            this.velocity.x *= -1;
        }
        
        if (this.position.y > height) {
            this.position.y = height;
            this.velocity.y *= -1;
        } else if (this.position.y < 0) {
            this.position.y = 0;
            this.velocity.y *= -1;
        }
    }

    align(boids, perceptionRadius) {
        let steering = new Vector();
        let total = 0;
        for (let other of boids) {
            let d = this.position.dist(other.position);
            if (other !== this && d < perceptionRadius) {
                steering.add(other.velocity);
                total++;
            }
        }
        if (total > 0) {
            steering.div(total);
            steering.setMag(this.maxSpeed);
            steering.sub(this.velocity);
            steering.limit(this.maxForce);
        }
        return steering;
    }

    cohesion(boids, perceptionRadius) {
        let steering = new Vector();
        let total = 0;
        for (let other of boids) {
            let d = this.position.dist(other.position);
            if (other !== this && d < perceptionRadius) {
                steering.add(other.position);
                total++;
            }
        }
        if (total > 0) {
            steering.div(total);
            steering.sub(this.position);
            steering.setMag(this.maxSpeed);
            steering.sub(this.velocity);
            steering.limit(this.maxForce);
        }
        return steering;
    }

    separation(boids, perceptionRadius) {
        let steering = new Vector();
        let total = 0;
        for (let other of boids) {
            let d = this.position.dist(other.position);
            if (other !== this && d < perceptionRadius && d > 0) {
                let diff = Vector.sub(this.position, other.position);
                diff.div(d * d); // Weight by distance
                steering.add(diff);
                total++;
            }
        }
        if (total > 0) {
            steering.div(total);
            steering.setMag(this.maxSpeed);
            steering.sub(this.velocity);
            steering.limit(this.maxForce);
        }
        return steering;
    }

    flock(boids, params) {
        let alignment = this.align(boids, params.perceptionRadius);
        let cohesion = this.cohesion(boids, params.perceptionRadius);
        let separation = this.separation(boids, params.perceptionRadius);

        let randomForce = Vector.random2D();
        randomForce.mult(params.randomWeight);

        alignment.mult(params.alignmentWeight);
        cohesion.mult(params.cohesionWeight);
        separation.mult(params.separationWeight);

        this.acceleration.add(alignment);
        this.acceleration.add(cohesion);
        this.acceleration.add(separation);
        this.acceleration.add(randomForce);
    }

    update() {
        this.position.add(this.velocity);
        this.velocity.add(this.acceleration);
        this.velocity.limit(this.maxSpeed);
        this.acceleration.mult(0); // Reset accel each frame
    }

    draw(ctx) {
        let theta = this.velocity.heading() + Math.PI / 2;
        
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(theta);
        
        // Draw Glass Boid (Triangle)
        ctx.beginPath();
        ctx.moveTo(0, -10); // Nose
        ctx.lineTo(-6, 8);  // Bottom left
        ctx.lineTo(6, 8);   // Bottom right
        ctx.closePath();

        // Glass effects
        ctx.fillStyle = this.colorFill;
        ctx.fill();

        ctx.strokeStyle = this.colorStroke;
        ctx.lineWidth = 1.5;
        
        // Inner highlight for glass effect
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 5;
        
        ctx.stroke();

        ctx.restore();
    }
}

// Setup Canvas and Simulation
const canvas = document.getElementById('boidsCanvas');
const ctx = canvas.getContext('2d');

let width, height;
const boids = [];
const NUM_BOIDS = 150;

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}

window.addEventListener('resize', resize);
resize();

for (let i = 0; i < NUM_BOIDS; i++) {
    boids.push(new Boid(Math.random() * width, Math.random() * height));
}

// Add more boids on click
canvas.addEventListener('click', (e) => {
    // Spawn 5 boids at the click location
    for (let i = 0; i < 5; i++) {
        boids.push(new Boid(e.clientX, e.clientY));
    }
});

// UI Controls
const elements = {
    randomWeight: { input: document.getElementById('randomWeight'), val: document.getElementById('randomWeightVal') },
    perceptionRadius: { input: document.getElementById('perceptionRadius'), val: document.getElementById('perceptionRadiusVal') },
    alignment: { input: document.getElementById('alignment'), val: document.getElementById('alignmentVal') },
    cohesion: { input: document.getElementById('cohesion'), val: document.getElementById('cohesionVal') },
    separation: { input: document.getElementById('separation'), val: document.getElementById('separationVal') }
};

// Sync sliders with value spans
for (const key in elements) {
    elements[key].input.addEventListener('input', (e) => {
        elements[key].val.textContent = e.target.value;
    });
}

function getParams() {
    return {
        randomWeight: parseFloat(elements.randomWeight.input.value),
        perceptionRadius: parseFloat(elements.perceptionRadius.input.value),
        alignmentWeight: parseFloat(elements.alignment.input.value),
        cohesionWeight: parseFloat(elements.cohesion.input.value),
        separationWeight: parseFloat(elements.separation.input.value)
    };
}

function animate() {
    // Clear canvas completely each frame (no trails, true glass look over gradient)
    ctx.clearRect(0, 0, width, height);
    
    const params = getParams();

    for (let boid of boids) {
        boid.edges(width, height);
        boid.flock(boids, params);
        boid.update();
        boid.draw(ctx);
    }

    requestAnimationFrame(animate);
}

animate();
