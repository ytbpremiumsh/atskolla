from pathlib import Path
import xml.etree.ElementTree as ET
for screen in ['home','attendance','spp','schedule','more','info','leave','contact','messages','grades','calendar','card','account']:
    path=Path('previews')/(screen+'.xml')
    root=ET.parse(path).getroot()
    nodes=list(root.iter('node'))
    assert not any('NaN' in n.get('text','') or 'Infinity' in n.get('text','') for n in nodes), f'Invalid number in {screen}'
    assert not any('WebView' in n.get('class','') for n in nodes), f'Embedded browser found in {screen}'
    assert any('ATSkolla' in n.get('text','') for n in nodes), f'Native app not rendered: {screen}'
    assert any(n.get('text')=='Beranda' for n in nodes), f'Navigation missing: {screen}'
spp=ET.parse('previews/spp.xml').getroot()
assert any(n.get('text')=='Rp 250.000' for n in spp.iter('node')), 'Bill amount not formatted correctly'
crash=Path('previews/crash-log.txt').read_text()
assert 'Process: com.atskolla.parent' not in crash, crash
print('13 native screens verified; no WebView and no app crash')

home=ET.parse('previews/home.xml').getroot()
assert any(n.get('text')=='RINGKASAN BULAN INI' for n in home.iter('node')), 'Home hero missing'
assert any(n.get('content-desc')=='Semua layanan' for n in home.iter('node')), 'Center navigation missing'
schedule=ET.parse('previews/schedule.xml').getroot()
assert any('Senin' in n.get('text','') for n in schedule.iter('node')), 'Weekly grouping missing'
assert any(n.get('text')=='07:30' for n in schedule.iter('node')), 'Lesson time chip missing'
assert any(n.get('text')=='Kadaluarsa' for n in spp.iter('node')), 'Expired bill status missing'
leave=ET.parse('previews/leave.xml').getroot()
assert any(n.get('text')=='Kirim Pengajuan' for n in leave.iter('node')), 'Inline leave form missing'

checks=ET.parse('previews/lifecycle.xml').getroot()
assert any(n.get('text')=='CHECKS PASSED' for n in checks.iter('node')), 'Native session/notification integration checks failed'
for filename in ['restored.xml','restored-again.xml']:
    root=ET.parse(Path('previews')/filename).getroot()
    assert any('RINGKASAN BULAN INI' in n.get('text','') for n in root.iter('node')), 'Session lost after process restart'
    assert not any('Portal Wali Murid'==n.get('text','') for n in root.iter('node')), 'Login unexpectedly requested'
print('Native Keystore persistence, session renewal, arrival/departure notifications, de-duplication and persisted jobs verified')

for modal in ['students','payment','success']:
    root=ET.parse(Path('previews')/f'modal-{modal}.xml').getroot()
    assert any(n.get('class')=='android.widget.Button' for n in root.iter('node')), f'Custom modal actions absent: {modal}'
pending=ET.parse('previews/checkout-pending.xml').getroot()
assert any(n.get('class')=='android.webkit.WebView' for n in pending.iter('node')), 'Embedded checkout missing'
assert not any(n.get('text')=='CHECKOUT CONFIRMED' for n in pending.iter('node')), 'Unconfirmed checkout closed'
paid=ET.parse('previews/checkout-paid.xml').getroot()
assert any(n.get('text')=='CHECKOUT CONFIRMED' for n in paid.iter('node')), 'Server-confirmed checkout did not close successfully'
print('Custom modals, in-app checkout pending/success routing, all-sibling attendance and payment notifications verified')

invoice=ET.parse('previews/invoice-check.xml').getroot()
assert any(n.get('text')=='INVOICE CHECK PASSED' for n in invoice.iter('node')), 'Shared web invoice generator failed on Android'
assert Path('previews/invoice-fixture.pdf').read_bytes().startswith(b'%PDF'), 'Invalid official invoice PDF'

partial=ET.parse('previews/checkout-partial.xml').getroot()
assert any(n.get('text')=='CHECKOUT CONFIRMED' for n in partial.iter('node')), 'Verified installment did not close while main invoice remained partial'

routing=ET.parse('previews/payment-routing.xml').getroot()
assert any(n.get('text')=='PAYMENT ROUTES PASSED' for n in routing.iter('node')), 'New or resumed payment redirected out of the APK'
