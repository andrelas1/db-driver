import { MongoMemoryServer } from "mongodb-memory-server";

interface IMongoDbTestDbUtils {
  dbName: string;
  dbPath: string;
  mongod: MongoMemoryServer;
  uri: string;
  port: number;
}

/**
 * returns a useful object to be used in tests for mongodb
 */
export async function setupMongoTestDb(): Promise<IMongoDbTestDbUtils> {
  const mongod = new MongoMemoryServer();
  const uri = await mongod.getConnectionString();
  const port = await mongod.getPort();
  const dbPath = await mongod.getDbPath();
  const dbName = await mongod.getDbName();
  return {
    dbName,
    dbPath,
    mongod,
    port,
    uri
  };
}
