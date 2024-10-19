import { Engine } from '../src/engine';
import { random } from "./tools/random";
import { Benchmark } from './tools/bencho';

class PositionComponent { constructor(public x: number, public y: number) { } }
class VelocityComponent { constructor(public dx: number, public dy: number) { } }


var benchmark = Benchmark.runMultiple("app", async b => {
    random.reset();
    let engine: Engine; // We'll initialize this in the run phase

    await b.section("setup", () => {
        engine = new Engine();
    });

    await b.section("systems", () => {
        engine.createSystem([PositionComponent, VelocityComponent], {
            act: (_, pos: PositionComponent, vel: VelocityComponent) => {
                pos.x += vel.dx;
                pos.y += vel.dy; // Complex operation: move entity by velocity
            },
        });
    });

    await b.section("entities", async c => {
        for (let i = 0; i < 10; i++) {
            await c.section(`entity_${i}`, async d => {
                const entity = engine.createEntity();
                await d.section("add_component", () => {
                    entity.addComponent(PositionComponent, random.next() * 100, random.next() * 100);
                    entity.addComponent(VelocityComponent, random.next() * 10, random.next() * 10);
                });
            });
        }
    });

    await b.section("run", async () => {
        await engine.run(0, 50);
    });
}, 20);

Benchmark.results(benchmark);