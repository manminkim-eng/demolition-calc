// 건축물 해체공사 감리대가 산출기 매뉴얼 화면 캡처 — usage: node capture_demol.js <repoDir> <outDir>
// RTS·EPI·열관류율·업무대가 매뉴얼과 같은 규격: 1440×900 · DSF 1.25 · _marks.json(번호 배지 % 좌표) · _example.json(예제 검증값)
const {chromium}=require(process.env.MM_PW||'playwright');const fs=require('fs');const path=require('path');const {setup,server}=require('./serve');
const repo=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);fs.mkdirSync(out,{recursive:true});
const VW=1440,VH=900,DSF=1.25,PORT=8893;
/* 예제 A = 앱 초기값: 주감리 기술사/건축사 5일 · 보조감리 미투입 · 제경비 110% · 기술료 20% → 공급가액 5,886,933원 · 합계 6,475,000원
   예제 B = 연면적 3,000㎡ 이상(2명): 주감리 기술사/건축사 30일 · 보조감리 고급기술자 24일 · 115% · 30% · 직접경비 1,500,000 · 보험료 300,000 · NEGO 500,000 */
const FREEZE=`(()=>{const T=new Date(2026,9,11,10,0,0).getTime();const D=Date;class F extends D{constructor(...a){if(a.length)super(...a);else super(T);}static now(){return T;}}window.Date=F;window.alert=()=>{};window.confirm=()=>true;try{localStorage.clear()}catch(e){}})()`;
const HELP=`window.__vis=e=>e&&e.getClientRects().length>0;
window.__set=(id,v)=>{const e=document.getElementById(id);e.value=String(v);e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));};
window.__chk=(id,v)=>{const e=document.getElementById(id);if(e.checked!==v)e.click();};
window.__card=(t)=>{const h=[...document.querySelectorAll('.card-title')].find(e=>__vis(e)&&e.textContent.trim()===t);return h?h.closest('.card'):null;};
window.__ref=(i)=>[...document.querySelectorAll('#tab-reference .ref-block')][i]||null;
window.__find=(sel)=>{
 if(sel.startsWith('card:'))return __card(sel.slice(5));
 if(sel.startsWith('ref:'))return __ref(+sel.slice(4));
 if(sel.startsWith('slot:')){return document.querySelector('.worker-slot.'+sel.slice(5));}
 if(sel.startsWith('wrap:')){const e=document.getElementById(sel.slice(5));return e?e.parentElement:null;}
 if(sel.startsWith('a4tbl:')){return document.querySelectorAll('#a4Page table')[+sel.slice(6)]||null;}
 if(sel.startsWith('a4row:')){const [t,r]=sel.slice(6).split('|');const tb=document.querySelectorAll('#a4Page table')[+t];return tb?tb.querySelectorAll('tr')[+r]:null;}
  if(sel.startsWith('itab:')){return [...document.querySelectorAll('.fml-itab')][+sel.slice(5)]||null;}
 for(const s of sel.split(',')){const e=[...document.querySelectorAll(s)].find(__vis);if(e)return e;}return null;};
window.__A=()=>{__set('sup1Grade','professional');__set('sup1Days','5');__set('sup2Grade','none');__set('sup2Days','0');
 __set('overheadRate',110);__set('techFeeRate',20);__set('directExpenses','0');__set('insuranceFee','0');__set('negoAmount','0');__chk('includeVat',true);};
window.__B=()=>{__set('sup1Grade','professional');__set('sup1Days','30');__set('sup2Grade','high');__set('sup2Days','24');
 __set('overheadRate',115);__set('techFeeRate',30);__set('directExpenses','1500000');__set('insuranceFee','300000');__set('negoAmount','500000');__chk('includeVat',true);};`;
const SHOTS=[
 {id:'s01_overview',tab:'input',clip:'viewport',m:[['.tab-bar-inner','작업 탭'],['.sum-bar-wrap','요약 스트립'],['.law-strip','근거 안내'],['.total-banner','실시간 합계'],['card:공사 정보','공사 정보'],['card:인력 투입 설정','인력 투입 설정'],['#fab-group','계산식 안내']]},
 {id:'s02_tabs',tab:'input',clip:'.app-header',union:'.tab-bar',m:[['.tb:nth-of-type(1)','산출 입력'],['.tb:nth-of-type(2)','산출서 미리보기'],['.tb:nth-of-type(3)','법적 근거·요율'],['.tb-manual','매뉴얼'],['.hdr-right','근거 법령·고시']]},
 {id:'s03_project',tab:'input',clip:'card:공사 정보',m:[['#projectName','공사명'],['#supervisorName','감리자'],['#reportDate','작성일']]},
 {id:'s04_staff',tab:'input',clip:'card:인력 투입 설정',m:[['#sup1Grade','주감리 기술등급'],['wrap:sup1Days','투입 일수'],['#mini1','주감리 인건비'],['#sup2Grade','보조감리 — 미투입'],['#mini2','보조감리 인건비']]},
 {id:'s05_rate',tab:'input',clip:'card:산출 요율 설정',m:[['#overheadRate','제경비율 슬라이더'],['#overheadCalc','제경비 계산'],['#techFeeRate','기술료율 슬라이더'],['#techFeeCalc','기술료 계산'],['wrap:includeVat','부가가치세 가산']]},
 {id:'s06_direct',tab:'input',clip:'card:직접 입력 항목',m:[['#directExpenses','직접경비'],['#insuranceFee','보험공제료'],['.nego-box','NEGO 차감액']]},
 {id:'s07_banner',tab:'input',clip:'.sum-bar-wrap',union:'.total-banner',m:[['.sum-bar-wrap','요약 스트립'],['.law-strip','근거 안내'],['#banner-desc','감리기간 · 인원'],['#banner-total','최종 합계'],['#banner-sub','공급가액']]},
 {id:'s08_a4',tab:'result',clip:'viewport',m:[['.mm-btn-print,.a4-export-bar button','인쇄 / PDF 저장'],['#btn-jpg','JPG 저장'],['#a4Page','A4 산출서']]},
 {id:'s09_a4page',tab:'result',clip:'#a4Page',m:[['a4tbl:0','공사 개요'],['a4row:1|1','1. 직접인건비'],['a4row:1|2','2. 제경비'],['a4row:1|3','3. 기술료'],['a4row:1|7','산출 합계(공급가액)'],['a4row:1|9','최종 합계'],['.a4-sign-legal','산출 근거'],['.a4-sign-supervisor','감리자 서명란']]},
 {id:'s10_reference',tab:'reference',clip:'#tab-reference',m:[['ref:0','법적 근거'],['ref:1','2026년 노임단가'],['ref:2','실시간 산출 현황'],['ref:3','감리원 배치 기준'],['ref:4','VAT 과세표준'],['ref:5','최종 점검 3원칙']]},
 {id:'s11_var_input',tab:'input',pre:"__B()",clip:'viewport',m:[['.sum-bar-wrap','요약 스트립'],['.total-banner','실시간 합계'],['card:인력 투입 설정','주감리 · 보조감리'],['card:직접 입력 항목','실비 · NEGO']]},
 {id:'s12_var_staff',tab:'input',clip:'card:인력 투입 설정',m:[['#mini1','주감리 30일'],['#sup2Grade','보조감리 고급기술자'],['wrap:sup2Days','보조감리 24일'],['#mini2','보조감리 인건비']]},
 {id:'s13_var_rate',tab:'input',clip:'card:직접 입력 항목',union:'card:산출 요율 설정',m:[['#directExpenses','직접경비'],['#insuranceFee','보험공제료'],['.nego-box','NEGO 차감액'],['#overheadCalc','제경비 115%'],['#techFeeCalc','기술료 30%']]},
 {id:'s14_var_a4page',tab:'result',clip:'#a4Page',post:"__A()",m:[]},
 {id:'s15_help_howto',tab:'input',pre:"openModal()",wait:1500,fixed:true,clip:'#fmlBox',m:[['itab:0','이용방법'],['itab:1','산정 방식'],['itab:2','계산식 단계'],['itab:3','배치 기준'],['itab:4','핵심 주의사항']]},
 {id:'s16_help_method',tab:null,pre:"document.querySelectorAll('.fml-itab')[1].click();document.querySelector('.fml-bd').scrollTop=0",wait:1500,fixed:true,clip:'#fmlBox',m:[]},
 {id:'s17_help_formula',tab:null,pre:"document.querySelectorAll('.fml-itab')[2].click();document.querySelector('.fml-bd').scrollTop=0",wait:1500,fixed:true,clip:'#fmlBox',m:[]},
 {id:'s18_help_deploy',tab:null,pre:"document.querySelectorAll('.fml-itab')[3].click();document.querySelector('.fml-bd').scrollTop=0",wait:1500,fixed:true,clip:'#fmlBox',m:[]},
 {id:'s19_help_caution',tab:null,pre:"document.querySelectorAll('.fml-itab')[4].click();document.querySelector('.fml-bd').scrollTop=0",wait:1500,fixed:true,post:"closeModal()",clip:'#fmlBox',m:[]},
];
(async()=>{
 const s=await server(repo,PORT);const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:VW,height:VH},deviceScaleFactor:DSF,serviceWorkers:'block'});await setup(ctx);
 const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.addInitScript(FREEZE);
 await pg.goto(`http://127.0.0.1:${PORT}/index.html`);await pg.evaluate(()=>document.fonts.ready);await pg.waitForTimeout(3000);
 await pg.evaluate(HELP);
 const readEx=()=>pg.evaluate(()=>{const q=id=>((document.getElementById(id)||{}).innerText||'').replace(/\s+/g,' ').trim();const s=window._s||{};
  return {banner:q('banner-total'),desc:q('banner-desc'),sub:q('banner-sub'),strip:['sup','days','labor','sub','vat','total'].map(k=>q('sb-'+k)),mini:['mini1','mini2'].map(k=>q(k)),over:q('overheadCalc'),tech:q('techFeeCalc'),
   s:{labor:s.labor,over:s.over,tech:s.tech,de:s.de,ins:s.ins,neg:s.neg,sub:s.sub,vat:s.vatAmt,total:s.total,md:[s.d1,s.d2],l:[s.l1,s.l2],g:[s.g1,s.g2],days:s.days,oR:s.oR,tR:s.tR}};});
 const ex={A:await readEx()};const meta={};
 for(const S of SHOTS){
  if(S.tab){await pg.evaluate(t=>{switchTab(t);window.scrollTo(0,0);},S.tab);await pg.waitForTimeout(600);}
  if(S.pre){try{await pg.evaluate(S.pre);}catch(e){errs.push(S.id+' pre '+e.message);}}
  await pg.waitForTimeout(S.wait||700);
  if(S.id==='s11_var_input')ex.B=await readEx();
  if(S.id==='s14_var_a4page')ex.B_a4=await pg.evaluate(()=>[...document.querySelectorAll('#a4Page table tr')].map(r=>r.innerText.replace(/\s+/g,' ').trim()));
  if(S.id==='s09_a4page')ex.A_a4=await pg.evaluate(()=>[...document.querySelectorAll('#a4Page table tr')].map(r=>r.innerText.replace(/\s+/g,' ').trim()));
  const info=await pg.evaluate(({S,VW,VH})=>{
   const abs=e=>{const r=e.getBoundingClientRect();return {x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:r.height};};
   let clip;
   if(S.clip==='viewport'){clip={x:0,y:scrollY,width:VW,height:VH};}
   else{const el=__find(S.clip);if(!el)return {err:'clip '+S.clip};const a=abs(el);clip={x:a.x,y:a.y,width:a.w,height:a.h};
     if(S.union){const e2=__find(S.union);if(e2){const a2=abs(e2);const x0=Math.min(clip.x,a2.x),y0=Math.min(clip.y,a2.y),x1=Math.max(clip.x+clip.width,a2.x+a2.w),y1=Math.max(clip.y+clip.height,a2.y+a2.h);clip={x:x0,y:y0,width:x1-x0,height:y1-y0};}}}
   const marks=[];(S.m||[]).forEach(([sel,label],i)=>{const e=__find(sel);if(!e){marks.push({n:i+1,label,miss:sel});return;}const a=abs(e);
     marks.push({n:i+1,label,x:+((a.x-clip.x)/clip.width*100).toFixed(2),y:+((a.y-clip.y)/clip.height*100).toFixed(2),w:+(a.w/clip.width*100).toFixed(2),h:+(Math.min(a.h,clip.y+clip.height-a.y)/clip.height*100).toFixed(2)});});
   return {clip,marks};},{S,VW,VH});
  if(info.err){errs.push(S.id+' '+info.err);continue;}
  const c=info.clip;const cl={x:Math.max(0,c.x),y:Math.max(0,c.y),width:Math.min(c.width,VW),height:c.height};
  if(S.clip==='viewport'){await pg.screenshot({path:path.join(out,S.id+'.png'),clip:{x:0,y:0,width:VW,height:VH}});}
  else if(S.fixed){await pg.screenshot({path:path.join(out,S.id+'.png'),clip:{x:c.x-(await pg.evaluate(()=>scrollX)),y:c.y-(await pg.evaluate(()=>scrollY)),width:c.width,height:c.height}});}
  else{await pg.screenshot({path:path.join(out,S.id+'.png'),clip:cl,fullPage:true});}
  meta[S.id]={w:Math.round(cl.width),h:Math.round(cl.height),marks:info.marks};
  if(S.post){try{await pg.evaluate(S.post);}catch(e){errs.push(S.id+' post '+e.message);}await pg.waitForTimeout(500);}
 }
 await pg.evaluate(()=>{switchTab('input');window.scrollTo(0,0)});await pg.waitForTimeout(500);ex.after=await readEx();
 const mctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block',isMobile:true,hasTouch:true});await setup(mctx);
 const mp=await mctx.newPage();await mp.addInitScript(FREEZE);
 await mp.goto(`http://127.0.0.1:${PORT}/index.html`);await mp.waitForTimeout(3000);
 await mp.screenshot({path:path.join(out,'s20_mobile_main.png')});meta['s20_mobile_main']={w:390,h:844,marks:[]};
 await mp.evaluate(()=>{const h=[...document.querySelectorAll('.card-title')].find(e=>e.textContent.trim()==='인력 투입 설정').closest('.card');window.scrollTo(0,h.getBoundingClientRect().top+scrollY-120);});await mp.waitForTimeout(600);
 await mp.screenshot({path:path.join(out,'s21_mobile_input.png')});meta['s21_mobile_input']={w:390,h:844,marks:[]};
 await mp.evaluate(()=>{switchTab('result');window.scrollTo(0,0);});await mp.waitForTimeout(900);
 await mp.screenshot({path:path.join(out,'s22_mobile_a4.png')});meta['s22_mobile_a4']={w:390,h:844,marks:[]};
 fs.writeFileSync(path.join(out,'_marks.json'),JSON.stringify(meta,null,1));fs.writeFileSync(path.join(out,'_example.json'),JSON.stringify(ex,null,1));
 const miss=[];Object.entries(meta).forEach(([k,v])=>v.marks.forEach(m=>{if(m.miss)miss.push(k+':'+m.miss);else if(m.x<0||m.y<0||m.x+m.w>100.5||m.y+m.h>100.5)miss.push(k+':OUT '+m.label+' '+m.x+','+m.y+','+m.w+','+m.h);}));
 console.log(JSON.stringify({A:ex.A,B:ex.B,same:JSON.stringify(ex.A)===JSON.stringify(ex.after),miss,errs:errs.slice(0,15)},null,1));
 await b.close();s.close();
})();
