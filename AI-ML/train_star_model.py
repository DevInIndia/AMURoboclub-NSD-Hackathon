"""Train the star-type classifier and export it for the Node backend.

The Advanced Search feature asks a user for six physical properties of a star
and answers with its type.  That prediction comes from this script: it trains a
decision tree on stars.csv and writes the fitted tree to
backend/models/star_model.json, which the Express server loads at startup.

Run it whenever stars.csv changes:

    python train_star_model.py            # train and export
    python train_star_model.py --compare  # also score the alternatives

Nothing else in the project needs Python at runtime -- the exported JSON is the
only artefact the backend consumes.
"""

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split

HERE = Path(__file__).parent
DATASET = HERE / "stars.csv"
OUTPUT = HERE.parent / "backend" / "models" / "star_model.json"

# The dataset spells the same colour a dozen ways ("Blue white", "Blue-White",
# "white", "Whitish"...).  Fold them onto canonical names first, then encode
# those names in order of increasing surface temperature so the tree splits on
# something physically meaningful rather than on arbitrary label numbers.
COLOR_ALIASES = {
    "red": "Red",
    "orange-red": "Orange-Red",
    "orange": "Orange",
    "pale yellow orange": "Pale Yellow Orange",
    "yellowish": "Yellowish",
    "yellow-white": "Yellowish White",
    "white-yellow": "Yellowish White",
    "yellowish white": "Yellowish White",
    "white": "White",
    "whitish": "White",
    "blue white": "Blue-White",
    "blue-white": "Blue-White",
    "blue": "Blue",
}

COLOR_ENCODING = {
    "Red": 0,
    "Orange-Red": 1,
    "Orange": 2,
    "Pale Yellow Orange": 3,
    "Yellowish": 4,
    "Yellowish White": 5,
    "White": 6,
    "Blue-White": 7,
    "Blue": 8,
}

# Harvard spectral sequence, coolest to hottest.
SPECTRAL_ENCODING = {"M": 0, "K": 1, "G": 2, "F": 3, "A": 4, "B": 5, "O": 6}

CLASSES = [
    {
        "id": 0,
        "label": "Brown Dwarf",
        "description": "A substellar object too light to sustain hydrogen fusion in its core.",
    },
    {
        "id": 1,
        "label": "Red Dwarf",
        "description": "A small, cool, very long-lived main-sequence star -- the most common type in the galaxy.",
    },
    {
        "id": 2,
        "label": "White Dwarf",
        "description": "The dense, Earth-sized remnant left behind when a Sun-like star exhausts its fuel.",
    },
    {
        "id": 3,
        "label": "Main Sequence",
        "description": "A star fusing hydrogen in its core, like our own Sun.",
    },
    {
        "id": 4,
        "label": "Supergiant",
        "description": "A massive, extremely luminous evolved star, hundreds of times the Sun's radius.",
    },
    {
        "id": 5,
        "label": "Hypergiant",
        "description": "The rarest and most luminous stars known, shedding mass at enormous rates.",
    },
]

FEATURES = [
    {"name": "Temperature", "label": "Surface temperature", "unit": "K"},
    {"name": "L", "label": "Luminosity", "unit": "L_sun"},
    {"name": "R", "label": "Radius", "unit": "R_sun"},
    {"name": "A_M", "label": "Absolute magnitude", "unit": "Mv"},
    {"name": "Color", "label": "Colour", "unit": "category"},
    {"name": "Spectral_Class", "label": "Spectral class", "unit": "category"},
]

FEATURE_NAMES = [f["name"] for f in FEATURES]


def normalize_color(value):
    """Map a raw dataset colour onto its canonical name."""
    key = " ".join(str(value).strip().lower().split())
    if key not in COLOR_ALIASES:
        raise ValueError(f"Unrecognised colour in dataset: {value!r}")
    return COLOR_ALIASES[key]


def load_dataset():
    data = pd.read_csv(DATASET)
    data["Color"] = data["Color"].map(normalize_color).map(COLOR_ENCODING)
    data["Spectral_Class"] = data["Spectral_Class"].str.strip().map(SPECTRAL_ENCODING)
    if data[FEATURE_NAMES].isnull().any().any():
        raise ValueError("Dataset contains values that could not be encoded")
    return data


def export_tree(estimator):
    """Flatten one fitted sklearn tree into plain arrays the backend can walk.

    Leaves are marked with feature_index -1; every other node sends samples
    left when `value <= threshold`, matching sklearn's own convention.
    """
    inner = estimator.tree_
    proba = inner.value.reshape(inner.node_count, -1)
    proba = proba / proba.sum(axis=1, keepdims=True)

    return {
        "node_count": int(inner.node_count),
        "feature_index": [
            int(f) if inner.children_left[i] != -1 else -1
            for i, f in enumerate(inner.feature)
        ],
        "threshold": [
            float(t) if inner.children_left[i] != -1 else 0.0
            for i, t in enumerate(inner.threshold)
        ],
        "left": [int(v) for v in inner.children_left],
        "right": [int(v) for v in inner.children_right],
        "proba": [[round(float(p), 6) for p in row] for row in proba],
    }


def compare_models(inputs, targets, folds):
    """Score a few candidate classifiers so the choice of tree is evidence-based."""
    from sklearn.ensemble import HistGradientBoostingClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.neighbors import KNeighborsClassifier
    from sklearn.tree import DecisionTreeClassifier
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    candidates = {
        # Distance- and gradient-based models need the wildly different feature
        # scales (temperature in thousands, luminosity in millionths) normalised.
        "LogisticRegression": make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000)),
        "KNeighbors": make_pipeline(StandardScaler(), KNeighborsClassifier()),
        "DecisionTree(depth=6)": DecisionTreeClassifier(max_depth=6, random_state=42),
        "RandomForest(60, depth=6)": RandomForestClassifier(
            n_estimators=60, max_depth=6, random_state=42
        ),
        "HistGradientBoosting": HistGradientBoostingClassifier(random_state=42),
    }

    print("\n5-fold cross-validated accuracy")
    for name, candidate in candidates.items():
        scores = cross_val_score(candidate, inputs, targets, cv=folds)
        print(f"  {name:<24} {scores.mean():.4f} (+/- {scores.std():.4f})")
    print()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--compare",
        action="store_true",
        help="score alternative classifiers before exporting",
    )
    args = parser.parse_args()

    data = load_dataset()
    inputs = data[FEATURE_NAMES]
    targets = data["Type"]

    # A single tree scores just as well here, but its leaves are pure, so every
    # prediction comes back at exactly 100% confidence.  A small forest votes
    # instead, which gives the UI a confidence figure that means something on
    # borderline stars, and still exports to a few hundred kilobytes of JSON.
    # Report cross-validated accuracy, never the training-set number.
    model = RandomForestClassifier(
        n_estimators=60, max_depth=6, random_state=42, n_jobs=-1
    )

    folds = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    if args.compare:
        compare_models(inputs, targets, folds)

    cv_scores = cross_val_score(model, inputs, targets, cv=folds)

    train_x, test_x, train_y, test_y = train_test_split(
        inputs, targets, test_size=0.2, stratify=targets, random_state=42
    )
    holdout_accuracy = model.fit(train_x, train_y).score(test_x, test_y)

    # Ship a model fitted on every row we have.
    model.fit(inputs, targets)

    print(f"5-fold CV accuracy : {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")
    print(f"Hold-out accuracy  : {holdout_accuracy:.4f}")

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source_dataset": DATASET.name,
        "sample_count": int(len(data)),
        "algorithm": (
            f"RandomForestClassifier(n_estimators={model.n_estimators}, "
            f"max_depth={model.max_depth})"
        ),
        "metrics": {
            "cv_accuracy_mean": round(float(cv_scores.mean()), 4),
            "cv_accuracy_std": round(float(cv_scores.std()), 4),
            "holdout_accuracy": round(float(holdout_accuracy), 4),
        },
        "features": [
            {
                **feature,
                "min": float(inputs[feature["name"]].min()),
                "max": float(inputs[feature["name"]].max()),
            }
            for feature in FEATURES
        ],
        "color_encoding": COLOR_ENCODING,
        "color_aliases": COLOR_ALIASES,
        "spectral_encoding": SPECTRAL_ENCODING,
        "classes": CLASSES,
        # The catalogue the model learnt from, kept as plottable points so the
        # UI can show a Hertzsprung-Russell diagram of the same data the
        # classifier was trained on. Rounded to keep the payload small; the
        # diagram cannot resolve more precision than this anyway.
        "reference_stars": [
            {
                "t": int(row.Temperature),
                "l": float(f"{row.L:.4g}"),
                "type": int(row.Type),
            }
            for row in data.itertuples()
        ],
        # The backend averages the per-class probabilities of every tree.
        "trees": [export_tree(estimator) for estimator in model.estimators_],
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Exported model -> {OUTPUT}")


if __name__ == "__main__":
    main()
