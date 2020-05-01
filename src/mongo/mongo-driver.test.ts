import { Collection, Db, MongoClient } from "mongodb";
import { BehaviorSubject, Observable, of } from "rxjs";

import { dbDriverOpts } from "../config";
import { removeIdsFromObject } from "../utils";
import { MongoDbDriver } from "./mongo-driver";

interface IWord {
  chapter: number;
  name: string;
  translation: string;
  _id: string;
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
  const mongoDbUri = "mongodb://127.0.0.1:27017";
  const dbName = "test-db";
  let client: MongoClient;
  let mongoDbDriver: MongoDbDriver;
  let collection$: BehaviorSubject<IWord[]>;

  function deepCloneArray(listOfObjects: any[]) {
    const arr: any[] = [];
    listOfObjects.forEach(obj => {
      arr.push({ ...obj });
    });
    return arr;
  }

  function removeIds(list: any[]) {
    return list.map(item => {
      const keys = Object.keys(item);
      const obj = {};
      keys.forEach(k => {
        if (k.indexOf("id") === -1) {
          (obj as any)[k] = item[k];
        }
      });
      return obj;
    });
  }

  async function setupMongoDB(uri: string) {
    client = new MongoClient(uri, dbDriverOpts);
    await client.connect();
    client.db("test-db");
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
    client = new MongoClient(mongoDbUri, dbDriverOpts);
    await client.connect();
    const db = client.db(dbName);
    const a = await db
      .collection(collectionName)
      .find({})
      .toArray();
    const r = await db.collection(collectionName).deleteMany({});
    if (newItems) {
      await db.collection(collectionName).insertMany(deepCloneArray(newItems));
    }
    return db.collection(collectionName);
  }

  beforeAll(async () => {
    await setupMongoDB(mongoDbUri);
    mongoDbDriver = new MongoDbDriver(mongoDbUri, dbDriverOpts);
  });

  describe("collection$", () => {
    describe("when reading", () => {
      beforeEach(async done => {
        await setupMongoDB(mongoDbUri);
        await resetDatabaseBeforeTest("words");
        mongoDbDriver = new MongoDbDriver(mongoDbUri, dbDriverOpts);
        mongoDbDriver
          .getCollection$<IWord>(dbName, "words")
          .subscribe(result => {
            collection$ = result;
            done();
          });
      });

      test("returns an observable of a collection", () => {
        expect(collection$ instanceof Observable).toBeTruthy();
      });

      test("returns an empty list at first subscribed event", done => {
        collection$.subscribe(res => {
          expect(res).toEqual([]);
          done();
        });
      });
    });

    describe("when data is already in the collection", () => {
      beforeEach(async done => {
        await resetDatabaseBeforeTest("words", words);
        mongoDbDriver = new MongoDbDriver(mongoDbUri, dbDriverOpts);
        mongoDbDriver
          .getCollection$<IWord>(dbName, "words")
          .subscribe(result => {
            collection$ = result;
            done();
          });
      });

      test("returns an initial list of words", done => {
        collection$.subscribe(res => {
          expect(removeIdsFromObject<IWord>(res)).toEqual(removeIds(words));
          done();
        });
      });
    });
  });

  describe("when performing CRUD events", () => {
    describe("CREATE", () => {
      beforeEach(async done => {
        await resetDatabaseBeforeTest("words", [...words]);
        mongoDbDriver = new MongoDbDriver(mongoDbUri, dbDriverOpts);
        mongoDbDriver
          .getCollection$<IWord>(dbName, "words")
          .subscribe(collection => {
            collection$ = collection;
            done();
            return;
          });
      });
      const newItem = {
        chapter: 1,
        name: "telefoon",
        translation: "telephone"
      };
      test("writeOneToCollection returns operation result", done => {
        mongoDbDriver
          .writeOneToCollection$(dbName, "words", newItem)
          .subscribe(result => {
            expect(result.insertedCount).toEqual(1);
            done();
          });
      });
      test("collection$ observes the updated collection", done => {
        collection$.pipe().subscribe(result => {
          done();
        });
        mongoDbDriver
          .writeOneToCollection$(dbName, "words", newItem)
          .subscribe(res => {
            collection$.pipe().subscribe(result => {
              expect(removeIds(result)).toStrictEqual(
                removeIds([...words, newItem])
              );
              done();
            });
          });
      });
    });
  });
});
