import subprocess
import re
import time
import os

def start_tunnel():
    print("Starting cloudflared tunnel...")
    process = subprocess.Popen(
        ['cloudflared', 'tunnel', '--url', 'http://localhost:5173'],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True
    )

    url_found = False
    start_time = time.time()
    timeout = 30  # 30 seconds timeout

    while time.time() - start_time < timeout:
        line = process.stdout.readline()
        if not line:
            break
        
        print(line.strip())
        
        # Look for the trycloudflare.com URL
        match = re.search(r'https://[a-z0-9-]+\.trycloudflare\.com', line)
        if match:
            print(f"\nSUCCESS: Tunnel URL found: {match.group(0)}")
            url_found = True
            # Keep the process running in the background but we can stop reading
            with open('tunnel_url.txt', 'w') as f:
                f.write(match.group(0))
            break

    if not url_found:
        print("\nFAILED: Could not find tunnel URL within timeout.")
        process.terminate()

if __name__ == "__main__":
    start_tunnel()
