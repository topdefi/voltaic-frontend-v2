import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MiningInfo {
    blocks: number;
    difficulty: number;
    networkhashps: number;
}

@Injectable({
    providedIn: 'root'
})
export class MiningInfoService {
    private apiUrl = 'https://voltaem.io/apis/mining-info'; // adjust the URL as needed

    constructor(private http: HttpClient) { }

    getMiningInfo(coin: string): Observable<MiningInfo> {
        return this.http.get<MiningInfo>(`${this.apiUrl}?coin=${coin}`);
    }
}
