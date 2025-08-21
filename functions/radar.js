/**
 * File: /functions/radar.js
 * Ini adalah Cloudflare Pages Function yang bertindak sebagai proxy
 * untuk tile server radar BMKG.
 */

// Fungsi untuk mendapatkan timestamp BMKG terbaru (sama seperti sebelumnya)
function getLatestBMKGTimestamp() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = now.getUTCDate().toString().padStart(2, '0');
    const hours = now.getUTCHours().toString().padStart(2, '0');
    const minutes = now.getUTCMinutes();
    const roundedMinutes = Math.floor(minutes / 10) * 10;
    const formattedMinutes = roundedMinutes.toString().padStart(2, '0');
    return `${year}${month}${day}${hours}${formattedMinutes}`;
}

/**
 * Handler utama untuk request. Cloudflare Pages akan memanggil fungsi ini.
 * Fungsi ini akan menangani semua request GET ke /radar
 */
export async function onRequestGet(context) {
    try {
        // Ekstrak query parameter dari URL
        const { searchParams } = new URL(context.request.url);
        const z = searchParams.get('z');
        const x = searchParams.get('x');
        const y = searchParams.get('y');

        // Validasi input
        if (!z || !x || !y) {
            return new Response('Bad Request: Parameter z, x, y dibutuhkan.', { status: 400 });
        }

        const latestTimestamp = getLatestBMKGTimestamp();
        
        // Bentuk URL target ke server BMKG
        const bmkgUrl = `https://inasiam.bmkg.go.id/api23/mpl_req/radar/radar/0/${latestTimestamp}/${latestTimestamp}/${z}/${x}/${y}.png?overlays=contourf`;

        // Lakukan fetch dari worker ke server BMKG
        // Tidak perlu menyamarkan User-Agent di Pages, biasanya bekerja langsung
        const bmkgResponse = await fetch(bmkgUrl);

        // Jika BMKG merespon dengan error, teruskan error tersebut
        if (!bmkgResponse.ok) {
            return new Response(`Gagal mengambil data dari BMKG: ${bmkgResponse.statusText}`, {
                status: bmkgResponse.status
            });
        }

        // Buat respons baru yang mengalirkan body gambar dari BMKG ke browser.
        // Kita juga salin header penting seperti Content-Type.
        const response = new Response(bmkgResponse.body, bmkgResponse);

        // Atur header untuk caching
        response.headers.set('Cache-Control', 'public, max-age=600'); // Cache selama 10 menit

        return response;

    } catch (error) {
        console.error(error);
        return new Response('Terjadi kesalahan internal pada server fungsi.', { status: 500 });
    }
}
