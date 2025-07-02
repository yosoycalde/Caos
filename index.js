// Variables globales
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let audioContext;
let masterGain;
let analyser;
let audioData;
let visualizerBars = [];
let audioEnabled = false;
let currentSynths = [];

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let animationId;
let particles = [];
let time = 0;
let activeEffect = null;

// Inicialización del sistema audiovisual
function initializeAudioVisual() {
    document.getElementById('startOverlay').style.display = 'none';
    initAudioSystem();
    createVisualizer();
    startPsychedelicWaves();
}

// Sistema de Audio
function initAudioSystem() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.3;

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;
    audioData = new Uint8Array(analyser.frequencyBinCount);

    masterGain.connect(analyser);
    analyser.connect(audioContext.destination);

    audioEnabled = true;
}

function createVisualizer() {
    const visualizer = document.getElementById('visualizer');
    visualizerBars = [];

    for (let i = 0; i < 64; i++) {
        const bar = document.createElement('div');
        bar.className = 'freq-bar';
        bar.style.height = '2px';
        visualizer.appendChild(bar);
        visualizerBars.push(bar);
    }

    updateVisualizer();
}

function updateVisualizer() {
    if (audioEnabled && analyser) {
        analyser.getByteFrequencyData(audioData);

        visualizerBars.forEach((bar, i) => {
            const value = audioData[i] || 0;
            const height = (value / 255) * 60;
            bar.style.height = Math.max(2, height) + 'px';
        });
    }

    requestAnimationFrame(updateVisualizer);
}

// Generadores de sonido
function createOscillator(frequency, type = 'sine', duration = 1) {
    if (!audioEnabled) return null;

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.frequency.value = frequency;
    osc.type = type;

    gain.gain.setValueAtTime(0.1, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + duration);

    return { osc, gain };
}

function createNoise(duration = 0.1) {
    if (!audioEnabled) return null;

    const bufferSize = audioContext.sampleRate * duration;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.1;
    }

    const source = audioContext.createBufferSource();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    source.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.value = 1000 + Math.random() * 3000;

    gain.gain.setValueAtTime(0.05, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    source.start(audioContext.currentTime);

    return { source, gain, filter };
}

function playRandomTone() {
    if (!audioEnabled) return;

    const frequencies = [220, 330, 440, 550, 660, 770, 880, 1100];
    const types = ['sine', 'triangle', 'sawtooth', 'square'];

    const freq = frequencies[Math.floor(Math.random() * frequencies.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const duration = 0.1 + Math.random() * 0.5;

    createOscillator(freq, type, duration);
}

// Controles de audio
function setVolume(value) {
    if (masterGain) {
        masterGain.gain.value = value / 100;
    }
    document.getElementById('volumeValue').textContent = value + '%';
}

function toggleAudio() {
    const button = document.getElementById('audioToggle');

    if (audioEnabled) {
        // Detener todos los sintetizadores
        currentSynths.forEach(synth => {
            if (synth && synth.osc) {
                try { synth.osc.stop(); } catch (e) { }
            }
        });
        currentSynths = [];

        audioEnabled = false;
        button.textContent = '🔇 AUDIO OFF';
        button.classList.add('muted');
    } else {
        audioEnabled = true;
        button.textContent = '🔊 AUDIO ON';
        button.classList.remove('muted');
    }
}

// Utilidades visuales
function random(min, max) {
    return Math.random() * (max - min) + min;
}

function randomColor() {
    return `hsl(${random(0, 360)}, 100%, 50%)`;
}

function clearChaos() {
    if (animationId) cancelAnimationFrame(animationId);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = [];
    document.querySelectorAll('.particle, .glitch-text').forEach(el => el.remove());

    // Detener sintetizadores activos
    currentSynths.forEach(synth => {
        if (synth && synth.osc) {
            try { synth.osc.stop(); } catch (e) { }
        }
    });
    currentSynths = [];

    // Remover clase active de botones
    document.querySelectorAll('.controls button').forEach(btn => {
        btn.classList.remove('active');
    });

    activeEffect = null;
}

// Efecto 1: Tormenta de Partículas + Audio Caótico
function startParticleStorm() {
    clearChaos();
    activeEffect = 'particles';
    document.querySelector('button[onclick="startParticleStorm()"]').classList.add('active');

    for (let i = 0; i < 200; i++) {
        particles.push({
            x: random(0, canvas.width),
            y: random(0, canvas.height),
            vx: random(-5, 5),
            vy: random(-5, 5),
            color: randomColor(),
            size: random(1, 4),
            life: random(50, 200)
        });
    }

    // Audio: Tonos aleatorios rápidos
    let audioInterval = setInterval(() => {
        if (activeEffect !== 'particles') {
            clearInterval(audioInterval);
            return;
        }

        if (Math.random() < 0.3) {
            playRandomTone();
        }

        if (Math.random() < 0.1) {
            createNoise(0.05);
        }
    }, 100);

    function animate() {
        if (activeEffect !== 'particles') return;

        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        particles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);

            if (p.life <= 0) {
                particles[i] = {
                    x: random(0, canvas.width),
                    y: random(0, canvas.height),
                    vx: random(-5, 5),
                    vy: random(-5, 5),
                    color: randomColor(),
                    size: random(1, 4),
                    life: random(50, 200)
                };
            }
        });

        animationId = requestAnimationFrame(animate);
    }
    animate();
}

// Efecto 2: Caos Fractal + Acordes Disonantes
function startFractalChaos() {
    clearChaos();
    activeEffect = 'fractal';
    document.querySelector('button[onclick="startFractalChaos()"]').classList.add('active');
    time = 0;

    // Audio: Acordes disonantes evolutivos
    let chordInterval = setInterval(() => {
        if (activeEffect !== 'fractal') {
            clearInterval(chordInterval);
            return;
        }

        // Crear acorde disonante
        const baseFreq = 100 + Math.random() * 200;
        const intervals = [1, 1.26, 1.498, 1.782]; // Intervalo disonante

        intervals.forEach((interval, i) => {
            setTimeout(() => {
                if (activeEffect === 'fractal') {
                    createOscillator(baseFreq * interval, 'triangle', 2);
                }
            }, i * 50);
        });
    }, 1500);

    function animate() {
        if (activeEffect !== 'fractal') return;

        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        for (let i = 0; i < 100; i++) {
            const angle = (i * Math.PI * 2 / 100) + time * 0.01;
            const radius = 50 + Math.sin(time * 0.005 + i * 0.1) * 200;

            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            const hue = (time + i * 10) % 360;
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;

            const size = 3 + Math.sin(time * 0.01 + i) * 2;
            ctx.fillRect(x, y, size, size);

            // Fractales secundarios
            for (let j = 0; j < 5; j++) {
                const subAngle = angle + j * Math.PI / 10;
                const subRadius = radius * 0.3;
                const subX = x + Math.cos(subAngle) * subRadius;
                const subY = y + Math.sin(subAngle) * subRadius;

                ctx.fillStyle = `hsl(${(hue + 180) % 360}, 100%, 50%)`;
                ctx.fillRect(subX, subY, 1, 1);
            }
        }

        time++;
        animationId = requestAnimationFrame(animate);
    }
    animate();
}

// Efecto 3: Lluvia Matrix + Sonidos Digitales
function startMatrixRain() {
    clearChaos();
    activeEffect = 'matrix';
    document.querySelector('button[onclick="startMatrixRain()"]').classList.add('active');

    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()';
    const drops = [];

    for (let i = 0; i < canvas.width / 10; i++) {
        drops.push({
            x: i * 10,
            y: random(-500, 0),
            speed: random(2, 8),
            char: chars[Math.floor(random(0, chars.length))]
        });
    }

    // Audio: Sonidos digitales de 8-bit
    let digitalInterval = setInterval(() => {
        if (activeEffect !== 'matrix') {
            clearInterval(digitalInterval);
            return;
        }

        if (Math.random() < 0.4) {
            const freq = 200 + Math.random() * 1000;
            createOscillator(freq, 'square', 0.1);
        }
    }, 150);

    function animate() {
        if (activeEffect !== 'matrix') return;

        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = '12px monospace';

        drops.forEach(drop => {
            drop.y += drop.speed;

            if (Math.random() < 0.05) {
                drop.char = chars[Math.floor(random(0, chars.length))];
            }

            const hue = (drop.y + time) % 360;
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            ctx.fillText(drop.char, drop.x, drop.y);

            if (drop.y > canvas.height) {
                drop.y = random(-200, 0);
                drop.speed = random(2, 8);

                // Sonido al "tocar" el suelo
                if (audioEnabled && Math.random() < 0.1) {
                    createOscillator(800 + Math.random() * 400, 'square', 0.05);
                }
            }
        });

        time++;
        animationId = requestAnimationFrame(animate);
    }
    animate();
}

// Efecto 4: Ondas Psicodélicas + Drones Ambientales
function startPsychedelicWaves() {
    clearChaos();
    activeEffect = 'waves';
    document.querySelector('button[onclick="startPsychedelicWaves()"]').classList.add('active');
    time = 0;

    // Audio: Drones ambientales evolutivos
    const droneFreqs = [55, 82.5, 110, 165];
    droneFreqs.forEach((freq, i) => {
        setTimeout(() => {
            if (activeEffect === 'waves') {
                const synth = createOscillator(freq, 'sine', 10);
                if (synth) currentSynths.push(synth);
            }
        }, i * 500);
    });

    function animate() {
        if (activeEffect !== 'waves') return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let x = 0; x < canvas.width; x += 5) {
            for (let y = 0; y < canvas.height; y += 5) {
                const wave1 = Math.sin((x + time) * 0.01) * 50;
                const wave2 = Math.sin((y + time) * 0.02) * 50;
                const wave3 = Math.sin((x + y + time) * 0.005) * 100;

                const intensity = (wave1 + wave2 + wave3) / 3;
                const hue = (intensity + time * 2) % 360;

                ctx.fillStyle = `hsl(${hue}, 100%, ${50 + intensity * 0.5}%)`;
                ctx.fillRect(x, y, 5, 5);
            }
        }

        time += 3;
        animationId = requestAnimationFrame(animate);
    }
    animate();
}

// Efecto 5: Arte Glitch + Ruido Estático
function startGlitchArt() {
    clearChaos();
    activeEffect = 'glitch';
    document.querySelector('button[onclick="startGlitchArt()"]').classList.add('active');

    // Audio: Ruido y glitches
    let glitchInterval = setInterval(() => {
        if (activeEffect !== 'glitch') {
            clearInterval(glitchInterval);
            return;
        }

        createNoise(0.1 + Math.random() * 0.2);

        if (Math.random() < 0.3) {
            const freq = 50 + Math.random() * 2000;
            createOscillator(freq, 'sawtooth', 0.1);
        }
    }, 200);

    function animate() {
        if (activeEffect !== 'glitch') return;

        // Glitch de colores
        for (let i = 0; i < 20; i++) {
            const x = random(0, canvas.width - 100);
            const y = random(0, canvas.height - 20);
            const w = random(50, 200);
            const h = random(10, 50);

            ctx.fillStyle = randomColor();
            ctx.fillRect(x, y, w, h);
        }

        // Líneas glitch
        for (let i = 0; i < 10; i++) {
            ctx.strokeStyle = randomColor();
            ctx.lineWidth = random(1, 5);
            ctx.beginPath();
            ctx.moveTo(random(0, canvas.width), random(0, canvas.height));
            ctx.lineTo(random(0, canvas.width), random(0, canvas.height));
            ctx.stroke();
        }

        // Texto glitch
        if (Math.random() < 0.3) {
            const glitchDiv = document.createElement('div');
            glitchDiv.className = 'glitch-text';
            glitchDiv.style.left = random(0, canvas.width - 100) + 'px';
            glitchDiv.style.top = random(0, canvas.height - 20) + 'px';
            glitchDiv.style.color = randomColor();
            glitchDiv.textContent = 'ERROR_' + Math.random().toString(36).substr(2, 5);
            document.body.appendChild(glitchDiv);

            setTimeout(() => glitchDiv.remove(), 1000);
        }

        setTimeout(() => {
            if (activeEffect === 'glitch') {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                animationId = requestAnimationFrame(animate);
            }
        }, 100);
    }
    animate();
}

// Efecto 6: Espiral Neón + Secuencias Melódicas Caóticas
function startNeonSpiral() {
    clearChaos();
    activeEffect = 'spiral';
    document.querySelector('button[onclick="startNeonSpiral()"]').classList.add('active');
    time = 0;

    // Audio: Secuencias melódicas aleatorias
    const scales = [
        [220, 247, 277, 294, 330, 370, 415], // Escala menor
        [261, 293, 329, 349, 392, 440, 493]  // Escala mayor
    ];

    let melodyInterval = setInterval(() => {
        if (activeEffect !== 'spiral') {
            clearInterval(melodyInterval);
            return;
        }

        const scale = scales[Math.floor(Math.random() * scales.length)];
        const note = scale[Math.floor(Math.random() * scale.length)];
        const octave = Math.random() < 0.5 ? 1 : 2;

        createOscillator(note * octave, 'triangle', 0.3);
    }, 300);

    function animate() {
        if (activeEffect !== 'spiral') return;

        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        for (let i = 0; i < 500; i++) {
            const angle = i * 0.1 + time * 0.02;
            const radius = i * 0.5 + Math.sin(time * 0.01) * 50;

            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            const hue = (i + time) % 360;
            const brightness = 50 + Math.sin(time * 0.01 + i * 0.1) * 50;

            ctx.fillStyle = `hsl(${hue}, 100%, ${brightness}%)`;
            ctx.shadowBlur = 10;
            ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;

            ctx.fillRect(x, y, 3, 3);
        }

        ctx.shadowBlur = 0;
        time++;
        animationId = requestAnimationFrame(animate);
    }
    animate();
}

// Redimensionar canvas
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Prevenir cierre accidental del contexto de audio
window.addEventListener('beforeunload', () => {
    if (audioContext) {
        audioContext.close();
    }
});