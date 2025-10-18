import { drizzle } from "drizzle-orm/mysql2";
import { summaries } from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);
const results = await db.select().from(summaries).limit(5);
console.log(JSON.stringify(results, null, 2));
