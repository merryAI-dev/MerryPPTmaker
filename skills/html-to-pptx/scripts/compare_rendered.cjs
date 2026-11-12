// Compare actual target-renderer images, with explicit input provenance.
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const sharp=require('sharp');
async function main(){
 const [manifestFile,output]=process.argv.slice(2);
 if(!manifestFile||!output)throw Error('Usage: node compare_rendered.cjs manifest.json report.json');
 const m=JSON.parse(await fs.readFile(manifestFile,'utf8'));
 if(!m.renderer||!Array.isArray(m.slides)||!m.slides.length)throw Error('Specify renderer and ordered slide pairs');
 const rows=[];
 for(const [i,s] of m.slides.entries()){
  const src=path.resolve(path.dirname(manifestFile),s.source), dst=path.resolve(path.dirname(manifestFile),s.rendered);
  const meta=await sharp(src).metadata(), target=await sharp(dst).metadata();
  const width=meta.width,height=meta.height;
  if(Math.abs(target.width/target.height-width/height)>0.005)throw Error(`Slide ${i+1}: aspect ratio mismatch`);
  const read=p=>sharp(p).resize(width,height).flatten({background:'white'}).removeAlpha().toColourspace('srgb').raw().toBuffer();
  const [a,b]=await Promise.all([read(src),read(dst)]);let changed=0,total=0,brightA=0,brightB=0;
  for(let j=0;j<a.length;j+=3){const delta=Math.max(...[0,1,2].map(k=>Math.abs(a[j+k]-b[j+k])));changed+=delta>0;total+=delta;brightA+=Math.max(...a.subarray(j,j+3))>24;brightB+=Math.max(...b.subarray(j,j+3))>24;}
  const hash=async p=>crypto.createHash('sha256').update(await fs.readFile(p)).digest('hex');
  rows.push({slide:i+1,slideId:s.slideId,source:src,rendered:dst,sourceSha256:await hash(src),renderedSha256:await hash(dst),blackScreen:brightA>0&&brightB<=brightA*.02,changedPixelFraction:changed/(width*height),meanMaxChannelError:total/(width*height)});
 }
 const failed=rows.some(s=>s.blackScreen||s.changedPixelFraction>(m.maxChangedFraction??Infinity)||s.meanMaxChannelError>(m.maxMeanError??Infinity));
 await fs.writeFile(output,JSON.stringify({renderer:m.renderer,presentationId:m.presentationId,capturedAt:m.capturedAt,comparison:'target resized to source canvas; nonzero pixel differences include font and rasterization differences',status:failed?'failed':'rendered',visualReviewRequired:true,slides:rows},null,2)+'\n');
 console.log(output);if(failed)process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
