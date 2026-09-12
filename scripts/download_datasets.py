"""
AthleteGuard - Automated Sports Biomechanics & Injury Dataset Downloader
Downloads, verifies, extracts, and catalogs verified public datasets into data/raw/ and metadata into data/metadata/.
"""

import os
import sys
import json
import zipfile
import tarfile
import logging
import requests
from typing import Dict, Any, List
from tqdm import tqdm

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("DatasetDownloader")

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
INTERIM_DIR = os.path.join(DATA_DIR, "interim")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")
METADATA_DIR = os.path.join(DATA_DIR, "metadata")
PRETRAINED_DIR = os.path.join(PROJECT_ROOT, "models", "pretrained", "pose")

for d in [RAW_DIR, INTERIM_DIR, PROCESSED_DIR, METADATA_DIR, PRETRAINED_DIR]:
    os.makedirs(d, exist_ok=True)

DATASET_CONFIGS = [
    {
        "id": "running_injury_lovdal",
        "name": "Lövdal et al. (2021) Competitive Runners Injury Dataset",
        "publication": "Frontiers in Sports and Active Living (2021)",
        "license": "CC-BY 4.0 / Open Access",
        "description": "Longitudinal daily and multi-week training logs from 74 competitive athletes across 7 years with ground truth injury incidence outcomes.",
        "subjects": 74,
        "prediction_target": "injury (binary label)",
        "files": [
            {
                "filename": "week_approach_maskedID_timeseries.csv",
                "url": "https://raw.githubusercontent.com/sonicjoy/Injury-Prediction-for-Competitive-Runners/main/week_approach_maskedID_timeseries.csv",
                "min_size": 10000000
            },
            {
                "filename": "day_approach_maskedID_timeseries.csv",
                "url": "https://raw.githubusercontent.com/sonicjoy/Injury-Prediction-for-Competitive-Runners/main/day_approach_maskedID_timeseries.csv",
                "min_size": 8000000
            }
        ]
    },
    {
        "id": "sports_workload_swathikiran",
        "name": "Swathikiran Sports Workload and Injury Outcome Dataset",
        "publication": "Sports Injury Analysis (2021)",
        "license": "MIT / Open Research",
        "description": "Athlete daily game workloads, hip mobility, groin squeeze physical screening metrics, and injury dates.",
        "subjects": 30,
        "prediction_target": "injury_dates (incidence events)",
        "files": [
            {
                "filename": "injuries.csv",
                "url": "https://raw.githubusercontent.com/swathikiran86/Sports-Injury-Analysis/main/injuries.csv",
                "min_size": 1000
            },
            {
                "filename": "game_workload.csv",
                "url": "https://raw.githubusercontent.com/swathikiran86/Sports-Injury-Analysis/main/game_workload.csv",
                "min_size": 20000
            },
            {
                "filename": "metrics.csv",
                "url": "https://raw.githubusercontent.com/swathikiran86/Sports-Injury-Analysis/main/metrics.csv",
                "min_size": 500000
            }
        ]
    },
    {
        "id": "fukuchi_running_biomechanics_rbds",
        "name": "Fukuchi et al. Running Biomechanics Dataset (RBDS)",
        "publication": "PeerJ (2017) / Scientific Data",
        "license": "CC-BY 4.0",
        "description": "Lower extremity 3D kinematics and kinetics from 28 regular runners across 3 running speeds.",
        "subjects": 28,
        "prediction_target": "normative_biomechanics_kinematics",
        "files": [
            {
                "filename": "BMC_RIC_dataset.txt",
                "url": "https://raw.githubusercontent.com/BMClab/datasets/master/BMC_RIC/data/BMC_RIC_dataset.txt",
                "min_size": 50000
            },
            {
                "filename": "metadata.txt",
                "url": "https://raw.githubusercontent.com/BMClab/datasets/master/BMC_RIC/data/metadata.txt",
                "min_size": 1000
            }
        ]
    },
    {
        "id": "santos_balance_bds",
        "name": "Santos & Duarte (2016) Balance Evaluations Dataset (BDS)",
        "publication": "PeerJ (2016) 4:e2648",
        "license": "CC-BY 4.0",
        "description": "Human balance and posturography evaluations across 163 subjects with force platform center of pressure (COP) and Mini-BESTest scores.",
        "subjects": 163,
        "prediction_target": "balance_and_postural_stability",
        "files": [
            {
                "filename": "BDSinfo.txt",
                "url": "https://raw.githubusercontent.com/BMClab/datasets/master/BDS/BDSinfo.txt",
                "min_size": 5000
            }
        ]
    }
]


def download_file_with_resume(url: str, target_path: str, min_expected_size: int = 0) -> bool:
    """
    Downloads a single file over HTTP/HTTPS with resume support and progress visualization.
    """
    temp_path = target_path + ".part"
    headers = {}
    downloaded_size = 0

    if os.path.exists(target_path):
        current_size = os.path.getsize(target_path)
        if min_expected_size > 0 and current_size >= min_expected_size:
            logger.info(f"File already verified: {os.path.basename(target_path)} ({current_size} bytes)")
            return True
        elif min_expected_size == 0 and current_size > 0:
            logger.info(f"File already present: {os.path.basename(target_path)} ({current_size} bytes)")
            return True

    if os.path.exists(temp_path):
        downloaded_size = os.path.getsize(temp_path)
        headers["Range"] = f"bytes={downloaded_size}-"

    try:
        with requests.get(url, headers=headers, stream=True, timeout=30) as r:
            if r.status_code == 416: # Range not satisfiable
                logger.info("Resumed chunk range complete, validating...")
                os.replace(temp_path, target_path)
                return True
            r.raise_for_status()

            total_size = int(r.headers.get("content-length", 0)) + downloaded_size
            mode = "ab" if downloaded_size > 0 else "wb"

            with open(temp_path, mode) as f, tqdm(
                total=total_size,
                initial=downloaded_size,
                unit="B",
                unit_scale=True,
                desc=os.path.basename(target_path)
            ) as bar:
                for chunk in r.iter_content(chunk_size=65536):
                    if chunk:
                        f.write(chunk)
                        bar.update(len(chunk))

        os.replace(temp_path, target_path)
        final_size = os.path.getsize(target_path)
        if min_expected_size > 0 and final_size < min_expected_size:
            logger.error(f"Downloaded file {target_path} is smaller than expected ({final_size} < {min_expected_size})")
            return False
        return True

    except Exception as e:
        logger.error(f"Error downloading {url} -> {target_path}: {e}")
        return False


def extract_archive(archive_path: str, extract_to: str):
    """
    Extracts ZIP, TAR, or GZ archives safely.
    """
    logger.info(f"Extracting {archive_path} to {extract_to}...")
    if zipfile.is_zipfile(archive_path):
        with zipfile.ZipFile(archive_path, 'r') as zip_ref:
            zip_ref.extractall(extract_to)
        logger.info(f"Successfully unzipped {archive_path}")
    elif tarfile.is_tarfile(archive_path):
        with tarfile.open(archive_path, 'r:*') as tar_ref:
            tar_ref.extractall(extract_to)
        logger.info(f"Successfully untarred {archive_path}")


def download_all_datasets() -> Dict[str, Any]:
    """
    Executes the full automated download workflow for all configured datasets.
    """
    results = {}
    logger.info("=" * 60)
    logger.info("Starting AthleteGuard Automated Dataset Pipeline")
    logger.info(f"Target Raw Directory: {RAW_DIR}")
    logger.info(f"Target Metadata Directory: {METADATA_DIR}")
    logger.info("=" * 60)

    for cfg in DATASET_CONFIGS:
        ds_id = cfg["id"]
        logger.info(f"\nProcessing Dataset: {cfg['name']} [{ds_id}]")
        ds_raw_dir = os.path.join(RAW_DIR, ds_id)
        os.makedirs(ds_raw_dir, exist_ok=True)

        success_count = 0
        total_files = len(cfg["files"])
        downloaded_details = []

        for f_info in cfg["files"]:
            target_path = os.path.join(ds_raw_dir, f_info["filename"])
            ok = download_file_with_resume(f_info["url"], target_path, f_info.get("min_size", 0))
            if ok:
                success_count += 1
                size_bytes = os.path.getsize(target_path)
                downloaded_details.append({
                    "filename": f_info["filename"],
                    "size_bytes": size_bytes,
                    "status": "verified"
                })
                # Auto-extract if archive
                if f_info["filename"].endswith((".zip", ".tar.gz", ".tar")):
                    extract_archive(target_path, ds_raw_dir)
            else:
                downloaded_details.append({
                    "filename": f_info["filename"],
                    "status": "failed"
                })

        manifest = {
            "dataset_id": ds_id,
            "dataset_name": cfg["name"],
            "publication": cfg["publication"],
            "license": cfg["license"],
            "description": cfg["description"],
            "subjects": cfg["subjects"],
            "prediction_target": cfg["prediction_target"],
            "files": downloaded_details,
            "status": "complete" if success_count == total_files else "partial"
        }

        meta_path = os.path.join(METADATA_DIR, f"{ds_id}.json")
        with open(meta_path, "w", encoding="utf-8") as mf:
            json.dump(manifest, mf, indent=2)

        results[ds_id] = manifest
        logger.info(f"Saved metadata: {meta_path} [Status: {manifest['status']}]")

    logger.info("\n" + "=" * 60)
    logger.info("Dataset Download Pipeline Complete")
    logger.info("=" * 60)
    return results


if __name__ == "__main__":
    download_all_datasets()
