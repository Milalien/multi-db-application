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

## Data model

One main table per database. Same operations, different columns, so the grader sees three different datasets.

- `library.books` — title, author, published_year, available
- `equipment.items` — name, category, quantity, location
- `directory.contacts` — full_name, email, role, phone

Copy the four scripts below into `sql/`. Each schema file drops its table first, so you can re-run it to restore the dummy data. `CREATE DATABASE` cannot run inside a transaction and cannot run from a file that is already connected to `library`, so role and database creation stay in their own script.

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

Save the four scripts from the data-model section into `sql/`, then apply them from the project folder. Each `psql` call prompts for a password: `postgres` uses the password you chose at install, `campus` uses `campus_dev_password`. Do not also type the `CREATE USER` statements by hand. The first script already does that.

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

Put the three URLs in `.env.local` (never commit this file) and commit `.env.example` with the same keys and placeholder passwords:

```
LIBRARY_DATABASE_URL=postgresql://campus:campus_dev_password@localhost:5432/library
EQUIPMENT_DATABASE_URL=postgresql://campus:campus_dev_password@localhost:5432/equipment
DIRECTORY_DATABASE_URL=postgresql://campus:campus_dev_password@localhost:5432/directory
```



## App layout you create

Scaffold it yourself from the repo root, in a subdirectory, then move the files up if you want them at the root:

```bash
npx create-next-app@latest campus-desk --typescript --tailwind --eslint --app --src-dir --use-npm
cd campus-desk
npm install pg
npm install -D @types/pg
```

Files to add after the scaffold:

- `sql/00_create_role_and_databases.sql`, `sql/library.sql`, `sql/equipment.sql`, `sql/directory.sql` — the scripts in this plan
- `src/lib/databases.ts` — the only place database keys, connection strings, table names, and column definitions exist
- `src/lib/pool.ts` — one `pg.Pool` per key, created lazily and reused
- `src/app/api/[database]/route.ts` — `GET` list, `POST` insert
- `src/app/api/[database]/[id]/route.ts` — `PATCH` update, `DELETE` delete
- `src/app/page.tsx` — selector, table, create form, edit, delete
- `README.md` — setup, how to run, how to reset dummy data

`src/lib/databases.ts` should look like a closed map, not a string the client controls:

```ts
export const databases = {
  library: {
    label: "Library",
    connectionString: process.env.LIBRARY_DATABASE_URL!,
    table: "books",
    columns: ["title", "author", "published_year", "available"] as const,
  },
  equipment: {
    label: "Equipment",
    connectionString: process.env.EQUIPMENT_DATABASE_URL!,
    table: "items",
    columns: ["name", "category", "quantity", "location"] as const,
  },
  directory: {
    label: "Directory",
    connectionString: process.env.DIRECTORY_DATABASE_URL!,
    table: "contacts",
    columns: ["full_name", "email", "role", "phone"] as const,
  },
} as const;

export type DatabaseKey = keyof typeof databases;
```

Column types the routes must coerce before `pool.query`: `published_year` and `quantity` are integers, `available` is boolean, `phone` may be null. Every other field is required text. These names match the `CREATE TABLE` scripts. `id` is not in `columns` because `SERIAL` fills it.

Every route starts with: if `params.database` is not a key of `databases`, return 404. Then read `databases[key].table` and `columns`. Build `INSERT` / `UPDATE` / `SELECT` / `DELETE` with `$1`, `$2`, … placeholders. Pass values as an array to `pool.query`. Do not concatenate user input into SQL.

Column types differ (`available` is boolean, `quantity` and `published_year` are integers). Coerce in the route before the query, and reject missing required fields with 400.

`id` is never taken from the body for inserts. Deletes and updates use the numeric `id` from the URL only after `Number.isInteger`.

## Front end behavior

One page is enough.

- A control that lists Library, Equipment, and Directory. Changing it refetches and clears the form.
- The heading shows the active database name so the switch is obvious.
- A table of the current rows.
- A form whose fields come from that database’s `columns` (you can hard-code three small forms if a dynamic form is harder to explain).
- Each row has Edit and Delete. Edit fills the form and saves with `PATCH`. Delete asks for confirmation, then `DELETE`.
- Loading, empty (“No rows yet”), and error text for a failed request or a database that is down.

Use `fetch` from a client component (`"use client"`). Keep SQL and `pg` only in the route handlers.

## Build order

1. Install PostgreSQL and confirm `\l` shows the three databases.
2. Copy the four SQL scripts into `sql/` and run them in order. Confirm the three `SELECT` checks before any app code.
3. Scaffold Next.js and add `.env.local`.
4. Implement `databases.ts` and `pool.ts`. Add a temporary `GET` that returns `SELECT *` for `library` and open it in the browser.
5. Repeat for the other two keys using the same route and the whitelist.
6. Add `POST`, `PATCH`, and `DELETE`. Test with `curl` or the browser before building the form.
7. Build the page: select database, list, create, edit, delete.
8. Restart PostgreSQL and reload the page to confirm the data really lives in Postgres, not in React state.



## Demo script for grading

- Start Postgres, then `npm run dev`.
- Show `\l` or say the three database names.
- Select Library, change a book’s availability, reload, show the row still changed.
- Switch to Equipment, add an item, show the library list unchanged.
- Delete a directory contact and refresh.



## README to turn in with the code

Include: PostgreSQL install for your OS, the `CREATE USER` / `CREATE DATABASE` commands, how to run each file in `sql/`, the `.env.example` keys, and `npm install` then `npm run dev`. State that the three connection strings point at three databases, and that table names are not taken from the request.

## Out of scope

Accounts, login, a second framework, an ORM, and cross-database joins. None of them are in the rubric.