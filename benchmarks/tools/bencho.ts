import { performance } from 'perf_hooks';

export type PromiseLike<T = void> = Promise<T> | T;

type BenchmarkFunction = (benchmark: Benchmark) => void | Promise<void>;

interface Measurement {
    name: string;
    start: number;
    duration?: number;
    children: Measurement[];
    level: number;
}

interface AggregatedMeasurement {
    name: string;
    level: number;
    children: AggregatedMeasurement[];
    durations: number[];
    averageDuration: number;
    medianDuration: number;
    minDuration: number;
    maxDuration: number;
}

export class Benchmark {
    private measurements: Measurement[][] = [];
    private currentMeasurement: Measurement | null = null;
    private currentRun: number = 0;

    static async runMultiple(name: string, fn: BenchmarkFunction, runs: number): Promise<Benchmark> {
        const benchmark = new Benchmark();
        for (let i = 0; i < runs; i++) {
            benchmark.currentRun = i;
            await benchmark.measure(name, fn);
        }
        return benchmark;
    }

    static async results(benchmarks: Benchmark | Promise<Benchmark>): Promise<void> {
        const b = await Promise.resolve(benchmarks);
        b.output();
    }

    async measure(name: string, fn: BenchmarkFunction): Promise<Benchmark> {
        const start = performance.now();
        const prevMeasurement = this.currentMeasurement;
        this.currentMeasurement = { name, start, children: [], level: (prevMeasurement?.level ?? 0) + 1 };

        if (prevMeasurement) {
            prevMeasurement.children.push(this.currentMeasurement);
        } else {
            if (!this.measurements[this.currentRun]) {
                this.measurements[this.currentRun] = [];
            }
            this.measurements[this.currentRun].push(this.currentMeasurement);
        }

        await Promise.resolve(fn(this));

        const end = performance.now();
        if (this.currentMeasurement)
            this.currentMeasurement.duration = end - start;
        this.currentMeasurement = prevMeasurement;

        return this;
    }

    section(name: string, fn: BenchmarkFunction): PromiseLike<Benchmark> {
        return this.measure(name, fn);
    }

    private aggregateMeasurements(): AggregatedMeasurement[] {
        const aggregated: AggregatedMeasurement[] = [];

        this.measurements.forEach(run => {
            this.aggregateRun(run, aggregated);
        });

        return this.calculateStatistics(aggregated);
    }

    private aggregateRun(measurements: Measurement[], aggregated: AggregatedMeasurement[]) {
        measurements.forEach(measurement => {
            this.aggregateMeasurement(measurement, aggregated);
        });
    }

    private aggregateMeasurement(measurement: Measurement, aggregated: AggregatedMeasurement[]) {
        let aggregatedMeasurement = aggregated.find(m => m.name === measurement.name && m.level === measurement.level);

        if (!aggregatedMeasurement) {
            aggregatedMeasurement = {
                name: measurement.name,
                level: measurement.level,
                children: [],
                durations: [],
                averageDuration: 0,
                medianDuration: 0,
                minDuration: Infinity,
                maxDuration: -Infinity
            };
            aggregated.push(aggregatedMeasurement);
        }

        aggregatedMeasurement.durations.push(measurement.duration!);

        measurement.children.forEach(childMeasurement => {
            this.aggregateMeasurement(childMeasurement, aggregatedMeasurement?.children ?? []);
        });
    }

    private calculateStatistics(aggregated: AggregatedMeasurement[]): AggregatedMeasurement[] {
        aggregated.forEach(measurement => {
            measurement.averageDuration = this.average(measurement.durations);
            measurement.medianDuration = this.median(measurement.durations);
            measurement.minDuration = Math.min(...measurement.durations);
            measurement.maxDuration = Math.max(...measurement.durations);
            this.calculateStatistics(measurement.children);
        });

        return aggregated;
    }

    private average(numbers: number[]): number {
        return numbers.reduce((a, b) => a + b, 0) / numbers.length;
    }

    private median(numbers: number[]): number {
        const sorted = numbers.slice().sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1] + sorted[middle]) / 2;
        }
        return sorted[middle];
    }

    private output(): void {
        console.log(`\n=== Benchmark Results (${this.measurements.length} runs) ===\n`);
        const aggregated = this.aggregateMeasurements();
        aggregated.forEach(measurement => this.displayAggregatedMeasurement(measurement));
    }

    private displayAggregatedMeasurement(measurement: AggregatedMeasurement, depth: number = 0): void {
        const indent = '  '.repeat(depth);
        console.log(`${indent}${measurement.name}:`);
        console.log(`${indent}  Average: ${this.formatDuration(measurement.averageDuration)}`);
        console.log(`${indent}  Median:  ${this.formatDuration(measurement.medianDuration)}`);
        console.log(`${indent}  Min:     ${this.formatDuration(measurement.minDuration)}`);
        console.log(`${indent}  Max:     ${this.formatDuration(measurement.maxDuration)}`);

        measurement.children.forEach(child => this.displayAggregatedMeasurement(child, depth + 1));
    }

    private formatDuration(duration: number): string {
        return `${duration.toFixed(3)}ms`;
    }

    sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}