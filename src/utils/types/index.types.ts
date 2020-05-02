import { BehaviorSubject, Observable } from "rxjs";

// Generic types
export type WithoutKey<T, K> = Pick<T, Exclude<keyof T, K>>;

// Mongo Types
export type MongoDocumentObject<T> = T & { _id: string };
export interface IMongoOperationResult {
  insertedCount: number;
  insertedId: any;
}

// Client Driver types
export interface IOperationResult {
  operationType: "create" | "delete" | "read" | "update";
  affectedCount: number;
  affectedIds: string[];
}

export interface IClientDriver {
  // TODO: make this type generic
  writeDataToCollection$: <T>(
    dbName: string,
    collectionName: string,
    data: T | T[]
  ) => Observable<IOperationResult>;
  getCollection$: <T>(
    dbName: string,
    collectionName: string
  ) => // TODO: replace this any type
  Observable<BehaviorSubject<any>>;
  updateDataInCollection$: <T>(
    dbName: string,
    collectionName: string,
    oldData: T | T[],
    newData: T | T[]
  ) => Observable<IOperationResult>;
  deleteDataFromCollection$: <T>(
    dbName: string,
    collectionName: string,
    item: T
  ) => Observable<IOperationResult>;
}
