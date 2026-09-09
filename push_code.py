import subprocess

with open("git_output.txt", "w", buffering=1) as f:
    f.write("=== STARTING GIT SCRIPT ===\n")
    f.flush()
    
    f.write("--- 1. GIT STATUS ---\n")
    r1 = subprocess.run(["git", "status", "--short"], capture_output=True, text=True)
    f.write(r1.stdout + "\n" + r1.stderr + "\n")
    f.flush()
    
    f.write("--- 2. GIT COMMIT ---\n")
    r2 = subprocess.run(["git", "commit", "-a", "-m", "feat: final UI polish, ML model integration, and comprehensive documentation"], capture_output=True, text=True)
    f.write(r2.stdout + "\n" + r2.stderr + "\n")
    f.flush()
    
    f.write("--- 3. GIT PUSH ---\n")
    r3 = subprocess.run(["git", "push", "origin", "main"], capture_output=True, text=True)
    f.write(r3.stdout + "\n" + r3.stderr + "\n")
    f.flush()
    
    f.write("=== GIT SCRIPT COMPLETE ===\n")
    f.flush()

print("Script execution done.")
