import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch
from install_release import digest, install, rollback
import update

class DeployTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.root = self.base / 'atskolla-schools'

    def package(self, number, extra=None):
        archive = self.base / f'{number}.tar.gz'
        files = {'index.html': f'version {number}', f'assets/main-{number}.js': f'code {number}',
                 'atskolla-release.json': json.dumps({'site':'atskolla-schools', 'commit':str(number)*40, 'run_id':number})}
        files.update(extra or {})
        with tarfile.open(archive, 'w:gz') as tar:
            for name, value in files.items():
                data = value.encode()
                item = tarfile.TarInfo(name)
                item.size = len(data)
                tar.addfile(item, io.BytesIO(data))
        return archive

    def test_atomic_upgrade_retains_assets_and_rollback_pauses(self):
        for number in (1, 2):
            archive = self.package(number)
            install(archive, digest(archive), self.root)
        self.assertEqual((self.root/'current/index.html').read_text(), 'version 2')
        self.assertTrue((self.root/'shared-assets/main-1.js').exists())
        rollback(self.root)
        self.assertEqual((self.root/'current/index.html').read_text(), 'version 1')
        self.assertTrue((self.root/'.auto-update-paused').exists())

    def test_bad_checksum_does_not_create_root(self):
        with self.assertRaises(ValueError):
            install(self.package(1), '0'*64, self.root)
        self.assertFalse(self.root.exists())

    def test_traversal_rejected_without_changing_active(self):
        archive = self.package(1)
        install(archive, digest(archive), self.root)
        malicious = self.package(2, {'../escape':'bad'})
        with self.assertRaises(ValueError):
            install(malicious, digest(malicious), self.root)
        self.assertEqual((self.root/'current/index.html').read_text(), 'version 1')
        self.assertFalse((self.base/'escape').exists())

    def test_wrong_commit_preserves_current(self):
        archive = self.package(1)
        with self.assertRaises(ValueError):
            install(archive, digest(archive), self.root, expected_commit='2'*40)
        self.assertFalse((self.root/'current').exists())

    def test_failed_latest_build_never_downgrades(self):
        run = {'head_branch':'main','event':'push','status':'completed','conclusion':'failure'}
        with patch.object(update, 'request', return_value={'workflow_runs':[run]}) as request:
            self.assertIn('dipertahankan', update.update(self.root, 'fake'))
            self.assertEqual(request.call_count, 1)

    def test_updater_validates_and_installs_artifact(self):
        import zipfile
        archive = self.package(1)
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w') as bundle:
            bundle.write(archive, 'atskolla-schools.tar.gz')
            bundle.writestr('SHA256SUMS', digest(archive)+'  atskolla-schools.tar.gz\n')
        run = {'id':1,'head_sha':'1'*40,'head_branch':'main','event':'push','status':'completed','conclusion':'success'}
        from install_release import directory
        directory(self.root)
        with patch.object(update, 'request', side_effect=[{'workflow_runs':[run]}, {'artifacts':[{'name':'atskolla-schools-vps','expired':False,'id':42}]}, buffer.getvalue()]):
            self.assertIn('aktif', update.update(self.root, 'fake'))
        self.assertEqual((self.root/'current/index.html').read_text(), 'version 1')

if __name__ == '__main__':
    unittest.main()
