import { System } from "./system";
import { Entity } from "./entity";

export class Engine {
	entities = [];
	systems = [];
	steps = 0;
	active = false;

	/**
	 * Adds an Entity to the engine.
	 */
	createEntity(e) {
		var entity = new Entity();
		this.entities.push(entity);

		return entity;
	}

	/***
	 * Adds a System to the engine.
	 */
	createSystem(components, options) {
		var system = new System(components);

		if (!!options.before) {
			system.before = options.before;
		}

		if (!!options.act) {
			system.act = options.act;
		}

		if (!!options.after) {
			system.after = options.after;
		}

		this.systems.push(system)

		return system;
	}

	/***
	 * Runs the engine at a specified interval until maxSteps is reached.
	 */
	run(interval, maxSteps) {
		if (maxSteps === null || maxSteps === undefined) {
			maxSteps = 0;
		}
		if (this.steps === 0) {
			this.onStart();
		}
		var stepFn = () => {
			this.perform();
			if ((this.steps < maxSteps && maxSteps !== 0) || maxSteps === 0) {
				setTimeout(stepFn, interval);
			} else {
				this.onStop();
				this.active = false;
			}
		};
		this.active = true;
		setTimeout(stepFn, interval);
	}

	/***
	 * Performs a single step of the engine.
	 */
	perform() {
		for (var id in this.systems) {
			var system = this.systems[id];
			system.before();
			system.step(this.entities);
			system.after();
		}
		this.steps++;
	}

	start() {
		//TODO start running engine
	}

	/***
	 * onStart Hook.
	 */
	onStart() {

	}

	stop() {
		//TODO stop running engine
	}

	/***
	 * onStop Hook
	 */
	onStop() {

	}
}