import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000';

async function generateSummary() {
  try {
    // First, get the list of documents
    console.log('Fetching documents...');
    const docsResponse = await fetch(`${API_URL}/api/trpc/documents.list`);
    const docsData = await docsResponse.json();
    console.log('Documents response:', JSON.stringify(docsData, null, 2));
    
    // Find The Righteous Mind document
    const docs = docsData.result?.data || [];
    const righteousMind = docs.find(d => d.filename?.includes('RighteousMind') || d.filename?.includes('Righteous Mind'));
    
    if (!righteousMind) {
      console.log('The Righteous Mind document not found. Available documents:');
      docs.forEach(d => console.log(`- ${d.filename} (ID: ${d.id})`));
      return;
    }
    
    console.log(`\nFound document: ${righteousMind.filename} (ID: ${righteousMind.id})`);
    console.log('Initiating summary generation...\n');
    
    // Generate summary
    const summaryResponse = await fetch(`${API_URL}/api/trpc/summaries.generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId: righteousMind.id,
        bookTitle: 'The Righteous Mind: Why Good People Are Divided by Politics and Religion',
        bookAuthor: 'Jonathan Haidt'
      })
    });
    
    const summaryData = await summaryResponse.json();
    console.log('Summary generation initiated:', JSON.stringify(summaryData, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

generateSummary();
