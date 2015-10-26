
var Entity = require('./entity');
var System = require('./system');

module.exports = (function () {
	function Engine() {
		this.entities = [];
		this.systems = [];
		this.steps = 0;
		this.active = false;
		/**
		 * Adds an Entity to the engine.
		 */
		this.createEntity = function (e) {
			var entity = new Entity();
			this.entities.push(entity);

			return entity;
		};
		/***
		 * Adds a System to the engine.
		 */
		this.createSystem = function (components) {
			var system = new System(components);

			this.systems.push(system)

			return system;
		};
		/***
		 * Runs the engine at a specified interval until maxSteps is reached.
		 */
		this.run = function(interval, maxSteps) {
			var self = this;
			if (maxSteps === null) {
				maxSteps = 0;
			}
			if (this.steps === 0) {
				this.onStart();
			}
			var stepFn = function() {
				self.perform();
				if ((self.steps < maxSteps && maxSteps !== 0) || maxSteps === 0) {
					setTimeout(stepFn, interval);
				} else {
					self.onStop();
					self.active = false;
				}
			};
			this.active = true;
			setTimeout(stepFn, interval);
		};
		/***
		 * Performs a single step of the engine.
		 */
		this.perform = function() {
			for (var id in this.systems) {
				var system = this.systems[id];
				system.before();
				system.step(this.entities);
				system.after();
			}
			this.steps++;
		};
		this.start = function () {
			//TODO start running engine
		};
		/***
		 * onStart Hook.
		 */
		this.onStart = function () {

		};
		this.stop = function () {
			//TODO stop running engine
		};
		/***
		 * onStop Hook
		 */
		this.onStop = function () {

		};
	};

	return Engine;
}());
