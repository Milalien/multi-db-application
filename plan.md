---

# Three PostgreSQL databases with a switchable front end

You write this. The blueprint below is enough to implement and defend the assignment. Do not submit generated code you cannot explain line by line.

## How this maps to the rubric

- **Working program:** one Next.js app, dev server, browser UI.
- **Number of databases:** three real PostgreSQL databases on one local server (`library`, `equipment`, `directory`). Three tables in one database would score weakly against “select which database”.
- **Access:** list rows from the selected database.
- **Modification:** insert, update, and delete on that database.
- **Dummy data:** SQL seed files you run yourself, checked into `sql/`.



## Stack

Next.js (App Router) + TypeScript + the `pg` driver. No ORM. You write the SQL, which is what you need to learn and to explain.

Each database is independent. PostgreSQL does not support foreign keys across databases, so do not model relationships between them.

```mermaid
flowchart LR
  UI[Next.js page]
  API[Route handlers]
  Pools[Three pg pools]
  Lib[(library)]
  Eq[(equipment)]
  Dir[(directory)]
  UI --> API
  API --> Pools
  Pools --> Lib
  Pools --> Eq
  Pools --> Dir
```



The browser never sends a raw database or table name into SQL. It sends a key (`library`, `equipment`, or `directory`). The server accepts only those three keys, then uses a fixed connection string and a fixed table name.

**What that means in practice**

1. The user picks “Library” on the page.
2. The browser calls `GET /api/library`. The word `library` is only a URL segment, not SQL.
3. The route file checks: is `library` one of the three allowed keys? If the URL is `/api/postgres` or `/api/drop-everything`, return 404 and stop.
4. Only after that check does the server look up the matching connection string (`.../library`) and table name (`books`). Those strings live in `src/lib/databases.ts`. They are never taken from the request body.

This is the whitelist. Without it, a client could try to put `books; DROP TABLE books` into a table name.

## What is already in the repo

Do not redo these. They are finished.


| Path                                                       | Status                                                                                       |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `sql/00_create_role_and_databases.sql`                     | written                                                                                      |
| `sql/library.sql`                                          | written                                                                                      |
| `sql/equipment.sql`                                        | written                                                                                      |
| `sql/directory.sql`                                        | written                                                                                      |
| `.env.example`                                             | written                                                                                      |
| Next.js scaffold (`package.json`, `src/app/layout.tsx`, …) | written                                                                                      |
| `src/lib/databases.ts`                                     | started — keys, URLs, table names, column *name* lists. You still need field types (Step 4). |
| `src/lib/pool.ts`                                          | written — read Step 5 so you can explain every line                                          |


Still empty or still the Next.js starter:


| Path                                   | What you write                                        |
| -------------------------------------- | ----------------------------------------------------- |
| `src/lib/rows.ts`                      | new file — turn a JSON body into typed values         |
| `src/app/api/[database]/route.ts`      | `GET` list, `POST` insert                             |
| `src/app/api/[database]/[id]/route.ts` | `PATCH` update, `DELETE` delete                       |
| `src/app/page.tsx`                     | selector, table, form, edit, delete                   |
| `README.md`                            | replace the create-next-app text                      |
| `.env.local`                           | copy of `.env.example` on your machine (never commit) |


This repo is Next.js 16.4. In this version, dynamic route `params` is a Promise. Every handler must `await params` before reading `database` or `id`. Example is in Step 6.

## Data model

One main table per database. Same operations, different columns, so the grader sees three different datasets.

- `library.books` — title, author, published_year, available
- `equipment.items` — name, category, quantity, location
- `directory.contacts` — full_name, email, role, phone

Copy the four scripts below into `sql/` if they are missing. Each schema file drops its table first, so you can re-run it to restore the dummy data. `CREATE DATABASE` cannot run inside a transaction and cannot run from a file that is already connected to `library`, so role and database creation stay in their own script.

Demo rows to point at: *Designing Data-Intensive Applications* is checked out (`available = false`), the laptop has `quantity = 0`, and Sara Niemi has no phone.

### `sql/00_create_role_and_databases.sql`

Run this once, as the `postgres` superuser, while connected to the `postgres` database. If a name already exists, skip that statement. Do not re-run the `DROP` lines unless you mean to delete those databases.

```sql
-- Run as postgres, connected to the postgres database:
--   psql -U postgres -d postgres -f sql/00_create_role_and_databases.sql

CREATE USER campus WITH PASSWORD 'campus_dev_password';

CREATE DATABASE library OWNER campus;
CREATE DATABASE equipment OWNER campus;
CREATE DATABASE directory OWNER campus;
```

Reset, only when you want to delete all three databases and start over:

```sql
DROP DATABASE IF EXISTS library;
DROP DATABASE IF EXISTS equipment;
DROP DATABASE IF EXISTS directory;
DROP USER IF EXISTS campus;
```



### `sql/library.sql`

```sql
-- Run as campus, connected to the library database:
--   psql -U campus -d library -f sql/library.sql

DROP TABLE IF EXISTS books;

CREATE TABLE books (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  published_year INTEGER,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT books_published_year_check CHECK (
    published_year IS NULL OR (published_year BETWEEN 1000 AND 2100)
  )
);

INSERT INTO books (title, author, published_year, available) VALUES
  ('The Left Hand of Darkness', 'Ursula K. Le Guin', 1969, TRUE),
  ('Clean Code', 'Robert C. Martin', 2008, TRUE),
  ('Designing Data-Intensive Applications', 'Martin Kleppmann', 2017, FALSE),
  ('The Dispossessed', 'Ursula K. Le Guin', 1974, TRUE),
  ('PostgreSQL: Up and Running', 'Regina O. Obe', 2017, TRUE),
  ('Klara and the Sun', 'Kazuo Ishiguro', 2021, TRUE);
```



### `sql/equipment.sql`

```sql
-- Run as campus, connected to the equipment database:
--   psql -U campus -d equipment -f sql/equipment.sql

DROP TABLE IF EXISTS items;

CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  location TEXT NOT NULL,
  CONSTRAINT items_quantity_check CHECK (quantity >= 0)
);

INSERT INTO items (name, category, quantity, location) VALUES
  ('Projector', 'AV', 4, 'Room 201'),
  ('HDMI cable', 'AV', 12, 'Storage A'),
  ('Laptop', 'Computing', 0, 'Repair bench'),
  ('Soldering iron', 'Workshop', 3, 'Bench 2'),
  ('First aid kit', 'Safety', 2, 'Lobby'),
  ('Ethernet tester', 'Networking', 1, 'Storage B');
```



### `sql/directory.sql`

```sql
-- Run as campus, connected to the directory database:
--   psql -U campus -d directory -f sql/directory.sql

DROP TABLE IF EXISTS contacts;

CREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  CONSTRAINT contacts_email_unique UNIQUE (email)
);

INSERT INTO contacts (full_name, email, role, phone) VALUES
  ('Aino Korhonen', 'aino.korhonen@example.com', 'Librarian', '+358 40 111 2233'),
  ('Mikael Lind', 'mikael.lind@example.com', 'Technician', '+358 40 222 3344'),
  ('Sara Niemi', 'sara.niemi@example.com', 'Instructor', NULL),
  ('Elias Virtanen', 'elias.virtanen@example.com', 'Front desk', '+358 40 444 5566'),
  ('Noora Makela', 'noora.makela@example.com', 'Coordinator', '+358 40 555 6677'),
  ('Leo Heinonen', 'leo.heinonen@example.com', 'Assistant', '+358 40 666 7788');
```

`SERIAL` creates an integer primary key and a sequence. You do not insert `id`; Postgres assigns 1, 2, 3, and so on. Run each schema file as `campus` so that user owns the table. If you create the table as `postgres` instead, the app login cannot read it until you grant access.

## PostgreSQL setup

Install once, then use `psql` for every database step. You do not need pgAdmin.

**Windows.** Install the EDB package from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/). During setup, set a password for the `postgres` user and leave the port at `5432`. Open “SQL Shell (psql)” from the Start menu. Press Enter for server, database, and port; user `postgres`; then the password you chose.

**macOS.** `brew install postgresql@16`, then `brew services start postgresql@16`. Connect with `psql postgres`.

**Linux (Debian/Ubuntu).**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl enable --now postgresql
sudo -u postgres psql
```

The four scripts are already in `sql/`. Apply them from the project folder. Each `psql` call prompts for a password: `postgres` uses the password you chose at install, `campus` uses `campus_dev_password`. Do not also type the `CREATE USER` statements by hand. The first script already does that.

```bash
psql -U postgres -d postgres -f sql/00_create_role_and_databases.sql
psql -U campus -d library -f sql/library.sql
psql -U campus -d equipment -f sql/equipment.sql
psql -U campus -d directory -f sql/directory.sql
```

On Windows, run those in “SQL Shell (psql)” by omitting `psql` and using `\i sql/library.sql` after you connect, or open PowerShell in the project folder if the installer added `psql` to PATH. Re-running a schema file restores that database’s dummy data without touching the other two.

Check the result:

```bash
psql -U campus -d library -c "SELECT id, title, available FROM books;"
psql -U campus -d equipment -c "SELECT id, name, quantity FROM items;"
psql -U campus -d directory -c "SELECT id, full_name, phone FROM contacts;"
```

Useful `psql` commands: `\l` lists databases, `\c library` switches database, `\dt` lists tables, `\d books` describes a table.

If `psql -U campus` says peer authentication failed on Linux, open `pg_hba.conf` (often `/etc/postgresql/16/main/pg_hba.conf`), set local connections for `campus` to `md5` or `scram-sha-256`, then `sudo systemctl reload postgresql`.

## Environment files

`.env.example` is already in the repo. It is a template. Next.js does **not** load it. Copy it to `.env.local` in the project root:

```
LIBRARY_DATABASE_URL=postgresql://campus:campus_dev_password@localhost:5432/library
EQUIPMENT_DATABASE_URL=postgresql://campus:campus_dev_password@localhost:5432/equipment
DIRECTORY_DATABASE_URL=postgresql://campus:campus_dev_password@localhost:5432/directory
```

What one URL means, piece by piece:

```
postgresql://campus:campus_dev_password@localhost:5432/library
           |      |                    |         |    |
           user   password             host      port database name
```

Three URLs, three database names at the end. Same user, same password, same host. That is how the app talks to three databases on one Postgres server.

`.env.local` is listed in `.gitignore`. Never commit it. After you create or change `.env.local`, restart `npm run dev`. Next.js reads env files only at process start.

`process.env.LIBRARY_DATABASE_URL` in `databases.ts` is how Node reads that first line. The `!` tells TypeScript “this is a string, not undefined”. If you forgot `.env.local`, the value is actually `undefined` and `pool.ts` throws `Missing connection string for library`.

---



# How a request travels (read this before writing code)

```mermaid
sequenceDiagram
  participant Browser
  participant Page as page.tsx
  participant Route as route.ts
  participant Pool as getPool
  participant PG as PostgreSQL

  Browser->>Page: user selects Library
  Page->>Route: GET /api/library
  Route->>Route: await params, isDatabaseKey
  Route->>Pool: getPool("library")
  Pool->>PG: SELECT ... FROM books
  PG-->>Page: JSON label, fields, rows
  Page->>Browser: table of books
```



Words used below:

- **Route handler** — a file named `route.ts` inside `src/app/api/...`. Next.js turns the folder path into a URL. `src/app/api/[database]/route.ts` becomes `/api/library`, `/api/equipment`, `/api/directory`. The `[database]` folder is a placeholder. The actual word in the URL is `params.database`.
- `pg.Pool` — a small set of reusable TCP connections to **one** Postgres database. Opening a new connection on every click is slow and Postgres will eventually refuse more connections. A pool opens a few, hands one out for a query, then puts it back.
- **Placeholder (**`$1`**,** `$2`**)** — the safe way to put values into SQL. `pg` sends the SQL string and the values array separately. Postgres never treats a value as SQL. Never write `DELETE FROM ${table} WHERE id = ${id}` using a value from the URL or body.

---



# Build order (do these in this order)

1. Install Postgres. Run the four SQL files. Confirm the three `SELECT` checks. (PostgreSQL setup above.)
2. Copy `.env.example` to `.env.local`. Restart is not needed yet if `npm run dev` is not running.
3. Extend `databases.ts` (Step 4).
4. Read `pool.ts` until you can explain it (Step 5). It is already written.
5. Write `src/lib/rows.ts` (Step 6).
6. Write `GET` in `[database]/route.ts`. Open `/api/library` in the browser. Then equipment and directory. Then `/api/postgres` (must 404).
7. Write `POST` in the same file. Test with PowerShell.
8. Write `PATCH` and `DELETE` in `[database]/[id]/route.ts`. Test with PowerShell.
9. Replace `page.tsx`. Click through select, list, create, edit, delete.
10. Restart Postgres, reload the page, confirm the data is still there (it lives in Postgres, not React state).
11. Rewrite `README.md`.

---



# Step 4 — Extend `src/lib/databases.ts`



## What is already there

The file currently stores column **names** as a list of strings:

```ts
columns: ["title", "author", "published_year", "available"] as const,
```

That is enough to know *which* columns exist. It is not enough to know *how to treat each one*.

- `title` is required text. Empty string is invalid.
- `published_year` is an integer, and it may be missing (SQL `NULL`).
- `available` is a boolean, not the strings `"true"` / `"false"`.
- `phone` is text that may be missing (SQL `NULL`).
- `quantity` is a required integer that cannot be negative.

A string `"published_year"` does not carry any of that. The route would have to hard-code `if (name === "published_year")` for every special column. That breaks the point of one route for three databases.

## What “field objects” means

Replace the string list with a list of objects. Each object describes one column.

**Before (what you have now) — library only:**

```ts
columns: ["title", "author", "published_year", "available"] as const,
```

**After — same four columns, each one an object:**

```ts
fields: [
  { name: "title", type: "text", required: true },
  { name: "author", type: "text", required: true },
  { name: "published_year", type: "integer", required: false },
  { name: "available", type: "boolean", required: true },
] as const,
```

What each property is:

- `name` — the exact Postgres column name. Must match `CREATE TABLE`. Used when building `SELECT title, author, ...`.
- `type` — `"text"` | `"integer"` | `"boolean"`. Tells `rows.ts` how to convert the JSON body, and tells the page which input to render (text box, number box, checkbox).
- `required` — `true` means reject missing/blank. `false` means store SQL `NULL` when the client sends nothing.

`as const` tells TypeScript: these strings are the literal values `"text"` and `"title"`, not a generic `string`. Without it, `field.type === "boolean"` is harder to type-check.

`id` is **not** in this list. `SERIAL` creates it. Inserts must not send `id`. Updates and deletes take `id` from the URL.

## Rename `columns` to `fields`

After this change the property is called `fields`, not `columns`. Routes and `rows.ts` will read `config.fields`. The old `columns` name can be deleted.

## Add `isDatabaseKey`

Routes receive `params.database` as a plain `string` (`"library"`, or garbage like `"postgres"`). TypeScript will not let you write `databases[params.database]` because a random string is not a key of `databases`.

A type-guard function fixes that:

```ts
export function isDatabaseKey(value: string): value is DatabaseKey {
  return value in databases;
}
```

- `value in databases` is `true` only for `"library"`, `"equipment"`, `"directory"`.
- `value is DatabaseKey` is a TypeScript predicate. After `if (!isDatabaseKey(database)) return 404`, TypeScript treats `database` as `"library" | "equipment" | "directory"`. Then `databases[database]` and `getPool(database)` compile.



## Finished file

Replace the whole file with this. Copy it, then read it until you can say what each key is for.

```ts
export const databases = {
  library: {
    label: "Library",
    connectionString: process.env.LIBRARY_DATABASE_URL!,
    table: "books",
    fields: [
      { name: "title", type: "text", required: true },
      { name: "author", type: "text", required: true },
      { name: "published_year", type: "integer", required: false },
      { name: "available", type: "boolean", required: true },
    ] as const,
  },
  equipment: {
    label: "Equipment",
    connectionString: process.env.EQUIPMENT_DATABASE_URL!,
    table: "items",
    fields: [
      { name: "name", type: "text", required: true },
      { name: "category", type: "text", required: true },
      { name: "quantity", type: "integer", required: true },
      { name: "location", type: "text", required: true },
    ] as const,
  },
  directory: {
    label: "Directory",
    connectionString: process.env.DIRECTORY_DATABASE_URL!,
    table: "contacts",
    fields: [
      { name: "full_name", type: "text", required: true },
      { name: "email", type: "text", required: true },
      { name: "role", type: "text", required: true },
      { name: "phone", type: "text", required: false },
    ] as const,
  },
} as const;

export type DatabaseKey = keyof typeof databases;

export function isDatabaseKey(value: string): value is DatabaseKey {
  return value in databases;
}
```

`keyof typeof databases` means “the keys of that object”: `"library" | "equipment" | "directory"`.

## The page must not import this file

`databases.ts` holds connection strings (user + password). Anything imported into a `"use client"` file can be bundled toward the browser. The `GET` handler will send `{ label, fields, rows }` instead. The page learns the column names from that JSON, not from importing `databases`.

---



# Step 5 — What `src/lib/pool.ts` does (already written)

A `pg.Pool` talks to **one** database. The database name is the last part of the URL (`.../library`). One pool cannot query `equipment` and `library`. You need up to three pools.

If a route did this on every request:

```ts
const pool = new Pool({ connectionString: databases.library.connectionString });
const result = await pool.query("SELECT ...");
```

each click would open new connections and never close them. After enough clicks Postgres returns “too many connections” and the app dies.

`pool.ts` keeps one pool per key in a `Map`. First request for `library` creates the pool. Later requests reuse it.

```mermaid
flowchart LR
  route[Route handler]
  getPool[getPool key]
  map[Map of pools]
  libPool[Pool library]
  eqPool[Pool equipment]
  dirPool[Pool directory]
  route --> getPool --> map
  map --> libPool
  map --> eqPool
  map --> dirPool
```





## The file, line by line

```ts
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
```


| Lines                                                        | What they do                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `import { Pool }`                                            | The `pg` class. One instance = one pool = one database.                                                                                                                                                                                                                                                     |
| `import { databases, type DatabaseKey }`                     | Need the URL for that key. `DatabaseKey` limits the argument to the three names.                                                                                                                                                                                                                            |
| `globalThis as ... { pgPools?: ... }`                        | `globalThis` is the process-wide object (`global` in Node). We store the map there in development.                                                                                                                                                                                                          |
| `pools = globalForPg.pgPools ?? new Map(...)`                | If a previous hot reload already created the map, reuse it. Otherwise start empty. `Map<DatabaseKey, Pool>` means at most three entries: library, equipment, directory.                                                                                                                                     |
| `if (NODE_ENV !== "production") globalForPg.pgPools = pools` | `next dev` reloads modules when you save a file. A module-level `const pools = new Map()` would be a *new* empty map after each save, while the old pools stay open in the background. Pinning the map on `globalThis` survives the reload. Production does not hot-reload, so this is only for `next dev`. |
| `getPool(key)`                                               | Only function routes call.                                                                                                                                                                                                                                                                                  |
| `pools.get(key)` / `if (existing) return existing`           | Already created? Hand it back. No new TCP connections beyond the pool’s own idle set (default max 10).                                                                                                                                                                                                      |
| `databases[key].connectionString`                            | The URL from `.env.local` for that one database.                                                                                                                                                                                                                                                            |
| `if (!connectionString) throw`                               | Fail with a clear message if `.env.local` is missing, instead of `pg` saying something about `undefined`.                                                                                                                                                                                                   |
| `new Pool({ connectionString })`                             | Create the pool. Connections are opened lazily on the first `query`.                                                                                                                                                                                                                                        |
| `pools.set(key, pool)`                                       | Remember it for the next call.                                                                                                                                                                                                                                                                              |


Routes do this, and never `new Pool` themselves:

```ts
const pool = getPool(database);
const result = await pool.query(
  "SELECT id, title, author, published_year, available FROM books ORDER BY id",
);
```

`pool.query(sql, values)` runs SQL. The optional second argument is the array that fills `$1`, `$2`, …

---



# Step 6 — Shared parse: `src/lib/rows.ts`

`POST` and `PATCH` both receive a JSON body from the browser, for example:

```json
{
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "published_year": 2008,
  "available": true
}
```

Postgres will not accept that object. It wants an array of values in column order:

```ts
["Clean Code", "Robert C. Martin", 2008, true]
```

JSON also lies about types. A number input often arrives as the string `"2008"`. A missing phone arrives as `""`. `available` must be a real boolean, not `"true"`.

Write one function used by both `POST` and `PATCH`. Put it in `src/lib/rows.ts` so both route files can import it. Do not import this file from `page.tsx`.

## Return type

Either the values array, or an error string. Routes turn the error string into HTTP 400.

```ts
export type ParseResult =
  | { ok: true; values: unknown[] }
  | { ok: false; error: string };
```



## Algorithm (walk `config.fields` in order)

1. If `body` is not a plain object (`null`, array, string), return `{ ok: false, error: "Expected a JSON object" }`.
2. Create an empty `values` array.
3. For each field in `databases[key].fields`, in that order:
  - Read `body[field.name]`. Extra keys on the body (`id`, `foo`) are ignored.
  - **text + required:** must be a string. After `.trim()`, must not be `""`. Push the trimmed string.
  - **text + not required** (`phone`): missing, `null`, or `""` after trim becomes `null`. Otherwise push the trimmed string.
  - **integer + required** (`quantity`): accept a JSON number (`5`) or a numeric string (`"5"`). `Number(...)` then `Number.isInteger`. Reject `NaN`, `1.5`, `"abc"`, and values `< 0`. Push the number.
  - **integer + not required** (`published_year`): missing, `null`, or `""` becomes `null`. Otherwise same integer rules as above (including `< 0` and non-integers). The table CHECK also rejects years outside 1000–2100; you may reject those here or let Postgres return `23514`.
  - **boolean** (`available`): accept only the booleans `true` and `false`. Reject `"true"`, `1`, `0`.
4. Return `{ ok: true, values }`.



## Example outcomes

Library body `{ "title": "X", "author": "Y", "published_year": "", "available": true }`

→ `{ ok: true, values: ["X", "Y", null, true] }`

Equipment body `{ "name": "Marker", "category": "Office", "quantity": "5", "location": "Desk" }`

→ `{ ok: true, values: ["Marker", "Office", 5, "Desk"] }`  
(`"5"` was coerced to the number `5`.)

Directory body `{ "full_name": "Sara", "email": "sara@example.com", "role": "Instructor" }`

→ `{ ok: true, values: ["Sara", "sara@example.com", "Instructor", null] }`  
(missing `phone` → `null`.)

Library body `{ "title": "", "author": "Y", "available": true }`

→ `{ ok: false, error: "title is required" }`

## Function shape to implement

```ts
import { databases, type DatabaseKey } from "./databases";

export function parseRow(
  key: DatabaseKey,
  body: unknown,
): ParseResult {
  // 1. reject non-objects
  // 2. loop databases[key].fields
  // 3. push coerced values or return { ok: false, error }
  // 4. return { ok: true, values }
}
```

Inside the loop, `field.name` is the key into the object (`title`, `quantity`, …). Use a type assertion if TypeScript complains that `body` has no index signature, for example `const raw = (body as Record<string, unknown>)[field.name]`.

---



# Step 7 — `src/app/api/[database]/route.ts` (`GET` and `POST`)

This file handles collection URLs:

- `GET  /api/library` — list every book
- `POST /api/library` — insert one book

The same file also serves `/api/equipment` and `/api/directory` because `[database]` is a placeholder.

## Next.js 16 params

The second argument looks like this. `params` is a Promise. You must await it.

```ts
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ database: string }> },
) {
  const { database } = await params;
  // ...
}
```

`_request` is unused on `GET`. The underscore tells the linter you meant to ignore it. `POST` uses `request` to read the body: `const body = await request.json()`.

## Start of every handler (copy this pattern into GET, POST, PATCH, DELETE)

```ts
const { database } = await params;
if (!isDatabaseKey(database)) {
  return Response.json({ error: "Unknown database" }, { status: 404 });
}
const config = databases[database];
const pool = getPool(database);
```

After the `if`, `database` is a `DatabaseKey`. `config.table` is `"books"` or `"items"` or `"contacts"`. Those strings came from your map, not from the client. It is safe to put `config.table` into the SQL string. Values from the body still go in `$1`, `$2`, never concatenated.

## Building the column list

Do not write `SELECT *`. Spell the columns so the JSON shape is stable.

```ts
const names = config.fields.map((field) => field.name);
// library → ["title", "author", "published_year", "available"]

const selectList = ["id", ...names].join(", ");
// "id, title, author, published_year, available"
```

`join(", ")` turns an array of names into one SQL fragment. The names are only the ones you listed in `databases.ts`.

## GET

SQL you are building (library example):

```sql
SELECT id, title, author, published_year, available
FROM books
ORDER BY id
```

Code shape:

```ts
try {
  const result = await pool.query(`SELECT ${selectList} FROM ${config.table} ORDER BY id`);
  return Response.json({
    label: config.label,
    fields: config.fields,
    rows: result.rows,
  });
} catch {
  return Response.json({ error: "Database unavailable" }, { status: 500 });
}
```

- `result.rows` is an array of objects, one per table row.
- Send `label` and `fields` so the page never imports `databases.ts`.
- `catch` with no `err` in the JSON. `err.message` from `pg` can include the connection string (user + password). Always send the fixed string `"Database unavailable"`.

Check before writing POST: start `npm run dev`, open these in the browser:

- `http://localhost:3000/api/library` — six books, plus `label` and `fields`
- `http://localhost:3000/api/equipment` — six items
- `http://localhost:3000/api/directory` — six contacts
- `http://localhost:3000/api/postgres` — `{ "error": "Unknown database" }` and status 404



## POST

1. `const body = await request.json()` (wrap in try/catch; invalid JSON → 400 `"Expected a JSON object"`).
2. `const parsed = parseRow(database, body)`.
3. If `!parsed.ok`, return 400 with `{ error: parsed.error }`.
4. Build placeholders `$1, $2, $3, $4` from the field count:

```ts
const placeholders = names.map((_, index) => `$${index + 1}`).join(", ");
// four fields → "$1, $2, $3, $4"
```

SQL you are building (library example):

```sql
INSERT INTO books (title, author, published_year, available)
VALUES ($1, $2, $3, $4)
RETURNING id, title, author, published_year, available
```

```ts
const result = await pool.query(
  `INSERT INTO ${config.table} (${names.join(", ")})
   VALUES (${placeholders})
   RETURNING ${selectList}`,
  parsed.values,
);
return Response.json(result.rows[0], { status: 201 });
```

`RETURNING` makes Postgres send back the new row, including the generated `id`. Status **201** means created.

## Postgres error codes on POST (and PATCH)

`pg` errors have a `code` string. Narrow with `'code' in err`.


| `err.code` | Meaning          | HTTP status | When it happens                                       |
| ---------- | ---------------- | ----------- | ----------------------------------------------------- |
| `23505`    | unique_violation | 409         | directory `email` already exists                      |
| `23514`    | check_violation  | 400         | `quantity < 0`, or `published_year` outside 1000–2100 |


Anything else in the `catch`: 500 `"Database unavailable"`.

```ts
} catch (err) {
  if (err && typeof err === "object" && "code" in err) {
    if (err.code === "23505") {
      return Response.json({ error: "Value already exists" }, { status: 409 });
    }
    if (err.code === "23514") {
      return Response.json({ error: "Value failed a database check" }, { status: 400 });
    }
  }
  return Response.json({ error: "Database unavailable" }, { status: 500 });
}
```

---



# Step 8 — `src/app/api/[database]/[id]/route.ts` (`PATCH` and `DELETE`)

This file handles one-row URLs:

- `PATCH  /api/library/3` — update book id 3
- `DELETE /api/directory/3` — delete contact id 3

There are two placeholders: `[database]` and `[id]`. Await params, then validate both.

```ts
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ database: string; id: string }> },
) {
  const { database, id: idParam } = await params;
  if (!isDatabaseKey(database)) {
    return Response.json({ error: "Unknown database" }, { status: 404 });
  }

  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  const config = databases[database];
  const pool = getPool(database);
  // ...
}
```

Why `Number(idParam)` and `Number.isInteger`:

- The URL segment is always a string (`"3"`, or `"abc"`).
- `Number("3")` is `3`. `Number("abc")` is `NaN`. `Number("3.2")` is `3.2`.
- `Number.isInteger(id) && id > 0` rejects `NaN`, `0`, negatives, and floats.
- This `id` becomes `$n` in the query. Never take `id` from the JSON body. A client must not rename row 3 into row 1 by sending `{ "id": 1 }`.



## PATCH

Same parse as POST. Same column order. The id is the **last** placeholder.

Four fields → values are `$1`–`$4`, id is `$5`.

SQL you are building (library, id 3):

```sql
UPDATE books
SET title = $1, author = $2, published_year = $3, available = $4
WHERE id = $5
RETURNING id, title, author, published_year, available
```

Build the `SET` clause from `fields`:

```ts
const setClause = names
  .map((name, index) => `${name} = $${index + 1}`)
  .join(", ");
// "title = $1, author = $2, published_year = $3, available = $4"

const idPlaceholder = `$${names.length + 1}`;
// "$5"
```

```ts
const result = await pool.query(
  `UPDATE ${config.table}
   SET ${setClause}
   WHERE id = ${idPlaceholder}
   RETURNING ${selectList}`,
  [...parsed.values, id],
);
```

`[...parsed.values, id]` is the values array plus the URL id at the end.

If nobody has that id, Postgres updates zero rows. `result.rowCount === 0` (or `result.rows.length === 0`) → 404 `{ error: "Not found" }`. Otherwise return `result.rows[0]` with status 200.

Use the same `23505` / `23514` handling as POST.

## DELETE

No body. Only the URL id.

```sql
DELETE FROM contacts WHERE id = $1 RETURNING id
```

```ts
const result = await pool.query(
  `DELETE FROM ${config.table} WHERE id = $1 RETURNING id`,
  [id],
);

if (result.rowCount === 0) {
  return Response.json({ error: "Not found" }, { status: 404 });
}
return Response.json({ id });
```



## PowerShell checks (dev server must be running)

```powershell
Invoke-RestMethod http://localhost:3000/api/library

Invoke-RestMethod http://localhost:3000/api/equipment -Method POST -ContentType "application/json" -Body '{"name":"Marker","category":"Office","quantity":5,"location":"Desk"}'

Invoke-RestMethod http://localhost:3000/api/library/3 -Method PATCH -ContentType "application/json" -Body '{"title":"Designing Data-Intensive Applications","author":"Martin Kleppmann","published_year":2017,"available":true}'

Invoke-RestMethod http://localhost:3000/api/directory/3 -Method DELETE
```

Expected:

- GET: object with `label`, `fields`, `rows` (six books).
- POST: the new item, including a new `id` (7 if you have not deleted anything).
- PATCH: book 3 with `available: true`.
- DELETE: `{ id: 3 }`. A second DELETE of `/api/directory/3` returns 404.

These writes change the real databases. Re-run the matching `sql/*.sql` file to restore dummy data before a grading demo:

```bash
psql -U campus -d equipment -f sql/equipment.sql
psql -U campus -d library -f sql/library.sql
psql -U campus -d directory -f sql/directory.sql
```

---



# Step 9 — `src/app/page.tsx`

Replace the whole starter page. This file is a **client component**. First line:

```ts
"use client";
```

That directive is required because the page uses `useState`, `useEffect`, and click handlers. Without it, Next.js treats the file as a server component and those APIs do not exist.

This file talks to your API with `fetch`. It must not import `pg`, `pool.ts`, `rows.ts`, or `databases.ts`.

## State you need

```ts
type Field = { name: string; type: "text" | "integer" | "boolean"; required: boolean };
type Row = { id: number; [column: string]: unknown };

const [database, setDatabase] = useState("library");
const [label, setLabel] = useState("Library");
const [fields, setFields] = useState<Field[]>([]);
const [rows, setRows] = useState<Row[]>([]);
const [form, setForm] = useState<Record<string, unknown>>({});
const [editingId, setEditingId] = useState<number | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```


| State       | Meaning                                                                                   |
| ----------- | ----------------------------------------------------------------------------------------- |
| `database`  | Which key is selected. Starts as `"library"`. Used in every `fetch` URL.                  |
| `label`     | Heading text from the API (`"Library"`).                                                  |
| `fields`    | Column descriptors from the API. Drives the table headers and the form inputs.            |
| `rows`      | Current table data.                                                                       |
| `form`      | The values sitting in the inputs. Keys are field names (`title`, `quantity`, …).          |
| `editingId` | `null` means the form will `POST` (create). A number means the form will `PATCH` that id. |
| `loading`   | True while a request is in flight. Show “Loading…”.                                       |
| `error`     | Last failure message, or `null`.                                                          |




## Load rows

Write an async function `load(key: string)`:

1. `setLoading(true)` and `setError(null)`.
2. `const response = await fetch(`/api/${key}`)`.
3. `const data = await response.json()`.
4. If `!response.ok`, `setError(data.error ?? "Request failed")`, clear rows, return.
5. `setLabel(data.label)`, `setFields(data.fields)`, `setRows(data.rows)`.
6. `finally`: `setLoading(false)`.

Call it from `useEffect` when `database` changes:

```ts
useEffect(() => {
  load(database);
}, [database]);
```

Also call `load(database)` after a successful POST, PATCH, or DELETE so the table refreshes.

## Selector

Hard-code the three options (these strings are the URL keys, not SQL):

```tsx
<select
  value={database}
  onChange={(event) => {
    setDatabase(event.target.value);
    setEditingId(null);
    setForm({});
  }}
>
  <option value="library">Library</option>
  <option value="equipment">Equipment</option>
  <option value="directory">Directory</option>
</select>
```

Changing the select updates `database` → `useEffect` refetches. Clearing `form` and `editingId` is required. Otherwise the Library title field would still hold a book title after you switch to Equipment.

## Heading, loading, empty, error

```tsx
<h1>{label}</h1>
{loading && <p>Loading…</p>}
{error && <p>{error}</p>}
{!loading && !error && rows.length === 0 && <p>No rows yet</p>}
```



## Table

When `fields` is `[{ name: "title", ... }, ...]`, headers are those `name`s plus an Actions column.

Each `row` is `{ id: 1, title: "Clean Code", ... }`. Cell value is `row[field.name]`.

Display rules:

- `null` or `undefined` → empty string (Sara Niemi’s phone).
- `field.type === "boolean"` → `row[field.name] ? "yes" : "no"`.
- anything else → `String(value)`.

Each row has two buttons:

- **Edit** — `setEditingId(row.id)` and copy that row into `form` (only the field names, not `id`):
  ```ts
  const next: Record<string, unknown> = {};
  for (const field of fields) next[field.name] = row[field.name];
  setForm(next);
  ```
- **Delete** — `if (!confirm("Delete this row?")) return;` then `fetch(`/api/${database}/${row.id}`, { method: "DELETE" })`. If not ok, set error. If ok, `load(database)`.



## Form

One form, not three. Loop `fields` and pick the input from `field.type`:


| `field.type` | Input                     | How to read it                                                                                     |
| ------------ | ------------------------- | -------------------------------------------------------------------------------------------------- |
| `"text"`     | `<input type="text">`     | string                                                                                             |
| `"integer"`  | `<input type="number">`   | string from the input; `rows.ts` coerces to number. Empty string is allowed for optional integers. |
| `"boolean"`  | `<input type="checkbox">` | `event.target.checked` (real boolean)                                                              |


`value={form[field.name] ?? ""}` for text/integer. `checked={form[field.name] === true}` for boolean. `onChange` writes that field back into `form` and leaves the other keys alone.

Submit handler:

1. `event.preventDefault()`.
2. If `editingId === null`, `POST /api/${database}` with `JSON.stringify(form)`.
3. If `editingId` is a number, `PATCH /api/${database}/${editingId}` with the same body.
4. Headers: `{ "Content-Type": "application/json" }`.
5. If not ok, set error from the JSON and stop.
6. `setEditingId(null)`, `setForm({})`, `load(database)`.

A Cancel button (shown only when `editingId !== null`) clears `editingId` and `form` without saving.

## What you must be able to explain

- `"use client"` — this component runs in the browser.
- `fetch("/api/library")` hits your route, not Postgres directly.
- Switching databases changes the URL key only. Table names stay on the server.
- After create/edit/delete you refetch. Reloading the browser page shows the same data because it is in Postgres.

---



# Step 10 — README

Replace the create-next-app boilerplate. Include, in this order:

1. What the app is: one Next.js UI that switches between three PostgreSQL databases (`library`, `equipment`, `directory`).
2. Windows Postgres install (EDB installer, port 5432, password for `postgres`).
3. The `psql` commands from the PostgreSQL setup section (create role + databases, then the three schema files).
4. Copy `.env.example` to `.env.local`. The three URLs point at three databases. Table names are **not** taken from the request; they come from `src/lib/databases.ts` after the URL key is checked against that map.
5. `npm install` then `npm run dev`. Open `http://localhost:3000`.
6. How to restore dummy data: re-run the matching `sql/*.sql` file as `campus`.

---



# Demo script for grading

- Start Postgres, then `npm run dev`.
- Show `\l` or say the three database names.
- Select Library, change a book’s availability, reload, show the row still changed.
- Switch to Equipment, add an item, show the library list unchanged.
- Delete a directory contact and refresh.

---



# Out of scope

Accounts, login, a second framework, an ORM, and cross-database joins. None of them are in the rubric.