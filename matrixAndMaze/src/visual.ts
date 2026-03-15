/*
*  MATRIX BEN + DUNGEON BEN - Power BI Custom Visual
*  SQL Konference 2026 - Keynote Demo
*  
*  "What if I told you... your data has quality issues?"
*  "It's dangerous to go alone! Take this... data."
*/
"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";
import { BEN_IMAGE_BASE64 } from "./benImage";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

import { VisualFormattingSettingsModel } from "./settings";

type GameMode = "matrix" | "dungeon";

interface DataRainDrop {
    x: number;
    y: number;
    speed: number;
    char: string;
    opacity: number;
    fontSize: number;
}

// Dungeon map: 1 = wall, 0 = floor
const DUNGEON_MAP: number[][] = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,1,1,0,1,1,1,0,1,0,1],
    [1,0,1,1,0,0,0,1,0,1,1,0,0,1,0,1],
    [1,0,1,1,1,1,0,1,0,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,0,1,1,1,0,1,1,0,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,1,1,0,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

export class Visual implements IVisual {
    private target: HTMLElement;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private benImage: HTMLImageElement;
    private imageLoaded: boolean = false;
    private animationId: number;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private width: number = 0;
    private height: number = 0;
    
    // Mode switching
    private gameMode: GameMode = "matrix";
    private modeButton: HTMLButtonElement;
    
    // Matrix mode
    private drops: DataRainDrop[] = [];
    private dataValues: string[] = [];
    private revealProgress: number = 0;
    private isRevealing: boolean = false;
    private matrixChars: string = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
    
    // Dungeon mode - player position and direction
    private playerX: number = 1.5;
    private playerY: number = 1.5;
    private playerDir: number = 0; // Angle in radians
    private moveSpeed: number = 0.05;
    private rotSpeed: number = 0.04;
    private keys: { [key: string]: boolean } = {};
    
    // I.T. Admin enemy!
    private ghostX: number = 14.5;
    private ghostY: number = 11.5;
    private ghostSpeed: number = 0.018;
    private ghostCaught: boolean = false;
    private ghostCaughtTimer: number = 0;
    
    // Collectible Fabric Items!
    private fabricItems: { 
        name: string; 
        icon: string; 
        x: number; 
        y: number; 
        collected: boolean;
        color: string;
    }[] = [
        { name: "Lakehouse", icon: "🏠", x: 14.5, y: 1.5, collected: false, color: "#00D4FF" },
        { name: "Semantic Model", icon: "📊", x: 1.5, y: 11.5, collected: false, color: "#FFD700" },
        { name: "Direct Lake", icon: "⚡", x: 7.5, y: 7.5, collected: false, color: "#00FF88" },
        { name: "Power BI Report", icon: "📈", x: 14.5, y: 5.5, collected: false, color: "#FF6B6B" }
    ];
    private itemsCollected: number = 0;
    private totalItems: number = 4;
    private gameWon: boolean = false;
    private winTimer: number = 0;
    private lastCollectedItem: string = "";
    private collectFlashTimer: number = 0;
    
    // Enhanced visuals
    private particles: { x: number; y: number; vx: number; vy: number; life: number; size: number }[] = [];
    private torchFlicker: number = 0;
    private benFound: number = 0;
    private totalBens: number = 4;
    private screenShake: number = 0;
    private pulseTime: number = 0;

    constructor(options: VisualConstructorOptions) {
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        this.target.style.overflow = "hidden";
        this.target.style.position = "relative";
        
        // Create canvas
        this.canvas = document.createElement("canvas");
        this.canvas.style.display = "block";
        this.canvas.tabIndex = 1; // Make it focusable for keyboard events
        this.target.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d")!;
        
        // Create mode switch button
        this.modeButton = document.createElement("button");
        this.modeButton.innerText = "🎮 DUNGEON";
        this.modeButton.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            padding: 5px 10px;
            background: rgba(0, 100, 0, 0.8);
            color: #0f0;
            border: 1px solid #0f0;
            font-family: monospace;
            font-size: 11px;
            cursor: pointer;
            z-index: 100;
        `;
        this.modeButton.onclick = () => this.toggleMode();
        this.target.appendChild(this.modeButton);
        
        // Load Ben's image
        this.benImage = new Image();
        this.benImage.crossOrigin = "anonymous";
        this.benImage.onload = () => {
            this.imageLoaded = true;
            console.log("Ben image loaded successfully!");
        };
        this.benImage.onerror = (e) => console.error("Failed to load Ben image:", e);
        this.benImage.src = BEN_IMAGE_BASE64;
        
        // Click handler for matrix mode and victory screen
        this.canvas.addEventListener("click", (e) => {
            if (this.gameMode === "matrix") {
                this.isRevealing = !this.isRevealing;
            } else if (this.gameMode === "dungeon" && this.gameWon) {
                // Check if click is on the "Play Again" button area
                const rect = this.canvas.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;
                
                const buttonY = this.height / 2 + 175;
                const buttonWidth = 200;
                const buttonHeight = 40;
                const buttonLeft = this.width / 2 - buttonWidth / 2;
                const buttonTop = buttonY - buttonHeight / 2;
                
                // Check if click is within button bounds (or anywhere on victory screen)
                if (clickX >= buttonLeft && clickX <= buttonLeft + buttonWidth &&
                    clickY >= buttonTop && clickY <= buttonTop + buttonHeight) {
                    // Reset game
                    this.gameWon = false;
                    this.winTimer = 0;
                    this.playerX = 1.5;
                    this.playerY = 1.5;
                    this.playerDir = 0;
                    this.ghostX = 14.5;
                    this.ghostY = 11.5;
                    this.itemsCollected = 0;
                    this.fabricItems.forEach(item => item.collected = false);
                }
            }
            this.canvas.focus(); // Focus for keyboard input
        });
        
        // Keyboard handlers for dungeon mode
        this.canvas.addEventListener("keydown", (e) => {
            this.keys[e.key.toLowerCase()] = true;
            e.preventDefault();
        });
        this.canvas.addEventListener("keyup", (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Start animation
        this.animate();
    }
    
    private toggleMode(): void {
        this.gameMode = this.gameMode === "matrix" ? "dungeon" : "matrix";
        this.modeButton.innerText = this.gameMode === "matrix" ? "🎮 DUNGEON" : "💊 MATRIX";
        
        // Reset dungeon player position and items
        if (this.gameMode === "dungeon") {
            this.playerX = 1.5;
            this.playerY = 1.5;
            this.playerDir = 0;
            this.ghostX = 14.5;
            this.ghostY = 11.5;
            this.ghostCaught = false;
            this.gameWon = false;
            this.winTimer = 0;
            this.itemsCollected = 0;
            this.fabricItems.forEach(item => item.collected = false);
            this.canvas.focus();
        }
        
        // Clear canvas
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    private initDrops(): void {
        this.drops = [];
        const columns = Math.floor(this.width / 14);
        
        for (let i = 0; i < columns; i++) {
            this.drops.push({
                x: i * 14,
                y: Math.random() * this.height * -1,
                speed: 2 + Math.random() * 5,
                char: this.getRandomChar(),
                opacity: 0.5 + Math.random() * 0.5,
                fontSize: 10 + Math.random() * 8
            });
        }
    }

    private getRandomChar(): string {
        if (this.dataValues.length > 0 && Math.random() > 0.7) {
            const val = this.dataValues[Math.floor(Math.random() * this.dataValues.length)];
            return val.toString().charAt(Math.floor(Math.random() * val.length)) || "0";
        }
        return this.matrixChars.charAt(Math.floor(Math.random() * this.matrixChars.length));
    }

    private animate = (): void => {
        if (!this.ctx || this.width === 0) {
            this.animationId = requestAnimationFrame(this.animate);
            return;
        }

        if (this.gameMode === "matrix") {
            this.animateMatrix();
        } else {
            this.animateDungeon();
        }

        this.animationId = requestAnimationFrame(this.animate);
    }
    
    // ==================== MATRIX MODE ====================
    private animateMatrix(): void {
        // Clear with fade effect
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Update reveal progress
        if (this.isRevealing && this.revealProgress < 1) {
            this.revealProgress = Math.min(1, this.revealProgress + 0.03);
        } else if (!this.isRevealing && this.revealProgress > 0) {
            this.revealProgress = Math.max(0, this.revealProgress - 0.05);
        }

        // Draw Ben's face (revealed)
        if (this.revealProgress > 0 && this.imageLoaded) {
            this.ctx.save();
            this.ctx.globalAlpha = this.revealProgress * 0.85;
            
            const scale = 0.7;
            const imgAspect = this.benImage.width / this.benImage.height;
            let drawWidth, drawHeight;
            
            if (this.width / this.height > imgAspect) {
                drawHeight = this.height * scale;
                drawWidth = drawHeight * imgAspect;
            } else {
                drawWidth = this.width * scale;
                drawHeight = drawWidth / imgAspect;
            }
            
            const drawX = (this.width - drawWidth) / 2;
            const drawY = (this.height - drawHeight) / 2;
            
            this.ctx.drawImage(this.benImage, drawX, drawY, drawWidth, drawHeight);
            
            this.ctx.globalCompositeOperation = "multiply";
            this.ctx.fillStyle = `rgba(0, 200, 0, ${0.4 * this.revealProgress})`;
            this.ctx.fillRect(drawX, drawY, drawWidth, drawHeight);
            this.ctx.globalCompositeOperation = "source-over";
            
            this.ctx.globalAlpha = 0.15 * this.revealProgress;
            for (let y = drawY; y < drawY + drawHeight; y += 3) {
                this.ctx.fillStyle = "#000";
                this.ctx.fillRect(drawX, y, drawWidth, 1);
            }
            
            this.ctx.restore();
        }

        // Draw matrix rain
        const rainOpacity = 1 - (this.revealProgress * 0.3);
        
        for (const drop of this.drops) {
            this.ctx.fillStyle = `rgba(0, 255, 0, ${drop.opacity * rainOpacity})`;
            this.ctx.font = `${drop.fontSize}px monospace`;
            this.ctx.fillText(drop.char, drop.x, drop.y);
            
            this.ctx.fillStyle = `rgba(180, 255, 180, ${drop.opacity * 0.8 * rainOpacity})`;
            this.ctx.fillText(drop.char, drop.x, drop.y);
            
            drop.y += drop.speed;
            if (Math.random() > 0.95) drop.char = this.getRandomChar();
            if (drop.y > this.height + 20) {
                drop.y = -20;
                drop.speed = 2 + Math.random() * 5;
                drop.char = this.getRandomChar();
                drop.opacity = 0.5 + Math.random() * 0.5;
            }
        }

        // Draw hint text
        this.ctx.fillStyle = `rgba(0, 255, 0, ${0.5 + Math.sin(Date.now() / 500) * 0.3})`;
        this.ctx.font = "12px monospace";
        const hint = this.isRevealing ? "[ CLICK TO HIDE ]" : "[ CLICK TO REVEAL ]";
        this.ctx.fillText(hint, 10, this.height - 10);
    }
    
    // ==================== DUNGEON MODE ====================
    private animateDungeon(): void {
        // Handle movement
        this.handleDungeonInput();
        this.pulseTime += 0.05;
        this.torchFlicker = 0.8 + Math.sin(this.pulseTime * 3) * 0.1 + Math.random() * 0.1;
        
        // Apply screen shake
        this.ctx.save();
        if (this.screenShake > 0) {
            this.ctx.translate(
                (Math.random() - 0.5) * this.screenShake * 10,
                (Math.random() - 0.5) * this.screenShake * 10
            );
            this.screenShake *= 0.9;
        }
        
        const halfHeight = this.height / 2;
        
        // ===== ENHANCED CEILING - Gradient with stars =====
        const ceilGrad = this.ctx.createLinearGradient(0, 0, 0, halfHeight);
        ceilGrad.addColorStop(0, "#051520");
        ceilGrad.addColorStop(1, "#153040");
        this.ctx.fillStyle = ceilGrad;
        this.ctx.fillRect(0, 0, this.width, halfHeight);
        
        // Stars on ceiling
        this.ctx.fillStyle = "#0f0";
        for (let i = 0; i < 30; i++) {
            const sx = (Math.sin(i * 137.5 + this.pulseTime * 0.1) * 0.5 + 0.5) * this.width;
            const sy = (Math.cos(i * 73.1) * 0.5 + 0.3) * halfHeight;
            const size = 1 + Math.sin(this.pulseTime + i) * 0.5;
            this.ctx.globalAlpha = 0.3 + Math.sin(this.pulseTime * 2 + i) * 0.2;
            this.ctx.fillRect(sx, sy, size, size);
        }
        this.ctx.globalAlpha = 1;
        
        // ===== ENHANCED FLOOR - Grid with glow =====
        const floorGrad = this.ctx.createLinearGradient(0, halfHeight, 0, this.height);
        floorGrad.addColorStop(0, "#1a3a1a");
        floorGrad.addColorStop(1, "#0a200a");
        this.ctx.fillStyle = floorGrad;
        this.ctx.fillRect(0, halfHeight, this.width, halfHeight);
        
        // Floor grid lines (perspective effect)
        this.ctx.strokeStyle = `rgba(0, 255, 0, 0.2)`;
        this.ctx.lineWidth = 1;
        for (let z = 1; z < 20; z++) {
            const y = halfHeight + (this.height / 2) * (1 - 1 / z);
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
        
        // Raycasting with enhanced visuals
        const fov = Math.PI / 3;
        const numRays = this.width;
        const zBuffer: number[] = [];
        
        for (let i = 0; i < numRays; i++) {
            const rayAngle = this.playerDir - fov / 2 + (i / numRays) * fov;
            const result = this.castRay(rayAngle);
            
            if (result.distance > 0) {
                const correctedDist = result.distance * Math.cos(rayAngle - this.playerDir);
                zBuffer[i] = correctedDist;
                
                const wallHeight = Math.min(this.height * 2, (this.height / correctedDist) * 0.8);
                const wallTop = halfHeight - wallHeight / 2;
                
                // Distance fog and torch flicker - brighter!
                const baseFog = Math.max(0.2, 1 - correctedDist / 12);
                const shade = Math.min(1, baseFog * this.torchFlicker + 0.2);
                
                // ===== ENHANCED WALLS - Brick pattern with glow =====
                {
                    const brickPattern = Math.sin(wallTop * 0.1 + i * 0.05) > 0 ? 1.1 : 0.9;
                    const green = Math.floor((120 * shade + 50) * brickPattern);
                    const baseColor = result.side === 0 ? green : Math.floor(green * 0.75);
                    
                    // Wall with slight color variation
                    this.ctx.fillStyle = `rgb(${Math.floor(baseColor * 0.1)}, ${baseColor}, ${Math.floor(baseColor * 0.2)})`;
                    this.ctx.fillRect(i, wallTop, 1, wallHeight);
                    
                    // Edge highlight (glowing edges)
                    if (i > 0 && Math.abs((zBuffer[i-1] || correctedDist) - correctedDist) > 0.5) {
                        this.ctx.fillStyle = `rgba(0, 255, 0, ${0.5 * shade})`;
                        this.ctx.fillRect(i, wallTop, 2, wallHeight);
                    }
                    
                    // Distance fog - lighter
                    this.ctx.fillStyle = `rgba(0, 15, 5, ${(1 - shade) * 0.7})`;
                    this.ctx.fillRect(i, wallTop, 1, wallHeight);
                }
            }
        }
        
        // ===== UPDATE AND RENDER ITEMS =====
        this.updateItems();
        this.renderItems(zBuffer, halfHeight, fov);
        
        // ===== UPDATE AND RENDER I.T. ADMIN =====
        this.updateGhost();
        this.renderGhost(zBuffer, halfHeight, fov);
        
        // ===== FLOATING PARTICLES =====
        this.updateParticles();
        this.ctx.fillStyle = "rgba(0, 255, 0, 0.6)";
        for (const p of this.particles) {
            const size = p.size * (p.life / 100);
            this.ctx.fillRect(p.x, p.y, size, size);
        }
        
        // ===== VIGNETTE EFFECT - subtle =====
        const vignetteGrad = this.ctx.createRadialGradient(
            this.width / 2, this.height / 2, this.height * 0.4,
            this.width / 2, this.height / 2, this.height * 0.9
        );
        vignetteGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
        vignetteGrad.addColorStop(1, "rgba(0, 0, 0, 0.4)");
        this.ctx.fillStyle = vignetteGrad;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // ===== SCANLINES - subtle =====
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
        for (let y = 0; y < this.height; y += 4) {
            this.ctx.fillRect(0, y, this.width, 1);
        }
        
        this.ctx.restore();
        
        // ===== I.T. ADMIN CAUGHT YOU OVERLAY =====
        if (this.ghostCaught) {
            this.ghostCaughtTimer++;
            const flash = Math.sin(this.ghostCaughtTimer * 0.3) * 0.3 + 0.3;
            this.ctx.fillStyle = `rgba(255, 0, 0, ${flash})`;
            this.ctx.fillRect(0, 0, this.width, this.height);
            
            this.ctx.fillStyle = "#fff";
            this.ctx.font = "bold 24px monospace";
            this.ctx.textAlign = "center";
            this.ctx.fillText("� I.T. ADMIN SHUT YOU DOWN! 🔒", this.width / 2, this.height / 2);
            this.ctx.font = "14px monospace";
            this.ctx.fillText("Rebooting in " + Math.max(0, Math.ceil((100 - this.ghostCaughtTimer) / 30)) + "...", this.width / 2, this.height / 2 + 30);
            this.ctx.textAlign = "left";
            
            // Reset after 3 seconds
            if (this.ghostCaughtTimer > 100) {
                this.ghostCaught = false;
                this.ghostCaughtTimer = 0;
                this.playerX = 1.5;
                this.playerY = 1.5;
                this.playerDir = 0;
                this.ghostX = 14.5;
                this.ghostY = 11.5;
                // Reset items on death
                this.itemsCollected = 0;
                this.fabricItems.forEach(item => item.collected = false);
            }
        }
        
        // ===== VICTORY SCREEN =====
        if (this.gameWon) {
            this.winTimer++;
            
            // Full screen dark overlay
            this.ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
            this.ctx.fillRect(0, 0, this.width, this.height);
            
            // Animated background gradient
            const gradientAngle = this.winTimer * 0.02;
            const bgGrad = this.ctx.createLinearGradient(
                this.width / 2 + Math.cos(gradientAngle) * this.width,
                this.height / 2 + Math.sin(gradientAngle) * this.height,
                this.width / 2 - Math.cos(gradientAngle) * this.width,
                this.height / 2 - Math.sin(gradientAngle) * this.height
            );
            bgGrad.addColorStop(0, "rgba(0, 100, 50, 0.3)");
            bgGrad.addColorStop(0.5, "rgba(0, 50, 100, 0.2)");
            bgGrad.addColorStop(1, "rgba(100, 50, 0, 0.3)");
            this.ctx.fillStyle = bgGrad;
            this.ctx.fillRect(0, 0, this.width, this.height);
            
            // Fireworks/sparkles - more of them!
            for (let i = 0; i < 40; i++) {
                const sparkX = (Math.sin(this.winTimer * 0.03 + i * 0.7) * 0.4 + 0.5) * this.width;
                const sparkY = (Math.cos(this.winTimer * 0.05 + i * 0.5) * 0.4 + 0.5) * this.height;
                const sparkSize = Math.abs(Math.sin(this.winTimer * 0.15 + i)) * 6 + 2;
                const colors = ["#0f0", "#0ff", "#ff0", "#f0f", "#fff"];
                this.ctx.fillStyle = colors[i % colors.length];
                this.ctx.globalAlpha = 0.6 + Math.sin(this.winTimer * 0.2 + i) * 0.4;
                this.ctx.beginPath();
                this.ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.globalAlpha = 1;
            
            // Glowing trophy
            const trophyY = this.height / 2 - 100 + Math.sin(this.winTimer * 0.08) * 10;
            this.ctx.font = "60px Arial";
            this.ctx.textAlign = "center";
            this.ctx.shadowColor = "#ffd700";
            this.ctx.shadowBlur = 30 + Math.sin(this.winTimer * 0.1) * 10;
            this.ctx.fillText("🏆", this.width / 2, trophyY);
            this.ctx.shadowBlur = 0;
            
            // Victory text with rainbow effect
            const titleY = this.height / 2 - 30;
            this.ctx.font = "bold 36px monospace";
            const titleGrad = this.ctx.createLinearGradient(
                this.width / 2 - 150, titleY,
                this.width / 2 + 150, titleY
            );
            const hueOffset = this.winTimer * 2;
            titleGrad.addColorStop(0, `hsl(${hueOffset % 360}, 100%, 60%)`);
            titleGrad.addColorStop(0.25, `hsl(${(hueOffset + 90) % 360}, 100%, 60%)`);
            titleGrad.addColorStop(0.5, `hsl(${(hueOffset + 180) % 360}, 100%, 60%)`);
            titleGrad.addColorStop(0.75, `hsl(${(hueOffset + 270) % 360}, 100%, 60%)`);
            titleGrad.addColorStop(1, `hsl(${hueOffset % 360}, 100%, 60%)`);
            this.ctx.fillStyle = titleGrad;
            this.ctx.shadowColor = "#fff";
            this.ctx.shadowBlur = 15;
            this.ctx.fillText("VICTORY!", this.width / 2, titleY);
            this.ctx.shadowBlur = 0;
            
            // Subtitle
            this.ctx.font = "bold 16px monospace";
            this.ctx.fillStyle = "#8f8";
            this.ctx.fillText("You grabbed the Power BI items before I.T. shut you down!", this.width / 2, this.height / 2 + 5);
            
            // Collected items showcase with animation
            this.ctx.font = "14px monospace";
            let itemY = this.height / 2 + 45;
            for (let i = 0; i < this.fabricItems.length; i++) {
                const item = this.fabricItems[i];
                const itemDelay = i * 0.5;
                const itemBounce = Math.sin(this.winTimer * 0.1 + itemDelay) * 3;
                
                // Item glow
                this.ctx.shadowColor = item.color;
                this.ctx.shadowBlur = 10;
                this.ctx.fillStyle = item.color;
                this.ctx.fillText(`${item.icon} ${item.name}`, this.width / 2 - 60, itemY + itemBounce);
                
                // Checkmark
                this.ctx.fillStyle = "#0f0";
                this.ctx.fillText("✓", this.width / 2 + 70, itemY + itemBounce);
                this.ctx.shadowBlur = 0;
                
                itemY += 26;
            }
            
            // Time survived / stats line
            const surviveTime = Math.floor(this.winTimer / 60);
            this.ctx.font = "12px monospace";
            this.ctx.fillStyle = "#888";
            this.ctx.fillText(`Completed in ${surviveTime} seconds`, this.width / 2, itemY + 15);
            
            // Pulsing "Click to play again" button
            const buttonY = this.height / 2 + 175;
            const buttonPulse = 0.8 + Math.sin(this.winTimer * 0.1) * 0.2;
            const buttonWidth = 200;
            const buttonHeight = 40;
            
            // Button background
            this.ctx.fillStyle = `rgba(0, 150, 0, ${buttonPulse * 0.8})`;
            this.ctx.strokeStyle = `rgba(0, 255, 0, ${buttonPulse})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.roundRect(this.width / 2 - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 10);
            this.ctx.fill();
            this.ctx.stroke();
            
            // Button text
            this.ctx.font = "bold 14px monospace";
            this.ctx.fillStyle = `rgba(255, 255, 255, ${buttonPulse})`;
            this.ctx.fillText("🎮 PLAY AGAIN", this.width / 2, buttonY + 5);
            
            this.ctx.textAlign = "left";
            
            // Note: Click handler is set up elsewhere - no auto-restart on keypress
        }
        
        // ===== HUD =====
        this.drawEnhancedHUD();
        
        // Draw minimap
        this.drawMinimap();
    }
    
    private updateItems(): void {
        if (this.gameWon || this.ghostCaught) return;
        
        // Check for item collection
        for (const item of this.fabricItems) {
            if (item.collected) continue;
            
            const dx = this.playerX - item.x;
            const dy = this.playerY - item.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 0.6) {
                item.collected = true;
                this.itemsCollected++;
                this.lastCollectedItem = item.name;
                this.collectFlashTimer = 60;
                
                // Check for win condition
                if (this.itemsCollected >= this.totalItems) {
                    this.gameWon = true;
                }
            }
        }
        
        // Decrease flash timer
        if (this.collectFlashTimer > 0) {
            this.collectFlashTimer--;
        }
    }
    
    private renderItems(zBuffer: number[], halfHeight: number, fov: number): void {
        for (const item of this.fabricItems) {
            if (item.collected) continue;
            
            // Calculate item position relative to player
            const dx = item.x - this.playerX;
            const dy = item.y - this.playerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 0.1) continue; // Too close
            
            // Calculate angle to item
            const angleToItem = Math.atan2(dy, dx);
            let relativeAngle = angleToItem - this.playerDir;
            
            // Normalize angle
            while (relativeAngle > Math.PI) relativeAngle -= Math.PI * 2;
            while (relativeAngle < -Math.PI) relativeAngle += Math.PI * 2;
            
            // Check if item is in FOV
            if (Math.abs(relativeAngle) > fov / 2 + 0.2) continue;
            
            // Calculate screen X position
            const screenX = this.width / 2 + (relativeAngle / (fov / 2)) * (this.width / 2);
            
            // Calculate sprite size based on distance
            const spriteSize = Math.min(this.height * 0.4, (this.height / dist) * 0.35);
            
            const spriteTop = halfHeight - spriteSize / 2;
            const spriteLeft = screenX - spriteSize / 2;
            
            // Check z-buffer
            const centerX = Math.floor(screenX);
            if (centerX >= 0 && centerX < zBuffer.length && zBuffer[centerX] < dist) {
                continue; // Item is behind a wall
            }
            
            // Floating animation
            const floatOffset = Math.sin(this.pulseTime * 4 + item.x + item.y) * spriteSize * 0.1;
            const rotate = Math.sin(this.pulseTime * 2 + item.x) * 0.2;
            
            this.ctx.save();
            this.ctx.translate(screenX, spriteTop + spriteSize / 2 + floatOffset);
            this.ctx.rotate(rotate);
            
            // Glow effect
            const glowSize = spriteSize * (1.3 + Math.sin(this.pulseTime * 3) * 0.2);
            const glow = this.ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize / 2);
            glow.addColorStop(0, item.color + "88");
            glow.addColorStop(0.5, item.color + "44");
            glow.addColorStop(1, "transparent");
            this.ctx.fillStyle = glow;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, glowSize / 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Icon background
            this.ctx.fillStyle = `rgba(0, 0, 0, 0.6)`;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, spriteSize / 2.5, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Colored ring
            this.ctx.strokeStyle = item.color;
            this.ctx.lineWidth = Math.max(2, spriteSize / 15);
            this.ctx.shadowColor = item.color;
            this.ctx.shadowBlur = 10;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
            
            // Icon emoji
            const fontSize = Math.max(12, spriteSize / 2);
            this.ctx.font = `${fontSize}px Arial`;
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillText(item.icon, 0, 0);
            
            this.ctx.restore();
        }
    }
    
    // Check if a circle of given radius can occupy position (x,y) without hitting walls
    private canMoveWithRadius(x: number, y: number, radius: number): boolean {
        // Check the four cardinal edges and the four diagonal corners of the bounding box
        return this.canMove(x + radius, y) &&
               this.canMove(x - radius, y) &&
               this.canMove(x, y + radius) &&
               this.canMove(x, y - radius) &&
               this.canMove(x + radius, y + radius) &&
               this.canMove(x - radius, y - radius) &&
               this.canMove(x + radius, y - radius) &&
               this.canMove(x - radius, y + radius);
    }
    
    private updateGhost(): void {
        if (this.ghostCaught || this.gameWon) return;
        
        // Calculate direction to player
        const dx = this.playerX - this.ghostX;
        const dy = this.playerY - this.ghostY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Check if I.T. Admin caught the Business Analyst
        if (dist < 0.5) {
            this.ghostCaught = true;
            this.screenShake = 1;
            return;
        }
        
        // Move towards player (I.T. Admin chase AI with wall-sliding)
        if (dist > 0.1) {
            const speed = this.ghostSpeed;
            const radius = 0.15; // collision radius - keeps ghost away from walls
            const normX = dx / dist;
            const normY = dy / dist;
            const moveX = normX * speed;
            const moveY = normY * speed;
            
            let moved = false;
            
            // 1. Try moving in both X and Y simultaneously (diagonal)
            if (this.canMoveWithRadius(this.ghostX + moveX, this.ghostY + moveY, radius)) {
                this.ghostX += moveX;
                this.ghostY += moveY;
                moved = true;
            } else {
                // 2. Try wall-sliding: move on each axis independently
                let movedX = false;
                let movedY = false;
                
                if (this.canMoveWithRadius(this.ghostX + moveX, this.ghostY, radius)) {
                    this.ghostX += moveX;
                    movedX = true;
                    moved = true;
                }
                if (this.canMoveWithRadius(this.ghostX, this.ghostY + moveY, radius)) {
                    this.ghostY += moveY;
                    movedY = true;
                    moved = true;
                }
                
                // 3. If completely stuck, try perpendicular directions to slide around corners
                if (!movedX && !movedY) {
                    // Try the four cardinal directions to find any open path toward player
                    const alternatives = [
                        { ax: speed, ay: 0 },
                        { ax: -speed, ay: 0 },
                        { ax: 0, ay: speed },
                        { ax: 0, ay: -speed }
                    ];
                    
                    // Score each alternative by how much closer it gets to the player
                    let bestScore = Infinity;
                    let bestAlt = { ax: 0, ay: 0 };
                    
                    for (const alt of alternatives) {
                        const newGX = this.ghostX + alt.ax;
                        const newGY = this.ghostY + alt.ay;
                        if (this.canMoveWithRadius(newGX, newGY, radius)) {
                            const newDist = Math.sqrt(
                                (this.playerX - newGX) * (this.playerX - newGX) +
                                (this.playerY - newGY) * (this.playerY - newGY)
                            );
                            if (newDist < bestScore) {
                                bestScore = newDist;
                                bestAlt = alt;
                            }
                        }
                    }
                    
                    if (bestScore < Infinity) {
                        this.ghostX += bestAlt.ax;
                        this.ghostY += bestAlt.ay;
                        moved = true;
                    }
                }
            }
        }
    }
    
    private renderGhost(zBuffer: number[], halfHeight: number, fov: number): void {
        if (this.ghostCaught || !this.imageLoaded) return;
        
        // Calculate I.T. Admin position relative to player
        const dx = this.ghostX - this.playerX;
        const dy = this.ghostY - this.playerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate angle to I.T. Admin
        const angleToGhost = Math.atan2(dy, dx);
        let relativeAngle = angleToGhost - this.playerDir;
        
        // Normalize angle
        while (relativeAngle > Math.PI) relativeAngle -= Math.PI * 2;
        while (relativeAngle < -Math.PI) relativeAngle += Math.PI * 2;
        
        // Check if I.T. Admin is in FOV
        if (Math.abs(relativeAngle) > fov / 2 + 0.2) return;
        
        // Calculate screen X position
        const screenX = this.width / 2 + (relativeAngle / (fov / 2)) * (this.width / 2);
        
        // Calculate sprite size based on distance
        const spriteHeight = Math.min(this.height, (this.height / dist) * 0.6);
        const spriteWidth = spriteHeight * (this.benImage.width / this.benImage.height);
        
        const spriteTop = halfHeight - spriteHeight / 2;
        const spriteLeft = screenX - spriteWidth / 2;
        
        // Check z-buffer - only draw if I.T. Admin is visible (not behind wall)
        const centerX = Math.floor(screenX);
        if (centerX >= 0 && centerX < zBuffer.length && zBuffer[centerX] < dist) {
            return; // I.T. Admin is behind a wall
        }
        
        // ===== 3D I.T. ADMIN RENDERING =====
        this.ctx.save();
        
        // Floating bob animation
        const floatOffset = Math.sin(this.pulseTime * 3) * spriteHeight * 0.05;
        const bobTop = spriteTop + floatOffset;
        
        // Wobble/rotation effect
        const wobble = Math.sin(this.pulseTime * 4) * 0.08;
        
        // Calculate center for transforms
        const centerSpriteX = screenX;
        const centerSpriteY = bobTop + spriteHeight / 2;
        
        // Draw ground shadow (ellipse)
        this.ctx.globalAlpha = 0.4 - floatOffset * 0.01;
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        this.ctx.beginPath();
        this.ctx.ellipse(
            centerSpriteX, 
            bobTop + spriteHeight + 5,
            spriteWidth * 0.4, 
            spriteHeight * 0.1,
            0, 0, Math.PI * 2
        );
        this.ctx.fill();
        
        // Set up transform for wobble
        this.ctx.translate(centerSpriteX, centerSpriteY);
        this.ctx.rotate(wobble);
        
        // Scale pulse for breathing effect
        const breathe = 1 + Math.sin(this.pulseTime * 2) * 0.03;
        this.ctx.scale(breathe, breathe);
        
        // Draw I.T. Admin trail/afterimages for motion blur
        for (let i = 3; i >= 0; i--) {
            const trailAlpha = (0.15 - i * 0.03);
            const trailOffset = i * 8;
            this.ctx.globalAlpha = trailAlpha;
            this.ctx.drawImage(
                this.benImage,
                -spriteWidth / 2 - trailOffset * Math.sign(this.playerX - this.ghostX),
                -spriteHeight / 2,
                spriteWidth, spriteHeight
            );
        }
        
        // Main I.T. Admin image
        const ghostAlpha = 0.85 + Math.sin(this.pulseTime * 5) * 0.1;
        this.ctx.globalAlpha = ghostAlpha;
        this.ctx.drawImage(
            this.benImage,
            -spriteWidth / 2, -spriteHeight / 2,
            spriteWidth, spriteHeight
        );
        
        // I.T. Admin color overlay layers for depth
        this.ctx.globalCompositeOperation = "screen";
        
        // Inner glow (brighter center)
        const innerGlow = this.ctx.createRadialGradient(0, 0, 0, 0, 0, spriteWidth * 0.6);
        innerGlow.addColorStop(0, `rgba(100, 255, 255, ${0.3 + Math.sin(this.pulseTime * 6) * 0.1})`);
        innerGlow.addColorStop(0.5, `rgba(0, 255, 200, ${0.2 + Math.sin(this.pulseTime * 8) * 0.1})`);
        innerGlow.addColorStop(1, "rgba(0, 200, 200, 0)");
        this.ctx.fillStyle = innerGlow;
        this.ctx.fillRect(-spriteWidth / 2, -spriteHeight / 2, spriteWidth, spriteHeight);
        
        // Outer aura glow
        this.ctx.globalCompositeOperation = "source-over";
        this.ctx.shadowColor = "#0ff";
        this.ctx.shadowBlur = 30 + Math.sin(this.pulseTime * 4) * 15;
        this.ctx.strokeStyle = `rgba(0, 255, 255, ${0.6 + Math.sin(this.pulseTime * 6) * 0.3})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.roundRect(-spriteWidth / 2 - 5, -spriteHeight / 2 - 5, spriteWidth + 10, spriteHeight + 10, spriteWidth * 0.1);
        this.ctx.stroke();
        
        // Spooky face highlight edges (3D rim lighting)
        this.ctx.shadowBlur = 0;
        this.ctx.globalAlpha = 0.3;
        this.ctx.strokeStyle = "#fff";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(-spriteWidth * 0.4, -spriteHeight * 0.4);
        this.ctx.quadraticCurveTo(-spriteWidth * 0.5, 0, -spriteWidth * 0.4, spriteHeight * 0.3);
        this.ctx.stroke();
        
        this.ctx.restore();
        
        // Distance fog on I.T. Admin (drawn separately after transform reset)
        const fogAmount = Math.max(0, 1 - (1 / dist) * 2.5);
        if (fogAmount > 0) {
            this.ctx.globalAlpha = fogAmount * 0.4;
            this.ctx.fillStyle = "#001515";
            this.ctx.fillRect(spriteLeft - 10, bobTop - 10, spriteWidth + 20, spriteHeight + 20);
        }
        this.ctx.globalAlpha = 1;
    }

    private updateParticles(): void {
        // Add new particles
        if (Math.random() > 0.7) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: -Math.random() * 0.5 - 0.2,
                life: 100,
                size: Math.random() * 3 + 1
            });
        }
        
        // Update and remove dead particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 1;
            if (p.life <= 0 || p.y < 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Limit particles
        if (this.particles.length > 50) {
            this.particles.splice(0, this.particles.length - 50);
        }
    }
    
    private drawEnhancedHUD(): void {
        // Title banner
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        this.ctx.fillRect(0, 0, this.width, 35);
        
        // Glowing title
        this.ctx.shadowColor = "#0f0";
        this.ctx.shadowBlur = 10;
        this.ctx.fillStyle = "#0f0";
        this.ctx.font = "bold 16px monospace";
        this.ctx.fillText("⚔️ BUSINESS ANALYST vs I.T. ADMIN ⚔️", 10, 22);
        this.ctx.shadowBlur = 0;
        
        // Fabric Items collected display
        let itemX = 200;
        this.ctx.font = "12px monospace";
        for (const item of this.fabricItems) {
            if (item.collected) {
                this.ctx.fillStyle = item.color;
                this.ctx.fillText(item.icon, itemX, 22);
            } else {
                this.ctx.fillStyle = "#333";
                this.ctx.fillText("◯", itemX, 22);
            }
            itemX += 25;
        }
        
        // Items counter
        this.ctx.fillStyle = "#0f0";
        this.ctx.fillText(`${this.itemsCollected}/${this.totalItems}`, itemX + 5, 22);
        
        // Item collection flash notification
        if (this.collectFlashTimer > 0) {
            const flashAlpha = this.collectFlashTimer / 60;
            this.ctx.fillStyle = `rgba(0, 255, 0, ${flashAlpha})`;
            this.ctx.fillRect(0, 35, this.width, 30);
            this.ctx.fillStyle = "#000";
            this.ctx.font = "bold 14px monospace";
            this.ctx.textAlign = "center";
            this.ctx.fillText(`✨ COLLECTED: ${this.lastCollectedItem.toUpperCase()}! ✨`, this.width / 2, 55);
            this.ctx.textAlign = "left";
        }
        
        // Bottom hint bar
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        this.ctx.fillRect(0, this.height - 40, this.width, 40);
        
        this.ctx.fillStyle = `rgba(0, 255, 0, ${0.6 + Math.sin(this.pulseTime * 2) * 0.2})`;
        this.ctx.font = "11px monospace";
        this.ctx.fillText("🎮 WASD/Arrows: Move  |  � Avoid the I.T. Admin!  |  Collect all 4 Fabric items before he shuts you down!", 10, this.height - 18);
        
        // Torch icon (animated)
        const torchX = this.width - 40;
        const torchY = this.height - 25;
        this.ctx.fillStyle = "#8B4513";
        this.ctx.fillRect(torchX + 5, torchY, 6, 15);
        
        // Flame
        const flameHeight = 10 + Math.sin(this.pulseTime * 8) * 3;
        const flameGrad = this.ctx.createLinearGradient(torchX, torchY - flameHeight, torchX, torchY);
        flameGrad.addColorStop(0, `rgba(0, 255, 0, 0)`);
        flameGrad.addColorStop(0.5, `rgba(0, 255, 0, ${this.torchFlicker})`);
        flameGrad.addColorStop(1, `rgba(100, 255, 100, ${this.torchFlicker})`);
        this.ctx.fillStyle = flameGrad;
        this.ctx.beginPath();
        this.ctx.moveTo(torchX + 8, torchY);
        this.ctx.quadraticCurveTo(torchX + 12, torchY - flameHeight/2, torchX + 8, torchY - flameHeight);
        this.ctx.quadraticCurveTo(torchX + 4, torchY - flameHeight/2, torchX + 8, torchY);
        this.ctx.fill();
    }
    
    private handleDungeonInput(): void {
        const cos = Math.cos(this.playerDir);
        const sin = Math.sin(this.playerDir);
        
        // Forward/backward
        if (this.keys["w"] || this.keys["arrowup"]) {
            const newX = this.playerX + cos * this.moveSpeed;
            const newY = this.playerY + sin * this.moveSpeed;
            if (this.canMove(newX, this.playerY)) this.playerX = newX;
            if (this.canMove(this.playerX, newY)) this.playerY = newY;
        }
        if (this.keys["s"] || this.keys["arrowdown"]) {
            const newX = this.playerX - cos * this.moveSpeed;
            const newY = this.playerY - sin * this.moveSpeed;
            if (this.canMove(newX, this.playerY)) this.playerX = newX;
            if (this.canMove(this.playerX, newY)) this.playerY = newY;
        }
        
        // Strafe
        if (this.keys["a"]) {
            const newX = this.playerX + sin * this.moveSpeed;
            const newY = this.playerY - cos * this.moveSpeed;
            if (this.canMove(newX, this.playerY)) this.playerX = newX;
            if (this.canMove(this.playerX, newY)) this.playerY = newY;
        }
        if (this.keys["d"]) {
            const newX = this.playerX - sin * this.moveSpeed;
            const newY = this.playerY + cos * this.moveSpeed;
            if (this.canMove(newX, this.playerY)) this.playerX = newX;
            if (this.canMove(this.playerX, newY)) this.playerY = newY;
        }
        
        // Rotate
        if (this.keys["arrowleft"]) this.playerDir -= this.rotSpeed;
        if (this.keys["arrowright"]) this.playerDir += this.rotSpeed;
    }
    
    private canMove(x: number, y: number): boolean {
        const mapX = Math.floor(x);
        const mapY = Math.floor(y);
        if (mapY < 0 || mapY >= DUNGEON_MAP.length || mapX < 0 || mapX >= DUNGEON_MAP[0].length) {
            return false;
        }
        return DUNGEON_MAP[mapY][mapX] === 0;
    }
    
    private castRay(angle: number): { distance: number; side: number; texCoord: number } {
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        
        let mapX = Math.floor(this.playerX);
        let mapY = Math.floor(this.playerY);
        
        const deltaDistX = Math.abs(1 / dirX);
        const deltaDistY = Math.abs(1 / dirY);
        
        let stepX: number, stepY: number;
        let sideDistX: number, sideDistY: number;
        
        if (dirX < 0) {
            stepX = -1;
            sideDistX = (this.playerX - mapX) * deltaDistX;
        } else {
            stepX = 1;
            sideDistX = (mapX + 1 - this.playerX) * deltaDistX;
        }
        
        if (dirY < 0) {
            stepY = -1;
            sideDistY = (this.playerY - mapY) * deltaDistY;
        } else {
            stepY = 1;
            sideDistY = (mapY + 1 - this.playerY) * deltaDistY;
        }
        
        let side = 0;
        let hit = false;
        
        // DDA algorithm
        for (let i = 0; i < 64; i++) {
            if (sideDistX < sideDistY) {
                sideDistX += deltaDistX;
                mapX += stepX;
                side = 0;
            } else {
                sideDistY += deltaDistY;
                mapY += stepY;
                side = 1;
            }
            
            if (mapY >= 0 && mapY < DUNGEON_MAP.length && mapX >= 0 && mapX < DUNGEON_MAP[0].length) {
                if (DUNGEON_MAP[mapY][mapX] >= 1) {
                    hit = true;
                    break;
                }
            }
        }
        
        if (!hit) return { distance: -1, side: 0, texCoord: 0 };
        
        let perpWallDist: number;
        let wallX: number;
        
        if (side === 0) {
            perpWallDist = (mapX - this.playerX + (1 - stepX) / 2) / dirX;
            wallX = this.playerY + perpWallDist * dirY;
        } else {
            perpWallDist = (mapY - this.playerY + (1 - stepY) / 2) / dirY;
            wallX = this.playerX + perpWallDist * dirX;
        }
        wallX -= Math.floor(wallX);
        
        return { distance: perpWallDist, side, texCoord: wallX };
    }
    
    private drawMinimap(): void {
        const mapSize = 90;
        const cellSize = mapSize / DUNGEON_MAP.length;
        const mapX = this.width - mapSize - 15;
        const mapY = 45; // Below title bar
        
        // Glowing border
        this.ctx.shadowColor = "#0f0";
        this.ctx.shadowBlur = 8;
        this.ctx.strokeStyle = "#0f0";
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(mapX - 4, mapY - 4, mapSize + 8, mapSize + 8);
        this.ctx.shadowBlur = 0;
        
        // Background
        this.ctx.fillStyle = "rgba(0, 20, 0, 0.8)";
        this.ctx.fillRect(mapX - 2, mapY - 2, mapSize + 4, mapSize + 4);
        
        // Draw cells
        for (let y = 0; y < DUNGEON_MAP.length; y++) {
            for (let x = 0; x < DUNGEON_MAP[0].length; x++) {
                const cell = DUNGEON_MAP[y][x];
                if (cell === 1) {
                    this.ctx.fillStyle = "#0a3a0a";
                } else {
                    this.ctx.fillStyle = "#050f05";
                }
                this.ctx.fillRect(mapX + x * cellSize, mapY + y * cellSize, cellSize - 1, cellSize - 1);
            }
        }
        
        // Draw FOV cone
        const px = mapX + this.playerX * cellSize;
        const py = mapY + this.playerY * cellSize;
        const fovLength = 15;
        const fovAngle = Math.PI / 3;
        
        this.ctx.fillStyle = "rgba(0, 255, 0, 0.15)";
        this.ctx.beginPath();
        this.ctx.moveTo(px, py);
        this.ctx.lineTo(
            px + Math.cos(this.playerDir - fovAngle/2) * fovLength,
            py + Math.sin(this.playerDir - fovAngle/2) * fovLength
        );
        this.ctx.lineTo(
            px + Math.cos(this.playerDir + fovAngle/2) * fovLength,
            py + Math.sin(this.playerDir + fovAngle/2) * fovLength
        );
        this.ctx.closePath();
        this.ctx.fill();
        
        // Draw player with glow
        this.ctx.shadowColor = "#0f0";
        this.ctx.shadowBlur = 5;
        this.ctx.fillStyle = "#0f0";
        this.ctx.beginPath();
        this.ctx.arc(px, py, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        
        // Draw direction arrow
        this.ctx.strokeStyle = "#0f0";
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(px, py);
        this.ctx.lineTo(px + Math.cos(this.playerDir) * 10, py + Math.sin(this.playerDir) * 10);
        this.ctx.stroke();
        
        // Draw I.T. Admin on minimap as tiny Ben face icon
        if (!this.ghostCaught && !this.gameWon && this.imageLoaded) {
            const gx = mapX + this.ghostX * cellSize;
            const gy = mapY + this.ghostY * cellSize;
            const ghostPulse = 0.6 + Math.sin(this.pulseTime * 6) * 0.4;
            const benRadius = 5;
            
            // Pulsing glow behind Ben icon
            this.ctx.shadowColor = "#f00";
            this.ctx.shadowBlur = 8;
            this.ctx.strokeStyle = `rgba(255, 0, 0, ${ghostPulse})`;
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            this.ctx.arc(gx, gy, benRadius + 2, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
            
            // Clip to circle and draw tiny Ben face
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(gx, gy, benRadius, 0, Math.PI * 2);
            this.ctx.clip();
            this.ctx.drawImage(
                this.benImage,
                gx - benRadius, gy - benRadius,
                benRadius * 2, benRadius * 2
            );
            // Tinted overlay for menacing look
            this.ctx.globalAlpha = 0.3 * ghostPulse;
            this.ctx.fillStyle = "#ff0000";
            this.ctx.fillRect(gx - benRadius, gy - benRadius, benRadius * 2, benRadius * 2);
            this.ctx.restore();
        }
        
        // Draw Fabric items on minimap
        for (const item of this.fabricItems) {
            if (item.collected) continue;
            
            const ix = mapX + item.x * cellSize;
            const iy = mapY + item.y * cellSize;
            const itemPulse = 0.6 + Math.sin(this.pulseTime * 4 + item.x) * 0.4;
            
            this.ctx.shadowColor = item.color;
            this.ctx.shadowBlur = 6;
            this.ctx.fillStyle = item.color + (Math.floor(itemPulse * 255).toString(16).padStart(2, '0'));
            this.ctx.beginPath();
            this.ctx.arc(ix, iy, 3, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }
    }

    public update(options: VisualUpdateOptions) {
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel, 
            options.dataViews?.[0]
        );

        // Resize canvas
        this.width = options.viewport.width;
        this.height = options.viewport.height;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Extract data values for the rain
        this.dataValues = [];
        const dataView = options.dataViews?.[0];
        if (dataView?.categorical?.categories?.[0]?.values) {
            this.dataValues = dataView.categorical.categories[0].values.map(v => String(v));
        }
        if (dataView?.categorical?.values?.[0]?.values) {
            const vals = dataView.categorical.values[0].values.map(v => String(v));
            this.dataValues = [...this.dataValues, ...vals];
        }

        if (this.dataValues.length === 0) {
            this.dataValues = ["SQL", "DATA", "BEN", "2026", "NULL", "JOIN", "SELECT", "FROM", "WHERE"];
        }

        this.initDrops();

        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    public destroy(): void {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}
