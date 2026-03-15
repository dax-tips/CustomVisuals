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

interface Card {
    id: number;
    symbol: string;
    isFlipped: boolean;
    isMatched: boolean;
    element: HTMLElement;
}

interface Mole {
    id: number;
    element: HTMLElement;
    isVisible: boolean;
    timeout?: number;
}

interface Enemy {
    id: number;
    x: number;
    y: number;
    health: number;
    maxHealth: number;
    speed: number;
    pathIndex: number;
    element: HTMLElement;
    value: number;
}

interface Tower {
    id: number;
    x: number;
    y: number;
    type: string;
    damage: number;
    range: number;
    fireRate: number;
    lastFire: number;
    element: HTMLElement;
    cost: number;
}

interface Projectile {
    id: number;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    damage: number;
    speed: number;
    element: HTMLElement;
}

interface Building {
    id: number;
    x: number;
    y: number;
    type: string;
    level: number;
    element: HTMLElement;
    cost: number;
    income: number;
    happiness: number;
    power: number;
    population: number;
}

interface Citizen {
    id: number;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    element: HTMLElement;
    happiness: number;
    moving: boolean;
}

interface MineCell {
    id: number;
    x: number;
    y: number;
    isMine: boolean;
    isRevealed: boolean;
    isFlagged: boolean;
    neighborMines: number;
    element: HTMLElement;
}

enum GameType {
    MemoryMatch = 'memory',
    WhackAMole = 'whack',
    ReactionTime = 'reaction',
    TowerDefense = 'tower',
    CityBuilder = 'city',
    Minesweeper = 'minesweeper'
}

export class Visual implements IVisual {
    private target: HTMLElement;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    
    // Game selection
    private currentGame: GameType;
    private gameSelector: HTMLElement;
    private gameContainer: HTMLElement;
    
    // Memory Match Game state
    private cards: Card[];
    private flippedCards: Card[];
    private gameBoard: HTMLElement;
    private scoreElement: HTMLElement;
    private resetButton: HTMLElement;
    private matches: number;
    private attempts: number;
    private isProcessing: boolean;

    // Whack-a-Mole Game state
    private moles: Mole[];
    private moleBoard: HTMLElement;
    private moleScore: number;
    private moleTimeLeft: number;
    private moleGameActive: boolean;
    private moleTimer: number;
    private moleScoreElement: HTMLElement;
    private moleTimeElement: HTMLElement;
    private moleStartButton: HTMLElement;

    // Reaction Time Game state
    private reactionBoard: HTMLElement;
    private reactionButton: HTMLElement;
    private reactionScoreElement: HTMLElement;
    private reactionInstructionElement: HTMLElement;
    private reactionStartButton: HTMLElement;
    private reactionTimes: number[];
    private reactionStartTime: number;
    private reactionGameActive: boolean;
    private reactionTimer: number;
    private reactionRound: number;
    private maxReactionRounds: number;

    // Tower Defense Game state
    private towerBoard: HTMLElement;
    private towerGameActive: boolean;
    private towerWave: number;
    private towerMoney: number;
    private towerLives: number;
    private towerEnemies: Enemy[];
    private towerTowers: Tower[];
    private towerProjectiles: Projectile[];
    private towerPath: {x: number, y: number}[];
    private towerGameLoop: number;
    private towerSelectedTowerType: string;
    private towerInfoElement: HTMLElement;
    private towerControlsElement: HTMLElement;
    private nextEnemyId: number;
    private nextTowerId: number;
    private nextProjectileId: number;
    private enemiesInWave: number;
    private enemiesSpawned: number;
    private waveInProgress: boolean;

    // City Builder Game state
    private cityBoard: HTMLElement;
    private cityGameActive: boolean;
    private cityMoney: number;
    private cityPopulation: number;
    private cityHappiness: number;
    private cityPower: number;
    private cityBuildings: Building[];
    private cityCitizens: Citizen[];
    private citySelectedBuildingType: string;
    private cityInfoElement: HTMLElement;
    private cityControlsElement: HTMLElement;
    private cityGameLoop: number;
    private nextBuildingId: number;
    private nextCitizenId: number;
    private cityGrid: number[][];
    private cityTaxRate: number;
    private cityLastUpdate: number;

    // Minesweeper Game state
    private mineBoard: HTMLElement;
    private mineGameActive: boolean;
    private mineCells: MineCell[];
    private mineGrid: MineCell[][];
    private mineCount: number;
    private flagCount: number;
    private revealedCount: number;
    private mineInfoElement: HTMLElement;
    private mineControlsElement: HTMLElement;
    private mineGameWon: boolean;
    private mineGameLost: boolean;
    private mineGridWidth: number;
    private mineGridHeight: number;

    // Game symbols (using emojis for simplicity)
    private symbols: string[] = ['🎯', '🌟', '🎨', '🎪', '🎭', '🎸', '🎮', '🎲'];

    constructor(options: VisualConstructorOptions) {
        console.log('Visual constructor', options);
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        
        // Initialize Memory Match state
        this.cards = [];
        this.flippedCards = [];
        this.matches = 0;
        this.attempts = 0;
        this.isProcessing = false;

        // Initialize Whack-a-Mole state
        this.moles = [];
        this.moleScore = 0;
        this.moleTimeLeft = 30;
        this.moleGameActive = false;
        this.moleTimer = 0;

        // Initialize Reaction Time state
        this.reactionTimes = [];
        this.reactionStartTime = 0;
        this.reactionGameActive = false;
        this.reactionTimer = 0;
        this.reactionRound = 0;
        this.maxReactionRounds = 5;

        // Initialize Tower Defense state
        this.towerGameActive = false;
        this.towerWave = 1;
        this.towerMoney = 100;
        this.towerLives = 20;
        this.towerEnemies = [];
        this.towerTowers = [];
        this.towerProjectiles = [];
        this.towerSelectedTowerType = 'basic';
        this.nextEnemyId = 1;
        this.nextTowerId = 1;
        this.nextProjectileId = 1;
        this.enemiesInWave = 5;
        this.enemiesSpawned = 0;
        this.waveInProgress = false;

        // Initialize City Builder state
        this.cityGameActive = false;
        this.cityMoney = 1000;
        this.cityPopulation = 0;
        this.cityHappiness = 50;
        this.cityPower = 0;
        this.cityBuildings = [];
        this.cityCitizens = [];
        this.citySelectedBuildingType = 'house';
        this.nextBuildingId = 1;
        this.nextCitizenId = 1;
        this.cityTaxRate = 10;
        this.cityLastUpdate = Date.now();
        this.cityGrid = Array(20).fill(null).map(() => Array(25).fill(0));

        // Initialize Minesweeper state
        this.mineCells = [];
        this.mineGridWidth = 16;
        this.mineGridHeight = 16;
        this.mineCount = 40;
        this.flagCount = 0;
        this.revealedCount = 0;
        this.mineGameActive = false;
        this.mineGameWon = false;
        this.mineGameLost = false;

        this.currentGame = GameType.MemoryMatch;
        this.initializeGameSelector();
    }

    private initializeGameSelector(): void {
        // Clear any existing content
        this.target.innerHTML = '';
        
        // Create main container
        const mainContainer = document.createElement('div');
        mainContainer.style.cssText = `
            font-family: Arial, sans-serif;
            padding: 20px;
            text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100%;
            box-sizing: border-box;
        `;

        // Create title
        const title = document.createElement('h1');
        title.textContent = 'Power BI Game Center';
        title.style.cssText = `
            color: white;
            margin: 0 0 20px 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        `;

        // Create game selector
        this.gameSelector = document.createElement('div');
        this.gameSelector.style.cssText = `
            margin-bottom: 20px;
            display: flex;
            justify-content: center;
            gap: 10px;
            flex-wrap: wrap;
        `;

        // Memory Match button
        const memoryButton = document.createElement('button');
        memoryButton.textContent = '🧠 Memory';
        memoryButton.style.cssText = this.getGameButtonStyle(this.currentGame === GameType.MemoryMatch);
        memoryButton.addEventListener('click', () => this.switchGame(GameType.MemoryMatch));

        // Whack-a-Mole button
        const whackButton = document.createElement('button');
        whackButton.textContent = '🔨 Whack';
        whackButton.style.cssText = this.getGameButtonStyle(this.currentGame === GameType.WhackAMole);
        whackButton.addEventListener('click', () => this.switchGame(GameType.WhackAMole));

        // Reaction Time button
        const reactionButton = document.createElement('button');
        reactionButton.textContent = '⚡ Reaction';
        reactionButton.style.cssText = this.getGameButtonStyle(this.currentGame === GameType.ReactionTime);
        reactionButton.addEventListener('click', () => this.switchGame(GameType.ReactionTime));

        // Tower Defense button
        const towerButton = document.createElement('button');
        towerButton.textContent = '🗼 Tower';
        towerButton.style.cssText = this.getGameButtonStyle(this.currentGame === GameType.TowerDefense);
        towerButton.addEventListener('click', () => this.switchGame(GameType.TowerDefense));

        // City Builder button
        const cityButton = document.createElement('button');
        cityButton.textContent = '🏙️ City';
        cityButton.style.cssText = this.getGameButtonStyle(this.currentGame === GameType.CityBuilder);
        cityButton.addEventListener('click', () => this.switchGame(GameType.CityBuilder));

        // Minesweeper button
        const mineButton = document.createElement('button');
        mineButton.textContent = '💣 Mines';
        mineButton.style.cssText = this.getGameButtonStyle(this.currentGame === GameType.Minesweeper);
        mineButton.addEventListener('click', () => this.switchGame(GameType.Minesweeper));

        this.gameSelector.appendChild(memoryButton);
        this.gameSelector.appendChild(whackButton);
        this.gameSelector.appendChild(reactionButton);
        this.gameSelector.appendChild(towerButton);
        this.gameSelector.appendChild(cityButton);
        this.gameSelector.appendChild(mineButton);

        // Create game container
        this.gameContainer = document.createElement('div');

        // Assemble the interface
        mainContainer.appendChild(title);
        mainContainer.appendChild(this.gameSelector);
        mainContainer.appendChild(this.gameContainer);
        this.target.appendChild(mainContainer);

        // Initialize the current game
        this.loadCurrentGame();
    }

    private getGameButtonStyle(isActive: boolean): string {
        return `
            background: ${isActive ? '#ff6b6b' : 'rgba(255,255,255,0.2)'};
            color: white;
            border: 2px solid ${isActive ? '#ff6b6b' : 'rgba(255,255,255,0.3)'};
            padding: 12px 24px;
            font-size: 16px;
            border-radius: 25px;
            cursor: pointer;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
            font-weight: ${isActive ? 'bold' : 'normal'};
        `;
    }

    private switchGame(gameType: GameType): void {
        if (this.currentGame === gameType) return;
        
        this.currentGame = gameType;
        
        // Update button styles
        const buttons = this.gameSelector.querySelectorAll('button');
        buttons[0].style.cssText = this.getGameButtonStyle(gameType === GameType.MemoryMatch);
        buttons[1].style.cssText = this.getGameButtonStyle(gameType === GameType.WhackAMole);
        buttons[2].style.cssText = this.getGameButtonStyle(gameType === GameType.ReactionTime);
        buttons[3].style.cssText = this.getGameButtonStyle(gameType === GameType.TowerDefense);
        buttons[4].style.cssText = this.getGameButtonStyle(gameType === GameType.CityBuilder);
        buttons[5].style.cssText = this.getGameButtonStyle(gameType === GameType.Minesweeper);
        
        // Clean up current game
        this.cleanupCurrentGame();
        
        // Load new game
        this.loadCurrentGame();
    }

    private cleanupCurrentGame(): void {
        // Clear any timers
        if (this.moleTimer) {
            clearInterval(this.moleTimer);
        }
        if (this.reactionTimer) {
            clearTimeout(this.reactionTimer);
        }
        if (this.towerGameLoop) {
            cancelAnimationFrame(this.towerGameLoop);
        }
        if (this.cityGameLoop) {
            cancelAnimationFrame(this.cityGameLoop);
        }
        
        // Clear mole timeouts
        this.moles.forEach(mole => {
            if (mole.timeout) {
                clearTimeout(mole.timeout);
            }
        });
        
        // Reset states
        this.isProcessing = false;
        this.moleGameActive = false;
        this.reactionGameActive = false;
        this.towerGameActive = false;
        this.cityGameActive = false;
        this.mineGameActive = false;
    }

    private loadCurrentGame(): void {
        this.gameContainer.innerHTML = '';
        
        if (this.currentGame === GameType.MemoryMatch) {
            this.initializeMemoryMatch();
        } else if (this.currentGame === GameType.WhackAMole) {
            this.initializeWhackAMole();
        } else if (this.currentGame === GameType.ReactionTime) {
            this.initializeReactionTime();
        } else if (this.currentGame === GameType.TowerDefense) {
            this.initializeTowerDefense();
        } else if (this.currentGame === GameType.CityBuilder) {
            this.initializeCityBuilder();
        } else if (this.currentGame === GameType.Minesweeper) {
            this.initializeMinesweeper();
        }
    }

    // =============== MEMORY MATCH GAME ===============

    private initializeMemoryMatch(): void {
        // Create score display
        this.scoreElement = document.createElement('div');
        this.updateScore();
        this.scoreElement.style.cssText = `
            color: white;
            font-size: 18px;
            margin-bottom: 20px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        `;

        // Create reset button
        this.resetButton = document.createElement('button');
        this.resetButton.textContent = 'New Game';
        this.resetButton.style.cssText = `
            background: #ff6b6b;
            color: white;
            border: none;
            padding: 10px 20px;
            font-size: 16px;
            border-radius: 5px;
            cursor: pointer;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: background 0.3s ease;
        `;
        this.resetButton.addEventListener('click', () => this.resetMemoryGame());

        // Create game board
        this.gameBoard = document.createElement('div');
        this.gameBoard.style.cssText = `
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            max-width: 400px;
            margin: 0 auto;
            padding: 20px;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            backdrop-filter: blur(10px);
        `;

        // Assemble the game
        this.gameContainer.appendChild(this.scoreElement);
        this.gameContainer.appendChild(this.resetButton);
        this.gameContainer.appendChild(this.gameBoard);

        this.createCards();
    }

    private createCards(): void {
        this.cards = [];
        this.gameBoard.innerHTML = '';

        // Create pairs of cards
        const cardSymbols = [...this.symbols, ...this.symbols];
        
        // Shuffle the symbols
        for (let i = cardSymbols.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cardSymbols[i], cardSymbols[j]] = [cardSymbols[j], cardSymbols[i]];
        }

        // Create card elements
        cardSymbols.forEach((symbol, index) => {
            const cardElement = document.createElement('div');
            cardElement.style.cssText = `
                width: 80px;
                height: 80px;
                background: white;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 28px;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                user-select: none;
            `;

            const card: Card = {
                id: index,
                symbol: symbol,
                isFlipped: false,
                isMatched: false,
                element: cardElement
            };

            // Initially show card back
            this.showCardBack(card);

            cardElement.addEventListener('click', () => this.handleCardClick(card));
            cardElement.addEventListener('mouseenter', () => {
                if (!card.isFlipped && !card.isMatched) {
                    cardElement.style.transform = 'scale(1.05)';
                }
            });
            cardElement.addEventListener('mouseleave', () => {
                if (!card.isFlipped && !card.isMatched) {
                    cardElement.style.transform = 'scale(1)';
                }
            });

            this.cards.push(card);
            this.gameBoard.appendChild(cardElement);
        });
    }

    private showCardBack(card: Card): void {
        card.element.textContent = '?';
        card.element.style.background = 'linear-gradient(45deg, #4facfe 0%, #00f2fe 100%)';
        card.element.style.color = 'white';
        card.element.style.textShadow = '1px 1px 2px rgba(0,0,0,0.3)';
    }

    private showCardFront(card: Card): void {
        card.element.textContent = card.symbol;
        card.element.style.background = 'white';
        card.element.style.color = '#333';
        card.element.style.textShadow = 'none';
    }

    private handleCardClick(card: Card): void {
        if (this.isProcessing || card.isFlipped || card.isMatched || this.flippedCards.length >= 2) {
            return;
        }

        card.isFlipped = true;
        this.showCardFront(card);
        this.flippedCards.push(card);

        if (this.flippedCards.length === 2) {
            this.attempts++;
            this.isProcessing = true;

            setTimeout(() => {
                this.checkForMatch();
            }, 1000);
        }
    }

    private checkForMatch(): void {
        const [card1, card2] = this.flippedCards;

        if (card1.symbol === card2.symbol) {
            card1.isMatched = true;
            card2.isMatched = true;
            card1.element.style.background = 'linear-gradient(45deg, #56ab2f 0%, #a8e6cf 100%)';
            card2.element.style.background = 'linear-gradient(45deg, #56ab2f 0%, #a8e6cf 100%)';
            
            this.matches++;
            
            if (this.matches === this.symbols.length) {
                setTimeout(() => this.showWinMessage('Memory Match'), 500);
            }
        } else {
            card1.isFlipped = false;
            card2.isFlipped = false;
            this.showCardBack(card1);
            this.showCardBack(card2);
        }

        this.flippedCards = [];
        this.isProcessing = false;
        this.updateScore();
    }

    private updateScore(): void {
        if (this.scoreElement) {
            this.scoreElement.textContent = `Matches: ${this.matches}/${this.symbols.length} | Attempts: ${this.attempts}`;
        }
    }

    private resetMemoryGame(): void {
        this.matches = 0;
        this.attempts = 0;
        this.flippedCards = [];
        this.isProcessing = false;
        this.createCards();
        this.updateScore();
    }

    // =============== WHACK-A-MOLE GAME ===============

    private initializeWhackAMole(): void {
        // Create score and time display
        this.moleScoreElement = document.createElement('div');
        this.moleTimeElement = document.createElement('div');
        this.updateMoleDisplay();
        
        const displayContainer = document.createElement('div');
        displayContainer.style.cssText = `
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-bottom: 20px;
            color: white;
            font-size: 18px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        `;
        displayContainer.appendChild(this.moleScoreElement);
        displayContainer.appendChild(this.moleTimeElement);

        // Create start/reset button
        this.moleStartButton = document.createElement('button');
        this.moleStartButton.textContent = 'Start Game';
        this.moleStartButton.style.cssText = `
            background: #4CAF50;
            color: white;
            border: none;
            padding: 12px 24px;
            font-size: 16px;
            border-radius: 5px;
            cursor: pointer;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: background 0.3s ease;
        `;
        this.moleStartButton.addEventListener('click', () => this.toggleMoleGame());

        // Create game board
        this.moleBoard = document.createElement('div');
        this.moleBoard.style.cssText = `
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            max-width: 350px;
            margin: 0 auto;
            padding: 25px;
            background: rgba(139, 69, 19, 0.3);
            border-radius: 15px;
            backdrop-filter: blur(10px);
        `;

        // Assemble the game
        this.gameContainer.appendChild(displayContainer);
        this.gameContainer.appendChild(this.moleStartButton);
        this.gameContainer.appendChild(this.moleBoard);

        this.createMoles();
    }

    // =============== REACTION TIME GAME ===============

    private initializeReactionTime(): void {
        // Create score display
        this.reactionScoreElement = document.createElement('div');
        this.updateReactionDisplay();
        this.reactionScoreElement.style.cssText = `
            color: white;
            font-size: 18px;
            margin-bottom: 20px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        `;

        // Create instruction display
        this.reactionInstructionElement = document.createElement('div');
        this.reactionInstructionElement.textContent = 'Test your reaction time! Click the button when it appears.';
        this.reactionInstructionElement.style.cssText = `
            color: white;
            font-size: 16px;
            margin-bottom: 20px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            max-width: 400px;
            margin-left: auto;
            margin-right: auto;
        `;

        // Create start button
        this.reactionStartButton = document.createElement('button');
        this.reactionStartButton.textContent = 'Start Test';
        this.reactionStartButton.style.cssText = `
            background: #2196F3;
            color: white;
            border: none;
            padding: 12px 24px;
            font-size: 16px;
            border-radius: 5px;
            cursor: pointer;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: background 0.3s ease;
        `;
        this.reactionStartButton.addEventListener('click', () => this.startReactionTest());

        // Create game area
        this.reactionBoard = document.createElement('div');
        this.reactionBoard.style.cssText = `
            width: 400px;
            height: 300px;
            margin: 0 auto;
            background: rgba(255,255,255,0.1);
            border-radius: 15px;
            backdrop-filter: blur(10px);
            position: relative;
            border: 2px dashed rgba(255,255,255,0.3);
        `;

        // Assemble the game
        this.gameContainer.appendChild(this.reactionScoreElement);
        this.gameContainer.appendChild(this.reactionInstructionElement);
        this.gameContainer.appendChild(this.reactionStartButton);
        this.gameContainer.appendChild(this.reactionBoard);
    }

    // =============== TOWER DEFENSE GAME ===============

    private initializeTowerDefense(): void {
        // Reset game state
        this.towerWave = 1;
        this.towerMoney = 100;
        this.towerLives = 20;
        this.towerEnemies = [];
        this.towerTowers = [];
        this.towerProjectiles = [];
        this.enemiesSpawned = 0;
        this.waveInProgress = false;

        // Create info display
        this.towerInfoElement = document.createElement('div');
        this.updateTowerDisplay();
        this.towerInfoElement.style.cssText = `
            color: white;
            font-size: 16px;
            margin-bottom: 15px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            display: flex;
            justify-content: center;
            gap: 20px;
        `;

        // Create controls
        this.towerControlsElement = document.createElement('div');
        this.towerControlsElement.style.cssText = `
            margin-bottom: 15px;
            display: flex;
            justify-content: center;
            gap: 10px;
            flex-wrap: wrap;
        `;

        // Create tower type buttons
        const basicTowerBtn = this.createTowerButton('Basic Tower (💰 20)', 'basic', 20);
        const rapidTowerBtn = this.createTowerButton('Rapid Tower (💰 40)', 'rapid', 40);
        const heavyTowerBtn = this.createTowerButton('Heavy Tower (💰 60)', 'heavy', 60);
        const startWaveBtn = this.createActionButton('▶️ Start Wave', () => this.startTowerWave());

        this.towerControlsElement.appendChild(basicTowerBtn);
        this.towerControlsElement.appendChild(rapidTowerBtn);
        this.towerControlsElement.appendChild(heavyTowerBtn);
        this.towerControlsElement.appendChild(startWaveBtn);

        // Create game board
        this.towerBoard = document.createElement('div');
        this.towerBoard.style.cssText = `
            width: 500px;
            height: 400px;
            margin: 0 auto;
            background: rgba(34, 139, 34, 0.3);
            border-radius: 10px;
            position: relative;
            border: 2px solid rgba(255,255,255,0.3);
            cursor: crosshair;
        `;

        this.towerBoard.addEventListener('click', (e) => this.handleTowerBoardClick(e));

        // Create path
        this.createTowerPath();
        this.drawTowerPath();

        // Assemble the game
        this.gameContainer.appendChild(this.towerInfoElement);
        this.gameContainer.appendChild(this.towerControlsElement);
        this.gameContainer.appendChild(this.towerBoard);
    }

    private createTowerButton(text: string, type: string, cost: number): HTMLElement {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
            background: ${this.towerSelectedTowerType === type ? '#ff6b6b' : 'rgba(255,255,255,0.2)'};
            color: white;
            border: 2px solid ${this.towerSelectedTowerType === type ? '#ff6b6b' : 'rgba(255,255,255,0.3)'};
            padding: 8px 16px;
            font-size: 14px;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        button.addEventListener('click', () => {
            this.towerSelectedTowerType = type;
            this.updateTowerButtons();
        });
        return button;
    }

    private createActionButton(text: string, action: () => void): HTMLElement {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
            background: #4CAF50;
            color: white;
            border: none;
            padding: 8px 16px;
            font-size: 14px;
            border-radius: 5px;
            cursor: pointer;
            transition: background 0.3s ease;
        `;
        button.addEventListener('click', action);
        return button;
    }

    private updateTowerButtons(): void {
        const buttons = this.towerControlsElement.querySelectorAll('button');
        buttons[0].style.background = this.towerSelectedTowerType === 'basic' ? '#ff6b6b' : 'rgba(255,255,255,0.2)';
        buttons[1].style.background = this.towerSelectedTowerType === 'rapid' ? '#ff6b6b' : 'rgba(255,255,255,0.2)';
        buttons[2].style.background = this.towerSelectedTowerType === 'heavy' ? '#ff6b6b' : 'rgba(255,255,255,0.2)';
    }

    private createTowerPath(): void {
        this.towerPath = [
            {x: 0, y: 200}, {x: 100, y: 200}, {x: 100, y: 100}, 
            {x: 200, y: 100}, {x: 200, y: 300}, {x: 350, y: 300},
            {x: 350, y: 150}, {x: 450, y: 150}, {x: 500, y: 150}
        ];
    }

    private drawTowerPath(): void {
        // Create path visual
        for (let i = 0; i < this.towerPath.length - 1; i++) {
            const pathSegment = document.createElement('div');
            const start = this.towerPath[i];
            const end = this.towerPath[i + 1];
            
            if (start.x === end.x) { // Vertical line
                pathSegment.style.cssText = `
                    position: absolute;
                    left: ${start.x - 15}px;
                    top: ${Math.min(start.y, end.y)}px;
                    width: 30px;
                    height: ${Math.abs(end.y - start.y)}px;
                    background: rgba(139, 69, 19, 0.7);
                    border-radius: 15px;
                `;
            } else { // Horizontal line
                pathSegment.style.cssText = `
                    position: absolute;
                    left: ${Math.min(start.x, end.x)}px;
                    top: ${start.y - 15}px;
                    width: ${Math.abs(end.x - start.x)}px;
                    height: 30px;
                    background: rgba(139, 69, 19, 0.7);
                    border-radius: 15px;
                `;
            }
            this.towerBoard.appendChild(pathSegment);
        }
    }

    private handleTowerBoardClick(e: MouseEvent): void {
        if (this.waveInProgress) return;

        const rect = this.towerBoard.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if clicking on path (don't allow towers on path)
        if (this.isOnPath(x, y)) return;

        // Check if there's already a tower here
        if (this.towerTowers.some(tower => 
            Math.abs(tower.x - x) < 30 && Math.abs(tower.y - y) < 30)) return;

        // Place tower if player has enough money
        const cost = this.getTowerCost(this.towerSelectedTowerType);
        if (this.towerMoney >= cost) {
            this.placeTower(x, y, this.towerSelectedTowerType);
        }
    }

    private isOnPath(x: number, y: number): boolean {
        for (let i = 0; i < this.towerPath.length - 1; i++) {
            const start = this.towerPath[i];
            const end = this.towerPath[i + 1];
            
            if (start.x === end.x) { // Vertical path
                if (Math.abs(x - start.x) < 30 && 
                    y >= Math.min(start.y, end.y) - 15 && 
                    y <= Math.max(start.y, end.y) + 15) {
                    return true;
                }
            } else { // Horizontal path
                if (Math.abs(y - start.y) < 30 && 
                    x >= Math.min(start.x, end.x) - 15 && 
                    x <= Math.max(start.x, end.x) + 15) {
                    return true;
                }
            }
        }
        return false;
    }

    private getTowerCost(type: string): number {
        switch (type) {
            case 'basic': return 20;
            case 'rapid': return 40;
            case 'heavy': return 60;
            default: return 20;
        }
    }

    private placeTower(x: number, y: number, type: string): void {
        const cost = this.getTowerCost(type);
        this.towerMoney -= cost;

        const tower: Tower = {
            id: this.nextTowerId++,
            x: x,
            y: y,
            type: type,
            damage: type === 'basic' ? 10 : type === 'rapid' ? 5 : 25,
            range: type === 'basic' ? 80 : type === 'rapid' ? 60 : 100,
            fireRate: type === 'basic' ? 1000 : type === 'rapid' ? 300 : 2000,
            lastFire: 0,
            element: document.createElement('div'),
            cost: cost
        };

        // Create tower visual
        tower.element.style.cssText = `
            position: absolute;
            left: ${x - 15}px;
            top: ${y - 15}px;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            cursor: pointer;
            z-index: 10;
        `;

        // Set tower appearance based on type
        if (type === 'basic') {
            tower.element.textContent = '🏰';
            tower.element.style.background = '#4CAF50';
        } else if (type === 'rapid') {
            tower.element.textContent = '🔫';
            tower.element.style.background = '#FF9800';
        } else {
            tower.element.textContent = '💣';
            tower.element.style.background = '#F44336';
        }

        this.towerTowers.push(tower);
        this.towerBoard.appendChild(tower.element);
        this.updateTowerDisplay();
    }

    private startTowerWave(): void {
        if (this.waveInProgress) return;

        this.waveInProgress = true;
        this.enemiesSpawned = 0;
        this.enemiesInWave = 3 + this.towerWave * 2;
        
        this.spawnEnemies();
        this.startTowerGameLoop();
    }

    private spawnEnemies(): void {
        if (this.enemiesSpawned >= this.enemiesInWave) return;

        const enemy: Enemy = {
            id: this.nextEnemyId++,
            x: this.towerPath[0].x,
            y: this.towerPath[0].y,
            health: 15 + this.towerWave * 5,
            maxHealth: 15 + this.towerWave * 5,
            speed: 1,
            pathIndex: 0,
            element: document.createElement('div'),
            value: 5 + this.towerWave
        };

        // Create enemy visual
        enemy.element.style.cssText = `
            position: absolute;
            left: ${enemy.x - 10}px;
            top: ${enemy.y - 10}px;
            width: 20px;
            height: 20px;
            background: #e74c3c;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            z-index: 5;
        `;
        enemy.element.textContent = '👾';

        this.towerEnemies.push(enemy);
        this.towerBoard.appendChild(enemy.element);
        this.enemiesSpawned++;

        // Schedule next enemy spawn
        if (this.enemiesSpawned < this.enemiesInWave) {
            setTimeout(() => this.spawnEnemies(), 1000);
        }
    }

    private startTowerGameLoop(): void {
        if (!this.towerGameActive) {
            this.towerGameActive = true;
        }

        this.updateEnemies();
        this.updateTowers();
        this.updateProjectiles();
        this.checkWaveComplete();

        if (this.towerGameActive) {
            this.towerGameLoop = requestAnimationFrame(() => this.startTowerGameLoop());
        }
    }

    private updateEnemies(): void {
        this.towerEnemies.forEach((enemy, index) => {
            if (enemy.pathIndex >= this.towerPath.length - 1) {
                // Enemy reached the end
                this.towerLives--;
                this.removeEnemy(index);
                return;
            }

            // Move enemy along path
            const target = this.towerPath[enemy.pathIndex + 1];
            const dx = target.x - enemy.x;
            const dy = target.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < enemy.speed) {
                enemy.pathIndex++;
                enemy.x = target.x;
                enemy.y = target.y;
            } else {
                enemy.x += (dx / distance) * enemy.speed;
                enemy.y += (dy / distance) * enemy.speed;
            }

            // Update visual position
            enemy.element.style.left = (enemy.x - 10) + 'px';
            enemy.element.style.top = (enemy.y - 10) + 'px';

            // Update health bar
            const healthPercent = enemy.health / enemy.maxHealth;
            enemy.element.style.background = `linear-gradient(to right, 
                #e74c3c ${healthPercent * 100}%, 
                #999 ${healthPercent * 100}%)`;
        });
    }

    private updateTowers(): void {
        const now = Date.now();
        this.towerTowers.forEach(tower => {
            if (now - tower.lastFire < tower.fireRate) return;

            // Find nearest enemy in range
            let nearestEnemy: Enemy | null = null;
            let nearestDistance = tower.range;

            this.towerEnemies.forEach(enemy => {
                const distance = Math.sqrt(
                    Math.pow(enemy.x - tower.x, 2) + 
                    Math.pow(enemy.y - tower.y, 2)
                );
                if (distance < nearestDistance) {
                    nearestEnemy = enemy;
                    nearestDistance = distance;
                }
            });

            if (nearestEnemy) {
                this.fireProjectile(tower, nearestEnemy);
                tower.lastFire = now;
            }
        });
    }

    private fireProjectile(tower: Tower, target: Enemy): void {
        const projectile: Projectile = {
            id: this.nextProjectileId++,
            x: tower.x,
            y: tower.y,
            targetX: target.x,
            targetY: target.y,
            damage: tower.damage,
            speed: 5,
            element: document.createElement('div')
        };

        projectile.element.style.cssText = `
            position: absolute;
            left: ${projectile.x - 3}px;
            top: ${projectile.y - 3}px;
            width: 6px;
            height: 6px;
            background: #ffeb3b;
            border-radius: 50%;
            z-index: 8;
        `;

        this.towerProjectiles.push(projectile);
        this.towerBoard.appendChild(projectile.element);
    }

    private updateProjectiles(): void {
        this.towerProjectiles.forEach((projectile, pIndex) => {
            // Move projectile toward target
            const dx = projectile.targetX - projectile.x;
            const dy = projectile.targetY - projectile.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < projectile.speed) {
                // Hit target
                this.handleProjectileHit(projectile);
                this.removeProjectile(pIndex);
            } else {
                projectile.x += (dx / distance) * projectile.speed;
                projectile.y += (dy / distance) * projectile.speed;
                projectile.element.style.left = (projectile.x - 3) + 'px';
                projectile.element.style.top = (projectile.y - 3) + 'px';
            }
        });
    }

    private handleProjectileHit(projectile: Projectile): void {
        // Find enemy near the projectile target
        this.towerEnemies.forEach((enemy, eIndex) => {
            const distance = Math.sqrt(
                Math.pow(enemy.x - projectile.targetX, 2) + 
                Math.pow(enemy.y - projectile.targetY, 2)
            );
            if (distance < 15) {
                enemy.health -= projectile.damage;
                if (enemy.health <= 0) {
                    this.towerMoney += enemy.value;
                    this.removeEnemy(eIndex);
                }
            }
        });
    }

    private removeEnemy(index: number): void {
        if (this.towerEnemies[index]) {
            this.towerBoard.removeChild(this.towerEnemies[index].element);
            this.towerEnemies.splice(index, 1);
        }
    }

    private removeProjectile(index: number): void {
        if (this.towerProjectiles[index]) {
            this.towerBoard.removeChild(this.towerProjectiles[index].element);
            this.towerProjectiles.splice(index, 1);
        }
    }

    private checkWaveComplete(): void {
        if (this.waveInProgress && 
            this.enemiesSpawned >= this.enemiesInWave && 
            this.towerEnemies.length === 0) {
            this.waveInProgress = false;
            this.towerWave++;
            this.towerMoney += 20; // Wave completion bonus
            this.updateTowerDisplay();
            
            if (this.towerLives <= 0) {
                this.endTowerGame();
            }
        }
    }

    private endTowerGame(): void {
        this.towerGameActive = false;
        cancelAnimationFrame(this.towerGameLoop);
        setTimeout(() => this.showWinMessage('Tower Defense'), 500);
    }

    private updateTowerDisplay(): void {
        if (this.towerInfoElement) {
            this.towerInfoElement.innerHTML = `
                <span>💰 Money: ${this.towerMoney}</span>
                <span>❤️ Lives: ${this.towerLives}</span>
                <span>🌊 Wave: ${this.towerWave}</span>
            `;
        }
    }

    private startReactionTest(): void {
        if (this.reactionGameActive) return;
        
        this.reactionGameActive = true;
        this.reactionTimes = [];
        this.reactionRound = 0;
        this.reactionStartButton.textContent = 'Testing...';
        (this.reactionStartButton as HTMLButtonElement).disabled = true;
        this.reactionStartButton.style.background = '#999';
        this.reactionInstructionElement.textContent = 'Get ready... The button will appear soon!';
        
        this.scheduleNextReactionRound();
    }

    private scheduleNextReactionRound(): void {
        if (this.reactionRound >= this.maxReactionRounds) {
            this.finishReactionTest();
            return;
        }

        // Clear the board
        this.reactionBoard.innerHTML = '';
        this.reactionInstructionElement.textContent = 'Wait for it...';

        // Random delay between 1-4 seconds
        const delay = Math.random() * 3000 + 1000;
        
        this.reactionTimer = setTimeout(() => {
            this.showReactionButton();
        }, delay);
    }

    private showReactionButton(): void {
        this.reactionStartTime = Date.now();
        this.reactionRound++;
        
        // Create the reaction button
        this.reactionButton = document.createElement('button');
        this.reactionButton.textContent = 'CLICK!';
        this.reactionButton.style.cssText = `
            background: #ff6b6b;
            color: white;
            border: none;
            padding: 20px 40px;
            font-size: 24px;
            font-weight: bold;
            border-radius: 10px;
            cursor: pointer;
            position: absolute;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            transition: transform 0.1s ease;
        `;

        // Random position within the board
        const maxX = this.reactionBoard.offsetWidth - 140; // button width
        const maxY = this.reactionBoard.offsetHeight - 80; // button height
        const randomX = Math.random() * maxX;
        const randomY = Math.random() * maxY;
        
        this.reactionButton.style.left = randomX + 'px';
        this.reactionButton.style.top = randomY + 'px';

        this.reactionButton.addEventListener('click', () => this.handleReactionClick());
        this.reactionButton.addEventListener('mouseenter', () => {
            this.reactionButton.style.transform = 'scale(1.05)';
        });
        this.reactionButton.addEventListener('mouseleave', () => {
            this.reactionButton.style.transform = 'scale(1)';
        });

        this.reactionBoard.appendChild(this.reactionButton);
        this.reactionInstructionElement.textContent = `Round ${this.reactionRound}/${this.maxReactionRounds} - Click the button!`;
    }

    private handleReactionClick(): void {
        const reactionTime = Date.now() - this.reactionStartTime;
        this.reactionTimes.push(reactionTime);
        
        // Show feedback
        this.reactionButton.textContent = `${reactionTime}ms`;
        this.reactionButton.style.background = '#4CAF50';
        this.reactionInstructionElement.textContent = `Great! ${reactionTime}ms reaction time`;
        
        this.updateReactionDisplay();

        // Continue to next round after a brief pause
        setTimeout(() => {
            this.scheduleNextReactionRound();
        }, 1500);
    }

    private finishReactionTest(): void {
        this.reactionGameActive = false;
        this.reactionBoard.innerHTML = '';
        
        const averageTime = Math.round(this.reactionTimes.reduce((a, b) => a + b, 0) / this.reactionTimes.length);
        const bestTime = Math.min(...this.reactionTimes);
        
        this.reactionInstructionElement.textContent = `Test Complete! Average: ${averageTime}ms | Best: ${bestTime}ms`;
        
        this.reactionStartButton.textContent = 'Start Test';
        (this.reactionStartButton as HTMLButtonElement).disabled = false;
        this.reactionStartButton.style.background = '#2196F3';
        
        setTimeout(() => this.showWinMessage('Reaction Time'), 500);
    }

    private updateReactionDisplay(): void {
        if (this.reactionScoreElement) {
            if (this.reactionTimes.length === 0) {
                this.reactionScoreElement.textContent = 'Round: 0/5 | Average: --ms';
            } else {
                const averageTime = Math.round(this.reactionTimes.reduce((a, b) => a + b, 0) / this.reactionTimes.length);
                this.reactionScoreElement.textContent = `Round: ${this.reactionTimes.length}/${this.maxReactionRounds} | Average: ${averageTime}ms`;
            }
        }
    }

    // =============== CITY BUILDER GAME ===============

    private initializeCityBuilder(): void {
        // Reset game state
        this.cityMoney = 1000;
        this.cityPopulation = 0;
        this.cityHappiness = 50;
        this.cityPower = 0;
        this.cityBuildings = [];
        this.cityCitizens = [];
        this.cityLastUpdate = Date.now();
        this.cityGrid = Array(20).fill(null).map(() => Array(25).fill(0));

        // Create info display
        this.cityInfoElement = document.createElement('div');
        this.updateCityDisplay();
        this.cityInfoElement.style.cssText = `
            color: white;
            font-size: 14px;
            margin-bottom: 15px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            display: flex;
            justify-content: center;
            gap: 15px;
            flex-wrap: wrap;
        `;

        // Create controls
        this.cityControlsElement = document.createElement('div');
        this.cityControlsElement.style.cssText = `
            margin-bottom: 15px;
            display: flex;
            justify-content: center;
            gap: 8px;
            flex-wrap: wrap;
        `;

        // Create building type buttons
        const houseBtn = this.createCityButton('🏠 House (💰50)', 'house', 50);
        const shopBtn = this.createCityButton('🏪 Shop (💰150)', 'shop', 150);
        const factoryBtn = this.createCityButton('🏭 Factory (💰300)', 'factory', 300);
        const parkBtn = this.createCityButton('🌳 Park (💰100)', 'park', 100);
        const powerBtn = this.createCityButton('⚡ Power (💰200)', 'power', 200);
        const roadBtn = this.createCityButton('🛤️ Road (💰20)', 'road', 20);
        const startBtn = this.createCityActionButton('▶️ Start City', () => this.startCitySimulation());

        this.cityControlsElement.appendChild(houseBtn);
        this.cityControlsElement.appendChild(shopBtn);
        this.cityControlsElement.appendChild(factoryBtn);
        this.cityControlsElement.appendChild(parkBtn);
        this.cityControlsElement.appendChild(powerBtn);
        this.cityControlsElement.appendChild(roadBtn);
        this.cityControlsElement.appendChild(startBtn);

        // Create game board
        this.cityBoard = document.createElement('div');
        this.cityBoard.style.cssText = `
            width: 500px;
            height: 400px;
            margin: 0 auto;
            background: rgba(76, 175, 80, 0.3);
            border-radius: 10px;
            position: relative;
            border: 2px solid rgba(255,255,255,0.3);
            cursor: crosshair;
            display: grid;
            grid-template-columns: repeat(25, 20px);
            grid-template-rows: repeat(20, 20px);
        `;

        this.cityBoard.addEventListener('click', (e) => this.handleCityBoardClick(e));

        // Create grid cells
        this.createCityGrid();

        // Assemble the game
        this.gameContainer.appendChild(this.cityInfoElement);
        this.gameContainer.appendChild(this.cityControlsElement);
        this.gameContainer.appendChild(this.cityBoard);
    }

    private createCityButton(text: string, type: string, cost: number): HTMLElement {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
            background: ${this.citySelectedBuildingType === type ? '#ff6b6b' : 'rgba(255,255,255,0.2)'};
            color: white;
            border: 2px solid ${this.citySelectedBuildingType === type ? '#ff6b6b' : 'rgba(255,255,255,0.3)'};
            padding: 6px 12px;
            font-size: 12px;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        button.addEventListener('click', () => {
            this.citySelectedBuildingType = type;
            this.updateCityButtons();
        });
        return button;
    }

    private createCityActionButton(text: string, action: () => void): HTMLElement {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
            background: #4CAF50;
            color: white;
            border: none;
            padding: 6px 12px;
            font-size: 12px;
            border-radius: 5px;
            cursor: pointer;
            transition: background 0.3s ease;
        `;
        button.addEventListener('click', action);
        return button;
    }

    private updateCityButtons(): void {
        const buttons = this.cityControlsElement.querySelectorAll('button');
        const types = ['house', 'shop', 'factory', 'park', 'power', 'road'];
        types.forEach((type, index) => {
            if (buttons[index]) {
                buttons[index].style.background = this.citySelectedBuildingType === type ? '#ff6b6b' : 'rgba(255,255,255,0.2)';
                buttons[index].style.borderColor = this.citySelectedBuildingType === type ? '#ff6b6b' : 'rgba(255,255,255,0.3)';
            }
        });
    }

    private createCityGrid(): void {
        for (let y = 0; y < 20; y++) {
            for (let x = 0; x < 25; x++) {
                const cell = document.createElement('div');
                cell.style.cssText = `
                    width: 20px;
                    height: 20px;
                    border: 1px solid rgba(255,255,255,0.1);
                    box-sizing: border-box;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                `;
                cell.dataset.x = x.toString();
                cell.dataset.y = y.toString();
                this.cityBoard.appendChild(cell);
            }
        }
    }

    private handleCityBoardClick(e: MouseEvent): void {
        const target = e.target as HTMLElement;
        if (!target.dataset.x || !target.dataset.y) return;

        const x = parseInt(target.dataset.x);
        const y = parseInt(target.dataset.y);

        // Check if cell is already occupied
        if (this.cityGrid[y][x] !== 0) return;

        // Check if player has enough money
        const cost = this.getBuildingCost(this.citySelectedBuildingType);
        if (this.cityMoney < cost) return;

        this.placeBuilding(x, y, this.citySelectedBuildingType);
    }

    private getBuildingCost(type: string): number {
        switch (type) {
            case 'house': return 50;
            case 'shop': return 150;
            case 'factory': return 300;
            case 'park': return 100;
            case 'power': return 200;
            case 'road': return 20;
            default: return 50;
        }
    }

    private placeBuilding(x: number, y: number, type: string): void {
        const cost = this.getBuildingCost(type);
        this.cityMoney -= cost;

        const building: Building = {
            id: this.nextBuildingId++,
            x: x,
            y: y,
            type: type,
            level: 1,
            element: this.getCityCell(x, y),
            cost: cost,
            income: this.getBuildingIncome(type),
            happiness: this.getBuildingHappiness(type),
            power: this.getBuildingPower(type),
            population: this.getBuildingPopulation(type)
        };

        // Set building appearance
        building.element.textContent = this.getBuildingEmoji(type);
        building.element.style.background = this.getBuildingColor(type);
        building.element.style.borderColor = 'rgba(255,255,255,0.5)';

        this.cityBuildings.push(building);
        this.cityGrid[y][x] = building.id;

        // Update city stats
        this.cityPopulation += building.population;
        this.cityHappiness += building.happiness;
        this.cityPower += building.power;

        // Spawn citizens for residential buildings
        if (type === 'house' && building.population > 0) {
            this.spawnCitizens(building.population, x, y);
        }

        this.updateCityDisplay();
    }

    private getCityCell(x: number, y: number): HTMLElement {
        const index = y * 25 + x;
        return this.cityBoard.children[index] as HTMLElement;
    }

    private getBuildingEmoji(type: string): string {
        switch (type) {
            case 'house': return '🏠';
            case 'shop': return '🏪';
            case 'factory': return '🏭';
            case 'park': return '🌳';
            case 'power': return '⚡';
            case 'road': return '🛤️';
            default: return '🏠';
        }
    }

    private getBuildingColor(type: string): string {
        switch (type) {
            case 'house': return 'rgba(255, 193, 7, 0.8)';
            case 'shop': return 'rgba(33, 150, 243, 0.8)';
            case 'factory': return 'rgba(96, 125, 139, 0.8)';
            case 'park': return 'rgba(76, 175, 80, 0.8)';
            case 'power': return 'rgba(255, 235, 59, 0.8)';
            case 'road': return 'rgba(121, 85, 72, 0.8)';
            default: return 'rgba(255, 193, 7, 0.8)';
        }
    }

    private getBuildingIncome(type: string): number {
        switch (type) {
            case 'house': return 10;
            case 'shop': return 25;
            case 'factory': return 50;
            case 'park': return 0;
            case 'power': return 0;
            case 'road': return 0;
            default: return 0;
        }
    }

    private getBuildingHappiness(type: string): number {
        switch (type) {
            case 'house': return 0;
            case 'shop': return 5;
            case 'factory': return -10;
            case 'park': return 15;
            case 'power': return -5;
            case 'road': return 2;
            default: return 0;
        }
    }

    private getBuildingPower(type: string): number {
        switch (type) {
            case 'power': return 100;
            case 'factory': return -30;
            case 'house': return -5;
            case 'shop': return -10;
            default: return 0;
        }
    }

    private getBuildingPopulation(type: string): number {
        switch (type) {
            case 'house': return 4;
            case 'shop': return 1;
            case 'factory': return 2;
            default: return 0;
        }
    }

    private spawnCitizens(count: number, buildingX: number, buildingY: number): void {
        for (let i = 0; i < count; i++) {
            const citizen: Citizen = {
                id: this.nextCitizenId++,
                x: buildingX,
                y: buildingY,
                targetX: buildingX,
                targetY: buildingY,
                element: document.createElement('div'),
                happiness: 50,
                moving: false
            };

            citizen.element.style.cssText = `
                position: absolute;
                left: ${buildingX * 20 + Math.random() * 10}px;
                top: ${buildingY * 20 + Math.random() * 10}px;
                width: 6px;
                height: 6px;
                background: #ff9800;
                border-radius: 50%;
                z-index: 10;
                transition: all 0.5s ease;
            `;

            this.cityCitizens.push(citizen);
            this.cityBoard.appendChild(citizen.element);
        }
    }

    private startCitySimulation(): void {
        if (this.cityGameActive) return;

        this.cityGameActive = true;
        this.cityLastUpdate = Date.now();
        this.startCityGameLoop();
    }

    private startCityGameLoop(): void {
        if (!this.cityGameActive) return;

        const now = Date.now();
        const deltaTime = now - this.cityLastUpdate;

        // Update every second
        if (deltaTime >= 1000) {
            this.updateCityEconomy();
            this.updateCitizens();
            this.updateCityDisplay();
            this.cityLastUpdate = now;

            // Check game over conditions
            if (this.cityHappiness <= 0 || this.cityMoney < 0) {
                this.endCityGame();
                return;
            }
        }

        this.cityGameLoop = requestAnimationFrame(() => this.startCityGameLoop());
    }

    private updateCityEconomy(): void {
        let totalIncome = 0;
        let powerConsumption = 0;
        let happinessChange = 0;

        this.cityBuildings.forEach(building => {
            totalIncome += building.income;
            powerConsumption += Math.abs(building.power < 0 ? building.power : 0);
            happinessChange += building.happiness;
        });

        // Apply tax income
        const taxIncome = this.cityPopulation * this.cityTaxRate;
        totalIncome += taxIncome;

        // Power shortage penalty
        if (powerConsumption > this.cityPower) {
            happinessChange -= 20;
            totalIncome *= 0.5; // Reduced productivity
        }

        // Apply changes
        this.cityMoney += totalIncome;
        this.cityHappiness = Math.max(0, Math.min(100, this.cityHappiness + happinessChange * 0.1));

        // Population growth/decline based on happiness
        if (this.cityHappiness > 70 && this.cityBuildings.some(b => b.type === 'house')) {
            if (Math.random() < 0.1) {
                const house = this.cityBuildings.find(b => b.type === 'house');
                if (house) {
                    this.spawnCitizens(1, house.x, house.y);
                    this.cityPopulation++;
                }
            }
        }
    }

    private updateCitizens(): void {
        this.cityCitizens.forEach(citizen => {
            if (!citizen.moving && Math.random() < 0.3) {
                // Find a destination (shop, park, or another building)
                const destinations = this.cityBuildings.filter(b => 
                    b.type === 'shop' || b.type === 'park' || b.type === 'factory'
                );
                
                if (destinations.length > 0) {
                    const destination = destinations[Math.floor(Math.random() * destinations.length)];
                    citizen.targetX = destination.x;
                    citizen.targetY = destination.y;
                    citizen.moving = true;
                }
            }

            if (citizen.moving) {
                const dx = citizen.targetX - citizen.x;
                const dy = citizen.targetY - citizen.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 0.5) {
                    citizen.moving = false;
                    // Stay at destination briefly, then find new target
                    setTimeout(() => {
                        const houses = this.cityBuildings.filter(b => b.type === 'house');
                        if (houses.length > 0) {
                            const home = houses[Math.floor(Math.random() * houses.length)];
                            citizen.targetX = home.x;
                            citizen.targetY = home.y;
                            citizen.moving = true;
                        }
                    }, 2000);
                } else {
                    citizen.x += (dx / distance) * 0.02;
                    citizen.y += (dy / distance) * 0.02;
                    
                    citizen.element.style.left = (citizen.x * 20) + 'px';
                    citizen.element.style.top = (citizen.y * 20) + 'px';
                }
            }
        });
    }

    private endCityGame(): void {
        this.cityGameActive = false;
        cancelAnimationFrame(this.cityGameLoop);
        setTimeout(() => this.showWinMessage('City Builder'), 500);
    }

    private updateCityDisplay(): void {
        if (this.cityInfoElement) {
            this.cityInfoElement.innerHTML = `
                <span>💰 Money: ${Math.round(this.cityMoney)}</span>
                <span>👥 Population: ${this.cityPopulation}</span>
                <span>😊 Happiness: ${Math.round(this.cityHappiness)}%</span>
                <span>⚡ Power: ${this.cityPower}</span>
                <span>🏠 Buildings: ${this.cityBuildings.length}</span>
            `;
        }
    }

    // =============== MINESWEEPER GAME ===============

    private initializeMinesweeper(): void {
        // Reset game state
        this.mineGameActive = false;
        this.mineGameWon = false;
        this.mineGameLost = false;
        this.mineCells = [];
        this.flagCount = 0;
        this.revealedCount = 0;

        // Create info display
        this.mineInfoElement = document.createElement('div');
        this.updateMineDisplay();
        this.mineInfoElement.style.cssText = `
            color: white;
            font-size: 16px;
            margin-bottom: 15px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
        `;

        // Create controls
        this.mineControlsElement = document.createElement('div');
        this.mineControlsElement.style.cssText = `
            margin-bottom: 15px;
            display: flex;
            justify-content: center;
            gap: 10px;
            flex-wrap: wrap;
        `;

        const newGameBtn = document.createElement('button');
        newGameBtn.textContent = '🎮 New Game';
        newGameBtn.style.cssText = `
            background: #4CAF50;
            color: white;
            border: none;
            padding: 8px 16px;
            font-size: 14px;
            border-radius: 5px;
            cursor: pointer;
            transition: background 0.3s ease;
        `;
        newGameBtn.addEventListener('click', () => this.startNewMineGame());

        const difficultyBtn = document.createElement('button');
        difficultyBtn.textContent = '⚙️ Easy (16x16, 40 mines)';
        difficultyBtn.style.cssText = `
            background: rgba(255,255,255,0.2);
            color: white;
            border: 2px solid rgba(255,255,255,0.3);
            padding: 8px 16px;
            font-size: 14px;
            border-radius: 5px;
            cursor: pointer;
        `;

        this.mineControlsElement.appendChild(newGameBtn);
        this.mineControlsElement.appendChild(difficultyBtn);

        // Create game board
        this.mineBoard = document.createElement('div');
        this.mineBoard.style.cssText = `
            display: grid;
            grid-template-columns: repeat(${this.mineGridWidth}, 20px);
            grid-template-rows: repeat(${this.mineGridHeight}, 20px);
            gap: 1px;
            background: #333;
            padding: 10px;
            border-radius: 8px;
            margin: 0 auto;
            width: fit-content;
            border: 2px solid rgba(255,255,255,0.3);
        `;

        // Initialize grid
        this.createMineGrid();

        // Assemble the game
        this.gameContainer.appendChild(this.mineInfoElement);
        this.gameContainer.appendChild(this.mineControlsElement);
        this.gameContainer.appendChild(this.mineBoard);

        // Start new game
        this.startNewMineGame();
    }

    private createMineGrid(): void {
        this.mineBoard.innerHTML = '';
        this.mineCells = [];
        this.mineGrid = [];

        for (let y = 0; y < this.mineGridHeight; y++) {
            this.mineGrid[y] = [];
            for (let x = 0; x < this.mineGridWidth; x++) {
                const cell = document.createElement('div');
                cell.style.cssText = `
                    width: 20px;
                    height: 20px;
                    background: #888;
                    border: 2px outset #999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: bold;
                    cursor: pointer;
                    user-select: none;
                `;

                const mineCell: MineCell = {
                    id: y * this.mineGridWidth + x,
                    x: x,
                    y: y,
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    neighborMines: 0,
                    element: cell
                };

                cell.addEventListener('click', (e) => this.handleCellClick(e, mineCell));
                cell.addEventListener('contextmenu', (e) => this.handleCellRightClick(e, mineCell));

                this.mineCells.push(mineCell);
                this.mineGrid[y][x] = mineCell;
                this.mineBoard.appendChild(cell);
            }
        }
    }

    private startNewMineGame(): void {
        this.mineGameActive = true;
        this.mineGameWon = false;
        this.mineGameLost = false;
        this.flagCount = 0;
        this.revealedCount = 0;

        // Reset all cells
        this.mineCells.forEach(cell => {
            cell.isMine = false;
            cell.isRevealed = false;
            cell.isFlagged = false;
            cell.neighborMines = 0;
            cell.element.textContent = '';
            cell.element.style.background = '#888';
            cell.element.style.border = '2px outset #999';
            cell.element.style.color = 'black';
        });

        // Place mines randomly
        this.placeMines();
        this.calculateNeighborMines();
        this.updateMineDisplay();
    }

    private placeMines(): void {
        const totalCells = this.mineGridWidth * this.mineGridHeight;
        const minePositions = new Set<number>();

        while (minePositions.size < this.mineCount) {
            const randomPos = Math.floor(Math.random() * totalCells);
            minePositions.add(randomPos);
        }

        minePositions.forEach(pos => {
            this.mineCells[pos].isMine = true;
        });
    }

    private calculateNeighborMines(): void {
        for (let y = 0; y < this.mineGridHeight; y++) {
            for (let x = 0; x < this.mineGridWidth; x++) {
                const cell = this.mineGrid[y][x];
                if (!cell.isMine) {
                    cell.neighborMines = this.countNeighborMines(x, y);
                }
            }
        }
    }

    private countNeighborMines(x: number, y: number): number {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.mineGridWidth && ny >= 0 && ny < this.mineGridHeight) {
                    if (this.mineGrid[ny][nx].isMine) {
                        count++;
                    }
                }
            }
        }
        return count;
    }

    private handleCellClick(e: MouseEvent, cell: MineCell): void {
        e.preventDefault();
        if (!this.mineGameActive || cell.isRevealed || cell.isFlagged) return;

        this.revealCell(cell);
    }

    private handleCellRightClick(e: MouseEvent, cell: MineCell): void {
        e.preventDefault();
        if (!this.mineGameActive || cell.isRevealed) return;

        this.toggleFlag(cell);
    }

    private revealCell(cell: MineCell): void {
        if (cell.isRevealed || cell.isFlagged) return;

        cell.isRevealed = true;
        cell.element.style.border = '1px inset #666';
        cell.element.style.background = '#ddd';

        if (cell.isMine) {
            cell.element.textContent = '💣';
            cell.element.style.background = '#ff4444';
            this.gameOver(false);
            return;
        }

        this.revealedCount++;

        if (cell.neighborMines > 0) {
            cell.element.textContent = cell.neighborMines.toString();
            cell.element.style.color = this.getMineCountColor(cell.neighborMines);
        } else {
            // Auto-reveal neighbors for empty cells
            this.revealNeighbors(cell.x, cell.y);
        }

        // Check for win condition
        const totalNonMineCells = (this.mineGridWidth * this.mineGridHeight) - this.mineCount;
        if (this.revealedCount >= totalNonMineCells) {
            this.gameOver(true);
        }

        this.updateMineDisplay();
    }

    private revealNeighbors(x: number, y: number): void {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.mineGridWidth && ny >= 0 && ny < this.mineGridHeight) {
                    const neighbor = this.mineGrid[ny][nx];
                    if (!neighbor.isRevealed && !neighbor.isFlagged) {
                        this.revealCell(neighbor);
                    }
                }
            }
        }
    }

    private toggleFlag(cell: MineCell): void {
        if (cell.isFlagged) {
            cell.isFlagged = false;
            cell.element.textContent = '';
            cell.element.style.background = '#888';
            this.flagCount--;
        } else {
            cell.isFlagged = true;
            cell.element.textContent = '🚩';
            cell.element.style.background = '#ffaa00';
            this.flagCount++;
        }
        this.updateMineDisplay();
    }

    private getMineCountColor(count: number): string {
        const colors = ['', '#0000ff', '#008000', '#ff0000', '#800080', '#800000', '#008080', '#000000', '#808080'];
        return colors[count] || '#000000';
    }

    private gameOver(won: boolean): void {
        this.mineGameActive = false;
        this.mineGameWon = won;
        this.mineGameLost = !won;

        if (won) {
            // Flag all remaining mines
            this.mineCells.forEach(cell => {
                if (cell.isMine && !cell.isFlagged) {
                    cell.element.textContent = '🚩';
                    cell.element.style.background = '#00ff00';
                }
            });
            setTimeout(() => this.showWinMessage('Minesweeper'), 500);
        } else {
            // Reveal all mines
            this.mineCells.forEach(cell => {
                if (cell.isMine) {
                    cell.element.textContent = '💣';
                    cell.element.style.background = '#ff4444';
                }
            });
        }

        this.updateMineDisplay();
    }

    private updateMineDisplay(): void {
        if (this.mineInfoElement) {
            const minesLeft = this.mineCount - this.flagCount;
            const status = this.mineGameWon ? '🎉 You Won!' : this.mineGameLost ? '💥 Game Over!' : '🎮 Playing...';
            
            this.mineInfoElement.innerHTML = `
                <span>💣 Mines: ${minesLeft}</span>
                <span>🚩 Flags: ${this.flagCount}</span>
                <span>📦 Revealed: ${this.revealedCount}</span>
                <span>${status}</span>
            `;
        }
    }

    // =============== WHACK-A-MOLE GAME (continued) ===============

    private createMoles(): void {
        this.moles = [];
        this.moleBoard.innerHTML = '';

        for (let i = 0; i < 9; i++) {
            const moleHole = document.createElement('div');
            moleHole.style.cssText = `
                width: 80px;
                height: 80px;
                background: #654321;
                border-radius: 50%;
                border: 4px solid #8B4513;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: inset 0 4px 8px rgba(0,0,0,0.3);
                position: relative;
                overflow: hidden;
            `;

            const mole: Mole = {
                id: i,
                element: moleHole,
                isVisible: false
            };

            moleHole.addEventListener('click', () => this.whackMole(mole));
            moleHole.addEventListener('mouseenter', () => {
                if (mole.isVisible) {
                    moleHole.style.transform = 'scale(1.1)';
                }
            });
            moleHole.addEventListener('mouseleave', () => {
                moleHole.style.transform = 'scale(1)';
            });

            this.moles.push(mole);
            this.moleBoard.appendChild(moleHole);
        }
    }

    private toggleMoleGame(): void {
        if (this.moleGameActive) {
            this.stopMoleGame();
        } else {
            this.startMoleGame();
        }
    }

    private startMoleGame(): void {
        this.moleGameActive = true;
        this.moleScore = 0;
        this.moleTimeLeft = 30;
        this.moleStartButton.textContent = 'Stop Game';
        this.moleStartButton.style.background = '#f44336';

        // Start the countdown timer
        this.moleTimer = setInterval(() => {
            this.moleTimeLeft--;
            this.updateMoleDisplay();

            if (this.moleTimeLeft <= 0) {
                this.endMoleGame();
            }
        }, 1000);

        // Start spawning moles
        this.spawnMole();
    }

    private stopMoleGame(): void {
        this.moleGameActive = false;
        clearInterval(this.moleTimer);
        
        // Hide all moles
        this.moles.forEach(mole => {
            this.hideMole(mole);
        });

        this.moleStartButton.textContent = 'Start Game';
        this.moleStartButton.style.background = '#4CAF50';
    }

    private endMoleGame(): void {
        this.stopMoleGame();
        setTimeout(() => this.showWinMessage('Whack-a-Mole'), 500);
    }

    private spawnMole(): void {
        if (!this.moleGameActive) return;

        // Find available holes
        const availableHoles = this.moles.filter(mole => !mole.isVisible);
        if (availableHoles.length === 0) {
            setTimeout(() => this.spawnMole(), 500);
            return;
        }

        // Pick random hole
        const randomHole = availableHoles[Math.floor(Math.random() * availableHoles.length)];
        this.showMole(randomHole);

        // Schedule next mole spawn
        const nextSpawnTime = Math.random() * 1000 + 500; // 0.5-1.5 seconds
        setTimeout(() => this.spawnMole(), nextSpawnTime);
    }

    private showMole(mole: Mole): void {
        if (mole.isVisible) return;

        mole.isVisible = true;
        mole.element.textContent = '🐭';
        mole.element.style.background = '#8B4513';
        mole.element.style.fontSize = '40px';

        // Auto-hide after random time
        const hideTime = Math.random() * 1500 + 1000; // 1-2.5 seconds
        mole.timeout = setTimeout(() => {
            this.hideMole(mole);
        }, hideTime);
    }

    private hideMole(mole: Mole): void {
        if (!mole.isVisible) return;

        mole.isVisible = false;
        mole.element.textContent = '';
        mole.element.style.background = '#654321';
        
        if (mole.timeout) {
            clearTimeout(mole.timeout);
        }
    }

    private whackMole(mole: Mole): void {
        if (!mole.isVisible || !this.moleGameActive) return;

        this.moleScore++;
        this.updateMoleDisplay();

        // Show hit effect
        mole.element.style.background = '#ff6b6b';
        mole.element.textContent = '💥';
        
        setTimeout(() => {
            this.hideMole(mole);
        }, 200);
    }

    private updateMoleDisplay(): void {
        if (this.moleScoreElement) {
            this.moleScoreElement.textContent = `Score: ${this.moleScore}`;
        }
        if (this.moleTimeElement) {
            this.moleTimeElement.textContent = `Time: ${this.moleTimeLeft}s`;
        }
    }

    // =============== SHARED METHODS ===============

    private showWinMessage(gameType: string): void {
        let message = '';
        if (gameType === 'Memory Match') {
            message = `🎉 Memory Match Complete! You won in ${this.attempts} attempts! 🎉`;
        } else if (gameType === 'Whack-a-Mole') {
            message = `🎉 Whack-a-Mole Complete! Final Score: ${this.moleScore} points! 🎉`;
        } else if (gameType === 'Reaction Time') {
            const averageTime = Math.round(this.reactionTimes.reduce((a, b) => a + b, 0) / this.reactionTimes.length);
            const bestTime = Math.min(...this.reactionTimes);
            message = `⚡ Reaction Test Complete! Average: ${averageTime}ms | Best: ${bestTime}ms ⚡`;
        } else {
            message = `🗼 Tower Defense Game Over! You survived ${this.towerWave - 1} waves! 🗼`;
        }

        const winMessage = document.createElement('div');
        winMessage.textContent = message;
        winMessage.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 30px;
            border-radius: 10px;
            font-size: 20px;
            text-align: center;
            z-index: 1000;
            max-width: 400px;
        `;

        document.body.appendChild(winMessage);

        setTimeout(() => {
            if (document.body.contains(winMessage)) {
                document.body.removeChild(winMessage);
            }
        }, 3000);
    }

    public update(options: VisualUpdateOptions) {
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews[0]);
        // Games don't need to respond to data updates, but we maintain the interface
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}