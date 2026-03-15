import powerbi from "powerbi-visuals-api";
import { ScatterDataPoint, CategoryData, ScatterPlotData, TooltipDataItem } from "./dataInterfaces";

import DataView = powerbi.DataView;
import DataViewCategorical = powerbi.DataViewCategorical;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewValueColumns = powerbi.DataViewValueColumns;
import DataViewValueColumnGroup = powerbi.DataViewValueColumnGroup;
import PrimitiveValue = powerbi.PrimitiveValue;
import ISelectionIdBuilder = powerbi.visuals.ISelectionIdBuilder;

export class DataTransform {
    public static transform(
        dataView: DataView, 
        host: powerbi.extensibility.visual.IVisualHost
    ): ScatterPlotData {
        
        if (!dataView || 
            !dataView.categorical || 
            !dataView.categorical.categories || 
            !dataView.categorical.values ||
            dataView.categorical.categories.length === 0) {
            return this.getDefaultData();
        }

        const categorical = dataView.categorical;
        const categories = categorical.categories![0]; // Category for small multiples
        const values = categorical.values!;

        // Find the columns for X, Y, Size based on data roles
        const xAxisColumn = values.filter(col => col.source.roles && col.source.roles['xAxis'])[0];
        const yAxisColumn = values.filter(col => col.source.roles && col.source.roles['yAxis'])[0];
        const sizeColumn = values.filter(col => col.source.roles && col.source.roles['size'])[0];

        if (!xAxisColumn || !yAxisColumn) {
            return this.getDefaultData();
        }

        const hasSize = !!sizeColumn;
        const hasLegend = values.grouped && values.grouped().length > 1;

        // Group data by category (for small multiples)
        const categoryGroups = new Map<string, ScatterDataPoint[]>();
        
        let minX = Number.MAX_VALUE;
        let maxX = Number.MIN_VALUE;
        let minY = Number.MAX_VALUE;
        let maxY = Number.MIN_VALUE;
        let minSize = hasSize ? Number.MAX_VALUE : 1;
        let maxSize = hasSize ? Number.MIN_VALUE : 10;

        for (let i = 0; i < categories.values.length; i++) {
            const categoryValue = categories.values[i] ? categories.values[i].toString() : "Unknown";
            
            const xValue = this.getNumericValue(xAxisColumn.values[i]);
            const yValue = this.getNumericValue(yAxisColumn.values[i]);
            const sizeValue = hasSize ? this.getNumericValue(sizeColumn.values[i]) : 5;

            if (xValue === null || yValue === null) continue;

            // Update min/max values
            minX = Math.min(minX, xValue);
            maxX = Math.max(maxX, xValue);
            minY = Math.min(minY, yValue);
            maxY = Math.max(maxY, yValue);
            
            if (hasSize && sizeValue !== null) {
                minSize = Math.min(minSize, sizeValue);
                maxSize = Math.max(maxSize, sizeValue);
            }

            // Create selection ID for interactivity
            const selectionId = host.createSelectionIdBuilder()
                .withCategory(categories, i)
                .createSelectionId();

            // Create tooltips
            const tooltips: TooltipDataItem[] = [
                { displayName: categories.source.displayName, value: categoryValue },
                { displayName: xAxisColumn.source.displayName, value: xValue.toString() },
                { displayName: yAxisColumn.source.displayName, value: yValue.toString() }
            ];

            if (hasSize && sizeValue !== null) {
                tooltips.push({ 
                    displayName: sizeColumn.source.displayName, 
                    value: sizeValue.toString() 
                });
            }

            const dataPoint: ScatterDataPoint = {
                x: xValue,
                y: yValue,
                size: sizeValue || 5,
                category: categoryValue,
                legend: hasLegend ? this.getLegendValue(values, i) : undefined,
                identity: selectionId,
                tooltips: tooltips
            };

            if (!categoryGroups.has(categoryValue)) {
                categoryGroups.set(categoryValue, []);
            }
            categoryGroups.get(categoryValue)!.push(dataPoint);
        }

        // Convert map to array of CategoryData
        const categoryData: CategoryData[] = Array.from(categoryGroups.entries()).map(([name, dataPoints]) => ({
            name,
            dataPoints
        }));

        return {
            categories: categoryData,
            xAxisLabel: xAxisColumn.source.displayName || "X-Axis",
            yAxisLabel: yAxisColumn.source.displayName || "Y-Axis",
            hasSize,
            hasLegend,
            minX: minX === Number.MAX_VALUE ? 0 : minX,
            maxX: maxX === Number.MIN_VALUE ? 1 : maxX,
            minY: minY === Number.MAX_VALUE ? 0 : minY,
            maxY: maxY === Number.MIN_VALUE ? 1 : maxY,
            minSize: minSize === Number.MAX_VALUE ? 1 : minSize,
            maxSize: maxSize === Number.MIN_VALUE ? 10 : maxSize
        };
    }

    private static getNumericValue(value: PrimitiveValue): number | null {
        if (typeof value === 'number') {
            return value;
        }
        if (typeof value === 'string') {
            const parsed = parseFloat(value);
            return isNaN(parsed) ? null : parsed;
        }
        return null;
    }

    private static getLegendValue(values: DataViewValueColumns, index: number): string {
        // This is a simplified legend extraction - you might need to adjust based on your data structure
        if (values.grouped && values.grouped().length > 1) {
            const groups = values.grouped();
            for (const group of groups) {
                if (group.name) {
                    return group.name.toString();
                }
            }
        }
        return "Series 1";
    }

    private static getDefaultData(): ScatterPlotData {
        return {
            categories: [],
            xAxisLabel: "X-Axis",
            yAxisLabel: "Y-Axis",
            hasSize: false,
            hasLegend: false,
            minX: 0,
            maxX: 1,
            minY: 0,
            maxY: 1,
            minSize: 1,
            maxSize: 10
        };
    }
}