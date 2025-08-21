
// File: functions/check-vaac.js (Cloudflare Pages Functions - VERSI FINAL)

// Helper function untuk mengambil timestamp dari nama file
function getTimestampFromAnyFilename(filename) {
    const match = filename.match(/(\d{12})/);
    return match ? match[1] : null;
}

// Helper function untuk mengubah ArrayBuffer (hasil fetch gambar) menjadi Base64
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export async function onRequest(context) {
    if (context.request.method !== 'GET') {
        return new Response(`Method ${context.request.method} Not Allowed`, { status: 405, headers: { 'Allow': 'GET' } });
    }

    try {
        const currentYear = new Date().getFullYear();
        const directoryUrl = `http://ftp.bom.gov.au/anon/gen/vaac/${currentYear}/`;

        // 1. Ambil daftar file dari direktori web
        const dirResponse = await fetch(directoryUrl);
        if (!dirResponse.ok) {
            throw new Error(`Gagal mengakses direktori: Status ${dirResponse.status}`);
        }
        const dirHtml = await dirResponse.text();

        // 2. LOGIKA PARSING BARU: Pecah HTML per baris untuk stabilitas
        const allFiles = [];
        const lines = dirHtml.split('\n');
        // Regex ini mencari tag <a> yang berisi link ke file IDY...
        const lineRegex = /<a href="(IDY[^"]+\.(?:txt|png))">/i;

        for (const line of lines) {
            const match = line.match(lineRegex);
            if (match && match[1]) {
                allFiles.push(match[1]);
            }
        }
        
        // Tambahkan check eksplisit jika parsing gagal total
        if (allFiles.length === 0) {
            return new Response(JSON.stringify({ error: "Parsing HTML direktori gagal: tidak ada file VAA yang ditemukan." }), { status: 404, headers: { 'Content-Type': 'application/json' }});
        }

        // 3. Filter file .txt dan cari yang terbaru
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

        // 4. Ambil dan proses file .txt terbaru
        const txtUrl = `${directoryUrl}${latestFilename}`;
        const txtResponse = await fetch(txtUrl);
        const fullText = await txtResponse.text();

        // 5. Filter berdasarkan AREA INDONESIA
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

        // 6. Cari dan proses file .png yang cocok
        let imageBase64 = null;
        const matchingPngFile = allFiles.find(name => 
            name.endsWith('.png') && getTimestampFromAnyFilename(name) === latestTimestamp
        );

        if (matchingPngFile) {
            const pngUrl = `${directoryUrl}${matchingPngFile}`;
            const pngResponse = await fetch(pngUrl);
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
        // Blok catch yang lebih informatif
        console.error('[VAAC-HTTP] Kesalahan fatal:', error);
        const errorDetails = {
            message: error.message,
            stack: error.stack ? error.stack.split('\n') : "No stack available",
        };
        return new Response(JSON.stringify({ error: 'Kesalahan internal pada server proxy.', details: errorDetails }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
