"""
Train Omni AI ML models on synthetic data.

Outputs:
- trained_models/risk_predictor.pkl
- trained_models/recommendation_content_based.pkl
- trained_models/anomaly_detector.pkl
- trained_models/training_manifest.json
"""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import joblib #sauvegarde et chargement du modeles 
    import numpy as np #calcul numerique et generer le nmbr aleatoire
    import pandas as pd #mnipulation des dataset fake 
    from faker import Faker #generer de dataset fake (synthetique)
    from sklearn.ensemble import IsolationForest #detection des anomalies 
    from sklearn.linear_model import LogisticRegression #prediction du risque 
    from sklearn.metrics import accuracy_score, classification_report, roc_auc_score
    from sklearn.model_selection import train_test_split
    from sklearn.neighbors import NearestNeighbors #trouver les recommendation les plus proches 
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler, LabelEncoder #normalisation des données 
    from sklearn.feature_extraction.text import TfidfVectorizer #transfert le texte en numerique et recommendation intelligente 
except ModuleNotFoundError as exc:
    missing_name = exc.name or "a required package"
    raise SystemExit(
        f"Missing Python dependency: {missing_name}. "
        "Install ML dependencies first with: python -m pip install -r requirements.txt"
    ) from exc


MODEL_VERSION = "2.0-trained"
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "trained_models"

FEATURE_NAMES = [
    "avg_daily_tasks",
    "avg_daily_active_minutes",
    "performance_score",
    "missed_deadline_ratio",
    "task_consistency",
    "engagement_rate",
    "active_days_count",
    "overdue_count_30d",
    "completion_rate",
    "task_trend_7d",
]

ROLES = ["employee", "stagiaire", "comptable"]


@dataclass
class TrainingSummary:
    generated_at: str
    model_version: str
    synthetic_users: int
    feature_names: list[str]
    risk_accuracy: float
    risk_roc_auc: float
    anomaly_contamination: float
    output_files: dict[str, str]


def bounded_normal(rng: np.random.Generator, mean: float, std: float, low: float, high: float) -> float:
    return float(np.clip(rng.normal(mean, std), low, high))


def build_user_features(fake: Faker, rng: np.random.Generator, user_id: int) -> dict[str, Any]:
    role = rng.choice(ROLES, p=[0.45, 0.35, 0.20])

    if role == "employee":
        avg_tasks = bounded_normal(rng, 4.2, 1.8, 0, 10)
        active_minutes = bounded_normal(rng, 210, 85, 0, 540)
    elif role == "stagiaire":
        avg_tasks = bounded_normal(rng, 3.4, 1.6, 0, 9)
        active_minutes = bounded_normal(rng, 175, 80, 0, 480)
    else:
        avg_tasks = bounded_normal(rng, 3.8, 1.4, 0, 8)
        active_minutes = bounded_normal(rng, 195, 75, 0, 480)

    active_days = int(np.clip(rng.normal(23, 6), 1, 30))
    absence_count = int(np.clip(rng.poisson(2), 0, 15))
    late_count = int(np.clip(rng.poisson(3), 0, 20))
    engagement = bounded_normal(rng, 1.6, 0.75, 0, 5)
    consistency = bounded_normal(rng, 3.8, 2.5, 0, 18)
    completion_rate = float(np.clip(rng.beta(6, 2), 0, 1))
    missed_ratio = float(np.clip(rng.beta(1.4, 8), 0, 1))
    overdue_count = int(np.round(missed_ratio * max(1, avg_tasks * active_days)))
    task_trend = bounded_normal(rng, 0.02, 0.33, -1, 1)
    performance_score = float(
        np.clip(
            (avg_tasks * 9)
            + (active_minutes / 9)
            + (completion_rate * 25)
            - (missed_ratio * 35)
            - (consistency * 1.2),
            0,
            100,
        )
    )

    # Inject realistic edge cases so the anomaly model learns abnormal zones.
    anomaly_seed = rng.random()
    if anomaly_seed < 0.045:
        avg_tasks = bounded_normal(rng, 0.2, 0.2, 0, 1)
        active_minutes = bounded_normal(rng, 8, 8, 0, 30)
        engagement = bounded_normal(rng, 0.12, 0.12, 0, 0.5)
        performance_score = bounded_normal(rng, 12, 8, 0, 30)
        missed_ratio = bounded_normal(rng, 0.65, 0.16, 0.45, 1)
        completion_rate = bounded_normal(rng, 0.15, 0.1, 0, 0.35)
        task_trend = bounded_normal(rng, -0.75, 0.2, -1, -0.3)
    elif anomaly_seed < 0.075:
        avg_tasks = bounded_normal(rng, 9.2, 1.1, 7, 14)
        active_minutes = bounded_normal(rng, 520, 70, 420, 720)
        consistency = bounded_normal(rng, 14, 3, 10, 22)

    risk_score = (
        (1 - min(1, avg_tasks / 5)) * 0.22
        + min(1, missed_ratio * 2) * 0.28
        + min(1, consistency / 10) * 0.14
        + (1 - min(1, engagement / 2)) * 0.16
        + (1 - min(1, performance_score / 100)) * 0.20
    )
    risk_probability = float(np.clip(risk_score + rng.normal(0, 0.06), 0, 1))
    high_risk = int(risk_probability >= 0.55)

    return {
        "user_id": f"user_{user_id:05d}",
        "name": fake.name(),
        "email": fake.unique.email(),
        "role": role,
        "avg_daily_tasks": avg_tasks,
        "avg_daily_active_minutes": active_minutes,
        "performance_score": performance_score,
        "missed_deadline_ratio": missed_ratio,
        "task_consistency": consistency,
        "engagement_rate": engagement,
        "active_days_count": float(active_days),
        "overdue_count_30d": float(overdue_count),
        "completion_rate": completion_rate,
        "task_trend_7d": task_trend,
        "risk_probability": risk_probability,
        "high_risk": high_risk,
        "profile_text": build_profile_text(role, avg_tasks, missed_ratio, performance_score, engagement, task_trend),
        "absence_count": absence_count,
        "late_count": late_count,
    }


def build_profile_text(
    role: str,
    avg_tasks: float,
    missed_ratio: float,
    performance_score: float,
    engagement: float,
    task_trend: float,
) -> str:
    activity = "low activity" if avg_tasks < 2 else "steady activity" if avg_tasks < 6 else "high activity"
    deadlines = "deadline risk" if missed_ratio > 0.25 else "healthy deadlines"
    performance = "low performance" if performance_score < 45 else "strong performance" if performance_score > 75 else "average performance"
    engagement_text = "low engagement" if engagement < 1 else "regular engagement"
    trend = "declining trend" if task_trend < -0.25 else "improving trend" if task_trend > 0.25 else "stable trend"
    return f"{role} {activity} {deadlines} {performance} {engagement_text} {trend}"


# yassn3 dataset fake 
def generate_dataset(size: int, seed: int) -> pd.DataFrame:
    fake = Faker()
    Faker.seed(seed)
    rng = np.random.default_rng(seed)
    rows = [build_user_features(fake, rng, index) for index in range(size)]
    return pd.DataFrame(rows)


def train_risk_predictor(df: pd.DataFrame) -> tuple[dict[str, Any], dict[str, float]]:
    x = df[FEATURE_NAMES]
    y = df["high_risk"]
    x_train, x_test, y_train, y_test = train_test_split( #test Split / train 
        x,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    pipeline = Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            ("classifier", LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42)),
        ],
    )
    pipeline.fit(x_train, y_train)

    predictions = pipeline.predict(x_test)
    probabilities = pipeline.predict_proba(x_test)[:, 1]
    metrics = {
        "accuracy": float(accuracy_score(y_test, predictions)),
        "roc_auc": float(roc_auc_score(y_test, probabilities)),
    }

    artifact = {
        "model_version": MODEL_VERSION,
        "model_type": "LogisticRegression",
        "feature_names": FEATURE_NAMES,
        "pipeline": pipeline,
        "target": "high_risk",
        "threshold": 0.55,
        "metrics": {
            **metrics,
            "classification_report": classification_report(y_test, predictions, output_dict=True),
        },
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }
    return artifact, metrics


def recommendation_catalog() -> list[dict[str, str]]:
    return [
        {
            "id": "daily_goal",
            "category": "productivity",
            "priority": "high",
            "title": "Set a daily task goal",
            "text": "low activity low engagement employee stagiaire set daily goal complete small tasks",
        },
        {
            "id": "deadline_planning",
            "category": "time_management",
            "priority": "high",
            "title": "Plan deadlines earlier",
            "text": "deadline risk missed deadlines overdue tasks planning schedule reminders",
        },
        {
            "id": "focus_session",
            "category": "focus",
            "priority": "medium",
            "title": "Use focused work sessions",
            "text": "average performance stable trend focus pomodoro deep work active minutes",
        },
        {
            "id": "revision_plan",
            "category": "learning",
            "priority": "medium",
            "title": "Create a revision plan",
            "text": "stagiaire exam revision study planner learning schedule improving trend",
        },
        {
            "id": "maintain_routine",
            "category": "consistency",
            "priority": "low",
            "title": "Maintain your routine",
            "text": "strong performance healthy deadlines regular engagement stable trend maintain routine",
        },
        {
            "id": "manager_checkin",
            "category": "support",
            "priority": "high",
            "title": "Request a support check-in",
            "text": "declining trend low performance low engagement deadline risk support check in",
        },
    ]


def train_content_recommender(df: pd.DataFrame) -> dict[str, Any]:
    catalog = recommendation_catalog()
    corpus = [item["text"] for item in catalog]
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1)
    item_matrix = vectorizer.fit_transform(corpus)
    nearest_neighbors = NearestNeighbors(metric="cosine", algorithm="brute")
    nearest_neighbors.fit(item_matrix)

    user_profiles = df[["user_id", "role", "profile_text", *FEATURE_NAMES]].to_dict(orient="records")
    return {
        "model_version": MODEL_VERSION,
        "model_type": "ContentBased-TFIDF-NearestNeighbors",
        "vectorizer": vectorizer,
        "nearest_neighbors": nearest_neighbors,
        "catalog": catalog,
        "item_matrix": item_matrix,
        "sample_user_profiles": user_profiles[:500],
        "feature_names": FEATURE_NAMES,
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }

#250 arbres de decision pour isoler les anomalies
def train_anomaly_detector(df: pd.DataFrame, contamination: float) -> dict[str, Any]:
    pipeline = Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            (
                "detector",
                IsolationForest(
                    n_estimators=250, #parametre de dataset 
                    contamination=contamination,
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ],
    )
    pipeline.fit(df[FEATURE_NAMES])

    scores = pipeline.decision_function(df[FEATURE_NAMES])
    predictions = pipeline.predict(df[FEATURE_NAMES])
    anomaly_rate = float((predictions == -1).mean())

    return {
        "model_version": MODEL_VERSION,
        "model_type": "IsolationForest",
        "feature_names": FEATURE_NAMES,
        "pipeline": pipeline,
        "contamination": contamination,
        "training_anomaly_rate": anomaly_rate,
        "score_quantiles": {
            "p01": float(np.quantile(scores, 0.01)),
            "p05": float(np.quantile(scores, 0.05)),
            "p50": float(np.quantile(scores, 0.50)),
            "p95": float(np.quantile(scores, 0.95)),
        },
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }


def save_artifact(output_dir: Path, filename: str, payload: dict[str, Any]) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / filename
    joblib.dump(payload, path)  #yrod el object python en .pkl
    return path


def write_manifest(output_dir: Path, summary: TrainingSummary) -> Path:
    path = output_dir / "training_manifest.json"
    path.write_text(json.dumps(asdict(summary), indent=2), encoding="utf-8")
    return path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train Omni AI ML models with synthetic Faker data.")
    parser.add_argument("--size", type=int, default=3000, help="Number of synthetic users to generate.")
    parser.add_argument("--seed", type=int, default=42, help="Random seed.")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR, help="Directory for .pkl files.")
    parser.add_argument("--contamination", type=float, default=0.08, help="IsolationForest contamination rate.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.size < 500:
        raise ValueError("--size must be at least 500 for stable train/test splits.")

    df = generate_dataset(args.size, args.seed)
    df.fillna(0, inplace=True)
    df.dropna(inplace=True)
    role_encoder = LabelEncoder()
    df["role_encoded"] = role_encoder.fit_transform(df["role"])
    risk_artifact, risk_metrics = train_risk_predictor(df)
    recommender_artifact = train_content_recommender(df)
    anomaly_artifact = train_anomaly_detector(df, args.contamination)

    output_files = {
        "risk_predictor": str(save_artifact(args.output_dir, "risk_predictor.pkl", risk_artifact)),
        "recommender": str(save_artifact(args.output_dir, "recommendation_content_based.pkl", recommender_artifact)),
        "anomaly_detector": str(save_artifact(args.output_dir, "anomaly_detector.pkl", anomaly_artifact)),
    }

    summary = TrainingSummary(
        generated_at=datetime.now(timezone.utc).isoformat(),
        model_version=MODEL_VERSION,
        synthetic_users=len(df),
        feature_names=FEATURE_NAMES,
        risk_accuracy=risk_metrics["accuracy"],
        risk_roc_auc=risk_metrics["roc_auc"],
        anomaly_contamination=args.contamination,
        output_files=output_files,
    )
    manifest_path = write_manifest(args.output_dir, summary)

    print("Training complete.")
    print(f"Synthetic users: {len(df)}")
    print(f"Risk accuracy: {summary.risk_accuracy:.3f}")
    print(f"Risk ROC AUC: {summary.risk_roc_auc:.3f}")
    print(f"Manifest: {manifest_path}")
    for name, path in output_files.items():
        print(f"{name}: {path}")


if __name__ == "__main__":
    main()
