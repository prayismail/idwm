// File: functions/sigmet.js (Cloudflare Pages Functions)

export async function onRequest(context) {
  // URL target API SIGMET
  const targetUrl = 'https://aviationweather.gov/api/data/isigmet?format=json';

  // Hanya izinkan metode GET. Di Cloudflare, kita langsung return Response.
  if (context.request.method !== 'GET') {
    return new Response(`Method ${context.request.method} Not Allowed`, {
      status: 405,
      headers: {
        'Allow': 'GET',
      },
    });
  }

  try {
    // Melakukan fetch ke Aviation Weather Center API
    const apiResponse = await fetch(targetUrl, {
      headers: {
        // Ganti User-Agent untuk merefleksikan platform baru
        'User-Agent': 'IDWM/CloudflarePagesFunction (https://idwm.pages.dev)',
      },
    });

    // Jika respons dari AWC tidak OK, buat respons error
    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      const errorData = {
        error: `Gagal mengambil data dari Aviation Weather Center. Status: ${apiResponse.status}`,
        details: errorBody
      };
      return new Response(JSON.stringify(errorData), {
        status: apiResponse.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ambil data JSON dari respons
    const data = await apiResponse.json();

    // Kirim respons yang berhasil dengan data JSON
    // Semua header (termasuk Cache-Control dan Content-Type) didefinisikan di sini
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Aturan Caching: Simpan selama 5 menit
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300',
      },
    });

  } catch (error) {
    // Jika terjadi error tak terduga (misalnya masalah jaringan)
    const errorData = {
      error: 'Terjadi kesalahan internal pada server proxy.',
      details: error.message
    };
    return new Response(JSON.stringify(errorData), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
