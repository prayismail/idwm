/**
 * File: /functions/radar.js
  */

function getLatestBMKGTimestamp() {
    // Mulai dengan waktu saat ini
    const now = new Date();
    
    // Kurangi waktu sebanyak 10 menit untuk memastikan data sudah ada di server BMKG.
    // 10 menit = 10 * 60 detik * 1000 milidetik
    now.setTime(now.getTime() - 10 * 60 * 1000);

    const year = now.getUTCFullYear();
    const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = now.getUTCDate().toString().padStart(2, '0');
    // --- PERBAIKAN FATAL DI SINI ---
    const hours = now.getUTCHours().toString().padStart(2, '0'); // Menggunakan getUTCHours yang benar
    const minutes = now.getUTCMinutes();
    
    // Bulatkan menit ke bawah ke kelipatan 5 terdekat
    const roundedMinutes = Math.floor(minutes / 5) * 5;
    const formattedMinutes = roundedMinutes.toString().padStart(2, '0');
    
    return `${year}${month}${day}${hours}${formattedMinutes}`;
}

export async function onRequestGet(context) {
    try {
        const { searchParams } = new URL(context.request.url);
        const z = searchParams.get('z');
        const x = searchParams.get('x');
        const y = searchParams.get('y');

        if (!z || !x || !y) {
            return new Response('Bad Request: Parameter z, x, y dibutuhkan.', { status: 400 });
        }

        const latestTimestamp = getLatestBMKGTimestamp();
        const bmkgUrl = `https://inasiam.bmkg.go.id/api23/mpl_req/radar/radar/0/${latestTimestamp}/${latestTimestamp}/${z}/${x}/${y}.png?overlays=contourf`;

        const requestHeaders = {
            'Referer': 'https://inasiam.bmkg.go.id/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
        };

        const bmkgResponse = await fetch(bmkgUrl, {
            headers: requestHeaders
        });

        if (!bmkgResponse.ok) {
            // Jika BMKG merespon 204 No Content, kita teruskan saja.
            // Browser akan menampilkan tile kosong, yang lebih baik daripada error.
            if (bmkgResponse.status === 204) {
                return new Response(null, { status: 204 });
            }
            return new Response(`Gagal mengambil data dari BMKG: ${bmkgResponse.statusText}`, {
                status: bmkgResponse.status
            });
        }

        const response = new Response(bmkgResponse.body, bmkgResponse);
        response.headers.set('Cache-Control', 'public, max-age=300'); // Cache 5 menit
        
        return response;

    } catch (error) {
        console.error('Function Crash:', error);
        return new Response('Terjadi kesalahan internal pada server fungsi.', { status: 500 });
    }
}
