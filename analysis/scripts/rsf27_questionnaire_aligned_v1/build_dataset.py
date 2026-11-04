"""Create a *new*, questionnaire-aligned synthetic 27-feature research dataset.

The source 27-feature file is never changed.  This script deliberately reads
only baseline Framingham measurements from ``framingham.csv`` and copies the
already-recovered outcome/fold columns after feature generation.  It does not
read an event, death, time, or fold when generating a questionnaire answer.

This is a reproducible research bridge for the local assessment form.  It is
not a clinical cohort or a validated Philippine risk model.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[3]
VERSION = "questionnaire_27_questionnaire_aligned_20261103_v1"
OUT = ROOT / "data" / "processed" / VERSION
REPORT = ROOT / "analysis" / "reports" / VERSION
SOURCE = ROOT / "data" / "processed" / "questionnaire_27_engineered_20261103_v1" / "pintig_framingham_27predictors_ENGINEERED_PROXY_EXPERIMENTAL.csv"
RAW = ROOT / "data" / "raw" / "framingham.csv"
SEED = 27110317
HORIZON_DAYS = 3652.5

PREDICTORS = [
    "age_years", "sex_male", "ses_index_0_100", "urban_rural_residence", "waist_cm",
    "hip_circumference_cm", "sbp_mmhg", "dbp_mmhg", "heart_rate_bpm", "hypertension_history",
    "bp_medication", "diabetes", "diabetes_medication", "lipid_lowering_medication",
    "family_history_cvd", "alcohol_ethanol_g_week", "heavy_episodic_alcohol", "smoking_status",
    "smoking_pack_years", "current_smoking_intensity_cigs_day", "passive_smoking_childhood",
    "passive_smoking_adult_years", "activity_min_week", "sitting_minutes_day", "diet_score_0_100",
    "psychosocial_stress", "sleep_duration_hours",
]
META = ["participant_id", "analysis_time_days", "event_type", "event_major_cvd_10y", "event_competing_death_10y", "outer_fold"]
RAW_BASELINE = ["RANDID", "PERIOD", "SEX", "AGE", "SYSBP", "DIABP", "HEARTRTE", "DIABETES", "BPMEDS", "HYPERTEN", "CURSMOKE", "CIGPDAY"]
INCOME_REPRESENTATIVES_PHP = np.array([0, 83_238, 249_714, 499_428, 998_856, 1_997_712.0])
FOOD_GROUPS = {"fruit": 11, "vegetables": 20, "grain": 2, "nuts": 4, "sweet": 8, "meat": 6}
FOOD_DAILY = np.array([0, 2 / (365.25 / 12), 1 / 7, 3 / 7, 5.5 / 7, 1, 2.5, 4.5, 6])


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def clipped(x, lower, upper):
    return np.minimum(np.maximum(x, lower), upper)


def food_score(levels: dict[str, np.ndarray]) -> np.ndarray:
    totals = {group: FOOD_DAILY[arr].sum(axis=1) for group, arr in levels.items()}
    components = [
        clipped(totals["vegetables"] / 5, 0, 1), clipped(totals["fruit"] / 4, 0, 1),
        clipped(totals["grain"] / 3, 0, 1), clipped(totals["nuts"], 0, 1),
        clipped(1 - totals["sweet"], 0, 1), clipped(1 - totals["meat"] / 1.5, 0, 1),
    ]
    return (np.mean(components, axis=0) * 100).round(4)


def pca_ses(education: np.ndarray, income_band: np.ndarray, supported: np.ndarray):
    """Experimental score from synthetic responses, with all assumptions explicit.

    Education is one-hot (not treated as equally spaced).  Income is an
    explicitly documented representative amount for each answer category,
    square-root equivalized.  This full-cohort score is a dataset descriptor;
    the training script repeats PCA independently inside each training fold.
    """
    one_hot = np.eye(9)[education]
    income = np.log1p(INCOME_REPRESENTATIVES_PHP[income_band] / np.sqrt(supported))[:, None]
    x = np.column_stack((one_hot, income))
    mean, scale = x.mean(0), x.std(0, ddof=0)
    scale[scale == 0] = 1
    z = (x - mean) / scale
    _, _, vt = np.linalg.svd(z, full_matrices=False)
    score = z @ vt[0]
    if np.corrcoef(score, income[:, 0])[0, 1] < 0:
        score *= -1
        vt[0] *= -1
    order = pd.Series(score).rank(method="average").to_numpy()
    percentile = 100 * (order - 1) / (len(order) - 1)
    artifact = {
        "basis": "education one-hot categories 0-8 plus log1p(representative income / sqrt(supported people))",
        "income_representatives_php_year": INCOME_REPRESENTATIVES_PHP.tolist(),
        "mean": mean.tolist(), "scale": scale.tolist(), "rotation_pc1": vt[0].tolist(),
        "orientation": "positive correlation with equivalized representative income",
        "score_reference": "synthetic cohort percentile; not a population reference",
    }
    return percentile.round(4), artifact


def build() -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    source = pd.read_csv(SOURCE).sort_values("participant_id").reset_index(drop=True)
    if list(source.columns) != PREDICTORS + META or source.participant_id.nunique() != 4191:
        raise ValueError("Frozen 27-feature source has unexpected schema or participant count")
    # The only raw-data read in this generator is this allow-listed baseline set.
    raw = pd.read_csv(RAW, usecols=RAW_BASELINE)
    raw = raw.loc[raw.PERIOD.eq(1), RAW_BASELINE].set_index("RANDID")
    base = raw.loc[source.participant_id].reset_index(drop=False)
    if base.RANDID.isna().any():
        raise ValueError("A recovered participant has no baseline Framingham record")
    rng = np.random.default_rng(SEED)
    n = len(base)
    age = base.AGE.to_numpy(float)
    male = base.SEX.eq(1).astype(int).to_numpy()
    sbp, dbp, hr = base.SYSBP.to_numpy(float), base.DIABP.to_numpy(float), base.HEARTRTE.to_numpy(float)
    diabetes = base.DIABETES.to_numpy(float)
    bpmed = base.BPMEDS.to_numpy(float)
    current_raw = base.CURSMOKE.fillna(0).astype(int).to_numpy()
    cigs_raw = base.CIGPDAY.to_numpy(float)

    # Socioeconomic synthetic questionnaire answers.  No outcomes, time, or fold enter this block.
    ses_latent = rng.normal(0, 1, n) + .10 * male - .008 * (age - 50)
    education = np.digitize(ses_latent, [-1.35, -0.90, -0.45, -0.05, .30, .60, .95, 1.35]).astype(int)
    supported = clipped(rng.poisson(2.6, n) + 1, 1, 12).astype(int)
    income_band = np.digitize(ses_latent + rng.normal(0, .45, n), [-1.25, -.55, .05, .70, 1.25]).astype(int)
    ses, ses_artifact = pca_ses(education, income_band, supported)
    urban = (ses_latent + rng.normal(0, .75, n) > -.15).astype(int)

    # Anthropometry: synthetic paired questionnaire measurements, while the original BP/heart-rate values stay unchanged.
    waist = clipped(83 + .62 * (age - 50) + 6.5 * male + .08 * (sbp - 120) + rng.normal(0, 7, n), 55, 155).round(1)
    hip = clipped(95 + .38 * (age - 50) - 4 * male + .35 * (waist - 85) + rng.normal(0, 6, n), 65, 175).round(1)
    waist_one = (waist + rng.normal(0, .35, n)).round(1); waist_two = (2 * waist - waist_one).round(1)
    hip_one = (hip + rng.normal(0, .35, n)).round(1); hip_two = (2 * hip - hip_one).round(1)

    diabetes_med = ((diabetes == 1) & (rng.random(n) < .62)).astype(int)
    lipid_med = ((age > 50) & (rng.random(n) < clipped(.08 + .012 * (age - 50) + .15 * (sbp > 140), .04, .65))).astype(int)
    family = (rng.random(n) < clipped(.18 + .004 * (age - 35) + .05 * male, .15, .55)).astype(int)

    alcohol_status = np.where(rng.random(n) < .30, "Current", np.where(rng.random(n) < .22, "Former", "Never"))
    alcohol_quantity = np.where(alcohol_status == "Current", clipped(rng.gamma(1.8, 2.1, n), .25, 30), 0).round(2)
    alcohol_beverage = np.where(rng.random(n) < .56, "Beer", "Spirits")
    alcohol_ml = np.where(alcohol_beverage == "Beer", 375.0, 30.0)
    alcohol_abv = np.where(alcohol_beverage == "Beer", .05, .40)
    ethanol = (alcohol_quantity * alcohol_ml * alcohol_abv * .789).round(4)
    heavy = ((alcohol_status == "Current") & ((alcohol_quantity >= 5) | (rng.random(n) < .12))).astype(int)

    former = ((current_raw == 0) & (rng.random(n) < clipped(.08 + .008 * (age - 35), .08, .42))).astype(int)
    smoking_status = np.where(current_raw == 1, "Current", np.where(former == 1, "Former", "Never"))
    intensity = np.where(current_raw == 1, cigs_raw, 0.0)
    start_age = clipped((rng.normal(20, 4, n)).round(), 12, age - 1)
    average_cigs = np.where(current_raw == 1, np.where(np.isfinite(cigs_raw), cigs_raw, rng.uniform(5, 20, n)), rng.uniform(5, 18, n))
    stopped_years = np.where(former == 1, rng.integers(1, np.maximum(2, (age - start_age).astype(int) + 1)), 0)
    smoking_years = np.where(current_raw == 1, age - start_age, np.where(former == 1, age - start_age - stopped_years, 0))
    pack_years = clipped(average_cigs / 20 * smoking_years, 0, 100).round(4)

    passive_child = (rng.random(n) < clipped(.29 + .06 * male, .18, .46)).astype(int)
    passive_years = np.where(rng.random(n) < .43, rng.integers(1, np.maximum(2, (age - 17).astype(int) + 1)), 0).astype(float)

    activity_days = rng.integers(1, 6, n)
    activity_daily = clipped(rng.normal(42 + .25 * (ses - 50) - .35 * (age - 50), 18, n), 10, 180).round()
    activity = (activity_days * activity_daily).astype(float)
    weekday_sit = clipped(rng.normal(455 - .45 * activity_daily, 95, n), 120, 900).round()
    weekend_sit = clipped(weekday_sit + rng.normal(-20, 85, n), 60, 900).round()
    sitting = ((5 * weekday_sit + 2 * weekend_sit) / 7).round(4)

    food_levels = {}
    healthy = (ses - 50) / 25 + rng.normal(0, 1.15, n)
    for group, count in FOOD_GROUPS.items():
        direction = -1 if group in ("sweet", "meat") else 1
        loc = 2.2 + direction * .7 * healthy[:, None]
        food_levels[group] = clipped(np.rint(rng.normal(loc, 1.35, (n, count))), 0, 8).astype(int)
    diet = food_score(food_levels)
    stress = (rng.random(n) < clipped(.24 + .003 * (sbp - 120) - .001 * (diet - 50), .08, .70)).astype(int)
    sleep = clipped(rng.normal(7.1 - .35 * stress - .004 * (age - 50), .85, n), 3, 12).round(2)

    data = pd.DataFrame({
        "age_years": age.astype(int), "sex_male": male, "ses_index_0_100": ses,
        "urban_rural_residence": urban, "waist_cm": waist, "hip_circumference_cm": hip,
        "sbp_mmhg": sbp, "dbp_mmhg": dbp, "heart_rate_bpm": hr,
        "hypertension_history": base.HYPERTEN.to_numpy(float),
        "bp_medication": bpmed, "diabetes": diabetes, "diabetes_medication": diabetes_med,
        "lipid_lowering_medication": lipid_med, "family_history_cvd": family,
        "alcohol_ethanol_g_week": ethanol, "heavy_episodic_alcohol": heavy,
        "smoking_status": smoking_status, "smoking_pack_years": pack_years,
        "current_smoking_intensity_cigs_day": intensity, "passive_smoking_childhood": passive_child,
        "passive_smoking_adult_years": passive_years, "activity_min_week": activity,
        "sitting_minutes_day": sitting, "diet_score_0_100": diet, "psychosocial_stress": stress,
        "sleep_duration_hours": sleep,
    })
    # Copy the recovered outcomes and original fold only after every questionnaire predictor is complete.
    data = pd.concat([data, source[META].reset_index(drop=True)], axis=1)
    answers = pd.DataFrame({
        "participant_id": source.participant_id, "education_category": education, "income_band": income_band,
        "income_supported_people": supported, "income_representative_php_year": INCOME_REPRESENTATIVES_PHP[income_band],
        "waist_cm_first": waist_one, "waist_cm_second": waist_two, "hip_cm_first": hip_one, "hip_cm_second": hip_two,
        "sbp_first": sbp, "sbp_second": sbp, "dbp_first": dbp, "dbp_second": dbp, "heart_rate_first": hr, "heart_rate_second": hr,
        "alcohol_status": alcohol_status, "alcohol_beverage": alcohol_beverage, "alcohol_frequency": "Weekly", "alcohol_average_drinks": alcohol_quantity,
        "heavy_episodic_answer": heavy, "smoking_ever": np.where(smoking_status == "Never", "No", "Yes"),
        "smoking_current": np.where(smoking_status == "Current", "Yes", "No"), "smoking_current_cigs_day": intensity,
        "smoking_start_age": start_age, "smoking_average_cigs_day": average_cigs.round(2), "smoking_stopped_years": stopped_years,
        "passive_childhood": passive_child, "passive_adult_years": passive_years,
        "ipaq_work_gate": "Yes", "ipaq_work_walking_days": activity_days, "ipaq_work_walking_minutes_day": activity_daily,
        "sitting_weekday_minutes": weekday_sit, "sitting_weekend_minutes": weekend_sit,
        "psychosocial_stress": stress, "sleep_typical_day_hours": sleep,
    })
    for group, values in food_levels.items():
        for i in range(values.shape[1]):
            answers[f"ffq_{group}_{i + 1}_frequency_index"] = values[:, i]
    metadata = {
        "version": VERSION, "seed": SEED, "participants": int(n), "predictors": PREDICTORS,
        "source_dataset": str(SOURCE.relative_to(ROOT)), "source_sha256": sha(SOURCE),
        "raw_allowlist": RAW_BASELINE, "raw_sha256": sha(RAW),
        "outcome_rule": "Copied byte-for-value from recovered proxy dataset after predictor generation; never used in generation.",
        "provenance": "Observed Framingham: age, sex, SBP, DBP, heart rate, diabetes, BP medication, current smoking intensity. All other responses/values are synthetic or derived from synthetic responses.",
        "ses": ses_artifact,
        "limitations": [
            "Synthetic questionnaire values are not Framingham or Philippine participant observations.",
            "The recorded-CVD and death-before-recorded-CVD outcomes are proxy outcomes, not verified MI/stroke/HF/CV-death and non-CV-death outcomes.",
            "The full-cohort SES descriptor is not used as a validation-time transform; the training script fits PCA within each training fold.",
        ],
    }
    return data[PREDICTORS + META], answers, metadata


def validate(data: pd.DataFrame, source: pd.DataFrame):
    assert data.shape == (4191, 33) and list(data) == PREDICTORS + META
    assert data.participant_id.is_unique and data.participant_id.notna().all()
    pd.testing.assert_frame_equal(data[META], source.sort_values("participant_id").reset_index(drop=True)[META])
    assert data.event_type.value_counts().to_dict() == {0: 3604, 1: 369, 2: 218}
    assert data.analysis_time_days.notna().all() and data.event_type.notna().all()
    assert (data.loc[data.event_type.eq(1), "event_major_cvd_10y"] == 1).all()
    assert (data.loc[data.event_type.eq(2), "event_competing_death_10y"] == 1).all()
    assert data.outer_fold.isin([1, 2, 3, 4, 5]).all()
    assert data.ses_index_0_100.between(0, 100).all()
    assert data.alcohol_ethanol_g_week.ge(0).all()
    assert data.loc[data.smoking_status.ne("Current"), "current_smoking_intensity_cigs_day"].fillna(0).eq(0).all()
    assert data.passive_smoking_adult_years.ge(0).all()


def main():
    if OUT.exists() or REPORT.exists():
        raise FileExistsError(f"{VERSION} exists; refusing to overwrite a versioned artifact")
    data, answers, metadata = build()
    source = pd.read_csv(SOURCE).sort_values("participant_id").reset_index(drop=True)
    validate(data, source)
    OUT.mkdir(parents=True); REPORT.mkdir(parents=True)
    dataset = OUT / "pintig_framingham_27predictors_QUESTIONNAIRE_ALIGNED_PROXY_EXPERIMENTAL.csv"
    data.to_csv(dataset, index=False)
    answers.to_csv(OUT / "SYNTHETIC_questionnaire_responses.csv", index=False)
    (REPORT / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    (REPORT / "validation.json").write_text(json.dumps({
        "status": "PASS", "participants": 4191, "columns": 33, "predictors": 27,
        "event_type_counts": {str(k): int(v) for k, v in data.event_type.value_counts().sort_index().items()},
        "fold_counts": {str(k): int(v) for k, v in data.outer_fold.value_counts().sort_index().items()},
        "dataset_sha256": sha(dataset), "source_outcomes_and_folds_match": True,
        "generation_uses_no_outcomes_times_or_folds": True,
        "missing_by_predictor": data[PREDICTORS].isna().sum().to_dict(),
    }, indent=2), encoding="utf-8")
    pd.DataFrame({"predictor": PREDICTORS, "missing": data[PREDICTORS].isna().sum(), "dtype": data[PREDICTORS].dtypes.astype(str)}).to_csv(REPORT / "predictor_missingness.csv", index=False)
    print(json.dumps({"dataset": str(dataset), "sha256": sha(dataset), "rows": len(data), "columns": len(data.columns)}, indent=2))


if __name__ == "__main__":
    main()
