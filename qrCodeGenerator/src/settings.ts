/*
 *  Power BI Visualizations - QR Code Generator
 *  MIT License
 */

"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

class QrSettingsCard extends FormattingSettingsCard {
    defaultText = new formattingSettings.TextInput({
        name: "defaultText",
        displayName: "Default Text",
        description: "Text to encode when no measure is bound. A measure overrides this.",
        value: "",
        placeholder: "e.g. https://example.com"
    });

    foregroundColor = new formattingSettings.ColorPicker({
        name: "foregroundColor",
        displayName: "Foreground Color",
        description: "Color of the dark QR modules",
        value: { value: "#000000" }
    });

    backgroundColor = new formattingSettings.ColorPicker({
        name: "backgroundColor",
        displayName: "Background Color",
        description: "Color of the light QR modules",
        value: { value: "#FFFFFF" }
    });

    errorCorrection = new formattingSettings.ItemDropdown({
        name: "errorCorrection",
        displayName: "Error Correction",
        description: "Higher = more resilient, use High when using a center icon",
        value: { value: "H", displayName: "High (30%)" },
        items: [
            { value: "L", displayName: "Low (7%)" },
            { value: "M", displayName: "Medium (15%)" },
            { value: "Q", displayName: "Quartile (25%)" },
            { value: "H", displayName: "High (30%)" }
        ]
    });

    quietZone = new formattingSettings.NumUpDown({
        name: "quietZone",
        displayName: "Quiet Zone",
        description: "Number of empty modules around the QR code",
        value: 2,
        options: { minValue: { type: powerbi.visuals.ValidatorType.Min, value: 0 }, maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 10 } }
    });

    finderRadius = new formattingSettings.NumUpDown({
        name: "finderRadius",
        displayName: "Finder Corner Radius (%)",
        description: "Roundness of the three large corner squares (0 = sharp, 50 = fully round)",
        value: 0,
        options: { minValue: { type: powerbi.visuals.ValidatorType.Min, value: 0 }, maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 50 } }
    });

    moduleRadius = new formattingSettings.NumUpDown({
        name: "moduleRadius",
        displayName: "Module Radius (%)",
        description: "Roundness of individual data modules (0 = square, 50 = circle)",
        value: 0,
        options: { minValue: { type: powerbi.visuals.ValidatorType.Min, value: 0 }, maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 50 } }
    });

    name: string = "qrSettings";
    displayName: string = "QR Code";
    slices: Array<FormattingSettingsSlice> = [this.defaultText, this.foregroundColor, this.backgroundColor, this.errorCorrection, this.quietZone, this.finderRadius, this.moduleRadius];
}

class CardAppearanceCard extends FormattingSettingsCard {
    showTitle = new formattingSettings.ToggleSwitch({
        name: "showTitle",
        displayName: "Show Title",
        value: true
    });

    titleText = new formattingSettings.TextInput({
        name: "titleText",
        displayName: "Title Text",
        description: "Label shown above the QR code (leave blank to use measure name)",
        value: "",
        placeholder: "e.g. SCAN ME"
    });

    showSubtitle = new formattingSettings.ToggleSwitch({
        name: "showSubtitle",
        displayName: "Show Subtitle",
        value: false
    });

    subtitleText = new formattingSettings.TextInput({
        name: "subtitleText",
        displayName: "Subtitle Text",
        description: "Text shown below the QR code",
        value: "",
        placeholder: "e.g. Point your camera here"
    });

    showCardBackground = new formattingSettings.ToggleSwitch({
        name: "showCardBackground",
        displayName: "Card Background",
        description: "Show a card-style background with shadow",
        value: true
    });

    cardBackgroundColor = new formattingSettings.ColorPicker({
        name: "cardBackgroundColor",
        displayName: "Card Color",
        value: { value: "#FFFFFF" }
    });

    cornerRadius = new formattingSettings.NumUpDown({
        name: "cornerRadius",
        displayName: "Corner Radius",
        value: 12,
        options: { minValue: { type: powerbi.visuals.ValidatorType.Min, value: 0 }, maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 30 } }
    });

    showShadow = new formattingSettings.ToggleSwitch({
        name: "showShadow",
        displayName: "Show Shadow",
        value: true
    });

    cardPadding = new formattingSettings.NumUpDown({
        name: "cardPadding",
        displayName: "Card Padding",
        value: 16,
        options: { minValue: { type: powerbi.visuals.ValidatorType.Min, value: 0 }, maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 40 } }
    });

    name: string = "cardAppearance";
    displayName: string = "Card Appearance";
    slices: Array<FormattingSettingsSlice> = [
        this.showTitle, this.titleText,
        this.showSubtitle, this.subtitleText,
        this.showCardBackground, this.cardBackgroundColor,
        this.cornerRadius, this.showShadow, this.cardPadding
    ];
}

class CenterIconCard extends FormattingSettingsCard {
    iconType = new formattingSettings.ItemDropdown({
        name: "iconType",
        displayName: "Icon Type",
        description: "Shape or image to display in the center of the QR code",
        value: { value: "none", displayName: "None" },
        items: [
            { value: "none", displayName: "None" },
            { value: "circle", displayName: "Circle" },
            { value: "square", displayName: "Square" },
            { value: "diamond", displayName: "Diamond" },
            { value: "image", displayName: "Custom Image URL" }
        ]
    });

    iconSizePercent = new formattingSettings.NumUpDown({
        name: "iconSizePercent",
        displayName: "Icon Size (%)",
        description: "Size of the center icon as a percentage of the QR code",
        value: 20,
        options: { minValue: { type: powerbi.visuals.ValidatorType.Min, value: 5 }, maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 40 } }
    });

    iconBackgroundColor = new formattingSettings.ColorPicker({
        name: "iconBackgroundColor",
        displayName: "Icon Background",
        description: "Background color of the center icon area",
        value: { value: "#FFFFFF" }
    });

    iconColor = new formattingSettings.ColorPicker({
        name: "iconColor",
        displayName: "Icon Color",
        description: "Color of the center icon shape or text",
        value: { value: "#000000" }
    });

    iconImageUrl = new formattingSettings.TextInput({
        name: "iconImageUrl",
        displayName: "Image URL",
        description: "URL of the image to display in the center (when Icon Type is Custom Image URL)",
        value: "",
        placeholder: "https://example.com/logo.png"
    });

    iconText = new formattingSettings.TextInput({
        name: "iconText",
        displayName: "Icon Text",
        description: "Short text to display inside the center icon shape",
        value: "",
        placeholder: "e.g. SCAN"
    });

    name: string = "centerIcon";
    displayName: string = "Center Icon";
    slices: Array<FormattingSettingsSlice> = [this.iconType, this.iconSizePercent, this.iconBackgroundColor, this.iconColor, this.iconImageUrl, this.iconText];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    cardAppearanceCard = new CardAppearanceCard();
    qrSettingsCard = new QrSettingsCard();
    centerIconCard = new CenterIconCard();

    cards = [this.cardAppearanceCard, this.qrSettingsCard, this.centerIconCard];
}
