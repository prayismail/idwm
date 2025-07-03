// File: api/check-vaac.js
// VERSI PALING ANDAL: Menggunakan iterasi manual untuk mencari file terbaru.

const ftp = require('basic-ftp');
const { Writable } = require('stream');

// Helper function untuk mengekstrak timestamp dari nama file. Tidak berubah.
function getTimestampFromFilename(filename) {
    const match = filename.match(/\.(\d{12})\.txt$/);
    return match && match[1] ? parseInt(match[1], 10) : 0;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const client = new ftp.Client(30000);

  try {
    await client.access({ host: "ftp.bom.gov.au" });

    const currentYear = new Date().getFullYear();
    const directoryPath = `/anon/gen/vaac/${currentYear}`;
    
    await client.cd(directoryPath);

    const list = await client.list();

    const darwinFiles = list.filter(item => 
        item.name.startsWith('IDY') && 
        item.name.endsWith('.txt') &&
        item.type === ftp.FileType.File
    );

    if (darwinFiles.length === 0) {
        const message = `Tidak ada file advisory Darwin (IDY*.txt) ditemukan di direktori ${currentYear}.`;
        return res.status(404).json({ error: message });
    }

    // --- LOGIKA BARU YANG PALING ANDAL ---
    // Daripada sorting, kita akan iterasi untuk menemukan file dengan timestamp terbesar.
    
    // 1. Inisialisasi dengan file pertama sebagai yang "terbaru sementara".
    let latestFile = darwinFiles[0];
    let maxTimestamp = getTimestampFromFilename(latestFile.name);

    // 2. Loop melalui sisa file untuk mencari yang lebih baru.
    for (let i = 1; i < darwinFiles.length; i++) {
        const currentFile = darwinFiles[i];
        const currentTimestamp = getTimestampFromFilename(currentFile.name);
        
        // 3. Jika file saat ini lebih baru, perbarui "terbaru sementara".
        if (currentTimestamp > maxTimestamp) {
            maxTimestamp = currentTimestamp;
            latestFile = currentFile;
        }
    }
    
    console.log(`[Proxy VAAC-FTP] File terbaru terdeteksi (dengan iterasi): ${latestFile.name}`);
    
    // --- AKHIR LOGIKA BARU ---

    const writable = new Writable();
    const chunks = [];
    writable._write = (chunk, encoding, next) => { chunks.push(chunk); next(); };

    await client.downloadTo(writable, latestFile.name);
    const fullText = Buffer.concat(chunks).toString('utf-8');
    
    const match = fullText.match(/ADVISORY\s+NR:\s*(\d{4}\/\d+)/i);
    const advisoryNumber = match && match[1] ? match[1] : null;

    if (!advisoryNumber) {
        console.warn('[Proxy VAAC-FTP] Konten file diunduh, tetapi nomor advisory tidak dapat di-parse.');
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    console.log(`[Proxy VAAC-FTP] Berhasil mem-parse nomor advisory: ${advisoryNumber} dari file: ${latestFile.name}`);
    
    res.status(200).json({
      advisoryNumber: advisoryNumber,
      fullText: fullText,
    });

  } catch (error) {
    console.error('[Proxy VAAC-FTP] Kesalahan internal:', error);
    if (error.code === 550) {
        return res.status(404).json({
            error: `Direktori tahunan tidak ditemukan.`,
            details: error.message
        });
    }
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
