from pathlib import Path
import xml.etree.ElementTree as ET
for screen in ['home','attendance','spp','schedule','more','info','leave','contact','messages','grades','calendar','card','account']:
    path=Path('previews')/(screen+'.xml')
    root=ET.parse(path).getroot()
    nodes=list(root.iter('node'))
    assert not any('WebView' in n.get('class','') for n in nodes), f'Embedded browser found in {screen}'
    assert any(n.get('text')=='ATSkolla' for n in nodes), f'Native app not rendered: {screen}'
    assert any(n.get('text')=='Beranda' for n in nodes), f'Navigation missing: {screen}'
crash=Path('previews/crash-log.txt').read_text()
assert 'Process: com.atskolla.parent' not in crash, crash
print('13 native screens verified; no WebView and no app crash')
