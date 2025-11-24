export async function onRequest(context) {
  const url = new URL(context.request.url);
  
  // 1. Ambil parameter 'icao' dan 'type'
  const icao = url.searchParams.get('icao');
  // Default ke 'metar' jika parameter type tidak diisi
  const type = url.searchParams.get('type') || 'metar'; 

  // 2. Validasi Parameter
  if (!icao) {
    return new Response(JSON.stringify({ error: 'Parameter "icao" diperlukan.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Pastikan type hanya boleh 'metar' atau 'taf' agar aman
  if (type !== 'metar' && type !== 'taf') {
    return new Response(JSON.stringify({ error: 'Parameter "type" salah. Gunakan "metar" atau "taf".' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. Tentukan Endpoint (metar.txt atau taf.txt)
  // Endpoint resmi: https://api.met.no/weatherapi/tafmetar/1.0/{type}.txt
  const targetUrl = `https://api.met.no/weatherapi/tafmetar/1.0/${type}.txt?icao=${encodeURIComponent(icao)}`;

  // 4. Lakukan Fetch ke API Sumber
  try {
    const response = await fetch(targetUrl, {
      headers: { 
        'User-Agent': 'IDWM/CloudflarePagesFunction (github.com/prayismail/idwm)' 
      },
    });

    // Jika API mengembalikan error (misal 404 karena bandara tidak ada)
    if (!response.ok) {
       return new Response(`Gagal mengambil data ${type.toUpperCase()} untuk ${icao}. Status: ${response.status}`, {
         status: response.status
       });
    }
    
    // 5. Kembalikan Response ke Client
    const newResponse = new Response(response.body, { status: response.status, headers: response.headers });
    
    // Cache selama 5 menit (300 detik) agar tidak membebani API sumber
    newResponse.headers.set('Cache-Control', 'public, max-age=300');
    // Set content type text/plain agar browser membacanya sebagai teks biasa
    newResponse.headers.set('Content-Type', 'text/plain; charset=utf-8');

    return newResponse;

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Terjadi kesalahan internal server.', details: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
