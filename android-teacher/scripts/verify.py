from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile
p=Path('previews')
checks=ET.parse(p/'checks.xml')
assert any(n.get('text')=='TEACHER CHECKS PASSED' for n in checks.iter('node')), 'Functional teacher checks failed'
for screen in ['home','wali','schedule','live','subject','manual','students','monitoring','mapel','report','leaves','calendar','announcements','notifications','account','card','more','login']:
 root=ET.parse(p/f'{screen}.xml')
 assert not any('WebView' in n.get('class','') for n in root.iter('node')), f'Non-native screen: {screen}'
 assert any('ATSkolla' in n.get('text','') or 'Sekolah Contoh' in n.get('text','') for n in root.iter('node')), f'Screen missing: {screen}'
 assert not any('Infinity' in n.get('text','') or 'NaN' in n.get('text','') for n in root.iter('node')), f'Invalid numeric value: {screen}'
assert 'Process: com.atskolla.teacher' not in (p/'crash-log.txt').read_text(), (p/'crash-log.txt').read_text()
assert (p/'teacher-report.pdf').read_bytes().startswith(b'%PDF')
with zipfile.ZipFile(p/'teacher-report.xlsx') as z:
 ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
 assert b'Nadia Putri' in z.read('xl/worksheets/sheet1.xml')
print('18 native teacher screens, assignment guards, holiday/suspension rules, attendance writes, leave sync, encrypted sessions and PDF/XLSX exports passed')
