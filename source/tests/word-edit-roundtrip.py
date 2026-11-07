#!/usr/bin/env python3
"""Edit an actual table value, save through Writer, reopen, render and verify."""
import os,sys,pathlib,zipfile,tempfile,subprocess,re
from lxml import etree as E
folder=pathlib.Path(sys.argv[1]);original=folder/'levels.docx';work=folder/'edit-roundtrip';work.mkdir(exist_ok=True)
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
with zipfile.ZipFile(original) as src,zipfile.ZipFile(work/'changed.docx','w',zipfile.ZIP_DEFLATED) as target:
 x=E.fromstring(src.read('word/document.xml'));cells=x.findall('.//w:tc',ns);cell=next(c for c in cells if ''.join(c.xpath('.//w:t/text()',namespaces=ns)).strip()=='19');t=cell.find('.//w:t',ns);t.text='18.5'
 for name in src.namelist():target.writestr(name,E.tostring(x) if name=='word/document.xml' else src.read(name))
out=work/'saved';out.mkdir(exist_ok=True)
soffice=os.environ.get('SOFFICE','soffice')
with tempfile.TemporaryDirectory(prefix='sr-edit-profile-') as profile:
 from runpy import run_path
 run_path(str(pathlib.Path(__file__).with_name('word-layout-verify.py')))['office_profile'](profile)
 base=[soffice,'-env:UserInstallation=file://'+profile,'--headless']
 subprocess.run(base+['--convert-to','docx:Office Open XML Text','--outdir',str(out),str(work/'changed.docx')],check=True,capture_output=True)
 saved=out/'changed.docx';assert saved.exists(),'Writer must save the edit'
 with zipfile.ZipFile(saved) as z:
  x=E.fromstring(z.read('word/document.xml'));assert any(''.join(c.xpath('.//w:t/text()',namespaces=ns)).strip()=='18.5' for c in x.findall('.//w:tc',ns)),'Edited cell must remain a native Word table value'
 subprocess.run(base+['--convert-to','pdf','--outdir',str(out),str(saved)],check=True,capture_output=True)
 info=subprocess.check_output(['pdfinfo',str(out/'changed.pdf')],text=True);assert re.search(r'Pages:\s+1\b',info),'Editing must retain one physical page'
# The office application must also preserve the layout after rewriting OOXML.
from PIL import Image,ImageFilter
import numpy as np
reference=folder/'levels-physical'/'word-1.png'
assert reference.exists(),'Run word-layout-verify.py before the edit test'
subprocess.run(['pdftoppm','-r','96','-png',str(out/'changed.pdf'),str(out/'changed')],check=True,capture_output=True)
a=Image.open(reference).convert('RGB');b=Image.open(out/'changed-1.png').convert('RGB')
assert a.size==b.size,'Page size changed after editing'
error=float(np.abs(np.array(a.filter(ImageFilter.GaussianBlur(1.2)),dtype=float)-np.array(b.filter(ImageFilter.GaussianBlur(1.2)),dtype=float)).mean()/255)
assert error<.01,f'Formatting changed after Writer save: {error}'
print(f'Round-trip visual error: {error:.5f}')
print('PASS: native table grade 19 → 18.5; saved by Writer, reopened, 1 A4 page')
