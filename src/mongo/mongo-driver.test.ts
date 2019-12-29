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
  async function setupBeforeTest(
    collectionName: string,
    newItems?: any[]
  ): Promise<Collection> {
    const mongoUri = await mongod.getConnectionString();
    const client = await MongoClient.connect(mongoUri, dbDriverOpts);
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

  describe("mongo observable factory", () => {
    let database$: Observable<Db>;
    beforeAll(() => {
      database$ = mongoDbDriver.getDatabase$(dbName);
    });

    test("returns an observable", () => {
      expect(database$ instanceof Observable).toBeTruthy();
    });

    test("when subscribed, returns the mongo object from mongo", done => {
      database$.subscribe(db => {
        expect(db instanceof Db).toBeTruthy();
        done();
      });
    });

    describe("when an error is thrown", () => {
      let db$: Observable<Db>;
      let dbDriver: MongoDbDriver;
      beforeEach(async () => {
        dbDriver = new MongoDbDriver("http://localhost:27017", dbDriverOpts);
        db$ = dbDriver.getDatabase$(dbName);
      });
      test("should throw an error with a message", done => {
        db$
          .pipe(
            catchError(err => {
              expect(
                err.message.indexOf(
                  "The MongoDB client could not be instantiated. Log from the MongoDB client:"
                )
              ).not.toEqual(-1);
              done();
              return of([]);
            })
          )
          .subscribe(db => {
            //
          });
      });
    });
  });

  describe("when performing CRUD operations in a collection", () => {
    describe("when reading the collection", () => {
      beforeAll(async () => {
        await setupBeforeTest("words", words);
      });

      test("should return the collection observable", done => {
        mongoDbDriver.getCollection$(dbName, "words").subscribe(collection => {
          expect(collection instanceof Array).toBeTruthy();
          expect((collection[0] as IWord).name).toEqual("allemaal");
          expect((collection[1] as IWord).name).toEqual("altijd");
          done();
        });
      });
    });

    describe("when writing to the collection", () => {
      let database$: Observable<Db>;
      let col: Collection;
      beforeEach(async () => {
        col = await setupBeforeTest("words");
        database$ = mongoDbDriver.getDatabase$(dbName);
      });

      test("should return the updated data when adding a new doc", done => {
        const word = {
          chapter: 1,
          name: "allemaal",
          translation: "all"
        };
        const data$ = mongoDbDriver.writeOneToCollection$<IWord>(
          dbName,
          "words",
          word
        );
        data$.subscribe(async data => {
          expect(data instanceof Array).toBeTruthy();
          expect(data).toHaveProperty("length");
          expect(data[0].chapter).toEqual(1);
          expect(data[0].name).toEqual("allemaal");
          expect(data[0].translation).toEqual("all");
          expect(data.includes(word));

          const collectionItems = await col.find().toArray();
          expect(collectionItems[0]).toEqual(word);
          done();
        });
      });

      test("should return the updated data when adding many docs", done => {
        const data$: Observable<IWord[]> = mongoDbDriver.writeManyToCollection$<
          IWord
        >(dbName, "words", words);

        data$.subscribe(async data => {
          expect(data[0].name).toEqual("allemaal");
          expect(data[1].name).toEqual("altijd");
          const collectionItems = await col.find().toArray();
          expect(collectionItems).toEqual(data);
          done();
        });
      });
    });

    describe("when deleting docs from the collection", () => {
      let collection: Collection;
      beforeAll(async () => {
        collection = await setupBeforeTest("words", words);
      });
      test("should return the list without the removed element", done => {
        const item = {
          chapter: 1,
          name: "allemaal",
          translation: "all"
        };
        mongoDbDriver
          .deleteOneFromCollection$(dbName, "words", item)
          .subscribe(async (col: any[]) => {
            const collectionItems = await collection.find().toArray();
            expect(collection).not.toContain(item);
            expect(col).not.toContain(item);
            done();
          });
      });

      test("should return the list without the removed elements", done => {
        mongoDbDriver
          .deleteAllFromCollection$(dbName, "words")
          .subscribe(async (col: any[]) => {
            const collectionItems = await collection.find().toArray();
            expect(collection).not.toContain(words);
            expect(col).not.toContain(words);
            done();
          });
      });
    });
    describe("when updating docs from the collection", () => {
      let cl: Collection;
      let oldItem: IWord;
      beforeEach(async done => {
        cl = await setupBeforeTest("words", words);
        mongoDbDriver
          .getCollection$<IWord>(dbName, "words")
          .subscribe(collection => {
            oldItem = collection[0];
            done();
          });
      });

      test("should return the updated list", done => {
        const newItem = {
          ...oldItem,
          chapter: 1,
          name: "telefoon",
          translation: "telephone"
        };
        mongoDbDriver
          .updateOneFromCollection$<IWord>(dbName, "words", oldItem, newItem)
          .subscribe(async (col: IWord[]) => {
            expect(col).toContainEqual(newItem);
            expect(col).not.toContainEqual(oldItem);
            const collectionItems = await cl.find().toArray();
            expect(collectionItems).toContainEqual(newItem);
            expect(collectionItems).not.toContainEqual(oldItem);
            done();
          });
      });
    });
  });
});
