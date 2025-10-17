// Quick test to verify document processing works
const fs = require('fs');
const path = require('path');

// Read the RTF file
const filePath = '/home/ubuntu/upload/HelpfulInformation.rtf';
const fileBuffer = fs.readFileSync(filePath);
const base64 = fileBuffer.toString('base64');

console.log('File loaded successfully');
console.log('File size:', fileBuffer.length, 'bytes');
console.log('Base64 length:', base64.length);
console.log('First 100 chars of base64:', base64.substring(0, 100));
