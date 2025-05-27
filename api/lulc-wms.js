// File: api/lulc-wms.js

export default async function handler(req, res) {
  // Ambil semua query parameter dari permintaan asli
  const queryString = new URL(req.url, `http://${req.headers.host}`).search;

  // URL target WMS server
  const targetWmsUrl = `https://services.terrascope.be/wms/v2${queryString}`;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    console.log(`[LULC WMS Proxy] Menerima permintaan untuk: ${targetWmsUrl}`);
    const wmsResponse = await fetch(targetWmsUrl, {
      method: 'GET',
      headers: {
        // Teruskan beberapa header penting jika perlu, atau tambahkan User-Agent
        'User-Agent': 'IDWM/VercelWMSProxy (https://idwm.vercel.app)',
      },
    });

    console.log(`[LULC WMS Proxy] Status dari Terrascope: ${wmsResponse.status}`);

    if (!wmsResponse.ok) {
      const errorBody = await wmsResponse.text();
      console.error(`[LULC WMS Proxy] Error dari Terrascope: ${wmsResponse.status} - ${errorBody}`);
      res.setHeader('Content-Type', 'text/plain'); // Atau image/png dengan pesan error
      return res.status(wmsResponse.status).send(`Error dari server WMS: ${wmsResponse.status}\n${errorBody}`);
    }

    // Dapatkan tipe konten dari respons asli
    const contentType = wmsResponse.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // Set header cache jika diinginkan
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400'); // Cache 1 hari

    // Stream respons gambar langsung ke klien
    // Untuk Vercel, cara terbaik biasanya adalah membaca buffer dan mengirimkannya
    const imageBuffer = await wmsResponse.arrayBuffer();
    console.log(`[LULC WMS Proxy] Berhasil mengambil tile, ukuran: ${imageBuffer.byteLength} bytes.`);
    res.status(200).send(Buffer.from(imageBuffer)); // Node.js Buffer

  } catch (error) {
    console.error('[LULC WMS Proxy] Kesalahan internal pada proxy:', error);
    res.setHeader('Content-Type', 'text/plain');
    res.status(500).send(`Internal Server Error di proxy WMS: ${error.message}`);
  }
}
