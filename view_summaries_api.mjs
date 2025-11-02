import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000';

async function viewSummaries() {
  try {
    // Fetch summaries
    console.log('Fetching summaries from API...');
    const response = await fetch(`${API_URL}/api/trpc/summaries.list`);
    
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      return;
    }
    
    const data = await response.json();
    const summaries = data.result?.data || [];
    
    console.log(`\nFound ${summaries.length} summaries\n`);
    console.log('='.repeat(100));
    
    if (summaries.length > 0) {
      // Show the latest summary (first in the list)
      const latest = summaries[0];
      console.log('LATEST SUMMARY');
      console.log('='.repeat(100));
      console.log(`ID: ${latest.id}`);
      console.log(`Book Title: ${latest.bookTitle || 'N/A'}`);
      console.log(`Book Author: ${latest.bookAuthor || 'N/A'}`);
      console.log(`Created: ${latest.createdAt}`);
      console.log('='.repeat(100));
      console.log('CONTENT (first 5000 characters):');
      console.log('='.repeat(100));
      console.log(latest.content.substring(0, 5000));
      console.log('\n...[content truncated]...\n');
      console.log('='.repeat(100));
      console.log(`\nTotal content length: ${latest.content.length} characters`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

viewSummaries();
