import { geolocation } from "@vercel/functions";

export type RequestHints = {
  latitude?: string;
  longitude?: string;
  city?: string;
  country?: string;
};

function getGeolocationHeaders(headers: Headers): Headers {
  const geolocationHeaders = new Headers(headers);

  if (process.env.NODE_ENV === "development") {
    geolocationHeaders.set("x-vercel-ip-country", "IN");
    geolocationHeaders.set("x-vercel-ip-country-region", "HR");
    geolocationHeaders.set("x-vercel-ip-city", "Gurugram");
    geolocationHeaders.set("x-vercel-ip-latitude", "28.4595");
    geolocationHeaders.set("x-vercel-ip-longitude", "77.0266");
  }

  return geolocationHeaders;
}

export function getRequestHints(request: Request): RequestHints {
  const headers = getGeolocationHeaders(request.headers);
  const { latitude, longitude, city, country } = geolocation({ headers });

  return {
    latitude,
    longitude,
    city,
    country,
  };
}

export function getRequestPromptFromHints(requestHints: RequestHints): string {
  if (
    !requestHints.latitude &&
    !requestHints.longitude &&
    !requestHints.city &&
    !requestHints.country
  ) {
    return "";
  }

  return `About the origin of user's request:
- lat: ${requestHints.latitude ?? "unknown"}
- lon: ${requestHints.longitude ?? "unknown"}
- city: ${requestHints.city ?? "unknown"}
- country: ${requestHints.country ?? "unknown"}

When the user asks for location-based information (e.g. "near me", local restaurants, or weather), use this location in your searches and answers.`;
}
