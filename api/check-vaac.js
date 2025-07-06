// File: api/check-vaac.js
// VERSI FINAL: Mengunduh TXT dan PNG dari FTP, mengirim gambar sebagai Base64.

const ftp = require('basic-ftp');
const { Writable } = require('stream');

// Helper function (tetap sama)
function getTimestampFromAnyFilename(filename) {
    const match = filename.match(/\.(\d{12})\./);
    return match ? match[1] : null;
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

        // Cari file .txt terbaru berdasarkan timestamp (logika ini tetap sama)
        const darwinTxtFiles = list.filter(item => item.name.startsWith('IDY') && item.name.endsWith('.txt') && item.type === ftp.FileType.File);
        if (darwinTxtFiles.length === 0) return res.status(404).json({ error: `Tidak ada file .txt ditemukan.` });
        
        let latestFile = null;
        let latestTimestamp = '0';
        darwinTxtFiles.forEach(file => {
            const timestamp = getTimestampFromAnyFilename(file.name);
            if (timestamp && timestamp > latestTimestamp) {
                latestTimestamp = timestamp;
                latestFile = file;
            }
        });
        if (!latestFile) return res.status(404).json({ error: `Tidak ada file .txt valid.` });
        
        console.log(`[Proxy VAAC-FTP] File TXT terbaru: ${latestFile.name}`);

        // --- MENGUNDUH FILE TXT ---
        const txtWritable = new Writable();
        const txtChunks = [];
        txtWritable._write = (chunk, encoding, next) => { txtChunks.push(chunk); next(); };
        await client.downloadTo(txtWritable, latestFile.name);
        const fullText = Buffer.concat(txtChunks).toString('utf-8');
        
        const advisoryMatch = fullText.match(/ADVISORY\s+NR:\s*(\d{4}\/\d+)/i);
        const advisoryNumber = advisoryMatch ? advisoryMatch[1] : null;

        // --- LOGIKA BARU: CARI DAN UNDUH FILE PNG ---
        let imageBase64 = null;
        const matchingPngFile = list.find(item => 
            item.name.endsWith('.png') && getTimestampFromAnyFilename(item.name) === latestTimestamp
        );
        
        if (matchingPngFile) {
            console.log(`[Proxy VAAC-FTP] File PNG pasangan ditemukan: ${matchingPngFile.name}`);
            const pngWritable = new Writable();
            const pngChunks = [];
            pngWritable._write = (chunk, encoding, next) => { pngChunks.push(chunk); next(); };
            
            await client.downloadTo(pngWritable, matchingPngFile.name);
            
            const imageBuffer = Buffer.concat(pngChunks);
            // Konversi buffer gambar menjadi string Base64 dengan tipe MIME
            imageBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
            console.log(`[Proxy VAAC-FTP] Berhasil mengonversi PNG ke Base64.`);
        } else {
            console.log(`[Proxy VAAC-FTP] Tidak ada file PNG yang cocok untuk timestamp ${latestTimestamp}`);
        }

        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        
        // Kirim respons JSON yang sekarang berisi data Base64
        res.status(200).json({
          advisoryNumber: advisoryNumber,
          fullText: fullText,
          imageBase64: imageBase64, // <-- KUNCI PERUBAHAN
        });

    } catch (error) {
        console.error('[Proxy VAAC-FTP] Kesalahan internal:', error);
        res.status(500).json({ error: 'Kesalahan internal pada server proxy FTP.', details: error.message });
    } finally {
        if (!client.closed) client.close();
    }
};
