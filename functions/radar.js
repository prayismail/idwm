/**
 * File: /functions/radar.js
 */

function getBMKGTimestamp(offsetMinutes = 0) {
    const now = new Date();
    
    // Kurangi waktu HANYA berdasarkan offset dari slider.
    // Buffer 10 menit dihilangkan.
    if (offsetMinutes > 0) {
        now.setTime(now.getTime() - offsetMinutes * 60 * 1000);
    }

    const year = now.getUTCFullYear();
    const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = now.getUTCDate().toString().padStart(2, '0');
    const hours = now.getUTCHours().toString().padStart(2, '0');
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
        const offset = parseInt(searchParams.get('offset')) || 0;

        if (!z || !x || !y) {
            return new Response('Bad Request: Parameter z, x, y dibutuhkan.', { status: 400 });
        }

        // Panggil fungsi timestamp dengan menyertakan offset
        const timestamp = getBMKGTimestamp(offset);
        const bmkgUrl = `https://inasiam.bmkg.go.id/api23/mpl_req/radar/radar/0/${timestamp}/${timestamp}/${z}/${x}/${y}.png?overlays=contourf`;

        const requestHeaders = {
            'Referer': 'https://inasiam.bmkg.go.id/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
        };

        const bmkgResponse = await fetch(bmkgUrl, {
            headers: requestHeaders
        });

        if (!bmkgResponse.ok) {
            if (bmkgResponse.status === 204) { return new Response(null, { status: 204 }); }
            return new Response(`Gagal mengambil data dari BMKG: ${bmkgResponse.statusText}`, { status: bmkgResponse.status });
        }

        const response = new Response(bmkgResponse.body, bmkgResponse);
        response.headers.set('Cache-Control', 'public, max-age=60'); // Kurangi cache menjadi 1 menit
        
        return response;

    } catch (error) {
        console.error('Function Crash:', error);
        return new Response('Terjadi kesalahan internal pada server fungsi.', { status: 500 });
    }
}
