import { processDocument } from './server/documentProcessor.ts';
import { generateShortformPrompt, parseSummaryResponse } from './server/shortformPrompt.ts';
import { invokeLLM } from './server/_core/llm.ts';
import { readFileSync, writeFileSync } from 'fs';

async function processDirect() {
  try {
    console.log('Reading RTF file...');
    const fileBuffer = readFileSync('/home/ubuntu/upload/HelpfulInformation.rtf');
    
    console.log('Processing document...');
    const result = await processDocument(fileBuffer, 'rtf');
    
    if (!result.success) {
      console.error('Failed to process document:', result.error);
      return;
    }
    
    console.log('✅ Document processed successfully!');
    console.log('Word count:', result.wordCount);
    console.log('Text length:', result.text.length);
    
    // Save extracted text
    writeFileSync('/home/ubuntu/extracted_text.txt', result.text);
    console.log('Extracted text saved to /home/ubuntu/extracted_text.txt');
    
    console.log('\n📝 Generating Shortform summary...');
    const prompt = generateShortformPrompt({
      extractedText: result.text,
      bookTitle: 'Helpful Information',
      bookAuthor: 'Unknown'
    });
    
    console.log('Calling AI with comprehensive Shortform prompt...');
    const aiResponse = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating premium Shortform-style book summaries with deep research and external citations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: {
        type: 'json_object'
      }
    });
    
    const messageContent = aiResponse.choices[0]?.message?.content;
    const aiResponseText = typeof messageContent === 'string' ? messageContent : '';
    
    console.log('\n✅ AI response received!');
    console.log('Response length:', aiResponseText.length);
    
    // Parse the response
    const parsed = parseSummaryResponse(aiResponseText);
    
    console.log('\n📊 Summary Statistics:');
    console.log('Book Title:', parsed.bookTitle);
    console.log('Book Author:', parsed.bookAuthor);
    console.log('Research Sources:', parsed.researchSources.length);
    console.log('Shortform Notes:', parsed.shortformNotesCount);
    
    // Save the complete summary as JSON
    const summaryData = {
      bookTitle: parsed.bookTitle,
      bookAuthor: parsed.bookAuthor,
      onePageSummary: parsed.onePageSummary,
      introduction: parsed.introduction,
      mainContent: parsed.mainContent,
      researchSources: parsed.researchSources,
      shortformNotesCount: parsed.shortformNotesCount
    };
    
    writeFileSync('/home/ubuntu/shortform_summary.json', JSON.stringify(summaryData, null, 2));
    console.log('\n✅ Summary saved to /home/ubuntu/shortform_summary.json');
    
    console.log('\n🎉 SUCCESS! Shortform summary generated with:');
    console.log(`  • ${parsed.researchSources.length} research sources cited`);
    console.log(`  • ${parsed.shortformNotesCount} Shortform research notes`);
    console.log(`  • Premium formatting with comparative analysis`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

processDirect();
