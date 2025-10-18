import { drizzle } from "drizzle-orm/mysql2";
import { documents } from "./drizzle/schema.ts";
import { eq } from "drizzle-orm";
import fs from "fs";

const db = drizzle(process.env.DATABASE_URL);

// Get test_book.txt document
const testBook = await db.select().from(documents).where(eq(documents.originalFilename, "test_book.txt")).limit(1);
if (testBook.length > 0) {
  const text = fs.readFileSync("/home/ubuntu/test_book.txt", "utf-8");
  await db.update(documents)
    .set({ extractedText: text, status: "completed" })
    .where(eq(documents.id, testBook[0].id));
  console.log("Updated test_book.txt with extracted text");
}

// Get HelpfulInformation.rtf document
const helpfulInfo = await db.select().from(documents).where(eq(documents.originalFilename, "HelpfulInformation.rtf")).limit(1);
if (helpfulInfo.length > 0) {
  const rtfText = fs.readFileSync("/home/ubuntu/upload/HelpfulInformation.rtf", "utf-8");
  // Simple RTF text extraction (remove RTF control codes)
  const cleanText = rtfText
    .replace(/\\[a-z]+[0-9-]*\s?/g, '') // Remove RTF control words
    .replace(/[{}]/g, '') // Remove braces
    .replace(/\\/g, '') // Remove backslashes
    .trim();
  
  await db.update(documents)
    .set({ extractedText: cleanText, status: "completed" })
    .where(eq(documents.id, helpfulInfo[0].id));
  console.log("Updated HelpfulInformation.rtf with extracted text");
}

console.log("Done!");
process.exit(0);
