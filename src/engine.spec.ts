import { Engine } from './engine';
import { Entity } from './entity';
import { System } from './system';

describe('Engine', () => {
    let engine: Engine;

    beforeEach(() => {
        engine = new Engine();
    });

    test('should create a new entity', () => {
        const entity = engine.createEntity();
        expect(entity).toBeInstanceOf(Entity);
    });

    test('should create and add a system', () => {
        const options = {
            act: jest.fn(),
        };

        engine.createSystem([], options);
        engine.createEntity();
        engine.perform();

        expect(options.act).toHaveBeenCalled();
    });

    test('should run the engine and call onStart and onStop events', (done) => {
        const onStart = jest.fn();
        const onStop = jest.fn();

        engine.createSystem([], {
            onStart,
            onStop,
        });

        engine.createEntity();
        
        engine.run(0, 1).then(() => {
            expect(onStart).toHaveBeenCalled();
            expect(onStop).toHaveBeenCalled();
            done();
        });
    });

    test('should increment steps when performing', () => {
        const initialSteps = engine.steps;
        engine.perform();
        expect(engine.steps).toBe(initialSteps + 1);
    });
});
