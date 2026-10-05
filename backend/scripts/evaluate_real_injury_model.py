from __future__ import annotations

import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

try:
    from scripts.real_injury_pipeline import evaluate_model, write_evaluation_report
except ModuleNotFoundError:  # pragma: no cover - repo-root fallback
    from backend.scripts.real_injury_pipeline import evaluate_model, write_evaluation_report


def main() -> dict:
    report = evaluate_model()
    output = write_evaluation_report(report)
    print(json.dumps(report["summary"], indent=2))
    print(f"\nSaved evaluation report to {output}")
    return report


if __name__ == "__main__":
    main()
