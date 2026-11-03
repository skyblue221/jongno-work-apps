/* ── 자원봉사자 중식비 (기안 첨부용 명단) ──
   LUNCH 탭에 한 줄 = 한 사람의 하루 중식비로 저장합니다.
   기존 Code.gs의 함수(ss_, clean_, today_, tz_, withLock_, requireOwner_, records_ 아님)를 사용합니다. */
const LUNCH_TAB='LUNCH';
const LUNCH_HEAD=['기록ID','일자','이름','봉사자ID','비고','프로그램명','시작','종료','총시간','금액','메모','입력일'];
const LUNCH_DEFAULT_AMOUNT=4000;

function lunchSheet_(){
 const ss=ss_();let sh=ss.getSheetByName(LUNCH_TAB);
 if(!sh){
  sh=ss.insertSheet(LUNCH_TAB);
  sh.getRange(1,1,1,LUNCH_HEAD.length).setValues([LUNCH_HEAD]).setFontWeight('bold').setBackground('#143c48').setFontColor('#ffffff');
  sh.setFrozenRows(1);
 }
 sh.getRange('B:B').setNumberFormat('@');sh.getRange('G:H').setNumberFormat('@');
 return sh;
}
function lunchRows_(){
 const sh=ss_().getSheetByName(LUNCH_TAB);if(!sh||sh.getLastRow()<2)return [];
 return sh.getRange(2,1,sh.getLastRow()-1,LUNCH_HEAD.length).getValues().filter(r=>r[0]).map(r=>({
  id:String(r[0]),date:lunchDate_(r[1]),name:String(r[2]||''),personId:String(r[3]||''),note:String(r[4]||''),program:String(r[5]||''),
  start:lunchTime_(r[6]),end:lunchTime_(r[7]),hours:Number(r[8]||0),amount:Number(r[9]||0),memo:String(r[10]||'')}));
}
function lunchDate_(v,tz){
 if(v instanceof Date)return Utilities.formatDate(v,tz||tz_(),'yyyy-MM-dd');
 const s=String(v==null?'':v).trim();if(!s)return '';
 let m=s.match(/^(\d{4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})/);
 if(!m){const k=s.match(/(\d{1,2})월\s*(\d{1,2})\s*,\s*(\d{4})/);if(k)m=['',k[3],k[1],k[2]];}
 if(!m)return '';
 const y=+m[1],mo=+m[2],d=+m[3],dt=new Date(y,mo-1,d);
 if(dt.getFullYear()!==y||dt.getMonth()!==mo-1||dt.getDate()!==d)return '';
 return y+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0');
}
function lunchTime_(v,tz){
 if(v instanceof Date)return Utilities.formatDate(v,tz||tz_(),'H:mm');
 const s=String(v==null?'':v).trim(),m=s.match(/^(\d{1,2}):(\d{2})/);
 return m?Number(m[1])+':'+m[2]:s;
}
function lunchMinutes_(t){const m=String(t||'').match(/^(\d{1,2}):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):null;}
function lunchPersonId_(people,name){
 const base=String(name||'').replace(/\(.*\)$/,'').trim(),hits=people.filter(p=>String(p.name||'').trim()===base);
 return hits.length===1?String(hits[0].id):'';
}

function getLunchMonth_impl_(o){
 const year=Number(o&&o.year),month=Number(o&&o.month);
 if(!Number.isInteger(year)||!Number.isInteger(month)||month<1||month>12)throw Error('연도와 월을 확인해 주세요.');
 const key=year+'-'+String(month).padStart(2,'0'),all=lunchRows_();
 const rows=all.filter(r=>r.date.slice(0,7)===key).sort((a,b)=>a.date.localeCompare(b.date)||(lunchMinutes_(a.start)||0)-(lunchMinutes_(b.start)||0)||a.program.localeCompare(b.program,'ko')||a.name.localeCompare(b.name,'ko'));
 const months=Array.from(new Set(all.map(r=>r.date.slice(0,7)).filter(Boolean))).sort().reverse();
 return {year,month,rows,total:rows.reduce((s,r)=>s+r.amount,0),months};
}
function addLunch_impl_(o){return withLock_(()=>{
 const date=lunchDate_(o&&o.date);if(!date)throw Error('일자를 입력해 주세요.');
 const names=Array.from(new Set(String(o.names||'').split(/[\n,;]+/).map(s=>clean_(s,60)).filter(Boolean)));
 if(!names.length)throw Error('이름을 한 명 이상 입력해 주세요.');
 if(names.length>200)throw Error('한 번에 200명까지 입력할 수 있어요.');
 const program=clean_(o.program,120);if(!program)throw Error('프로그램명을 입력해 주세요.');
 const start=lunchTime_(o.start),end=lunchTime_(o.end),sm=lunchMinutes_(start),em=lunchMinutes_(end);
 if(sm==null||em==null||em<=sm)throw Error('시작·종료 시간을 확인해 주세요.');
 let hours=String(o.hours==null?'':o.hours).trim()===''?(em-sm)/60:Number(o.hours);
 const amount=String(o.amount==null?'':o.amount).trim()===''?LUNCH_DEFAULT_AMOUNT:Number(String(o.amount).replace(/,/g,''));
 if(!Number.isFinite(hours)||hours<0||!Number.isFinite(amount)||amount<0)throw Error('총 시간·금액을 확인해 주세요.');
 hours=Math.round(hours*100)/100;
 const note=clean_(o.note||'비장애인',20),people=ss_().getSheetByName('PEOPLE')?records_('PEOPLE'):[];
 const exist=new Set(lunchRows_().map(r=>r.date+'|'+r.name+'|'+r.start));
 const today=today_(),rows=[],skipped=[];
 names.forEach(n=>{if(exist.has(date+'|'+n+'|'+start)){skipped.push(n);return;}rows.push([Utilities.getUuid(),date,n,lunchPersonId_(people,n),note,program,start,end,hours,amount,clean_(o.memo,200),today]);});
 if(rows.length){const sh=lunchSheet_();sh.getRange(sh.getLastRow()+1,1,rows.length,LUNCH_HEAD.length).setValues(rows);}
 return {added:rows.length,skipped};
});}
function deleteLunch_impl_(id){return withLock_(()=>{
 const sh=ss_().getSheetByName(LUNCH_TAB);if(!sh||sh.getLastRow()<2)throw Error('기록을 찾지 못했어요.');
 const ids=sh.getRange(2,1,sh.getLastRow()-1,1).getValues().map(r=>String(r[0]));
 const i=ids.indexOf(String(id));if(i<0)throw Error('기록을 찾지 못했어요. 다시 불러와 주세요.');
 sh.deleteRow(i+2);return true;
});}

/** 기존 중식비 구글시트에서 가져오기: 「중식비 내역」 탭 + 「○○○○년 ○월 … 중식비 명단 및 내역」 월별 탭.
    같은 일자·이름·시작시간 기록은 건너뜁니다. 원본 시트는 바꾸지 않습니다. */
function importLunchSheet_impl_(link){return withLock_(()=>{
 const id=(String(link||'').match(/[-\w]{25,}/)||[])[0];if(!id)throw Error('중식비 시트 주소를 붙여넣어 주세요.');
 let src;try{src=SpreadsheetApp.openById(id);}catch(e){throw Error('시트를 열지 못했어요. 주소와 공유 권한을 확인해 주세요.');}
 const tz=src.getSpreadsheetTimeZone(),people=records_('PEOPLE'),exist=new Set(lunchRows_().map(r=>r.date+'|'+r.name+'|'+r.start));
 const today=today_(),rows=[],sources=[];let skipped=0,bad=0;
 src.getSheets().forEach(sh=>{
  const name=sh.getName();if(name==='중식비 명단 및 내역')return;   // 월 선택 화면(수식)은 원본 중복이라 제외
  const range=sh.getDataRange(),values=range.getValues(),disp=range.getDisplayValues(),text=v=>String(v==null?'':v).replace(/\s/g,'');
  const h=values.findIndex(r=>r.some(v=>text(v)==='프로그램명')&&r.some(v=>['이름','성명'].includes(text(v))));
  if(h<0)return;
  const head=values[h].map(text),col=n=>head.findIndex(v=>n.includes(v));
  const c={date:col(['일자']),name:col(['이름','성명']),note:col(['장애여부','비고']),program:col(['프로그램명']),time:col(['활동시간']),amount:col(['금액'])};
  if(c.date<0||c.name<0||c.program<0||c.time<0)return;
  let n=0;
  values.slice(h+1).forEach((r,i)=>{
   const shown=disp[h+1+i];   // 시간은 화면에 보이는 글자(예: 10:00)로 읽어 시간대 오차를 피함
   const nm=String(r[c.name]||'').trim();if(!nm||['성명','이름'].includes(nm))return;
   const date=lunchDate_(r[c.date],tz)||lunchDate_(shown[c.date]),start=lunchTime_(shown[c.time]),end=lunchTime_(shown[c.time+1]);
   if(!date||lunchMinutes_(start)==null){bad++;return;}
   const key=date+'|'+nm+'|'+start;if(exist.has(key)){skipped++;return;}exist.add(key);
   const hrs=Number(r[c.time+2]),sm=lunchMinutes_(start),em=lunchMinutes_(end);
   const hours=Number.isFinite(hrs)&&String(r[c.time+2]).trim()!==''?hrs:(em!=null&&sm!=null?(em-sm)/60:0);
   const amt=c.amount>=0?Number(String(r[c.amount]).replace(/[,\s원]/g,'')):NaN;
   rows.push([Utilities.getUuid(),date,clean_(nm,60),lunchPersonId_(people,nm),clean_(c.note>=0?r[c.note]:'',20),clean_(r[c.program],120),start,end,Math.round(hours*100)/100,Number.isFinite(amt)&&amt>0?amt:LUNCH_DEFAULT_AMOUNT,'기존 중식비 시트 「'+name+'」에서 가져옴',today]);n++;
  });
  if(n)sources.push(name+' '+n+'건');
 });
 if(rows.length){const sh=lunchSheet_();sh.getRange(sh.getLastRow()+1,1,rows.length,LUNCH_HEAD.length).setValues(rows);}
 return {added:rows.length,skipped,bad,sources};
});}

/** 선택한 달 명단을 서식 있는 엑셀(.xlsx)로: 임시 시트를 만들어 내보낸 뒤 휴지통으로 */
function getLunchXlsx_impl_(o){
 const d=getLunchMonth_impl_(o);if(!d.rows.length)throw Error('해당 월 중식비 기록이 없어요.');
 const title=d.year+'년 '+d.month+'월 자원봉사자 중식비 명단 및 내역',tmp=SpreadsheetApp.create(title);
 try{
  const sh=tmp.getSheets()[0].setName('중식비 명단'),wd=['일','월','화','수','목','금','토'];
  const body=d.rows.map((r,i)=>{const [y,m,dd]=r.date.split('-').map(Number);return [i+1,y+'년 '+m+'월 '+dd+'일 '+wd[new Date(y,m-1,dd).getDay()]+'요일',r.name,r.note,r.program,r.start,r.end,r.hours,r.amount];});
  sh.getRange(1,1,1,9).merge().setValue(title).setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  sh.getRange(2,1,1,9).merge().setValue('중식비 합계: '+d.total.toLocaleString('ko-KR')+'원 ('+d.rows.length+'건)').setHorizontalAlignment('right').setFontWeight('bold');
  sh.getRange(3,1,1,9).setValues([['구분','일자','성명','비고','프로그램명','시작','종료','총 시간','금액']]).setFontWeight('bold').setBackground('#e8e8e8');
  sh.getRange(4,1,body.length,9).setNumberFormat('@').setValues(body.map(r=>r.map(String)));
  sh.getRange(4,8,body.length,1).setNumberFormat('0.0').setValues(body.map(r=>[r[7]]));
  sh.getRange(4,9,body.length,1).setNumberFormat('#,##0').setValues(body.map(r=>[r[8]]));
  const last=3+body.length;
  sh.getRange(last+1,1,1,8).merge().setValue('합계').setHorizontalAlignment('center').setFontWeight('bold');
  sh.getRange(last+1,9).setValue(d.total).setNumberFormat('#,##0').setFontWeight('bold');
  sh.getRange(3,1,body.length+2,9).setBorder(true,true,true,true,true,true).setVerticalAlignment('middle');
  sh.getRange(3,1,body.length+2,4).setHorizontalAlignment('center');sh.getRange(3,6,body.length+2,4).setHorizontalAlignment('center');
  [45,170,80,70,250,55,55,60,70].forEach((w,i)=>sh.setColumnWidth(i+1,w));sh.setFrozenRows(3);
  if(sh.getMaxRows()>last+1)sh.deleteRows(last+2,sh.getMaxRows()-last-1);
  if(sh.getMaxColumns()>9)sh.deleteColumns(10,sh.getMaxColumns()-9);
  SpreadsheetApp.flush();
  const res=UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/'+tmp.getId()+'/export?format=xlsx',{headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},muteHttpExceptions:true});
  if(res.getResponseCode()!==200)throw Error('엑셀 파일을 만들지 못했어요. 잠시 뒤 다시 눌러 주세요.');
  return {name:title+'.xlsx',base64:Utilities.base64Encode(res.getBlob().getBytes())};
 }finally{DriveApp.getFileById(tmp.getId()).setTrashed(true);}
}

function getLunchMonth(o){requireOwner_();return getLunchMonth_impl_(o);}
function addLunch(o){requireOwner_();return addLunch_impl_(o);}
function deleteLunch(id){requireOwner_();return deleteLunch_impl_(id);}
function importLunchSheet(link){requireOwner_();return importLunchSheet_impl_(link);}
function getLunchXlsx(o){requireOwner_();return getLunchXlsx_impl_(o);}
