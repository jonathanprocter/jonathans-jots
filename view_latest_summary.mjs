import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'jonathans-jots', 'database.db'));

// Get the latest summary
const summaries = db.prepare('SELECT * FROM summaries ORDER BY id DESC LIMIT 1').all();

if (summaries.length === 0) {
  console.log('No summaries found');
} else {
  const summary = summaries[0];
  console.log('='.repeat(80));
  console.log('LATEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`ID: ${summary.id}`);
  console.log(`Book Title: ${summary.bookTitle}`);
  console.log(`Book Author: ${summary.bookAuthor}`);
  console.log(`Created: ${summary.createdAt}`);
  console.log('='.repeat(80));
  console.log('CONTENT:');
  console.log('='.repeat(80));
  console.log(summary.content);
  console.log('='.repeat(80));
}

db.close();
