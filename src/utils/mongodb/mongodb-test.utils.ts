import { MongoDocumentObject, WithoutKey } from "../types/index.types";

function removeIdsFromObject<T>(
  list: Array<MongoDocumentObject<T>>
): Array<WithoutKey<T, "_id">> {
  return list.map(item => {
    delete item._id;
    return item;
  });
}

export const mongoDbUtils = {
  removeIdsFromObject
};
