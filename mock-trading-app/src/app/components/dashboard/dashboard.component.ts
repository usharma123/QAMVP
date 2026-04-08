import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockApiService, Trade } from '../../services/mock-api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  trades: Trade[] = [];
  loading = true;

  constructor(private api: MockApiService) {}

  ngOnInit(): void {
    this.api.getTrades().subscribe({
      next: (list) => {
        this.trades = list;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
