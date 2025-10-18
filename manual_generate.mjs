import { generateShortformPrompt } from './server/shortformPrompt.ts';
import { invokeLLM } from './server/_core/llm.ts';

// Get the 50 Cognitive Biases document
const documentText = `This is a test of the 50 cognitive biases document processing.`;

const prompt = generateShortformPrompt({
  documentText,
  bookTitle: '50 Cognitive Biases to be Aware Of',
  bookAuthor: 'Various Psychology Researchers'
});

console.log('Prompt generated, calling LLM...');

try {
  const response = await invokeLLM({
    messages: [
      { role: 'system', content: 'You are an expert research analyst.' },
      { role: 'user', content: prompt }
    ]
  });
  
  console.log('LLM Response:', JSON.stringify(response, null, 2));
} catch (error) {
  console.error('Error:', error);
}
