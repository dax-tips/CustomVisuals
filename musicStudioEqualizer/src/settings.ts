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
 * Data Point Formatting Card
 */
class DataPointCardSettings extends FormattingSettingsCard {
    defaultColor = new formattingSettings.ColorPicker({
        name: "defaultColor",
        displayName: "Default color",
        value: { value: "" }
    });

    showAllDataPoints = new formattingSettings.ToggleSwitch({
        name: "showAllDataPoints",
        displayName: "Show all",
        value: true
    });

    fill = new formattingSettings.ColorPicker({
        name: "fill",
        displayName: "Fill",
        value: { value: "" }
    });

    fillRule = new formattingSettings.ColorPicker({
        name: "fillRule",
        displayName: "Color saturation",
        value: { value: "" }
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Text Size",
        value: 12
    });

    name: string = "dataPoint";
    displayName: string = "Data colors";
    slices: Array<FormattingSettingsSlice> = [this.defaultColor, this.showAllDataPoints, this.fill, this.fillRule, this.fontSize];
}

/**
 * Audio Equalizer Formatting Card
 */
class AudioEqualizerCardSettings extends FormattingSettingsCard {
    barCount = new formattingSettings.NumUpDown({
        name: "barCount",
        displayName: "Number of Bars",
        value: 64
    });

    sensitivity = new formattingSettings.NumUpDown({
        name: "sensitivity",
        displayName: "Sensitivity",
        value: 80
    });

    primaryColor = new formattingSettings.ColorPicker({
        name: "primaryColor",
        displayName: "Primary Color",
        value: { value: "#00ff88" }
    });

    secondaryColor = new formattingSettings.ColorPicker({
        name: "secondaryColor",
        displayName: "Secondary Color", 
        value: { value: "#ff0088" }
    });

    enableGlow = new formattingSettings.ToggleSwitch({
        name: "enableGlow",
        displayName: "Enable Glow Effect",
        value: true
    });

    smoothing = new formattingSettings.NumUpDown({
        name: "smoothing",
        displayName: "Smoothing",
        value: 80
    });

    name: string = "audioEqualizer";
    displayName: string = "Audio Equalizer";
    slices: Array<FormattingSettingsSlice> = [
        this.barCount, 
        this.sensitivity, 
        this.primaryColor, 
        this.secondaryColor, 
        this.enableGlow, 
        this.smoothing
    ];
}

/**
* visual settings model class
*
*/
export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    // Create formatting settings model formatting cards
    dataPointCard = new DataPointCardSettings();
    audioEqualizerCard = new AudioEqualizerCardSettings();

    cards = [this.dataPointCard, this.audioEqualizerCard];
}
