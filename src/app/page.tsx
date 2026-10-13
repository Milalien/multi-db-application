// src/app/page.tsx
// This component runs on the client side and is used to display the data from the database.
"use client";

import { useEffect, useState } from "react";

type Field = { name: string; type: "text" | "integer" | "boolean"; required: boolean };
type Row = { id: number; [column: string]: unknown };

export default function Page() {

  // State variables
  const [database, setDatabase] = useState("library");
  const [label, setLabel] = useState("Library");
  const [fields, setFields] = useState<Field[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Loads the data from databases
  async function load(key: string) {
      setLoading(true);
      setError(null);
      try {
          const response = await fetch(`/api/${key}`);
          const data = await response.json();
          if (!response.ok) {
            setError(data.error ?? "Request failed");
            setRows([]);
            return;
          }
          setLabel(data.label);
          setFields(data.fields);
          setRows(data.rows);
          setLoading(false);
      } catch (error) {
          setError(error instanceof Error ? error.message : "Unknown error");
          setRows([]);
          setLoading(false);
      }
  }

  // Deletes a row from the database
  async function deleteRow(id: number) {
      setLoading(true);
      setError(null);
      if (!confirm("Delete this row?")) return;
      try {
          const response = await fetch(`/api/${database}/${id}`, { method: "DELETE" });
          const data = await response.json();
          if (!response.ok) {
              setError(data.error ?? "Request failed");
              return;
          }
          load(database);
      } catch (error) {
          setError(error instanceof Error ? error.message : "Unknown error");
      }
  }

  // Handles the submission of the edit form
  async function handleEditSubmit(event: React.SubmitEvent<HTMLFormElement>) {
      event.preventDefault();
      if (editingId === null) {
        //POST
        const response = await fetch(`/api/${database}`, { 
            method: "POST", 
            body: JSON.stringify(form) 
        });
        const newRow = await response.json();
        setRows([...rows, newRow]);
        load(database);
        setEditingId(null);
        setAdding(false);
        setForm({});
      } else if (typeof editingId === "number") {
        //PATCH
        const response = await fetch(`/api/${database}/${editingId}`, { 
            method: "PATCH", 
            body: JSON.stringify(form) 
        });
        const updatedRow = await response.json();
        setRows(rows.map((row) => row.id === editingId ? updatedRow : row));
        load(database);
        setEditingId(null);
        setAdding(false);
        setForm({});
      }
  }

  // Handles the cancellation of the edit form
  async function handleEditCancel() {
      setEditingId(null);
      setAdding(false);
      setForm({});
  }

  // Edits a row
  function editRow(id: number) {
    setAdding(false);
    setEditingId(id);
    const next: Record<string, unknown> = {};
    for (const field of fields) next[field.name] = rows.find((row) => row.id === id)?.[field.name];
    setForm(next);
  }

  // Adds a new row
  function addRow() {
    setEditingId(null);
    setAdding(true);
    const next: Record<string, unknown> = {};
    for (const field of fields) {
      next[field.name] =
        field.type === "boolean" ? false : field.type === "integer" ? 0 : "";
    }
    setForm(next);
  }

  // Loads the data from the database when the database changes
    useEffect(() => {
        load(database);
    }, [database]);

    return (
        <div className="flex flex-col gap-4">
          <div className="flex flex-row gap-2">
            {/* Select the database */}
            <p className="font-bold text-lg">Select a database:</p>
          <select className="font-bold text-lg"

          value={database}
          onChange={(event) => {
              setDatabase(event.target.value);
              setEditingId(null);
              setForm({});
              load(event.target.value);
            }}>
            <option value="library" className="text-black bg-white">Library</option>
            <option value="equipment" className="text-black bg-white">Equipment</option>
            <option value="directory" className="text-black bg-white">Directory</option>
          </select>
          </div>
            <h1 className="text-2xl font-bold text-center">{label}</h1>
            {loading && <p>Loading…</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!loading && !error && rows.length === 0 && <p>No rows yet</p>}
            {!loading && !error && rows.length > 0 && (
                <table className="w-[90%] max-w-[850px] mx-auto rounded-md">
                    <thead className="text-center">
                        <tr>
                            {fields.map((field) => <th className="h-10 p-2 uppercase" key={field.name}>{field.name}</th>)}
                            <th className="h-10 p-2 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-center">
                        {rows.map((row) => (
                            <tr key={row.id}>
                                {fields.map((field) => <td className="" key={field.name}>{
                                (field.type === "boolean") ? 
                                (row[field.name] as boolean ? "Yes" : "No") :
                                (row[field.name] as string ?? "")}
                                </td>)}
                                <td className="flex flex-col justify-center items-center h-full py-2">
                                    <button className="bg-purple-500 text-white p-2 rounded-md hover:bg-purple-600 w-16 m-1" onClick={() => editRow(row.id)}>Edit</button>
                                    <button className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600 w-16 m-1" onClick={() => deleteRow(row.id)}>Delete</button>

                                </td>
                              
                            </tr>
                        ))}
                        <tr>
                            <td colSpan={fields.length + 1} className="text-center">
                                <button className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 w-16 m-1" onClick={() => addRow()}>Add</button>
                            </td>
                        </tr>
                    </tbody>
                </table>                
            )}

            {(adding || editingId !== null) && (
                <form onSubmit={handleEditSubmit} className="w-[500px] mx-auto">
                    {fields.map((field) => (
                        <div key={field.name} className="mb-2 flex flex-col gap-2 align-start justify-start">
                            <label htmlFor={field.name} className="font-bold text-lg uppercase">{field.name}</label>
                            <input className={field.type === "boolean" ? "w-8 border-2 border-gray-300 rounded-md p-2 h-8" : "w-full border-2 border-gray-300 rounded-md p-2 h-8"} 
                            type={field.type === "boolean" ? "checkbox" : field.type === "integer" ? "number" : "text"}
                            required={field.required && field.type !== "boolean"}
                            {...(field.type === "boolean"
                              ? { checked: Boolean(form[field.name]) }
                              : { value: (form[field.name] as string) ?? "" })}
                            onChange={(event) => {
                              const value = field.type === "boolean" ? event.target.checked : event.target.value;
                              setForm({ ...form, [field.name]: value });
                            }}
                            />
                        </div>
                    ))}
                    <button className="bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600 mr-2 mt-2" onClick={handleEditCancel}>Cancel</button>
                    <button className="bg-green-500 text-white px-2 py-1 rounded-md hover:bg-green-600 mt-2" type="submit">Save</button>
                </form>
            )}
        </div>
    );
}