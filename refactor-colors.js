const fs = require('fs');
const path = require('path');

const replacements = [
  { match: /bg-\[\#030303\]/g, replace: 'bg-graphite-bg' },
  { match: /bg-\[\#070707\]/g, replace: 'bg-graphite-sub' },
  { match: /bg-\[\#0B0B0D\]/g, replace: 'bg-graphite-surface' },
  { match: /bg-\[\#101013\]/g, replace: 'bg-graphite-elevated' },
  { match: /bg-\[\#0D0D10\]/g, replace: 'bg-graphite-panel' },
  { match: /border-\[\#241014\]/g, replace: 'border-graphite-border' },
  { match: /border-\[\#35151B\]/g, replace: 'border-graphite-border-sec' },
  { match: /border-\[\#5C1A24\]/g, replace: 'border-graphite-border-bright' },
  { match: /text-\[\#F5F5F5\]/g, replace: 'text-foreground' },
  { match: /text-\[\#A1A1AA\]/g, replace: 'text-muted-foreground' },
  { match: /text-\[\#66666F\]/g, replace: 'text-muted-foreground' },
  { match: /text-\[\#FF1744\]/g, replace: 'text-neonRed' },
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let updated = content;
      for (const { match, replace } of replacements) {
        updated = updated.replace(match, replace);
      }
      if (content !== updated) {
        fs.writeFileSync(fullPath, updated, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(path.join(__dirname, 'src'));
console.log('Refactoring complete.');
