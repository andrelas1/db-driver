import { Observable } from "rxjs";
import { LocalStorageDriver } from "./local-storage-driver";

describe("localStorage Driver", () => {
  let localStorageDbDriver: LocalStorageDriver;

  beforeAll(() => {
    localStorageDbDriver = new LocalStorageDriver();
  });
  test("it exists", () => {
    expect(localStorageDbDriver).toBeDefined();
  });

  describe("when performing CRUD operations", () => {
    test("should return the collection as an observable", () => {
      const collection$ = localStorageDbDriver.getCollection$("myCollection");
      expect(collection$ instanceof Observable).toBeTruthy();
    });
  });
});
