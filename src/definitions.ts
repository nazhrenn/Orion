
export type ComponentIdentifier<T = any> = string | Symbol | (new (...args: any[]) => T);
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

export type EngineEventNames = keyof EngineEvents | 'entityCreated' | 'entityReleased' | 'componentAdded' | 'componentRemoved';

export interface EntityDef {
    id: symbol;
    queueFree(): void;
    addComponent<T>(type: new (...args: any[]) => T, ...args: ConstructorParameters<typeof type>): this;
    removeComponent(componentName: string): this;
    hasComponent(componentName: string): boolean;
    getComponent<T>(componentName: string): T | undefined;
    get isDirty(): boolean;
    get isMarkedForDeletion(): boolean;
}
