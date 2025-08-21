// File: functions/check-vaac.js (Cloudflare Pages Functions - VERSI PROXY SCRAPING)

// Helper functions (tetap sama)
function getTimestampFromAnyFilename(filename) {
    const match = filename.match(/(\d{12})/);
    return match ? match[1] : null;
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Helper untuk membuat URL yang diproxy
function createProxyUrl(targetUrl) {
    // Menggunakan allorigins.win sebagai proxy yang andal untuk mengambil konten mentah
    return `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
}

export async function onRequest(context) {
    if (context.request.method !== 'GET') {
        return new Response(`Method ${context.request.method} Not Allowed`, { status: 405, headers: { 'Allow': 'GET' } });
    }

    try {
        const currentYear = new Date().getFullYear();
        const directoryUrl = `http://ftp.bom.gov.au/anon/gen/vaac/${currentYear}/`;

        // 1. Ambil daftar file melalui proxy
        const proxyDirUrl = createProxyUrl(directoryUrl);
        const dirResponse = await fetch(proxyDirUrl);
        if (!dirResponse.ok) {
            throw new Error(`Proxy gagal mengakses direktori: Status ${dirResponse.status}`);
        }
        const dirHtml = await dirResponse.text();

        // 2. Gunakan logika parsing yang stabil (per baris)
        const allFiles = [];
        const lines = dirHtml.split('\n');
        const lineRegex = /<a href="(IDY[^"]+\.(?:txt|png))">/i;

        for (const line of lines) {
            const match = line.match(lineRegex);
            if (match && match[1]) {
                allFiles.push(match[1]);
            }
        }
        
        if (allFiles.length === 0) {
            return new Response(JSON.stringify({ error: "Parsing HTML dari proxy gagal: tidak ada file VAA yang ditemukan." }), { status: 404, headers: { 'Content-Type': 'application/json' }});
        }

        // 3. Filter dan cari file .txt terbaru
        const darwinTxtFiles = allFiles.filter(name => name.endsWith('.txt'));
        if (darwinTxtFiles.length === 0) {
            return new Response(JSON.stringify({ error: `Tidak ada file .txt ditemukan di direktori.` }), { status: 404, headers: { 'Content-Type': 'application/json' }});
        }

        let latestFilename = null;
        let latestTimestamp = '0';
        for (const filename of darwinTxtFiles) {
            const timestamp = getTimestampFromAnyFilename(filename);
            if (timestamp && timestamp > latestTimestamp) {
                latestTimestamp = timestamp;
                latestFilename = filename;
            }
        }

        if (!latestFilename) {
            return new Response(JSON.stringify({ error: `Tidak ada file .txt valid yang bisa diproses.` }), { status: 404, headers: { 'Content-Type': 'application/json' }});
        }

        // 4. Ambil file .txt terbaru (JUGA MELALUI PROXY)
        const txtUrl = `${directoryUrl}${latestFilename}`;
        const proxyTxtUrl = createProxyUrl(txtUrl);
        const txtResponse = await fetch(proxyTxtUrl);
        const fullText = await txtResponse.text();

        // 5. Filter AREA INDONESIA
        const isIndonesiaArea = /^AREA:\s*INDONESIA/im.test(fullText);
        if (!isIndonesiaArea) {
            return new Response(JSON.stringify({
                advisoryNumber: null,
                message: "Latest VAA is not for Indonesia area.",
                fullText: fullText,
                imageBase64: null
            }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=60' } });
        }

        const advisoryMatch = fullText.match(/ADVISORY\s+NR:\s*(\d{4}\/\d+)/i);
        const advisoryNumber = advisoryMatch ? advisoryMatch[1] : null;

        // 6. Cari dan ambil file .png yang cocok (JUGA MELALUI PROXY)
        let imageBase64 = null;
        const matchingPngFile = allFiles.find(name => 
            name.endsWith('.png') && getTimestampFromAnyFilename(name) === latestTimestamp
        );

        if (matchingPngFile) {
            const pngUrl = `${directoryUrl}${matchingPngFile}`;
            const proxyPngUrl = createProxyUrl(pngUrl);
            const pngResponse = await fetch(proxyPngUrl);
            const imageBuffer = await pngResponse.arrayBuffer();
            imageBase64 = `data:image/png;base64,${arrayBufferToBase64(imageBuffer)}`;
        }

        // 7. Kirim respons yang berhasil
        const responseData = {
            advisoryNumber: advisoryNumber,
            fullText: fullText,
            imageBase64: imageBase64,
        };

        return new Response(JSON.stringify(responseData), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate'
            }
        });

    } catch (error) {
        console.error('[VAAC-ProxyScraping] Kesalahan fatal:', error);
        return new Response(JSON.stringify({ error: 'Kesalahan internal pada server proxy.', details: { message: error.message, stack: error.stack } }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
