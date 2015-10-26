var blanket = require("blanket")({
	/* options are passed as an argument object to the require statement */
	"pattern": "/src/"
});

var expect = require("chai").expect;

describe("Engine", function () {
	var orion = require("../src/orion");
	var PositionComponent = require('./position');
	var VelocityComponent = require('./velocity');
	
	describe("with no systems", function () {
		var game = new orion.Engine();
		it("should run for 5 steps", function (done) {
			game.onStop = function () {
				expect(game.steps).to.equal(5);
				done();
			}
			game.run(1, 5);
		});
	});

	describe("with a system", function () {
		var game = new orion.Engine();
		
		var phys = (function (base) {
			
			base.act = function (e, pos, vel) {
				pos.x += vel.x;
				pos.y += vel.y;
			};
			
			return base;
		}(game.createSystem([PositionComponent, VelocityComponent])));

		var e = game.createEntity();
		e.addComponent(new VelocityComponent(3, 0));
		e.addComponent(new PositionComponent(5, 6));
		
		it("should update entity's components", function () {
			game.perform();

			expect(e.components.Velocity.x).to.equal(3);
			expect(e.components.Position.x).to.equal(8);
		});
	});
});