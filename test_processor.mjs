import { processDocument } from "./server/documentProcessor.ts";
import fs from "fs";

// Test with test_book.txt
const txtBuffer = fs.readFileSync("/home/ubuntu/test_book.txt");
console.log("Testing TXT processing...");
const txtResult = await processDocument(txtBuffer, "txt");
console.log("TXT Success:", txtResult.success);
console.log("TXT Text length:", txtResult.text?.length);
console.log("TXT Text preview:", txtResult.text?.substring(0, 200));

// Test with RTF
const rtfBuffer = fs.readFileSync("/home/ubuntu/upload/HelpfulInformation.rtf");
console.log("\nTesting RTF processing...");
const rtfResult = await processDocument(rtfBuffer, "rtf");
console.log("RTF Success:", rtfResult.success);
console.log("RTF Text length:", rtfResult.text?.length);
console.log("RTF Text preview:", rtfResult.text?.substring(0, 200));
