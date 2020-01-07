import { Collection, Db, MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Observable, of } from "rxjs";
import { catchError, skip } from "rxjs/operators";

import { dbDriverOpts } from "../config";
import { setupMongoTestDb } from "../utils";
import { MongoDbDriver } from "./mongo-driver";

interface IWord {
  chapter: number;
  name: string;
  translation: string;
}

const words = [
  {
    chapter: 1,
    name: "allemaal",
    translation: "all"
  },
  {
    chapter: 1,
    name: "altijd",
    translation: "always"
  },
  {
    chapter: 1,
    name: "impulsief",
    translation: "impulsive"
  },
  {
    chapter: 1,
    name: "nadenken (over)",
    translation: "to think it out, to consider"
  },
  {
    chapter: 1,
    name: "overal",
    translation: "everywhere, anywhere"
  },
  {
    chapter: 1,
    name: "afrekenen",
    translation: "to pay"
  }
];

describe("mongo driver", () => {
  let uri: string;
  let port: number;
  let dbPath: string;
  let dbName: string;
  let mongoDbDriver: MongoDbDriver;
  let mongod: MongoMemoryServer;
  let client: MongoClient;

  async function stopMongoDB() {
    await mongod.stop();
  }

  async function initMongoDB(dbUri?: string) {
    const mongoDbTestDbUtils = await setupMongoTestDb();
    dbName = mongoDbTestDbUtils.dbName;
    dbPath = mongoDbTestDbUtils.dbPath;
    mongod = mongoDbTestDbUtils.mongod;
    port = mongoDbTestDbUtils.port;
    uri = mongoDbTestDbUtils.uri;
    mongoDbDriver = new MongoDbDriver(dbUri || uri, dbDriverOpts);
  }

  /**
   * reset and optionally add an initial collection of items
   * before testing
   *
   * @param collectionName
   * @param newItems
   *
   * @returns Promise of Collection
   */
  async function resetDatabaseBeforeTest(
    collectionName: string,
    newItems?: any[]
  ): Promise<Collection> {
    if (client) {
      client.close();
    }
    client = new MongoClient(uri, dbDriverOpts);
    await client.connect();
    const db = client.db(dbName);
    await db.collection(collectionName).deleteMany({});
    if (newItems) {
      await db.collection(collectionName).insertMany(newItems);
    }
    return db.collection(collectionName);
  }

  beforeAll(async () => {
    await initMongoDB();
  });

  describe("getCollection$", () => {
    let collection$: Observable<IWord[]>;
    beforeAll(() => {
      collection$ = mongoDbDriver.getCollection$<IWord>(dbName, "words");
    });
    test("should return an observable collection", () => {
      expect(collection$ instanceof Observable);
    });

    test("should return the collection as an array when subscribed", done => {
      collection$.subscribe(res => {
        expect(res instanceof Array);
        done();
      });
    });
  });

  describe("when performing CRUD operations", () => {
    let collection$: Observable<IWord[]>;
    beforeAll(() => {
      collection$ = mongoDbDriver.getCollection$<IWord>(dbName, "words");
    });

    describe("collection$", () => {
      test("should observe the next value as the updated collection", done => {
        const newItem = {
          chapter: 1,
          name: "overal",
          translation: "everywhere, anywhere"
        };
        mongoDbDriver.writeOneToCollection$(dbName, "words", newItem);
        collection$.subscribe(res => {
          expect(res.length).toEqual(1);
          expect(res[0]).toEqual(newItem);
          done();
        });
      });
    });
  });
});
