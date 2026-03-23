import fs from 'fs';
import path from 'path';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('src');
files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    // Remove comments
    const noComments = content.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1');
    
    if (noComments.includes('axios') && !content.includes('import axios from')) {
        console.log(`Missing axios import in: ${file}`);
    }
});
console.log("Done scanning.");
