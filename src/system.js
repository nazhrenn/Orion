
module.exports = (function () {
	function System(componentsToPerform) {
		this.components = [];

		for (var id in componentsToPerform) {
			var component = componentsToPerform[id];
			if (typeof component === "string") {
				this.components.push(component);
			} else if (typeof component === "function") {
				this.components.push(component.name);
			}
		}

		this.before = function () { };
		this.act = function (e) { };
		this.after = function () { };

		this.step = function (entities) {
			var length = entities.length;
			for (var i = length - 1; i >= 0; i--) {
				var entity = entities[i];
				var systemArgs = [entity];
				if (this.components.every(function (c) {
					if (entity.hasComponent(c)) {
						systemArgs.push(entity.components[c]);
						return true;
					}
					return false;
				})) {
					this.act.apply(this, systemArgs);
				}
			}
		}
	};

	return System;
}());