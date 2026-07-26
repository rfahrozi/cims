import { Injectable } from '@nestjs/common';

interface HistogramState {
  count: number;
  sum: number;
  buckets: Map<number, number>;
}

@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly histograms = new Map<string, HistogramState>();
  private readonly defaultBuckets = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

  increment(name: string, labels: Record<string, string> = {}, amount = 1): void {
    const key = this.key(name, labels);
    this.counters.set(key, (this.counters.get(key) ?? 0) + amount);
  }

  gauge(name: string, value: number, labels: Record<string, string> = {}): void {
    this.gauges.set(this.key(name, labels), value);
  }

  observe(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.key(name, labels);
    const state = this.histograms.get(key) ?? {
      count: 0,
      sum: 0,
      buckets: new Map(this.defaultBuckets.map((bucket) => [bucket, 0]))
    };
    state.count += 1;
    state.sum += value;
    for (const bucket of this.defaultBuckets) {
      if (value <= bucket) state.buckets.set(bucket, (state.buckets.get(bucket) ?? 0) + 1);
    }
    this.histograms.set(key, state);
  }

  render(): string {
    const lines: string[] = [];
    for (const [key, value] of this.counters.entries()) lines.push(`cims_${key} ${value}`);
    for (const [key, value] of this.gauges.entries()) lines.push(`cims_${key} ${value}`);
    for (const [key, state] of this.histograms.entries()) {
      const parsed = this.parseKey(key);
      for (const [bucket, count] of state.buckets.entries()) {
        lines.push(
          `cims_${parsed.name}_bucket${this.labels({ ...parsed.labels, le: String(bucket) })} ${count}`
        );
      }
      lines.push(
        `cims_${parsed.name}_bucket${this.labels({ ...parsed.labels, le: '+Inf' })} ${state.count}`
      );
      lines.push(`cims_${parsed.name}_count${this.labels(parsed.labels)} ${state.count}`);
      lines.push(`cims_${parsed.name}_sum${this.labels(parsed.labels)} ${state.sum}`);
    }
    return `${lines.join('\n')}\n`;
  }

  private key(name: string, labels: Record<string, string>): string {
    return `${name}${this.labels(labels)}`;
  }

  private labels(labels: Record<string, string>): string {
    const entries = Object.entries(labels).sort(([left], [right]) => left.localeCompare(right));
    if (entries.length === 0) return '';
    return `{${entries.map(([key, value]) => `${key}="${value.replaceAll('"', '\\"')}"`).join(',')}}`;
  }

  private parseKey(key: string): { name: string; labels: Record<string, string> } {
    const index = key.indexOf('{');
    if (index < 0) return { name: key, labels: {} };
    const name = key.slice(0, index);
    const body = key.slice(index + 1, -1);
    const labels: Record<string, string> = {};
    for (const item of body.split(',')) {
      const equal = item.indexOf('=');
      if (equal > 0) labels[item.slice(0, equal)] = item.slice(equal + 2, -1);
    }
    return { name, labels };
  }
}
