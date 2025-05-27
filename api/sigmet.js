// File: api/sigmet.js

// Anda mungkin perlu menginstal node-fetch jika tidak menggunakan versi Node.js
// yang sudah memiliki fetch global (Node.js 18+).
// Jika Anda menggunakan Node.js < 18 di lingkungan build Vercel,
// tambahkan "node-fetch": "^2.6.7" atau versi serupa ke package.json Anda
// dan `const fetch = require('node-fetch');`
// Untuk Node.js 18+, `fetch` sudah global.

export default async function handler(req, res) {
  const targetUrl = 'https://aviationweather.gov/api/data/isigmet?format=json&level=3000';

  // Hanya izinkan metode GET untuk endpoint ini
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    console.log(`[Proxy SIGMET] Menerima permintaan dari: ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}`);
    const apiResponse = await fetch(targetUrl, {
      headers: {
        // Anda bisa menambahkan User-Agent jika AWC memerlukannya atau untuk identifikasi
        'User-Agent': 'IDWM/VercelProxy (https://idwm.vercel.app)',
      },
    });

    // Log status respons dari AWC
    console.log(`[Proxy SIGMET] Status respons dari AWC: ${apiResponse.status}`);

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text(); // Coba baca body error jika ada
      console.error(`[Proxy SIGMET] Error dari AWC API: ${apiResponse.status} - ${errorBody}`);
      return res.status(apiResponse.status).json({
        error: `Gagal mengambil data dari Aviation Weather Center. Status: ${apiResponse.status}`,
        details: errorBody
      });
    }

    const data = await apiResponse.json();

    // Vercel akan menangani header CORS secara otomatis.
    // Untuk kontrol lebih, Anda bisa set header cache di sini jika diperlukan.
    // Contoh: cache selama 5 menit
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

    console.log(`[Proxy SIGMET] Berhasil mengambil dan mengirim data SIGMET.`);
    res.status(200).json(data);

  } catch (error) {
    console.error('[Proxy SIGMET] Kesalahan internal pada proxy function:', error);
    res.status(500).json({
      error: 'Terjadi kesalahan internal pada server proxy.',
      details: error.message
    });
  }
}
