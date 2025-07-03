{
  "name": "idwm-backend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "basic-ftp": "^5.0.5"
  }
}

// File: api/check-vaac.js

// Gunakan library basic-ftp untuk koneksi FTP
import * as ftp from 'basic-ftp';
import { Writable } from 'stream';

// Helper function untuk mengubah stream menjadi string
async function streamToString(stream) {
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', (err) => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
}

export default async function handler(req, res) {
  // Hanya izinkan metode GET
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const client = new ftp.Client(30000); // 30 detik timeout
  // client.ftp.verbose = true; // Uncomment untuk debugging koneksi FTP di log Vercel

  try {
    console.log('[Proxy VAAC-FTP] Menerima permintaan...');
    
    await client.access({
      host: "ftp.bom.gov.au"
    });

    // Pindah ke direktori VAAC
    await client.cd("/anon/gen/vaac/");

    // Ambil daftar file
    const list = await client.list();

    // Filter hanya untuk file advisory Darwin (biasanya berawalan 'IDD' dan .txt)
    const darwinFiles = list.filter(item => 
        item.name.startsWith('IDD') && 
        item.name.endsWith('.txt') &&
        item.type === ftp.FileType.File
    );

    if (darwinFiles.length === 0) {
        console.warn('[Proxy VAAC-FTP] Tidak ada file advisory Darwin yang ditemukan.');
        return res.status(404).json({ error: 'Tidak ada file advisory Darwin yang ditemukan di server FTP.' });
    }

    // Urutkan file berdasarkan tanggal modifikasi, dari yang terbaru ke terlama
    darwinFiles.sort((a, b) => b.modifiedAt - a.modifiedAt);
    
    // File terbaru adalah yang pertama dalam daftar setelah diurutkan
    const latestFile = darwinFiles[0];
    console.log(`[Proxy VAAC-FTP] File terbaru ditemukan: ${latestFile.name}`);

    // Siapkan stream untuk menampung data file yang diunduh
    const writable = new Writable();
    const chunks = [];
    writable._write = (chunk, encoding, next) => {
        chunks.push(chunk);
        next();
    };
    
    // Unduh file ke stream
    await client.downloadTo(writable, latestFile.name);
    
    const fullText = Buffer.concat(chunks).toString('utf-8');
    
    const match = fullText.match(/ADVISORY NUMBER:\s*(\d{4}\/\d+)/);
    const advisoryNumber = match && match[1] ? match[1] : null;

    if (!advisoryNumber) {
        console.warn('[Proxy VAAC-FTP] Konten file diunduh, tetapi nomor advisory tidak dapat di-parse.');
    }

    // Set header cache
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

    console.log(`[Proxy VAAC-FTP] Berhasil mengambil dan mengirim data VAAC dari file: ${latestFile.name}`);
    
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
    // Pastikan koneksi FTP selalu ditutup, bahkan jika terjadi error
    if (!client.closed) {
      console.log('[Proxy VAAC-FTP] Menutup koneksi FTP.');
      client.close();
    }
  }
}
