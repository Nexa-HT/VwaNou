import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { Marker, Popup } from "react-leaflet";

type Position = [number, number] | null;

function UserLocationMarker() {
  const [position, setPosition] = useState<Position>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setPosition([coords.latitude, coords.longitude]);
      },
      (error) => {
        console.error("Geolocation error:", error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5_000,
        timeout: 10_000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const userIcon = useMemo(
    () =>
      L.icon({
        iconUrl: "/icons/user-dot.png",
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        popupAnchor: [0, -10],
      }),
    [],
  );

  if (!position) {
    return null;
  }

  return (
    <Marker position={position} icon={userIcon}>
      <Popup>Your live location</Popup>
    </Marker>
  );
}

export default UserLocationMarker;
