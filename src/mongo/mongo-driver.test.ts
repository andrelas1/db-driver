import { Collection, Db, MongoClient } from "mongodb";
import { BehaviorSubject, Observable, of } from "rxjs";
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
  const mongoDbUri = "mongodb://127.0.0.1:27017";
  const dbName = "test-db";
  let client: MongoClient;
  let mongoDbDriver: MongoDbDriver;
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
    await db.collection(collectionName).deleteMany({});
    if (newItems) {
      await db.collection(collectionName).insertMany(newItems);
    }
    return db.collection(collectionName);
  }

  beforeAll(async () => {
    await setupMongoDB(mongoDbUri);
    mongoDbDriver = new MongoDbDriver(mongoDbUri, dbDriverOpts);
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
        await resetDatabaseBeforeTest("words", words);
      });

      test("should return the collection observable", done => {
        mongoDbDriver.getCollection$(dbName, "words").subscribe(collection => {
          expect(collection instanceof Array).toBeTruthy();
          expect((collection[0] as IWord).name).toEqual("allemaal");
          expect((collection[1] as IWord).name).toEqual("altijd");
          done();
        });
      });
      test("should close the connection after the operation", done => {
        mongoDbDriver.getCollection$(dbName, "words").subscribe(collection => {
          expect(mongoDbDriver.client.isConnected()).toBeFalsy();
          done();
        });
      });
    });

    describe("when writing to the collection", () => {
      let database$: Observable<Db>;
      let col: Collection;
      beforeEach(async () => {
        col = await resetDatabaseBeforeTest("words");
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

      describe("after writing the connection should be closed", () => {
        test("when writing many", done => {
          const data$: Observable<IWord[]> = mongoDbDriver
              .writeManyToCollection$<IWord>(dbName, "words", words);

          data$.subscribe(data => {
            expect(mongoDbDriver.client.isConnected()).toBeFalsy();
            done();
          });
        });

        test("when writing once", done => {
          const word = {
            chapter: 1,
            name: "allemaal",
            translation: "all"
          };
          const data$: Observable<IWord[]> = mongoDbDriver
              .writeOneToCollection$<IWord>(dbName, "words", word);

          data$.subscribe(data => {
            expect(mongoDbDriver.client.isConnected()).toBeFalsy();
            done();
          });
        });
      });
    });

    describe("when deleting docs from the collection", () => {
      let collection: Collection;
      const item = {
        chapter: 1,
        name: "allemaal",
        translation: "all"
      };
      beforeEach(async () => {
        collection = await resetDatabaseBeforeTest("words", words);
      });
      test("should return the list without the removed element", done => {
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

      test("should close the connection", done => {
        mongoDbDriver
          .deleteOneFromCollection$(dbName, "words", item)
          .subscribe(_ => {
            expect(mongoDbDriver.client.isConnected()).toBeFalsy();
            done();
          });
      });
    });
    describe("when updating docs from the collection", () => {
      let cl: Collection;
      let oldItem: IWord;
      let newItem: IWord;
      let result$: Observable<IWord[]>;

      beforeAll(async done => {
        cl = await resetDatabaseBeforeTest("words", words);
        mongoDbDriver
          .getCollection$<IWord>(dbName, "words")
          .subscribe(collection => {
            oldItem = collection[0];
            newItem = {
              ...oldItem,
              chapter: 1,
              name: "telefoon",
              translation: "telephone"
            };
            result$ = mongoDbDriver.updateOneFromCollection$<IWord>(
              dbName,
              "words",
              oldItem,
              newItem
            );
            done();
          });
      });

      test("should return the updated list", done => {
        result$.subscribe(async (col: IWord[]) => {
          expect(col).toContainEqual(newItem);
          expect(col).not.toContainEqual(oldItem);
          const collectionItems = await cl.find().toArray();
          expect(collectionItems).toContainEqual(newItem);
          expect(collectionItems).not.toContainEqual(oldItem);
          done();
        });
      });

      test("should close the connection after operation", done => {
        result$.subscribe(_ => {
          expect(mongoDbDriver.client.isConnected()).toBeFalsy();
          done();
        });
      });
    });
  });
});
