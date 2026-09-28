const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

// Categorie heuristics: A (App UI), B (System values), C (User generated), D (Dev logs), E (Tech id)

let reportMarkdown = '# Hardcoded UI Audit Report\n\n| File | Line | String | Category | Status | Exclusion Reason |\n|---|---|---|---|---|---|\n';
let hasCategoryA = false;

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (!fullPath.includes('locales') && !fullPath.includes('node_modules')) {
                scanDir(fullPath);
            }
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            analyzeFile(fullPath);
        }
    }
}

function analyzeFile(filepath) {
    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.split('\n');
    const relativePath = path.relative(path.join(__dirname, '..'), filepath).replace(/\\/g, '/');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip lines that have t( or are imports
        if (line.includes('t(') || line.includes('import ') || line.includes('export ') || line.trim().startsWith('//') || line.includes('i18n-ignore')) {
            continue; 
        }

        let match;
        // Placeholder check
        const placeholderRegex = /placeholder=["']([a-zA-Z\s]+[^"']*)["']/g;
        while ((match = placeholderRegex.exec(line)) !== null) {
            const str = match[1].trim();
            if (str.length > 2) {
               addReport(relativePath, i + 1, str, 'A', 'Pending', '');
            }
        }
        
        // Basic JSX Text Node check >text<
        const jsxRegex = />([^<>{}\n]+)</g;
        while ((match = jsxRegex.exec(line)) !== null) {
            const str = match[1].trim();
            if (str.length > 2 && /[a-zA-Z]/.test(str) && !str.match(/^[\d\s\W]+$/)) {
                
                // Allowlist B types
                if (str.toLowerCase() === 'owner' || str.toLowerCase() === 'hod' || str.toLowerCase() === 'worker' || str.toLowerCase() === 'pending') {
                    addReport(relativePath, i + 1, str, 'B', 'Pending', 'Awaits dynamic render mapped via status array');
                } else if (str === 'MOTOLOGA' || str === 'Powered by MOTOLOGA') {
                    addReport(relativePath, i + 1, str, 'E', 'Excluded', 'Brand generic identifier');
                } else {
                    addReport(relativePath, i + 1, str, 'A', 'Pending', '');
                }
            }
        }

        // title= aria-label= 
        const attrRegex = /(title|aria-label)=["']([a-zA-Z\s]+[^"']*)["']/g;
        while ((match = attrRegex.exec(line)) !== null) {
             const str = match[2].trim();
             addReport(relativePath, i + 1, str, 'A', 'Pending', '');
        }
    }
}

function addReport(file, line, str, category, status, reason) {
    // Escape chars for markdown
    const escapedStr = str.replace(/\|/g, '\\|');
    reportMarkdown += `| ${file} | ${line} | "${escapedStr}" | ${category} | ${status} | ${reason} |\n`;
    if (category === 'A' && status === 'Pending') {
        hasCategoryA = true;
    }
}

scanDir(srcDir);

fs.writeFileSync(path.join(__dirname, '../hardcoded-audit.md'), reportMarkdown);
console.log('✅ Hardcoded UI Audit report generated at hardcoded-audit.md');
if (hasCategoryA) {
    console.warn('⚠️ WARNING: Untranslated Category A strings remain. Task fails unless all Application-UI strings are resolved.');
} else {
    console.log('🎉 SUCCESS: No pending Category A strings discovered!');
}
