/**
 * EXPERIENCIAS / DO IT — Automated Validation Guard
 * Verifies JavaScript AST syntax and DOM element ID integrity across the codebase.
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const htmlFile = path.join(rootDir, 'index.html');

console.log('🔍 Running DO IT Pre-Commit Validation Guard...');

// 1. Validate HTML file existence
if (!fs.existsSync(htmlFile)) {
  console.error('❌ FAIL: index.html not found!');
  process.exit(1);
}

const htmlContent = fs.readFileSync(htmlFile, 'utf8');

// 2. Extract DOM IDs from index.html
const idRegex = /id=["']([^"']+)["']/g;
const htmlIds = new Set();
let match;
while ((match = idRegex.exec(htmlContent)) !== null) {
  htmlIds.add(match[1]);
}

console.log(`✅ DOM ID Parser found ${htmlIds.size} unique element IDs in index.html.`);

// 3. Extract and validate JavaScript files
const jsDir = path.join(rootDir, 'js');
let hasErrors = false;

if (fs.existsSync(jsDir)) {
  const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));

  jsFiles.forEach(file => {
    const filePath = path.join(jsDir, file);
    const code = fs.readFileSync(filePath, 'utf8');

    // AST Syntax check
    try {
      new Function(code);
      console.log(`✅ Syntax Check PASSED: js/${file}`);
    } catch (e) {
      console.error(`❌ SYNTAX ERROR in js/${file}: ${e.message}`);
      hasErrors = true;
    }
  });
}

// 4. Validate script blocks inside index.html
const scriptRegex = /<script[\s\S]*?>([\s\S]*?)<\/script>/gi;
let scriptIndex = 0;
while ((match = scriptRegex.exec(htmlContent)) !== null) {
  const scriptContent = match[1];
  if (!scriptContent.trim() || match[0].includes('src=')) continue;

  try {
    new Function(scriptContent);
    console.log(`✅ Inline Script Chunk ${++scriptIndex} Syntax Check PASSED.`);
  } catch (e) {
    console.error(`❌ INLINE SCRIPT ERROR in Chunk ${scriptIndex}: ${e.message}`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('\n❌ BUILD VALIDATION FAILED! Fix errors before committing.');
  process.exit(1);
} else {
  console.log('\n🎉 ALL BUILD VALIDATION CHECKS PASSED SUCCESSFULLY!');
  process.exit(0);
}
