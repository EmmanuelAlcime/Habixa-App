/**
 * Web-only Leaflet map. Dynamically imported by MapContent.web.tsx
 * to avoid SSR/window issues. Uses OpenStreetMap (no API key required).
 */
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Router } from 'expo-router';
import type { Listing } from '@/lib/types/listing';

// Fix Leaflet default icon path for bundlers
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface WebLeafletMapProps {
  listings: Listing[];
  router: Router;
  center: [number, number];
}

function FitBounds({ listings }: { listings: Listing[] }) {
  const map = useMap();
  useEffect(() => {
    if (listings.length === 0) return;
    if (listings.length === 1) {
      map.setView(
        [listings[0].latitude!, listings[0].longitude!] as [number, number],
        14
      );
      return;
    }
    const bounds = L.latLngBounds(
      listings.map((l) => [l.latitude!, l.longitude!] as [number, number])
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [map, listings]);
  return null;
}

export function WebLeafletMap({
  listings,
  router,
  center,
}: WebLeafletMapProps) {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 160 }}>
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom
        style={{ width: '100%', height: '100%', minHeight: 160, borderRadius: 14 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {listings.map((item) => (
          <Marker
            key={item.id}
            position={[item.latitude!, item.longitude!]}
            eventHandlers={{
              click: () => router.push(`/(tabs)/(home)/listing/${item.id}`),
            }}
          >
            <Popup>
              <strong>{item.title}</strong>
              <br />
              {item.address}
              <br />
              <button
                type="button"
                onClick={() => router.push(`/(tabs)/(home)/listing/${item.id}`)}
                style={{
                  marginTop: 8,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  background: '#C2673A',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                }}
              >
                View listing
              </button>
            </Popup>
          </Marker>
        ))}
        {listings.length > 0 && <FitBounds listings={listings} />}
      </MapContainer>
    </div>
  );
}
