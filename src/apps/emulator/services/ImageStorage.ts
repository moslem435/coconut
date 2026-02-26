import { OSConfig } from '../config'

export class ImageStorage {
    private static async getRoot() {
        if (!navigator.storage || !navigator.storage.getDirectory) {
            throw new Error('FileSystemAccess API not supported')
        }
        return await navigator.storage.getDirectory()
    }

    static async checkExists(filename: string): Promise<boolean> {
        try {
            const root = await this.getRoot()
            await root.getFileHandle(filename)
            return true
        } catch {
            return false
        }
    }

    static async getFile(filename: string): Promise<File> {
        const root = await this.getRoot()
        const handle = await root.getFileHandle(filename)
        return await handle.getFile()
    }

    // Helper to read file as ArrayBuffer directly if needed
    static async getFileBuffer(filename: string): Promise<ArrayBuffer> {
        const file = await this.getFile(filename)
        return await file.arrayBuffer()
    }

    static async saveStream(
        filename: string,
        stream: ReadableStream<Uint8Array>,
        onProgress?: (received: number, total: number) => void
    ): Promise<void> {
        const root = await this.getRoot()
        const handle = await root.getFileHandle(filename, { create: true })
        // @ts-ignore - createWritable is part of the standard but TS might miss it
        const writable = await handle.createWritable()

        const reader = stream.getReader()
        let receivedLength = 0

        try {
            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                if (value) {
                    await writable.write(value as any)
                    receivedLength += value.length
                    // Total is unknown from stream directly usually, but passed from caller
                    onProgress?.(receivedLength, 0)
                }
            }
            await writable.close()
        } catch (e) {
            await writable.abort()
            throw e
        }
    }

    static async deleteFile(filename: string) {
        const root = await this.getRoot()
        await root.removeEntry(filename)
    }
}
