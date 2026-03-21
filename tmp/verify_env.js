import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock the environment
process.env.SECRET_KEY = 'test_secret_123';

// Now import crypto.js (using absolute path to be sure)
// Since it's an ES module, we use the actual file
import { SECRET_KEY as loadedKey } from '../server/utils/crypto.js';

console.log("Loaded Key:", loadedKey);
if (loadedKey === 'test_secret_123') {
    console.log("SUCCESS: Environment variable preferred.");
} else {
    console.log("FAILURE: Hardcoded fallback used.");
}
