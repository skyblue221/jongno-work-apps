/* ── 문자 발송 명단 PDF (기안 첨부용) ──
   선택한 봉사자의 활동기간(기관 기록상 첫 활동일 ~ 최근 활동일)과 활동 내용(많이 한 순 최대 3개)을 돌려줍니다.
   교육·모집연계와 연도별 명단(날짜 없음)은 활동기간·내용에서 제외합니다.
   기존 Code.gs의 함수(allData_, volunteerIdentity_, jinwooType_, bucketJinwoo_, normDate_, requireOwner_)를 사용합니다. */
function getSmsPrintData(ids){requireOwner_();return smsPrintData_(allData_(),ids);}
function smsPrintData_(all,ids){
 const want=new Set((ids||[]).map(x=>String(x).trim()).filter(Boolean));
 if(!want.size)throw Error('명단에 넣을 분을 선택해 주세요.');
 if(want.size>1000)throw Error('한 번에 1,000명까지 만들 수 있어요.');
 const resolver=volunteerIdentity_(all),valid=d=>/^\d{4}-\d{2}-\d{2}$/.test(d),info=new Map();
 const typeWord=/^(활동|교육|모집및연계|모집·연계|모집연계|기업\(단체\)활동|기타)$/;
 const add=(key,date,act)=>{
  if(!key||!key.startsWith('id:'))return;
  const id=key.slice(3);date=normDate_(date);if(!want.has(id)||!valid(date))return;
  if(!info.has(id))info.set(id,{first:date,last:date,acts:new Map()});
  const r=info.get(id);if(date<r.first)r.first=date;if(date>r.last)r.last=date;
  act=String(act||'').trim();if(act&&!typeWord.test(act.replace(/\s/g,'')))r.acts.set(act,(r.acts.get(act)||0)+1);
 };
 (all.jinwoo||[]).forEach(r=>{if(jinwooType_(r)!=='활동')return;add(resolver.identity(resolver.nameOf(r.volunteerName),''),r.date,r.activityType);});
 (all.history||[]).forEach(r=>{if(r.kind!=='activity')return;add(resolver.identity(resolver.nameOf(r.name),normDate_(r.birthDate)),r.date,r.category);});
 (all.activity||[]).forEach(r=>{if(['교육','모집·연계'].includes(bucketJinwoo_(r.category)))return;add('id:'+r.personId,r.date,r.category);});
 const out={};
 want.forEach(id=>{
  const r=info.get(id);
  out[id]=r?{firstDate:r.first,lastDate:r.last,activities:Array.from(r.acts.entries()).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'ko')).slice(0,3).map(x=>x[0])}:{firstDate:'',lastDate:'',activities:[]};
 });
 return out;
}
