// @ts-nocheck
// Travel-time computation between tournament facilities.
// Uses Google Maps Distance Matrix API when a key is provided;
// falls back to InvokeLLM with web context (Gemini + Google Maps) otherwise.

export interface FacilityLocation {
  id: string;
  name: string;
  address: string;
}

export type TravelMatrix = Record<string, number>;

export function matrixKey(a: string, b: string): string {
  return a + "|" + b;
}

export async function buildTravelMatrix(
  facilities: FacilityLocation[],
  invokeLLM: (params: any) => Promise<any>,
  googleMapsApiKey?: string
): Promise<TravelMatrix> {
  const matrix: TravelMatrix = {};
  const unique: FacilityLocation[] = [];
  const seen = new Set<string>();
  for (const f of facilities) {
    if (f.address && !seen.has(f.address)) {
      seen.add(f.address);
      unique.push(f);
    }
  }

  // Same facility = 0
  for (const f of unique) {
    matrix[matrixKey(f.id, f.id)] = 0;
  }
  if (unique.length < 2) return matrix;

  // 1. Try Google Maps Distance Matrix API
  if (googleMapsApiKey) {
    try {
      const origins = unique.map(function (f) { return f.address; }).join("|");
      const url = "https://maps.googleapis.com/maps/api/distancematrix/json?origins=" +
        encodeURIComponent(origins) + "&destinations=" + encodeURIComponent(origins) +
        "&key=" + googleMapsApiKey + "&units=imperial";
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.status === "OK" && Array.isArray(data.rows)) {
        unique.forEach(function (fromFac, i) {
          unique.forEach(function (toFac, j) {
            const row = data.rows[i];
            const el = row && row.elements ? row.elements[j] : null;
            if (el && el.status === "OK" && el.duration) {
              matrix[matrixKey(fromFac.id, toFac.id)] = Math.ceil(el.duration.value / 60);
            }
          });
        });
      }
    } catch (e) {
      console.error("Google Maps Distance Matrix error:", e);
    }
  }

  // 2. Fill missing pairs via InvokeLLM with web context
  const missing: Array<{ from: FacilityLocation; to: FacilityLocation }> = [];
  unique.forEach(function (fromFac) {
    unique.forEach(function (toFac) {
      if (fromFac.id !== toFac.id && matrix[matrixKey(fromFac.id, toFac.id)] === undefined) {
        missing.push({ from: fromFac, to: toFac });
      }
    });
  });

  if (missing.length > 0) {
    try {
      const facilityList = unique.map(function (f) { return "- " + f.name + ": " + f.address; }).join("\n");
      const prompt = "I need estimated driving travel times in minutes between these sports facility locations. Use Google Maps directions data. Account for typical suburban traffic.\n\nFacilities:\n" + facilityList + "\n\nReturn a JSON object with a travel_times array. Each entry has from (facility name), to (facility name), and minutes (integer driving time). Include ALL ordered pairs (both directions). Same-location pairs are 0 minutes.";

      const result = await invokeLLM({
        prompt: prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            travel_times: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  from: { type: "string" },
                  to: { type: "string" },
                  minutes: { type: "number" },
                },
                required: ["from", "to", "minutes"],
              },
            },
          },
          required: ["travel_times"],
        },
      });

      const times = result && (result.travel_times || result);
      if (Array.isArray(times)) {
        for (const t of times) {
          const fromFac = unique.find(function (f) { return f.name === t.from; });
          const toFac = unique.find(function (f) { return f.name === t.to; });
          if (fromFac && toFac && typeof t.minutes === "number") {
            matrix[matrixKey(fromFac.id, toFac.id)] = Math.max(0, Math.ceil(t.minutes));
          }
        }
      }
    } catch (e) {
      console.error("InvokeLLM travel time fallback error:", e);
    }
  }

  // 3. Default 15 min for any remaining gaps
  unique.forEach(function (fromFac) {
    unique.forEach(function (toFac) {
      if (fromFac.id !== toFac.id && matrix[matrixKey(fromFac.id, toFac.id)] === undefined) {
        matrix[matrixKey(fromFac.id, toFac.id)] = 15;
      }
    });
  });

  return matrix;
}

export function getTravelTime(
  matrix: TravelMatrix,
  fromFacilityId: string,
  toFacilityId: string
): number {
  if (fromFacilityId === toFacilityId) return 0;
  return matrix[matrixKey(fromFacilityId, toFacilityId)] || 15;
}