import { IGame } from "./IGame";

interface Point { x: number; y: number; }

enum Direction { Up, Down, Left, Right }

export class SnakeGame implements IGame {
    readonly name = "Snake";
    readonly description = "Classic snake game — eat food to grow!";

    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private container: HTMLElement;

    private gridSize = 16;
    private snake: Point[] = [];
    private food: Point = { x: 0, y: 0 };
    private direction: Direction = Direction.Right;
    private nextDirection: Direction = Direction.Right;
    private score = 0;
    private highScore = 0;
    private gameOver = false;
    private running = false;
    private intervalId: number | null = null;
    private scoreEl: HTMLElement;
    private msgEl: HTMLElement;
    private cols = 0;
    private rows = 0;

    private boundKeyHandler = (e: KeyboardEvent) => this.onKey(e);

    init(container: HTMLElement): void {
        this.container = container;
        container.innerHTML = "";

        const hud = document.createElement("div");
        hud.className = "snake-hud";

        this.scoreEl = document.createElement("span");
        this.scoreEl.textContent = "Score: 0 | Best: 0";
        hud.appendChild(this.scoreEl);

        this.canvas = document.createElement("canvas");
        this.canvas.className = "snake-canvas";
        this.canvas.tabIndex = 0;

        this.msgEl = document.createElement("div");
        this.msgEl.className = "snake-msg";
        this.msgEl.textContent = "Click or press any arrow key to start!";

        container.appendChild(hud);
        container.appendChild(this.canvas);
        container.appendChild(this.msgEl);

        this.ctx = this.canvas.getContext("2d")!;

        // Set initial canvas size so cols/rows are never 0
        this.canvas.width = 300;
        this.canvas.height = 150;
        this.cols = Math.floor(300 / this.gridSize);
        this.rows = Math.floor(150 / this.gridSize);

        this.canvas.addEventListener("click", () => {
            if (!this.running || this.gameOver) this.startRound();
            this.canvas.focus();
        });

        document.addEventListener("keydown", this.boundKeyHandler);
    }

    start(): void {
        this.drawIdle();
    }

    stop(): void {
        this.clearTimer();
        this.running = false;
    }

    resize(width: number, height: number): void {
        const hudHeight = 28;
        const msgHeight = 24;
        const cw = Math.max(160, width - 4);
        const ch = Math.max(160, height - hudHeight - msgHeight - 12);

        const newCols = Math.floor(cw / this.gridSize);
        const newRows = Math.floor(ch / this.gridSize);

        // If grid changed while running, clamp the snake to stay in bounds
        if (this.running && (newCols !== this.cols || newRows !== this.rows)) {
            this.canvas.width = cw;
            this.canvas.height = ch;
            this.cols = newCols;
            this.rows = newRows;
            // Clamp snake positions — if any part is out of bounds, end gracefully
            const outOfBounds = this.snake.some(s => s.x >= this.cols || s.y >= this.rows);
            if (outOfBounds) {
                this.endGame();
            } else {
                // Ensure food is also in bounds
                if (this.food.x >= this.cols || this.food.y >= this.rows) {
                    this.placeFood();
                }
                this.draw();
            }
        } else {
            this.canvas.width = cw;
            this.canvas.height = ch;
            this.cols = newCols;
            this.rows = newRows;
            if (!this.running) this.drawIdle();
        }
    }

    destroy(): void {
        this.clearTimer();
        document.removeEventListener("keydown", this.boundKeyHandler);
    }

    // --- internals ---

    private startRound(): void {
        // Guard: don't start if grid is too small
        if (this.cols < 6 || this.rows < 6) return;

        this.score = 0;
        this.gameOver = false;
        this.direction = Direction.Right;
        this.nextDirection = Direction.Right;
        this.running = true;

        const midX = Math.floor(this.cols / 2);
        const midY = Math.floor(this.rows / 2);
        this.snake = [
            { x: midX, y: midY },
            { x: midX - 1, y: midY },
            { x: midX - 2, y: midY },
        ];

        this.placeFood();
        this.updateHud();
        this.msgEl.textContent = "";

        this.clearTimer();
        this.intervalId = window.setInterval(() => this.tick(), 100);
    }

    private tick(): void {
        if (this.gameOver || this.cols < 2 || this.rows < 2) return;

        this.direction = this.nextDirection;
        const head = { ...this.snake[0] };

        switch (this.direction) {
            case Direction.Up:    head.y--; break;
            case Direction.Down:  head.y++; break;
            case Direction.Left:  head.x--; break;
            case Direction.Right: head.x++; break;
        }

        // wall collision
        if (head.x < 0 || head.x >= this.cols || head.y < 0 || head.y >= this.rows) {
            return this.endGame();
        }

        // self collision
        if (this.snake.some(s => s.x === head.x && s.y === head.y)) {
            return this.endGame();
        }

        this.snake.unshift(head);

        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.placeFood();
        } else {
            this.snake.pop();
        }

        this.updateHud();
        this.draw();
    }

    private endGame(): void {
        this.gameOver = true;
        this.running = false;
        this.clearTimer();
        if (this.score > this.highScore) this.highScore = this.score;
        this.updateHud();
        this.msgEl.textContent = `Game Over! Score: ${this.score}. Click or press arrow key to retry.`;
        this.draw();
    }

    private placeFood(): void {
        if (this.cols < 1 || this.rows < 1) return;
        const occupied = new Set(this.snake.map(s => `${s.x},${s.y}`));
        let attempts = 0;
        do {
            this.food = {
                x: Math.floor(Math.random() * this.cols),
                y: Math.floor(Math.random() * this.rows),
            };
            attempts++;
        } while (occupied.has(`${this.food.x},${this.food.y}`) && attempts < 1000);
    }

    private draw(): void {
        const g = this.gridSize;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // background grid
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, this.cols * g, this.rows * g);

        // food
        ctx.fillStyle = "#e94560";
        ctx.beginPath();
        ctx.arc(this.food.x * g + g / 2, this.food.y * g + g / 2, g / 2 - 2, 0, Math.PI * 2);
        ctx.fill();

        // snake
        this.snake.forEach((s, i) => {
            const brightness = Math.max(40, 100 - i * 2);
            ctx.fillStyle = i === 0 ? "#0ff" : `hsl(160, 100%, ${brightness}%)`;
            ctx.fillRect(s.x * g + 1, s.y * g + 1, g - 2, g - 2);
            if (i === 0) {
                ctx.fillStyle = "#1a1a2e";
                const eyeSize = 3;
                const eyeOffset = 4;
                if (this.direction === Direction.Right || this.direction === Direction.Left) {
                    ctx.fillRect(s.x * g + (this.direction === Direction.Right ? g - eyeOffset - eyeSize : eyeOffset), s.y * g + 3, eyeSize, eyeSize);
                    ctx.fillRect(s.x * g + (this.direction === Direction.Right ? g - eyeOffset - eyeSize : eyeOffset), s.y * g + g - 6, eyeSize, eyeSize);
                } else {
                    ctx.fillRect(s.x * g + 3, s.y * g + (this.direction === Direction.Down ? g - eyeOffset - eyeSize : eyeOffset), eyeSize, eyeSize);
                    ctx.fillRect(s.x * g + g - 6, s.y * g + (this.direction === Direction.Down ? g - eyeOffset - eyeSize : eyeOffset), eyeSize, eyeSize);
                }
            }
        });

        if (this.gameOver) {
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.fillStyle = "#fff";
            ctx.font = "bold 24px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("GAME OVER", this.canvas.width / 2, this.canvas.height / 2);
        }
    }

    private drawIdle(): void {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = "#0ff";
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("SNAKE", this.canvas.width / 2, this.canvas.height / 2 - 10);
        ctx.fillStyle = "#aaa";
        ctx.font = "14px sans-serif";
        ctx.fillText("Click to Play", this.canvas.width / 2, this.canvas.height / 2 + 16);
    }

    private updateHud(): void {
        this.scoreEl.textContent = `Score: ${this.score} | Best: ${this.highScore}`;
    }

    private onKey(e: KeyboardEvent): void {
        if (!this.running && !this.gameOver && ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
            this.startRound();
            return;
        }
        if (this.gameOver && ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
            this.startRound();
            return;
        }
        switch (e.key) {
            case "ArrowUp":    if (this.direction !== Direction.Down)  this.nextDirection = Direction.Up; break;
            case "ArrowDown":  if (this.direction !== Direction.Up)    this.nextDirection = Direction.Down; break;
            case "ArrowLeft":  if (this.direction !== Direction.Right) this.nextDirection = Direction.Left; break;
            case "ArrowRight": if (this.direction !== Direction.Left)  this.nextDirection = Direction.Right; break;
        }
    }

    private clearTimer(): void {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
