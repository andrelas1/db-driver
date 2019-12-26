import { MongoClientOptions } from "mongodb";
import { Observable, Subject } from "rxjs";
import { MongoDbDriver } from "./mongo";

interface IConnectionConfig {
  url: string;
  username?: string;
  password?: string;
}

export class DatabaseDriver {
  public database: {
    [key: string]: Subject<any[]>;
  } = {};
  private client: MongoDbDriver;

  constructor(
    public dbType: "mongodb" | "mysql" | "postgresql",
    connectionConfig: IConnectionConfig,
    options?: any
  ) {
    this.client = this.initClient(dbType, connectionConfig, options);
  }

  public insert<T>(
    dbName: string,
    collectionName: string,
    data: T[] | T
  ): Observable<T[]> {
    if (data instanceof Array) {
      return this.client.writeManyToCollection$<T>(
        dbName,
        collectionName,
        data
      );
    } else {
      return this.client.writeOneToCollection$<T>(dbName, collectionName, data);
    }
  }
  public delete<T>(
    dbName: string,
    collectionName: string,
    data: T
  ): Observable<T[]> {
    return this.client.deleteOneFromCollection$<T>(
      dbName,
      collectionName,
      data
    );
  }

  public update<T>(
    dbName: string,
    collectionName: string,
    oldData: T,
    newData: T
  ) {
    return this.client.updateOneFromCollection$(
      dbName,
      collectionName,
      oldData,
      newData
    );
  }

  public read<T>(dbName: string, collectionName: string): Observable<T[]> {
    return this.client.getCollection$(dbName, collectionName);
  }

  private initClient(
    dbType: string,
    connectionConfig: IConnectionConfig,
    options: any
  ): MongoDbDriver {
    switch (dbType) {
      case "mysql":
        throw new Error("MySQL is not supported yet");
      case "postgresql":
        throw new Error("PostGreSQL is not supported yet");
      default:
        return new MongoDbDriver(
          connectionConfig.url,
          options as MongoClientOptions
        );
    }
  }
}
