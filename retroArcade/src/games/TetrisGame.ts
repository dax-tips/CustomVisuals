import { IGame } from "./IGame";

// Standard Tetris pieces (each rotation is a list of [row,col] offsets)
const PIECES: { shape: number[][][]; color: string }[] = [
    { shape: [[[0,0],[0,1],[1,0],[1,1]]], color: "#f8e71c" },                                     // O
    { shape: [[[0,0],[0,1],[0,2],[0,3]], [[0,0],[1,0],[2,0],[3,0]]], color: "#0ff" },              // I
    { shape: [[[0,0],[1,0],[1,1],[1,2]], [[0,0],[0,1],[1,0],[2,0]], [[0,0],[0,1],[0,2],[1,2]], [[0,1],[1,1],[2,0],[2,1]]], color: "#4a90d9" }, // J
    { shape: [[[0,2],[1,0],[1,1],[1,2]], [[0,0],[1,0],[2,0],[2,1]], [[0,0],[0,1],[0,2],[1,0]], [[0,0],[0,1],[1,1],[2,1]]], color: "#f5a623" }, // L
    { shape: [[[0,1],[0,2],[1,0],[1,1]], [[0,0],[1,0],[1,1],[2,1]]], color: "#7ed321" },           // S
    { shape: [[[0,0],[0,1],[1,1],[1,2]], [[0,1],[1,0],[1,1],[2,0]]], color: "#e94560" },           // Z
    { shape: [[[0,1],[1,0],[1,1],[1,2]], [[0,0],[1,0],[1,1],[2,0]], [[0,0],[0,1],[0,2],[1,1]], [[0,1],[1,0],[1,1],[2,1]]], color: "#bd10e0" },// T
];

export class TetrisGame implements IGame {
    readonly name = "Tetris";
    readonly description = "Classic block-stacking puzzle!";

    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private container: HTMLElement;

    private scoreEl: HTMLElement;
    private msgEl: HTMLElement;

    private running = false;
    private gameOver = false;
    private intervalId: number | null = null;

    private readonly COLS = 10;
    private readonly ROWS = 20;
    private cellSize = 16;

    // board[row][col] = color string or "" for empty
    private board: string[][] = [];

    // current piece
    private curPiece = 0;
    private curRot = 0;
    private curX = 0;
    private curY = 0;

    // next piece
    private nextPiece = 0;

    private score = 0;
    private highScore = 0;
    private lines = 0;
    private level = 1;

    private boundKeyHandler = (e: KeyboardEvent) => this.onKey(e);

    init(container: HTMLElement): void {
        this.container = container;
        container.innerHTML = "";

        const hud = document.createElement("div");
        hud.className = "tetris-hud";
        this.scoreEl = document.createElement("span");
        this.scoreEl.textContent = "Score: 0 | Lines: 0 | Level: 1";
        hud.appendChild(this.scoreEl);

        this.canvas = document.createElement("canvas");
        this.canvas.className = "tetris-canvas";
        this.canvas.tabIndex = 0;

        this.msgEl = document.createElement("div");
        this.msgEl.className = "tetris-msg";
        this.msgEl.textContent = "Click or press any key to start!";

        container.appendChild(hud);
        container.appendChild(this.canvas);
        container.appendChild(this.msgEl);

        this.ctx = this.canvas.getContext("2d")!;
        this.recalcSize(300, 200);

        this.canvas.addEventListener("click", () => {
            if (!this.running || this.gameOver) this.startRound();
            this.canvas.focus();
        });

        document.addEventListener("keydown", this.boundKeyHandler);
    }

    start(): void { this.drawIdle(); }

    stop(): void {
        this.clearTimer();
        this.running = false;
    }

    resize(width: number, height: number): void {
        this.recalcSize(width, height);
        if (!this.running) this.drawIdle();
        else this.draw();
    }

    destroy(): void {
        this.clearTimer();
        document.removeEventListener("keydown", this.boundKeyHandler);
    }

    // --- internals ---

    private recalcSize(width: number, height: number): void {
        const available = Math.max(120, height - 60);
        this.cellSize = Math.max(8, Math.floor(available / this.ROWS));
        const cw = this.cellSize * (this.COLS + 6); // extra space for next piece preview
        const ch = this.cellSize * this.ROWS;
        this.canvas.width = cw;
        this.canvas.height = ch;
    }

    private startRound(): void {
        this.board = Array.from({ length: this.ROWS }, () => Array(this.COLS).fill(""));
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.gameOver = false;
        this.running = true;
        this.nextPiece = Math.floor(Math.random() * PIECES.length);
        this.spawnPiece();
        this.updateHud();
        this.msgEl.textContent = "";
        this.clearTimer();
        this.intervalId = window.setInterval(() => this.tick(), this.getSpeed());
    }

    private getSpeed(): number {
        return Math.max(80, 500 - (this.level - 1) * 40);
    }

    private spawnPiece(): void {
        this.curPiece = this.nextPiece;
        this.nextPiece = Math.floor(Math.random() * PIECES.length);
        this.curRot = 0;
        this.curX = Math.floor((this.COLS - 3) / 2);
        this.curY = 0;
        if (!this.isValid(this.curPiece, this.curRot, this.curX, this.curY)) {
            this.endGame();
        }
    }

    private getCells(piece: number, rot: number): number[][] {
        const p = PIECES[piece];
        return p.shape[rot % p.shape.length];
    }

    private isValid(piece: number, rot: number, px: number, py: number): boolean {
        for (const [r, c] of this.getCells(piece, rot)) {
            const nr = py + r;
            const nc = px + c;
            if (nc < 0 || nc >= this.COLS || nr >= this.ROWS) return false;
            if (nr >= 0 && this.board[nr][nc] !== "") return false;
        }
        return true;
    }

    private tick(): void {
        if (this.gameOver) return;
        if (this.isValid(this.curPiece, this.curRot, this.curX, this.curY + 1)) {
            this.curY++;
        } else {
            this.lockPiece();
        }
        this.draw();
    }

    private lockPiece(): void {
        const color = PIECES[this.curPiece].color;
        for (const [r, c] of this.getCells(this.curPiece, this.curRot)) {
            const nr = this.curY + r;
            const nc = this.curX + c;
            if (nr >= 0 && nr < this.ROWS && nc >= 0 && nc < this.COLS) {
                this.board[nr][nc] = color;
            }
        }
        this.clearLines();
        this.spawnPiece();
    }

    private clearLines(): void {
        let cleared = 0;
        for (let r = this.ROWS - 1; r >= 0; r--) {
            if (this.board[r].every(c => c !== "")) {
                this.board.splice(r, 1);
                this.board.unshift(Array(this.COLS).fill(""));
                cleared++;
                r++; // recheck this row
            }
        }
        if (cleared > 0) {
            const points = [0, 100, 300, 500, 800];
            this.score += (points[cleared] || 800) * this.level;
            this.lines += cleared;
            this.level = Math.floor(this.lines / 10) + 1;
            this.updateHud();
            // update speed
            this.clearTimer();
            this.intervalId = window.setInterval(() => this.tick(), this.getSpeed());
        }
    }

    private endGame(): void {
        this.gameOver = true;
        this.running = false;
        this.clearTimer();
        if (this.score > this.highScore) this.highScore = this.score;
        this.msgEl.textContent = `Game Over! Score: ${this.score}. Click to retry.`;
        this.draw();
    }

    private draw(): void {
        const ctx = this.ctx;
        const cs = this.cellSize;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // board background
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, cs * this.COLS, cs * this.ROWS);

        // grid lines
        ctx.strokeStyle = "#222";
        ctx.lineWidth = 0.5;
        for (let r = 0; r <= this.ROWS; r++) {
            ctx.beginPath(); ctx.moveTo(0, r * cs); ctx.lineTo(this.COLS * cs, r * cs); ctx.stroke();
        }
        for (let c = 0; c <= this.COLS; c++) {
            ctx.beginPath(); ctx.moveTo(c * cs, 0); ctx.lineTo(c * cs, this.ROWS * cs); ctx.stroke();
        }

        // placed blocks
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (this.board[r][c] !== "") {
                    this.drawBlock(c * cs, r * cs, cs, this.board[r][c]);
                }
            }
        }

        // current piece
        if (!this.gameOver) {
            const color = PIECES[this.curPiece].color;
            for (const [r, c] of this.getCells(this.curPiece, this.curRot)) {
                const dr = this.curY + r;
                const dc = this.curX + c;
                if (dr >= 0) {
                    this.drawBlock(dc * cs, dr * cs, cs, color);
                }
            }

            // ghost piece (drop preview)
            let ghostY = this.curY;
            while (this.isValid(this.curPiece, this.curRot, this.curX, ghostY + 1)) ghostY++;
            if (ghostY !== this.curY) {
                ctx.globalAlpha = 0.25;
                for (const [r, c] of this.getCells(this.curPiece, this.curRot)) {
                    const dr = ghostY + r;
                    const dc = this.curX + c;
                    if (dr >= 0) {
                        this.drawBlock(dc * cs, dr * cs, cs, color);
                    }
                }
                ctx.globalAlpha = 1;
            }
        }

        // next piece preview (right side)
        const previewX = this.COLS * cs + cs;
        ctx.fillStyle = "#111";
        ctx.fillRect(previewX, 0, cs * 5, cs * 5);
        ctx.fillStyle = "#888";
        ctx.font = `${Math.max(9, cs - 4)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("NEXT", previewX + cs * 2.5, cs - 2);
        const nextColor = PIECES[this.nextPiece].color;
        for (const [r, c] of this.getCells(this.nextPiece, 0)) {
            this.drawBlock(previewX + (c + 0.5) * cs, (r + 1.2) * cs, cs, nextColor);
        }

        if (this.gameOver) {
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.fillRect(0, 0, this.COLS * cs, this.ROWS * cs);
            ctx.fillStyle = "#fff";
            ctx.font = "bold 20px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("GAME OVER", (this.COLS * cs) / 2, (this.ROWS * cs) / 2);
        }
    }

    private drawBlock(x: number, y: number, size: number, color: string): void {
        const ctx = this.ctx;
        ctx.fillStyle = color;
        ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
        // highlight
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(x + 1, y + 1, size - 2, 3);
        ctx.fillRect(x + 1, y + 1, 3, size - 2);
    }

    private drawIdle(): void {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = "#bd10e0";
        ctx.font = "bold 22px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("TETRIS", this.canvas.width / 2, this.canvas.height / 2 - 10);
        ctx.fillStyle = "#aaa";
        ctx.font = "14px sans-serif";
        ctx.fillText("Click to Play", this.canvas.width / 2, this.canvas.height / 2 + 16);
    }

    private updateHud(): void {
        this.scoreEl.textContent = `Score: ${this.score} | Lines: ${this.lines} | Level: ${this.level} | Best: ${this.highScore}`;
    }

    private onKey(e: KeyboardEvent): void {
        if (!this.running && !this.gameOver) { this.startRound(); return; }
        if (this.gameOver) { this.startRound(); return; }
        if (!this.running) return;

        switch (e.key) {
            case "ArrowLeft":
                if (this.isValid(this.curPiece, this.curRot, this.curX - 1, this.curY)) {
                    this.curX--;
                    this.draw();
                }
                break;
            case "ArrowRight":
                if (this.isValid(this.curPiece, this.curRot, this.curX + 1, this.curY)) {
                    this.curX++;
                    this.draw();
                }
                break;
            case "ArrowDown":
                if (this.isValid(this.curPiece, this.curRot, this.curX, this.curY + 1)) {
                    this.curY++;
                    this.draw();
                }
                break;
            case "ArrowUp":
            case "x": {
                const newRot = (this.curRot + 1) % PIECES[this.curPiece].shape.length;
                if (this.isValid(this.curPiece, newRot, this.curX, this.curY)) {
                    this.curRot = newRot;
                    this.draw();
                } else if (this.isValid(this.curPiece, newRot, this.curX - 1, this.curY)) {
                    this.curX--;
                    this.curRot = newRot;
                    this.draw();
                } else if (this.isValid(this.curPiece, newRot, this.curX + 1, this.curY)) {
                    this.curX++;
                    this.curRot = newRot;
                    this.draw();
                }
                break;
            }
            case " ": {
                // hard drop
                while (this.isValid(this.curPiece, this.curRot, this.curX, this.curY + 1)) {
                    this.curY++;
                    this.score += 2;
                }
                this.lockPiece();
                this.draw();
                break;
            }
        }
    }

    private clearTimer(): void {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
