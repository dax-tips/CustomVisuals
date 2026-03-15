/*
 *  Power BI Custom Visual - QR Code Generator
 *  MIT License
 */
"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import * as qrcode from "qrcode-generator";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

import { VisualFormattingSettingsModel } from "./settings";

type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export class Visual implements IVisual {
    private target: HTMLElement;
    private cardDiv: HTMLElement;
    private titleDiv: HTMLElement;
    private qrFrame: HTMLElement;
    private canvas: HTMLCanvasElement;
    private subtitleDiv: HTMLElement;
    private messageDiv: HTMLElement;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private cachedImageUrl: string = "";
    private cachedImage: HTMLImageElement | null = null;

    constructor(options: VisualConstructorOptions) {
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        this.target.classList.add("qr-visual-container");

        this.cardDiv = document.createElement("div");
        this.cardDiv.classList.add("qr-card");
        this.target.appendChild(this.cardDiv);

        this.titleDiv = document.createElement("div");
        this.titleDiv.classList.add("qr-title");
        this.cardDiv.appendChild(this.titleDiv);

        this.qrFrame = document.createElement("div");
        this.qrFrame.classList.add("qr-frame");
        this.cardDiv.appendChild(this.qrFrame);

        this.canvas = document.createElement("canvas");
        this.canvas.classList.add("qr-canvas");
        this.qrFrame.appendChild(this.canvas);

        this.subtitleDiv = document.createElement("div");
        this.subtitleDiv.classList.add("qr-subtitle");
        this.cardDiv.appendChild(this.subtitleDiv);

        this.messageDiv = document.createElement("div");
        this.messageDiv.classList.add("qr-message");
        this.target.appendChild(this.messageDiv);
    }

    public update(options: VisualUpdateOptions) {
        const dataView = options.dataViews?.[0];
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel, dataView
        );

        // Use measure value if bound, otherwise fall back to default text
        const measureText = this.extractMeasureText(dataView);
        const defaultText = this.formattingSettings.qrSettingsCard.defaultText.value || "";
        const qrText = measureText || defaultText;

        if (!qrText) {
            this.showMessage("Drop a measure or set Default Text in QR Code settings");
            return;
        }

        this.hideMessage();
        this.applyCardStyle(dataView);
        this.renderQrCode(qrText, options.viewport);
    }

    private extractMeasureText(dataView: powerbi.DataView | undefined): string | null {
        if (!dataView?.categorical?.values?.[0]?.values?.[0]) {
            return null;
        }
        const val = dataView.categorical.values[0].values[0];
        if (val == null) return null;
        return String(val);
    }

    private applyCardStyle(dataView: powerbi.DataView | undefined) {
        const card = this.formattingSettings.cardAppearanceCard;
        const showCard = card.showCardBackground.value;
        const bgColor = card.cardBackgroundColor.value?.value || "#FFFFFF";
        const radius = card.cornerRadius.value ?? 12;
        const shadow = card.showShadow.value;
        const padding = card.cardPadding.value ?? 16;

        if (showCard) {
            this.cardDiv.classList.add("qr-card--styled");
            this.cardDiv.style.backgroundColor = bgColor;
            this.cardDiv.style.borderRadius = `${radius}px`;
            this.cardDiv.style.boxShadow = shadow
                ? "0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 8px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.03)"
                : "none";
            this.cardDiv.style.padding = `${padding}px`;
        } else {
            this.cardDiv.classList.remove("qr-card--styled");
            this.cardDiv.style.backgroundColor = "transparent";
            this.cardDiv.style.borderRadius = "0";
            this.cardDiv.style.boxShadow = "none";
            this.cardDiv.style.padding = "0";
        }

        // Title
        const showTitle = card.showTitle.value;
        const titleText = card.titleText.value || this.getMeasureName(dataView) || "QR CODE";
        this.titleDiv.style.display = showTitle ? "block" : "none";
        this.titleDiv.textContent = titleText.toUpperCase();

        // Subtitle
        const showSubtitle = card.showSubtitle.value;
        const subtitleText = card.subtitleText.value || "";
        this.subtitleDiv.style.display = (showSubtitle && subtitleText) ? "block" : "none";
        this.subtitleDiv.textContent = subtitleText;
    }

    private getMeasureName(dataView: powerbi.DataView | undefined): string {
        return dataView?.categorical?.values?.[0]?.source?.displayName || "";
    }

    private renderQrCode(text: string, viewport: powerbi.IViewport) {
        const settings = this.formattingSettings.qrSettingsCard;
        const iconSettings = this.formattingSettings.centerIconCard;

        const ecLevel = (settings.errorCorrection.value?.value || "H") as ErrorCorrectionLevel;
        const fgColor = settings.foregroundColor.value?.value || "#000000";
        const bgColor = settings.backgroundColor.value?.value || "#FFFFFF";
        const quietZone = settings.quietZone.value ?? 2;

        // Generate QR matrix
        const qr = qrcode(0, ecLevel);
        qr.addData(text);
        qr.make();

        const moduleCount = qr.getModuleCount();
        const totalModules = moduleCount + quietZone * 2;

        // Calculate pixel size accounting for card padding, title, subtitle, and frame
        const card = this.formattingSettings.cardAppearanceCard;
        const cardPadding = card.showCardBackground.value ? (card.cardPadding.value ?? 16) * 2 : 0;
        const framePadding = 16; // 8px padding on each side of qr-frame
        const titleHeight = card.showTitle.value ? 32 : 0;
        const subtitleHeight = (card.showSubtitle.value && card.subtitleText.value) ? 24 : 0;
        const availableWidth = viewport.width - cardPadding - framePadding;
        const availableHeight = viewport.height - cardPadding - framePadding - titleHeight - subtitleHeight;
        const availableSize = Math.max(20, Math.min(availableWidth, availableHeight));
        const pixelRatio = window.devicePixelRatio || 1;
        const displaySize = Math.floor(availableSize);
        const canvasSize = displaySize * pixelRatio;
        const cellSize = canvasSize / totalModules;

        this.canvas.width = canvasSize;
        this.canvas.height = canvasSize;
        this.canvas.style.width = `${displaySize}px`;
        this.canvas.style.height = `${displaySize}px`;

        const ctx = this.canvas.getContext("2d");
        if (!ctx) return;

        // Draw background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        // Draw QR modules
        const finderRadius = (settings.finderRadius.value ?? 0) / 100;
        const moduleRadius = (settings.moduleRadius.value ?? 0) / 100;

        // Build a set of finder pattern positions for lookup
        const finderPositions = this.getFinderPatternPositions(moduleCount);

        // Draw finder patterns with rounded corners
        if (finderRadius > 0) {
            this.drawFinderPatterns(ctx, qr, moduleCount, quietZone, cellSize, fgColor, bgColor, finderRadius);
        }

        // Draw regular modules
        ctx.fillStyle = fgColor;
        for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
                if (finderPositions.has(`${row},${col}`) && finderRadius > 0) continue;
                if (qr.isDark(row, col)) {
                    const x = (col + quietZone) * cellSize;
                    const y = (row + quietZone) * cellSize;
                    const size = Math.ceil(cellSize);
                    if (moduleRadius > 0) {
                        const r = (size / 2) * moduleRadius;
                        this.roundRect(ctx, x, y, size, size, r);
                        ctx.fill();
                    } else {
                        ctx.fillRect(x, y, size, size);
                    }
                }
            }
        }

        // Draw center icon
        const iconType = iconSettings.iconType.value?.value || "none";
        if (iconType !== "none") {
            this.drawCenterIcon(ctx, canvasSize, quietZone, cellSize, moduleCount, iconSettings);
        }
    }

    private getFinderPatternPositions(moduleCount: number): Set<string> {
        const positions = new Set<string>();
        // Finder patterns are 7x7 at three corners
        const origins = [
            [0, 0],                          // top-left
            [0, moduleCount - 7],            // top-right
            [moduleCount - 7, 0]             // bottom-left
        ];
        for (const [startRow, startCol] of origins) {
            for (let r = 0; r < 7; r++) {
                for (let c = 0; c < 7; c++) {
                    positions.add(`${startRow + r},${startCol + c}`);
                }
            }
        }
        return positions;
    }

    private drawFinderPatterns(
        ctx: CanvasRenderingContext2D,
        qr: { isDark(row: number, col: number): boolean },
        moduleCount: number,
        quietZone: number,
        cellSize: number,
        fgColor: string,
        bgColor: string,
        radiusFraction: number
    ) {
        const origins = [
            [0, 0],
            [0, moduleCount - 7],
            [moduleCount - 7, 0]
        ];

        for (const [startRow, startCol] of origins) {
            const x = (startCol + quietZone) * cellSize;
            const y = (startRow + quietZone) * cellSize;

            // Outer 7x7 dark square
            const outerSize = 7 * cellSize;
            const outerR = (outerSize / 2) * radiusFraction;
            ctx.fillStyle = fgColor;
            ctx.beginPath();
            this.roundRect(ctx, x, y, outerSize, outerSize, outerR);
            ctx.fill();

            // Inner 5x5 light square (1 module inset)
            const innerOffset = cellSize;
            const innerSize = 5 * cellSize;
            const innerR = (innerSize / 2) * radiusFraction;
            ctx.fillStyle = bgColor;
            ctx.beginPath();
            this.roundRect(ctx, x + innerOffset, y + innerOffset, innerSize, innerSize, innerR);
            ctx.fill();

            // Center 3x3 dark square (2 modules inset)
            const centerOffset = 2 * cellSize;
            const centerSize = 3 * cellSize;
            const centerR = (centerSize / 2) * radiusFraction;
            ctx.fillStyle = fgColor;
            ctx.beginPath();
            this.roundRect(ctx, x + centerOffset, y + centerOffset, centerSize, centerSize, centerR);
            ctx.fill();
        }
    }

    private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    private drawCenterIcon(
        ctx: CanvasRenderingContext2D,
        canvasSize: number,
        quietZone: number,
        cellSize: number,
        moduleCount: number,
        iconSettings: VisualFormattingSettingsModel["centerIconCard"]
    ) {
        const iconType = iconSettings.iconType.value?.value || "none";
        const sizePercent = (iconSettings.iconSizePercent.value ?? 20) / 100;
        const iconBg = iconSettings.iconBackgroundColor.value?.value || "#FFFFFF";
        const iconFg = iconSettings.iconColor.value?.value || "#000000";
        const iconText = iconSettings.iconText.value || "";
        const imageUrl = iconSettings.iconImageUrl.value || "";

        const qrPixelSize = moduleCount * cellSize;
        const iconSize = qrPixelSize * sizePercent;
        const centerX = quietZone * cellSize + qrPixelSize / 2;
        const centerY = quietZone * cellSize + qrPixelSize / 2;
        const halfIcon = iconSize / 2;
        const padding = cellSize * 1.5;

        // Clear area behind icon (slightly larger for padding)
        ctx.fillStyle = iconBg;

        switch (iconType) {
            case "circle":
                // Clear circular area
                ctx.beginPath();
                ctx.arc(centerX, centerY, halfIcon + padding, 0, Math.PI * 2);
                ctx.fill();
                // Draw circle border
                ctx.strokeStyle = iconFg;
                ctx.lineWidth = cellSize * 0.8;
                ctx.beginPath();
                ctx.arc(centerX, centerY, halfIcon, 0, Math.PI * 2);
                ctx.stroke();
                break;

            case "square":
                // Clear square area
                ctx.fillRect(
                    centerX - halfIcon - padding,
                    centerY - halfIcon - padding,
                    iconSize + padding * 2,
                    iconSize + padding * 2
                );
                // Draw square border
                ctx.strokeStyle = iconFg;
                ctx.lineWidth = cellSize * 0.8;
                ctx.strokeRect(
                    centerX - halfIcon,
                    centerY - halfIcon,
                    iconSize,
                    iconSize
                );
                break;

            case "diamond":
                // Clear diamond area
                ctx.beginPath();
                ctx.moveTo(centerX, centerY - halfIcon - padding);
                ctx.lineTo(centerX + halfIcon + padding, centerY);
                ctx.lineTo(centerX, centerY + halfIcon + padding);
                ctx.lineTo(centerX - halfIcon - padding, centerY);
                ctx.closePath();
                ctx.fill();
                // Draw diamond border
                ctx.strokeStyle = iconFg;
                ctx.lineWidth = cellSize * 0.8;
                ctx.beginPath();
                ctx.moveTo(centerX, centerY - halfIcon);
                ctx.lineTo(centerX + halfIcon, centerY);
                ctx.lineTo(centerX, centerY + halfIcon);
                ctx.lineTo(centerX - halfIcon, centerY);
                ctx.closePath();
                ctx.stroke();
                break;

            case "image":
                // Clear area
                ctx.fillRect(
                    centerX - halfIcon - padding,
                    centerY - halfIcon - padding,
                    iconSize + padding * 2,
                    iconSize + padding * 2
                );
                this.drawCenterImage(ctx, imageUrl, centerX, centerY, iconSize);
                break;
        }

        // Draw text inside icon if provided (not for image type)
        if (iconText && iconType !== "image") {
            ctx.fillStyle = iconFg;
            const fontSize = Math.max(10, iconSize * 0.35);
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(iconText, centerX, centerY, iconSize * 0.85);
        }
    }

    private drawCenterImage(
        ctx: CanvasRenderingContext2D,
        url: string,
        centerX: number,
        centerY: number,
        iconSize: number
    ) {
        if (!url) return;

        // Cache the image to avoid reloading on every render
        if (url !== this.cachedImageUrl || !this.cachedImage) {
            this.cachedImageUrl = url;
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                this.cachedImage = img;
                // Redraw the image now that it's loaded
                ctx.drawImage(
                    img,
                    centerX - iconSize / 2,
                    centerY - iconSize / 2,
                    iconSize,
                    iconSize
                );
            };
            img.src = url;
        } else if (this.cachedImage) {
            ctx.drawImage(
                this.cachedImage,
                centerX - iconSize / 2,
                centerY - iconSize / 2,
                iconSize,
                iconSize
            );
        }
    }

    private showMessage(msg: string) {
        this.cardDiv.style.display = "none";
        this.messageDiv.style.display = "flex";
        this.messageDiv.textContent = msg;
    }

    private hideMessage() {
        this.cardDiv.style.display = "flex";
        this.messageDiv.style.display = "none";
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}