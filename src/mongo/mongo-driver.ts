import { Collection, Db, MongoClient, MongoClientOptions } from "mongodb";
import { BehaviorSubject, combineLatest, from, Observable, of } from "rxjs";
import { catchError, flatMap, map, mergeMap, tap } from "rxjs/operators";

/*
    Access the MongoDB as well as executes operations on the collection.
*/
export class MongoDbDriver {
  /**
   * The subject used to trigger the observable.next from the outside. By default it always send the client
   * with the connection open.
   */

  // the MongoClient from the JS library
  public client: MongoClient;

  /**
   *
   * @param url the mongo database url
   * @param dbOptions the mongo db options to be passed to the client
   */
  constructor(url: string, dbOptions: MongoClientOptions) {
    this.client = this.getMongoClientInstance(url, dbOptions);
  }

  /**
   * returns the mongodb database object
   *
   * @param dbName the mongodb database name
   */
  public getDatabase$(dbName: string): Observable<Db> {
    const connectedClient$ = from(this.openConnection(this.client)).pipe(
      catchError(e => of(e))
    );

    return connectedClient$.pipe(map(client => client.db(dbName)));
  }

  public getCollection$(
    dbName: string,
    collectionName: string
  ): Observable<any[]> {
    return this.getDatabase$(dbName).pipe(
      map(db => db.collection(collectionName)),
      map(collection => collection.find().toArray()),
      flatMap(response => response)
    );
  }

  /**
   * write one document to a mongodb collection and return a new observable of the collection
   *
   * @param collectionName the collection that will receive the new document
   * @param databaseName the database that contains the target collection to be updated
   * @param newItem the new document
   *
   * TODO: Simplify this code to follow the same pattern as the writeManyToCollection
   */
  public writeOneToCollection$<T>(
    databaseName: string,
    collectionName: string,
    newItem: T
  ): Observable<T[]> {
    return new Observable<T[]>(observer => {
      const database$ = this.getDatabase$(databaseName);
      database$.subscribe(async db => {
        const cl = db.collection(collectionName);
        const result = await cl.insertOne(newItem);
        if (result.insertedCount === 1) {
          const updatedData = await cl.find().toArray();
          observer.next(updatedData);
          observer.complete();
        } else {
          observer.error("ERROR - writeOneToCollection");
        }
      });
    });
  }

  /**
   * write many documents to a mongodb collection
   *
   * @param collectionName the collection that will receive the new documents
   * @param databaseName the database that contains the target collection to be updated
   * @param newItems the new documents
   */
  public writeManyToCollection$<T>(
    dbName: string,
    collectionName: string,
    newItems: T[]
  ): Observable<T[]> {
    return this.getDatabase$(dbName).pipe(
      map(db => db.collection(collectionName)),
      flatMap(collection => collection.insertMany(newItems)),
      flatMap(res => {
        if (res.insertedCount === newItems.length) {
          return of(newItems);
        } else {
          throw new Error("ERROR - writeManyToCollection");
        }
      })
    );
  }

  /**
   * returns a new mongodb client
   *
   * @param url the mongodb url
   * @param opts the options to be passed to the client
   */
  private getMongoClientInstance(
    url: string,
    opts: MongoClientOptions
  ): MongoClient {
    return new MongoClient(url, opts);
  }

  /**
   * Since every operation in mongodb using the client has to open a new connection
   * this method opens the connection and on success returns the client.
   * On error returns the error sent by
   * mongodb
   *
   * @param client the client to be used to open the new connection
   */
  private openConnection(client: MongoClient): Promise<MongoClient> {
    return new Promise((resolve, reject) => {
      client.connect(e => {
        if (e) {
          reject(e);
        } else {
          resolve(client);
        }
      });
    });
  }
}
