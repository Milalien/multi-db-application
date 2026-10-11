import { Pool } from "pg";
import { databases, type DatabaseKey } from "./databases";

const globalForPg = globalThis as unknown as { pgPools?: Map<DatabaseKey, Pool> };
const pools = globalForPg.pgPools ?? new Map<DatabaseKey, Pool>();
if (process.env.NODE_ENV !== "production") globalForPg.pgPools = pools;

export function getPool(key: DatabaseKey): Pool {
  const existing = pools.get(key);
  if (existing) return existing;

  const connectionString = databases[key].connectionString;
  if (!connectionString) {
    throw new Error(`Missing connection string for ${key}`);
  }

  const pool = new Pool({ connectionString });
  pools.set(key, pool);
  return pool;
}