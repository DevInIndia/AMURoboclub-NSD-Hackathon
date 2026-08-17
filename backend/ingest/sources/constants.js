/**
 * Canonical astronomical constants.
 *
 * Curated rather than scraped: these are the values a chatbot most often gets
 * subtly wrong, and they change on the timescale of IAU resolutions rather
 * than daily. Values follow IAU 2015 Resolution B3 nominal constants and
 * CODATA where relevant.
 *
 * Each entry is one retrievable passage, written as prose because that is what
 * gets embedded and what the model reads back.
 */
export const CONSTANTS = [
  {
    title: "Astronomical unit (au)",
    content:
      "The astronomical unit is defined exactly as 149,597,870,700 metres by IAU 2012 Resolution B2. " +
      "It is approximately the mean Earth-Sun distance, and since 2012 it is a defined conversion " +
      "constant rather than a measured quantity.",
  },
  {
    title: "Parsec and light-year",
    content:
      "One parsec is the distance at which one astronomical unit subtends one arcsecond: " +
      "3.0856775814913673 x 10^16 metres, about 3.26 light-years. One light-year is the distance " +
      "light travels in one Julian year, exactly 9,460,730,472,580,800 metres. Professional " +
      "astronomy uses parsecs; light-years appear mainly in public communication.",
  },
  {
    title: "Speed of light",
    content:
      "The speed of light in vacuum is exactly 299,792,458 metres per second. It is a defining " +
      "constant of the SI: since 1983 the metre is defined in terms of it, so it is not measured " +
      "and has no uncertainty.",
  },
  {
    title: "Nominal solar values",
    content:
      "IAU 2015 Resolution B3 sets nominal solar values: solar radius 6.957 x 10^8 metres, " +
      "solar luminosity 3.828 x 10^26 watts, solar effective temperature 5772 kelvin, and solar " +
      "mass parameter GM 1.3271244 x 10^20 cubic metres per second squared. The solar mass itself " +
      "is about 1.989 x 10^30 kilograms, known less precisely than GM because the gravitational " +
      "constant G is poorly measured.",
  },
  {
    title: "Nominal terrestrial values",
    content:
      "IAU nominal Earth values: equatorial radius 6.3781 x 10^6 metres, polar radius " +
      "6.3568 x 10^6 metres, and mass parameter GM 3.986004 x 10^14 cubic metres per second " +
      "squared. Earth's mass is about 5.972 x 10^24 kilograms. Earth's Bond albedo is roughly 0.3, " +
      "giving an equilibrium temperature near 255 kelvin against a mean surface temperature of " +
      "about 288 kelvin -- the 33 kelvin difference is the greenhouse effect.",
  },
  {
    title: "Age of the universe",
    content:
      "The Planck 2018 results give the age of the universe as 13.797 plus or minus 0.023 billion " +
      "years, assuming the standard Lambda-CDM cosmological model. Nothing observed in the universe " +
      "can be older than this, which makes it a useful sanity check on any claimed stellar age.",
  },
  {
    title: "Hubble constant and the Hubble tension",
    content:
      "The Hubble constant describes the present expansion rate of the universe. Two families of " +
      "measurement disagree: early-universe inference from the cosmic microwave background gives " +
      "about 67.4 kilometres per second per megaparsec (Planck 2018), while late-universe distance " +
      "ladder measurements using Cepheids and Type Ia supernovae give about 73 (SH0ES). The gap is " +
      "several standard deviations and is known as the Hubble tension. It remains unresolved, so " +
      "any single quoted value should be attributed to its method.",
  },
  {
    title: "Stellar spectral classification",
    content:
      "The Harvard spectral sequence runs O, B, A, F, G, K, M from hottest to coolest. Approximate " +
      "effective temperatures: O above 30,000 kelvin, B 10,000 to 30,000, A 7,500 to 10,000, " +
      "F 6,000 to 7,500, G 5,200 to 6,000, K 3,700 to 5,200, and M below 3,700. The Sun is a G2V " +
      "star. Classes L, T and Y extend the sequence to brown dwarfs.",
  },
  {
    title: "The Hertzsprung-Russell diagram",
    content:
      "The Hertzsprung-Russell diagram plots stellar luminosity against effective temperature, with " +
      "temperature increasing to the left by convention. Most stars lie on the main sequence running " +
      "from hot and luminous to cool and faint, where they fuse hydrogen in their cores. Red giants " +
      "and supergiants occupy the upper right: cool but very luminous, therefore very large. White " +
      "dwarfs sit in the lower left: hot but faint, therefore very small.",
  },
  {
    title: "Apparent and absolute magnitude",
    content:
      "Magnitude is a logarithmic brightness scale where smaller numbers are brighter and five " +
      "magnitudes correspond to a factor of exactly 100 in flux. Apparent magnitude describes how " +
      "bright an object looks from Earth; absolute magnitude is the apparent magnitude it would have " +
      "at 10 parsecs, so it measures intrinsic brightness. The Sun has apparent magnitude -26.74 and " +
      "absolute magnitude 4.83.",
  },
  {
    title: "The circumstellar habitable zone",
    content:
      "The habitable zone is the range of orbital distances where liquid water could persist on a " +
      "rocky planet's surface. Kopparapu et al. (2014) place the Sun's conservative zone between " +
      "0.95 and 1.68 astronomical units, bounded by the runaway greenhouse limit inside and the " +
      "maximum greenhouse limit outside. An optimistic zone spanning 0.75 to 1.77 au uses the recent " +
      "Venus and early Mars empirical limits. Being inside the zone is necessary but far from " +
      "sufficient for habitability: Venus lies just inside it.",
  },
  {
    title: "Lunar distance",
    content:
      "The mean Earth-Moon distance is about 384,400 kilometres, commonly used as the lunar distance " +
      "unit (LD) when describing asteroid close approaches. An object passing at 30 LD is roughly " +
      "11.5 million kilometres away -- far outside the Moon's orbit.",
  },
];

export function loadConstants() {
  return CONSTANTS.map((entry) => ({
    source: "iau-constants",
    title: entry.title,
    url: "https://www.iau.org/publications/proceedings_rules/units/",
    content: entry.content,
  }));
}
