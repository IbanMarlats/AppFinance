import fs from 'fs';
import path from 'path';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walk('src');
files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    // Remove comments
    const noComments = content.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1');
    
    // Check for axios used as an identifier (e.g., axios.get, axios(config), await axios)
    const axiosUsed = /\baxios\b/.test(noComments);
    const axiosImported = /import\s+axios\s+from/.test(content) || /const\s+axios\s+=/.test(content);
    
    if (axiosUsed && !axiosImported) {
        console.log(`MISSING AXIOS IMPORT: ${file}`);
    }
    
    // Check for API_URL
    const apiUrlUsed = /\bAPI_URL\b/.test(noComments);
    const apiUrlImported = /API_URL/.test(content) && (/import\s+{[^}]*API_URL[^}]*}\s+from/.test(content) || /const\s+API_URL\s+=/.test(content) || /window\.API_URL/.test(noComments));
    
    if (apiUrlUsed && !apiUrlImported) {
         console.log(`MISSING API_URL IMPORT: ${file}`);
    }
});
console.log("Deep scan complete.");
