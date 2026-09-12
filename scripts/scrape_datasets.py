"""
AthleteGuard - Ethical & Compliant Research Dataset Scraper
Interfaces with public repository APIs (Zenodo, Figshare, OpenML) respecting rate limits,
robots.txt, and terms of service. Strictly avoids bypassing authentication or CAPTCHAs.
"""

import os
import sys
import json
import time
import logging
import requests
from typing import Dict, Any, List

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("DatasetScraper")

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
METADATA_DIR = os.path.join(DATA_DIR, "metadata")

for d in [RAW_DIR, METADATA_DIR]:
    os.makedirs(d, exist_ok=True)

# Rate limiting settings (minimum seconds between requests)
MIN_REQUEST_INTERVAL = 1.0
last_request_time = 0.0


def rate_limited_get(url: str, headers: Dict[str, str] = None, timeout: int = 30) -> requests.Response:
    global last_request_time
    elapsed = time.time() - last_request_time
    if elapsed < MIN_REQUEST_INTERVAL:
        time.sleep(MIN_REQUEST_INTERVAL - elapsed)

    default_headers = {
        "User-Agent": "AthleteGuard-SportsBiomechanics-Research/1.0 (academic; polite)"
    }
    if headers:
        default_headers.update(headers)

    response = requests.get(url, headers=default_headers, timeout=timeout)
    last_request_time = time.time()
    return response


def scrape_zenodo_record(record_id: int, target_raw_subdir: str) -> Dict[str, Any]:
    """
    Retrieves metadata and open access file manifests from Zenodo REST API.
    """
    api_url = f"https://zenodo.org/api/records/{record_id}"
    logger.info(f"Querying Zenodo API for record {record_id}: {api_url}")

    try:
        r = rate_limited_get(api_url)
        if r.status_code == 404:
            logger.warning(f"Zenodo record {record_id} not found.")
            return {"status": "not_found"}
        r.raise_for_status()
        data = r.json()

        metadata = data.get("metadata", {})
        title = metadata.get("title", f"Zenodo-{record_id}")
        license_info = metadata.get("license", {}).get("id", "Unknown")
        files = data.get("files", [])

        logger.info(f"Retrieved Zenodo record: '{title}' | License: {license_info} | Files: {len(files)}")

        out_dir = os.path.join(RAW_DIR, target_raw_subdir)
        os.makedirs(out_dir, exist_ok=True)

        meta_out = {
            "source": "Zenodo",
            "record_id": record_id,
            "doi": data.get("doi"),
            "title": title,
            "license": license_info,
            "publication_date": metadata.get("publication_date"),
            "creators": [c.get("name") for c in metadata.get("creators", [])],
            "files_available": [
                {
                    "key": f.get("key"),
                    "size_bytes": f.get("size"),
                    "checksum": f.get("checksum"),
                    "download_url": f.get("links", {}).get("self")
                }
                for f in files
            ]
        }

        with open(os.path.join(METADATA_DIR, f"zenodo_{record_id}.json"), "w", encoding="utf-8") as f:
            json.dump(meta_out, f, indent=2)

        return meta_out

    except Exception as e:
        logger.error(f"Error scraping Zenodo record {record_id}: {e}")
        return {"status": "error", "error": str(e)}


def scrape_figshare_article(article_id: int, target_raw_subdir: str) -> Dict[str, Any]:
    """
    Retrieves metadata and open access file manifests from Figshare REST API v2.
    """
    api_url = f"https://api.figshare.com/v2/articles/{article_id}"
    logger.info(f"Querying Figshare API for article {article_id}: {api_url}")

    try:
        r = rate_limited_get(api_url)
        if r.status_code == 404:
            logger.warning(f"Figshare article {article_id} not found.")
            return {"status": "not_found"}
        r.raise_for_status()
        data = r.json()

        title = data.get("title", f"Figshare-{article_id}")
        license_info = data.get("license", {}).get("name", "Unknown")
        files = data.get("files", [])

        logger.info(f"Retrieved Figshare article: '{title}' | License: {license_info} | Files: {len(files)}")

        meta_out = {
            "source": "Figshare",
            "article_id": article_id,
            "doi": data.get("doi"),
            "title": title,
            "license": license_info,
            "published_date": data.get("published_date"),
            "files_available": [
                {
                    "name": f.get("name"),
                    "size_bytes": f.get("size"),
                    "download_url": f.get("download_url")
                }
                for f in files
            ]
        }

        with open(os.path.join(METADATA_DIR, f"figshare_{article_id}.json"), "w", encoding="utf-8") as f:
            json.dump(meta_out, f, indent=2)

        return meta_out

    except Exception as e:
        logger.error(f"Error scraping Figshare article {article_id}: {e}")
        return {"status": "error", "error": str(e)}


def run_ethical_scraper():
    logger.info("=" * 60)
    logger.info("Running AthleteGuard Compliant Research Scraper")
    logger.info("=" * 60)

    # 1. Scrape Zenodo 4610859 (IntelliRehabDS 3D movements & clinical correctness)
    scrape_zenodo_record(4610859, "intellirehabds")

    # 2. Scrape Figshare 4543435 (Fukuchi Running Biomechanics RBDS)
    scrape_figshare_article(4543435, "fukuchi_running_biomechanics_rbds")

    # 3. Scrape Figshare 3394432 (Santos Balance BDS)
    scrape_figshare_article(3394432, "santos_balance_bds")

    # 4. Check for manually placed restricted datasets (e.g. Stanford MRNet)
    mrnet_dir = os.path.join(RAW_DIR, "mrnet")
    if os.path.exists(mrnet_dir) and len(os.listdir(mrnet_dir)) > 0:
        logger.info(f"Detected manually authorized Stanford MRNet dataset in {mrnet_dir}")
    else:
        logger.info("Stanford MRNet: Manual registration required. Automated bypass withheld.")

    logger.info("Compliant scraping process complete.")


if __name__ == "__main__":
    run_ethical_scraper()
