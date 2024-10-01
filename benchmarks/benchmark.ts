import { benchmarkSuite } from "jest-bench";
import { Engine } from '../src/engine';

// Seeded random number generator for repeatability
function seededRandom(seed: number) {
    let m = 0x80000000; // 2**31;
    let a = 1103515245;
    let c = 12345;

    return function () {
        seed = (a * seed + c) % m;
        return seed / m;
    };
}

let random: () => number;

// Create a repeatable random generator
const resetRandom = () => {
    random = seededRandom(12345);
};


class SimpleComponent { constructor(public value: number) { } }
class PositionComponent { constructor(public x: number, public y: number) { } }
class VelocityComponent { constructor(public dx: number, public dy: number) { } }
class HealthComponent { constructor(public health: number) { } }
class AttackComponent { constructor(public attackPower: number) { } }
class DefenseComponent { constructor(public defense: number) { } }

// Define benchmarks with subsections
benchmarkSuite("Engine Performance Benchmarks", {
    "Simple Benchmark": async () => {
        const engine = new Engine();
        resetRandom();
        for (let i = 0; i < 10; i++) {
            var entity = engine.createEntity();
            entity.addComponent(SimpleComponent, random() * 100);
        }

        engine.createSystem([SimpleComponent], {
            act: (_, component: SimpleComponent) => {
                component.value += 1; // Simple operation
            },
        });

        await engine.run(0, 10);
    },

    "Complex Benchmark": async () => {
        const engine = new Engine();
        resetRandom();


        for (let i = 0; i < 10; i++) {
            const entity = engine.createEntity();
            entity.addComponent(PositionComponent, random() * 100, random() * 100);
            entity.addComponent(VelocityComponent, random() * 10, random() * 10);
        }

        engine.createSystem([PositionComponent, VelocityComponent], {
            act: (_, pos: PositionComponent, vel: VelocityComponent) => {
                pos.x += vel.dx;
                pos.y += vel.dy; // Complex operation: move entity by velocity
            },
        });

        await engine.run(0, 10);
    },

    "Large Benchmark": async () => {
        const engine = new Engine();
        resetRandom();

        for (let i = 0; i < 10; i++) {
            const entity = engine.createEntity();
            entity.addComponent(HealthComponent, random() * 100);
            entity.addComponent(AttackComponent, random() * 50);
            entity.addComponent(DefenseComponent, random() * 20);
        }

        engine.createSystem([HealthComponent, AttackComponent, DefenseComponent], {
            act: (_, health: HealthComponent, attack: AttackComponent, defense: DefenseComponent) => {
                health.health -= Math.max(0, attack.attackPower - defense.defense); // Combat simulation
            },
        });

        await engine.run(0, 10);
    }
});
