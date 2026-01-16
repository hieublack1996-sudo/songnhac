document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');
    const audioElement = document.getElementById('audio');
    const vinylContainer = document.getElementById('vinyl-container');
    const vinylImage = document.getElementById('vinyl-image');
    const ambientLight = document.getElementById('ambient-light');

    // Mixer Elements
    const fileInput = document.getElementById('file-input');
    const bgInput = document.getElementById('bg-input');
    const addMusicBtn = document.getElementById('add-music-btn');
    const addBgBtn = document.getElementById('add-bg-btn');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const skipBtn = document.getElementById('skip-btn');
    const effectBtns = document.querySelectorAll('.effect-btn');
    
    // Background Elements
    const bgVideo = document.getElementById('bg-video');
    const bgImage = document.getElementById('bg-image');
    
    // LCD Elements
    const trackNameDisplay = document.getElementById('track-name');
    const trackTimeDisplay = document.getElementById('track-time');

    // Controls
    const volFader = document.getElementById('vol-fader');
    const bassFader = document.getElementById('bass-fader');
    const knobs = document.querySelectorAll('.knob');
    const ledRings = document.querySelectorAll('.led-ring');

    // Timeline & Stats
    const progressBar = document.getElementById('progress-bar');
    const progressSpark = document.getElementById('progress-spark');
    const seekSlider = document.getElementById('seek-slider');
    const currentTimeEl = document.getElementById('current-time');
    const totalDurationEl = document.getElementById('total-duration');
    
    const statBpm = document.getElementById('stat-bpm');
    const statEnergy = document.getElementById('stat-energy');
    const statBass = document.getElementById('stat-bass');
    const statTreble = document.getElementById('stat-treble');

    // Canvas for Stats
    const waveBpm = document.getElementById('wave-bpm');
    const waveEnergy = document.getElementById('wave-energy');
    const waveBass = document.getElementById('wave-bass');
    const waveTreble = document.getElementById('wave-treble');
    
    const topMelodyCanvas = document.getElementById('top-melody-canvas');
    
    // Init Canvases
    [waveBpm, waveEnergy, waveBass, waveTreble, topMelodyCanvas].forEach(c => {
        if (c) {
            c.width = c.clientWidth;
            c.height = c.clientHeight;
        }
    });

    const playlistList = document.getElementById('playlist-items');
    const spotlights = document.querySelectorAll('.spotlight');

    let audioContext, analyser, source, bufferLength, dataArray, dataArrayFreq;
    let playlist = [];
    let currentTrackIndex = -1;
    let vinylRotation = 0;
    let bpm = 128; // Default simulated BPM
    let currentEffect = 'neon'; // Default effect
    let isPlaying = false;
    let masterVolume = 0.8;
    let bassSensitivity = 0.6;

    // Set initial active button
    document.querySelector('.effect-btn[data-effect="neon"]').classList.add('active');

    // --- VISUALIZER CUSTOMIZATION ---
    const vizSettings = {
        type: 'wave', // wave, bars, circle, dual
        size: 1.0,    // Amplitude multiplier
        shape: 10,    // Bar width or line thickness
        posY: 0,      // Vertical offset
        colorMode: 'auto', // auto, custom
        customColor1: '#00ffff',
        customColor2: '#ff00ff'
    };

    // Elements
    const vizPanel = document.getElementById('viz-settings-panel');
    const vizToggle = document.getElementById('viz-settings-toggle');
    const closeVizBtn = document.getElementById('close-viz-settings');
    const vizTypeBtns = document.querySelectorAll('.viz-type-btn');
    
    // Toggle Panel
    vizToggle.addEventListener('click', () => vizPanel.classList.toggle('hidden'));
    closeVizBtn.addEventListener('click', () => vizPanel.classList.add('hidden'));

    // Type Selection
    vizTypeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            vizTypeBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            vizSettings.type = e.target.dataset.type;
        });
    });

    // Sliders
    document.getElementById('viz-size').addEventListener('input', (e) => {
        vizSettings.size = parseFloat(e.target.value);
        document.getElementById('val-size').textContent = vizSettings.size.toFixed(1);
    });
    document.getElementById('viz-shape').addEventListener('input', (e) => {
        vizSettings.shape = parseInt(e.target.value);
        document.getElementById('val-shape').textContent = vizSettings.shape;
    });
    document.getElementById('viz-pos-y').addEventListener('input', (e) => {
        vizSettings.posY = parseInt(e.target.value);
        document.getElementById('val-pos-y').textContent = vizSettings.posY;
    });

    // Colors
    const colorModeSelect = document.getElementById('viz-color-mode');
    const customColorGroup = document.getElementById('custom-colors-group');
    
    colorModeSelect.addEventListener('change', (e) => {
        vizSettings.colorMode = e.target.value;
        customColorGroup.style.display = e.target.value === 'custom' ? 'block' : 'none';
    });

    document.getElementById('viz-color-1').addEventListener('input', (e) => vizSettings.customColor1 = e.target.value);
    document.getElementById('viz-color-2').addEventListener('input', (e) => vizSettings.customColor2 = e.target.value);

    // --- INITIAL SETUP ---
    function setupAudio() {
        if (audioContext) return;
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024; // Higher resolution for better detail
        analyser.smoothingTimeConstant = 0.85;

        source = audioContext.createMediaElementSource(audioElement);
        
        // Create Gain Node for Volume Control
        const gainNode = audioContext.createGain();
        gainNode.gain.value = masterVolume;
        
        source.connect(gainNode);
        gainNode.connect(analyser);
        analyser.connect(audioContext.destination);

        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        dataArrayFreq = new Uint8Array(bufferLength);
        
        // Bind Volume Fader
        volFader.addEventListener('input', (e) => {
            masterVolume = e.target.value / 100;
            gainNode.gain.value = masterVolume;
        });
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // --- EVENT LISTENERS ---
    addMusicBtn.addEventListener('click', () => fileInput.click());
    addBgBtn.addEventListener('click', () => bgInput.click());
    
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            files.forEach(file => {
                playlist.push({
                    name: file.name,
                    url: URL.createObjectURL(file),
                    file: file
                });
            });
            renderPlaylist();
            if (currentTrackIndex === -1) {
                loadTrack(0);
            }
            setupAudio();
        }
    });

    bgInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const objectURL = URL.createObjectURL(file);
            if (file.type.startsWith('video/')) {
                bgVideo.src = objectURL;
                bgVideo.play().catch(e => console.log('Video play failed:', e));
                bgVideo.classList.add('active');
                bgImage.classList.remove('active');
            } else if (file.type.startsWith('image/')) {
                bgImage.src = objectURL;
                bgImage.classList.add('active');
                bgVideo.classList.remove('active');
                bgVideo.pause();
            }
        }
    });

    playPauseBtn.addEventListener('click', togglePlayPause);
    
    skipBtn.addEventListener('click', () => { 
        if (playlist.length > 0) {
            let nextIndex = currentTrackIndex + 1;
            if (nextIndex >= playlist.length) nextIndex = 0;
            loadTrack(nextIndex);
        }
    });

    audioElement.addEventListener('ended', () => {
        if (playlist.length > 0) {
            let nextIndex = currentTrackIndex + 1;
            if (nextIndex < playlist.length) {
                loadTrack(nextIndex);
            } else {
                // End of playlist, loop to start or stop? User asked "auto next", implies continuity.
                // Let's loop to start for continuous play
                loadTrack(0);
            }
        }
    });

    effectBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active class from all
            effectBtns.forEach(b => b.classList.remove('active'));
            // Add to clicked
            e.target.classList.add('active');
            currentEffect = e.target.dataset.effect;
        });
    });

    bassFader.addEventListener('input', (e) => {
        bassSensitivity = e.target.value / 100;
    });

    // Knob Interactivity (Visual only for now, but feels real)
    knobs.forEach(knob => {
        let isDragging = false;
        let startY;
        let startRotation;

        knob.addEventListener('mousedown', (e) => {
            isDragging = true;
            startY = e.clientY;
            // Get current rotation transform
            const style = window.getComputedStyle(knob);
            const matrix = new WebKitCSSMatrix(style.transform);
            startRotation = Math.atan2(matrix.b, matrix.a) * (180/Math.PI);
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const deltaY = startY - e.clientY;
            let newRotation = startRotation + deltaY * 2;
            knob.style.transform = `rotate(${newRotation}deg)`;
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });
    });

    audioElement.addEventListener('play', () => {
        isPlaying = true;
        playPauseBtn.textContent = 'PAUSE';
        playPauseBtn.classList.add('playing');
        setupAudio();
        if(audioContext.state === 'suspended') audioContext.resume();
        animate();
    });

    audioElement.addEventListener('pause', () => {
        isPlaying = false;
        playPauseBtn.textContent = 'PLAY';
        playPauseBtn.classList.remove('playing');
    });

    audioElement.addEventListener('timeupdate', () => {
        const mins = Math.floor(audioElement.currentTime / 60);
        const secs = Math.floor(audioElement.currentTime % 60);
        trackTimeDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    });

    function togglePlayPause() {
        if (!audioElement.src) return;
        if (audioElement.paused) {
            audioElement.play();
        } else {
            audioElement.pause();
        }
    }

    // --- DRAWING & ANIMATION ---
    function getVizColors() {
        if (vizSettings.colorMode === 'custom') {
            return {
                main: vizSettings.customColor1,
                secondary: vizSettings.customColor2,
                glow: vizSettings.customColor1 // Simplify glow for custom
            };
        }
        return getEffectColors();
    }

    function drawCustomVisualizer(bassEnergy, midEnergy) {
        const colors = getVizColors();
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2 + (vizSettings.posY * 2); // Apply Y offset

        ctx.lineWidth = vizSettings.shape; // Apply Shape (Line Width / Bar Width)
        ctx.lineCap = 'round';
        ctx.shadowBlur = 15;
        ctx.shadowColor = colors.glow;

        switch (vizSettings.type) {
            case 'bars':
                drawVizBars(centerX, centerY, colors);
                break;
            case 'circle':
                drawVizCircle(centerX, centerY, colors, bassEnergy);
                break;
            case 'dual':
                drawVizDual(centerX, centerY, colors);
                break;
            case 'wave':
            default:
                drawVizWave(centerX, centerY, colors, bassEnergy);
                break;
        }
        
        ctx.shadowBlur = 0; // Reset
    }

    function drawVizWave(centerX, centerY, colors, bassEnergy) {
        const sliceWidth = canvas.width * 1.0 / bufferLength;
        let x = 0;

        ctx.beginPath();
        ctx.strokeStyle = colors.main;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            // Apply Size (Amplitude)
            const amplitude = (canvas.height / 3) * vizSettings.size;
            const y = (v * amplitude) + centerY - amplitude;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);

            x += sliceWidth;
        }
        ctx.stroke();
        
        // Secondary Line (Reflection-ish)
        ctx.beginPath();
        ctx.strokeStyle = colors.secondary;
        ctx.lineWidth = Math.max(1, vizSettings.shape / 2);
        x = 0;
        for (let i = 0; i < bufferLength; i+=2) {
             const v = dataArray[i] / 128.0;
             const amplitude = (canvas.height / 3) * vizSettings.size;
             const y = (v * amplitude) + centerY - amplitude + 20; // Offset
             if (i === 0) ctx.moveTo(x, y);
             else ctx.lineTo(x, y);
             x += sliceWidth * 2;
        }
        ctx.stroke();
    }

    function drawVizBars(centerX, centerY, colors) {
        const barWidth = vizSettings.shape;
        const gap = 2;
        // Calculate how many bars fit
        const barsToDraw = Math.floor(canvas.width / (barWidth + gap));
        // Calculate step to cover the interesting frequency range (usually low-mid)
        // Using a logarithmic-ish step or just linear for now
        const step = Math.ceil((bufferLength * 0.7) / barsToDraw); 
        
        // Centering
        let startX = (canvas.width - (barsToDraw * (barWidth + gap))) / 2;

        for (let i = 0; i < barsToDraw; i++) {
            const index = i * step;
            if (index >= bufferLength) break;
            
            const value = dataArrayFreq[index];
            const percent = value / 255;
            const height = percent * (canvas.height / 2) * vizSettings.size;

            ctx.fillStyle = colors.main;
            
            // Draw from center Y
            // Up
            ctx.fillRect(startX + i * (barWidth + gap), centerY - height, barWidth, height);
            
            // Down (Reflection)
            ctx.fillStyle = colors.secondary;
            ctx.globalAlpha = 0.5;
            ctx.fillRect(startX + i * (barWidth + gap), centerY, barWidth, height * 0.5);
            ctx.globalAlpha = 1.0;
        }
    }

    function drawVizCircle(centerX, centerY, colors, bassEnergy) {
        const baseRadius = 100 * vizSettings.size;
        const radius = baseRadius + (bassEnergy * 20);
        const bars = 120; // Fixed number of bars for circle
        const step = Math.floor((bufferLength * 0.8) / bars);
        const angleStep = (Math.PI * 2) / bars;

        ctx.strokeStyle = colors.main;
        ctx.lineWidth = Math.max(2, vizSettings.shape / 2); // Thinner lines for circle usually look better
        
        for (let i = 0; i < bars; i++) {
            const value = dataArrayFreq[i * step];
            const percent = value / 255;
            const barHeight = percent * 100 * vizSettings.size;
            
            const angle = i * angleStep;
            
            // Start point (on circle)
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            
            // End point (outwards)
            const x2 = centerX + Math.cos(angle) * (radius + barHeight);
            const y2 = centerY + Math.sin(angle) * (radius + barHeight);
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        
        // Inner Circle / Glow
        ctx.beginPath();
        ctx.strokeStyle = colors.secondary;
        ctx.lineWidth = 2;
        ctx.arc(centerX, centerY, radius - 5, 0, Math.PI * 2);
        ctx.stroke();
    }

    function drawVizDual(centerX, centerY, colors) {
         const barWidth = vizSettings.shape;
         const gap = 1;
         const maxBars = Math.floor((canvas.width / 2) / (barWidth + gap));
         const step = Math.ceil((bufferLength * 0.6) / maxBars);
         
         for (let i = 0; i < maxBars; i++) {
             const value = dataArrayFreq[i * step];
             const percent = value / 255;
             const height = percent * (canvas.height / 2) * vizSettings.size;
             
             ctx.fillStyle = colors.main;
             
             // Left Side (going left from center)
             const xLeft = centerX - (i * (barWidth + gap)) - barWidth;
             ctx.fillRect(xLeft, centerY - height/2, barWidth, height);
             
             // Right Side (going right from center)
             const xRight = centerX + (i * (barWidth + gap));
             ctx.fillStyle = colors.secondary; // Different color for right side? Or same?
             ctx.fillRect(xRight, centerY - height/2, barWidth, height);
         }
    }

    function animate() {
        if (!isPlaying) return;

        analyser.getByteTimeDomainData(dataArray);
        analyser.getByteFrequencyData(dataArrayFreq);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Analyze Energy
        const bassEnergy = (dataArrayFreq.slice(0, 10).reduce((a, b) => a + b, 0) / 10) / 255;
        const midEnergy = (dataArrayFreq.slice(20, 100).reduce((a, b) => a + b, 0) / 80) / 255;

        // Apply effects
        drawCustomVisualizer(bassEnergy, midEnergy);
        drawLeftVerticalWave();
        updateLightsAndKnobs(bassEnergy, midEnergy);
        updateVinyl(bassEnergy);
        updateAmbientLight(bassEnergy);
        updateSpotlights(bassEnergy, midEnergy);
        
        updateStats(bassEnergy, midEnergy);
        updateTimeline();
        
        // Draw Mini Waves
        drawStatWave(waveBpm, bpm/150, '#00a8ff', 'pulse');
        drawStatWave(waveEnergy, bassEnergy, '#e91e63', 'noise');
        drawStatWave(waveBass, bassEnergy, '#ff4500', 'sine');
        drawStatWave(waveTreble, midEnergy, '#ffd700', 'sharp');
        
        // Draw Top Melody
        drawTopMelody(dataArrayFreq);

        requestAnimationFrame(animate);
    }
    
    function drawStatWave(canvas, value, color, type) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        
        for (let i = 0; i < w; i++) {
            let y = h / 2;
            const offset = (Date.now() / 20) + i; // Moving wave
            
            if (type === 'pulse') {
                y += Math.sin(i * 0.1 + offset * 0.1) * (h/3) * value;
            } else if (type === 'noise') {
                y += (Math.random() - 0.5) * h * value;
            } else if (type === 'sine') {
                y += Math.sin(i * 0.2 + offset * 0.2) * (h/2) * value;
            } else if (type === 'sharp') {
                 y += ((i % 10 < 5) ? 1 : -1) * (h/3) * value;
            }
            
            if (i === 0) ctx.moveTo(i, y);
            else ctx.lineTo(i, y);
        }
        ctx.stroke();
    }
    
    function drawTopMelody(data) {
        const ctx = topMelodyCanvas.getContext('2d');
        const w = topMelodyCanvas.width;
        const h = topMelodyCanvas.height;
        ctx.clearRect(0, 0, w, h);
        
        const barWidth = (w / bufferLength) * 2.5;
        let x = 0;
        
        ctx.beginPath();
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < bufferLength; i++) {
            const v = data[i] / 128.0;
            const y = v * h/2; // Mirror effect or just high freqs
            
            if (i === 0) ctx.moveTo(x, h/2 - y/2);
            else ctx.lineTo(x, h/2 - (data[i]/255 * h));
            
            x += barWidth;
        }
        ctx.stroke();
    }

    function updateStats(bassNorm, midNorm) {
        // BPM Simulation (reacts to energy peaks)
        if (bassNorm > 0.8) bpm = 128 + Math.random() * 2; // Flutter on kick
        else bpm += (128 - bpm) * 0.1;
        
        statBpm.textContent = Math.round(bpm);
        
        // Energy
        const energy = Math.floor(bassNorm * 100);
        statEnergy.textContent = `${energy}%`;
        
        // Bass
        const bassDB = Math.floor(20 * Math.log10(bassNorm + 0.01));
        statBass.textContent = `${bassDB}dB`;
        
        // Treble (Simulated from Mid for now as we didn't separate high band strictly)
        const trebleDB = Math.floor(20 * Math.log10(midNorm + 0.01));
        statTreble.textContent = `${trebleDB}dB`;
    }
    
    function updateTimeline() {
        if (!audioElement.duration) return;
        const current = audioElement.currentTime;
        const duration = audioElement.duration;
        const percent = (current / duration) * 100;
        
        progressBar.style.width = `${percent}%`;
        progressSpark.style.left = `${percent}%`;
        seekSlider.value = percent;
        
        currentTimeEl.textContent = formatTime(current);
        totalDurationEl.textContent = formatTime(duration);
    }
    
    function formatTime(s) {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
    }
    
    // Seek Interaction
    seekSlider.addEventListener('input', (e) => {
        const percent = e.target.value;
        const time = (percent / 100) * audioElement.duration;
        audioElement.currentTime = time;
    });

    function getEffectColors() {
        switch (currentEffect) {
            case 'neon': return { main: '#00ffff', secondary: '#ff00ff', glow: 'rgba(0, 255, 255, 0.5)' };
            case 'fire': return { main: '#ff5500', secondary: '#ffaa00', glow: 'rgba(255, 85, 0, 0.5)' };
            case 'electric': return { main: '#aa00ff', secondary: '#0055ff', glow: 'rgba(170, 0, 255, 0.5)' };
            case 'cyber': return { main: '#ff0055', secondary: '#00ff99', glow: 'rgba(255, 0, 85, 0.5)' };
            default: return { main: '#00ff99', secondary: '#009944', glow: 'rgba(0, 255, 153, 0.5)' };
        }
    }

    function updateAmbientLight(bassEnergy) {
        const colors = getEffectColors();
        const opacity = 0.2 + (bassEnergy * bassSensitivity * 0.8);
        ambientLight.style.background = `radial-gradient(circle at center, ${colors.glow}, transparent 70%)`;
        ambientLight.style.opacity = opacity;
    }



    function drawLeftVerticalWave() {
        const colors = getEffectColors();
        const barWidth = 12;
        const gap = 6;
        const numBars = 12;
        const startX = 60;
        
        for (let i = 0; i < numBars; i++) {
            // Use lower frequencies for left bars
            const value = dataArrayFreq[i * 4]; 
            const percent = value / 255;
            const barHeight = Math.pow(percent, 1.5) * (canvas.height * 0.5) * bassSensitivity; // Responsive to bass fader
            
            const x = startX + i * (barWidth + gap);
            const y = canvas.height - barHeight;
            
            // Draw Glow
            ctx.fillStyle = colors.glow;
            ctx.fillRect(x - 2, y - 2, barWidth + 4, barHeight + 4);

            // Draw Core
            const gradient = ctx.createLinearGradient(x, y, x, canvas.height);
            gradient.addColorStop(0, colors.main);
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth, barHeight);
        }
    }

    function updateLightsAndKnobs(bassEnergy, midEnergy) {
        const colors = getEffectColors();

        ledRings.forEach((ring, index) => {
            const energy = index < 2 ? bassEnergy : midEnergy;
            // Pulse based on energy and sensitivity
            const brightness = 0.2 + (energy * bassSensitivity * 2); 
            const rotation = Date.now() / 10; // Slow rotation for effect
            
            ring.style.background = `conic-gradient(
                ${colors.main} 0deg, 
                transparent ${brightness * 100}deg,
                transparent 360deg
            )`;
            ring.style.transform = `rotate(${rotation}deg)`;
            ring.style.boxShadow = `0 0 ${brightness * 20}px ${colors.main}`;
        });
    }

    function updateVinyl(bassEnergy) {
        if (isPlaying) {
            // Spin speed affected by bass slightly for impact
            const speed = 0.5 + (bassEnergy * 0.2);
            vinylRotation += speed * audioElement.playbackRate;
            vinylImage.style.transform = `rotate(${vinylRotation}deg)`;
            
            // Pulse size on beat
            const scale = 1 + (bassEnergy * 0.05);
            vinylContainer.style.transform = `scale(${scale})`;
        }
    }

    function updateSpotlights(bassEnergy, midEnergy) {
        // Map energies to the 3 lights per side
        // s1: Bass (deep reds)
        // s2: Mid (greens/yellows)
        // s3: Treble (blues/cyans) - approximated from midEnergy for now or high freq if available
        
        // Use separate thresholds or multipliers for visual variety
        const v1 = Math.min(1, bassEnergy * 1.5);
        const v2 = Math.min(1, midEnergy * 1.5);
        const v3 = Math.min(1, midEnergy * 1.2); // Proxied treble

        spotlights.forEach(spot => {
            if (spot.classList.contains('s1')) {
                spot.style.opacity = v1;
                spot.style.height = `${50 + v1 * 50}%`;
            } else if (spot.classList.contains('s2')) {
                spot.style.opacity = v2;
                spot.style.height = `${40 + v2 * 60}%`;
            } else if (spot.classList.contains('s3')) {
                spot.style.opacity = v3;
                spot.style.height = `${30 + v3 * 70}%`;
            }
        });
    }

    function renderPlaylist() {
        if (!playlistList) return;
        playlistList.innerHTML = '';
        playlist.forEach((track, i) => {
            const li = document.createElement('li');
            li.className = 'playlist-item';
            li.textContent = `${i+1}. ${track.name}`;
            
            // Random Unique Color for each track
            if (!track.color) {
                const hue = Math.floor(Math.random() * 360);
                track.color = `hsla(${hue}, 70%, 50%, 0.2)`;
            }
            li.style.background = track.color;
            li.style.borderLeft = `4px solid hsl(${track.color.match(/hsla\((.*),/)[1]}, 100%, 50%)`;

            if (i === currentTrackIndex) {
                li.classList.add('active');
                li.style.background = `hsla(${track.color.match(/hsla\((.*),/)[1]}, 100%, 50%, 0.5)`;
            }

            li.onclick = () => loadTrack(i);
            playlistList.appendChild(li);
        });
    }

    function loadTrack(i) {
        if (i < 0 || i >= playlist.length) return;
        currentTrackIndex = i;
        audioElement.src = playlist[i].url;
        trackNameDisplay.textContent = playlist[i].name;
        // document.getElementById('track-name-b').textContent = playlist[i+1] ? playlist[i+1].name : "END OF LIST";
        renderPlaylist();
        audioElement.play();
    }
});
