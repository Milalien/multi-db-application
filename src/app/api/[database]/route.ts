import { databases, isDatabaseKey } from "@/lib/databases";
import { getPool } from "@/lib/pool";
import { parseRow } from "@/lib/rows";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ database: string }> },
  ) {
    const { database } = await params;
    if (!isDatabaseKey(database)) {
        return Response.json({ error: "Unknown database" }, { status: 404 });
      }
      const config = databases[database];
      const pool = getPool(database);
      const names = config.fields.map((field) => field.name);
      const selectList = ["id", ...names].join(", ");
      
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
  }

  export async function POST(
    _request: Request,
    { params }: { params: Promise<{ database: string }> },
  ) {
    const { database } = await params;
    if (!isDatabaseKey(database)) {
      return Response.json({ error: "Unknown database" }, { status: 404 });
    }
    const config = databases[database];
    const pool = getPool(database);
    const body = await _request.json();
    const names = config.fields.map((field) => field.name);
    const selectList = ["id", ...names].join(", ");
    const placeholders = names.map((_, index) => `$${index + 1}`).join(", ");
    const parsed = parseRow(database, body)
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    try {
      const result = await pool.query(
      `INSERT INTO ${config.table} (${names.join(", ")})
       VALUES (${placeholders})
       RETURNING ${selectList}`,
      parsed.values,
      );
      return Response.json(result.rows[0], { status: 201 });
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