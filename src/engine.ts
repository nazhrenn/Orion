import type { ComponentIdentifier, EngineEventNames, EngineEvents, EntityDef, EventCallback, SystemType } from "./definitions";

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

class ComponentArray<T> {
    private components: (T | null)[] = [];
    private freeIndices: number[] = [];

    add(component: T): number {
        if (this.freeIndices.length > 0) {
            const index = this.freeIndices.pop()!;
            this.components[index] = component;
            return index;
        }
        return this.components.push(component) - 1;
    }

    remove(index: number): void {
        this.components[index] = null;
        this.freeIndices.push(index);
    }

    get(index: number): T | null {
        return this.components[index];
    }
}

class EntityManager {
    constructor(private engine: Engine) {
    }

    private activeEntities: Map<symbol, Entity> = new Map<symbol, Entity>();

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
        const entity = this.entityPool.acquire();
        this.activeEntities.set(entity.id, entity);
        this.notifySystems('onEntityCreated', entity);
        return entity;
    }

    public releaseEntity(entity: Entity): void {
        this.entityPool.release(entity);
        this.notifySystems('onEntityReleased', entity);
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

    private notifySystems(eventName: 'onEntityCreated' | 'onEntityReleased', entity: Entity): void {
        this.engine.triggerEvent(eventName, entity);
    }

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
    private _componentIndices: Map<Function, number> = new Map();
    private _markedForDelete: boolean = false;

    private constructor(
        private entityManager: EntityManager,
        private engine: Engine) {
        this._id = Symbol(); // Generate a unique symbol for this entity
    }

    get id(): symbol {
        return this._id;
    }

    addComponent<T>(type: ComponentIdentifier<T>, ...args: ConstructorParameters<typeof type>): this {
        if (!this._componentIndices.has(type)) {
            const componentArray = this.engine.getComponentArray(type);
            const index = componentArray.add(new type(...args));
            this._componentIndices.set(type, index);
            this._dirty = true;
            this.engine.triggerEvent('onComponentAdded', this, type);
        }
        return this;
    }

    removeComponent<T>(type: ComponentIdentifier<T>): this {
        const index = this._componentIndices.get(type);
        if (index !== undefined) {
            const componentArray = this.engine.getComponentArray(type);
            componentArray.remove(index);
            this._componentIndices.delete(type);
            this._dirty = true;
            this.engine.triggerEvent('onComponentRemoved', this, type);
        }
        return this;
    }

    hasComponent<T>(type: ComponentIdentifier<T>): boolean {
        return this._componentIndices.has(type);
    }

    getComponent<T>(type: ComponentIdentifier<T>): T {
        const index = this._componentIndices.get(type);
        if (index === undefined) {
            throw new Error(`Component ${type.name} not found on entity`);
        }
        const componentArray = this.engine.getComponentArray(type);
        const component = componentArray.get(index);
        if (component === null) {
            throw new Error(`Component ${type.name} is null`);
        }
        return component as T;
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
    reset(): void {
        this._componentIndices.clear();
        this._dirty = false;
        this._markedForDelete = false;
    }

    /** @internal */
    static create(entityManager: EntityManager, engine: Engine): Entity {
        return new Entity(entityManager, engine);
    }
}

class System<C extends any[] = any> {
    private components: ComponentIdentifier[];
    private entitySymbols: Set<symbol> = new Set();

    constructor(private engine: Engine, ...componentsToPerform: { [K in keyof C]: ComponentIdentifier<C[K]> }) {
        this.components = componentsToPerform.map(component => {
            if (typeof component === "function") {
                return component;
            } else {
                throw new Error("Invalid component identifier");
            }
        });

        // Subscribe to entity creation and release events
        this.engine.registerEvent('onEntityCreated', this.onEntityCreated.bind(this));
        this.engine.registerEvent('onEntityReleased', this.onEntityReleased.bind(this));
    }

    onEntityCreated(entity: Entity): void {
        if (this.components.every(c => entity.hasComponent(c))) {
            this.entitySymbols.add(entity.id); // Store the symbol
        }
    }

    onEntityReleased(entity: Entity): void {
        this.entitySymbols.delete(entity.id); // Remove the symbol
    }

    onComponentAdded<T>(entity: Entity, componentType: ComponentIdentifier<T>) {
        if (this.components.includes(componentType)
            && !this.entitySymbols.has(entity.id)
            && this.components.every(c => entity.hasComponent(c))) {
            this.entitySymbols.add(entity.id); // Store the symbol
        }
    }

    onComponentRemoved<T>(entity: Entity, componentType: ComponentIdentifier<T>) {
        if (this.components.includes(componentType)
            && this.entitySymbols.has(entity.id)
            && !this.components.every(c => entity.hasComponent(c))) {
            this.entitySymbols.delete(entity.id); // Store the symbol
        }
    }

    act(entity: EntityDef, ...components: C): void {
        // Implement your logic for acting on entities here
    }

    step(entities: EntityDef[]): void {
        for (const symbol of this.entitySymbols) {
            const entity = entities.find(e => e.id === symbol);
            if (entity) {
                const componentArgs = this.components.map(c => entity.getComponent(c)) as C;
                this.act(entity, ...componentArgs); // Call act with typed components
            }
        }
    }

    get storedEntitySymbols(): Set<symbol> {
        return this.entitySymbols; // Allow access to the stored symbols
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
        this.triggerEvent('onStart')

        while (this._active) {
            this.perform();

            if ((this._steps < maxSteps && maxSteps !== 0) || maxSteps === 0) {
                await sleep(interval);
            } else {
                this._active = false;
            }
        }

        this.triggerEvent('onStop')

        onComplete && onComplete();
    }

    private componentArrays: Map<Function, ComponentArray<any>> = new Map();

    getComponentArray<T>(type: ComponentIdentifier): ComponentArray<T> {
        if (!this.componentArrays.has(type)) {
            this.componentArrays.set(type, new ComponentArray<T>());
        }
        return this.componentArrays.get(type) as ComponentArray<T>;
    }

    registerEvent(eventName: EngineEventNames, callback: EventCallback) {

    }

    triggerEvent(eventName: EngineEventNames, ...args: any[]): void {
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
