/** 후원 업무 도우미 v1 · 구글 시트에 연결된 Apps Script
 *  - CMS 출금: 금결원 엑셀을 올리면 누적 저장 → 출금일별 대장(인쇄·PDF), 오케스트라 명단
 *  - 정기후원 이체결과: CMS 정상출금 + 통장 정기후원 → 월별 실인원·명단
 *  개인정보: 계좌번호는 끝 4자리, 연락처는 앞 3자리만 남기고 가려서 저장합니다.
 *            주민등록번호는 앞자리와 성별 숫자(1~4)만 저장합니다.
 */
const TABS = {
  CMS:   {name:'CMS_누적',   head:['키','출금일','후원자번호','후원자명','주민번호앞자리','은행','계좌번호(가림)','연락처(가림)','출금의뢰금액','통장기재내용','출금형태','정상출금액','오류코드','오류내용','수수료','가져온일시']},
  BANK:  {name:'통장정기후원', head:['기록ID','입금일','후원자명','생년월일','성별숫자','금액','플랫폼','메모','입력일']},
  DONOR: {name:'후원자정보',   head:['후원자번호','후원자명','성별숫자(1~4)','오케스트라 지정(Y)','메모','종결일','업체(Y)']},
  NEW:   {name:'신규후원자',   head:['기록ID','등록일자','업체 및 후원자명','후원 내용','입력일']},
  REGULAR:{name:'정기후원지정', head:['후원자명','메모','지정일']},
  YEAR:  {name:'연간기록',     head:['연도','지정 세입건수','비지정 세입건수','지정 이월','지정 수입','지정 사업비','지정 이월사용','지정 반환','지정 차년도이월','비지정 이월','비지정 수입','비지정 사업비','비지정 이월사용','비지정 반환','비지정 차년도이월','물품수입건수','물품수입수량','물품수입금액','물품사용건수','물품사용수량','물품사용금액','등록후원자','신규후원자','정기후원자','비정기후원자','기부금 개인','기부금 단체','후원품 개인','후원품 단체','비고','저장일시']},
  CERT:  {name:'발급대장',     head:['발급번호','발급일','소속','성명','용도','계인','비고','종류','기부기간','기부총액','기록일시','출력보관내용(JSON)','담당자','후원내용']},
  ACCESS:{name:'권한',         head:['이메일','이름·역할','볼 수 있는 화면','부여일','만료일']},
  MONTH: {name:'월별기록',     head:['연도','월','지정이월','지정수입','지정지출','지정차인','비지정이월','비지정수입','비지정지출','비지정차인','후원금 총이월','후원금 총수입','후원금 총지출','후원금 총차인','물품수입건수','물품수입수량','물품수입금액','물품사용건수','물품사용수량','물품사용금액','비고','저장일시','지정 누적수입','지정 누적지출','비지정 누적수입','비지정 누적지출']}
};
const FEE_OK = 140, FEE_ERROR = 20;   // 정상 출금 140원, 오류 20원
// 앞자리 0이 사라지거나 날짜로 바뀌지 않게 글자 서식으로 두는 열 (CMS: 2 출금일 · 16 가져온일시 포함 — 저장 확인이 날짜 변환 때문에 실패하지 않도록, 2026-11-11)
const TEXT_COLS = {CMS:[2,3,5,7,8,13,16], BANK:[4,5], DONOR:[1,3], NEW:[2], REGULAR:[1]};

/* ── 기본 ── */
function ss_(){if(_SS)return _SS;const s=_SS=SpreadsheetApp.getActiveSpreadsheet();if(!s)throw Error('구글 시트에 연결된 Apps Script에서 실행해 주세요.');return s;}
function tz_(){return Session.getScriptTimeZone()||'Asia/Seoul';}
function today_(){return Utilities.formatDate(new Date(),tz_(),'yyyy-MM-dd');}
function now_(){return Utilities.formatDate(new Date(),tz_(),'yyyy-MM-dd HH:mm');}
function owner_(){
  let me='',owner='';
  try{me=String(Session.getActiveUser().getEmail()||'').toLowerCase();}catch(e){}
  try{owner=String(Session.getEffectiveUser().getEmail()||'').toLowerCase();}catch(e){}
  return !!me&&me===owner;
}
function requireOwner_(){if(!owner_())throw Error('이 기능은 담당자만 사용할 수 있습니다.');}
function doGet(){
  if(!role_())return HtmlService.createHtmlOutput('<p style="font-family:sans-serif;padding:24px">접근 권한이 없습니다.</p>').setTitle('후원 업무 도우미');
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('후원 업무 도우미').addMetaTag('viewport','width=device-width, initial-scale=1');
}
/* 한 번 실행하는 동안 같은 탭을 여러 번 읽지 않도록 기억해 둠 (저장할 때는 비움) */
let _SS=null,_TAB={},_ROWS={},_CMS=null,_SAVE_LOCK_HELD=false;
function clearMemo_(){_ROWS={};_CMS=null;}
function tab_(key){
  if(_TAB[key])return _TAB[key];
  const t=TABS[key],ss=ss_();let sh=ss.getSheetByName(t.name);
  if(!sh){sh=ss.insertSheet(t.name);sh.getRange(1,1,1,t.head.length).setValues([t.head]).setFontWeight('bold').setBackground('#143c48').setFontColor('#ffffff');sh.setFrozenRows(1);
    (TEXT_COLS[key]||[]).forEach(c=>sh.getRange(2,c,sh.getMaxRows()-1,1).setNumberFormat('@'));}
  else if(key!=='MONTH'&&key!=='CERT'){ // 새로 추가된 칸이 있으면 머리글을 덧붙임 (월별기록은 머리글 이름으로 따로 처리)
    const n=t.head.length;if(sh.getMaxColumns()<n)sh.insertColumnsAfter(sh.getMaxColumns(),n-sh.getMaxColumns());
    const head=sh.getRange(1,1,1,n).getValues()[0];
    if(head.some((v,i)=>String(v).trim()===''&&i>0))sh.getRange(1,1,1,n).setValues([t.head.map((h,i)=>String(head[i]).trim()||h)]);}
  _TAB[key]=sh;
  if(key==='CERT')organizeCertSheetOnce_(sh);
  return sh;
}
function rows_(key){
  if(_ROWS[key])return _ROWS[key].map(r=>r.slice());
  // 저장해 둔 것이 있으면 시트를 읽지 않음 (그 탭에 저장하거나 시트에서 직접 고치면 새로 읽음)
  if(!_SAVE_LOCK_HELD){const hit=cacheGet_(key);if(hit)return (_ROWS[key]=hit).map(r=>r.slice());}
  _ROWS[key]=rowsRead_(key);
  if(!_SAVE_LOCK_HELD)cachePut_(key,_ROWS[key]);
  return _ROWS[key].map(r=>r.slice());
}
function rowsRead_(key){
  const sh=tab_(key),last=sh.getLastRow();if(last<2)return [];
  const w=TABS[key].head.length;let raw;
  if(key==='CERT'){const columns=certDataColumns_(sh),actual=sh.getRange(2,1,last-1,columns.head.length).getValues();raw=actual.map(r=>TABS.CERT.head.map(h=>r[columns.index[h]]));}
  else raw=sh.getRange(2,1,last-1,w).getValues();
  fillMissingKeys_(key,sh,raw);
  return raw.map(r=>r.map(v=>v instanceof Date?Utilities.formatDate(v,tz_(),'yyyy-MM-dd'):v));
}

/* ── 읽기 임시 저장(캐시) ──
   예전에는 화면을 열 때마다 CMS 누적 시트 전체를 새로 읽었어요.
   이제 탭마다 '버전'을 두고, 그 탭에 저장하거나 시트에서 직접 고친 경우에만 다시 읽어요. (최대 6시간 보관) */
let _REVS=null;
function revs_(){if(_REVS)return _REVS;try{_REVS=PropertiesService.getDocumentProperties().getProperties();}catch(e){_REVS={};}return _REVS;}
function cachePrefix_(key){return ss_().getId()+':rows-v1:'+key+':'+(revs_()['donationRev:'+key]||'0');}
function cacheGet_(key){return chunkGet_(cachePrefix_(key));}
function cachePut_(key,rows){chunkPut_(cachePrefix_(key),rows);}
function chunkGet_(prefix){
  try{const c=CacheService.getScriptCache(),m=JSON.parse(c.get(prefix)||'null');
    if(!m||!(m.count>0))return null;
    const keys=Array.from({length:m.count},(_,i)=>prefix+':'+m.token+':'+i),parts=c.getAll(keys);
    if(!keys.every(k=>typeof parts[k]==='string'))return null;
    return JSON.parse(keys.map(k=>parts[k]).join(''));
  }catch(e){return null;}
}
function chunkPut_(prefix,value){
  try{const c=CacheService.getScriptCache(),json=JSON.stringify(value),count=Math.ceil(json.length/30000);
    if(!count||count>120)return;   // 너무 크면 그냥 시트에서 읽음
    const token=Utilities.getUuid().slice(0,8),parts={};
    for(let i=0;i<count;i++)parts[prefix+':'+token+':'+i]=json.slice(i*30000,(i+1)*30000);
    c.putAll(parts,21600);c.put(prefix,JSON.stringify({count,token}),21600);
  }catch(e){/* 임시 저장은 실패해도 괜찮아요 */}
}
/** 계산 결과도 기억: 쓰는 탭들의 버전이 그대로면 다시 계산하지 않음
   (대시보드·월별 이체내역은 CMS 몇 년 치를 열 때마다 다시 계산해서 4~6초 걸렸어요) */
function resultCached_(name,deps,fn){
  const r=revs_(),prefix=ss_().getId()+':result-v1:'+name+':'+deps.map(k=>r['donationRev:'+k]||'0').join('.');
  if(!_SAVE_LOCK_HELD){const hit=chunkGet_(prefix);if(hit)return hit;}
  const v=fn();
  if(!_SAVE_LOCK_HELD)chunkPut_(prefix,v);
  return v;
}
/* 미리 계산해 두기: 기억은 6시간이 지나면 사라져요. 편집기에서 installWarmTrigger를 한 번 ▶실행하면
   4시간마다 warmCache가 자동으로 돌며 대시보드와 이번 달 이체내역을 미리 계산해 둬요. */
function warmCache(){const t=today_();donationDashboardCached_(Number(t.slice(0,4)));monthlyTransferCached_(t.slice(0,7));}
function installWarmTrigger(){
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='warmCache').forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('warmCache').timeBased().everyHours(4).create();
  warmCache();
  Logger.log('4시간마다 미리 계산하기를 켰어요.');
}
/** 이 탭들은 다음에 시트에서 새로 읽게 함 (안 주면 전부) */
function invalidateRows_(keys){
  const list=keys&&keys.length?keys:Object.keys(TABS),u=Utilities.getUuid().slice(0,8),o={};
  list.forEach(k=>o['donationRev:'+k]=u);
  try{PropertiesService.getDocumentProperties().setProperties(o);}catch(e){}
  _REVS=null;
}
/** 시트에서 직접 고치면(붙여넣기 포함) 그 탭만 다시 읽게 함 */
function onEdit(e){
  try{const name=e&&e.range&&e.range.getSheet().getName(),key=Object.keys(TABS).find(k=>TABS[k].name===name);if(key)invalidateRows_([key]);}catch(err){}
}
/* 발급대장은 열 제목으로 읽고 씁니다. 아래 순서는 화면 정리용이며 저장 위치를 강제하지 않습니다. */
const CERT_COLUMN_ORDER=['발급번호','발급일','종류','성명','기부기간','기부총액','후원내용','용도','담당자','비고','소속','계인','기록일시','출력보관내용(JSON)'];
function certColumns_(sh){
  const head=sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getValues()[0].map(v=>String(v).trim()),index={};
  head.forEach((h,i)=>{if(!h)return;if(Object.prototype.hasOwnProperty.call(index,h))throw Error('발급대장에 같은 열 제목이 두 번 있어요: '+h);index[h]=i;});
  return {head,index};
}
function certDataColumns_(sh){const columns=certColumns_(sh),missing=TABS.CERT.head.filter(h=>columns.index[h]===undefined);
  if(missing.length)throw Error('발급대장 열 제목을 확인해주세요: '+missing.join(', '));return columns;}
function ensureCertHeaders_(sh){
  let columns=certColumns_(sh);
  if(sh.getLastRow()>1){const missing=TABS.CERT.head.slice(0,11).filter(h=>columns.index[h]===undefined);if(missing.length)throw Error('발급대장 열 제목을 확인해주세요: '+missing.join(', '));}
  for(const h of TABS.CERT.head){if(columns.index[h]!==undefined)continue;const col=columns.head.length+1;
    if(sh.getMaxColumns()<col)sh.insertColumnsAfter(sh.getMaxColumns(),col-sh.getMaxColumns());sh.getRange(1,col).setValue(h);columns=certColumns_(sh);}
}
function organizeCertSheetOnce_(sh){
  const props=PropertiesService.getScriptProperties(),key='CERT_COLUMNS_BY_TITLE_V1_'+ss_().getId()+'_'+sh.getSheetId();
  if(props.getProperty(key)==='done')return;
  const lock=LockService.getScriptLock(),acquired=!_SAVE_LOCK_HELD&&!lock.hasLock();if(acquired)lock.waitLock(20000);
  try{if(props.getProperty(key)==='done')return;ensureCertHeaders_(sh);
    let columns=certColumns_(sh);const needsMove=CERT_COLUMN_ORDER.some((h,i)=>columns.head[i]!==h);
    if(needsMove&&sh.getLastRow()>1){const backup=sh.copyTo(ss_());backup.setName('발급대장_정리전_'+Utilities.formatDate(new Date(),tz_(),'yyyyMMdd_HHmmss')+'_'+Utilities.getUuid().slice(0,6));backup.hideSheet();}
    const last=sh.getLastRow();
    if(last>1){const data=sh.getRange(2,1,last-1,columns.head.length).getValues();
      data.forEach((r,i)=>{const cell=sh.getRange(i+2,columns.index['후원내용']+1);if(String(r[columns.index['후원내용']]||'').trim()||cell.getFormula())return;
        let saved;try{saved=JSON.parse(String(r[columns.index['출력보관내용(JSON)']]||''));}catch(e){return;}
        if(saved&&typeof saved.item==='string'&&saved.item)cell.setValue(text_(saved.item,500));});}
    for(let i=0;i<CERT_COLUMN_ORDER.length;i++){columns=certColumns_(sh);const from=columns.index[CERT_COLUMN_ORDER[i]];if(from!==i)sh.moveColumns(sh.getRange(1,from+1,sh.getMaxRows(),1),i+1);}
    SpreadsheetApp.flush();props.setProperty(key,'done');
  }finally{if(acquired)lock.releaseLock();}
}
function appendCertRow_(row){const sh=tab_('CERT'),columns=certDataColumns_(sh),actual=Array(columns.head.length).fill('');
  TABS.CERT.head.forEach((h,i)=>actual[columns.index[h]]=row[i]==null?'':row[i]);sh.appendRow(actual);}
function writeCertRow_(number,row){const sh=tab_('CERT'),columns=certDataColumns_(sh),range=sh.getRange(number,1,1,columns.head.length);
  const values=range.getValues()[0],formulas=range.getFormulas()[0],actual=values.map((v,i)=>formulas[i]||v);
  TABS.CERT.head.forEach((h,i)=>actual[columns.index[h]]=row[i]==null?'':row[i]);range.setValues([actual]);
}

/** 시트에 직접 붙여 넣은 예전 기록: 비어 있는 ID·키·수수료를 자동으로 채워 저장 */
function fillMissingKeys_(key,sh,raw){
  const changed=[];
  raw.forEach((r,i)=>{
    const hasData=r.slice(1).some(v=>String(v==null?'':v).trim()!=='');
    if(!hasData)return;
    if((key==='BANK'||key==='NEW')&&!String(r[0]).trim()){r[0]=Utilities.getUuid();changed.push([i,0]);}
    if(key==='CMS'){
      const date=ymd_(r[1]),no=String(r[2]==null?'':r[2]).trim();
      if(!String(r[0]).trim()&&date&&no){r[0]=date+'|'+no;changed.push([i,0]);}
      if(String(r[14]==null?'':r[14]).trim()===''&&hasResult_(r[12],r[13],r[11])){r[14]=feeOf_(r[12],r[13],r[11]);changed.push([i,14]);}
    }
  });
  // 바뀐 열만 한 번에 저장 (줄이 많아도 빠르게)
  Array.from(new Set(changed.map(c=>c[1]))).forEach(col=>sh.getRange(2,col+1,raw.length,1).setValues(raw.map(r=>[r[col]])));
  return changed.length;
}
/** 편집기에서 한 번 실행해도 돼요: 모든 탭의 빈 ID·키를 채움 */
function fillMissingIds(){requireOwner_();return ['CMS','BANK','NEW'].map(k=>{const sh=tab_(k),last=sh.getLastRow();if(last<2)return k+': 0';
  const raw=sh.getRange(2,1,last-1,TABS[k].head.length).getValues();const n=fillMissingKeys_(k,sh,raw);invalidateRows_([k]);return TABS[k].name+': '+n+'칸 채움';}).join(' / ');}
/** tabs: 이 저장이 바꾸는 탭 (그 탭만 다음에 새로 읽음). 안 주면 전부 */
function withLock_(fn,tabs){const l=LockService.getScriptLock();l.waitLock(20000);clearMemo_();_SAVE_LOCK_HELD=true;try{const result=fn();SpreadsheetApp.flush();return result;}finally{invalidateRows_(tabs);clearMemo_();_SAVE_LOCK_HELD=false;l.releaseLock();}}
function num_(v){const n=Number(String(v==null?'':v).replace(/[,\s원]/g,''));return Number.isFinite(n)?n:0;}
function text_(v,n){return String(v==null?'':v).trim().slice(0,n||200).replace(/^[=+@\-]/,m=>"'"+m);}
function ymd_(v){
  if(v instanceof Date)return Utilities.formatDate(v,tz_(),'yyyy-MM-dd');
  let s=String(v||'').trim().replace(/[.\/]/g,'-').replace(/\s/g,'').replace(/-+$/,'');
  if(/^\d{8}$/.test(s))s=s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8);   // 20250110 같은 형식
  const m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(!m||!validCalendarDate_(+m[1],+m[2],+m[3]))return '';
  return [m[1],m[2].padStart(2,'0'),m[3].padStart(2,'0')].join('-');
}
function validCalendarDate_(y,m,d){const x=new Date(0);x.setUTCFullYear(y,m-1,d);return x.getUTCFullYear()===y&&x.getUTCMonth()===m-1&&x.getUTCDate()===d;}
function checkedOptionalDate_(v,label){const d=ymd_(v);if(String(v==null?'':v).trim()&&!d)throw Error(label+'을 확인해 주세요.');return d;}
function validBirthInput_(v){
 const digits=String(v==null?'':v).replace(/\D/g,'');if(!digits)return !String(v||'').trim();
 if(digits.length===8)return validCalendarDate_(+digits.slice(0,4),+digits.slice(4,6),+digits.slice(6,8));
 if(digits.length!==6)return false;
 const yy=+digits.slice(0,2),m=+digits.slice(2,4),d=+digits.slice(4,6);
 return validCalendarDate_(1900+yy,m,d)||validCalendarDate_(2000+yy,m,d);
}
function front_(v){const d=String(v==null?'':v).replace(/\D/g,'').slice(0,10);return d&&d.length<6?d.padStart(6,'0'):d;}
function maskAccount_(v){const s=String(v||'').replace(/\s/g,'');if(!s)return '';const d=s.replace(/\D/g,'');return d.length>=4?'*'.repeat(7)+d.slice(-4):'*'.repeat(7);}
function maskPhone_(v){const d=String(v||'').replace(/\D/g,'');return d.length>=3?d.slice(0,3)+'-****-****':'';}
/** 출금 결과 판단: 결과코드가 0(또는 '정상')이면 정상. 코드가 비어 있으면 결과 글자('정상 완료' 등)나 정상출금액으로 판단 */
function resultOk_(code,msg,paid){
  const c=String(code==null?'':code).trim(),t=String(msg==null?'':msg).replace(/\s+/g,'');
  if(c!=='')return /정상|완료|성공/.test(c)||(/^\d+$/.test(c)&&Number(c)===0);
  if(/정상|완료|성공/.test(t))return true;
  if(/오류|실패|불능|부족|해지|없음|거부/.test(t))return false;
  return num_(paid)>0;
}
function hasResult_(code,msg,paid){return String(code==null?'':code).trim()!==''||String(msg==null?'':msg).trim()!==''||num_(paid)>0;}
function feeOf_(code,msg,paid){if(!hasResult_(code,msg,paid))return 0;return resultOk_(code,msg,paid)?FEE_OK:FEE_ERROR;}
function fee_(code){return feeOf_(code,'',0);}
function isOk_(r){return resultOk_(r.errCode,r.errMsg,r.paid);}

/* ── CMS: 가져오기 ── */
function cmsObjects_(){
  if(_CMS)return _CMS.map(r=>Object.assign({},r));
  _CMS=rows_('CMS').map(r=>({key:r[0],date:ymd_(r[1]),no:String(r[2]),name:String(r[3]),front:String(r[4]),bank:String(r[5]),account:String(r[6]),phone:String(r[7]),
    requested:num_(r[8]),memo:String(r[9]),type:String(r[10]),paid:num_(r[11]),errCode:r[12],errMsg:String(r[13]),fee:feeOf_(r[12],r[13],r[11])})).filter(r=>r.date).map(r=>Object.assign(r,{ok:resultOk_(r.errCode,r.errMsg,r.paid)}));
  return _CMS.map(r=>Object.assign({},r));
}
/** 웹앱에서 읽은 금결원 엑셀 행을 저장합니다. 같은 출금일 자료는 이번 파일로 통째로 바뀝니다. */
function importCms(rows){requireOwner_();return withLock_(()=>{
  if(!Array.isArray(rows)||!rows.length)throw Error('가져올 행이 없습니다.');
  if(rows.length>5000)throw Error('한 번에 5,000행까지 가져올 수 있어요.');
  const clean=rows.map(r=>{
    const date=ymd_(r.date),no=text_(r.no,40);
    if(!date)throw Error('출금일을 읽지 못한 행이 있어요: '+(r.name||no));
    if(!no)throw Error('후원자번호가 없는 행이 있어요: '+(r.name||date));
    return [date+'|'+no,date,no,text_(r.name,60),text_(front_(r.front),12),text_(r.bank,40),maskAccount_(r.account),maskPhone_(r.phone),
      num_(r.requested),text_(r.memo,60),text_(r.type,30),num_(r.paid),String(r.errCode==null?'':r.errCode).trim(),text_(r.errMsg,60),feeOf_(r.errCode,r.errMsg,r.paid),now_()];
  });
  const dates=Array.from(new Set(clean.map(r=>r[1]))).sort();
  const sh=tab_('CMS'),w=TABS.CMS.head.length,kept=rows_('CMS').filter(r=>!dates.includes(ymd_(r[1])));
  // 같은 키(출금일+후원자번호)가 파일 안에 두 번 있으면 마지막 행 사용
  const byKey=new Map();clean.forEach(r=>byKey.set(r[0],r));
  const all=kept.concat(Array.from(byKey.values())).sort((a,b)=>String(a[1]).localeCompare(String(b[1]))||String(a[3]).localeCompare(String(b[3]),'ko'));
  const values=all.map(r=>r.map(v=>v==null?'':String(v)).map((v,i)=>[8,11,14].includes(i)?num_(v):v));
  const backup=replaceCmsSafely_(sh,values,w);
  return {dates,rows:byKey.size,backupSheet:backup};
},['CMS']);}
/** 기존 자료를 먼저 백업하고 새 전체 자료를 쓰며, 검증 실패 시 원본을 복원. */
function sameCmsValues_(a,b){
 const value=v=>v instanceof Date?'date:'+v.getTime():String(v==null?'':v);
 return a.length===b.length&&a.every((r,i)=>r.length===b[i].length&&r.every((v,j)=>value(v)===value(b[i][j])));
}
function replaceCmsSafely_(sh,values,width){
 const ss=ss_(),oldLast=Math.max(sh.getLastRow(),1),old=sh.getRange(1,1,oldLast,width).getValues();
 const backupName='CMS_backup_'+Utilities.formatDate(new Date(),tz_(),'yyyyMMdd_HHmmss')+'_'+Utilities.getUuid().slice(0,8);
 // 백업 생성·검증을 모두 마친 뒤에만 원본 시트에 기록합니다.
 const backup=sh.copyTo(ss);backup.setName(backupName);
 if(!sameCmsValues_(old,backup.getRange(1,1,oldLast,width).getValues()))throw Error('백업 검증에 실패해 가져오기를 중단했습니다. 기존 자료는 교체하지 않았습니다.');
 backup.hideSheet();
 try{
  const needed=Math.max(values.length+1,oldLast);
  if(sh.getMaxRows()<needed)sh.insertRowsAfter(sh.getMaxRows(),needed-sh.getMaxRows());
  if(values.length){TEXT_COLS.CMS.forEach(c=>sh.getRange(2,c,values.length,1).setNumberFormat('@'));sh.getRange(2,1,values.length,width).setValues(values);}
  // 먼저 새 자료를 쓰고, 그 뒤 남는 기존 꼬리 행만 정리합니다.
  if(oldLast>values.length+1)sh.getRange(values.length+2,1,oldLast-values.length-1,width).clearContent();
  SpreadsheetApp.flush();
  if(values.length&&!sameCmsValues_(values,sh.getRange(2,1,values.length,width).getValues()))throw Error('저장 결과가 가져올 자료와 다릅니다.');
  const tail=oldLast-values.length-1;
  if(tail>0&&sh.getRange(values.length+2,1,tail,width).getValues().some(r=>r.some(v=>v!==''&&v!=null)))throw Error('기존 꼬리 행 정리 결과를 확인하지 못했습니다.');
  return backupName;
 }catch(err){
  try{
   backup.getRange(1,1,oldLast,width).copyTo(sh.getRange(1,1,oldLast,width));
   const last=sh.getLastRow();if(last>oldLast)sh.getRange(oldLast+1,1,last-oldLast,width).clearContent();
   SpreadsheetApp.flush();
   if(!sameCmsValues_(old,sh.getRange(1,1,oldLast,width).getValues()))throw Error('복구 검증 실패');
  }catch(restoreError){throw Error('저장에 실패했고 자동 복구 결과를 확인하지 못했습니다. 백업 탭 '+backupName+'에 이전 자료가 남아 있습니다. 재업로드 전에 백업을 확인해 주세요.');}
  throw Error('저장에 실패해 기존 자료를 복구했습니다. 다시 시도해 주세요. ('+String(err&&err.message||err)+')');
 }
}

/**
 * 시트에 직접 붙여 넣은 CMS 줄 정리 (편집기에서 ▶ 실행)
 *  - 금결원 파일의 '출금신청행사' 칸 때문에 한 칸씩 밀린 줄을 제자리로 당김
 *  - 계좌번호는 끝 4자리, 연락처는 앞 3자리만 남기고 가림
 *  - 키(출금일|후원자번호)·수수료를 다시 만들고, 같은 키가 겹치면 하나만 남김
 *  앱으로 올린 줄(키가 '날짜|번호' 형식)은 건드리지 않아요.
 */
function repairPastedCms(){requireOwner_();return withLock_(()=>{
  const sh=tab_('CMS'),w=TABS.CMS.head.length,last=sh.getLastRow();
  if(last<2)return '정리할 줄이 없어요.';
  const raw=sh.getRange(2,1,last-1,w).getValues();
  const isNum=v=>v!==''&&v!=null&&Number.isFinite(Number(String(v).replace(/[,\s원]/g,'')));
  let fixed=0,shifted=0;
  const out=raw.map(r=>{
    const key=String(r[0]).trim();
    if(/^\d{4}-\d{2}-\d{2}\|/.test(key))return r;          // 앱으로 올린 줄
    if(r.every(v=>String(v==null?'':v).trim()===''))return r;
    let x=r.slice();
    // 출금의뢰금액 칸에 숫자가 아닌 글자(출금신청행사)가 있으면 한 칸 밀린 것
    if(String(x[8]).trim()!==''&&!isNum(x[8])&&isNum(x[9])){
      x=[x[0],x[1],x[2],x[3],x[4],x[5],x[6],x[7],x[9],x[10],x[11],x[12],x[13],x[14],'',''];
      shifted++;
    }
    const date=ymd_(x[1]),no=String(x[2]==null?'':x[2]).trim();
    x[0]=date&&no?date+'|'+no:'';
    x[1]=date||x[1];
    x[4]=front_(x[4]);
    x[6]=maskAccount_(x[6]);
    x[7]=maskPhone_(x[7]);
    x[8]=num_(x[8]);x[11]=num_(x[11]);
    x[12]=String(x[12]==null?'':x[12]).trim();
    x[14]=feeOf_(x[12],x[13],x[11]);
    x[15]=x[15]||'붙여넣기 정리 '+now_();
    fixed++;
    return x;
  });
  // 같은 키는 뒤의 것 하나만
  const byKey=new Map(),blank=[];
  out.forEach(r=>{const k=String(r[0]).trim();if(k)byKey.set(k,r);else if(r.some(v=>String(v==null?'':v).trim()!==''))blank.push(r);});
  const all=Array.from(byKey.values()).concat(blank)
    .sort((a,b)=>String(a[1]).localeCompare(String(b[1]))||String(a[3]).localeCompare(String(b[3]),'ko'));
  replaceCmsSafely_(sh,all.map(r=>r.map(v=>v==null?'':v)),w);
  return '정리 '+fixed+'줄 (밀린 줄 바로잡음 '+shifted+'줄, 겹친 줄 '+(out.length-all.length)+'줄 정리)';
},['CMS']);}

function getCmsDates(){requireRead_();
  const m=new Map();
  cmsObjects_().forEach(r=>{if(!m.has(r.date))m.set(r.date,{date:r.date,rows:0,ok:0,paid:0});const d=m.get(r.date);d.rows++;if(isOk_(r)){d.ok++;d.paid+=r.paid;}});
  return Array.from(m.values()).sort((a,b)=>b.date.localeCompare(a.date));
}

/* ── 후원자 정보(성별 숫자 · 오케스트라 지정) ── */
/** 후원자번호 비교용: 숫자만으로 된 번호는 앞의 0을 무시 (시트가 00123을 123으로 바꿔도 맞게) */
function normNo_(v){const s=String(v==null?'':v).trim();return /^\d+$/.test(s)?s.replace(/^0+(?=\d)/,''):s;}
function donorMap_(){
  const raw=new Map();
  const m={get:k=>raw.get(normNo_(k)),has:k=>raw.has(normNo_(k)),forEach:f=>raw.forEach(f)};
  rows_('DONOR').forEach(r=>{const no=String(r[0]).trim();if(no)raw.set(normNo_(no),{gender:String(r[2]).trim().replace(/\.0+$/,''),no,name:String(r[1]),orchestra:/^y/i.test(String(r[3]).trim()),memo:String(r[4]),end:ymd_(r[5]),biz:/^y/i.test(String(r[6]==null?'':r[6]).trim())});});
  return m;
}
function getDonors(){requireRead_();
  const dm=donorMap_(),seen=new Map();
  cmsObjects_().forEach(r=>{const x=seen.get(normNo_(r.no));if(!x||x.last<r.date)seen.set(normNo_(r.no),{no:r.no,name:r.name,front:r.front,last:r.date,source:'CMS'});});
  // 통장 정기후원: 후원자번호가 없어서 '통장:이름|생년월일'을 번호처럼 씀
  const idx=cmsPersonIndex_();
  bankObjects_().forEach(r=>{const k=bankDonorKey_(r,idx);
    if(k.cmsNo){const x=seen.get(normNo_(k.cmsNo));if(x){x.alsoBank=true;if(x.last<r.date)x.last=r.date;}return;}   // CMS 후원자와 같은 사람 → 한 줄로
    const no=k.bankNo,x=seen.get(no);
    if(!x||x.last<r.date)seen.set(no,{no,name:r.name,front:r.birth+(/^[1-4]$/.test(r.gender)?r.gender:''),last:r.date,source:'통장'});});
  dm.forEach((d,key)=>{const no=d.no;if(!seen.has(key))seen.set(key,{no,name:d.name,front:'',last:'',source:no.indexOf('통장:')===0?'통장':'CMS'});});
  return Array.from(seen.values()).map(s=>{const d=dm.get(s.no)||{};return Object.assign(s,{gender:d.gender||'',autoGender:genderFromFront_(s.front),orchestra:!!d.orchestra,memo:d.memo||'',end:d.end||'',bizMark:!!d.biz,business:isBusiness_(s.front)||!!d.biz});})
    .sort((a,b)=>String(a.name).localeCompare(String(b.name),'ko'));
}
function bankDonorNo_(name,birth){return '통장:'+String(name||'').trim()+'|'+normBirth_(birth);}
function saveDonor(o){requireOwner_();return withLock_(()=>{
  const no=text_(o&&o.no,40);if(!no)throw Error('후원자번호가 필요합니다.');
  const g=String(o.gender||'').trim();if(g&&!/^[1-4]$/.test(g))throw Error('성별 숫자는 1~4 중 하나로 입력해 주세요.');
  const end=o.end?ymd_(o.end):'';if(o.end&&!end)throw Error('종결일 형식을 확인해 주세요.');
  const sh=tab_('DONOR'),values=rows_('DONOR'),row=[no,text_(o.name,60),o.biz?'':g,o.orchestra?'Y':'',text_(o.memo,200),end,o.biz?'Y':''];
  const i=values.findIndex(r=>normNo_(r[0])===normNo_(no));
  const at=i>=0?i+2:sh.getLastRow()+1;
  sh.getRange(at,1).setNumberFormat('@');sh.getRange(at,3).setNumberFormat('@');
  sh.getRange(at,1,1,row.length).setValues([row]);
  return true;
},['DONOR']);}
function isBusiness_(front){return String(front||'').replace(/\D/g,'').length>=10;}
/** 금결원 앞자리가 7자리(생년월일 6 + 성별 1)면 성별 숫자를 그대로 씁니다. */
function genderFromFront_(front){const f=String(front||'').replace(/\D/g,'');return f.length===7&&/[1-4]/.test(f[6])?f[6]:'';}
function maskedId_(front,gender){
  const f=String(front||'').replace(/\D/g,'');
  if(!f)return '';
  if(isBusiness_(f))return '사업자';
  return f.slice(0,6)+'-'+(genderFromFront_(f)||gender||'?')+'******';
}

/* ── CMS: 출금일별 대장 · 오케스트라 명단 ── */
function getCmsLedger(date){requireRead_();
  date=ymd_(date);if(!date)throw Error('출금일을 골라 주세요.');
  const dm=donorMap_(),rows=cmsObjects_().filter(r=>r.date===date).sort((a,b)=>a.name.localeCompare(b.name,'ko')||a.no.localeCompare(b.no));
  const ok=rows.filter(isOk_);
  const orchestra=rows.filter(r=>(dm.get(r.no)||{}).orchestra).map(r=>({name:r.name,date:r.date,requested:r.requested,paid:r.paid}));
  return {date,rows:rows.map((r,i)=>Object.assign({seq:i+1},r)),
    summary:{count:rows.length,okCount:ok.length,okAmount:ok.reduce((s,r)=>s+r.paid,0),errorCount:rows.length-ok.length,fee:rows.reduce((s,r)=>s+r.fee,0)},
    orchestra,orchestraTotal:{requested:orchestra.reduce((s,r)=>s+r.requested,0),paid:orchestra.reduce((s,r)=>s+r.paid,0)}};
}

/* ── 통장 정기후원 ── */
/** 생년월일을 CMS와 같은 6자리(yymmdd)로: 19900101·1990-01-01 → 900101 */
function normBirth_(v){
  let d=String(v==null?'':v).replace(/\D/g,'');
  if(d.length>=8&&/^(19|20)/.test(d))d=d.slice(2,8);
  return d.slice(0,6);
}
/** 통장 후원자가 CMS 후원자와 같은 사람인지: 이름(띄어쓰기 무시) + 생년월일 6자리가 같으면 같은 사람 */
function cmsPersonIndex_(){
  const m=new Map();
  cmsObjects_().forEach(r=>{const b=String(r.front||'').replace(/\D/g,'').slice(0,6);if(b.length===6&&!isBusiness_(r.front))m.set(String(r.name).replace(/\s+/g,'')+'|'+b,r.no);});
  return m;
}
function bankDonorKey_(r,idx){const no=idx.get(String(r.name).replace(/\s+/g,'')+'|'+r.birth);return no?{cmsNo:no}:{bankNo:bankDonorNo_(r.name,r.birth)};}
function bankObjects_(){
  return rows_('BANK').map(r=>({id:String(r[0]),date:ymd_(r[1]),name:String(r[2]),birth:normBirth_(r[3]),gender:String(r[4]).trim(),amount:num_(r[5]),platform:String(r[6]),memo:String(r[7])})).filter(r=>r.id&&r.date);
}
function listBank(ym){requireRead_();return bankObjects_().filter(r=>!ym||r.date.slice(0,7)===ym).sort((a,b)=>a.date.localeCompare(b.date));}
function addBank(o){requireOwner_();return withLock_(()=>{
  const date=ymd_(o&&o.date),name=text_(o&&o.name,60),amount=num_(o&&o.amount),g=String(o&&o.gender||'').trim();
  if(!date)throw Error('입금일을 입력해 주세요.');if(!name)throw Error('후원자명을 입력해 주세요.');if(!(amount>0))throw Error('금액을 입력해 주세요.');
  if(g&&!/^[1-4]$/.test(g))throw Error('성별 숫자는 1~4 중 하나로 입력해 주세요.');
  const b6=normBirth_(o.birth);if(o.birth&&!validBirthInput_(o.birth))throw Error('생년월일을 확인해 주세요. (예: 900101 또는 1990-01-01)');
  tab_('BANK').appendRow([Utilities.getUuid(),date,name,normBirth_(o.birth),g,amount,text_(o.platform,40),text_(o.memo,200),today_()]);
  return true;
},['BANK']);}
function deleteBank(id){requireOwner_();return withLock_(()=>{
  const sh=tab_('BANK'),values=rows_('BANK'),i=values.findIndex(r=>String(r[0])===String(id));
  if(i<0)throw Error('기록을 찾지 못했어요. 새로고침해 주세요.');
  sh.deleteRow(i+2);return true;
},['BANK']);}

/* ── 월별 정기후원 이체결과 (CMS 정상출금 + 통장 정기후원) ── */
function getMonthlyTransfer(ym){requireRole_();
  if(!/^\d{4}-\d{2}$/.test(String(ym||'')))throw Error('연도와 월을 골라 주세요.');
  return monthlyTransferCached_(String(ym));
}
function monthlyTransferCached_(ym){return resultCached_('transfer:'+ym,['CMS','BANK','DONOR'],()=>monthlyTransfer_(ym));}
function monthlyTransfer_(ym){
  const dm=donorMap_(),rows=[],people=new Set(),missing=new Map();
  cmsObjects_().filter(r=>r.date.slice(0,7)===ym&&isOk_(r)&&r.paid>0).forEach(r=>{
    const d=dm.get(r.no)||{};
    if(!d.biz&&!d.gender&&!genderFromFront_(r.front)&&!isBusiness_(r.front))missing.set(r.no,r.name);
    rows.push({date:r.date,name:r.name,amount:r.paid,maskedId:d.biz?'사업자':maskedId_(r.front,d.gender),source:'CMS',personKey:'cms:'+normNo_(r.no)});
    people.add('cms:'+normNo_(r.no));
  });
  const idx=cmsPersonIndex_();
  bankObjects_().filter(r=>r.date.slice(0,7)===ym).forEach(r=>{
    const k=bankDonorKey_(r,idx),bd=dm.get(k.cmsNo||k.bankNo)||{};
    const key=k.cmsNo?'cms:'+normNo_(k.cmsNo):'bank:'+r.name+'|'+r.birth;   // CMS와 같은 사람이면 실인원 1명으로
    rows.push({date:r.date,name:r.name,amount:r.amount,maskedId:bd.biz?'사업자':maskedId_(r.birth,r.gender||bd.gender),source:'통장'+(r.platform?' · '+r.platform:''),personKey:key});
    people.add(key);
  });
  rows.sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name,'ko'));
  return {ym,rows:rows.map((r,i)=>Object.assign({seq:i+1},r)),people:people.size,cmsPeople:Array.from(people).filter(k=>k.startsWith('cms:')).length,
    bankPeople:Array.from(people).filter(k=>k.startsWith('bank:')).length,total:rows.reduce((s,r)=>s+r.amount,0),missingGender:Array.from(missing.entries()).map(([no,name])=>({no,name}))};
}


/* ── 월별보고: 확정한 결과 숫자만 '월별기록' 탭에 저장 (회계 원본은 저장하지 않음) ── */
const MONTH_FIELDS=['dCarry','dIncome','dExpense','dBalance','nCarry','nIncome','nExpense','nBalance','tCarry','tIncome','tExpense','tBalance','gInCount','gInQty','gInAmount','gOutCount','gOutQty','gOutAmount'];
const CUM_FIELDS=['dCumInc','dCumExp','nCumInc','nCumExp'];   // 이번 달 말까지 누적(소계) — 다음 달 (전월이월)과 비교용
/** 월별기록은 '머리글 이름'으로 읽고 써요 → 시트에서 칸 순서를 바꿔도 괜찮아요 */
function monthFieldNames_(){
  const h=TABS.MONTH.head,m={year:h[0],month:h[1],memo:h[20],savedAt:h[21]};
  MONTH_FIELDS.forEach((f,i)=>m[f]=h[2+i]);CUM_FIELDS.forEach((f,i)=>m[f]=h[22+i]);
  return m;
}
function monthSheet_(){
  const sh=tab_('MONTH'),names=monthFieldNames_();
  let width=Math.max(sh.getLastColumn(),1);
  let head=sh.getRange(1,1,1,width).getValues()[0].map(v=>String(v).replace(/\s+/g,''));
  const col={};
  Object.keys(names).forEach(f=>{
    const want=names[f].replace(/\s+/g,'');
    let i=head.indexOf(want);
    if(i<0){ // 없는 머리글은 맨 뒤에 추가
      if(sh.getMaxColumns()<width+1)sh.insertColumnsAfter(sh.getMaxColumns(),1);
      sh.getRange(1,width+1).setValue(names[f]).setFontWeight('bold');
      head.push(want);i=width;width++;
    }
    col[f]=i;
  });
  const last=sh.getLastRow();
  const values=last>=2?sh.getRange(2,1,last-1,width).getValues():[];
  return {sh,col,width,values};
}
function monthObjects_(){
  const {col,values}=monthSheet_();
  return values.map(r=>{
    const g=f=>r[col[f]];
    const o={year:Number(g('year')),month:Number(g('month')),memo:String(g('memo')||''),
      savedAt:g('savedAt') instanceof Date?Utilities.formatDate(g('savedAt'),tz_(),'yyyy-MM-dd HH:mm'):String(g('savedAt')||'')};
    MONTH_FIELDS.concat(CUM_FIELDS).forEach(f=>{const v=g(f);o[f]=v===''||v==null?null:num_(v);});
    return o;
  }).filter(o=>o.year&&o.month);
}
function getMonthly(year){requireRead_();year=Number(year);return monthObjects_().filter(o=>o.year===year).sort((a,b)=>a.month-b.month);}
/** 월별기록 시트: 지정 차인(노랑)·비지정 차인(파랑)·총 차인(초록) 칸 색 구분 */
function colorMonthSheet_(sh){
  const rows=Math.max(sh.getMaxRows(),2),width=Math.max(sh.getLastColumn(),1);
  const head=sh.getRange(1,1,1,width).getValues()[0].map(v=>String(v).replace(/\s+/g,''));
  [['지정차인','#fff4d6','#7a4a00'],['비지정차인','#e3f0fb','#1d4f7a'],['후원금총차인','#e6f4ea','#2f6b3a']].forEach(([name,bg,fg])=>{
    const c=head.indexOf(name)+1;if(!c)return;
    sh.getRange(2,c,rows-1,1).setBackground(bg).setFontColor(fg).setFontWeight('bold');
    sh.getRange(1,c).setBackground(fg).setFontColor('#ffffff');});
}
/** 편집기에서 한 번 실행하면 지금 시트에도 바로 색이 들어가요 */
function colorMonthlySheet(){requireOwner_();colorMonthSheet_(tab_('MONTH'));return '월별기록 색 구분 완료';}
function saveMonthly(o){requireOwner_();return withLock_(()=>{
  const year=Number(o&&o.year),month=Number(o&&o.month);
  if(!(year>=2000&&year<=2100)||!(month>=1&&month<=12))throw Error('연도와 월을 확인해 주세요.');
  const {sh,col,width,values}=monthSheet_();
  const i=values.findIndex(r=>Number(r[col.year])===year&&Number(r[col.month])===month);
  const row=i>=0?values[i].slice():new Array(width).fill('');
  row[col.year]=year;row[col.month]=month;
  MONTH_FIELDS.concat(CUM_FIELDS).forEach(f=>row[col[f]]=o[f]===''||o[f]==null?'':num_(o[f]));
  row[col.memo]=text_(o.memo,500);row[col.savedAt]=now_();
  if(i>=0)sh.getRange(i+2,1,1,width).setValues([row]);else sh.getRange(sh.getLastRow()+1,1,1,width).setValues([row]);
  colorMonthSheet_(sh);
  return {year,month,replaced:i>=0};
},['MONTH']);}


/* ── 신규후원자 (매달 입력 → 월별 현황표, 연간 신규 수) ── */
function getNewDonorYears(){requireRead_();
  const years=new Set([today_().slice(0,4)]);rows_('NEW').forEach(r=>{const d=ymd_(r[1]);if(d)years.add(d.slice(0,4));});
  return Array.from(years).sort().reverse();
}
function listNew(ym){requireRead_();
  return rows_('NEW').map(r=>({id:String(r[0]),date:ymd_(r[1]),name:String(r[2]),content:String(r[3])})).filter(r=>r.id&&r.date&&(!ym||r.date.slice(0,ym.length)===ym)).sort((a,b)=>a.date.localeCompare(b.date));
}
function addNew(o){requireOwner_();return withLock_(()=>{
  const date=ymd_(o&&o.date),name=text_(o&&o.name,120);
  if(!date)throw Error('등록일자를 입력해 주세요.');if(!name)throw Error('업체 및 후원자명을 입력해 주세요.');
  tab_('NEW').appendRow([Utilities.getUuid(),date,name,text_(o.content,300),today_()]);return true;
},['NEW']);}
function deleteNew(id){requireOwner_();return withLock_(()=>{
  const values=rows_('NEW'),i=values.findIndex(r=>String(r[0])===String(id));if(i<0)throw Error('기록을 찾지 못했어요. 새로고침해 주세요.');
  tab_('NEW').deleteRow(i+2);return true;
},['NEW']);}

/* ── 정기후원 지정 (CMS·통장 말고도 매년 정기적으로 오는 분) ── */
function setRegular(o){requireOwner_();return withLock_(()=>{
  const name=text_(o&&o.name,120);if(!name)throw Error('후원자명이 필요합니다.');
  const sh=tab_('REGULAR'),values=rows_('REGULAR'),i=values.findIndex(r=>String(r[0]).trim()===name);
  if(o.on){if(i<0)sh.appendRow([name,text_(o.memo,200),today_()]);}
  else if(i>=0)sh.deleteRow(i+2);
  return {name,on:!!o.on};
},['REGULAR']);}

/* ── 연간보고에 필요한 앱 안의 자료 모으기 ── */
function getAnnualContext(year){requireRead_();
  const y=String(year),cms=cmsObjects_().filter(r=>r.date.slice(0,4)===y);
  const paidOk=r=>isOk_(r)&&r.paid>0;
  const okDates=new Set(cms.filter(paidOk).map(r=>r.date));
  const cmsNames=Array.from(new Set(cms.filter(paidOk).map(r=>r.name.trim()).filter(Boolean))).sort();
  const bankNames=Array.from(new Set(bankObjects_().filter(r=>r.date.slice(0,4)===y).map(r=>r.name.trim()))).sort();
  const regular=rows_('REGULAR').map(r=>String(r[0]).trim()).filter(Boolean);
  const newCount=rows_('NEW').filter(r=>ymd_(r[1]).slice(0,4)===y).length;
  const months=monthObjects_().filter(o=>o.year===Number(y));
  const goodsMonthly={inCount:0,inQty:0,inAmount:0,outCount:0,outQty:0,outAmount:0,months:months.length};
  months.forEach(o=>{goodsMonthly.inCount+=o.gInCount||0;goodsMonthly.inQty+=o.gInQty||0;goodsMonthly.inAmount+=o.gInAmount||0;goodsMonthly.outCount+=o.gOutCount||0;goodsMonthly.outQty+=o.gOutQty||0;goodsMonthly.outAmount+=o.gOutAmount||0;});
  const saved=rows_('YEAR').find(r=>String(r[0])===y);
  return {year:Number(y),cmsDates:okDates.size,cmsDateList:Array.from(okDates).sort(),cmsNames,bankNames,regular,newCount,goodsMonthly,savedAt:saved?String(saved[30]||''):'',saved:saved?{year:Number(y),values:saved.slice(1,29).map(v=>v===''||v==null?null:num_(v)),memo:String(saved[29]||''),savedAt:String(saved[30]||'')}:null};
}
function saveAnnual(o){requireOwner_();return withLock_(()=>{
  const y=Number(o&&o.year);if(!(y>=2000&&y<=2100))throw Error('연도를 확인해 주세요.');
  const f=TABS.YEAR.head.slice(1,29).map((_,i)=>{const v=(o.values||[])[i];return v===''||v==null?'':num_(v);});
  const savedAt=now_(),row=[y].concat(f).concat([text_(o.memo,500),savedAt]);
  const sh=tab_('YEAR'),values=rows_('YEAR'),i=values.findIndex(r=>Number(r[0])===y);
  if(i>=0)sh.getRange(i+2,1,1,row.length).setValues([row]);else sh.appendRow(row);
  return {year:y,replaced:i>=0,savedAt};
},['YEAR']);}


/* ── 권한 ──
   - min(배포한 계정): 모든 기능
   - '권한' 탭에 등록한 사람: '정기후원 이체결과'만 보기, 또는 '전체 보기(수정 불가)'
   - 만료일을 적어 두면 그날이 지나면 자동으로 권한이 없어져요
   배포 설정: 실행 사용자 "나" / 액세스 "도메인 내 모든 사용자" (기관 계정으로 배포) */
const SCOPE_TRANSFER='정기후원 이체결과', SCOPE_ALL='전체 보기(수정 불가)';
function myEmail_(){try{return String(Session.getActiveUser().getEmail()||'').trim().toLowerCase();}catch(e){return '';}}
function accessRows_(){const sh=ss_().getSheetByName(TABS.ACCESS.name);if(!sh||sh.getLastRow()<2)return [];
  return sh.getRange(2,1,sh.getLastRow()-1,5).getValues().map(r=>({email:String(r[0]).trim().toLowerCase(),name:String(r[1]),scope:String(r[2])||SCOPE_TRANSFER,date:ymd_(r[3]),until:ymd_(r[4])})).filter(r=>r.email);}
function role_(){
  if(owner_())return 'owner';
  const me=myEmail_();if(!me)return '';
  const a=accessRows_().find(r=>r.email===me);if(!a)return '';
  if(a.until&&today_()>a.until)return '';
  return a.scope===SCOPE_ALL?'viewerAll':'viewer';
}
function requireRole_(){const r=role_();if(!r)throw Error('접근 권한이 없습니다.');return r;}
function requireRead_(){const r=role_();if(r!=='owner'&&r!=='viewerAll')throw Error('이 화면은 볼 수 있는 권한이 없습니다.');return r;}
function getMyRole(){return requireRole_();}
function listAccess(){requireOwner_();const t=today_();return accessRows_().map(r=>Object.assign(r,{expired:!!r.until&&t>r.until}));}
function addAccess(o){requireOwner_();return withLock_(()=>{
  const email=String(o&&o.email||'').trim().toLowerCase();
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))throw Error('이메일 주소를 확인해 주세요.');
  const scope=o.scope===SCOPE_ALL?SCOPE_ALL:SCOPE_TRANSFER,until=checkedOptionalDate_(o.until,'만료일');
  const sh=tab_('ACCESS');if(!sh.getRange(1,5).getValue())sh.getRange(1,5).setValue('만료일');
  const values=rows_('ACCESS'),i=values.findIndex(r=>String(r[0]).trim().toLowerCase()===email),row=[email,text_(o.name,60),scope,today_(),until];
  if(i>=0)sh.getRange(i+2,1,1,5).setValues([row]);else sh.appendRow(row);   // 같은 이메일이면 범위·기한을 새로 바꿈
  return {replaced:i>=0};
},['ACCESS']);}
function removeAccess(email){requireOwner_();return withLock_(()=>{
  email=String(email||'').trim().toLowerCase();const values=rows_('ACCESS'),i=values.findIndex(r=>String(r[0]).trim().toLowerCase()===email);
  if(i<0)throw Error('목록에 없는 이메일이에요.');tab_('ACCESS').deleteRow(i+2);return true;
},['ACCESS']);}


/* ── 기부확인서 · 기부증서 ──
   발급번호: 연도-후원-001호 차례대로. 재출력을 위해 발급 당시 출력 내용을 함께 보관합니다. */
function getDonationSummary(o){requireOwner_();
  const no=String(o&&o.no||'').trim(),src=String(o&&o.source||'CMS');
  const from=checkedOptionalDate_(o&&o.from,'시작일')||'0000-00-00',to=checkedOptionalDate_(o&&o.to,'종료일')||'9999-12-31';
  if(from>to)throw Error('시작일과 종료일 순서를 확인해 주세요.');
  if(!no)throw Error('후원자를 골라 주세요.');
  const recs=[];
  if(src!=='통장')cmsObjects_().forEach(r=>{if(normNo_(r.no)===normNo_(no)&&isOk_(r)&&r.paid>0)recs.push({date:r.date,amount:r.paid,kind:'CMS',name:r.name,front:r.front});});
  const idx=cmsPersonIndex_();
  bankObjects_().forEach(r=>{
    const k=bankDonorKey_(r,idx);
    const mine=src==='통장'?(k.bankNo===no):(k.cmsNo&&normNo_(k.cmsNo)===normNo_(no));
    if(mine)recs.push({date:r.date,amount:r.amount,kind:'통장',name:r.name,front:r.birth});
  });
  const all=recs.sort((a,b)=>a.date.localeCompare(b.date));
  const inRange=all.filter(r=>r.date>=from&&r.date<=to);
  const d=donorMap_().get(no)||{};
  const lastAll=all.length?all[all.length-1].date:'';
  return {name:(all[0]&&all[0].name)||d.name||'',front:(all.find(r=>r.front)||{}).front||'',biz:!!d.biz,end:d.end||'',
    firstAll:all.length?all[0].date:'',lastAll,
    first:inRange.length?inRange[0].date:'',last:inRange.length?inRange[inRange.length-1].date:'',
    count:inRange.length,total:inRange.reduce((s,r)=>s+r.amount,0),
    cmsCount:inRange.filter(r=>r.kind==='CMS').length,bankCount:inRange.filter(r=>r.kind==='통장').length};
}
function nextCertNo_(year){
  const re=new RegExp('^'+year+'-후원-(\\d+)호$');let max=0;
  rows_('CERT').forEach(r=>{const m=String(r[0]).trim().match(re);if(m)max=Math.max(max,Number(m[1]));});
  return year+'-후원-'+String(max+1).padStart(3,'0')+'호';
}
function peekCertNo(date){requireOwner_();const d=checkedOptionalDate_(date,'발급일')||today_();return nextCertNo_(d.slice(0,4));}
/** 발급 시 보관하며 재출력은 조회만 합니다. */
function certPrintData_(o,date,name){
  const clean=(v,n)=>String(v==null?'':v).trim().slice(0,n);
  return {schema:1,kind:o.kind==='증서'?'증서':'확인서',date,name,
    issuer:clean(o.issuer,60),org:clean(o.org,60),purpose:clean(o.purpose,80),memo:clean(o.memo,200),stamp:!!o.stamp,
    birth:clean(o.birth,80),addr:clean(o.addr,300),what:clean(o.what,300),
    item:clean(o.item,500),body:clean(o.body,5000),period:clean(o.period,60),
    total:o.total===''||o.total==null?'':num_(o.total)};
}
function issueCert(o){requireOwner_();return withLock_(()=>{
  const date=checkedOptionalDate_(o&&o.date,'발급일')||today_(),name=text_(o&&o.name,80);
  if(!name)throw Error('성명(기관명)을 입력해 주세요.');
  const kind=o.kind==='증서'?'기부증서':'기부확인서',snapshot=certPrintData_(o,date,name);
  const no=nextCertNo_(date.slice(0,4));
  appendCertRow_([no,date,text_(o.org,60),name,text_(o.purpose,80),o.stamp?'직인 출력':'',text_(o.memo,200),kind,text_(o.period,60),num_(o.total)||'',now_(),JSON.stringify(snapshot),text_(o.issuer,60),text_(snapshot.item,500)]);
  return {no,date,snapshot};
},['CERT']);}
function certLedgerRow_(r){
  let saved=null;if(r[11]){try{saved=JSON.parse(String(r[11]));}catch(e){}}
  const item=String(r[13]||'')||(saved&&typeof saved.item==='string'?saved.item:'');
  const kind=String(r[7]||'')||(saved&&saved.kind==='증서'?'기부증서':'기부확인서');
  return {no:String(r[0]),date:ymd_(r[1]),org:String(r[2]),name:String(r[3]),purpose:String(r[4]),stamp:String(r[5]),memo:String(r[6]),kind,period:String(r[8]),total:r[9]===''?null:num_(r[9]),item,hasPrintData:!!r[11],issuer:String(r[12]||'')};
}
function listCerts(year){requireOwner_();const y=String(year||'');
  return rows_('CERT').filter(r=>String(r[0]).trim()&&(!y||String(r[0]).startsWith(y)||String(r[1]).slice(0,4)===y))
    .map(certLedgerRow_).sort((a,b)=>a.no.localeCompare(b.no));}

function getCertForPrint(no){requireOwner_();
  const key=String(no||'').trim(),matches=rows_('CERT').filter(r=>String(r[0]).trim()===key);
  if(matches.length!==1)throw Error(matches.length?'같은 발급번호가 여러 개 있어요. 발급대장을 확인해주세요.':'발급 기록을 찾지 못했어요.');
  const r=matches[0];
  if(r[11]){
    let snapshot;try{snapshot=JSON.parse(String(r[11]));}catch(e){throw Error('출력 보관내용이 손상됐어요. 발급대장을 확인해주세요.');}
    if(!snapshot||snapshot.schema!==1||typeof snapshot.name!=='string'||typeof snapshot.date!=='string')throw Error('출력 보관내용 형식을 확인해주세요.');
    snapshot.date=ymd_(r[1])||ymd_(snapshot.date);
    if(!snapshot.date)throw Error('발급대장에 발급일이 없어요. 해당 기록의 발급일을 시트에서 확인해주세요.');
    return {no:key,legacy:false,snapshot};
  }
  return {no:key,legacy:true,kindKnown:!!String(r[7]||'').trim(),legacyRevision:JSON.stringify(r.slice(0,11).concat([r[12]||'',r[13]||''])),snapshot:{issuer:String(r[12]||''),kind:String(r[7]).includes('증서')?'증서':'확인서',date:ymd_(r[1]),name:String(r[3]||''),org:String(r[2]||''),purpose:String(r[4]||''),memo:String(r[6]||''),stamp:String(r[5]||'')==='직인 출력',period:String(r[8]||''),total:r[9]===''?'':num_(r[9]),birth:'',addr:'',what:'',item:String(r[13]||''),body:''}};
}
/** 기존 발급 행의 누락된 출력 내용을 보관합니다. 새 발급번호를 만들지 않습니다. */
function saveLegacyCertPrint(o){requireOwner_();return withLock_(()=>{
  const key=String(o&&o.no||'').trim(),current=getCertForPrint(key);
  if(!current.legacy)throw Error('이미 출력 내용이 보관된 기록이에요. 목록을 새로고침해 출력해주세요.');
  if(current.legacyRevision!==String(o.legacyRevision||''))throw Error('발급대장이 변경됐어요. 목록을 새로고침한 뒤 다시 보완해주세요.');
  const date=current.snapshot.date;
  if(!date)throw Error('발급대장에 발급일이 없어요. 해당 기록의 발급일을 시트에서 확인해주세요.');
  const kind=current.kindKnown?current.snapshot.kind:(o.kind==='증서'?'증서':'확인서');
  const merged=Object.assign({},current.snapshot,{kind,date,issuer:current.snapshot.issuer||o.issuer,birth:o.birth,addr:o.addr,what:o.what,item:o.item,body:o.body});
  if(kind==='증서'){merged.birth='';merged.addr='';merged.what='';}else{merged.item='';merged.body='';}
  const snapshot=certPrintData_(merged,date,current.snapshot.name),rows=rows_('CERT');
  const i=rows.findIndex(r=>String(r[0]).trim()===key),row=Array.from({length:TABS.CERT.head.length},(_,j)=>rows[i][j]==null?'':rows[i][j]);
  if(!row[1])row[1]=date;if(!row[7])row[7]=kind==='증서'?'기부증서':'기부확인서';row[11]=JSON.stringify(snapshot);if(!row[12])row[12]=text_(snapshot.issuer,60);
  row[13]=text_(snapshot.item,500);writeCertRow_(i+2,row);
  return {no:key,legacy:false,snapshot};
},['CERT']);}




/* ── 후원 대시보드 (담당자만) ──
   정기후원(CMS 정상출금 + 통장)을 달마다 사람·금액으로 묶고, 연도끼리 비교. 챙길 일(연속 오류·출금 없음·성별 빈칸)도 함께 */
function getDonationDashboard(year){requireOwner_();return donationDashboardCached_(Number(year)||Number(today_().slice(0,4)));}
function donationDashboardCached_(Y){return resultCached_('dash:'+Y+':'+today_(),['CMS','BANK','DONOR','NEW','MONTH'],()=>donationDashboard_(Y));}
function donationDashboard_(year){
  const Y=Number(year)||Number(today_().slice(0,4));
  const idx=cmsPersonIndex_(),dm=donorMap_();
  const byMonth={};   // 'yyyy-mm' → {people:Set, amount, cms:Set, bank:Set}
  const slot=ym=>byMonth[ym]||(byMonth[ym]={people:new Set(),amount:0,cms:new Set(),bank:new Set()});
  const cms=cmsObjects_();
  cms.filter(r=>isOk_(r)&&r.paid>0).forEach(r=>{const m=slot(r.date.slice(0,7)),k='cms:'+normNo_(r.no);m.people.add(k);m.cms.add(k);m.amount+=r.paid;});
  bankObjects_().forEach(r=>{const k0=bankDonorKey_(r,idx),k=k0.cmsNo?'cms:'+normNo_(k0.cmsNo):'bank:'+k0.bankNo,m=slot(r.date.slice(0,7));m.people.add(k);m.bank.add(k);m.amount+=r.amount;});
  const newBy={},endBy={};
  rows_('NEW').forEach(r=>{const d=ymd_(r[1]);if(d)newBy[d.slice(0,7)]=(newBy[d.slice(0,7)]||0)+1;});
  dm.forEach(d=>{if(d.end)endBy[d.end.slice(0,7)]=(endBy[d.end.slice(0,7)]||0)+1;});
  const acct={};monthObjects_().forEach(o=>{acct[o.year+'-'+String(o.month).padStart(2,'0')]=o.tIncome;});
  const series=y=>Array.from({length:12},(_,i)=>{const ym=y+'-'+String(i+1).padStart(2,'0'),m=byMonth[ym];
    return {ym,people:m?m.people.size:null,amount:m?m.amount:null,cmsPeople:m?m.cms.size:0,bankPeople:m?m.bank.size:0,
      newCount:newBy[ym]||0,endCount:endBy[ym]||0,income:acct[ym]==null?null:acct[ym]};});
  // 연도별 요약
  const years=Array.from(new Set(Object.keys(byMonth).concat(Object.keys(newBy),Object.keys(endBy),Object.keys(acct)).map(k=>Number(k.slice(0,4))))).filter(Boolean).sort();
  const yearRows=years.map(y=>{const ss=series(y),has=ss.filter(x=>x.people!=null),ppl=new Set();
    Object.keys(byMonth).filter(k=>k.startsWith(y+'-')).forEach(k=>byMonth[k].people.forEach(p=>ppl.add(p)));
    const inc=ss.filter(x=>x.income!=null);
    return {year:y,months:has.length,avgPeople:has.length?Math.round(has.reduce((a,x)=>a+x.people,0)/has.length*10)/10:null,uniquePeople:ppl.size,
      amount:ss.reduce((a,x)=>a+(x.amount||0),0),newCount:ss.reduce((a,x)=>a+x.newCount,0),endCount:ss.reduce((a,x)=>a+x.endCount,0),
      income:inc.length?inc.reduce((a,x)=>a+x.income,0):null,incomeMonths:inc.length};});
  // 최근 달 (자료가 있는 마지막 달)
  const months=Object.keys(byMonth).sort(),lastYm=months[months.length-1]||'',prevYm=months[months.length-2]||'';
  const pick=ym=>ym&&byMonth[ym]?{ym,people:byMonth[ym].people.size,amount:byMonth[ym].amount}:null;
  // 챙길 일 1: 최근 2번 연속 출금 오류
  const perNo={};cms.forEach(r=>{(perNo[normNo_(r.no)]=perNo[normNo_(r.no)]||[]).push(r);});
  const today=today_(),cut=new Date(new Date(today).getTime()-90*864e5),cutStr=Utilities.formatDate(cut,tz_(),'yyyy-MM-dd');
  const errors=[],quiet=[],noGender=[];
  // CMS 후원자가 통장 자동이체로 바꾼 경우: 같은 사람(이름+생년월일)의 통장 입금도 함께 봄
  const bankByCms={};bankObjects_().forEach(r=>{const k0=bankDonorKey_(r,idx);if(!k0.cmsNo)return;const k=normNo_(k0.cmsNo);if(!bankByCms[k]||bankByCms[k]<r.date)bankByCms[k]=r.date;});
  Object.keys(perNo).forEach(no=>{const list=perNo[no].sort((a,b)=>a.date.localeCompare(b.date)),last=list[list.length-1],prev=list[list.length-2],d=dm.get(no)||{};
    if(d.end&&d.end<=today)return;
    const bankLatest=bankByCms[no]||'';
    if(last&&prev&&!last.ok&&!prev.ok&&!(bankLatest&&bankLatest>=prev.date))errors.push({no:last.no,name:last.name,dates:[prev.date,last.date],msg:last.errMsg||String(last.errCode)});
    const okDates=list.filter(r=>r.ok&&r.paid>0).map(r=>r.date);let lastOk=okDates[okDates.length-1]||'';
    if(bankLatest>lastOk)lastOk=bankLatest;
    if(lastOk&&lastOk<cutStr)quiet.push({no:last.no,name:last.name,last:lastOk,source:'CMS'});
    if(!d.biz&&!d.gender&&!genderFromFront_(last.front)&&!isBusiness_(last.front))noGender.push({no:last.no,name:last.name});
  });
  const bankLast={};bankObjects_().forEach(r=>{const k0=bankDonorKey_(r,idx);if(k0.cmsNo)return;const k=k0.bankNo;if(!bankLast[k]||bankLast[k].date<r.date)bankLast[k]=r;});
  Object.keys(bankLast).forEach(k=>{const r=bankLast[k],d=dm.get(k)||{};if(d.end&&d.end<=today)return;if(r.date<cutStr)quiet.push({no:'',name:r.name,last:r.date,source:'통장'});});
  quiet.sort((a,b)=>a.last.localeCompare(b.last));
  return {year:Y,thisYear:series(Y),lastYear:series(Y-1),years:yearRows,latest:pick(lastYm),previous:pick(prevYm),
    yearNew:(yearRows.find(r=>r.year===Y)||{}).newCount||0,yearEnd:(yearRows.find(r=>r.year===Y)||{}).endCount||0,
    prevYearNew:(yearRows.find(r=>r.year===Y-1)||{}).newCount||0,prevYearEnd:(yearRows.find(r=>r.year===Y-1)||{}).endCount||0,
    errors,quiet,noGender,generatedAt:now_()};
}

