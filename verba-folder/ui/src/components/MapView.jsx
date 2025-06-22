// src/components/MapView.jsx
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { geocodeNominatim } from '../utils/geocode.js';
import L from 'leaflet';

/* blue pin icon (Leaflet default sprite w/out shadow) */
const icon = new L.Icon({
  iconUrl   : 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconSize  : [25, 41],
  iconAnchor: [12, 41],
});

export default function MapView({ reports }) {
  const [points, setPoints] = useState([]);

  /* whenever the reports list changes, (re)geocode what’s missing */
  useEffect(() => {
    let cancelled = false;

    async function enrich() {
      const enriched = [];

      for (const r of reports) {
        if (r.coords) {                // backend already sent coords
          enriched.push({ ...r, coords: r.coords });
          continue;
        }

        if (!r.incident_location) continue;

        // client-side geocode
        const geo = await geocodeNominatim(r.incident_location);
        if (geo) enriched.push({ ...r, coords: geo });
      }

      if (!cancelled) setPoints(enriched);
    }

    enrich();
    return () => { cancelled = true; };
  }, [reports]);

  /* nothing to show yet */
  if (!points.length) return null;

  const center = [points[0].coords.lat, points[0].coords.lng];

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      style={{ width: '100%', height: '350px' }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />

      {points.map(p => (
        <Marker
          key={p.id}
          position={[p.coords.lat, p.coords.lng]}
          icon={icon}
        >
          <Popup>
            <strong>{p.patient_full_name || 'Unnamed'}</strong><br />
            {p.incident_location}<br />
            Urgency – {p.treatment_urgency || 'unknown'}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
