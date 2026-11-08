#!/usr/bin/env python3
"""Poll trusted main-branch GitHub builds; update only the school frontend."""
import argparse
import io
import json
from pathlib import Path
import re
import tempfile
import urllib.error
import urllib.request
import zipfile
from install_release import DEFAULT_ROOT, directory, install, locked

BASE = 'https://api.github.com/repos/ytbpremiumsh/atskolla'
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request(path, token, binary=False):
    req = urllib.request.Request(BASE + path, headers={
        'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'ATSkolla-Schools-Updater'})
    try:
        response = urllib.request.build_opener(NoRedirect).open(req, timeout=60)
    except urllib.error.HTTPError as error:
        if binary and error.code in (301, 302, 303, 307, 308):
            url = error.headers.get('Location', '')
            if not url.startswith('https://'):
                raise ValueError('Alamat unduhan GitHub tidak aman.')
            # Signed artifact URL receives NO GitHub Authorization header.
            response = urllib.request.urlopen(url, timeout=60)
        else:
            raise ValueError(f'GitHub HTTP {error.code}; periksa izin Actions read dan Contents read.') from None
    with response:
        data = response.read(300 * 1024 * 1024 + 1)
    if len(data) > 300 * 1024 * 1024:
        raise ValueError('Ukuran respons melebihi batas.')
    return data if binary else json.loads(data)


def update(root, token):
    runs = request('/actions/workflows/schools-vps.yml/runs?branch=main&per_page=1', token)['workflow_runs']
    if not runs:
        return 'Belum ada build.'
    run = runs[0]
    if run['head_branch'] != 'main' or run['event'] not in ('push', 'workflow_dispatch'):
        raise ValueError('Sumber build tidak sesuai.')
    if run['status'] != 'completed' or run['conclusion'] != 'success':
        return 'Build terbaru belum berhasil; versi aktif dipertahankan.'
    commit = run['head_sha']
    current = root / 'current' / 'atskolla-release.json'
    if current.is_file():
        active = json.loads(current.read_text())
        if active['commit'] == commit or int(active['run_id']) >= int(run['id']):
            return 'Sudah menggunakan versi terbaru.'
    artifacts = request(f"/actions/runs/{run['id']}/artifacts?per_page=100", token)['artifacts']
    artifact = next((a for a in artifacts if a['name'] == 'atskolla-schools-vps' and not a['expired']), None)
    if not artifact:
        return 'Paket belum tersedia atau kedaluwarsa; jalankan ulang workflow. Versi aktif dipertahankan.'
    data = request(f"/actions/artifacts/{int(artifact['id'])}/zip", token, binary=True)
    with tempfile.TemporaryDirectory() as temp:
        archive = Path(temp) / 'atskolla-schools.tar.gz'
        with zipfile.ZipFile(io.BytesIO(data)) as bundle:
            for name, limit in [('SHA256SUMS', 200), ('atskolla-schools.tar.gz', 300 * 1024 * 1024)]:
                entries = [i for i in bundle.infolist() if i.filename == name]
                if len(entries) != 1 or entries[0].file_size > limit:
                    raise ValueError('Isi paket unduhan tidak valid.')
            checksum = bundle.read('SHA256SUMS').decode().strip()
            match = re.fullmatch(r'([0-9a-f]{64})\s+\*?atskolla-schools\.tar\.gz', checksum)
            if not match:
                raise ValueError('Format checksum tidak valid.')
            archive.write_bytes(bundle.read('atskolla-schools.tar.gz'))
        # Locally installed installer is trusted; never execute code from downloaded ZIP.
        info = install(archive, match[1], root, expected_commit=commit, expected_run=run['id'])
    return 'Rilis sekolah aktif: ' + info['commit']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=DEFAULT_ROOT)
    parser.add_argument('--token-file', type=Path, default=Path('/etc/atskolla-schools/github-token'))
    parser.add_argument('--resume', action='store_true')
    args = parser.parse_args()
    try:
        root = directory(args.root)
        with locked(root, '.update.lock'):
            pause = root / '.auto-update-paused'
            if args.resume:
                pause.unlink(missing_ok=True)
            if pause.exists():
                print('Pembaruan dijeda setelah rollback; gunakan --resume untuk melanjutkan.')
                return
            if args.token_file.stat().st_mode & 0o077:
                raise ValueError('File token wajib chmod 600.')
            token = args.token_file.read_text().strip()
            if not token:
                raise ValueError('Token GitHub belum diisi.')
            print(update(root, token))
    except Exception as error:
        # Do not print URLs, request headers, signed URLs, or token values.
        if isinstance(error, ValueError):
            parser.exit(1, f'Gagal: {error}\n')
        parser.exit(1, f'Pembaruan gagal ({type(error).__name__}); versi aktif dipertahankan.\n')

if __name__ == '__main__':
    main()
