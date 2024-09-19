// test.js
const orion = require("../src/orion");

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

describe("Engine", () => {
  describe("with no systems", () => {
    let game;

    beforeEach(() => {
      game = new orion();
    });

    it("should run for 5 steps", (done) => {
      game.onStop = () => {
        expect(game.steps).toBe(5);
        done();
      };
      game.run(1, 5);
    });
  });

  describe("with a system", () => {
    let game, e;

    beforeEach(() => {
      game = new orion();

      game.createSystem([Position, Velocity], {
        act: function (e, pos, vel) {
          pos.x += vel.x;
          pos.y += vel.y;
        }
      });

      e = game.createEntity();
      e.addComponent(new Velocity(3, 0));
      e.addComponent(new Position(5, 6));
    });

    it("should update entity's components", () => {
      game.perform();

      expect(e.components.Velocity.x).toBe(3);
      expect(e.components.Position.x).toBe(8);
    });
  });
});