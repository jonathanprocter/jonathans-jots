import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  const [summaries] = await connection.execute(
    "SELECT id, bookTitle, status, errorMessage FROM summaries ORDER BY createdAt DESC LIMIT 5"
  );

  console.log("Recent summaries:");
  summaries.forEach(s => {
    console.log(`\nID: ${s.id}`);
    console.log(`Title: ${s.bookTitle}`);
    console.log(`Status: ${s.status}`);
    if (s.errorMessage) {
      console.log(`Error: ${s.errorMessage}`);
    }
  });
} finally {
  await connection.end();
}
