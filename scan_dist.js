import fs from 'fs';
import path from 'path';

const distDir = 'dist/assets';
if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir);
    files.forEach(file => {
        if (file.endsWith('.js')) {
            const content = fs.readFileSync(path.join(distDir, file), 'utf8');
            if (content.includes('axios')) {
                console.log(`Found axios in: ${file}`);
                // Try to find the context around some axial calls in index
                if (file.startsWith('index')) {
                    const idx = content.indexOf('axios.put');
                    if (idx !== -1) {
                         console.log(`Context around axios.put match: ${content.substring(idx - 100, idx + 100)}`);
                    }
                }
            }
        }
    });
} else {
    console.log("dist/assets does not exist.");
}
