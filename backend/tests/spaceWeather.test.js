import { describe, it, expect } from "vitest";
import { geomagneticStorm, __testing as swTesting } from "../services/spaceWeather.js";
import { kineticEnergyMegatons, __testing as neoTesting } from "../services/nearEarthObjects.js";

describe("geomagnetic storm scale", () => {
  // NOAA's published G-scale. These are lookup boundaries, not estimates, so
  // every threshold is pinned.
  it.each([
    [0, "G0"],
    [4.9, "G0"],
    [5, "G1"],
    [5.9, "G1"],
    [6, "G2"],
    [7, "G3"],
    [8, "G4"],
    [9, "G5"],
    [9.5, "G5"],
  ])("maps Kp %s to %s", (kp, level) => {
    expect(geomagneticStorm(kp).level).toBe(level);
  });

  it("increases severity monotonically with Kp", () => {
    const severities = [0, 5, 6, 7, 8, 9].map((kp) => geomagneticStorm(kp).severity);
    expect(severities).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("labels quiet conditions rather than leaving them blank", () => {
    expect(geomagneticStorm(2).label).toBe("Quiet");
  });
});

describe("aurora outlook", () => {
  it("gets more optimistic as Kp rises", () => {
    expect(swTesting.auroraOutlook(1)).toMatch(/unlikely/i);
    expect(swTesting.auroraOutlook(5)).toMatch(/high latitude/i);
    expect(swTesting.auroraOutlook(8)).toMatch(/mid-latitude/i);
  });
});

describe("NOAA alert summarising", () => {
  const message =
    "Space Weather Message Code: WARK04\r\nSerial Number: 5401\r\n" +
    "Issue Time: 2026 Aug 14 1054 UTC\r\n\r\n" +
    "WARNING: Geomagnetic K-index of 4 expected \nValid From: 2026 Aug 14 1052 UTC";

  it("extracts the headline rather than dumping the whole message", () => {
    const summary = swTesting.summariseAlert(message);
    expect(summary).toMatch(/^WARNING: Geomagnetic K-index of 4 expected/);
    expect(summary).not.toMatch(/Serial Number/);
  });

  it("falls back to the first line when no headline is present", () => {
    expect(swTesting.summariseAlert("Just one line here")).toBe("Just one line here");
  });

  it("caps the length so a malformed feed cannot flood the response", () => {
    expect(swTesting.summariseAlert("x".repeat(500)).length).toBeLessThanOrEqual(200);
  });

  it("survives an empty message", () => {
    expect(swTesting.summariseAlert("")).toBe("");
  });
});

describe("kinetic energy", () => {
  it("scales with the cube of diameter", () => {
    const small = kineticEnergyMegatons({ diameterMetres: 100, velocityKmPerSecond: 20 });
    const big = kineticEnergyMegatons({ diameterMetres: 200, velocityKmPerSecond: 20 });
    expect(big / small).toBeCloseTo(8, 6);
  });

  it("scales with the square of velocity", () => {
    const slow = kineticEnergyMegatons({ diameterMetres: 100, velocityKmPerSecond: 10 });
    const fast = kineticEnergyMegatons({ diameterMetres: 100, velocityKmPerSecond: 20 });
    expect(fast / slow).toBeCloseTo(4, 6);
  });

  // Chelyabinsk (2013): ~19 m across, ~19 km/s, released roughly 0.4-0.5 Mt.
  // A rough check that the formula lands in the right order of magnitude.
  it("puts a Chelyabinsk-sized object in the right ballpark", () => {
    const energy = kineticEnergyMegatons({ diameterMetres: 19, velocityKmPerSecond: 19 });
    expect(energy).toBeGreaterThan(0.1);
    expect(energy).toBeLessThan(10);
  });

  it("returns zero for a zero-diameter object", () => {
    expect(kineticEnergyMegatons({ diameterMetres: 0, velocityKmPerSecond: 20 })).toBe(0);
  });
});

describe("near-earth object normalisation", () => {
  const raw = {
    id: "1234",
    name: "417874 (2007 NC5)",
    absolute_magnitude_h: 18.12,
    is_potentially_hazardous_asteroid: false,
    nasa_jpl_url: "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=1234",
    estimated_diameter: {
      meters: { estimated_diameter_min: 631.8, estimated_diameter_max: 1412.7 },
    },
    close_approach_data: [
      {
        close_approach_date: "2026-08-16",
        close_approach_date_full: "2026-Aug-16 05:02",
        relative_velocity: { kilometers_per_second: "40.0089234121" },
        miss_distance: { kilometers: "47600000", lunar: "123.8159769611" },
      },
    ],
  };

  it("flattens the payload to the fields the UI needs", () => {
    const neo = neoTesting.normalise(raw);
    expect(neo).toMatchObject({
      id: "1234",
      name: "417874 (2007 NC5)",
      absoluteMagnitudeH: 18.12,
      isPotentiallyHazardous: false,
      approachDate: "2026-Aug-16 05:02",
    });
  });

  it("coerces NASA's numeric strings to numbers", () => {
    const neo = neoTesting.normalise(raw);
    expect(typeof neo.velocityKmPerSecond).toBe("number");
    expect(neo.velocityKmPerSecond).toBeCloseTo(40.009, 2);
    expect(typeof neo.missDistanceLunar).toBe("number");
  });

  it("computes kinetic energy from the average diameter", () => {
    const neo = neoTesting.normalise(raw);
    expect(neo.kineticEnergyMegatons).toBeGreaterThan(0);
  });

  it("falls back to the plain date when the full timestamp is absent", () => {
    const neo = neoTesting.normalise({
      ...raw,
      close_approach_data: [
        { ...raw.close_approach_data[0], close_approach_date_full: null },
      ],
    });
    expect(neo.approachDate).toBe("2026-08-16");
  });
});
