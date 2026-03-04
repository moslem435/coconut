
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.resolve(__dirname, '../public');
const OUTPUT_FILE = path.join(PUBLIC_DIR, 'fs-manifest.json');

// Folders to include in the manifest
const INCLUDE_DIRS = ['gallery', 'wallpapers', 'icons', 'sounds'];

function scanDirectory(dir, relativePath = '') {
    let results = [];
    
    if (!fs.existsSync(dir)) return results;

    const list = fs.readdirSync(dir);
    
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        // On Windows, path.join uses backslashes, which we need to normalize for web usage
        const fileRelativePath = path.join(relativePath, file).split(path.sep).join('/');

        if (stat && stat.isDirectory()) {
             // Recursive scan
             const subDirResults = scanDirectory(filePath, fileRelativePath);
             results = results.concat(subDirResults);
        } else {
            // Only include files
            results.push({
                path: '/' + fileRelativePath, // Absolute path from root (e.g. /gallery/foo.jpg)
                name: file,
                size: stat.size,
                mtime: Math.floor(stat.mtimeMs),
                type: 'file'
            });
        }
    });
    
    return results;
}

console.log('Generating file system manifest...');

let manifest = [];

INCLUDE_DIRS.forEach(dirName => {
    const dirPath = path.join(PUBLIC_DIR, dirName);
    const files = scanDirectory(dirPath, dirName);
    manifest = manifest.concat(files);
});

// Write manifest
if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));

console.log(`Manifest generated at ${OUTPUT_FILE} with ${manifest.length} entries.`);
