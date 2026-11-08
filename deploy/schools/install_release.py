#!/usr/bin/env python3
"""Install only the school frontend, preserving old hashed assets and rollback."""
import argparse
import contextlib
import fcntl
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import tarfile
import tempfile

DEFAULT_ROOT = Path('/www/wwwroot/atskolla-schools')
MAX_SIZE = 1024 * 1024 * 1024


def digest(path):
    result = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            result.update(chunk)
    return result.hexdigest()


def directory(root):
    root = Path(root).absolute()
    if root.name != 'atskolla-schools' or root.is_symlink():
        raise ValueError('Root harus folder tersendiri bernama atskolla-schools, bukan symlink.')
    root.mkdir(parents=True, exist_ok=True)
    for name in ('releases', 'shared-assets'):
        target = root / name
        if target.is_symlink():
            raise ValueError(f'{name} tidak boleh berupa symlink.')
        target.mkdir(exist_ok=True)
    return root


@contextlib.contextmanager
def locked(root, name):
    with (root / name).open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        yield


def atomic_link(root, name, target):
    dest = root / name
    if dest.exists() and not dest.is_symlink():
        raise ValueError(f'{name} sudah berupa folder/file biasa; tidak akan ditimpa.')
    if dest.is_symlink() and dest.resolve().parent != (root / 'releases').resolve():
        raise ValueError(f'{name} menunjuk ke luar folder releases.')
    temp = root / ('.' + name + '-next')
    if temp.exists() and not temp.is_symlink():
        raise ValueError('Ada file sementara yang perlu diperiksa operator.')
    temp.unlink(missing_ok=True)
    os.symlink(str(target), temp)
    os.replace(temp, dest)


def unpack(archive, stage):
    total = 0
    with tarfile.open(archive, 'r:gz') as bundle:
        members = bundle.getmembers()
        if len(members) > 20000:
            raise ValueError('Terlalu banyak file dalam paket.')
        seen = set()
        for member in members:
            path = PurePosixPath(member.name)
            if path.is_absolute() or '..' in path.parts or '\\' in member.name:
                raise ValueError('Path arsip tidak aman.')
            if path == PurePosixPath('.') and member.isdir():
                continue
            if any(p.startswith('.') for p in path.parts) or str(path) in seen:
                raise ValueError('Paket mengandung file tersembunyi atau duplikat.')
            seen.add(str(path))
            if not member.isfile() and not member.isdir():
                raise ValueError('Symlink dan special file tidak diizinkan.')
            total += member.size
            if total > MAX_SIZE:
                raise ValueError('Ukuran paket melebihi batas.')
            target = stage.joinpath(*path.parts)
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                with bundle.extractfile(member) as source, target.open('wb') as output:
                    shutil.copyfileobj(source, output)
                target.chmod(0o644)
    for folder, _, _ in os.walk(stage):
        Path(folder).chmod(0o755)


def install(archive, expected_sha256, root=DEFAULT_ROOT, expected_commit=None, expected_run=None):
    if not re.fullmatch('[0-9a-f]{64}', expected_sha256) or digest(archive) != expected_sha256:
        raise ValueError('Checksum paket tidak sesuai; versi aktif tidak diubah.')
    root = directory(root)
    with locked(root, '.install.lock'):
        stage = Path(tempfile.mkdtemp(prefix='.incoming-', dir=root))
        try:
            unpack(archive, stage)
            info = json.loads((stage / 'atskolla-release.json').read_text())
            commit = info.get('commit', '')
            if info.get('site') != 'atskolla-schools' or not re.fullmatch('[0-9a-f]{40}', commit):
                raise ValueError('Paket bukan rilis frontend sekolah ATSkolla.')
            if expected_commit and commit != expected_commit:
                raise ValueError('Commit paket tidak sesuai hasil build GitHub.')
            if expected_run is not None and str(info.get('run_id')) != str(expected_run):
                raise ValueError('Identitas build tidak sesuai hasil GitHub.')
            if not str(info.get('run_id', '')).isdigit():
                raise ValueError('Identitas build tidak valid.')
            if not (stage / 'index.html').is_file() or not (stage / 'assets').is_dir():
                raise ValueError('Paket frontend belum lengkap.')
            for name in ('current', 'previous'):
                item = root / name
                if item.exists() and not item.is_symlink():
                    raise ValueError(f'{name} bukan symlink; folder lama tidak akan ditimpa.')
                if item.is_symlink() and item.resolve().parent != (root / 'releases').resolve():
                    raise ValueError(f'{name} menunjuk ke luar releases.')
            release = root / 'releases' / commit
            if release.is_symlink():
                raise ValueError('Folder rilis tidak boleh berupa symlink.')
            if release.exists():
                if (release / '.artifact-sha256').read_text() != expected_sha256:
                    raise ValueError('Commit sama tetapi isi paket berbeda. Periksa rilis.')
            else:
                # Publish immutable assets before index.html; retain files used by old tabs.
                for asset in (stage / 'assets').rglob('*'):
                    if not asset.is_file():
                        continue
                    relative = asset.relative_to(stage / 'assets')
                    dest = root / 'shared-assets' / relative
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    if dest.exists():
                        if not dest.is_file() or dest.is_symlink() or digest(dest) != digest(asset):
                            raise ValueError('Nama asset sama tetapi isinya berbeda.')
                        continue
                    handle, temp_name = tempfile.mkstemp(prefix='.asset-', dir=dest.parent)
                    os.close(handle)
                    try:
                        shutil.copyfile(asset, temp_name)
                        Path(temp_name).chmod(0o644)
                        os.replace(temp_name, dest)
                    finally:
                        Path(temp_name).unlink(missing_ok=True)
                (stage / '.artifact-sha256').write_text(expected_sha256)
                os.replace(stage, release)
            current = root / 'current'
            if current.is_symlink() and current.resolve() != release:
                atomic_link(root, 'previous', current.resolve())
            atomic_link(root, 'current', release)
            return info
        finally:
            if stage.exists():
                shutil.rmtree(stage)


def rollback(root=DEFAULT_ROOT):
    root = directory(root)
    with locked(root, '.install.lock'):
        previous = root / 'previous'
        current = root / 'current'
        if not previous.is_symlink() or not current.is_symlink() or not previous.resolve().is_dir():
            raise ValueError('Belum ada rilis sebelumnya untuk rollback.')
        target, old = previous.resolve(), current.resolve()
        if target.parent != (root / 'releases').resolve() or old.parent != target.parent:
            raise ValueError('Target rollback berada di luar releases.')
        (root / '.auto-update-paused').touch()
        atomic_link(root, 'current', target)
        atomic_link(root, 'previous', old)
        return json.loads((target / 'atskolla-release.json').read_text())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=DEFAULT_ROOT)
    sub = parser.add_subparsers(dest='action', required=True)
    task = sub.add_parser('install')
    task.add_argument('archive', type=Path)
    task.add_argument('--sha256', required=True)
    sub.add_parser('rollback')
    args = parser.parse_args()
    try:
        result = rollback(args.root) if args.action == 'rollback' else install(args.archive, args.sha256, args.root)
        print('Rilis aktif:', result['commit'])
    except (ValueError, OSError, tarfile.TarError, KeyError, json.JSONDecodeError) as error:
        parser.exit(1, f'Gagal: {error}\n')


if __name__ == '__main__':
    main()
