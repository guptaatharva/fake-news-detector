require('dotenv').config({ path: '.env.local' });
const { createGoogleGenerativeAI } = require('@ai-sdk/google');
const { generateObject } = require('ai');
const { z } = require('zod');

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('API Key present:', !!apiKey, 'Starts with:', apiKey?.substring(0, 8));

  const google = createGoogleGenerativeAI({
    apiKey: apiKey,
  });

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

  for (const m of models) {
    console.log(`\nTesting model: ${m}`);
    try {
      const { object } = await generateObject({
        model: google(m),
        schema: z.object({
          claims: z.array(z.string())
        }),
        prompt: 'Extract 1 claim from: NASA found water on Mars in 2025.'
      });
      console.log(`SUCCESS with ${m}:`, object);
      break;
    } catch (e) {
      console.error(`FAILED with ${m}:`, e.message || e);
      if (e.cause) console.error('Cause:', e.cause);
    }
  }
}

testGemini();
