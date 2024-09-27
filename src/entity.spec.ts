import { Entity } from './entity';

describe('Entity', () => {
    let entity: Entity;

    beforeEach(() => {
        entity = new Entity();
    });

    test('should add a component', () => {
        class TestComponent { constructor(public value: number) {} }
        entity.addComponent(TestComponent, 5);

        expect(entity.getComponent<TestComponent>('TestComponent')).toBeInstanceOf(TestComponent);
        expect(entity.getComponent<TestComponent>('TestComponent')?.value).toBe(5);
    });

    test('should remove a component', () => {
        class TestComponent { constructor(public value: number) {} }
        entity.addComponent(TestComponent, 5);
        entity.removeComponent('TestComponent');

        expect(entity.getComponent<TestComponent>('TestComponent')).toBeUndefined();
    });

    test('should check if component exists', () => {
        class TestComponent { constructor(public value: number) {} }
        entity.addComponent(TestComponent, 5);

        expect(entity.hasComponent('TestComponent')).toBe(true);
        entity.removeComponent('TestComponent');
        expect(entity.hasComponent('TestComponent')).toBe(false);
    });

    test('should mark entity as dirty when component is added or removed', () => {
        class TestComponent { constructor(public value: number) {} }
        expect(entity.dirty).toBe(false);
        entity.addComponent(TestComponent, 5);
        expect(entity.dirty).toBe(true);

        entity.dirty = false;
        entity.removeComponent('TestComponent');
        expect(entity.dirty).toBe(true);
    });
});
