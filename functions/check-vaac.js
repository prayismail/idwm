// File: functions/check-vaac.js (Cloudflare Pages Functions)

// Helper function untuk mengambil timestamp dari nama file (sama seperti sebelumnya)
function getTimestampFromAnyFilename(filename) {
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
        // Ganti protokol ftp:// menjadi http://
        const directoryUrl = `http://ftp.bom.gov.au/anon/gen/vaac/${currentYear}/`;

        // 1. Ambil daftar file dengan fetch, bukan FTP
        const dirResponse = await fetch(directoryUrl);
        if (!dirResponse.ok) {
            throw new Error(`Gagal mengakses direktori: ${dirResponse.status}`);
        }
        const dirHtml = await dirResponse.text();

        // 2. Parse HTML untuk mendapatkan nama file menggunakan Regex
        const filenameRegex = /href="([^"]+)"/g;
        let match;
        const allFiles = [];
        while ((match = filenameRegex.exec(dirHtml)) !== null) {
            allFiles.push(match[1]);
        }
        
        // 3. Logika filter file (sama seperti sebelumnya)
        const darwinTxtFiles = allFiles.filter(name => name.startsWith('IDY') && name.endsWith('.txt'));
        if (darwinTxtFiles.length === 0) {
            return new Response(JSON.stringify({ error: `Tidak ada file .txt ditemukan.` }), { status: 404 });
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
            return new Response(JSON.stringify({ error: `Tidak ada file .txt valid.` }), { status: 404 });
        }

        // 4. Ambil file .txt yang relevan
        const txtUrl = `${directoryUrl}${latestFilename}`;
        const txtResponse = await fetch(txtUrl);
        const fullText = await txtResponse.text();

        // 5. Filter berdasarkan AREA INDONESIA (logika sama)
        const isIndonesiaArea = /^AREA:\s*INDONESIA/im.test(fullText);
        if (!isIndonesiaArea) {
            return new Response(JSON.stringify({
                advisoryNumber: null,
                message: "Latest VAA is not for Indonesia area.",
                fullText: fullText,
                imageBase64: null
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        const advisoryMatch = fullText.match(/ADVISORY\s+NR:\s*(\d{4}\/\d+)/i);
        const advisoryNumber = advisoryMatch ? advisoryMatch[1] : null;

        // 6. Cari dan ambil file .png yang cocok
        let imageBase64 = null;
        const matchingPngFile = allFiles.find(name => 
            name.endsWith('.png') && getTimestampFromAnyFilename(name) === latestTimestamp
        );

        if (matchingPngFile) {
            const pngUrl = `${directoryUrl}${matchingPngFile}`;
            const pngResponse = await fetch(pngUrl);
            const imageBuffer = await pngResponse.arrayBuffer(); // Ambil sebagai ArrayBuffer
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
                'Cache-Control': 'public, s-maxage=180, stale-while-revalidate'
            }
        });

    } catch (error) {
        console.error('[Proxy VAAC-HTTP] Kesalahan internal:', error);
        return new Response(JSON.stringify({ error: 'Kesalahan internal pada server proxy.', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
