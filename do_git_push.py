import subprocess
import os

log_file = "git_push_log.txt"

with open(log_file, "w") as f:
    f.write("=== GIT COMMIT ===\n")
    c_res = subprocess.run(["git", "commit", "-a", "-m", "feat: final UI polish, ML model integration, and comprehensive README documentation"], capture_output=True, text=True)
    f.write(f"STDOUT: {c_res.stdout}\n")
    f.write(f"STDERR: {c_res.stderr}\n\n")

    f.write("=== GIT PUSH ===\n")
    p_res = subprocess.run(["git", "push", "origin", "main"], capture_output=True, text=True)
    f.write(f"STDOUT: {p_res.stdout}\n")
    f.write(f"STDERR: {p_res.stderr}\n")

print("Git script finished execution.")
