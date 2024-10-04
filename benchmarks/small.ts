import { Engine } from '../src/engine';
import { random } from "./tools/random";
import { Benchmark } from './tools/bencho';
class SimpleComponent { constructor(public value: number) { } }

random.reset();

var benchmark = Benchmark.runMultiple("app", async b => {
    let engine: Engine; // We'll initialize this in the run phase

    await b.section("setup", () => {
        engine = new Engine();
    });

    await b.section("entities", async c => {
        for (let i = 0; i < 10; i++) {
            await c.section(`entity_${i}`, async d => {
                const entity = engine.createEntity();
                await d.section("add_component", () => {
                    entity.addComponent(SimpleComponent, random.next() * 100);
                });
            });
        }
    });

    await b.section("systems", () => {
        engine.createSystem([SimpleComponent], {
            act: (_, component: SimpleComponent) => {
                component.value += 1; // Simple operation
            },
        });
    });

    await b.section("run", async () => {
        await engine.run(0, 50);
    });
}, 5);

Benchmark.results(benchmark);