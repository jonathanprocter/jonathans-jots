import { drizzle } from "drizzle-orm/mysql2";
import { documents } from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);
const results = await db.select({
  id: documents.id,
  filename: documents.originalFilename,
  fileType: documents.fileType,
  hasText: documents.extractedText,
  status: documents.status
}).from(documents);

results.forEach(doc => {
  console.log(`${doc.filename} (${doc.fileType}): ${doc.hasText ? doc.hasText.substring(0, 50) + '...' : 'NO TEXT'} - ${doc.status}`);
});
