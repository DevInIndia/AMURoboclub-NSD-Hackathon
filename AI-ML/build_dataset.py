"""Build an extended star training set from the original data plus real catalogue stars.

The evaluation exposed three defects in the original 240-row dataset, all in the
data rather than the algorithm:

  1. No giant or subgiant class, so roughly a third of catalogued stars had no
     correct answer available. All 60 tested were forced to "Main Sequence".
  2. A gap between the red dwarf and main sequence classes: red dwarfs topped
     out at 0.039 solar luminosities, main sequence began at 0.085. Real M
     dwarfs reach 0.08 and fell into the gap, scoring 0% recall.
  3. Main sequence examples averaged 32,000 solar luminosities -- those are
     evolved or very massive stars, not what "main sequence" describes.

This script adds real stars from Gaia DR3 with spectroscopic labels from
SIMBAD, keeping the original rows for the classes Gaia cannot measure
(supergiants, hypergiants, brown dwarfs -- its pipeline does not model them).

    python build_dataset.py     # writes stars_extended.csv
"""

import json
import math
from pathlib import Path

import pandas as pd

HERE = Path(__file__).parent
ORIGINAL = HERE / "stars.csv"
GAIA_JSON = HERE.parent / "eval" / "data" / "stars-raw.json"
OUTPUT = HERE / "stars_extended.csv"
TRAINING_IDS = HERE / "training_star_names.json"

SUN_TEFF = 5772

# Original numeric labels, extended with the two missing classes.
TYPE_IDS = {
    "Brown Dwarf": 0,
    "Red Dwarf": 1,
    "White Dwarf": 2,
    "Main Sequence": 3,
    "Supergiant": 4,
    "Hypergiant": 5,
    "Giant": 6,
    "Subgiant": 7,
}

# Radius windows used only to discard pipeline failures, not to define classes.
# Gaia's GSP-Phot reports a default near 1.0 solar radii when its fit does not
# converge, which is how 57% of the M dwarfs ended up "Sun-sized".
PLAUSIBLE_RADIUS = {
    "Main Sequence": (0.4, 4.0),
    "Red Dwarf": (0.08, 0.7),
    "Giant": (4.0, 80.0),
    "Subgiant": (1.3, 6.0),
}

# How many real stars to add per class. Capped so the added data informs the
# boundaries without swamping the classes that still come from the original set.
QUOTAS = {"Giant": 120, "Subgiant": 120, "Main Sequence": 110, "Red Dwarf": 55}


def colour_from_temperature(teff):
    """Colour name in the vocabulary the original dataset uses."""
    if teff >= 30000:
        return "Blue"
    if teff >= 10000:
        return "Blue-White"
    if teff >= 7500:
        return "White"
    if teff >= 6000:
        return "Yellowish White"
    if teff >= 5200:
        return "Yellowish"
    if teff >= 4400:
        return "Pale Yellow Orange"
    if teff >= 3700:
        return "Orange"
    if teff >= 3000:
        return "Orange-Red"
    return "Red"


def load_real_stars():
    """Real stars with Gaia parameters and SIMBAD luminosity classes."""
    if not GAIA_JSON.exists():
        raise SystemExit(
            f"{GAIA_JSON} not found. Run `node eval/fetch-stars.mjs` first."
        )

    raw = json.loads(GAIA_JSON.read_text(encoding="utf-8"))
    rows = []

    for star in raw:
        # SIMBAD labels carry an "(unmapped)" suffix from the evaluation, where
        # these classes had no model equivalent. They do now.
        truth = star["truth"].replace(" (unmapped)", "")
        if truth not in QUOTAS:
            continue

        teff = star.get("teff")
        radius = star.get("radiusFlame") or star.get("radiusGspphot")
        abs_mag = star.get("absMagG")
        if not teff or not radius or abs_mag is None:
            continue

        low, high = PLAUSIBLE_RADIUS[truth]
        if not low <= radius <= high:
            continue

        letter = star["spType"].strip()[0].upper()
        if letter not in "OBAFGKM":
            continue

        rows.append(
            {
                # Luminosity from Stefan-Boltzmann on two catalogued values.
                # Checked against Gaia's own lum_flame: 0.45% median difference.
                "Temperature": round(teff),
                "L": radius**2 * (teff / SUN_TEFF) ** 4,
                "R": radius,
                # Gaia's absolute G magnitude stands in for absolute visual
                # magnitude. Both are broad optical bands and differ by a few
                # tenths for most stars, far closer than a bolometric value
                # would be.
                "A_M": abs_mag,
                "Color": colour_from_temperature(teff),
                "Spectral_Class": letter,
                "Type": TYPE_IDS[truth],
                "_label": truth,
                "_name": star["name"],
            }
        )

    return pd.DataFrame(rows)


def main():
    original = pd.read_csv(ORIGINAL)
    original["_label"] = original["Type"].map({v: k for k, v in TYPE_IDS.items()})
    print(f"Original dataset: {len(original)} rows, {original.Type.nunique()} classes")

    real = load_real_stars()
    print(f"Real candidates:  {len(real)} rows")

    # Sample per class, preferring a spread in luminosity over the brightest or
    # nearest stars, which would otherwise dominate.
    selected = []
    for label, quota in QUOTAS.items():
        group = real[real._label == label]
        if group.empty:
            print(f"  {label:<15} none available")
            continue
        if len(group) > quota:
            # Sort by luminosity and take an even stride, so the whole range of
            # the class is represented rather than one end of it.
            group = group.sort_values("L")
            step = len(group) / quota
            group = group.iloc[[int(i * step) for i in range(quota)]]
        selected.append(group)
        print(f"  {label:<15} added {len(group):>4}   "
              f"L {group.L.min():.3g} to {group.L.max():.3g}")

    combined = pd.concat([original] + selected, ignore_index=True)

    # Record which real stars went into training so the evaluation can exclude
    # them. Without this the eval would be scoring the model on its own
    # training data and reporting a number that means nothing.
    used = sorted({n for g in selected for n in g["_name"].dropna()})
    TRAINING_IDS.write_text(json.dumps(used, indent=1), encoding="utf-8")
    print(f"\nRecorded {len(used)} training star names -> {TRAINING_IDS.name}")

    combined = combined.drop(columns=["_label", "_name"], errors="ignore")
    combined.to_csv(OUTPUT, index=False)

    print(f"\nWrote {OUTPUT.name}: {len(combined)} rows")
    names = {v: k for k, v in TYPE_IDS.items()}
    print("\n  class            n    L range")
    for t, g in combined.groupby("Type"):
        print(f"  {names[t]:<15} {len(g):>3}  {g.L.min():.2e} to {g.L.max():.2e}")


if __name__ == "__main__":
    main()
