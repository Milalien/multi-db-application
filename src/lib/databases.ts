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