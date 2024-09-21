
export class Entity {
	dirty = false;
	components = {};

	addComponent(c) {
		var componentName = c.constructor.name;
		if (!this.components[componentName]) {
			this.components[c.constructor.name] = c;
			this.dirty = true;
		}
		return this;
	}

	removeComponent(c) {
		var componentName = c.constructor.name;
		if (!!this.components[componentName]) {
			delete this.components[componentName];
			this.dirty = true;
		}
		return this;
	}

	hasComponent(c) {
		return !!this.components[c];
	}
}