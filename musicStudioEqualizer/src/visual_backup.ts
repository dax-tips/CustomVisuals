/*
*  Power BI Visual CLI - Professional Music Studio Equalizer
*  Complete Audio Visualization Suite with Advanced Features
*
*  Features:
*  - Multi-track playlist with shuffle/repeat
*  - Real-time audio-reactive particle effects  
*  - Advanced audio processing (bass, treble, reverb)
*  - Beat detection with visual effects
*  - 8 visualization styles (bars, circular, waveform, spectrum, galaxy, matrix, VU, liquid)
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
    trebleNode: BiquadFilterNode | null;
    compressorNode: DynamicsCompressorNode | null;
    reverbNode: ConvolverNode | null;
    gainNode: GainNode | null;
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

    // Visual Effects
    private particles: Particle[] = [];
    private particlesEnabled: boolean = true;
    private currentTheme: string = 'neon';
    private themes: Map<string, Theme> = new Map();
    private visualizationStyle: string = 'bars';
    
    // 🔄 Auto-Cycling Visualizations
    private autoCycleEnabled: boolean = false;
    private cycleInterval: number = 20000; // 20 seconds
    private cycleTimer: number | null = null;
    private visualizationModes: string[] = ['bars', 'circular', 'waveform', 'spectrum', 'galaxy', 'matrix', 'vu', 'liquid'];
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
        trebleNode: null,
        compressorNode: null,
        reverbNode: null,
        gainNode: null
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
    private lastKeyTime: number = 0;

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
        
        // Handle data updates for playlist from Power BI dataset
        if (options.dataViews && options.dataViews[0]) {
            this.updatePlaylistFromData(options.dataViews[0]);
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
            <div id="musicStudio" style="display: flex; flex-direction: column; height: 100%; background: ${this.themes.get(this.currentTheme)?.colors.background}; color: #fff; position: relative; overflow: hidden;">
                
                <!-- Particle Canvas (Background) -->
                <canvas id="particleCanvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;"></canvas>
                
                <!-- Title Bar -->
                <div style="position: relative; z-index: 10; padding: 8px 15px; background: rgba(0,0,0,0.9); text-align: center; border-bottom: 2px solid ${this.themes.get(this.currentTheme)?.colors.primary};">
                    <h2 style="margin: 0; font-size: 16px; color: ${this.themes.get(this.currentTheme)?.colors.primary}; font-weight: bold; text-shadow: 0 0 10px rgba(0,255,136,0.5);">
                        🎵 Power BI Next Step : Music Centre 🎵
                    </h2>
                </div>
                
                <!-- Main Music Player Controls -->
                <div id="audioControls" style="position: relative; z-index: 10; padding: 8px; background: rgba(0,0,0,0.8); border-radius: 8px; margin: 8px; box-shadow: 0 4px 16px rgba(0,255,136,0.4); backdrop-filter: blur(10px);">
                    
                    <!-- Theme Selector, Style Selector, Player Controls & Effects Toggle -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <select id="themeSelector" style="padding: 4px 8px; background: #333; color: #fff; border: 1px solid ${this.themes.get(this.currentTheme)?.colors.primary}; border-radius: 3px; cursor: pointer; font-size: 11px;">
                                <option value="neon">🌈 Neon</option>
                                <option value="cyberpunk">🤖 Cyberpunk</option>
                                <option value="retro">🕹️ Retro 80s</option>
                                <option value="nature">🌿 Nature</option>
                                <option value="fire">🔥 Fire</option>
                            </select>
                            <select id="visualStyle" style="padding: 4px 8px; background: #333; color: #fff; border: 1px solid ${this.themes.get(this.currentTheme)?.colors.primary}; border-radius: 3px; cursor: pointer; font-size: 11px;">
                                <option value="bars">📊 Bars</option>
                                <option value="circular">⭕ Circle</option>
                                <option value="waveform">〰️ Wave</option>
                                <option value="spectrum">🌈 Spectrum</option>
                                <option value="galaxy">🌌 Galaxy</option>
                                <option value="matrix">💚 Matrix</option>
                                <option value="vu">📊 VU</option>
                                <option value="liquid">🌊 Liquid</option>
                                <option value="auto-cycle">🔄 Auto-Cycle</option>
                            </select>
                        </div>
                        
                        <!-- Player Controls -->
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <button id="shuffleBtn" style="padding: 4px 6px; background: #444; border: none; border-radius: 3px; cursor: pointer; font-size: 10px; color: ${this.themes.get(this.currentTheme)?.colors.primary}; transition: all 0.2s;">
                                🔀
                            </button>
                            <button id="prevTrackBtn" style="padding: 4px 6px; background: #444; border: none; border-radius: 50%; cursor: pointer; font-size: 10px; color: ${this.themes.get(this.currentTheme)?.colors.primary}; transition: all 0.2s;">
                                ⏮️
                            </button>
                            <button id="skipBackBtn" style="padding: 4px 6px; background: #444; border: none; border-radius: 50%; cursor: pointer; font-size: 10px; color: ${this.themes.get(this.currentTheme)?.colors.primary}; transition: all 0.2s;">
                                ⏪
                            </button>
                            <button id="playPauseBtn" style="padding: 6px 8px; background: ${this.themes.get(this.currentTheme)?.colors.primary}; border: none; border-radius: 50%; cursor: pointer; font-weight: bold; font-size: 14px; color: #000; min-width: 32px; transition: all 0.2s; box-shadow: 0 2px 6px rgba(0,255,136,0.5);">
                                ▶️
                            </button>
                            <button id="skipForwardBtn" style="padding: 4px 6px; background: #444; border: none; border-radius: 50%; cursor: pointer; font-size: 10px; color: ${this.themes.get(this.currentTheme)?.colors.primary}; transition: all 0.2s;">
                                ⏩
                            </button>
                            <button id="nextTrackBtn" style="padding: 4px 6px; background: #444; border: none; border-radius: 50%; cursor: pointer; font-size: 10px; color: ${this.themes.get(this.currentTheme)?.colors.primary}; transition: all 0.2s;">
                                ⏭️
                            </button>
                            <button id="repeatBtn" style="padding: 4px 6px; background: #444; border: none; border-radius: 3px; cursor: pointer; font-size: 10px; color: ${this.themes.get(this.currentTheme)?.colors.primary}; transition: all 0.2s;">
                                🔁
                            </button>
                        </div>
                        
                        <div style="display: flex; gap: 6px; align-items: center;">
                            <button id="particlesToggle" style="padding: 4px 8px; background: ${this.themes.get(this.currentTheme)?.colors.primary}; border: none; border-radius: 3px; cursor: pointer; font-size: 10px; color: #000; font-weight: bold;">
                                ✨ Particles
                            </button>
                            <button id="fullscreenBtn" style="padding: 4px 8px; background: #444; border: none; border-radius: 3px; cursor: pointer; font-size: 10px; color: ${this.themes.get(this.currentTheme)?.colors.primary};">
                                🖥️ Full
                            </button>
                            <div style="display: flex; align-items: center; gap: 6px; font-size: 10px;">
                                <span>Beat:</span>
                                <div id="beatIndicator" style="width: 12px; height: 12px; border-radius: 50%; background: #333; border: 1px solid #555; transition: all 0.1s;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- File Upload & Playlist -->
                    <div style="display: grid; grid-template-columns: 1fr auto; gap: 8px; margin-bottom: 8px; align-items: start;">
                        <div>
                            <input type="file" id="audioFileInput" accept=".mp3,.wav,.ogg,.m4a,.flac" multiple
                                   style="width: 100%; padding: 6px; background: #333; color: #fff; border: 1px solid ${this.themes.get(this.currentTheme)?.colors.primary}; border-radius: 4px; cursor: pointer; font-size: 11px;">
                            <div id="trackInfo" style="margin-top: 4px; color: ${this.themes.get(this.currentTheme)?.colors.primary}; font-size: 11px; font-weight: bold; min-height: 16px;">
                                🎵 No tracks loaded
                            </div>
                        </div>
                        <div id="playlistContainer" style="max-height: 60px; overflow-y: auto; background: rgba(0,0,0,0.5); border-radius: 4px; min-width: 150px; border: 1px solid #444;">
                            <div id="playlistItems" style="padding: 4px;">
                                <div style="text-align: center; color: #666; font-size: 10px; padding: 8px;">Playlist empty</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Progress Bar & Time -->
                    <div style="margin-bottom: 6px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px; color: #aaa;">
                            <span id="currentTime">0:00</span>
                            <span id="trackMetadata" style="color: ${this.themes.get(this.currentTheme)?.colors.primary}; font-weight: bold; font-size: 10px;"></span>
                            <span id="totalTime">0:00</span>
                        </div>
                        <div style="background: #333; height: 6px; border-radius: 3px; position: relative; cursor: pointer; border: 1px solid #555;" id="progressContainer">
                            <div id="progressBar" style="background: linear-gradient(90deg, ${this.themes.get(this.currentTheme)?.colors.primary}, ${this.themes.get(this.currentTheme)?.colors.secondary}); height: 100%; width: 0%; border-radius: 3px; transition: width 0.1s;"></div>
                            <div id="beatFlash" style="position: absolute; top: -1px; left: 0; width: 100%; height: 8px; background: rgba(255,255,255,0.3); border-radius: 4px; opacity: 0; transition: opacity 0.1s;"></div>
                        </div>
                    </div>
                    
                    <!-- Audio Effects Controls -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 8px; margin-bottom: 8px; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 6px;">
                        <label style="display: flex; flex-direction: column; align-items: center; font-size: 10px; gap: 2px;">
                            🔊 Vol
                            <input type="range" id="volumeSlider" min="0" max="100" value="70" style="width: 100%; accent-color: ${this.themes.get(this.currentTheme)?.colors.primary}; height: 4px;">
                            <span id="volumeDisplay" style="color: ${this.themes.get(this.currentTheme)?.colors.primary}; font-weight: bold; font-size: 9px;">70%</span>
                        </label>
                        <label style="display: flex; flex-direction: column; align-items: center; font-size: 10px; gap: 2px;">
                            🎸 Bass
                            <input type="range" id="bassSlider" min="-12" max="12" value="0" style="width: 100%; accent-color: #ff6b6b; height: 4px;">
                            <span id="bassDisplay" style="color: #ff6b6b; font-weight: bold; font-size: 9px;">0dB</span>
                        </label>
                        <label style="display: flex; flex-direction: column; align-items: center; font-size: 10px; gap: 2px;">
                            🎺 Treb  
                            <input type="range" id="trebleSlider" min="-12" max="12" value="0" style="width: 100%; accent-color: #4ecdc4; height: 4px;">
                            <span id="trebleDisplay" style="color: #4ecdc4; font-weight: bold; font-size: 9px;">0dB</span>
                        </label>
                        <label style="display: flex; flex-direction: column; align-items: center; font-size: 10px; gap: 2px;">
                            🌊 Rev
                            <input type="range" id="reverbSlider" min="0" max="100" value="0" style="width: 100%; accent-color: #a8e6cf; height: 4px;">
                            <span id="reverbDisplay" style="color: #a8e6cf; font-weight: bold; font-size: 9px;">0%</span>
                        </label>
                    </div>
                </div>
                
                <!-- Visualizer Canvas Stack -->
                <div style="flex: 1; padding: 0 8px 8px 8px; position: relative; z-index: 5;">
                    <!-- Main 2D Equalizer Canvas -->
                    <canvas id="equalizerCanvas" style="width: 100%; height: 100%; border-radius: 8px; background: rgba(0,0,0,0.6); box-shadow: inset 0 2px 12px rgba(0,0,0,0.8), 0 0 20px rgba(0,255,136,0.2); backdrop-filter: blur(5px); border: 1px solid rgba(255,255,255,0.1);"></canvas>
                    
                    <!-- 3D WebGL Overlay Canvas -->
                    <canvas id="webglCanvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px; pointer-events: none; z-index: 10; opacity: 0.8;"></canvas>
                    
                    <!-- Particle Effects Canvas -->
                    <canvas id="particleCanvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px; pointer-events: none; z-index: 15; opacity: 0.9;"></canvas>
                </div>
                
                <!-- Keyboard Shortcuts Help -->
                <div id="shortcutsHelp" style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.9); padding: 12px; border-radius: 8px; font-size: 11px; color: #aaa; display: none; z-index: 15; border: 1px solid #444;">
                    <div style="color: ${this.themes.get(this.currentTheme)?.colors.primary}; font-weight: bold; margin-bottom: 5px;">🎹 Keyboard Shortcuts</div>
                    <div>SPACE: Play/Pause | ←→: Skip 10s | ↑↓: Volume | F: Fullscreen</div>
                    <div>1-8: Visualizations | T: Theme | P: Particles | S: Shuffle | R: Repeat</div>
                    <div>N: Next Track | b: Boss Mode | H: Toggle Help | ESC: Exit Fullscreen</div>
                </div>
                
                <audio id="audioPlayer" style="display: none;"></audio>
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

        this.setupAdvancedAudioSystem();
        this.startVisualizationLoop();
    }

    private async initializeAudioContext(): Promise<void> {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 512; // Increased for better frequency resolution
            this.analyser.smoothingTimeConstant = 0.8;
            
            this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
            this.timeData = new Uint8Array(this.analyser.frequencyBinCount);

            // Setup audio effects chain
            this.setupAudioEffects();
        }
    }

    private setupAudioEffects(): void {
        if (!this.audioContext) return;

        // Create audio effects nodes
        this.audioEffects.gainNode = this.audioContext.createGain();
        this.audioEffects.bassNode = this.audioContext.createBiquadFilter();
        this.audioEffects.trebleNode = this.audioContext.createBiquadFilter();
        this.audioEffects.compressorNode = this.audioContext.createDynamicsCompressor();

        // Configure filters
        this.audioEffects.bassNode.type = 'lowshelf';
        this.audioEffects.bassNode.frequency.value = 200;
        
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
            
            // Chain: source -> bass -> treble -> compressor -> gain -> analyser -> destination
            source.connect(this.audioEffects.bassNode);
            this.audioEffects.bassNode.connect(this.audioEffects.trebleNode);
            this.audioEffects.trebleNode.connect(this.audioEffects.compressorNode);
            this.audioEffects.compressorNode.connect(this.audioEffects.gainNode);
            this.audioEffects.gainNode.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
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

    private handleKeyDown(event: KeyboardEvent): void {
        const now = Date.now();
        
        // Prevent too rapid key presses
        if (now - this.lastKeyTime < 100) return;
        this.lastKeyTime = now;
        
        // Show shortcuts on any key press
        this.showKeyboardShortcuts();
        
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
        this.visualizationStyle = style;
        const visualSelect = this.target.querySelector('#visualStyle') as HTMLSelectElement;
        if (visualSelect) {
            visualSelect.value = style;
        }
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
        if (dataView.categorical?.categories?.[0]?.values) {
            const urls = dataView.categorical.categories[0].values as string[];
            const names = dataView.categorical.categories[1]?.values as string[] || [];
            
            this.playlist = [];
            urls.forEach((url, index) => {
                if (url && url.trim()) {
                    this.playlist.push({
                        name: names[index] || `Track ${index + 1}`,
                        url: url.trim(),
                        metadata: {}
                    });
                }
            });
            
            this.updatePlaylistUI();
        }
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
        
        // Also make Spotify methods accessible
        (window as any).playSpotifyTrack = (uri: string) => this.playSpotifyTrack(uri);
        (window as any).loadPlaylistTracks = (playlistId: string) => this.loadPlaylistTracks(playlistId);
    }

    private loadTrack(index: number): void {
        if (index < 0 || index >= this.playlist.length) return;

        this.currentTrackIndex = index;
        const track = this.playlist[index];
        
        this.audioElement.src = track.url;
        this.audioElement.load();
        
        this.updateTrackInfo();
        this.updatePlaylistUI();
        
        // Initialize audio context if not already done
        this.initializeAudioContext();
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
        if (!this.audioElement.paused) {
            this.audioElement.play();
        }
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
        if (!this.audioElement.paused) {
            this.audioElement.play();
        }
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

    private changeVisualizationStyle(event: Event): void {
        const select = event.target as HTMLSelectElement;
        
        if (select.value === 'auto-cycle') {
            this.startAutoCycle();
        } else {
            this.stopAutoCycle();
            this.visualizationStyle = select.value;
        }
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
            btn.textContent = this.particlesEnabled ? '✨ Particles ON' : '✨ Particles OFF';
            btn.style.background = this.particlesEnabled ? this.themes.get(this.currentTheme)?.colors.primary || '#00ff88' : '#666';
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

    // � Canvas Management

    private resizeCanvases(): void {
    
    private async initializeSpotify(): Promise<void> {
        try {
            // Check if we're in demo mode
            if (this.demoMode || this.spotifyClientId === 'demo-mode') {
                this.initializeDemoMode();
                return;
            }
            
            // Load Spotify Web API SDK
            await this.loadSpotifySDK();
            
            // Check for existing authentication
            this.spotifyAccessToken = localStorage.getItem('spotify_access_token');
            this.spotifyRefreshToken = localStorage.getItem('spotify_refresh_token');
            
            if (this.spotifyAccessToken) {
                await this.validateSpotifyToken();
            }
            
            this.updateSpotifyUI();
        } catch (error) {
            console.warn('Spotify initialization failed:', error);
            this.showSpotifyError('Spotify SDK failed to load - using demo mode');
            this.initializeDemoMode();
        }
    }

    private initializeDemoMode(): void {
        // Create demo playlists and content
        this.spotifyState.playlists = [
            {
                id: 'demo-favorites',
                name: '❤️ My Favorites',
                images: [{ url: 'https://via.placeholder.com/300x300/1ed760/ffffff?text=♫' }],
                tracks: { total: 42 }
            },
            {
                id: 'demo-chill',
                name: '🌊 Chill Vibes',
                images: [{ url: 'https://via.placeholder.com/300x300/4169e1/ffffff?text=🎵' }],
                tracks: { total: 28 }
            },
            {
                id: 'demo-workout',
                name: '💪 Workout Mix',
                images: [{ url: 'https://via.placeholder.com/300x300/ff4500/ffffff?text=🔥' }],
                tracks: { total: 35 }
            },
            {
                id: 'demo-focus',
                name: '🎯 Focus Flow',
                images: [{ url: 'https://via.placeholder.com/300x300/9932cc/ffffff?text=⚡' }],
                tracks: { total: 21 }
            }
        ];

        this.spotifyState.searchResults = [
            {
                name: 'Blinding Lights',
                artists: [{ name: 'The Weeknd' }],
                album: { images: [null, null, { url: 'https://via.placeholder.com/64x64/ff1493/ffffff?text=🎶' }] },
                duration_ms: 200040,
                uri: 'demo:track:blinding-lights'
            },
            {
                name: 'Levitating',
                artists: [{ name: 'Dua Lipa' }],
                album: { images: [null, null, { url: 'https://via.placeholder.com/64x64/00ced1/ffffff?text=✨' }] },
                duration_ms: 203064,
                uri: 'demo:track:levitating'
            },
            {
                name: 'Good 4 U',
                artists: [{ name: 'Olivia Rodrigo' }],
                album: { images: [null, null, { url: 'https://via.placeholder.com/64x64/ff69b4/ffffff?text=💜' }] },
                duration_ms: 178147,
                uri: 'demo:track:good-4-u'
            }
        ];

        // Show demo UI immediately
        this.updatePlaylistUI();
        this.updateSearchResultsUI();
        this.updateSpotifyUI();

        // Show demo notice
        this.showNotification('🎵 Demo Mode Active - Connect real Spotify for full features!', '#1ed760');
    }

    private async loadSpotifySDK(): Promise<void> {
        return new Promise((resolve, reject) => {
            if ((window as any).Spotify) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://sdk.scdn.co/spotify-player.js';
            script.async = true;
            
            script.onload = () => {
                (window as any).onSpotifyWebPlaybackSDKReady = () => {
                    resolve();
                };
            };
            
            script.onerror = () => reject(new Error('Failed to load Spotify SDK'));
            document.head.appendChild(script);
        });
    }

    private async authenticateSpotify(): Promise<void> {
        if (this.demoMode || this.spotifyClientId === 'demo-mode') {
            // Demo authentication
            this.spotifyState.isAuthenticated = true;
            this.updateSpotifyUI();
            this.showSpotifySuccess('🎉 Demo Mode Connected! (Use real credentials for Spotify)');
            return;
        }

        const scopes = [
            'streaming',
            'user-read-email',
            'user-read-private',
            'user-library-read',
            'user-library-modify',
            'user-read-playback-state',
            'user-modify-playback-state',
            'playlist-read-private',
            'playlist-read-collaborative'
        ].join(' ');

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.spotifyClientId,
            scope: scopes,
            redirect_uri: window.location.origin + window.location.pathname,
            state: this.generateRandomString(16)
        });

        const authUrl = `https://accounts.spotify.com/authorize?${params}`;
        
        // Store current state for callback
        localStorage.setItem('spotify_auth_state', params.get('state')!);
        
        // Open authentication in popup
        const popup = window.open(authUrl, 'spotify-auth', 'width=500,height=600');
        
        // Listen for authentication completion
        const checkClosed = setInterval(() => {
            if (popup?.closed) {
                clearInterval(checkClosed);
                this.handleSpotifyAuthCallback();
            }
        }, 1000);
    }

    private async handleSpotifyAuthCallback(): Promise<void> {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const storedState = localStorage.getItem('spotify_auth_state');

        if (state === null || state !== storedState) {
            this.showSpotifyError('Authentication state mismatch');
            return;
        }

        if (code) {
            try {
                await this.exchangeCodeForToken(code);
                this.spotifyState.isAuthenticated = true;
                this.updateSpotifyUI();
                await this.loadUserPlaylists();
                this.showSpotifySuccess('🎉 Connected to Spotify!');
            } catch (error) {
                this.showSpotifyError('Authentication failed: ' + error);
            }
        }
    }

    private async exchangeCodeForToken(code: string): Promise<void> {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: window.location.origin + window.location.pathname,
                client_id: this.spotifyClientId,
                client_secret: 'your-spotify-client-secret' // In production, use backend proxy
            })
        });

        if (!response.ok) {
            throw new Error('Token exchange failed');
        }

        const data = await response.json();
        this.spotifyAccessToken = data.access_token;
        this.spotifyRefreshToken = data.refresh_token;

        localStorage.setItem('spotify_access_token', this.spotifyAccessToken!);
        localStorage.setItem('spotify_refresh_token', this.spotifyRefreshToken!);
    }

    private async validateSpotifyToken(): Promise<boolean> {
        if (!this.spotifyAccessToken) return false;

        try {
            const response = await fetch('https://api.spotify.com/v1/me', {
                headers: {
                    'Authorization': `Bearer ${this.spotifyAccessToken}`
                }
            });

            if (response.ok) {
                this.spotifyState.isAuthenticated = true;
                return true;
            } else if (response.status === 401) {
                // Token expired, try refresh
                return await this.refreshSpotifyToken();
            }
        } catch (error) {
            console.error('Token validation failed:', error);
        }

        return false;
    }

    private async refreshSpotifyToken(): Promise<boolean> {
        if (!this.spotifyRefreshToken) return false;

        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: this.spotifyRefreshToken,
                    client_id: this.spotifyClientId,
                    client_secret: 'your-spotify-client-secret'
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.spotifyAccessToken = data.access_token;
                localStorage.setItem('spotify_access_token', this.spotifyAccessToken!);
                this.spotifyState.isAuthenticated = true;
                return true;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }

        return false;
    }

    private async loadUserPlaylists(): Promise<void> {
        if (!this.spotifyAccessToken) return;

        try {
            const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
                headers: {
                    'Authorization': `Bearer ${this.spotifyAccessToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.spotifyState.playlists = data.items;
                this.updatePlaylistUI();
            }
        } catch (error) {
            console.error('Failed to load playlists:', error);
        }
    }

    private async searchSpotify(query: string): Promise<void> {
        if (this.demoMode || this.spotifyClientId === 'demo-mode') {
            // Demo search results
            const demoResults = [
                {
                    name: `${query} - Hit Song`,
                    artists: [{ name: 'Popular Artist' }],
                    album: { images: [null, null, { url: 'https://via.placeholder.com/64x64/1ed760/ffffff?text=🎵' }] },
                    duration_ms: 210000 + Math.random() * 60000,
                    uri: `demo:track:${query.toLowerCase().replace(/\s/g, '-')}-1`
                },
                {
                    name: `${query} (Remix)`,
                    artists: [{ name: 'DJ Remix Master' }],
                    album: { images: [null, null, { url: 'https://via.placeholder.com/64x64/ff1493/ffffff?text=🎚️' }] },
                    duration_ms: 180000 + Math.random() * 90000,
                    uri: `demo:track:${query.toLowerCase().replace(/\s/g, '-')}-2`
                },
                {
                    name: `Best of ${query}`,
                    artists: [{ name: 'Compilation Artists' }],
                    album: { images: [null, null, { url: 'https://via.placeholder.com/64x64/00ced1/ffffff?text=💿' }] },
                    duration_ms: 195000 + Math.random() * 45000,
                    uri: `demo:track:${query.toLowerCase().replace(/\s/g, '-')}-3`
                }
            ];

            this.spotifyState.searchResults = demoResults;
            this.updateSearchResultsUI();
            this.showSpotifySuccess(`🔍 Found demo results for "${query}"`);
            return;
        }

        if (!this.spotifyAccessToken || !query.trim()) return;

        try {
            const response = await fetch(
                `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track,album,artist&limit=20`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.spotifyAccessToken}`
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                this.spotifyState.searchResults = data.tracks.items;
                this.updateSearchResultsUI();
            }
        } catch (error) {
            console.error('Search failed:', error);
        }
    }

    private async playSpotifyTrack(trackUri: string): Promise<void> {
        if (this.demoMode || trackUri.startsWith('demo:')) {
            // Demo playback simulation
            const track = this.spotifyState.searchResults.find(t => t.uri === trackUri);
            if (track) {
                this.spotifyState.currentTrack = track;
                this.spotifyState.isPlaying = true;
                this.updateNowPlayingUI();
                this.showSpotifySuccess(`🎵 Playing: ${track.name} (Demo Mode)`);
            }
            return;
        }

        if (!this.spotifyAccessToken) return;

        try {
            const response = await fetch('https://api.spotify.com/v1/me/player/play', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.spotifyAccessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    uris: [trackUri]
                })
            });

            if (response.ok) {
                this.spotifyState.isPlaying = true;
                await this.getCurrentSpotifyTrack();
                this.updateSpotifyUI();
            }
        } catch (error) {
            console.error('Playback failed:', error);
            this.showSpotifyError('Playback failed - make sure Spotify is open');
        }
    }

    private async getCurrentSpotifyTrack(): Promise<void> {
        if (!this.spotifyAccessToken) return;

        try {
            const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
                headers: {
                    'Authorization': `Bearer ${this.spotifyAccessToken}`
                }
            });

            if (response.ok && response.status !== 204) {
                const data = await response.json();
                this.spotifyState.currentTrack = data.item;
                this.spotifyState.isPlaying = data.is_playing;
                this.updateNowPlayingUI();
            }
        } catch (error) {
            console.error('Failed to get current track:', error);
        }
    }

    private updateSpotifyUI(): void {
        const authBtn = this.target.querySelector('#spotifyAuthBtn');
        const spotifyControls = this.target.querySelector('#spotifyControls');
        
        if (authBtn) {
            if (this.demoMode || this.spotifyClientId === 'demo-mode') {
                authBtn.textContent = this.spotifyState.isAuthenticated ? '🎵 Demo Mode' : '🎵 Try Demo';
                (authBtn as HTMLElement).style.background = this.spotifyState.isAuthenticated ? '#1DB954' : '#1ed760';
            } else {
                authBtn.textContent = this.spotifyState.isAuthenticated ? '🎵 Connected' : '🎵 Connect Spotify';
                (authBtn as HTMLElement).style.background = this.spotifyState.isAuthenticated ? '#1DB954' : '#1ed760';
            }
        }

        if (spotifyControls) {
            (spotifyControls as HTMLElement).style.display = this.spotifyState.isAuthenticated ? 'block' : 'none';
        }
    }

    private updatePlaylistUI(): void {
        const playlistContainer = this.target.querySelector('#spotifyPlaylists');
        if (!playlistContainer) return;

        playlistContainer.innerHTML = this.spotifyState.playlists.map(playlist => `
            <div class="playlist-item" onclick="loadPlaylistTracks('${playlist.id}')" style="
                padding: 8px; margin: 4px 0; background: rgba(255,255,255,0.1);
                border-radius: 4px; cursor: pointer; display: flex; align-items: center;
                transition: background 0.2s;
            " onmouseover="this.style.background='rgba(255,255,255,0.2)'" 
               onmouseout="this.style.background='rgba(255,255,255,0.1)'">
                <img src="${playlist.images[0]?.url || ''}" width="40" height="40" style="border-radius: 4px; margin-right: 10px;" />
                <div>
                    <div style="font-weight: bold; font-size: 12px;">${playlist.name}</div>
                    <div style="font-size: 10px; opacity: 0.7;">${playlist.tracks.total} tracks</div>
                </div>
            </div>
        `).join('');
    }

    private updateSearchResultsUI(): void {
        const searchContainer = this.target.querySelector('#spotifySearchResults');
        if (!searchContainer) return;

        searchContainer.innerHTML = this.spotifyState.searchResults.map(track => `
            <div class="search-result" onclick="playSpotifyTrack('${track.uri}')" style="
                padding: 6px; margin: 2px 0; background: rgba(255,255,255,0.05);
                border-radius: 3px; cursor: pointer; display: flex; align-items: center;
                font-size: 11px; transition: background 0.2s;
            " onmouseover="this.style.background='rgba(255,255,255,0.15)'" 
               onmouseout="this.style.background='rgba(255,255,255,0.05)'">
                <img src="${track.album.images[2]?.url || ''}" width="30" height="30" style="border-radius: 2px; margin-right: 8px;" />
                <div style="flex: 1;">
                    <div style="font-weight: bold;">${track.name}</div>
                    <div style="opacity: 0.7;">${track.artists.map(a => a.name).join(', ')}</div>
                </div>
                <div style="opacity: 0.5;">${this.formatDuration(track.duration_ms)}</div>
            </div>
        `).join('');
    }

    private updateNowPlayingUI(): void {
        const nowPlaying = this.target.querySelector('#spotifyNowPlaying');
        if (!nowPlaying || !this.spotifyState.currentTrack) return;

        const track = this.spotifyState.currentTrack;
        nowPlaying.innerHTML = `
            <div style="display: flex; align-items: center; background: rgba(29, 185, 84, 0.2); padding: 8px; border-radius: 4px;">
                <img src="${track.album.images[2]?.url || ''}" width="40" height="40" style="border-radius: 4px; margin-right: 10px;" />
                <div style="flex: 1;">
                    <div style="font-weight: bold; font-size: 12px;">${track.name}</div>
                    <div style="font-size: 10px; opacity: 0.7;">${track.artists.map(a => a.name).join(', ')}</div>
                </div>
                <div style="font-size: 10px; opacity: 0.5;">
                    ${this.spotifyState.isPlaying ? '▶️' : '⏸️'} Spotify
                </div>
            </div>
        `;
    }

    private showSpotifyError(message: string): void {
        this.showNotification(message, '#f44336');
    }

    private showSpotifySuccess(message: string): void {
        this.showNotification(message, '#4CAF50');
    }

    private showNotification(message: string, color: string): void {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed; top: 60px; right: 20px; z-index: 10000;
            background: ${color}; color: white; padding: 8px 16px;
            border-radius: 4px; font-size: 12px; font-family: sans-serif;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease, fadeOut 0.3s ease 3s forwards;
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3500);
    }

    private formatDuration(ms: number): string {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    private generateRandomString(length: number): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    private disconnectSpotify(): void {
        // Clear authentication
        this.spotifyAccessToken = null;
        this.spotifyRefreshToken = null;
        this.spotifyState.isAuthenticated = false;
        
        // Clear stored tokens
        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('spotify_refresh_token');
        localStorage.removeItem('spotify_auth_state');
        
        // Reset UI state
        this.spotifyState.currentTrack = null;
        this.spotifyState.playlists = [];
        this.spotifyState.searchResults = [];
        this.spotifyState.isPlaying = false;
        
        // Update UI
        this.updateSpotifyUI();
        this.showSpotifySuccess('🔓 Disconnected from Spotify');
        
        // Clear UI containers
        const nowPlaying = this.target.querySelector('#spotifyNowPlaying');
        const playlists = this.target.querySelector('#spotifyPlaylists');
        const searchResults = this.target.querySelector('#spotifySearchResults');
        
        if (nowPlaying) nowPlaying.innerHTML = '';
        if (playlists) playlists.innerHTML = '<div style="text-align: center; color: #666; font-size: 10px; padding: 8px;">Connect to see playlists</div>';
        if (searchResults) searchResults.innerHTML = '<div style="text-align: center; color: #666; font-size: 10px; padding: 8px;">Search for music</div>';
    }

    private async loadPlaylistTracks(playlistId: string): Promise<void> {
        if (!this.spotifyAccessToken) return;

        try {
            const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`, {
                headers: {
                    'Authorization': `Bearer ${this.spotifyAccessToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.spotifyState.searchResults = data.items.map((item: any) => item.track).filter(Boolean);
                this.updateSearchResultsUI();
                this.showSpotifySuccess(`🎵 Loaded playlist tracks`);
            }
        } catch (error) {
            console.error('Failed to load playlist tracks:', error);
            this.showSpotifyError('Failed to load playlist tracks');
        }
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
                trackInfo.textContent = `🎵 Now Playing: ${track.name}`;
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

    private resizeCanvases(): void {
        if (this.equalizerCanvas && this.particleCanvas) {
            const rect = this.equalizerCanvas.getBoundingClientRect();
            
            // Set actual canvas size
            this.equalizerCanvas.width = rect.width * window.devicePixelRatio;
            this.equalizerCanvas.height = rect.height * window.devicePixelRatio;
            
            this.particleCanvas.width = rect.width * window.devicePixelRatio;
            this.particleCanvas.height = rect.height * window.devicePixelRatio;
            
            // Scale context to match device pixel ratio
            this.canvasContext?.scale(window.devicePixelRatio, window.devicePixelRatio);
            this.particleContext?.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
    }

    private startVisualizationLoop(): void {
        this.animationId = requestAnimationFrame(() => this.visualizationLoop());
    }

    private visualizationLoop(): void {
        if (!this.canvasContext || !this.equalizerCanvas) return;

        this.clearCanvas();
        this.clearWebGLCanvas(); // NEW: Clear 3D canvas
        
        if (this.analyser && this.audioElement && !this.audioElement.paused) {
            (this.analyser.getByteFrequencyData as any)(this.frequencyData);
            (this.analyser.getByteTimeDomainData as any)(this.timeData);
            
            // 🚀 Enhanced analysis and effects
            this.detectBeat();
            this.analyzeMusicAdvanced(); // NEW: Advanced music analysis
            this.updateParticles();
            this.drawVisualization(); // This now includes all the new awesome features
            this.render3DVisualization(); // NEW: WebGL 3D rendering
        }

        this.drawParticles();
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
        if (!this.equalizerCanvas) return;
        
        const rect = this.equalizerCanvas.getBoundingClientRect();
        const theme = this.themes.get(this.currentTheme);
        
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: Math.random() * rect.width,
                y: rect.height,
                vx: (Math.random() - 0.5) * 4,
                vy: -Math.random() * 8 - 2,
                size: Math.random() * 6 + 2,
                color: theme?.particleColors[Math.floor(Math.random() * theme.particleColors.length)] || '#00ff88',
                life: 1,
                maxLife: 1,
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
            
            // Apply physics forces
            this.applyGravity(particle);
            this.applyMagneticFields(particle);
            this.applyMouseInteraction(particle);
            this.applyAirResistance(particle);
            
            // Update position based on velocity and acceleration
            this.updateParticleMotion(particle);
            
            // Handle collisions
            this.handleBoundaryCollisions(particle, rect);
            if (this.physicsSystem.particleCollisions) {
                this.handleParticleCollisions(particle);
            }
            
            // Update particle trail
            if (this.physicsSystem.trailsEnabled && particle.trail) {
                this.updateParticleTrail(particle);
            }
            
            // Update visual effects
            this.updateParticleVisuals(particle);
            
            // Age particle
            particle.life -= 0.01;
            
            // Remove dead particles or those outside expanded boundaries
            return particle.life > 0 && 
                   particle.x > -100 && particle.x < rect.width + 100 &&
                   particle.y > -100 && particle.y < rect.height + 100;
        });

        // Generate new ambient particles with physics
        this.generateAmbientParticles(rect);
        
        // Dynamically add magnetic fields based on audio
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
        if (particle.friction === undefined) particle.friction = 0.98;
        if (particle.bounce === undefined) particle.bounce = 0.3 + Math.random() * 0.5;
        if (particle.gravity === undefined) particle.gravity = 0.8 + Math.random() * 0.4;
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
        this.physicsSystem.boundaries.top = 0;
        this.physicsSystem.boundaries.bottom = rect.height;
    }

    private generateAmbientParticles(rect: DOMRect): void {
        if (!this.audioElement || this.audioElement.paused || !this.frequencyData) return;
        
        const avgFreq = this.frequencyData.reduce((a, b) => a + b, 0) / this.frequencyData.length;
        
        if (Math.random() < avgFreq / 255 * 0.15) {
            const theme = this.themes.get(this.currentTheme);
            const newParticle: Particle = {
                x: Math.random() * rect.width,
                y: rect.height + 10,
                vx: (Math.random() - 0.5) * 4,
                vy: -Math.random() * 5 - 2,
                size: Math.random() * 4 + 2,
                color: theme?.particleColors[Math.floor(Math.random() * theme.particleColors.length)] || '#00ff88',
                life: Math.random() * 2 + 1,
                maxLife: Math.random() * 2 + 1,
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
        
        // 🆕 Render magnetic fields (debug visualization)
        if (this.physicsSystem.magneticFieldEnabled) {
            this.drawMagneticFields();
        }
        
        this.particles.forEach(particle => {
            // 🆕 Draw particle trail first (behind particle)
            if (this.physicsSystem.trailsEnabled && particle.trail && particle.trail.length > 1) {
                this.drawParticleTrail(particle);
            }
            
            // Calculate dynamic properties
            const alpha = particle.life / particle.maxLife;
            const baseSize = particle.size * (0.3 + alpha * 0.7);
            const glowSize = baseSize * (1.5 + (particle.glowIntensity || 0) * 2);
            
            this.particleContext.save();
            
            // 🆕 Apply rotation if exists
            if (particle.rotation !== undefined) {
                this.particleContext.translate(particle.x, particle.y);
                this.particleContext.rotate(particle.rotation);
                this.particleContext.translate(-particle.x, -particle.y);
            }
            
            // 🆕 Enhanced color with physics-based effects
            const particleColor = this.getEnhancedParticleColor(particle, alpha);
            
            // 🆕 Multiple glow layers for intensity
            this.drawParticleGlow(particle, glowSize, particleColor, alpha);
            
            // Main particle body
            this.particleContext.globalAlpha = alpha;
            this.particleContext.fillStyle = particleColor;
            
            // 🆕 Physics-based particle shapes
            this.drawParticleShape(particle, baseSize);
            
            // 🆕 Collision flash effect
            if (particle.collided) {
                this.drawCollisionFlash(particle, baseSize);
            }
            
            this.particleContext.restore();
        });
        
        // 🆕 Draw mouse interaction indicator
        if (this.physicsSystem.mouseInteraction.enabled) {
            this.drawMouseInteractionZone();
        }
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
        }
        
        // Always draw enhanced effects on top
        this.updateBeatDetection();
        this.drawScreenFlash();
        this.updateSmartParticles();
        this.updateInteractiveElements();
        this.updateDynamicThemes();
        this.drawBackgroundEffects();
    }

    private drawFrequencyBars(): void {
        if (!this.canvasContext || !this.frequencyData || !this.equalizerCanvas) return;

        const rect = this.equalizerCanvas.getBoundingClientRect();
        const barCount = 64;
        const barWidth = rect.width / barCount;
        const theme = this.themes.get(this.currentTheme);

        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor(i * this.frequencyData.length / barCount);
            const barHeight = (this.frequencyData[dataIndex] / 255) * rect.height * 0.8;
            
            const gradient = this.canvasContext.createLinearGradient(0, rect.height, 0, rect.height - barHeight);
            gradient.addColorStop(0, theme?.colors.primary || '#00ff88');
            gradient.addColorStop(0.5, theme?.colors.secondary || '#00ccff');
            gradient.addColorStop(1, theme?.colors.accent || '#ff0080');
            
            this.canvasContext.fillStyle = gradient;
            this.canvasContext.fillRect(i * barWidth, rect.height - barHeight, barWidth - 2, barHeight);
            
            // Add glow effect
            this.canvasContext.shadowBlur = 10;
            this.canvasContext.shadowColor = theme?.colors.glow || '#00ff88';
            this.canvasContext.fillRect(i * barWidth, rect.height - barHeight, barWidth - 2, barHeight);
        }
    }

    private drawCircularEqualizer(): void {
        if (!this.canvasContext || !this.frequencyData || !this.equalizerCanvas) return;

        const rect = this.equalizerCanvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const maxRadius = Math.min(centerX, centerY) * 0.8;
        const barCount = 128;
        const theme = this.themes.get(this.currentTheme);

        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor(i * this.frequencyData.length / barCount);
            const barLength = (this.frequencyData[dataIndex] / 255) * maxRadius * 0.6;
            const angle = (i / barCount) * Math.PI * 2;
            
            const startX = centerX + Math.cos(angle) * (maxRadius * 0.3);
            const startY = centerY + Math.sin(angle) * (maxRadius * 0.3);
            const endX = centerX + Math.cos(angle) * (maxRadius * 0.3 + barLength);
            const endY = centerY + Math.sin(angle) * (maxRadius * 0.3 + barLength);
            
            const gradient = this.canvasContext.createLinearGradient(startX, startY, endX, endY);
            gradient.addColorStop(0, theme?.colors.primary || '#00ff88');
            gradient.addColorStop(1, theme?.colors.accent || '#ff0080');
            
            this.canvasContext.strokeStyle = gradient;
            this.canvasContext.lineWidth = 3;
            this.canvasContext.lineCap = 'round';
            
            this.canvasContext.beginPath();
            this.canvasContext.moveTo(startX, startY);
            this.canvasContext.lineTo(endX, endY);
            this.canvasContext.stroke();
        }
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

        const rect = this.equalizerCanvas.getBoundingClientRect();
        const theme = this.themes.get(this.currentTheme);
        
        // Create spectrum gradient
        for (let i = 0; i < this.frequencyData.length; i++) {
            const barHeight = (this.frequencyData[i] / 255) * rect.height;
            const hue = (i / this.frequencyData.length) * 360;
            
            this.canvasContext.fillStyle = `hsla(${hue}, 70%, 60%, 0.8)`;
            this.canvasContext.fillRect(
                (i / this.frequencyData.length) * rect.width,
                rect.height - barHeight,
                rect.width / this.frequencyData.length,
                barHeight
            );
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

        const rect = this.equalizerCanvas.getBoundingClientRect();
        const columns = 20;
        const columnWidth = rect.width / columns;
        
        for (let i = 0; i < columns; i++) {
            const dataIndex = Math.floor(i * this.frequencyData.length / columns);
            const intensity = this.frequencyData[dataIndex] / 255;
            const height = intensity * rect.height;
            
            // Draw falling characters
            this.canvasContext.fillStyle = `rgba(0, 255, 0, ${intensity})`;
            this.canvasContext.font = '14px monospace';
            
            for (let j = 0; j < height / 20; j++) {
                const char = String.fromCharCode(0x30A0 + Math.random() * 96);
                this.canvasContext.fillText(
                    char,
                    i * columnWidth + Math.random() * (columnWidth - 14),
                    j * 20 + ((Date.now() * intensity) % rect.height)
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

    private drawLiquidWave(): void {
        if (!this.canvasContext || !this.frequencyData || !this.equalizerCanvas) return;

        const rect = this.equalizerCanvas.getBoundingClientRect();
        const time = Date.now() * 0.002;
        const theme = this.themes.get(this.currentTheme);
        
        // Create liquid wave effect
        this.canvasContext.beginPath();
        
        for (let x = 0; x < rect.width; x += 5) {
            const dataIndex = Math.floor((x / rect.width) * this.frequencyData.length);
            const amplitude = (this.frequencyData[dataIndex] / 255) * rect.height * 0.3;
            const y = rect.height * 0.5 + Math.sin(x * 0.01 + time) * amplitude;
            
            if (x === 0) {
                this.canvasContext.moveTo(x, y);
            } else {
                this.canvasContext.lineTo(x, y);
            }
        }
        
        // Fill wave
        this.canvasContext.lineTo(rect.width, rect.height);
        this.canvasContext.lineTo(0, rect.height);
        this.canvasContext.closePath();
        
        const gradient = this.canvasContext.createLinearGradient(0, 0, 0, rect.height);
        gradient.addColorStop(0, theme?.colors.primary + '80' || '#00ff8880');
        gradient.addColorStop(1, theme?.colors.secondary + '40' || '#00ccff40');
        
        this.canvasContext.fillStyle = gradient;
        this.canvasContext.fill();
        
        // Wave outline
        this.canvasContext.strokeStyle = theme?.colors.primary || '#00ff88';
        this.canvasContext.lineWidth = 2;
        this.canvasContext.stroke();
    }

    // 🚀 ==================== AWESOME NEW FEATURES ====================

    // 1. 🌊 AUDIO SPECTRUM WATERFALL - Shows frequency history cascading down
    private drawAudioWaterfall(): void {
        if (!this.canvasContext || !this.frequencyData || !this.equalizerCanvas) return;

        const width = this.equalizerCanvas.width;
        const height = this.equalizerCanvas.height;
        
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

        const width = this.equalizerCanvas.width;
        const height = this.equalizerCanvas.height;
        
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

        const width = this.equalizerCanvas.width;
        const height = this.equalizerCanvas.height;
        
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

        const width = this.equalizerCanvas.width;
        const height = this.equalizerCanvas.height;
        
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

        const width = this.equalizerCanvas.width;
        const height = this.equalizerCanvas.height;
        
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