// Simple script to read OPFS directly to debug FileSystem issues
async function debugOPFS() {
    try {
        const root = await navigator.storage.getDirectory();

        async function printDirectory(dirHandle, indent = "") {
            for await (const [name, handle] of dirHandle.entries()) {
                if (handle.kind === 'file') {
                    const file = await handle.getFile();
                    console.log(`${indent}📄 ${name} (${file.size} bytes)`);
                    if (name.endsWith('.html') || name.endsWith('.ts') || name.endsWith('.js') || name.endsWith('.txt')) {
                        const text = await file.text();
                        console.log(`${indent}   └─ content preview (length: ${text.length}): ${text.substring(0, 50).replace(/\n/g, '\\n')}${text.length > 50 ? '...' : ''}`);
                    }
                } else if (handle.kind === 'directory') {
                    console.log(`${indent}📁 ${name}`);
                    await printDirectory(handle, indent + "  ");
                }
            }
        }

        console.log("=== OPFS File System Dump ===");
        await printDirectory(root);
        console.log("============================");
    } catch (e) {
        console.error("Failed to dump OPFS:", e);
    }
}

debugOPFS();
