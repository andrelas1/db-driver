import { Observable, of } from "rxjs";

// TODO: find a way to run chrome headless in NODE
const localStorageMock = {
  data: {},
  getItem(key: string): any {
    return (this.data as any)[key] || null;
  },
  setItem(key: string, value: string) {
    (this.data as any)[key] = value;
  }
};

interface IDatabase<T> {
  [key: string]: T[];
}
export class LocalStorageDriver<T> {
  private database: IDatabase<T> = {};
  // constructor() {}
  public getCollection$(collectionName: string): Observable<any> {
    return of(this.database[collectionName]);
  }
}
