
var Component = require("../src/component");

module.exports = (function (base) {

	function Position(x, y) {
		base.call(this, null);

		this.x = x || 0;
		this.y = y || 0;
	};

	return Position;
}(Component));