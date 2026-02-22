"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MapPin,
  Search,
  Clock,
  Star,
  Utensils,
  Loader2,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { initGoogleMaps } from "@/lib/google-maps";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface Restaurant {
  restaurant_name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  closing_time: string;
  hours_of_operation: string[];
  distance_miles: number;
}

interface SearchResponse {
  user_location: { lat: number; lng: number; formatted_address: string };
  radius_miles: number;
  restaurants: Restaurant[];
  total_restaurants: number;
}

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerClassRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [searched, setSearched] = useState(false);
  const [locLabel, setLocLabel] = useState("");

  useEffect(() => {
    if (!mapRef.current) return;
    initGoogleMaps()
      .then(({ Map, AdvancedMarkerElement }) => {
        const map = new Map(mapRef.current!, {
          center: { lat: 34.4208, lng: -119.6982 },
          zoom: 13,
          mapId: "food-rescue-map",
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        });
        mapInstance.current = map;
        markerClassRef.current = AdvancedMarkerElement;
        infoRef.current = new google.maps.InfoWindow();
        setMapReady(true);
      })
      .catch(() => setMapReady(false));
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const loc = { lat: p.coords.latitude, lng: p.coords.longitude };
        setUserLoc(loc);
        if (mapInstance.current) mapInstance.current.panTo(loc);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // Handle directions from listings page
  useEffect(() => {
    if (!mapReady) return;
    const params = new URLSearchParams(window.location.search);
    const lat = parseFloat(params.get("lat") || "");
    const lng = parseFloat(params.get("lng") || "");
    const name = params.get("name") || "";
    if (!isNaN(lat) && !isNaN(lng)) {
      setTimeout(() => {
        if (!mapInstance.current) return;
        mapInstance.current.setCenter({ lat, lng });
        mapInstance.current.setZoom(17);
        const MarkerClass = markerClassRef.current;
        if (MarkerClass && infoRef.current) {
          const el = document.createElement("div");
          el.innerHTML = `<div style="
            background:#16a34a;color:#fff;border-radius:50%;
            width:36px;height:36px;display:flex;align-items:center;
            justify-content:center;font-size:18px;
            box-shadow:0 2px 8px rgba(0,0,0,.3);border:2px solid #fff;
          ">📍</div>`;
          const marker = new MarkerClass({
            map: mapInstance.current,
            position: { lat, lng },
            title: name,
            content: el,
          });
          infoRef.current.setContent(`
            <div style="padding:8px;max-width:260px">
              <strong style="font-size:14px">${name}</strong>
            </div>
          `);
          infoRef.current.open(mapInstance.current, marker);
          markersRef.current.push(marker);
        }
      }, 500);
    }
  }, [mapReady]);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];
    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }
  }, []);

  const placeMarkers = useCallback(
    (data: Restaurant[], center: { lat: number; lng: number }) => {
      if (!mapInstance.current || !mapReady) return;
      clearMarkers();

      circleRef.current = new google.maps.Circle({
        map: mapInstance.current,
        center,
        radius: 5 * 1609.34,
        fillColor: "#16a34a",
        fillOpacity: 0.06,
        strokeColor: "#16a34a",
        strokeOpacity: 0.3,
        strokeWeight: 2,
      });

      const userEl = document.createElement("div");
      userEl.innerHTML = `<div style="
        background:#3b82f6;color:#fff;border-radius:50%;
        width:16px;height:16px;border:3px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,.4);
      "></div>`;
      const MarkerClass = markerClassRef.current;
      if (!MarkerClass) return;

      const userMarker = new MarkerClass({
        map: mapInstance.current,
        position: center,
        title: "Your location",
        content: userEl,
      });
      markersRef.current.push(userMarker);

      const bounds = new google.maps.LatLngBounds();
      bounds.extend(center);

      data.forEach((rest, idx) => {
        const el = document.createElement("div");
        el.innerHTML = `<div style="
          background:#16a34a;color:#fff;border-radius:50%;
          width:36px;height:36px;display:flex;align-items:center;
          justify-content:center;font-weight:700;font-size:14px;
          box-shadow:0 2px 8px rgba(0,0,0,.3);border:2px solid #fff;cursor:pointer;
        ">${idx + 1}</div>`;

        const marker = new MarkerClass({
          map: mapInstance.current!,
          position: { lat: rest.lat, lng: rest.lng },
          title: rest.restaurant_name,
          content: el,
        });

        marker.addListener("click", () => {
          setSelectedIdx(idx);
          infoRef.current?.setContent(`
            <div style="padding:8px;max-width:260px">
              <strong style="font-size:14px">${rest.restaurant_name}</strong>
              <p style="margin:4px 0;font-size:12px;color:#666">${rest.address}</p>
              <p style="margin:4px 0;font-size:12px;color:#16a34a;font-weight:600">
                Closes: ${rest.closing_time}
              </p>
              <p style="font-size:11px;color:#888">${rest.distance_miles} mi away</p>
            </div>
          `);
          infoRef.current?.open(mapInstance.current!, marker);
          document.getElementById(`rest-${idx}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });

        markersRef.current.push(marker);
        bounds.extend({ lat: rest.lat, lng: rest.lng });
      });

      if (data.length) mapInstance.current.fitBounds(bounds, 60);
    },
    [mapReady, clearMarkers]
  );

  const handleSearch = async (lat?: number, lng?: number) => {
    setLoading(true);
    setError(null);
    setRestaurants([]);
    setSearched(true);
    setSelectedIdx(null);

    const body: Record<string, unknown> = { query: "restaurant", radius_miles: 5 };
    if (address.trim()) {
      body.address = address.trim();
    } else if (lat != null && lng != null) {
      body.lat = lat;
      body.lng = lng;
    } else if (userLoc) {
      body.lat = userLoc.lat;
      body.lng = userLoc.lng;
    } else {
      setError("Enter an address or allow location access.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${BACKEND}/api/v1/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ detail: "Server error" }));
        throw new Error(e.detail || `Request failed (${res.status})`);
      }
      const data: SearchResponse = await res.json();
      setRestaurants(data.restaurants);
      setLocLabel(data.user_location.formatted_address);
      const center = { lat: data.user_location.lat, lng: data.user_location.lng };
      if (mapInstance.current) mapInstance.current.panTo(center);
      placeMarkers(data.restaurants, center);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Location is not supported by your browser. Enter an address instead.");
      return;
    }
    if (userLoc) {
      setAddress("");
      handleSearch(userLoc.lat, userLoc.lng);
    } else {
      setError(null);
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const loc = { lat: p.coords.latitude, lng: p.coords.longitude };
          setUserLoc(loc);
          setAddress("");
          handleSearch(loc.lat, loc.lng);
        },
        (err: GeolocationPositionError) => {
          if (err.code === 1) {
            setError("Location permission denied. Allow location in your browser, or enter an address.");
          } else if (err.code === 3) {
            setError("Location request timed out. Try again or enter an address.");
          } else {
            setError("Could not get location. Enter an address instead.");
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
      {/* Sidebar */}
      <div className="flex w-full flex-col border-r border-gray-200 bg-white lg:w-[420px]">
        <div className="border-b border-gray-200 p-4">
          <h1 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900">
            <Utensils className="h-5 w-5 text-brand-600" />
            Find Restaurants Near Me
          </h1>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Enter your address..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <Button onClick={() => handleSearch()} isLoading={loading} disabled={loading}>
              Search
            </Button>
          </div>
          <div className="mt-2">
            <button
              onClick={handleMyLocation}
              disabled={loading}
              className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
            >
              <Navigation className="h-3.5 w-3.5" />
              Use my current location
            </button>
            <p className="mt-0.5 text-xs text-gray-500">Allow location when your browser asks.</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
              <p className="text-sm text-gray-500">Searching restaurants nearby...</p>
            </div>
          )}

          {error && (
            <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          {!loading && searched && restaurants.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <MapPin className="mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">No restaurants found within 5 miles.</p>
              <p className="text-xs text-gray-400">Try a different address or a Santa Barbara location.</p>
            </div>
          )}

          {!loading && restaurants.length > 0 && (
            <>
              <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                <p className="text-xs font-medium text-gray-500">
                  {restaurants.length} restaurants within 5 miles of{" "}
                  <span className="text-gray-700">{locLabel}</span>
                </p>
              </div>

              <div className="divide-y divide-gray-100">
                {restaurants.map((rest, idx) => (
                  <div
                    key={idx}
                    id={`rest-${idx}`}
                    className={`cursor-pointer p-4 transition-colors ${selectedIdx === idx ? "bg-brand-50" : "hover:bg-gray-50"}`}
                    onClick={() => {
                      setSelectedIdx(idx);
                      const m = markersRef.current[idx + 1];
                      if (m && mapInstance.current) {
                        mapInstance.current.panTo({ lat: rest.lat, lng: rest.lng });
                        mapInstance.current.setZoom(15);
                        google.maps.event.trigger(m, "click");
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-gray-900">
                          {rest.restaurant_name}
                        </h3>
                        <p className="mt-0.5 truncate text-xs text-gray-500">{rest.address}</p>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                          {rest.rating > 0 && (
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {rest.rating}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {rest.distance_miles} mi
                          </span>
                          <span className="flex items-center gap-1 font-medium text-brand-600">
                            <Clock className="h-3 w-3" />
                            Closes {rest.closing_time}
                          </span>
                        </div>

                        {rest.hours_of_operation.length > 0 && (
                          <div className="mt-2 rounded-md bg-gray-50 px-3 py-2">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                              Hours of Operation
                            </p>
                            <div className="grid grid-cols-1 gap-0.5">
                              {rest.hours_of_operation.map((h, hi) => (
                                <p key={hi} className="text-[11px] text-gray-600">{h}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!loading && !searched && (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
              <div className="rounded-full bg-brand-50 p-4">
                <MapPin className="h-8 w-8 text-brand-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">
                Enter your address to find restaurants nearby
              </p>
              <p className="max-w-[260px] text-xs text-gray-400">
                We&apos;ll search for restaurants within a 5-mile radius and show their closing hours
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-1">
        <div ref={mapRef} className="h-full w-full" />
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-emerald-50">
            <div className="text-center">
              <MapPin className="mx-auto mb-2 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">Loading map...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}