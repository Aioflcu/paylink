// scripts/test_mongo_connection.js
// Usage:
// MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/dbname?retryWrites=true&w=majority" node scripts/test_mongo_connection.js

const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Please set MONGODB_URI environment variable and rerun.');
    process.exit(1);
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    // Run a simple command
    const adminDb = client.db().admin();
    const info = await adminDb.serverStatus();
    console.log('Connected to MongoDB OK - version:', info.version);

    // Optionally list collections in the provided database
    const dbName = client.db().databaseName || process.env.MONGODB_DB || 'default_db';
    const db = client.db(dbName);
    const cols = await db.listCollections().toArray();
    console.log(`Collections in ${dbName}:`, cols.map(c => c.name));
  } catch (err) {
    console.error('MongoDB connection failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    await client.close().catch(()=>{});
  }
}

main();
