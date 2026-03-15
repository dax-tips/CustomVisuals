"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

class CardAppearanceSettings extends FormattingSettingsCard {
    gradientStart = new formattingSettings.ColorPicker({
        name: "gradientStart",
        displayName: "Background Start",
        value: { value: "#e8d5f5" }
    });

    gradientEnd = new formattingSettings.ColorPicker({
        name: "gradientEnd",
        displayName: "Background End",
        value: { value: "#d5f0e3" }
    });

    borderRadius = new formattingSettings.NumUpDown({
        name: "borderRadius",
        displayName: "Corner Radius",
        value: 16
    });

    name: string = "cardAppearance";
    displayName: string = "Card Appearance";
    slices: Array<FormattingSettingsSlice> = [this.gradientStart, this.gradientEnd, this.borderRadius];
}

class TitleSettings extends FormattingSettingsCard {
    titleFontSize = new formattingSettings.NumUpDown({
        name: "titleFontSize",
        displayName: "Font Size",
        value: 20
    });

    titleColor = new formattingSettings.ColorPicker({
        name: "titleColor",
        displayName: "Font Color",
        value: { value: "#1a1a2e" }
    });

    name: string = "titleSettings";
    displayName: string = "Title";
    slices: Array<FormattingSettingsSlice> = [this.titleFontSize, this.titleColor];
}

class ValueSettings extends FormattingSettingsCard {
    valueFontSize = new formattingSettings.NumUpDown({
        name: "valueFontSize",
        displayName: "Font Size",
        value: 48
    });

    valueColor = new formattingSettings.ColorPicker({
        name: "valueColor",
        displayName: "Font Color",
        value: { value: "#1a1a2e" }
    });

    displayUnits = new formattingSettings.AutoDropdown({
        name: "displayUnits",
        displayName: "Display Units",
        value: 0
    });

    decimalPlaces = new formattingSettings.NumUpDown({
        name: "decimalPlaces",
        displayName: "Decimal Places",
        value: 0
    });

    name: string = "valueSettings";
    displayName: string = "Value";
    slices: Array<FormattingSettingsSlice> = [this.valueFontSize, this.valueColor, this.displayUnits, this.decimalPlaces];
}

class BadgeSettings extends FormattingSettingsCard {
    showBadge = new formattingSettings.ToggleSwitch({
        name: "showBadge",
        displayName: "Show Badge",
        value: true
    });

    achievedColor = new formattingSettings.ColorPicker({
        name: "achievedColor",
        displayName: "Achieved Color",
        value: { value: "#4B0082" }
    });

    notAchievedColor = new formattingSettings.ColorPicker({
        name: "notAchievedColor",
        displayName: "Not Achieved Color",
        value: { value: "#c0392b" }
    });

    name: string = "badgeSettings";
    displayName: string = "Achievement Badge";
    slices: Array<FormattingSettingsSlice> = [this.showBadge, this.achievedColor, this.notAchievedColor];
}

class DetailsSettings extends FormattingSettingsCard {
    showDetails = new formattingSettings.ToggleSwitch({
        name: "showDetails",
        displayName: "Show Details",
        value: true
    });

    detailsFontSize = new formattingSettings.NumUpDown({
        name: "detailsFontSize",
        displayName: "Font Size",
        value: 14
    });

    labelColor = new formattingSettings.ColorPicker({
        name: "labelColor",
        displayName: "Label Color",
        value: { value: "#333333" }
    });

    detailValueColor = new formattingSettings.ColorPicker({
        name: "detailValueColor",
        displayName: "Value Color",
        value: { value: "#555555" }
    });

    name: string = "detailsSettings";
    displayName: string = "Details";
    slices: Array<FormattingSettingsSlice> = [this.showDetails, this.detailsFontSize, this.labelColor, this.detailValueColor];
}

class ProgressBarSettings extends FormattingSettingsCard {
    showProgressBar = new formattingSettings.ToggleSwitch({
        name: "showProgressBar",
        displayName: "Show Progress Bar",
        value: true
    });

    barColor = new formattingSettings.ColorPicker({
        name: "barColor",
        displayName: "Bar Color",
        value: { value: "#4B0082" }
    });

    trackColor = new formattingSettings.ColorPicker({
        name: "trackColor",
        displayName: "Track Color",
        value: { value: "#d9d9d9" }
    });

    barHeight = new formattingSettings.NumUpDown({
        name: "barHeight",
        displayName: "Bar Height",
        value: 14
    });

    thresholdPercent = new formattingSettings.NumUpDown({
        name: "thresholdPercent",
        displayName: "Threshold %",
        value: 80
    });

    showThreshold = new formattingSettings.ToggleSwitch({
        name: "showThreshold",
        displayName: "Show Threshold Marker",
        value: true
    });

    markerColor = new formattingSettings.ColorPicker({
        name: "markerColor",
        displayName: "Marker Color",
        value: { value: "#1a1a2e" }
    });

    name: string = "progressBarSettings";
    displayName: string = "Progress Bar";
    slices: Array<FormattingSettingsSlice> = [
        this.showProgressBar, this.barColor, this.trackColor,
        this.barHeight, this.thresholdPercent, this.showThreshold, this.markerColor
    ];
}

class GridLayoutSettings extends FormattingSettingsCard {
    columns = new formattingSettings.NumUpDown({
        name: "columns",
        displayName: "Columns",
        value: 3
    });

    gap = new formattingSettings.NumUpDown({
        name: "gap",
        displayName: "Gap (px)",
        value: 12
    });

    innerPadding = new formattingSettings.NumUpDown({
        name: "innerPadding",
        displayName: "Card Padding (px)",
        value: 16
    });

    name: string = "gridLayout";
    displayName: string = "Grid Layout";
    slices: Array<FormattingSettingsSlice> = [this.columns, this.gap, this.innerPadding];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    cardAppearance = new CardAppearanceSettings();
    titleSettings = new TitleSettings();
    valueSettings = new ValueSettings();
    badgeSettings = new BadgeSettings();
    detailsSettings = new DetailsSettings();
    progressBarSettings = new ProgressBarSettings();
    gridLayout = new GridLayoutSettings();

    cards = [
        this.gridLayout,
        this.cardAppearance,
        this.titleSettings,
        this.valueSettings,
        this.badgeSettings,
        this.detailsSettings,
        this.progressBarSettings
    ];
}
