import { processDocument } from './server/documentProcessor.ts';
import { readFileSync } from 'fs';

async function test() {
  try {
    console.log('Testing document processor...');
    
    // Test with a simple text file first
    const testText = 'This is a test document about happiness and well-being.';
    const buffer = Buffer.from(testText, 'utf-8');
    
    const result = await processDocument(buffer, 'txt');
    
    console.log('Success:', result.success);
    console.log('Word count:', result.wordCount);
    console.log('Text:', result.text);
    
    if (result.error) {
      console.error('Error:', result.error);
    }
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

test();
