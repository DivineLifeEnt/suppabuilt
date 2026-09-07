/** Track seen event IDs to suppress duplicates (bounded ring buffer, max 1000) */
export class IdempotencyTracker {
  private seen = new Set<string>();
  private queue: string[] = [];
  readonly maxSize = 1000;

  has(id: string): boolean {
    return this.seen.has(id);
  }

  add(id: string): void {
    if (this.seen.has(id)) return;
    if (this.queue.length >= this.maxSize) {
      const oldest = this.queue.shift();
      if (oldest) this.seen.delete(oldest);
    }
    this.seen.add(id);
    this.queue.push(id);
  }
}
