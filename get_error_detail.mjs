import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  const [summaries] = await connection.execute(
    'SELECT id, bookTitle, status, errorMessage FROM summaries WHERE id = ? LIMIT 1',
    ['1KyjwQAmNfN_xsABtFF81']
  );
  
  if (summaries.length > 0) {
    const s = summaries[0];
    console.log('Summary ID:', s.id);
    console.log('Title:', s.bookTitle);
    console.log('Status:', s.status);
    console.log('Error Message:', s.errorMessage);
  }
} finally {
  await connection.end();
}
