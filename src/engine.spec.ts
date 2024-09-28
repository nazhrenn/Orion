import { Engine } from './engine';

describe('Engine', () => {
    let engine: Engine;

    beforeEach(() => {
        engine = new Engine();
    });

    test('should create and add a system', async () => {
        const options = {
            act: jest.fn(),
        };

        engine.createSystem([], options);
        engine.createEntity();
        
        await engine.run(0, 1);

        expect(options.act).toHaveBeenCalled();
    });

    test('should run the engine and call onStart and onStop events', async () => {
        const onStart = jest.fn();
        const onStop = jest.fn();

        engine.createSystem([], {
            onStart,
            onStop,
        });

        engine.createEntity();
        
        await engine.run(0, 1);

        expect(onStart).toHaveBeenCalled();
        expect(onStop).toHaveBeenCalled();
    });
});
