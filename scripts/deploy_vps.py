#!/usr/bin/env python3
"""Autonomous VPS Deployment Script for Tour 2026 using Paramiko"""

import os
import sys
import getpass
from pathlib import Path
import paramiko

HOST = "148.135.137.245"
PORT = 2222
USER = "root"
REMOTE_DIR = "/opt/tour2026"

def main():
    password = os.environ.get("VPS_PASSWORD") or (sys.argv[1] if len(sys.argv) > 1 else None)
    if not password:
        password = getpass.getpass(f"Enter root password for {USER}@{HOST}:{PORT}: ")

    print(f"[*] Connecting to {USER}@{HOST}:{PORT}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(
            hostname=HOST,
            port=PORT,
            username=USER,
            password=password,
            timeout=10,
            look_for_keys=False,
            allow_agent=False
        )
    except Exception as e:
        print(f"[!] Authentication failed: {e}", file=sys.stderr)
        sys.exit(1)

    print("[+] SSH connection established successfully!")

    # 1. Install SSH public keys for future passwordless deploys
    pub_key_path = Path.home() / ".ssh" / "hostinger_antigravity.pub"
    if pub_key_path.exists():
        key_content = pub_key_path.read_text().strip()
        print("[*] Adding hostinger_antigravity key to /root/.ssh/authorized_keys for passwordless deploys...")
        stdin, stdout, stderr = client.exec_command(
            f"mkdir -p /root/.ssh && chmod 700 /root/.ssh && grep -q '{key_content}' /root/.ssh/authorized_keys 2>/dev/null || echo '{key_content}' >> /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys"
        )
        stdout.channel.recv_exit_status()

    # 2. Upload dist.tar and server.tar via SFTP or stdin pipe
    dist_file = Path("dist.tar").resolve()
    server_file = Path("server.tar").resolve()

    if not dist_file.exists() or not server_file.exists():
        print("[!] dist.tar or server.tar missing! Please run 'npm run build' first.", file=sys.stderr)
        sys.exit(1)

    print(f"[*] Uploading {dist_file.name} ({dist_file.stat().st_size} bytes)...")
    stdin, stdout, stderr = client.exec_command(f"cat > {REMOTE_DIR}/dist.tar")
    with open(dist_file, "rb") as f:
        stdin.write(f.read())
    stdin.close()
    if stdout.channel.recv_exit_status() != 0:
        print(f"[!] Failed to upload dist.tar: {stderr.read().decode()}", file=sys.stderr)
        sys.exit(1)

    print(f"[*] Uploading {server_file.name} ({server_file.stat().st_size} bytes)...")
    stdin, stdout, stderr = client.exec_command(f"cat > {REMOTE_DIR}/server.tar")
    with open(server_file, "rb") as f:
        stdin.write(f.read())
    stdin.close()
    if stdout.channel.recv_exit_status() != 0:
        print(f"[!] Failed to upload server.tar: {stderr.read().decode()}", file=sys.stderr)
        sys.exit(1)

    print("[+] Archives uploaded successfully!")

    # 3. Unpack and reload Docker container
    deploy_cmd = (
        f"cd {REMOTE_DIR} && "
        "tar -xf dist.tar && "
        "tar -xf server.tar && "
        "docker cp dist/. tour2026-app:/app/dist/ && "
        "docker cp server.js tour2026-app:/app/ && "
        "docker cp server tour2026-app:/app/ && "
        "docker restart tour2026-app && "
        "rm -f dist.tar server.tar"
    )
    print(f"[*] Deploying to container: {deploy_cmd}")
    stdin, stdout, stderr = client.exec_command(deploy_cmd)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode()
    err = stderr.read().decode()

    if exit_code == 0:
        print(f"[+] Deployment successful! Output:\n{out}")
    else:
        print(f"[!] Deployment failed (code {exit_code}):\n{err}", file=sys.stderr)
        sys.exit(1)

    client.close()

if __name__ == "__main__":
    main()
