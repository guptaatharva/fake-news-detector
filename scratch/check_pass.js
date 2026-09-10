require('dotenv').config({ path: '.env.local' });
const { execSync } = require('child_process');

try {
  const diff = execSync('git show 882e548', { encoding: 'utf8' });
  const currentUrl = new URL(process.env.DATABASE_URL);
  const currentPass = currentUrl.password;
  const match = diff.match(/DATABASE_URL="postgresql:\/\/[^:]+:([^@]+)@/);
  if (match) {
    const oldPass = match[1];
    console.log('Old pass equals current pass?:', oldPass === currentPass);
    console.log('Old pass length:', oldPass.length, 'Current pass length:', currentPass.length);
  } else {
    console.log('No match found in diff');
  }
} catch (e) {
  console.error('Error:', e.message);
}
