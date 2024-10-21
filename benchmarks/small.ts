import { Engine } from '../src/engine';
import { random } from "./tools/random";
import { Benchmark } from './tools/bencho';

class SimpleComponent { constructor(public value: number) { } }
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
};

let totalRuns = 5;
let totalStepsAccumulated = 0;
let runTime = 5;

async function runTests() {


    for (let run = 0; run < totalRuns; run++) {

        random.reset();
        let engine: Engine; // We'll initialize this in the run phase

        engine = new Engine();

        engine.createSystem([SimpleComponent], {
            act: (_, component: SimpleComponent) => {
                component.value += 1; // Simple operation
            },
        });

        for (let i = 0; i < 10; i++) {
            const entity = engine.createEntity();
            entity.addComponent(SimpleComponent, random.next() * 100);
        }

        engine.run();
        // sleep for 5 seconds and see how many steps ran
        await sleep(runTime * 1000);
        engine.stop();
        await sleep(150);
        totalStepsAccumulated += engine.steps;
        console.log(`Steps ran for run ${run + 1}: ${engine.steps}, with a fps of ${engine.steps / runTime}`);
    }
}

runTests().then(() => {
    let averageSteps = totalStepsAccumulated / totalRuns;
    console.log(`Average steps ran for all runs is ${averageSteps}, with a fps of ${averageSteps / runTime}`);
});