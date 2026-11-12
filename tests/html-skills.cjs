const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const base=path.resolve(__dirname,'../skills/html-to-pptx/scripts');
const sharp=require(path.join(base,'node_modules/sharp'));
const PptxGenJS=require(path.join(base,'node_modules/pptxgenjs'));
async function main(){
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'html-skills-test-'));
 try{
  const ppt=new PptxGenJS();const s=ppt.addSlide();s.addText('Ⅱ. Editable text',{x:1,y:1,w:4,h:1,fontFace:'Test Sans',color:'FFFFFF',bold:true});
  const icon=await sharp({create:{width:10,height:10,channels:3,background:'red'}}).png().toBuffer();
  s.addImage({data:'image/png;base64,'+icon.toString('base64'),x:1,y:3,w:1,h:1});
  await ppt.writeFile({fileName:path.join(tmp,'in.pptx')});
  let r=spawnSync('python3',[path.join(base,'google_compat.py'),path.join(tmp,'in.pptx'),path.join(tmp,'out.pptx'),'--font','Noto Sans KR','--normalize-roman'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  r=spawnSync('python3',['-c',`import zipfile,xml.etree.ElementTree as E,sys
n={'a':'http://schemas.openxmlformats.org/drawingml/2006/main','p':'http://schemas.openxmlformats.org/presentationml/2006/main'}
with zipfile.ZipFile(sys.argv[1]) as a,zipfile.ZipFile(sys.argv[2]) as b:
 x=E.fromstring(a.read('ppt/slides/slide1.xml'));y=E.fromstring(b.read('ppt/slides/slide1.xml'))
 assert y.find('.//a:t',n).text=='II. Editable text'
 assert y.find('.//a:rPr/a:solidFill/a:srgbClr',n).get('val')=='FFFFFF'
 assert y.find('.//a:rPr',n).get('b')=='1'
 assert int(y.find('.//p:sp/p:spPr/a:xfrm/a:ext',n).get('cx'))==round(int(x.find('.//p:sp/p:spPr/a:xfrm/a:ext',n).get('cx'))*1.2)
 for name in a.namelist():
  if name.startswith('ppt/media/'): assert a.read(name)==b.read(name)
`,path.join(tmp,'in.pptx'),path.join(tmp,'out.pptx')],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  const white=path.join(tmp,'white.png'),black=path.join(tmp,'black.png');for(const [file,color]of [[white,'white'],[black,'black']])await sharp({create:{width:100,height:60,channels:3,background:color}}).png().toFile(file);
  for(const [target,expected]of [[white,0],[black,1]]){
   await fs.writeFile(path.join(tmp,'m.json'),JSON.stringify({renderer:'synthetic-test',maxChangedFraction:0,slides:[{source:white,rendered:target}]}));
   r=spawnSync(process.execPath,[path.join(base,'compare_rendered.cjs'),path.join(tmp,'m.json'),path.join(tmp,'r.json')],{encoding:'utf8'});assert.equal(r.status,expected,r.stderr);
   const report=JSON.parse(await fs.readFile(path.join(tmp,'r.json')));assert.equal(report.slides[0].blackScreen,expected===1);
  }
  console.log('HTML skills: editable text, color, weight, width, media preservation, equality and black-screen failure passed');
 }finally{await fs.rm(tmp,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1});
