import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MockApiService } from '../../services/mock-api.service';

const SECTOR_TICKERS: Record<string, string[]> = {
  Technology: ['AAPL', 'MSFT', 'NVDA'],
  Financials: ['JPM', 'BAC', 'V'],
};

@Component({
  selector: 'app-trade',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './trade.component.html',
  styleUrl: './trade.component.css',
})
export class TradeComponent implements OnInit {
  form: FormGroup;
  sideOptions = ['BUY', 'SELL'];
  sectorOptions = ['Technology', 'Financials'];
  tickerOptions: string[] = [];
  accountTypeOptions = ['Cash', 'Margin'];
  timeInForceOptions = ['Day Order', 'GTC'];

  loadingPrice = false;
  submitting = false;
  toastMessage = '';
  showToast = false;

  constructor(
    private fb: FormBuilder,
    private api: MockApiService,
    private router: Router
  ) {
    this.form = this.fb.nonNullable.group({
      side: ['BUY', Validators.required],
      marketSector: ['', Validators.required],
      ticker: [{ value: '', disabled: true }, Validators.required],
      accountType: ['Cash', Validators.required],
      quantity: [null as number | null, [Validators.required, Validators.min(1)]],
      timeInForce: ['Day Order', Validators.required],
      expirationDate: [null as string | null],
      currentPrice: [{ value: null as number | null, disabled: true }],
      totalValue: [{ value: null as number | null, disabled: true }],
    });
  }

  ngOnInit(): void {
    this.form.get('marketSector')?.valueChanges.subscribe((sector) => {
      const tickerControl = this.form.get('ticker');
      tickerControl?.setValue('');
      tickerControl?.disable();
      this.form.patchValue({ currentPrice: null, totalValue: null });
      if (sector) {
        this.tickerOptions = SECTOR_TICKERS[sector] ?? [];
        tickerControl?.enable();
      } else {
        this.tickerOptions = [];
      }
    });

    this.form.get('ticker')?.valueChanges.subscribe((ticker) => {
      if (!ticker) {
        this.form.patchValue({ currentPrice: null, totalValue: null });
        return;
      }
      this.loadingPrice = true;
      this.api.fetchTickerPrice(ticker).subscribe({
        next: (price) => {
          this.form.patchValue({ currentPrice: price });
          this.updateTotalValue();
          this.loadingPrice = false;
        },
        error: () => {
          this.loadingPrice = false;
        },
      });
    });

    this.form.get('quantity')?.valueChanges.subscribe(() => this.updateTotalValue());
    this.form.get('currentPrice')?.valueChanges.subscribe(() => this.updateTotalValue());

    this.form.get('timeInForce')?.valueChanges.subscribe((tif) => {
      const expControl = this.form.get('expirationDate');
      if (tif === 'GTC') {
        expControl?.setValidators([Validators.required]);
      } else {
        expControl?.clearValidators();
        expControl?.setValue(null);
      }
      expControl?.updateValueAndValidity();
    });
  }

  get showExpirationDate(): boolean {
    return this.form.get('timeInForce')?.value === 'GTC';
  }

  get totalValueDisplay(): string {
    const v = this.form.get('totalValue')?.value;
    return v != null ? Number(v).toFixed(2) : '';
  }

  private updateTotalValue(): void {
    const q = this.form.get('quantity')?.value;
    const p = this.form.get('currentPrice')?.value;
    const total = q != null && p != null ? q * p : null;
    this.form.patchValue({ totalValue: total }, { emitEvent: false });
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting) return;
    this.submitting = true;

    const side = this.form.get('side')?.value;
    const sector = this.form.get('marketSector')?.value;
    const ticker = this.form.get('ticker')?.value;
    const accountType = this.form.get('accountType')?.value;
    const quantity = this.form.get('quantity')?.value;
    const timeInForce = this.form.get('timeInForce')?.value;
    const expirationDate = this.form.get('expirationDate')?.value;
    const currentPrice = this.form.get('currentPrice')?.value;
    const totalValue = this.form.get('totalValue')?.value;

    const tradeData = {
      side,
      sector,
      ticker,
      accountType,
      quantity,
      timeInForce,
      expirationDate: timeInForce === 'GTC' ? expirationDate : null,
      currentPrice,
      totalValue,
    };

    this.api.submitTrade(tradeData as any).subscribe({
      next: (txId) => {
        this.submitting = false;
        this.toastMessage = `Order ${txId} confirmed: ${side} ${quantity} shares of ${sector} stock ${ticker} in ${accountType} account.`;
        this.showToast = true;
        setTimeout(() => {
          this.router.navigate(['/queue']);
        }, 3000);
      },
      error: () => {
        this.submitting = false;
      },
    });
  }
}
