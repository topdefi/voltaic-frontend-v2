import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TimeToRetarget {
  coin: string;
  currentBlock: number;
  blocksRemaining: number;
  timeToRetarget: number;  // time in seconds
}

@Injectable({
  providedIn: 'root'
})
export class TimeToRetargetService {
  private apiUrl = 'https://voltaem.io/apis/time-to-retarget'; // Adjust the URL as needed

  constructor(private http: HttpClient) { }

  getTimeToRetarget(coin: string): Observable<TimeToRetarget> {
    return this.http.get<TimeToRetarget>(`${this.apiUrl}?coin=${coin}`);
  }
}
