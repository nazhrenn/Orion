
var orion = require("./src/orion");
var PositionComponent = require('./tests/position.js');
var VelocityComponent = require('./tests/velocity.js');

var game = new orion.Engine();

var phys = game.createSystem([PositionComponent, VelocityComponent], {
	act: function (e, pos, vel) {
		pos.x += vel.x;
		pos.y += vel.y;
	}
});

var disp = game.createSystem([PositionComponent], {
	act : function (e, pos) {
		console.log("POS:" + pos.x + "," + pos.y);
	}
});

var bounds = game.createSystem([PositionComponent, VelocityComponent], {
	act: function (e, pos, vel) {
		if (pos.x + vel.x > 100 || pos.x + vel.x < 0) {
			vel.x *= -1;
		}
		if (pos.y + vel.y > 100 || pos.y + vel.y < 0) {
			vel.y *= -1;
		}
	}
});

var e = game.createEntity();
e.addComponent(new VelocityComponent(3, 1));
e.addComponent(new PositionComponent(5, 6));


game.run(10);