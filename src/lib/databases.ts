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