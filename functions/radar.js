/**
 * File: /functions/radar.js
 * Versi 2: Menambahkan header Referer untuk melewati proteksi 403 Forbidden.
 */

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

        // --- INI BAGIAN PENTING YANG DIPERBARUI ---
        // Kita membuat objek headers untuk "memalsukan" asal permintaan.
        // Seolah-olah request ini datang dari situs inasiam.bmkg.go.id.
        const requestHeaders = {
            'Referer': 'https://inasiam.bmkg.go.id/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
        };

        // Lakukan fetch ke server BMKG dengan menyertakan headers palsu kita.
        const bmkgResponse = await fetch(bmkgUrl, {
            headers: requestHeaders
        });
        // --- AKHIR BAGIAN PENTING ---

        if (!bmkgResponse.ok) {
            return new Response(`Gagal mengambil data dari BMKG: ${bmkgResponse.statusText}`, {
                status: bmkgResponse.status
            });
        }

        const response = new Response(bmkgResponse.body, bmkgResponse);
        response.headers.set('Cache-Control', 'public, max-age=600');
        
        return response;

    } catch (error) {
        console.error(error);
        return new Response('Terjadi kesalahan internal pada server fungsi.', { status: 500 });
    }
}
