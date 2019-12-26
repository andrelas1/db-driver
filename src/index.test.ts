import { DatabaseDriver } from "./index";
import { MongoDbDriver } from "./mongo";

describe("DatabaseDriver", () => {
  describe("when instatiating as a mongodb driver", () => {
    test("should return an object that is an instanceof MongoDbDriver", () => {
      const dbDriver = new DatabaseDriver("mongodb", { url: "url" }, {});
      expect(dbDriver.dbType).toEqual("mongodb");
    });
  });
});
