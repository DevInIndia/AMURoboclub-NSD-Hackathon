# Model evaluation

Validation of the two quantitative models against real catalogue data.

```bash
node eval/exoplanet-eval.mjs        # 100 planets, NASA Exoplanet Archive
node eval/fetch-stars.mjs           # rebuild the star sample (SIMBAD + Gaia)
node eval/star-eval-corrected.mjs   # 100 stars, per-class sources
```

## Why `star-eval.mjs` and `star-eval-corrected.mjs` both exist

The first version scored 54% and the number was meaningless. It fed Gaia
GSP-Phot parameters to every class, but that pipeline fits main-sequence-like
models: it reported white dwarfs at ~1 solar radius and 11 solar luminosities
when the truth is ~0.01 and ~0.001. The classifier was being handed physically
impossible stars and blamed for the answer.

The corrected version draws each class from a source that actually models it —
the Gentile Fusillo white dwarf catalogue, published values for supergiants and
brown dwarfs, Gaia for main-sequence and M dwarfs where it is validated. Both
are kept because the difference between them is the point.

## Avoiding a circular test

Ground truth is the MK luminosity class from SIMBAD's spectral type, assigned
from spectral line ratios. A label derived from position on the HR diagram
would be read off the same temperature and luminosity the classifier itself
consumes, so the test would only measure whether the model reproduces our own
labelling rule.
