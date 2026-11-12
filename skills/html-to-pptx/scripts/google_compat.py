"""Create a Google import copy with an explicit supported font and line slack."""
import argparse, zipfile, math, pathlib, xml.etree.ElementTree as E
p=argparse.ArgumentParser(); p.add_argument('source'); p.add_argument('output'); p.add_argument('--font', required=True); p.add_argument('--width-factor',type=float,default=1.2); p.add_argument('--normalize-roman',action='store_true'); a=p.parse_args()
if not math.isfinite(a.width_factor) or a.width_factor<=0: p.error('width factor must be positive and finite')
if pathlib.Path(a.source).resolve()==pathlib.Path(a.output).resolve(): p.error('Use a separate output copy')
ns={'a':'http://schemas.openxmlformats.org/drawingml/2006/main','p':'http://schemas.openxmlformats.org/presentationml/2006/main'}
with zipfile.ZipFile(a.source) as src, zipfile.ZipFile(a.output,'w',zipfile.ZIP_DEFLATED) as dst:
 for item in src.infolist():
  data=src.read(item.filename)
  if item.filename.startswith('ppt/slides/slide') and item.filename.endswith('.xml'):
   root=E.fromstring(data)
   for sp in root.findall('.//p:sp',ns):
    if sp.find('p:txBody',ns) is None: continue
    ext=sp.find('p:spPr/a:xfrm/a:ext',ns)
    if ext is not None: ext.set('cx',str(round(int(ext.get('cx'))*a.width_factor)))
    for prop in sp.findall('.//a:rPr',ns)+sp.findall('.//a:defRPr',ns)+sp.findall('.//a:endParaRPr',ns):
     for tag in ['latin','ea','cs']:
      f=prop.find('a:'+tag,ns)
      if f is None: f=E.SubElement(prop,'{'+ns['a']+'}'+tag)
      if any(t in f.get('typeface','') for t in ['SemiBold','ExtraBold']): prop.set('b','1')
      f.set('typeface',a.font)
   for run in root.findall('.//a:r',ns):
    t=run.find('a:t',ns)
    if a.normalize_roman and t is not None and t.text and any(c in t.text for c in 'ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ'):
     for c,v in zip('ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ',['I','II','III','IV','V','VI','VII','VIII','IX','X']): t.text=t.text.replace(c,v)
     for f in run.findall('a:rPr/a:latin',ns)+run.findall('a:rPr/a:ea',ns)+run.findall('a:rPr/a:cs',ns): f.set('typeface','Times New Roman')
   data=E.tostring(root,encoding='utf-8',xml_declaration=True)
  dst.writestr(item,data)
print(a.output)
