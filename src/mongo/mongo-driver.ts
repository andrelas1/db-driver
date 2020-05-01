import { Collection, Db, MongoClient, MongoClientOptions } from "mongodb";
import { BehaviorSubject, from, Observable, of, Subject } from "rxjs";
import {
  catchError,
  delay,
  flatMap,
  map,
  mergeMap,
  startWith,
  tap
} from "rxjs/operators";

import { MongoDocumentObject } from "../utils/types/index.types";
import { IOperationResult } from "./types";

/*
    Access the MongoDB as well as executes operations on a collection.
*/
export class MongoDbDriver {
  // the MongoClient from the JS library
  public client: MongoClient;
  public objects: Array<{
    dbName: string;
    collectionName: string;
    collection$: BehaviorSubject<any>;
  }> = [];

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
    const connectedClient$ = from(this.openConnection(this.client));

    return connectedClient$.pipe(
      catchError(err => {
        throw new Error(
          "The MongoDB client could not be instantiated. Log from the MongoDB client:  " +
            err
        );
      }),
      map(client => client.db(dbName))
    );
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
  ): Observable<BehaviorSubject<Array<MongoDocumentObject<T>>>> {
    const foundCollection$ = this.findCollection$(dbName, collectionName);
    if (foundCollection$) {
      return of(
        foundCollection$ as BehaviorSubject<Array<MongoDocumentObject<T>>>
      );
    } else {
      const connectedClient$ = from(this.openConnection(this.client));
      return new Observable<BehaviorSubject<Array<MongoDocumentObject<T>>>>(
        obs => {
          connectedClient$.subscribe(async client => {
            const db = client.db(dbName);
            const collection = await db.collection(collectionName);
            const result = await collection.find({}).toArray();
            const subject = new BehaviorSubject(result);
            this.objects.push({ dbName, collectionName, collection$: subject });
            obs.next(subject);
          });
        }
      );
    }

    // return this.getDatabase$(dbName).pipe(
    //   map(db => db.collection(collectionName)),
    //   map(collection => collection.find().toArray()),
    //   flatMap(response => response),
    //   tap(_ => {
    //     this.client.close();
    //   })
    // );
  }

  public findCollection$<T>(
    dbName: string,
    collectionName: string
  ): Observable<T[]> | undefined {
    const object = this.objects.find(
      db => db.dbName === dbName && db.collectionName === collectionName
    );
    return object ? object.collection$ : undefined;
  }

  /**
   * write one document to a mongodb collection and
   * return a new observable of the result of the operation
   *
   * @param collectionName the collection that will receive the new document
   * @param databaseName the database that contains the target
   * collection to be updated
   * @param newItem the new document
   *
   * @returns Observable of result
   */
  public writeOneToCollection$<T>(
    databaseName: string,
    collectionName: string,
    newItem: T
  ): Observable<IOperationResult> {
    const collectionObject = this.objects.find(
      object =>
        object.dbName === databaseName &&
        object.collectionName === collectionName
    );
    const connectedClient = from(this.openConnection(this.client));
    return new Observable<IOperationResult>(observer => {
      if (collectionObject) {
        connectedClient.subscribe(async client => {
          const db = client.db(databaseName);
          const cl = db.collection(collectionName);
          const { insertedCount, insertedId } = await cl.insertOne(newItem);
          const clData = await cl.find({}).toArray();
          collectionObject.collection$.next(clData);
          observer.next({ insertedCount, insertedId });
          observer.complete();
        });
      } else {
        observer.error(
          "the database and/or collection name are not registered"
        );
        // TODO: rename getCollection$ to registerCollection$
      }
    });

    // return this.getDatabase$(databaseName).pipe(
    //   map(db => db.collection(collectionName)),
    //   mergeMap(collection => {
    //     return from(collection.insertOne(newItem)).pipe(
    //       map(res => ({ col: collection.find().toArray(), command: res }))
    //     );
    //   }),
    //   flatMap(res => {
    //     if (res.command.insertedCount === 1) {
    //       return from(res.col);
    //     } else {
    //       throw new Error("ERROR - deleteOneFromCollection");
    //     }
    //   }),
    //   tap(_ => {
    //     this.client.close();
    //   })
    // );
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
          throw new Error("ERROR - writeManyToCollection");
        }
      }),
      tap(_ => {
        this.client.close();
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
      }),
      tap(_ => {
        this.client.close();
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
      }),
      tap(_ => {
        this.client.close();
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
