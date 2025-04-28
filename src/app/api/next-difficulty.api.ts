import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface NextDifficulty {
    coin: string;
    currentBlock: number;
    startTimestamp: number;
    currentTimestamp: number;
    T_actual: number;
    T_expected: number;
    ratio: number;
    currentDifficulty: number;
    nextDifficulty: number;
}

@Injectable({
    providedIn: 'root'
})
export class NextDifficultyService {
    private apiUrl = 'https://voltaem.io/apis/next-difficulty'; // Ensure this URL is correct

    constructor(private http: HttpClient) { }

    getNextDifficulty(coin: string): Observable<NextDifficulty> {
        return this.http.get<NextDifficulty>(`${this.apiUrl}?coin=${coin}`);
    }
}
