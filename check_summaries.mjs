import Database from 'better-sqlite3';

const db = new Database('./drizzle/db.sqlite');
const summaries = db.prepare('SELECT id, documentId, status, mainContent FROM summaries').all();

console.log('Total summaries:', summaries.length);

const nullContent = summaries.filter(s => !s.mainContent || s.mainContent === 'null');
console.log('Summaries with NULL/empty mainContent:', nullContent.length);

if (nullContent.length > 0) {
  console.log('\nDetails:');
  nullContent.forEach(s => {
    console.log(`  ID: ${s.id}, Status: ${s.status}, DocumentID: ${s.documentId}`);
  });
}

const completed = summaries.filter(s => s.status === 'completed');
console.log('\nCompleted summaries:', completed.length);

db.close();

