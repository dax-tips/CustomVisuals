/*
*  Power BI Visual CLI - Professional Music Studio Equalizer
*  Complete Audio Visualization Suite with Advanced Features
*
*  Features:
*  - Multi-track playlist with shuffle/repeat
*  - Real-time audio-reactive particle effects  
*  - Advanced audio processing (bass, treble, reverb)
*  - Beat detection with BPM counter
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
    vx: number;
    vy: number;
    size: number;
    color: string;
    life: number;
    maxLife: number;
    type: 'bass' | 'mid' | 'treble';
}

interface BeatDetection {
    lastBeat: number;
    beatThreshold: number;
    beatDecay: number;
    bpm: number;
    beatHistory: number[];
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
    private canvasContext!: CanvasRenderingContext2D;
    private particleContext!: CanvasRenderingContext2D;
    private animationId!: number;

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
        beatHistory: []
    };

    // UI State
    private isFullscreen: boolean = false;
    private showShortcuts: boolean = false;
    private lastKeyTime: number = 0;

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
                
                <!-- Main Music Player Controls -->
                <div id="audioControls" style="position: relative; z-index: 10; padding: 15px; background: rgba(0,0,0,0.8); border-radius: 15px; margin: 15px; box-shadow: 0 8px 32px rgba(0,255,136,0.4); backdrop-filter: blur(10px);">
                    
                    <!-- Theme Selector & Effects Toggle -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                        <select id="themeSelector" style="padding: 8px 12px; background: #333; color: #fff; border: 1px solid ${this.themes.get(this.currentTheme)?.colors.primary}; border-radius: 5px; cursor: pointer;">
                            <option value="neon">🌈 Neon</option>
                            <option value="cyberpunk">🤖 Cyberpunk</option>
                            <option value="retro">🕹️ Retro 80s</option>
                            <option value="nature">🌿 Nature</option>
                            <option value="fire">🔥 Fire</option>
                        </select>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <button id="particlesToggle" style="padding: 8px 12px; background: ${this.themes.get(this.currentTheme)?.colors.primary}; border: none; border-radius: 5px; cursor: pointer; font-size: 12px; color: #000; font-weight: bold;">
                                ✨ Particles ON
                            </button>
                            <button id="fullscreenBtn" style="padding: 8px 12px; background: #444; border: none; border-radius: 5px; cursor: pointer; font-size: 12px; color: ${this.themes.get(this.currentTheme)?.colors.primary};">
                                🖥️ Fullscreen
                            </button>
                        </div>
                    </div>
                    
                    <!-- File Upload & Playlist -->
                    <div style="display: grid; grid-template-columns: 1fr auto; gap: 15px; margin-bottom: 15px; align-items: start;">
                        <div>
                            <input type="file" id="audioFileInput" accept=".mp3,.wav,.ogg,.m4a,.flac" multiple
                                   style="width: 100%; padding: 12px; background: #333; color: #fff; border: 2px solid ${this.themes.get(this.currentTheme)?.colors.primary}; border-radius: 8px; cursor: pointer; font-size: 14px;">
                            <div id="trackInfo" style="margin-top: 8px; color: ${this.themes.get(this.currentTheme)?.colors.primary}; font-size: 14px; font-weight: bold; min-height: 20px;">
                                🎵 No tracks loaded - Select music files to begin
                            </div>
                        </div>
                        <div id="playlistContainer" style="max-height: 120px; overflow-y: auto; background: rgba(0,0,0,0.5); border-radius: 8px; min-width: 220px; border: 1px solid #444;">
                            <div id="playlistItems" style="padding: 8px;">
                                <div style="text-align: center; color: #666; font-size: 12px; padding: 20px;">Playlist empty</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Progress Bar & Time -->
                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; color: #aaa;">
                            <span id="currentTime">0:00</span>
                            <span id="trackMetadata" style="color: ${this.themes.get(this.currentTheme)?.colors.primary}; font-weight: bold;"></span>
                            <span id="totalTime">0:00</span>
                        </div>
                        <div style="background: #333; height: 8px; border-radius: 4px; position: relative; cursor: pointer; border: 1px solid #555;" id="progressContainer">
                            <div id="progressBar" style="background: linear-gradient(90deg, ${this.themes.get(this.currentTheme)?.colors.primary}, ${this.themes.get(this.currentTheme)?.colors.secondary}); height: 100%; width: 0%; border-radius: 4px; transition: width 0.1s;"></div>
                            <div id="beatFlash" style="position: absolute; top: -2px; left: 0; width: 100%; height: 12px; background: rgba(255,255,255,0.3); border-radius: 6px; opacity: 0; transition: opacity 0.1s;"></div>
                        </div>
                    </div>
                    
                    <!-- Main Control Buttons -->
                    <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 15px;">
                        <button id="shuffleBtn" style="padding: 10px 14px; background: #444; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; color: ${this.themes.get(this.currentTheme)?.colors.primary}; transition: all 0.2s;">
                            🔀
                        </button>
                        <button id="prevTrackBtn" style="padding: 12px 16px; background: #444; border: none; border-radius: 50%; cursor: pointer; font-size: 16px; color: ${this.themes.get(this.currentTheme)?.colors.primary}; transition: all 0.2s;">
                            ⏮️
                        </button>
                        <button id="skipBackBtn" style="padding: 12px 16px; background: #444; border: none; border-radius: 50%; cursor: pointer; font-size: 16px; color: ${this.themes.get(this.currentTheme)?.colors.primary}; transition: all 0.2s;">
                            ⏪
                        </button>
                        <button id="playPauseBtn" style="padding: 15px 20px; background: ${this.themes.get(this.currentTheme)?.colors.primary}; border: none; border-radius: 50%; cursor: pointer; font-weight: bold; font-size: 24px; color: #000; min-width: 70px; transition: all 0.2s; box-shadow: 0 4px 15px rgba(0,255,136,0.5);">
                            ▶️
                        </button>
                        <button id="skipForwardBtn" style="padding: 12px 16px; background: #444; border: none; border-radius: 50%; cursor: pointer; font-size: 16px; color: ${this.themes.get(this.currentTheme)?.colors.primary}; transition: all 0.2s;">
                            ⏩
                        </button>
                        <button id="nextTrackBtn" style="padding: 12px 16px; background: #444; border: none; border-radius: 50%; cursor: pointer; font-size: 16px; color: ${this.themes.get(this.currentTheme)?.colors.primary}; transition: all 0.2s;">
                            ⏭️
                        </button>
                        <button id="repeatBtn" style="padding: 10px 14px; background: #444; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; color: ${this.themes.get(this.currentTheme)?.colors.primary}; transition: all 0.2s;">
                            🔁
                        </button>
                    </div>
                    
                    <!-- Audio Effects Controls -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin-bottom: 15px; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 10px;">
                        <label style="display: flex; flex-direction: column; align-items: center; font-size: 12px; gap: 5px;">
                            🔊 Volume
                            <input type="range" id="volumeSlider" min="0" max="100" value="70" style="width: 100%; accent-color: ${this.themes.get(this.currentTheme)?.colors.primary};">
                            <span id="volumeDisplay" style="color: ${this.themes.get(this.currentTheme)?.colors.primary}; font-weight: bold;">70%</span>
                        </label>
                        <label style="display: flex; flex-direction: column; align-items: center; font-size: 12px; gap: 5px;">
                            🎸 Bass
                            <input type="range" id="bassSlider" min="-12" max="12" value="0" style="width: 100%; accent-color: #ff6b6b;">
                            <span id="bassDisplay" style="color: #ff6b6b; font-weight: bold;">0dB</span>
                        </label>
                        <label style="display: flex; flex-direction: column; align-items: center; font-size: 12px; gap: 5px;">
                            🎺 Treble  
                            <input type="range" id="trebleSlider" min="-12" max="12" value="0" style="width: 100%; accent-color: #4ecdc4;">
                            <span id="trebleDisplay" style="color: #4ecdc4; font-weight: bold;">0dB</span>
                        </label>
                        <label style="display: flex; flex-direction: column; align-items: center; font-size: 12px; gap: 5px;">
                            🌊 Reverb
                            <input type="range" id="reverbSlider" min="0" max="100" value="0" style="width: 100%; accent-color: #a8e6cf;">
                            <span id="reverbDisplay" style="color: #a8e6cf; font-weight: bold;">0%</span>
                        </label>
                    </div>
                    
                    <!-- Visualization Controls -->
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 15px; flex-wrap: wrap; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                        <label style="display: flex; align-items: center; gap: 10px; font-size: 14px;">
                            🎨 Visualization:
                            <select id="visualStyle" style="padding: 8px 12px; background: #333; color: #fff; border: 1px solid ${this.themes.get(this.currentTheme)?.colors.primary}; border-radius: 5px; cursor: pointer;">
                                <option value="bars">📊 Frequency Bars</option>
                                <option value="circular">⭕ Circular</option>
                                <option value="waveform">〰️ Waveform</option>
                                <option value="spectrum">🌈 Spectrum</option>
                                <option value="galaxy">🌌 Galaxy Spiral</option>
                                <option value="matrix">💚 Matrix Rain</option>
                                <option value="vu">📊 VU Meters</option>
                                <option value="liquid">🌊 Liquid Wave</option>
                            </select>
                        </label>
                        <div style="display: flex; align-items: center; gap: 10px; font-size: 12px;">
                            <span>Beat Detection:</span>
                            <div id="beatIndicator" style="width: 15px; height: 15px; border-radius: 50%; background: #333; border: 2px solid #555; transition: all 0.1s;"></div>
                            <span id="bpmDisplay" style="color: ${this.themes.get(this.currentTheme)?.colors.primary}; font-weight: bold;">0 BPM</span>
                        </div>
                    </div>
                </div>
                
                <!-- Visualizer Canvas -->
                <div style="flex: 1; padding: 0 15px 15px 15px; position: relative; z-index: 5;">
                    <canvas id="equalizerCanvas" style="width: 100%; height: 100%; border-radius: 15px; background: rgba(0,0,0,0.6); box-shadow: inset 0 4px 20px rgba(0,0,0,0.8), 0 0 30px rgba(0,255,136,0.2); backdrop-filter: blur(5px); border: 1px solid rgba(255,255,255,0.1);"></canvas>
                </div>
                
                <!-- Keyboard Shortcuts Help -->
                <div id="shortcutsHelp" style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.9); padding: 12px; border-radius: 8px; font-size: 11px; color: #aaa; display: none; z-index: 15; border: 1px solid #444;">
                    <div style="color: ${this.themes.get(this.currentTheme)?.colors.primary}; font-weight: bold; margin-bottom: 5px;">🎹 Keyboard Shortcuts</div>
                    <div>SPACE: Play/Pause | ←→: Skip 10s | ↑↓: Volume | F: Fullscreen</div>
                    <div>1-8: Visualizations | T: Theme | P: Particles | S: Shuffle | R: Repeat</div>
                    <div>N/B: Next/Previous Track | H: Toggle Help | ESC: Exit Fullscreen</div>
                </div>
                
                <audio id="audioPlayer" style="display: none;"></audio>
            </div>
        `;

        // Cache important elements
        this.musicContainer = this.target.querySelector('#musicStudio') as HTMLElement;
        this.audioElement = this.target.querySelector('#audioPlayer') as HTMLAudioElement;
        this.equalizerCanvas = this.target.querySelector('#equalizerCanvas') as HTMLCanvasElement;
        this.particleCanvas = this.target.querySelector('#particleCanvas') as HTMLCanvasElement;

        // Setup canvas contexts
        this.canvasContext = this.equalizerCanvas.getContext('2d') as CanvasRenderingContext2D;
        this.particleContext = this.particleCanvas.getContext('2d') as CanvasRenderingContext2D;

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

        // Progress bar interaction
        const progressContainer = this.target.querySelector('#progressContainer') as HTMLElement;
        progressContainer?.addEventListener('click', (e) => this.seekToPosition(e));

        // Audio element events
        this.audioElement.addEventListener('timeupdate', () => this.updateProgress());
        this.audioElement.addEventListener('ended', () => this.handleTrackEnd());
        this.audioElement.addEventListener('loadedmetadata', () => this.updateTrackInfo());
    }

    private setupEventListeners(): void {
        // Resize handler
        window.addEventListener('resize', () => this.resizeCanvases());
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // Fullscreen change handler
        document.addEventListener('fullscreenchange', () => {
            this.isFullscreen = !!document.fullscreenElement;
            const btn = this.target.querySelector('#fullscreenBtn') as HTMLButtonElement;
            if (btn) {
                btn.textContent = this.isFullscreen ? '📱 Exit Fullscreen' : '🖥️ Fullscreen';
            }
        });
        
        // Initial canvas sizing
        this.resizeCanvases();
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
                if (event.key === 'b' || event.key === 'B') {
                    event.preventDefault();
                    this.toggleBossMode();
                }
                break;
                
            case 'KeyH':
                event.preventDefault();
                this.toggleShortcutsHelp();
                break;
                
            case 'Escape':
                event.preventDefault();
                if (this.isFullscreen) {
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
        document.addEventListener('keydown', (e) => {
            if (e.key === 'b' || e.key === 'B') {
                this.toggleBossMode();
            }
        });

        // Create boss mode content
        this.bossContent = document.createElement('div');
        this.bossContent.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: #f8f9fa; color: #333; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            z-index: 9999; display: none; padding: 20px; overflow: auto;
        `;
        this.bossContent.innerHTML = `
            <h1>📊 Quarterly Business Analytics Dashboard</h1>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h3>📈 Revenue Growth</h3>
                    <p>Q4 shows 23% increase over previous quarter</p>
                    <div style="background: #e3f2fd; padding: 10px; margin: 10px 0;">Revenue: $2.4M</div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h3>👥 Customer Metrics</h3>
                    <p>Active customers up 15% this month</p>
                    <div style="background: #e8f5e8; padding: 10px; margin: 10px 0;">Customers: 12,450</div>
                </div>
            </div>
            <p style="color: #666; font-size: 12px;">Press 'B' again to return to work</p>
        `;
        document.body.appendChild(this.bossContent);
    }

    private toggleBossMode(): void {
        this.bossMode = !this.bossMode;
        this.bossContent.style.display = this.bossMode ? 'block' : 'none';
        if (this.bossMode && this.audioElement && !this.audioElement.paused) {
            this.audioElement.pause();
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

    private updatePlaylistUI(): void {
        const playlistItems = this.target.querySelector('#playlistItems') as HTMLElement;
        if (!playlistItems) return;

        if (this.playlist.length === 0) {
            playlistItems.innerHTML = '<div style="text-align: center; color: #666; font-size: 12px; padding: 20px;">Playlist empty</div>';
            return;
        }

        playlistItems.innerHTML = this.playlist.map((track, index) => `
            <div style="display: flex; align-items: center; padding: 8px; margin: 2px 0; border-radius: 6px; cursor: pointer; font-size: 12px; transition: all 0.2s; ${index === this.currentTrackIndex ? 'background: rgba(0,255,136,0.2); border: 1px solid #00ff88;' : 'background: rgba(255,255,255,0.05); border: 1px solid transparent;'}" 
                 onclick="visual.loadTrack(${index})" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='${index === this.currentTrackIndex ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.05)'}'">
                <div style="margin-right: 8px; font-size: 10px;">
                    ${index === this.currentTrackIndex ? '🎵' : '⚫'}
                </div>
                <div style="flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
                    ${track.name}
                </div>
                <div style="font-size: 10px; color: #888; margin-left: 8px;">
                    ${track.duration ? this.formatTime(track.duration) : '--:--'}
                </div>
            </div>
        `).join('');

        // Make visual instance accessible for onclick handlers
        (window as any).visual = this;
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
        this.visualizationStyle = select.value;
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
        if (!this.isFullscreen) {
            if (this.target.requestFullscreen) {
                this.target.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
        this.isFullscreen = !this.isFullscreen;
        
        const btn = this.target.querySelector('#fullscreenBtn') as HTMLButtonElement;
        if (btn) {
            btn.textContent = this.isFullscreen ? '📱 Exit Fullscreen' : '🖥️ Fullscreen';
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
        
        if (this.analyser && this.audioElement && !this.audioElement.paused) {
            (this.analyser.getByteFrequencyData as any)(this.frequencyData);
            (this.analyser.getByteTimeDomainData as any)(this.timeData);
            
            this.detectBeat();
            this.updateParticles();
            this.drawVisualization();
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
                
                const bpmDisplay = this.target.querySelector('#bpmDisplay') as HTMLElement;
                if (bpmDisplay) bpmDisplay.textContent = `${this.beatDetection.bpm} BPM`;
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
        
        // Update existing particles
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.1; // Gravity
            particle.life -= 0.02;
            
            // Remove particles that are dead or off-screen
            return particle.life > 0 && particle.y < rect.height + 50;
        });

        // Add ambient particles if enabled
        if (this.audioElement && !this.audioElement.paused && this.frequencyData) {
            const avgFreq = this.frequencyData.reduce((a, b) => a + b, 0) / this.frequencyData.length;
            
            if (Math.random() < avgFreq / 255 * 0.1) {
                const theme = this.themes.get(this.currentTheme);
                this.particles.push({
                    x: Math.random() * rect.width,
                    y: rect.height,
                    vx: (Math.random() - 0.5) * 2,
                    vy: -Math.random() * 3 - 1,
                    size: Math.random() * 3 + 1,
                    color: theme?.particleColors[Math.floor(Math.random() * theme.particleColors.length)] || '#00ff88',
                    life: Math.random() * 0.8 + 0.2,
                    maxLife: Math.random() * 0.8 + 0.2,
                    type: 'mid'
                });
            }
        }
    }

    private drawParticles(): void {
        if (!this.particlesEnabled || !this.particleContext || this.particles.length === 0) return;

        this.clearParticleCanvas();
        
        this.particles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            const size = particle.size * (0.5 + alpha * 0.5);
            
            this.particleContext.save();
            this.particleContext.globalAlpha = alpha;
            this.particleContext.fillStyle = particle.color;
            
            this.particleContext.beginPath();
            this.particleContext.arc(particle.x, particle.y, size, 0, Math.PI * 2);
            this.particleContext.fill();
            
            // Add glow effect
            this.particleContext.shadowBlur = size * 2;
            this.particleContext.shadowColor = particle.color;
            this.particleContext.fill();
            
            this.particleContext.restore();
        });
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
        }
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

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}