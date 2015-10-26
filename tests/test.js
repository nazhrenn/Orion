var blanket = require("blanket")({
	/* options are passed as an argument object to the require statement */
	"pattern": "/src/"
});

var expect = require("chai").expect;

describe("Engine", function () {
	var orion = require("../src/orion");

	var PositionComponent = function Position(x, y) {
		this.x = x || 0;
		this.y = y || 0;
	};

	var VelocityComponent = function Velocity(x, y) {
		this.x = x || 0;
		this.y = y || 0;
	};
	
	describe("with no systems", function () {
		var game = new orion();
		it("should run for 5 steps", function (done) {
			game.onStop = function () {
				expect(game.steps).to.equal(5);
				done();
			}
			game.run(1, 5);
		});
	});
	
	describe("with a system", function () {
		var game = new orion();
		
		var phys = game.createSystem([PositionComponent, VelocityComponent], {
			act: function (e, pos, vel) {
				pos.x += vel.x;
				pos.y += vel.y;
			}
		});
		
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