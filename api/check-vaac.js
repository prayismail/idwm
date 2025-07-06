// File: api/check-vaac.js
// VERSI FINAL: Mencocokkan file .txt dan .png berdasarkan TIMESTAMP.

const ftp = require('basic-ftp');
const { Writable } = require('stream');

// Helper function untuk mengekstrak timestamp dari NAMA FILE APAPUN.
function getTimestampFromAnyFilename(filename) {
    // Regex ini mencari pola .YYYYMMDDHHMM.
    const match = filename.match(/\.(\d{12})\./);
    return match ? match[1] : null; // Kembalikan string timestamp atau null
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

        // --- LOGIKA BARU: BERFOKUS PADA TIMESTAMP ---

        // 1. Cari file .txt terbaru (logika ini tetap sama, tapi kita simpan timestamp-nya)
        const darwinTxtFiles = list.filter(item => item.name.startsWith('IDY') && item.name.endsWith('.txt') && item.type === ftp.FileType.File);
        if (darwinTxtFiles.length === 0) {
            return res.status(404).json({ error: `Tidak ada file .txt ditemukan.` });
        }
        
        let latestFile = null;
        let latestTimestamp = '0'; // Gunakan string untuk perbandingan

        darwinTxtFiles.forEach(file => {
            const timestamp = getTimestampFromAnyFilename(file.name);
            if (timestamp && timestamp > latestTimestamp) {
                latestTimestamp = timestamp;
                latestFile = file;
            }
        });

        if (!latestFile) {
             return res.status(404).json({ error: `Tidak ada file .txt valid yang ditemukan.` });
        }
        
        console.log(`[Proxy VAAC-FTP] File TXT terbaru (timestamp ${latestTimestamp}): ${latestFile.name}`);
        
        // 2. Cari file .png dengan TIMESTAMP YANG SAMA
        const matchingPngFile = list.find(item => {
            if (item.name.endsWith('.png')) {
                const pngTimestamp = getTimestampFromAnyFilename(item.name);
                // Cek apakah timestamp-nya sama persis dengan timestamp file txt terbaru
                return pngTimestamp === latestTimestamp;
            }
            return false;
        });
        
        let imageUrl = null;
        if (matchingPngFile) {
            imageUrl = `http://www.bom.gov.au/aviation/volcanic-ash/advisories/${currentYear}/${matchingPngFile.name}`;
            console.log(`[Proxy VAAC-FTP] File PNG pasangan ditemukan berdasarkan timestamp: ${matchingPngFile.name}`);
        } else {
            console.log(`[Proxy VAAC-FTP] Tidak ada file PNG yang cocok untuk timestamp ${latestTimestamp}`);
        }

        // --- Sisa kode tetap sama ---
        const writable = new Writable();
        const chunks = [];
        writable._write = (chunk, encoding, next) => { chunks.push(chunk); next(); };
        await client.downloadTo(writable, latestFile.name);
        const fullText = Buffer.concat(chunks).toString('utf-8');
        
        const match = fullText.match(/ADVISORY\s+NR:\s*(\d{4}\/\d+)/i);
        const advisoryNumber = match ? match[1] : null;

        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        
        res.status(200).json({
          advisoryNumber: advisoryNumber,
          fullText: fullText,
          imageUrl: imageUrl,
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
