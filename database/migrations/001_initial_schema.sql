CREATE TYPE user_role AS ENUM (
    'athlete',
    'coach',
    'physiotherapist',
    'sports_scientist',
    'administrator'
);

CREATE TABLE users (
    user_id UUID PRIMARY KEY,
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role user_role NOT NULL,
    phone VARCHAR,
    profile_image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE athletes (
    athlete_id UUID PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL,
    date_of_birth DATE,
    gender VARCHAR,
    sport VARCHAR,
    position VARCHAR,
    team VARCHAR,
    experience_years INTEGER,
    height_cm NUMERIC,
    weight_kg NUMERIC,
    dominant_side VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE injury_history (
    injury_id UUID PRIMARY KEY,
    athlete_id UUID NOT NULL,
    injury_type VARCHAR,
    body_part VARCHAR,
    severity VARCHAR,
    injury_date DATE,
    recovery_date DATE,
    remarks TEXT,
    FOREIGN KEY (athlete_id) REFERENCES athletes(athlete_id)
);

CREATE TABLE videos (
    video_id UUID PRIMARY KEY,
    athlete_id UUID NOT NULL,
    activity VARCHAR,
    video_url TEXT,
    duration DOUBLE PRECISION,
    fps INTEGER,
    resolution VARCHAR,
    quality_score DOUBLE PRECISION,
    processing_status VARCHAR,
    uploaded_at TIMESTAMP,
    FOREIGN KEY (athlete_id) REFERENCES athletes(athlete_id)
);

CREATE TABLE analysis_results (
    analysis_id UUID PRIMARY KEY,
    video_id UUID NOT NULL,
    athlete_id UUID NOT NULL,
    knee_valgus DOUBLE PRECISION,
    hip_stability DOUBLE PRECISION,
    trunk_lean DOUBLE PRECISION,
    stride_length DOUBLE PRECISION,
    joint_alignment DOUBLE PRECISION,
    symmetry_score DOUBLE PRECISION,
    fatigue_score DOUBLE PRECISION,
    movement_quality DOUBLE PRECISION,
    overall_risk_score DOUBLE PRECISION,
    risk_level VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(video_id),
    FOREIGN KEY (athlete_id) REFERENCES athletes(athlete_id)
);

CREATE TABLE injury_predictions (
    prediction_id UUID PRIMARY KEY,
    analysis_id UUID NOT NULL,
    acl_risk DOUBLE PRECISION,
    hamstring_risk DOUBLE PRECISION,
    ankle_risk DOUBLE PRECISION,
    shoulder_risk DOUBLE PRECISION,
    lower_back_risk DOUBLE PRECISION,
    overuse_risk DOUBLE PRECISION,
    FOREIGN KEY (analysis_id) REFERENCES analysis_results(analysis_id)
);

CREATE TABLE recommendations (
    recommendation_id UUID PRIMARY KEY,
    prediction_id UUID NOT NULL,
    exercise TEXT,
    mobility TEXT,
    strengthening TEXT,
    recovery TEXT,
    training_modification TEXT,
    FOREIGN KEY (prediction_id) REFERENCES injury_predictions(prediction_id)
);

CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR,
    message TEXT,
    notification_type VARCHAR,
    is_read BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE reports (
    report_id UUID PRIMARY KEY,
    athlete_id UUID NOT NULL,
    report_type VARCHAR,
    generated_by UUID,
    file_path TEXT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (athlete_id) REFERENCES athletes(athlete_id),
    FOREIGN KEY (generated_by) REFERENCES users(user_id)
);

CREATE TABLE performance_records (
    record_id UUID PRIMARY KEY,
    athlete_id UUID NOT NULL,
    activity VARCHAR,
    score DOUBLE PRECISION,
    remarks TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (athlete_id) REFERENCES athletes(athlete_id)
);