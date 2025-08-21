// File: /functions/radar.js

function getLatestBMKGTimestamp() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = now.getUTCDate().toString().padStart(2, '0');
    const hours = now.getUTCHours().toString().padStart(2, '0');
    const minutes = now.getUTCMinutes();
    const roundedMinutes = Math.floor(minutes / 5) * 5;
    const formattedMinutes = roundedMinutes.toString().padStart(2, '0');
    return `${year}${month}${day}${hours}${formattedMinutes}`;
}

// PASTIKAN FUNGSI DI-EXPORT DENGAN BENAR SEPERTI INI
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
            return new Response(`Gagal mengambil data dari BMKG: ${bmkgResponse.statusText}`, {
                status: bmkgResponse.status
            });
        }

        const response = new Response(bmkgResponse.body, bmkgResponse);
        response.headers.set('Cache-Control', 'public, max-age=300');
        
        return response;

    } catch (error) {
        console.error(error);
        return new Response('Terjadi kesalahan internal pada server fungsi.', { status: 500 });
    }
}
