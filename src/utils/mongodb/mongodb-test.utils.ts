import { MongoClient } from "mongodb";
import { dbDriverOpts } from "../../config";
import { MongoDocumentObject, WithoutId } from "../types/index.types";

function removeIdsFromObject<T>(
  list: Array<MongoDocumentObject<T>>
): Array<WithoutId<T, "_id">> {
  return list.map(item => {
    delete item._id;
    return item;
  });
}

async function setupMongoDB(
  client: MongoClient,
  uri: string
): Promise<boolean> {
  try {
    client = new MongoClient(uri, dbDriverOpts);
    await client.connect();
    client.db("test-db");
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export { removeIdsFromObject, setupMongoDB };
