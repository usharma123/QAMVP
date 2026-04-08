import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockApiService, Trade } from '../../services/mock-api.service';

@Component({
  selector: 'app-queue',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './queue.component.html',
  styleUrl: './queue.component.css',
})
export class QueueComponent implements OnInit {
  trades: Trade[] = [];
  loading = true;
  approving: string | null = null;
  toastMessage = '';
  showToast = false;

  constructor(private api: MockApiService) {}

  ngOnInit(): void {
    this.loadQueue();
  }

  approve(txId: string): void {
    this.approving = txId;
    this.api.approveTrade(txId).subscribe({
      next: (ok) => {
        this.approving = null;
        if (ok) {
          this.toastMessage = `Trade ${txId} approved`;
          this.showToast = true;
          setTimeout(() => { this.showToast = false; }, 3000);
          this.loadQueue();
        }
      },
      error: () => {
        this.approving = null;
      },
    });
  }

  private loadQueue(): void {
    this.loading = true;
    this.api.getQueue().subscribe({
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
