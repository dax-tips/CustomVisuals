/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

import { VisualFormattingSettingsModel } from "./settings";

interface MineCell {
    isMine: boolean;
    isRevealed: boolean;
    isFlagged: boolean;
    isQuestionMarked: boolean;
    neighborCount: number;
    row: number;
    col: number;
}

interface GameConfig {
    rows: number;
    cols: number;
    mines: number;
}

enum GameState {
    NotStarted,
    Playing,
    Won,
    Lost
}

export class Visual implements IVisual {
    private target: HTMLElement;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    
    // Game state
    private gameGrid: MineCell[][];
    private gameState: GameState;
    private startTime: number;
    private timer: number;
    private timerInterval: number | null;
    private flaggedCount: number;
    private revealedCount: number;
    private gameConfig: GameConfig;
    
    // DOM elements
    private gameContainer: HTMLElement;
    private gameHeader: HTMLElement;
    private mineCountDisplay: HTMLElement;
    private timerDisplay: HTMLElement;
    private restartButton: HTMLElement;
    private gridElement: HTMLElement;
    private gameStatus: HTMLElement;

    constructor(options: VisualConstructorOptions) {
        console.log('Visual constructor', options);
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        
        this.initializeGame();
        this.createGameElements();
    }

    private initializeGame(): void {
        this.gameState = GameState.NotStarted;
        this.timer = 0;
        this.timerInterval = null;
        this.flaggedCount = 0;
        this.revealedCount = 0;
        this.gameConfig = { rows: 9, cols: 9, mines: 10 }; // Default to beginner
    }

    private createGameElements(): void {
        // Clear existing content
        this.target.innerHTML = '';
        
        // Create main container
        this.gameContainer = document.createElement('div');
        this.gameContainer.className = 'minesweeper-container';
        
        // Create header with controls
        this.gameHeader = document.createElement('div');
        this.gameHeader.className = 'game-header';
        
        // Game info section
        const gameInfo = document.createElement('div');
        gameInfo.className = 'game-info';
        
        // Mine counter
        this.mineCountDisplay = document.createElement('div');
        this.mineCountDisplay.className = 'info-display';
        this.mineCountDisplay.textContent = this.gameConfig.mines.toString().padStart(3, '0');
        
        // Timer
        this.timerDisplay = document.createElement('div');
        this.timerDisplay.className = 'info-display';
        this.timerDisplay.textContent = '000';
        
        gameInfo.appendChild(this.mineCountDisplay);
        gameInfo.appendChild(this.timerDisplay);
        
        // Restart button
        this.restartButton = document.createElement('div');
        this.restartButton.className = 'restart-button';
        this.restartButton.textContent = '🙂';
        this.restartButton.addEventListener('click', () => this.restartGame());
        
        this.gameHeader.appendChild(gameInfo);
        this.gameHeader.appendChild(this.restartButton);
        
        // Create game grid
        this.gridElement = document.createElement('div');
        this.gridElement.className = 'game-grid';
        
        // Game status
        this.gameStatus = document.createElement('div');
        this.gameStatus.className = 'game-status';
        
        // Assemble the game
        this.gameContainer.appendChild(this.gameHeader);
        this.gameContainer.appendChild(this.gridElement);
        this.gameContainer.appendChild(this.gameStatus);
        this.target.appendChild(this.gameContainer);
        
        this.initializeGameGrid();
    }

    private initializeGameGrid(): void {
        const { rows, cols, mines } = this.gameConfig;
        
        // Initialize grid data structure
        this.gameGrid = [];
        for (let r = 0; r < rows; r++) {
            this.gameGrid[r] = [];
            for (let c = 0; c < cols; c++) {
                this.gameGrid[r][c] = {
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    isQuestionMarked: false,
                    neighborCount: 0,
                    row: r,
                    col: c
                };
            }
        }
        
        // Set grid CSS properties
        this.gridElement.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        this.gridElement.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
        
        // Create DOM elements for cells
        this.gridElement.innerHTML = '';
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cellElement = document.createElement('div');
                cellElement.className = 'mine-cell';
                cellElement.dataset.row = r.toString();
                cellElement.dataset.col = c.toString();
                
                // Add event listeners
                cellElement.addEventListener('click', (e) => this.handleCellClick(e, r, c));
                cellElement.addEventListener('contextmenu', (e) => this.handleCellRightClick(e, r, c));
                
                this.gridElement.appendChild(cellElement);
            }
        }
    }

    private placeMines(excludeRow: number, excludeCol: number): void {
        const { rows, cols, mines } = this.gameConfig;
        let minesPlaced = 0;
        
        while (minesPlaced < mines) {
            const r = Math.floor(Math.random() * rows);
            const c = Math.floor(Math.random() * cols);
            
            // Don't place mine on first clicked cell or if already has mine
            if ((r === excludeRow && c === excludeCol) || this.gameGrid[r][c].isMine) {
                continue;
            }
            
            this.gameGrid[r][c].isMine = true;
            minesPlaced++;
        }
        
        // Calculate neighbor counts
        this.calculateNeighborCounts();
    }

    private calculateNeighborCounts(): void {
        const { rows, cols } = this.gameConfig;
        
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!this.gameGrid[r][c].isMine) {
                    let count = 0;
                    
                    // Check all 8 neighbors
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            if (dr === 0 && dc === 0) continue;
                            
                            const nr = r + dr;
                            const nc = c + dc;
                            
                            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                                if (this.gameGrid[nr][nc].isMine) {
                                    count++;
                                }
                            }
                        }
                    }
                    
                    this.gameGrid[r][c].neighborCount = count;
                }
            }
        }
    }

    private handleCellClick(event: MouseEvent, row: number, col: number): void {
        event.preventDefault();
        
        if (this.gameState === GameState.Won || this.gameState === GameState.Lost) {
            return;
        }
        
        const cell = this.gameGrid[row][col];
        
        if (cell.isFlagged || cell.isRevealed) {
            return;
        }
        
        // First click - place mines and start timer
        if (this.gameState === GameState.NotStarted) {
            this.placeMines(row, col);
            this.gameState = GameState.Playing;
            this.startTimer();
        }
        
        this.revealCell(row, col);
        this.updateDisplay();
        this.checkGameState();
    }

    private handleCellRightClick(event: MouseEvent, row: number, col: number): void {
        event.preventDefault();
        
        if (this.gameState === GameState.Won || this.gameState === GameState.Lost) {
            return;
        }
        
        const cell = this.gameGrid[row][col];
        
        if (cell.isRevealed) {
            return;
        }
        
        // Cycle through: normal -> flagged -> question -> normal
        if (!cell.isFlagged && !cell.isQuestionMarked) {
            cell.isFlagged = true;
            this.flaggedCount++;
        } else if (cell.isFlagged) {
            cell.isFlagged = false;
            cell.isQuestionMarked = true;
            this.flaggedCount--;
        } else {
            cell.isQuestionMarked = false;
        }
        
        this.updateCellDisplay(row, col);
        this.updateMineCounter();
    }

    private revealCell(row: number, col: number): void {
        const cell = this.gameGrid[row][col];
        
        if (cell.isRevealed || cell.isFlagged) {
            return;
        }
        
        cell.isRevealed = true;
        this.revealedCount++;
        
        if (cell.isMine) {
            this.gameState = GameState.Lost;
            this.revealAllMines();
            this.stopTimer();
            return;
        }
        
        // If cell has no neighboring mines, reveal neighbors
        if (cell.neighborCount === 0) {
            const { rows, cols } = this.gameConfig;
            
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    
                    const nr = row + dr;
                    const nc = col + dc;
                    
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                        this.revealCell(nr, nc);
                    }
                }
            }
        }
    }

    private revealAllMines(): void {
        const { rows, cols } = this.gameConfig;
        
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = this.gameGrid[r][c];
                
                if (cell.isMine && !cell.isFlagged) {
                    cell.isRevealed = true;
                } else if (!cell.isMine && cell.isFlagged) {
                    // Mark wrong flags
                    cell.isRevealed = false;
                }
                
                this.updateCellDisplay(r, c);
            }
        }
    }

    private updateCellDisplay(row: number, col: number): void {
        const cell = this.gameGrid[row][col];
        const cellElement = this.gridElement.children[row * this.gameConfig.cols + col] as HTMLElement;
        
        // Clear classes
        cellElement.className = 'mine-cell';
        cellElement.textContent = '';
        
        if (cell.isRevealed) {
            cellElement.classList.add('revealed');
            
            if (cell.isMine) {
                cellElement.classList.add('mine');
                cellElement.textContent = '💣';
                if (this.gameState === GameState.Lost) {
                    cellElement.classList.add('mine-exploded');
                }
            } else if (cell.neighborCount > 0) {
                cellElement.textContent = cell.neighborCount.toString();
                cellElement.classList.add(`number-${cell.neighborCount}`);
            }
        } else if (cell.isFlagged) {
            cellElement.classList.add('flagged');
            cellElement.textContent = '🚩';
            
            // Mark wrong flags when game is lost
            if (this.gameState === GameState.Lost && !cell.isMine) {
                cellElement.classList.add('wrong-flag');
            }
        } else if (cell.isQuestionMarked) {
            cellElement.classList.add('question');
            cellElement.textContent = '?';
        }
    }

    private updateDisplay(): void {
        const { rows, cols } = this.gameConfig;
        
        // Update all cells
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                this.updateCellDisplay(r, c);
            }
        }
        
        this.updateMineCounter();
    }

    private updateMineCounter(): void {
        const remainingMines = this.gameConfig.mines - this.flaggedCount;
        this.mineCountDisplay.textContent = remainingMines.toString().padStart(3, '0');
    }

    private checkGameState(): void {
        const totalCells = this.gameConfig.rows * this.gameConfig.cols;
        const nonMineCells = totalCells - this.gameConfig.mines;
        
        if (this.revealedCount === nonMineCells && this.gameState === GameState.Playing) {
            this.gameState = GameState.Won;
            this.stopTimer();
            this.restartButton.textContent = '😎';
            this.gameStatus.textContent = 'Congratulations! You won!';
            this.gameStatus.className = 'game-status won';
        } else if (this.gameState === GameState.Lost) {
            this.restartButton.textContent = '😵';
            this.gameStatus.textContent = 'Game Over! Try again.';
            this.gameStatus.className = 'game-status lost';
        }
    }

    private startTimer(): void {
        this.startTime = Date.now();
        this.timerInterval = window.setInterval(() => {
            this.timer = Math.floor((Date.now() - this.startTime) / 1000);
            this.timerDisplay.textContent = Math.min(this.timer, 999).toString().padStart(3, '0');
        }, 1000);
    }

    private stopTimer(): void {
        if (this.timerInterval) {
            window.clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    private restartGame(): void {
        this.stopTimer();
        this.timer = 0;
        this.timerDisplay.textContent = '000';
        this.flaggedCount = 0;
        this.revealedCount = 0;
        this.gameState = GameState.NotStarted;
        this.restartButton.textContent = '🙂';
        this.gameStatus.textContent = '';
        this.gameStatus.className = 'game-status';
        
        this.initializeGameGrid();
        this.updateMineCounter();
    }

    private getDifficultyConfig(difficulty: string): GameConfig {
        switch (difficulty) {
            case 'intermediate':
                return { rows: 16, cols: 16, mines: 40 };
            case 'expert':
                return { rows: 16, cols: 30, mines: 99 };
            case 'beginner':
            default:
                return { rows: 9, cols: 9, mines: 10 };
        }
    }

    public update(options: VisualUpdateOptions) {
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews[0]);

        console.log('Visual update', options);
        
        // Update game settings if they changed
        if (this.formattingSettings) {
            const difficultyValue = this.formattingSettings.gameSettingsCard.difficulty.value.value as string;
            const newConfig = this.getDifficultyConfig(difficultyValue);
            
            // If difficulty changed, restart the game
            if (newConfig.rows !== this.gameConfig.rows || 
                newConfig.cols !== this.gameConfig.cols || 
                newConfig.mines !== this.gameConfig.mines) {
                
                this.gameConfig = newConfig;
                this.restartGame();
            }
            
            // Update visual settings
            this.updateVisualSettings();
        }
    }

    private updateVisualSettings(): void {
        if (!this.formattingSettings) return;
        
        const appearance = this.formattingSettings.appearanceSettingsCard;
        const gameSettings = this.formattingSettings.gameSettingsCard;
        
        // Update cell size
        const cellSize = appearance.cellSize.value;
        const cells = this.gridElement.querySelectorAll('.mine-cell');
        cells.forEach((cell: HTMLElement) => {
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;
            cell.style.fontSize = `${Math.max(8, cellSize * 0.6)}px`;
        });
        
        // Update colors using CSS custom properties
        const style = document.createElement('style');
        style.textContent = `
            .mine-cell {
                border-color: ${appearance.borderColor.value.value} !important;
                background-color: ${appearance.cellColor.value.value} !important;
            }
            .mine-cell.revealed {
                background-color: ${appearance.revealedCellColor.value.value} !important;
            }
            .mine-cell.revealed.mine {
                background-color: ${appearance.mineColor.value.value} !important;
            }
            .mine-cell.flagged {
                color: ${appearance.flagColor.value.value} !important;
            }
        `;
        
        // Remove old style if it exists
        const existingStyle = this.target.querySelector('#minesweeper-dynamic-style');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        style.id = 'minesweeper-dynamic-style';
        this.target.appendChild(style);
        
        // Show/hide timer and mine counter
        if (this.mineCountDisplay) {
            this.mineCountDisplay.style.display = gameSettings.showMineCounter.value ? 'flex' : 'none';
        }
        if (this.timerDisplay) {
            this.timerDisplay.style.display = gameSettings.showTimer.value ? 'flex' : 'none';
        }
    }

    /**
     * Returns properties pane formatting model content hierarchies, properties and latest formatting values, Then populate properties pane.
     * This method is called once every time we open properties pane or when the user edit any format property. 
     */
    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}