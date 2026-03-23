import fs from 'fs';
import path from 'path';

const distFile = 'dist/assets/index-DxsC2h2Q.js';
if (fs.existsSync(distFile)) {
    const content = fs.readFileSync(distFile, 'utf8');
    // Search for 'axios' as an identifier (not part of a string like 'axios/dist')
    // In minified code, identifiers are usually not 'axios' unless it's a global.
    const matches = content.matchAll(/[^a-zA-Z0-9_$]axios[^a-zA-Z0-9_$]/g);
    for (const match of matches) {
        const start = Math.max(0, match.index - 50);
        const end = Math.min(content.length, match.index + 50);
        console.log(`Match at ${match.index}: ...${content.substring(start, end)}...`);
    }
} else {
    console.log("dist file not found.");
}
