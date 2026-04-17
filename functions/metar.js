export async function onRequest(context) {
  const url = new URL(context.request.url);
  
  const icao = url.searchParams.get('icao')?.toUpperCase();
  const type = url.searchParams.get('type')?.toUpperCase() || 'METAR'; 

  if (!icao || (type !== 'METAR' && type !== 'TAF')) {
    return new Response(JSON.stringify({ error: 'Parameter icao atau type tidak valid.' }), { status: 400 });
  }

  // --- KREDENSIAL LOGIN ---
  const username = '97180';
  const password = 'opr97180';
  
  // URL Login. *PENTING: Anda mungkin perlu mengecek tab Network lagi saat proses login 
  // untuk memastikan URL POST-nya apakah '/login' atau '/api/login' atau lainnya.
  const loginUrl = 'https://bmkgsatu.bmkg.go.id/login'; 

  try {
    // ==========================================
    // TAHAP 1: LOGIN UNTUK MENDAPATKAN COOKIE
    // ==========================================
    // Kita asumsikan form login menggunakan standar URL Encoded.
    // Jika gagal, mungkin formnya memakai payload JSON. 
    const loginData = new URLSearchParams();
    loginData.append('username', username); // Nama field biasanya 'username', 'userid', atau 'station_id'
    loginData.append('password', password); 

    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      body: loginData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      redirect: 'manual' // Mencegah redirect otomatis agar cookie tertangkap
    });

    const cookies = loginResponse.headers.get('set-cookie');
    
    // Jika tidak dapat cookie, ada kemungkinan endpoint loginnya berbeda.
    // Tapi kita coba lanjutkan saja, kadang API search-nya terbuka tanpa login (meski jarang).

    // ==========================================
    // TAHAP 2: FETCH API SEARCH (HASIL JSON)
    // ==========================================
    // Buat rentang tanggal dinamis (H-1 hingga Hari ini) dalam format YYYY-MM-DDTHH:mm:ss
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    
    const formatIso = (date) => date.toISOString().split('.')[0]; // Menghapus desimal milidetik dan 'Z'
    const lte = formatIso(now);
    const gte = formatIso(yesterday);

    // Kita modifikasi sedikit URL dari screenshot Anda:
    // Kita tambahkan parameter `&cccc=${icao}` agar server BMKG langsung memfilter ICAO yang kita minta.
    // Dan kita kurangi `_size` menjadi 50 saja karena kita hanya butuh data terbaru.
    const searchUrl = `https://bmkgsatu.bmkg.go.id/db/bmkgsatu//@search?type_name=GTSMessage&_metadata=type_message,timestamp_data,timestamp_sent_data,station_wmo_id,sandi_gts,ttaaii,cccc,need_ftp&_size=50&timestamp_data__gte=${gte}&timestamp_data__lte=${lte}&cccc=${icao}`;

    const fetchHeaders = {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    };
    if (cookies) {
        fetchHeaders['Cookie'] = cookies; // Sisipkan cookie jika ada
    }

    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: fetchHeaders
    });

    if (!searchResponse.ok) {
        return new Response(`Gagal mengakses data API BMKG. Status: ${searchResponse.status}`, { status: searchResponse.status });
    }

    // ==========================================
    // TAHAP 3: PARSING JSON
    // ==========================================
    const jsonData = await searchResponse.json();
    
    // JSON kembalian biasanya berupa array langsung [...] atau di dalam object { data: [...] }
    const records = Array.isArray(jsonData) ? jsonData : (jsonData.data || jsonData.result || jsonData.items || []);

    let foundOpmet = null;

    // Cari data yang sesuai tipe (METAR/TAF) dari array JSON
    for (const record of records) {
        // Asumsi struktur data berdasarkan _metadata di URL: record.sandi_gts
        if (record && record.sandi_gts && record.type_message) {
            
            // Cek apakah tipenya cocok (METAR / TAF)
            // Terkadang TAF ditulis AERODROME di sistem BMKGSoft
            const isTaf = type === 'TAF' && (record.type_message.includes('TAF') || record.type_message.includes('AERODROME'));
            const isMetar = type === 'METAR' && record.type_message.includes('METAR');

            if (isTaf || isMetar) {
                const sandiRaw = record.sandi_gts.trim();
                
                // Pastikan teks sandinya mengandung ICAO yang dicari
                if (sandiRaw.includes(icao)) {
                    // Bersihkan sandi (potong header FTID/SAID jika ada, mulai dari METAR/TAF)
                    const startIndex = sandiRaw.indexOf(type);
                    if (startIndex !== -1) {
                        foundOpmet = sandiRaw.substring(startIndex).replace(/\s+/g, ' ').trim();
                        if (!foundOpmet.endsWith('=')) foundOpmet += '=';
                        break; // Data pertama biasanya yang paling baru (tergantung urutan API)
                    } else {
                        // Jika tidak ada awalan "METAR " atau "TAF ", gunakan seadanya
                        foundOpmet = sandiRaw.replace(/\s+/g, ' ').trim();
                        if (!foundOpmet.endsWith('=')) foundOpmet += '=';
                        break;
                    }
                }
            }
        }
    }

    if (!foundOpmet) {
        return new Response(`NIL= (Data JSON ${type} untuk ${icao} kosong atau tidak ditemukan)`, { status: 404 });
    }

    // ==========================================
    // KEMBALIKAN KE CLIENT
    // ==========================================
    const finalResponse = new Response(foundOpmet, { status: 200 });
    finalResponse.headers.set('Cache-Control', 'public, max-age=300');
    finalResponse.headers.set('Content-Type', 'text/plain; charset=utf-8');

    return finalResponse;

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Kesalahan internal parsing API.', details: err.message }), { status: 500, headers: {'Content-Type': 'application/json'} });
  }
}
