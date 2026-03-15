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
import * as d3 from "d3";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import DataView = powerbi.DataView;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewValueColumn = powerbi.DataViewValueColumn;
import PrimitiveValue = powerbi.PrimitiveValue;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import { VisualFormattingSettingsModel } from "./settings";

interface PieChartDataPoint {
    category: string;
    value: number;
    color: string;
    selectionId: powerbi.visuals.ISelectionId;
}

export class Visual implements IVisual {
    private target: HTMLElement;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private host: IVisualHost;
    private selectionManager: ISelectionManager;
    private svg: d3.Selection<SVGElement, unknown, null, undefined>;
    private container: d3.Selection<SVGGElement, unknown, null, undefined>;
    private pieContainer: d3.Selection<SVGGElement, unknown, null, undefined>;
    private labelsContainer: d3.Selection<SVGGElement, unknown, null, undefined>;
    private dataPoints: PieChartDataPoint[];

    constructor(options: VisualConstructorOptions) {
        console.log('Visual constructor', options);
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        this.host = options.host;
        this.selectionManager = this.host.createSelectionManager();

        // Create SVG element
        this.svg = d3.select(this.target)
            .append('svg')
            .classed('pieChart', true);

        this.container = this.svg.append('g')
            .classed('container', true);

        this.pieContainer = this.container.append('g')
            .classed('pieContainer', true);

        this.labelsContainer = this.container.append('g')
            .classed('labelsContainer', true);
    }

    public update(options: VisualUpdateOptions) {
        const dataView: DataView = options.dataViews[0];

        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, dataView);

        const width: number = options.viewport.width;
        const height: number = options.viewport.height;

        this.svg.attr("width", width).attr("height", height);

        if (!dataView) {
            return;
        }

        this.dataPoints = this.createDataPoints(dataView);
        this.renderPieChart(width, height);
    }

    private createDataPoints(dataView: DataView): PieChartDataPoint[] {
        const categorical = dataView.categorical;
        const dataPoints: PieChartDataPoint[] = [];

        if (!categorical || !categorical.categories || !categorical.values) {
            return dataPoints;
        }

        const categories: DataViewCategoryColumn = categorical.categories[0];
        const values: DataViewValueColumn = categorical.values[0];

        const colorPalette = this.host.colorPalette;
        const defaultColor = this.formattingSettings.dataPointCard.defaultColor.value.value;

        for (let i = 0; i < Math.min(categories.values.length, values.values.length); i++) {
            const categoryValue: PrimitiveValue = categories.values[i];
            const value: number = <number>values.values[i];

            if (categoryValue != null && value != null) {
                const color = colorPalette.getColor(categoryValue.toString()).value || defaultColor;
                
                const selectionId: powerbi.visuals.ISelectionId = this.host.createSelectionIdBuilder()
                    .withCategory(categories, i)
                    .createSelectionId();

                dataPoints.push({
                    category: categoryValue.toString(),
                    value: value,
                    color: color,
                    selectionId: selectionId
                });
            }
        }

        return dataPoints;
    }

    private renderPieChart(width: number, height: number): void {
        const radius = Math.min(width, height) / 2 - 40;
        const centerX = width / 2;
        const centerY = height / 2;

        this.container.attr("transform", `translate(${centerX}, ${centerY})`);

        // Create pie layout
        const pie = d3.pie<PieChartDataPoint>()
            .value(d => d.value)
            .sort(null);

        // Create arc generator
        const arc = d3.arc<d3.PieArcDatum<PieChartDataPoint>>()
            .innerRadius(0)
            .outerRadius(radius);

        // Create arc for labels
        const labelArc = d3.arc<d3.PieArcDatum<PieChartDataPoint>>()
            .innerRadius(radius + 10)
            .outerRadius(radius + 10);

        // Bind data and create arcs
        const arcs = this.pieContainer.selectAll<SVGGElement, d3.PieArcDatum<PieChartDataPoint>>(".arc")
            .data(pie(this.dataPoints));

        // Remove old arcs
        arcs.exit().remove();

        // Create new arcs
        const arcsEnter = arcs.enter().append<SVGGElement>("g")
            .classed("arc", true);

        arcsEnter.append("path");
        arcsEnter.append("text");

        // Update arcs
        const arcsUpdate = arcsEnter.merge(arcs);

        // Update paths
        arcsUpdate.select("path")
            .attr("d", arc)
            .attr("fill", d => d.data.color)
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
            .style("cursor", "pointer")
            .on("click", (event, d) => {
                this.selectionManager.select(d.data.selectionId).then((ids: powerbi.visuals.ISelectionId[]) => {
                    this.syncSelectionState(arcsUpdate, ids);
                });
                event.stopPropagation();
            })
            .on("mouseover", (event, d) => {
                // Show tooltip
                this.host.tooltipService.show({
                    dataItems: [{
                        displayName: d.data.category,
                        value: d.data.value.toString()
                    }],
                    identities: [d.data.selectionId],
                    coordinates: [event.clientX, event.clientY],
                    isTouchEvent: false
                });
            })
            .on("mouseout", () => {
                this.host.tooltipService.hide({
                    immediately: true,
                    isTouchEvent: false
                });
            });

        // Update labels
        if (this.formattingSettings.dataPointCard.showLabels.value) {
            arcsUpdate.select("text")
                .attr("transform", d => `translate(${labelArc.centroid(d)})`)
                .attr("text-anchor", "middle")
                .attr("dy", ".35em")
                .style("font-size", `${this.formattingSettings.dataPointCard.fontSize.value}px`)
                .style("fill", "#000")
                .text(d => {
                    const percent = ((d.endAngle - d.startAngle) / (2 * Math.PI) * 100).toFixed(1);
                    return `${d.data.category} (${percent}%)`;
                });
        } else {
            arcsUpdate.select("text").text("");
        }

        // Handle selection on background click
        this.svg.on("click", () => {
            this.selectionManager.clear();
            this.syncSelectionState(arcsUpdate, []);
        });

        // Initialize selection state
        this.syncSelectionState(arcsUpdate, this.selectionManager.getSelectionIds() as powerbi.visuals.ISelectionId[]);
    }

    private syncSelectionState(selection: d3.Selection<SVGGElement, d3.PieArcDatum<PieChartDataPoint>, SVGGElement, unknown>, selectionIds: powerbi.visuals.ISelectionId[]): void {
        if (!selection || !selectionIds) {
            return;
        }

        selection.select("path").style("opacity", (d: d3.PieArcDatum<PieChartDataPoint>) => {
            const isSelected = selectionIds.some(id => id.equals(d.data.selectionId));
            return selectionIds.length > 0 ? (isSelected ? 1.0 : 0.5) : 1.0;
        });
    }

    /**
     * Returns properties pane formatting model content hierarchies, properties and latest formatting values, Then populate properties pane.
     * This method is called once every time we open properties pane or when the user edit any format property. 
     */
    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}