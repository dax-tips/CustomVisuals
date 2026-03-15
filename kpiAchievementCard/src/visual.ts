"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

import { VisualFormattingSettingsModel } from "./settings";

export class Visual implements IVisual {
    private target: HTMLElement;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;

    constructor(options: VisualConstructorOptions) {
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
    }

    public update(options: VisualUpdateOptions) {
        this.target.innerHTML = '';

        const dataView = options.dataViews?.[0];
        if (!dataView?.categorical) {
            return;
        }

        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel, dataView);

        const categorical = dataView.categorical;
        const categories = categorical.categories?.[0]?.values || [];
        const count = categories.length || 1;

        // Find actual and target columns
        let actualCol: powerbi.DataViewValueColumn | undefined;
        let targetCol: powerbi.DataViewValueColumn | undefined;
        if (categorical.values) {
            for (const col of categorical.values) {
                if (col.source.roles['actualValue']) actualCol = col;
                if (col.source.roles['targetValue']) targetCol = col;
            }
        }

        // Read settings
        const gridSettings = this.formattingSettings.gridLayout;
        const cardSettings = this.formattingSettings.cardAppearance;
        const titleSettings = this.formattingSettings.titleSettings;
        const valueSettings = this.formattingSettings.valueSettings;
        const badgeSettings = this.formattingSettings.badgeSettings;
        const detailsSettings = this.formattingSettings.detailsSettings;
        const barSettings = this.formattingSettings.progressBarSettings;

        const du = Number(valueSettings.displayUnits.value) || 0;
        const dp = valueSettings.decimalPlaces.value;

        // Grid container
        const grid = this.el('div', 'kpi-grid');
        grid.style.gridTemplateColumns = `repeat(${gridSettings.columns.value}, 1fr)`;
        grid.style.gap = `${gridSettings.gap.value}px`;

        for (let i = 0; i < count; i++) {
            const title = categories[i]?.toString() || 'KPI';
            const actualValue = actualCol ? (Number(actualCol.values[i]) || 0) : 0;
            const targetValue = targetCol ? (Number(targetCol.values[i]) || 0) : 0;
            const hasTarget = !!targetCol;

            const achievementPct = targetValue !== 0 ? (actualValue / targetValue) * 100 : 0;
            const exceeded = actualValue - targetValue;
            const fillWidth = Math.min(Math.max(achievementPct, 0), 100);

            // Card
            const card = this.el('div', 'kpi-card');
            card.style.background = `linear-gradient(135deg, ${cardSettings.gradientStart.value.value} 0%, ${cardSettings.gradientEnd.value.value} 100%)`;
            card.style.borderRadius = `${cardSettings.borderRadius.value}px`;
            card.style.padding = `${gridSettings.innerPadding.value}px`;

            // Header
            const header = this.el('div', 'kpi-header');
            const titleEl = this.el('span', 'kpi-title');
            titleEl.textContent = title;
            titleEl.style.fontSize = `${titleSettings.titleFontSize.value}px`;
            titleEl.style.color = titleSettings.titleColor.value.value;
            header.appendChild(titleEl);

            if (hasTarget && badgeSettings.showBadge.value) {
                const isAchieved = achievementPct >= 100;
                const badge = this.el('span', isAchieved ? 'kpi-badge achieved' : 'kpi-badge not-achieved');
                const badgeColor = isAchieved
                    ? badgeSettings.achievedColor.value.value
                    : badgeSettings.notAchievedColor.value.value;
                badge.style.color = badgeColor;
                badge.style.borderColor = badgeColor;
                badge.textContent = `Achieved: ${Math.round(achievementPct)}%`;
                header.appendChild(badge);
            }
            card.appendChild(header);

            // Primary value
            const valueEl = this.el('div', 'kpi-value');
            valueEl.textContent = this.fmt(actualValue, du, dp);
            valueEl.style.fontSize = `${valueSettings.valueFontSize.value}px`;
            valueEl.style.color = valueSettings.valueColor.value.value;
            card.appendChild(valueEl);

            // Detail line
            if (hasTarget && detailsSettings.showDetails.value) {
                const details = this.el('div', 'kpi-details');
                details.style.fontSize = `${detailsSettings.detailsFontSize.value}px`;

                const tLabel = this.el('span', 'kpi-detail-label');
                tLabel.textContent = 'Target: ';
                tLabel.style.color = detailsSettings.labelColor.value.value;
                details.appendChild(tLabel);

                const tVal = this.el('span', 'kpi-detail-value');
                tVal.textContent = this.fmt(targetValue, du, dp);
                tVal.style.color = detailsSettings.detailValueColor.value.value;
                details.appendChild(tVal);

                const sep = this.el('span', 'kpi-separator');
                sep.textContent = '  |  ';
                details.appendChild(sep);

                const eLabel = this.el('span', 'kpi-detail-label');
                eLabel.textContent = exceeded >= 0 ? 'Exceeded: ' : 'Short by: ';
                eLabel.style.color = detailsSettings.labelColor.value.value;
                details.appendChild(eLabel);

                const eVal = this.el('span', 'kpi-detail-value');
                eVal.textContent = this.fmt(Math.abs(exceeded), du, dp);
                eVal.style.color = detailsSettings.detailValueColor.value.value;
                details.appendChild(eVal);

                card.appendChild(details);
            }

            // Progress bar
            if (hasTarget && barSettings.showProgressBar.value) {
                const wrapper = this.el('div', 'kpi-progress-wrapper');
                const track = this.el('div', 'kpi-progress-track');
                track.style.height = `${barSettings.barHeight.value}px`;
                track.style.borderRadius = `${barSettings.barHeight.value / 2}px`;
                track.style.backgroundColor = barSettings.trackColor.value.value;

                const fill = this.el('div', 'kpi-progress-fill');
                fill.style.width = `${fillWidth}%`;
                fill.style.backgroundColor = barSettings.barColor.value.value;
                fill.style.borderRadius = `${barSettings.barHeight.value / 2}px`;
                track.appendChild(fill);

                if (barSettings.showThreshold.value) {
                    const thresholdPct = barSettings.thresholdPercent.value;

                    const marker = this.el('div', 'kpi-threshold-marker');
                    marker.style.left = `${thresholdPct}%`;
                    marker.style.height = `${barSettings.barHeight.value + 8}px`;
                    marker.style.top = `-4px`;
                    marker.style.backgroundColor = barSettings.markerColor.value.value;
                    track.appendChild(marker);

                    wrapper.appendChild(track);

                    const label = this.el('div', 'kpi-threshold-label');
                    label.style.left = `${thresholdPct}%`;
                    label.textContent = `${thresholdPct}% of Target`;
                    wrapper.appendChild(label);
                } else {
                    wrapper.appendChild(track);
                }

                card.appendChild(wrapper);
            }

            grid.appendChild(card);
        }

        this.target.appendChild(grid);
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    private el(tag: string, className: string): HTMLElement {
        const e = document.createElement(tag);
        e.className = className;
        return e;
    }

    private fmt(value: number, displayUnits: number = 0, decimalPlaces: number = 0): string {
        let divisor = 1;
        let suffix = '';

        if (displayUnits === 0) {
            // Auto: pick based on magnitude
            if (Math.abs(value) >= 1e12) { divisor = 1e12; suffix = 'T'; }
            else if (Math.abs(value) >= 1e9) { divisor = 1e9; suffix = 'B'; }
            else if (Math.abs(value) >= 1e6) { divisor = 1e6; suffix = 'M'; }
            else if (Math.abs(value) >= 1e3) { divisor = 1e3; suffix = 'K'; }
        } else if (displayUnits > 1) {
            divisor = displayUnits;
            if (displayUnits === 1e3) suffix = 'K';
            else if (displayUnits === 1e6) suffix = 'M';
            else if (displayUnits === 1e9) suffix = 'B';
            else if (displayUnits === 1e12) suffix = 'T';
        }

        const scaled = value / divisor;
        return scaled.toLocaleString('en-US', {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces
        }) + suffix;
    }
}