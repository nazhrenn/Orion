
module.exports = (function() {
	function Entity() {
		this.dirty = false;
		this.components = {};
		this.addComponent = function (c) {
			var componentName = c.constructor.name;
			if (!this.components[componentName]) {
				this.components[c.constructor.name] = c;
				this.dirty = true;
			}
			return this;
		};
		this.removeComponent = function (c) {
			var componentName = c.constructor.name;
			if (!!this.components[componentName]) {
				delete this.components[componentName];
				this.dirty = true;
			}
			return this;
		};
		this.hasComponent = function (c) {
			return !!this.components[c];
		}
	};

	return Entity;
}());