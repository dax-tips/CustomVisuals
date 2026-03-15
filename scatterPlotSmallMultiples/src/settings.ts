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
 * Scatter Plot Formatting Card
 */
class ScatterPlotCardSettings extends FormattingSettingsCard {
    defaultColor = new formattingSettings.ColorPicker({
        name: "defaultColor",
        displayName: "Default point color",
        value: { value: "#1f77b4" }
    });

    pointSize = new formattingSettings.NumUpDown({
        name: "pointSize",
        displayName: "Point size",
        value: 5
    });

    showGridLines = new formattingSettings.ToggleSwitch({
        name: "showGridLines",
        displayName: "Show grid lines",
        value: true
    });

    name: string = "scatterPlot";
    displayName: string = "Scatter Plot";
    slices: Array<FormattingSettingsSlice> = [
        this.defaultColor, 
        this.pointSize, 
        this.showGridLines
    ];
}

/**
 * Small Multiples Layout Card
 */
class LayoutCardSettings extends FormattingSettingsCard {
    columnsCount = new formattingSettings.NumUpDown({
        name: "columnsCount",
        displayName: "Columns",
        value: 0 // 0 = auto
    });

    spacing = new formattingSettings.NumUpDown({
        name: "spacing",
        displayName: "Spacing",
        value: 20
    });

    name: string = "layout";
    displayName: string = "Layout";
    slices: Array<FormattingSettingsSlice> = [
        this.columnsCount,
        this.spacing
    ];
}

/**
 * Axes Formatting Card
 */
class AxesCardSettings extends FormattingSettingsCard {
    showXAxisTitle = new formattingSettings.ToggleSwitch({
        name: "showXAxisTitle",
        displayName: "Show X-axis title",
        value: true
    });

    showYAxisTitle = new formattingSettings.ToggleSwitch({
        name: "showYAxisTitle", 
        displayName: "Show Y-axis title",
        value: true
    });

    axisTitleFontSize = new formattingSettings.NumUpDown({
        name: "axisTitleFontSize",
        displayName: "Axis title font size",
        value: 10
    });

    name: string = "axes";
    displayName: string = "Axes";
    slices: Array<FormattingSettingsSlice> = [
        this.showXAxisTitle,
        this.showYAxisTitle,
        this.axisTitleFontSize
    ];
}

/**
 * Title Formatting Card
 */
class TitleCardSettings extends FormattingSettingsCard {
    titleFontSize = new formattingSettings.NumUpDown({
        name: "titleFontSize",
        displayName: "Title font size",
        value: 12
    });

    titleColor = new formattingSettings.ColorPicker({
        name: "titleColor",
        displayName: "Title color",
        value: { value: "#000000" }
    });

    name: string = "title";
    displayName: string = "Titles";
    slices: Array<FormattingSettingsSlice> = [
        this.titleFontSize,
        this.titleColor
    ];
}

/**
* Visual settings model class
*/
export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    // Create formatting settings model formatting cards
    scatterPlotCard = new ScatterPlotCardSettings();
    layoutCard = new LayoutCardSettings();
    axesCard = new AxesCardSettings();
    titleCard = new TitleCardSettings();

    cards = [
        this.scatterPlotCard,
        this.layoutCard, 
        this.axesCard,
        this.titleCard
    ];
}
