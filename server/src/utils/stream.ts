type FlushCallback<T> = (items: T[]) => void;

export class BufferedStream<T> {
  private buffer: T[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly cooldownPeriod: number;
  private readonly flushCallback: FlushCallback<T>;

  constructor(cooldownPeriod: number, flushCallback: FlushCallback<T>) {
    this.cooldownPeriod = cooldownPeriod;
    this.flushCallback = flushCallback;
  }

  add(item: T): void {
    this.buffer.push(item);
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.flushTimer = setTimeout(() => this.flush(), this.cooldownPeriod);
  }

  flush(): void {
    if (this.buffer.length === 0) return;

    this.flushCallback(this.buffer);

    this.buffer = [];
    this.flushTimer = null;
  }
}
