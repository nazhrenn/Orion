import type { ComponentIdentifier, EngineEvents, EntityDef, EventCallback, SystemType } from "./definitions";

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class Pool<T> {
    private available: T[] = [];

    constructor(private createFunc: () => T, private resetFunc: (item: T) => void) { }

    public acquire(): T {
        if (this.available.length > 0) {
            return this.available.pop()!;
        }
        return this.createFunc();
    }

    public release(item: T): void {
        this.resetFunc(item);
        this.available.push(item);
    }
}

class EntityManager {
    constructor(private engine: Engine) {
    }

    private activeEntities: Map<symbol, Entity> = new Map<symbol, Entity>();

    private systems: System[] = [];

    private entityPool = new Pool<Entity>(
        () => {
            var entity = Entity.create(this, this.engine)
            this.activeEntities.set(entity.id, entity);
            return entity;
        },
        (entity) => {
            this.activeEntities.delete(entity.id);
            entity.reset();
        }
    );

    public createEntity(): Entity {
        return this.entityPool.acquire();
    }

    public releaseEntity(entity: Entity): void {
        this.entityPool.release(entity);
    }

    public registerSystem(system: System): void {
        this.systems.push(system);
    }

    // public updateSystems(entity: Entity): void {
    //     for (const system of this.systems) {
    //         const matchesSystem = Array.from(system.requiredComponents).every(componentType =>
    //             entity.hasComponent(componentType.name));

    //         if (matchesSystem) {
    //             system.entities.add(entity);
    //         } else {
    //             system.entities.delete(entity);
    //         }
    //     }
    // }

    public cleanup(): void {
        this.activeEntities.forEach(entity => {
            if (entity.isMarkedForDeletion) {
                this.activeEntities.delete(entity.id);
                this.releaseEntity(entity); // Return entity to the pool
            }
        });
    }
}

class Entity implements EntityDef {
    private readonly _id: symbol;
    private _dirty: boolean = false;
    private _components: Map<string, any> = new Map();
    private _markedForDelete: boolean = false;

    private constructor(
        private entityManager: EntityManager,
        private engine: Engine) {
        this._id = Symbol(); // Generate a unique symbol for this entity
    }

    get id(): symbol {
        return this._id;
    }

    addComponent<T>(type: new (...args: any[]) => T, ...args: ConstructorParameters<typeof type>): this {
        if (!this._components.has(type.name)) {
            this._components.set(type.name, new type(...args)); // Spread args to match constructor
            this._dirty = true;
        }
        return this;
    }

    removeComponent(componentName: string): this {
        if (this._components.has(componentName)) {
            this._components.delete(componentName);
            this._dirty = true;
        }
        return this;
    }

    hasComponent(componentName: string): boolean {
        return this._components.has(componentName);
    }

    getComponent<T>(componentName: string): T | undefined {
        return this._components.get(componentName) as T | undefined;
    }

    get isDirty(): boolean {
        return this._dirty;
    }

    queueFree(): void {
        this._markedForDelete = true;
    }

    get isMarkedForDeletion(): boolean {
        return this._markedForDelete;
    }

    /** @internal */
    get components(): ReadonlyMap<string, any> {
        return this._components;
    }

    /** @internal */
    reset(): void {
        // Clear any existing state, remove components, etc.
    }

    /** @internal */
    static create(entityManager: EntityManager, engine: Engine): Entity {
        return new Entity(entityManager, engine);
    }
}

class System<C extends any[] = any> {
    private components: string[];

    constructor(private engine: Engine, ...componentsToPerform: { [K in keyof C]: ComponentIdentifier<C[K]> }) {
        this.components = componentsToPerform.map(component => System.getComponentName(component));
    }

    private static getComponentName(component: ComponentIdentifier): string {
        if (typeof component === "string") {
            return component;
        } else if (typeof component === "symbol") {
            return component.toString(); // Convert symbol to string
        } else if (typeof component === "function") {
            return component.name; // Get the class name if it's a constructor
        }

        throw new Error("Invalid component identifier");
    }

    // The act function now takes typed components based on the passed component identifiers
    act(entity: EntityDef, ...components: C): void { }

    step(entities: EntityDef[]): void {
        for (let i = entities.length - 1; i >= 0; i--) {
            const entity = entities[i];
            const componentArgs: C = [] as unknown as C; // Enforce typing

            if (this.components.every(c => {
                if (entity.hasComponent(c)) {
                    componentArgs.push(entity.getComponent(c) as any); // Cast to match the type
                    return true;
                }
                return false;
            })) {
                this.act(entity, ...componentArgs); // Call act with typed components
            }
        }
    }
}


export class Engine {
    private _entities: EntityDef[] = [];
    private _systems: System[] = [];
    private _steps: number = 0;
    private _active: boolean = false;
    private _entityManager: EntityManager = new EntityManager(this);

    /**
     * Creates and adds an Entity to the engine.
     */
    createEntity(): Entity {
        const entity = this._entityManager.createEntity();
        this._entities.push(entity);
        return entity;
    }

    /**
     * Adds a System to the engine.
     */
    createSystem<C extends any[] = any[]>(components: { [K in keyof C]: ComponentIdentifier<C[K]> }, options: SystemType): System<C> {
        // Spread the components as individual arguments when creating the System
        const system = new System<C>(this, ...components);  // Correctly passing individual components

        const systemCallbacks = system as SystemType<C>;
        let mapped = false;
        for (const propName of Object.keys(options)) {
            var eventCallback = options[propName as keyof SystemType<C>] as EventCallback;
            if (eventCallback) {
                systemCallbacks[propName as keyof SystemType<C>] = eventCallback;
                mapped = true;
            }
        }

        this._systems.push(mapped ? systemCallbacks as System<C> : system);

        return system as System<C>;
    }

    /**
     * Runs the engine at a specified interval until maxSteps is reached.
     */
    run(interval: number, maxSteps: number = 0): Promise<number> {
        this._active = true;
        return new Promise(async (resolve) => {
            await this.runInternal(interval, maxSteps, () => resolve(this._steps));
        });
    }

    private async runInternal(interval: number, maxSteps: number = 0, onComplete?: () => void): Promise<void> {
        this.dispatchSystemEvent('onStart')

        while (this._active) {
            this.perform();

            if ((this._steps < maxSteps && maxSteps !== 0) || maxSteps === 0) {
                await sleep(interval);
            } else {
                this._active = false;
            }
        }

        this.dispatchSystemEvent('onStop')

        onComplete && onComplete();
    }

    private dispatchSystemEvent(eventName: keyof EngineEvents, ...args: any[]): void {
        for (const system of this._systems) {
            const method = system[eventName as keyof typeof system] as Function;
            if (typeof method === "function") {
                method.apply(system, args);
            }
        }
    }

    private perform(): void {
        for (const system of this._systems) {
            system.step(this._entities);
        }
        this._steps++;
    }

    private beforeStep(): void {

    }

    private afterStep(): void {
        this._entityManager.cleanup();
    }

    get active(): boolean {
        return this._active;
    }
}
