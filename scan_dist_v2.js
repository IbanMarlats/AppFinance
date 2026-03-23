import fs from 'fs';
import path from 'path';

const distDir = 'dist/assets';
const files = fs.readdirSync(distDir);
files.forEach(file => {
    if (file.endsWith('.js') && file.startsWith('index-')) {
        const content = fs.readFileSync(path.join(distDir, file), 'utf8');
        let pos = 0;
        while ((pos = content.indexOf('axios', pos)) !== -1) {
            console.log(`Match at ${pos}: ...${content.substring(pos - 50, pos + 50)}...`);
            pos += 5;
            if (pos > 1000) break; // First 1000 matches only or just first few
        }
    }
});
