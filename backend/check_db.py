import sys
import os
sys.path.insert(0, os.path.abspath('d:/Infosys certificates/Infosys Project/sports-injury-detection/backend'))

from app.database import SessionLocal, engine
from app import models

models.Base.metadata.create_all(bind=engine)
db = SessionLocal()
videos = db.query(models.Video).all()
print(f"Total Videos: {len(videos)}")
for v in videos:
    print(f"Video ID: {v.video_id}, Activity: {v.activity}, Status: {v.processing_status}, URL: {v.video_url}")
    pose = db.query(models.PoseData).filter(models.PoseData.video_id == v.video_id).first()
    if pose:
        print(f"  PoseData: frames len = {len(pose.frames) if pose.frames else 0}")
        if pose.frames and len(pose.frames) > 0:
            f0 = pose.frames[0]
            print(f"  Frame 0 keys: {list(f0.keys())}")
            if "landmarks" in f0:
                lms = f0["landmarks"]
                print(f"  Landmarks type: {type(lms)}, count: {len(lms) if isinstance(lms, (dict, list)) else 'N/A'}")
    analysis = db.query(models.AnalysisResult).filter(models.AnalysisResult.video_id == v.video_id).first()
    if analysis:
        print(f"  Analysis: knee_valgus={analysis.knee_valgus}, trunk_lean={analysis.trunk_lean}, hip_stability={analysis.hip_stability}")
db.close()
