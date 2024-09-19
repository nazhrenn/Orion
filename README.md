# Orion ECS

Orion ECS is a lightweight and flexible Entity Component System (ECS) framework written in JavaScript. It provides a solid foundation for building games and other applications that can benefit from a component-based architecture.

## Features

- Simple and intuitive API
- Efficient entity and component management
- Flexible system creation and execution
- Easy to integrate with existing projects

## Installation

You can install Orion ECS using npm:

```bash
npm install orion-ecs
```

## Usage

Here's a basic example of how to use Orion ECS:

```javascript
const orion = require('orion-ecs');

// Create a new engine
const game = new orion();

// Define components
class Position {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
}

class Velocity {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
}

// Create a system
game.createSystem([Position, Velocity], {
  act: function(entity, position, velocity) {
    position.x += velocity.x;
    position.y += velocity.y;
  }
});

// Create an entity and add components
const entity = game.createEntity();
entity.addComponent(new Position(0, 0));
entity.addComponent(new Velocity(1, 1));

// Run the engine
game.run(16, 0); // Run every 16ms, indefinitely
```

## API Reference

### Engine

- `createEntity()`: Creates and returns a new entity
- `createSystem(components, options)`: Creates a new system
- `run(interval, maxSteps)`: Runs the engine
- `perform()`: Performs a single step of the engine

### Entity

- `addComponent(component)`: Adds a component to the entity
- `removeComponent(componentName)`: Removes a component from the entity
- `hasComponent(componentName)`: Checks if the entity has a specific component

### System

Systems are created using the `createSystem` method of the engine. The `options` object can include:

- `before()`: Function called before processing entities
- `act(entity, ...components)`: Function called for each matching entity
- `after()`: Function called after processing entities

## Testing

To run the tests:

```bash
npm test
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.