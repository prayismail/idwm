const ftp = require('basic-ftp');
const { Writable } = require('stream');
const crypto = require('crypto');

function getTimestampFromAnyFilename(filename) {
    const match = filename.match(/\.(\d{12})\./);
    return match ? match[1] : null;
}

// FORMAT NETLIFY FUNCTIONS
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
        await client.cd(`/anon/gen/vaac/${new Date().getFullYear()}`);
        const list = await client.list();

        // ... (Masukkan logika filter file txt, poligon, dan download imageBase64 di sini sama persis seperti kode Vercel Anda) ...

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
        console.error('FTP Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal FTP error', details: error.message })
        };
    } finally {
        if (!client.closed) client.close();
    }
};
