/**
 * reverseGeocode — look up a human-readable place name and bounding box
 * for a [lng, lat] coordinate using the Mapbox Geocoding API.
 */

export interface ReverseGeocodeResult {
  placeName: string;
  bbox: [number, number, number, number] | null; // [w, s, e, n]
}

/**
 * Fetch a place name + bbox for [lng, lat].
 * Returns null on error rather than throwing, so callers can degrade gracefully.
 */
export async function reverseGeocode(
  lng: number,
  lat: number,
  token: string,
): Promise<ReverseGeocodeResult | null> {
  try {
    const url = new URL(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`,
    );
    url.searchParams.set("access_token", token);
    url.searchParams.set("types", "place,locality,district");
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const data = (await res.json()) as {
      features?: Array<{
        place_name?: string;
        bbox?: [number, number, number, number];
      }>;
    };

    const feature = data.features?.[0];
    if (!feature) return null;

    return {
      placeName: feature.place_name ?? `${lat.toFixed(3)}, ${lng.toFixed(3)}`,
      bbox: feature.bbox ?? null,
    };
  } catch {
    return null;
  }
}
