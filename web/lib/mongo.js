// lib/mongo.js
// One shared MongoDB connection (Atlas). Server code only.
import { MongoClient } from "mongodb";

const g = globalThis;

function getClient() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set in .env.local");
  if (!g._mongoClientPromise) {
    // Give up after 4 seconds if Atlas is unreachable, so the app never hangs
    const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 4000 });
    g._mongoClientPromise = client.connect();
    // If the first connection fails, forget it so the next request can retry
    g._mongoClientPromise.catch(() => {
      g._mongoClientPromise = null;
    });
  }
  return g._mongoClientPromise;
}

export async function getDb() {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB || "fraud_activity");
}
