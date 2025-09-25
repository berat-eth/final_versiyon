#!/usr/bin/env python3
"""
Basit kod dağıtım betiği (FTP/SFTP)

Özellikler:
- Tüm proje dizinini uzak sunucudaki /root (veya belirtilen) klasöre yükler
- node_modules ve bazı build/cache klasörlerini atlar
- Varsayılan SFTP (paramiko) kullanır; --mode=ftp ile klasik FTP'ye geçebilirsiniz

Kullanım örnekleri:
  python deploy_ftp.py --host 1.2.3.4 --user root --password 'xxx' --remote-dir /root/huglu_mobil2
  python deploy_ftp.py --host 1.2.3.4 --user root --key-file ~/.ssh/id_rsa --remote-dir /root --mode sftp
  python deploy_ftp.py --mode ftp --host 1.2.3.4 --user user --password 'pass' --remote-dir /root

Not: /root dizinine yazabilmek için genellikle SFTP ve yetkili kullanıcı (root ya da sudo) gerekir.
"""

import argparse
import os
import posixpath
import socket
from typing import Iterable, List, Set


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Proje klasörünü FTP/SFTP ile uzak sunucuya yükle")
    parser.add_argument("--host", required=True, help="Uzak sunucu adresi")
    parser.add_argument("--port", type=int, default=None, help="Bağlantı portu (SFTP için 22, FTP için 21)")
    parser.add_argument("--user", required=True, help="Kullanıcı adı")
    parser.add_argument("--password", help="Şifre (SFTP için anahtar kullanılabilir)")
    parser.add_argument("--key-file", help="SFTP özel anahtar yolu (parola yoksa)")
    parser.add_argument("--mode", choices=["sftp", "ftp"], default=os.getenv("DEPLOY_MODE", "sftp"), help="Bağlantı modu")
    parser.add_argument("--remote-dir", default=os.getenv("REMOTE_DIR", "/root"), help="Uzak hedef dizin")
    parser.add_argument("--root", default=os.getcwd(), help="Yerel proje kök dizini")
    parser.add_argument("--dry-run", action="store_true", help="Dosyaları sadece listele, yükleme yapma")
    return parser


DEFAULT_EXCLUDES: Set[str] = {
    "node_modules",
    ".git",
    ".expo",
    ".gradle",
    "android/app/build",
    "android/build",
    "ios/build",
    "server/node_modules",
    "server/.next",
    "server/.cache",
}


def should_exclude(path: str, project_root: str, extra_excludes: Iterable[str] = ()) -> bool:
    rel = os.path.relpath(path, project_root).replace("\\", "/")
    # Klasör bazlı hariç tutma
    parts = rel.split("/")
    for i in range(1, len(parts) + 1):
        sub = "/".join(parts[:i])
        if sub in DEFAULT_EXCLUDES or sub in extra_excludes:
            return True
    return False


def walk_files(project_root: str, extra_excludes: Iterable[str] = ()) -> Iterable[str]:
    for root, dirs, files in os.walk(project_root):
        # Dizin bazlı filtreleme
        pruned_dirs: List[str] = []
        for d in list(dirs):
            full = os.path.join(root, d)
            if should_exclude(full, project_root, extra_excludes):
                pruned_dirs.append(d)
        for d in pruned_dirs:
            dirs.remove(d)

        for f in files:
            full = os.path.join(root, f)
            if should_exclude(full, project_root, extra_excludes):
                continue
            yield full


def ensure_remote_dirs_sftp(sftp, remote_path: str):
    # posixpath kullanarak uzak linux yolu parçala
    parts = []
    head, tail = posixpath.split(remote_path)
    while tail:
        parts.append(tail)
        head, tail = posixpath.split(head)
    parts.append(head or "/")
    parts = [p for p in reversed(parts) if p and p != "/"]

    cur = "/"
    for p in parts[:-1]:
        cur = posixpath.join(cur, p)
        try:
            sftp.stat(cur)
        except IOError:
            sftp.mkdir(cur)


def ensure_remote_dirs_ftp(ftp, remote_path: str):
    # FTP için mkdir -p taklidi
    dirs = []
    path = remote_path
    while True:
        head, tail = posixpath.split(path)
        if tail:
            dirs.append(tail)
            path = head
        else:
            if head:
                dirs.append(head)
            break
    dirs = [d for d in reversed(dirs) if d and d != "/"]

    cur = ""
    for d in dirs[:-1]:
        cur = f"{cur}/{d}" if cur else f"/{d}"
        try:
            ftp.mkd(cur)
        except Exception:
            pass  # mevcut olabilir


def upload_sftp(host: str, port: int, user: str, password: str, key_file: str, project_root: str, remote_dir: str, dry_run: bool):
    try:
        import paramiko  # type: ignore
    except ImportError:
        raise SystemExit("paramiko bulunamadı. Kurulum: pip install paramiko")

    port = port or 22
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        if key_file:
            pkey = paramiko.RSAKey.from_private_key_file(key_file)
            client.connect(hostname=host, port=port, username=user, pkey=pkey, timeout=15)
        else:
            client.connect(hostname=host, port=port, username=user, password=password, timeout=15)
    except (socket.error, paramiko.SSHException) as e:
        raise SystemExit(f"SFTP bağlantı hatası: {e}")

    with client:
        sftp = client.open_sftp()
        with sftp:
            for local_path in walk_files(project_root):
                rel = os.path.relpath(local_path, project_root).replace("\\", "/")
                remote_path = posixpath.join(remote_dir, rel)
                ensure_remote_dirs_sftp(sftp, remote_path)
                print(f"➡️  {rel}")
                if not dry_run:
                    sftp.put(local_path, remote_path)
    print("✅ SFTP yükleme tamamlandı")


def upload_ftp(host: str, port: int, user: str, password: str, project_root: str, remote_dir: str, dry_run: bool):
    from ftplib import FTP

    port = port or 21
    ftp = FTP()
    try:
        ftp.connect(host, port, timeout=15)
        ftp.login(user=user, passwd=password)
    except Exception as e:
        raise SystemExit(f"FTP bağlantı hatası: {e}")

    def storbinary(path: str, src: str):
        with open(src, "rb") as f:
            ftp.storbinary(f"STOR {path}", f)

    with ftp:
        for local_path in walk_files(project_root):
            rel = os.path.relpath(local_path, project_root).replace("\\", "/")
            remote_path = posixpath.join(remote_dir, rel)
            ensure_remote_dirs_ftp(ftp, remote_path)
            print(f"➡️  {rel}")
            if not dry_run:
                storbinary(remote_path, local_path)
    print("✅ FTP yükleme tamamlandı")


def main():
    parser = build_arg_parser()
    args = parser.parse_args()

    mode = args.mode.lower()
    if mode == "sftp":
        upload_sftp(
            host=args.host,
            port=args.port or 22,
            user=args.user,
            password=args.password or "",
            key_file=args.key_file or "",
            project_root=args.root,
            remote_dir=args.remote_dir,
            dry_run=args.dry_run,
        )
    else:
        if not args.password:
            raise SystemExit("FTP modunda --password gerekli")
        upload_ftp(
            host=args.host,
            port=args.port or 21,
            user=args.user,
            password=args.password,
            project_root=args.root,
            remote_dir=args.remote_dir,
            dry_run=args.dry_run,
        )


if __name__ == "__main__":
    main()


