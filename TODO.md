# TODO

- **Revamp system to simplify the engine**: Remove the `System` class, as it is mostly just a wrapper and unnecessary.
  
- **Restrict entity creation**: No longer allow the creation of entities from outside the engine. This appears to be a flaw in the design.

- **Non-overridable components**: Ensure components cannot be overridden once added to an entity.

- **Implement entity/component pooling**: Introduce pooling for entities and components to improve performance.
