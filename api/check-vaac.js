// File: api/check-vaac.js
// VERSI FINAL dengan perbaikan pada logika pengurutan tanggal

const ftp = require('basic-ftp');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const client = new ftp.Client(30000);

  try {
    console.log('[Proxy VAAC-FTP] Menerima permintaan...');
    
    await client.access({
      host: "ftp.bom.gov.au"
    });

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
        const message = `Tidak ada file advisory Darwin (IDY*.txt) yang ditemukan di direktori tahun ${currentYear}.`;
        console.warn(`[Proxy VAAC-FTP] ${message}`);
        return res.status(404).json({ error: message });
    }

    // --- PERUBAHAN UTAMA DI SINI ---
    // Menggunakan properti `modifiedAt` (objek Date) bukan `rawModifiedAt` (string)
    // Ini jauh lebih aman dan andal untuk pengurutan.
    darwinFiles.sort((a, b) => b.modifiedAt - a.modifiedAt);
    
    const latestFile = darwinFiles[0];
    console.log(`[Proxy VAAC-FTP] File terbaru ditemukan: ${latestFile.name}`);
    
    const buffer = await client.downloadToBuffer(latestFile.name);
    const fullText = buffer.toString("utf-8");
    
    const match = fullText.match(/ADVISORY NUMBER:\s*(\d{4}\/\d+)/);
    const advisoryNumber = match && match[1] ? match[1] : null;

    if (!advisoryNumber) {
        console.warn('[Proxy VAAC-FTP] Konten file diunduh, tetapi nomor advisory tidak dapat di-parse.');
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    
    res.status(200).json({
      advisoryNumber: advisoryNumber,
      fullText: fullText,
    });

  } catch (error) {
    console.error('[Proxy VAAC-FTP] Kesalahan internal pada proxy function:', error);
    res.status(500).json({
      error: 'Terjadi kesalahan internal pada server proxy FTP.',
      details: error.message
    });
  } finally {
    if (!client.closed) {
      client.close();
    }
  }
};
