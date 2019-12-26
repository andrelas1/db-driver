import { Db, MongoClient, MongoClientOptions } from "mongodb";
import { from, Observable, of, OperatorFunction } from "rxjs";
import { catchError, flatMap, map, merge, mergeMap, tap } from "rxjs/operators";

/*
    Access the MongoDB as well as executes operations on the collection.
*/
export class MongoDbDriver {
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

  /**
   * Should return an observable that is triggered
   * everytime a write/delete operation is done.
   *
   * Done via a subject?
   *
   * @param dbName
   * @param collectionName
   *
   * @returns observable of the chosen collection
   */
  public getCollection$<T>(
    dbName: string,
    collectionName: string
  ): Observable<T[]> {
    return this.getDatabase$(dbName).pipe(
      map(db => db.collection(collectionName)),
      map(collection => collection.find().toArray()),
      flatMap(response => response)
    );
  }

  /**
   * write one document to a mongodb collection and
   * return a new observable of the collection
   *
   * @param collectionName the collection that will receive the new document
   * @param databaseName the database that contains the target
   * collection to be updated
   * @param newItem the new document
   *
   */
  public writeOneToCollection$<T>(
    databaseName: string,
    collectionName: string,
    newItem: T
  ): Observable<T[]> {
    return this.getDatabase$(databaseName).pipe(
      map(db => db.collection(collectionName)),
      mergeMap(collection => {
        return from(collection.insertOne(newItem)).pipe(
          map(res => ({ col: collection.find().toArray(), command: res }))
        );
      }),
      flatMap(res => {
        if (res.command.insertedCount === 1) {
          return from(res.col);
        } else {
          throw new Error("ERROR - deleteOneFromCollection");
        }
      })
    );
  }

  /**
   * write many documents to a mongodb collection
   *
   * @param collectionName the collection that will receive the new documents
   * @param databaseName the database that contains the target
   * collection to be updated
   * @param newItems the new documents
   */
  public writeManyToCollection$<T>(
    dbName: string,
    collectionName: string,
    newItems: T[]
  ): Observable<T[]> {
    return this.getDatabase$(dbName).pipe(
      map(db => db.collection(collectionName)),
      mergeMap(collection => {
        return from(collection.insertMany(newItems)).pipe(
          map(res => ({ col: collection.find().toArray(), command: res }))
        );
      }),
      flatMap(res => {
        if (res.command.insertedCount === newItems.length) {
          return from(res.col);
        } else {
          throw new Error("ERROR - deleteOneFromCollection");
        }
      })
    );
  }

  /**
   * Deletes an item from a collection
   *
   * @param dbName
   * @param collectionName
   * @param item
   *
   * @returns the updated collection
   */
  public deleteOneFromCollection$<T>(
    dbName: string,
    collectionName: string,
    item: T
  ): Observable<T[]> {
    return this.getDatabase$(dbName).pipe(
      // TODO: create custom operator
      map(db => db.collection(collectionName)),
      mergeMap(collection => {
        return from(collection.deleteOne(item)).pipe(
          map(res => ({ col: collection.find().toArray(), command: res }))
        );
      }),
      flatMap(res => {
        if (res.command.deletedCount === 1) {
          return from(res.col);
        } else {
          throw new Error("ERROR - deleteOneFromCollection");
        }
      })
    );
  }

  /**
   * Deletes items from a collection
   *
   * @param dbName
   * @param collectionName
   * @param items
   *
   * @returns the updated collection
   */
  public deleteAllFromCollection$<T>(
    dbName: string,
    collectionName: string
  ): Observable<T[]> {
    return this.getDatabase$(dbName).pipe(
      // TODO: create custom operator
      map(db => db.collection(collectionName)),
      mergeMap(collection => {
        return from(collection.deleteMany({})).pipe(
          map(res => ({ col: collection.find().toArray(), command: res }))
        );
      }),
      flatMap(res => {
        return from(res.col);
      })
    );
  }

  public updateOneFromCollection$<T>(
    dbName: string,
    collectionName: string,
    oldItem: T,
    newItem: T
  ): Observable<T[]> {
    return this.getDatabase$(dbName).pipe(
      map(db => db.collection(collectionName)),
      mergeMap(collection => {
        return from(
          collection.updateOne(oldItem, { $set: { ...newItem } })
        ).pipe(
          map(res => ({ col: collection.find().toArray(), command: res }))
        );
      }),
      flatMap(res => {
        return from(res.col);
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
   * Since every operation in mongodb using the client has to open a
   * new connection
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
