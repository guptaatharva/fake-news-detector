require('dotenv').config({ path: '.env.local' });
const { generateText } = require('ai');
const { createGoogleGenerativeAI } = require('@ai-sdk/google');

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function main() {
  try {
    const r = await generateText({
      model: google('gemini-3.7-flash'),
      providerOptions: {
        google: {
          thinkingLevel: 'medium'
        }
      },
      prompt: 'Extract 1 factual claim from this text: The Earth is round. You MUST strictly reply with ONLY valid JSON: {"claims":["text"]}'
    });
    console.log(r.text);
  } catch (e) {
    console.error(e.message);
  }
}

main();
