import { System } from "./system";
import { Entity } from "./entity";

import type { ComponentIdentifier, EngineEvents, EventCallback, SystemType } from "./definitions";

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export class Engine {
    #entities: Entity[] = [];
    #systems: System[] = [];
    #steps: number = 0;
    #active: boolean = false;

    /**
     * Creates and adds an Entity to the engine.
     */
    createEntity(): Entity {
        const entity = new Entity();
        this.#entities.push(entity);
        return entity;
    }

    /**
     * Adds a System to the engine.
     */
    createSystem<C extends any[] = any[]>(components: { [K in keyof C]: ComponentIdentifier<C[K]> }, options: SystemType): System<C> {
        // Spread the components as individual arguments when creating the System
        const system = new System<C>(...components);  // Correctly passing individual components

        const systemCallbacks = system as SystemType<C>;
        let mapped = false;
        for (const propName of Object.keys(options)) {
            var eventCallback = options[propName as keyof SystemType<C>] as EventCallback;
            if (eventCallback) {
                systemCallbacks[propName as keyof SystemType<C>] = eventCallback;
                mapped = true;
            }
        }

        this.#systems.push(mapped ? systemCallbacks as System<C> : system);

        return system as System<C>;
    }

    /**
     * Runs the engine at a specified interval until maxSteps is reached.
     */
    run(interval: number, maxSteps: number = 0): Promise<number> {
        this.#active = true;
        return new Promise(async (resolve) => {
            await this.runInternal(interval, maxSteps, () => resolve(this.#steps));
        });
    }

    private async runInternal(interval: number, maxSteps: number = 0, onComplete?: () => void): Promise<void> {
        this.dispatchSystemEvent('onStart')

        while (this.#active) {
            this.perform();

            if ((this.steps < maxSteps && maxSteps !== 0) || maxSteps === 0) {
                await sleep(interval);
            } else {
                this.#active = false;
            }
        }

        this.dispatchSystemEvent('onStop')

        onComplete && onComplete();
    }

    private dispatchSystemEvent(eventName: keyof EngineEvents, ...args: any[]): void {
        for (const system of this.#systems) {
            const method = system[eventName as keyof typeof system] as Function;
            if (typeof method === "function") {
                method.apply(system, args);
            }
        }
    }
    /**
     * Performs a single step of the engine.
     */
    perform(): void {
        for (const system of this.#systems) {
            system.step(this.#entities);
        }
        this.#steps++;
    }

    get steps(): number {
        return this.#steps;
    }

    get active(): boolean {
        return this.#active;
    }
}

