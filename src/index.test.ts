import { DatabaseDriver } from "./index";

describe("database-driver", () => {
  let databaseDriver: DatabaseDriver;
  beforeAll(() => {
    databaseDriver = new DatabaseDriver("mongo", "url");
  });
  test("passes", () => {
    expect(true).toBeTruthy();
  });
});
