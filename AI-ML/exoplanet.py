"""Exoplanet candidate classifier over Kepler light-curve flux readings.

This is a standalone experiment -- unlike train_star_model.py it is not wired
into the web app, because raw FLUX values are not something a site visitor can
reasonably supply.  It is kept as a runnable module rather than a script so it
can be imported and tested:

    python exoplanet.py                       # train and report accuracy
    python exoplanet.py 93.85 83.81 20.10 -26.98 -39.56

A word of warning about the numbers it prints: exoTest.csv is heavily
imbalanced (a handful of confirmed planets against hundreds of non-planets), so
a model that always answers "no planet" already scores very well.  Accuracy
alone is not evidence that this model works; the per-class report is.
"""

import sys
from pathlib import Path

import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split

DATASET = Path(__file__).parent / "exoTest.csv"
FLUX_COLUMNS = ["FLUX.1", "FLUX.2", "FLUX.3", "FLUX.4", "FLUX.5"]

# The dataset labels rows 2 (confirmed exoplanet) and 1 (no exoplanet).
LABELS = {1: "No exoplanet detected", 2: "Exoplanet candidate"}

_model = None


def train():
    """Fit the classifier and return it along with its hold-out scores."""
    data = pd.read_csv(DATASET, usecols=["LABEL"] + FLUX_COLUMNS)

    train_df, test_df = train_test_split(
        data, test_size=0.1, stratify=data["LABEL"], random_state=42
    )

    model = HistGradientBoostingClassifier(random_state=42)
    model.fit(train_df[FLUX_COLUMNS], train_df["LABEL"])

    predictions = model.predict(test_df[FLUX_COLUMNS])
    report = classification_report(
        test_df["LABEL"],
        predictions,
        target_names=[LABELS[1], LABELS[2]],
        zero_division=0,
    )
    return model, accuracy_score(test_df["LABEL"], predictions), report


def get_model():
    """Return the fitted model, training it on first use."""
    global _model
    if _model is None:
        _model, _, _ = train()
    return _model


def predict(flux_values):
    """Classify one light curve from its first five flux readings."""
    if len(flux_values) != len(FLUX_COLUMNS):
        raise ValueError(f"Expected {len(FLUX_COLUMNS)} flux values, got {len(flux_values)}")

    frame = pd.DataFrame([[float(v) for v in flux_values]], columns=FLUX_COLUMNS)
    label = int(get_model().predict(frame)[0])
    return {"label": label, "description": LABELS[label]}


if __name__ == "__main__":
    model, accuracy, report = train()
    _model = model
    print(f"Hold-out accuracy: {accuracy:.4f}\n")
    print(report)

    if len(sys.argv) > 1:
        print(predict(sys.argv[1:]))
