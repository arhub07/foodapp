let initPromise: Promise<{
  Map: typeof google.maps.Map;
  AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement;
}> | null = null;

export function initGoogleMaps() {
  if (typeof window === "undefined" || !window.google?.maps) {
    return Promise.reject(
      new Error("Google Maps bootstrap script has not loaded yet")
    );
  }

  if (initPromise) return initPromise;

  initPromise = (async () => {
    await google.maps.importLibrary("core");
    const { Map } = (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;
    const { AdvancedMarkerElement } = (await google.maps.importLibrary("marker")) as google.maps.MarkerLibrary;
    return { Map, AdvancedMarkerElement };
  })();

  return initPromise;
}
