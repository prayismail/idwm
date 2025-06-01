// File: api/metar.js

// Untuk Node.js 18+, `fetch` sudah global.
// Jika menggunakan Node.js < 18 di Vercel build, tambahkan "node-fetch" ke package.json
// dan uncomment baris berikut:
// const fetch = require('node-fetch');

export default async function handler(req, res) {
  // Hanya izinkan metode GET
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Ambil parameter icaoCodes dari query string
  const { icao } = req.query; // API met.no menggunakan parameter 'icao'

  if (!icao) {
    return res.status(400).json({ error: 'Parameter "icao" diperlukan.' });
  }

  const targetUrl = `https://api.met.no/weatherapi/tafmetar/1.0/metar.txt?icao=${encodeURIComponent(icao)}`;

  try {
    console.log(`[Proxy METAR] Menerima permintaan untuk ICAO: ${icao} dari: ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}`);
    const apiResponse = await fetch(targetUrl, {
      headers: {
        // met.no memerlukan User-Agent yang jelas
        'User-Agent': 'IDWM/VercelProxy (https://idwm.vercel.app contact: prayoga.ismail@bmkg.go.id)', // Sesuaikan email jika perlu
      },
    });

    console.log(`[Proxy METAR] Status respons dari met.no: ${apiResponse.status}`);

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      console.error(`[Proxy METAR] Error dari met.no API: ${apiResponse.status} - ${errorBody}`);
      return res.status(apiResponse.status).json({ // Kirim error sebagai JSON agar mudah ditangani klien
        error: `Gagal mengambil data METAR dari met.no. Status: ${apiResponse.status}`,
        details: errorBody
      });
    }

    const metarText = await apiResponse.text();

    // Set header Cache-Control, misalnya cache selama 2 menit
    // met.no biasanya memiliki data yang sering update
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
    // Set Content-Type ke text/plain karena itu yang dikembalikan
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    console.log(`[Proxy METAR] Berhasil mengambil dan mengirim data METAR teks.`);
    res.status(200).send(metarText); // Kirim sebagai teks biasa

  } catch (error) {
    console.error('[Proxy METAR] Kesalahan internal pada proxy function:', error);
    res.status(500).json({ // Kirim error sebagai JSON
      error: 'Terjadi kesalahan internal pada server proxy METAR.',
      details: error.message
    });
  }
}
