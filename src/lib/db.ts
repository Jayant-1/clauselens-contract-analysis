import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// On Vercel / AWS Lambda, initialize SQLite in /tmp so it is readable and writable
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const tmpDbPath = path.join("/tmp", "dev.db");
  if (!fs.existsSync(tmpDbPath)) {
    const rootDbPath = path.join(process.cwd(), "dev.db");
    const prismaDbPath = path.join(process.cwd(), "prisma", "dev.db");
    if (fs.existsSync(rootDbPath)) {
      try {
        fs.copyFileSync(rootDbPath, tmpDbPath);
      } catch (e) {
        console.warn("Could not copy dev.db to /tmp:", e);
      }
    } else if (fs.existsSync(prismaDbPath)) {
      try {
        fs.copyFileSync(prismaDbPath, tmpDbPath);
      } catch (e) {
        console.warn("Could not copy prisma/dev.db to /tmp:", e);
      }
    } else {
      try {
        process.env.DATABASE_URL = "file:/tmp/dev.db";
        execSync("npx prisma db push --skip-generate --accept-data-loss", { stdio: "ignore" });
      } catch (e) {
        console.warn("Could not run prisma db push in /tmp:", e);
      }
    }
  }
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("./dev.db")) {
    process.env.DATABASE_URL = "file:/tmp/dev.db";
  }
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export default db;
