import fs from 'fs';
import path from 'path';

async function testUpload() {
  try {
    const pdfPath = path.join(process.cwd(), 'attached_assets', 'The_Next_Conversation_Bonus_Chapter_1761966391989.pdf');
    
    // Read the file
    const fileBuffer = fs.readFileSync(pdfPath);
    const fileSize = fileBuffer.length;
    const filename = 'The_Next_Conversation_Bonus_Chapter.pdf';
    
    // Convert to base64
    const fileData = fileBuffer.toString('base64');
    
    console.log('File size:', fileSize, 'bytes');
    console.log('Filename:', filename);
    
    // Make request to tRPC endpoint
    const response = await fetch('http://127.0.0.1:5000/api/trpc/documents.upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        json: {
          filename,
          fileData,
          fileSize,
        },
      }),
    });
    
    const result = await response.json();
    console.log('Upload response:', JSON.stringify(result, null, 2));
    
    if (result.result?.data?.documentId) {
      const documentId = result.result.data.documentId;
      console.log('\n✅ Upload successful! Document ID:', documentId);
      
      // Wait for processing to complete
      console.log('\nWaiting for document processing...');
      let processed = false;
      let attempts = 0;
      
      while (!processed && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const docResponse = await fetch(`http://127.0.0.1:5000/api/trpc/documents.get?input=${encodeURIComponent(JSON.stringify({ json: { documentId } }))}`);
        const docResult = await docResponse.json();
        
        if (docResult.result?.data?.status === 'completed') {
          processed = true;
          console.log('✅ Document processed successfully!');
          console.log('Extracted text length:', docResult.result.data.extractedText?.length || 0);
          
          // Now test summary generation
          console.log('\n--- Testing Summary Generation ---');
          const summaryResponse = await fetch('http://127.0.0.1:5000/api/trpc/summaries.generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              json: {
                documentId,
                bookTitle: 'The Next Conversation',
                bookAuthor: 'Unknown Author',
              },
            }),
          });
          
          const summaryResult = await summaryResponse.json();
          console.log('Summary generation response:', JSON.stringify(summaryResult, null, 2));
          
          if (summaryResult.result?.data?.summaryId) {
            const summaryId = summaryResult.result.data.summaryId;
            console.log('\n✅ Summary generation started! Summary ID:', summaryId);
            
            // Monitor summary progress
            console.log('\nMonitoring summary generation progress...');
            let summaryComplete = false;
            let progressAttempts = 0;
            
            while (!summaryComplete && progressAttempts < 60) {
              await new Promise(resolve => setTimeout(resolve, 5000));
              
              const progressResponse = await fetch(`http://127.0.0.1:5000/api/trpc/summaries.progress?input=${encodeURIComponent(JSON.stringify({ json: { summaryId } }))}`);
              const progressResult = await progressResponse.json();
              
              if (progressResult.result?.data) {
                const { status, progress, currentSection } = progressResult.result.data;
                console.log(`Status: ${status}, Progress: ${progress}%, Section: ${currentSection || 'N/A'}`);
                
                if (status === 'completed') {
                  summaryComplete = true;
                  console.log('\n✅ Summary generation completed successfully!');
                  
                  // Fetch the final summary
                  const finalSummaryResponse = await fetch(`http://127.0.0.1:5000/api/trpc/summaries.get?input=${encodeURIComponent(JSON.stringify({ json: { summaryId } }))}`);
                  const finalSummary = await finalSummaryResponse.json();
                  
                  if (finalSummary.result?.data?.content) {
                    console.log('\nSummary sections:', Object.keys(finalSummary.result.data.content).length);
                    console.log('Research sources:', finalSummary.result.data.researchSources?.length || 0);
                  }
                } else if (status === 'failed') {
                  console.log('❌ Summary generation failed:', progressResult.result.data.errorMessage);
                  summaryComplete = true;
                }
              }
              
              progressAttempts++;
            }
          }
        } else if (docResult.result?.data?.status === 'failed') {
          console.log('❌ Document processing failed:', docResult.result.data.errorMessage);
          processed = true;
        }
        
        attempts++;
      }
      
      if (!processed) {
        console.log('⚠️  Document processing timeout after 60 seconds');
      }
    }
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testUpload();
