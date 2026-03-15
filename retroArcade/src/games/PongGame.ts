import { IGame } from "./IGame";

export class PongGame implements IGame {
    readonly name = "Pong";
    readonly description = "Classic Pong — you vs the computer!";

    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private container: HTMLElement;
    private animId: number | null = null;

    private scoreEl: HTMLElement;
    private msgEl: HTMLElement;

    private running = false;
    private paused = false;

    // dimensions
    private w = 300;
    private h = 200;

    // paddles
    private paddleW = 10;
    private paddleH = 60;
    private playerY = 70;
    private aiY = 70;
    private paddleSpeed = 5;
    private aiSpeed = 3;

    // ball
    private ballX = 150;
    private ballY = 100;
    private ballR = 6;
    private ballVX = 4;
    private ballVY = 3;

    // scores
    private playerScore = 0;
    private aiScore = 0;
    private winScore = 5;

    // input
    private mouseY: number | null = null;
    private keysDown = new Set<string>();

    private boundKeyDown = (e: KeyboardEvent) => this.onKeyDown(e);
    private boundKeyUp = (e: KeyboardEvent) => this.onKeyUp(e);

    init(container: HTMLElement): void {
        this.container = container;
        container.innerHTML = "";

        const hud = document.createElement("div");
        hud.className = "pong-hud";
        this.scoreEl = document.createElement("span");
        this.scoreEl.textContent = "You: 0 | CPU: 0";
        hud.appendChild(this.scoreEl);

        this.canvas = document.createElement("canvas");
        this.canvas.className = "pong-canvas";
        this.canvas.tabIndex = 0;
        this.canvas.width = this.w;
        this.canvas.height = this.h;

        this.msgEl = document.createElement("div");
        this.msgEl.className = "pong-msg";
        this.msgEl.textContent = "Click to start! Use mouse or Up/Down arrows.";

        container.appendChild(hud);
        container.appendChild(this.canvas);
        container.appendChild(this.msgEl);

        this.ctx = this.canvas.getContext("2d")!;

        this.canvas.addEventListener("mousemove", (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseY = e.clientY - rect.top;
        });
        this.canvas.addEventListener("click", () => {
            if (!this.running) this.startRound();
            this.canvas.focus();
        });

        document.addEventListener("keydown", this.boundKeyDown);
        document.addEventListener("keyup", this.boundKeyUp);
    }

    start(): void {
        this.drawIdle();
    }

    stop(): void {
        this.cancelAnim();
        this.running = false;
    }

    resize(width: number, height: number): void {
        this.w = Math.max(200, width - 4);
        this.h = Math.max(150, height - 60);
        this.canvas.width = this.w;
        this.canvas.height = this.h;
        this.paddleH = Math.max(30, Math.floor(this.h / 4));
        if (!this.running) this.drawIdle();
    }

    destroy(): void {
        this.cancelAnim();
        document.removeEventListener("keydown", this.boundKeyDown);
        document.removeEventListener("keyup", this.boundKeyUp);
    }

    // --- internals ---

    private startRound(): void {
        this.playerScore = 0;
        this.aiScore = 0;
        this.running = true;
        this.paused = false;
        this.resetBall();
        this.playerY = (this.h - this.paddleH) / 2;
        this.aiY = (this.h - this.paddleH) / 2;
        this.updateHud();
        this.msgEl.textContent = "";
        this.loop();
    }

    private resetBall(): void {
        this.ballX = this.w / 2;
        this.ballY = this.h / 2;
        const angle = (Math.random() - 0.5) * Math.PI / 3;
        const dir = Math.random() > 0.5 ? 1 : -1;
        const speed = 4 + Math.min(this.playerScore + this.aiScore, 6) * 0.3;
        this.ballVX = Math.cos(angle) * speed * dir;
        this.ballVY = Math.sin(angle) * speed;
    }

    private loop = (): void => {
        if (!this.running) return;
        this.update();
        this.draw();
        this.animId = requestAnimationFrame(this.loop);
    };

    private update(): void {
        const gap = 15; // paddle distance from wall

        // player paddle via mouse or keyboard
        if (this.mouseY !== null) {
            const target = this.mouseY - this.paddleH / 2;
            this.playerY += (target - this.playerY) * 0.3;
        }
        if (this.keysDown.has("ArrowUp")) this.playerY -= this.paddleSpeed;
        if (this.keysDown.has("ArrowDown")) this.playerY += this.paddleSpeed;
        this.playerY = Math.max(0, Math.min(this.h - this.paddleH, this.playerY));

        // AI paddle
        const aiCenter = this.aiY + this.paddleH / 2;
        if (this.ballY < aiCenter - 10) this.aiY -= this.aiSpeed;
        else if (this.ballY > aiCenter + 10) this.aiY += this.aiSpeed;
        this.aiY = Math.max(0, Math.min(this.h - this.paddleH, this.aiY));

        // ball movement
        this.ballX += this.ballVX;
        this.ballY += this.ballVY;

        // top/bottom bounce
        if (this.ballY - this.ballR < 0) { this.ballY = this.ballR; this.ballVY = Math.abs(this.ballVY); }
        if (this.ballY + this.ballR > this.h) { this.ballY = this.h - this.ballR; this.ballVY = -Math.abs(this.ballVY); }

        // player paddle collision (left side)
        if (this.ballVX < 0 &&
            this.ballX - this.ballR <= gap + this.paddleW &&
            this.ballX - this.ballR >= gap &&
            this.ballY >= this.playerY && this.ballY <= this.playerY + this.paddleH) {
            this.ballVX = Math.abs(this.ballVX) * 1.05;
            const offset = (this.ballY - (this.playerY + this.paddleH / 2)) / (this.paddleH / 2);
            this.ballVY = offset * 5;
        }

        // AI paddle collision (right side)
        const aiX = this.w - gap - this.paddleW;
        if (this.ballVX > 0 &&
            this.ballX + this.ballR >= aiX &&
            this.ballX + this.ballR <= aiX + this.paddleW &&
            this.ballY >= this.aiY && this.ballY <= this.aiY + this.paddleH) {
            this.ballVX = -Math.abs(this.ballVX) * 1.05;
            const offset = (this.ballY - (this.aiY + this.paddleH / 2)) / (this.paddleH / 2);
            this.ballVY = offset * 5;
        }

        // scoring
        if (this.ballX < 0) {
            this.aiScore++;
            this.updateHud();
            if (this.aiScore >= this.winScore) { this.endGame("CPU wins!"); return; }
            this.resetBall();
        }
        if (this.ballX > this.w) {
            this.playerScore++;
            this.updateHud();
            if (this.playerScore >= this.winScore) { this.endGame("You win!"); return; }
            this.resetBall();
        }
    }

    private endGame(msg: string): void {
        this.running = false;
        this.cancelAnim();
        this.msgEl.textContent = `${msg} Click to play again.`;
        this.draw();
    }

    private draw(): void {
        const ctx = this.ctx;
        const gap = 15;
        ctx.clearRect(0, 0, this.w, this.h);

        // bg
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, this.w, this.h);

        // center line
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.w / 2, 0);
        ctx.lineTo(this.w / 2, this.h);
        ctx.stroke();
        ctx.setLineDash([]);

        // player paddle
        ctx.fillStyle = "#0ff";
        ctx.fillRect(gap, this.playerY, this.paddleW, this.paddleH);

        // AI paddle
        ctx.fillStyle = "#e94560";
        ctx.fillRect(this.w - gap - this.paddleW, this.aiY, this.paddleW, this.paddleH);

        // ball
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(this.ballX, this.ballY, this.ballR, 0, Math.PI * 2);
        ctx.fill();

        // scores in field
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.font = `bold ${Math.floor(this.h / 3)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(String(this.playerScore), this.w / 4, this.h / 2 + this.h / 8);
        ctx.fillText(String(this.aiScore), (this.w * 3) / 4, this.h / 2 + this.h / 8);
    }

    private drawIdle(): void {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.w, this.h);
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, this.w, this.h);
        ctx.fillStyle = "#0ff";
        ctx.font = "bold 22px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("PONG", this.w / 2, this.h / 2 - 10);
        ctx.fillStyle = "#aaa";
        ctx.font = "14px sans-serif";
        ctx.fillText("Click to Play", this.w / 2, this.h / 2 + 16);
    }

    private updateHud(): void {
        this.scoreEl.textContent = `You: ${this.playerScore} | CPU: ${this.aiScore} (first to ${this.winScore})`;
    }

    private onKeyDown(e: KeyboardEvent): void {
        this.keysDown.add(e.key);
        if (!this.running && ["ArrowUp","ArrowDown"].includes(e.key)) this.startRound();
    }

    private onKeyUp(e: KeyboardEvent): void {
        this.keysDown.delete(e.key);
    }

    private cancelAnim(): void {
        if (this.animId !== null) {
            cancelAnimationFrame(this.animId);
            this.animId = null;
        }
    }
}
