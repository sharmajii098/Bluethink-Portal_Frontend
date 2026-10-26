type ReverseGeocodeResult = {
  display_name?: string;
};

const placeCache = new Map<string, Promise<string>>();
let requestQueue = Promise.resolve();
let lastRequestAt = 0;

export function getPlaceName(latitude: number, longitude: number): Promise<string> {
  const cacheKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  const cached = placeCache.get(cacheKey);
  if (cached) return cached;

  const lookup = requestQueue.then(async () => {
    const waitMs = Math.max(0, 1100 - (Date.now() - lastRequestAt));
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));

    lastRequestAt = Date.now();
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.search = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      format: "jsonv2",
      zoom: "18",
      addressdetails: "0",
      "accept-language": "en",
    }).toString();

    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`Place lookup failed with status ${response.status}.`);
    }

    const result = (await response.json()) as ReverseGeocodeResult;
    if (!result.display_name) {
      throw new Error("No place name was found for these coordinates.");
    }
    return result.display_name;
  });

  requestQueue = lookup.then(
    () => undefined,
    () => undefined,
  );
  placeCache.set(cacheKey, lookup);
  void lookup.catch(() => placeCache.delete(cacheKey));
  return lookup;
}
