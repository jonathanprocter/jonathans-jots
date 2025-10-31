import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  const [summaries] = await connection.execute(
    "SELECT id, documentId, status, LENGTH(mainContent) as contentLength FROM summaries"
  );

  console.log("Total summaries:", summaries.length);

  const nullContent = summaries.filter(
    s => !s.contentLength || s.contentLength === 0
  );
  console.log("Summaries with NULL/empty mainContent:", nullContent.length);

  if (nullContent.length > 0) {
    console.log("\nDetails:");
    nullContent.forEach(s => {
      console.log(
        `  ID: ${s.id}, Status: ${s.status}, DocumentID: ${s.documentId}`
      );
    });
  }

  const completed = summaries.filter(s => s.status === "completed");
  console.log("\nCompleted summaries:", completed.length);

  if (completed.length > 0) {
    console.log("\nCompleted summary details:");
    completed.forEach(s => {
      console.log(`  ID: ${s.id}, Content Length: ${s.contentLength} chars`);
    });
  }
} finally {
  await connection.end();
}
