import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'diffRate'
})
export class DiffRatePipe implements PipeTransform {
    transform(value: number): string {
        if (value == null || isNaN(value)) {
            return '';
        }

        // Define the unit scale thresholds.
        const units = ['H', 'K', 'M', 'G', 'T', 'P'];
        let unitIndex = 0;

        // While the value is 1000 or larger, scale it down.
        while (value >= 1000 && unitIndex < units.length - 1) {
            value /= 1000;
            unitIndex++;
        }

        // Format with two decimals; adjust as needed.
        return `${value.toFixed(4)} ${units[unitIndex]}`;
    }
}
