const ftp = require('basic-ftp');
const { Writable } = require('stream');
const crypto = require('crypto');

// --- Data Poligon FIR UPG (WAAF) ---
const firUPG_geojson = {
    "type": "Feature",
    "properties": { "location": "UJUNG PANDANG", "code": "WAAF" },
    "geometry": { 
        "type": "Polygon", 
        "coordinates": [[[140.99, -6.32], [141, -6.32], [141, 3.5], [133, 3.5], [132.53, 4], [118, 4], [117.89, 4.18], [117.68, 4.17], [117.61, 4.14], [117.54, 4.17], [117.53, 4.16], [117.48, 4.17], [117.44, 4.19], [117.43, 4.23], [117.39, 4.26], [117.37, 4.29], [117.31, 4.3], [117.25, 4.37], [117.23, 4.37], [117.2, 4.34], [117.15, 4.35], [117.11, 4.33], [117.04, 4.35], [117.02, 4.32], [117.01, 4.32], [117.01, 4.35], [116.97, 4.34], [116.91, 4.37], [116.84, 4.33], [116.82, 4.35], [116.79, 4.34], [116.75, 4.39], [116.71, 4.33], [116.67, 4.35], [116.63, 4.34], [116.61, 4.38], [116.59, 4.37], [116.56, 4.41], [116.52, 4.33], [116.49, 4.33], [116.48, 4.3], [116.44, 4.29], [116.43, 4.33], [116.35, 4.39], [116.28, 4.36], [116.17, 4.39], [116.17, 4.33], [116.12, 4.34], [116.07, 4.28], [116.03, 4.3], [116.03, 4.33], [116, 4.35], [115.93, 4.35], [115.91, 4.39], [115.88, 4.39], [115.86, 4.34], [115.87, 4.29], [115.83, 4.26], [115.82, 4.23], [115.8, 4.22], [115.79, 4.24], [115.77, 4.24], [115.73, 4.19], [115.7, 4.19], [115.68, 4.16], [115.64, 3.96], [115.62, 3.94], [115.59, 3.94], [115.56, 3.92], [115.58, 3.88], [115.62, 3.87], [115.61, 3.82], [115.58, 3.75], [115.57, 3.65], [115.58, 3.6], [115.61, 3.55], [115.61, 3.51], [115.66, 3.44], [115.62, 3.41], [115.61, 3.45], [115.59, 3.45], [115.54, 3.36], [115.55, 3.33], [115.53, 3.32], [115.52, 3.25], [115.53, 3.23], [115.52, 3.22], [115.52, 3.19], [115.56, 3.17], [115.56, 3.15], [115.54, 3.14], [115.51, 3.11], [115.52, 3.06], [115.5, 3.03], [115.44, 3.02], [115.4, 2.98], [115.33, 2.98], [115.32, 3.01], [115.28, 3.05], [115.25, 2.97], [115.16, 2.93], [115.15, 2.91], [115.15, 2.87], [115.09, 2.82], [115.15, 2.79], [115.14, 2.75], [115.09, 2.7], [115.11, 2.69], [115.12, 2.65], [115.09, 2.61], [115.11, 2.58], [115.18, 2.61], [115.22, 2.54], [115.25, 2.54], [115.25, 2.51], [115.2, 2.47], [115.14, 2.48], [115.12, 2.45], [115.1, 2.4], [115.05, 2.4], [115.05, 2.39], [115.04, 2.39], [115.03, 2.36], [115, 2.35], [114.96, 2.37], [114.95, 2.32], [114.97, 2.29], [114.92, 2.26], [114.87, 2.26], [114.83, 2.25], [114.82, 2.26], [114.79, 2.2], [114.74, 2.19], [114.74, 2.14], [114.8, 2.15], [114.82, 2.13], [114.8, 2.09], [114.81, 2.06], [114.79, 2.06], [114.81, 2.02], [114.86, 2.04], [114.89, 2.02], [114.85, 1.96], [114.88, 1.91], [114.82, 1.89], [114.79, 1.85], [114.75, 1.87], [114.72, 1.86], [114.73, 1.83], [114.69, 1.81], [114.72, 1.78], [114.71, 1.64], [114.65, 1.59], [114.61, 1.57], [114.6, 1.53], [114.62, 1.52], [114.59, 1.45], [114.52, 1.44], [114.5, 1.48], [114.47, 1.48], [114.41, 1.52], [114.38, 1.52], [114.38, 1.49], [114.33, 1.48], [114.3, 1.46], [114.24, 1.45], [114.21, 1.41], [114.14, 1.47], [113.97, 1.45], [113.92, 1.41], [113.82, 1.37], [113.83, 1.34], [113.8, 1.3], [113.7, 1.27], [113.67, 1.22], [113.63, 1.22], [113.62, 1.25], [110.38, -3], [110.38, -8.33], [114.5, -12], [123.33, -12], [126.83, -9.33], [135, -7], [139.67, -9.83], [141, -9.83], [141.03, -9.62], [141.02, -6.89], [140.99, -6.9], [140.97, -6.89], [140.95, -6.91], [140.94, -6.89], [140.95, -6.86], [140.94, -6.87], [140.92, -6.87], [140.9, -6.84], [140.92, -6.82], [140.87, -6.79], [140.9, -6.75], [140.85, -6.72], [140.85, -6.68], [140.87, -6.68], [140.86, -6.66], [140.87, -6.65], [140.86, -6.64], [140.88, -6.62], [140.84, -6.61], [140.9, -6.59], [140.91, -6.57], [140.89, -6.57], [140.89, -6.56], [140.94, -6.56], [140.92, -6.55], [140.92, -6.5], [140.96, -6.49], [140.95, -6.47], [140.95, -6.45], [140.92, -6.47], [140.94, -6.44], [140.92, -6.42], [140.95, -6.43], [140.94, -6.41], [140.98, -6.39], [140.94, -6.38], [140.98, -6.36], [140.96, -6.35], [140.96, -6.33], [140.99, -6.32]]] 
    }
};

// --- Helper Functions ---
function getTimestampFromAnyFilename(filename) {
    const match = filename.match(/\.(\d{12})\./);
    return match ? match[1] : null;
}

function extractVolcanoCoordinates(fullText) {
    const psnMatch = fullText.match(/PSN:\s*(S|N)(\d{2})(\d{2})\s*(E|W)(\d{3})(\d{2})/i);
    if (!psnMatch) return null;
    
    const [, latDir, latDeg, latMin, lonDir, lonDeg, lonMin] = psnMatch;
    
    let lat = parseInt(latDeg) + (parseInt(latMin) / 60);
    if (latDir.toUpperCase() === 'S') lat = -lat;
    
    let lon = parseInt(lonDeg) + (parseInt(lonMin) / 60);
    if (lonDir.toUpperCase() === 'W') lon = -lon;
    
    return [lon, lat];
}

function isPointInPolygon(point, polygonArray) {
    let x = point[0], y = point[1];
    let inside = false;
    
    for (let i = 0, j = polygonArray.length - 1; i < polygonArray.length; j = i++) {
        let xi = polygonArray[i][0], yi = polygonArray[i][1];
        let xj = polygonArray[j][0], yj = polygonArray[j][1];
        
        let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 's-maxage=30, stale-while-revalidate=60'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: `Method Not Allowed` }) };
    }

    const client = new ftp.Client(30000);

    try {
        await client.access({ host: "ftp.bom.gov.au" });
        const currentYear = new Date().getFullYear();
        await client.cd(`/anon/gen/vaac/${currentYear}`);
        const list = await client.list();

        // Cari file .txt
        const darwinTxtFiles = list.filter(item => item.name.startsWith('IDY') && item.name.endsWith('.txt') && item.type === ftp.FileType.File);
        if (darwinTxtFiles.length === 0) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: `Tidak ada file .txt ditemukan.` }) };
        }
        
        let latestFile = null;
        let latestTimestamp = '0';
        darwinTxtFiles.forEach(file => {
            const timestamp = getTimestampFromAnyFilename(file.name);
            if (timestamp && timestamp > latestTimestamp) {
                latestTimestamp = timestamp;
                latestFile = file;
            }
        });

        if (!latestFile) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: `Tidak ada file .txt valid.` }) };
        }
        
        const txtWritable = new Writable();
        const txtChunks = [];
        txtWritable._write = (chunk, encoding, next) => { txtChunks.push(chunk); next(); };
        await client.downloadTo(txtWritable, latestFile.name);
        
        // ================= PERBAIKAN URUTAN VARIABEL =================
        const fullText = Buffer.concat(txtChunks).toString('utf-8');
        const advisoryHash = crypto.createHash('sha1').update(fullText).digest('hex');
        
        // DEKLARASIKAN ADVISORY NUMBER DI SINI (Sebelum IF)
        const advisoryMatch = fullText.match(/ADVISORY\s+NR:\s*(\d{4}\/\d+)/i);
        const advisoryNumber = advisoryMatch ? advisoryMatch[1] : null;
        // =============================================================

        // ================= LOGIKA FILTER POLIGON =====================
        let isInsideFIRUPG = false;
        const volcanoCoords = extractVolcanoCoordinates(fullText);
        
        if (volcanoCoords) {
            const polygonCoordinates = firUPG_geojson.geometry.coordinates[0];
            isInsideFIRUPG = isPointInPolygon(volcanoCoords, polygonCoordinates);
        }

        if (!isInsideFIRUPG) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    advisoryHash: advisoryHash, // Atau bisa pakai latestFile.name
                    advisoryNumber: advisoryNumber, // Tidak akan error lagi
                    message: "Outside FIR Ujung Pandang",
                    fullText: fullText,
                    imageBase64: null
                })
            };
        }
        // =============================================================
        
        // Jika lolos filter (berada di dalam FIR UPG), lanjut cari gambar PNG
        let imageBase64 = null;
        const matchingPngFile = list.find(item => 
            item.name.endsWith('.png') && getTimestampFromAnyFilename(item.name) === latestTimestamp
        );
        
        if (matchingPngFile) {
            const pngWritable = new Writable();
            const pngChunks = [];
            pngWritable._write = (chunk, encoding, next) => { pngChunks.push(chunk); next(); };
            await client.downloadTo(pngWritable, matchingPngFile.name);
            const imageBuffer = Buffer.concat(pngChunks);
            imageBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                advisoryNumber: advisoryNumber,
                advisoryHash: advisoryHash,
                fullText: fullText,
                imageBase64: imageBase64
            })
        };

    } catch (error) {
        console.error('[Proxy VAAC-FTP-Netlify] Kesalahan internal:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Kesalahan internal pada server proxy FTP.', details: error.message })
        };
    } finally {
        if (!client.closed) client.close();
    }
};
