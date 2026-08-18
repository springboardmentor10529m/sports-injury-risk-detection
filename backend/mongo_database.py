import os
from dotenv import load_dotenv
from typing import Dict, Any, List

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "sports_injury_mongodb")

# Helper class providing MongoDB client interface with graceful in-memory fallback
class MongoDatabase:
    def __init__(self):
        self.connected = False
        self._pose_data_mock: List[Dict[str, Any]] = []
        self._ai_logs_mock: List[Dict[str, Any]] = []
        
        # Try initializing pymongo/motor if installed
        try:
            from pymongo import MongoClient
            self.client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
            self.db = self.client[MONGO_DB_NAME]
            self.pose_data_col = self.db["pose_data"]
            self.ai_logs_col = self.db["ai_logs"]
            # Test connection
            self.client.admin.command('ping')
            self.connected = True
        except Exception:
            self.connected = False

    def insert_pose_data(self, data: Dict[str, Any]) -> str:
        if self.connected:
            res = self.pose_data_col.insert_one(data)
            return str(res.inserted_id)
        else:
            self._pose_data_mock.append(data)
            return f"mock_pose_{len(self._pose_data_mock)}"

    def insert_ai_log(self, log: Dict[str, Any]) -> str:
        if self.connected:
            res = self.ai_logs_col.insert_one(log)
            return str(res.inserted_id)
        else:
            self._ai_logs_mock.append(log)
            return f"mock_log_{len(self._ai_logs_mock)}"

    def get_pose_data(self, video_id: str) -> Dict[str, Any]:
        if self.connected:
            return self.pose_data_col.find_one({"video_id": video_id}) or {}
        for item in self._pose_data_mock:
            if item.get("video_id") == video_id:
                return item
        return {}

mongo_db = MongoDatabase()
