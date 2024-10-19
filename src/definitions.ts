
export type ComponentIdentifier<T = any> = (new (...args: any[]) => T);
export type ComponentArgs<T> = T extends new (...args: infer A) => any ? A : never;

export type EventTypes<T = any> = string | Symbol | keyof T;
export type EventCallback<T = void> = ((...args: any[]) => T);

export interface SystemOptions<C extends any[] = any[]> {
    act?: (entity: EntityDef, ...components: { [K in keyof C]: C[K] }) => void;
}

export type SystemType<T extends any[] = any[]> = SystemOptions<T> & Partial<EngineEvents>;

export interface EngineEvents {
    onStop: EventCallback;
    onStart: EventCallback;
    beforeAct: EventCallback;
    afterAct: EventCallback;
}

export type EngineEventNames = keyof EngineEvents | 'onEntityCreated' | 'onEntityReleased' | 'onComponentAdded' | 'onComponentRemoved';

export interface EntityDef {
    id: symbol;
    queueFree(): void;
    addComponent<T>(type: new (...args: any[]) => T, ...args: ConstructorParameters<typeof type>): this;
    removeComponent<T>(type: new (...args: any[]) => T): this;
    hasComponent<T>(type: new (...args: any[]) => T): boolean;
    getComponent<T>(type: new (...args: any[]) => T): T;
    get isDirty(): boolean;
    get isMarkedForDeletion(): boolean;
}
