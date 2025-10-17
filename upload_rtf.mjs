import { readFileSync } from 'fs';
import fetch from 'node-fetch';

async function uploadAndProcess() {
  try {
    // Read the RTF file
    const filePath = '/home/ubuntu/upload/HelpfulInformation.rtf';
    const fileBuffer = readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');
    const filename = 'HelpfulInformation.rtf';
    const fileSize = fileBuffer.length;

    console.log('Uploading file:', filename);
    console.log('File size:', fileSize, 'bytes');

    // Upload the document
    const uploadResponse = await fetch('http://localhost:3001/api/trpc/documents.upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename,
        fileData: base64Data,
        fileSize,
      }),
    });

    const uploadResult = await uploadResponse.json();
    console.log('Upload result:', JSON.stringify(uploadResult, null, 2));

    if (uploadResult.result?.data?.documentId) {
      const documentId = uploadResult.result.data.documentId;
      console.log('\nDocument ID:', documentId);
      console.log('Waiting for document processing to complete...');

      // Wait for processing to complete
      let processed = false;
      let attempts = 0;
      while (!processed && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusResponse = await fetch(`http://localhost:3001/api/trpc/documents.get?input=${encodeURIComponent(JSON.stringify({ documentId }))}`);
        const statusResult = await statusResponse.json();
        
        if (statusResult.result?.data?.status === 'completed') {
          processed = true;
          console.log('Document processing completed!');
          console.log('Extracted text length:', statusResult.result.data.extractedText?.length || 0);
          
          // Now generate summary
          console.log('\nGenerating Shortform summary...');
          const summaryResponse = await fetch('http://localhost:3001/api/trpc/summaries.generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              documentId,
              bookTitle: 'Helpful Information',
              bookAuthor: 'Unknown',
            }),
          });

          const summaryResult = await summaryResponse.json();
          console.log('Summary generation started:', JSON.stringify(summaryResult, null, 2));
          
          if (summaryResult.result?.data?.summaryId) {
            console.log('\nSummary ID:', summaryResult.result.data.summaryId);
            console.log('Summary generation will take 2-5 minutes.');
            console.log('Check the application UI to view the completed summary.');
          }
        } else if (statusResult.result?.data?.status === 'failed') {
          console.error('Document processing failed:', statusResult.result.data.errorMessage);
          break;
        } else {
          console.log(`Attempt ${attempts + 1}/30: Status is ${statusResult.result?.data?.status || 'unknown'}`);
        }
        attempts++;
      }

      if (!processed) {
        console.log('Document processing is taking longer than expected. Check the UI for status.');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

uploadAndProcess();
