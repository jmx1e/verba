export async function geocodeNominatim(query) {
    if (!query) return null;
  
    const url =
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=` +
      encodeURIComponent(query);
  
    // Nominatim asks for a User-Agent header
    const res = await fetch(url, {
      headers: { 'User-Agent': 'cal-hacks-demo/1.0 (browser)' }
    });
  
    const json = await res.json().catch(() => null);
    if (!json?.length) return null;
  
    return {
      lat   : +json[0].lat,
      lng   : +json[0].lon,
      label : json[0].display_name
    };
  }