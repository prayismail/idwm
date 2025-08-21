// File: functions/check-vaac.js (Cloudflare Pages Functions)

// Helper function untuk mengambil timestamp dari nama file
function getTimestampFromAnyFilename(filename) {
    // PERBAIKAN 1: Regex disederhanakan untuk menangkap 12 digit.
    // Format nama file di href HTML tidak memiliki titik di sekitar timestamp.
    const match = filename.match(/(\d{12})/);
    return match ? match[1] : null;
}

// Helper function untuk mengubah ArrayBuffer (hasil fetch gambar) menjadi Base64
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export async function onRequest(context) {
    // Hanya izinkan metode GET
    if (context.request.method !== 'GET') {
        return new Response(`Method ${context.request.method} Not Allowed`, { status: 405, headers: { 'Allow': 'GET' } });
    }

    try {
        const currentYear = new Date().getFullYear();
        const directoryUrl = `http://ftp.bom.gov.au/anon/gen/vaac/${currentYear}/`;

        // 1. Ambil daftar file dengan fetch
        const dirResponse = await fetch(directoryUrl);
        if (!dirResponse.ok) {
            throw new Error(`Gagal mengakses direktori: ${dirResponse.status}`);
        }
        const dirHtml = await dirResponse.text();

        // 2. Parse HTML untuk mendapatkan nama file
        // PERBAIKAN 2: Regex ini jauh lebih kuat.
        // Hanya akan menangkap link yang dimulai dengan "IDY" dan diakhiri dengan ".txt" atau ".png".
        // Ini menghindari link lain di halaman seperti "?C=N;O=D".
        const filenameRegex = /href="(IDY[^"]+\.(?:txt|png))"/g;
        let match;
        const allFiles = [];
        while ((match = filenameRegex.exec(dirHtml)) !== null) {
            allFiles.push(match[1]);
        }
        
        // 3. Logika filter file
        const darwinTxtFiles = allFiles.filter(name => name.endsWith('.txt'));
        if (darwinTxtFiles.length === 0) {
            return new Response(JSON.stringify({ error: `Tidak ada file .txt ditemukan di direktori.` }), { status: 404, headers: { 'Content-Type': 'application/json' }});
        }

        let latestFilename = null;
        let latestTimestamp = '0';
        darwinTxtFiles.forEach(filename => {
            const timestamp = getTimestampFromAnyFilename(filename);
            if (timestamp && timestamp > latestTimestamp) {
                latestTimestamp = timestamp;
                latestFilename = filename;
            }
        });

        if (!latestFilename) {
            return new Response(JSON.stringify({ error: `Tidak ada file .txt valid yang bisa diproses.` }), { status: 404, headers: { 'Content-Type': 'application/json' }});
        }
        console.log(`[VAAC-HTTP] File TXT terbaru dipilih: ${latestFilename}`);

        // 4. Ambil file .txt yang relevan
        const txtUrl = `${directoryUrl}${latestFilename}`;
        const txtResponse = await fetch(txtUrl);
        const fullText = await txtResponse.text();

        // 5. Filter berdasarkan AREA INDONESIA
        const isIndonesiaArea = /^AREA:\s*INDONESIA/im.test(fullText);
        if (!isIndonesiaArea) {
            console.log(`[VAAC-HTTP] VAA terbaru (${latestFilename}) bukan untuk area Indonesia.`);
            return new Response(JSON.stringify({
                advisoryNumber: null,
                message: "Latest VAA is not for Indonesia area.",
                fullText: fullText,
                imageBase64: null
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        console.log(`[VAAC-HTTP] VAA terdeteksi untuk area Indonesia.`);

        const advisoryMatch = fullText.match(/ADVISORY\s+NR:\s*(\d{4}\/\d+)/i);
        const advisoryNumber = advisoryMatch ? advisoryMatch[1] : null;

        // 6. Cari dan ambil file .png yang cocok
        let imageBase64 = null;
        const matchingPngFile = allFiles.find(name => 
            name.endsWith('.png') && getTimestampFromAnyFilename(name) === latestTimestamp
        );

        if (matchingPngFile) {
            console.log(`[VAAC-HTTP] File PNG pasangan ditemukan: ${matchingPngFile}`);
            const pngUrl = `${directoryUrl}${matchingPngFile}`;
            const pngResponse = await fetch(pngUrl);
            const imageBuffer = await pngResponse.arrayBuffer();
            imageBase64 = `data:image/png;base64,${arrayBufferToBase64(imageBuffer)}`;
        } else {
            console.log(`[VAAC-HTTP] Tidak ada file PNG yang cocok untuk timestamp ${latestTimestamp}`);
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
        console.error('[VAAC-HTTP] Kesalahan internal:', error.stack);
        return new Response(JSON.stringify({ error: 'Kesalahan internal pada server proxy.', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
