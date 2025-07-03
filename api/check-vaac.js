// File: api/check-vaac.js
// VERSI FINAL dengan perbaikan fungsi download

const ftp = require('basic-ftp');
// Kita memerlukan Writable dari modul 'stream' bawaan Node.js
const { Writable } = require('stream');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const client = new ftp.Client(30000);
  // client.ftp.verbose = true; // Uncomment untuk debugging

  try {
    console.log('[Proxy VAAC-FTP] Menerima permintaan...');
    
    await client.access({
      host: "ftp.bom.gov.au"
    });
    console.log('[Proxy VAAC-FTP] Berhasil terhubung ke server FTP.');

    const currentYear = new Date().getFullYear();
    const directoryPath = `/anon/gen/vaac/${currentYear}`;
    
    await client.cd(directoryPath);
    console.log(`[Proxy VAAC-FTP] Berhasil masuk ke direktori ${currentYear}.`);

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

    darwinFiles.sort((a, b) => new Date(b.rawModifiedAt) - new Date(a.rawModifiedAt));
    
    const latestFile = darwinFiles[0];
    console.log(`[Proxy VAAC-FTP] File terbaru ditemukan: ${latestFile.name}`);
    
    // --- PERBAIKAN UTAMA DI SINI ---
    // Kembali menggunakan metode Writable Stream yang benar
    const writable = new Writable();
    const chunks = [];
    writable._write = (chunk, encoding, next) => {
        chunks.push(chunk);
        next();
    };

    // Panggil client.downloadTo dengan stream yang sudah kita siapkan
    await client.downloadTo(writable, latestFile.name);

    // Gabungkan semua potongan data dan ubah menjadi teks
    const fullText = Buffer.concat(chunks).toString('utf-8');
    // --- AKHIR PERBAIKAN ---
    const match = fullText.match(/ADVISORY\s+NR:\s*(\d{4}\/\d+)/i);
    const advisoryNumber = match && match[1] ? match[1] : null;

    if (!advisoryNumber) {
        console.warn('[Proxy VAAC-FTP] Konten file diunduh, tetapi nomor advisory tidak dapat di-parse.');
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

    console.log(`[Proxy VAAC-FTP] Berhasil mengirim data VAAC dari file: ${latestFile.name}`);
    
    res.status(200).json({
      advisoryNumber: advisoryNumber,
      fullText: fullText,
    });

  } catch (error) {
    console.error('[Proxy VAAC-FTP] Kesalahan internal pada proxy function:', error);
    if (error.code === 550) {
        return res.status(404).json({
            error: `Direktori tahunan tidak ditemukan di server FTP. Mungkin belum ada advisory tahun ini.`,
            details: error.message
        });
    }
    res.status(500).json({
      error: 'Terjadi kesalahan internal pada server proxy FTP.',
      details: error.message
    });
  } finally {
    if (!client.closed) {
      console.log('[Proxy VAAC-FTP] Menutup koneksi FTP.');
      client.close();
    }
  }
};
