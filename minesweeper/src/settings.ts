/*
 *  Power BI Visualizations
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

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

/**
 * Minesweeper Game Settings Card
 */
class GameSettingsCard extends FormattingSettingsCard {
    difficulty = new formattingSettings.ItemDropdown({
        name: "difficulty",
        displayName: "Difficulty",
        items: [
            { displayName: "Beginner (9x9, 10 mines)", value: "beginner" },
            { displayName: "Intermediate (16x16, 40 mines)", value: "intermediate" },
            { displayName: "Expert (30x16, 99 mines)", value: "expert" }
        ],
        value: { displayName: "Beginner (9x9, 10 mines)", value: "beginner" }
    });

    showTimer = new formattingSettings.ToggleSwitch({
        name: "showTimer",
        displayName: "Show Timer",
        value: true
    });

    showMineCounter = new formattingSettings.ToggleSwitch({
        name: "showMineCounter",
        displayName: "Show Mine Counter",
        value: true
    });

    autoRestart = new formattingSettings.ToggleSwitch({
        name: "autoRestart",
        displayName: "Auto Restart on Game Over",
        value: false
    });

    name: string = "gameSettings";
    displayName: string = "Game Settings";
    slices: Array<FormattingSettingsSlice> = [this.difficulty, this.showTimer, this.showMineCounter, this.autoRestart];
}

/**
 * Visual Appearance Settings Card
 */
class AppearanceSettingsCard extends FormattingSettingsCard {
    cellSize = new formattingSettings.NumUpDown({
        name: "cellSize",
        displayName: "Cell Size (pixels)",
        value: 25,
        options: {
            minValue: { type: powerbi.visuals.ValidatorType.Min, value: 15 },
            maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 50 }
        }
    });

    borderColor = new formattingSettings.ColorPicker({
        name: "borderColor",
        displayName: "Border Color",
        value: { value: "#808080" }
    });

    cellColor = new formattingSettings.ColorPicker({
        name: "cellColor",
        displayName: "Cell Color",
        value: { value: "#C0C0C0" }
    });

    revealedCellColor = new formattingSettings.ColorPicker({
        name: "revealedCellColor",
        displayName: "Revealed Cell Color",
        value: { value: "#FFFFFF" }
    });

    mineColor = new formattingSettings.ColorPicker({
        name: "mineColor",
        displayName: "Mine Color",
        value: { value: "#FF0000" }
    });

    flagColor = new formattingSettings.ColorPicker({
        name: "flagColor",
        displayName: "Flag Color",
        value: { value: "#FFD700" }
    });

    name: string = "appearance";
    displayName: string = "Visual Appearance";
    slices: Array<FormattingSettingsSlice> = [this.cellSize, this.borderColor, this.cellColor, this.revealedCellColor, this.mineColor, this.flagColor];
}

/**
* visual settings model class
*
*/
export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    // Create formatting settings model formatting cards
    gameSettingsCard = new GameSettingsCard();
    appearanceSettingsCard = new AppearanceSettingsCard();

    cards = [this.gameSettingsCard, this.appearanceSettingsCard];
}
