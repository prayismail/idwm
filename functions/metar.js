export async function onRequest(context) {
  const url = new URL(context.request.url);
  
  // Ambil parameter icao (bisa berupa "WAAA" atau "WAAA,WABB,WADD")
  const icaoParam = url.searchParams.get('icao');
  const type = url.searchParams.get('type')?.toUpperCase() || 'METAR'; 

  if (!icaoParam || (type !== 'METAR' && type !== 'TAF')) {
    return new Response(JSON.stringify({ error: 'Parameter icao atau type tidak valid.' }), { status: 400 });
  }

  // Pecah ICAO menjadi array
  const icaoList = icaoParam.split(',').map(code => code.trim().toUpperCase());

  // --- KREDENSIAL LOGIN ---
  const username = '97180';
  const password = 'opr97180';
  
  // TEBAKAN 1: Mengubah loginUrl ke endpoint API auth (Mohon sesuaikan jika hasil cek Network Anda berbeda)
  const loginUrl = 'https://bmkgsatu.bmkg.go.id/api/auth/login'; // Atau 'https://bmkgsatu.bmkg.go.id/login'

  try {
    // ==========================================
    // TAHAP 1: LOGIN UNTUK MENDAPATKAN COOKIE
    // ==========================================
    
    // TEBAKAN 2: Menggunakan format JSON untuk payload login
    const loginData = {
        Station Id: username, // Jika di payload namanya station_id, ganti kata 'username' di sebelah kiri ini
        Password: password
    };

    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      body: JSON.stringify(loginData),
      headers: {
        'Content-Type': 'application/json', // Menggunakan JSON
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      redirect: 'manual' 
    });

    const cookies = loginResponse.headers.get('set-cookie');
    
    if (!cookies) {
        // Jika gagal, ini akan menampilkan 401 seperti di screenshot Anda.
        return new Response("Gagal mendapatkan sesi login (Cookie) dari server BMKG.", { status: 401 });
    }

    // ==========================================
    // TAHAP 2: FETCH API SEARCH (HASIL JSON)
    // ==========================================
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    
    const formatIso = (date) => date.toISOString().split('.')[0];
    const lte = formatIso(now);
    const gte = formatIso(yesterday);

    // MENGHAPUS parameter &cccc= agar kita mengambil semua data (500 terbaru), 
    // lalu kita filter secara mandiri di bawah.
    const searchUrl = `https://bmkgsatu.bmkg.go.id/db/bmkgsatu//@search?type_name=GTSMessage&_metadata=type_message,sandi_gts,cccc&_size=500&timestamp_data__gte=${gte}&timestamp_data__lte=${lte}`;

    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    if (!searchResponse.ok) {
        return new Response(`Gagal mengakses data API BMKG. Status: ${searchResponse.status}`, { status: searchResponse.status });
    }

    const jsonData = await searchResponse.json();
    const records = Array.isArray(jsonData) ? jsonData : (jsonData.data || jsonData.result || jsonData.items || []);

    // ==========================================
    // TAHAP 3: PARSING & FILTER MULTI-ICAO
    // ==========================================
    let resultString = "";
    let foundIcaos = new Set(); // Menyimpan ICAO apa saja yang sudah ketemu

    // Loop data dari BMKGSoft
    for (const record of records) {
        if (record && record.sandi_gts && record.type_message) {
            const isTaf = type === 'TAF' && (record.type_message.includes('TAF') || record.type_message.includes('AERODROME'));
            const isMetar = type === 'METAR' && record.type_message.includes('METAR');

            if (isTaf || isMetar) {
                const sandiRaw = record.sandi_gts.trim();
                const recordIcao = record.cccc ? record.cccc.toUpperCase() : null;

                // Cek apakah ICAO data ini termasuk dalam list yang kita request
                // Dan pastikan kita belum memasukkan ICAO ini (karena kita hanya butuh 1 yang terbaru)
                if (recordIcao && icaoList.includes(recordIcao) && !foundIcaos.has(recordIcao)) {
                    
                    let cleanSandi = "";
                    const startIndex = sandiRaw.indexOf(type);
                    
                    if (startIndex !== -1) {
                        cleanSandi = sandiRaw.substring(startIndex).replace(/\s+/g, ' ').trim();
                    } else {
                        cleanSandi = sandiRaw.replace(/\s+/g, ' ').trim();
                    }

                    if (!cleanSandi.endsWith('=')) cleanSandi += '=';
                    
                    // Gabungkan ke hasil akhir (dipisah dengan baris baru seperti format METAR/TAF standar)
                    resultString += cleanSandi + "\n";
                    foundIcaos.add(recordIcao);
                }
            }
        }
    }

    // Jika tak satupun ICAO dari request ditemukan
    if (resultString === "") {
        return new Response(`NIL=`, { status: 404 });
    }

    // ==========================================
    // KEMBALIKAN KE CLIENT
    // ==========================================
    const finalResponse = new Response(resultString.trim(), { status: 200 });
    finalResponse.headers.set('Cache-Control', 'public, max-age=300');
    finalResponse.headers.set('Content-Type', 'text/plain; charset=utf-8');

    return finalResponse;

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Kesalahan internal.', details: err.message }), { status: 500, headers: {'Content-Type': 'application/json'} });
  }
}
