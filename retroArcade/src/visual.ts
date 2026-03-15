"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

import { VisualFormattingSettingsModel } from "./settings";
import { IGame } from "./games/IGame";
import { GameRegistry } from "./games/GameRegistry";
import "./games/registerGames";

export class Visual implements IVisual {
    private target: HTMLElement;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;

    private toolbar: HTMLElement;
    private gameContainer: HTMLElement;
    private activeGame: IGame | null = null;
    private width = 0;
    private height = 0;

    constructor(options: VisualConstructorOptions) {
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        this.target.classList.add("game-visual-root");

        // toolbar with game selector
        this.toolbar = document.createElement("div");
        this.toolbar.className = "game-toolbar";

        const label = document.createElement("span");
        label.className = "game-toolbar-label";
        label.textContent = "Game:";
        this.toolbar.appendChild(label);

        const select = document.createElement("select");
        select.className = "game-select";
        for (const entry of GameRegistry.list()) {
            const opt = document.createElement("option");
            opt.value = entry.id;
            opt.textContent = entry.name;
            select.appendChild(opt);
        }
        select.addEventListener("change", () => this.loadGame(select.value));
        this.toolbar.appendChild(select);

        this.target.appendChild(this.toolbar);

        // game container
        this.gameContainer = document.createElement("div");
        this.gameContainer.className = "game-container";
        this.target.appendChild(this.gameContainer);

        // auto-load first game
        const ids = GameRegistry.ids();
        if (ids.length > 0) {
            this.loadGame(ids[0]);
        }
    }

    private loadGame(id: string): void {
        if (this.activeGame) {
            this.activeGame.stop();
            this.activeGame.destroy();
            this.activeGame = null;
        }
        const game = GameRegistry.create(id);
        if (!game) return;
        this.activeGame = game;
        game.init(this.gameContainer);
        if (this.width > 0 && this.height > 0) {
            game.resize(this.width, this.height - 36);
        }
        game.start();
    }

    public update(options: VisualUpdateOptions) {
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel, options.dataViews?.[0]
        );

        this.width = options.viewport.width;
        this.height = options.viewport.height;

        if (this.activeGame) {
            this.activeGame.resize(this.width, this.height - 36);
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}