// ============================================================
// modules/service/ErrorInfo.ts
// ============================================================

import { RequestStatus, ErrorEntry } from '../../types';

export class ErrorInfo {
  private errors: Map<RequestStatus, ErrorEntry> = new Map();

  add(status: RequestStatus, message: string): void {
    this.errors.set(status, { status, message, ts: Date.now() });
  }

  clear(status: RequestStatus): void {
    this.errors.delete(status);
  }

  clearAll(): void {
    this.errors.clear();
  }

  getLastMessage(): ErrorEntry | null {
    if (this.errors.size === 0) {
      return null;
    }
    const last = [...this.errors.values()].sort((a, b) => b.ts - a.ts)[0];
    return last;
  }

  has(status: RequestStatus): boolean {
    return this.errors.has(status);
  }
}
