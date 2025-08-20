// File: functions/metar.js
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const icao = url.searchParams.get('icao');

  if (!icao) {
    return new Response(JSON.stringify({ error: 'Parameter "icao" diperlukan.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const targetUrl = `https://api.met.no/weatherapi/tafmetar/1.0/metar.txt?icao=${encodeURIComponent(icao)}`;
  const response = await fetch(targetUrl, {
    headers: { 'User-Agent': 'IDWM/CloudflarePagesFunction' },
  });
  
  const newResponse = new Response(response.body, { status: response.status, headers: response.headers });
  newResponse.headers.set('Cache-Control', 'public, max-age=300');
  newResponse.headers.set('Content-Type', 'text/plain; charset=utf-8');

  return newResponse;
}
