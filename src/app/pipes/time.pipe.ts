import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'timeFormat'
})
export class TimeFormatPipe implements PipeTransform {

    transform(seconds: number): string {
        if (seconds == null || isNaN(seconds)) {
            return '';
        }

        const s = Number(seconds);

        // Less than 60 seconds: show seconds with 2 decimals.
        if (s < 60) {
            return `${s.toFixed(0)} sec`;
        }

        // Between 60 seconds and 1 hour: show minutes as integer and seconds with 2 decimals.
        if (s < 3600) {
            const minutes = Math.floor(s / 60);
            const sec = s % 60;
            return `${minutes} min ${sec.toFixed(0)} sec`;
        }

        // Between 1 hour and 1 day: show hours as integer and minutes with 2 decimals.
        if (s < 86400) {
            const hours = Math.floor(s / 3600);
            const minutes = (s % 3600) / 60;
            return `${hours} hr ${minutes.toFixed(0)} min`;
        }

        // Between 1 day and 1 week: show days as integer and hours with 2 decimals.
        if (s < 604800) { // 7 days * 86400 seconds
            const days = Math.floor(s / 86400);
            const hours = (s % 86400) / 3600;
            return `${days} day${days !== 1 ? 's' : ''} ${hours.toFixed(0)} hr`;
        }

        // 1 week or more: show weeks as integer and days with 2 decimals.
        const weeks = Math.floor(s / 604800);
        const days = (s % 604800) / 86400;
        return `${weeks} week${weeks !== 1 ? 's' : ''} ${days.toFixed(0)} day${days !== 1 ? 's' : ''}`;
    }
}
