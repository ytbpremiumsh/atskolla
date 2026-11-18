import importlib.util,json,tempfile,threading,unittest
from pathlib import Path
from http.server import ThreadingHTTPServer
from urllib.request import Request,urlopen
from urllib.error import HTTPError
spec=importlib.util.spec_from_file_location('shortlinks',Path(__file__).with_name('server.py'));module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class ShortlinksTest(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.db=Path(self.temp.name)/'links.sqlite3';self.key='a'*40
  self.server=ThreadingHTTPServer(('127.0.0.1',0),module.make_handler(self.db,self.key));self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
 def tearDown(self):self.server.shutdown();self.server.server_close();self.temp.cleanup()
 def request(self,path,method='GET',data=None,key=None):
  headers={'Content-Type':'application/json'}
  if key:headers['Authorization']='Bearer '+key
  request=Request('http://127.0.0.1:'+str(self.server.server_port)+'/shortlink-api'+path,data=json.dumps(data).encode() if data is not None else None,headers=headers,method=method)
  try:
   with urlopen(request) as r:return r.status,json.load(r)
  except HTTPError as e:return e.code,json.load(e)
 def create(self,code='zoom',url='https://example.com/event'):
  return self.request('/links','POST',{'code':code,'target_url':url,'is_active':True},self.key)
 def test_requires_key_for_management(self):
  self.assertEqual(self.request('/links')[0],401);self.assertEqual(self.request('/links','POST',{})[0],401)
 def test_redirect_and_clicks_without_external_database(self):
  self.assertEqual(self.create()[0],200)
  status,data=self.request('/resolve?code=ZOOM');self.assertEqual(status,200);self.assertEqual(data['target_url'],'https://example.com/event')
  self.assertEqual(self.request('/links',key=self.key)[1][0]['click_count'],1)
 def test_inactive_delete_and_unique(self):
  self.create();self.assertEqual(self.create()[0],409)
  row=self.request('/links',key=self.key)[1][0]
  self.request('/links/'+row['id'],'PATCH',{'code':'zoom','target_url':'/artikel','is_active':False},self.key)
  self.assertEqual(self.request('/resolve?code=zoom')[0],404)
  self.request('/links/'+row['id'],'DELETE',key=self.key);self.assertEqual(self.request('/links',key=self.key)[1],[])
 def test_reject_unsafe_urls(self):
  for url in ['javascript:alert(1)','//evil.test','https://user:pass@example.com','/a\\b','https://example.com/\nfoo']:
   self.assertEqual(self.create(url=url)[0],400)
 def test_admin_requires_key(self):
  self.assertEqual(self.request('/links')[0],401)
  self.assertEqual(self.request('/links',method='POST',data={'code':'x','target_url':'/artikel'},key='wrong')[0],401)
 def test_missing_code_not_found(self):self.assertEqual(self.request('/resolve?code=missing')[0],404)
if __name__=='__main__':unittest.main()
