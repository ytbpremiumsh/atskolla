"""Exercise the real wildcard vhost on an isolated local Nginx instance."""
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

binary = shutil.which('nginx') or '/usr/sbin/nginx'
with tempfile.TemporaryDirectory() as temp:
    root = Path(temp)
    root.chmod(0o755)
    site = root / 'atskolla-schools'
    (site/'current').mkdir(parents=True)
    (site/'shared-assets').mkdir()
    (site/'current/index.html').write_text('ATSkolla school application')
    (site/'shared-assets/old-hash.js').write_text('retained asset')
    config = Path(__file__).with_name('nginx-schools.conf').read_text()
    config = config.replace('listen 80;', 'listen 127.0.0.1:18891;')
    config = config.replace('/www/wwwroot/atskolla-schools', str(site))
    conf = root / 'nginx.conf'
    conf.write_text(f'pid {root}/nginx.pid; error_log stderr; events {{}} http {{ access_log off; {config} }}')
    subprocess.run([binary, '-t', '-p', str(root), '-c', str(conf)], check=True)
    process = subprocess.Popen([binary, '-p', str(root), '-c', str(conf), '-g', 'daemon off;'])
    try:
        def get(host, path):
            req = urllib.request.Request('http://127.0.0.1:18891'+path, headers={'Host':host})
            try:
                with urllib.request.urlopen(req, timeout=2) as response:
                    return response.status, response.read().decode(), response.headers
            except urllib.error.HTTPError as error:
                return error.code, '', error.headers
        for attempt in range(40):
            try:
                result = get('smanegeri1.atskolla.com', '/admin')
                break
            except OSError:
                time.sleep(0.05)
        assert result[0] == 200 and result[1] == 'ATSkolla school application'
        assert result[2]['Cache-Control'] == 'no-store'
        assert get('smanegeri1.atskolla.com', '/assets/old-hash.js')[:2] == (200, 'retained asset')
        assert get('smanegeri1.atskolla.com', '/assets/missing.js')[0] == 404
        assert get('smanegeri1.atskolla.com', '/.env')[0] == 403
        for host in ('atskolla.com', 'www.atskolla.com', 'api.atskolla.com', 'nested.school.atskolla.com', 'atskollagateway.my.id'):
            assert get(host, '/admin')[0] == 404, host
        print('Nginx: school SPA, retained assets, missing assets, private files and excluded hosts verified.')
    finally:
        process.terminate()
        process.wait(timeout=10)
