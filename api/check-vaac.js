// File: api/check-vaac.js
// VERSI BARU: Mencari file .txt dan .png yang berpasangan di FTP.

const ftp = require('basic-ftp');
const { Writable } = require('stream');

// Helper function untuk mengekstrak timestamp dari nama file .txt
function getTimestampFromFilename(filename) {
    const match = filename.match(/\.(\d{12})\.txt$/);
    return match && match[1] ? parseInt(match[1], 10) : 0;
}

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const client = new ftp.Client(30000);

    try {
        await client.access({ host: "ftp.bom.gov.au" });

        const currentYear = new Date().getFullYear();
        const directoryPath = `/anon/gen/vaac/${currentYear}`;
        
        await client.cd(directoryPath);

        const list = await client.list();

        // Pisahkan file .txt dan .png
        const txtFiles = new Set();
        const pngFiles = new Map();

        list.forEach(item => {
            if (item.type === ftp.FileType.File) {
                if (item.name.startsWith('IDY') && item.name.endsWith('.txt')) {
                    txtFiles.add(item);
                } else if (item.name.endsWith('.png')) {
                    // Simpan nama file PNG dengan "kunci" yang sama dengan file TXT
                    // Contoh: IDY28010.202507051050.png -> kuncinya adalah IDY28010.202507051050
                    const key = item.name.replace('.png', '');
                    pngFiles.set(key, item.name);
                }
            }
        });

        const darwinTxtFiles = Array.from(txtFiles);
        if (darwinTxtFiles.length === 0) {
            return res.status(404).json({ error: `Tidak ada file .txt ditemukan.` });
        }

        // Cari file .txt terbaru (logika ini tetap sama)
        let latestFile = darwinTxtFiles[0];
        let maxTimestamp = getTimestampFromFilename(latestFile.name);

        for (let i = 1; i < darwinTxtFiles.length; i++) {
            const currentFile = darwinTxtFiles[i];
            const currentTimestamp = getTimestampFromFilename(currentFile.name);
            if (currentTimestamp > maxTimestamp) {
                maxTimestamp = currentTimestamp;
                latestFile = currentFile;
            }
        }
        
        console.log(`[Proxy VAAC-FTP] File TXT terbaru: ${latestFile.name}`);
        
        // --- LOGIKA BARU: CARI FILE PNG YANG BERPASANGAN ---
        const txtKey = latestFile.name.replace('.txt', '');
        const matchingPngFilename = pngFiles.get(txtKey);
        let imageUrl = null;

        if (matchingPngFilename) {
            // Jika ditemukan, buat URL publiknya
            imageUrl = `http://www.bom.gov.au/aviation/volcanic-ash/advisories/${currentYear}/${matchingPngFilename}`;
            console.log(`[Proxy VAAC-FTP] File PNG pasangan ditemukan: ${matchingPngFilename}`);
        } else {
            console.log(`[Proxy VAAC-FTP] Tidak ada file PNG yang cocok untuk ${txtKey}`);
        }

        // Unduh dan proses file .txt (logika ini tetap sama)
        const writable = new Writable();
        const chunks = [];
        writable._write = (chunk, encoding, next) => { chunks.push(chunk); next(); };
        await client.downloadTo(writable, latestFile.name);
        const fullText = Buffer.concat(chunks).toString('utf-8');
        
        const match = fullText.match(/ADVISORY\s+NR:\s*(\d{4}\/\d+)/i);
        const advisoryNumber = match ? match[1] : null;

        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        
        // Kirim respons JSON yang sekarang berisi imageUrl jika ditemukan
        res.status(200).json({
          advisoryNumber: advisoryNumber,
          fullText: fullText,
          imageUrl: imageUrl, // <-- KUNCI PERUBAHAN
        });

    } catch (error) {
        console.error('[Proxy VAAC-FTP] Kesalahan internal:', error);
        res.status(500).json({
          error: 'Kesalahan internal pada server proxy FTP.',
          details: error.message
        });
    } finally {
        if (!client.closed) {
          client.close();
        }
    }
};
