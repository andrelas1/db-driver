import { Collection, Db, MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Observable } from "rxjs";
import { skip } from "rxjs/operators";

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

  async function initMongoDB() {
    const mongoDbTestDbUtils = await setupMongoTestDb();
    dbName = mongoDbTestDbUtils.dbName;
    dbPath = mongoDbTestDbUtils.dbPath;
    mongod = mongoDbTestDbUtils.mongod;
    port = mongoDbTestDbUtils.port;
    uri = mongoDbTestDbUtils.uri;
    mongoDbDriver = new MongoDbDriver(uri, dbDriverOpts);
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
  });

  describe("when performing CRUD operations in a collection", () => {
    describe("when reading the collection", () => {
      beforeAll(async () => {
        const mongoUri = await mongod.getConnectionString();
        const client = await MongoClient.connect(mongoUri, dbDriverOpts);
        const db = client.db(dbName);
        await db.collection("words").insertMany(words);
      });

      test("should return the collection as an observable of an array", done => {
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
      beforeEach(async () => {
        const mongoUri = await mongod.getConnectionString();
        const client = await MongoClient.connect(mongoUri, dbDriverOpts);
        const db = client.db(dbName);
        await db.collection("words").deleteMany({});
        database$ = mongoDbDriver.getDatabase$(dbName);
      });

      test("should return the updated data when adding a new document", done => {
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
        data$.subscribe(data => {
          expect(data instanceof Array).toBeTruthy();
          expect(data).toHaveProperty("length");
          expect(data[0].chapter).toEqual(1);
          expect(data[0].name).toEqual("allemaal");
          expect(data[0].translation).toEqual("all");
          expect(data.includes(word));
          done();
        });
      });

      test("should return the updated data when adding many documents", done => {
        const data$: Observable<IWord[]> = mongoDbDriver.writeManyToCollection$<
          IWord
        >(dbName, "words", words);

        data$.subscribe(data => {
          expect(data[0].name).toEqual("allemaal");
          expect(data[1].name).toEqual("altijd");
          done();
        });
      });
    });
  });
});
