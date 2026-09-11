import os
import csv
import xml.etree.ElementTree as ET
from typing import List, Dict, Any

DATASET_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "dataset_archive")
XML_PATH = os.path.join(DATASET_DIR, "annotations.xml")
CSV_PATH = os.path.join(DATASET_DIR, "file_info.csv")

def parse_dataset_annotations(max_images: int = 10) -> List[Dict[str, Any]]:
    """
    Parses keypoint annotations from the dataset archive XML file.
    Extracts image name, dimensions, and tagged keypoint coordinates.
    """
    if not os.path.exists(XML_PATH):
        return []

    try:
        tree = ET.parse(XML_PATH)
        root = tree.getroot()
        annotated_samples = []

        for image in root.findall(".//image")[:max_images]:
            img_id = image.get("id")
            img_name = image.get("name")
            width = float(image.get("width", 0))
            height = float(image.get("height", 0))

            points_list = []
            for pts in image.findall("points"):
                label = pts.get("label")
                raw_coords = pts.get("points", "")
                if raw_coords:
                    coords = [float(c) for c in raw_coords.split(",")]
                    if len(coords) >= 2:
                        points_list.append({
                            "joint_id": label,
                            "x": coords[0],
                            "y": coords[1],
                            "normalized_x": coords[0] / width if width > 0 else 0,
                            "normalized_y": coords[1] / height if height > 0 else 0
                        })

            annotated_samples.append({
                "image_id": img_id,
                "image_name": img_name,
                "width": width,
                "height": height,
                "keypoints_count": len(points_list),
                "keypoints": points_list
            })

        return annotated_samples
    except Exception as e:
        print(f"Error parsing dataset annotations XML: {e}")
        return []
