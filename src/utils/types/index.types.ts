export type WithoutId<T, K> = Pick<T, Exclude<keyof T, K>>;
export type MongoDocumentObject<T> = T & { _id: string };
