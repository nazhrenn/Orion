import type { ComponentIdentifier, EngineEventNames, EngineEvents, EntityDef, EventCallback, SystemType } from "./definitions";


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
        this.engine.triggerEvent('onEntityCreated', entity);
        return entity;
    }

    public releaseEntity(entity: Entity): void {
        this.entityPool.release(entity);
        this.engine.triggerEvent('onEntityReleased', entity);
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

class System<C extends any[] = any[]> {
    private query: Query<C>;
    private components: ComponentIdentifier[];
    private entitySymbols: Set<symbol> = new Set();

    constructor(private engine: Engine, ...components: { [K in keyof C]: ComponentIdentifier<C[K]> }) {
        this.query = engine.createQuery<C>(components);
        this.components = components;
    }

    act(entity: EntityDef, ...components: C): void {
        // Implement your logic for acting on entities here
    }

    step(): void {
        for (const entity of this.query.getEntities()) {
            const componentArgs = this.components.map(c => entity.getComponent(c)) as C;
            this.act(entity, ...componentArgs); // Call act with typed components
        }
    }

    get storedEntitySymbols(): Set<symbol> {
        return this.entitySymbols; // Allow access to the stored symbols
    }
}

class EventEmitter {
    private listeners: Map<string, Set<Function>> = new Map();

    on(event: string, callback: Function): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    off(event: string, callback: Function): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }

    emit(event: string, ...args: any[]): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            for (const callback of callbacks) {
                callback(...args);
            }
        }
    }
}

class Query<C extends any[] = any[]> {
    private matchingEntities: Set<Entity> = new Set();

    constructor(private components: { [K in keyof C]: ComponentIdentifier<C[K]> }) { }

    match(entity: Entity): boolean {
        const matches = Object.values(this.components).every(type => entity.hasComponent(type));
        if (matches) {
            this.matchingEntities.add(entity);
        } else {
            this.matchingEntities.delete(entity);
        }
        return matches;
    }

    getEntities(): IterableIterator<Entity> {
        return this.matchingEntities.values();
    }
}

export class Engine extends EventEmitter {
    private _queries: Query<any>[] = [];
    private _systems: System[] = [];
    private _fixedUpdateSystems: System[] = [];
    private _steps: number = 0;
    private _active: boolean = false;
    private _entityManager: EntityManager = new EntityManager(this);
    private _fixedUpdateAccumulator: number = 0;
    private _fixedUpdateInterval: number = 1000 / 60; // 60 FPS by default
    private _componentArrays: Map<Function, ComponentArray<any>> = new Map();

    constructor(fixedUpdateFPS: number = 60) {
        super();

        this.on('onEntityCreated', (entity: Entity) => { this.updateQueries(entity); });
        this.on('onEntityReleased', (entity: Entity) => { this.updateQueries(entity); });
        this.on('onComponentAdded', (entity: Entity, type: Function) => { this.updateQueries(entity); })
        this.on('onComponentRemoved', (entity: Entity, type: Function) => { this.updateQueries(entity); })

        this._fixedUpdateInterval = 1000 / fixedUpdateFPS;
    }

    /**
     * Creates and adds an Entity to the engine.
     */
    createEntity(): Entity {
        return this._entityManager.createEntity();
    }

    /**
     * Adds a System to the engine.
     */
    createSystem<C extends any[] = any[]>(components: { [K in keyof C]: ComponentIdentifier<C[K]> }, options: SystemType, isFixedUpdate: boolean = false): System<C> {
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

        if (isFixedUpdate) {
            this._fixedUpdateSystems.push(mapped ? systemCallbacks as System<C> : system);
        } else {
            this._systems.push(mapped ? systemCallbacks as System<C> : system);
        }

        return system as System<C>;
    }

    createQuery<C extends any[] = any[]>(components: { [K in keyof C]: ComponentIdentifier<C[K]> }): Query<C> {
        const query = new Query<C>(components);
        this._queries.push(query);
        return query;
    }

    private updateQueries(entity: Entity): void {
        for (const query of this._queries) {
            query.match(entity);
        }
    }

    /**
     * Runs the engine for a single frame.
     * @param deltaTime The time elapsed since the last frame in milliseconds.
     */
    update(deltaTime: number): void {
        this.beforeStep();

        // Update fixed update systems
        this._fixedUpdateAccumulator += deltaTime;
        while (this._fixedUpdateAccumulator >= this._fixedUpdateInterval) {
            for (const system of this._fixedUpdateSystems) {
                system.step();
            }
            this._fixedUpdateAccumulator -= this._fixedUpdateInterval;
        }
        // Update variable update systems
        for (const system of this._systems) {
            system.step();
        }

        this.afterStep();
        this._steps++;
    }

    /**
     * Runs the engine in a loop until stop() is called.
     */
    run(): void {
        this._active = true;
        this.triggerEvent('onStart');

        let lastTime = Date.now();
        const loop = () => {
            if (!this._active) {
                this.triggerEvent('onStop');
                return;
            }

            const currentTime = Date.now();
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;

            this.update(deltaTime);

            setTimeout(loop, 1);
        };

        setTimeout(loop, 0);
    }

    /**
     * Stops the engine's main loop.
     */
    stop(): void {
        this._active = false;
    }

    private beforeStep(): void {

    }

    private afterStep(): void {
        this._entityManager.cleanup();
    }

    getComponentArray<T>(type: ComponentIdentifier): ComponentArray<T> {
        if (!this._componentArrays.has(type)) {
            this._componentArrays.set(type, new ComponentArray<T>());
        }
        return this._componentArrays.get(type) as ComponentArray<T>;
    }

    triggerEvent(eventName: EngineEventNames, ...args: any[]): void {
        this.emit(eventName, ...args);
    }

    get active(): boolean {
        return this._active;
    }

    get steps(): number {
        return this._steps;
    }
}
