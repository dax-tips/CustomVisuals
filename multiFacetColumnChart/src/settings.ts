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
        description: "Default color for chart bars",
        value: { value: "#01B8AA" }
    });

    showAllDataPoints = new formattingSettings.ToggleSwitch({
        name: "showAllDataPoints",
        displayName: "Show all data points",
        description: "Show all individual data points",
        value: true
    });

    name: string = "dataPoint";
    displayName: string = "Data colors";
    slices: Array<FormattingSettingsSlice> = [this.defaultColor, this.showAllDataPoints];
}

/**
 * Chart Layout Formatting Card
 */
class ChartLayoutCardSettings extends FormattingSettingsCard {
    barPadding = new formattingSettings.NumUpDown({
        name: "barPadding",
        displayName: "Bar spacing",
        description: "Spacing between bars (0.0 - 1.0)",
        value: 0.1
    });

    marginTop = new formattingSettings.NumUpDown({
        name: "marginTop",
        displayName: "Top margin",
        description: "Top margin in pixels",
        value: 30
    });

    marginBottom = new formattingSettings.NumUpDown({
        name: "marginBottom", 
        displayName: "Bottom margin",
        description: "Bottom margin in pixels",
        value: 40
    });

    marginLeft = new formattingSettings.NumUpDown({
        name: "marginLeft",
        displayName: "Left margin", 
        description: "Left margin in pixels",
        value: 60
    });

    marginRight = new formattingSettings.NumUpDown({
        name: "marginRight",
        displayName: "Right margin",
        description: "Right margin in pixels", 
        value: 20
    });

    facetPadding = new formattingSettings.NumUpDown({
        name: "facetPadding",
        displayName: "Facet spacing",
        description: "Spacing between facet panels",
        value: 20
    });

    maxFacetsPerRow = new formattingSettings.NumUpDown({
        name: "maxFacetsPerRow",
        displayName: "Max facets per row",
        description: "Maximum number of facets per row",
        value: 3
    });

    name: string = "chartLayout";
    displayName: string = "Chart layout";
    slices: Array<FormattingSettingsSlice> = [
        this.barPadding, 
        this.marginTop, 
        this.marginBottom, 
        this.marginLeft, 
        this.marginRight,
        this.facetPadding,
        this.maxFacetsPerRow
    ];
}

/**
 * Axis Formatting Card
 */
class AxisCardSettings extends FormattingSettingsCard {
    showXAxis = new formattingSettings.ToggleSwitch({
        name: "showXAxis",
        displayName: "Show X-axis",
        description: "Show or hide X-axis",
        value: true
    });

    showYAxis = new formattingSettings.ToggleSwitch({
        name: "showYAxis", 
        displayName: "Show Y-axis",
        description: "Show or hide Y-axis",
        value: true
    });

    axisFontSize = new formattingSettings.NumUpDown({
        name: "axisFontSize",
        displayName: "Axis font size",
        description: "Font size for axis labels",
        value: 12
    });

    axisColor = new formattingSettings.ColorPicker({
        name: "axisColor",
        displayName: "Axis color",
        description: "Color for axis lines and labels",
        value: { value: "#666666" }
    });

    rotateXLabels = new formattingSettings.ToggleSwitch({
        name: "rotateXLabels",
        displayName: "Rotate X-axis labels",
        description: "Automatically rotate X-axis labels when needed",
        value: true
    });

    yAxisTicks = new formattingSettings.NumUpDown({
        name: "yAxisTicks",
        displayName: "Y-axis tick count",
        description: "Number of ticks on Y-axis",
        value: 5
    });

    name: string = "axis";
    displayName: string = "Axis";
    slices: Array<FormattingSettingsSlice> = [
        this.showXAxis,
        this.showYAxis, 
        this.axisFontSize,
        this.axisColor,
        this.rotateXLabels,
        this.yAxisTicks
    ];
}

/**
 * Facet Titles Formatting Card
 */
class FacetTitlesCardSettings extends FormattingSettingsCard {
    showFacetTitles = new formattingSettings.ToggleSwitch({
        name: "showFacetTitles",
        displayName: "Show facet titles",
        description: "Show or hide facet panel titles",
        value: true
    });

    facetTitleFontSize = new formattingSettings.NumUpDown({
        name: "facetTitleFontSize",
        displayName: "Title font size",
        description: "Font size for facet titles",
        value: 12
    });

    facetTitleColor = new formattingSettings.ColorPicker({
        name: "facetTitleColor",
        displayName: "Title color",
        description: "Color for facet titles",
        value: { value: "#333333" }
    });

    facetTitleWeight = new formattingSettings.ItemDropdown({
        name: "facetTitleWeight",
        displayName: "Title font weight",
        description: "Font weight for facet titles",
        items: [
            { displayName: "Normal", value: "normal" },
            { displayName: "Bold", value: "bold" },
            { displayName: "Lighter", value: "lighter" }
        ],
        value: { displayName: "Bold", value: "bold" }
    });

    name: string = "facetTitles";
    displayName: string = "Facet titles";
    slices: Array<FormattingSettingsSlice> = [
        this.showFacetTitles,
        this.facetTitleFontSize,
        this.facetTitleColor,
        this.facetTitleWeight
    ];
}

/**
 * General Settings Card
 */
class GeneralCardSettings extends FormattingSettingsCard {
    showTooltips = new formattingSettings.ToggleSwitch({
        name: "showTooltips",
        displayName: "Show tooltips",
        description: "Show tooltips on hover",
        value: true
    });

    animationDuration = new formattingSettings.NumUpDown({
        name: "animationDuration",
        displayName: "Animation duration",
        description: "Animation duration in milliseconds",
        value: 250
    });

    hoverOpacity = new formattingSettings.NumUpDown({
        name: "hoverOpacity",
        displayName: "Hover opacity",
        description: "Opacity when hovering over bars (0.0 - 1.0)",
        value: 0.8
    });

    name: string = "general";
    displayName: string = "General";
    slices: Array<FormattingSettingsSlice> = [
        this.showTooltips,
        this.animationDuration,
        this.hoverOpacity
    ];
}

/**
 * Visual settings model class
 */
export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    // Create formatting settings model formatting cards
    dataPointCard = new DataPointCardSettings();
    chartLayoutCard = new ChartLayoutCardSettings();
    axisCard = new AxisCardSettings();
    facetTitlesCard = new FacetTitlesCardSettings();
    generalCard = new GeneralCardSettings();

    cards = [
        this.dataPointCard,
        this.chartLayoutCard, 
        this.axisCard,
        this.facetTitlesCard,
        this.generalCard
    ];
}
