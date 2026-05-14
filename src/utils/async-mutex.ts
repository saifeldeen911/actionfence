/**
 * Simple async mutex that serialises concurrent operations.
 * Tracks waiter count so callers can decide when to evict
 * the mutex from a per-key pool without breaking queued waiters.
 */
export class AsyncMutex {
  private tail: Promise<void> = Promise.resolve();
  private waiterCount = 0;

  get hasWaiters(): boolean {
    return this.waiterCount > 0;
  }

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const previous = this.tail;
    this.tail = gate;
    this.waiterCount++;

    await previous;
    try {
      return await fn();
    } finally {
      this.waiterCount--;
      release();
    }
  }
}
