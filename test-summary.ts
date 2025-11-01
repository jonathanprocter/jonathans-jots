async function testSummary() {
  try {
    const documentId = 'iR0r8TAqWSoQ_dPUX1MtB'; // The most recent upload
    
    console.log('Testing summary generation for document:', documentId);
    
    // Generate summary
    const summaryResponse = await fetch('http://127.0.0.1:5000/api/trpc/summaries.generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        json: {
          documentId,
          bookTitle: 'The Next Conversation',
          bookAuthor: 'Jonathan Vieker',
        },
      }),
    });
    
    const summaryResult = await summaryResponse.json();
    console.log('Summary generation response:', JSON.stringify(summaryResult, null, 2));
    
    if (summaryResult.result?.data?.json?.summaryId) {
      const summaryId = summaryResult.result.data.json.summaryId;
      console.log('\n✅ Summary generation started! Summary ID:', summaryId);
      
      // Monitor summary progress
      console.log('\nMonitoring summary generation progress...');
      let summaryComplete = false;
      let progressAttempts = 0;
      
      while (!summaryComplete && progressAttempts < 120) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const progressResponse = await fetch(`http://127.0.0.1:5000/api/trpc/summaries.progress?input=${encodeURIComponent(JSON.stringify({ json: { summaryId } }))}`);
        const progressResult = await progressResponse.json();
        
        if (progressResult.result?.data?.json) {
          const { status, progress, currentSection } = progressResult.result.data.json;
          console.log(`[${new Date().toLocaleTimeString()}] Status: ${status}, Progress: ${progress}%, Section: ${currentSection || 'N/A'}`);
          
          if (status === 'completed') {
            summaryComplete = true;
            console.log('\n✅ Summary generation completed successfully!');
            
            // Fetch the final summary
            const finalSummaryResponse = await fetch(`http://127.0.0.1:5000/api/trpc/summaries.get?input=${encodeURIComponent(JSON.stringify({ json: { summaryId } }))}`);
            const finalSummary = await finalSummaryResponse.json();
            
            if (finalSummary.result?.data?.json?.content) {
              const content = finalSummary.result.data.json.content;
              console.log('\n=== Summary Details ===');
              console.log('Summary sections:', Object.keys(content).length);
              console.log('Section names:', Object.keys(content).join(', '));
              console.log('Research sources:', finalSummary.result.data.json.researchSources?.length || 0);
              
              // Show a snippet of the first section
              const firstSection = Object.keys(content)[0];
              if (firstSection && content[firstSection]) {
                const firstSectionContent = content[firstSection].substring(0, 200);
                console.log(`\nFirst section (${firstSection}):\n${firstSectionContent}...`);
              }
            }
          } else if (status === 'failed') {
            console.log('❌ Summary generation failed:', progressResult.result.data.json.errorMessage || 'Unknown error');
            summaryComplete = true;
          }
        }
        
        progressAttempts++;
      }
      
      if (!summaryComplete) {
        console.log('⚠️  Summary generation timeout after 10 minutes');
      }
    }
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testSummary();
