export class PerfTracker {
  private static instance = new PerfTracker();
  private marks: Record<string, number> = {};
  private measures: Record<string, number> = {};

  static get() { return PerfTracker.instance; }

  mark(name: string) {
    if (import.meta.env.DEV) {
      this.marks[name] = performance.now();
    }
  }

  measure(name: string, startMark: string, endMark?: string) {
    if (import.meta.env.DEV) {
      const startTime = this.marks[startMark] || performance.now();
      const endTime = endMark ? (this.marks[endMark] || performance.now()) : performance.now();
      this.measures[name] = (this.measures[name] || 0) + (endTime - startTime);
      return this.measures[name];
    }
    return 0;
  }

  print() {
    if (import.meta.env.DEV) {
      console.table(this.measures);
    }
  }

  reset() {
    this.marks = {};
    this.measures = {};
  }
}

export const perf = PerfTracker.get();
