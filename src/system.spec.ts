import { System } from './system';
import { Entity } from './entity';

describe('System', () => {
    let system: System<[TestComponent]>;
    let entity: Entity;

    class TestComponent {
        constructor(public value: number) {}
    }

    beforeEach(() => {
        entity = new Entity();
        system = new System(TestComponent);

        entity.addComponent(TestComponent, 10);
    });

    test('should call act if all components are present', () => {
        const actSpy = jest.spyOn(system, 'act');
        system.step([entity]);
        expect(actSpy).toHaveBeenCalledWith(entity, entity.getComponent<TestComponent>('TestComponent'));
    });

    test('should not call act if components are missing', () => {
        const actSpy = jest.spyOn(system, 'act');
        entity.removeComponent('TestComponent');
        system.step([entity]);
        expect(actSpy).not.toHaveBeenCalled();
    });
});
