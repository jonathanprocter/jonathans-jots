async function testNewModels() {
  try {
    const documentId = 'iR0r8TAqWSoQ_dPUX1MtB'; // The PDF we uploaded
    
    console.log('🚀 Testing summary generation with Claude Sonnet 4.5 and GPT-4.1');
    console.log('Document ID:', documentId);
    
    // Generate summary
    const summaryResponse = await fetch('http://127.0.0.1:5000/api/trpc/summaries.generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        json: {
          documentId,
          bookTitle: 'The Next Conversation - Bonus Chapter',
          bookAuthor: 'Jonathan Vieker',
        },
      }),
    });
    
    const summaryResult = await summaryResponse.json();
    
    if (summaryResult.result?.data?.json?.summaryId) {
      const summaryId = summaryResult.result.data.json.summaryId;
      console.log('\n✅ Summary generation started! Summary ID:', summaryId);
      console.log('📊 Monitoring progress with Claude Sonnet 4.5...\n');
      
      let summaryComplete = false;
      let progressAttempts = 0;
      let lastProgress = -1;
      
      while (!summaryComplete && progressAttempts < 120) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const progressResponse = await fetch(`http://127.0.0.1:5000/api/trpc/summaries.progress?input=${encodeURIComponent(JSON.stringify({ json: { summaryId } }))}`);
        const progressResult = await progressResponse.json();
        
        if (progressResult.result?.data?.json) {
          const { status, progress, currentSection } = progressResult.result.data.json;
          
          // Only log if progress changed
          if (progress !== lastProgress) {
            const progressBar = '█'.repeat(Math.floor((progress || 0) / 5)) + '░'.repeat(20 - Math.floor((progress || 0) / 5));
            console.log(`[${new Date().toLocaleTimeString()}] ${progressBar} ${progress}% | Section: ${currentSection || 'Starting...'}`);
            lastProgress = progress;
          }
          
          if (status === 'completed') {
            summaryComplete = true;
            console.log('\n🎉 Summary generation completed successfully!');
            
            // Fetch the final summary
            const finalSummaryResponse = await fetch(`http://127.0.0.1:5000/api/trpc/summaries.get?input=${encodeURIComponent(JSON.stringify({ json: { summaryId } }))}`);
            const finalSummary = await finalSummaryResponse.json();
            
            if (finalSummary.result?.data?.json) {
              const data = finalSummary.result.data.json;
              console.log('\n=== 📝 Summary Details ===');
              console.log('Status:', data.status);
              
              if (data.content) {
                const sections = Object.keys(data.content);
                console.log('Total sections:', sections.length);
                console.log('Section names:', sections.slice(0, 5).join(', '), '...');
                
                // Show a snippet of the first section
                const firstSection = sections[0];
                if (firstSection && data.content[firstSection]) {
                  const snippet = data.content[firstSection].substring(0, 200);
                  console.log(`\n📖 Preview of "${firstSection}":`);
                  console.log(snippet + '...\n');
                }
              }
              
              if (data.researchSources && data.researchSources.length > 0) {
                console.log('Research sources:', data.researchSources.length);
                console.log('Sample sources:', data.researchSources.slice(0, 3).map((s: any) => s.title).join(', '));
              }
            }
          } else if (status === 'failed') {
            console.log('\n❌ Summary generation failed');
            console.log('Error:', progressResult.result.data.json.errorMessage || 'Unknown error');
            summaryComplete = true;
          }
        }
        
        progressAttempts++;
      }
      
      if (!summaryComplete) {
        console.log('\n⏰ Timeout: Summary generation took longer than expected (10 minutes)');
      }
    } else {
      console.log('❌ Failed to start summary generation');
      console.log('Response:', JSON.stringify(summaryResult, null, 2));
    }
  } catch (error) {
    console.error('\n💥 Error during test:', error);
  }
}

testNewModels();
