// Postgres client for server-side database access.
// Connects via the Supabase pooler (transaction mode) so it works on Vercel serverless.
import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. See .env.example.');
}

// disable prepare for transaction-mode pooler compatibility on Supabase
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
export { schema };
