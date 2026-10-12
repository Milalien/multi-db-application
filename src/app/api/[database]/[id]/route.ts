import { databases, isDatabaseKey } from "@/lib/databases";
import { getPool } from "@/lib/pool";
import { parseRow } from "@/lib/rows";


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
    const names = config.fields.map((field) => field.name);
    const selectList = ["id", ...names].join(", ");
    const body = await request.json();
    const parsed = parseRow(database, body);
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const setClause = names
    .map((name, index) => `${name} = $${index + 1}`)
    .join(", ");

    const idPlaceholder = `$${names.length + 1}`;

    try {
        const result = await pool.query(
        `UPDATE ${config.table}
        SET ${setClause}
        WHERE id = ${idPlaceholder}
        RETURNING ${selectList}`,
        [...parsed.values, id],
        );
        if (result.rowCount === 0) {
          return Response.json({ error: "Row not found" }, { status: 404 });
        }
        return Response.json(result.rows[0], { status: 200 });
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
  }

  export async function DELETE(
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
    try {
        const result = await pool.query(
        `DELETE FROM ${config.table} WHERE id = $1 RETURNING id`,
        [id],
        );

        if (result.rowCount === 0) {
        return Response.json({ error: "Not found" }, { status: 404 });
        }
        return Response.json({ id });
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

  }