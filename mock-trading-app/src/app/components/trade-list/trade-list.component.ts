import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockApiService, Trade } from '../../services/mock-api.service';

@Component({
  selector: 'app-trade-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trade-list.component.html',
  styleUrl: './trade-list.component.css',
})
export class TradeListComponent implements OnInit {
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

  get pendingCount(): number {
    return this.trades.filter((t) => t.status === 'Pending').length;
  }

  get matchedCount(): number {
    return this.trades.filter((t) => t.status === 'Matched').length;
  }
}
