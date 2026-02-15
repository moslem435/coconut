import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.join(__dirname, '../public/v86');

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

const files = [
    { name: 'libv86.js', url: 'https://unpkg.com/v86/build/libv86.js' },
    { name: 'v86.wasm', url: 'https://unpkg.com/v86/build/v86.wasm' },
    { name: 'seabios.bin', url: 'https://raw.githubusercontent.com/copy/v86/master/bios/seabios.bin' },
    { name: 'vgabios.bin', url: 'https://raw.githubusercontent.com/copy/v86/master/bios/vgabios.bin' },
];

async function downloadFile(file) {
    const filePath = path.join(targetDir, file.name);
    if (fs.existsSync(filePath)) {
        console.log(`${file.name} already exists. Skipping.`);
        return;
    }

    const fileStream = fs.createWriteStream(filePath);

    console.log(`Downloading ${file.name} from ${file.url}...`);

    return new Promise((resolve, reject) => {
        const handleResponse = (response) => {
             if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                let redirectUrl = response.headers.location;
                if (!redirectUrl.startsWith('http')) {
                    const originalUrl = new URL(file.url);
                    redirectUrl = new URL(redirectUrl, originalUrl.origin).toString();
                }
                
                console.log(`Redirecting to ${redirectUrl}...`);
                https.get(redirectUrl, handleResponse).on('error', (err) => {
                     fs.unlink(filePath, () => {});
                     reject(err);
                });
            } else if (response.statusCode === 200) {
                response.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    console.log(`${file.name} downloaded successfully.`);
                    resolve();
                });
            } else {
                fs.unlink(filePath, () => {});
                reject(new Error(`Failed to download ${file.name}: Status Code ${response.statusCode}`));
            }
        };

        https.get(file.url, handleResponse).on('error', (err) => {
            fs.unlink(filePath, () => {});
            reject(err);
        });
    });
}

(async () => {
    try {
        for (const file of files) {
            await downloadFile(file);
        }
        console.log('All v86 files downloaded successfully.');
    } catch (error) {
        console.error('Error downloading files:', error);
        process.exit(1);
    }
})();
