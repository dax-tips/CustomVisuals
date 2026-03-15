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
import "./../style/visual.less";
import * as d3 from "d3";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IViewport = powerbi.IViewport;
import DataView = powerbi.DataView;
import DataViewCategorical = powerbi.DataViewCategorical;

import { VisualFormattingSettingsModel } from "./settings";

interface ColumnChartDataPoint {
    category: string;
    value: number;
    color: string;
    facet?: string;
}

interface FacetData {
    facetName: string;
    dataPoints: ColumnChartDataPoint[];
}

export class Visual implements IVisual {
    private target: HTMLElement;
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private dataPoints: ColumnChartDataPoint[];
    private facetData: FacetData[];

    constructor(options: VisualConstructorOptions) {
        console.log('Visual constructor', options);
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;

        // Create SVG element
        this.svg = d3.select(this.target)
            .append('svg')
            .classed('columnChart', true);
    }

    private getMargins() {
        return {
            top: this.formattingSettings.chartLayoutCard.marginTop.value,
            right: this.formattingSettings.chartLayoutCard.marginRight.value,
            bottom: this.formattingSettings.chartLayoutCard.marginBottom.value,
            left: this.formattingSettings.chartLayoutCard.marginLeft.value
        };
    }

    private getFacetPadding(): number {
        return this.formattingSettings.chartLayoutCard.facetPadding.value;
    }

    private getMaxFacetsPerRow(): number {
        return this.formattingSettings.chartLayoutCard.maxFacetsPerRow.value;
    }

    public update(options: VisualUpdateOptions) {
        // Validate input options
        if (!options || !options.dataViews || !options.dataViews[0]) {
            console.warn('No data provided to visual');
            this.clearVisual();
            return;
        }

        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews[0]);

        console.log('Visual update', options);
        
        // Extract data from dataViews
        this.dataPoints = this.visualTransform(options);
        
        if (this.dataPoints.length === 0) {
            console.warn('No valid data points found');
            this.clearVisual();
            return;
        }

        this.facetData = this.groupDataByFacet(this.dataPoints);
        
        // Get viewport dimensions
        const viewport: IViewport = options.viewport;
        const width = Math.max(viewport.width, 100); // Minimum width
        const height = Math.max(viewport.height, 100); // Minimum height

        // Update SVG dimensions
        this.svg
            .attr('width', width)
            .attr('height', height);

        // Clear previous content
        this.svg.selectAll('.facetGroup').remove();

        // If no facets, render as single chart
        if (this.facetData.length === 0 || !this.dataPoints.some(d => d.facet)) {
            this.renderSingleChart(width, height);
            return;
        }

        // Calculate facet layout
        const facetCount = this.facetData.length;
        const facetsPerRow = Math.min(Math.ceil(Math.sqrt(facetCount)), this.getMaxFacetsPerRow());
        const facetRows = Math.ceil(facetCount / facetsPerRow);
        
        const margin = this.getMargins();
        const facetPadding = this.getFacetPadding();
        
        const availableWidth = width - margin.left - margin.right;
        const availableHeight = height - margin.top - margin.bottom;
        
        const facetWidth = Math.max((availableWidth - (facetsPerRow - 1) * facetPadding) / facetsPerRow, 100);
        const facetHeight = Math.max((availableHeight - (facetRows - 1) * facetPadding) / facetRows, 100);

        // Render each facet
        this.facetData.forEach((facet, index) => {
            const row = Math.floor(index / facetsPerRow);
            const col = index % facetsPerRow;
            
            const x = margin.left + col * (facetWidth + facetPadding);
            const y = margin.top + row * (facetHeight + facetPadding);
            
            this.renderFacetChart(facet, x, y, facetWidth, facetHeight);
        });
    }

    private clearVisual() {
        this.svg.selectAll('*').remove();
    }

    private renderSingleChart(width: number, height: number) {
        // Calculate chart dimensions
        const margin = this.getMargins();
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        // Create chart group
        const chartGroup = this.svg.append('g')
            .classed('facetGroup', true)
            .attr('transform', `translate(${margin.left}, ${margin.top})`);

        this.renderChart(chartGroup, this.dataPoints, chartWidth, chartHeight, 0);
    }

    private renderFacetChart(facet: FacetData, x: number, y: number, width: number, height: number) {
        // Create facet group
        const facetGroup = this.svg.append('g')
            .classed('facetGroup', true)
            .attr('transform', `translate(${x}, ${y})`);

        // Add facet title if enabled
        if (this.formattingSettings.facetTitlesCard.showFacetTitles.value) {
            facetGroup.append('text')
                .classed('facetTitle', true)
                .attr('x', width / 2)
                .attr('y', -5)
                .attr('text-anchor', 'middle')
                .attr('font-size', `${this.formattingSettings.facetTitlesCard.facetTitleFontSize.value}px`)
                .attr('font-weight', this.formattingSettings.facetTitlesCard.facetTitleWeight.value.value)
                .attr('fill', this.formattingSettings.facetTitlesCard.facetTitleColor.value.value)
                .text(facet.facetName);
        }

        // Calculate chart area (subtract space for title if shown)
        const titleSpace = this.formattingSettings.facetTitlesCard.showFacetTitles.value ? 20 : 0;
        const chartHeight = height - titleSpace;

        // Render the chart for this facet
        this.renderChart(facetGroup, facet.dataPoints, width, chartHeight, titleSpace);
    }

    private renderChart(container: d3.Selection<SVGGElement, unknown, null, undefined>, data: ColumnChartDataPoint[], width: number, height: number, yOffset: number = 0) {
        if (data.length === 0 || width <= 0 || height <= 0) return;

        // Create scales with proper domains
        const barPadding = this.formattingSettings.chartLayoutCard.barPadding.value;
        const xScale = d3.scaleBand()
            .domain(data.map(d => d.category))
            .range([0, width])
            .padding(barPadding);

        const maxValue = d3.max(data, d => d.value) || 0;
        const yScale = d3.scaleLinear()
            .domain([0, maxValue * 1.1]) // Add 10% padding at top
            .range([height, 0])
            .nice(); // Round to nice numbers

        // Create chart content group with offset for title
        const chartGroup = container.append('g')
            .attr('transform', `translate(0, ${yOffset})`);

        // Create bars with animation if enabled
        const bars = chartGroup.selectAll<SVGRectElement, ColumnChartDataPoint>('.bar')
            .data(data);

        const barsEnter = bars.enter()
            .append('rect')
            .classed('bar', true);

        const animationDuration = this.formattingSettings.generalCard.animationDuration.value;
        const hoverOpacity = this.formattingSettings.generalCard.hoverOpacity.value;

        barsEnter.merge(bars)
            .attr('x', d => xScale(d.category) || 0)
            .attr('y', d => yScale(Math.max(0, d.value)))
            .attr('width', xScale.bandwidth())
            .attr('height', d => Math.max(0, height - yScale(Math.max(0, d.value))))
            .attr('fill', d => d.color)
            .attr('stroke', 'none')
            .style('transition', `opacity ${animationDuration}ms`)
            .on('mouseover', function() {
                d3.select(this).style('opacity', hoverOpacity);
            })
            .on('mouseout', function() {
                d3.select(this).style('opacity', 1);
            });

        bars.exit().remove();

        // Create/update x-axis if enabled and there's space
        if (this.formattingSettings.axisCard.showXAxis.value && height > 40) {
            const xAxis = chartGroup.append('g')
                .classed('x-axis', true)
                .attr('transform', `translate(0, ${height})`)
                .call(d3.axisBottom(xScale) as any);

            // Style axis
            xAxis.selectAll('text')
                .attr('font-size', `${this.formattingSettings.axisCard.axisFontSize.value}px`)
                .attr('fill', this.formattingSettings.axisCard.axisColor.value.value);

            xAxis.selectAll('line, path')
                .attr('stroke', this.formattingSettings.axisCard.axisColor.value.value);

            // Rotate labels if enabled and they're too long
            if (this.formattingSettings.axisCard.rotateXLabels.value && xScale.bandwidth() < 60) {
                xAxis.selectAll('text')
                    .style('text-anchor', 'end')
                    .attr('dx', '-.8em')
                    .attr('dy', '.15em')
                    .attr('transform', 'rotate(-45)');
            }
        }

        // Create/update y-axis if enabled and there's space
        if (this.formattingSettings.axisCard.showYAxis.value && width > 40 && maxValue > 0) {
            const tickCount = Math.min(this.formattingSettings.axisCard.yAxisTicks.value, height / 40);
            const yAxis = chartGroup.append('g')
                .classed('y-axis', true)
                .call(d3.axisLeft(yScale).ticks(tickCount) as any);

            // Style axis
            yAxis.selectAll('text')
                .attr('font-size', `${this.formattingSettings.axisCard.axisFontSize.value}px`)
                .attr('fill', this.formattingSettings.axisCard.axisColor.value.value);

            yAxis.selectAll('line, path')
                .attr('stroke', this.formattingSettings.axisCard.axisColor.value.value);
        }
    }

    private groupDataByFacet(dataPoints: ColumnChartDataPoint[]): FacetData[] {
        if (!dataPoints.some(d => d.facet)) {
            return [];
        }

        const grouped = d3.group(dataPoints, d => d.facet || 'Unknown');
        const facetData: FacetData[] = [];

        grouped.forEach((points, facetName) => {
            facetData.push({
                facetName: facetName,
                dataPoints: points
            });
        });

        return facetData.sort((a, b) => a.facetName.localeCompare(b.facetName));
    }

    private visualTransform(options: VisualUpdateOptions): ColumnChartDataPoint[] {
        const dataViews = options.dataViews;
        const defaultColor = this.formattingSettings.dataPointCard.defaultColor.value.value || "#01B8AA";
        
        if (!dataViews
            || !dataViews[0]
            || !dataViews[0].categorical
            || !dataViews[0].categorical.categories
            || !dataViews[0].categorical.values) {
            return [];
        }

        const categorical = dataViews[0].categorical;
        const categories = categorical.categories;
        const dataValue = categorical.values[0];

        // Get the primary category (always first)
        const primaryCategory = categories[0];
        
        // Get the facet category (second category if it exists)
        const facetCategory = categories.length > 1 ? categories[1] : null;

        const dataPoints: ColumnChartDataPoint[] = [];
        
        for (let i = 0; i < Math.min(primaryCategory.values.length, dataValue.values.length); i++) {
            const categoryValue = primaryCategory.values[i];
            const value = dataValue.values[i];
            const facetValue = facetCategory ? facetCategory.values[i] : null;
            
            if (categoryValue != null && value != null) {
                dataPoints.push({
                    category: categoryValue.toString(),
                    value: Number(value),
                    color: defaultColor,
                    facet: facetValue ? facetValue.toString() : undefined
                });
            }
        }

        return dataPoints;
    }

    /**
     * Returns properties pane formatting model content hierarchies, properties and latest formatting values, Then populate properties pane.
     * This method is called once every time we open properties pane or when the user edit any format property. 
     */
    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}