const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/i18n/locales');
const enDir = path.join(localesDir, 'en');
const frDir = path.join(localesDir, 'fr');

if (!fs.existsSync(enDir) || !fs.existsSync(frDir)) {
    console.error('Translation directories not found! Ensure src/i18n/locales/en and /fr exist.');
    process.exit(1);
}

let parityFailed = false;
const identicalPairs = []; // For French Quality Validation

function extractInterpolations(str) {
    if (typeof str !== 'string') return [];
    const matches = str.match(/\{\{([^\}]+)\}\}/g);
    return matches ? matches.map(m => m.replace(/[\{\}]/g, '').trim()) : [];
}

function processNamespaces() {
    const enFiles = fs.readdirSync(enDir).filter(f => f.endsWith('.json'));
    const frFiles = fs.readdirSync(frDir).filter(f => f.endsWith('.json'));

    // Check missing namespaces
    for (const f of enFiles) {
        if (!frFiles.includes(f)) {
            console.error(`❌ MISSING NAMESPACE IN FR: '${f}' exists in EN but missing in FR.`);
            parityFailed = true;
        }
    }
    for (const f of frFiles) {
        if (!enFiles.includes(f)) {
            console.error(`❌ MISSING NAMESPACE IN EN: '${f}' exists in FR but missing in EN.`);
            parityFailed = true;
        }
    }

    // Validate internal keys
    for (const f of enFiles) {
        if (frFiles.includes(f)) {
            const enData = JSON.parse(fs.readFileSync(path.join(enDir, f), 'utf8'));
            const frData = JSON.parse(fs.readFileSync(path.join(frDir, f), 'utf8'));
            validateRecursively(enData, frData, f.replace('.json', ''));
        }
    }
}

// Declarations already handled above

function validateRecursively(enObj, frObj, currentPath = '') {
    for (const key in enObj) {
        const fullPath = currentPath ? `${currentPath}.${key}` : key;
        
        if (!(key in frObj)) {
            console.error(`❌ MISSING IN FR: '${fullPath}' exists in English but is missing in French.`);
            parityFailed = true;
            continue;
        }

        if (typeof enObj[key] === 'object' && enObj[key] !== null) {
            if (typeof frObj[key] !== 'object' || frObj[key] === null) {
                console.error(`❌ TYPE MISMATCH: '${fullPath}' is object in EN but primitive in FR.`);
                parityFailed = true;
            } else {
                validateRecursively(enObj[key], frObj[key], fullPath);
            }
        } else {
            // Primitive comparison
            // Interpolation check
            const enVars = extractInterpolations(enObj[key]).sort();
            const frVars = extractInterpolations(frObj[key]).sort();
            
            if (JSON.stringify(enVars) !== JSON.stringify(frVars)) {
                console.error(`❌ INTERPOLATION MISMATCH in '${fullPath}': EN[${enVars.join(',')}] vs FR[${frVars.join(',')}]`);
                parityFailed = true;
            }

            // French Quality Check (Identical values masking un-translated copies)
            // Allowlist generic ids: MOTOLOGA, HOD, QR, VIN, PDF
            const allowList = ['MOTOLOGA', 'HOD', 'QR', 'VIN', 'PDF', 'FCFA'];
            if (enObj[key] === frObj[key] && !allowList.includes(enObj[key]) && isNaN(Number(enObj[key]))) {
                if (enObj[key].length > 1) { // Skip single punctuation
                    identicalPairs.push({ path: fullPath, val: enObj[key] });
                }
            }
        }
    }

    // Check inverse (Keys in FR missing in EN)
    for (const key in frObj) {
        const fullPath = currentPath ? `${currentPath}.${key}` : key;
        if (!(key in enObj)) {
            console.error(`❌ MISSING IN EN: '${fullPath}' exists in French but is missing in English.`);
            parityFailed = true;
        }
    }
}

console.log('Checking Translation Parity (EN <=> FR)...');
processNamespaces();

if (identicalPairs.length > 0) {
    console.log('\n--- ⚠️ FRENCH QUALITY AUDIT: IDENTICAL VALUES ---');
    console.log('The following keys are identical in English and French. Verify they are not accidental English copies:');
    identicalPairs.forEach(p => {
        console.log(`- ${p.path}: "${p.val}"`);
    });
}

if (parityFailed) {
    console.error('\n❌ TRANSLATION PARITY AUDIT FAILED.');
    process.exit(1);
} else {
    console.log('\n✅ TRANSLATION PARITY AUDIT PASSED (100% matched keys & namespaces).');
}
