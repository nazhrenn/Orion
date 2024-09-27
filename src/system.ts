import type { ComponentIdentifier, EngineEvents, EventCallback } from "./definitions";
import type { Entity } from "./entity";

export class System<C extends any[] = any> {
    private components: string[];

    constructor(...componentsToPerform: { [K in keyof C]: ComponentIdentifier<C[K]> }) {
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
    act(entity: Entity, ...components: C): void { }

    step(entities: Entity[]): void {
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
