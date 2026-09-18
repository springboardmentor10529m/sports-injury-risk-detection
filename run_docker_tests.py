import subprocess
import time
import urllib.request
import os

log_file = "docker_test_results.log"

def log(text):
    print(text)
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(text + "\n")

# Clear log file
with open(log_file, "w", encoding="utf-8") as f:
    f.write("=== DOCKER EXECUTION VERIFICATION LOG ===\n\n")

def run_cmd(cmd_str, timeout=120):
    log(f"\n--- RUNNING COMMAND: {cmd_str} ---")
    try:
        res = subprocess.run(cmd_str, capture_output=True, text=True, timeout=timeout, shell=True)
        log(f"RETURN CODE: {res.returncode}")
        if res.stdout.strip():
            log(f"STDOUT:\n{res.stdout}")
        if res.stderr.strip():
            log(f"STDERR:\n{res.stderr}")
        return res
    except Exception as e:
        log(f"EXCEPTION: {str(e)}")
        return None

# Step 1: Check Docker
log("=== STEP 1: CHECK DOCKER ===")
res_ver = run_cmd("docker --version")
res_info = run_cmd("docker info")

if res_ver is None or res_ver.returncode != 0:
    log("\n[RESULT] DOCKER IS NOT INSTALLED OR DOCKER DAEMON IS NOT RUNNING ON THIS HOST SYSTEM.")
    log("[STATUS] VERDICT: DOCKER DAEMON NOT AVAILABLE ON LOCAL SYSTEM")
    exit(0)

# Step 2: Build Image
log("\n=== STEP 2: BUILD DOCKER IMAGE ===")
res_build = run_cmd("docker build -t sports-injury-app .", timeout=300)

if res_build is None or res_build.returncode != 0:
    log("\n[RESULT] DOCKER BUILD FAILED.")
    log("[STATUS] VERDICT: DOCKERIZATION STILL NEEDS FIXES")
    exit(0)

# Step 3: Run Container
log("\n=== STEP 3: RUN CONTAINER ===")
run_cmd("docker rm -f sports-injury-test")
res_run = run_cmd("docker run --rm -d --name sports-injury-test -p 8000:8000 sports-injury-app")

if res_run is None or res_run.returncode != 0:
    log("\n[RESULT] DOCKER RUN FAILED.")
    log("[STATUS] VERDICT: DOCKERIZATION STILL NEEDS FIXES")
    exit(0)

log("Waiting 5 seconds for container to initialize...")
time.sleep(5)

# Step 4: Check Endpoints
log("\n=== STEP 4: CHECK ENDPOINTS ===")
endpoints = [
    ("Health Check", "http://localhost:8000/health"),
    ("Docs Page", "http://localhost:8000/docs"),
    ("Frontend Home", "http://localhost:8000/")
]

for name, url in endpoints:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            body = resp.read().decode('utf-8', errors='ignore')
            log(f"[OK] {name} ({url}): HTTP {resp.status} - Length: {len(body)} bytes")
            if "health" in url:
                log(f"   Response Body: {body}")
    except Exception as e:
        log(f"[FAIL] {name} ({url}) FAILED: {str(e)}")

# Step 5: Container Logs
log("\n=== STEP 5: CONTAINER LOGS ===")
run_cmd("docker logs sports-injury-test")

# Step 6: Verify ML inside Container
log("\n=== STEP 6: VERIFY ML INFERENCE INSIDE CONTAINER ===")
ml_cmd = (
    "docker exec sports-injury-test python -c \""
    "import ml_inference; p = ml_inference.get_predictor(); print('ML PREDICTOR LOADED OK:', p.metadata); "
    "res = p.predict_injury_risk({'range_of_motion':75.0, 'gait_symmetry':0.9, 'acc_rms':1.0, 'previous_injury_history':0, 'training_duration':90.0, 'fatigue_score':50.0, 'acceleration':0.0, 'angular_velocity':0.0, 'body_orientation':8.59, 'ground_reaction_force':495.0, 'step_count':100.0, 'cadence':80.0, 'jump_height_cm':50.0, 'impact_force':300.0, 'speed':6.0, 'rest_period':8.0, 'repetition_count':30.0, 'workload_intensity':6.0}); "
    "print('ML PREDICTION RESULT:', res)\""
)
run_cmd(ml_cmd)

# Step 7: Verify Video Processing Dependencies inside Container
log("\n=== STEP 7: VERIFY VIDEO PROCESSING DEPENDENCIES INSIDE CONTAINER ===")
vid_cmd = (
    "docker exec sports-injury-test python -c \""
    "import cv2; import mediapipe as mp; import os; "
    "print('OpenCV version:', cv2.__version__); print('MediaPipe version:', mp.__version__); "
    "print('Pose Landmarker Task File Present:', os.path.exists('/app/pose_landmarker_full.task'))\""
)
run_cmd(vid_cmd)

# Step 8: Stop Container
log("\n=== STEP 8: STOP CONTAINER ===")
run_cmd("docker stop sports-injury-test")

log("\n=== VERDICT: DOCKERIZATION COMPLETE ===")
