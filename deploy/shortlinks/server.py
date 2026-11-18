#!/usr/bin/env python3
"""Independent shortlinks: Python standard library + SQLite, bound to localhost."""
import argparse, hashlib, hmac, json, os, re, sqlite3, sys
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs
CODE=re.compile(r'^[a-z0-9_-]{1,100}$')

def target(value):
 if not isinstance(value,str) or not value.strip(): raise ValueError('URL tujuan wajib diisi')
 value=value.strip(); url=urlparse(value)
 if any(ord(c)<32 for c in value) or '\\' in value: raise ValueError('URL tidak valid')
 if url.scheme:
  if url.scheme not in ('http','https') or not url.netloc or url.username or url.password: raise ValueError('Gunakan URL HTTP/HTTPS')
 elif not value.startswith('/') or value.startswith('//'): raise ValueError('URL internal harus diawali satu /')
 return value

def connect(path):
 db=sqlite3.connect(path,timeout=10);db.row_factory=sqlite3.Row
 db.execute('PRAGMA journal_mode=WAL')
 db.execute('CREATE TABLE IF NOT EXISTS links(id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, target_url TEXT NOT NULL, title TEXT, description TEXT, is_active INTEGER NOT NULL DEFAULT 1, click_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)')
 db.commit();return db

def payload(data):
 code=str(data.get('code','')).strip().lower()
 if not CODE.fullmatch(code): raise ValueError('Kode hanya huruf, angka, - atau _')
 if not isinstance(data.get('is_active',True),bool): raise ValueError('Status harus benar atau salah')
 return code,target(data.get('target_url')),str(data.get('title') or '')[:300],str(data.get('description') or '')[:2000],int(data.get('is_active',True))

def make_handler(db_path,token):
 class Handler(BaseHTTPRequestHandler):
  def log_message(self,*args): pass # Avoid writing tokens, codes or destinations to generic access logs.
  def respond(self,status,data):
   raw=json.dumps(data).encode();self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
  def do_GET(self):self.handle_request()
  def do_POST(self):self.handle_request()
  def do_PATCH(self):self.handle_request()
  def do_DELETE(self):self.handle_request()
  def handle_request(self):
   route=urlparse(self.path);path=route.path.removeprefix('/shortlink-api').rstrip('/')
   if path=='/health' and self.command=='GET':return self.respond(200,{'service':'atskolla-shortlinks','version':1})
   try:
    with connect(db_path) as db:
     if path=='/resolve' and self.command=='GET':
      code=parse_qs(route.query).get('code',[''])[0].strip().lower()
      if not CODE.fullmatch(code):return self.respond(404,{'error':'not_found'})
      row=db.execute('SELECT id,target_url FROM links WHERE code=? AND is_active=1',(code,)).fetchone()
      if not row:return self.respond(404,{'error':'not_found'})
      destination=target(row['target_url'])
      db.execute('UPDATE links SET click_count=click_count+1 WHERE id=?',(row['id'],))
      return self.respond(200,{'target_url':destination})
     expected='Bearer '+token
     if not token or not hmac.compare_digest(self.headers.get('Authorization',''),expected):return self.respond(401,{'error':'unauthorized'})
     if path=='/links' and self.command=='GET':
      rows=[dict(r) for r in db.execute('SELECT * FROM links ORDER BY created_at DESC')]
      for row in rows:row['is_active']=bool(row['is_active'])
      return self.respond(200,rows)
     identifier=path[len('/links/'):] if path.startswith('/links/') else None
     if identifier and self.command=='DELETE':
      db.execute('DELETE FROM links WHERE id=?',(identifier,));return self.respond(200,{'ok':True})
     if (path=='/links' and self.command=='POST') or (identifier and self.command=='PATCH'):
      size=int(self.headers.get('Content-Length','0'))
      if size<1 or size>16384:return self.respond(400,{'error':'invalid_body'})
      data=json.loads(self.rfile.read(size));values=payload(data)
      if identifier:
       cursor=db.execute('UPDATE links SET code=?,target_url=?,title=?,description=?,is_active=? WHERE id=?',(*values,identifier))
       if not cursor.rowcount:return self.respond(404,{'error':'not_found'})
      else:
       import uuid
       db.execute('INSERT INTO links(id,code,target_url,title,description,is_active,created_at) VALUES(?,?,?,?,?,?,?)',(str(uuid.uuid4()),*values,datetime.now(timezone.utc).isoformat()))
      return self.respond(200,{'ok':True})
     return self.respond(404,{'error':'not_found'})
   except sqlite3.IntegrityError:return self.respond(409,{'error':'Kode sudah digunakan'})
   except (ValueError,TypeError,KeyError):return self.respond(400,{'error':'Data atau URL tidak valid'})
   except Exception:return self.respond(503,{'error':'Layanan belum tersedia'})
 return Handler

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--import-json');parser.add_argument('--port',type=int,default=8788);args=parser.parse_args()
 path=Path(os.environ.get('SHORTLINK_DB','/var/lib/atskolla-shortlinks/links.sqlite3'))
 path.parent.mkdir(parents=True,exist_ok=True);os.chmod(path.parent,0o700)
 if args.import_json:
  data=json.loads(Path(args.import_json).read_text())
  with connect(path) as db:
   for row in data:
    values=payload(row)
    db.execute('INSERT INTO links(id,code,target_url,title,description,is_active,click_count,created_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(code) DO NOTHING',(row['id'],*values,max(0,int(row.get('click_count',0))),row['created_at']))
  print('Impor selesai; kode yang sudah ada tidak ditimpa.');return
 token=os.environ.get('SHORTLINK_ADMIN_TOKEN','')
 if len(token)<32:sys.exit('Atur SHORTLINK_ADMIN_TOKEN acak minimal 32 karakter sebelum menjalankan server.')
 connect(path).close();os.chmod(path,0o600)
 ThreadingHTTPServer(('127.0.0.1',args.port),make_handler(path,token)).serve_forever()
if __name__=='__main__':main()
