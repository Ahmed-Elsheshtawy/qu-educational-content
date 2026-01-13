import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the source directory (2 levels up)
dotenv.config({ path: path.join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB_NAME || 'qu_academic_content';

console.log('Connecting to:', uri.replace(/:[^:@]+@/, ':****@')); // Log URI with hidden password

let client;
let db;

export async function connectToDatabase() {
  try {
    if (db) {
      return db;
    }

    client = new MongoClient(uri);
    await client.connect();
    
    console.log('✅ Connected to MongoDB successfully');
    
    db = client.db(dbName);
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not connected. Call connectToDatabase() first.');
  }
  return db;
}

export async function closeConnection() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Collections helper functions
export async function getCoursesCollection() {
    await connectToDatabase();
  return getDatabase().collection('courses');
}

export async function getResourcesCollection() {
    await connectToDatabase();
  return getDatabase().collection('resources');
}
