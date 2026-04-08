import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, tap } from 'rxjs/operators';

export type TradeSide = 'BUY' | 'SELL';
export type TradeStatus = 'pending_approval' | 'Pending' | 'Matched' | 'Unmatched';
export type UserRole = 'maker' | 'checker';

export interface AppUser {
  username: string;
  role: UserRole;
}

export interface Trade {
  txId: string;
  side: TradeSide;
  sector: string;
  ticker: string;
  accountType: string;
  quantity: number;
  timeInForce: string;
  expirationDate?: string | null;
  currentPrice: number;
  totalValue: number;
  status: TradeStatus;
  matchedWith?: string | null;
}

const CREDENTIALS: Record<string, { password: string; role: UserRole }> = {
  admin: { password: 'admin', role: 'maker' },
  checker: { password: 'chscker@123', role: 'checker' },
};

const STORAGE_KEY = 'mock_trading_trades';
const COUNTER_KEY = 'mock_trading_tx_counter';

@Injectable({ providedIn: 'root' })
export class MockApiService {
  private readonly LATENCY_MS = 1500;
  private trades: Trade[] = this.loadTrades();
  private txCounter = this.loadTxCounter();
  private currentUser: AppUser | null = null;

  private loadTrades(): Trade[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private loadTxCounter(): number {
    try {
      const raw = localStorage.getItem(COUNTER_KEY);
      return raw ? parseInt(raw, 10) : 1000;
    } catch {
      return 1000;
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.trades));
      localStorage.setItem(COUNTER_KEY, String(this.txCounter));
    } catch {
      /* ignore */
    }
  }

  login(username: string, password: string): Observable<AppUser | null> {
    const entry = CREDENTIALS[username];
    const user = entry && entry.password === password
      ? { username, role: entry.role }
      : null;
    return of(user).pipe(
      delay(this.LATENCY_MS),
      tap((u) => { this.currentUser = u; }),
    );
  }

  logout(): void {
    this.currentUser = null;
  }

  getCurrentUser(): AppUser | null {
    return this.currentUser;
  }

  getTrades(): Observable<Trade[]> {
    const approved = this.trades.filter((t) => t.status !== 'pending_approval');
    return of([...approved]).pipe(delay(this.LATENCY_MS));
  }

  getQueue(): Observable<Trade[]> {
    const pending = this.trades.filter((t) => t.status === 'pending_approval');
    return of([...pending]).pipe(delay(this.LATENCY_MS));
  }

  submitTrade(tradeData: Omit<Trade, 'txId' | 'status' | 'matchedWith'>): Observable<string> {
    this.txCounter += 1;
    const txId = `TX-${this.txCounter}`;

    const newTrade: Trade = {
      ...tradeData,
      txId,
      status: 'pending_approval',
      matchedWith: null,
    };

    this.trades.push(newTrade);
    this.persist();
    return of(txId).pipe(delay(this.LATENCY_MS));
  }

  approveTrade(txId: string): Observable<boolean> {
    const trade = this.trades.find((t) => t.txId === txId && t.status === 'pending_approval');
    if (!trade) {
      return of(false).pipe(delay(500));
    }
    trade.status = 'Pending';
    this.runMatching(trade);
    this.persist();
    return of(true).pipe(delay(500));
  }

  fetchTickerPrice(ticker: string): Observable<number> {
    const prices: Record<string, number> = {
      AAPL: 178.5,
      MSFT: 415.2,
      NVDA: 875.0,
      JPM: 198.3,
      BAC: 35.6,
      V: 278.9,
    };
    const price = prices[ticker] ?? Math.round((50 + Math.random() * 500) * 100) / 100;
    return of(price).pipe(delay(this.LATENCY_MS));
  }

  private runMatching(incoming: Trade): void {
    const oppositeSide: TradeSide = incoming.side === 'BUY' ? 'SELL' : 'BUY';

    const match = this.trades.find(
      (t) =>
        t.txId !== incoming.txId &&
        t.status === 'Pending' &&
        t.side === oppositeSide &&
        t.ticker === incoming.ticker &&
        t.currentPrice === incoming.currentPrice &&
        t.quantity === incoming.quantity
    );

    if (match) {
      match.status = 'Matched';
      match.matchedWith = incoming.txId;
      incoming.status = 'Matched';
      incoming.matchedWith = match.txId;
    }
  }
}
