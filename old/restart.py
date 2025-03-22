import time
import subprocess
import psutil
import sys

def kill_node_processes():
    # Kill all node processes just once and stop after that
    for proc in psutil.process_iter(attrs=['pid', 'name', 'cmdline']):
        if 'node' in proc.info['name']:  # Check for node processes
            # Kill the process if it's a node process
            print(f"Killing node process {proc.info['pid']} running {proc.info['cmdline']}")
            proc.kill()
            break  # Stop after killing the first node process

# Wait a second
time.sleep(1)

# Kill one node process (old one)
print("Killing one node process...")
kill_node_processes()

# Wait a second for process to terminate
time.sleep(3)

# Run node main.js with the -r flag
print("Starting node main.js...")
subprocess.run(["node", "main.js", "-r"])

# Exit the script immediately
sys.exit()
