
export class System {
	components;

	constructor(componentsToPerform) {
		this.components = [];

		for (var id in componentsToPerform) {
			var component = componentsToPerform[id];
			if (typeof component === "string") {
				this.components.push(component);
			} else if (typeof component === "function") {
				this.components.push(component.name);
			}
		}
	}

	before() { };
	act(e, ...components) { };
	after() { };

	step(entities) {
		var length = entities.length;
		for (var i = length - 1; i >= 0; i--) {
			var entity = entities[i];
			var componentArgs = [];
			if (this.components.every(function (c) {
				if (entity.hasComponent(c)) {
					componentArgs.push(entity.components[c]);
					return true;
				}
				return false;
			})) {
				this.act(entity, componentArgs);
			}
		}
	}
}