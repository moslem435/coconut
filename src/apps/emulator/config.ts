export interface OSConfig {
    id: string;
    name: string;
    url: string; // URL to the ISO/IMG file
    memory_size: number; // in bytes
    vga_memory_size: number; // in bytes
    bios: {
        url: string;
    };
    vga_bios: {
        url: string;
    };
    cmdline?: string; // For Linux kernel
}

export const OS_PRESETS: OSConfig[] = [
    {
        id: 'linux-buildroot',
        name: 'Linux (Buildroot)',
        url: 'https://copy.sh/v86/images/linux4.iso', // Official v86 hosted image (CORS enabled)
        memory_size: 64 * 1024 * 1024,
        vga_memory_size: 8 * 1024 * 1024,
        bios: {
            url: '/v86/seabios.bin'
        },
        vga_bios: {
            url: '/v86/vgabios.bin'
        }
    },
    {
        id: 'kolibrios',
        name: 'KolibriOS',
        url: 'https://copy.sh/v86/images/kolibri.img', // Official v86 hosted image (CORS enabled)
        memory_size: 64 * 1024 * 1024,
        vga_memory_size: 8 * 1024 * 1024,
        bios: {
            url: '/v86/seabios.bin'
        },
        vga_bios: {
            url: '/v86/vgabios.bin'
        }
    },
    {
        id: 'windows98',
        name: 'Windows 98',
        url: '', // User needs to provide this
        memory_size: 128 * 1024 * 1024,
        vga_memory_size: 8 * 1024 * 1024,
        bios: {
            url: '/v86/seabios.bin'
        },
        vga_bios: {
            url: '/v86/vgabios.bin'
        }
    }
];
