// @ts-ignore
import untar from 'js-untar'

export interface WebContainerFs {
  mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>
  writeFile: (path: string, data: Uint8Array | string) => Promise<void>
  readdir: (path: string, options?: { withFileTypes?: true }) => Promise<any[]>
  readFile: (path: string) => Promise<Uint8Array>
  chmod?: (path: string, mode: number) => Promise<void> // Optional chmod support
}

export class TarService {
  /**
   * Extract a tarball (ArrayBuffer) to a target directory in WebContainer.
   * Uses js-untar for extraction.
   */
  static async extractTarToWebContainer(
    tarBuffer: ArrayBuffer,
    wcFs: WebContainerFs,
    targetDir: string,
    onProgress?: (count: number) => void
  ): Promise<void> {
    try {
      const files = await untar(tarBuffer)

      // 2. Parallel Extraction: Write files in batches to avoid blocking and speed up IO
      const BATCH_SIZE = 100;
      let processed = 0;
      
      console.time('[TarService] Extraction');
      
      // Filter valid files first
      const validFiles = files.filter((f: any) => f.type !== '5' && !f.name.endsWith('/'));
      
      // Pre-create directories (sequentially for safety, though mkdir -p is usually safe in parallel)
      const createdDirs = new Set<string>();
      createdDirs.add(targetDir);
      await wcFs.mkdir(targetDir, { recursive: true });

      for (let i = 0; i < validFiles.length; i += BATCH_SIZE) {
        const batch = validFiles.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (file: any) => {
           const fullPath = `${targetDir}/${file.name}`
           const parentDir = fullPath.substring(0, fullPath.lastIndexOf('/'))
           
           if (parentDir && !createdDirs.has(parentDir)) {
             try {
                await wcFs.mkdir(parentDir, { recursive: true });
                createdDirs.add(parentDir);
             } catch (e) {
                // Ignore "exists" errors if any
             }
           }

           await wcFs.writeFile(fullPath, new Uint8Array(file.buffer))
        }));
        
        processed += batch.length;
        if (onProgress) onProgress(processed);
      }
      
      console.timeEnd('[TarService] Extraction');
      if (onProgress) onProgress(processed)
    } catch (e) {
      console.error('[TarService] Extraction failed:', e)
      throw e
    }
  }

  /**
   * Create a simple tarball (no compression) from a WebContainer directory.
   * This is a custom implementation because fflate doesn't support Tar.
   */
  static async createTarFromWebContainer(
    wcFs: WebContainerFs,
    sourceDir: string
  ): Promise<Uint8Array> {
    const files: { name: string; content: Uint8Array; mode?: number }[] = [];
    
    const readDirRecursive = async (currentPath: string, relativePath: string) => {
      const entries = await wcFs.readdir(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        const entryName = entry.name;
        const entryPath = `${currentPath}/${entryName}`;
        const entryRelativePath = relativePath ? `${relativePath}/${entryName}` : entryName;
        
        // --- OPTIMIZATION: Exclude .vite cache ---
        // This ensures that when we restore, Vite is forced to re-bundle.
        // Restoring stale .vite cache often causes "Vite Error" or hangs because of path mismatch or outdated metadata.
        if (entryName === '.vite' && relativePath === '') {
           console.log('[TarService] Skipping .vite cache directory');
           continue;
        }

        if (entry.isDirectory()) {
          await readDirRecursive(entryPath, entryRelativePath);
        } else {
          const content = await wcFs.readFile(entryPath);
          
          // --- FIX: Executable Permission Logic ---
          // 1. Files in .bin folder
          // 2. Files with known executable extensions (sh, cmd, etc) - though checking .bin path is safer
          let mode = 0o644; // rw-r--r--
          
          if (entryRelativePath.includes('.bin/') || entryRelativePath.endsWith('.sh') || entryRelativePath.endsWith('.js')) {
             // Heuristic: Give all .js files 755 too? 
             // Safer to just target .bin for now, but some packages invoke js files directly.
             // Let's be generous: if it's in .bin, definitely 755.
             if (entryRelativePath.includes('.bin/')) {
                mode = 0o755; // rwxr-xr-x
             }
          }
          
          files.push({ name: entryRelativePath, content, mode });
        }
      }
    };

    await readDirRecursive(sourceDir, '');

    // Tar format helper: simple USTAR header (512 bytes)
    const createHeader = (name: string, size: number, mode: number = 0o644) => {
      const buf = new Uint8Array(512);
      const encoder = new TextEncoder();
      
      // Name (0-99)
      buf.set(encoder.encode(name.substring(0, 99)), 0);
      // Mode (100-107) - e.g. 0000755
      buf.set(encoder.encode(mode.toString(8).padStart(7, '0') + '\0'), 100);
      // UID (108-115)
      buf.set(encoder.encode('0000000\0'), 108);
      // GID (116-123)
      buf.set(encoder.encode('0000000\0'), 116);
      // Size (124-135) - octal
      buf.set(encoder.encode(size.toString(8).padStart(11, '0') + '\0'), 124);
      // Mtime (136-147)
      buf.set(encoder.encode(Math.floor(Date.now() / 1000).toString(8).padStart(11, '0') + '\0'), 136);
      // Typeflag (156) - '0' for normal file
      buf[156] = 48; 
      // Magic (257-262)
      buf.set(encoder.encode('ustar\0'), 257);
      // Version (263-264)
      buf.set(encoder.encode('00'), 263);

      // Checksum (148-155)
      let checksum = 0;
      for (let i = 0; i < 512; i++) checksum += (i >= 148 && i < 156) ? 32 : (buf[i] ?? 0);
      buf.set(encoder.encode(checksum.toString(8).padStart(6, '0') + '\0 '), 148);

      return buf;
    };

    // Calculate total size
    let totalSize = 0;
    for (const f of files) {
      totalSize += 512; // Header
      totalSize += Math.ceil(f.content.length / 512) * 512; // Padded content
    }
    totalSize += 1024; // Two null blocks at end

    const tarBuf = new Uint8Array(totalSize);
    let offset = 0;

    for (const f of files) {
      // Write Header
      tarBuf.set(createHeader(f.name, f.content.length, f.mode), offset);
      offset += 512;
      // Write Content
      tarBuf.set(f.content, offset);
      offset += Math.ceil(f.content.length / 512) * 512;
    }

    return tarBuf;
  }
}
