// File: api/check-vaac.js
// VERSI FINAL dengan direktori tahun dinamis

const ftp = require('basic-ftp');

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

    // --- PERUBAHAN KUNCI DI SINI ---
    // 1. Dapatkan tahun saat ini secara dinamis
    const currentYear = new Date().getFullYear();
    
    // 2. Bentuk path direktori yang lengkap
    const directoryPath = `/anon/gen/vaac/${currentYear}`;
    console.log(`[Proxy VAAC-FTP] Mencoba masuk ke direktori: ${directoryPath}`);

    // 3. Pindah ke direktori tahunan tersebut
    await client.cd(directoryPath);
    console.log(`[Proxy VAAC-FTP] Berhasil masuk ke direktori ${currentYear}.`);

    const list = await client.list();

    const darwinFiles = list.filter(item => 
        item.name.startsWith('IDD') && 
        item.name.endsWith('.txt') &&
        item.type === ftp.FileType.File
    );

    if (darwinFiles.length === 0) {
        const message = `Tidak ada file advisory Darwin yang ditemukan di direktori tahun ${currentYear}.`;
        console.warn(`[Proxy VAAC-FTP] ${message}`);
        // Kirim status 404 Not Found jika tidak ada file sama sekali
        return res.status(404).json({ error: message });
    }

    // Urutkan file berdasarkan tanggal modifikasi (sudah benar)
    darwinFiles.sort((a, b) => new Date(b.rawModifiedAt) - new Date(a.rawModifiedAt));
    
    const latestFile = darwinFiles[0];
    console.log(`[Proxy VAAC-FTP] File terbaru ditemukan: ${latestFile.name}`);
    
    const buffer = await client.downloadToBuffer(latestFile.name);
    const fullText = buffer.toString("utf-8");
    
    const match = fullText.match(/ADVISORY NUMBER:\s*(\d{4}\/\d+)/);
    const advisoryNumber = match && match[1] ? match[1] : null;

    if (!advisoryNumber) {
        console.warn('[Proxy VAAC-FTP] Konten file diunduh, tetapi nomor advisory tidak dapat di-parse.');
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate'); // Cache 1 menit

    console.log(`[Proxy VAAC-FTP] Berhasil mengirim data VAAC dari file: ${latestFile.name}`);
    
    res.status(200).json({
      advisoryNumber: advisoryNumber,
      fullText: fullText,
    });

  } catch (error) {
    console.error('[Proxy VAAC-FTP] Kesalahan internal pada proxy function:', error);
    // Cek jika errornya adalah "No such file or directory"
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
