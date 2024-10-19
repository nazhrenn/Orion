import { Engine } from '../src/engine';
import { random } from "./tools/random";
import { Benchmark } from './tools/bencho';

class PositionComponent { constructor(public x: number, public y: number) { } }
class VelocityComponent { constructor(public dx: number, public dy: number) { } }
class HealthComponent { constructor(public health: number) { } }
class AttackComponent { constructor(public attackPower: number) { } }
class DefenseComponent { constructor(public defense: number) { } }
class RenderComponent { constructor(public sprite: string) { } }
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
        
        engine.createSystem([HealthComponent, AttackComponent, DefenseComponent], {
            act: (_, health: HealthComponent, attack: AttackComponent, defense: DefenseComponent) => {
                health.health -= Math.max(0, attack.attackPower - defense.defense); // Combat simulation
            },
        });

        engine.createSystem([PositionComponent, RenderComponent], {
            act: (_, pos: PositionComponent, render: RenderComponent) => {
                // Render entity on screen
              // console.log(`Rendering ${render.sprite} at (${pos.x}, ${pos.y})`);
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
                    entity.addComponent(HealthComponent, random.next() * 100);
                    entity.addComponent(AttackComponent, random.next() * 50);
                    entity.addComponent(DefenseComponent, random.next() * 20);
                    entity.addComponent(RenderComponent, `entity_${i}`);
                });
            });
        }
    });

    await b.section("run", async () => {
        await engine.run(0, 50);
    });
}, 5);

Benchmark.results(benchmark);