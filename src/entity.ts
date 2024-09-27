export class Entity {
    private _dirty: boolean = false;
    private _components: Map<string, any> = new Map();

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

    get components(): ReadonlyMap<string, any> {
        return this._components;
    }

    get dirty(): boolean {
        return this._dirty;
    }

    set dirty(value: boolean) {
        this._dirty = value;
    }
}