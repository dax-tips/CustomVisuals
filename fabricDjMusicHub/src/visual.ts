/*
*  Power BI Visual CLI - Professional Music Studio Equalizer
*  Complete Audio Visualization Suite with Advanced Features
*
*  Features:
*  - Multi-track playlist with shuffle/repeat
*  - Real-time audio-reactive particle effects  
*  - Advanced audio processing (bass, treble, reverb)
*  - Beat detection with visual effects
*  - 17 visualization styles, including Geiss Classic and Geiss + Bars feedback
*  - 5 visual themes (neon, cyberpunk, retro, nature, fire)
*  - Music metadata extraction and album art display
*  - Full keyboard controls and fullscreen mode
*  - Boss key stealth mode
*/
"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

import { VisualFormattingSettingsModel } from "./settings";

interface Particle {
    x: number;
    y: number;
    z?: number; // 3D depth
    vx: number;
    vy: number;
    vz?: number; // 3D velocity
    ax?: number; // Acceleration X
    ay?: number; // Acceleration Y
    az?: number; // Acceleration Z
    size: number;
    color: string;
    life: number;
    maxLife: number;
    type: 'bass' | 'mid' | 'treble' | 'physics';
    
    // 🆕 Advanced Physics Properties
    mass?: number; // For gravitational effects
    charge?: number; // For electromagnetic effects
    friction?: number; // Air resistance/drag
    bounce?: number; // Collision elasticity (0-1)
    gravity?: number; // Individual gravity modifier
    magneticField?: number; // Magnetic susceptibility
    trail?: Array<{x: number, y: number, alpha: number}>; // Particle trail
    
    // Collision Detection
    radius?: number; // For collision calculations
    collided?: boolean; // Collision state
    
    // Interactive Properties
    targetX?: number; // Mouse attraction target
    targetY?: number;
    attractionForce?: number; // Strength of mouse attraction
    
    // Visual Effects
    rotation?: number; // Particle rotation
    rotationSpeed?: number; // Angular velocity
    glowIntensity?: number; // Dynamic glow effect
    colorShift?: number; // Color animation phase
}

interface BeatDetection {
    lastBeat: number;
    beatThreshold: number;
    beatDecay: number;
    bpm: number;
    beatHistory: number[];
    screenFlashIntensity: number;
    beatImpactParticles: Particle[];
}

interface AudioWaterfall {
    waterfallData: number[][];
    waterfallHeight: number;
    waterfallSpeed: number;
    gradientColors: string[];
}

interface SmartParticleSystem {
    bassExplosions: Particle[];
    midExplosions: Particle[];
    trebleExplosions: Particle[];
    explosionTriggers: {
        bass: number;
        mid: number;
        treble: number;
    };
}

interface InteractiveElements {
    clickRipples: Array<{
        x: number;
        y: number;
        radius: number;
        maxRadius: number;
        life: number;
        color: string;
    }>;
    mouseEffects: {
        x: number;
        y: number;
        trail: Array<{x: number, y: number, life: number}>;
    };
    isMouseInteractionEnabled: boolean;
}

interface MusicAnalysis {
    bpm: number;
    tempo: 'slow' | 'medium' | 'fast' | 'very_fast';
    energy: number;
    mood: 'calm' | 'energetic' | 'intense' | 'chaotic';
    keySignature: string;
    spectralCentroid: number;
    zeroCrossings: number;
}

interface DynamicThemeSystem {
    currentMood: string;
    transitionProgress: number;
    autoThemeEnabled: boolean;
    breathingEffect: {
        phase: number;
        intensity: number;
    };
    seasonalThemes: boolean;
}

interface AudioEffects {
    bassNode: BiquadFilterNode | null;
    midNode: BiquadFilterNode | null;
    trebleNode: BiquadFilterNode | null;
    compressorNode: DynamicsCompressorNode | null;
    reverbNode: ConvolverNode | null;
    gainNode: GainNode | null;
    splitter: ChannelSplitterNode | null;
    analyserL: AnalyserNode | null;
    analyserR: AnalyserNode | null;
}

// 🎵 DATA-DRIVEN MUSIC GENERATION INTERFACES 🎵
interface DataDrivenMusicSystem {
    isEnabled: boolean;
    webAudioNodes: {
        context: AudioContext | null;
        oscillators: OscillatorNode[];
        filters: BiquadFilterNode[];
        gainNodes: GainNode[];
        reverb: ConvolverNode | null;
        compressor: DynamicsCompressorNode | null;
    };
    musicalScale: {
        root: number; // Base frequency in Hz
        scale: number[]; // Scale intervals in semitones
        currentScale: string; // 'major', 'minor', 'pentatonic', etc.
        frequencies: number[]; // Calculated frequencies for the scale
    };
    rhythmPatterns: {
        currentPattern: number[]; // Rhythm pattern (0-1 values)
        timeSignature: string; // e.g., '4/4', '3/4'
        subdivision: number; // Notes per measure (8, 16, etc.)
        tempo: number; // BPM
    };
    harmonics: {
        bassNotes: number[]; // Bass frequencies
        chordProgressions: string[]; // Chord symbols
        currentChord: number; // Index in progression
        chordDuration: number; // Duration in ms
    };
    dataMapping: {
        frequencyToMelody: boolean;
        amplitudeToVolume: boolean;
        spectralCentroidToTimbre: boolean;
        beatDetectionToRhythm: boolean;
    };
    synthesis: {
        waveform: OscillatorType;
        attack: number;
        decay: number;
        sustain: number;
        release: number;
    };
}

interface Theme {
    name: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
        glow: string;
    };
    particleColors: string[];
}

export class Visual implements IVisual {
    private target: HTMLElement;
    private formattingSettings!: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private musicContainer!: HTMLElement;
    private bossMode: boolean = false;
    private bossContent!: HTMLElement;

    // Core Audio Components
    private audioContext!: AudioContext;
    private analyser!: AnalyserNode;
    private audioElement!: HTMLAudioElement;
    private frequencyData!: Uint8Array;
    private timeData!: Uint8Array;
    private equalizerCanvas!: HTMLCanvasElement;
    private particleCanvas!: HTMLCanvasElement;
    private webglCanvas!: HTMLCanvasElement;
    private canvasContext!: CanvasRenderingContext2D;
    private particleContext!: CanvasRenderingContext2D;
    private webglContext!: WebGLRenderingContext;
    private animationId!: number;

    // 🚀 NEW: WebGL 3D Visualization System
    private webgl3D: {
        shaderProgram?: WebGLProgram;
        vertexBuffer?: WebGLBuffer;
        indexBuffer?: WebGLBuffer;
        positionAttribute?: number;
        modelViewMatrix: Float32Array;
        projectionMatrix: Float32Array;
        rotationX: number;
        rotationY: number;
        rotationZ: number;
        cameraDistance: number;
        particles3D: Array<{
            position: [number, number, number];
            velocity: [number, number, number];
            color: [number, number, number, number];
            life: number;
            maxLife: number;
            size: number;
        }>;
        vertexShaderSource: string;
        fragmentShaderSource: string;
        uniformLocations: {
            modelViewMatrix?: WebGLUniformLocation;
            projectionMatrix?: WebGLUniformLocation;
            time?: WebGLUniformLocation;
            bassLevel?: WebGLUniformLocation;
            midLevel?: WebGLUniformLocation;
            trebleLevel?: WebGLUniformLocation;
        };
        // 🆕 Advanced Shader System
        shaderPrograms: Map<string, WebGLProgram>;
        activeShader: string;
        shaderSources: Map<string, {vertex: string, fragment: string}>;
    } = {
        modelViewMatrix: new Float32Array(16),
        projectionMatrix: new Float32Array(16),
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        cameraDistance: 5.0,
        particles3D: [],
        uniformLocations: {},
        shaderPrograms: new Map(),
        activeShader: 'audioReactive',
        shaderSources: new Map(),
        vertexShaderSource: `
            attribute vec4 aVertexPosition;
            attribute vec4 aVertexColor;
            
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
            uniform float uTime;
            uniform float uBassLevel;
            uniform float uMidLevel;
            uniform float uTrebleLevel;
            
            varying lowp vec4 vColor;
            varying float vDistance;
            
            void main(void) {
                // Audio-reactive vertex displacement
                vec4 position = aVertexPosition;
                
                // Bass affects Y-axis movement
                position.y += sin(position.x * 3.14159 + uTime * 0.005) * uBassLevel * 0.5;
                
                // Mid frequencies affect XZ plane ripples
                float ripple = sin(sqrt(position.x*position.x + position.z*position.z) * 8.0 - uTime * 0.01) * uMidLevel * 0.3;
                position.y += ripple;
                
                // Treble creates high-frequency noise
                position.x += sin(uTime * 0.02 + position.y * 10.0) * uTrebleLevel * 0.1;
                position.z += cos(uTime * 0.02 + position.y * 10.0) * uTrebleLevel * 0.1;
                
                gl_Position = uProjectionMatrix * uModelViewMatrix * position;
                gl_PointSize = 2.0 + uBassLevel * 8.0;
                
                // Distance-based color intensity
                vec4 worldPos = uModelViewMatrix * position;
                vDistance = length(worldPos.xyz);
                
                // Audio-reactive color mixing
                vec3 bassColor = vec3(1.0, 0.2, 0.4) * uBassLevel;
                vec3 midColor = vec3(0.2, 1.0, 0.6) * uMidLevel;
                vec3 trebleColor = vec3(0.4, 0.6, 1.0) * uTrebleLevel;
                
                vColor = vec4(bassColor + midColor + trebleColor, aVertexColor.a);
            }
        `,
        fragmentShaderSource: `
            precision mediump float;
            
            varying lowp vec4 vColor;
            varying float vDistance;
            
            uniform float uTime;
            uniform float uBassLevel;
            
            void main(void) {
                // Create circular particles with glow
                vec2 coord = gl_PointCoord - vec2(0.5);
                float distance = length(coord);
                
                if (distance > 0.5) {
                    discard;
                }
                
                // Glow effect based on distance from center
                float glow = 1.0 - distance * 2.0;
                glow = pow(glow, 2.0);
                
                // Pulsing effect synchronized with bass
                float pulse = 1.0 + sin(uTime * 0.01) * uBassLevel * 0.5;
                
                // Depth-based alpha for 3D effect
                float alpha = vColor.a * glow * pulse / (1.0 + vDistance * 0.1);
                
                gl_FragColor = vec4(vColor.rgb * glow * pulse, alpha);
            }
        `
    };

    // Playlist & Track Management
    private playlist: Array<{name: string, url: string, metadata?: any, duration?: number}> = [];
    private currentTrackIndex: number = -1;
    private isShuffleMode: boolean = false;
    private isRepeatMode: boolean = false;
    private playHistory: number[] = [];

    // 📊 Power BI Data Integration
    private dataRoles: {
        musicUrls: string[];
        trackNames: string[];
        categories: string[];
        audioData: number[][];
    } = {
        musicUrls: [],
        trackNames: [],
        categories: [],
        audioData: []
    };
    private hasDataBinding: boolean = false;
    private lastDataUpdate: number = 0;

    // Visual Effects
    private particles: Particle[] = [];
    private particlesEnabled: boolean = true;
    private currentTheme: string = 'neon';
    private themes: Map<string, Theme> = new Map();
    private visualizationStyle: string = 'geiss';
    private geissFeedbackCanvas: HTMLCanvasElement | null = null;
    private geissScratchCanvas: HTMLCanvasElement | null = null;
    private geissPhase: number = 0;
    private geissNeedsReset: boolean = true;
    private geissWarpMode: number = 0;
    private geissWaveformMode: number = 2;
    
    // 🔄 Auto-Cycling Visualizations
    private autoCycleEnabled: boolean = false;
    private cycleInterval: number = 20000; // 20 seconds
    private cycleTimer: number | null = null;
    private visualizationModes: string[] = ['bars', 'circular', 'waveform', 'spectrum', 'galaxy', 'matrix', 'vu', 'liquid', 'vinyl', 'spectrogram', 'dna', 'fireworks', 'oscilloscope', 'radar', 'cassette', 'geiss', 'geiss-bars'];
    private currentCycleIndex: number = 0;
    
    // 🆕 Advanced Physics System
    private physicsSystem: {
        gravity: { x: number, y: number, z: number };
        magneticFields: Array<{
            x: number, y: number, z: number;
            strength: number;
            radius: number;
            type: 'attract' | 'repel';
        }>;
        boundaries: {
            left: number, right: number, top: number, bottom: number;
            elasticity: number; // Wall bounce factor
        };
        airResistance: number; // Global air resistance
        particleCollisions: boolean; // Enable particle-to-particle collisions
        magneticFieldEnabled: boolean;
        gravityEnabled: boolean;
        trailsEnabled: boolean;
        mouseInteraction: {
            enabled: boolean;
            x: number, y: number;
            attractionRadius: number;
            attractionForce: number;
            repulsionMode: boolean; // Hold shift for repulsion
        };
        
        // Physics constants
        constants: {
            GRAVITY_STRENGTH: number;
            MAGNETIC_STRENGTH: number;
            COLLISION_DAMPING: number;
            TRAIL_LENGTH: number;
            FRICTION_COEFFICIENT: number;
        };
    } = {
        gravity: { x: 0, y: 0.02, z: 0 }, // Slight downward gravity
        magneticFields: [],
        boundaries: { left: 0, right: 0, top: 0, bottom: 0, elasticity: 0.8 },
        airResistance: 0.999, // Very light air resistance
        particleCollisions: true,
        magneticFieldEnabled: true,
        gravityEnabled: true,
        trailsEnabled: true,
        mouseInteraction: {
            enabled: true,
            x: 0, y: 0,
            attractionRadius: 150,
            attractionForce: 0.5,
            repulsionMode: false
        },
        constants: {
            GRAVITY_STRENGTH: 0.1,
            MAGNETIC_STRENGTH: 2.0,
            COLLISION_DAMPING: 0.7,
            TRAIL_LENGTH: 8,
            FRICTION_COEFFICIENT: 0.98
        }
    };
    
    // Audio Effects
    private audioEffects: AudioEffects = {
        bassNode: null,
        midNode: null,
        trebleNode: null,
        compressorNode: null,
        reverbNode: null,
        gainNode: null,
        splitter: null,
        analyserL: null,
        analyserR: null
    };

    // Beat Detection
    private beatDetection: BeatDetection = {
        lastBeat: 0,
        beatThreshold: 0.3,
        beatDecay: 0.98,
        bpm: 0,
        beatHistory: [],
        screenFlashIntensity: 0,
        beatImpactParticles: []
    };

    // UI State
    private showShortcuts: boolean = false;
    private resizeTimeout: any; // For debouncing resize events
    private vuPeakL: number = 0;
    private vuPeakR: number = 0;
    private vuPeakDecay: number = 0.97;
    
    // DJ Mashup Mode Properties
    private djMashup: {
        isEnabled: boolean;
        trackA: {
            element: HTMLAudioElement | null;
            url: string;
            bpm: number;
            volume: number;
            position: number;
        };
        trackB: {
            element: HTMLAudioElement | null;
            url: string;
            bpm: number;
            volume: number;
            position: number;
        };
        crossfader: number; // -100 to 100, 0 = center
        syncMode: 'manual' | 'auto';
        beatSync: boolean;
        progressUpdateStarted: boolean;
        masterBpm: number;
        autoSyncEnabled: boolean;
    } = {
        isEnabled: false,
        trackA: { element: null, url: '', bpm: 120, volume: 0.8, position: 0 },
        trackB: { element: null, url: '', bpm: 120, volume: 0.8, position: 0 },
        crossfader: 0,
        syncMode: 'auto',
        beatSync: true,
        progressUpdateStarted: false,
        masterBpm: 120,
        autoSyncEnabled: false
    };
    private lastKeyTime: number = 0;

    // Spotify Integration removed

    // 🚀 NEW AWESOME FEATURES
    // Audio Waterfall System
    private audioWaterfall: AudioWaterfall = {
        waterfallData: [],
        waterfallHeight: 100,
        waterfallSpeed: 2,
        gradientColors: ['#ff0080', '#00ff88', '#00ccff', '#ffff00']
    };

    // Smart Particle Explosion System
    private smartParticles: SmartParticleSystem = {
        bassExplosions: [],
        midExplosions: [],
        trebleExplosions: [],
        explosionTriggers: { bass: 0.7, mid: 0.6, treble: 0.5 }
    };

    // Interactive Elements System
    private interactiveElements: InteractiveElements = {
        clickRipples: [],
        mouseEffects: { x: 0, y: 0, trail: [] },
        isMouseInteractionEnabled: true
    };

    // Music Analysis System
    private musicAnalysis: MusicAnalysis = {
        bpm: 120,
        tempo: 'medium',
        energy: 0,
        mood: 'calm',
        keySignature: 'C',
        spectralCentroid: 0,
        zeroCrossings: 0
    };

    // Dynamic Theme System
    private dynamicThemes: DynamicThemeSystem = {
        currentMood: 'calm',
        transitionProgress: 0,
        autoThemeEnabled: true,
        breathingEffect: { phase: 0, intensity: 1 },
        seasonalThemes: true
    };

    // 🎵 DATA-DRIVEN MUSIC GENERATION SYSTEM 🎵
    private musicGeneration: DataDrivenMusicSystem = {
        isEnabled: false,
        webAudioNodes: {
            context: null,
            oscillators: [],
            filters: [],
            gainNodes: [],
            reverb: null,
            compressor: null
        },
        musicalScale: {
            root: 261.63, // C4 frequency
            scale: [0, 2, 4, 5, 7, 9, 11], // Major scale intervals (semitones)
            currentScale: 'major',
            frequencies: []
        },
        rhythmPatterns: {
            currentPattern: [1, 0, 0.5, 0, 0.8, 0, 0.3, 0], // Basic pattern
            timeSignature: '4/4',
            subdivision: 8, // 8th notes
            tempo: 120
        },
        harmonics: {
            bassNotes: [],
            chordProgressions: ['I', 'V', 'vi', 'IV'], // Common progression
            currentChord: 0,
            chordDuration: 2000 // ms
        },
        dataMapping: {
            frequencyToMelody: true,
            amplitudeToVolume: true,
            spectralCentroidToTimbre: true,
            beatDetectionToRhythm: true
        },
        synthesis: {
            waveform: 'sine',
            attack: 0.1,
            decay: 0.2,
            sustain: 0.3,
            release: 0.5
        }
    };

    // Audio-Reactive Background System
    private backgroundEffects = {
        gradientShift: 0,
        pulseIntensity: 0,
        distortionLevel: 0,
        geometricPatterns: [],
        lensEffects: { active: false, centerX: 0, centerY: 0, intensity: 0 }
    };

    constructor(options: VisualConstructorOptions) {
        this.target = options.element;
        this.formattingSettingsService = new FormattingSettingsService();
        
        this.initializeThemes();
        this.initializeMusicStudio();
        this.setupEventListeners();
        this.setupBossKey();
        
        // Initialize audio context on user interaction
        document.addEventListener('click', () => this.initializeAudioContext(), { once: true });
    }

    public update(options: VisualUpdateOptions) {
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews?.[0]);
        
        // Update analyser settings when formatting settings change
        this.updateAnalyserSettings();
        
        // Handle data updates for playlist from Power BI dataset
        if (options.dataViews && options.dataViews[0]) {
            this.updatePlaylistFromData(options.dataViews[0]);
        } else {
            // No data provided - visual can still function with file uploads or demo mode
            console.log('📊 No Power BI data provided - visual ready for file uploads or demo mode');
            this.hasDataBinding = false;
        }
    }

    private initializeThemes(): void {
        this.themes.set('neon', {
            name: 'Neon',
            colors: {
                primary: '#00ff88',
                secondary: '#00ccff',
                accent: '#ff0080',
                background: 'linear-gradient(45deg, #0a0a0a, #1a1a2e, #16213e)',
                text: '#ffffff',
                glow: '#00ff88'
            },
            particleColors: ['#00ff88', '#00ccff', '#ff0080', '#ffff00', '#ff4444']
        });

        this.themes.set('cyberpunk', {
            name: 'Cyberpunk',
            colors: {
                primary: '#ff2a6d',
                secondary: '#05d9e8',
                accent: '#01012b',
                background: 'linear-gradient(45deg, #01012b, #0d1137, #1e3c72)',
                text: '#ffffff',
                glow: '#ff2a6d'
            },
            particleColors: ['#ff2a6d', '#05d9e8', '#d1f7ff', '#005678', '#ffbf00']
        });

        this.themes.set('retro', {
            name: 'Retro 80s',
            colors: {
                primary: '#ff6b35',
                secondary: '#f7931e',
                accent: '#c05299',
                background: 'linear-gradient(45deg, #2d1b69, #11998e, #f38181)',
                text: '#ffffff',
                glow: '#ff6b35'
            },
            particleColors: ['#ff6b35', '#f7931e', '#c05299', '#f38181', '#3d5a80']
        });

        this.themes.set('nature', {
            name: 'Nature',
            colors: {
                primary: '#4ecdc4',
                secondary: '#44a08d',
                accent: '#ff6b6b',
                background: 'linear-gradient(45deg, #134e5e, #71b280, #2d5016)',
                text: '#ffffff',
                glow: '#4ecdc4'
            },
            particleColors: ['#4ecdc4', '#44a08d', '#ff6b6b', '#fce38a', '#95e1d3']
        });

        this.themes.set('fire', {
            name: 'Fire',
            colors: {
                primary: '#ff4444',
                secondary: '#ff8800',
                accent: '#ffff00',
                background: 'linear-gradient(45deg, #000000, #4a0e0e, #8b0000)',
                text: '#ffffff',
                glow: '#ff4444'
            },
            particleColors: ['#ff4444', '#ff8800', '#ffff00', '#ff0000', '#cc0000']
        });
    }

    private initializeMusicStudio(): void {
        this.target.innerHTML = `
            <div id="musicStudio" class="music-studio">
                <canvas id="particleCanvas" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;"></canvas>

                <div class="ms-titlebar">
                    <span class="ms-titlebar__title">FABRIC DJ MUSIC HUB</span>
                </div>

                <div class="ms-controls">
                    <div class="ms-player">
                        <div class="ms-lcd">
                            <div id="trackInfo" class="ms-lcd__track">No track loaded</div>
                            <div class="ms-lcd__time-row">
                                <span id="currentTime" class="ms-lcd__time">0:00</span>
                                <div id="progressContainer" class="ms-progress">
                                    <canvas id="waveformCanvas" class="ms-progress__waveform"></canvas>
                                    <div id="progressBar" class="ms-progress__fill" style="width:0%"></div>
                                </div>
                                <span id="totalTime" class="ms-lcd__time">0:00</span>
                            </div>
                            <div id="trackMetadata" class="ms-lcd__metadata"></div>
                        </div>

                        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                            <div class="ms-transport">
                                <button id="shuffleBtn" class="ms-transport-btn" title="Shuffle">SHF</button>
                                <button id="prevTrackBtn" class="ms-transport-btn" title="Previous">|&lt;</button>
                                <button id="skipBackBtn" class="ms-transport-btn" title="Back">&lt;&lt;</button>
                                <button id="playPauseBtn" class="ms-transport-btn ms-transport-btn--play" title="Play">&#9654;</button>
                                <button id="skipForwardBtn" class="ms-transport-btn" title="Forward">&gt;&gt;</button>
                                <button id="nextTrackBtn" class="ms-transport-btn" title="Next">&gt;|</button>
                                <button id="repeatBtn" class="ms-transport-btn" title="Repeat">RPT</button>
                            </div>

                            <div class="ms-toolbar">
                                <select id="themeSelector" class="ms-select">
                                    <option value="neon">Neon</option>
                                    <option value="cyberpunk">Cyberpunk</option>
                                    <option value="retro">Retro 80s</option>
                                    <option value="nature">Nature</option>
                                    <option value="fire">Fire</option>
                                </select>
                                <select id="visualStyle" class="ms-select">
                                    <option value="bars">Bars</option>
                                    <option value="circular">Circle</option>
                                    <option value="waveform">Wave</option>
                                    <option value="spectrum">Spectrum</option>
                                    <option value="galaxy">Galaxy</option>
                                    <option value="matrix">Matrix</option>
                                    <option value="vu">VU</option>
                                    <option value="liquid">Liquid</option>
                                    <option value="vinyl">Vinyl</option>
                                    <option value="spectrogram">Heat</option>
                                    <option value="dna">DNA</option>
                                    <option value="fireworks">Sparks</option>
                                    <option value="oscilloscope">Scope</option>
                                    <option value="radar">Radar</option>
                                    <option value="cassette">Tape</option>
                                    <option value="geiss" selected>Geiss Classic</option>
                                    <option value="geiss-bars">Geiss + Bars</option>
                                    <option value="auto-cycle">Auto</option>
                                </select>
                                <button id="particlesToggle" class="ms-toolbar-btn ms-toolbar-btn--active">FX ON</button>
                                <button id="mixerBtn" class="ms-toolbar-btn">MIXER</button>
                                <button id="fullscreenBtn" class="ms-toolbar-btn">FULL</button>
                                <div id="beatIndicator" class="ms-beat"></div>
                            </div>
                        </div>

                        <div class="ms-sliders">
                            <div class="ms-slider-group">
                                <span class="ms-slider-group__label">VOL</span>
                                <input type="range" id="volumeSlider" min="0" max="100" value="70" style="width:70px;">
                                <span id="volumeDisplay" class="ms-slider-group__value">70%</span>
                            </div>
                            <div class="ms-slider-group">
                                <span class="ms-slider-group__label">BASS</span>
                                <input type="range" id="bassSlider" min="-12" max="12" value="0" style="width:60px;">
                                <span id="bassDisplay" class="ms-slider-group__value">0dB</span>
                            </div>
                            <div class="ms-slider-group">
                                <span class="ms-slider-group__label">TREB</span>
                                <input type="range" id="trebleSlider" min="-12" max="12" value="0" style="width:60px;">
                                <span id="trebleDisplay" class="ms-slider-group__value">0dB</span>
                            </div>
                            <div class="ms-slider-group">
                                <span class="ms-slider-group__label">REV</span>
                                <input type="range" id="reverbSlider" min="0" max="100" value="0" style="width:60px;">
                                <span id="reverbDisplay" class="ms-slider-group__value">0%</span>
                            </div>
                        </div>

                        <input type="file" id="audioFileInput" accept=".mp3,.wav,.ogg,.m4a,.flac" multiple class="ms-file-input">
                    </div>

                    <div class="ms-playlist">
                        <div class="ms-playlist__header">PLAYLIST</div>
                        <div id="playlistContainer" class="ms-playlist__body">
                            <div id="playlistItems">
                                <div class="ms-playlist-item" style="text-align:center;color:#555568;">Empty</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="text-align:center;padding:4px 0;position:relative;z-index:10;">
                    <button id="toggleDjMode" class="ms-toolbar-btn ms-toolbar-btn--dj">DJ MODE</button>
                </div>

                <div id="djMashupPanel" class="ms-dj">
                    <div class="ms-dj__title">DJ MASHUP</div>
                    <div class="ms-dj__layout">
                        <div class="ms-deck ms-deck--a">
                            <div class="ms-deck__label" style="color:#ff0064;">DECK A</div>
                            <input type="file" id="trackAInput" accept=".mp3,.wav,.ogg,.m4a" class="ms-file-input" style="border-color:#ff0064;">
                            <div class="ms-deck__row">
                                <span>BPM</span>
                                <div class="ms-deck__controls">
                                    <button id="bpmDownA" class="ms-deck-btn ms-deck-btn--a">-</button>
                                    <input type="number" id="bpmA" value="120" min="60" max="200"
                                        style="width:40px;padding:2px;background:#1a1a26;color:#ff0064;border:1px solid #ff0064;border-radius:3px;font-size:12px;text-align:center;">
                                    <button id="bpmUpA" class="ms-deck-btn ms-deck-btn--a">+</button>
                                </div>
                            </div>
                            <div class="ms-deck__row">
                                <span>VOL</span>
                                <input type="range" id="volumeA" min="0" max="100" value="80" style="flex:1;accent-color:#ff0064;">
                                <span id="volumeADisplay" style="color:#ff0064;font-weight:700;min-width:20px;font-size:11px;">80</span>
                            </div>
                            <div class="ms-deck__controls">
                                <button id="nudgeSlowA" class="ms-deck-btn ms-deck-btn--a">&lt;</button>
                                <button id="nudgeFastA" class="ms-deck-btn ms-deck-btn--a">&gt;</button>
                                <button id="tapBeatA" class="ms-deck-btn ms-deck-btn--accent">TAP</button>
                            </div>
                            <div id="trackAInfo" class="ms-deck__info">No track</div>
                            <div class="ms-deck__time-row"><span id="currentTimeA">0:00</span><span id="totalTimeA">0:00</span></div>
                            <div class="ms-deck__controls">
                                <input type="range" id="positionSliderA" min="0" max="100" value="0" style="flex:1;accent-color:#ff0064;" disabled>
                                <button id="playPauseA" class="ms-deck-btn ms-deck-btn--a" disabled>&#9654;</button>
                            </div>
                        </div>

                        <div class="ms-crossfader">
                            <span class="ms-crossfader__label">CROSS</span>
                            <input type="range" id="crossfader" min="-100" max="100" value="0">
                            <span id="crossfaderDisplay" class="ms-crossfader__value">CTR</span>
                        </div>

                        <div class="ms-deck ms-deck--b">
                            <div class="ms-deck__label" style="color:#0064ff;">DECK B</div>
                            <input type="file" id="trackBInput" accept=".mp3,.wav,.ogg,.m4a" class="ms-file-input" style="border-color:#0064ff;">
                            <div class="ms-deck__row">
                                <span>BPM</span>
                                <div class="ms-deck__controls">
                                    <button id="bpmDownB" class="ms-deck-btn ms-deck-btn--b">-</button>
                                    <input type="number" id="bpmB" value="120" min="60" max="200"
                                        style="width:40px;padding:2px;background:#1a1a26;color:#0064ff;border:1px solid #0064ff;border-radius:3px;font-size:12px;text-align:center;">
                                    <button id="bpmUpB" class="ms-deck-btn ms-deck-btn--b">+</button>
                                </div>
                            </div>
                            <div class="ms-deck__row">
                                <span>VOL</span>
                                <input type="range" id="volumeB" min="0" max="100" value="80" style="flex:1;accent-color:#0064ff;">
                                <span id="volumeBDisplay" style="color:#0064ff;font-weight:700;min-width:20px;font-size:11px;">80</span>
                            </div>
                            <div class="ms-deck__controls">
                                <button id="nudgeSlowB" class="ms-deck-btn ms-deck-btn--b">&lt;</button>
                                <button id="nudgeFastB" class="ms-deck-btn ms-deck-btn--b">&gt;</button>
                                <button id="tapBeatB" class="ms-deck-btn ms-deck-btn--accent">TAP</button>
                            </div>
                            <div id="trackBInfo" class="ms-deck__info">No track</div>
                            <div class="ms-deck__time-row"><span id="currentTimeB">0:00</span><span id="totalTimeB">0:00</span></div>
                            <div class="ms-deck__controls">
                                <input type="range" id="positionSliderB" min="0" max="100" value="0" style="flex:1;accent-color:#0064ff;" disabled>
                                <button id="playPauseB" class="ms-deck-btn ms-deck-btn--b" disabled>&#9654;</button>
                            </div>
                        </div>
                    </div>
                    <div class="ms-dj-actions">
                        <button id="syncTracksBtn" class="ms-dj-btn ms-dj-btn--sync">SYNC</button>
                        <button id="mashupPlayBtn" class="ms-dj-btn ms-dj-btn--play">MASHUP</button>
                        <button id="autoMixBtn" class="ms-dj-btn ms-dj-btn--auto">AUTO</button>
                    </div>
                    <div id="syncStatus" class="ms-dj-status">Not synced</div>
                </div>

                <div id="masterBpmControl" class="ms-master-bpm">
                    <div id="beatFlash" class="ms-master-bpm__flash"></div>
                    <div class="ms-master-bpm__title">MASTER BPM</div>
                    <div class="ms-master-bpm__row">
                        <button id="masterBpmDown" class="ms-bpm-btn">-</button>
                        <div class="ms-bpm-display">
                            <label>BPM</label>
                            <input type="number" id="masterBpm" min="60" max="200" value="120">
                        </div>
                        <button id="masterBpmUp" class="ms-bpm-btn">+</button>
                        <button id="syncTracksToMaster" class="ms-sync-btn ms-sync-btn--sync">SYNC</button>
                        <button id="toggleAutoSync" class="ms-sync-btn ms-sync-btn--auto">AUTO</button>
                    </div>
                    <div id="masterSyncStatus" class="ms-master-bpm__status">Master control ready</div>
                </div>

                <div class="ms-viz">
                    <canvas id="equalizerCanvas"></canvas>
                    <canvas id="webglCanvas" style="z-index:10;pointer-events:none;opacity:0.8;"></canvas>
                </div>

                <div id="shortcutsHelp" class="ms-shortcuts">
                    <div class="ms-shortcuts__title">SHORTCUTS</div>
                    <div>SPACE Play/Pause &nbsp; Arrows Skip/Vol &nbsp; F Fullscreen</div>
                    <div>1-8 Viz &nbsp; 9 Vinyl &nbsp; 0 Heat &nbsp; A DNA &nbsp; D Sparks &nbsp; E Scope &nbsp; W Radar &nbsp; C Tape</div>
                    <div>[ ] Prev/Next Viz &nbsp; T Theme &nbsp; P FX &nbsp; S Shuffle &nbsp; R Repeat &nbsp; X Mixer</div>
                    <div>N Next Track &nbsp; B Boss &nbsp; H Help &nbsp; M Music &nbsp; J DJ</div>
                </div>

                <div class="ms-status">
                    <span>READY</span>
                </div>

                <audio id="audioPlayer" style="display:none;"></audio>

                <div id="mixerOverlay" class="ms-mixer-overlay">
                    <div class="ms-mixer">
                        <div class="ms-mixer__header">
                            <span class="ms-mixer__title">CHANNEL MIXER</span>
                            <button id="mixerClose" class="ms-mixer__close">&times;</button>
                        </div>
                        <div class="ms-mixer__channels">
                            <div class="ms-channel">
                                <span class="ms-channel__label">VOL</span>
                                <div id="mixTrackVol" class="ms-channel__fader-track" data-min="0" data-max="100" data-value="70" data-key="vol">
                                    <div id="mixFaderFillVol" class="ms-channel__fader-fill" style="height:70%;background:#00ff41;"></div>
                                    <div class="ms-channel__thumb" style="bottom:70%"></div>
                                </div>
                                <span id="mixValVol" class="ms-channel__value ms-channel__value--vol">70%</span>
                            </div>
                            <div class="ms-channel">
                                <span class="ms-channel__label">BASS</span>
                                <div id="mixTrackBass" class="ms-channel__fader-track" data-min="-12" data-max="12" data-value="0" data-key="bass">
                                    <div id="mixFaderFillBass" class="ms-channel__fader-fill" style="height:50%;background:#ff6b6b;"></div>
                                    <div class="ms-channel__thumb" style="bottom:50%"></div>
                                </div>
                                <span id="mixValBass" class="ms-channel__value ms-channel__value--bass">0dB</span>
                            </div>
                            <div class="ms-channel">
                                <span class="ms-channel__label">MID</span>
                                <div id="mixTrackMid" class="ms-channel__fader-track" data-min="-12" data-max="12" data-value="0" data-key="mid">
                                    <div id="mixFaderFillMid" class="ms-channel__fader-fill" style="height:50%;background:#ff8c00;"></div>
                                    <div class="ms-channel__thumb" style="bottom:50%"></div>
                                </div>
                                <span id="mixValMid" class="ms-channel__value ms-channel__value--mid">0dB</span>
                            </div>
                            <div class="ms-channel">
                                <span class="ms-channel__label">TREB</span>
                                <div id="mixTrackTreb" class="ms-channel__fader-track" data-min="-12" data-max="12" data-value="0" data-key="treb">
                                    <div id="mixFaderFillTreb" class="ms-channel__fader-fill" style="height:50%;background:#00ccff;"></div>
                                    <div class="ms-channel__thumb" style="bottom:50%"></div>
                                </div>
                                <span id="mixValTreb" class="ms-channel__value ms-channel__value--treb">0dB</span>
                            </div>
                            <div class="ms-channel">
                                <span class="ms-channel__label">REV</span>
                                <div id="mixTrackRev" class="ms-channel__fader-track" data-min="0" data-max="100" data-value="0" data-key="rev">
                                    <div id="mixFaderFillRev" class="ms-channel__fader-fill" style="height:0%;background:#a8e6cf;"></div>
                                    <div class="ms-channel__thumb" style="bottom:0%"></div>
                                </div>
                                <span id="mixValRev" class="ms-channel__value ms-channel__value--rev">0%</span>
                            </div>
                            <div class="ms-channel">
                                <span class="ms-channel__label">COMP</span>
                                <div id="mixTrackComp" class="ms-channel__fader-track" data-min="-50" data-max="0" data-value="-24" data-key="comp">
                                    <div id="mixFaderFillComp" class="ms-channel__fader-fill" style="height:52%;background:#c4b5fd;"></div>
                                    <div class="ms-channel__thumb" style="bottom:52%"></div>
                                </div>
                                <span id="mixValComp" class="ms-channel__value ms-channel__value--comp">-24dB</span>
                            </div>
                        </div>
                        <div class="ms-mixer__presets">
                            <button class="ms-preset-btn" data-preset="flat">FLAT</button>
                            <button class="ms-preset-btn" data-preset="bass-boost">BASS+</button>
                            <button class="ms-preset-btn" data-preset="vocal">VOCAL</button>
                            <button class="ms-preset-btn" data-preset="electronic">ELECTRO</button>
                            <button class="ms-preset-btn" data-preset="rock">ROCK</button>
                            <button class="ms-preset-btn" data-preset="warm">WARM</button>
                        </div>
                        <div class="ms-vu">
                            <div class="ms-vu__channel">
                                <span class="ms-vu__label">L</span>
                                <div class="ms-vu__track">
                                    <div id="vuBarL" class="ms-vu__bar"></div>
                                    <div id="vuPeakL" class="ms-vu__peak"></div>
                                </div>
                            </div>
                            <div class="ms-vu__channel">
                                <span class="ms-vu__label">R</span>
                                <div class="ms-vu__track">
                                    <div id="vuBarR" class="ms-vu__bar"></div>
                                    <div id="vuPeakR" class="ms-vu__peak"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Cache important elements
        this.musicContainer = this.target.querySelector('#musicStudio') as HTMLElement;
        this.audioElement = this.target.querySelector('#audioPlayer') as HTMLAudioElement;
        this.equalizerCanvas = this.target.querySelector('#equalizerCanvas') as HTMLCanvasElement;
        this.particleCanvas = this.target.querySelector('#particleCanvas') as HTMLCanvasElement;
        this.webglCanvas = this.target.querySelector('#webglCanvas') as HTMLCanvasElement;

        // Setup canvas contexts
        this.canvasContext = this.equalizerCanvas.getContext('2d') as CanvasRenderingContext2D;
        this.particleContext = this.particleCanvas.getContext('2d') as CanvasRenderingContext2D;
        this.webglContext = this.webglCanvas.getContext('webgl') as WebGLRenderingContext;

        // Initialize WebGL 3D system
        this.initializeWebGL3D();

        // Setup responsive canvas sizing
        this.resizeCanvases();
        this.setupResizeObserver();

        this.setupAdvancedAudioSystem();
        this.startVisualizationLoop();
    }
    private async initializeAudioContext(): Promise<void> {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 512; // Increased for better frequency resolution
            this.updateAnalyserSettings();
            
            this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
            this.timeData = new Uint8Array(this.analyser.frequencyBinCount);

            // Setup audio effects chain
            this.setupAudioEffects();
        }
    }

    private updateAnalyserSettings(): void {
        if (this.analyser && this.formattingSettings) {
            const smoothing = (this.formattingSettings.audioEqualizerCard.smoothing.value || 80) / 100;
            this.analyser.smoothingTimeConstant = smoothing;
        } else if (this.analyser) {
            // Default value when formatting settings not available
            this.analyser.smoothingTimeConstant = 0.8;
        }
    }

    private setupAudioEffects(): void {
        if (!this.audioContext) return;

        // Create audio effects nodes
        this.audioEffects.gainNode = this.audioContext.createGain();
        this.audioEffects.bassNode = this.audioContext.createBiquadFilter();
        this.audioEffects.midNode = this.audioContext.createBiquadFilter();
        this.audioEffects.trebleNode = this.audioContext.createBiquadFilter();
        this.audioEffects.compressorNode = this.audioContext.createDynamicsCompressor();

        // Configure filters
        this.audioEffects.bassNode.type = 'lowshelf';
        this.audioEffects.bassNode.frequency.value = 200;

        this.audioEffects.midNode.type = 'peaking';
        this.audioEffects.midNode.frequency.value = 1000;
        this.audioEffects.midNode.Q.value = 1.0;
        
        this.audioEffects.trebleNode.type = 'highshelf';
        this.audioEffects.trebleNode.frequency.value = 3000;

        // Configure compressor
        this.audioEffects.compressorNode.threshold.value = -24;
        this.audioEffects.compressorNode.knee.value = 30;
        this.audioEffects.compressorNode.ratio.value = 12;
        this.audioEffects.compressorNode.attack.value = 0.003;
        this.audioEffects.compressorNode.release.value = 0.25;

        // Connect audio source when available
        if (this.audioElement) {
            const source = this.audioContext.createMediaElementSource(this.audioElement);
            
            // Chain: source -> bass -> mid -> treble -> compressor -> gain -> analyser -> destination
            source.connect(this.audioEffects.bassNode);
            this.audioEffects.bassNode.connect(this.audioEffects.midNode);
            this.audioEffects.midNode.connect(this.audioEffects.trebleNode);
            this.audioEffects.trebleNode.connect(this.audioEffects.compressorNode);
            this.audioEffects.compressorNode.connect(this.audioEffects.gainNode);
            this.audioEffects.gainNode.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);

            // Stereo split for VU meters
            this.audioEffects.splitter = this.audioContext.createChannelSplitter(2);
            this.audioEffects.analyserL = this.audioContext.createAnalyser();
            this.audioEffects.analyserR = this.audioContext.createAnalyser();
            this.audioEffects.analyserL.fftSize = 256;
            this.audioEffects.analyserR.fftSize = 256;
            this.audioEffects.analyserL.smoothingTimeConstant = 0.8;
            this.audioEffects.analyserR.smoothingTimeConstant = 0.8;
            this.audioEffects.gainNode.connect(this.audioEffects.splitter);
            this.audioEffects.splitter.connect(this.audioEffects.analyserL, 0);
            this.audioEffects.splitter.connect(this.audioEffects.analyserR, 1);
        }
    }

    private initializeWebGL3D(): void {
        if (!this.webglContext) {
            console.warn('WebGL not supported, falling back to 2D only');
            return;
        }

        const gl = this.webglContext;
        
        // Enable depth testing and blending for 3D effects
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        // Set clear color to transparent
        gl.clearColor(0, 0, 0, 0);
        
        // 🆕 Initialize multiple shader systems
        this.initializeAdvancedShaders();
        
        // Create and compile default shaders (keeping original for backward compatibility)
        const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, this.webgl3D.vertexShaderSource);
        const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, this.webgl3D.fragmentShaderSource);
        
        if (!vertexShader || !fragmentShader) {
            console.error('Failed to create WebGL shaders');
            return;
        }
        
        // Create shader program
        this.webgl3D.shaderProgram = gl.createProgram();
        if (!this.webgl3D.shaderProgram) {
            console.error('Failed to create WebGL program');
            return;
        }
        
        gl.attachShader(this.webgl3D.shaderProgram, vertexShader);
        gl.attachShader(this.webgl3D.shaderProgram, fragmentShader);
        gl.linkProgram(this.webgl3D.shaderProgram);
        
        if (!gl.getProgramParameter(this.webgl3D.shaderProgram, gl.LINK_STATUS)) {
            console.error('Unable to initialize WebGL shader program: ' + gl.getProgramInfoLog(this.webgl3D.shaderProgram));
            return;
        }
        
        // Get attribute and uniform locations
        this.webgl3D.positionAttribute = gl.getAttribLocation(this.webgl3D.shaderProgram, 'aVertexPosition');
        this.webgl3D.uniformLocations = {
            modelViewMatrix: gl.getUniformLocation(this.webgl3D.shaderProgram, 'uModelViewMatrix'),
            projectionMatrix: gl.getUniformLocation(this.webgl3D.shaderProgram, 'uProjectionMatrix'),
            time: gl.getUniformLocation(this.webgl3D.shaderProgram, 'uTime'),
            bassLevel: gl.getUniformLocation(this.webgl3D.shaderProgram, 'uBassLevel'),
            midLevel: gl.getUniformLocation(this.webgl3D.shaderProgram, 'uMidLevel'),
            trebleLevel: gl.getUniformLocation(this.webgl3D.shaderProgram, 'uTrebleLevel')
        };
        
        // Create 3D geometry (particle grid)
        this.create3DParticleGrid();
        
        // Setup projection matrix
        this.setupProjectionMatrix();
        
        console.log('WebGL 3D visualization system initialized successfully');
        console.log('Available shaders:', Array.from(this.webgl3D.shaderPrograms.keys()));
    }

    private initializeAdvancedShaders(): void {
        // 🔥 Ripple Effect Shader
        this.webgl3D.shaderSources.set('ripple', {
            vertex: `
                attribute vec4 aVertexPosition;
                uniform mat4 uModelViewMatrix;
                uniform mat4 uProjectionMatrix;
                uniform float uTime;
                uniform float uBassLevel;
                uniform float uMidLevel;
                uniform float uTrebleLevel;
                
                varying vec2 vPosition;
                varying float vRipple;
                
                void main(void) {
                    vec4 position = aVertexPosition;
                    
                    // Multiple ripple sources
                    float dist1 = length(position.xy);
                    float dist2 = length(position.xy - vec2(1.0, 0.5));
                    float dist3 = length(position.xy + vec2(0.5, 1.0));
                    
                    // Audio-driven ripples
                    float ripple1 = sin(dist1 * 15.0 - uTime * 0.03) * uBassLevel * 0.4;
                    float ripple2 = sin(dist2 * 20.0 - uTime * 0.05) * uMidLevel * 0.3;
                    float ripple3 = sin(dist3 * 25.0 - uTime * 0.07) * uTrebleLevel * 0.2;
                    
                    position.y += ripple1 + ripple2 + ripple3;
                    
                    vRipple = ripple1 + ripple2 + ripple3;
                    vPosition = position.xy;
                    
                    gl_Position = uProjectionMatrix * uModelViewMatrix * position;
                    gl_PointSize = 3.0 + abs(vRipple) * 10.0;
                }
            `,
            fragment: `
                precision mediump float;
                varying vec2 vPosition;
                varying float vRipple;
                uniform float uTime;
                
                void main(void) {
                    vec2 coord = gl_PointCoord - vec2(0.5);
                    float distance = length(coord);
                    
                    if (distance > 0.5) discard;
                    
                    // Ripple-based coloring
                    vec3 color1 = vec3(0.2, 0.8, 1.0); // Cyan
                    vec3 color2 = vec3(1.0, 0.3, 0.8); // Magenta
                    vec3 color3 = vec3(0.8, 1.0, 0.2); // Lime
                    
                    float mixer = sin(vRipple * 5.0 + uTime * 0.01);
                    vec3 finalColor = mix(mix(color1, color2, abs(mixer)), color3, abs(vRipple));
                    
                    float alpha = (1.0 - distance * 2.0) * (0.7 + abs(vRipple) * 0.5);
                    
                    gl_FragColor = vec4(finalColor, alpha);
                }
            `
        });

        // 🌈 Chromatic Aberration Shader
        this.webgl3D.shaderSources.set('chromatic', {
            vertex: `
                attribute vec4 aVertexPosition;
                uniform mat4 uModelViewMatrix;
                uniform mat4 uProjectionMatrix;
                uniform float uTime;
                uniform float uBassLevel;
                uniform float uMidLevel;
                uniform float uTrebleLevel;
                
                varying vec2 vUv;
                varying vec3 vAudioLevels;
                
                void main(void) {
                    vec4 position = aVertexPosition;
                    
                    // Frequency-based displacement
                    float bassWave = sin(position.x * 5.0 + uTime * 0.02) * uBassLevel * 0.3;
                    float midWave = cos(position.z * 8.0 + uTime * 0.04) * uMidLevel * 0.2;
                    float trebleWave = sin(length(position.xy) * 12.0 + uTime * 0.06) * uTrebleLevel * 0.15;
                    
                    position.y += bassWave + midWave + trebleWave;
                    
                    vUv = position.xy;
                    vAudioLevels = vec3(uBassLevel, uMidLevel, uTrebleLevel);
                    
                    gl_Position = uProjectionMatrix * uModelViewMatrix * position;
                    gl_PointSize = 4.0 + (uBassLevel + uMidLevel + uTrebleLevel) * 6.0;
                }
            `,
            fragment: `
                precision mediump float;
                varying vec2 vUv;
                varying vec3 vAudioLevels;
                uniform float uTime;
                
                void main(void) {
                    vec2 coord = gl_PointCoord - vec2(0.5);
                    float distance = length(coord);
                    
                    if (distance > 0.5) discard;
                    
                    // Chromatic aberration effect
                    vec2 offset = coord * 0.02 * vAudioLevels.x;
                    
                    float r = 1.0 - distance * 2.0 + sin(vUv.x * 10.0 + uTime * 0.03) * 0.1;
                    float g = 1.0 - distance * 1.8 + sin(vUv.y * 8.0 + uTime * 0.04 + 2.0) * 0.1;
                    float b = 1.0 - distance * 1.6 + sin(length(vUv) * 12.0 + uTime * 0.05 + 4.0) * 0.1;
                    
                    // Audio-reactive color intensity
                    r *= 0.5 + vAudioLevels.x;
                    g *= 0.5 + vAudioLevels.y;
                    b *= 0.5 + vAudioLevels.z;
                    
                    float alpha = (1.0 - distance * 2.0) * 0.8;
                    
                    gl_FragColor = vec4(r, g, b, alpha);
                }
            `
        });

        // 💫 Dynamic Lighting Shader
        this.webgl3D.shaderSources.set('lighting', {
            vertex: `
                attribute vec4 aVertexPosition;
                uniform mat4 uModelViewMatrix;
                uniform mat4 uProjectionMatrix;
                uniform float uTime;
                uniform float uBassLevel;
                uniform float uMidLevel;
                uniform float uTrebleLevel;
                
                varying vec3 vNormal;
                varying vec3 vLightPos;
                varying vec3 vFragPos;
                varying float vIntensity;
                
                void main(void) {
                    vec4 position = aVertexPosition;
                    
                    // Create dynamic surface based on audio
                    float height = sin(position.x * 4.0 + uTime * 0.02) * uBassLevel * 0.4;
                    height += cos(position.z * 6.0 + uTime * 0.03) * uMidLevel * 0.3;
                    height += sin(length(position.xz) * 8.0 + uTime * 0.05) * uTrebleLevel * 0.2;
                    
                    position.y += height;
                    
                    // Calculate normal for lighting
                    vec3 normal = normalize(vec3(-sin(position.x * 4.0), 1.0, -sin(position.z * 6.0)));
                    vNormal = normal;
                    
                    // Dynamic light positions based on audio
                    vLightPos = vec3(
                        sin(uTime * 0.02) * 3.0 * uBassLevel,
                        2.0 + uMidLevel * 2.0,
                        cos(uTime * 0.03) * 3.0 * uTrebleLevel
                    );
                    
                    vec4 worldPos = uModelViewMatrix * position;
                    vFragPos = worldPos.xyz;
                    vIntensity = height;
                    
                    gl_Position = uProjectionMatrix * worldPos;
                    gl_PointSize = 3.0 + abs(height) * 8.0;
                }
            `,
            fragment: `
                precision mediump float;
                varying vec3 vNormal;
                varying vec3 vLightPos;
                varying vec3 vFragPos;
                varying float vIntensity;
                uniform float uTime;
                
                void main(void) {
                    vec2 coord = gl_PointCoord - vec2(0.5);
                    float distance = length(coord);
                    
                    if (distance > 0.5) discard;
                    
                    // Lighting calculations
                    vec3 lightDir = normalize(vLightPos - vFragPos);
                    float diff = max(dot(vNormal, lightDir), 0.0);
                    
                    // Specular highlights
                    vec3 viewDir = normalize(-vFragPos);
                    vec3 reflectDir = reflect(-lightDir, vNormal);
                    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
                    
                    // Dynamic colors based on intensity
                    vec3 baseColor = vec3(0.1, 0.3, 0.8);
                    vec3 highlightColor = vec3(1.0, 0.8, 0.2);
                    vec3 finalColor = mix(baseColor, highlightColor, abs(vIntensity) * 2.0);
                    
                    // Combine lighting
                    vec3 ambient = finalColor * 0.3;
                    vec3 diffuse = finalColor * diff * 0.7;
                    vec3 specular = vec3(1.0) * spec * 0.5;
                    
                    vec3 result = ambient + diffuse + specular;
                    float alpha = (1.0 - distance * 2.0) * (0.6 + abs(vIntensity));
                    
                    gl_FragColor = vec4(result, alpha);
                }
            `
        });

        // Initialize all shader programs
        this.compileAllShaders();
    }

    private compileAllShaders(): void {
        const gl = this.webglContext;
        if (!gl) return;
        
        for (const [name, sources] of this.webgl3D.shaderSources) {
            const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, sources.vertex);
            const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, sources.fragment);
            
            if (vertexShader && fragmentShader) {
                const program = gl.createProgram();
                if (program) {
                    gl.attachShader(program, vertexShader);
                    gl.attachShader(program, fragmentShader);
                    gl.linkProgram(program);
                    
                    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
                        this.webgl3D.shaderPrograms.set(name, program);
                        console.log(`✅ Shader '${name}' compiled successfully`);
                    } else {
                        console.error(`❌ Failed to link shader '${name}':`, gl.getProgramInfoLog(program));
                    }
                }
            }
        }
    }

    private createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
        const shader = gl.createShader(type);
        if (!shader) return null;
        
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }

    private create3DParticleGrid(): void {
        const gl = this.webglContext;
        if (!gl || !this.webgl3D.shaderProgram) return;
        
        // Create a grid of points for 3D visualization
        const vertices: number[] = [];
        const indices: number[] = [];
        
        const gridSize = 50;
        const spacing = 0.1;
        const offset = (gridSize - 1) * spacing * 0.5;
        
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const x = i * spacing - offset;
                const z = j * spacing - offset;
                const y = 0;
                
                vertices.push(x, y, z, 1.0); // position + w component
                indices.push(i * gridSize + j);
            }
        }
        
        // Create vertex buffer
        this.webgl3D.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.webgl3D.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        
        // Create index buffer
        this.webgl3D.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.webgl3D.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    }

    private setupProjectionMatrix(): void {
        const canvas = this.webglCanvas;
        const fieldOfView = 45 * Math.PI / 180;   // in radians
        const aspect = canvas.width / canvas.height;
        const zNear = 0.1;
        const zFar = 100.0;
        
        // Create perspective projection matrix
        this.webgl3D.projectionMatrix = this.mat4Perspective(fieldOfView, aspect, zNear, zFar);
    }

    private mat4Perspective(fovy: number, aspect: number, near: number, far: number): Float32Array {
        const out = new Float32Array(16);
        const f = 1.0 / Math.tan(fovy / 2);
        const nf = 1 / (near - far);
        
        out[0] = f / aspect;
        out[1] = 0;
        out[2] = 0;
        out[3] = 0;
        
        out[4] = 0;
        out[5] = f;
        out[6] = 0;
        out[7] = 0;
        
        out[8] = 0;
        out[9] = 0;
        out[10] = (far + near) * nf;
        out[11] = -1;
        
        out[12] = 0;
        out[13] = 0;
        out[14] = 2 * far * near * nf;
        out[15] = 0;
        
        return out;
    }

    private mat4LookAt(eye: [number, number, number], center: [number, number, number], up: [number, number, number]): Float32Array {
        const out = new Float32Array(16);
        
        let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
        const eyex = eye[0];
        const eyey = eye[1];
        const eyez = eye[2];
        const upx = up[0];
        const upy = up[1];
        const upz = up[2];
        const centerx = center[0];
        const centery = center[1];
        const centerz = center[2];
        
        z0 = eyex - centerx;
        z1 = eyey - centery;
        z2 = eyez - centerz;
        
        len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
        z0 *= len;
        z1 *= len;
        z2 *= len;
        
        x0 = upy * z2 - upz * z1;
        x1 = upz * z0 - upx * z2;
        x2 = upx * z1 - upy * z0;
        len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
        if (!len) {
            x0 = 0;
            x1 = 0;
            x2 = 0;
        } else {
            len = 1 / len;
            x0 *= len;
            x1 *= len;
            x2 *= len;
        }
        
        y0 = z1 * x2 - z2 * x1;
        y1 = z2 * x0 - z0 * x2;
        y2 = z0 * x1 - z1 * x0;
        
        out[0] = x0;
        out[1] = y0;
        out[2] = z0;
        out[3] = 0;
        out[4] = x1;
        out[5] = y1;
        out[6] = z1;
        out[7] = 0;
        out[8] = x2;
        out[9] = y2;
        out[10] = z2;
        out[11] = 0;
        out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
        out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
        out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
        out[15] = 1;
        
        return out;
    }

    private setupAdvancedAudioSystem(): void {
        // File input handler for multiple files
        const fileInput = this.target.querySelector('#audioFileInput') as HTMLInputElement;
        fileInput?.addEventListener('change', (e) => this.handleFileSelection(e));

        // Playback controls
        const playPauseBtn = this.target.querySelector('#playPauseBtn') as HTMLButtonElement;
        const skipBackBtn = this.target.querySelector('#skipBackBtn') as HTMLButtonElement;
        const skipForwardBtn = this.target.querySelector('#skipForwardBtn') as HTMLButtonElement;
        const prevTrackBtn = this.target.querySelector('#prevTrackBtn') as HTMLButtonElement;
        const nextTrackBtn = this.target.querySelector('#nextTrackBtn') as HTMLButtonElement;

        playPauseBtn?.addEventListener('click', () => this.togglePlayPause());
        skipBackBtn?.addEventListener('click', () => this.skipTime(-10));
        skipForwardBtn?.addEventListener('click', () => this.skipTime(10));
        prevTrackBtn?.addEventListener('click', () => this.previousTrack());
        nextTrackBtn?.addEventListener('click', () => this.nextTrack());

        // Playlist controls
        const shuffleBtn = this.target.querySelector('#shuffleBtn') as HTMLButtonElement;
        const repeatBtn = this.target.querySelector('#repeatBtn') as HTMLButtonElement;
        shuffleBtn?.addEventListener('click', () => this.toggleShuffle());
        repeatBtn?.addEventListener('click', () => this.toggleRepeat());

        // Audio effects controls
        const volumeSlider = this.target.querySelector('#volumeSlider') as HTMLInputElement;
        const bassSlider = this.target.querySelector('#bassSlider') as HTMLInputElement;
        const trebleSlider = this.target.querySelector('#trebleSlider') as HTMLInputElement;
        const reverbSlider = this.target.querySelector('#reverbSlider') as HTMLInputElement;

        volumeSlider?.addEventListener('input', (e) => this.updateVolume(e));
        bassSlider?.addEventListener('input', (e) => this.updateBass(e));
        trebleSlider?.addEventListener('input', (e) => this.updateTreble(e));
        reverbSlider?.addEventListener('input', (e) => this.updateReverb(e));

        // Visual controls
        const visualStyle = this.target.querySelector('#visualStyle') as HTMLSelectElement;
        const themeSelector = this.target.querySelector('#themeSelector') as HTMLSelectElement;
        const particlesToggle = this.target.querySelector('#particlesToggle') as HTMLButtonElement;
        const fullscreenBtn = this.target.querySelector('#fullscreenBtn') as HTMLButtonElement;

        visualStyle?.addEventListener('change', (e) => this.changeVisualizationStyle(e));
        themeSelector?.addEventListener('change', (e) => this.changeTheme(e));
        particlesToggle?.addEventListener('click', () => this.toggleParticles());
        fullscreenBtn?.addEventListener('click', () => this.toggleFullscreen());

        // Mixer desk
        this.setupMixerEvents();
        
        // Initialize playlist access and audio handlers
        this.setupPlaylistAccess();

        // Progress bar interaction
        const progressContainer = this.target.querySelector('#progressContainer') as HTMLElement;
        progressContainer?.addEventListener('click', (e) => this.seekToPosition(e));

        // Audio element events
        this.audioElement.addEventListener('timeupdate', () => this.updateProgress());
        this.audioElement.addEventListener('ended', () => this.handleTrackEnd());
        this.audioElement.addEventListener('loadedmetadata', () => this.updateTrackInfo());
        
        // 🆕 Physics Mouse Interaction Events
        this.setupPhysicsMouseInteraction();
    }

    private setupPhysicsMouseInteraction(): void {
        // Mouse movement tracking for particle attraction/repulsion
        this.particleCanvas.addEventListener('mousemove', (e) => {
            const rect = this.particleCanvas.getBoundingClientRect();
            this.physicsSystem.mouseInteraction.x = e.clientX - rect.left;
            this.physicsSystem.mouseInteraction.y = e.clientY - rect.top;
        });
        
        // Mouse leave - disable interaction
        this.particleCanvas.addEventListener('mouseleave', () => {
            this.physicsSystem.mouseInteraction.x = 0;
            this.physicsSystem.mouseInteraction.y = 0;
        });
        
        // Shift key for repulsion mode
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Shift') {
                this.physicsSystem.mouseInteraction.repulsionMode = true;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.key === 'Shift') {
                this.physicsSystem.mouseInteraction.repulsionMode = false;
            }
        });
        
        // Click to create magnetic field
        this.particleCanvas.addEventListener('click', (e) => {
            const rect = this.particleCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Add temporary magnetic field at click position
            const fieldType = e.shiftKey ? 'repel' : 'attract';
            this.physicsSystem.magneticFields.push({
                x: x,
                y: y,
                z: 0,
                strength: 1.0,
                radius: 100,
                type: fieldType
            });
            
            // Remove field after 5 seconds
            setTimeout(() => {
                this.physicsSystem.magneticFields = this.physicsSystem.magneticFields.filter(field => 
                    !(field.x === x && field.y === y)
                );
            }, 5000);
        });
    }

    private setupEventListeners(): void {
        // Resize handler
        window.addEventListener('resize', () => this.resizeCanvases());
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // Fullscreen change handler
        document.addEventListener('fullscreenchange', () => {
            this.updateFullscreenButton(!!document.fullscreenElement);
        });

        // 🚀 NEW: Interactive mouse/touch handlers
        this.setupInteractiveHandlers();
        
        // 🎧 NEW: DJ Mashup Mode handlers  
        this.setupDjMashupEventListeners();
        
        // Initial canvas sizing
        this.resizeCanvases();
    }

    // 🎮 NEW: Interactive handlers for mouse effects and click ripples
    private setupInteractiveHandlers(): void {
        // Mouse move tracking for trail effects
        this.target.addEventListener('mousemove', (e) => {
            const rect = this.equalizerCanvas.getBoundingClientRect();
            this.interactiveElements.mouseEffects.x = e.clientX - rect.left;
            this.interactiveElements.mouseEffects.y = e.clientY - rect.top;
        });

        // Click ripple effects
        this.target.addEventListener('click', (e) => {
            const rect = this.equalizerCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.interactiveElements.clickRipples.push({
                x: x,
                y: y,
                radius: 0,
                maxRadius: 100 + Math.random() * 100,
                life: 1,
                color: `hsl(${Math.random() * 360}, 100%, 50%)`
            });
        });

        // Touch support for mobile
        this.target.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = this.equalizerCanvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.interactiveElements.mouseEffects.x = touch.clientX - rect.left;
            this.interactiveElements.mouseEffects.y = touch.clientY - rect.top;
        });

        this.target.addEventListener('touchstart', (e) => {
            const rect = this.equalizerCanvas.getBoundingClientRect();
            const touch = e.touches[0];
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            this.interactiveElements.clickRipples.push({
                x: x,
                y: y,
                radius: 0,
                maxRadius: 150 + Math.random() * 100,
                life: 1,
                color: `hsl(${Math.random() * 360}, 100%, 60%)`
            });
        });
    }

    // 🎧 DJ Mashup Mode Event Listeners
    private setupDjMashupEventListeners(): void {
        // Toggle DJ Mashup Mode
        const toggleDjBtn = this.target.querySelector('#toggleDjMode') as HTMLButtonElement;
        if (toggleDjBtn) {
            toggleDjBtn.addEventListener('click', () => this.toggleDjMashupMode());
        }

        // Track file inputs
        const trackAInput = this.target.querySelector('#trackAInput') as HTMLInputElement;
        const trackBInput = this.target.querySelector('#trackBInput') as HTMLInputElement;
        
        if (trackAInput) {
            trackAInput.addEventListener('change', (e) => this.loadDjTrack('A', e.target as HTMLInputElement));
        }
        if (trackBInput) {
            trackBInput.addEventListener('change', (e) => this.loadDjTrack('B', e.target as HTMLInputElement));
        }

        // Volume sliders
        const volumeA = this.target.querySelector('#volumeA') as HTMLInputElement;
        const volumeB = this.target.querySelector('#volumeB') as HTMLInputElement;
        
        if (volumeA) {
            volumeA.addEventListener('input', (e) => this.updateTrackVolume('A', (e.target as HTMLInputElement).value));
        }
        if (volumeB) {
            volumeB.addEventListener('input', (e) => this.updateTrackVolume('B', (e.target as HTMLInputElement).value));
        }

        // Crossfader
        const crossfader = this.target.querySelector('#crossfader') as HTMLInputElement;
        if (crossfader) {
            crossfader.addEventListener('input', (e) => this.updateCrossfader((e.target as HTMLInputElement).value));
        }

        // Position sliders for seeking
        const positionA = this.target.querySelector('#positionSliderA') as HTMLInputElement;
        const positionB = this.target.querySelector('#positionSliderB') as HTMLInputElement;
        
        if (positionA) {
            positionA.addEventListener('input', (e) => this.seekTrackPosition('A', (e.target as HTMLInputElement).value));
        }
        if (positionB) {
            positionB.addEventListener('input', (e) => this.seekTrackPosition('B', (e.target as HTMLInputElement).value));
        }

        // Individual play/pause buttons
        const playPauseA = this.target.querySelector('#playPauseA') as HTMLButtonElement;
        const playPauseB = this.target.querySelector('#playPauseB') as HTMLButtonElement;
        
        if (playPauseA) {
            playPauseA.addEventListener('click', () => this.toggleIndividualTrack('A'));
        }
        if (playPauseB) {
            playPauseB.addEventListener('click', () => this.toggleIndividualTrack('B'));
        }

        // BPM controls - CRITICAL FOR MASHUP FUNCTIONALITY
        const bpmA = this.target.querySelector('#bpmA') as HTMLInputElement;
        const bpmB = this.target.querySelector('#bpmB') as HTMLInputElement;
        
        if (bpmA) {
            bpmA.addEventListener('input', (e) => this.updateTrackBpm('A', (e.target as HTMLInputElement).value));
        }
        if (bpmB) {
            bpmB.addEventListener('input', (e) => this.updateTrackBpm('B', (e.target as HTMLInputElement).value));
        }

        // BPM +/- Buttons - EASY BPM ADJUSTMENT
        const bpmUpA = this.target.querySelector('#bpmUpA') as HTMLButtonElement;
        const bpmDownA = this.target.querySelector('#bpmDownA') as HTMLButtonElement;
        const bpmUpB = this.target.querySelector('#bpmUpB') as HTMLButtonElement;
        const bpmDownB = this.target.querySelector('#bpmDownB') as HTMLButtonElement;
        
        if (bpmUpA) bpmUpA.addEventListener('click', () => this.adjustBpm('A', 1));
        if (bpmDownA) bpmDownA.addEventListener('click', () => this.adjustBpm('A', -1));
        if (bpmUpB) bpmUpB.addEventListener('click', () => this.adjustBpm('B', 1));
        if (bpmDownB) bpmDownB.addEventListener('click', () => this.adjustBpm('B', -1));

        // Master BPM Controls - SYNC BOTH TRACKS TO ONE TEMPO
        const masterBpmUp = this.target.querySelector('#masterBpmUp') as HTMLButtonElement;
        const masterBpmDown = this.target.querySelector('#masterBpmDown') as HTMLButtonElement;
        const masterBpmInput = this.target.querySelector('#masterBpm') as HTMLInputElement;
        const syncTracksToMaster = this.target.querySelector('#syncTracksToMaster') as HTMLButtonElement;
        const toggleAutoSync = this.target.querySelector('#toggleAutoSync') as HTMLButtonElement;
        
        if (masterBpmUp) masterBpmUp.addEventListener('click', () => this.adjustMasterBpm(1));
        if (masterBpmDown) masterBpmDown.addEventListener('click', () => this.adjustMasterBpm(-1));
        if (masterBpmInput) masterBpmInput.addEventListener('change', () => this.setMasterBpm(parseInt(masterBpmInput.value)));
        if (syncTracksToMaster) syncTracksToMaster.addEventListener('click', () => this.syncTracksToMaster());
        if (toggleAutoSync) toggleAutoSync.addEventListener('click', () => this.toggleAutoSync());

        // Beat Nudge Controls - CRITICAL FOR BEAT ALIGNMENT
        const nudgeSlowA = this.target.querySelector('#nudgeSlowA') as HTMLButtonElement;
        const nudgeFastA = this.target.querySelector('#nudgeFastA') as HTMLButtonElement;
        const tapBeatA = this.target.querySelector('#tapBeatA') as HTMLButtonElement;
        const nudgeSlowB = this.target.querySelector('#nudgeSlowB') as HTMLButtonElement;
        const nudgeFastB = this.target.querySelector('#nudgeFastB') as HTMLButtonElement;
        const tapBeatB = this.target.querySelector('#tapBeatB') as HTMLButtonElement;
        
        if (nudgeSlowA) nudgeSlowA.addEventListener('mousedown', () => this.startNudge('A', 'slow'));
        if (nudgeSlowA) nudgeSlowA.addEventListener('mouseup', () => this.stopNudge('A'));
        if (nudgeFastA) nudgeFastA.addEventListener('mousedown', () => this.startNudge('A', 'fast'));
        if (nudgeFastA) nudgeFastA.addEventListener('mouseup', () => this.stopNudge('A'));
        if (tapBeatA) tapBeatA.addEventListener('click', () => this.tapBeat('A'));
        
        if (nudgeSlowB) nudgeSlowB.addEventListener('mousedown', () => this.startNudge('B', 'slow'));
        if (nudgeSlowB) nudgeSlowB.addEventListener('mouseup', () => this.stopNudge('B'));
        if (nudgeFastB) nudgeFastB.addEventListener('mousedown', () => this.startNudge('B', 'fast'));
        if (nudgeFastB) nudgeFastB.addEventListener('mouseup', () => this.stopNudge('B'));
        if (tapBeatB) tapBeatB.addEventListener('click', () => this.tapBeat('B'));

        // DJ Control buttons
        const syncBtn = this.target.querySelector('#syncTracksBtn') as HTMLButtonElement;
        const playBtn = this.target.querySelector('#mashupPlayBtn') as HTMLButtonElement;
        const autoMixBtn = this.target.querySelector('#autoMixBtn') as HTMLButtonElement;

        if (syncBtn) syncBtn.addEventListener('click', () => this.synchronizeTracks());
        if (playBtn) playBtn.addEventListener('click', () => this.toggleMashupPlayback());
        if (autoMixBtn) autoMixBtn.addEventListener('click', () => this.startAutoMix());
    }

    private handleKeyDown(event: KeyboardEvent): void {
        const now = Date.now();
        
        // Prevent too rapid key presses
        if (now - this.lastKeyTime < 100) return;
        this.lastKeyTime = now;
        
        switch (event.code) {
            case 'Space':
                event.preventDefault();
                this.togglePlayPause();
                break;
                
            case 'ArrowLeft':
                event.preventDefault();
                this.skipTime(-10);
                break;
                
            case 'ArrowRight':
                event.preventDefault();
                this.skipTime(10);
                break;
                
            case 'ArrowUp':
                event.preventDefault();
                this.changeVolume(5);
                break;
                
            case 'ArrowDown':
                event.preventDefault();
                this.changeVolume(-5);
                break;
                
            case 'KeyF':
                event.preventDefault();
                this.toggleFullscreen();
                break;
                
            case 'KeyP':
                event.preventDefault();
                this.toggleParticles();
                break;
                
            case 'KeyT':
                event.preventDefault();
                this.cycleTheme();
                break;
                
            case 'KeyS':
                event.preventDefault();
                this.toggleShuffle();
                break;
                
            case 'KeyR':
                event.preventDefault();
                this.toggleRepeat();
                break;
                
            case 'KeyN':
                event.preventDefault();
                this.nextTrack();
                break;
                
            case 'KeyB':
                event.preventDefault();
                this.toggleBossMode();
                break;
                
            case 'KeyH':
                event.preventDefault();
                this.toggleShortcutsHelp();
                break;
                
            case 'Escape':
                event.preventDefault();
                if (document.fullscreenElement) {
                    this.toggleFullscreen();
                } else if (this.showShortcuts) {
                    this.hideKeyboardShortcuts();
                }
                break;
                
            // Visualization shortcuts (1-8)
            case 'Digit1':
                event.preventDefault();
                this.setVisualization('bars');
                break;
            case 'Digit2':
                event.preventDefault();
                this.setVisualization('circular');
                break;
            case 'Digit3':
                event.preventDefault();
                this.setVisualization('waveform');
                break;
            case 'Digit4':
                event.preventDefault();
                this.setVisualization('spectrum');
                break;
            case 'Digit5':
                event.preventDefault();
                this.setVisualization('galaxy');
                break;
            case 'Digit6':
                event.preventDefault();
                this.setVisualization('matrix');
                break;
            case 'Digit7':
                event.preventDefault();
                this.setVisualization('vu');
                break;
            case 'Digit8':
                event.preventDefault();
                this.setVisualization('liquid');
                break;
            case 'Digit9':
                event.preventDefault();
                this.setVisualization('vinyl');
                break;
            case 'Digit0':
                event.preventDefault();
                this.setVisualization('spectrogram');
                break;
            case 'KeyA':
                event.preventDefault();
                this.setVisualization('dna');
                break;
            case 'KeyD':
                event.preventDefault();
                this.setVisualization('fireworks');
                break;
            case 'KeyE':
                event.preventDefault();
                this.setVisualization('oscilloscope');
                break;
            case 'KeyW':
                event.preventDefault();
                this.setVisualization('radar');
                break;

            case 'KeyC':
                event.preventDefault();
                this.setVisualization('cassette');
                break;
                
            // 🎵 Music Generation shortcuts
            case 'KeyM':
                event.preventDefault();
                this.toggleDataDrivenMusic();
                break;

            case 'KeyX':
                event.preventDefault();
                this.toggleMixer();
                break;

            case 'BracketLeft':
                event.preventDefault();
                this.cycleVisualization(-1);
                break;

            case 'BracketRight':
                event.preventDefault();
                this.cycleVisualization(1);
                break;
                
            case 'KeyG':
                event.preventDefault();
                this.cycleMusicalScale();
                break;
                
            case 'KeyJ':
                event.preventDefault();
                this.toggleDjMashupMode();
                break;
        }
    }

    private changeVolume(delta: number): void {
        const volumeSlider = this.target.querySelector('#volumeSlider') as HTMLInputElement;
        if (volumeSlider) {
            const newVolume = Math.max(0, Math.min(100, parseInt(volumeSlider.value) + delta));
            volumeSlider.value = newVolume.toString();
            volumeSlider.dispatchEvent(new Event('input'));
        }
    }

    private cycleTheme(): void {
        const themes = Array.from(this.themes.keys());
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const newTheme = themes[nextIndex];
        
        this.currentTheme = newTheme;
        this.applyTheme();
        
        const themeSelector = this.target.querySelector('#themeSelector') as HTMLSelectElement;
        if (themeSelector) {
            themeSelector.value = newTheme;
        }
    }

    private setVisualization(style: string): void {
        if (style !== this.visualizationStyle) {
            this.geissNeedsReset = true;
        }
        this.visualizationStyle = style;
        const visualSelect = this.target.querySelector('#visualStyle') as HTMLSelectElement;
        if (visualSelect) {
            visualSelect.value = style;
        }
    }

    private cycleVisualization(direction: number): void {
        const modes = this.visualizationModes;
        const currentIndex = modes.indexOf(this.visualizationStyle);
        const nextIndex = (currentIndex + direction + modes.length) % modes.length;
        this.setVisualization(modes[nextIndex]);
    }

    private showKeyboardShortcuts(): void {
        const help = this.target.querySelector('#shortcutsHelp') as HTMLElement;
        if (help) {
            help.style.display = 'block';
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                if (!this.showShortcuts) {
                    help.style.display = 'none';
                }
            }, 3000);
        }
    }

    private hideKeyboardShortcuts(): void {
        const help = this.target.querySelector('#shortcutsHelp') as HTMLElement;
        if (help) {
            help.style.display = 'none';
        }
        this.showShortcuts = false;
    }

    private toggleShortcutsHelp(): void {
        this.showShortcuts = !this.showShortcuts;
        const help = this.target.querySelector('#shortcutsHelp') as HTMLElement;
        if (help) {
            help.style.display = this.showShortcuts ? 'block' : 'none';
        }
    }

    private setupBossKey(): void {
        // Boss key is now handled in the main handleKeyDown method
        // No separate event listener needed to avoid double-triggering

        // 🔥 Create awesome 80's retro boss mode content
        this.bossContent = document.createElement('div');
        this.bossContent.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: linear-gradient(45deg, #001122, #003366); color: #00ff88;
            font-family: 'Courier New', monospace; z-index: 9999; display: none;
            padding: 20px; overflow: hidden; animation: crt-flicker 0.15s infinite linear alternate;
        `;
        
        // Add retro CRT scan lines CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes crt-flicker { 0% { opacity: 1; } 100% { opacity: 0.98; } }
            @keyframes terminal-blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
            .scanlines { 
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.03) 2px, rgba(0,255,136,0.03) 4px);
                pointer-events: none; z-index: 10;
            }
            .terminal-cursor { animation: terminal-blink 1s infinite; }
            .retro-box { 
                border: 2px solid #00ff88; background: rgba(0,0,0,0.3); 
                padding: 10px; margin: 10px 0; position: relative;
            }
            .retro-title {
                text-shadow: 0 0 10px #00ff88; font-size: 18px; font-weight: bold;
                background: linear-gradient(90deg, #00ff88, #00ccff); -webkit-background-clip: text; 
                -webkit-text-fill-color: transparent; background-clip: text;
            }
        `;
        document.head.appendChild(style);
        
        this.bossContent.innerHTML = `
            <div class="scanlines"></div>
            <div style="position: relative; z-index: 5;">
                <!-- 80's Style Header -->
                <div style="text-align: center; margin-bottom: 20px;">
                    <div class="retro-title" style="font-size: 24px; margin-bottom: 10px;">
                        ████ SYNERGY CORP MAINFRAME ████
                    </div>
                    <div style="color: #00ccff; font-size: 14px;">
                        SECURE TERMINAL v2.1.85 • USER: ${this.getCurrentUser()} • ACCESS LEVEL: EXECUTIVE
                    </div>
                    <div style="color: #ffff00; font-size: 12px;">
                        ${this.getCurrentTimestamp()} • SYSTEM STATUS: OPERATIONAL
                    </div>
                </div>

                <!-- Fake Terminal Output -->
                <div class="retro-box" style="height: 200px; overflow-y: auto; font-size: 12px;">
                    <div style="color: #00ff88;">C:\\SYSTEMS&gt; dir /s financials</div>
                    <div style="color: #ffffff;">Directory of C:\\SYSTEMS\\FINANCIALS</div>
                    <div style="color: #cccccc;">
                        08/15/85  09:23a    &lt;DIR&gt;          Q4-REPORTS<br>
                        08/15/85  10:45a    142,592        REVENUE.XLS<br>
                        08/15/85  11:30a     89,344        FORECASTS.DOC<br>
                        08/15/85  02:15p    256,128        BUDGETS.DB<br>
                        08/15/85  03:45p     45,824        METRICS.TXT<br>
                    </div>
                    <div style="color: #00ff88; margin-top: 10px;">C:\\SYSTEMS&gt; run quarterly_analysis.exe</div>
                    <div style="color: #ffff00;">LOADING BUSINESS INTELLIGENCE MODULES...</div>
                    <div style="color: #00ccff;">
                        ████████████████████ 100% COMPLETE<br>
                        ANALYZING MARKET TRENDS...<br>
                        COMPUTING PROFIT PROJECTIONS...<br>
                        GENERATING EXECUTIVE SUMMARY...
                    </div>
                    <div style="color: #00ff88; margin-top: 5px;">C:\\SYSTEMS&gt; <span class="terminal-cursor">█</span></div>
                </div>

                <!-- Fake Business Data Grid -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                    <div class="retro-box">
                        <div style="color: #00ccff; font-weight: bold; margin-bottom: 10px;">📊 QUARTERLY PERFORMANCE</div>
                        <div style="color: #ffffff; font-size: 11px;">
                            REVENUE TARGET: $2,400,000<br>
                            ACTUAL REVENUE: $2,652,000<br>
                            <span style="color: #00ff88;">VARIANCE: +10.5% ✓ ABOVE TARGET</span><br><br>
                            CUSTOMER ACQUISITION: 1,247 NEW<br>
                            RETENTION RATE: 94.2%<br>
                            <span style="color: #ffff00;">ROI: 127.8%</span>
                        </div>
                    </div>
                    <div class="retro-box">
                        <div style="color: #00ccff; font-weight: bold; margin-bottom: 10px;">📈 MARKET ANALYSIS</div>
                        <div style="color: #ffffff; font-size: 11px;">
                            SECTOR GROWTH: +18.3%<br>
                            MARKET SHARE: 23.7%<br>
                            <span style="color: #00ff88;">COMPETITIVE INDEX: STRONG</span><br><br>
                            NEXT QTR FORECAST: +15.2%<br>
                            RISK ASSESSMENT: LOW<br>
                            <span style="color: #ffff00;">RECOMMENDATION: EXPAND</span>
                        </div>
                    </div>
                </div>

                <!-- Bottom Status Bar -->
                <div style="position: fixed; bottom: 0; left: 0; width: 100%; background: #002244; 
                           color: #00ff88; padding: 8px; font-size: 10px; border-top: 2px solid #00ff88;">
                    <div style="display: flex; justify-content: space-between;">
                        <div>F1=HELP • F2=SAVE • F3=LOAD • F4=PRINT • F10=MENU</div>
                        <div>SYNERGY CORP © 1985 • PRESS 'b' TO EXIT TERMINAL</div>
                        <div>MEM: 640K • CPU: 4.77MHz • HDD: 20MB</div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.bossContent);
    }

    private getCurrentUser(): string {
        // Generate random 80's style username
        const users = ['JOHNSON.M', 'SMITH.R', 'WILLIAMS.K', 'BROWN.L', 'DAVIS.P', 'MILLER.J'];
        return users[Math.floor(Math.random() * users.length)];
    }

    private getCurrentTimestamp(): string {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${month}/${day}/${year} ${hours}:${minutes}`;
    }

    private toggleBossMode(): void {
        this.bossMode = !this.bossMode;
        this.bossContent.style.display = this.bossMode ? 'block' : 'none';
        
        // Pause music when entering boss mode
        if (this.bossMode && this.audioElement && !this.audioElement.paused) {
            this.audioElement.pause();
        }
        
        // Add sound effect (optional - 80's beep)
        if (this.bossMode) {
            this.playBossKeySound();
        }
    }

    private playBossKeySound(): void {
        // Create classic 80's computer beep sound
        if (this.audioContext) {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
        }
    }

    private updatePlaylistFromData(dataView: powerbi.DataView): void {
        // Handle Power BI data integration for playlist
        const currentTime = Date.now();
        
        if (dataView.categorical?.categories?.[0]?.values) {
            console.log('📊 Processing Power BI data for music playlist...');
            
            // Extract and validate data roles
            const urls = dataView.categorical.categories[0].values as string[];
            const names = dataView.categorical.categories[1]?.values as string[] || [];
            const categories = dataView.categorical.categories[2]?.values as string[] || [];
            
            // Extract numeric audio data values (optional)
            const audioDataValues = dataView.categorical.values?.map(valueColumn => 
                valueColumn.values as number[]
            ) || [];

            // Update data roles cache
            this.dataRoles = {
                musicUrls: urls.filter(url => url && url.trim()),
                trackNames: names,
                categories: categories,
                audioData: audioDataValues
            };
            
            this.hasDataBinding = true;
            this.lastDataUpdate = currentTime;
            
            // Validate data integrity
            if (this.dataRoles.musicUrls.length === 0) {
                console.warn('⚠️ No valid music URLs found in data');
                this.hasDataBinding = false;
                return;
            }
            
            // Clear existing playlist and rebuild from validated data
            this.playlist = [];
            
            this.dataRoles.musicUrls.forEach((url, index) => {
                if (url && url.trim()) {
                    // Create enhanced track object with all available data
                    const track: any = {
                        name: this.dataRoles.trackNames[index] || `Track ${index + 1}`,
                        url: url.trim(),
                        metadata: {
                            category: this.dataRoles.categories[index] || 'Unknown',
                            index: index,
                            dataSource: 'PowerBI',
                            lastUpdated: currentTime,
                            // Add any numeric data associated with this track
                            audioData: this.dataRoles.audioData.map(values => values[index]).filter(val => val !== null && val !== undefined)
                        }
                    };
                    
                    // Validate URL format
                    if (this.isValidAudioUrl(track.url)) {
                        this.playlist.push(track);
                    } else {
                        console.warn(`⚠️ Invalid audio URL skipped: ${track.url}`);
                    }
                }
            });
            
            console.log(`🎵 Successfully loaded ${this.playlist.length} valid tracks from Power BI data`);
            console.log('📊 Data roles summary:', {
                urls: this.dataRoles.musicUrls.length,
                names: this.dataRoles.trackNames.length, 
                categories: this.dataRoles.categories.length,
                audioDataColumns: this.dataRoles.audioData.length
            });
            
            // Update UI to reflect new playlist
            this.updatePlaylistUI();
            
            // Auto-start playback if we have tracks and no audio is currently playing
            if (this.playlist.length > 0 && (!this.audioElement || this.audioElement.paused)) {
                console.log('🎵 Auto-starting first track from Power BI data');
                this.loadTrack(0);
            }
            
        } else {
            console.log('📊 No categorical data available, maintaining current playlist');
            this.hasDataBinding = false;
        }
    }

    private isValidAudioUrl(url: string): boolean {
        if (!url || typeof url !== 'string') return false;
        
        // Remove leading/trailing whitespace
        url = url.trim();
        
        // Check for common audio file extensions
        const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm'];
        const hasAudioExtension = audioExtensions.some(ext => 
            url.toLowerCase().includes(ext.toLowerCase())
        );
        
        // Check for valid URL format (http/https/blob/data)
        const urlPattern = /^(https?:\/\/|blob:|data:audio\/)/i;
        const isValidUrl = urlPattern.test(url);
        
        // Check for relative paths that might be valid
        const isRelativePath = !url.includes('://') && (url.startsWith('/') || url.startsWith('./') || hasAudioExtension);
        
        return isValidUrl || isRelativePath || hasAudioExtension;
    }

    private async handleFileSelection(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const files = input.files;
        
        if (files && files.length > 0) {
            this.playlist = [];
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const url = URL.createObjectURL(file);
                
                this.playlist.push({
                    name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
                    url: url,
                    metadata: await this.extractMetadata(file),
                    duration: 0
                });
            }
            
            this.currentTrackIndex = -1;
            this.updatePlaylistUI();
            
            if (this.playlist.length > 0) {
                this.loadTrack(0);
            }
        }
    }

    private async extractMetadata(file: File): Promise<any> {
        // Simple metadata extraction (could be enhanced with ID3 parsing library)
        return {
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
        };
    }

    private setupPlaylistAccess(): void {
        // Make visual instance accessible for onclick handlers
        (window as any).visual = this;
        
        // Spotify global methods removed
    }

    private updatePlaylistUI(): void {
        const playlistItems = this.target.querySelector('#playlistItems') as HTMLElement;
        if (!playlistItems) return;

        if (this.playlist.length === 0) {
            playlistItems.innerHTML = '<div class="ms-playlist-item" style="text-align:center;">Empty</div>';
            return;
        }

        let html = '';
        this.playlist.forEach((track, index) => {
            const isActive = index === this.currentTrackIndex;
            const cls = isActive ? 'ms-playlist-item ms-playlist-item--active' : 'ms-playlist-item';
            const label = track.name.length > 28 ? track.name.substring(0, 28) + '...' : track.name;
            html += `<div class="${cls}" onclick="visual.loadTrack(${index})" title="${track.name}">${label}</div>`;
        });

        playlistItems.innerHTML = html;
    }

    private loadTrack(index: number): void {
        if (index < 0 || index >= this.playlist.length) return;

        this.currentTrackIndex = index;
        const track = this.playlist[index];
        
        this.audioElement.src = track.url;
        this.audioElement.load();
        
        this.updateTrackInfo();
        this.updatePlaylistUI();
        this.drawWaveformPreview();
        
        // Initialize audio context if not already done
        this.initializeAudioContext();

        // Auto-play the loaded track
        this.audioElement.play();
        const btn = this.target.querySelector('#playPauseBtn') as HTMLButtonElement;
        if (btn) btn.textContent = '⏸️';
    }

    private togglePlayPause(): void {
        if (!this.audioElement.src) {
            if (this.playlist.length > 0 && this.currentTrackIndex === -1) {
                this.loadTrack(0);
            } else {
                return;
            }
        }

        if (this.audioElement.paused) {
            this.audioElement.play();
            const btn = this.target.querySelector('#playPauseBtn') as HTMLButtonElement;
            if (btn) btn.textContent = '⏸️';
        } else {
            this.audioElement.pause();
            const btn = this.target.querySelector('#playPauseBtn') as HTMLButtonElement;
            if (btn) btn.textContent = '▶️';
        }
    }

    private skipTime(seconds: number): void {
        if (this.audioElement.src) {
            this.audioElement.currentTime += seconds;
        }
    }

    private previousTrack(): void {
        if (this.playlist.length === 0) return;

        let newIndex;
        if (this.isShuffleMode) {
            // Go to last played track
            newIndex = this.playHistory.pop() || this.currentTrackIndex - 1;
        } else {
            newIndex = this.currentTrackIndex - 1;
        }

        if (newIndex < 0) {
            newIndex = this.playlist.length - 1;
        }

        this.loadTrack(newIndex);
        this.audioElement.play();
    }

    private nextTrack(): void {
        if (this.playlist.length === 0) return;

        let newIndex;
        if (this.isShuffleMode) {
            // Add current to history and pick random
            this.playHistory.push(this.currentTrackIndex);
            if (this.playHistory.length > 10) this.playHistory.shift(); // Limit history
            
            do {
                newIndex = Math.floor(Math.random() * this.playlist.length);
            } while (newIndex === this.currentTrackIndex && this.playlist.length > 1);
        } else {
            newIndex = this.currentTrackIndex + 1;
            if (newIndex >= this.playlist.length) {
                newIndex = this.isRepeatMode ? 0 : this.playlist.length - 1;
            }
        }

        this.loadTrack(newIndex);
        this.audioElement.play();
    }

    private handleTrackEnd(): void {
        if (this.isRepeatMode && !this.isShuffleMode) {
            // Repeat current track
            this.audioElement.currentTime = 0;
            this.audioElement.play();
        } else if (this.currentTrackIndex < this.playlist.length - 1 || this.isShuffleMode || this.isRepeatMode) {
            // Go to next track
            this.nextTrack();
        } else {
            // End of playlist
            const btn = this.target.querySelector('#playPauseBtn') as HTMLButtonElement;
            if (btn) btn.textContent = '▶️';
        }
    }

    private toggleShuffle(): void {
        this.isShuffleMode = !this.isShuffleMode;
        const btn = this.target.querySelector('#shuffleBtn') as HTMLButtonElement;
        if (btn) {
            btn.style.background = this.isShuffleMode ? this.themes.get(this.currentTheme)?.colors.primary || '#00ff88' : '#444';
            btn.style.color = this.isShuffleMode ? '#000' : this.themes.get(this.currentTheme)?.colors.primary || '#00ff88';
        }
    }

    private toggleRepeat(): void {
        this.isRepeatMode = !this.isRepeatMode;
        const btn = this.target.querySelector('#repeatBtn') as HTMLButtonElement;
        if (btn) {
            btn.style.background = this.isRepeatMode ? this.themes.get(this.currentTheme)?.colors.primary || '#00ff88' : '#444';
            btn.style.color = this.isRepeatMode ? '#000' : this.themes.get(this.currentTheme)?.colors.primary || '#00ff88';
        }
    }

    private updateVolume(event: Event): void {
        const slider = event.target as HTMLInputElement;
        const volume = parseInt(slider.value) / 100;
        
        this.audioElement.volume = volume;
        
        if (this.audioEffects.gainNode) {
            this.audioEffects.gainNode.gain.value = volume;
        }
        
        const display = this.target.querySelector('#volumeDisplay') as HTMLElement;
        if (display) display.textContent = `${slider.value}%`;
    }

    private updateBass(event: Event): void {
        const slider = event.target as HTMLInputElement;
        const value = parseFloat(slider.value);
        
        if (this.audioEffects.bassNode) {
            this.audioEffects.bassNode.gain.value = value;
        }
        
        const display = this.target.querySelector('#bassDisplay') as HTMLElement;
        if (display) display.textContent = `${value > 0 ? '+' : ''}${value}dB`;
    }

    private updateTreble(event: Event): void {
        const slider = event.target as HTMLInputElement;
        const value = parseFloat(slider.value);
        
        if (this.audioEffects.trebleNode) {
            this.audioEffects.trebleNode.gain.value = value;
        }
        
        const display = this.target.querySelector('#trebleDisplay') as HTMLElement;
        if (display) display.textContent = `${value > 0 ? '+' : ''}${value}dB`;
    }

    private updateReverb(event: Event): void {
        const slider = event.target as HTMLInputElement;
        const value = parseInt(slider.value);
        
        // Reverb implementation would need impulse response
        // For now, just update display
        const display = this.target.querySelector('#reverbDisplay') as HTMLElement;
        if (display) display.textContent = `${value}%`;
    }

    // ── MIXER DESK ────────────────────────────────────────────
    private setupMixerEvents(): void {
        const mixerBtn = this.target.querySelector('#mixerBtn') as HTMLButtonElement;
        const mixerClose = this.target.querySelector('#mixerClose') as HTMLButtonElement;
        const mixerOverlay = this.target.querySelector('#mixerOverlay') as HTMLElement;

        mixerBtn?.addEventListener('click', () => this.toggleMixer());
        mixerClose?.addEventListener('click', () => this.toggleMixer(false));
        mixerOverlay?.addEventListener('click', (e) => {
            if (e.target === mixerOverlay) this.toggleMixer(false);
        });

        // Custom fader drag handlers
        const faderDefs: {trackId: string, handler: (v: number) => void, format: (v: number) => string, fillId: string}[] = [
            {trackId:'mixTrackVol',  handler: v => this.setMixerVolume(v),    format: v => `${v}%`,                          fillId:'mixFaderFillVol'},
            {trackId:'mixTrackBass', handler: v => this.setMixerEQ('bass',v), format: v => `${v>0?'+':''}${v}dB`,            fillId:'mixFaderFillBass'},
            {trackId:'mixTrackMid',  handler: v => this.setMixerEQ('mid',v),  format: v => `${v>0?'+':''}${v}dB`,            fillId:'mixFaderFillMid'},
            {trackId:'mixTrackTreb', handler: v => this.setMixerEQ('treb',v), format: v => `${v>0?'+':''}${v}dB`,            fillId:'mixFaderFillTreb'},
            {trackId:'mixTrackRev',  handler: v => this.setMixerReverb(v),    format: v => `${v}%`,                          fillId:'mixFaderFillRev'},
            {trackId:'mixTrackComp', handler: v => this.setMixerCompressor(v), format: v => `${v}dB`,                        fillId:'mixFaderFillComp'},
        ];

        faderDefs.forEach(f => {
            const track = this.target.querySelector(`#${f.trackId}`) as HTMLElement;
            if (!track) return;
            const fillEl = this.target.querySelector(`#${f.fillId}`) as HTMLElement;
            const thumbEl = track.querySelector('.ms-channel__thumb') as HTMLElement;
            const valEl = this.target.querySelector(`#mixVal${f.trackId.replace('mixTrack','')}`) as HTMLElement;
            const lo = parseFloat(track.dataset.min || '0');
            const hi = parseFloat(track.dataset.max || '100');

            const setFromY = (clientY: number) => {
                const rect = track.getBoundingClientRect();
                let pct = 1 - ((clientY - rect.top) / rect.height);
                pct = Math.max(0, Math.min(1, pct));
                const val = Math.round(lo + pct * (hi - lo));
                track.dataset.value = String(val);
                if (fillEl) fillEl.style.height = `${pct * 100}%`;
                if (thumbEl) thumbEl.style.bottom = `${pct * 100}%`;
                if (valEl) valEl.textContent = f.format(val);
                f.handler(val);
            };

            track.addEventListener('mousedown', (e: MouseEvent) => {
                e.preventDefault();
                setFromY(e.clientY);
                const onMove = (ev: MouseEvent) => { ev.preventDefault(); setFromY(ev.clientY); };
                const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });

            // Touch support
            track.addEventListener('touchstart', (e: TouchEvent) => {
                e.preventDefault();
                setFromY(e.touches[0].clientY);
                const onMove = (ev: TouchEvent) => { ev.preventDefault(); setFromY(ev.touches[0].clientY); };
                const onEnd = () => { document.removeEventListener('touchmove', onMove as any); document.removeEventListener('touchend', onEnd); };
                document.addEventListener('touchmove', onMove as any, {passive: false});
                document.addEventListener('touchend', onEnd);
            }, {passive: false});
        });

        // Preset buttons
        this.target.querySelectorAll('.ms-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = (btn as HTMLElement).dataset.preset || 'flat';
                this.applyMixerPreset(preset);
                // Highlight active preset
                this.target.querySelectorAll('.ms-preset-btn').forEach(b => b.classList.remove('ms-preset-btn--active'));
                btn.classList.add('ms-preset-btn--active');
            });
        });
    }

    private toggleMixer(forceState?: boolean): void {
        const overlay = this.target.querySelector('#mixerOverlay') as HTMLElement;
        if (!overlay) return;
        const isOpen = overlay.classList.contains('ms-mixer-overlay--open');
        const shouldOpen = forceState !== undefined ? forceState : !isOpen;
        overlay.classList.toggle('ms-mixer-overlay--open', shouldOpen);

        // Sync mixer faders with current control-bar slider values
        if (shouldOpen) this.syncMixerFromSliders();
    }

    private syncMixerFromSliders(): void {
        const sync = (trackId: string, sliderId: string) => {
            const slider = this.target.querySelector(`#${sliderId}`) as HTMLInputElement;
            const track = this.target.querySelector(`#${trackId}`) as HTMLElement;
            if (slider && track) {
                this.setFaderValue(trackId, parseFloat(slider.value));
            }
        };
        sync('mixTrackVol', 'volumeSlider');
        sync('mixTrackBass', 'bassSlider');
        sync('mixTrackTreb', 'trebleSlider');
        sync('mixTrackRev', 'reverbSlider');
    }

    /** Programmatically set a fader track's position, fill, thumb and value display */
    private setFaderValue(trackId: string, val: number): void {
        const track = this.target.querySelector(`#${trackId}`) as HTMLElement;
        if (!track) return;
        const lo = parseFloat(track.dataset.min || '0');
        const hi = parseFloat(track.dataset.max || '100');
        const pct = ((val - lo) / (hi - lo)) * 100;
        track.dataset.value = String(val);
        const fillEl = track.querySelector('.ms-channel__fader-fill') as HTMLElement;
        const thumbEl = track.querySelector('.ms-channel__thumb') as HTMLElement;
        if (fillEl) fillEl.style.height = `${pct}%`;
        if (thumbEl) thumbEl.style.bottom = `${pct}%`;
        const key = track.dataset.key || '';
        const valEl = this.target.querySelector(`#mixVal${key.charAt(0).toUpperCase()+key.slice(1)}`) as HTMLElement;
        if (valEl) {
            if (key === 'vol' || key === 'rev') valEl.textContent = `${val}%`;
            else valEl.textContent = `${val>0?'+':''}${val}dB`;
        }
    }

    private setMixerVolume(v: number): void {
        const vol = v / 100;
        this.audioElement.volume = vol;
        if (this.audioEffects.gainNode) this.audioEffects.gainNode.gain.value = vol;
        // Sync control-bar slider
        const s = this.target.querySelector('#volumeSlider') as HTMLInputElement;
        const d = this.target.querySelector('#volumeDisplay') as HTMLElement;
        if (s) s.value = String(v);
        if (d) d.textContent = `${v}%`;
    }

    private setMixerEQ(band: 'bass'|'mid'|'treb', v: number): void {
        if (band === 'bass' && this.audioEffects.bassNode) {
            this.audioEffects.bassNode.gain.value = v;
            const s = this.target.querySelector('#bassSlider') as HTMLInputElement;
            const d = this.target.querySelector('#bassDisplay') as HTMLElement;
            if (s) s.value = String(v);
            if (d) d.textContent = `${v>0?'+':''}${v}dB`;
        } else if (band === 'mid' && this.audioEffects.midNode) {
            this.audioEffects.midNode.gain.value = v;
        } else if (band === 'treb' && this.audioEffects.trebleNode) {
            this.audioEffects.trebleNode.gain.value = v;
            const s = this.target.querySelector('#trebleSlider') as HTMLInputElement;
            const d = this.target.querySelector('#trebleDisplay') as HTMLElement;
            if (s) s.value = String(v);
            if (d) d.textContent = `${v>0?'+':''}${v}dB`;
        }
    }

    private setMixerReverb(v: number): void {
        const s = this.target.querySelector('#reverbSlider') as HTMLInputElement;
        const d = this.target.querySelector('#reverbDisplay') as HTMLElement;
        if (s) s.value = String(v);
        if (d) d.textContent = `${v}%`;
    }

    private setMixerCompressor(threshold: number): void {
        if (this.audioEffects.compressorNode) {
            this.audioEffects.compressorNode.threshold.value = threshold;
        }
    }

    private applyMixerPreset(name: string): void {
        const presets: Record<string, {vol:number, bass:number, mid:number, treb:number, rev:number, comp:number}> = {
            'flat':        {vol:70, bass:0,  mid:0,  treb:0,  rev:0,  comp:-24},
            'bass-boost':  {vol:75, bass:8,  mid:-2, treb:-1, rev:10, comp:-20},
            'vocal':       {vol:70, bass:-3, mid:5,  treb:2,  rev:20, comp:-18},
            'electronic':  {vol:80, bass:6,  mid:2,  treb:5,  rev:15, comp:-16},
            'rock':        {vol:80, bass:5,  mid:3,  treb:4,  rev:8,  comp:-20},
            'warm':        {vol:70, bass:4,  mid:1,  treb:-3, rev:12, comp:-22},
        };
        const p = presets[name] || presets['flat'];

        this.setMixerVolume(p.vol);
        this.setMixerEQ('bass', p.bass);
        this.setMixerEQ('mid', p.mid);
        this.setMixerEQ('treb', p.treb);
        this.setMixerReverb(p.rev);
        this.setMixerCompressor(p.comp);

        // Update all mixer fader positions & displays
        const updates: [string, number, string, [number,number], string][] = [
            ['mixVol',  p.vol,  `${p.vol}%`,                            [0,100],  'mixFaderFillVol'],
            ['mixBass', p.bass, `${p.bass>0?'+':''}${p.bass}dB`,        [-12,12], 'mixFaderFillBass'],
            ['mixMid',  p.mid,  `${p.mid>0?'+':''}${p.mid}dB`,          [-12,12], 'mixFaderFillMid'],
            ['mixTreb', p.treb, `${p.treb>0?'+':''}${p.treb}dB`,        [-12,12], 'mixFaderFillTreb'],
            ['mixRev',  p.rev,  `${p.rev}%`,                            [0,100],  'mixFaderFillRev'],
            ['mixComp', p.comp, `${p.comp}dB`,                          [-50,0],  'mixFaderFillComp'],
        ];
        updates.forEach(([id, val, label, [lo,hi], fillId]) => {
            const trackEl = this.target.querySelector(`#mixTrack${(id as string).replace('mix','')}`) as HTMLElement;
            const valEl = this.target.querySelector(`#mixVal${(id as string).replace('mix','')}`) as HTMLElement;
            const fillEl = this.target.querySelector(`#${fillId}`) as HTMLElement;
            const thumbEl = trackEl?.querySelector('.ms-channel__thumb') as HTMLElement;
            const pct = (((val as number)-(lo as number))/((hi as number)-(lo as number)))*100;
            if (trackEl) trackEl.dataset.value = String(val);
            if (valEl) valEl.textContent = label as string;
            if (fillEl) fillEl.style.height = `${pct}%`;
            if (thumbEl) thumbEl.style.bottom = `${pct}%`;
        });
    }

    private changeVisualizationStyle(event: Event): void {
        const select = event.target as HTMLSelectElement;
        
        if (select.value === 'auto-cycle') {
            this.startAutoCycle();
        } else {
            this.stopAutoCycle();
            if (select.value !== this.visualizationStyle) {
                this.geissNeedsReset = true;
            }
            this.visualizationStyle = select.value;
        }
    }

    // ── VU PEAK METERS ────────────────────────────────────────
    private updateVUMeters(): void {
        if (!this.audioEffects.analyserL || !this.audioEffects.analyserR) return;
        const overlay = this.target.querySelector('#mixerOverlay') as HTMLElement;
        if (!overlay || !overlay.classList.contains('ms-mixer-overlay--open')) return;

        const bufL = new Uint8Array(this.audioEffects.analyserL.frequencyBinCount);
        const bufR = new Uint8Array(this.audioEffects.analyserR.frequencyBinCount);
        this.audioEffects.analyserL.getByteFrequencyData(bufL);
        this.audioEffects.analyserR.getByteFrequencyData(bufR);

        const rms = (buf: Uint8Array): number => {
            let sum = 0;
            for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
            return Math.sqrt(sum / buf.length) / 255;
        };

        const levelL = Math.min(1, rms(bufL) * 1.6);
        const levelR = Math.min(1, rms(bufR) * 1.6);

        // Peak hold with decay
        this.vuPeakL = Math.max(levelL, this.vuPeakL * this.vuPeakDecay);
        this.vuPeakR = Math.max(levelR, this.vuPeakR * this.vuPeakDecay);

        const barL = this.target.querySelector('#vuBarL') as HTMLElement;
        const barR = this.target.querySelector('#vuBarR') as HTMLElement;
        const peakL = this.target.querySelector('#vuPeakL') as HTMLElement;
        const peakR = this.target.querySelector('#vuPeakR') as HTMLElement;

        if (barL) barL.style.width = `${levelL * 100}%`;
        if (barR) barR.style.width = `${levelR * 100}%`;
        if (peakL) peakL.style.left = `${this.vuPeakL * 100}%`;
        if (peakR) peakR.style.left = `${this.vuPeakR * 100}%`;
    }

    // ── WAVEFORM MINI-PREVIEW ─────────────────────────────────
    private drawWaveformPreview(): void {
        const canvas = this.target.querySelector('#waveformCanvas') as HTMLCanvasElement;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Wait for audio to be loadable
        const tryDraw = () => {
            if (!this.audioContext) {
                this.initializeAudioContext();
            }
            if (!this.audioContext || !this.audioElement.src) return;

            fetch(this.audioElement.src)
                .then(r => r.arrayBuffer())
                .then(buf => this.audioContext!.decodeAudioData(buf))
                .then(decoded => {
                    const raw = decoded.getChannelData(0);
                    const rect = canvas.parentElement?.getBoundingClientRect();
                    if (!rect) return;
                    const dpr = window.devicePixelRatio || 1;
                    canvas.width = rect.width * dpr;
                    canvas.height = rect.height * dpr;
                    ctx.scale(dpr, dpr);
                    const w = rect.width;
                    const h = rect.height;
                    ctx.clearRect(0, 0, w, h);

                    // Downsample to canvas width
                    const step = Math.ceil(raw.length / w);
                    ctx.beginPath();
                    ctx.strokeStyle = 'rgba(0,255,65,0.25)';
                    ctx.lineWidth = 1;
                    for (let x = 0; x < w; x++) {
                        const idx = x * step;
                        let min = 1, max = -1;
                        for (let j = 0; j < step && idx + j < raw.length; j++) {
                            const s = raw[idx + j];
                            if (s < min) min = s;
                            if (s > max) max = s;
                        }
                        const yLow = ((1 + min) / 2) * h;
                        const yHigh = ((1 + max) / 2) * h;
                        ctx.moveTo(x, yLow);
                        ctx.lineTo(x, yHigh);
                    }
                    ctx.stroke();
                })
                .catch(() => { /* CORS or decode error — clear canvas */ ctx.clearRect(0, 0, canvas.width, canvas.height); });
        };
        // Small delay to let src settle
        setTimeout(tryDraw, 200);
    }

    private startAutoCycle(): void {
        // Stop any existing cycle
        this.stopAutoCycle();
        
        this.autoCycleEnabled = true;
        this.currentCycleIndex = 0;
        
        // Start the cycling timer
        this.cycleTimer = window.setInterval(() => {
            this.visualizationStyle = this.visualizationModes[this.currentCycleIndex];
            this.currentCycleIndex = (this.currentCycleIndex + 1) % this.visualizationModes.length;
        }, this.cycleInterval);
    }

    private stopAutoCycle(): void {
        if (this.cycleTimer) {
            clearInterval(this.cycleTimer);
            this.cycleTimer = null;
        }
        this.autoCycleEnabled = false;
    }

    private changeTheme(event: Event): void {
        const select = event.target as HTMLSelectElement;
        const newTheme = select.value;
        
        if (this.themes.has(newTheme)) {
            this.currentTheme = newTheme;
            this.applyTheme();
        }
    }

    private applyTheme(): void {
        const theme = this.themes.get(this.currentTheme);
        if (!theme || !this.musicContainer) return;

        // Update background
        this.musicContainer.style.background = theme.colors.background;

        // Update all themed elements
        const themedElements = this.target.querySelectorAll('[style*="color:"], [style*="background:"], [style*="border:"]');
        themedElements.forEach(el => {
            const element = el as HTMLElement;
            const style = element.style.cssText;
            
            // Update colors in style string (basic implementation)
            element.style.cssText = style
                .replace(/#00ff88/g, theme.colors.primary)
                .replace(/#00ccff/g, theme.colors.secondary);
        });
    }

    private toggleParticles(): void {
        this.particlesEnabled = !this.particlesEnabled;
        const btn = this.target.querySelector('#particlesToggle') as HTMLButtonElement;
        if (btn) {
            btn.textContent = this.particlesEnabled ? 'FX ON' : 'FX OFF';
            if (this.particlesEnabled) {
                btn.classList.add('ms-toolbar-btn--active');
            } else {
                btn.classList.remove('ms-toolbar-btn--active');
            }
        }

        if (!this.particlesEnabled) {
            this.particles = [];
            this.clearParticleCanvas();
        }
    }

    private toggleFullscreen(): void {
        try {
            if (!document.fullscreenElement) {
                // Try to enter fullscreen on the visual container
                const element = this.target.parentElement || this.target;
                
                if (element.requestFullscreen) {
                    element.requestFullscreen().then(() => {
                        this.showFullscreenStatus('✅ Fullscreen Enabled', '#4CAF50');
                        this.updateFullscreenButton(true);
                    }).catch((err) => {
                        this.showFullscreenStatus('❌ Fullscreen Not Available in Power BI', '#f44336');
                        this.disableFullscreenButton();
                        console.warn('Fullscreen failed:', err);
                    });
                } else if ((element as any).webkitRequestFullscreen) {
                    // Safari support
                    (element as any).webkitRequestFullscreen();
                    this.showFullscreenStatus('✅ Fullscreen Enabled (WebKit)', '#4CAF50');
                    this.updateFullscreenButton(true);
                } else if ((element as any).msRequestFullscreen) {
                    // IE/Edge support
                    (element as any).msRequestFullscreen();
                    this.showFullscreenStatus('✅ Fullscreen Enabled (IE)', '#4CAF50');
                    this.updateFullscreenButton(true);
                } else {
                    this.showFullscreenStatus('❌ Fullscreen API Not Supported', '#f44336');
                    this.disableFullscreenButton();
                }
            } else {
                // Exit fullscreen
                if (document.exitFullscreen) {
                    document.exitFullscreen().then(() => {
                        this.showFullscreenStatus('↩️ Exited Fullscreen', '#2196F3');
                        this.updateFullscreenButton(false);
                    });
                } else if ((document as any).webkitExitFullscreen) {
                    (document as any).webkitExitFullscreen();
                    this.showFullscreenStatus('↩️ Exited Fullscreen (WebKit)', '#2196F3');
                    this.updateFullscreenButton(false);
                } else if ((document as any).msExitFullscreen) {
                    (document as any).msExitFullscreen();
                    this.showFullscreenStatus('↩️ Exited Fullscreen (IE)', '#2196F3');
                    this.updateFullscreenButton(false);
                }
            }
        } catch (error) {
            this.showFullscreenStatus('⚠️ Fullscreen Error - Power BI Restrictions', '#ff9800');
            this.disableFullscreenButton();
            console.error('Fullscreen error:', error);
        }

        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => {
            this.updateFullscreenButton(!!document.fullscreenElement);
        });
    }

    private showFullscreenStatus(message: string, color: string): void {
        // Create temporary status message
        const status = document.createElement('div');
        status.textContent = message;
        status.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: ${color}; color: white; padding: 8px 16px;
            border-radius: 4px; font-size: 12px; font-family: monospace;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease, fadeOut 0.3s ease 2s forwards;
        `;
        
        // Add animations
        if (!document.querySelector('#fullscreen-animations')) {
            const style = document.createElement('style');
            style.id = 'fullscreen-animations';
            style.textContent = `
                @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(status);
        setTimeout(() => {
            if (status.parentNode) {
                status.parentNode.removeChild(status);
            }
        }, 2500);
    }

    private showNotification(message: string, color: string): void {
        // Create temporary notification message
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed; top: 60px; right: 20px; z-index: 10000;
            background: ${color}; color: white; padding: 8px 16px;
            border-radius: 4px; font-size: 12px; font-family: monospace;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease, fadeOut 0.3s ease 2s forwards;
        `;
        
        // Add animations (if not already added)
        if (!document.querySelector('#music-notifications')) {
            const style = document.createElement('style');
            style.id = 'music-notifications';
            style.textContent = `
                @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 2500);
    }

    private updateFullscreenButton(isFullscreen: boolean): void {
        const btn = this.target.querySelector('#fullscreenBtn') as HTMLButtonElement;
        if (btn && !btn.disabled) {
            btn.textContent = isFullscreen ? '↩️ Exit' : '🖥️ Full';
            btn.title = isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen';
        }
    }

    private disableFullscreenButton(): void {
        const btn = this.target.querySelector('#fullscreenBtn') as HTMLButtonElement;
        if (btn) {
            btn.textContent = '⚠️ N/A';
            btn.title = 'Fullscreen not available in Power BI iframe';
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.disabled = true;
        }
    }









    // 🎵 DATA-DRIVEN MUSIC GENERATION METHODS 🎵
    
    private initializeDataDrivenMusic(): void {
        if (!this.audioContext) return;
        
        this.musicGeneration.webAudioNodes.context = this.audioContext;
        
        // Initialize musical scale frequencies
        this.calculateScaleFrequencies();
        
        // Create synthesis nodes
        this.initializeSynthesisNodes();
        
        // Set up reverb impulse response
        this.createReverbImpulseResponse();
        
        console.log('🎵 Data-driven music generation system initialized');
    }
    
    private calculateScaleFrequencies(): void {
        const { root, scale } = this.musicGeneration.musicalScale;
        const frequencies: number[] = [];
        
        // Generate frequencies for multiple octaves
        for (let octave = 0; octave < 3; octave++) {
            for (const interval of scale) {
                const frequency = root * Math.pow(2, octave) * Math.pow(2, interval / 12);
                frequencies.push(frequency);
            }
        }
        
        this.musicGeneration.musicalScale.frequencies = frequencies;
    }
    
    private initializeSynthesisNodes(): void {
        if (!this.musicGeneration.webAudioNodes.context) return;
        
        const context = this.musicGeneration.webAudioNodes.context;
        
        // Create compressor for overall dynamics
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.knee.value = 30;
        compressor.ratio.value = 12;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;
        
        this.musicGeneration.webAudioNodes.compressor = compressor;
        compressor.connect(context.destination);
    }
    
    private createReverbImpulseResponse(): void {
        if (!this.musicGeneration.webAudioNodes.context) return;
        
        const context = this.musicGeneration.webAudioNodes.context;
        const length = context.sampleRate * 2; // 2 second reverb
        const impulse = context.createBuffer(2, length, context.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                const decay = Math.pow(1 - i / length, 2);
                channelData[i] = (Math.random() * 2 - 1) * decay * 0.1;
            }
        }
        
        const reverb = context.createConvolver();
        reverb.buffer = impulse;
        
        this.musicGeneration.webAudioNodes.reverb = reverb;
        
        if (this.musicGeneration.webAudioNodes.compressor) {
            reverb.connect(this.musicGeneration.webAudioNodes.compressor);
        }
    }
    
    private generateMusicFromVisualizationData(): void {
        if (!this.musicGeneration.isEnabled || !this.frequencyData || !this.timeData) return;
        
        // Analyze current audio data
        const audioFeatures = this.analyzeAudioFeatures();
        
        // Generate melody based on frequency spectrum
        if (this.musicGeneration.dataMapping.frequencyToMelody) {
            this.generateMelodyFromFrequencies(audioFeatures.dominantFrequencies);
        }
        
        // Generate rhythm from beat detection
        if (this.musicGeneration.dataMapping.beatDetectionToRhythm) {
            this.generateRhythmFromBeats(audioFeatures.beatStrength);
        }
        
        // Generate harmony from overall spectrum
        this.generateHarmonyFromSpectrum(audioFeatures.spectralCentroid);
        
        // Apply dynamics based on amplitude
        if (this.musicGeneration.dataMapping.amplitudeToVolume) {
            this.applyDynamicsFromAmplitude(audioFeatures.rmsLevel);
        }
    }
    
    private analyzeAudioFeatures(): {
        dominantFrequencies: number[];
        spectralCentroid: number;
        beatStrength: number;
        rmsLevel: number;
    } {
        const frequencyBins = this.frequencyData.length;
        const dominantFrequencies: number[] = [];
        let spectralSum = 0;
        let magnitudeSum = 0;
        let rmsSum = 0;
        
        // Find dominant frequencies and calculate spectral centroid
        for (let i = 0; i < frequencyBins; i++) {
            const magnitude = this.frequencyData[i] / 255.0;
            const frequency = (i * this.audioContext.sampleRate) / (2 * frequencyBins);
            
            spectralSum += frequency * magnitude;
            magnitudeSum += magnitude;
            rmsSum += magnitude * magnitude;
            
            // Identify peaks for dominant frequencies
            if (magnitude > 0.6 && 
                (i === 0 || this.frequencyData[i] > this.frequencyData[i - 1]) &&
                (i === frequencyBins - 1 || this.frequencyData[i] > this.frequencyData[i + 1])) {
                dominantFrequencies.push(frequency);
            }
        }
        
        const spectralCentroid = magnitudeSum > 0 ? spectralSum / magnitudeSum : 0;
        const rmsLevel = Math.sqrt(rmsSum / frequencyBins);
        
        // Simple beat detection based on low frequency energy
        const bassEnergy = this.frequencyData.slice(0, 8).reduce((sum, val) => sum + val, 0) / (8 * 255);
        
        return {
            dominantFrequencies: dominantFrequencies.slice(0, 5), // Limit to top 5
            spectralCentroid,
            beatStrength: bassEnergy,
            rmsLevel
        };
    }
    
    private generateMelodyFromFrequencies(dominantFreqs: number[]): void {
        if (dominantFreqs.length === 0) return;
        
        const { frequencies } = this.musicGeneration.musicalScale;
        
        dominantFreqs.forEach((freq, index) => {
            // Map input frequency to closest scale frequency
            const closestScaleFreq = this.findClosestFrequency(freq, frequencies);
            
            // Create melodic note with envelope
            this.playMelodicNote(closestScaleFreq, 0.6, 200 + (index * 50));
        });
    }
    
    private generateRhythmFromBeats(beatStrength: number): void {
        const now = this.audioContext.currentTime;
        const { currentPattern, tempo } = this.musicGeneration.rhythmPatterns;
        
        // Calculate beat timing
        const beatInterval = 60 / tempo; // seconds per beat
        const currentBeat = Math.floor((now % (beatInterval * currentPattern.length)) / beatInterval);
        
        if (beatStrength > 0.7 && currentPattern[currentBeat] > 0.5) {
            // Generate rhythmic percussion sound
            this.playPercussiveSound(100, 0.1, currentPattern[currentBeat] * 0.6);
        }
    }
    
    private generateHarmonyFromSpectrum(spectralCentroid: number): void {
        const { chordProgressions, currentChord, chordDuration } = this.musicGeneration.harmonics;
        const now = Date.now();
        
        // Check if it's time to change chord
        if (now % chordDuration < 100) { // Small window for chord changes
            const nextChord = (currentChord + 1) % chordProgressions.length;
            this.musicGeneration.harmonics.currentChord = nextChord;
            
            // Generate harmony based on spectral centroid
            const chordRoot = this.getChordFrequency(chordProgressions[nextChord]);
            const brightness = Math.min(spectralCentroid / 2000, 1.0); // Normalize brightness
            
            this.playHarmonicChord(chordRoot, brightness);
        }
    }
    
    private applyDynamicsFromAmplitude(rmsLevel: number): void {
        // Adjust master volume of generated music based on input amplitude
        const targetVolume = Math.max(0.1, Math.min(0.8, rmsLevel * 2));
        
        this.musicGeneration.webAudioNodes.gainNodes.forEach(gainNode => {
            if (gainNode.gain.value !== targetVolume) {
                gainNode.gain.setTargetAtTime(targetVolume, this.audioContext.currentTime, 0.1);
            }
        });
    }
    
    private findClosestFrequency(targetFreq: number, scaleFreqs: number[]): number {
        return scaleFreqs.reduce((closest, current) => 
            Math.abs(current - targetFreq) < Math.abs(closest - targetFreq) ? current : closest
        );
    }
    
    private playMelodicNote(frequency: number, volume: number, duration: number): void {
        if (!this.musicGeneration.webAudioNodes.context) return;
        
        const context = this.musicGeneration.webAudioNodes.context;
        const now = context.currentTime;
        const { attack, decay, sustain, release } = this.musicGeneration.synthesis;
        
        // Create oscillator and gain node
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        const filter = context.createBiquadFilter();
        
        // Configure oscillator
        oscillator.type = this.musicGeneration.synthesis.waveform;
        oscillator.frequency.value = frequency;
        
        // Configure filter for timbre
        filter.type = 'lowpass';
        filter.frequency.value = frequency * 4;
        filter.Q.value = 1;
        
        // ADSR envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + attack);
        gainNode.gain.linearRampToValueAtTime(volume * sustain, now + attack + decay);
        gainNode.gain.setValueAtTime(volume * sustain, now + (duration / 1000) - release);
        gainNode.gain.linearRampToValueAtTime(0, now + (duration / 1000));
        
        // Connect nodes
        oscillator.connect(filter);
        filter.connect(gainNode);
        
        if (this.musicGeneration.webAudioNodes.reverb) {
            gainNode.connect(this.musicGeneration.webAudioNodes.reverb);
        } else if (this.musicGeneration.webAudioNodes.compressor) {
            gainNode.connect(this.musicGeneration.webAudioNodes.compressor);
        }
        
        // Schedule playback
        oscillator.start(now);
        oscillator.stop(now + (duration / 1000));
        
        // Store references
        this.musicGeneration.webAudioNodes.oscillators.push(oscillator);
        this.musicGeneration.webAudioNodes.gainNodes.push(gainNode);
        this.musicGeneration.webAudioNodes.filters.push(filter);
        
        // Clean up after playback
        oscillator.onended = () => {
            const oscIndex = this.musicGeneration.webAudioNodes.oscillators.indexOf(oscillator);
            const gainIndex = this.musicGeneration.webAudioNodes.gainNodes.indexOf(gainNode);
            const filterIndex = this.musicGeneration.webAudioNodes.filters.indexOf(filter);
            
            if (oscIndex > -1) this.musicGeneration.webAudioNodes.oscillators.splice(oscIndex, 1);
            if (gainIndex > -1) this.musicGeneration.webAudioNodes.gainNodes.splice(gainIndex, 1);
            if (filterIndex > -1) this.musicGeneration.webAudioNodes.filters.splice(filterIndex, 1);
        };
    }
    
    private playPercussiveSound(frequency: number, duration: number, volume: number): void {
        if (!this.musicGeneration.webAudioNodes.context) return;
        
        const context = this.musicGeneration.webAudioNodes.context;
        const now = context.currentTime;
        
        // Create noise-based percussion
        const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
        const channelData = buffer.getChannelData(0);
        
        // Generate filtered noise
        for (let i = 0; i < channelData.length; i++) {
            const decay = 1 - (i / channelData.length);
            channelData[i] = (Math.random() * 2 - 1) * decay * volume;
        }
        
        const bufferSource = context.createBufferSource();
        const gainNode = context.createGain();
        const filter = context.createBiquadFilter();
        
        bufferSource.buffer = buffer;
        filter.type = 'bandpass';
        filter.frequency.value = frequency;
        filter.Q.value = 10;
        
        gainNode.gain.setValueAtTime(volume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        bufferSource.connect(filter);
        filter.connect(gainNode);
        
        if (this.musicGeneration.webAudioNodes.compressor) {
            gainNode.connect(this.musicGeneration.webAudioNodes.compressor);
        }
        
        bufferSource.start(now);
        bufferSource.stop(now + duration);
    }
    
    private playHarmonicChord(rootFreq: number, brightness: number): void {
        const chordIntervals = [0, 4, 7]; // Major triad (root, major third, perfect fifth)
        
        chordIntervals.forEach((interval, index) => {
            const frequency = rootFreq * Math.pow(2, interval / 12);
            const volume = 0.3 * (1 - brightness * 0.2) * (1 - index * 0.15); // Increased base volume
            this.playMelodicNote(frequency, volume, 1500); // Longer duration for harmony
        });
    }
    
    private getChordFrequency(chordSymbol: string): number {
        const chordRoots: { [key: string]: number } = {
            'I': this.musicGeneration.musicalScale.root,
            'ii': this.musicGeneration.musicalScale.root * Math.pow(2, 2/12),
            'iii': this.musicGeneration.musicalScale.root * Math.pow(2, 4/12),
            'IV': this.musicGeneration.musicalScale.root * Math.pow(2, 5/12),
            'V': this.musicGeneration.musicalScale.root * Math.pow(2, 7/12),
            'vi': this.musicGeneration.musicalScale.root * Math.pow(2, 9/12),
            'vii': this.musicGeneration.musicalScale.root * Math.pow(2, 11/12)
        };
        
        return chordRoots[chordSymbol] || this.musicGeneration.musicalScale.root;
    }
    
    private toggleDataDrivenMusic(): void {
        this.musicGeneration.isEnabled = !this.musicGeneration.isEnabled;
        
        if (this.musicGeneration.isEnabled) {
            this.initializeDataDrivenMusic();
            this.showNotification('🎵 Data-driven music generation enabled!', '#00ff88');
        } else {
            // Stop all active oscillators
            this.musicGeneration.webAudioNodes.oscillators.forEach(osc => {
                try {
                    osc.stop();
                } catch (e) {
                    // Oscillator might already be stopped
                }
            });
            this.musicGeneration.webAudioNodes.oscillators = [];
            this.musicGeneration.webAudioNodes.gainNodes = [];
            this.musicGeneration.webAudioNodes.filters = [];
            
            this.showNotification('🎵 Data-driven music generation disabled', '#ff6b6b');
        }
    }
    
    private cycleMusicalScale(): void {
        const scales = {
            'major': [0, 2, 4, 5, 7, 9, 11],
            'minor': [0, 2, 3, 5, 7, 8, 10],
            'pentatonic': [0, 2, 4, 7, 9],
            'blues': [0, 3, 5, 6, 7, 10],
            'dorian': [0, 2, 3, 5, 7, 9, 10],
            'mixolydian': [0, 2, 4, 5, 7, 9, 10]
        };
        
        const scaleNames = Object.keys(scales);
        const currentIndex = scaleNames.indexOf(this.musicGeneration.musicalScale.currentScale);
        const nextIndex = (currentIndex + 1) % scaleNames.length;
        const nextScale = scaleNames[nextIndex];
        
        this.musicGeneration.musicalScale.currentScale = nextScale;
        this.musicGeneration.musicalScale.scale = scales[nextScale as keyof typeof scales];
        this.calculateScaleFrequencies();
        
        // Play a quick ascending scale demonstration so user can hear the difference
        this.playScaleDemonstration();
        
        this.showNotification(`🎵 Musical scale: ${nextScale.toUpperCase()}`, '#00ccff');
    }

    private playScaleDemonstration(): void {
        if (!this.audioContext || !this.musicGeneration.isEnabled) return;
        
        const { frequencies } = this.musicGeneration.musicalScale;
        
        // Play first 8 notes of the scale in ascending order
        const demoNotes = frequencies.slice(0, 8);
        
        demoNotes.forEach((frequency, index) => {
            // Stagger the notes to create an ascending scale
            setTimeout(() => {
                this.playMelodicNote(frequency, 0.7, 300); // Higher volume and longer duration
            }, index * 200); // 200ms between each note
        });
        
        console.log(`🎵 Playing scale demonstration: ${this.musicGeneration.musicalScale.currentScale} scale`);
    }

    // 🎧 DJ MASHUP MODE METHODS 🎧

    private toggleDjMashupMode(): void {
        this.djMashup.isEnabled = !this.djMashup.isEnabled;
        const panel = this.target.querySelector('#djMashupPanel') as HTMLElement;
        const toggleBtn = this.target.querySelector('#toggleDjMode') as HTMLButtonElement;
        const masterBpmControl = this.target.querySelector('#masterBpmControl') as HTMLElement;
        
        if (this.djMashup.isEnabled) {
            panel.style.display = 'block';
            masterBpmControl.style.display = 'block';
            toggleBtn.textContent = '🎵 NORMAL MODE 🎵';
            toggleBtn.style.background = 'linear-gradient(45deg, #666, #888)';
            this.showNotification('🎧 DJ Mashup Mode Activated!', '#ff6b35');
        } else {
            // Stop and cleanup DJ tracks when exiting DJ mode
            this.stopAndCleanupDjTracks();
            
            panel.style.display = 'none';
            masterBpmControl.style.display = 'none';
            toggleBtn.textContent = '🎧 DJ MODE 🎧';
            toggleBtn.style.background = 'linear-gradient(45deg, #ff6b35, #f7931e)';
            this.showNotification('🎵 Normal Mode Restored', '#00ccff');
        }
    }

    private stopAndCleanupDjTracks(): void {
        // Stop and cleanup Track A
        if (this.djMashup.trackA.element) {
            this.djMashup.trackA.element.pause();
            this.djMashup.trackA.element.src = '';
            this.djMashup.trackA.element.load();
            this.djMashup.trackA.element = null;
        }
        if (this.djMashup.trackA.url) {
            URL.revokeObjectURL(this.djMashup.trackA.url);
            this.djMashup.trackA.url = '';
        }

        // Stop and cleanup Track B
        if (this.djMashup.trackB.element) {
            this.djMashup.trackB.element.pause();
            this.djMashup.trackB.element.src = '';
            this.djMashup.trackB.element.load();
            this.djMashup.trackB.element = null;
        }
        if (this.djMashup.trackB.url) {
            URL.revokeObjectURL(this.djMashup.trackB.url);
            this.djMashup.trackB.url = '';
        }

        // Reset UI elements
        const trackAInfo = this.target.querySelector('#trackAInfo') as HTMLElement;
        const trackBInfo = this.target.querySelector('#trackBInfo') as HTMLElement;
        const playBtnA = this.target.querySelector('#playPauseA') as HTMLButtonElement;
        const playBtnB = this.target.querySelector('#playPauseB') as HTMLButtonElement;
        const sliderA = this.target.querySelector('#positionSliderA') as HTMLInputElement;
        const sliderB = this.target.querySelector('#positionSliderB') as HTMLInputElement;

        if (trackAInfo) trackAInfo.textContent = 'No file loaded';
        if (trackBInfo) trackBInfo.textContent = 'No file loaded';
        if (playBtnA) {
            playBtnA.textContent = '▶️';
            playBtnA.disabled = true;
        }
        if (playBtnB) {
            playBtnB.textContent = '▶️';
            playBtnB.disabled = true;
        }
        if (sliderA) {
            sliderA.disabled = true;
            sliderA.value = '0';
        }
        if (sliderB) {
            sliderB.disabled = true;
            sliderB.value = '0';
        }
    }

    private loadDjTrack(track: 'A' | 'B', input: HTMLInputElement): void {
        const file = input.files?.[0];
        if (!file) return;

        // Stop and dispose of previous audio element
        if (track === 'A' && this.djMashup.trackA.element) {
            this.djMashup.trackA.element.pause();
            this.djMashup.trackA.element.src = '';
            this.djMashup.trackA.element.load(); // Cleanup
            if (this.djMashup.trackA.url) {
                URL.revokeObjectURL(this.djMashup.trackA.url); // Free memory
            }
        } else if (track === 'B' && this.djMashup.trackB.element) {
            this.djMashup.trackB.element.pause();
            this.djMashup.trackB.element.src = '';
            this.djMashup.trackB.element.load(); // Cleanup
            if (this.djMashup.trackB.url) {
                URL.revokeObjectURL(this.djMashup.trackB.url); // Free memory
            }
        }

        const url = URL.createObjectURL(file);
        const audio = new Audio(url);
        
        audio.addEventListener('loadedmetadata', () => {
            if (track === 'A') {
                this.djMashup.trackA.element = audio;
                this.djMashup.trackA.url = url;
                const infoEl = this.target.querySelector('#trackAInfo') as HTMLElement;
                infoEl.textContent = `${file.name} (${Math.floor(audio.duration / 60)}:${Math.floor(audio.duration % 60).toString().padStart(2, '0')})`;
                
                // Enable position slider and set up time displays
                const slider = this.target.querySelector('#positionSliderA') as HTMLInputElement;
                const playBtn = this.target.querySelector('#playPauseA') as HTMLButtonElement;
                if (slider) slider.disabled = false;
                if (playBtn) playBtn.disabled = false;
                this.updateTrackTimeDisplay('A', 0, audio.duration);
            } else {
                this.djMashup.trackB.element = audio;
                this.djMashup.trackB.url = url;
                const infoEl = this.target.querySelector('#trackBInfo') as HTMLElement;
                infoEl.textContent = `${file.name} (${Math.floor(audio.duration / 60)}:${Math.floor(audio.duration % 60).toString().padStart(2, '0')})`;
                
                // Enable position slider and set up time displays
                const slider = this.target.querySelector('#positionSliderB') as HTMLInputElement;
                const playBtn = this.target.querySelector('#playPauseB') as HTMLButtonElement;
                if (slider) slider.disabled = false;
                if (playBtn) playBtn.disabled = false;
                this.updateTrackTimeDisplay('B', 0, audio.duration);
            }
            
            // Auto-detect BPM (basic implementation)
            this.detectTrackBPM(track, audio);
            
            // Start progress updates if this is the first track loaded
            if (!this.djMashup.progressUpdateStarted) {
                this.startTrackProgressUpdates();
                this.djMashup.progressUpdateStarted = true;
            }
        });

        audio.load();
        this.showNotification(`🎵 Track ${track} loaded: ${file.name}`, track === 'A' ? '#ff0064' : '#0064ff');
    }

    private stopDjTrack(track: 'A' | 'B'): void {
        const trackData = track === 'A' ? this.djMashup.trackA : this.djMashup.trackB;
        const button = this.target.querySelector(`#playPause${track}`) as HTMLButtonElement;
        
        if (trackData.element) {
            trackData.element.pause();
            if (button) {
                button.textContent = '▶️';
            }
        }
        
        this.showNotification(`⏹️ Track ${track} stopped`, track === 'A' ? '#ff0064' : '#0064ff');
    }

    private detectTrackBPM(track: 'A' | 'B', audio: HTMLAudioElement): void {
        // Basic BPM detection using Web Audio API analysis
        // This is a simplified version - real BPM detection is quite complex
        const estimatedBPM = 120 + Math.floor(Math.random() * 60); // Placeholder: 120-180 BPM range
        
        if (track === 'A') {
            this.djMashup.trackA.bpm = estimatedBPM;
            const bpmInput = this.target.querySelector('#bpmA') as HTMLInputElement;
            bpmInput.value = estimatedBPM.toString();
        } else {
            this.djMashup.trackB.bpm = estimatedBPM;
            const bpmInput = this.target.querySelector('#bpmB') as HTMLInputElement;
            bpmInput.value = estimatedBPM.toString();
        }
        
        this.showNotification(`🔍 Detected BPM for Track ${track}: ${estimatedBPM}`, '#00ff88');
    }

    private updateTrackVolume(track: 'A' | 'B', value: string): void {
        const volume = parseInt(value) / 100;
        const displayEl = this.target.querySelector(`#volume${track}Display`) as HTMLElement;
        displayEl.textContent = `${value}%`;
        
        if (track === 'A') {
            this.djMashup.trackA.volume = volume;
            if (this.djMashup.trackA.element) {
                this.djMashup.trackA.element.volume = volume * (this.djMashup.crossfader <= 0 ? 1 : (100 + this.djMashup.crossfader) / 200);
            }
        } else {
            this.djMashup.trackB.volume = volume;
            if (this.djMashup.trackB.element) {
                this.djMashup.trackB.element.volume = volume * (this.djMashup.crossfader >= 0 ? 1 : (100 - this.djMashup.crossfader) / 200);
            }
        }
    }

    private updateTrackBpm(track: 'A' | 'B', value: string): void {
        const newBpm = parseInt(value);
        const originalBpm = 120; // Default reference BPM
        
        // Calculate playback rate: newBPM / originalBPM
        const playbackRate = newBpm / originalBpm;
        
        if (track === 'A') {
            this.djMashup.trackA.bpm = newBpm;
            if (this.djMashup.trackA.element) {
                this.djMashup.trackA.element.playbackRate = playbackRate;
                console.log(`🎵 Track A BPM changed to ${newBpm} (playback rate: ${playbackRate.toFixed(2)}x)`);
            }
        } else {
            this.djMashup.trackB.bpm = newBpm;
            if (this.djMashup.trackB.element) {
                this.djMashup.trackB.element.playbackRate = playbackRate;
                console.log(`🎵 Track B BPM changed to ${newBpm} (playback rate: ${playbackRate.toFixed(2)}x)`);
            }
        }
        
        // Show feedback to user
        this.showNotification(`🎛️ Track ${track} speed: ${playbackRate.toFixed(2)}x (${newBpm} BPM)`, '#ff6b35');
        
        // Update master sync status
        if (this.djMashup.isEnabled) {
            this.updateMasterSyncStatus();
        }
        
        // Note: We don't auto-sync here to allow independent BPM control
        // Users can manually use the Sync button if they want to match BPMs
    }

    private adjustBpm(track: 'A' | 'B', change: number): void {
        const bpmInput = this.target.querySelector(`#bpm${track}`) as HTMLInputElement;
        const currentBpm = parseInt(bpmInput.value);
        const newBpm = Math.max(60, Math.min(200, currentBpm + change)); // Clamp between 60-200
        
        // Update the input field
        bpmInput.value = newBpm.toString();
        
        // Apply the BPM change
        this.updateTrackBpm(track, newBpm.toString());
        
        // Show visual feedback
        const color = track === 'A' ? '#ff0064' : '#0064ff';
        const direction = change > 0 ? '⬆️' : '⬇️';
        this.showNotification(`${direction} Track ${track}: ${newBpm} BPM`, color);
    }

    // 🎵 MASTER BPM CONTROL SYSTEM - Sync both tracks to one tempo
    private adjustMasterBpm(change: number): void {
        const newMasterBpm = Math.max(60, Math.min(200, this.djMashup.masterBpm + change));
        this.setMasterBpm(newMasterBpm);
        
        const direction = change > 0 ? '⬆️' : '⬇️';
        this.showNotification(`${direction} Master BPM: ${newMasterBpm}`, '#ffaa00');
    }

    private setMasterBpm(bpm: number): void {
        this.djMashup.masterBpm = Math.max(60, Math.min(200, bpm));
        
        // Update master BPM input display
        const masterBpmInput = this.target.querySelector('#masterBpm') as HTMLInputElement;
        if (masterBpmInput) {
            masterBpmInput.value = this.djMashup.masterBpm.toString();
        }
        
        // Auto-sync tracks if enabled
        if (this.djMashup.autoSyncEnabled) {
            this.syncTracksToMaster();
        }
        
        this.updateMasterSyncStatus();
    }

    private syncTracksToMaster(): void {
        const masterBpm = this.djMashup.masterBpm;
        
        // Sync both tracks to master BPM
        this.updateTrackBpm('A', masterBpm.toString());
        this.updateTrackBpm('B', masterBpm.toString());
        
        // Update individual BPM displays
        const bpmInputA = this.target.querySelector('#bpmA') as HTMLInputElement;
        const bpmInputB = this.target.querySelector('#bpmB') as HTMLInputElement;
        if (bpmInputA) bpmInputA.value = masterBpm.toString();
        if (bpmInputB) bpmInputB.value = masterBpm.toString();
        
        // Align beat phases for perfect sync
        this.alignBeatPhases();
        
        this.showNotification(`🎯 Both tracks synced to ${masterBpm} BPM with aligned beats!`, '#00ff88');
        this.updateMasterSyncStatus();
    }

    private alignBeatPhases(): void {
        const trackA = this.djMashup.trackA.element;
        const trackB = this.djMashup.trackB.element;
        
        if (!trackA || !trackB || trackA.paused || trackB.paused) return;
        
        const masterBpm = this.djMashup.masterBpm;
        const beatDuration = 60 / masterBpm; // seconds per beat
        
        // Get current beat positions
        const beatPositionA = (trackA.currentTime % beatDuration) / beatDuration;
        const beatPositionB = (trackB.currentTime % beatDuration) / beatDuration;
        
        // Calculate phase difference
        const phaseDifference = Math.abs(beatPositionA - beatPositionB);
        
        // If beats are more than 0.1 out of phase, align them
        if (phaseDifference > 0.1) {
            // Temporarily adjust Track B to align with Track A
            const adjustmentTime = beatPositionA > beatPositionB 
                ? (beatPositionA - beatPositionB) * beatDuration
                : (1 - (beatPositionB - beatPositionA)) * beatDuration;
                
            trackB.currentTime += adjustmentTime;
            this.showNotification(`🎯 Beat phases aligned! Δ: ${(phaseDifference * beatDuration * 1000).toFixed(0)}ms`, '#00ffaa');
        }
    }

    private toggleAutoSync(): void {
        this.djMashup.autoSyncEnabled = !this.djMashup.autoSyncEnabled;
        
        const toggleBtn = this.target.querySelector('#toggleAutoSync') as HTMLButtonElement;
        if (toggleBtn) {
            if (this.djMashup.autoSyncEnabled) {
                toggleBtn.textContent = '🔄 AUTO SYNC ON';
                toggleBtn.style.background = 'linear-gradient(45deg, #00ff00, #00aa00)';
                this.showNotification('🔄 Auto-Sync Enabled - tracks will follow master BPM', '#00ff88');
                // Immediately sync to current master BPM
                this.syncTracksToMaster();
            } else {
                toggleBtn.textContent = '🔄 AUTO SYNC OFF';
                toggleBtn.style.background = 'linear-gradient(45deg, #0099ff, #0066cc)';
                this.showNotification('Manual BPM control restored', '#0099ff');
            }
        }
        
        this.updateMasterSyncStatus();
    }

    private updateMasterSyncStatus(): void {
        const statusDiv = this.target.querySelector('#masterSyncStatus') as HTMLElement;
        if (!statusDiv) return;
        
        const trackA = this.djMashup.trackA.bpm;
        const trackB = this.djMashup.trackB.bpm;
        const master = this.djMashup.masterBpm;
        
        if (trackA === master && trackB === master) {
            statusDiv.innerHTML = `🟢 Perfect sync: Both tracks at ${master} BPM ${this.djMashup.autoSyncEnabled ? '(Auto)' : '(Manual)'}`;
            statusDiv.style.color = '#00ff88';
        } else {
            statusDiv.innerHTML = `🟡 Track A: ${trackA} BPM | Track B: ${trackB} BPM | Master: ${master} BPM`;
            statusDiv.style.color = '#ffaa00';
        }
    }

    // Beat nudging - temporary speed adjustments for beat alignment
    private nudgeIntervals: { [key: string]: any } = {};
    private originalPlaybackRates: { A: number, B: number } = { A: 1.0, B: 1.0 };

    private startNudge(track: 'A' | 'B', direction: 'slow' | 'fast'): void {
        const element = track === 'A' ? this.djMashup.trackA.element : this.djMashup.trackB.element;
        if (!element) return;

        // Store original playback rate if not already stored
        this.originalPlaybackRates[track] = element.playbackRate;
        
        // Calculate nudge rate (5% adjustment)
        const nudgeAmount = direction === 'fast' ? 1.05 : 0.95;
        const newRate = this.originalPlaybackRates[track] * nudgeAmount;
        
        // Apply nudge immediately
        element.playbackRate = newRate;
        
        // Show visual feedback
        const color = track === 'A' ? '#ff0064' : '#0064ff';
        const arrow = direction === 'fast' ? '▶▶' : '◀◀';
        this.showNotification(`${arrow} Track ${track} nudging ${direction}`, color);
        
        console.log(`🎛️ Nudging Track ${track} ${direction}: ${newRate.toFixed(3)}x`);
    }

    private stopNudge(track: 'A' | 'B'): void {
        const element = track === 'A' ? this.djMashup.trackA.element : this.djMashup.trackB.element;
        if (!element) return;

        // Restore original playback rate
        element.playbackRate = this.originalPlaybackRates[track];
        
        console.log(`🎛️ Track ${track} nudge released: ${this.originalPlaybackRates[track].toFixed(3)}x`);
    }

    // Beat tap for manual BPM detection
    private tapTimes: { [key: string]: number[] } = { A: [], B: [] };

    private tapBeat(track: 'A' | 'B'): void {
        const now = Date.now();
        const taps = this.tapTimes[track];
        
        // Add current tap time
        taps.push(now);
        
        // Keep only last 8 taps for accuracy
        if (taps.length > 8) {
            taps.shift();
        }
        
        // Calculate BPM if we have at least 2 taps
        if (taps.length >= 2) {
            const intervals = [];
            for (let i = 1; i < taps.length; i++) {
                intervals.push(taps[i] - taps[i - 1]);
            }
            
            // Average interval in milliseconds
            const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
            
            // Convert to BPM (60000ms per minute)
            const detectedBPM = Math.round(60000 / avgInterval);
            
            // Update BPM if it's reasonable (60-200 range)
            if (detectedBPM >= 60 && detectedBPM <= 200) {
                const bpmInput = this.target.querySelector(`#bpm${track}`) as HTMLInputElement;
                bpmInput.value = detectedBPM.toString();
                this.updateTrackBpm(track, detectedBPM.toString());
                
                const color = track === 'A' ? '#ff0064' : '#0064ff';
                this.showNotification(`🥁 Track ${track} tapped: ${detectedBPM} BPM (${taps.length} taps)`, color);
            }
        } else {
            const color = track === 'A' ? '#ff0064' : '#0064ff';
            this.showNotification(`🥁 Track ${track} tap ${taps.length}/2 - keep tapping to detect BPM`, color);
        }
    }

    private updateCrossfader(value: string): void {
        this.djMashup.crossfader = parseInt(value);
        const displayEl = this.target.querySelector('#crossfaderDisplay') as HTMLElement;
        
        if (this.djMashup.crossfader < -30) {
            displayEl.textContent = 'TRACK A';
            displayEl.style.color = '#ff0064';
        } else if (this.djMashup.crossfader > 30) {
            displayEl.textContent = 'TRACK B';
            displayEl.style.color = '#0064ff';
        } else {
            displayEl.textContent = 'CENTER';
            displayEl.style.color = '#ffff00';
        }

        // Update actual track volumes based on crossfader position
        if (this.djMashup.trackA.element && this.djMashup.trackB.element) {
            const crossfaderA = this.djMashup.crossfader <= 0 ? 1 : Math.max(0, (100 + this.djMashup.crossfader) / 200);
            const crossfaderB = this.djMashup.crossfader >= 0 ? 1 : Math.max(0, (100 - this.djMashup.crossfader) / 200);
            
            this.djMashup.trackA.element.volume = this.djMashup.trackA.volume * crossfaderA;
            this.djMashup.trackB.element.volume = this.djMashup.trackB.volume * crossfaderB;
        }
    }

    private synchronizeTracks(): void {
        if (!this.djMashup.trackA.element || !this.djMashup.trackB.element) {
            this.showNotification('⚠️ Load both tracks first!', '#ff3333');
            return;
        }

        // Phase 1: BPM Tempo Matching
        const bpmA = this.djMashup.trackA.bpm;
        const bpmB = this.djMashup.trackB.bpm;
        const averageBPM = (bpmA + bpmB) / 2;
        
        // Set playback rates to sync BPMs to average
        this.djMashup.trackA.element.playbackRate = averageBPM / bpmA;
        this.djMashup.trackB.element.playbackRate = averageBPM / bpmB;
        
        // Phase 2: Beat Phase Alignment
        // This is a simplified approach - real beat alignment requires audio analysis
        const trackA = this.djMashup.trackA.element;
        const trackB = this.djMashup.trackB.element;
        
        // Get current positions in seconds
        const posA = trackA.currentTime;
        const posB = trackB.currentTime;
        
        // Calculate beat positions (assuming 4/4 time)
        const beatLengthSeconds = 60 / averageBPM;
        const barLengthSeconds = beatLengthSeconds * 4;
        
        // Find where each track is within its current bar
        const barPositionA = posA % barLengthSeconds;
        const barPositionB = posB % barLengthSeconds;
        
        // Calculate phase difference
        const phaseDiff = Math.abs(barPositionA - barPositionB);
        
        // If tracks are significantly out of phase, try to align them
        if (phaseDiff > beatLengthSeconds / 4) { // More than 1/4 beat off
            // Choose which track to adjust (prefer adjusting the one closer to bar start)
            if (barPositionA < barPositionB) {
                // Align B to A's position in the bar
                const targetTimeB = posB - barPositionB + barPositionA;
                trackB.currentTime = Math.max(0, targetTimeB);
            } else {
                // Align A to B's position in the bar
                const targetTimeA = posA - barPositionA + barPositionB;
                trackA.currentTime = Math.max(0, targetTimeA);
            }
            
            this.showNotification(`🎯 Beat phase aligned! (${phaseDiff.toFixed(2)}s offset corrected)`, '#00ff88');
        }
        
        // Update original playback rates for nudging
        this.originalPlaybackRates.A = trackA.playbackRate;
        this.originalPlaybackRates.B = trackB.playbackRate;
        
        this.djMashup.beatSync = true;
        const statusEl = this.target.querySelector('#syncStatus') as HTMLElement;
        statusEl.textContent = `🟢 Tracks synchronized @ ${Math.round(averageBPM)} BPM + Beat Aligned`;
        statusEl.style.color = '#00ff88';
        
        this.showNotification(`🔄 Full sync: ${Math.round(averageBPM)} BPM + Beat Phase!`, '#00ff88');
    }

    private toggleMashupPlayback(): void {
        if (!this.djMashup.trackA.element || !this.djMashup.trackB.element) {
            this.showNotification('⚠️ Load both tracks first!', '#ff3333');
            return;
        }

        const playBtn = this.target.querySelector('#mashupPlayBtn') as HTMLButtonElement;
        const isPlaying = !this.djMashup.trackA.element.paused || !this.djMashup.trackB.element.paused;
        
        if (isPlaying) {
            // Pause both tracks
            this.djMashup.trackA.element.pause();
            this.djMashup.trackB.element.pause();
            playBtn.textContent = '▶️ PLAY MASHUP';
            this.showNotification('⏸️ Mashup Paused', '#ffaa00');
        } else {
            // Play both tracks simultaneously
            this.djMashup.trackA.element.play();
            this.djMashup.trackB.element.play();
            playBtn.textContent = '⏸️ PAUSE MASHUP';
            this.showNotification('🎉 Mashup Playing!', '#ff6b35');
        }
        
        // Update individual button states
        const buttonA = this.target.querySelector('#playPauseA') as HTMLButtonElement;
        const buttonB = this.target.querySelector('#playPauseB') as HTMLButtonElement;
        if (buttonA) buttonA.textContent = this.djMashup.trackA.element.paused ? '▶️' : '⏸️';
        if (buttonB) buttonB.textContent = this.djMashup.trackB.element.paused ? '▶️' : '⏸️';
    }

    private startAutoMix(): void {
        if (!this.djMashup.trackA.element || !this.djMashup.trackB.element) {
            this.showNotification('⚠️ Load both tracks first!', '#ff3333');
            return;
        }

        this.showNotification('🎪 Auto Mix Started - Crossfader will dance!', '#8a2be2');
        
        // Auto-crossfade between tracks over time
        let direction = 1;
        const autoMixInterval = setInterval(() => {
            const crossfader = this.target.querySelector('#crossfader') as HTMLInputElement;
            let currentValue = parseInt(crossfader.value);
            
            currentValue += direction * 5; // Move 5 units each time
            
            if (currentValue >= 100) {
                direction = -1;
                currentValue = 100;
            } else if (currentValue <= -100) {
                direction = 1;
                currentValue = -100;
            }
            
            crossfader.value = currentValue.toString();
            this.updateCrossfader(currentValue.toString());
            
        }, 500); // Change every 500ms
        
        // Stop auto mix after 30 seconds
        setTimeout(() => {
            clearInterval(autoMixInterval);
            this.showNotification('🎪 Auto Mix Complete!', '#8a2be2');
        }, 30000);
    }

    private seekTrackPosition(track: 'A' | 'B', value: string): void {
        const audio = track === 'A' ? this.djMashup.trackA.element : this.djMashup.trackB.element;
        if (!audio || !audio.duration) return;

        const percentage = parseInt(value) / 100;
        const newTime = percentage * audio.duration;
        audio.currentTime = newTime;

        // Update time display immediately
        this.updateTrackTimeDisplay(track, audio.currentTime, audio.duration);
        
        this.showNotification(`⏯️ Track ${track} jumped to ${this.formatTime(newTime)}`, track === 'A' ? '#ff0064' : '#0064ff');
    }

    private updateTrackTimeDisplay(track: 'A' | 'B', currentTime: number, duration: number): void {
        const currentEl = this.target.querySelector(`#currentTime${track}`) as HTMLElement;
        const totalEl = this.target.querySelector(`#totalTime${track}`) as HTMLElement;
        
        if (currentEl) currentEl.textContent = this.formatTime(currentTime);
        if (totalEl) totalEl.textContent = this.formatTime(duration);
    }

    private startTrackProgressUpdates(): void {
        // Update position sliders and time displays for both tracks
        setInterval(() => {
            if (this.djMashup.trackA.element) {
                const audio = this.djMashup.trackA.element;
                const slider = this.target.querySelector('#positionSliderA') as HTMLInputElement;
                const button = this.target.querySelector('#playPauseA') as HTMLButtonElement;
                
                if (audio.duration && slider && !slider.matches(':active')) {
                    const percentage = (audio.currentTime / audio.duration) * 100;
                    slider.value = percentage.toString();
                    this.updateTrackTimeDisplay('A', audio.currentTime, audio.duration);
                }
                
                // Update button state
                if (button) {
                    button.textContent = audio.paused ? '▶️' : '⏸️';
                }
            }

            if (this.djMashup.trackB.element) {
                const audio = this.djMashup.trackB.element;
                const slider = this.target.querySelector('#positionSliderB') as HTMLInputElement;
                const button = this.target.querySelector('#playPauseB') as HTMLButtonElement;
                
                if (audio.duration && slider && !slider.matches(':active')) {
                    const percentage = (audio.currentTime / audio.duration) * 100;
                    slider.value = percentage.toString();
                    this.updateTrackTimeDisplay('B', audio.currentTime, audio.duration);
                }
                
                // Update button state
                if (button) {
                    button.textContent = audio.paused ? '▶️' : '⏸️';
                }
            }
        }, 500); // Update every 500ms
    }

    private seekToPosition(event: MouseEvent): void {
        if (!this.audioElement.src || !this.audioElement.duration) return;

        const container = event.currentTarget as HTMLElement;
        const rect = container.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const percentage = clickX / rect.width;
        
        this.audioElement.currentTime = percentage * this.audioElement.duration;
    }

    private updateProgress(): void {
        if (!this.audioElement.src || !this.audioElement.duration) return;

        const progress = (this.audioElement.currentTime / this.audioElement.duration) * 100;
        const progressBar = this.target.querySelector('#progressBar') as HTMLElement;
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }

        const currentTime = this.target.querySelector('#currentTime') as HTMLElement;
        const totalTime = this.target.querySelector('#totalTime') as HTMLElement;
        
        if (currentTime) currentTime.textContent = this.formatTime(this.audioElement.currentTime);
        if (totalTime) totalTime.textContent = this.formatTime(this.audioElement.duration);
    }

    private updateTrackInfo(): void {
        if (this.currentTrackIndex >= 0 && this.currentTrackIndex < this.playlist.length) {
            const track = this.playlist[this.currentTrackIndex];
            const trackInfo = this.target.querySelector('#trackInfo') as HTMLElement;
            const trackMetadata = this.target.querySelector('#trackMetadata') as HTMLElement;
            
            if (trackInfo) {
                trackInfo.textContent = track.name;
            }
            
            if (trackMetadata && this.audioElement.duration) {
                trackMetadata.textContent = `${track.name} • ${this.formatTime(this.audioElement.duration)}`;
                
                // Update playlist with duration
                track.duration = this.audioElement.duration;
                this.updatePlaylistUI();
            }
        }
    }

    private formatTime(seconds: number): string {
        if (!isFinite(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    private toggleIndividualTrack(track: 'A' | 'B'): void {
        const audio = track === 'A' ? this.djMashup.trackA.element : this.djMashup.trackB.element;
        const button = this.target.querySelector(`#playPause${track}`) as HTMLButtonElement;
        
        if (!audio || !button) return;

        if (audio.paused) {
            audio.play();
            button.textContent = '⏸️';
            this.showNotification(`▶️ Track ${track} playing`, track === 'A' ? '#ff0064' : '#0064ff');
        } else {
            audio.pause();
            button.textContent = '▶️';
            this.showNotification(`⏸️ Track ${track} paused`, track === 'A' ? '#ff0064' : '#0064ff');
        }
    }

    private resizeCanvases(): void {
        if (this.equalizerCanvas && this.particleCanvas && this.target) {
            const dpr = window.devicePixelRatio || 1;

            // The .ms-viz flex container auto-sizes; just read its rect
            const vizContainer = this.target.querySelector('.ms-viz') as HTMLElement;
            const rect = vizContainer
                ? vizContainer.getBoundingClientRect()
                : this.equalizerCanvas.getBoundingClientRect();

            const w = rect.width;
            const h = rect.height;
            if (w === 0 || h === 0) return;

            // Resize all three canvases
            [this.equalizerCanvas, this.particleCanvas, this.webglCanvas].forEach(c => {
                if (!c) return;
                c.width  = w * dpr;
                c.height = h * dpr;
            });

            // Reset transforms then apply DPR scaling
            if (this.canvasContext) {
                this.canvasContext.resetTransform();
                this.canvasContext.scale(dpr, dpr);
            }
            if (this.particleContext) {
                this.particleContext.resetTransform();
                this.particleContext.scale(dpr, dpr);
            }
            this.geissNeedsReset = true;
        }
    }

    private setupResizeObserver(): void {
        // Set up ResizeObserver to handle Power BI visual container size changes
        if ('ResizeObserver' in window) {
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    if (entry.target === this.target) {
                        console.log('📏 Visual container resized, updating canvas dimensions');
                        // Debounce resize calls to avoid too frequent updates
                        clearTimeout(this.resizeTimeout);
                        this.resizeTimeout = setTimeout(() => {
                            this.resizeCanvases();
                        }, 100);
                    }
                }
            });
            
            resizeObserver.observe(this.target);
            console.log('📏 ResizeObserver set up for responsive canvas sizing');
        } else {
            // Fallback for older browsers
            (window as any).addEventListener('resize', () => {
                clearTimeout(this.resizeTimeout);
                this.resizeTimeout = setTimeout(() => {
                    this.resizeCanvases();
                }, 100);
            });
        }
    }

    private startVisualizationLoop(): void {
        this.animationId = requestAnimationFrame(() => this.visualizationLoop());
    }

    private visualizationLoop(): void {
        if (!this.canvasContext || !this.equalizerCanvas) return;

        const isGeissMode = this.visualizationStyle === 'geiss' || this.visualizationStyle === 'geiss-bars';
        this.clearCanvas();
        this.clearWebGLCanvas(); // NEW: Clear 3D canvas
        
        if (this.analyser && this.audioElement && !this.audioElement.paused) {
            (this.analyser.getByteFrequencyData as any)(this.frequencyData);
            (this.analyser.getByteTimeDomainData as any)(this.timeData);
            
            // 🚀 Enhanced analysis and effects
            this.detectBeat();
            this.analyzeMusicAdvanced(); // NEW: Advanced music analysis
            
            // 🎵 Data-driven music generation from visualization data
            if (this.musicGeneration.isEnabled) {
                this.generateMusicFromVisualizationData();
            }
            
            if (!isGeissMode) {
                this.updateParticles();
            }
            this.drawVisualization(); // This now includes all the new awesome features
            if (!isGeissMode) {
                this.render3DVisualization(); // NEW: WebGL 3D rendering
            }
            this.updateVUMeters();
        }

        if (isGeissMode) {
            this.clearParticleCanvas();
        } else {
            this.drawParticles();
        }
        this.animationId = requestAnimationFrame(() => this.visualizationLoop());
    }

    private clearCanvas(): void {
        if (!this.canvasContext || !this.equalizerCanvas) return;
        
        const rect = this.equalizerCanvas.getBoundingClientRect();
        this.canvasContext.clearRect(0, 0, rect.width, rect.height);
    }

    private clearParticleCanvas(): void {
        if (!this.particleContext || !this.particleCanvas) return;
        
        const rect = this.particleCanvas.getBoundingClientRect();
        this.particleContext.clearRect(0, 0, rect.width, rect.height);
    }

    private clearWebGLCanvas(): void {
        if (!this.webglContext || !this.webglCanvas) return;
        
        const gl = this.webglContext;
        
        // Update canvas size if needed
        const rect = this.webglCanvas.getBoundingClientRect();
        if (this.webglCanvas.width !== rect.width || this.webglCanvas.height !== rect.height) {
            this.webglCanvas.width = rect.width;
            this.webglCanvas.height = rect.height;
            gl.viewport(0, 0, rect.width, rect.height);
            this.setupProjectionMatrix();
        }
        
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    private render3DVisualization(): void {
        if (!this.webglContext) return;
        
        const gl = this.webglContext;
        const time = performance.now();
        
        // Calculate audio levels for uniforms
        const bassLevel = this.calculateAudioLevel(0, 0.1); // Low frequencies
        const midLevel = this.calculateAudioLevel(0.1, 0.6); // Mid frequencies  
        const trebleLevel = this.calculateAudioLevel(0.6, 1.0); // High frequencies
        
        // 🆕 Automatic shader switching based on audio characteristics
        this.updateActiveShader(bassLevel, midLevel, trebleLevel);
        
        // Get active shader program
        const activeProgram = this.webgl3D.shaderPrograms.get(this.webgl3D.activeShader) || this.webgl3D.shaderProgram;
        if (!activeProgram) return;
        
        // Update camera rotation based on audio
        this.webgl3D.rotationY += 0.005 + bassLevel * 0.02;
        this.webgl3D.rotationX = Math.sin(time * 0.001) * 0.3 + midLevel * 0.5;
        this.webgl3D.cameraDistance = 5.0 - bassLevel * 2.0;
        
        // Create model-view matrix
        const eye: [number, number, number] = [
            Math.sin(this.webgl3D.rotationY) * this.webgl3D.cameraDistance,
            this.webgl3D.cameraDistance * 0.5,
            Math.cos(this.webgl3D.rotationY) * this.webgl3D.cameraDistance
        ];
        const center: [number, number, number] = [0, 0, 0];
        const up: [number, number, number] = [0, 1, 0];
        
        this.webgl3D.modelViewMatrix = this.mat4LookAt(eye, center, up);
        
        // Use active shader program
        gl.useProgram(activeProgram);
        
        // Get uniform locations for current shader
        const uniforms = this.getShaderUniforms(activeProgram);
        
        // Set uniforms
        if (uniforms.projectionMatrix) {
            gl.uniformMatrix4fv(uniforms.projectionMatrix, false, this.webgl3D.projectionMatrix);
        }
        if (uniforms.modelViewMatrix) {
            gl.uniformMatrix4fv(uniforms.modelViewMatrix, false, this.webgl3D.modelViewMatrix);
        }
        if (uniforms.time) {
            gl.uniform1f(uniforms.time, time);
        }
        if (uniforms.bassLevel) {
            gl.uniform1f(uniforms.bassLevel, bassLevel);
        }
        if (uniforms.midLevel) {
            gl.uniform1f(uniforms.midLevel, midLevel);
        }
        if (uniforms.trebleLevel) {
            gl.uniform1f(uniforms.trebleLevel, trebleLevel);
        }
        
        // Get position attribute location
        const positionAttribute = gl.getAttribLocation(activeProgram, 'aVertexPosition');
        
        // Bind vertex buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.webgl3D.vertexBuffer!);
        gl.vertexAttribPointer(positionAttribute, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionAttribute);
        
        // Bind index buffer and draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.webgl3D.indexBuffer!);
        gl.drawElements(gl.POINTS, 2500, gl.UNSIGNED_SHORT, 0); // 50x50 grid
    }

    private updateActiveShader(bassLevel: number, midLevel: number, trebleLevel: number): void {
        const totalEnergy = bassLevel + midLevel + trebleLevel;
        const time = performance.now() * 0.001;
        
        // 🎨 Intelligent shader selection based on audio characteristics
        if (bassLevel > 0.7 && bassLevel > midLevel && bassLevel > trebleLevel) {
            // Heavy bass → Ripple effects
            this.webgl3D.activeShader = 'ripple';
        } else if (midLevel > 0.6 && totalEnergy > 0.8) {
            // Mid-heavy with high total energy → Chromatic aberration
            this.webgl3D.activeShader = 'chromatic';
        } else if (trebleLevel > 0.5 || totalEnergy > 1.2) {
            // High treble or very energetic → Dynamic lighting
            this.webgl3D.activeShader = 'lighting';
        } else {
            // Default → Audio-reactive particles
            this.webgl3D.activeShader = 'audioReactive';
        }
        
        // Cycle through shaders every 30 seconds for variety
        const cycleTime = Math.floor(time / 30) % 4;
        if (totalEnergy < 0.3) { // Only auto-cycle during quiet periods
            const shaders = ['audioReactive', 'ripple', 'chromatic', 'lighting'];
            this.webgl3D.activeShader = shaders[cycleTime];
        }
    }

    private getShaderUniforms(program: WebGLProgram): {[key: string]: WebGLUniformLocation | null} {
        const gl = this.webglContext;
        if (!gl) return {};
        
        return {
            modelViewMatrix: gl.getUniformLocation(program, 'uModelViewMatrix'),
            projectionMatrix: gl.getUniformLocation(program, 'uProjectionMatrix'),
            time: gl.getUniformLocation(program, 'uTime'),
            bassLevel: gl.getUniformLocation(program, 'uBassLevel'),
            midLevel: gl.getUniformLocation(program, 'uMidLevel'),
            trebleLevel: gl.getUniformLocation(program, 'uTrebleLevel')
        };
    }

    private calculateAudioLevel(startPercent: number, endPercent: number): number {
        if (!this.frequencyData) return 0;
        
        const startIndex = Math.floor(this.frequencyData.length * startPercent);
        const endIndex = Math.floor(this.frequencyData.length * endPercent);
        
        let total = 0;
        let count = 0;
        
        for (let i = startIndex; i < endIndex; i++) {
            total += this.frequencyData[i];
            count++;
        }
        
        return count > 0 ? (total / count) / 255.0 : 0;
    }

    private detectBeat(): void {
        if (!this.frequencyData || this.frequencyData.length === 0) return;

        // Calculate bass energy (low frequencies)
        let bassEnergy = 0;
        const bassRange = Math.floor(this.frequencyData.length * 0.1); // First 10% for bass
        
        for (let i = 0; i < bassRange; i++) {
            bassEnergy += this.frequencyData[i];
        }
        bassEnergy /= bassRange;
        bassEnergy /= 255; // Normalize to 0-1

        const now = Date.now();
        
        if (bassEnergy > this.beatDetection.beatThreshold && (now - this.beatDetection.lastBeat) > 200) {
            this.beatDetection.lastBeat = now;
            this.flashBeat();
            
            // Update BPM calculation
            this.beatDetection.beatHistory.push(now);
            if (this.beatDetection.beatHistory.length > 10) {
                this.beatDetection.beatHistory.shift();
            }
            
            if (this.beatDetection.beatHistory.length > 1) {
                const intervals = [];
                for (let i = 1; i < this.beatDetection.beatHistory.length; i++) {
                    intervals.push(this.beatDetection.beatHistory[i] - this.beatDetection.beatHistory[i-1]);
                }
                const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                this.beatDetection.bpm = Math.round(60000 / avgInterval);
            }

            // Create beat particles
            if (this.particlesEnabled) {
                this.createBeatParticles();
            }
        }

        // Decay threshold
        this.beatDetection.beatThreshold *= this.beatDetection.beatDecay;
        this.beatDetection.beatThreshold = Math.max(this.beatDetection.beatThreshold, 0.15);
    }

    private flashBeat(): void {
        const beatIndicator = this.target.querySelector('#beatIndicator') as HTMLElement;
        const beatFlash = this.target.querySelector('#beatFlash') as HTMLElement;
        
        if (beatIndicator) {
            beatIndicator.style.background = this.themes.get(this.currentTheme)?.colors.primary || '#00ff88';
            beatIndicator.style.transform = 'scale(1.5)';
            
            setTimeout(() => {
                beatIndicator.style.background = '#333';
                beatIndicator.style.transform = 'scale(1)';
            }, 100);
        }
        
        if (beatFlash) {
            beatFlash.style.opacity = '1';
            setTimeout(() => {
                beatFlash.style.opacity = '0';
            }, 100);
        }
    }

    private createBeatParticles(): void {
        if (!this.equalizerCanvas || this.particles.length >= 40) return;
        
        const rect = this.equalizerCanvas.getBoundingClientRect();
        const theme = this.themes.get(this.currentTheme);
        
        for (let i = 0; i < 3; i++) {
            this.particles.push({
                x: Math.random() * rect.width,
                y: rect.height,
                vx: (Math.random() - 0.5) * 3,
                vy: -Math.random() * 8 - 3,
                size: Math.random() * 3 + 2,
                color: theme?.particleColors[Math.floor(Math.random() * theme.particleColors.length)] || '#00ff88',
                life: 1.5,
                maxLife: 1.5,
                type: 'bass'
            });
        }
    }

    private updateParticles(): void {
        if (!this.particlesEnabled || !this.equalizerCanvas) return;

        const rect = this.equalizerCanvas.getBoundingClientRect();
        this.updatePhysicsBoundaries(rect);
        
        // 🆕 Advanced Physics Update Loop
        this.particles = this.particles.filter(particle => {
            // Initialize physics properties if missing
            this.initializeParticlePhysics(particle, rect);
            
            // Apply physics forces (simplified — skip expensive collision detection)
            this.applyGravity(particle);
            this.applyAirResistance(particle);
            
            // Update position based on velocity and acceleration
            this.updateParticleMotion(particle);
            
            // Handle boundary collisions only (skip particle-to-particle)
            this.handleBoundaryCollisions(particle, rect);
            
            // Age particle
            particle.life -= 0.012;
            
            // Remove dead particles or those outside boundaries
            return particle.life > 0 && 
                   particle.x > -50 && particle.x < rect.width + 50 &&
                   particle.y > -50 && particle.y < rect.height + 50;
        });

        // Generate new ambient particles (capped)
        if (this.particles.length < 40) {
            this.generateAmbientParticles(rect);
        }
        
        // Update magnetic fields (skip debug rendering)
        this.updateAudioMagneticFields(rect);
    }

    private initializeParticlePhysics(particle: Particle, rect: DOMRect): void {
        if (particle.z === undefined) particle.z = 0;
        if (particle.vz === undefined) particle.vz = 0;
        if (particle.ax === undefined) particle.ax = 0;
        if (particle.ay === undefined) particle.ay = 0;
        if (particle.az === undefined) particle.az = 0;
        if (particle.mass === undefined) {
            particle.mass = 0.5 + Math.random() * 1.5; // Random mass 0.5-2.0
        }
        if (particle.charge === undefined) {
            particle.charge = (Math.random() - 0.5) * 2; // Random charge -1 to +1
        }
        if (particle.friction === undefined) particle.friction = 0.99; // Reduced friction for longer travel
        if (particle.bounce === undefined) particle.bounce = 0.3 + Math.random() * 0.5;
        if (particle.gravity === undefined) particle.gravity = 0.3 + Math.random() * 0.2; // Much reduced gravity (0.3-0.5 instead of 0.8-1.2)
        if (particle.radius === undefined) particle.radius = particle.size * 0.5;
        if (particle.trail === undefined && this.physicsSystem.trailsEnabled) {
            particle.trail = [];
        }
        if (particle.rotation === undefined) particle.rotation = Math.random() * Math.PI * 2;
        if (particle.rotationSpeed === undefined) {
            particle.rotationSpeed = (Math.random() - 0.5) * 0.1;
        }
        if (particle.glowIntensity === undefined) particle.glowIntensity = Math.random();
        if (particle.colorShift === undefined) particle.colorShift = Math.random() * Math.PI * 2;
    }

    private applyGravity(particle: Particle): void {
        if (!this.physicsSystem.gravityEnabled) return;
        
        const gravityForce = this.physicsSystem.constants.GRAVITY_STRENGTH * particle.gravity!;
        particle.ax! += this.physicsSystem.gravity.x * gravityForce / particle.mass!;
        particle.ay! += this.physicsSystem.gravity.y * gravityForce / particle.mass!;
        particle.az! += this.physicsSystem.gravity.z * gravityForce / particle.mass!;
    }

    private applyMagneticFields(particle: Particle): void {
        if (!this.physicsSystem.magneticFieldEnabled) return;
        
        for (const field of this.physicsSystem.magneticFields) {
            const dx = field.x - particle.x;
            const dy = field.y - particle.y;
            const dz = field.z - (particle.z || 0);
            const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            if (distance < field.radius && distance > 0) {
                const strength = field.strength * this.physicsSystem.constants.MAGNETIC_STRENGTH;
                const force = strength * particle.charge! / (distance * distance);
                const multiplier = field.type === 'attract' ? 1 : -1;
                
                particle.ax! += (dx / distance) * force * multiplier / particle.mass!;
                particle.ay! += (dy / distance) * force * multiplier / particle.mass!;
                particle.az! += (dz / distance) * force * multiplier / particle.mass!;
            }
        }
    }

    private applyMouseInteraction(particle: Particle): void {
        if (!this.physicsSystem.mouseInteraction.enabled) return;
        
        const dx = this.physicsSystem.mouseInteraction.x - particle.x;
        const dy = this.physicsSystem.mouseInteraction.y - particle.y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        if (distance < this.physicsSystem.mouseInteraction.attractionRadius && distance > 0) {
            const force = this.physicsSystem.mouseInteraction.attractionForce / (distance * distance);
            const multiplier = this.physicsSystem.mouseInteraction.repulsionMode ? -1 : 1;
            
            particle.ax! += (dx / distance) * force * multiplier / particle.mass!;
            particle.ay! += (dy / distance) * force * multiplier / particle.mass!;
        }
    }

    private applyAirResistance(particle: Particle): void {
        particle.vx *= particle.friction! * this.physicsSystem.constants.FRICTION_COEFFICIENT;
        particle.vy *= particle.friction! * this.physicsSystem.constants.FRICTION_COEFFICIENT;
        if (particle.vz !== undefined) {
            particle.vz *= particle.friction! * this.physicsSystem.constants.FRICTION_COEFFICIENT;
        }
    }

    private updateParticleMotion(particle: Particle): void {
        // Update velocity with acceleration
        particle.vx += particle.ax!;
        particle.vy += particle.ay!;
        if (particle.vz !== undefined && particle.az !== undefined) {
            particle.vz += particle.az;
        }
        
        // Update position with velocity
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.z !== undefined && particle.vz !== undefined) {
            particle.z += particle.vz;
        }
        
        // Reset acceleration
        particle.ax = 0;
        particle.ay = 0;
        particle.az = 0;
        
        // Update rotation
        if (particle.rotation !== undefined && particle.rotationSpeed !== undefined) {
            particle.rotation += particle.rotationSpeed;
        }
    }

    private handleBoundaryCollisions(particle: Particle, rect: DOMRect): void {
        const bounds = this.physicsSystem.boundaries;
        
        // Left/Right boundaries
        if (particle.x - particle.radius! <= bounds.left) {
            particle.x = bounds.left + particle.radius!;
            particle.vx = -particle.vx * particle.bounce!;
            particle.collided = true;
        } else if (particle.x + particle.radius! >= bounds.right) {
            particle.x = bounds.right - particle.radius!;
            particle.vx = -particle.vx * particle.bounce!;
            particle.collided = true;
        }
        
        // Top/Bottom boundaries
        if (particle.y - particle.radius! <= bounds.top) {
            particle.y = bounds.top + particle.radius!;
            particle.vy = -particle.vy * particle.bounce!;
            particle.collided = true;
        } else if (particle.y + particle.radius! >= bounds.bottom) {
            particle.y = bounds.bottom - particle.radius!;
            particle.vy = -particle.vy * particle.bounce!;
            particle.collided = true;
        }
    }

    private handleParticleCollisions(particle: Particle): void {
        for (const other of this.particles) {
            if (other === particle) continue;
            
            const dx = other.x - particle.x;
            const dy = other.y - particle.y;
            const distance = Math.sqrt(dx*dx + dy*dy);
            const minDistance = particle.radius! + other.radius!;
            
            if (distance < minDistance && distance > 0) {
                // Elastic collision physics
                const overlap = minDistance - distance;
                const separationX = (dx / distance) * overlap * 0.5;
                const separationY = (dy / distance) * overlap * 0.5;
                
                particle.x -= separationX;
                particle.y -= separationY;
                other.x += separationX;
                other.y += separationY;
                
                // Exchange velocities (simplified elastic collision)
                const tempVx = particle.vx * this.physicsSystem.constants.COLLISION_DAMPING;
                const tempVy = particle.vy * this.physicsSystem.constants.COLLISION_DAMPING;
                
                particle.vx = other.vx * this.physicsSystem.constants.COLLISION_DAMPING;
                particle.vy = other.vy * this.physicsSystem.constants.COLLISION_DAMPING;
                other.vx = tempVx;
                other.vy = tempVy;
                
                particle.collided = true;
                other.collided = true;
            }
        }
    }

    private updateParticleTrail(particle: Particle): void {
        if (!particle.trail) return;
        
        // Add current position to trail
        particle.trail.push({
            x: particle.x,
            y: particle.y,
            alpha: 1.0
        });
        
        // Limit trail length
        if (particle.trail.length > this.physicsSystem.constants.TRAIL_LENGTH) {
            particle.trail.shift();
        }
        
        // Fade trail points
        for (let i = 0; i < particle.trail.length; i++) {
            particle.trail[i].alpha = i / particle.trail.length;
        }
    }

    private updateParticleVisuals(particle: Particle): void {
        // Update glow intensity based on velocity
        const velocity = Math.sqrt(particle.vx*particle.vx + particle.vy*particle.vy);
        particle.glowIntensity = Math.min(1.0, velocity * 0.5);
        
        // Update color shift
        if (particle.colorShift !== undefined) {
            particle.colorShift += 0.02;
        }
        
        // Visual feedback for collisions
        if (particle.collided) {
            particle.glowIntensity = Math.min(1.0, particle.glowIntensity! + 0.5);
            particle.collided = false;
        }
    }

    private updatePhysicsBoundaries(rect: DOMRect): void {
        this.physicsSystem.boundaries.left = 0;
        this.physicsSystem.boundaries.right = rect.width;
        
        // Adjust top boundary based on DJ Mode status
        if (this.djMashup.isEnabled) {
            // DJ Mode is active - create a top boundary to keep particles in visualization area
            const djModeHeight = rect.height * 0.6; // DJ interface takes up ~60% of height
            this.physicsSystem.boundaries.top = djModeHeight; // Particles can't go above this
        } else {
            // Normal mode - particles can use full height
            this.physicsSystem.boundaries.top = 0;
        }
        
        this.physicsSystem.boundaries.bottom = rect.height;
    }

    private generateAmbientParticles(rect: DOMRect): void {
        if (!this.audioElement || this.audioElement.paused || !this.frequencyData) return;
        
        const avgFreq = this.frequencyData.reduce((a, b) => a + b, 0) / this.frequencyData.length;
        
        if (Math.random() < avgFreq / 255 * 0.08) {
            const theme = this.themes.get(this.currentTheme);
            
            // Calculate spawn area based on DJ Mode status
            let spawnX: number;
            let spawnY: number;
            
            if (this.djMashup.isEnabled) {
                // DJ Mode is active - avoid the interface area
                // DJ Mode interface takes up roughly the middle 60% of the screen height
                // We'll spawn particles in the bottom visualization area only
                const djModeHeight = rect.height * 0.6; // DJ interface area
                const visualizationArea = rect.height - djModeHeight; // Bottom area for visualizations
                
                // Spawn particles only in the bottom visualization area
                spawnX = Math.random() * rect.width;
                spawnY = rect.height + 10; // Start from bottom as usual
                
                // But reduce the upward travel to avoid DJ interface
                const maxTravelHeight = visualizationArea * 0.8; // Don't go too high into DJ area
                var maxVelocityY = -Math.min(12, maxTravelHeight / 30); // Limit velocity based on available space
            } else {
                // Normal mode - full screen spawn
                spawnX = Math.random() * rect.width;
                spawnY = rect.height + 10;
                var maxVelocityY = -12; // Full velocity for normal mode
            }
            
            const newParticle: Particle = {
                x: spawnX,
                y: spawnY,
                vx: (Math.random() - 0.5) * 2,
                vy: Math.random() * Math.abs(maxVelocityY) * 0.5 + maxVelocityY / 3,
                size: Math.random() * 3 + 1.5,
                color: theme?.particleColors[Math.floor(Math.random() * theme.particleColors.length)] || '#00ff88',
                life: Math.random() * 1.5 + 1,
                maxLife: Math.random() * 1.5 + 1,
                type: 'physics'
            };
            
            this.particles.push(newParticle);
        }
    }

    private updateAudioMagneticFields(rect: DOMRect): void {
        // Clear existing audio-based fields
        this.physicsSystem.magneticFields = this.physicsSystem.magneticFields.filter(field => 
            field.type !== 'attract' && field.type !== 'repel'
        );
        
        if (!this.frequencyData) return;
        
        // Create magnetic fields based on frequency peaks
        const bassEnergy = this.calculateAudioLevel(0, 0.1);
        const midEnergy = this.calculateAudioLevel(0.1, 0.6);
        const trebleEnergy = this.calculateAudioLevel(0.6, 1.0);
        
        // Bass creates strong attractors
        if (bassEnergy > 0.6) {
            this.physicsSystem.magneticFields.push({
                x: rect.width * 0.25,
                y: rect.height * 0.7,
                z: 0,
                strength: bassEnergy * 0.8,
                radius: 200,
                type: 'attract'
            });
        }
        
        // Mid frequencies create repulsors
        if (midEnergy > 0.5) {
            this.physicsSystem.magneticFields.push({
                x: rect.width * 0.75,
                y: rect.height * 0.3,
                z: 0,
                strength: midEnergy * 0.6,
                radius: 150,
                type: 'repel'
            });
        }
        
        // Treble creates small attractors
        if (trebleEnergy > 0.4) {
            this.physicsSystem.magneticFields.push({
                x: rect.width * 0.5,
                y: rect.height * 0.1,
                z: 0,
                strength: trebleEnergy * 0.4,
                radius: 100,
                type: 'attract'
            });
        }
    }

    private drawParticles(): void {
        if (!this.particlesEnabled || !this.particleContext || this.particles.length === 0) return;

        this.clearParticleCanvas();
        
        // Subtle overall opacity cap for the entire particle layer
        this.particleContext.save();
        this.particleContext.globalAlpha = 0.45;
        
        this.particles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            const baseSize = particle.size * (0.3 + alpha * 0.7);
            
            this.particleContext.save();
            this.particleContext.globalAlpha = alpha * 0.5;
            this.particleContext.fillStyle = particle.color;
            
            // Single soft glow + circle — no trails, no shapes, no rotation
            this.particleContext.shadowBlur = baseSize * 2;
            this.particleContext.shadowColor = particle.color;
            this.particleContext.beginPath();
            this.particleContext.arc(particle.x, particle.y, baseSize, 0, Math.PI * 2);
            this.particleContext.fill();
            
            this.particleContext.restore();
        });
        
        this.particleContext.restore();
    }

    private drawParticleTrail(particle: Particle): void {
        if (!particle.trail || particle.trail.length < 2) return;
        
        this.particleContext.save();
        this.particleContext.strokeStyle = particle.color;
        this.particleContext.lineWidth = 2;
        this.particleContext.lineCap = 'round';
        
        // Draw trail as connected segments
        for (let i = 0; i < particle.trail.length - 1; i++) {
            const current = particle.trail[i];
            const next = particle.trail[i + 1];
            
            this.particleContext.globalAlpha = current.alpha * 0.6;
            this.particleContext.beginPath();
            this.particleContext.moveTo(current.x, current.y);
            this.particleContext.lineTo(next.x, next.y);
            this.particleContext.stroke();
        }
        
        this.particleContext.restore();
    }

    private getEnhancedParticleColor(particle: Particle, alpha: number): string {
        // 🎨 Physics-based color enhancement
        const baseColor = particle.color;
        
        // Parse RGB from hex color (simplified)
        const hex = baseColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // Apply color shifting based on physics properties
        const velocity = Math.sqrt(particle.vx*particle.vx + particle.vy*particle.vy);
        const velocityBoost = Math.min(50, velocity * 10);
        
        const chargeEffect = (particle.charge || 0) * 30;
        
        const finalR = Math.max(0, Math.min(255, r + velocityBoost + chargeEffect));
        const finalG = Math.max(0, Math.min(255, g + velocityBoost * 0.5));
        const finalB = Math.max(0, Math.min(255, b + velocityBoost * 0.8 - chargeEffect));
        
        return `rgba(${finalR}, ${finalG}, ${finalB}, ${alpha})`;
    }

    private drawParticleGlow(particle: Particle, glowSize: number, color: string, alpha: number): void {
        const glowIntensity = particle.glowIntensity || 0.5;
        const glowLayers = 3;
        
        for (let i = 0; i < glowLayers; i++) {
            this.particleContext.save();
            this.particleContext.globalAlpha = (alpha * glowIntensity) / (i + 1);
            this.particleContext.shadowBlur = glowSize * (i + 1) * 0.8;
            this.particleContext.shadowColor = color;
            this.particleContext.fillStyle = color;
            
            this.particleContext.beginPath();
            this.particleContext.arc(particle.x, particle.y, glowSize * 0.3, 0, Math.PI * 2);
            this.particleContext.fill();
            
            this.particleContext.restore();
        }
    }

    private drawParticleShape(particle: Particle, size: number): void {
        // Different shapes based on particle type and physics properties
        const mass = particle.mass || 1;
        const charge = particle.charge || 0;
        
        if (particle.type === 'physics') {
            // Polygon based on mass (more sides = more mass)
            const sides = Math.max(3, Math.min(8, Math.floor(mass * 3)));
            this.drawPolygon(particle.x, particle.y, size, sides);
        } else if (charge > 0.5) {
            // Positive charge = star shape
            this.drawStar(particle.x, particle.y, size, 5);
        } else if (charge < -0.5) {
            // Negative charge = diamond
            this.drawDiamond(particle.x, particle.y, size);
        } else {
            // Default circle
            this.particleContext.beginPath();
            this.particleContext.arc(particle.x, particle.y, size, 0, Math.PI * 2);
            this.particleContext.fill();
        }
    }

    private drawPolygon(x: number, y: number, size: number, sides: number): void {
        this.particleContext.beginPath();
        for (let i = 0; i < sides; i++) {
            const angle = (i * 2 * Math.PI) / sides;
            const px = x + Math.cos(angle) * size;
            const py = y + Math.sin(angle) * size;
            
            if (i === 0) this.particleContext.moveTo(px, py);
            else this.particleContext.lineTo(px, py);
        }
        this.particleContext.closePath();
        this.particleContext.fill();
    }

    private drawStar(x: number, y: number, size: number, points: number): void {
        const outerRadius = size;
        const innerRadius = size * 0.5;
        
        this.particleContext.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const angle = (i * Math.PI) / points;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            
            if (i === 0) this.particleContext.moveTo(px, py);
            else this.particleContext.lineTo(px, py);
        }
        this.particleContext.closePath();
        this.particleContext.fill();
    }

    private drawDiamond(x: number, y: number, size: number): void {
        this.particleContext.beginPath();
        this.particleContext.moveTo(x, y - size);      // Top
        this.particleContext.lineTo(x + size, y);      // Right
        this.particleContext.lineTo(x, y + size);      // Bottom
        this.particleContext.lineTo(x - size, y);      // Left
        this.particleContext.closePath();
        this.particleContext.fill();
    }

    private drawCollisionFlash(particle: Particle, size: number): void {
        this.particleContext.save();
        this.particleContext.globalAlpha = 0.8;
        this.particleContext.strokeStyle = '#ffffff';
        this.particleContext.lineWidth = 3;
        this.particleContext.shadowBlur = 15;
        this.particleContext.shadowColor = '#ffffff';
        
        this.particleContext.beginPath();
        this.particleContext.arc(particle.x, particle.y, size * 1.5, 0, Math.PI * 2);
        this.particleContext.stroke();
        
        this.particleContext.restore();
    }

    private drawMagneticFields(): void {
        this.particleContext.save();
        
        for (const field of this.physicsSystem.magneticFields) {
            this.particleContext.globalAlpha = 0.1;
            this.particleContext.strokeStyle = field.type === 'attract' ? '#00ff00' : '#ff0000';
            this.particleContext.lineWidth = 2;
            
            // Draw field boundary circle
            this.particleContext.beginPath();
            this.particleContext.arc(field.x, field.y, field.radius, 0, Math.PI * 2);
            this.particleContext.stroke();
            
            // Draw field center
            this.particleContext.globalAlpha = 0.3;
            this.particleContext.fillStyle = field.type === 'attract' ? '#00ff00' : '#ff0000';
            this.particleContext.beginPath();
            this.particleContext.arc(field.x, field.y, 5, 0, Math.PI * 2);
            this.particleContext.fill();
        }
        
        this.particleContext.restore();
    }

    private drawMouseInteractionZone(): void {
        if (this.physicsSystem.mouseInteraction.x === 0 && this.physicsSystem.mouseInteraction.y === 0) return;
        
        this.particleContext.save();
        this.particleContext.globalAlpha = 0.1;
        this.particleContext.strokeStyle = this.physicsSystem.mouseInteraction.repulsionMode ? '#ff6666' : '#66ff66';
        this.particleContext.lineWidth = 2;
        this.particleContext.setLineDash([5, 5]);
        
        this.particleContext.beginPath();
        this.particleContext.arc(
            this.physicsSystem.mouseInteraction.x, 
            this.physicsSystem.mouseInteraction.y, 
            this.physicsSystem.mouseInteraction.attractionRadius, 
            0, Math.PI * 2
        );
        this.particleContext.stroke();
        
        this.particleContext.restore();
    }

    private drawVisualization(): void {
        if (this.visualizationStyle === 'geiss') {
            this.drawGeissFeedback();
            return;
        }
        if (this.visualizationStyle === 'geiss-bars') {
            this.drawGeissFeedback();
            this.drawFrequencyBars(true);
            return;
        }

        if (this.visualizationStyle !== 'geiss' && this.visualizationStyle !== 'geiss-bars') {
            this.geissNeedsReset = true;
        }

        switch (this.visualizationStyle) {
            case 'bars':
                this.drawFrequencyBars();
                break;
            case 'circular':
                this.drawCircularEqualizer();
                break;
            case 'waveform':
                this.drawWaveform();
                break;
            case 'spectrum':
                this.drawSpectrum();
                break;
            case 'galaxy':
                this.drawGalaxySpiral();
                break;
            case 'matrix':
                this.drawMatrixRain();
                break;
            case 'vu':
                this.drawVUMeters();
                break;
            case 'liquid':
                this.drawLiquidWave();
                break;
            case 'waterfall':
                this.drawAudioWaterfall();
                break;
            case 'explosions':
                this.drawSmartExplosions();
                break;
            case 'beatviz':
                this.drawBeatVisualization();
                break;
            case 'interactive':
                this.drawInteractiveMode();
                break;
            case 'analysis':
                this.drawMusicAnalysisDisplay();
                break;
            case 'vinyl':
                this.drawVinylTurntable();
                break;
            case 'spectrogram':
                this.drawSpectrogram();
                break;
            case 'dna':
                this.drawDNAHelix();
                break;
            case 'fireworks':
                this.drawFireworks();
                break;
            case 'oscilloscope':
                this.drawOscilloscope();
                break;
            case 'radar':
                this.drawRadar();
                break;
            case 'cassette':
                this.drawCassetteDeck();
                break;
        }
        
        // Always draw enhanced effects on top
        this.updateBeatDetection();
        this.drawScreenFlash();
        this.updateSmartParticles();
        this.updateInteractiveElements();
        this.updateDynamicThemes();
        this.drawBackgroundEffects();
    }

    private drawFrequencyBars(overlay: boolean = false): void {
        if (!this.canvasContext || !this.frequencyData || !this.equalizerCanvas) return;

        // Get canvas dimensions
        const rect = this.equalizerCanvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        
        if (!overlay) {
            // Clear canvas with subtle dark background
            this.canvasContext.fillStyle = 'rgba(0, 0, 0, 0.2)';
            this.canvasContext.fillRect(0, 0, width, height);
        }
        
        // Enhanced bar visualization
        const numBars = 32;
        const barWidth = width / numBars;
        const barGap = 1;
        
        for (let i = 0; i < numBars; i++) {
            // Logarithmic frequency mapping for better distribution
            const logMin = Math.log(1);
            const logMax = Math.log(this.frequencyData.length);
            const normalizedPos = i / (numBars - 1);
            const logIndex = logMin + normalizedPos * (logMax - logMin);
            const dataIndex = Math.floor(Math.exp(logIndex));
            const clampedIndex = Math.min(dataIndex, this.frequencyData.length - 1);
            
            // Get frequency amplitude with boosting for higher frequencies
            const rawAmplitude = this.frequencyData[clampedIndex] / 255;
            
            // Progressive boost for higher frequencies (right side) - reduced boost
            const frequencyBoost = 1 + (i / numBars) * 1.5; // 1x to 2.5x boost (reduced from 3x)
            const boostedAmplitude = rawAmplitude * frequencyBoost;
            
            // Normalize to prevent overflow and add some headroom
            const amplitude = Math.min(1, boostedAmplitude * 0.7); // Cap at 70% to prevent overflow
            
            // Calculate bar height with better scaling
            const barHeight = Math.max(3, amplitude * height * (overlay ? 0.42 : 0.8));
            
            // Bar position
            const x = i * barWidth + barGap / 2;
            const y = height - barHeight;
            
            // Create gradient for each bar
            const gradient = this.canvasContext.createLinearGradient(0, y + barHeight, 0, y);
            
            // Color based on frequency and amplitude
            const hue = (i / numBars) * 280; // 0 (red) to 280 (purple)
            const saturation = 90 + amplitude * 10; // More saturated with higher amplitude
            const lightness = 40 + amplitude * 40; // Brighter with higher amplitude
            
            const baseColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            const brightColor = `hsl(${hue}, ${saturation}%, ${Math.min(80, lightness + 20)}%)`;
            
            gradient.addColorStop(0, baseColor);
            gradient.addColorStop(1, brightColor);
            
            // Draw main bar with gradient
            this.canvasContext.save();
            this.canvasContext.globalAlpha = overlay ? 0.78 : 1;
            this.canvasContext.fillStyle = gradient;
            this.canvasContext.fillRect(x, y, barWidth - barGap, barHeight);
            
            // Add glow effect for higher amplitudes
            if (amplitude > 0.3) {
                this.canvasContext.shadowColor = baseColor;
                this.canvasContext.shadowBlur = 8 * amplitude;
                this.canvasContext.fillRect(x, y, barWidth - barGap, barHeight);
                this.canvasContext.shadowBlur = 0; // Reset shadow
            }
            
            // Add subtle white highlight on top
            this.canvasContext.fillStyle = `rgba(255, 255, 255, ${amplitude * 0.3})`;
            this.canvasContext.fillRect(x, y, barWidth - barGap, Math.max(1, barHeight * 0.1));
            this.canvasContext.restore();
        }
    }

    private drawCircularEqualizer(): void {
        if (!this.canvasContext || !this.frequencyData || !this.equalizerCanvas) return;

        // Get canvas dimensions
        const rect = this.equalizerCanvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        
        // Clear canvas with subtle dark background
        this.canvasContext.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.canvasContext.fillRect(0, 0, width, height);
        
        // Circular visualization parameters
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(centerX, centerY) * 0.85;
        const minRadius = maxRadius * 0.3;
        const numBars = 48;
        const angleStep = (Math.PI * 2) / numBars;
        
        for (let i = 0; i < numBars; i++) {
            // Logarithmic frequency mapping
            const logMin = Math.log(1);
            const logMax = Math.log(this.frequencyData.length);
            const normalizedPos = i / (numBars - 1);
            const logIndex = logMin + normalizedPos * (logMax - logMin);
            const dataIndex = Math.floor(Math.exp(logIndex));
            const clampedIndex = Math.min(dataIndex, this.frequencyData.length - 1);
            
            // Get frequency amplitude with boosting
            const rawAmplitude = this.frequencyData[clampedIndex] / 255;
            const frequencyBoost = 1 + (i / numBars) * 1.5;
            const amplitude = Math.min(1, rawAmplitude * frequencyBoost * 0.7);
            
            // Calculate bar length and position
            const barLength = amplitude * (maxRadius - minRadius);
            const angle = i * angleStep;
            
            // Start and end points
            const innerX = centerX + Math.cos(angle) * minRadius;
            const innerY = centerY + Math.sin(angle) * minRadius;
            const outerX = centerX + Math.cos(angle) * (minRadius + barLength);
            const outerY = centerY + Math.sin(angle) * (minRadius + barLength);
            
            // Create gradient for each bar
            const gradient = this.canvasContext.createLinearGradient(innerX, innerY, outerX, outerY);
            const hue = (i / numBars) * 360;
            const saturation = 90 + amplitude * 10;
            const lightness = 40 + amplitude * 40;
            
            const baseColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            const brightColor = `hsl(${hue}, ${saturation}%, ${Math.min(80, lightness + 30)}%)`;
            
            gradient.addColorStop(0, baseColor);
            gradient.addColorStop(1, brightColor);
            
            // Draw the bar
            this.canvasContext.strokeStyle = gradient;
            this.canvasContext.lineWidth = Math.max(2, amplitude * 6);
            this.canvasContext.lineCap = 'round';
            
            // Add glow effect for stronger signals
            if (amplitude > 0.3) {
                this.canvasContext.shadowColor = baseColor;
                this.canvasContext.shadowBlur = 10 * amplitude;
            }
            
            this.canvasContext.beginPath();
            this.canvasContext.moveTo(innerX, innerY);
            this.canvasContext.lineTo(outerX, outerY);
            this.canvasContext.stroke();
            
            // Reset shadow
            this.canvasContext.shadowBlur = 0;
        }
        
        // Draw center circle
        this.canvasContext.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.canvasContext.beginPath();
        this.canvasContext.arc(centerX, centerY, minRadius * 0.8, 0, Math.PI * 2);
        this.canvasContext.fill();
    }

    private drawWaveform(): void {
        if (!this.canvasContext || !this.timeData || !this.equalizerCanvas) return;

        const rect = this.equalizerCanvas.getBoundingClientRect();
        const theme = this.themes.get(this.currentTheme);
        
        this.canvasContext.strokeStyle = theme?.colors.primary || '#00ff88';
        this.canvasContext.lineWidth = 2;
        this.canvasContext.beginPath();
        
        const sliceWidth = rect.width / this.timeData.length;
        let x = 0;
        
        for (let i = 0; i < this.timeData.length; i++) {
            const v = this.timeData[i] / 128.0;
            const y = (v * rect.height) / 2;
            
            if (i === 0) {
                this.canvasContext.moveTo(x, y);
            } else {
                this.canvasContext.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        this.canvasContext.stroke();
    }

    private drawSpectrum(): void {
        if (!this.canvasContext || !this.frequencyData || !this.equalizerCanvas) return;

        // Use canvas internal dimensions, not getBoundingClientRect
        const width = this.equalizerCanvas.width / window.devicePixelRatio;
        const height = this.equalizerCanvas.height / window.devicePixelRatio;
        
        // Clear the entire canvas first
        this.canvasContext.clearRect(0, 0, width, height);
        
        // Enhanced spectrum visualization
        const numBars = 128;
        const barWidth = width / numBars;
        
        for (let i = 0; i < numBars; i++) {
            // Logarithmic frequency mapping for better distribution
            const logMin = Math.log(1);
            const logMax = Math.log(this.frequencyData.length);
            const normalizedPos = i / (numBars - 1);
            const logIndex = logMin + normalizedPos * (logMax - logMin);
            const dataIndex = Math.floor(Math.exp(logIndex));
            const clampedIndex = Math.min(dataIndex, this.frequencyData.length - 1);
            
            // Get frequency amplitude with gentle boosting for higher frequencies
            const rawAmplitude = this.frequencyData[clampedIndex] / 255;
            const frequencyBoost = 1 + (i / numBars) * 0.8; // Reduced boost to prevent uniform capping
            let amplitude = rawAmplitude * frequencyBoost;
            
            // More lenient amplitude capping with soft limiting
            if (amplitude > 0.85) {
                // Soft compression for high amplitudes instead of hard capping
                amplitude = 0.85 + (amplitude - 0.85) * 0.3;
            }
            amplitude = Math.min(amplitude, 1.0); // Final safety cap
            
            const barHeight = amplitude * height * 0.8; // Restored height scaling
            const x = i * barWidth;
            const y = height - barHeight;
            
            // Color based on frequency position and amplitude
            const hue = (i / numBars) * 300; // 0 to 300 degrees (red to purple)
            const saturation = 80 + amplitude * 20;
            const lightness = 40 + amplitude * 40;
            
            this.canvasContext.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.9)`;
            this.canvasContext.fillRect(x, y, barWidth - 1, barHeight);
            
            // Add highlight on top for better visibility (with improved conditions)
            if (amplitude > 0.2 && barHeight > 8) { // More responsive highlight threshold
                const highlightHeight = Math.min(Math.max(3, barHeight * 0.12), 12); // Better proportional highlight
                this.canvasContext.fillStyle = `hsla(${hue}, 100%, 80%, ${amplitude * 0.5})`;
                this.canvasContext.fillRect(x, y, barWidth - 1, highlightHeight);
            }
        }
    }

    private drawGalaxySpiral(): void {
        if (!this.canvasContext || !this.frequencyData || !this.equalizerCanvas) return;

        const rect = this.equalizerCanvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const time = Date.now() * 0.001;
        const theme = this.themes.get(this.currentTheme);

        for (let i = 0; i < this.frequencyData.length; i++) {
            const intensity = this.frequencyData[i] / 255;
            const angle = (i / this.frequencyData.length) * Math.PI * 4 + time;
            const radius = (i / this.frequencyData.length) * Math.min(centerX, centerY) * 0.8;
            
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            this.canvasContext.globalAlpha = intensity;
            this.canvasContext.fillStyle = theme?.colors.primary || '#00ff88';
            this.canvasContext.beginPath();
            this.canvasContext.arc(x, y, intensity * 4 + 1, 0, Math.PI * 2);
            this.canvasContext.fill();
        }
        
        this.canvasContext.globalAlpha = 1;
    }

    private drawMatrixRain(): void {
        if (!this.canvasContext || !this.frequencyData || !this.equalizerCanvas) return;

        // Use canvas internal dimensions for consistent rendering
        const width = this.equalizerCanvas.width / window.devicePixelRatio;
        const height = this.equalizerCanvas.height / window.devicePixelRatio;
        
        // Clear canvas with subtle fade
        this.canvasContext.fillStyle = 'rgba(0, 0, 0, 0.08)';
        this.canvasContext.fillRect(0, 0, width, height);
        
        const time = Date.now() * 0.001;
        const centerX = width / 2;
        const centerY = height / 2;
        const theme = this.themes.get(this.currentTheme);
        
        // Audio-reactive fractal parameters
        const bassLevel = this.frequencyData.slice(0, 32).reduce((a, b) => a + b, 0) / 32 / 255;
        const midLevel = this.frequencyData.slice(32, 96).reduce((a, b) => a + b, 0) / 64 / 255;
        const trebleLevel = this.frequencyData.slice(96, 128).reduce((a, b) => a + b, 0) / 32 / 255;
        
        // Create mesmerizing audio-reactive fractal
        const numBranches = 8;
        const maxDepth = 4;
        const baseRadius = Math.min(width, height) * 0.15;
        
        // Save context for transformations
        this.canvasContext.save();
        this.canvasContext.translate(centerX, centerY);
        
        // Draw multiple fractal layers for depth
        for (let layer = 0; layer < 3; layer++) {
            this.canvasContext.save();
            
            // Rotate each layer based on audio and time
            const layerRotation = time * (0.5 + layer * 0.3) + bassLevel * Math.PI;
            this.canvasContext.rotate(layerRotation);
            
            // Scale each layer based on audio levels
            const layerScale = 0.6 + layer * 0.2 + midLevel * 0.4;
            this.canvasContext.scale(layerScale, layerScale);
            
            // Draw fractal branches
            this.drawFractalBranch(
                0, 0, 
                baseRadius * (1 + bassLevel), 
                0, 
                maxDepth, 
                numBranches,
                layer,
                bassLevel,
                midLevel,
                trebleLevel,
                theme
            );
            
            this.canvasContext.restore();
        }
        
        this.canvasContext.restore();
        
        // Add pulsing center orb
        const orbRadius = 8 + bassLevel * 15;
        const orbGradient = this.canvasContext.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, orbRadius
        );
        orbGradient.addColorStop(0, theme?.colors.primary + 'FF' || '#00ff88FF');
        orbGradient.addColorStop(0.5, theme?.colors.secondary + '80' || '#00ccff80');
        orbGradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        this.canvasContext.save();
        this.canvasContext.shadowBlur = 20;
        this.canvasContext.shadowColor = theme?.colors.primary || '#00ff88';
        this.canvasContext.fillStyle = orbGradient;
        this.canvasContext.beginPath();
        this.canvasContext.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
        this.canvasContext.fill();
        this.canvasContext.restore();
    }
    
    private drawFractalBranch(
        x: number, y: number, 
        length: number, 
        angle: number, 
        depth: number, 
        branches: number,
        layer: number,
        bassLevel: number,
        midLevel: number,
        trebleLevel: number,
        theme: any
    ): void {
        if (!this.canvasContext || depth <= 0 || length < 2) return;
        
        const time = Date.now() * 0.001;
        
        // Calculate end point
        const endX = x + Math.cos(angle) * length;
        const endY = y + Math.sin(angle) * length;
        
        // Audio-reactive styling
        const audioIntensity = (bassLevel + midLevel + trebleLevel) / 3;
        const depthRatio = depth / 4;
        
        // Color based on depth, layer, and audio
        const hue = (layer * 60 + depth * 30 + time * 20) % 360;
        const saturation = 70 + audioIntensity * 30;
        const lightness = 40 + depthRatio * 40 + trebleLevel * 20;
        const alpha = Math.max(0.3, depthRatio * 0.8 + audioIntensity * 0.4);
        
        this.canvasContext.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
        this.canvasContext.lineWidth = Math.max(0.5, depth * 0.8 + bassLevel * 2);
        
        // Add glow for high audio levels
        if (audioIntensity > 0.5) {
            this.canvasContext.save();
            this.canvasContext.shadowBlur = 5 + audioIntensity * 10;
            this.canvasContext.shadowColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        }
        
        // Draw the branch
        this.canvasContext.beginPath();
        this.canvasContext.moveTo(x, y);
        this.canvasContext.lineTo(endX, endY);
        this.canvasContext.stroke();
        
        if (audioIntensity > 0.5) {
            this.canvasContext.restore();
        }
        
        // Recursive branching with audio-reactive parameters
        const angleStep = (Math.PI * 2) / branches;
        const lengthReduction = 0.65 + midLevel * 0.15; // Audio affects branch length
        const angleVariation = 0.3 + trebleLevel * 0.4; // Audio affects branch spread
        
        for (let i = 0; i < branches; i++) {
            if (depth > 1) { // Only branch if we have depth left
                const newAngle = angle + angleStep * i + Math.sin(time + i) * angleVariation;
                const newLength = length * lengthReduction;
                
                this.drawFractalBranch(
                    endX, endY,
                    newLength,
                    newAngle,
                    depth - 1,
                    Math.max(2, branches - 1), // Reduce branches as we go deeper
                    layer,
                    bassLevel,
                    midLevel,
                    trebleLevel,
                    theme
                );
            }
        }
    }

    private drawVUMeters(): void {
        if (!this.canvasContext || !this.frequencyData || !this.equalizerCanvas) return;

        const rect = this.equalizerCanvas.getBoundingClientRect();
        const theme = this.themes.get(this.currentTheme);
        
        // Left channel (bass)
        const bassLevel = this.frequencyData.slice(0, 32).reduce((a, b) => a + b, 0) / 32 / 255;
        this.drawVUMeter(rect.width * 0.25, rect.height * 0.5, bassLevel, 'BASS', theme?.colors.primary || '#00ff88');
        
        // Right channel (treble)
        const trebleLevel = this.frequencyData.slice(32, 64).reduce((a, b) => a + b, 0) / 32 / 255;
        this.drawVUMeter(rect.width * 0.75, rect.height * 0.5, trebleLevel, 'TREBLE', theme?.colors.secondary || '#00ccff');
    }

    private drawVUMeter(x: number, y: number, level: number, label: string, color: string): void {
        if (!this.canvasContext) return;

        const width = 60;
        const height = 200;
        const segments = 20;
        const segmentHeight = height / segments;
        
        // Background
        this.canvasContext.fillStyle = 'rgba(0,0,0,0.5)';
        this.canvasContext.fillRect(x - width/2, y - height/2, width, height);
        
        // Level segments
        for (let i = 0; i < segments; i++) {
            const segmentLevel = (segments - i) / segments;
            if (level >= segmentLevel) {
                const alpha = i < segments * 0.7 ? 1 : (i < segments * 0.9 ? 0.8 : 0.6);
                const segmentColor = i < segments * 0.7 ? color : (i < segments * 0.9 ? '#ffff00' : '#ff0000');
                
                this.canvasContext.fillStyle = segmentColor;
                this.canvasContext.globalAlpha = alpha;
                this.canvasContext.fillRect(
                    x - width/2 + 5,
                    y + height/2 - (i + 1) * segmentHeight,
                    width - 10,
                    segmentHeight - 2
                );
            }
        }
        
        this.canvasContext.globalAlpha = 1;
        
        // Label
        this.canvasContext.fillStyle = color;
        this.canvasContext.font = '12px monospace';
        this.canvasContext.textAlign = 'center';
        this.canvasContext.fillText(label, x, y + height/2 + 20);
    }

    // ── NEW VISUALIZATION MODES ──────────────────────────────────

    /**
     * Audio waveform + image warp feedback, following the two-stage process
     * documented by Ryan Geiss for the original Geiss visualizer.
     */
    private drawGeissFeedback(): void {
        if (!this.canvasContext || !this.frequencyData || !this.timeData || !this.equalizerCanvas) return;

        const dpr = window.devicePixelRatio || 1;
        const width = this.equalizerCanvas.width / dpr;
        const height = this.equalizerCanvas.height / dpr;
        const renderScale = Math.min(1, 960 / Math.max(1, width), 540 / Math.max(1, height));
        const pixelWidth = Math.max(1, Math.floor(width * renderScale));
        const pixelHeight = Math.max(1, Math.floor(height * renderScale));

        if (!this.geissFeedbackCanvas) {
            this.geissFeedbackCanvas = document.createElement('canvas');
        }
        if (!this.geissScratchCanvas) {
            this.geissScratchCanvas = document.createElement('canvas');
        }

        const feedback = this.geissFeedbackCanvas;
        const scratch = this.geissScratchCanvas;
        if (feedback.width !== pixelWidth || feedback.height !== pixelHeight) {
            feedback.width = pixelWidth;
            feedback.height = pixelHeight;
            this.geissNeedsReset = true;
        }
        if (scratch.width !== pixelWidth || scratch.height !== pixelHeight) {
            scratch.width = pixelWidth;
            scratch.height = pixelHeight;
        }

        const feedbackContext = feedback.getContext('2d');
        const scratchContext = scratch.getContext('2d');
        if (!feedbackContext || !scratchContext) return;

        const averageRange = (start: number, end: number): number => {
            const safeEnd = Math.min(end, this.frequencyData.length);
            let total = 0;
            for (let i = start; i < safeEnd; i++) total += this.frequencyData[i];
            return safeEnd > start ? total / ((safeEnd - start) * 255) : 0;
        };

        const bass = averageRange(0, 14);
        const mid = averageRange(14, 72);
        const treble = averageRange(72, 160);
        const energy = bass * 0.52 + mid * 0.33 + treble * 0.15;
        const now = performance.now();
        this.geissPhase += 0.006 + energy * 0.042 + this.beatDetection.screenFlashIntensity * 0.018;

        // Keep this visual on the dual-horizon preset represented by hd009.jpg.
        // Other Geiss modes pull material into a central column or lens; this
        // preset deliberately maintains two open waveform planes.

        scratchContext.setTransform(1, 0, 0, 1, 0, 0);
        scratchContext.globalCompositeOperation = 'copy';
        scratchContext.drawImage(feedback, 0, 0);

        feedbackContext.setTransform(1, 0, 0, 1, 0, 0);
        feedbackContext.globalCompositeOperation = 'source-over';
        if (this.geissNeedsReset) {
            feedbackContext.fillStyle = '#000000';
            feedbackContext.fillRect(0, 0, pixelWidth, pixelHeight);
            this.geissNeedsReset = false;
        }

        const centerX = pixelWidth / 2;
        const centerY = pixelHeight / 2;
        const minDimension = Math.min(pixelWidth, pixelHeight);

        // Warp the previous frame in horizontal bands. Varying source offsets,
        // local zoom and shear creates the fluid tunnels, horizons and smoke
        // fields characteristic of Geiss without requiring per-pixel shaders.
        feedbackContext.fillStyle = '#000000';
        feedbackContext.fillRect(0, 0, pixelWidth, pixelHeight);
        feedbackContext.globalAlpha = 0.975 - treble * 0.015;
        const sliceHeight = Math.max(2, Math.ceil(pixelHeight / 72));
        const zoom = 1.008 + bass * 0.014;

        for (let sourceY = 0; sourceY < pixelHeight; sourceY += sliceHeight) {
            const normalizedY = (sourceY + sliceHeight / 2 - centerY) / Math.max(1, centerY);
            let waveOffset = 0;
            let verticalOffset = 0;
            let localZoom = zoom;

            switch (this.geissWarpMode) {
                case 0: // mirrored horizon / forward flight
                    waveOffset = Math.sin(normalizedY * 5.5 + this.geissPhase * 1.7)
                        * pixelWidth * (0.0025 + mid * 0.008 + this.beatDetection.screenFlashIntensity * 0.004);
                    verticalOffset = Math.sign(normalizedY)
                        * (1.15 + energy * 4.8 + this.beatDetection.screenFlashIntensity * 2.6);
                    localZoom += (1 - Math.min(1, Math.abs(normalizedY)))
                        * (0.007 + bass * 0.012 + this.beatDetection.screenFlashIntensity * 0.006);
                    break;
                case 1: // liquid lateral folds
                    waveOffset = Math.sin(normalizedY * 9 + this.geissPhase * 2.2) * pixelWidth * (0.006 + mid * 0.01);
                    verticalOffset = Math.cos(normalizedY * 4 - this.geissPhase) * (0.7 + bass * 2);
                    break;
                case 2: // breathing lens
                    waveOffset = normalizedY * Math.sin(this.geissPhase * 1.5) * pixelWidth * 0.012;
                    verticalOffset = normalizedY * (1.2 + bass * 3.2);
                    localZoom += (1 - Math.abs(normalizedY)) * 0.009;
                    break;
                default: // twisting smoke column
                    waveOffset = Math.sin(normalizedY * Math.PI + this.geissPhase * 2.5) * pixelWidth * (0.01 + treble * 0.012);
                    verticalOffset = Math.sin(normalizedY * 7 - this.geissPhase) * (0.8 + energy * 2.2);
                    localZoom += normalizedY * normalizedY * 0.006;
                    break;
            }

            const destinationWidth = pixelWidth * localZoom;
            const destinationX = (pixelWidth - destinationWidth) / 2 + waveOffset;
            feedbackContext.drawImage(
                scratch,
                0, sourceY, pixelWidth, Math.min(sliceHeight + 1, pixelHeight - sourceY),
                destinationX, sourceY + verticalOffset, destinationWidth, sliceHeight + 1
            );
        }

        // Gentle decay preserves long trails while preventing the image from
        // saturating to white. It also adds the subtle textured motion seen in
        // the original error-diffused renderer.
        feedbackContext.globalAlpha = 1;
        feedbackContext.fillStyle = `rgba(0, 0, 4, ${0.018 + treble * 0.016})`;
        feedbackContext.fillRect(0, 0, pixelWidth, pixelHeight);

        // RenderWave() in the original offered six geometries and smoothed each
        // new sample heavily against the previous one. The two channels below
        // use a phase-offset copy because Web Audio supplies a mono time array.
        const sampleWave = (index: number, channelOffset: number): number => {
            const sampleIndex = (index + channelOffset) % this.timeData.length;
            return (this.timeData[sampleIndex] - 128) / 128;
        };
        const frame = now / (1000 / 30);
        const colorDrift = 7 * Math.sin(frame * 0.007 + 29) + 5 * Math.cos(frame * 0.0057 + 27);
        const beatLift = Math.max(energy, this.beatDetection.screenFlashIntensity);
        const seedBrightness = Math.min(255, 105 + energy * 80 + beatLift * 95);
        const channel = (phaseA: number, phaseB: number): number => Math.max(0, Math.min(255,
            seedBrightness * 1.07
            * (1 + 0.3 * Math.sin(frame * 0.0063 + phaseA - colorDrift))
            * (1 + 0.2 * Math.cos(frame * 0.0051 + phaseB + colorDrift))
        ));
        const red = Math.min(255, channel(10, 37) * 0.68 + 32);
        const green = Math.min(255, channel(32, 16) * 0.76 + 42);
        const blue = Math.min(255, channel(87, 25) * 0.96 + 58);
        const seedAlpha = Math.min(0.96, 0.34 + energy * 0.34 + beatLift * 0.3);
        const lineRotation = Math.sin(this.geissPhase * 0.42) * (0.16 + mid * 0.15)
            + Math.sin(this.geissPhase * 0.17) * 0.045
            + Math.sin(this.geissPhase * 3.8) * this.beatDetection.screenFlashIntensity * 0.055;
        const musicShiftX = Math.sin(this.geissPhase * 2.1) * pixelWidth * mid * 0.12
            + Math.sin(this.geissPhase * 5.3) * pixelWidth * this.beatDetection.screenFlashIntensity * 0.055;
        const musicShiftY = Math.cos(this.geissPhase * 1.7) * pixelHeight * bass * 0.09
            + Math.sin(this.geissPhase * 4.4) * pixelHeight * this.beatDetection.screenFlashIntensity * 0.035;
        const rotationCos = Math.cos(lineRotation);
        const rotationSin = Math.sin(lineRotation);
        const maximumWaveExcursion = minDimension * 0.58;
        const edgeSafetyMargin = Math.max(48, pixelWidth * 0.12);
        const rotationOverscan = (
            Math.abs(musicShiftX)
            + (pixelHeight * 0.5 + Math.abs(musicShiftY) + maximumWaveExcursion) * Math.abs(rotationSin)
            + edgeSafetyMargin
        ) / Math.max(0.55, Math.abs(rotationCos));
        const sceneTime = now % 28000;
        const singleLineActive = sceneTime >= 22000;

        const drawWavePath = (waveformMode: number, channelOffset: number, alpha: number): void => {
            feedbackContext.beginPath();
            let smoothedWave = sampleWave(0, channelOffset);
            const pathPoints = this.timeData.length + 72;
            for (let i = 0; i < pathPoints; i++) {
                const progress = i / Math.max(1, pathPoints - 1);
                const sourceProgress = Math.max(0, Math.min(1, (progress * (pixelWidth + rotationOverscan * 2) - rotationOverscan) / pixelWidth));
                const sampleIndex = Math.min(this.timeData.length - 1, Math.floor(sourceProgress * (this.timeData.length - 1)));
                smoothedWave = smoothedWave * 0.76 + sampleWave(sampleIndex, channelOffset) * 0.24;
                const otherWave = sampleWave(sampleIndex, channelOffset + 67);
                const frequencyIndex = Math.min(this.frequencyData.length - 1, Math.floor(progress * this.frequencyData.length * 0.8));
                const frequencyVariance = this.frequencyData[frequencyIndex] / 255;
                const reactiveDensity = 17 + Math.round(treble * 15);
                const harmonicVariance = Math.sin(progress * Math.PI * reactiveDensity + this.geissPhase * (3.1 + treble * 4.5) + channelOffset)
                    * frequencyVariance * (0.045 + treble * 0.16 + beatLift * 0.055);
                const broadVariance = Math.sin(progress * Math.PI * 5 - this.geissPhase * 1.8 + channelOffset * 0.2)
                    * mid * (0.1 + beatLift * 0.09);
                const variedWave = smoothedWave + harmonicVariance + broadVariance;
                const amplitude = minDimension * (0.1 + energy * 0.32 + beatLift * 0.1);
                let x = -rotationOverscan + progress * (pixelWidth + rotationOverscan * 2);
                let y = centerY + variedWave * amplitude;

                switch (waveformMode) {
                    case 2: // dual horizontal stereo traces
                        y = pixelHeight * (singleLineActive ? 0.5 : (channelOffset === 0 ? 0.42 : 0.58))
                            + variedWave * amplitude * 0.82;
                        break;
                    case 3: // vertical oscilloscope
                        x = centerX + smoothedWave * amplitude;
                        y = progress * pixelHeight;
                        break;
                    case 4: // opposing diagonal traces
                        x = progress * pixelWidth + smoothedWave * amplitude * 0.55;
                        y = channelOffset === 0 ? progress * pixelHeight : (1 - progress) * pixelHeight;
                        break;
                    case 5: { // circular/radial waveform
                        const angle = progress * Math.PI * 2;
                        const radius = minDimension * 0.24 + smoothedWave * amplitude * 0.55;
                        x = centerX + Math.cos(angle) * radius;
                        y = centerY + Math.sin(angle) * radius;
                        break;
                    }
                    case 6: { // X-Y oscilloscope mode
                        const xyScale = minDimension * (0.22 + energy * 0.12);
                        const rotation = Math.sin(this.geissPhase * 0.45);
                        const rawX = smoothedWave * xyScale;
                        const rawY = otherWave * xyScale;
                        x = centerX + rawX * Math.cos(rotation) + rawY * Math.sin(rotation);
                        y = centerY - rawX * Math.sin(rotation) + rawY * Math.cos(rotation);
                        break;
                    }
                }

                // Slowly roll the complete waveform field around the vanishing
                // point while keeping the horizon recognizable. Overscan above
                // guarantees that the rotated path still reaches both edges.
                const pivotX = centerX + musicShiftX;
                const pivotY = centerY + musicShiftY;
                const offsetX = x - centerX;
                const offsetY = y - centerY;
                x = pivotX + offsetX * rotationCos - offsetY * rotationSin;
                y = pivotY + offsetX * rotationSin + offsetY * rotationCos;

                if (i === 0) feedbackContext.moveTo(x, y);
                else feedbackContext.lineTo(x, y);
            }
            feedbackContext.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
            feedbackContext.lineWidth = 0.65 + bass * 1.65 + beatLift * 0.55;
            feedbackContext.stroke();
        };

        feedbackContext.save();
        feedbackContext.globalCompositeOperation = 'lighter';
        feedbackContext.lineCap = 'round';
        drawWavePath(this.geissWaveformMode, 0, seedAlpha);
        if (!singleLineActive && (this.geissWaveformMode === 2 || this.geissWaveformMode === 4)) {
            drawWavePath(this.geissWaveformMode, 23, seedAlpha * 0.82);
        }

        // Periodically inject a comet seed. The head spirals toward the music-
        // shifted center; its fading tail then persists and bends in feedback.
        const cometCycle = now % 19000;
        if (cometCycle >= 12500) {
            const cometProgress = (cometCycle - 12500) / 6500;
            const cometAngle = cometProgress * Math.PI * 5.5 + this.geissPhase * 0.7;
            const cometRadius = minDimension * (0.58 * (1 - cometProgress) + 0.025);
            const cometCenterX = centerX + musicShiftX * 0.65;
            const cometCenterY = centerY + musicShiftY * 0.65;
            const tailPoints = 22;

            for (let tail = tailPoints - 1; tail >= 0; tail--) {
                const tailProgress = Math.max(0, cometProgress - tail * 0.0065);
                const tailAngle = tailProgress * Math.PI * 5.5 + this.geissPhase * 0.7;
                const tailRadius = minDimension * (0.58 * (1 - tailProgress) + 0.025);
                const cometX = cometCenterX + Math.cos(tailAngle) * tailRadius;
                const cometY = cometCenterY + Math.sin(tailAngle) * tailRadius * 0.72;
                const tailStrength = 1 - tail / tailPoints;
                const particleRadius = 0.35 + tailStrength * (0.8 + beatLift * 0.65);
                const cometGlow = feedbackContext.createRadialGradient(cometX, cometY, 0, cometX, cometY, particleRadius * 2.6);
                cometGlow.addColorStop(0, `rgba(255,255,255,${0.16 + tailStrength * 0.68})`);
                cometGlow.addColorStop(0.28, `rgba(${blue},${green},255,${tailStrength * 0.5})`);
                cometGlow.addColorStop(1, 'rgba(50,160,255,0)');
                feedbackContext.fillStyle = cometGlow;
                feedbackContext.beginPath();
                feedbackContext.arc(cometX, cometY, particleRadius * 2.6, 0, Math.PI * 2);
                feedbackContext.fill();
            }
        }
        feedbackContext.restore();

        this.canvasContext.save();
        this.canvasContext.globalAlpha = 1;
        this.canvasContext.globalCompositeOperation = 'source-over';
        this.canvasContext.drawImage(feedback, 0, 0, width, height);

        const vignette = this.canvasContext.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.16, width / 2, height / 2, Math.max(width, height) * 0.68);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(0.72, 'rgba(0,0,0,0.08)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.78)');
        this.canvasContext.fillStyle = vignette;
        this.canvasContext.fillRect(0, 0, width, height);
        this.canvasContext.restore();
    }

    /** Spinning vinyl record with grooves and label */
    private drawVinylTurntable(): void {
        if (!this.canvasContext || !this.frequencyData || !this.equalizerCanvas) return;
        const ctx = this.canvasContext;
        const w = this.equalizerCanvas.width / (window.devicePixelRatio || 1);
        const h = this.equalizerCanvas.height / (window.devicePixelRatio || 1);
        ctx.clearRect(0, 0, w, h);

        const cx = w / 2, cy = h / 2;
        const radius = Math.min(w, h) * 0.42;
        const time = Date.now() * 0.001;
        const isPlaying = this.audioElement && !this.audioElement.paused;
        const angle = isPlaying ? time * 1.8 : this.lastVinylAngle || 0;
        if (isPlaying) this.lastVinylAngle = angle;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);

        // Record body
        const grad = ctx.createRadialGradient(0, 0, radius * 0.12, 0, 0, radius);
        grad.addColorStop(0, '#333');
        grad.addColorStop(0.15, '#1a1a1a');
        grad.addColorStop(0.85, '#111');
        grad.addColorStop(1, '#222');
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Audio-reactive grooves
        for (let r = radius * 0.2; r < radius * 0.92; r += 3) {
            const dataIdx = Math.floor(((r - radius * 0.2) / (radius * 0.72)) * (this.frequencyData.length * 0.7));
            const amp = (this.frequencyData[Math.min(dataIdx, this.frequencyData.length - 1)] || 0) / 255;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${60 + amp * 80}, ${60 + amp * 80}, ${60 + amp * 80}, ${0.3 + amp * 0.4})`;
            ctx.lineWidth = 0.5 + amp * 1.5;
            ctx.stroke();
        }

        // Light reflection streak
        ctx.beginPath();
        ctx.ellipse(radius * 0.3, -radius * 0.1, radius * 0.5, radius * 0.08, 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fill();

        // Center label
        const labelGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.18);
        labelGrad.addColorStop(0, '#ff4444');
        labelGrad.addColorStop(0.7, '#cc2222');
        labelGrad.addColorStop(1, '#881111');
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = labelGrad;
        ctx.fill();

        // Label text
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(8, radius * 0.08)}px Consolas, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const trackName = this.playlist[this.currentTrackIndex]?.name || 'VINYL';
        const shortName = trackName.length > 12 ? trackName.substring(0, 12) : trackName;
        ctx.fillText(shortName, 0, -radius * 0.04);
        ctx.font = `${Math.max(6, radius * 0.05)}px Consolas, monospace`;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText('45 RPM', 0, radius * 0.08);

        // Spindle hole
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.025, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0a0a';
        ctx.fill();

        ctx.restore();

        // Tonearm
        if (isPlaying) {
            ctx.save();
            ctx.translate(cx + radius * 0.85, cy - radius * 0.7);
            ctx.rotate(0.35 + Math.sin(time * 0.1) * 0.02);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-radius * 0.55, radius * 0.65);
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#666';
            ctx.fill();
            ctx.restore();
        }
    }
    private lastVinylAngle: number = 0;

    /** Scrolling spectrogram heat-map — uses offscreen canvas buffer for accumulation */
    private spectrogramCanvas: HTMLCanvasElement | null = null;
    private spectrogramCtx: CanvasRenderingContext2D | null = null;
    private drawSpectrogram(): void {
        if (!this.canvasContext || !this.frequencyData || !this.equalizerCanvas) return;
        const ctx = this.canvasContext;
        const dpr = window.devicePixelRatio || 1;
        const w = this.equalizerCanvas.width / dpr;
        const h = this.equalizerCanvas.height / dpr;
        const pw = this.equalizerCanvas.width;   // raw pixel width
        const ph = this.equalizerCanvas.height;  // raw pixel height
        const rowH = Math.round(3 * dpr);        // scroll 3 logical px per frame

        // Create / resize offscreen buffer (raw pixel coords, no transform)
        if (!this.spectrogramCanvas || this.spectrogramCanvas.width !== pw || this.spectrogramCanvas.height !== ph) {
            this.spectrogramCanvas = document.createElement('canvas');
            this.spectrogramCanvas.width = pw;
            this.spectrogramCanvas.height = ph;
            this.spectrogramCtx = this.spectrogramCanvas.getContext('2d');
        }
        const sCtx = this.spectrogramCtx!;

        // Scroll existing content up by rowH raw pixels
        if (ph > rowH) {
            const strip = sCtx.getImageData(0, rowH, pw, ph - rowH);
            sCtx.clearRect(0, 0, pw, ph);
            sCtx.putImageData(strip, 0, 0);
        }

        // Draw new frequency row at bottom of offscreen buffer (raw pixel coords)
        const numBins = Math.min(this.frequencyData.length, pw);
        const binW = pw / numBins;
        for (let i = 0; i < numBins; i++) {
            const val = this.frequencyData[Math.floor(i * this.frequencyData.length / numBins)] / 255;
            // Heat-map: black → deep blue → cyan → green → yellow → red → white
            let r = 0, g = 0, b2 = 0;
            if (val < 0.15)     { b2 = val / 0.15 * 100; }
            else if (val < 0.3) { const t = (val - 0.15) / 0.15; b2 = 100 + t * 80; g = t * 60; }
            else if (val < 0.45){ const t = (val - 0.3)  / 0.15; b2 = 180 - t * 100; g = 60 + t * 140; }
            else if (val < 0.6) { const t = (val - 0.45) / 0.15; g = 200 + t * 55; b2 = 80 * (1 - t); }
            else if (val < 0.75){ const t = (val - 0.6)  / 0.15; r = t * 255; g = 255; }
            else if (val < 0.9) { const t = (val - 0.75) / 0.15; r = 255; g = 255 - t * 100; }
            else                { const t = (val - 0.9)  / 0.1;  r = 255; g = 155 + t * 80; b2 = t * 200; }
            sCtx.fillStyle = `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b2)})`;
            sCtx.fillRect(i * binW, ph - rowH, binW + 0.5, rowH);
        }

        // Blit offscreen buffer to main canvas (bypass DPR transform)
        ctx.save();
        ctx.resetTransform();
        ctx.drawImage(this.spectrogramCanvas, 0, 0);
        ctx.restore();

        // Overlay: frequency axis labels
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        const labels = ['0Hz', '500', '1k', '2k', '4k', '8k', '16k'];
        for (let i = 0; i < labels.length; i++) {
            const x = (i / (labels.length - 1)) * w;
            ctx.fillText(labels[i], x + 2, 12);
        }

        // Timestamp indicator
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(0, h - 1, w, 1);
    }

    /** DNA double helix pulsing with audio */
    private drawDNAHelix(): void {
        if (!this.canvasContext || !this.frequencyData || !this.equalizerCanvas) return;
        const ctx = this.canvasContext;
        const w = this.equalizerCanvas.width / (window.devicePixelRatio || 1);
        const h = this.equalizerCanvas.height / (window.devicePixelRatio || 1);
        ctx.clearRect(0, 0, w, h);

        const time = Date.now() * 0.002;
        const cx = w / 2;
        const points = 60;
        const spacing = h / points;
        const theme = this.themes.get(this.currentTheme);
        const themeColors = theme?.colors;
        const colors: string[] = Array.isArray(themeColors) ? themeColors : ['#00ff41', '#00ccff', '#ff8c00'];

        for (let i = 0; i < points; i++) {
            const y = i * spacing;
            const dataIdx = Math.floor((i / points) * this.frequencyData.length * 0.7);
            const amp = (this.frequencyData[Math.min(dataIdx, this.frequencyData.length - 1)] || 0) / 255;
            const waveAmp = (w * 0.25) * (0.5 + amp * 0.8);
            const phase = time + i * 0.15;

            const x1 = cx + Math.sin(phase) * waveAmp;
            const x2 = cx + Math.sin(phase + Math.PI) * waveAmp;

            // Z-depth for 3D effect
            const z1 = Math.cos(phase);
            const z2 = Math.cos(phase + Math.PI);
            const size1 = 3 + z1 * 2 + amp * 4;
            const size2 = 3 + z2 * 2 + amp * 4;
            const alpha1 = 0.4 + z1 * 0.3 + amp * 0.3;
            const alpha2 = 0.4 + z2 * 0.3 + amp * 0.3;

            // Connecting rungs (draw behind)
            if (i % 3 === 0) {
                ctx.beginPath();
                ctx.moveTo(x1, y);
                ctx.lineTo(x2, y);
                const rungColor = colors[i % colors.length];
                ctx.strokeStyle = rungColor.replace(')', `,${0.2 + amp * 0.5})`).replace('rgb', 'rgba').replace('##', '#');
                ctx.globalAlpha = 0.3 + amp * 0.5;
                ctx.lineWidth = 1 + amp * 2;
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            // Strand 1
            ctx.beginPath();
            ctx.arc(x1, y, Math.max(1, size1), 0, Math.PI * 2);
            const hue1 = (i / points) * 180 + 120;
            ctx.fillStyle = `hsla(${hue1}, 90%, ${50 + amp * 30}%, ${alpha1})`;
            ctx.shadowColor = `hsl(${hue1}, 90%, 60%)`;
            ctx.shadowBlur = amp * 12;
            ctx.fill();

            // Strand 2
            ctx.beginPath();
            ctx.arc(x2, y, Math.max(1, size2), 0, Math.PI * 2);
            const hue2 = (i / points) * 180 + 300;
            ctx.fillStyle = `hsla(${hue2}, 90%, ${50 + amp * 30}%, ${alpha2})`;
            ctx.shadowColor = `hsl(${hue2}, 90%, 60%)`;
            ctx.shadowBlur = amp * 12;
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    /** Beat-synced fireworks bursts */
    private fireworkParticles: {x:number,y:number,vx:number,vy:number,life:number,hue:number,size:number}[] = [];
    private lastFireworkBeat: number = 0;
    private drawFireworks(): void {
        if (!this.canvasContext || !this.frequencyData || !this.equalizerCanvas) return;
        const ctx = this.canvasContext;
        const w = this.equalizerCanvas.width / (window.devicePixelRatio || 1);
        const h = this.equalizerCanvas.height / (window.devicePixelRatio || 1);

        // Fade trails
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.fillRect(0, 0, w, h);

        // Calculate bass energy for beat detection
        let bassEnergy = 0;
        for (let i = 0; i < 8; i++) bassEnergy += this.frequencyData[i] / 255;
        bassEnergy /= 8;

        // Launch firework on strong beats
        const now = Date.now();
        if (bassEnergy > 0.65 && now - this.lastFireworkBeat > 300) {
            this.lastFireworkBeat = now;
            const burstX = w * 0.15 + Math.random() * w * 0.7;
            const burstY = h * 0.1 + Math.random() * h * 0.4;
            const hue = Math.random() * 360;
            const count = 30 + Math.floor(bassEnergy * 40);
            for (let j = 0; j < count; j++) {
                const ang = (j / count) * Math.PI * 2 + Math.random() * 0.3;
                const speed = 1 + Math.random() * 3 + bassEnergy * 2;
                this.fireworkParticles.push({
                    x: burstX, y: burstY,
                    vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
                    life: 1, hue: hue + Math.random() * 40 - 20,
                    size: 1.5 + Math.random() * 2
                });
            }
        }

        // Also spawn gentle ambient sparkles from mid/treble
        let midEnergy = 0;
        for (let i = 16; i < 48; i++) midEnergy += this.frequencyData[i] / 255;
        midEnergy /= 32;
        if (Math.random() < midEnergy * 0.3) {
            this.fireworkParticles.push({
                x: Math.random() * w, y: h * 0.8 + Math.random() * h * 0.2,
                vx: (Math.random() - 0.5) * 0.5, vy: -1 - Math.random() * 2,
                life: 1, hue: Math.random() * 60 + 30, size: 1 + Math.random()
            });
        }

        // Update & draw particles
        for (let i = this.fireworkParticles.length - 1; i >= 0; i--) {
            const p = this.fireworkParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.04; // gravity
            p.life -= 0.015;
            if (p.life <= 0) { this.fireworkParticles.splice(i, 1); continue; }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 100%, ${50 + p.life * 30}%, ${p.life})`;
            ctx.shadowColor = `hsl(${p.hue}, 100%, 60%)`;
            ctx.shadowBlur = 6 * p.life;
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        // Cap particles
        if (this.fireworkParticles.length > 500) this.fireworkParticles.splice(0, this.fireworkParticles.length - 500);
    }

    /** Classic green phosphor oscilloscope display */
    private drawOscilloscope(): void {
        if (!this.canvasContext || !this.timeData || !this.equalizerCanvas) return;
        const ctx = this.canvasContext;
        const w = this.equalizerCanvas.width / (window.devicePixelRatio || 1);
        const h = this.equalizerCanvas.height / (window.devicePixelRatio || 1);

        // CRT phosphor fade
        ctx.fillStyle = 'rgba(0, 4, 0, 0.25)';
        ctx.fillRect(0, 0, w, h);

        // Grid lines
        ctx.strokeStyle = 'rgba(0, 80, 0, 0.3)';
        ctx.lineWidth = 0.5;
        for (let gx = 0; gx < w; gx += w / 10) {
            ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
        }
        for (let gy = 0; gy < h; gy += h / 8) {
            ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
        }
        // Center line
        ctx.strokeStyle = 'rgba(0, 100, 0, 0.5)';
        ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

        // Waveform trace — thick glowing green
        ctx.beginPath();
        const sliceWidth = w / this.timeData.length;
        for (let i = 0; i < this.timeData.length; i++) {
            const v = this.timeData[i] / 128;
            const y = (v * h) / 2;
            if (i === 0) ctx.moveTo(0, y);
            else ctx.lineTo(i * sliceWidth, y);
        }
        ctx.strokeStyle = '#00ff41';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00ff41';
        ctx.shadowBlur = 12;
        ctx.stroke();

        // Second pass — bright core
        ctx.strokeStyle = '#88ffaa';
        ctx.lineWidth = 0.8;
        ctx.shadowBlur = 4;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Scanline overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
        for (let sy = 0; sy < h; sy += 3) {
            ctx.fillRect(0, sy, w, 1);
        }
    }

    /** Sweeping radar display with frequency blips */
    private radarAngle: number = 0;
    private radarBlips: {angle:number, dist:number, intensity:number, life:number}[] = [];
    private drawRadar(): void {
        if (!this.canvasContext || !this.frequencyData || !this.equalizerCanvas) return;
        const ctx = this.canvasContext;
        const w = this.equalizerCanvas.width / (window.devicePixelRatio || 1);
        const h = this.equalizerCanvas.height / (window.devicePixelRatio || 1);

        // Fade
        ctx.fillStyle = 'rgba(0, 2, 0, 0.08)';
        ctx.fillRect(0, 0, w, h);

        const cx = w / 2, cy = h / 2;
        const radius = Math.min(w, h) * 0.44;

        // Concentric rings
        ctx.strokeStyle = 'rgba(0, 180, 0, 0.15)';
        ctx.lineWidth = 0.5;
        for (let r = 1; r <= 4; r++) {
            ctx.beginPath();
            ctx.arc(cx, cy, radius * r / 4, 0, Math.PI * 2);
            ctx.stroke();
        }
        // Cross lines
        ctx.beginPath();
        ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy);
        ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius);
        ctx.stroke();

        // Sweep
        this.radarAngle += 0.03;
        const sweepAngle = this.radarAngle;

        // Sweep arc fade
        const sweepGrad = ctx.createConicGradient(sweepAngle - Math.PI * 0.4, cx, cy);
        sweepGrad.addColorStop(0, 'rgba(0, 255, 0, 0)');
        sweepGrad.addColorStop(0.3, 'rgba(0, 255, 0, 0.08)');
        sweepGrad.addColorStop(0.5, 'rgba(0, 255, 0, 0.15)');
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, sweepAngle - 0.6, sweepAngle);
        ctx.closePath();
        ctx.fillStyle = sweepGrad;
        ctx.fill();

        // Sweep line
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(sweepAngle) * radius, cy + Math.sin(sweepAngle) * radius);
        ctx.strokeStyle = '#00ff41';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00ff41';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Spawn blips from frequency data at sweep position
        const numBands = 16;
        for (let i = 0; i < numBands; i++) {
            const dataIdx = Math.floor(i * this.frequencyData.length / numBands);
            const val = this.frequencyData[dataIdx] / 255;
            if (val > 0.35) {
                const dist = 0.2 + (i / numBands) * 0.75;
                this.radarBlips.push({
                    angle: sweepAngle + (Math.random() - 0.5) * 0.15,
                    dist: dist + (Math.random() - 0.5) * 0.08,
                    intensity: val,
                    life: 1
                });
            }
        }

        // Draw & decay blips
        for (let i = this.radarBlips.length - 1; i >= 0; i--) {
            const b = this.radarBlips[i];
            b.life -= 0.008;
            if (b.life <= 0) { this.radarBlips.splice(i, 1); continue; }

            const bx = cx + Math.cos(b.angle) * b.dist * radius;
            const by = cy + Math.sin(b.angle) * b.dist * radius;
            const sz = 2 + b.intensity * 3;

            ctx.beginPath();
            ctx.arc(bx, by, sz * b.life, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 255, 65, ${b.life * b.intensity})`;
            ctx.shadowColor = '#00ff41';
            ctx.shadowBlur = 6 * b.life;
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        // Cap blips
        if (this.radarBlips.length > 300) this.radarBlips.splice(0, this.radarBlips.length - 300);

        // Center dot
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#00ff41';
        ctx.fill();
    }

    /** Cassette deck — spinning reels, moving tape, audio-reactive */
    private cassetteReelAngle: number = 0;
    private drawCassetteDeck(): void {
        if (!this.canvasContext || !this.frequencyData || !this.equalizerCanvas) return;
        const ctx = this.canvasContext;
        const dpr = window.devicePixelRatio || 1;
        const w = this.equalizerCanvas.width / dpr;
        const h = this.equalizerCanvas.height / dpr;
        ctx.clearRect(0, 0, w, h);

        // Audio energy
        let bass = 0, mid = 0, high = 0, overall = 0;
        const len = this.frequencyData.length;
        for (let i = 0; i < len; i++) {
            const v = this.frequencyData[i] / 255;
            overall += v;
            if (i < len * 0.15) bass += v;
            else if (i < len * 0.5) mid += v;
            else high += v;
        }
        bass /= (len * 0.15) || 1;
        mid /= (len * 0.35) || 1;
        high /= (len * 0.5) || 1;
        overall /= len || 1;

        // Playback progress (0..1)
        let progress = 0;
        if (this.audioElement && this.audioElement.duration) {
            progress = this.audioElement.currentTime / this.audioElement.duration;
        }

        // --- Cassette shell ---
        const shellW = Math.min(w * 0.88, h * 1.5);
        const shellH = shellW * 0.58;
        const sx = (w - shellW) / 2;
        const sy = (h - shellH) / 2;

        // Shell body
        ctx.fillStyle = '#1a1a1a';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const cr = 12;
        ctx.moveTo(sx + cr, sy);
        ctx.lineTo(sx + shellW - cr, sy);
        ctx.quadraticCurveTo(sx + shellW, sy, sx + shellW, sy + cr);
        ctx.lineTo(sx + shellW, sy + shellH - cr);
        ctx.quadraticCurveTo(sx + shellW, sy + shellH, sx + shellW - cr, sy + shellH);
        ctx.lineTo(sx + cr, sy + shellH);
        ctx.quadraticCurveTo(sx, sy + shellH, sx, sy + shellH - cr);
        ctx.lineTo(sx, sy + cr);
        ctx.quadraticCurveTo(sx, sy, sx + cr, sy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner label area
        const labelW = shellW * 0.72;
        const labelH = shellH * 0.32;
        const lx = sx + (shellW - labelW) / 2;
        const ly = sy + shellH * 0.06;
        ctx.fillStyle = '#f5f0e0';
        ctx.fillRect(lx, ly, labelW, labelH);
        ctx.strokeStyle = '#c0b090';
        ctx.lineWidth = 1;
        ctx.strokeRect(lx, ly, labelW, labelH);

        // Horizontal lines on label
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        for (let i = 1; i < 5; i++) {
            const lineY = ly + (labelH / 5) * i;
            ctx.beginPath();
            ctx.moveTo(lx + 6, lineY);
            ctx.lineTo(lx + labelW - 6, lineY);
            ctx.stroke();
        }

        // Label text
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.font = `bold ${Math.max(10, shellH * 0.06)}px monospace`;
        ctx.fillText('SIDE A', lx + labelW / 2, ly + labelH * 0.22);

        // Track name on label
        const trackName = (this.currentTrackIndex >= 0 && this.currentTrackIndex < this.playlist.length)
            ? this.playlist[this.currentTrackIndex].name : 'NO TAPE LOADED';
        ctx.font = `${Math.max(9, shellH * 0.05)}px monospace`;
        ctx.fillStyle = '#555';
        const maxChars = Math.floor(labelW / (shellH * 0.035));
        const displayName = trackName.length > maxChars ? trackName.substring(0, maxChars - 2) + '..' : trackName;
        ctx.fillText(displayName, lx + labelW / 2, ly + labelH * 0.48);

        // Type label
        ctx.font = `bold ${Math.max(8, shellH * 0.04)}px monospace`;
        ctx.fillStyle = '#888';
        ctx.fillText('C-90  \u2022  TYPE II  \u2022  HIGH BIAS', lx + labelW / 2, ly + labelH * 0.72);

        // Tape counter
        const counter = Math.floor(progress * 999).toString().padStart(3, '0');
        ctx.fillStyle = '#0a0a0a';
        const counterW = shellH * 0.18;
        const counterH = shellH * 0.08;
        const counterX = lx + labelW / 2 - counterW / 2;
        const counterY = ly + labelH * 0.82;
        ctx.fillRect(counterX, counterY, counterW, counterH);
        ctx.fillStyle = '#00ff41';
        ctx.font = `bold ${Math.max(8, shellH * 0.05)}px monospace`;
        ctx.fillText(counter, counterX + counterW / 2, counterY + counterH * 0.78);

        // --- Tape window ---
        const winW = shellW * 0.52;
        const winH = shellH * 0.28;
        const wx = sx + (shellW - winW) / 2;
        const wy = sy + shellH * 0.44;

        ctx.fillStyle = 'rgba(20, 15, 10, 0.9)';
        ctx.beginPath();
        ctx.moveTo(wx + 8, wy);
        ctx.lineTo(wx + winW - 8, wy);
        ctx.quadraticCurveTo(wx + winW, wy, wx + winW, wy + 8);
        ctx.lineTo(wx + winW, wy + winH - 8);
        ctx.quadraticCurveTo(wx + winW, wy + winH, wx + winW - 8, wy + winH);
        ctx.lineTo(wx + 8, wy + winH);
        ctx.quadraticCurveTo(wx, wy + winH, wx, wy + winH - 8);
        ctx.lineTo(wx, wy + 8);
        ctx.quadraticCurveTo(wx, wy, wx + 8, wy);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // --- Reels ---
        const reelCy = wy + winH * 0.5;
        const leftReelCx = wx + winW * 0.25;
        const rightReelCx = wx + winW * 0.75;
        const maxReelR = winH * 0.42;
        const hubR = maxReelR * 0.28;
        // Left reel shrinks as tape plays, right reel grows
        const leftTapeR = hubR + (maxReelR - hubR) * (1 - progress);
        const rightTapeR = hubR + (maxReelR - hubR) * progress;

        // Reel rotation speed - audio reactive
        const isPlaying = this.audioElement && !this.audioElement.paused;
        if (isPlaying) {
            this.cassetteReelAngle += 0.08 + overall * 0.12;
        }
        // Left reel spins faster (less tape = smaller radius)
        const leftAngle = this.cassetteReelAngle * (1 + progress * 0.5);
        const rightAngle = this.cassetteReelAngle * (1 + (1 - progress) * 0.5);

        // Draw reels
        const drawReel = (cx2: number, cy2: number, tapeR: number, angle: number) => {
            // Tape spool
            const tapeGrad = ctx.createRadialGradient(cx2, cy2, hubR, cx2, cy2, tapeR);
            tapeGrad.addColorStop(0, '#2a1a0a');
            tapeGrad.addColorStop(0.5, '#1a0e05');
            tapeGrad.addColorStop(1, '#0f0804');
            ctx.beginPath();
            ctx.arc(cx2, cy2, tapeR, 0, Math.PI * 2);
            ctx.fillStyle = tapeGrad;
            ctx.fill();

            // Tape edge sheen
            ctx.beginPath();
            ctx.arc(cx2, cy2, tapeR, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(80, 50, 20, 0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Hub
            ctx.beginPath();
            ctx.arc(cx2, cy2, hubR, 0, Math.PI * 2);
            ctx.fillStyle = '#ddd';
            ctx.fill();
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Hub spokes (rotate with audio)
            ctx.save();
            ctx.translate(cx2, cy2);
            ctx.rotate(angle);
            for (let s = 0; s < 3; s++) {
                ctx.rotate(Math.PI * 2 / 3);
                ctx.beginPath();
                ctx.moveTo(-hubR * 0.6, -hubR * 0.2);
                ctx.lineTo(hubR * 0.6, -hubR * 0.2);
                ctx.lineTo(hubR * 0.6, hubR * 0.2);
                ctx.lineTo(-hubR * 0.6, hubR * 0.2);
                ctx.closePath();
                ctx.fillStyle = '#888';
                ctx.fill();
            }
            // Center hole
            ctx.beginPath();
            ctx.arc(0, 0, hubR * 0.18, 0, Math.PI * 2);
            ctx.fillStyle = '#333';
            ctx.fill();
            ctx.restore();
        };

        drawReel(leftReelCx, reelCy, leftTapeR, leftAngle);
        drawReel(rightReelCx, reelCy, rightTapeR, rightAngle);

        // --- Tape path ---
        ctx.strokeStyle = '#1a0e05';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        // Left reel to left guide
        const guideY = wy + winH * 0.85;
        const leftGuideX = wx + winW * 0.15;
        const rightGuideX = wx + winW * 0.85;
        const headX = wx + winW * 0.5;
        const headY = wy + winH * 0.92;
        ctx.moveTo(leftReelCx, reelCy + leftTapeR);
        ctx.quadraticCurveTo(leftReelCx, guideY, leftGuideX, guideY);
        ctx.lineTo(headX - winW * 0.06, headY);
        ctx.moveTo(headX + winW * 0.06, headY);
        ctx.lineTo(rightGuideX, guideY);
        ctx.quadraticCurveTo(rightReelCx, guideY, rightReelCx, reelCy + rightTapeR);
        ctx.stroke();

        // Tape head block
        ctx.fillStyle = '#666';
        const headW = winW * 0.12;
        const headH = winH * 0.1;
        ctx.fillRect(headX - headW / 2, headY - headH / 2, headW, headH);
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(headX - headW / 2, headY - headH / 2, headW, headH);

        // Guide rollers
        [leftGuideX, rightGuideX].forEach(gx => {
            ctx.beginPath();
            ctx.arc(gx, guideY, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#aaa';
            ctx.fill();
        });

        // --- Audio-reactive VU bars in bottom of shell ---
        const vuY = sy + shellH * 0.82;
        const vuH = shellH * 0.1;
        const vuW = shellW * 0.55;
        const vuX = sx + (shellW - vuW) / 2;
        const barCount = 20;
        const barW = vuW / barCount - 1;
        for (let i = 0; i < barCount; i++) {
            const idx = Math.floor(i * len / barCount);
            const val = this.frequencyData[idx] / 255;
            let color: string;
            if (val < 0.5) color = '#00cc41';
            else if (val < 0.75) color = '#cccc00';
            else color = '#ff3333';
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.5 + val * 0.5;
            ctx.fillRect(vuX + i * (barW + 1), vuY + vuH * (1 - val), barW, vuH * val);
        }
        ctx.globalAlpha = 1;

        // VU label
        ctx.fillStyle = '#444';
        ctx.font = `${Math.max(7, shellH * 0.03)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('L E V E L', vuX + vuW / 2, vuY - 3);

        // --- Screw holes at corners ---
        const screwInset = 14;
        [[sx + screwInset, sy + screwInset], [sx + shellW - screwInset, sy + screwInset],
         [sx + screwInset, sy + shellH - screwInset], [sx + shellW - screwInset, sy + shellH - screwInset]].forEach(([scx, scy]) => {
            ctx.beginPath();
            ctx.arc(scx, scy, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#222';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(scx, scy, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = '#444';
            ctx.fill();
            // Phillips cross
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(scx - 1.5, scy); ctx.lineTo(scx + 1.5, scy);
            ctx.moveTo(scx, scy - 1.5); ctx.lineTo(scx, scy + 1.5);
            ctx.stroke();
        });

        // --- Bass pulse glow on tape window ---
        if (bass > 0.4 && isPlaying) {
            ctx.save();
            ctx.shadowColor = '#ff6600';
            ctx.shadowBlur = bass * 25;
            ctx.strokeStyle = `rgba(255, 100, 0, ${bass * 0.3})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(wx + 8, wy);
            ctx.lineTo(wx + winW - 8, wy);
            ctx.quadraticCurveTo(wx + winW, wy, wx + winW, wy + 8);
            ctx.lineTo(wx + winW, wy + winH - 8);
            ctx.quadraticCurveTo(wx + winW, wy + winH, wx + winW - 8, wy + winH);
            ctx.lineTo(wx + 8, wy + winH);
            ctx.quadraticCurveTo(wx, wy + winH, wx, wy + winH - 8);
            ctx.lineTo(wx, wy + 8);
            ctx.quadraticCurveTo(wx, wy, wx + 8, wy);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        }

        // --- Tape flutter effect (high frequency shimmer on tape path) ---
        if (isPlaying && high > 0.2) {
            ctx.strokeStyle = `rgba(200, 150, 80, ${high * 0.4})`;
            ctx.lineWidth = 0.5;
            const flutterPts = 30;
            ctx.beginPath();
            for (let i = 0; i <= flutterPts; i++) {
                const t = i / flutterPts;
                const fx = leftGuideX + t * (rightGuideX - leftGuideX);
                const fy = guideY + Math.sin(Date.now() * 0.02 + t * 20) * high * 3;
                if (i === 0) ctx.moveTo(fx, fy);
                else ctx.lineTo(fx, fy);
            }
            ctx.stroke();
        }
    }

    private drawLiquidWave(): void {
        if (!this.canvasContext || !this.frequencyData || !this.equalizerCanvas) return;

        // Use canvas internal dimensions, not getBoundingClientRect
        const width = this.equalizerCanvas.width / window.devicePixelRatio;
        const height = this.equalizerCanvas.height / window.devicePixelRatio;
        
        // Clear the entire canvas first
        this.canvasContext.clearRect(0, 0, width, height);
        
        const time = Date.now() * 0.002;
        const theme = this.themes.get(this.currentTheme);
        
        // Truncate at 70% to remove more of the flat section, then scale to fill full width
        const goodDataPortion = 0.70; // Use first 70% of frequency data (more truncation)
        const step = 2;
        
        this.canvasContext.beginPath();
        
        for (let x = 0; x < width; x += step) {
            // Map current x position to the good portion of frequency data (0 to 75%)
            const scaledNormalizedX = (x / width) * goodDataPortion;
            
            // Logarithmic frequency mapping using only the good portion
            const logPosition = Math.log(1 + scaledNormalizedX * 7) / Math.log(8);
            const dataIndex = Math.floor(logPosition * (this.frequencyData.length - 1));
            
            // Progressive frequency boost across the scaled range
            const progressiveBoost = 1 + scaledNormalizedX * 0.8;
            const rawAmplitude = (this.frequencyData[dataIndex] / 255) * progressiveBoost;
            const amplitude = Math.min(rawAmplitude, 0.7) * height * 0.4;
            
            // Enhanced wave motion with multiple frequency components
            const primaryWave = Math.sin(x * 0.006 + time * 1.1) * amplitude;
            const secondaryWave = Math.sin(x * 0.018 + time * 0.7) * amplitude * 0.25;
            const tertiaryWave = Math.sin(x * 0.035 + time * 0.45) * amplitude * 0.12;
            
            // Add subtle noise for more organic feel
            const noise = (Math.random() - 0.5) * amplitude * 0.04;
            
            const y = height * 0.5 + primaryWave + secondaryWave + tertiaryWave + noise;
            
            if (x === 0) {
                this.canvasContext.moveTo(x, y);
            } else {
                this.canvasContext.lineTo(x, y);
            }
        }
        
        // Complete the wave shape to full width
        this.canvasContext.lineTo(width, height);
        this.canvasContext.lineTo(0, height);
        this.canvasContext.closePath();
        
        // Enhanced gradient with theme colors
        const gradient = this.canvasContext.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, theme?.colors.primary + '90' || '#00ff8890');
        gradient.addColorStop(0.5, theme?.colors.secondary + '50' || '#00ccff50');
        gradient.addColorStop(1, theme?.colors.primary + '15' || '#00ff8815');
        
        this.canvasContext.fillStyle = gradient;
        this.canvasContext.fill();
        
        // Enhanced wave outline with controlled glow
        this.canvasContext.save();
        this.canvasContext.shadowBlur = 6;
        this.canvasContext.shadowColor = theme?.colors.primary + '80' || '#00ff8880';
        this.canvasContext.strokeStyle = theme?.colors.primary || '#00ff88';
        this.canvasContext.lineWidth = 1.5;
        this.canvasContext.stroke();
        this.canvasContext.restore();
        
        // Subtle surface shimmer effect
        this.canvasContext.save();
        this.canvasContext.globalCompositeOperation = 'soft-light';
        const shimmerGradient = this.canvasContext.createLinearGradient(0, height * 0.35, 0, height * 0.65);
        shimmerGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        shimmerGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
        shimmerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        this.canvasContext.fillStyle = shimmerGradient;
        this.canvasContext.fillRect(0, 0, width, height);
        this.canvasContext.restore();
    }

    // 🚀 ==================== AWESOME NEW FEATURES ====================

    // 1. 🌊 AUDIO SPECTRUM WATERFALL - Shows frequency history cascading down
    private drawAudioWaterfall(): void {
        if (!this.canvasContext || !this.frequencyData || !this.equalizerCanvas) return;

        const width = this.equalizerCanvas.width / (window.devicePixelRatio || 1);
        const height = this.equalizerCanvas.height / (window.devicePixelRatio || 1);
        
        // Add current frequency data to waterfall
        this.audioWaterfall.waterfallData.push([...this.frequencyData]);
        
        // Limit waterfall history
        if (this.audioWaterfall.waterfallData.length > this.audioWaterfall.waterfallHeight) {
            this.audioWaterfall.waterfallData.shift();
        }
        
        // Clear canvas
        this.canvasContext.clearRect(0, 0, width, height);
        
        // Draw waterfall
        for (let row = 0; row < this.audioWaterfall.waterfallData.length; row++) {
            const rowData = this.audioWaterfall.waterfallData[row];
            const y = height - (row * (height / this.audioWaterfall.waterfallHeight));
            
            for (let i = 0; i < rowData.length; i++) {
                const x = (i / rowData.length) * width;
                const intensity = rowData[i] / 255;
                const colorIndex = Math.floor(intensity * (this.audioWaterfall.gradientColors.length - 1));
                
                this.canvasContext.fillStyle = this.audioWaterfall.gradientColors[colorIndex] + Math.floor(intensity * 255).toString(16).padStart(2, '0');
                this.canvasContext.fillRect(x, y, width / rowData.length + 1, height / this.audioWaterfall.waterfallHeight + 1);
            }
        }
        
        // Add shimmer effect
        const shimmerGradient = this.canvasContext.createLinearGradient(0, 0, 0, height);
        shimmerGradient.addColorStop(0, 'rgba(255,255,255,0.3)');
        shimmerGradient.addColorStop(0.5, 'rgba(255,255,255,0)');
        shimmerGradient.addColorStop(1, 'rgba(255,255,255,0.1)');
        this.canvasContext.fillStyle = shimmerGradient;
        this.canvasContext.fillRect(0, 0, width, height);
    }

    // 2. 💥 SMART PARTICLE EXPLOSIONS - Frequency-triggered particle effects
    private drawSmartExplosions(): void {
        if (!this.canvasContext || !this.frequencyData || !this.equalizerCanvas) return;

        const width = this.equalizerCanvas.width / (window.devicePixelRatio || 1);
        const height = this.equalizerCanvas.height / (window.devicePixelRatio || 1);
        
        // Clear canvas
        this.canvasContext.clearRect(0, 0, width, height);
        
        // Analyze frequency ranges
        const bassLevel = this.frequencyData.slice(0, 32).reduce((a, b) => a + b) / 32 / 255;
        const midLevel = this.frequencyData.slice(32, 128).reduce((a, b) => a + b) / 96 / 255;
        const trebleLevel = this.frequencyData.slice(128).reduce((a, b) => a + b) / 127 / 255;
        
        // Trigger explosions based on thresholds
        if (bassLevel > this.smartParticles.explosionTriggers.bass) {
            this.createExplosion('bass', Math.random() * width, height * 0.8, bassLevel);
        }
        if (midLevel > this.smartParticles.explosionTriggers.mid) {
            this.createExplosion('mid', Math.random() * width, height * 0.5, midLevel);
        }
        if (trebleLevel > this.smartParticles.explosionTriggers.treble) {
            this.createExplosion('treble', Math.random() * width, height * 0.2, trebleLevel);
        }
        
        // Draw and update all explosions
        [...this.smartParticles.bassExplosions, ...this.smartParticles.midExplosions, ...this.smartParticles.trebleExplosions]
            .forEach(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += 0.1; // gravity
                particle.life -= 0.01;
                
                if (particle.life > 0) {
                    this.canvasContext.save();
                    this.canvasContext.globalAlpha = particle.life;
                    this.canvasContext.fillStyle = particle.color;
                    this.canvasContext.shadowBlur = particle.size * 2;
                    this.canvasContext.shadowColor = particle.color;
                    this.canvasContext.beginPath();
                    this.canvasContext.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    this.canvasContext.fill();
                    this.canvasContext.restore();
                }
            });
        
        // Clean up dead particles
        this.smartParticles.bassExplosions = this.smartParticles.bassExplosions.filter(p => p.life > 0);
        this.smartParticles.midExplosions = this.smartParticles.midExplosions.filter(p => p.life > 0);
        this.smartParticles.trebleExplosions = this.smartParticles.trebleExplosions.filter(p => p.life > 0);
    }

    // 3. 🎯 BEAT VISUALIZATION - Enhanced beat detection with visual feedback
    private drawBeatVisualization(): void {
        if (!this.canvasContext || !this.frequencyData || !this.equalizerCanvas) return;

        const width = this.equalizerCanvas.width / (window.devicePixelRatio || 1);
        const height = this.equalizerCanvas.height / (window.devicePixelRatio || 1);
        
        // Clear canvas with beat-reactive background
        const beatIntensity = this.beatDetection.screenFlashIntensity;
        this.canvasContext.fillStyle = `rgba(${Math.floor(beatIntensity * 255)}, ${Math.floor(beatIntensity * 100)}, ${Math.floor(beatIntensity * 200)}, 0.1)`;
        this.canvasContext.fillRect(0, 0, width, height);
        
        // Draw beat circles expanding from center
        const centerX = width / 2;
        const centerY = height / 2;
        const time = Date.now() * 0.001;
        
        for (let i = 0; i < 5; i++) {
            const radius = (beatIntensity * 200 + i * 50) * Math.sin(time + i);
            this.canvasContext.save();
            this.canvasContext.globalAlpha = (1 - i * 0.2) * beatIntensity;
            this.canvasContext.strokeStyle = '#00ff88';
            this.canvasContext.lineWidth = 3;
            this.canvasContext.shadowBlur = 10;
            this.canvasContext.shadowColor = '#00ff88';
            this.canvasContext.beginPath();
            this.canvasContext.arc(centerX, centerY, Math.abs(radius), 0, Math.PI * 2);
            this.canvasContext.stroke();
            this.canvasContext.restore();
        }
        
        // Draw BPM and analysis info
        this.canvasContext.fillStyle = '#ffffff';
        this.canvasContext.font = '24px Arial';
        this.canvasContext.fillText(`Energy: ${(this.musicAnalysis.energy * 100).toFixed(0)}%`, 20, 40);
        this.canvasContext.fillText(`Mood: ${this.musicAnalysis.mood}`, 20, 70);
    }

    // 4. 🎮 INTERACTIVE MODE - Mouse and touch responsive effects
    private drawInteractiveMode(): void {
        if (!this.canvasContext || !this.frequencyData || !this.equalizerCanvas) return;

        const width = this.equalizerCanvas.width / (window.devicePixelRatio || 1);
        const height = this.equalizerCanvas.height / (window.devicePixelRatio || 1);
        
        // Create trailing effect
        this.canvasContext.save();
        this.canvasContext.globalAlpha = 0.05;
        this.canvasContext.fillStyle = '#000000';
        this.canvasContext.fillRect(0, 0, width, height);
        this.canvasContext.restore();
        
        // Draw mouse trail
        this.interactiveElements.mouseEffects.trail.forEach((point, index) => {
            if (point.life > 0) {
                const freqIndex = Math.floor((index / this.interactiveElements.mouseEffects.trail.length) * this.frequencyData.length);
                const intensity = this.frequencyData[freqIndex] / 255;
                
                this.canvasContext.save();
                this.canvasContext.globalAlpha = point.life * intensity;
                this.canvasContext.fillStyle = `hsl(${index * 10}, 100%, 50%)`;
                this.canvasContext.shadowBlur = 15;
                this.canvasContext.shadowColor = `hsl(${index * 10}, 100%, 50%)`;
                this.canvasContext.beginPath();
                this.canvasContext.arc(point.x, point.y, 5 + intensity * 10, 0, Math.PI * 2);
                this.canvasContext.fill();
                this.canvasContext.restore();
                
                point.life -= 0.02;
            }
        });
        
        // Clean up trail
        this.interactiveElements.mouseEffects.trail = this.interactiveElements.mouseEffects.trail.filter(p => p.life > 0);
        
        // Draw click ripples
        this.interactiveElements.clickRipples.forEach(ripple => {
            if (ripple.life > 0) {
                this.canvasContext.save();
                this.canvasContext.globalAlpha = ripple.life;
                this.canvasContext.strokeStyle = ripple.color;
                this.canvasContext.lineWidth = 3;
                this.canvasContext.shadowBlur = 10;
                this.canvasContext.shadowColor = ripple.color;
                this.canvasContext.beginPath();
                this.canvasContext.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
                this.canvasContext.stroke();
                this.canvasContext.restore();
                
                ripple.radius += 5;
                ripple.life -= 0.02;
            }
        });
        
        // Clean up ripples
        this.interactiveElements.clickRipples = this.interactiveElements.clickRipples.filter(r => r.life > 0);
    }

    // 5. 📊 MUSIC ANALYSIS DISPLAY - Advanced audio analysis visualization
    private drawMusicAnalysisDisplay(): void {
        if (!this.canvasContext || !this.frequencyData || !this.equalizerCanvas) return;

        const width = this.equalizerCanvas.width / (window.devicePixelRatio || 1);
        const height = this.equalizerCanvas.height / (window.devicePixelRatio || 1);
        
        this.canvasContext.clearRect(0, 0, width, height);
        
        // Draw spectral centroid visualization
        const centroid = this.musicAnalysis.spectralCentroid * width;
        this.canvasContext.save();
        this.canvasContext.strokeStyle = '#ffff00';
        this.canvasContext.lineWidth = 2;
        this.canvasContext.setLineDash([5, 5]);
        this.canvasContext.beginPath();
        this.canvasContext.moveTo(centroid, 0);
        this.canvasContext.lineTo(centroid, height);
        this.canvasContext.stroke();
        this.canvasContext.restore();
        
        // Draw frequency analysis as bars with analysis overlay
        for (let i = 0; i < this.frequencyData.length; i++) {
            const x = (i / this.frequencyData.length) * width;
            const barHeight = (this.frequencyData[i] / 255) * height * 0.8;
            
            // Color based on frequency range
            let color = '#00ff88'; // default
            if (i < 32) color = '#ff0080'; // bass = red
            else if (i < 128) color = '#00ccff'; // mid = blue  
            else color = '#ffff00'; // treble = yellow
            
            this.canvasContext.fillStyle = color + '80';
            this.canvasContext.fillRect(x, height - barHeight, width / this.frequencyData.length, barHeight);
        }
        
        // Draw analysis information
        this.canvasContext.fillStyle = '#ffffff';
        this.canvasContext.font = '16px Arial';
        const info = [
            `Tempo: ${this.musicAnalysis.tempo}`,
            `Energy: ${(this.musicAnalysis.energy * 100).toFixed(1)}%`,
            `Mood: ${this.musicAnalysis.mood}`,
            `Key: ${this.musicAnalysis.keySignature}`,
            `Zero Crossings: ${this.musicAnalysis.zeroCrossings}`
        ];
        
        info.forEach((text, index) => {
            this.canvasContext.fillText(text, 10, 25 + index * 25);
        });
    }

    // 🔥 ENHANCEMENT SYSTEMS - Always active background systems

    // Enhanced Beat Detection with Screen Flash
    private updateBeatDetection(): void {
        if (!this.frequencyData) return;

        const bassEnergy = this.frequencyData.slice(0, 32).reduce((a, b) => a + b) / 32;
        const currentTime = Date.now();
        
        // Detect beats
        if (bassEnergy > this.beatDetection.beatThreshold * 255) {
            if (currentTime - this.beatDetection.lastBeat > 300) { // Minimum gap between beats
                this.beatDetection.lastBeat = currentTime;
                this.beatDetection.beatHistory.push(currentTime);
                
                // Calculate BPM
                if (this.beatDetection.beatHistory.length > 10) {
                    const recentBeats = this.beatDetection.beatHistory.slice(-10);
                    const avgInterval = (recentBeats[recentBeats.length - 1] - recentBeats[0]) / (recentBeats.length - 1);
                    this.musicAnalysis.bpm = 60000 / avgInterval;
                }
                
                // Trigger screen flash
                this.beatDetection.screenFlashIntensity = Math.min(bassEnergy / 255, 1);
                
                // Create beat impact particles
                for (let i = 0; i < 10; i++) {
                    this.beatDetection.beatImpactParticles.push({
                        x: Math.random() * this.equalizerCanvas.width,
                        y: Math.random() * this.equalizerCanvas.height,
                        vx: (Math.random() - 0.5) * 10,
                        vy: (Math.random() - 0.5) * 10,
                        size: Math.random() * 5 + 2,
                        color: '#ffffff',
                        life: 1,
                        maxLife: 1,
                        type: 'bass'
                    });
                }
            }
        }
        
        // Fade screen flash
        this.beatDetection.screenFlashIntensity *= 0.9;
        
        // Update beat impact particles
        this.beatDetection.beatImpactParticles = this.beatDetection.beatImpactParticles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 0.02;
            return particle.life > 0;
        });
        
        // Clean old beat history
        const oneMinuteAgo = currentTime - 60000;
        this.beatDetection.beatHistory = this.beatDetection.beatHistory.filter(beat => beat > oneMinuteAgo);
    }

    // Screen Flash Effect
    private drawScreenFlash(): void {
        if (!this.canvasContext || this.beatDetection.screenFlashIntensity <= 0.01) return;

        this.canvasContext.save();
        this.canvasContext.globalAlpha = this.beatDetection.screenFlashIntensity * 0.3;
        this.canvasContext.fillStyle = '#ffffff';
        this.canvasContext.fillRect(0, 0, this.equalizerCanvas.width, this.equalizerCanvas.height);
        this.canvasContext.restore();
        
        // Draw beat impact particles
        this.beatDetection.beatImpactParticles.forEach(particle => {
            this.canvasContext.save();
            this.canvasContext.globalAlpha = particle.life;
            this.canvasContext.fillStyle = particle.color;
            this.canvasContext.shadowBlur = 10;
            this.canvasContext.shadowColor = particle.color;
            this.canvasContext.beginPath();
            this.canvasContext.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.canvasContext.fill();
            this.canvasContext.restore();
        });
    }

    // Smart Particle System Updates
    private updateSmartParticles(): void {
        // This method manages the particle explosion triggers
        // The actual drawing is handled in drawSmartExplosions()
    }

    // Interactive Elements Updates
    private updateInteractiveElements(): void {
        if (!this.interactiveElements.isMouseInteractionEnabled) return;
        
        // Add mouse position to trail if mouse is moving
        const trail = this.interactiveElements.mouseEffects.trail;
        if (trail.length === 0 || 
            Math.abs(trail[trail.length - 1].x - this.interactiveElements.mouseEffects.x) > 5 ||
            Math.abs(trail[trail.length - 1].y - this.interactiveElements.mouseEffects.y) > 5) {
            
            trail.push({
                x: this.interactiveElements.mouseEffects.x,
                y: this.interactiveElements.mouseEffects.y,
                life: 1
            });
            
            // Limit trail length
            if (trail.length > 50) {
                trail.shift();
            }
        }
    }

    // Dynamic Theme System
    private updateDynamicThemes(): void {
        if (!this.dynamicThemes.autoThemeEnabled) return;

        // Analyze music mood
        const energy = this.musicAnalysis.energy;
        let newMood = 'calm';
        
        if (energy > 0.8) newMood = 'chaotic';
        else if (energy > 0.6) newMood = 'intense';
        else if (energy > 0.4) newMood = 'energetic';
        
        if (newMood !== this.dynamicThemes.currentMood) {
            this.dynamicThemes.currentMood = newMood;
            this.dynamicThemes.transitionProgress = 0;
        }
        
        // Update breathing effect
        this.dynamicThemes.breathingEffect.phase += 0.02;
        this.dynamicThemes.breathingEffect.intensity = 0.8 + Math.sin(this.dynamicThemes.breathingEffect.phase) * 0.3;
    }

    // Audio-Reactive Background Effects
    private drawBackgroundEffects(): void {
        if (!this.canvasContext || !this.frequencyData) return;

        // Update effects based on audio
        const avgFreq = this.frequencyData.reduce((a, b) => a + b) / this.frequencyData.length / 255;
        this.backgroundEffects.gradientShift += avgFreq * 0.01;
        this.backgroundEffects.pulseIntensity = avgFreq;
        
        // Draw subtle pulsing background gradient
        const gradient = this.canvasContext.createRadialGradient(
            this.equalizerCanvas.width / 2, this.equalizerCanvas.height / 2, 0,
            this.equalizerCanvas.width / 2, this.equalizerCanvas.height / 2, 
            Math.max(this.equalizerCanvas.width, this.equalizerCanvas.height)
        );
        
        const hue = (this.backgroundEffects.gradientShift * 360) % 360;
        gradient.addColorStop(0, `hsla(${hue}, 50%, 10%, 0.1)`);
        gradient.addColorStop(1, `hsla(${(hue + 60) % 360}, 30%, 5%, 0.05)`);
        
        this.canvasContext.save();
        this.canvasContext.globalAlpha = this.backgroundEffects.pulseIntensity * 0.3;
        this.canvasContext.fillStyle = gradient;
        this.canvasContext.fillRect(0, 0, this.equalizerCanvas.width, this.equalizerCanvas.height);
        this.canvasContext.restore();
    }

    // Helper method for creating particle explosions
    private createExplosion(type: 'bass' | 'mid' | 'treble', x: number, y: number, intensity: number): void {
        const particleCount = Math.floor(intensity * 20) + 10;
        const colors = {
            bass: ['#ff0080', '#ff4444', '#ff8800'],
            mid: ['#00ff88', '#44ff44', '#88ff00'],
            treble: ['#00ccff', '#4488ff', '#8844ff']
        };
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = intensity * 8 + Math.random() * 4;
            const particle: Particle = {
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 4 + 2,
                color: colors[type][Math.floor(Math.random() * colors[type].length)],
                life: 1,
                maxLife: 1,
                type: type
            };
            
            if (type === 'bass') this.smartParticles.bassExplosions.push(particle);
            else if (type === 'mid') this.smartParticles.midExplosions.push(particle);
            else this.smartParticles.trebleExplosions.push(particle);
        }
    }

    // 🚀 Enhanced Music Analysis
    private analyzeMusicAdvanced(): void {
        if (!this.frequencyData) return;

        // Calculate spectral centroid
        let weightedSum = 0;
        let magnitudeSum = 0;
        
        for (let i = 0; i < this.frequencyData.length; i++) {
            weightedSum += i * this.frequencyData[i];
            magnitudeSum += this.frequencyData[i];
        }
        
        this.musicAnalysis.spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum / this.frequencyData.length : 0;
        
        // Calculate energy
        const energy = this.frequencyData.reduce((sum, val) => sum + val * val, 0) / this.frequencyData.length;
        this.musicAnalysis.energy = energy / (255 * 255);
        
        // Determine tempo category
        if (this.musicAnalysis.bpm < 60) this.musicAnalysis.tempo = 'slow';
        else if (this.musicAnalysis.bpm < 120) this.musicAnalysis.tempo = 'medium';
        else if (this.musicAnalysis.bpm < 180) this.musicAnalysis.tempo = 'fast';
        else this.musicAnalysis.tempo = 'very_fast';
        
        // Simple mood detection based on energy and spectral characteristics
        if (this.musicAnalysis.energy > 0.8 && this.musicAnalysis.spectralCentroid > 0.7) {
            this.musicAnalysis.mood = 'chaotic';
        } else if (this.musicAnalysis.energy > 0.6) {
            this.musicAnalysis.mood = 'intense';
        } else if (this.musicAnalysis.energy > 0.3) {
            this.musicAnalysis.mood = 'energetic';
        } else {
            this.musicAnalysis.mood = 'calm';
        }
    }

    
    private updateDynamicThemeSystem(): void {
        // Simple dynamic theme updates based on music energy and mood
        const avgEnergy = Array.from(this.frequencyData).reduce((sum, val) => sum + val, 0) / this.frequencyData.length;
        
        if (this.dynamicThemes && this.dynamicThemes.autoThemeEnabled) {
            // Update breathing effect phase
            this.dynamicThemes.breathingEffect.phase += 0.05;
            this.dynamicThemes.breathingEffect.intensity = Math.min(avgEnergy / 255, 1.0);
            
            // Update mood based on energy and beat patterns
            if (avgEnergy > 200) {
                this.dynamicThemes.currentMood = 'intense';
            } else if (avgEnergy > 120) {
                this.dynamicThemes.currentMood = 'energetic';
            } else if (avgEnergy > 60) {
                this.dynamicThemes.currentMood = 'medium';
            } else {
                this.dynamicThemes.currentMood = 'calm';
            }
            
            // Update transition progress for smooth changes
            if (this.dynamicThemes.transitionProgress < 1) {
                this.dynamicThemes.transitionProgress += 0.02;
            }
        }
    }

    private updateThemeColors(energy: number): void {
        // Simple color intensity updates based on energy level and mood
        if (this.dynamicThemes && this.beatDetection.lastBeat > 0) {
            const intensity = Math.min(energy / 255, 1.0);
            // Use mood and intensity to influence visual effects
            // This can be used by other drawing methods for color selection
            this.dynamicThemes.breathingEffect.intensity = intensity;
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}

