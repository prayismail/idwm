// File: functions/lulc-wms.js (Cloudflare Pages Functions)

export async function onRequest(context) {
  // 1. Ambil query string dari URL permintaan asli
  const url = new URL(context.request.url);
  const queryString = url.search; // Contoh: "?SERVICE=WMS&REQUEST=GetMap&..."

  // 2. Bangun URL target WMS server
  const targetWmsUrl = `https://services.terrascope.be/wms/v2${queryString}`;

  // 3. Hanya izinkan metode GET
  if (context.request.method !== 'GET') {
    return new Response(`Method ${context.request.method} Not Allowed`, {
      status: 405,
      headers: { 'Allow': 'GET' },
    });
  }

  try {
    // 4. Lakukan fetch ke server WMS Terrascope
    const wmsResponse = await fetch(targetWmsUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'IDWM/CloudflareWMSProxy (https://idwm.pages.dev)',
      },
    });

    // 5. Jika server WMS mengembalikan error, teruskan error tersebut
    if (!wmsResponse.ok) {
      const errorBody = await wmsResponse.text();
      // Kirim kembali respons error dengan status dan pesan dari server asli
      return new Response(`Error dari server WMS: ${wmsResponse.status}\n${errorBody}`, {
        status: wmsResponse.status,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // 6. Ini adalah bagian yang paling efisien:
    // Buat respons baru yang mengalirkan body (gambar) dari respons asli,
    // sambil memungkinkan kita untuk memodifikasi headernya.
    
    // Salin header asli dari server WMS (terutama 'Content-Type': 'image/png')
    const newHeaders = new Headers(wmsResponse.headers);

    // Tambahkan atau timpa header caching kita sendiri (cache selama 1 hari)
    newHeaders.set('Cache-Control', 'public, max-age=86400');

    // Kembalikan respons. Tubuh (body) gambar akan dialirkan langsung ke klien.
    return new Response(wmsResponse.body, {
      status: 200,
      headers: newHeaders,
    });

  } catch (error) {
    // 7. Jika terjadi kesalahan di proxy kita (misalnya, masalah jaringan)
    return new Response(`Internal Server Error di proxy WMS: ${error.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
