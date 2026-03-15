/*
*  Flight Simulator - Power BI Custom Visual
*  A fully interactive flight simulator with instruments and controls
*/
"use strict";

import powerbi from "powerbi-visuals-api";
import "./../style/visual.less";
import { GROUND_MAP_BASE64 } from "./ground-map-data";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

// Flight state interface
interface FlightState {
    // Position
    altitude: number;      // feet
    heading: number;       // degrees 0-360
    latitude: number;      // for terrain generation
    longitude: number;
    
    // Attitude
    pitch: number;         // degrees, positive = nose up
    roll: number;          // degrees, positive = right wing down
    yaw: number;           // degrees
    
    // Velocities
    airspeed: number;      // knots
    verticalSpeed: number; // feet per minute
    throttle: number;      // 0-100%
    
    // Control inputs
    elevatorInput: number;   // -1 to 1
    aileronInput: number;    // -1 to 1
    rudderInput: number;     // -1 to 1
    throttleInput: number;   // -1 to 1
}

// Terrain point for mountains
interface TerrainPoint {
    x: number;
    height: number;
    color: string;
}

// Cloud interface - now in world coordinates
interface Cloud {
    worldX: number;    // World X position
    worldZ: number;    // World Z position (depth)
    altitude: number;  // Cloud altitude in feet
    size: number;
    opacity: number;
}

// Ground object interface
interface GroundObject {
    worldX: number;
    worldZ: number;
    type: 'building' | 'skyscraper' | 'tree' | 'pineTree' | 'hangar' | 'runway' | 'tower' | 'house' | 'windmill';
    size: number;
    color: string;
    height: number;
}

// Cached rendering values to avoid recalculation
interface RenderCache {
    headingRad: number;
    cosHeading: number;
    sinHeading: number;
    pitchRad: number;
    altitudeUnits: number;
    horizonY: number;
    rollRad: number;
}

type SoundProfile = 'low' | 'medium' | 'high';
type GroundQuality = 'auto' | 'performance' | 'ultra';

export class Visual implements IVisual {
    private container: HTMLElement;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private animationId: number;
    private lastTime: number;
    private flight: FlightState;
    private keys: Set<string>;
    private terrain: TerrainPoint[][];
    private clouds: Cloud[];
    private cloudsRenderOrder: Cloud[];
    private groundObjects: GroundObject[];
    private isFocused: boolean;
    private width: number;
    private height: number;
    private stars: { x: number; y: number; brightness: number }[];
    private showMiniMap: boolean;
    private crashed: boolean;
    private crashMessage: string;
    
    // Performance optimization caches
    private renderCache: RenderCache;
    private groundTexture: HTMLCanvasElement;
    private groundTextureCtx: CanvasRenderingContext2D;
    private groundTextureData: Uint8ClampedArray;
    private groundMipmap1: Uint8ClampedArray;  // 2048x2048
    private groundMipmap2: Uint8ClampedArray;  // 1024x1024
    private worldRenderCanvas: HTMLCanvasElement;
    private worldRenderCtx: CanvasRenderingContext2D;
    private worldRenderScale: number;
    private groundRenderCanvas: HTMLCanvasElement;
    private groundRenderCtx: CanvasRenderingContext2D;
    private groundFrameImageData: ImageData | null;
    private sortedObjectsCache: { obj: GroundObject; viewX: number; viewZ: number; dist: number }[];
    private lastFrameTime: number;
    private frameCount: number;
    private fps: number;
    private groundImageLoaded: boolean;
    
    // WebGL for GPU-accelerated ground rendering
    private glCanvas: HTMLCanvasElement;
    private gl: WebGLRenderingContext | null;
    private glProgram: WebGLProgram | null;
    private glTexture: WebGLTexture | null;
    private glReady: boolean;

    // Engine audio (synthesized, throttle-reactive)
    private audioContext: AudioContext | null;
    private audioMasterGain: GainNode | null;
    private audioEngineOsc: OscillatorNode | null;
    private audioHarmonicOsc: OscillatorNode | null;
    private audioLfoOsc: OscillatorNode | null;
    private audioLfoGain: GainNode | null;
    private audioStarted: boolean;
    private audioMuted: boolean;

    // User-selectable runtime quality/sound profiles
    private soundProfile: SoundProfile;
    private groundQuality: GroundQuality;

    // Bound listeners so we can clean up on destroy
    private windowKeyDownHandler: (e: KeyboardEvent) => void;
    private windowKeyUpHandler: (e: KeyboardEvent) => void;
    private activationHandler: () => void;

    constructor(options: VisualConstructorOptions) {
        this.container = options.element;
        this.container.style.overflow = 'hidden';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.position = 'relative';
        
        // Create main canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.outline = 'none';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.tabIndex = 0;
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d')!;
        
        // Initialize flight state - start at bottom center of texture, flying north
        this.flight = {
            altitude: 5000,
            heading: 0,    // North
            latitude: 0,   // Bottom of texture (flying north into the map)
            longitude: 17, // Center of texture tile (4096/120/2 ≈ 17)
            pitch: 0,
            roll: 0,
            yaw: 0,
            airspeed: 120,
            verticalSpeed: 0,
            throttle: 50,
            elevatorInput: 0,
            aileronInput: 0,
            rudderInput: 0,
            throttleInput: 0
        };
        
        this.keys = new Set();
        this.isFocused = false;
        this.showMiniMap = true; // Mini map visible by default
        this.crashed = false;
        this.crashMessage = '';
        this.lastTime = performance.now();
        
        // Get initial dimensions from container
        const rect = this.container.getBoundingClientRect();
        this.width = rect.width || 400;
        this.height = rect.height || 300;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        // Generate terrain layers (multiple mountain ranges)
        this.terrain = [];
        for (let layer = 0; layer < 4; layer++) {
            this.terrain.push(this.generateTerrain(200, layer));
        }
        
        // Generate clouds in world space
        this.clouds = this.generateClouds(50);
        // Clouds are static in world coordinates, so sorting by worldZ once is enough
        this.cloudsRenderOrder = this.clouds.slice().sort((a, b) => b.worldZ - a.worldZ);
        
        // Generate ground objects
        this.groundObjects = this.generateGroundObjects(150);
        
        // Generate stars
        this.stars = this.generateStars(100);
        
        // Initialize render cache
        this.renderCache = {
            headingRad: 0,
            cosHeading: 1,
            sinHeading: 0,
            pitchRad: 0,
            altitudeUnits: 10,
            horizonY: 0,
            rollRad: 0
        };
        
        // Initialize sorted objects cache
        this.sortedObjectsCache = [];
        
        // Create ground texture canvas
        this.groundTexture = document.createElement('canvas');
        this.groundTexture.width = 1024;
        this.groundTexture.height = 1024;
        this.groundTextureCtx = this.groundTexture.getContext('2d')!;
        this.groundImageLoaded = false;
        
        // Initialize with empty data (will be filled by loadGroundImage)
        this.groundTextureData = new Uint8ClampedArray(1024 * 1024 * 4);
        this.groundMipmap1 = new Uint8ClampedArray(2048 * 2048 * 4);
        this.groundMipmap2 = new Uint8ClampedArray(1024 * 1024 * 4);
        
        // Initialize WebGL for GPU-accelerated ground rendering
        this.glCanvas = document.createElement('canvas');
        this.gl = null;
        this.glProgram = null;
        this.glTexture = null;
        this.glReady = false;
        this.initWebGL();

        // Initialize audio state (actual audio starts on user interaction)
        this.audioContext = null;
        this.audioMasterGain = null;
        this.audioEngineOsc = null;
        this.audioHarmonicOsc = null;
        this.audioLfoOsc = null;
        this.audioLfoGain = null;
        this.audioStarted = false;
        this.audioMuted = true;

        // Defaults tuned for keynote/demo use
        this.soundProfile = 'low';
        this.groundQuality = 'auto';

        this.windowKeyDownHandler = (e: KeyboardEvent) => this.handleGlobalKeyDown(e);
        this.windowKeyUpHandler = (e: KeyboardEvent) => this.handleGlobalKeyUp(e);
        this.activationHandler = () => this.activateInputAndAudio();
        
        // Load embedded ground image (base64)
        this.loadGroundImage();
        
        // Create offscreen canvas for ground rendering (allows transforms)
        this.worldRenderCanvas = document.createElement('canvas');
        this.worldRenderCtx = this.worldRenderCanvas.getContext('2d')!;
        this.worldRenderScale = 1;

        this.groundRenderCanvas = document.createElement('canvas');
        this.groundRenderCtx = this.groundRenderCanvas.getContext('2d')!;
        this.groundFrameImageData = null;
        
        // FPS tracking
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.fps = 60;
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start animation loop
        this.animate();
    }

    // Load ground image from embedded base64 data
    // This bypasses CSP restrictions in Power BI sandbox
    private loadGroundImage(): void {
        const img = new Image();
        
        img.onload = () => {
            // Image loaded successfully - draw to texture canvas
            const size = Math.min(img.width, img.height);
            this.groundTexture.width = size;
            this.groundTexture.height = size;
            this.groundTextureCtx.drawImage(img, 0, 0, size, size);
            
            // Extract pixel data for sampling (Level 0 - full resolution)
            const imageData = this.groundTextureCtx.getImageData(0, 0, size, size);
            this.groundTextureData = imageData.data;
            
            // Generate mipmaps for better distant rendering
            this.generateMipmaps(size);
            
            this.groundImageLoaded = true;
        };
        
        img.onerror = () => {
            // Silently fall back to procedural texture
        };
        
        // Load from embedded base64 data (CSP-safe)
        img.src = GROUND_MAP_BASE64;
    }
    
    // Generate downsampled mipmap levels for smoother distant rendering
    private generateMipmaps(sourceSize: number): void {
        const src = this.groundTextureData;
        
        // Mipmap level 1: 2048x2048 (half resolution)
        const size1 = Math.floor(sourceSize / 2);
        this.groundMipmap1 = new Uint8ClampedArray(size1 * size1 * 4);
        for (let y = 0; y < size1; y++) {
            for (let x = 0; x < size1; x++) {
                const srcX = x * 2;
                const srcY = y * 2;
                // Average 2x2 block
                const idx00 = (srcY * sourceSize + srcX) * 4;
                const idx10 = (srcY * sourceSize + srcX + 1) * 4;
                const idx01 = ((srcY + 1) * sourceSize + srcX) * 4;
                const idx11 = ((srcY + 1) * sourceSize + srcX + 1) * 4;
                const dstIdx = (y * size1 + x) * 4;
                this.groundMipmap1[dstIdx] = (src[idx00] + src[idx10] + src[idx01] + src[idx11]) >> 2;
                this.groundMipmap1[dstIdx + 1] = (src[idx00 + 1] + src[idx10 + 1] + src[idx01 + 1] + src[idx11 + 1]) >> 2;
                this.groundMipmap1[dstIdx + 2] = (src[idx00 + 2] + src[idx10 + 2] + src[idx01 + 2] + src[idx11 + 2]) >> 2;
                this.groundMipmap1[dstIdx + 3] = 255;
            }
        }
        
        // Mipmap level 2: 1024x1024 (quarter resolution)
        const size2 = Math.floor(size1 / 2);
        const mip1 = this.groundMipmap1;
        this.groundMipmap2 = new Uint8ClampedArray(size2 * size2 * 4);
        for (let y = 0; y < size2; y++) {
            for (let x = 0; x < size2; x++) {
                const srcX = x * 2;
                const srcY = y * 2;
                const idx00 = (srcY * size1 + srcX) * 4;
                const idx10 = (srcY * size1 + srcX + 1) * 4;
                const idx01 = ((srcY + 1) * size1 + srcX) * 4;
                const idx11 = ((srcY + 1) * size1 + srcX + 1) * 4;
                const dstIdx = (y * size2 + x) * 4;
                this.groundMipmap2[dstIdx] = (mip1[idx00] + mip1[idx10] + mip1[idx01] + mip1[idx11]) >> 2;
                this.groundMipmap2[dstIdx + 1] = (mip1[idx00 + 1] + mip1[idx10 + 1] + mip1[idx01 + 1] + mip1[idx11 + 1]) >> 2;
                this.groundMipmap2[dstIdx + 2] = (mip1[idx00 + 2] + mip1[idx10 + 2] + mip1[idx01 + 2] + mip1[idx11 + 2]) >> 2;
                this.groundMipmap2[dstIdx + 3] = 255;
            }
        }
        
        // Upload texture to WebGL if ready
        this.uploadTextureToWebGL();
    }
    
    // Initialize WebGL for GPU-accelerated ground rendering with proper mipmaps
    private initWebGL(): void {
        try {
            this.gl = this.glCanvas.getContext('webgl', { 
                antialias: true,
                premultipliedAlpha: false 
            });
            if (!this.gl) return;
            
            const gl = this.gl;
            
            // Vertex shader - transforms quad vertices
            const vsSource = `
                attribute vec2 aPosition;
                attribute vec2 aTexCoord;
                varying vec2 vTexCoord;
                void main() {
                    gl_Position = vec4(aPosition, 0.0, 1.0);
                    vTexCoord = aTexCoord;
                }
            `;
            
            // Fragment shader - samples texture with fog
            const fsSource = `
                precision mediump float;
                varying vec2 vTexCoord;
                uniform sampler2D uTexture;
                uniform float uFogStart;
                uniform float uFogEnd;
                uniform vec3 uFogColor;
                uniform float uDistance;
                void main() {
                    vec4 texColor = texture2D(uTexture, vTexCoord);
                    float fogFactor = clamp((uDistance - uFogStart) / (uFogEnd - uFogStart), 0.0, 1.0);
                    vec3 finalColor = mix(texColor.rgb, uFogColor, fogFactor);
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `;
            
            // Compile shaders
            const vs = gl.createShader(gl.VERTEX_SHADER)!;
            gl.shaderSource(vs, vsSource);
            gl.compileShader(vs);
            
            const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
            gl.shaderSource(fs, fsSource);
            gl.compileShader(fs);
            
            // Create program
            this.glProgram = gl.createProgram()!;
            gl.attachShader(this.glProgram, vs);
            gl.attachShader(this.glProgram, fs);
            gl.linkProgram(this.glProgram);
            
            // Create texture
            this.glTexture = gl.createTexture();
            
            this.glReady = true;
        } catch (e) {
            this.glReady = false;
        }
    }
    
    // Upload the ground texture to WebGL with mipmaps
    private uploadTextureToWebGL(): void {
        if (!this.gl || !this.glTexture || !this.groundImageLoaded) return;
        
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.glTexture);
        
        // Upload the main texture from the canvas
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.groundTexture);
        
        // Generate mipmaps for smooth distant rendering
        gl.generateMipmap(gl.TEXTURE_2D);
        
        // Set texture parameters for smooth filtering
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    }

    // Generate procedural ground texture - Utrecht, Netherlands aerial view
    // For PBIG.nl keynote - featuring canals, Dom Tower area, and Dutch urban layout
    private generateGroundTexture(): void {
        const ctx = this.groundTextureCtx;
        const w = 512;
        const h = 512;
        
        // Base color - urban/mixed area (grey-green)
        ctx.fillStyle = '#4a5a4a';
        ctx.fillRect(0, 0, w, h);
        
        // Create Utrecht-inspired layout
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        
        // Center point (Dom Tower area - center of Utrecht)
        const centerX = w * 0.5;
        const centerY = h * 0.5;
        
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                
                // Distance from center
                const dx = x - centerX;
                const dy = y - centerY;
                const distFromCenter = Math.sqrt(dx * dx + dy * dy);
                
                // Default urban color with subtle variation
                let r = 85 + (Math.random() - 0.5) * 20;
                let g = 80 + (Math.random() - 0.5) * 15;
                let b = 75 + (Math.random() - 0.5) * 15;
                
                // === OUDEGRACHT (Old Canal) - Utrecht's famous canal ===
                // Main canal running roughly north-south through center
                const canalWidth = 12;
                const mainCanalX = centerX + Math.sin(y * 0.015) * 15; // Slight curve
                if (Math.abs(x - mainCanalX) < canalWidth) {
                    r = 35; g = 65; b = 95; // Canal water (dark blue-green)
                    // Wharf edges
                    if (Math.abs(x - mainCanalX) > canalWidth - 3) {
                        r = 60; g = 55; b = 50; // Stone wharf
                    }
                }
                
                // === NIEUWEGRACHT (New Canal) - parallel canal ===
                const newCanalX = centerX + 80 + Math.sin(y * 0.012) * 10;
                if (Math.abs(x - newCanalX) < 8) {
                    r = 40; g = 70; b = 100;
                }
                
                // === SINGEL - Canal ring around old city ===
                const singelRadius = 180;
                const singelWidth = 10;
                if (Math.abs(distFromCenter - singelRadius) < singelWidth && distFromCenter > 100) {
                    r = 38; g = 68; b = 98;
                }
                
                // === CITY CENTER / DOM SQUARE AREA ===
                if (distFromCenter < 40) {
                    // Domplein (Dom Square) - open plaza
                    r = 180; g = 175; b = 165; // Light grey pavement
                    // Dom Tower footprint (center)
                    if (distFromCenter < 8) {
                        r = 140; g = 130; b = 110; // Tower base (darker)
                    }
                }
                
                // === PARKS (Wilhelminapark, Lepelenburg) ===
                // Park in southeast quadrant
                const parkCenterX = centerX + 100;
                const parkCenterY = centerY + 80;
                const parkDist = Math.sqrt((x - parkCenterX) ** 2 + (y - parkCenterY) ** 2);
                if (parkDist < 50) {
                    r = 50 + Math.random() * 20;
                    g = 100 + Math.random() * 30;
                    b = 45 + Math.random() * 15;
                    // Park paths
                    if (Math.abs((x - parkCenterX) + (y - parkCenterY)) < 3 ||
                        Math.abs((x - parkCenterX) - (y - parkCenterY)) < 3) {
                        r = 160; g = 155; b = 140;
                    }
                }
                
                // === MALIEBAAN - Tree-lined avenue ===
                if (Math.abs(y - centerY - 40) < 6 && x > centerX + 50 && x < centerX + 200) {
                    if (Math.abs(y - centerY - 40) < 2) {
                        r = 70; g = 65; b = 60; // Road
                    } else {
                        r = 40; g = 80; b = 35; // Trees
                    }
                }
                
                // === URBAN BLOCKS (residential areas) ===
                const blockSize = 35;
                const blockX = Math.floor(x / blockSize);
                const blockY = Math.floor(y / blockSize);
                const inBlockX = x % blockSize;
                const inBlockY = y % blockSize;
                
                // Outside canal ring - residential areas
                if (distFromCenter > singelRadius + 20) {
                    // Street grid
                    if (inBlockX < 3 || inBlockY < 3) {
                        r = 65; g = 62; b = 58; // Streets
                    } else {
                        // Building rooftops with variation per block
                        const blockSeed = (blockX * 7 + blockY * 13) % 5;
                        if (blockSeed === 0) {
                            r = 160; g = 80; b = 70; // Red/orange roofs (Dutch!)
                        } else if (blockSeed === 1) {
                            r = 90; g = 85; b = 80; // Grey roofs
                        } else if (blockSeed === 2) {
                            r = 50; g = 90; b = 45; // Gardens
                        } else {
                            r = 140 + Math.random() * 30;
                            g = 100 + Math.random() * 20;
                            b = 80 + Math.random() * 20;
                        }
                    }
                }
                
                // === CENTRAL STATION AREA (northwest) ===
                const stationX = centerX - 80;
                const stationY = centerY - 120;
                if (Math.abs(x - stationX) < 40 && Math.abs(y - stationY) < 25) {
                    r = 100; g = 95; b = 90; // Station building
                    // Train tracks
                    if (Math.abs(y - stationY) < 4) {
                        r = 50; g = 50; b = 55;
                    }
                }
                
                // === JAARBEURS (Convention Center) ===
                const jaarbeursX = centerX - 100;
                const jaarbeursY = centerY - 60;
                if (Math.abs(x - jaarbeursX) < 35 && Math.abs(y - jaarbeursY) < 30) {
                    r = 110; g = 105; b = 100; // Large building complex
                }
                
                data[idx] = Math.min(255, Math.max(0, r));
                data[idx + 1] = Math.min(255, Math.max(0, g));
                data[idx + 2] = Math.min(255, Math.max(0, b));
                data[idx + 3] = 255;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Add major roads
        ctx.strokeStyle = 'rgba(60, 58, 55, 0.9)';
        ctx.lineWidth = 4;
        
        // A2/A27 highway (curves around east side)
        ctx.beginPath();
        ctx.moveTo(w * 0.9, 0);
        ctx.quadraticCurveTo(w * 0.85, h * 0.5, w * 0.9, h);
        ctx.stroke();
        
        // A12 highway (east-west in south)
        ctx.beginPath();
        ctx.moveTo(0, h * 0.85);
        ctx.lineTo(w, h * 0.85);
        ctx.stroke();
        
        // Add text label for PBIG reference
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('UTRECHT', w / 2, h - 20);
        
        // Cache the texture data for 3D perspective rendering
        const finalImageData = ctx.getImageData(0, 0, w, h);
        this.groundTextureData = finalImageData.data;
    }

    private generateTerrain(points: number, layer: number): TerrainPoint[] {
        const terrain: TerrainPoint[] = [];
        const baseHeight = 0.1 + layer * 0.08;
        const variation = 0.15 - layer * 0.02;
        const colors = ['#1a472a', '#2d5a3f', '#3d6b4f', '#4a7c5f'];
        
        for (let i = 0; i <= points; i++) {
            const x = i / points;
            // Multiple octaves of noise for realistic mountains
            let height = baseHeight;
            height += Math.sin(x * 15 + layer) * variation * 0.5;
            height += Math.sin(x * 30 + layer * 2) * variation * 0.3;
            height += Math.sin(x * 60 + layer * 3) * variation * 0.15;
            height += Math.random() * 0.02;
            
            terrain.push({
                x,
                height: Math.max(0.05, height),
                color: colors[layer]
            });
        }
        return terrain;
    }

    private generateClouds(count: number): Cloud[] {
        const clouds: Cloud[] = [];
        for (let i = 0; i < count; i++) {
            clouds.push({
                worldX: (Math.random() - 0.5) * 20,  // Spread in world X
                worldZ: Math.random() * 15 + 2,      // Distance ahead
                altitude: Math.random() * 8000 + 3000, // 3000-11000 feet
                size: Math.random() * 100 + 60,
                opacity: Math.random() * 0.5 + 0.4
            });
        }
        return clouds;
    }

    private generateGroundObjects(count: number): GroundObject[] {
        const objects: GroundObject[] = [];
        
        // Utrecht-specific building types - more urban, canal houses, Dom Tower
        const types: Array<'building' | 'tree' | 'hangar' | 'runway' | 'tower' | 'house' | 'windmill'> = 
            ['building', 'building', 'house', 'house', 'tree', 'building', 'house', 'tree', 'windmill', 'house'];
        const colors = {
            building: ['#8a7060', '#7a6555', '#6a5a4a', '#9a8070'], // Dutch brown brick
            tree: ['#1a4d1a', '#2d5a2d', '#1f3d1f', '#2a4a2a'],
            hangar: ['#4a4a4a', '#5a5a5a'],
            runway: ['#333'],
            tower: ['#c44', '#a33'],
            house: ['#aa4422', '#993311', '#bb5533', '#cc6644'], // Orange-red Dutch roofs
            windmill: ['#ddd', '#ccc']
        };
        
        // ========== DOM TOWER - Utrecht's famous landmark! ==========
        // The Dom Tower is 112m tall, the tallest church tower in NL
        objects.push({
            worldX: 0,
            worldZ: 8,
            type: 'tower',
            size: 0.5,
            color: '#8a7060',
            height: 80  // Scaled appropriately for the scene
        });
        
        // ========== JAARBEURS (Convention Center - could host PBIG!) ==========
        objects.push({
            worldX: -8,
            worldZ: 5,
            type: 'hangar',
            size: 1.2,
            color: '#5a5a5a',
            height: 80
        });
        objects.push({
            worldX: -10,
            worldZ: 7,
            type: 'hangar',
            size: 1.0,
            color: '#4a4a4a',
            height: 70
        });
        
        // ========== UTRECHT CENTRAAL (Train Station area) ==========
        objects.push({
            worldX: -6,
            worldZ: 3,
            type: 'building',
            size: 1.0,
            color: '#666',
            height: 120
        });
        
        // ========== HOOG CATHARIJNE (Shopping mall) ==========
        objects.push({
            worldX: -4,
            worldZ: 4,
            type: 'building',
            size: 0.9,
            color: '#777',
            height: 100
        });
        
        // ========== CANAL HOUSES along Oudegracht ==========
        for (let i = 0; i < 12; i++) {
            // Houses along the canal (both sides)
            objects.push({
                worldX: -1.5 + (Math.random() - 0.5) * 0.5,
                worldZ: 4 + i * 2,
                type: 'house',
                size: 0.25 + Math.random() * 0.1,
                color: colors.house[Math.floor(Math.random() * colors.house.length)],
                height: 35 + Math.random() * 15
            });
            objects.push({
                worldX: 1.5 + (Math.random() - 0.5) * 0.5,
                worldZ: 4 + i * 2,
                type: 'house',
                size: 0.25 + Math.random() * 0.1,
                color: colors.house[Math.floor(Math.random() * colors.house.length)],
                height: 35 + Math.random() * 15
            });
        }
        
        // ========== WILHELMINAPARK (Trees) ==========
        for (let i = 0; i < 8; i++) {
            objects.push({
                worldX: 10 + Math.random() * 6,
                worldZ: 12 + Math.random() * 8,
                type: 'tree',
                size: 0.3 + Math.random() * 0.2,
                color: colors.tree[Math.floor(Math.random() * colors.tree.length)],
                height: 50 + Math.random() * 30
            });
        }
        
        // ========== WINDMILL (De Ster or similar) ==========
        objects.push({
            worldX: 15,
            worldZ: 25,
            type: 'windmill',
            size: 0.6,
            color: '#ddd',
            height: 130
        });
        
        // ========== Small runway (for the sim!) ==========
        objects.push({
            worldX: -20,
            worldZ: 30,
            type: 'runway',
            size: 5,
            color: '#333',
            height: 0.1
        });
        
        // ========== Scattered Utrecht urban objects ==========
        for (let i = 0; i < count; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const typeColors = colors[type];
            
            // Generate position - smaller Utrecht area
            let worldX: number, worldZ: number;
            do {
                worldX = (Math.random() - 0.5) * 60;  // Utrecht area: -30 to +30
                worldZ = Math.random() * 50 + 5;      // Objects from z=5 to z=55
            } while (
                // Keep Dom Tower area clear
                (Math.abs(worldX) < 3 && Math.abs(worldZ - 8) < 3) ||
                // Keep runway clear
                (Math.abs(worldX + 20) < 4 && Math.abs(worldZ - 30) < 10)
            );
            
            objects.push({
                worldX,
                worldZ,
                type: type,
                size: type === 'tree' ? Math.random() * 0.3 + 0.15 :
                      type === 'building' ? Math.random() * 0.6 + 0.3 :
                      type === 'tower' ? 0.25 :
                      type === 'windmill' ? 0.45 :
                      type === 'house' ? Math.random() * 0.25 + 0.15 :
                      Math.random() * 0.4 + 0.2,
                color: typeColors[Math.floor(Math.random() * typeColors.length)],
                height: type === 'tree' ? Math.random() * 40 + 30 :
                        type === 'building' ? Math.random() * 100 + 60 :
                        type === 'tower' ? Math.random() * 80 + 100 :
                        type === 'windmill' ? 100 :
                        type === 'house' ? Math.random() * 20 + 25 :
                        type === 'hangar' ? 45 : 10
            });
        }
        return objects;
    }

    private generateStars(count: number): { x: number; y: number; brightness: number }[] {
        const stars: { x: number; y: number; brightness: number }[] = [];
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random(),
                y: Math.random() * 0.5,
                brightness: Math.random() * 0.8 + 0.2
            });
        }
        return stars;
    }

    private setupEventListeners(): void {
        this.canvas.addEventListener('focus', () => {
            this.isFocused = true;
            this.ensureAudioStarted();
            this.setAudioMuted(false);
        });
        
        this.canvas.addEventListener('blur', () => {
            this.isFocused = false;
            this.keys.clear();
            this.flight.elevatorInput = 0;
            this.flight.aileronInput = 0;
            this.flight.rudderInput = 0;
            this.flight.throttleInput = 0;
            this.setAudioMuted(true);
        });

        // Activate focus/audio on any pointer interaction in the visual
        this.canvas.addEventListener('click', this.activationHandler);
        this.canvas.addEventListener('pointerdown', this.activationHandler);
        this.container.addEventListener('pointerdown', this.activationHandler);

        // Use window-level key listeners while active; this is more reliable in Power BI host
        window.addEventListener('keydown', this.windowKeyDownHandler);
        window.addEventListener('keyup', this.windowKeyUpHandler);
    }

    private activateInputAndAudio(): void {
        this.isFocused = true;
        this.canvas.focus();
        this.ensureAudioStarted();
        this.setAudioMuted(false);
    }

    private isControlKey(key: string): boolean {
        return key === 'arrowup' || key === 'arrowdown' || key === 'arrowleft' || key === 'arrowright' ||
            key === 'w' || key === 'a' || key === 's' || key === 'd' || key === 'r' ||
            key === 'm' || key === 'v' || key === 'g' || key === ' ';
    }

    private handleGlobalKeyDown(e: KeyboardEvent): void {
        if (!this.isFocused) return;

        const key = e.key.toLowerCase();
        if (!this.isControlKey(key)) return;

        this.ensureAudioStarted();
        this.setAudioMuted(false);

        // Toggle actions only once per key press, not on auto-repeat
        if (!e.repeat) {
            if (key === 'm') {
                this.showMiniMap = !this.showMiniMap;
            }
            if (key === 'v') {
                this.soundProfile = this.nextSoundProfile(this.soundProfile);
            }
            if (key === 'g') {
                this.groundQuality = this.nextGroundQuality(this.groundQuality);
            }
        }

        this.keys.add(key);
        e.preventDefault();
    }

    private handleGlobalKeyUp(e: KeyboardEvent): void {
        if (!this.isFocused) return;

        const key = e.key.toLowerCase();
        if (!this.isControlKey(key)) return;

        this.keys.delete(key);
        e.preventDefault();
    }

    private ensureAudioStarted(): void {
        if (this.audioStarted) {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                void this.audioContext.resume();
            }
            return;
        }

        const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextCtor) return;

        try {
            const ctx = new AudioContextCtor();

            const masterGain = ctx.createGain();
            masterGain.gain.value = 0;
            masterGain.connect(ctx.destination);

            const engineOsc = ctx.createOscillator();
            engineOsc.type = 'triangle';
            engineOsc.frequency.value = 55;

            const harmonicOsc = ctx.createOscillator();
            harmonicOsc.type = 'sine';
            harmonicOsc.frequency.value = 95;

            const engineGain = ctx.createGain();
            engineGain.gain.value = 0.55;

            const harmonicGain = ctx.createGain();
            harmonicGain.gain.value = 0.1;

            const lfoOsc = ctx.createOscillator();
            lfoOsc.type = 'sine';
            lfoOsc.frequency.value = 4.5;

            const lfoGain = ctx.createGain();
            lfoGain.gain.value = 2.2;

            engineOsc.connect(engineGain);
            harmonicOsc.connect(harmonicGain);
            engineGain.connect(masterGain);
            harmonicGain.connect(masterGain);

            lfoOsc.connect(lfoGain);
            lfoGain.connect(engineOsc.frequency);

            engineOsc.start();
            harmonicOsc.start();
            lfoOsc.start();

            this.audioContext = ctx;
            this.audioMasterGain = masterGain;
            this.audioEngineOsc = engineOsc;
            this.audioHarmonicOsc = harmonicOsc;
            this.audioLfoOsc = lfoOsc;
            this.audioLfoGain = lfoGain;
            this.audioStarted = true;
        } catch {
            this.audioStarted = false;
        }
    }

    private setAudioMuted(muted: boolean): void {
        this.audioMuted = muted;
        if (!this.audioContext || !this.audioMasterGain) return;
        const now = this.audioContext.currentTime;
        const target = muted ? 0 : Math.max(0.015, (this.flight.throttle / 100) * 0.12);
        this.audioMasterGain.gain.setTargetAtTime(target, now, 0.08);
    }

    private nextSoundProfile(current: SoundProfile): SoundProfile {
        if (current === 'low') return 'medium';
        if (current === 'medium') return 'high';
        return 'low';
    }

    private nextGroundQuality(current: GroundQuality): GroundQuality {
        if (current === 'auto') return 'performance';
        if (current === 'performance') return 'ultra';
        return 'auto';
    }

    private updateEngineSound(deltaTime: number): void {
        if (!this.audioStarted || !this.audioContext || !this.audioMasterGain || !this.audioEngineOsc || !this.audioHarmonicOsc || !this.audioLfoOsc || !this.audioLfoGain) {
            return;
        }

        if (this.audioContext.state === 'suspended' && this.isFocused) {
            void this.audioContext.resume();
        }

        const throttleNorm = Math.max(0, Math.min(1, this.flight.throttle / 100));
        const speedNorm = Math.max(0, Math.min(1, this.flight.airspeed / 320));

        let targetBaseFreq: number;
        let harmonicFreq: number;
        let lfoRate: number;
        let lfoDepth: number;

        // Switchable sound profiles for live preference testing
        if (this.soundProfile === 'high') {
            targetBaseFreq = 55 + throttleNorm * 125 + speedNorm * 24;
            harmonicFreq = targetBaseFreq * 1.9;
            lfoRate = 6 + throttleNorm * 14;
            lfoDepth = 2.1 + throttleNorm * 5.5;
        } else if (this.soundProfile === 'medium') {
            targetBaseFreq = 45 + throttleNorm * 103 + speedNorm * 20;
            harmonicFreq = targetBaseFreq * 1.7;
            lfoRate = 5 + throttleNorm * 11;
            lfoDepth = 1.6 + throttleNorm * 4.2;
        } else {
            // Lower, less buzzy engine profile
            targetBaseFreq = 38 + throttleNorm * 88 + speedNorm * 18;
            harmonicFreq = targetBaseFreq * 1.55;
            lfoRate = 4 + throttleNorm * 9;
            lfoDepth = 1.2 + throttleNorm * 3.5;
        }

        const baseGain = 0.018 + throttleNorm * 0.09 + speedNorm * 0.02;
        const targetGain = (this.audioMuted || this.crashed) ? 0 : baseGain;

        const now = this.audioContext.currentTime;
        const smoothing = Math.max(0.03, Math.min(0.12, deltaTime / 1000));

        this.audioEngineOsc.frequency.setTargetAtTime(targetBaseFreq, now, smoothing);
        this.audioHarmonicOsc.frequency.setTargetAtTime(harmonicFreq, now, smoothing);
        this.audioLfoOsc.frequency.setTargetAtTime(lfoRate, now, 0.15);
        this.audioLfoGain.gain.setTargetAtTime(lfoDepth, now, 0.12);
        this.audioMasterGain.gain.setTargetAtTime(targetGain, now, 0.1);
    }

    private processInput(): void {
        // Reset - R key (always available, even when crashed)
        if (this.keys.has('r')) {
            this.flight.altitude = 5000;
            this.flight.airspeed = 120;
            this.flight.pitch = 0;
            this.flight.roll = 0;
            this.flight.heading = 0;    // North
            this.flight.throttle = 50;
            this.flight.verticalSpeed = 0;
            this.flight.longitude = 17; // Center of texture tile
            this.flight.latitude = 0;   // Bottom of texture
            this.crashed = false;
            this.crashMessage = '';
            return; // Don't process other inputs on reset frame
        }
        
        // If crashed, don't process any other inputs
        if (this.crashed) {
            this.flight.elevatorInput = 0;
            this.flight.aileronInput = 0;
            this.flight.rudderInput = 0;
            return;
        }
        
        // Elevator (pitch) - Up/Down arrows
        if (this.keys.has('arrowup')) {
            this.flight.elevatorInput = -1; // Pull back = pitch up
        } else if (this.keys.has('arrowdown')) {
            this.flight.elevatorInput = 1;  // Push forward = pitch down
        } else {
            this.flight.elevatorInput *= 0.8; // Return to center
        }
        
        // Ailerons (roll) - Left/Right arrows
        if (this.keys.has('arrowleft')) {
            this.flight.aileronInput = -1; // Roll left (bank left to turn left)
        } else if (this.keys.has('arrowright')) {
            this.flight.aileronInput = 1;  // Roll right (bank right to turn right)
        } else {
            this.flight.aileronInput *= 0.8;
        }
        
        // Rudder - A/D keys
        if (this.keys.has('a')) {
            this.flight.rudderInput = -1; // Yaw left
        } else if (this.keys.has('d')) {
            this.flight.rudderInput = 1;  // Yaw right
        } else {
            this.flight.rudderInput *= 0.8;
        }
        
        // Throttle - W/S keys
        if (this.keys.has('w')) {
            this.flight.throttle = Math.min(100, this.flight.throttle + 0.5);
        }
        if (this.keys.has('s')) {
            this.flight.throttle = Math.max(0, this.flight.throttle - 0.5);
        }
        
        // Quick level - Space
        if (this.keys.has(' ')) {
            this.flight.roll *= 0.95;
            this.flight.pitch *= 0.95;
        }
    }

    private updatePhysics(deltaTime: number): void {
        // Don't update physics if crashed
        if (this.crashed) return;
        
        const dt = deltaTime / 1000; // Convert to seconds
        
        // Control response rates
        const pitchRate = 60;  // degrees per second at full input - fast for aerobatics!
        const rollRate = 60;
        const yawRate = 20;
        
        // Update attitude based on control inputs
        this.flight.pitch += this.flight.elevatorInput * pitchRate * dt;
        this.flight.roll += this.flight.aileronInput * rollRate * dt;
        
        // Rudder adds to yaw and slightly affects heading directly
        this.flight.yaw += this.flight.rudderInput * yawRate * dt;
        this.flight.heading += this.flight.rudderInput * 8 * dt;
        
        // Allow extreme pitch for aerobatics (and crashes!)
        this.flight.pitch = Math.max(-90, Math.min(90, this.flight.pitch));
        
        // Allow extreme roll for aerobatics
        this.flight.roll = Math.max(-180, Math.min(180, this.flight.roll));
        
        // Roll causes coordinated turn (heading change)
        // Bank angle determines turn rate
        const bankRad = this.flight.roll * Math.PI / 180;
        const turnRate = Math.tan(bankRad) * 9.8 / (this.flight.airspeed * 0.514) * (180 / Math.PI);
        this.flight.heading += turnRate * dt;
        this.flight.heading = ((this.flight.heading % 360) + 360) % 360;
        
        // Natural stability - aircraft wants to level out
        if (Math.abs(this.flight.aileronInput) < 0.1) {
            this.flight.roll *= Math.pow(0.985, dt * 60);
        }
        this.flight.yaw *= Math.pow(0.9, dt * 60);
        
        // === REALISTIC ALTITUDE/ATTITUDE/THROTTLE RELATIONSHIP ===
        
        // Throttle determines available power
        // At level flight, need ~50% throttle to maintain altitude at cruise
        const throttlePower = this.flight.throttle / 100;
        
        // Target airspeed based on throttle (more throttle = faster)
        const minSpeed = 60;
        const maxSpeed = 280;
        const targetSpeed = minSpeed + throttlePower * (maxSpeed - minSpeed);
        
        // Pitch affects airspeed - nose up = slower, nose down = faster
        const pitchRad = this.flight.pitch * Math.PI / 180;
        const pitchDrag = Math.sin(pitchRad) * 50; // Extra drag from climbing
        
        // Airspeed changes based on throttle and pitch
        const speedTarget = targetSpeed - pitchDrag;
        this.flight.airspeed += (speedTarget - this.flight.airspeed) * dt * 0.3;
        this.flight.airspeed = Math.max(40, Math.min(350, this.flight.airspeed));
        
        // Vertical speed determined by:
        // 1. Pitch attitude (nose up = climb, nose down = descend)
        // 2. Available excess power (throttle vs drag)
        // 
        // If throttle is high and pitch is up = climb
        // If throttle is low and pitch is up = slow down then descend
        // If throttle is high and pitch is down = speed up, slight descent
        // If throttle is low and pitch is down = descend faster
        
        const excessPower = (throttlePower - 0.4) * 2; // Normalized: -0.8 to +1.2
        const climbFromPitch = Math.sin(pitchRad) * this.flight.airspeed * 25; // Higher multiplier for dramatic dives!
        const climbFromPower = excessPower * 800; // fpm from excess power
        
        // Target vertical speed combines attitude and power
        const targetVS = climbFromPitch + climbFromPower;
        
        // Smooth transition to target VS
        this.flight.verticalSpeed += (targetVS - this.flight.verticalSpeed) * dt * 1.5;
        
        // Stall warning - if too slow and pitched up
        if (this.flight.airspeed < 70 && this.flight.pitch > 5) {
            this.flight.verticalSpeed -= 200 * dt; // Start sinking
            this.flight.pitch -= 5 * dt; // Nose drops in stall
        }
        
        // Update altitude (faster rate for dramatic dives!)
        this.flight.altitude += this.flight.verticalSpeed * dt / 30;
        
        // Ground collision - CRASH!
        if (this.flight.altitude <= 0 && !this.crashed) {
            this.crashed = true;
            this.flight.altitude = 0;
            this.flight.airspeed = 0;
            this.flight.verticalSpeed = 0;
            
            // Different crash messages based on how bad it was
            const impactSpeed = Math.abs(this.flight.verticalSpeed);
            if (impactSpeed > 3000) {
                this.crashMessage = '💥 TOTAL DESTRUCTION! 💥\\nYour data pipeline has been terminated.';
            } else if (impactSpeed > 1500) {
                this.crashMessage = '💥 CRASHED! 💥\\nYour queries have hit rock bottom.';
            } else if (Math.abs(this.flight.pitch) > 20 || Math.abs(this.flight.roll) > 30) {
                this.crashMessage = '💥 CRASH LANDING! 💥\\nInvalid approach angle detected.';
            } else {
                this.crashMessage = '🛬 ROUGH LANDING 🛬\\nConnection terminated unexpectedly.';
            }
        }
        
        // Building collision detection!
        if (!this.crashed) {
            this.checkBuildingCollision();
        }
        
        // Ceiling - air gets thin
        if (this.flight.altitude > 35000) {
            this.flight.verticalSpeed -= 100 * dt;
        }
        if (this.flight.altitude > 45000) {
            this.flight.altitude = 45000;
        }
        
        // Update world position based on heading and airspeed
        const headingRad = this.flight.heading * Math.PI / 180;
        const groundSpeed = this.flight.airspeed * Math.cos(pitchRad); // Horizontal component
        // Movement speed: at 120 kts, move about 0.6 units per second
        this.flight.longitude += Math.sin(headingRad) * groundSpeed * dt * 0.005;
        this.flight.latitude += Math.cos(headingRad) * groundSpeed * dt * 0.005;
    }

    private checkBuildingCollision(): void {
        // Player position in world coordinates
        const playerX = this.flight.longitude;
        const playerZ = this.flight.latitude;
        const playerAlt = this.flight.altitude;
        
        for (const obj of this.groundObjects) {
            // Skip non-collidable objects (runways, trees are short)
            if (obj.type === 'runway') continue;
            
            // Calculate distance to object
            const dx = obj.worldX - playerX;
            const dz = obj.worldZ - playerZ;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            // Collision radius based on object size
            const collisionRadius = obj.size * 0.8;
            
            // Check if we're close enough horizontally AND below the object's height
            if (distance < collisionRadius && playerAlt < obj.height) {
                this.crashed = true;
                this.flight.airspeed = 0;
                this.flight.verticalSpeed = 0;
                
                // Different messages based on what we hit - Utrecht themed!
                switch (obj.type) {
                    case 'windmill':
                        this.crashMessage = '💥 WINDMILL STRIKE! 💥\\nDutch wind power overload!';
                        break;
                    case 'tower':
                        this.crashMessage = '💥 DOM TOWER HIT! 💥\\nUtrecht landmark collision!';
                        break;
                    case 'building':
                    case 'skyscraper':
                        this.crashMessage = '💥 BUILDING IMPACT! 💥\\nHoog Catharijne collision!';
                        break;
                    case 'hangar':
                        this.crashMessage = '💥 JAARBEURS CRASH! 💥\\nConvention center breach!';
                        break;
                    case 'house':
                        this.crashMessage = '💥 CANAL HOUSE HIT! 💥\\nOudegracht property damage!';
                        break;
                    case 'tree':
                    case 'pineTree':
                        this.crashMessage = '🌲 WILHELMINAPARK! 🌲\\nTree strike in the park.';
                        break;
                    default:
                        this.crashMessage = '💥 UTRECHT OBSTACLE! 💥\\nUnexpected object in flight path.';
                }
                return; // Stop checking after first collision
            }
        }
    }

    private animate = (): void => {
        const currentTime = performance.now();
        const deltaTime = Math.min(currentTime - this.lastTime, 100); // Cap at 100ms
        this.lastTime = currentTime;
        
        // Track FPS
        this.frameCount++;
        if (currentTime - this.lastFrameTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFrameTime = currentTime;
        }
        
        this.processInput();
        this.updatePhysics(deltaTime);
        this.updateEngineSound(deltaTime);
        this.updateRenderCache(); // Pre-calculate common values
        this.render();
        
        this.animationId = requestAnimationFrame(this.animate);
    }
    
    // Pre-calculate values used multiple times in render
    private updateRenderCache(): void {
        const cache = this.renderCache;
        cache.headingRad = this.flight.heading * Math.PI / 180;
        cache.cosHeading = Math.cos(cache.headingRad);
        cache.sinHeading = Math.sin(cache.headingRad);
        cache.pitchRad = this.flight.pitch * Math.PI / 180;
        cache.altitudeUnits = this.flight.altitude / 500;
        cache.rollRad = -this.flight.roll * Math.PI / 180;
    }

    private getTargetWorldRenderScale(w: number, h: number): number {
        if (this.groundQuality === 'ultra') {
            return 1;
        }

        if (this.groundQuality === 'performance') {
            return 0.72;
        }

        // AUTO mode: fixed/stable scale for smooth visual experience (no pumping/jumping)
        let scale = 0.9;
        const maxDim = Math.max(w, h);
        if (maxDim > 1700) scale -= 0.08;
        else if (maxDim > 1400) scale -= 0.04;

        return Math.max(0.58, Math.min(1, scale));
    }

    private render(): void {
        const ctx = this.ctx;
        const cache = this.renderCache;
        
        // Use canvas dimensions directly to ensure sync
        const w = this.canvas.width || this.width;
        const h = this.canvas.height || this.height;
        
        // Don't render if canvas is too small
        if (w < 50 || h < 50) return;
        
        // Stable world render scale (heavy 3D pass only)
        const targetScale = this.getTargetWorldRenderScale(w, h);
        this.worldRenderScale = targetScale;

        const worldW = Math.max(1, Math.floor(w * this.worldRenderScale));
        const worldH = Math.max(1, Math.floor(h * this.worldRenderScale));

        if (this.worldRenderCanvas.width !== worldW || this.worldRenderCanvas.height !== worldH) {
            this.worldRenderCanvas.width = worldW;
            this.worldRenderCanvas.height = worldH;
        }

        const worldCtx = this.worldRenderCtx;

        // Calculate altitude factor for sky colors
        const altitudeFactor = Math.min(this.flight.altitude / 40000, 1);

        // Fill world pass with top sky color
        const bgR = Math.floor(altitudeFactor * 5);
        const bgG = Math.floor(20 + (1 - altitudeFactor) * 30);
        const bgB = Math.floor(50 + (1 - altitudeFactor) * 100);
        worldCtx.setTransform(1, 0, 0, 1, 0, 0);
        worldCtx.fillStyle = `rgb(${bgR}, ${bgG}, ${bgB})`;
        worldCtx.fillRect(0, 0, worldW, worldH);

        // Calculate horizon position in world-pass coordinates
        const altitudeOffset = Math.min(this.flight.altitude / 30000, 0.1) * worldH;
        const horizonY = worldH * 0.5 - altitudeOffset + this.flight.pitch * (worldH / 90);
        cache.horizonY = horizonY;

        // Draw rotated world scene to offscreen canvas
        worldCtx.save();
        worldCtx.translate(worldW / 2, worldH * 0.5);
        worldCtx.rotate(cache.rollRad);
        worldCtx.translate(-worldW / 2, -worldH * 0.5);

        this.drawSky(worldCtx, worldW, worldH, horizonY, altitudeFactor);

        if (altitudeFactor > 0.3) {
            this.drawStars(worldCtx, worldW, worldH, horizonY, altitudeFactor);
        }

        this.drawSun(worldCtx, worldW, horizonY);
        this.drawClouds(worldCtx, worldW, worldH, horizonY);
        this.drawGround(worldCtx, worldW, worldH, horizonY);
        this.drawGroundObjects(worldCtx, worldW, worldH, horizonY);
        worldCtx.restore();

        // Composite world pass to full-resolution display
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(this.worldRenderCanvas, 0, 0, worldW, worldH, 0, 0, w, h);
        
        // Draw cockpit frame
        this.drawCockpit(ctx, w, h);
        
        // Draw instruments
        this.drawInstruments(ctx, w, h);

        // Draw mini map (if enabled)
        if (this.showMiniMap && !this.crashed) {
            this.drawMiniMap(ctx, w, h);
        }

        // Draw HUD (after minimap so mode labels are always visible)
        this.drawHUD(ctx, w, h);

        // Draw persistent mode strip (always on top)
        this.drawModeStatusStrip(ctx);
        
        // Draw crash screen if crashed
        if (this.crashed) {
            this.drawCrashScreen(ctx, w, h);
        }
        
        // Draw focus indicator
        this.drawFocusIndicator(ctx, w, h);
    }

    private drawSky(ctx: CanvasRenderingContext2D, w: number, h: number, horizonY: number, altFactor: number): void {
        // Extended sky area to cover all rotation angles
        const extendedH = Math.max(h, w) * 2;
        const gradient = ctx.createLinearGradient(0, -extendedH, 0, horizonY);
        
        // Sky color changes with altitude - proper RGB order (R, G, B)
        // At low altitude: bright blue sky. At high altitude: dark space
        const topR = Math.floor(altFactor * 5);           // Near black at high alt
        const topG = Math.floor(20 + (1 - altFactor) * 30); // Dark blue at high alt
        const topB = Math.floor(50 + (1 - altFactor) * 100); // Blue component
        
        const midR = Math.floor(50 - altFactor * 40);     // Less red at high alt
        const midG = Math.floor(120 - altFactor * 60);    // Some green for cyan tint
        const midB = Math.floor(200 - altFactor * 80);    // Strong blue
        
        // Horizon color - subtle, close to mid color (thin horizon band)
        const horizR = Math.floor(70 - altFactor * 50);   // Subtle lightening
        const horizG = Math.floor(140 - altFactor * 60);  // Slightly lighter
        const horizB = Math.floor(210 - altFactor * 70);  // Blue horizon
        
        gradient.addColorStop(0, `rgb(${topR}, ${topG}, ${topB})`);
        gradient.addColorStop(0.5, `rgb(${midR}, ${midG}, ${midB})`);  // Mid color
        gradient.addColorStop(1, `rgb(${horizR}, ${horizG}, ${horizB})`);  // Subtle horizon
        
        ctx.fillStyle = gradient;
        // Draw extra large rectangle to cover rotation
        ctx.fillRect(-w * 2, -extendedH, w * 5, extendedH + horizonY + h);
    }

    private drawStars(ctx: CanvasRenderingContext2D, w: number, h: number, horizonY: number, altFactor: number): void {
        const starOpacity = (altFactor - 0.3) / 0.7;
        
        for (const star of this.stars) {
            const x = star.x * w * 2 - w * 0.5;
            const y = star.y * horizonY;
            
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness * starOpacity})`;
            ctx.fill();
        }
    }

    private drawSun(ctx: CanvasRenderingContext2D, w: number, horizonY: number): void {
        const sunX = w * 0.75;
        const sunY = horizonY * 0.3;
        const sunRadius = 30;
        
        // Sun glow
        const glowGradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius * 4);
        glowGradient.addColorStop(0, 'rgba(255, 255, 200, 0.8)');
        glowGradient.addColorStop(0.3, 'rgba(255, 200, 100, 0.3)');
        glowGradient.addColorStop(1, 'rgba(255, 150, 50, 0)');
        
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius * 4, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();
        
        // Sun body
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffd0';
        ctx.fill();
    }

    private drawClouds(ctx: CanvasRenderingContext2D, w: number, h: number, horizonY: number): void {
        const cache = this.renderCache;
        const perspectiveFov = w * 0.375;

        // Stable cloud density per quality mode (avoid FPS-threshold popping)
        const cloudStride = this.groundQuality === 'performance' ? 2 : 1;

        for (let i = 0; i < this.cloudsRenderOrder.length; i += cloudStride) {
            const cloud = this.cloudsRenderOrder[i];
            // World position relative to aircraft
            const relX = cloud.worldX - this.flight.longitude * 100;
            const relZ = cloud.worldZ - this.flight.latitude * 100;
            
            // Rotate based on heading - use cached values
            const viewX = relX * cache.cosHeading - relZ * cache.sinHeading;
            const viewZ = relX * cache.sinHeading + relZ * cache.cosHeading;
            
            // Skip if behind us
            if (viewZ < 0.5) continue;
            
            // Perspective projection
            const perspective = perspectiveFov / viewZ;
            const screenX = w / 2 + viewX * perspective;
            
            // Vertical position based on cloud altitude vs aircraft altitude
            const altDiff = cloud.altitude - this.flight.altitude;
            const screenY = horizonY - (altDiff / 50) * perspective;
            
            // Size based on distance
            const size = cloud.size * perspective / 50;
            
            // Skip if off screen or too small
            if (screenX < -size || screenX > w + size) continue;
            if (screenY < -size || screenY > horizonY + 50) continue;
            if (size < 5) continue;
            
            // Fade with distance
            const alpha = Math.min(cloud.opacity, cloud.opacity * (1 - viewZ / 20));
            if (alpha > 0.05) {
                this.drawCloud(ctx, screenX, screenY, size, alpha);
            }
        }
    }

    private drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, opacity: number): void {
        // Draw cloud shadow first (offset down and slightly transparent)
        ctx.fillStyle = `rgba(100, 100, 120, ${opacity * 0.3})`;
        const shadowOffset = size * 0.15;
        
        // Cloud circles definition - create once
        const circles = [
            { dx: 0, dy: 0, r: size * 0.5 },
            { dx: -size * 0.35, dy: size * 0.1, r: size * 0.35 },
            { dx: size * 0.35, dy: size * 0.1, r: size * 0.4 },
            { dx: -size * 0.15, dy: -size * 0.15, r: size * 0.35 },
            { dx: size * 0.2, dy: -size * 0.1, r: size * 0.3 },
        ];
        
        // Draw shadow layer
        for (const c of circles) {
            ctx.beginPath();
            ctx.arc(x + c.dx + shadowOffset, y + c.dy + shadowOffset, c.r, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw cloud with gradient for 3D effect - batch all circles in one path
        const gradient = ctx.createRadialGradient(x, y - size * 0.2, 0, x, y, size * 0.8);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
        gradient.addColorStop(0.7, `rgba(240, 245, 255, ${opacity * 0.9})`);
        gradient.addColorStop(1, `rgba(200, 210, 230, ${opacity * 0.7})`);
        ctx.fillStyle = gradient;
        
        // Draw main cloud in single batch
        ctx.beginPath();
        for (const c of circles) {
            ctx.moveTo(x + c.dx + c.r, y + c.dy);
            ctx.arc(x + c.dx, y + c.dy, c.r, 0, Math.PI * 2);
        }
        ctx.fill();
    }

    private drawGround(ctx: CanvasRenderingContext2D, w: number, h: number, horizonY: number): void {
        // Fast per-pixel ground rendering with bilinear filtering and mipmaps
        const cache = this.renderCache;
        const acX = this.flight.longitude;
        const acZ = this.flight.latitude;
        const cosHeading = cache.cosHeading;
        const sinHeading = cache.sinHeading;
        const altitudeUnits = cache.altitudeUnits;
        const fov = w * 0.5;
        
        const textureSize = 4096;
        const groundScale = 120;
        
        // Roll margin calculation - increased for hard turns
        const rollAbs = Math.abs(cache.rollRad);
        const margin = Math.ceil(Math.max(w, h) * Math.sin(rollAbs) * 0.8 + 50);
        
        const expandedW = w + margin * 2;
        const expandedH = h + margin * 2;
        
        if (this.groundRenderCanvas.width !== expandedW || this.groundRenderCanvas.height !== expandedH) {
            this.groundRenderCanvas.width = expandedW;
            this.groundRenderCanvas.height = expandedH;
        }
        
        const offCtx = this.groundRenderCtx;
        
        // Clear canvas - make it transparent so sky shows through
        offCtx.clearRect(0, 0, expandedW, expandedH);
        
        const groundStartY = Math.max(0, Math.floor(horizonY) - margin);
        const groundEndY = h + margin;
        const groundHeight = groundEndY - groundStartY;
        if (groundHeight <= 0) return;
        
        if (!this.groundFrameImageData || this.groundFrameImageData.width !== expandedW || this.groundFrameImageData.height !== groundHeight) {
            this.groundFrameImageData = offCtx.createImageData(expandedW, groundHeight);
        }

        const imgData = this.groundFrameImageData;
        const data = imgData.data;
        const td = this.groundTextureData;

        // Reuse backing buffer; clear to transparent each frame
        data.fill(0);
        
        // ImageData starts transparent (alpha=0) by default
        // We'll only fill pixels that are actually ground (below horizon)
        // Fog color must match sky horizon exactly: (70, 140, 210) at low altitude
        const fogR = 70, fogG = 140, fogB = 210;

        // Stable sampling per quality mode (avoid FPS-threshold jumping)
        let sampleStep: number;
        if (this.groundQuality === 'ultra') {
            sampleStep = w > 1500 ? 2 : 1;
        } else if (this.groundQuality === 'performance') {
            sampleStep = w > 1500 ? 4 : 3;
        } else {
            const maxDim = Math.max(w, h);
            sampleStep = maxDim > 1700 ? 3 : (maxDim > 1400 ? 2 : 2);
        }

        const rowStep = sampleStep;
        
        for (let row = 0; row < groundHeight; row += rowStep) {
            const screenY = groundStartY + row;
            const belowHorizon = screenY - horizonY;
            const rowOffset = row * expandedW * 4;
            
            // For rows at or above horizon, fill with transparent (skip) 
            // This lets the sky show through when rolled
            if (belowHorizon <= 0.1) {
                // Leave transparent (alpha = 0)
                continue;
            }
            
            const viewZ = (altitudeUnits * 150) / belowHorizon;
            if (viewZ < 0.1) continue;
            
            const clampedViewZ = Math.min(viewZ, 100);
            const perspective = fov / clampedViewZ;
            
            // Subtle fog only at extreme distance to hide horizon aliasing
            const fogFactor = Math.min(1, Math.max(0, (clampedViewZ - 60) / 40));
            const invFog = 1 - fogFactor;
            
            // Select mipmap level based on distance (reduces aliasing at distance)
            // Level 0: full res (4096) for close, Level 1: half (2048) for mid, Level 2: quarter (1024) for far
            let mipData: Uint8ClampedArray;
            let mipSize: number;
            let mipScale: number;
            if (clampedViewZ < 25) {
                mipData = td;
                mipSize = textureSize;
                mipScale = 1;
            } else if (clampedViewZ < 50) {
                mipData = this.groundMipmap1;
                mipSize = 2048;
                mipScale = 0.5;
            } else {
                mipData = this.groundMipmap2;
                mipSize = 1024;
                mipScale = 0.25;
            }
            
            // Coarser sampling for far rows (near horizon) where detail is less visible
            const farBoost = this.groundQuality === 'ultra' ? 0 : (this.groundQuality === 'performance' ? 2 : 1);
            const xStep = Math.min(7, sampleStep + (clampedViewZ > 35 ? farBoost : 0) + (clampedViewZ > 60 ? farBoost : 0));

            for (let screenX = -margin; screenX < w + margin; screenX += xStep) {
                const viewX = (screenX - w / 2) / perspective;
                
                // World coordinates
                const worldX = acX + (viewX * cosHeading + clampedViewZ * sinHeading);
                const worldZ = acZ + (-viewX * sinHeading + clampedViewZ * cosHeading);
                
                // Texture coordinates scaled to mipmap level
                const texXf = ((worldX * groundScale * mipScale) % mipSize + mipSize) % mipSize;
                const texYf = ((worldZ * groundScale * mipScale) % mipSize + mipSize) % mipSize;
                
                const texX0 = Math.floor(texXf);
                const texY0 = Math.floor(texYf);
                const texX1 = (texX0 + 1) % mipSize;
                const texY1 = (texY0 + 1) % mipSize;
                const fx = texXf - texX0;
                const fy = texYf - texY0;
                
                const idx00 = (texY0 * mipSize + texX0) * 4;
                const idx10 = (texY0 * mipSize + texX1) * 4;
                const idx01 = (texY1 * mipSize + texX0) * 4;
                const idx11 = (texY1 * mipSize + texX1) * 4;
                
                const w00 = (1 - fx) * (1 - fy);
                const w10 = fx * (1 - fy);
                const w01 = (1 - fx) * fy;
                const w11 = fx * fy;
                
                // Sample from selected mipmap with bilinear filtering
                const texR = (mipData[idx00] * w00 + mipData[idx10] * w10 + mipData[idx01] * w01 + mipData[idx11] * w11) | 0;
                const texG = (mipData[idx00+1] * w00 + mipData[idx10+1] * w10 + mipData[idx01+1] * w01 + mipData[idx11+1] * w11) | 0;
                const texB = (mipData[idx00+2] * w00 + mipData[idx10+2] * w10 + mipData[idx01+2] * w01 + mipData[idx11+2] * w11) | 0;
                
                // Apply subtle horizon fog
                const r = (texR * invFog + fogR * fogFactor) | 0;
                const g = (texG * invFog + fogG * fogFactor) | 0;
                const b = (texB * invFog + fogB * fogFactor) | 0;
                
                // Fill pixels
                const startPx = screenX + margin;
                const endPx = Math.min(startPx + xStep, expandedW);
                for (let px = Math.max(0, startPx); px < endPx; px++) {
                    const idx = rowOffset + px * 4;
                    data[idx] = r;
                    data[idx + 1] = g;
                    data[idx + 2] = b;
                    data[idx + 3] = 255;
                }
            }

            // Duplicate this row into the skipped rows for fast vertical upscaling
            if (rowStep > 1) {
                const srcStart = rowOffset;
                const srcEnd = rowOffset + expandedW * 4;
                for (let ry = 1; ry < rowStep && row + ry < groundHeight; ry++) {
                    data.set(data.subarray(srcStart, srcEnd), (row + ry) * expandedW * 4);
                }
            }
        }
        
        offCtx.putImageData(imgData, 0, groundStartY);
        ctx.drawImage(this.groundRenderCanvas, -margin, 0);
    }

    private drawGroundGrid(ctx: CanvasRenderingContext2D, w: number, h: number, horizonY: number): void {
        const cache = this.renderCache;
        
        // Altitude in world units (1 unit = ~500 feet for scaling)
        const altitudeUnits = cache.altitudeUnits;
        
        // Grid parameters
        const gridSpacing = 2; // World units between lines
        const numLines = 20;
        const viewDistance = 25;
        const fov = w * 0.5;
        
        // Aircraft world position
        const acX = this.flight.longitude;
        const acZ = this.flight.latitude;
        
        // Calculate the fractional offset within a grid cell (0 to 1)
        // This gives smooth scrolling without snapping
        const fracX = ((acX % gridSpacing) + gridSpacing) % gridSpacing;
        const fracZ = ((acZ % gridSpacing) + gridSpacing) % gridSpacing;
        
        ctx.lineWidth = 1;
        
        // Use cached trig values
        const cosHeading = cache.cosHeading;
        const sinHeading = cache.sinHeading;
        
        // Draw grid lines more efficiently - batch same-alpha lines
        ctx.beginPath();
        
        // Draw horizontal lines directly without storing all points
        for (let zi = -2; zi <= numLines; zi++) {
            const relZ = zi * gridSpacing - fracZ;
            let firstPoint = true;
            let lastScreenX = 0;
            let lastScreenY = 0;
            
            for (let xi = -numLines; xi <= numLines; xi++) {
                const relX = xi * gridSpacing - fracX;
                
                // Transform from aircraft-relative to view space
                const viewX = relX * cosHeading - relZ * sinHeading;
                const viewZ = relX * sinHeading + relZ * cosHeading;
                
                // Only draw if in front of aircraft
                if (viewZ > 0.5 && viewZ < viewDistance) {
                    const perspective = fov / viewZ;
                    const screenX = w / 2 + viewX * perspective;
                    const lookDownAngle = altitudeUnits / viewZ;
                    const screenY = horizonY + lookDownAngle * 150;
                    
                    if (screenY > horizonY && screenY < h) {
                        if (firstPoint) {
                            ctx.moveTo(screenX, screenY);
                            firstPoint = false;
                        } else {
                            ctx.lineTo(screenX, screenY);
                        }
                        lastScreenX = screenX;
                        lastScreenY = screenY;
                    }
                }
            }
        }
        
        const alpha = 0.15;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.stroke();
        
        // Draw vertical lines
        ctx.beginPath();
        for (let xi = -numLines; xi <= numLines; xi++) {
            const relX = xi * gridSpacing - fracX;
            let firstPoint = true;
            
            for (let zi = -2; zi <= numLines; zi++) {
                const relZ = zi * gridSpacing - fracZ;
                
                const viewX = relX * cosHeading - relZ * sinHeading;
                const viewZ = relX * sinHeading + relZ * cosHeading;
                
                if (viewZ > 0.5 && viewZ < viewDistance) {
                    const perspective = fov / viewZ;
                    const screenX = w / 2 + viewX * perspective;
                    const lookDownAngle = altitudeUnits / viewZ;
                    const screenY = horizonY + lookDownAngle * 150;
                    
                    if (screenY > horizonY && screenY < h) {
                        if (firstPoint) {
                            ctx.moveTo(screenX, screenY);
                            firstPoint = false;
                        } else {
                            ctx.lineTo(screenX, screenY);
                        }
                    }
                }
            }
        }
        ctx.stroke();
    }

    private drawTerrain(ctx: CanvasRenderingContext2D, w: number, h: number, horizonY: number): void {
        // Scroll based on position only, not heading (heading affects view rotation, not terrain position)
        const scrollForward = this.flight.latitude * 0.02;
        const scrollSide = this.flight.longitude * 0.02;
        
        // Draw each terrain layer (back to front)
        for (let layer = this.terrain.length - 1; layer >= 0; layer--) {
            const terrainLayer = this.terrain[layer];
            const layerOffset = layer * 0.1;
            const heightScale = (h - horizonY) * (0.04 - layer * 0.008);  // Minimal horizon terrain
            
            ctx.beginPath();
            ctx.moveTo(-w, h * 2);
            
            for (let i = 0; i < terrainLayer.length; i++) {
                const point = terrainLayer[i];
                // Only scroll based on position, not heading
                const x = ((point.x + scrollForward + scrollSide + layerOffset) % 1) * w * 2 - w * 0.5;
                const y = horizonY + heightScale * (1 - point.height);
                
                if (i === 0) {
                    ctx.lineTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            
            ctx.lineTo(w * 2, h * 2);
            ctx.closePath();
            
            // Create gradient for mountains
            const gradient = ctx.createLinearGradient(0, horizonY, 0, horizonY + heightScale);
            const baseColor = terrainLayer[0].color;
            const darkness = layer * 0.15;
            gradient.addColorStop(0, this.adjustColor(baseColor, -20 - darkness * 100));
            gradient.addColorStop(1, this.adjustColor(baseColor, 20 - darkness * 100));
            
            ctx.fillStyle = gradient;
            ctx.fill();
        }
    }

    private drawGroundObjects(ctx: CanvasRenderingContext2D, w: number, h: number, horizonY: number): void {
            const perspectiveFov = w * 0.5;

        const cache = this.renderCache;
        const acX = this.flight.longitude;
        const acZ = this.flight.latitude;
        const altitudeFeet = this.flight.altitude;
        const altitudeUnits = cache.altitudeUnits;
        
        // Reuse array to avoid allocation - clear and refill
        this.sortedObjectsCache.length = 0;
        
        // Use cached trig values
        const cosHeading = cache.cosHeading;
        const sinHeading = cache.sinHeading;
        
        for (const obj of this.groundObjects) {
            // Position relative to aircraft
            const relX = obj.worldX - acX;
            const relZ = obj.worldZ - acZ;
            
            // Rotate to view space using cached trig values
            const viewX = relX * cosHeading - relZ * sinHeading;
            const viewZ = relX * sinHeading + relZ * cosHeading;

            // Under load, drop very distant objects unless ultra quality is selected
            if (this.groundQuality !== 'ultra' && this.worldRenderScale < 0.75 && viewZ > 36) {
                continue;
            }
            
            // Only include objects in front and within range
            if (viewZ > 0.2 && viewZ < 50) {
                const dist = viewX * viewX + viewZ * viewZ; // Skip sqrt for sorting
                this.sortedObjectsCache.push({ obj, viewX, viewZ, dist });
            }
        }
        
        // Sort by distance (far to near) - using squared distance is fine for sorting
        this.sortedObjectsCache.sort((a, b) => b.dist - a.dist);
        
        // Pre-calculate altitude scale once
        const altitudeScale = Math.max(0.3, Math.min(1, 2500 / Math.max(altitudeFeet, 1000)));
        
        // Draw each object
        for (const { obj, viewX, viewZ } of this.sortedObjectsCache) {
            const perspective = perspectiveFov / viewZ;
            const screenX = w / 2 + viewX * perspective;
            
            // Y position based on looking DOWN at ground from altitude
            const lookDownAngle = altitudeUnits / viewZ;
            const groundY = horizonY + lookDownAngle * 150;
            
            // Size based on distance and altitude
            const baseSize = obj.size * perspective * 0.15 * altitudeScale;
            const heightPx = obj.height * perspective * 0.01 * altitudeScale;
            
            // Skip if off screen or too small
            if (screenX < -50 || screenX > w + 50) continue;
            if (groundY < horizonY + 2 || baseSize < 0.5) continue;
            
            // Only fade very distant objects (beyond 35 units)
            const alpha = viewZ > 35 ? Math.max(0, 1 - (viewZ - 35) / 15) : 1.0;
            if (alpha <= 0) continue;
            
            this.drawGroundObject(ctx, obj.type, screenX, groundY, baseSize, heightPx, obj.color, alpha);
        }
    }

    private drawGroundObject(ctx: CanvasRenderingContext2D, type: string, x: number, groundY: number, 
                             size: number, height: number, color: string, alpha: number): void {
        ctx.globalAlpha = alpha;
        
        switch (type) {
            case 'building':
                // Building shadow
                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.beginPath();
                ctx.moveTo(x - size * 15, groundY);
                ctx.lineTo(x + size * 15, groundY);
                ctx.lineTo(x + size * 15 + height * 0.3, groundY + 3);
                ctx.lineTo(x - size * 15 + height * 0.3, groundY + 3);
                ctx.fill();
                
                // Draw building with gradient for 3D effect
                const bw = size * 30;
                const bh = height;
                const buildingGrad = ctx.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0);
                buildingGrad.addColorStop(0, this.adjustColor(color, -20));
                buildingGrad.addColorStop(0.5, color);
                buildingGrad.addColorStop(1, this.adjustColor(color, -30));
                ctx.fillStyle = buildingGrad;
                ctx.fillRect(x - bw / 2, groundY - bh, bw, bh);
                
                // Windows - use proportional spacing based on building size
                if (bw > 4 && bh > 4) {
                    ctx.fillStyle = 'rgba(255, 255, 150, 0.8)';
                    const windowSpacingX = bw / 5;
                    const windowSpacingY = bh / 6;
                    const windowW = windowSpacingX * 0.6;
                    const windowH = windowSpacingY * 0.6;
                    for (let row = 0; row < 5; row++) {
                        for (let col = 0; col < 4; col++) {
                            if ((row + col) % 3 !== 0) {
                                const wx = x - bw / 2 + windowSpacingX * 0.3 + col * windowSpacingX;
                                const wy = groundY - bh + windowSpacingY * 0.3 + row * windowSpacingY;
                                ctx.fillRect(wx, wy, windowW, windowH);
                            }
                        }
                    }
                }
                break;
                
            case 'tree':
                // Tree shadow
                ctx.fillStyle = 'rgba(0, 40, 0, 0.3)';
                ctx.beginPath();
                ctx.ellipse(x + size * 5, groundY, size * 12, size * 4, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Tree trunk
                ctx.fillStyle = '#4a3520';
                ctx.fillRect(x - size * 2, groundY - height * 0.3, size * 4, height * 0.3);
                // Foliage with gradient
                const treeGrad = ctx.createRadialGradient(x - size * 5, groundY - height * 0.6, 0, x, groundY - height * 0.4, size * 20);
                treeGrad.addColorStop(0, '#3d7a3d');
                treeGrad.addColorStop(1, color);
                ctx.fillStyle = treeGrad;
                ctx.beginPath();
                ctx.arc(x, groundY - height * 0.5, size * 15, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(x - size * 8, groundY - height * 0.35, size * 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(x + size * 8, groundY - height * 0.35, size * 10, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'hangar':
                // Hangar shadow
                ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
                ctx.beginPath();
                ctx.ellipse(x + size * 20, groundY + 2, size * 30, size * 8, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Hangar (rounded roof)
                const hw = size * 50;
                const hh = height;
                ctx.fillStyle = color;
                ctx.fillRect(x - hw / 2, groundY - hh * 0.6, hw, hh * 0.6);
                ctx.beginPath();
                ctx.ellipse(x, groundY - hh * 0.6, hw / 2, hh * 0.4, 0, Math.PI, 0);
                ctx.fill();
                // Hangar door
                ctx.fillStyle = '#333';
                ctx.fillRect(x - hw * 0.35, groundY - hh * 0.5, hw * 0.7, hh * 0.5);
                break;
                
            case 'runway':
                // Runway lies FLAT on the ground - it's a horizontal surface
                // We just draw a small rectangle at ground level that shrinks with distance
                // The "height" parameter is ignored - runways have no height
                const rwHalfWidth = size * 1.5;  // Half-width on screen
                const rwLength = size * 0.8;     // Small length on screen (foreshortened)
                
                // Dark asphalt surface
                ctx.fillStyle = '#2a2a2a';
                ctx.fillRect(x - rwHalfWidth, groundY - rwLength, rwHalfWidth * 2, rwLength);
                
                // Edge markings (white lines on sides)
                ctx.fillStyle = '#fff';
                ctx.fillRect(x - rwHalfWidth, groundY - rwLength, 1, rwLength);
                ctx.fillRect(x + rwHalfWidth - 1, groundY - rwLength, 1, rwLength);
                
                // Center line dashes
                const dashLen = rwLength / 6;
                for (let i = 0; i < 3; i++) {
                    ctx.fillRect(x - 0.5, groundY - rwLength + i * dashLen * 2, 1, dashLen);
                }
                
                // Threshold markings
                ctx.fillRect(x - rwHalfWidth * 0.7, groundY - 2, rwHalfWidth * 1.4, 1);
                break;
                
            case 'tower':
                // Tower shadow
                ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
                ctx.fillRect(x + size * 2, groundY - height * 0.1, height * 0.8, size * 4);
                
                // Control tower
                const tw = size * 10;
                ctx.fillStyle = '#888';
                ctx.fillRect(x - tw / 2, groundY - height, tw, height);
                // Tower cab
                ctx.fillStyle = '#466';
                ctx.fillRect(x - tw, groundY - height - tw * 2, tw * 2, tw * 2);
                // Windows
                ctx.fillStyle = 'rgba(150, 220, 255, 0.8)';
                ctx.fillRect(x - tw + 2, groundY - height - tw * 1.8, tw * 2 - 4, tw * 1.2);
                // Antenna
                ctx.fillStyle = '#c00';
                ctx.fillRect(x - 1, groundY - height - tw * 3, 2, tw);
                break;
                
            case 'house':
                // House body
                const houseW = size * 25;
                const houseH = height * 0.6;
                ctx.fillStyle = color;
                ctx.fillRect(x - houseW / 2, groundY - houseH, houseW, houseH);
                // Roof
                ctx.fillStyle = '#8b4513';
                ctx.beginPath();
                ctx.moveTo(x - houseW / 2 - 3, groundY - houseH);
                ctx.lineTo(x, groundY - houseH - height * 0.4);
                ctx.lineTo(x + houseW / 2 + 3, groundY - houseH);
                ctx.closePath();
                ctx.fill();
                // Door
                ctx.fillStyle = '#4a3520';
                ctx.fillRect(x - 3, groundY - houseH * 0.5, 6, houseH * 0.5);
                break;
                
            case 'windmill':
                // Windmill tower
                ctx.fillStyle = '#ddd';
                ctx.beginPath();
                ctx.moveTo(x - size * 8, groundY);
                ctx.lineTo(x - size * 3, groundY - height);
                ctx.lineTo(x + size * 3, groundY - height);
                ctx.lineTo(x + size * 8, groundY);
                ctx.closePath();
                ctx.fill();
                // Blades
                ctx.strokeStyle = '#ccc';
                ctx.lineWidth = 3;
                const bladeLen = height * 0.6;
                const time = Date.now() / 1000;
                for (let i = 0; i < 3; i++) {
                    const angle = time * 2 + (i * Math.PI * 2 / 3);
                    ctx.beginPath();
                    ctx.moveTo(x, groundY - height);
                    ctx.lineTo(x + Math.cos(angle) * bladeLen, groundY - height + Math.sin(angle) * bladeLen);
                    ctx.stroke();
                }
                break;
        }
        
        ctx.globalAlpha = 1;
    }

    private adjustColor(hex: string, amount: number): string {
        const num = parseInt(hex.slice(1), 16);
        const r = Math.max(0, Math.min(255, (num >> 16) + amount));
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
        const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
        return `rgb(${r}, ${g}, ${b})`;
    }

    private drawCockpit(ctx: CanvasRenderingContext2D, w: number, h: number): void {
        // Cockpit frame - darker border around edge
        ctx.fillStyle = '#1a1a1a';
        
        // Top frame
        ctx.fillRect(0, 0, w, 25);
        
        // Bottom instrument panel area
        const panelTop = h * 0.65;
        const panelGradient = ctx.createLinearGradient(0, panelTop, 0, h);
        panelGradient.addColorStop(0, '#2a2a2a');
        panelGradient.addColorStop(0.1, '#1a1a1a');
        panelGradient.addColorStop(1, '#0a0a0a');
        ctx.fillStyle = panelGradient;
        ctx.fillRect(0, panelTop, w, h - panelTop);
        
        // Cockpit frame sides
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, 20, h);
        ctx.fillRect(w - 20, 0, 20, h);
        
        // Window frame (rounded corners effect)
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 15;
        ctx.strokeRect(10, 15, w - 20, panelTop - 10);
        
        // Cockpit struts
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.moveTo(0, 25);
        ctx.lineTo(60, 25);
        ctx.lineTo(90, panelTop);
        ctx.lineTo(0, panelTop);
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(w, 25);
        ctx.lineTo(w - 60, 25);
        ctx.lineTo(w - 90, panelTop);
        ctx.lineTo(w, panelTop);
        ctx.fill();
        
        // Center strut
        ctx.fillStyle = '#222';
        ctx.fillRect(w / 2 - 4, 25, 8, 20);
    }

    private drawInstruments(ctx: CanvasRenderingContext2D, w: number, h: number): void {
        const panelTop = h * 0.65;
        const panelHeight = h - panelTop;
        const instrumentSize = Math.min(panelHeight * 0.7, w / 7);
        const instrumentY = panelTop + panelHeight * 0.45;
        const spacing = w / 6;
        
        // Draw each instrument
        this.drawArtificialHorizon(ctx, spacing * 1, instrumentY, instrumentSize);
        this.drawAltimeter(ctx, spacing * 2, instrumentY, instrumentSize);
        this.drawAirspeedIndicator(ctx, spacing * 3, instrumentY, instrumentSize);
        this.drawHeadingIndicator(ctx, spacing * 4, instrumentY, instrumentSize);
        this.drawVerticalSpeedIndicator(ctx, spacing * 5, instrumentY, instrumentSize);
    }

    private drawInstrumentBase(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, label: string): void {
        // Outer bezel
        ctx.beginPath();
        ctx.arc(x, y, size / 2 + 4, 0, Math.PI * 2);
        ctx.fillStyle = '#444';
        ctx.fill();
        
        // Inner bezel
        ctx.beginPath();
        ctx.arc(x, y, size / 2 + 2, 0, Math.PI * 2);
        ctx.fillStyle = '#333';
        ctx.fill();
        
        // Instrument face
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size / 2);
        gradient.addColorStop(0, '#1a1a1a');
        gradient.addColorStop(1, '#0a0a0a');
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Label
        ctx.fillStyle = '#888';
        ctx.font = `${size * 0.1}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(label, x, y + size * 0.38);
    }

    private drawArtificialHorizon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
        this.drawInstrumentBase(ctx, x, y, size, 'ATTITUDE');
        
        const radius = size / 2 - 4;
        
        // Clip to instrument face
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.clip();
        
        // Calculate horizon position
        const pitchOffset = this.flight.pitch * radius / 45;
        const rollRad = -this.flight.roll * Math.PI / 180; // Negative: matches outside view
        
        ctx.translate(x, y);
        ctx.rotate(rollRad);
        
        // Sky
        ctx.fillStyle = '#0066cc';
        ctx.fillRect(-radius * 2, -radius * 2, radius * 4, radius * 2 + pitchOffset);
        
        // Ground
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(-radius * 2, pitchOffset, radius * 4, radius * 2);
        
        // Horizon line
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-radius, pitchOffset);
        ctx.lineTo(radius, pitchOffset);
        ctx.stroke();
        
        // Pitch lines
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.font = `${size * 0.08}px Arial`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        
        for (let deg = -30; deg <= 30; deg += 10) {
            if (deg === 0) continue;
            const lineY = pitchOffset - deg * radius / 45;
            const lineWidth = deg % 20 === 0 ? radius * 0.4 : radius * 0.2;
            
            ctx.beginPath();
            ctx.moveTo(-lineWidth, lineY);
            ctx.lineTo(lineWidth, lineY);
            ctx.stroke();
            
            if (deg % 20 === 0) {
                ctx.fillText(Math.abs(deg).toString(), -lineWidth - 10, lineY + 3);
                ctx.fillText(Math.abs(deg).toString(), lineWidth + 10, lineY + 3);
            }
        }
        
        ctx.restore();
        
        // Aircraft reference (fixed)
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - radius * 0.4, y);
        ctx.lineTo(x - radius * 0.15, y);
        ctx.lineTo(x - radius * 0.15, y + 8);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x + radius * 0.4, y);
        ctx.lineTo(x + radius * 0.15, y);
        ctx.lineTo(x + radius * 0.15, y + 8);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffcc00';
        ctx.fill();
        
        // Roll indicator triangle
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(x, y - radius + 8);
        ctx.lineTo(x - 6, y - radius + 16);
        ctx.lineTo(x + 6, y - radius + 16);
        ctx.closePath();
        ctx.fill();
    }

    private drawAltimeter(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
        this.drawInstrumentBase(ctx, x, y, size, 'ALT');
        
        const radius = size / 2 - 4;
        const altitude = this.flight.altitude;
        
        // Draw altitude scale markings
        ctx.strokeStyle = '#fff';
        ctx.fillStyle = '#fff';
        ctx.font = `${size * 0.1}px Arial`;
        ctx.textAlign = 'center';
        
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
            const innerR = radius * 0.75;
            const outerR = radius * 0.9;
            
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(angle) * innerR, y + Math.sin(angle) * innerR);
            ctx.lineTo(x + Math.cos(angle) * outerR, y + Math.sin(angle) * outerR);
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Numbers
            const textR = radius * 0.6;
            ctx.fillText(i.toString(), x + Math.cos(angle) * textR, y + Math.sin(angle) * textR + 4);
        }
        
        // Small ticks
        ctx.lineWidth = 1;
        for (let i = 0; i < 50; i++) {
            if (i % 5 === 0) continue;
            const angle = (i / 50) * Math.PI * 2 - Math.PI / 2;
            const innerR = radius * 0.8;
            const outerR = radius * 0.85;
            
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(angle) * innerR, y + Math.sin(angle) * innerR);
            ctx.lineTo(x + Math.cos(angle) * outerR, y + Math.sin(angle) * outerR);
            ctx.stroke();
        }
        
        // 10,000s needle (short)
        const tenThousandsAngle = ((altitude / 100000) * Math.PI * 2) - Math.PI / 2;
        this.drawNeedle(ctx, x, y, tenThousandsAngle, radius * 0.35, '#fff', 3);
        
        // 1,000s needle (medium)
        const thousandsAngle = ((altitude % 10000) / 10000) * Math.PI * 2 - Math.PI / 2;
        this.drawNeedle(ctx, x, y, thousandsAngle, radius * 0.5, '#fff', 3);
        
        // 100s needle (long)
        const hundredsAngle = ((altitude % 1000) / 1000) * Math.PI * 2 - Math.PI / 2;
        this.drawNeedle(ctx, x, y, hundredsAngle, radius * 0.7, '#fff', 2);
        
        // Center cap
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#333';
        ctx.fill();
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Digital readout
        ctx.fillStyle = '#0f0';
        ctx.font = `bold ${size * 0.12}px monospace`;
        ctx.fillText(Math.floor(altitude).toLocaleString(), x, y + radius * 0.25);
    }

    private drawAirspeedIndicator(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
        this.drawInstrumentBase(ctx, x, y, size, 'AIRSPEED');
        
        const radius = size / 2 - 4;
        const airspeed = this.flight.airspeed;
        
        // Speed arc zones
        const minSpeed = 40;
        const maxSpeed = 300;
        
        // White arc (flap operating range) 40-120
        this.drawArc(ctx, x, y, radius * 0.85, 40, 120, minSpeed, maxSpeed, '#fff', 4);
        // Green arc (normal operating range) 60-180
        this.drawArc(ctx, x, y, radius * 0.85, 60, 180, minSpeed, maxSpeed, '#0f0', 4);
        // Yellow arc (caution range) 180-240
        this.drawArc(ctx, x, y, radius * 0.85, 180, 240, minSpeed, maxSpeed, '#ff0', 4);
        // Red line (never exceed) 260
        this.drawArc(ctx, x, y, radius * 0.85, 255, 265, minSpeed, maxSpeed, '#f00', 6);
        
        // Draw speed markings
        ctx.strokeStyle = '#fff';
        ctx.fillStyle = '#fff';
        ctx.font = `${size * 0.09}px Arial`;
        ctx.textAlign = 'center';
        
        for (let speed = 40; speed <= 280; speed += 20) {
            const angle = this.speedToAngle(speed, minSpeed, maxSpeed);
            const innerR = radius * 0.65;
            const outerR = radius * 0.78;
            
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(angle) * innerR, y + Math.sin(angle) * innerR);
            ctx.lineTo(x + Math.cos(angle) * outerR, y + Math.sin(angle) * outerR);
            ctx.stroke();
            
            // Numbers
            if (speed % 40 === 0) {
                const textR = radius * 0.5;
                ctx.fillText(speed.toString(), x + Math.cos(angle) * textR, y + Math.sin(angle) * textR + 4);
            }
        }
        
        // Speed needle
        const needleAngle = this.speedToAngle(Math.max(minSpeed, Math.min(maxSpeed, airspeed)), minSpeed, maxSpeed);
        this.drawNeedle(ctx, x, y, needleAngle, radius * 0.7, '#fff', 2);
        
        // Center cap
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#333';
        ctx.fill();
        
        // Digital readout
        ctx.fillStyle = '#0f0';
        ctx.font = `bold ${size * 0.12}px monospace`;
        ctx.fillText(Math.floor(airspeed) + ' KTS', x, y + radius * 0.25);
    }

    private speedToAngle(speed: number, min: number, max: number): number {
        const range = max - min;
        const normalized = (speed - min) / range;
        return normalized * Math.PI * 1.75 + Math.PI * 0.625; // 225 degree sweep
    }

    private drawArc(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, 
                    startSpeed: number, endSpeed: number, minSpeed: number, maxSpeed: number, 
                    color: string, width: number): void {
        const startAngle = this.speedToAngle(startSpeed, minSpeed, maxSpeed);
        const endAngle = this.speedToAngle(endSpeed, minSpeed, maxSpeed);
        
        ctx.beginPath();
        ctx.arc(x, y, radius, startAngle, endAngle);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();
    }

    private drawHeadingIndicator(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
        this.drawInstrumentBase(ctx, x, y, size, 'HEADING');
        
        const radius = size / 2 - 4;
        const heading = this.flight.heading;
        
        // Draw rotating compass card
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius - 2, 0, Math.PI * 2);
        ctx.clip();
        
        ctx.translate(x, y);
        ctx.rotate(-heading * Math.PI / 180);
        
        // Compass markings
        const cardinals = ['N', 'E', 'S', 'W'];
        const cardinalAngles = [0, 90, 180, 270];
        
        for (let deg = 0; deg < 360; deg += 10) {
            const angle = deg * Math.PI / 180 - Math.PI / 2;
            const isMajor = deg % 30 === 0;
            const innerR = radius * (isMajor ? 0.65 : 0.75);
            const outerR = radius * 0.85;
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = isMajor ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
            ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
            ctx.stroke();
            
            // Cardinal directions
            const cardinalIndex = cardinalAngles.indexOf(deg);
            if (cardinalIndex !== -1) {
                ctx.fillStyle = deg === 0 ? '#f00' : '#fff';
                ctx.font = `bold ${size * 0.14}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const textR = radius * 0.5;
                ctx.fillText(cardinals[cardinalIndex], Math.cos(angle) * textR, Math.sin(angle) * textR);
            } else if (deg % 30 === 0) {
                ctx.fillStyle = '#fff';
                ctx.font = `${size * 0.1}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const textR = radius * 0.52;
                ctx.fillText((deg / 10).toString(), Math.cos(angle) * textR, Math.sin(angle) * textR);
            }
        }
        
        ctx.restore();
        
        // Fixed aircraft symbol (top lubber line)
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.moveTo(x, y - radius + 5);
        ctx.lineTo(x - 8, y - radius + 18);
        ctx.lineTo(x + 8, y - radius + 18);
        ctx.closePath();
        ctx.fill();
        
        // Aircraft symbol in center
        ctx.fillStyle = '#ffcc00';
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        
        // Fuselage
        ctx.beginPath();
        ctx.moveTo(x, y - 15);
        ctx.lineTo(x, y + 10);
        ctx.stroke();
        
        // Wings
        ctx.beginPath();
        ctx.moveTo(x - 15, y);
        ctx.lineTo(x + 15, y);
        ctx.stroke();
        
        // Tail
        ctx.beginPath();
        ctx.moveTo(x - 6, y + 8);
        ctx.lineTo(x + 6, y + 8);
        ctx.stroke();
        
        // Digital heading
        ctx.fillStyle = '#0f0';
        ctx.font = `bold ${size * 0.12}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(Math.floor(heading).toString().padStart(3, '0') + '°', x, y + radius * 0.35);
    }

    private drawVerticalSpeedIndicator(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
        this.drawInstrumentBase(ctx, x, y, size, 'VERT SPD');
        
        const radius = size / 2 - 4;
        const vs = this.flight.verticalSpeed; // feet per minute
        
        // VS scale: -2000 to +2000 fpm, displayed as -20 to +20 (hundreds)
        const maxVS = 2000;
        
        // Draw scale markings
        ctx.strokeStyle = '#fff';
        ctx.fillStyle = '#fff';
        ctx.font = `${size * 0.09}px Arial`;
        ctx.textAlign = 'center';
        
        // Scale goes from bottom left (-2000) through top (0) to bottom right (+2000)
        for (let vsFpm = -2000; vsFpm <= 2000; vsFpm += 500) {
            const normalized = vsFpm / maxVS; // -1 to 1
            const angle = Math.PI / 2 + normalized * Math.PI * 0.7; // 126 degree sweep each side
            
            const innerR = radius * 0.7;
            const outerR = radius * 0.85;
            
            ctx.lineWidth = Math.abs(vsFpm) % 1000 === 0 ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(angle) * innerR, y + Math.sin(angle) * innerR);
            ctx.lineTo(x + Math.cos(angle) * outerR, y + Math.sin(angle) * outerR);
            ctx.stroke();
            
            // Numbers (in hundreds)
            if (Math.abs(vsFpm) % 1000 === 0) {
                const textR = radius * 0.55;
                const displayVal = Math.abs(vsFpm / 100);
                ctx.fillText(displayVal.toString(), x + Math.cos(angle) * textR, y + Math.sin(angle) * textR + 3);
            }
        }
        
        // UP/DOWN labels
        ctx.font = `${size * 0.08}px Arial`;
        ctx.fillText('UP', x, y - radius * 0.3);
        ctx.fillText('DN', x, y + radius * 0.4);
        
        // Zero line
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - radius * 0.3, y - radius * 0.1);
        ctx.lineTo(x + radius * 0.3, y - radius * 0.1);
        ctx.stroke();
        
        // VS needle
        const clampedVS = Math.max(-maxVS, Math.min(maxVS, vs));
        const needleAngle = Math.PI / 2 + (clampedVS / maxVS) * Math.PI * 0.7;
        this.drawNeedle(ctx, x, y, needleAngle, radius * 0.65, '#fff', 2);
        
        // Center cap
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#333';
        ctx.fill();
        
        // Digital readout
        const vsDisplay = vs >= 0 ? '+' + Math.floor(vs) : Math.floor(vs).toString();
        ctx.fillStyle = vs > 100 ? '#0f0' : vs < -100 ? '#f66' : '#fff';
        ctx.font = `bold ${size * 0.1}px monospace`;
        ctx.fillText(vsDisplay, x, y + radius * 0.2);
    }

    private drawNeedle(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, length: number, color: string, width: number): void {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + Math.PI / 2);
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -length);
        ctx.lineTo(-width, 0);
        ctx.lineTo(-width / 2, length * 0.15);
        ctx.lineTo(width / 2, length * 0.15);
        ctx.lineTo(width, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    private drawHUD(ctx: CanvasRenderingContext2D, w: number, h: number): void {
        // Throttle indicator on left side
        const throttleX = 50;
        const throttleY = h * 0.35;
        const throttleHeight = 120;
        
        // Throttle background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(throttleX - 15, throttleY - 10, 30, throttleHeight + 20);
        
        // Throttle scale
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 10; i++) {
            const y = throttleY + throttleHeight - (i / 10) * throttleHeight;
            ctx.beginPath();
            ctx.moveTo(throttleX - 10, y);
            ctx.lineTo(throttleX + 10, y);
            ctx.stroke();
        }
        
        // Throttle fill
        const throttleLevel = (this.flight.throttle / 100) * throttleHeight;
        const throttleGradient = ctx.createLinearGradient(0, throttleY + throttleHeight, 0, throttleY + throttleHeight - throttleLevel);
        throttleGradient.addColorStop(0, '#0a0');
        throttleGradient.addColorStop(0.7, '#0f0');
        throttleGradient.addColorStop(1, '#ff0');
        
        ctx.fillStyle = throttleGradient;
        ctx.fillRect(throttleX - 8, throttleY + throttleHeight - throttleLevel, 16, throttleLevel);
        
        // Throttle label
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('THR', throttleX, throttleY - 15);
        ctx.fillText(Math.floor(this.flight.throttle) + '%', throttleX, throttleY + throttleHeight + 15);
        
        // Flight data panel (top right)
        ctx.fillStyle = 'rgba(0, 30, 0, 0.7)';
        ctx.fillRect(w - 140, 35, 130, 130);
        
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f0';
        
        const data = [
            `ALT: ${Math.floor(this.flight.altitude).toLocaleString()} ft`,
            `SPD: ${Math.floor(this.flight.airspeed)} kts`,
            `HDG: ${Math.floor(this.flight.heading).toString().padStart(3, '0')}°`,
            `V/S: ${this.flight.verticalSpeed >= 0 ? '+' : ''}${Math.floor(this.flight.verticalSpeed)} fpm`,
        ];
        
        data.forEach((line, i) => {
            ctx.fillText(line, w - 135, 52 + i * 18);
        });

        // === FUN DATA PANEL FOR KEYNOTE ===
        // "Data Analytics Flight System" - humorous data connection
        const dataX = 15;
        const dataY = 35;
        
        ctx.fillStyle = 'rgba(0, 0, 40, 0.8)';
        ctx.fillRect(dataX, dataY, 180, 140);
        ctx.strokeStyle = '#48f';
        ctx.lineWidth = 2;
        ctx.strokeRect(dataX, dataY, 180, 140);
        
        // Title - PBIG themed!
        ctx.fillStyle = '#48f';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('📊 PBIG.NL NAVIGATOR', dataX + 8, dataY + 15);
        
        // Fake data metrics that change based on flight
        const rowsProcessed = Math.floor(this.flight.latitude * 1000 + 50000);
        const queriesPerSec = Math.floor(this.flight.airspeed * 12.7);
        const dataPoints = Math.floor(this.flight.altitude * 2.3);
        const cacheHit = Math.min(99, Math.floor(50 + this.flight.throttle * 0.45));
        const etlProgress = Math.floor((this.flight.longitude + 100) % 100);
        
        ctx.fillStyle = '#8cf';
        ctx.font = '10px monospace';
        
        const dataMetrics = [
            `Rows Scanned: ${rowsProcessed.toLocaleString()}`,
            `Queries/sec:  ${queriesPerSec.toLocaleString()}`,
            `Data Points:  ${dataPoints.toLocaleString()}`,
            `Cache Hit %:  ${cacheHit}%`,
            `ETL Progress: ${etlProgress}%`,
            `Status: ${this.flight.airspeed > 100 ? '✈️ OVER UTRECHT' : '🛫 LOADING...'}`,
        ];
        
        dataMetrics.forEach((line, i) => {
            ctx.fillText(line, dataX + 8, dataY + 32 + i * 16);
        });
        
        // Blinking "LIVE" indicator
        if (Math.floor(Date.now() / 500) % 2 === 0) {
            ctx.fillStyle = '#f44';
            ctx.font = 'bold 9px Arial';
            ctx.fillText('● LIVE', dataX + 140, dataY + 15);
        }
        
        // Utrecht landmarks based on heading
        const destinations = [
            { min: 337.5, max: 360, name: '→ DOM TOWER' },
            { min: 0, max: 22.5, name: '→ DOM TOWER' },
            { min: 22.5, max: 67.5, name: '→ MALIEBAAN' },
            { min: 67.5, max: 112.5, name: '→ DE UITHOF' },
            { min: 112.5, max: 157.5, name: '→ WILHELMINAPARK' },
            { min: 157.5, max: 202.5, name: '→ OUDEGRACHT' },
            { min: 202.5, max: 247.5, name: '→ JAARBEURS' },
            { min: 247.5, max: 292.5, name: '→ CENTRAAL' },
            { min: 292.5, max: 337.5, name: '→ HOOG CATHARIJNE' },
        ];
        
        let destName = '→ UNKNOWN';
        for (const dest of destinations) {
            if (this.flight.heading >= dest.min && this.flight.heading < dest.max) {
                destName = dest.name;
                break;
            }
        }
        
        ctx.fillStyle = '#ff0';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(destName, dataX + 8, dataY + 133);
    }

    private drawMiniMap(ctx: CanvasRenderingContext2D, w: number, h: number): void {
        const mapSize = Math.min(150, Math.min(w, h) * 0.25);
        const mapX = w - mapSize - 15;
        const mapY = 130; // Position higher on screen, below flight data panel
        const mapRadius = mapSize / 2;
        const centerX = mapX + mapRadius;
        const centerY = mapY + mapRadius;
        
        // Map background (dark circular radar style)
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, mapRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 20, 0, 0.85)';
        ctx.fill();
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Clip to circle
        ctx.clip();
        
        // Grid circles
        ctx.strokeStyle = 'rgba(0, 100, 0, 0.5)';
        ctx.lineWidth = 1;
        for (let r = 1; r <= 3; r++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, (r / 3) * mapRadius * 0.9, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Cardinal direction lines
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - mapRadius);
        ctx.lineTo(centerX, centerY + mapRadius);
        ctx.moveTo(centerX - mapRadius, centerY);
        ctx.lineTo(centerX + mapRadius, centerY);
        ctx.stroke();
        
        // Scale: 1 unit = X pixels on map (show 40 units radius for wider spread)
        const mapScale = mapRadius * 0.9 / 40;
        
        // Get player position and heading
        const playerX = this.flight.longitude;
        const playerZ = this.flight.latitude;
        const headingRad = this.flight.heading * Math.PI / 180;
        
        // Draw ground objects relative to player
        for (const obj of this.groundObjects) {
            // Calculate relative position
            const relX = obj.worldX - playerX;
            const relZ = obj.worldZ - playerZ;
            
            // Rotate based on heading - same formula as ground objects view transform
            // This makes radar dots match what you see out the window
            const rotX = relX * Math.cos(headingRad) - relZ * Math.sin(headingRad);
            const rotZ = relX * Math.sin(headingRad) + relZ * Math.cos(headingRad);
            
            // Convert to screen coordinates (rotZ is forward, rotX is right)
            // On radar: up is forward, right is right
            const screenX = centerX + rotX * mapScale;
            const screenY = centerY - rotZ * mapScale;
            
            // Check if within map bounds
            const distFromCenter = Math.sqrt((screenX - centerX) ** 2 + (screenY - centerY) ** 2);
            if (distFromCenter > mapRadius * 0.95) continue;
            
            // Draw object dot - color based on type
            let dotColor = '#888';
            let dotSize = 2;
            
            switch (obj.type) {
                case 'building':
                case 'skyscraper':
                    dotColor = '#888';
                    dotSize = 3;
                    break;
                case 'tree':
                case 'pineTree':
                    dotColor = '#0a0';
                    dotSize = 2;
                    break;
                case 'house':
                    dotColor = '#c44';
                    dotSize = 2;
                    break;
                case 'hangar':
                    dotColor = '#666';
                    dotSize = 4;
                    break;
                case 'tower':
                    dotColor = '#f00';
                    dotSize = 2;
                    break;
                case 'windmill':
                    dotColor = '#fff';
                    dotSize = 2;
                    break;
                case 'runway':
                    dotColor = '#444';
                    dotSize = 5;
                    break;
            }
            
            ctx.fillStyle = dotColor;
            ctx.beginPath();
            ctx.arc(screenX, screenY, dotSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw clouds on map (faint blue dots)
        ctx.fillStyle = 'rgba(100, 150, 255, 0.4)';
        for (const cloud of this.clouds) {
            const relX = cloud.worldX - playerX;
            const relZ = cloud.worldZ - playerZ;
            // Same rotation as ground objects
            const rotX = relX * Math.cos(headingRad) - relZ * Math.sin(headingRad);
            const rotZ = relX * Math.sin(headingRad) + relZ * Math.cos(headingRad);
            const screenX = centerX + rotX * mapScale;
            const screenY = centerY - rotZ * mapScale;
            
            const distFromCenter = Math.sqrt((screenX - centerX) ** 2 + (screenY - centerY) ** 2);
            if (distFromCenter < mapRadius * 0.95) {
                ctx.beginPath();
                ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        ctx.restore();
        
        // Draw player aircraft (always at center, pointing up)
        ctx.fillStyle = '#0f0';
        ctx.beginPath();
        // Aircraft triangle pointing up
        ctx.moveTo(centerX, centerY - 8);
        ctx.lineTo(centerX - 5, centerY + 6);
        ctx.lineTo(centerX, centerY + 3);
        ctx.lineTo(centerX + 5, centerY + 6);
        ctx.closePath();
        ctx.fill();
        
        // Compass letters
        ctx.fillStyle = '#0f0';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // N is always at top (heading-up display)
        const compassRadius = mapRadius + 10;
        const dirs = [
            { letter: 'N', angle: -Math.PI / 2 },
            { letter: 'E', angle: 0 },
            { letter: 'S', angle: Math.PI / 2 },
            { letter: 'W', angle: Math.PI }
        ];
        
        for (const dir of dirs) {
            // Rotate based on heading
            const rotatedAngle = dir.angle - headingRad;
            const lx = centerX + Math.cos(rotatedAngle) * compassRadius;
            const ly = centerY + Math.sin(rotatedAngle) * compassRadius;
            ctx.fillText(dir.letter, lx, ly);
        }
        
        // Map label
        ctx.font = '9px Arial';
        ctx.fillStyle = '#0f0';
        ctx.textAlign = 'center';
        ctx.fillText('RADAR', centerX, mapY - 3);
    }

    private drawModeStatusStrip(ctx: CanvasRenderingContext2D): void {
        const x = 12;
        const y = 30;
        const width = 220;
        const height = 46;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = 'rgba(140, 220, 255, 0.9)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);

        ctx.fillStyle = '#9fd';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`SND: ${this.soundProfile.toUpperCase()}`, x + 8, y + 17);
        ctx.fillText(`GFX: ${this.groundQuality.toUpperCase()}`, x + 8, y + 33);

        ctx.fillStyle = '#bff';
        ctx.fillText(`RS: ${Math.round(this.worldRenderScale * 100)}%`, x + 130, y + 25);
    }

    private drawCrashScreen(ctx: CanvasRenderingContext2D, w: number, h: number): void {
        // Dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, w, h);
        
        // Explosion effect - random orange/red circles
        const time = Date.now() / 100;
        for (let i = 0; i < 15; i++) {
            const angle = (i / 15) * Math.PI * 2 + time * 0.1;
            const dist = 50 + Math.sin(time + i) * 30;
            const x = w / 2 + Math.cos(angle) * dist;
            const y = h / 2 + Math.sin(angle) * dist * 0.6;
            const size = 20 + Math.sin(time * 2 + i * 0.5) * 15;
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
            gradient.addColorStop(0, 'rgba(255, 200, 50, 0.9)');
            gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.6)');
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Crash message box
        ctx.fillStyle = 'rgba(80, 0, 0, 0.9)';
        ctx.strokeStyle = '#f00';
        ctx.lineWidth = 4;
        const boxW = 400;
        const boxH = 200;
        ctx.fillRect(w / 2 - boxW / 2, h / 2 - boxH / 2, boxW, boxH);
        ctx.strokeRect(w / 2 - boxW / 2, h / 2 - boxH / 2, boxW, boxH);
        
        // Crash title
        ctx.fillStyle = '#ff3333';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Split message into lines
        const lines = this.crashMessage.split('\\n');
        ctx.fillText(lines[0], w / 2, h / 2 - 40);
        
        if (lines[1]) {
            ctx.fillStyle = '#ffaa00';
            ctx.font = '18px Arial';
            ctx.fillText(lines[1], w / 2, h / 2 + 10);
        }
        
        // Flight stats
        ctx.fillStyle = '#aaa';
        ctx.font = '14px Arial';
        ctx.fillText(`Final Altitude: ${Math.round(this.flight.altitude)} ft`, w / 2, h / 2 + 50);
        
        // Restart instruction
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('Press R to restart', w / 2, h / 2 + 85);
        
        // Flashing effect on restart text
        if (Math.floor(Date.now() / 500) % 2 === 0) {
            ctx.fillStyle = '#0f0';
            ctx.fillText('Press R to restart', w / 2, h / 2 + 85);
        }
    }

    private drawFocusIndicator(ctx: CanvasRenderingContext2D, w: number, h: number): void {
        if (!this.isFocused) {
            // Draw "click to fly" message
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(w / 2 - 150, h * 0.25 - 25, 300, 50);
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('✈️ Click to Start Flying ✈️', w / 2, h * 0.25);
            
            ctx.font = '12px Arial';
            ctx.fillStyle = '#aaa';
            ctx.fillText('Arrow keys: Pitch/Roll | W/S: Throttle | A/D: Rudder', w / 2, h * 0.25 + 18);
        } else {
            // Show subtle "ACTIVE" indicator with FPS
            ctx.fillStyle = '#0f0';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`● FLIGHT ACTIVE | ${this.fps} FPS`, 30, 18);
        }
        
        // Controls reminder (bottom)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#888';
        ctx.fillText('↑↓ Pitch | ←→ Roll | W/S Throttle | A/D Rudder | SPACE Level | R Reset | M Map | V Sound | G Ground', w / 2, h - 8);
    }

    public update(options: VisualUpdateOptions): void {
        // Resize canvas to fit container
        const width = options.viewport.width;
        const height = options.viewport.height;
        
        // Only update if size changed
        if (this.width !== width || this.height !== height) {
            this.width = width;
            this.height = height;
            this.canvas.width = width;
            this.canvas.height = height;
        }
    }

    public destroy(): void {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        window.removeEventListener('keydown', this.windowKeyDownHandler);
        window.removeEventListener('keyup', this.windowKeyUpHandler);
        this.canvas.removeEventListener('click', this.activationHandler);
        this.canvas.removeEventListener('pointerdown', this.activationHandler);
        this.container.removeEventListener('pointerdown', this.activationHandler);

        if (this.audioEngineOsc) {
            this.audioEngineOsc.stop();
            this.audioEngineOsc.disconnect();
            this.audioEngineOsc = null;
        }

        if (this.audioHarmonicOsc) {
            this.audioHarmonicOsc.stop();
            this.audioHarmonicOsc.disconnect();
            this.audioHarmonicOsc = null;
        }

        if (this.audioLfoOsc) {
            this.audioLfoOsc.stop();
            this.audioLfoOsc.disconnect();
            this.audioLfoOsc = null;
        }

        if (this.audioLfoGain) {
            this.audioLfoGain.disconnect();
            this.audioLfoGain = null;
        }

        if (this.audioMasterGain) {
            this.audioMasterGain.disconnect();
            this.audioMasterGain = null;
        }

        if (this.audioContext) {
            void this.audioContext.close();
            this.audioContext = null;
        }
    }
}