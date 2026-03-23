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
    
    // Check for axios
    if (noComments.match(/\Waxios\W/) && !content.includes("import axios from")) {
        console.log(`Missing/Incorrect axios import in: ${file}`);
    }
    
    // Check for API_URL
    if (noComments.match(/\WAPI_URL\W/) && !content.includes("API_URL") && !content.includes("import {") && !content.includes("import API_URL")) {
        // This is a bit complex to detect perfectly, but let's try a simple version
        if (!content.includes("import") && !content.includes("const API_URL") && !content.includes("window.API_URL")) {
             console.log(`Potential missing API_URL import in: ${file}`);
        }
    }
});
console.log("Scan complete.");
