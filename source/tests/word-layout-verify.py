#!/usr/bin/env python3
"""Validate downloaded DOCX against its unchanged PDF using a real Writer renderer.
Only synthetic browser fixtures belong in the input/output folder.
Dependencies: LibreOffice, Poppler, Pillow, numpy, lxml.
"""
import argparse,collections,json,os,pathlib,re,subprocess,tempfile,zipfile
from lxml import etree,html
from PIL import Image,ImageFilter,ImageChops
import numpy as np
W='http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS={'w':W,'v':'urn:schemas-microsoft-com:vml','a':'http://schemas.openxmlformats.org/drawingml/2006/main','wp':'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'}
def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.STDOUT)
def pages(path):return int(re.search(r'Pages:\s+(\d+)',run('pdfinfo',str(path))).group(1))
def office_profile(profile):
 # Match the explicit Chromium QA fallback. Writer has its own Arial ->
 # Liberation replacement table, which otherwise bypasses fontconfig for Latin.
 if os.environ.get('FONTCONFIG_FILE','').endswith('word-fonts.conf'):
  folder=pathlib.Path(profile)/'user';folder.mkdir(exist_ok=True)
  pairs=''.join('<node oor:name="_'+str(i)+'" oor:op="replace"><prop oor:name="ReplaceFont"><value>'+font+'</value></prop><prop oor:name="SubstituteFont"><value>DejaVu Sans</value></prop><prop oor:name="Always"><value>true</value></prop><prop oor:name="OnScreenOnly"><value>false</value></prop></node>' for i,font in enumerate(['Arial','Tahoma']))
  (folder/'registrymodifications.xcu').write_text('<?xml version="1.0"?><oor:items xmlns:oor="http://openoffice.org/2001/registry"><item oor:path="/org.openoffice.Office.Common/Font/Substitution"><prop oor:name="Replacement" oor:op="fuse"><value>true</value></prop></item><item oor:path="/org.openoffice.Office.Common/Font/Substitution/FontPairs">'+pairs+'</item></oor:items>')
def render(docx,dest):
 dest.mkdir(exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='sr-word-profile-') as profile:
  office_profile(profile)
  run(os.environ.get('SOFFICE','soffice'),'-env:UserInstallation=file://'+profile,'--headless','--convert-to','pdf','--outdir',str(dest),str(docx))
 return dest/(docx.stem+'.pdf')
def raster(pdf,dest):
 run('pdftoppm','-r','96','-png',str(pdf),str(dest))
 return sorted(dest.parent.glob(dest.name+'-*.png'),key=lambda p:int(p.stem.rsplit('-',1)[1]))
def tokens(value):return collections.Counter(re.findall(r'[\w\u0600-\u06ff]+',value,re.UNICODE))
def document_text(x):return '\n'.join(''.join(p.xpath('./w:r/w:t/text()',namespaces=NS)) for p in x.findall('.//w:p',NS))
def check(docx,skip_render=False):
 mode=docx.stem;folder=docx.parent;ref=folder/(mode+'.pdf');source=json.loads((folder/(mode+'-source.json')).read_text());record={'report':mode,'failures':[]}
 def require(ok,msg):
  if not ok:record['failures'].append(msg)
 with zipfile.ZipFile(docx) as z:
  require(z.testzip() is None,'Invalid ZIP CRC');x=etree.fromstring(z.read('word/document.xml'))
  record.update(tables=len(x.findall('.//w:tbl',NS)),cells=len(x.findall('.//w:tc',NS)),textRuns=len(x.findall('.//w:t',NS)),media=len([n for n in z.namelist() if n.startswith('word/media/')]))
  require(record['tables']>0 and record['cells']>0 and record['textRuns']>0,'Editable table/cell/text missing')
  require(not x.findall('.//w:altChunk',NS),'HTML masquerading as DOCX')
  require(all(t.find('w:tblPr/w:bidiVisual',NS) is not None for t in x.findall('.//w:tbl',NS)),'RTL table missing')
  require(all(r.find('w:trPr/w:cantSplit',NS) is not None for r in x.findall('.//w:tr',NS)),'Split row risk')
  roots=[html.fromstring(s) for s in source['pages']];input_images=set();original=[]
  if mode=='yearComparison':roots=roots[:1]
  for root in roots:
   input_images.update(root.xpath('.//img/@src'))
   for n in root.xpath('.//script|.//style|.//button'):n.drop_tree()
   original.extend(root.itertext())
  require(record['media']<=len(input_images),'Unexpected image parts; page/table rasterization risk')
  for im in x.findall('.//v:imagedata',NS):
   style=im.getparent().get('style','');ww=float(re.search(r'width:([\d.]+)pt',style)[1]);hh=float(re.search(r'height:([\d.]+)pt',style)[1]);require(ww*hh<595*842*.2,'Oversized image; only original logos are allowed')
  for anchor in x.findall('.//wp:anchor',NS):
   if anchor.find('.//a:blip',NS) is not None:
    ext=anchor.find('wp:extent',NS);require(int(ext.get('cx'))*int(ext.get('cy'))<(595*12700)*(842*12700)*.2,'Oversized drawing image; page/table rasterization is forbidden')
  # Names, numbers and Arabic words must survive exactly, independent of object order.
  # Compare complete native cell strings: a narrow source column may wrap
  # a number into two lines, but its value and order must remain intact.
  source_tables=[t for root in roots for t in root.xpath('.//table')]
  actual_tables=x.findall('.//w:tbl',NS)
  if mode!='yearComparison':
   require(len(source_tables)==len(actual_tables),'Table count differs from PDF source')
   # Each source sheet must retain its own tables, not just the document total.
   body=x.find('w:body',NS);page_tables=[p.findall('.//w:tbl',NS) for p in body.findall('w:p',NS)]
   require([len(r.xpath('.//table')) for r in roots]==[len(ts) for ts in page_tables],'Tables moved to a different PDF page')
  normalize=lambda value:re.sub(r'\s+','',value)
  mismatches=[]
  pairs=list(zip(source_tables,actual_tables))
  if mode=='yearComparison':
   # A flowing HTML table can be split into several native Word tables. Check
   # every cell across all fragments; zip(first table) would miss later rows.
   pairs=[(html.fromstring('<div>'+''.join(html.tostring(t,encoding='unicode') for t in source_tables)+'</div>'),x)]
  for ti,(st,at) in enumerate(pairs):
   source_cells=[normalize(c.text_content()) for c in st.xpath('.//tr/*[self::td or self::th]')]
   word_cells=[normalize(''.join(c.xpath('.//w:t/text()',namespaces=NS))) for c in at.findall('.//w:tc',NS)]
   # Continuation cells of row spans are necessarily empty in OOXML.
   if len(word_cells)!=len(source_cells):word_cells=[v for v in word_cells if v];source_cells=[v for v in source_cells if v]
   if source_cells!=word_cells:mismatches.append(ti)
   # Preserve explicit Arabic word boundaries, while allowing the same long
   # word to wrap over two physical lines (overflow-wrap in the PDF source).
   boundary=lambda s:{len(re.sub(r'\s+','',s[:m.start()])) for m in re.finditer(r'(?<=[\u0621-\u06d3])\s+(?=[\u0621-\u06d3])',s)}
   src_text=[' '.join(c.itertext()) for c in st.xpath('.//tr/*[self::td or self::th]')]
   dst_text=[document_text(c) for c in at.findall('.//w:tc',NS)]
   if len(src_text)!=len(dst_text):src_text=[v for v in src_text if v.strip()];dst_text=[v for v in dst_text if v.strip()]
   require(all(boundary(a)<=boundary(b) for a,b in zip(src_text,dst_text)),'Arabic words joined in table cells')
  record['cellContentMismatches']=mismatches;require(not mismatches,'Student/table values or ordering changed')
  # Compare outside-table text separately, preserving every Arabic word.
  outside=[]
  for root in roots:
   for t in root.xpath('.//table'):t.drop_tree()
   outside.extend(root.itertext())
  for t in x.findall('.//w:tbl',NS):t.getparent().remove(t)
  missing=tokens(' '.join(outside))-tokens(document_text(x))
  record['missingTokens']=dict(missing);require(not missing,'Header/footer text missing from editable Word runs')
  record['sections']=len(x.findall('.//w:sectPr',NS));require(record['sections']==len(source['pages']),'Original PDF page boundaries lost')
 if not skip_render:
  dest=folder/(mode+'-physical');out=render(docx,dest);record['pdfPages']=pages(ref);record['wordPages']=pages(out);require(record['pdfPages']==record['wordPages'],'Physical PDF/Word page counts differ')
  a=raster(ref,dest/'reference');b=raster(out,dest/'word');metrics=[]
  for i,(rp,wp) in enumerate(zip(a,b),1):
   refim=Image.open(rp).convert('RGB');wordim=Image.open(wp).convert('RGB');require(abs(refim.width-wordim.width)<3 and abs(refim.height-wordim.height)<3,'A4 orientation/size mismatch')
   if refim.size!=wordim.size:wordim=wordim.resize(refim.size)
   ra=np.array(refim.filter(ImageFilter.GaussianBlur(1.2)),dtype=float);wa=np.array(wordim.filter(ImageFilter.GaussianBlur(1.2)),dtype=float)
   diff=np.abs(ra-wa).mean(2)/255;mae=float(diff.mean())
   foreground=(ra.min(2)<235)|(wa.min(2)<235);colored=(ra.max(2)-ra.min(2)>25)&(ra.min(2)<230)
   ink=float(diff[foreground].mean()) if foreground.any() else 0
   color_error=float(diff[colored].mean()) if colored.any() else 0
   metrics.append({'page':i,'meanRGBError':round(mae,5),'foregroundError':round(ink,5),'coloredAreaError':round(color_error,5)})
   require(ink<.075,'Foreground geometry/text mismatch on page '+str(i))
   require(color_error<.12,'Colored header/table/chart mismatch on page '+str(i))
   require(mae<.035,'Visible layout/color mismatch on page '+str(i)+' (mean RGB error '+str(round(mae,4))+')')
   pair=Image.new('RGB',(refim.width*2,refim.height),'white');pair.paste(refim,(0,0));pair.paste(wordim,(refim.width,0));pair.save(dest/('comparison-'+str(i)+'.png'))
  record['visual']=metrics
 record['status']='FAIL' if record['failures'] else 'PASS';return record
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('folder',type=pathlib.Path);parser.add_argument('--skip-render',action='store_true');parser.add_argument('--jobs',type=int,default=2);args=parser.parse_args();records=[]
 from concurrent.futures import ThreadPoolExecutor
 def verify(doc):
  try:return check(doc,args.skip_render)
  except Exception as e:return {'report':doc.stem,'status':'FAIL','error':str(e)}
 with ThreadPoolExecutor(max_workers=args.jobs) as pool:
  for r in pool.map(verify,sorted(args.folder.glob('*.docx'))):
   records.append(r);print(json.dumps(r,ensure_ascii=False),flush=True)
 (args.folder/'verification.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
 raise SystemExit(0 if records and all(r['status']=='PASS' for r in records) else 1)
