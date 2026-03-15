import { IGame } from "./IGame";

interface Brick { x: number; y: number; w: number; h: number; alive: boolean; color: string; }

export class BreakoutGame implements IGame {
    readonly name = "Breakout";
    readonly description = "Smash all the bricks!";

    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private container: HTMLElement;
    private animId: number | null = null;

    private scoreEl: HTMLElement;
    private msgEl: HTMLElement;

    private running = false;
    private gameOver = false;

    private w = 300;
    private h = 200;

    // paddle
    private paddleW = 70;
    private paddleH = 10;
    private paddleX = 115;

    // ball
    private ballX = 150;
    private ballY = 180;
    private ballR = 5;
    private ballVX = 3;
    private ballVY = -3;
    private ballLaunched = false;

    // bricks
    private bricks: Brick[] = [];
    private brickRows = 4;
    private brickCols = 8;

    // score
    private score = 0;
    private highScore = 0;
    private lives = 3;

    // input
    private mouseX: number | null = null;
    private keysDown = new Set<string>();

    private boundKeyDown = (e: KeyboardEvent) => this.keysDown.add(e.key);
    private boundKeyUp = (e: KeyboardEvent) => this.keysDown.delete(e.key);

    private readonly BRICK_COLORS = ["#e94560", "#f5a623", "#f8e71c", "#7ed321", "#4a90d9", "#bd10e0"];

    init(container: HTMLElement): void {
        this.container = container;
        container.innerHTML = "";

        const hud = document.createElement("div");
        hud.className = "breakout-hud";
        this.scoreEl = document.createElement("span");
        this.scoreEl.textContent = "Score: 0 | Lives: 3";
        hud.appendChild(this.scoreEl);

        this.canvas = document.createElement("canvas");
        this.canvas.className = "breakout-canvas";
        this.canvas.tabIndex = 0;
        this.canvas.width = this.w;
        this.canvas.height = this.h;

        this.msgEl = document.createElement("div");
        this.msgEl.className = "breakout-msg";
        this.msgEl.textContent = "Click to launch the ball!";

        container.appendChild(hud);
        container.appendChild(this.canvas);
        container.appendChild(this.msgEl);

        this.ctx = this.canvas.getContext("2d")!;

        this.canvas.addEventListener("mousemove", (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
        });
        this.canvas.addEventListener("click", () => {
            if (!this.running || this.gameOver) {
                this.startRound();
            } else if (!this.ballLaunched) {
                this.launchBall();
            }
            this.canvas.focus();
        });

        document.addEventListener("keydown", this.boundKeyDown);
        document.addEventListener("keyup", this.boundKeyUp);
    }

    start(): void { this.drawIdle(); }

    stop(): void {
        this.cancelAnim();
        this.running = false;
    }

    resize(width: number, height: number): void {
        this.w = Math.max(200, width - 4);
        this.h = Math.max(180, height - 60);
        this.canvas.width = this.w;
        this.canvas.height = this.h;
        this.paddleW = Math.max(40, Math.floor(this.w / 5));
        if (!this.running) this.drawIdle();
        else if (this.running) {
            this.buildBricks();
            this.draw();
        }
    }

    destroy(): void {
        this.cancelAnim();
        document.removeEventListener("keydown", this.boundKeyDown);
        document.removeEventListener("keyup", this.boundKeyUp);
    }

    // --- internals ---

    private startRound(): void {
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.running = true;
        this.paddleX = (this.w - this.paddleW) / 2;
        this.buildBricks();
        this.resetBall();
        this.updateHud();
        this.msgEl.textContent = "Click or press Space to launch!";
        this.loop();
    }

    private buildBricks(): void {
        this.bricks = [];
        const padding = 4;
        const topOffset = 30;
        const bw = (this.w - padding * (this.brickCols + 1)) / this.brickCols;
        const bh = 14;
        for (let r = 0; r < this.brickRows; r++) {
            for (let c = 0; c < this.brickCols; c++) {
                this.bricks.push({
                    x: padding + c * (bw + padding),
                    y: topOffset + r * (bh + padding),
                    w: bw,
                    h: bh,
                    alive: true,
                    color: this.BRICK_COLORS[r % this.BRICK_COLORS.length],
                });
            }
        }
    }

    private resetBall(): void {
        this.ballLaunched = false;
        this.ballVX = 3 * (Math.random() > 0.5 ? 1 : -1);
        this.ballVY = -4;
    }

    private launchBall(): void {
        this.ballLaunched = true;
        this.msgEl.textContent = "";
    }

    private loop = (): void => {
        if (!this.running) return;
        this.updateGame();
        this.draw();
        this.animId = requestAnimationFrame(this.loop);
    };

    private updateGame(): void {
        // paddle movement
        const pSpeed = 6;
        if (this.mouseX !== null) {
            const target = this.mouseX - this.paddleW / 2;
            this.paddleX += (target - this.paddleX) * 0.3;
        }
        if (this.keysDown.has("ArrowLeft")) this.paddleX -= pSpeed;
        if (this.keysDown.has("ArrowRight")) this.paddleX += pSpeed;
        this.paddleX = Math.max(0, Math.min(this.w - this.paddleW, this.paddleX));

        if (this.keysDown.has(" ") && !this.ballLaunched) {
            this.launchBall();
        }

        // ball follows paddle if not launched
        if (!this.ballLaunched) {
            this.ballX = this.paddleX + this.paddleW / 2;
            this.ballY = this.h - this.paddleH - this.ballR - 4;
            return;
        }

        this.ballX += this.ballVX;
        this.ballY += this.ballVY;

        // wall bounces
        if (this.ballX - this.ballR < 0) { this.ballX = this.ballR; this.ballVX = Math.abs(this.ballVX); }
        if (this.ballX + this.ballR > this.w) { this.ballX = this.w - this.ballR; this.ballVX = -Math.abs(this.ballVX); }
        if (this.ballY - this.ballR < 0) { this.ballY = this.ballR; this.ballVY = Math.abs(this.ballVY); }

        // paddle collision
        if (this.ballVY > 0 &&
            this.ballY + this.ballR >= this.h - this.paddleH - 4 &&
            this.ballY + this.ballR <= this.h - 2 &&
            this.ballX >= this.paddleX && this.ballX <= this.paddleX + this.paddleW) {
            this.ballVY = -Math.abs(this.ballVY);
            const offset = (this.ballX - (this.paddleX + this.paddleW / 2)) / (this.paddleW / 2);
            this.ballVX = offset * 5;
        }

        // bottom — lose life
        if (this.ballY - this.ballR > this.h) {
            this.lives--;
            this.updateHud();
            if (this.lives <= 0) {
                this.endGame("No lives left!");
                return;
            }
            this.resetBall();
            this.msgEl.textContent = `Lost a life! ${this.lives} left. Click/Space to relaunch.`;
        }

        // brick collision
        for (const b of this.bricks) {
            if (!b.alive) continue;
            if (this.ballX + this.ballR > b.x && this.ballX - this.ballR < b.x + b.w &&
                this.ballY + this.ballR > b.y && this.ballY - this.ballR < b.y + b.h) {
                b.alive = false;
                this.score += 10;
                this.updateHud();

                // determine collision side
                const overlapLeft = (this.ballX + this.ballR) - b.x;
                const overlapRight = (b.x + b.w) - (this.ballX - this.ballR);
                const overlapTop = (this.ballY + this.ballR) - b.y;
                const overlapBottom = (b.y + b.h) - (this.ballY - this.ballR);
                const minOverlapX = Math.min(overlapLeft, overlapRight);
                const minOverlapY = Math.min(overlapTop, overlapBottom);

                if (minOverlapX < minOverlapY) {
                    this.ballVX = -this.ballVX;
                } else {
                    this.ballVY = -this.ballVY;
                }
                break; // one brick per frame
            }
        }

        // check win
        if (this.bricks.every(b => !b.alive)) {
            this.endGame("You cleared all bricks!");
        }
    }

    private endGame(msg: string): void {
        this.gameOver = true;
        this.running = false;
        this.cancelAnim();
        if (this.score > this.highScore) this.highScore = this.score;
        this.msgEl.textContent = `${msg} Score: ${this.score}. Click to play again.`;
        this.draw();
    }

    private draw(): void {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.w, this.h);

        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, this.w, this.h);

        // bricks
        for (const b of this.bricks) {
            if (!b.alive) continue;
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.strokeStyle = "rgba(255,255,255,0.2)";
            ctx.strokeRect(b.x, b.y, b.w, b.h);
        }

        // paddle
        ctx.fillStyle = "#0ff";
        const py = this.h - this.paddleH - 4;
        ctx.beginPath();
        ctx.roundRect(this.paddleX, py, this.paddleW, this.paddleH, 4);
        ctx.fill();

        // ball
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(this.ballX, this.ballY, this.ballR, 0, Math.PI * 2);
        ctx.fill();

        if (this.gameOver) {
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(0, 0, this.w, this.h);
            ctx.fillStyle = "#fff";
            ctx.font = "bold 22px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("GAME OVER", this.w / 2, this.h / 2);
        }
    }

    private drawIdle(): void {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.w, this.h);
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, this.w, this.h);
        ctx.fillStyle = "#f5a623";
        ctx.font = "bold 22px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("BREAKOUT", this.w / 2, this.h / 2 - 10);
        ctx.fillStyle = "#aaa";
        ctx.font = "14px sans-serif";
        ctx.fillText("Click to Play", this.w / 2, this.h / 2 + 16);
    }

    private updateHud(): void {
        this.scoreEl.textContent = `Score: ${this.score} | Lives: ${this.lives} | Best: ${this.highScore}`;
    }

    private cancelAnim(): void {
        if (this.animId !== null) {
            cancelAnimationFrame(this.animId);
            this.animId = null;
        }
    }
}
