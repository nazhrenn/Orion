var Entity = require('./entity');
var System = require('./system');

module.exports = (function () {
	function Engine() {
		this.entities = [];
		this.systems = [];

		this.createEntity = function (e) {
			var entity = new Entity();
			this.entities.push(entity);

			return entity;
		};

		this.createSystem = function (components, options) {
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
		};

		this.run = function (interval, maxSteps) {
			var self = this;

			if (maxSteps === null || maxSteps === undefined) {
				maxSteps = 0;
			}
			if (this.steps === 0) {
				this.onStart();
			}

			var stepFn = function () {
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

		this.perform = function () {
			for (var id in this.systems) {
				var system = this.systems[id];
				system.before();
				system.step(this.entities);
				system.after();
			}

			this.steps++;
		};
	};

	return Engine;
}());

// Create an engine and add our game system to it
var engine = new Engine();

// Create some entities with Position, Velocity, and Renderable components
var entity1 = engine.createEntity();
entity1.addComponent(new Position(0, 0));
entity1.addComponent(new Velocity(2, 3));
entity1.addComponent(new Renderable({ x: 10, y: 20 }));

var entity2 = engine.createEntity();
entity2.addComponent(new Position(50, 50));
entity2.addComponent(new Velocity(-2, -3));
entity2.addComponent(new Renderable({ x: 60, y: 70 }));

// Create a game system and add it to the engine
engine.createSystem([Position, Velocity], {
	step: function (entities) {
		for (var id in entities) {
			var entity = entities[id];
			if (entity.hasComponent(Position)) {
				var position = entity.components.Position;
				if (entity.hasComponent(Velocity)) {
					var velocity = entity.components.Velocity;
					position.x += velocity.x;
					position.y += velocity.y;

					// Boundary checking
					if (position.x < 0 || position.x > 100) {
						velocity.x *= -1;
					}
					if (position.y < 0 || position.y > 100) {
						velocity.y *= -1;
					}

					// Render the entity at its new position
					var renderable = entity.components.Renderable;
					renderable.sprite.x = position.x;
					renderable.sprite.y = position.y;
				}
			}
		}
	},
});

engine.run(1000, 10);