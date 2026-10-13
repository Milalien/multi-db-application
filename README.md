# Campus Management System

A small Next.js app for browsing and editing three separate PostgreSQL databases from one page: a library catalog, an equipment inventory, and a staff directory.

The browser talks only to this app. Each database has its own connection string and connection pool on the server.

## What you can do

Open the app, pick a database, and work with its rows:

- **List** every row in the current table.
- **Add** a row. The form fields come from that database’s configuration.
- **Edit** a row. Saving sends the full set of fields.
- **Delete** a row after a confirmation prompt.

Switching the dropdown reloads the other database. `id` is assigned by PostgreSQL and is not shown or edited in the form.


| Key         | Label     | Database    | Table      | Columns                                                                                                                               |
| ----------- | --------- | ----------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `library`   | Library   | `library`   | `books`    | `title` (text, required), `author` (text, required), `published_year` (integer, optional, 1000–2100), `available` (boolean, required) |
| `equipment` | Equipment | `equipment` | `items`    | `name` (text, required), `category` (text, required), `quantity` (integer, required, 0 or more), `location` (text, required)          |
| `directory` | Directory | `directory` | `contacts` | `full_name` (text, required), `email` (text, required, unique), `role` (text, required), `phone` (text, optional)                     |


Booleans display as Yes or No. Text and integer fields display as stored.

## API

Routes are under `/api`. `{database}` is `library`, `equipment`, or `directory`. Any other name returns `404` with `{ "error": "Unknown database" }`.

Column names and the table name come from `src/lib/databases.ts`. Values are sent as query parameters (`$1`, `$2`, …). The request body must be a JSON object that includes every configured field, including optional ones (`published_year` and `phone` may be `null`).

### `GET /api/{database}`

Returns the label, field definitions, and all rows ordered by `id`.

```json
{
  "label": "Library",
  "fields": [
    { "name": "title", "type": "text", "required": true }
  ],
  "rows": [
    { "id": 1, "title": "Clean Code", "author": "Robert C. Martin", "published_year": 2008, "available": true }
  ]
}
```


| Status | Body                                  |
| ------ | ------------------------------------- |
| `200`  | `{ label, fields, rows }`             |
| `404`  | `{ "error": "Unknown database" }`     |
| `500`  | `{ "error": "Database unavailable" }` |


### `POST /api/{database}`

Inserts one row. Example for library:

```http
POST /api/library
Content-Type: application/json

{
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "published_year": 2008,
  "available": true
}
```


| Status | Body                                                                                                                                   |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `201`  | The inserted row, including `id`                                                                                                       |
| `400`  | `{ "error": "Body must be an object" }`, `{ "error": "Missing required field: …" }`, or `{ "error": "Value failed a database check" }` |
| `404`  | `{ "error": "Unknown database" }`                                                                                                      |
| `409`  | `{ "error": "Value already exists" }` (directory email)                                                                                |
| `500`  | `{ "error": "Database unavailable" }`                                                                                                  |


### `PATCH /api/{database}/{id}`

Replaces every configured column on that row. `{id}` must be a positive integer. The body has the same shape as `POST`.


| Status | Body                                                     |
| ------ | -------------------------------------------------------- |
| `200`  | The updated row                                          |
| `400`  | Invalid body, invalid `id`, or a failed check constraint |
| `404`  | Unknown database, or `{ "error": "Row not found" }`      |
| `409`  | `{ "error": "Value already exists" }`                    |
| `500`  | `{ "error": "Database unavailable" }`                    |


### `DELETE /api/{database}/{id}`

Deletes the row with that `id`.


| Status | Body                                            |
| ------ | ----------------------------------------------- |
| `200`  | `{ "id": 1 }`                                   |
| `400`  | `{ "error": "Invalid id" }`                     |
| `404`  | Unknown database, or `{ "error": "Not found" }` |
| `500`  | `{ "error": "Database unavailable" }`           |


## Databases

Three PostgreSQL databases, owned by the role `campus`. Schemas and sample rows are in `sql/`.


| File                                   | Run against                         | Creates                               |
| -------------------------------------- | ----------------------------------- | ------------------------------------- |
| `sql/00_create_role_and_databases.sql` | database `postgres`, as a superuser | role `campus` and the three databases |
| `sql/library.sql`                      | database `library`, as `campus`     | table `books` and sample books        |
| `sql/equipment.sql`                    | database `equipment`, as `campus`   | table `items` and sample equipment    |
| `sql/directory.sql`                    | database `directory`, as `campus`   | table `contacts` and sample contacts  |


`sql/library.sql`, `sql/equipment.sql`, and `sql/directory.sql` drop their table before creating it. Running them again wipes the data in that table.

The app keeps one `pg` pool per database (`src/lib/pool.ts`) and reads connection strings from the environment (`src/lib/databases.ts`).

## Run it on your machine

### Prerequisites

- [Node.js](https://nodejs.org/) 20.9 or newer (this project uses Next.js 16)
- npm (included with Node.js)
- [PostgreSQL](https://www.postgresql.org/download/) with `psql` on your `PATH`
- A superuser that can create roles and databases (the default `postgres` user)

### 1. Create the role and databases

From the project root, connected as a superuser to the `postgres` database:

```bash
psql -U postgres -d postgres -f sql/00_create_role_and_databases.sql
```

That script creates the role `campus` with password `zO2dcu8TdQ5x24Rw`, then creates `library`, `equipment`, and `directory`.

On Windows, if `psql` is not on your `PATH`, use the full path, for example:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d postgres -f sql/00_create_role_and_databases.sql
```

### 2. Load each schema

```bash
psql -U campus -d library -f sql/library.sql
psql -U campus -d equipment -f sql/equipment.sql
psql -U campus -d directory -f sql/directory.sql
```

Use the password from step 1 when prompted.

### 3. Configure the app

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

If PostgreSQL is not on port `5432`, or not on this machine, change the host and port in all three URLs. If you change the password in the SQL script, use that same password here.

### 4. Install dependencies

```bash
npm install
```

### 5. Start the app

Development (reloads when you edit files):

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Production build, then serve that build:

```bash
npm run build
npm start
```

`npm start` also serves [http://localhost:3000](http://localhost:3000). Run the build again after you change source files.

Lint:

```bash
npm run lint
```

## Project layout


| Path                                   | Role                                              |
| -------------------------------------- | ------------------------------------------------- |
| `src/app/page.tsx`                     | Database picker, table, and add/edit form         |
| `src/app/api/[database]/route.ts`      | `GET` and `POST`                                  |
| `src/app/api/[database]/[id]/route.ts` | `PATCH` and `DELETE`                              |
| `src/lib/databases.ts`                 | Database keys, tables, fields, connection strings |
| `src/lib/pool.ts`                      | One PostgreSQL pool per database                  |
| `src/lib/rows.ts`                      | Checks that a JSON body includes every field      |
| `sql/`                                 | Role, database, table, and sample-data scripts    |


