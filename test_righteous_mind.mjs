import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'http://localhost:3000';

async function testUploadAndSummary() {
  console.log('='.repeat(80));
  console.log('Testing Jonathan\'s Jots - Upload and Summary Generation');
  console.log('Document: The Righteous Mind - Why Good People Are Divided');
  console.log('Model: Claude Sonnet 4.5 with 64K max output tokens');
  console.log('='.repeat(80));
  console.log();

  try {
    // Step 1: Upload the document
    console.log('Step 1: Uploading document...');
    const filePath = path.join(__dirname, 'uploads', 'TheRighteousMind-WhyGoodPeopleAreDividedbyPoliticsandReligion.pdf');
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileStats = fs.statSync(filePath);
    console.log(`  File size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);

    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('title', 'The Righteous Mind');
    formData.append('author', 'Jonathan Haidt');

    console.log(`  Uploading to ${API_BASE}/api/documents/upload...`);
    
    const uploadResponse = await fetch(`${API_BASE}/api/documents/upload`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('  ✅ Upload successful!');
    console.log(`  Document ID: ${uploadResult.id}`);
    console.log(`  Title: ${uploadResult.title}`);
    console.log(`  Author: ${uploadResult.author || 'N/A'}`);
    console.log();

    // Step 2: Generate summary
    console.log('Step 2: Generating summary with Claude Sonnet 4.5...');
    console.log('  This may take several minutes for a comprehensive summary...');
    
    const summaryStartTime = Date.now();
    
    const summaryResponse = await fetch(`${API_BASE}/api/summaries/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        documentId: uploadResult.id,
        title: 'The Righteous Mind',
        author: 'Jonathan Haidt'
      })
    });

    if (!summaryResponse.ok) {
      const errorText = await summaryResponse.text();
      throw new Error(`Summary generation failed: ${summaryResponse.status} - ${errorText}`);
    }

    const summaryResult = await summaryResponse.json();
    const summaryDuration = ((Date.now() - summaryStartTime) / 1000).toFixed(2);
    
    console.log('  ✅ Summary generated successfully!');
    console.log(`  Generation time: ${summaryDuration} seconds`);
    console.log(`  Summary ID: ${summaryResult.id}`);
    console.log();

    // Step 3: Analyze the summary
    console.log('Step 3: Analyzing generated summary...');
    
    const summaryText = summaryResult.content || summaryResult.summary || '';
    const wordCount = summaryText.split(/\s+/).length;
    const charCount = summaryText.length;
    const estimatedTokens = Math.round(wordCount * 1.3); // Rough estimate
    
    console.log('  Summary Statistics:');
    console.log(`    Character count: ${charCount.toLocaleString()}`);
    console.log(`    Word count: ${wordCount.toLocaleString()}`);
    console.log(`    Estimated tokens: ${estimatedTokens.toLocaleString()}`);
    console.log();

    // Save summary to file for review
    const summaryOutputPath = path.join(__dirname, 'test_summary_output.txt');
    fs.writeFileSync(summaryOutputPath, summaryText);
    console.log(`  Summary saved to: ${summaryOutputPath}`);
    console.log();

    // Show preview
    console.log('  Summary Preview (first 500 characters):');
    console.log('  ' + '-'.repeat(78));
    console.log('  ' + summaryText.substring(0, 500).replace(/\n/g, '\n  '));
    console.log('  ...');
    console.log('  ' + '-'.repeat(78));
    console.log();

    // Final verdict
    console.log('='.repeat(80));
    console.log('✅ TEST COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));
    console.log();
    console.log('Results Summary:');
    console.log(`  ✅ Document uploaded: ${uploadResult.title}`);
    console.log(`  ✅ Summary generated in ${summaryDuration}s`);
    console.log(`  ✅ Summary length: ${wordCount.toLocaleString()} words (~${estimatedTokens.toLocaleString()} tokens)`);
    console.log();
    
    if (estimatedTokens > 8192) {
      const improvement = ((estimatedTokens / 8192) * 100).toFixed(1);
      console.log(`  🎉 Generated ${improvement}% of the old 8K token limit!`);
      console.log(`  This demonstrates the new Claude Sonnet 4.5 capabilities.`);
    }
    
    console.log();
    console.log('The upload and summary generation functionality is working correctly!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error();
    console.error('❌ TEST FAILED');
    console.error('='.repeat(80));
    console.error('Error:', error.message);
    console.error();
    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testUploadAndSummary();
