import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
    url: process.env["DATABASE_URL"],
  },
  migrations: {
    path: "src/prisma/migrations",
  },
  schema: "src/prisma/schema.prisma",
  
})