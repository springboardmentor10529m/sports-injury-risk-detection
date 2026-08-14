const sportsDb = db.getSiblingDB("sports_injury_db");

if (!sportsDb.getCollectionNames().includes("pose_data")) {
    sportsDb.createCollection("pose_data");
}

if (!sportsDb.getCollectionNames().includes("ai_logs")) {
    sportsDb.createCollection("ai_logs");
}