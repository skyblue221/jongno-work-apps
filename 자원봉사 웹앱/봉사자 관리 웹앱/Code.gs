/** 자원봉사자 관계관리 v1 · Google Sheets bound Apps Script */
const TABS = {
  PEOPLE:['ID','이름','생년월일','연령','연락처','VMS ID','1365 ID','소속','구분','등록일','상태','최초활동일','최근활동일','재능','관심활동','참여가능시간','참고사항','최종수정일'],
  ACTIVITY:['기록ID','봉사자ID','활동일','활동분야','횟수','시간','출처','외부기록ID','메모','입력일'],
  AWARDS:['기록ID','봉사자ID','종류','명칭','진행상태','추천자','기준일','메모','입력일'],
  CONTACT:['기록ID','봉사자ID','날짜','유형','메모','입력일'],
  JINWOO:['가져오기키','봉사일자','등록번호','봉사자','생년월일','봉사자인원','수혜자','수혜자인원','봉사시간','분','시간','활동장소','봉사분야','봉사활동','구분','특이사항','원본행','가져온일시'],
  HISTORY:['기록키','자료종류','연도','이름','생년월일','활동일','활동유형','시간','원본행','가져온날짜']
};
const PEOPLE_FIELDS=['name','phone','affiliation','kind','registrationDate','status','talents','interests','availability','notes'];
const FIELDS={
 PEOPLE:['id','name','birthDate','age','phone','vmsId','vol1365Id','affiliation','kind','registrationDate','status','firstActivityDate','lastActivityDate','talents','interests','availability','notes','updatedAt'],
 ACTIVITY:['id','personId','date','category','count','hours','source','externalId','note','createdAt'],
 AWARDS:['id','personId','type','name','status','recommendedBy','date','note','createdAt'],
 CONTACT:['id','personId','date','type','note','createdAt'],
 JINWOO:['importKey','date','registrationNumber','volunteerName','birthDate','volunteerCount','beneficiaryName','beneficiaryCount','timeRange','minutes','hours','place','field','activityType','bucket','note','sourceRow','importedAt'],
 HISTORY:['id','kind','year','name','birthDate','date','category','hours','sourceRow','importedAt']
};
function ss_(){const s=SpreadsheetApp.getActiveSpreadsheet();if(!s)throw Error('구글 시트에 연결된 Apps Script에서 실행해 주세요.');return s;}
function onOpen(){SpreadsheetApp.getUi().createMenu('자원봉사 관리').addItem('시트대시보드 만들기 / 새로고침','refreshSheetDashboard').addItem('전체데이터 새로고침','refreshAllDataSheet').addToUi();}
function movePeopleStatusToB_impl_(){return withLock_(()=>{
 assertPeopleSchema_();const sh=tab_('PEOPLE'),headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0],col=headers.indexOf('상태')+1;
 if(col===2){ss_().toast('상태는 이미 B열입니다.');return;}
 backupSheet_(sh,'PEOPLE');sh.moveColumns(sh.getRange(1,col,sh.getMaxRows(),1),2);sh.setFrozenColumns(3);ss_().toast('상태를 B열로 옮겼습니다. 기존 데이터는 유지됩니다.');
},['PEOPLE']);}
function setup_impl_(){
 const ss=ss_();
 Object.keys(TABS).forEach(k=>{let sh=ss.getSheetByName(k);if(!sh) sh=ss.insertSheet(k);if(sh.getLastRow()===0){sh.getRange(1,1,1,TABS[k].length).setValues([TABS[k]]);sh.setFrozenRows(1);sh.getRange(1,1,1,TABS[k].length).setFontWeight('bold').setBackground('#143c48').setFontColor('#ffffff');sh.autoResizeColumns(1,TABS[k].length);}});
 return '설정 완료: '+ss.getUrl();
}
function doGet(){if(!role_())return HtmlService.createHtmlOutput('<p style="font-family:sans-serif;padding:24px;line-height:1.6">접근 권한이 없습니다.<br>담당자에게 문의해 주세요.</p>').setTitle('자원봉사자 관리');return HtmlService.createHtmlOutputFromFile('Index').setTitle('자원봉사자 관리').addMetaTag('viewport','width=device-width, initial-scale=1');}
function tab_(key){const sh=ss_().getSheetByName(key);if(!sh)throw Error('시트가 없습니다. Apps Script에서 setup()을 먼저 실행하세요: '+key);return sh;}
function records_(key){const sh=tab_(key);if(key==='PEOPLE')assertPeopleSchema_();const v=sh.getDataRange().getValues();if(v.length<2)return [];const headers=v[0].map(x=>String(x).trim()),idCol=headers.indexOf(TABS[key][0]),columns=TABS[key].map(h=>headers.indexOf(h));return v.slice(1).filter(r=>r[idCol]).map(r=>Object.fromEntries(FIELDS[key].map((f,i)=>[f,f==='sourceRow'?sourceRowNumber_(r[columns[i]]):serialize_(r[columns[i]])])));}
let TZ_;function tz_(){return TZ_||(TZ_=Session.getScriptTimeZone());}
function serialize_(v){if(v instanceof Date)return Utilities.formatDate(v,tz_(),'yyyy-MM-dd');return v==null?'':v;}
function clean_(v,n=500){return String(v==null?'':v).trim().slice(0,n).replace(/^[=+@\-]/, m => '\'' + m);}
function date_(v){const s=clean_(v,10);if(s&&!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error('날짜는 YYYY-MM-DD 형식으로 입력하세요.');return s;}
function today_(){return Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');}
function onEdit(e){
 if(e&&e.range)invalidateReadCache_([e.range.getSheet().getName()]);
 if(!e||!e.range||e.range.getSheet().getName()!=='PEOPLE'||e.range.getLastRow()<2)return;
 withLock_(()=>{const sh=e.range.getSheet(),start=Math.max(2,e.range.getRow()),end=e.range.getLastRow();fillPeopleIds_(sh,start,end);fillPeopleAges_(sh,start,end);},['PEOPLE']);
}
function fillPeopleIds_(sh,start,end){
 const headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];
 const idCol=headers.indexOf('ID'),nameCol=headers.indexOf('이름');
 if(idCol<0||nameCol<0)throw Error('PEOPLE에 ID와 이름 열이 필요합니다.');
 let added=0;
 const values=sh.getRange(start,1,end-start+1,sh.getLastColumn()).getValues();
 values.forEach((row,i)=>{if(String(row[nameCol]||'').trim()&&!row[idCol]){sh.getRange(start+i,idCol+1).setValue(Utilities.getUuid());added++;}});
 return added;
}
function assignMissingPeopleIds_impl_(){return withLock_(()=>{const sh=tab_('PEOPLE');return sh.getLastRow()<2?0:fillPeopleIds_(sh,2,sh.getLastRow());},['PEOPLE']);}
function fillPeopleAges_(sh,start,end){
 const headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];
 const birthCol=headers.indexOf('생년월일'),ageCol=headers.indexOf('연령'),nameCol=headers.indexOf('이름');
 if(birthCol<0||ageCol<0||nameCol<0)throw Error('PEOPLE에 이름·생년월일·연령 열이 필요합니다.');
 const rows=sh.getRange(start,1,end-start+1,sh.getLastColumn()).getValues();let updated=0,invalid=0;
 rows.forEach((r,i)=>{
  let age='';
  if(String(r[nameCol]||'').trim()&&r[birthCol]){
   try{const birth=birth_(serialize_(r[birthCol]));age=age_(birth);if(age<0)throw Error('미래 생년월일');}catch(e){age='';invalid++;}
  }
  if(r[ageCol]!==age){sh.getRange(start+i,ageCol+1).setValue(age);updated++;}
 });
 return {updated,invalid};
}
function refreshPeopleAges_impl_(){return withLock_(()=>{const sh=tab_('PEOPLE');return sh.getLastRow()<2?{updated:0,invalid:0}:fillPeopleAges_(sh,2,sh.getLastRow());},['PEOPLE']);}
function append_(key,values){tab_(key).appendRow(values);}
/** tabs: 이 저장이 바꾸는 탭 (그 탭만 다시 읽게 함). 안 주면 전부 */
function withLock_(fn,tabs){const lock=LockService.getDocumentLock();lock.waitLock(15000);try{return fn();}finally{invalidateReadCache_(tabs);lock.releaseLock();}}
function personExists_(id){return records_('PEOPLE').some(p=>p.id===id);}
function uniquePhone_(phone,excludeId,people){const digits=String(phone).replace(/\D/g,'');if(!digits)return false;return (people||records_('PEOPLE')).some(p=>p.id!==excludeId&&String(p.phone).replace(/\D/g,'')===digits);}
function upsertPerson_impl_(p){return withLock_(()=>{assertPeopleSchema_();
 if(!p||!clean_(p.name,80))throw Error('이름을 입력해 주세요.');
 const id=clean_(p.id,60)||Utilities.getUuid(),sh=tab_('PEOPLE');
 const exists=records_('PEOPLE'),i=exists.findIndex(x=>x.id===id),prior=i>=0?exists[i]:null;
 const birth=personBirth_(p,prior);let personAge;try{personAge=age_(birth_(birth));}catch(e){personAge=prior?prior.age:'';}
 const row=[id,clean_(p.name,80),birth,personAge,clean_(p.phone,40),clean_(p.vmsId,100),clean_(p.vol1365Id,100),clean_(p.affiliation,100),clean_(p.kind,30),date_(p.registrationDate),clean_(p.status||'확인 필요',30),date_(p.firstActivityDate),date_(p.lastActivityDate),clean_(p.talents,300),clean_(p.interests,300),clean_(p.availability,150),clean_(p.notes,1000),today_()];
 const dup=duplicates_(exists,{id,name:p.name,birthDate:birth,phone:p.phone,vmsId:p.vmsId,vol1365Id:p.vol1365Id});
 if(dup.length && !p.confirmDuplicate) throw Error('중복 의심 봉사자: '+dup.map(x=>x.name+' ('+x.reason+')').join(', ')+'. 기존 명단에서 먼저 확인하세요.');
 if(i<0&&uniquePhone_(p.phone,id,exists)&&!p.confirmDuplicate)throw Error('같은 연락처의 봉사자가 이미 있습니다. 명단을 먼저 확인해 주세요.');
 const headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0],idCol=headers.indexOf('ID');
 if(i>=0){const values=sh.getDataRange().getValues(),physical=values.findIndex((r,n)=>n>0&&r[idCol]===id);sh.getRange(physical+1,1,1,headers.length).setValues([personValuesForHeaders_(headers,row,values[physical])]);}else sh.appendRow(personValuesForHeaders_(headers,row));
 return {id};
},['PEOPLE']);}
function addActivity_impl_(a){return withLock_(()=>{
 if(!personExists_(a.personId))throw Error('봉사자를 먼저 등록해 주세요.');
 const date=date_(a.date);if(!date)throw Error('활동일이 필요합니다.');
 const count=Number(a.count||1),hours=Number(a.hours||0);
 if(!Number.isFinite(count)||count<0||!Number.isFinite(hours)||hours<0)throw Error('횟수·시간은 0 이상의 숫자여야 합니다.');
 const source=clean_(a.source||'직접 입력',40),ext=clean_(a.externalId,120);
 if(ext&&records_('ACTIVITY').some(x=>x.source===source&&x.externalId===ext))throw Error('같은 출처·외부기록ID의 활동이 이미 등록되어 있습니다.');
 append_('ACTIVITY',[Utilities.getUuid(),a.personId,date,clean_(a.category,100),count,hours,source,ext,clean_(a.note,500),today_()]);return true;
},['ACTIVITY']);}
function addAward_impl_(a){return withLock_(()=>{
 if(!personExists_(a.personId))throw Error('봉사자를 먼저 등록해 주세요.');
 if(!clean_(a.name))throw Error('배지·포상명을 입력해 주세요.');
 append_('AWARDS',[Utilities.getUuid(),a.personId,clean_(a.type,40),clean_(a.name,120),clean_(a.status,40),clean_(a.recommendedBy,80),date_(a.date),clean_(a.note,600),today_()]);return true;
},['AWARDS']);}
function addContact_impl_(c){return withLock_(()=>{if(!personExists_(c.personId))throw Error('봉사자를 먼저 등록해 주세요.');append_('CONTACT',[Utilities.getUuid(),c.personId,date_(c.date),clean_(c.type,50),clean_(c.note,800),today_()]);return true;},['CONTACT']);}
/* ── 읽기 임시 저장(캐시) ──
   탭마다 '버전'을 따로 둬서, 저장한 탭만 다시 읽어요.
   (예전에는 무엇이든 저장하면 진우·과거자료까지 모든 탭을 처음부터 다시 읽었어요) */
const REV_KEYS=['PEOPLE','ACTIVITY','AWARDS','CONTACT','JINWOO','HISTORY','EXTRA'];   // EXTRA: 문자고정·권한·점심 등 그 밖의 탭
let REVS_=null,ALL_MEMO_=null;
function revKey_(k){return REV_KEYS.includes(k)?k:'EXTRA';}
function revs_(){
 if(REVS_)return REVS_;
 let p={};try{p=PropertiesService.getDocumentProperties().getProperties();}catch(e){}
 const base=p.volunteerReadRevision||'0';
 return (REVS_=Object.fromEntries(REV_KEYS.map(k=>[k,p['volunteerRev:'+k]||base])));
}
/** tabs를 주면 그 탭만, 안 주면 전부 새로 읽게 함 */
function invalidateReadCache_(tabs){
 const keys=Array.from(new Set((tabs&&tabs.length?tabs:REV_KEYS).map(revKey_))),u=Utilities.getUuid().slice(0,8),o={};
 keys.forEach(k=>o['volunteerRev:'+k]=u);
 try{PropertiesService.getDocumentProperties().setProperties(o);}catch(e){/* Caching is optional; data writes must still complete. */}
 REVS_=null;ALL_MEMO_=null;
}
function readCached_(label,load,deps){
 let cache,prefix;
 try{
  cache=CacheService.getScriptCache();
  const r=revs_();
  prefix=ss_().getId()+':read-v2:'+(deps||REV_KEYS).map(k=>r[revKey_(k)]).join('.')+':'+label;
  const manifest=JSON.parse(cache.get(prefix)||'null');
  if(manifest&&manifest.count>0&&manifest.count<=60){
   const keys=Array.from({length:manifest.count},(_,i)=>prefix+':'+manifest.token+':'+i),parts=cache.getAll(keys);
   if(keys.every(k=>typeof parts[k]==='string'))return JSON.parse(keys.map(k=>parts[k]).join(''));
  }
 }catch(e){cache=null;}
 const result=load();
 if(cache)try{
  // Small UTF-16 chunks stay below CacheService's per-value byte limit, including Korean text.
  const json=JSON.stringify(result),count=Math.ceil(json.length/30000);
  if(count&&count<=60){
   const token=Utilities.getUuid(),parts={};
   for(let i=0;i<count;i++)parts[prefix+':'+token+':'+i]=json.slice(i*30000,(i+1)*30000);
   cache.putAll(parts,21600);cache.put(prefix,JSON.stringify({count,token}),21600);
  }
 }catch(e){/* Eviction or quota failure falls back to normal reads. */}
 return result;
}
/** 탭 하나의 기록 (그 탭 버전이 같으면 시트를 다시 읽지 않음) */
function tabRecords_(key){return readCached_('tab:'+key,()=>['JINWOO','HISTORY'].includes(key)?safeRecords_(key):records_(key),[key]);}
function allData_(){
 const key=REV_KEYS.map(k=>revs_()[k]).join('.');
 if(ALL_MEMO_&&ALL_MEMO_.key===key)return ALL_MEMO_.v;   // 한 번 실행하는 동안은 한 번만 꺼냄
 const v={people:tabRecords_('PEOPLE'),activity:tabRecords_('ACTIVITY'),awards:tabRecords_('AWARDS'),contacts:tabRecords_('CONTACT'),jinwoo:tabRecords_('JINWOO'),history:tabRecords_('HISTORY')};
 ALL_MEMO_={key,v};return v;
}
function getAppData_impl_(requestedYear){
 const all=allData_(),year=Number(requestedYear)||Number(today_().slice(0,4));
 const years=Array.from(new Set([...(all.history||[]).map(r=>Number(r.year)),...(all.jinwoo||[]).map(r=>Number(String(r.date).slice(0,4))),...(all.activity||[]).map(r=>Number(String(r.date).slice(0,4)))].filter(y=>Number.isInteger(y)&&y>=1900&&y<=2200)));
 return {people:all.people,awards:all.awards,activity:[],history:[],jinwoo:[],years,initialStats:getDashboardStats_impl_(year),initialYear:year};
}
function refreshAppData(year){invalidateReadCache_();return getAppData(year);}
/* ── 미리 읽어 두기: 읽어 둔 자료는 6시간이 지나면 사라져서 아침 첫 화면이 15초 넘게 걸렸어요.
   편집기에서 installWarmTrigger를 한 번 ▶실행하면 4시간마다 warmCache가 자동으로 돌며 미리 읽어 둬요. */
function warmCache(){const y=Number(today_().slice(0,4));getAppData_impl_(y);getLookupData_impl_(y);getDashboardHome_impl_(y);}
function installWarmTrigger(){
 ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='warmCache').forEach(t=>ScriptApp.deleteTrigger(t));
 ScriptApp.newTrigger('warmCache').timeBased().everyHours(4).create();
 warmCache();
 Logger.log('4시간마다 미리 읽어 두기를 켰어요.');
}
function safeRecords_(key){return ss_().getSheetByName(key)?records_(key):[];}
/** 입수 가능한 과거 자료 범위가 불완전하면 '신규 확인 필요'로 집계합니다. */
function statsForYear_impl_(year,all){
 const a=all.activity,people=all.people,y=String(year),personYears={};
 a.forEach(function(r) {
   if (!r.date) return;
   var personId = String(r.personId);
   if (!personYears[personId]) {
     personYears[personId] = new Set();
   }
   personYears[personId].add(String(r.date).slice(0, 4));
 });
 const activeIds=new Set(a.filter(r=>String(r.date).startsWith(y)).map(r=>r.personId));
 const prevIds=new Set(a.filter(r=>String(r.date).startsWith(String(year-1))).map(r=>r.personId));
 const firstThisYear=[...activeIds].filter(id=>Math.min(...(personYears[id]||[]))===Number(year));
 const repeat=[...activeIds].filter(id=>prevIds.has(id));
 const returnees=[...activeIds].filter(id=>!prevIds.has(id)&&[...(personYears[id]||[])].some(yr=>Number(yr)<year));
 const rows=a.filter(r=>String(r.date).startsWith(y));
 return {year,real:activeIds.size,prior:prevIds.size,change:activeIds.size-prevIds.size,firstRecorded:firstThisYear.length,retained:repeat.length,returned:returnees.length,totalCount:rows.reduce((s,r)=>s+Number(r.count||0),0),totalHours:rows.reduce((s,r)=>s+Number(r.hours||0),0),registered:people.length,activeStatus:people.filter(p=>p.status==='활동 중').length};
}

/** 사용자가 명시적으로 실행하는 백업·초기화: 원본 시트 삭제하지 않음. */
function migratePeopleV2_impl_(){
 const ss=ss_(),sh=tab_('PEOPLE'),expected=TABS.PEOPLE;
 if(sh.getLastRow()>0){
  const name='People_backup_'+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd_HHmmss');
  const backup=sh.copyTo(ss);backup.setName(name);
 }
 sh.clearContents();sh.getRange(1,1,1,expected.length).setValues([expected]);sh.setFrozenRows(1);
 return 'People 18열 설정 완료. 기존 People은 People_backup_... 탭에 보관되었습니다.';
}
function assertPeopleSchema_(){
 const sh=tab_('PEOPLE'),expected=TABS.PEOPLE;
 const got=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(x=>String(x).trim());
 if(expected.some(x=>got.filter(h=>h===x).length!==1))throw Error('PEOPLE 필수 머리글이 누락되었거나 중복되었습니다. ID·이름·상태 등 기존 열 제목을 확인하세요.');
}
function personValuesForHeaders_(headers,values,existing){return headers.map((h,i)=>{const col=TABS.PEOPLE.indexOf(String(h).trim());return col>=0?values[col]:existing?existing[i]:'';});}
function birth_(v){
 const str=String(v==null?'':v).trim().replace(/\./g,'-').replace(/\//g,'-');
 if(!str)return '';
 if(!/^\d{4}-\d{1,2}-\d{1,2}$/.test(str))throw Error('생년월일은 YYYY-MM-DD로 입력해 주세요.');
 const p=str.split('-').map(Number),d=new Date(p[0],p[1]-1,p[2]);
 if(d.getFullYear()!==p[0]||d.getMonth()!==p[1]-1||d.getDate()!==p[2])throw Error('유효하지 않은 생년월일입니다.');
 return [p[0],String(p[1]).padStart(2,'0'),String(p[2]).padStart(2,'0')].join('-');
}
function age_(birth){if(!birth)return '';const now=today_().split('-').map(Number),parts=birth.split('-').map(Number);return now[0]-parts[0]-(now[1]<parts[1]||(now[1]===parts[1]&&now[2]<parts[2])?1:0);}
function duplicates_(people,p){
 const digits=x=>String(x||'').replace(/\D/g,'');
 return people.filter(x=>x.id!==p.id).map(x=>{
  let reason='';
  if(p.vmsId&&x.vmsId&&String(p.vmsId)===String(x.vmsId))reason='VMS ID 일치';
  else if(p.vol1365Id&&x.vol1365Id&&String(p.vol1365Id)===String(x.vol1365Id))reason='1365 ID 일치';
  else if(p.name&&p.birthDate&&x.name===p.name&&x.birthDate===p.birthDate)reason='이름·생년월일 일치';
  else if(p.name&&digits(p.phone).length>=9&&x.name===p.name&&digits(x.phone)===digits(p.phone))reason='이름·연락처 일치';
  return reason?{id:x.id,name:x.name,reason:reason}:null;
 }).filter(Boolean);
}
function checkPersonDuplicate_impl_(p){assertPeopleSchema_();return duplicates_(records_('PEOPLE'),p);}
/** CSV를 브라우저에서 파싱한 후 검토하고 가져온다. 기존 인물은 자동 덮어쓰지 않는다. */
function importPeople_impl_(rows){return withLock_(()=>{
 assertPeopleSchema_();if(!Array.isArray(rows)||rows.length>3000)throw Error('한 번에 최대 3,000명까지 가져올 수 있습니다.');
 const existing=records_('PEOPLE'),added=[],skipped=[];
 rows.forEach((p,index)=>{
  try{
   const name=clean_(p.name,80);if(!name)throw Error('이름 누락');
   const birth=validatedPersonBirth_(p.birthDate),candidate={name:name,birthDate:birth,phone:p.phone,vmsId:p.vmsId,vol1365Id:p.vol1365Id};
   const d=duplicates_(existing.concat(added),candidate);
   if(d.length){skipped.push({line:index+2,name:name,reason:d.map(x=>x.reason).join(', ')});return;}
   const id=Utilities.getUuid();
   const row=[id,name,birth,age_(birth),clean_(p.phone,40),clean_(p.vmsId,100),clean_(p.vol1365Id,100),clean_(p.affiliation,100),clean_(p.kind||'개인',30),date_(p.registrationDate), '확인 필요','', '',clean_(p.talents,300),clean_(p.interests,300),clean_(p.availability,150),clean_(p.notes,1000),today_()];
   added.push({id:id,name:name,birthDate:birth,phone:p.phone,vmsId:p.vmsId,vol1365Id:p.vol1365Id,row:row});
  }catch(e){skipped.push({line:index+2,name:p.name||'',reason:e.message});}
 });
 if(added.length){const sh=tab_('PEOPLE'),headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];sh.getRange(sh.getLastRow()+1,1,added.length,headers.length).setValues(added.map(a=>personValuesForHeaders_(headers,a.row)));}
 return {added:added.length,skipped:skipped};
});}

/** 진우 기간별봉사현황: 구글시트로 붙여 넣은 원본 탭에서 가져온다. */
function importJinwooFromRawSheet_impl_(sheetName){return withLock_(()=>{
 const ss=ss_(),rawName=clean_(sheetName||'JinwooRaw',80),source=ss.getSheetByName(rawName);
 if(Object.keys(TABS).includes(rawName)||rawName===ALL_DATA_SHEET)throw Error('원본은 JinwooRaw 등 별도 탭에 넣어 주세요.');
 if(!source)throw Error(rawName+' 시트를 찾지 못했습니다. 진우 엑셀을 구글시트로 열고 전체 표를 이 탭에 붙여 넣어 주세요.');
 ensureSheet_('JINWOO');
 const parsed=parseJinwooRows_(source.getDataRange().getDisplayValues());
 const existing=records_('JINWOO'),importedAt=today_();
 const incoming=parsed.rows.map(r=>Object.assign({},r,{importKey:jinwooRecordKey_(r),bucket:jinwooType_(r),minutes:num_(r.minutes),hours:num_(r.minutes)/60,timeRange:emptyTime_(r.timeRange),importedAt}));
 const result=mergeJinwooRecords_(existing,incoming);
 const rows=result.rows.map(r=>FIELDS.JINWOO.map(f=>r[f]==null?'':r[f]));
 const sh=tab_('JINWOO');
 if(existing.length)backupSheet_(sh,'JINWOO');
 if(rows.length){
  sh.getRange(2,2,rows.length,1).setNumberFormat('@');
  sh.getRange(2,3,rows.length,1).setNumberFormat('@');
  sh.getRange(2,10,rows.length,2).setNumberFormat('0.########');
  sh.getRange(2,17,rows.length,1).setNumberFormat('0');
  sh.getRange(2,1,rows.length,TABS.JINWOO.length).setValues(rows);
 }
 if(sh.getLastRow()>rows.length+1)sh.getRange(rows.length+2,1,sh.getLastRow()-rows.length-1,TABS.JINWOO.length).clearContent();
 return Object.assign(getJinwooSummary(),{inserted:result.inserted,updated:result.updated,sourceRows:parsed.rows.length});
});}
// The supplied export reuses a number across education and placement rows.
function jinwooRecordKey_(r){const no=String(r.registrationNumber||'').trim();if(!no)throw Error('등록번호가 없는 실적은 가져올 수 없습니다.');const type=jinwooType_(r);return JSON.stringify([no,type==='미분류'?String(r.activityType||'').trim():type]);}
function mergeJinwooRecords_(existing,incoming){
 const map=new Map(),seen=new Set();let inserted=0,updated=0;
 existing.forEach(r=>{const key=jinwooRecordKey_(r);if(map.has(key))throw Error('기존 자료에 같은 등록번호·활동구분이 여러 건 있습니다: '+r.registrationNumber+'. 원본 확인이 필요합니다.');map.set(key,Object.assign({},r,{importKey:key}));});
 incoming.forEach(r=>{const key=jinwooRecordKey_(r);if(seen.has(key))throw Error('원본에 같은 등록번호·활동구분이 여러 건 있습니다: '+r.registrationNumber);seen.add(key);if(map.has(key))updated++;else inserted++;map.set(key,Object.assign({},r,{importKey:key}));});
 return {rows:Array.from(map.values()),inserted,updated};
}

function getJinwooYearStats_impl_(year){return jinwooYearStats_(tabRecords_('JINWOO'),Number(year));}
function jinwooYearStats_(rows,year){
 if(!Number.isInteger(year)||year<1900||year>2200)throw Error('기준연도를 확인해 주세요.');
 const names=list=>new Set(list.map(r=>String(r.volunteerName||'').trim()).filter(Boolean));
 const current=rows.filter(r=>String(r.date).slice(0,4)===String(year)),previous=names(rows.filter(r=>String(r.date).slice(0,4)===String(year-1))),past=names(rows.filter(r=>String(r.date).slice(0,4)<String(year)));
 const all=names(current),byType={},rowCounts={};
 current.forEach(r=>{const type=jinwooType_(r);if(!byType[type])byType[type]=new Set();if(r.volunteerName)byType[type].add(String(r.volunteerName).trim());});
 current.forEach(r=>{const type=jinwooType_(r);rowCounts[type]=(rowCounts[type]||0)+1;});
 const serviceNames=byType['활동']||new Set();
 return {year,real:all.size,rows:current.length,nonService:Array.from(all).filter(n=>!serviceNames.has(n)).length,rowCounts,prior:previous.size,priorRows:rows.filter(r=>String(r.date).slice(0,4)===String(year-1)).length,notPrevious:Array.from(all).filter(n=>!previous.has(n)).length,firstRecorded:Array.from(all).filter(n=>!past.has(n)).length,byType:Object.fromEntries(Object.keys(byType).map(k=>[k,byType[k].size])),hours:current.reduce((s,r)=>s+Number(r.minutes||0),0)/60,unnamed:current.filter(r=>!String(r.volunteerName||'').trim()).length};
}
function ensureSheet_(key){
 const ss=ss_();let sh=ss.getSheetByName(key);if(!sh)sh=ss.insertSheet(key);
 const expected=TABS[key];
 if(!sh.getLastRow()){sh.getRange(1,1,1,expected.length).setValues([expected]);sh.setFrozenRows(1);return;}
 const values=sh.getDataRange().getValues(),headers=values[0].map(x=>String(x).trim());
 if(expected.every((x,i)=>headers[i]===x))return;
 if(headers.some((x,i)=>x&&headers.indexOf(x)!==i)||headers.some(x=>x&&!expected.includes(x)))throw Error(key+' 열 구성을 확인해 주세요. 원본은 유지되었습니다.');
 // Reorder values with headers; never relabel existing columns in place.
 const mapped=values.slice(1).map(row=>expected.map(h=>headers.includes(h)?row[headers.indexOf(h)]:''));
 backupSheet_(sh,key);
 sh.getRange(1,1,mapped.length+1,expected.length).setValues([expected].concat(mapped));
}

function getJinwooSummary_impl_(){
 const rows=safeRecords_('JINWOO'),counts={};
 let min='',max='',minutes=0,zero=0;
 rows.forEach(r=>{counts[r.activityType||'(빈 값)']=(counts[r.activityType||'(빈 값)']||0)+1;minutes+=Number(r.minutes||0);if(Number(r.minutes||0)===0)zero++;if(r.date){if(!min||r.date<min)min=r.date;if(r.date>max)max=r.date;}});
 return {rows:rows.length,dateMin:min,dateMax:max,totalMinutes:minutes,totalHours:minutes/60,zeroMinuteRows:zero,activityCounts:counts};
}
function backupSheet_(sheet,prefix){
 const backup=sheet.copyTo(ss_());
 backup.setName(prefix+'_backup_'+Utilities.getUuid().slice(0,8));backup.hideSheet();
 return backup;
}
function organizeUnusedSheets_impl_(){return withLock_(()=>{
 const ss=ss_(),sheets=ss.getSheets(),hidden=[];
 let visible=sheets.filter(sh=>!sh.isSheetHidden()).length;
 sheets.forEach(sh=>{
  const name=sh.getName();
  if(!/^(JINWOO_REVIEW|JINWOO_LINKS)$/i.test(name)&&!/^(JINWOO|HISTORY|PEOPLE)_backup_/i.test(name))return;
  if(sh.isSheetHidden()||visible<=1)return;
  sh.hideSheet();visible--;hidden.push(name);
 });
 return {hidden};
});}
function parseJinwooRows_(values){
 const headerIndex=values.findIndex(r=>r.indexOf('봉사일자')>=0&&r.indexOf('등록번호')>=0&&r.indexOf('봉사활동')>=0);
 if(headerIndex<0)throw Error('진우 머리글을 찾지 못했습니다. 필요한 열: 봉사일자, 등록번호, 봉사활동');
 const h=values[headerIndex].map(x=>clean_(x,80)),idx=name=>h.indexOf(name);
 const col={no:idx('NO'),date:idx('봉사일자'),registrationNumber:idx('등록번호'),volunteerName:idx('봉사자'),birthDate:firstExistingHeader_(h,['생년월일','생년월일(봉사자)','봉사자생년월일','생년월일/성별']),volunteerCount:idx('봉사자인원'),beneficiaryName:idx('수혜자'),beneficiaryCount:idx('수혜자인원'),timeRange:idx('봉사시간'),minutes:idx('분'),place:idx('활동장소'),field:idx('봉사분야'),activityType:idx('봉사활동'),note:idx('특이사항')};
 const required=['date','registrationNumber','activityType'];required.forEach(k=>{if(col[k]<0)throw Error('진우 원본에 필요한 열이 없습니다: '+k);});
 const rows=[];
 values.slice(headerIndex+1).forEach((r,i)=>{
  if(!r.some(v=>clean_(v)))return;
  const item={sourceRow:headerIndex+2+i,date:normDate_(r[col.date]),registrationNumber:clean_(r[col.registrationNumber],60),volunteerName:clean_(r[col.volunteerName],100),birthDate:col.birthDate>=0?normDate_(r[col.birthDate]):'',volunteerCount:r[col.volunteerCount],beneficiaryName:clean_(r[col.beneficiaryName],100),beneficiaryCount:r[col.beneficiaryCount],timeRange:clean_(r[col.timeRange],40),minutes:r[col.minutes],place:clean_(r[col.place],120),field:clean_(r[col.field],80),activityType:clean_(r[col.activityType],80),note:clean_(r[col.note],500)};
  try{if(!item.date||birth_(item.date)!==item.date)throw Error('날짜 오류');if(!item.registrationNumber||!item.activityType)throw Error('등록번호·봉사활동 누락');const minutes=Number(String(item.minutes||'0').replace(/,/g,''));if(!Number.isFinite(minutes)||minutes<0)throw Error('분 값 오류');}catch(e){throw Error(item.sourceRow+'행: '+e.message);}
  item.key=[item.date,item.registrationNumber,emptyTime_(item.timeRange),num_(item.minutes),item.place,item.activityType,item.note].join('|');
  rows.push(item);
 });
 return {headerRow:headerIndex+1,rows:rows};
}
function normDate_(v){if(v instanceof Date)return Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM-dd');const s=clean_(v,20).replace(/\./g,'-').replace(/\//g,'-');const m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);return m?[m[1],String(m[2]).padStart(2,'0'),String(m[3]).padStart(2,'0')].join('-'):s;}
function firstExistingHeader_(headers,names){for(let i=0;i<names.length;i++){const index=headers.indexOf(names[i]);if(index>=0)return index;}return -1;}
function num_(v){const n=Number(String(v==null?'':v).replace(/,/g,''));return Number.isFinite(n)?n:0;}
function emptyTime_(v){const s=clean_(v,40);return s.replace(/\s/g,'')===':~:'?'':s;}
function bucketJinwoo_(v){const s=String(v||'').replace(/\s/g,'');if(s==='교육')return '교육';if(['모집및연계','모집·연계','모집연계'].includes(s))return '모집·연계';if(s==='활동'||s==='기업(단체)활동')return '활동';return s||'기타';}
function jinwooType_(row){
 const known=['교육','모집·연계','활동'];
 // Current sheets classify in 봉사분야; older exports classify in 봉사활동.
 for(const value of [row.field,row.activityType,row.bucket]){const type=bucketJinwoo_(value);if(known.includes(type))return type;}
 return '미분류';
}

function getDashboardStats_impl_(year){return readCached_('stats:'+Number(year),()=>dashboardStats_(allData_(),Number(year)));}
function historyDate_(value){
 if(value instanceof Date)return serialize_(value);
 const text=String(value||'').trim();
 if(!text)return '';
 let match=text.match(/^(\d{4})[-./]\s*(\d{1,2})[-./]\s*(\d{1,2})\.?$/);
 if(!match)match=text.match(/^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일?$/);
 if(!match){const m=text.match(/^(?:[월화수목금토일]요일,?\s*)?(\d{1,2})월\s*(\d{1,2})(?:일)?\s*,\s*(\d{4})$/);if(m)match=['',m[3],m[1],m[2]];}
 if(!match)throw Error('날짜 형식을 확인해 주세요. YYYY-MM-DD를 권장합니다.');
 return birth_([match[1],match[2],match[3]].join('-'));
}
function parseHistory_(values,kind,year){
 if(!['roster','activity'].includes(kind)||!Number.isInteger(year)||year<1900||year>2200)throw Error('자료 종류와 연도를 확인해 주세요.');
 const text=v=>String(v==null?'':v).replace(/\s/g,'').trim();
 const h=values.findIndex(row=>row.some(v=>['성명','이름'].includes(text(v)))&&row.some(v=>text(v)==='생년월일'));
 if(h<0)throw Error('성명(또는 이름)과 생년월일 머리글을 찾지 못했습니다.');
 const titleYears=new Set(values.slice(0,h).flat().map(v=>String(v||'').match(/(\d{4})년/)).filter(Boolean).map(m=>Number(m[1])));
 if(titleYears.size===1&&!titleYears.has(year))throw Error('표 제목의 연도와 선택 연도가 다릅니다.');
 const headers=values[h].map(text),nameCols=headers.map((v,i)=>['성명','이름'].includes(v)?i:-1).filter(i=>i>=0);
 if(nameCols.length!==1)throw Error('연도가 나란히 있는 표는 가져올 연도의 범위만 지정해 주세요.');
 const nameCol=nameCols[0],birthCol=headers.indexOf('생년월일'),dateCol=headers.indexOf('날짜');
 const lower=(values[h+1]||[]).map(text);
 let hoursCol=headers.indexOf('총시간');if(hoursCol<0)hoursCol=lower.indexOf('총시간');
 if(kind==='activity'&&(dateCol<0||hoursCol<0))throw Error('연인원 표에 날짜와 총시간 머리글이 필요합니다.');
 const result=[],seen=new Set();
 values.slice(h+1).forEach((row,i)=>{
  const name=String(row[nameCol]||'').trim();if(!name||['합계','총계','성명','이름'].includes(name))return;
  const sourceRow=h+2+i;
  try{
   const birthDate=historyDate_(row[birthCol]);if(birthDate&&birthDate>today_())throw Error('미래 생년월일');
   let date='',hours=0,category='';
   if(kind==='activity'){
    date=historyDate_(row[dateCol]);if(!date||Number(date.slice(0,4))!==year)throw Error('활동일의 연도가 선택 연도와 다릅니다.');
    const value=String(row[hoursCol]==null?'':row[hoursCol]).trim();hours=Number(value.replace(/,/g,''));
    if(!value||!Number.isFinite(hours)||hours<0)throw Error('총시간은 0 이상의 숫자여야 합니다.');
    const categoryCol=lower.indexOf('활동유형')>=0?lower.indexOf('활동유형'):headers.indexOf('활동유형');category=categoryCol>=0?String(row[categoryCol]||'').trim():'';
   }
   const key=JSON.stringify([kind,year,name,birthDate,kind==='activity'?sourceRow:'']);
   if(seen.has(key))return;seen.add(key);
   result.push({id:key,kind,year,name:clean_(name,100),birthDate,date,category:clean_(category,100),hours,sourceRow,importedAt:today_()});
  }catch(e){throw Error(sourceRow+'행: '+e.message);}
 });
 if(!result.length)throw Error('가져올 사람이 없습니다. 연도와 범위를 확인해 주세요.');
 return result;
}
function readHistorySource_(options){
 if(!options)throw Error('가져오기 정보를 입력해 주세요.');
 const source=ss_().getSheetByName(String(options.sheetName||'').trim());
 if(!source||Object.keys(TABS).includes(source.getName())||source.getName()===ALL_DATA_SHEET)throw Error('원본을 별도 탭에 복사하고 그 탭 이름을 입력해 주세요.');
 const range=String(options.range||'').trim();
 if(range&&!/^[A-Z]+[1-9]\d*:[A-Z]+[1-9]\d*$/i.test(range))throw Error('범위는 A1:T1000 형식으로 입력하세요.');
 const dataRange=range?source.getRange(range):source.getDataRange();
 if(dataRange.getNumRows()>20000||dataRange.getNumColumns()>100)throw Error('한 번에 20,000행, 100열 이내로 범위를 지정하세요.');
 return parseHistory_(dataRange.getValues(),options.kind,Number(options.year));
}
function previewHistoryImport_impl_(options){
 const rows=readHistorySource_(options);
 return {rows:rows.length,people:new Set(rows.map(r=>JSON.stringify([r.name,r.birthDate]))).size,hours:rows.reduce((s,r)=>s+r.hours,0),year:Number(options.year),kind:options.kind};
}
function importHistory_impl_(options){return withLock_(()=>{
 if(!options||options.confirmReplace!==true)throw Error('미리보기 후 가져오기를 실행해 주세요.');
 const incoming=readHistorySource_(options),year=Number(options.year),existing=safeRecords_('HISTORY');
 const retained=existing.filter(r=>!(Number(r.year)===year&&r.kind===options.kind));
 ensureSheet_('HISTORY');const sh=tab_('HISTORY');
 if(existing.length)backupSheet_(sh,'HISTORY');
 const rows=retained.concat(incoming).map(r=>FIELDS.HISTORY.map(f=>r[f]==null?'':r[f]));
 sh.getRange(2,1,rows.length,TABS.HISTORY.length).setValues(rows);
 if(sh.getLastRow()>rows.length+1)sh.getRange(rows.length+2,1,sh.getLastRow()-rows.length-1,TABS.HISTORY.length).clearContent();
 return {rows:incoming.length,year,kind:options.kind};
});}
function volunteerIdentity_(all){
 const people=all.people||[],history=all.history||[];
 const byId=new Map(people.map(p=>[String(p.id),p])),byName=new Map();
 const nameOf=v=>String(v||'').trim();
 people.forEach(p=>{const name=nameOf(p.name);if(!byName.has(name))byName.set(name,[]);byName.get(name).push(p);});
 const births=new Map();
 people.concat(history).forEach(r=>{const name=nameOf(r.name),birth=normDate_(r.birthDate);if(!birth)return;if(!births.has(name))births.set(name,new Set());births.get(name).add(birth);});
 const identityRaw=(name,birth)=>{
  const candidates=byName.get(name)||[],known=births.get(name)||new Set();
  if(!name)return '';
  if(birth){const exact=candidates.filter(p=>normDate_(p.birthDate)===birth);if(exact.length===1)return 'id:'+exact[0].id;if(exact.length>1)return '';}
  if(!birth&&(known.size>1||candidates.length>1))return '';
  if(candidates.length===1&&(!birth||!candidates[0].birthDate||normDate_(candidates[0].birthDate)===birth))return 'id:'+candidates[0].id;
  return known.size>1||candidates.length?'birth:'+JSON.stringify([name,birth]):'name:'+name;
 };
  const memo=new Map();
 const identity=(name,birth)=>{const k=name+'\u0000'+birth;if(!memo.has(k))memo.set(k,identityRaw(name,birth));return memo.get(k);};
 return {byId,byName,identity,nameOf};
}
function getPersonDetail_impl_(personId){return personDetail_(allData_(),String(personId));}
function personDetail_(all,personId,preparedResolver){
 const resolver=preparedResolver||volunteerIdentity_(all),person=resolver.byId.get(String(personId));
 if(!person)throw Error('봉사자를 찾지 못했습니다. 명단을 새로고침해 주세요.');
 const target='id:'+person.id,name=resolver.nameOf(person.name),history=all.history||[],jinwoo=all.jinwoo||[];
 let uncertainJinwoo=0,uncertainHistory=0;
 const matchedJinwoo=jinwoo.filter(r=>{const matched=resolver.identity(resolver.nameOf(r.volunteerName),'')===target;if(!matched&&resolver.nameOf(r.volunteerName)===name)uncertainJinwoo++;return matched;});
 const matchedHistory=history.filter(r=>{const matched=resolver.identity(resolver.nameOf(r.name),normDate_(r.birthDate))===target;if(!matched&&resolver.nameOf(r.name)===name)uncertainHistory++;return matched;});
 const entries=matchedJinwoo.map(r=>({date:r.date,category:jinwooType_(r),description:r.activityType||r.note||'',note:r.note||'',hours:Number(r.minutes||0)/60,count:1,source:'진우',registrationNumber:String(r.registrationNumber||''),excludedReason:''}));
 const jinwooYears=new Set(jinwoo.map(r=>String(r.date||'').slice(0,4)));
 matchedHistory.filter(r=>r.kind==='activity').forEach(r=>entries.push({date:r.date,category:r.category||'활동',description:'',note:'',hours:Number(r.hours||0),count:1,source:'과거 연인원',excludedReason:jinwooYears.has(String(r.year))?'같은 연도 진우 우선: 시간 합계 제외':''}));
 (all.activity||[]).filter(r=>String(r.personId)===String(personId)).forEach(r=>{
  const referenced=matchedJinwoo.filter(j=>String(j.registrationNumber)===String(r.externalId)&&r.externalId);
  const duplicate=r.source==='진우'&&(referenced.length===1||referenced.filter(j=>jinwooType_(j)===bucketJinwoo_(r.category)).length===1);
  entries.push({date:r.date,category:r.category||'활동',description:r.note||'',note:'',hours:Number(r.hours||0),count:Number(r.count||0),source:r.source||'직접 입력',excludedReason:duplicate?'진우 실적 중복: 시간 합계 제외':''});
 });
 entries.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 const rosterYears=Array.from(new Set(matchedHistory.filter(r=>r.kind==='roster').map(r=>String(r.year)))).sort();
 const dates=entries.map(r=>String(r.date||'')).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
 const participationYears=Array.from(new Set(rosterYears.concat(dates.map(d=>d.slice(0,4))))).sort();
 const awards=(all.awards||[]).filter(r=>String(r.personId)===String(personId)),contacts=(all.contacts||[]).filter(r=>String(r.personId)===String(personId));
 return {person,entries,awards,contacts,rosterYears,participationYears,uncertainJinwoo,uncertainHistory,firstDate:dates[0]||'',lastDate:dates[dates.length-1]||'',hours:entries.reduce((s,r)=>s+(r.excludedReason?0:r.hours),0)};
}
function dashboardStats_(all,year,withEvents){
 if(!Number.isInteger(year)||year<1900||year>2200)throw Error('기준연도를 확인해 주세요.');
 const people=all.people||[],jinwoo=all.jinwoo||[],activity=all.activity||[],history=all.history||[];
 const {byId,byName,identity,nameOf}=volunteerIdentity_(all);
 let nameMatched=0,unresolved=0,ambiguous=0;
 const events=jinwoo.map(r=>{
  const name=nameOf(r.volunteerName),candidates=byName.get(name)||[];
  const person=candidates.length===1?candidates[0]:null;
  if(person)nameMatched++;else unresolved++;
  if(!person&&candidates.length>1)ambiguous++;
  return {date:String(r.date||''),key:identity(name,''),hours:Number(r.minutes||0)/60,type:jinwooType_(r),registrationNumber:String(r.registrationNumber||''),name,origin:'jinwoo'};
 });
 const jinwooYears=new Set(jinwoo.map(r=>String(r.date||'').slice(0,4)));let suppressedHistory=0;
 history.forEach(r=>{
  const name=nameOf(r.name),isActivity=r.kind==='activity',overlap=isActivity&&jinwooYears.has(String(r.year));
  if(overlap&&Number(r.year)===year)suppressedHistory++;
  // Year-only roster presence is not assigned a fabricated activity date.
  events.push({date:isActivity?String(r.date):String(r.year),key:identity(name,normDate_(r.birthDate)),hours:isActivity&&!overlap?Number(r.hours||0):0,type:isActivity?'활동':'연도별 명단',name,origin:'history'});
 });
 let duplicateManual=0,possibleDuplicate=0;
 activity.forEach(r=>{
  const p=byId.get(String(r.personId)),key=p?'id:'+p.id:'',date=String(r.date||''),hours=Number(r.hours||0);
  const external=String(r.externalId||'').trim(),type=bucketJinwoo_(r.category);
  // Exclude only a confirmed source/record reference, never a guessed time match.
  const referenced=String(r.source||'').trim()==='진우'&&external&&key?events.filter(e=>e.origin==='jinwoo'&&e.registrationNumber===external&&e.key===key):[];
  const exactReference=referenced.length===1||referenced.filter(e=>e.type===type).length===1;
  if(exactReference){duplicateManual++;return;}
  if(events.some(e=>['jinwoo','history'].includes(e.origin)&&key&&e.key===key&&e.date===date&&e.hours===hours))possibleDuplicate++;
  events.push({date,key,hours,type,name:p?nameOf(p.name):'',origin:'manual'});
 });
 const current=events.filter(e=>e.date.slice(0,4)===String(year)),previous=events.filter(e=>e.date.slice(0,4)===String(year-1)),past=events.filter(e=>e.date.slice(0,4)<String(year));
 const keys=rows=>new Set(rows.map(e=>e.key).filter(Boolean));
 const ids=keys(current),prev=keys(previous),old=keys(past);
 const combined={real:ids.size,prior:prev.size,change:ids.size-prev.size,firstRecorded:Array.from(ids).filter(id=>!old.has(id)).length,notPrevious:Array.from(ids).filter(id=>!prev.has(id)).length,retained:Array.from(ids).filter(id=>prev.has(id)).length,returned:Array.from(ids).filter(id=>!prev.has(id)&&old.has(id)).length,hours:current.reduce((s,e)=>s+e.hours,0),activeStatus:people.filter(p=>p.status==='활동 중').length,unidentified:current.filter(e=>!e.key).length,priorRows:previous.length};
 const counts={},dates=jinwoo.map(r=>String(r.date||'')).filter(Boolean).sort();
 jinwoo.forEach(r=>{const type=jinwooType_(r);counts[type]=(counts[type]||0)+1;});
 const yearJinwoo=current.filter(e=>e.origin==='jinwoo'),excludedNames=new Set(current.filter(e=>!e.key&&e.name).map(e=>e.name));
 const diagnostics={excludedNames:excludedNames.size,excludedRows:combined.unidentified,identifiedJinwoo:keys(yearJinwoo).size,unclassifiedRows:yearJinwoo.filter(e=>e.type==='미분류').length,missingNameRows:current.filter(e=>!e.name).length};
 const result={year,combined,diagnostics,duplicateManual,possibleDuplicate,suppressedHistory,historyRows:history.length,summary:{rows:jinwoo.length,hours:jinwoo.reduce((s,r)=>s+Number(r.minutes||0),0)/60,counts,nameMatched,unresolved,ambiguous,dateMin:dates[0]||'',dateMax:dates[dates.length-1]||''},jinwooYear:jinwooYearStats_(jinwoo,year)};
 if(withEvents)result.events=events;
 return result;
}
function getDashboardEvidence_impl_(options){return dashboardEvidence_(allData_(),Number(options&&options.year),String(options&&options.metric||''));}
const ALL_DATA_SHEET='전체데이터';
const ALL_DATA_TITLE='자원봉사 전체데이터 — 자동 생성';
function allDataRows_(all,year){
 const resolver=volunteerIdentity_(all),stats=dashboardStats_(all,year,true),groups=new Map();
 const getGroup=(key,name)=>{
  const groupKey=key||'unresolved:'+JSON.stringify(name||'');
  if(!groups.has(groupKey))groups.set(groupKey,{key,name:name||'이름 없음',person:key&&key.startsWith('id:')?resolver.byId.get(key.slice(3)):null,births:new Set(),events:[],awards:[],contacts:[]});
  return groups.get(groupKey);
 };
 (all.people||[]).forEach(p=>getGroup('id:'+p.id,p.name));
 stats.events.forEach(e=>getGroup(e.key,e.name).events.push(e));
 (all.history||[]).forEach(r=>{const birth=normDate_(r.birthDate);if(birth)getGroup(resolver.identity(resolver.nameOf(r.name),birth),r.name).births.add(birth);});
 let orphanAwards=0,orphanContacts=0;
 (all.awards||[]).forEach(a=>{const g=groups.get('id:'+a.personId);if(g)g.awards.push(a);else orphanAwards++;});
 (all.contacts||[]).forEach(c=>{const g=groups.get('id:'+c.personId);if(g)g.contacts.push(c);else orphanContacts++;});
 const headers=['이름','상태','소속','생년월일','연령(만)','연락처','참여 연도',year+'년 참여구분',year+'년 기록행수',year+'년 집계시간','전체 집계시간','진우 기록행수','과거 활동행수','직접입력 행수(중복제외)','과거 명단 연도','이력상 첫 기록일','이력상 최근 기록일','재능','관심활동','참여가능시간','포상 건수','포상 내역','연락 건수','최근 연락','확인사항','봉사자ID','VMS ID','1365 ID','등록일','참고사항'];
 headers.push('집계용 최초연도','집계용 식별여부',year+'년 진우 활동 실인원',year+'년 진우 교육 실인원',year+'년 진우 모집연계 실인원',year+'년 진우 활동 건수',year+'년 진우 교육 건수',year+'년 진우 모집연계 건수');
 headers.push(year+'년 진우 전체실인원',year+'년 진우 미분류 건수');
 headers.push(year+'년 참여여부',(year-1)+'년 참여여부');
 const rows=Array.from(groups.values()).map(g=>{
  const p=g.person||{},events=g.events,years=Array.from(new Set(events.map(e=>e.date.slice(0,4)))).filter(Boolean).sort();
  const current=events.filter(e=>e.date.slice(0,4)===String(year)),previous=years.includes(String(year-1)),earlier=years.some(y=>Number(y)<year);
  const dates=events.map(e=>e.date).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  let birth=p.birthDate||Array.from(g.births).join(' / '),age='';
  try{if(birth){age=age_(birth_(birth));if(age<0)age='';}}catch(e){age='';}
  const historyYears=Array.from(new Set(events.filter(e=>e.type==='연도별 명단').map(e=>e.date))).sort();
  const notes=[];
  if(!g.key)notes.push('식별 불가: 실인원 제외, 시간에는 포함');
  else if(!g.person)notes.push('PEOPLE 미등록');
  if(events.some(e=>e.type==='미분류'))notes.push('진우 활동유형 확인 필요');
  const participation=!g.key?'확인 필요':!current.length?years.length?'올해 미참여':'명단만 등록':previous?'전년도 재참여':earlier?'복귀 참여':'기록상 첫 참여';
  const contacts=g.contacts.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  const recent=contacts[0];
  const row=[p.name||g.name,p.status||'명단 미등록',p.affiliation||'',birth,age,p.phone||'',years.join(', '),participation,current.filter(e=>e.type!=='연도별 명단').length,current.reduce((s,e)=>s+e.hours,0),events.reduce((s,e)=>s+e.hours,0),events.filter(e=>e.origin==='jinwoo').length,events.filter(e=>e.origin==='history'&&e.type!=='연도별 명단').length,events.filter(e=>e.origin==='manual').length,historyYears.join(', '),dates[0]||'',dates[dates.length-1]||'',p.talents||'',p.interests||'',p.availability||'',g.awards.length,g.awards.map(a=>[a.date,a.type,a.name,a.status].filter(Boolean).join(' · ')).join('\n'),g.contacts.length,recent?[recent.date,recent.type,recent.note].filter(Boolean).join(' · '):'',notes.join(' / '),p.id||'',p.vmsId||'',p.vol1365Id||'',p.registrationDate||'',p.notes||''];
  const types=['활동','교육','모집·연계'],currentJinwoo=current.filter(e=>e.origin==='jinwoo');
  return row.concat([years.length?Number(years[0]):'',g.key?1:0],types.map(t=>currentJinwoo.some(e=>e.type===t&&e.name)?1:0),types.map(t=>currentJinwoo.filter(e=>e.type===t).length),[currentJinwoo.some(e=>e.name)?1:0,currentJinwoo.filter(e=>e.type==='미분류').length,years.includes(String(year))?1:0,previous?1:0]);
 }).sort((a,b)=>String(a[0]).localeCompare(String(b[0]),'ko'));
 return {headers,rows,orphanAwards,orphanContacts,year};
}
function selectedDashboardYear_(){
 const sh=ss_().getSheetByName('시트대시보드');
 const value=sh&&sh.getRange('A1').getDisplayValue()==='자원봉사 집계 대시보드'?sh.getRange('B3').getValue():'';
 if(value==='')return Number(today_().slice(0,4));
 const year=Number(value);if(!Number.isInteger(year)||year<1900||year>2100)throw Error('시트대시보드 B3에서 1900~2100 사이의 기준연도를 선택해 주세요.');
 return year;
}
function refreshAllDataSheet_impl_(){return withLock_(()=>{
 const ss=ss_(),year=selectedDashboardYear_(),view=allDataRows_(allData_(),year);
 let sh=ss.getSheetByName(ALL_DATA_SHEET);
 if(sh&&sh.getLastRow()&&sh.getRange(1,1).getDisplayValue()!==ALL_DATA_TITLE)throw Error('전체데이터라는 기존 탭이 있습니다. 원본 보호를 위해 자동 덮어쓰기를 중단했습니다. 기존 탭 이름을 바꿔 주세요.');
 if(!sh)sh=ss.insertSheet(ALL_DATA_SHEET);
 const width=view.headers.length,height=Math.max(4,view.rows.length+3),oldRows=sh.getLastRow();
 if(sh.getMaxColumns()<width)sh.insertColumnsAfter(sh.getMaxColumns(),width-sh.getMaxColumns());
 if(sh.getMaxRows()<height)sh.insertRowsAfter(sh.getMaxRows(),height-sh.getMaxRows());
 if(sh.getFilter())sh.getFilter().remove();
 sh.getRange(3,1,Math.max(height,oldRows)-2,width).clearContent();
 sh.getRange(1,1).setValue(ALL_DATA_TITLE).setFontWeight('bold').setFontSize(16);
 sh.getRange(2,1).setValue('갱신: '+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd HH:mm')+' / '+year+'년 기준 / 원본 수정 후 메뉴에서 새로고침 / 이 탭은 조회용');
 const safeRows=view.rows.map(row=>row.map(v=>typeof v==='string'&&/^[=+@\-]/.test(v)?"'"+v:v));
 sh.getRange(3,1,safeRows.length+1,width).setValues([view.headers].concat(safeRows));
 sh.getRange(3,1,1,width).setFontWeight('bold').setBackground('#143c48').setFontColor('#ffffff');
 sh.setFrozenRows(3);sh.setFrozenColumns(2);sh.setColumnWidths(1,width,140);sh.setColumnWidth(1,160);sh.setColumnWidth(7,210);sh.setColumnWidth(22,300);sh.setColumnWidth(24,300);sh.setColumnWidth(25,300);
 if(safeRows.length){sh.getRange(4,1,safeRows.length,width).setVerticalAlignment('top').setWrap(true);sh.getRange(4,6,safeRows.length,1).setNumberFormat('@');sh.getRange(4,10,safeRows.length,2).setNumberFormat('0.##');}
 sh.hideColumns(31,12);
 sh.getRange(3,1,Math.max(1,safeRows.length+1),width).createFilter();
 ss.setActiveSheet(sh);ss.toast('전체데이터 '+safeRows.length+'행 갱신 완료'+(view.orphanAwards||view.orphanContacts?' / 명단에 없는 ID: 포상 '+view.orphanAwards+'건, 연락 '+view.orphanContacts+'건 확인 필요':''));
 return {rows:safeRows.length,year};
});}
function openAllDataSheet_impl_(){const sh=ss_().getSheetByName(ALL_DATA_SHEET);if(!sh)return refreshAllDataSheet();ss_().setActiveSheet(sh);}
const SHEET_DASHBOARD='시트대시보드';
const SHEET_DASHBOARD_TITLE='자원봉사 집계 대시보드';
function sheetDashboardFormulas_(end,headers){
 const yearHeader=headers.find(h=>/^\d{4}년 참여구분$/.test(h));if(!yearHeader)throw Error('전체데이터 기준연도를 확인해 주세요.');
 const year=Number(yearHeader.slice(0,4));
 const named=name=>{let col=headers.indexOf(name)+1;if(col<1)throw Error('전체데이터 열 누락: '+name);let letter='';while(col){col--;letter=String.fromCharCode(65+col%26)+letter;col=Math.floor(col/26);}return "'전체데이터'!$"+letter+'$4:$'+letter+'$'+Math.max(4,end);};
 const included=named('집계용 식별여부'),current=named(year+'년 참여여부'),prior=named((year-1)+'년 참여여부');
 const sumYear=suffix=>'=SUM('+named(year+'년 '+suffix)+')';
 return {
  A6:'=COUNTIFS('+current+',1,'+included+',1)',
  C6:'=COUNTIFS('+prior+',1,'+included+',1)',E6:'=A6-C6',
  G6:'=COUNTIFS('+named('집계용 최초연도')+','+year+','+included+',1)',
  A10:'=COUNTIFS('+current+',1,'+prior+',0,'+included+',1)',
  C10:'=COUNTIFS('+current+',1,'+prior+',1,'+included+',1)',
  E10:'=A10-G6',G10:sumYear('집계시간'),
  B15:sumYear('진우 활동 실인원'),C15:sumYear('진우 활동 건수'),
  B16:sumYear('진우 교육 실인원'),C16:sumYear('진우 교육 건수'),
  B17:sumYear('진우 모집연계 실인원'),C17:sumYear('진우 모집연계 건수'),
  B20:sumYear('진우 전체실인원'),B21:'=B20-B15',
  F15:'=COUNTIFS('+named('상태')+',"활동 중")',
  F17:'=COUNTIFS('+current+',1,'+included+',0)',F19:sumYear('진우 미분류 건수'),
  A25:'=IF(SUM('+prior+')=0,"전년도 자료가 없습니다. 신규·재참여 판정은 확인이 필요합니다.","기록상 첫 참여는 보유한 과거자료 기준입니다.")'
 };
}
function refreshSheetDashboard_impl_(){
 const ss=ss_(),existing=ss.getSheetByName(SHEET_DASHBOARD);
 if(existing&&existing.getLastRow()&&existing.getRange('A1').getDisplayValue()!==SHEET_DASHBOARD_TITLE)throw Error('시트대시보드라는 기존 탭이 있습니다. 이름을 바꾼 뒤 다시 실행하세요.');
 // Complete the source refresh first; avoid nesting document locks.
 const result=refreshAllDataSheet();
 return withLock_(()=>{
  const source=ss.getSheetByName(ALL_DATA_SHEET),sh=ss.getSheetByName(SHEET_DASHBOARD)||ss.insertSheet(SHEET_DASHBOARD);
  const region=sh.getRange('A1:H26');region.breakApart();region.clearContent();
  region.setFontFamily('Arial').setFontSize(11).setFontColor('#193641').setBackground('#ffffff').setVerticalAlignment('middle');
  sh.setHiddenGridlines(true);sh.setColumnWidths(1,8,120);sh.setRowHeights(1,26,26);
  sh.getRange('A1:H1').merge().setValue(SHEET_DASHBOARD_TITLE).setFontSize(16).setFontWeight('bold');
  sh.getRange('A2:H2').merge().setValue('현재 집계: '+result.year+'년 / 전체데이터 갱신: '+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd HH:mm')).setFontColor('#61777c');
  const sourceHeaders=source.getRange(3,1,1,source.getLastColumn()).getDisplayValues()[0],yearsCol=sourceHeaders.indexOf('참여 연도')+1;
  const years=new Set([String(result.year),today_().slice(0,4)]);
  if(yearsCol&&source.getLastRow()>3)source.getRange(4,yearsCol,source.getLastRow()-3,1).getDisplayValues().forEach(row=>String(row[0]).split(',').forEach(y=>{y=y.trim();if(/^\d{4}$/.test(y))years.add(y);}));
  sh.getRange('A3').setValue('기준연도 선택');sh.getRange('B3').setValue(result.year).setNumberFormat('0').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(Array.from(years).sort().reverse(),true).setAllowInvalid(false).build());
  sh.getRange('C3:H3').merge().setValue('연도를 선택한 뒤 메뉴에서 시트대시보드를 새로고침하세요.').setFontColor('#61777c');
  const labels={A5:'전체 실인원',C5:'전년도 실인원',E5:'전년 대비',G5:'기록상 첫 참여',A9:'전년도 미참여',C9:'전년도 재참여',E9:'복귀 참여',G9:'집계시간',A13:'진우 유형별 현황',A14:'유형',B14:'실인원',C14:'기록 건수',A15:'활동',A16:'교육',A17:'모집·연계',A20:'진우 전체 실인원',A21:'활동 기록 없는 인원',E15:'현재 활동 중',E17:'식별 불가 이름',E19:'활동유형 미분류'};
  Object.keys(labels).forEach(cell=>sh.getRange(cell).setValue(labels[cell]));
  ['A6:B7','C6:D7','E6:F7','G6:H7','A10:B11','C10:D11','E10:F11','G10:H11'].forEach(range=>sh.getRange(range).merge().setBackground('#edf4f3').setFontSize(16).setFontWeight('bold').setNumberFormat('#,##0').setHorizontalAlignment('right').setVerticalAlignment('middle'));
  ['A5:B5','C5:D5','E5:F5','G5:H5','A9:B9','C9:D9','E9:F9','G9:H9','A13:C13'].forEach(range=>sh.getRange(range).merge());
  sh.getRange('A21').setValue('활동 기록 없음');
  sh.getRange('G10').setNumberFormat('#,##0.00"시간"');
  sh.getRange('A14:C14').setBackground('#36575a').setFontColor('#ffffff').setFontWeight('bold');
  sh.getRange('B15:C21').setNumberFormat('#,##0');sh.getRange('F15:F19').setNumberFormat('#,##0');
  sh.getRange('A23:H23').merge().setValue('유형별 실인원은 서로 겹칠 수 있어 합산하지 않습니다. 식별 불가·미분류가 있으면 확인이 필요합니다.').setFontColor('#61777c');
  sh.getRange('A24:H24').merge().setValue('원본을 수정하거나 자료를 가져온 뒤에는 메뉴의 시트대시보드 새로고침을 실행하세요.').setFontColor('#61777c');
  sh.getRange('A25:H25').merge().setFontColor('#61777c');
  const formulas=sheetDashboardFormulas_(source.getLastRow(),source.getRange(3,1,1,source.getLastColumn()).getDisplayValues()[0]);
  Object.keys(formulas).forEach(cell=>sh.getRange(cell).setFormula(formulas[cell]));
  ss.setActiveSheet(sh);ss.toast('수식 대시보드를 갱신했습니다.');return {year:result.year};
 });
}
function getLookupData_impl_(year){return readCached_('lookup:'+Number(year),()=>{
 const started=Date.now(),all=allData_(),readMs=Date.now()-started,resolver=volunteerIdentity_(all),stats=dashboardStats_(all,Number(year),true);
 const evidence={},details={};
 const metrics=['real','prior','firstRecorded','notPrevious','retained','returned','change','activeStatus','jinwooNames','jinwooIdentified','service','training','placement','nonService','excluded','unclassified','hours'];
 metrics.forEach(metric=>evidence[metric]=dashboardEvidence_(all,Number(year),metric,stats,resolver));
 // Bound preloading; larger datasets retain the individual-detail endpoint.
  return {year:Number(year),evidence,details,timing:{readMs,totalMs:Date.now()-started}};
});}
function dashboardEvidence_(all,year,metric,preparedStats,preparedResolver){
 const stats=preparedStats||dashboardStats_(all,year,true),resolver=preparedResolver||volunteerIdentity_(all),events=stats.events;
 const current=events.filter(e=>e.date.slice(0,4)===String(year)),previous=events.filter(e=>e.date.slice(0,4)===String(year-1));
 const keys=rows=>new Set(rows.map(e=>e.key).filter(Boolean)),ids=keys(current),prev=keys(previous),past=keys(events.filter(e=>e.date.slice(0,4)<String(year)));
 const labels={real:'해당 연도 실인원',prior:'전년도 실인원',firstRecorded:'기록상 첫 참여',notPrevious:'전년도 미참여',retained:'전년도 재참여',returned:'복귀 참여',excluded:'식별 불가 기록',hours:'해당 연도 시간 합계',change:'전년 대비 구성',activeStatus:'현재 활동 중',jinwooNames:'진우 이름 기준 인원',jinwooIdentified:'통합 집계에 식별된 진우 인원',service:'활동 실인원',training:'교육 실인원',placement:'모집·연계 실인원',unclassified:'활동구분 미분류 기록'};
 labels.nonService='활동 기록이 없는 진우 참여자';
 if(!labels[metric])throw Error('지원하지 않는 집계 항목입니다.');
 if(metric==='activeStatus')return {title:labels[metric],rows:(all.people||[]).filter(p=>p.status==='활동 중').map(p=>({name:p.name,birthDate:p.birthDate,personId:p.id,years:'',sources:'PEOPLE',records:0,reason:'상태: 활동 중'})),note:'참여 실적이 아니라 현재 명단의 상태 값입니다.'};
 let selected=current,rawName=false;
 if(metric==='prior')selected=previous;
 else if(metric==='firstRecorded')selected=current.filter(e=>!past.has(e.key));
 else if(metric==='notPrevious')selected=current.filter(e=>!prev.has(e.key));
 else if(metric==='retained')selected=current.filter(e=>prev.has(e.key));
 else if(metric==='returned')selected=current.filter(e=>!prev.has(e.key)&&past.has(e.key));
 else if(metric==='excluded')selected=current.filter(e=>!e.key);
 else if(metric==='change')selected=current.filter(e=>e.key&&!prev.has(e.key)).map(e=>({...e,reason:'올해만 참여'})).concat(previous.filter(e=>e.key&&!ids.has(e.key)).map(e=>({...e,reason:'작년만 참여'})));
 else if(['jinwooNames','jinwooIdentified'].includes(metric)){selected=current.filter(e=>e.origin==='jinwoo');rawName=metric==='jinwooNames';}
 else if(['service','training','placement'].includes(metric)){const type={service:'활동',training:'교육',placement:'모집·연계'}[metric];selected=current.filter(e=>e.origin==='jinwoo'&&e.type===type);rawName=true;}
 else if(metric==='unclassified')selected=current.filter(e=>e.origin==='jinwoo'&&e.type==='미분류');
 else if(metric==='nonService'){
  const serviceNames=new Set(current.filter(e=>e.origin==='jinwoo'&&e.type==='활동').map(e=>e.name));
  selected=current.filter(e=>e.origin==='jinwoo'&&!serviceNames.has(e.name)).map(e=>({...e,reason:'기록 유형: '+e.type}));rawName=true;
 }
 const sourceName=e=>({jinwoo:'진우',history:'과거 대장',manual:'기존 활동'}[e.origin]);
 if(['hours','unclassified'].includes(metric))return {title:labels[metric],rows:selected.map(e=>({name:e.name||'이름 없음',personId:e.key.startsWith('id:')?e.key.slice(3):'',date:e.date,years:e.date.slice(0,4),sources:sourceName(e),records:1,hours:e.hours,reason:metric==='unclassified'?'봉사분야·봉사활동·구분에 분류값 없음':e.type})),note:metric==='hours'?'원본에서 이름이 없는 행도 시간 합계에 포함됩니다. 같은 연도 진우 우선 정책으로 과거 기록 시간이 0으로 반영될 수 있습니다.':'행 단위 목록입니다. 분류는 원본을 확인해야 합니다.'};
 const groups=new Map();
 selected.forEach(e=>{
  if(!rawName&&metric!=='excluded'&&!e.key)return;
  if(rawName&&!e.name)return;
  const key=rawName?e.name:metric==='excluded'?(e.name||'(이름 없음)'):e.key;
  if(!groups.has(key))groups.set(key,{name:e.name||'이름 없음',personId:e.key.startsWith('id:')?e.key.slice(3):'',years:new Set(),sources:new Set(),records:0,reason:e.reason||''});
  const group=groups.get(key);group.records++;group.sources.add(sourceName(e));
  if(metric==='nonService'&&!group.reason.includes(e.type))group.reason+=' / '+e.type;
 });
 const yearsByKey=new Map();
 events.forEach(e=>{const key=rawName||metric==='excluded'?(e.name||'이름 없음'):e.key;if(!yearsByKey.has(key))yearsByKey.set(key,new Set());yearsByKey.get(key).add(e.date.slice(0,4));});
 const rows=Array.from(groups.entries()).map(([key,g])=>{
  g.years=yearsByKey.get(metric==='excluded'?g.name:key)||new Set();
  const person=g.personId?resolver.byId.get(g.personId):null;
  if(metric==='excluded')g.reason=g.name==='이름 없음'?'이름 또는 봉사자ID 없음':'같은 이름의 복수 생년월일 또는 명단 중복';
  return {...g,birthDate:person?person.birthDate:'',years:Array.from(g.years).sort().join(', '),sources:Array.from(g.sources).join(', ')};
 }).sort((a,b)=>String(a.name).localeCompare(String(b.name),'ko'));
 return {title:labels[metric],rows,note:metric==='change'?'올해만 참여한 인원에서 작년만 참여한 인원을 뺀 값이 전년 대비 증감입니다.':metric==='excluded'?'이 목록은 인원 합계에서 제외된 이름입니다. 기록 수는 사람 수와 다릅니다.':'참여 연도는 보유 자료 기준입니다. 이름 기준 진우 인원과 식별된 통합 인원은 다를 수 있습니다.'};
}

/** 인정·포상 진행상태 변경: 해당 행의 진행상태 칸만 고친다. */
const AWARD_STATUS=['예정','추천 완료','선정','미선정','지급 완료','수상','신청 중','수령 완료'];
function updateAwardStatus_impl_(a){return withLock_(()=>{
 const id=clean_(a&&a.id,60),status=clean_(a&&a.status,40);
 if(!id||!AWARD_STATUS.includes(status))throw Error('수정할 기록과 상태를 확인해 주세요.');
 const sh=tab_('AWARDS'),values=sh.getDataRange().getValues(),headers=values[0].map(x=>String(x).trim());
 const idCol=headers.indexOf('기록ID'),statusCol=headers.indexOf('진행상태');
 if(idCol<0||statusCol<0)throw Error('AWARDS에 기록ID·진행상태 열이 필요합니다.');
 const row=values.findIndex((r,i)=>i>0&&String(r[idCol])===id);
 if(row<0)throw Error('기록을 찾지 못했습니다. 새로고침해 주세요.');
 sh.getRange(row+1,statusCol+1).setValue(status);return true;
},['AWARDS']);}

/* ── 연말 감사명단 (감사패키지 대상) ──
   기준: 해당 연도 활동 5회 이상 → 활동시간 많은 순 → 같으면 횟수 많은 순 → 상위 30명
   추천 수상자(배지 제외, 해당 연도 인정·포상 기록)는 자리를 비우지 않고 💌 표시만 합니다. */
const THANKS_MIN_COUNT=5, THANKS_LIMIT=30;
const SEPARATE_TYPES=['교육','모집·연계'];
const isServiceEvent_=e=>!SEPARATE_TYPES.includes(e.type)&&e.type!=='연도별 명단';
function getThankList_impl_(year){
 year=Number(year)||Number(today_().slice(0,4));
 return readCached_('thanks3:'+year,()=>{
  const all=allData_(),events=dashboardStats_(all,year,true).events,y=String(year);
  const byId=new Map((all.people||[]).map(p=>[String(p.id),p])),groups=new Map();
  events.filter(e=>e.date.slice(0,4)===y&&isServiceEvent_(e)).forEach(e=>{
   const k=e.key||'name:'+e.name;if(!groups.has(k))groups.set(k,{key:e.key,name:e.name,count:0,hours:0});
   const g=groups.get(k);g.count++;g.hours+=e.hours;
  });
  // 💌 추천 카드: 그해 종류 '감사·인정' 기록 / 이미 기록된 포상: 그해 종류 '포상' 기록
  const recBy=new Map(),pkgBy=new Map(),push=(m,k,v)=>{if(!m.has(k))m.set(k,[]);m.get(k).push(v);};
  (all.awards||[]).forEach(a=>{
   if(String(a.date||a.createdAt||'').slice(0,4)!==y)return;
   if(a.type==='감사·인정')push(recBy,String(a.personId),a);
   if(a.type==='포상')push(pkgBy,String(a.personId),String(a.name||''));
  });
  const candidates=Array.from(groups.values()).map(g=>{
   const personId=g.key&&g.key.startsWith('id:')?g.key.slice(3):'',p=byId.get(personId)||{},rec=recBy.get(personId)||[];
   return {name:p.name||g.name||'이름 없음',status:p.status||'',affiliation:p.affiliation||'',count:g.count,hours:Math.round(g.hours*100)/100,personId,
    check:!g.key?'동명이인 등 식별 확인 필요':!personId?'명단 미등록':'',recommended:rec.length>0,awardText:rec.map(a=>[a.name,a.status].filter(Boolean).join(' · ')).join(' / '),packages:pkgBy.get(personId)||[]};
  }).filter(p=>p.count>=THANKS_MIN_COUNT)
   .sort((a,b)=>(b.hours-a.hours)||(b.count-a.count)||String(a.name).localeCompare(String(b.name),'ko'))
   .map((p,i)=>Object.assign(p,{rank:i+1}));
  return {year,minCount:THANKS_MIN_COUNT,limit:THANKS_LIMIT,eligible:candidates.length,list:candidates,defaultName:year+' 자원봉사자 감사패키지'};
 });
}
/* 감사명단에서 고른 분들을 인정·포상에 한 번에 기록 (같은 이름의 포상이 이미 있으면 건너뜀) */
function recordThankAwards_impl_(o){return withLock_(()=>{
 const name=clean_(o&&o.name,120),status=clean_(o&&o.status,40)||'선정',ids=Array.from(new Set((o&&o.personIds||[]).map(x=>String(x).trim()).filter(Boolean)));
 if(!name)throw Error('포상 이름을 입력해 주세요.');
 if(!ids.length)throw Error('기록할 분을 선택해 주세요.');
 if(ids.length>200)throw Error('한 번에 200명까지 기록할 수 있어요.');
 const people=new Set(records_('PEOPLE').map(p=>String(p.id)));
 const existing=new Set(records_('AWARDS').filter(a=>a.type==='포상'&&String(a.name).trim()===name).map(a=>String(a.personId)));
 const today=today_(),rows=[],skipped=[];
 ids.forEach(id=>{if(!people.has(id))skipped.push({id,reason:'명단에 없음'});else if(existing.has(id))skipped.push({id,reason:'이미 기록됨'});else rows.push([Utilities.getUuid(),id,'포상',name,status,'',today,'연말 감사명단에서 일괄 기록',today]);});
 if(rows.length){const sh=tab_('AWARDS');sh.getRange(sh.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows);}
 return {added:rows.length,skipped};
},['AWARDS']);}
function recordThankAwards(o){requireOwner_();return recordThankAwards_impl_(o);}
/* 감사패키지 명단 출력용: 고른 분의 연락처, 최초·마지막 봉사일, 누적 봉사횟수 (교육·모집연계 제외, 모든 연도) */
function getThankPrintData_impl_(o){
 const ids=new Set((o&&o.personIds||[]).map(x=>String(x).trim()).filter(Boolean));
 if(!ids.size)throw Error('출력할 분을 선택해 주세요.');
 if(ids.size>300)throw Error('한 번에 300명까지 출력할 수 있어요.');
 const year=Number(o.year)||Number(today_().slice(0,4)),all=allData_(),events=dashboardStats_(all,year,true).events;
 const byId=new Map((all.people||[]).map(p=>[String(p.id),p])),info={},valid=d=>/^\d{4}-\d{2}-\d{2}$/.test(d);
 events.forEach(e=>{
  if(!e.key||!e.key.startsWith('id:')||!isServiceEvent_(e)||!valid(e.date))return;
  const id=e.key.slice(3);if(!ids.has(id))return;
  const r=info[id]||(info[id]={first:e.date,last:e.date,total:0});
  if(e.date<r.first)r.first=e.date;if(e.date>r.last)r.last=e.date;r.total++;
 });
 const out={};
 ids.forEach(id=>{const p=byId.get(id)||{},r=info[id]||{};out[id]={phone:p.phone||'',firstDate:r.first||'',lastDate:r.last||'',totalCount:r.total||0};});
 return {today:today_(),people:out};
}
function getThankPrintData(o){requireRead_();return getThankPrintData_impl_(o);}

/* ── 대시보드 홈: ① 실적 반영 현황 ② 문자 대상 ③ 보고용 숫자·그래프 ── */
const SMS_PIN_SHEET='문자고정', SMS_RECENT_MONTHS=3;
function smsPins_(){
 const sh=ss_().getSheetByName(SMS_PIN_SHEET);
 if(!sh||sh.getLastRow()<2)return new Set();
 return new Set(sh.getRange(2,1,sh.getLastRow()-1,1).getValues().map(r=>String(r[0]).trim()).filter(Boolean));
}
function setSmsPin_impl_(o){return withLock_(()=>{
 const id=String(o&&o.personId||'').trim();
 if(!id||!personExists_(id))throw Error('봉사자를 찾지 못했습니다. 새로고침해 주세요.');
 const ss=ss_();let sh=ss.getSheetByName(SMS_PIN_SHEET);
 if(!sh){sh=ss.insertSheet(SMS_PIN_SHEET);sh.getRange(1,1,1,2).setValues([['봉사자ID','고정일']]).setFontWeight('bold');sh.setFrozenRows(1);}
 const last=sh.getLastRow(),ids=last>1?sh.getRange(2,1,last-1,1).getValues().map(r=>String(r[0]).trim()):[];
 const rows=[];ids.forEach((v,i)=>{if(v===id)rows.push(i+2);});
 if(o.pinned){if(!rows.length)sh.appendRow([id,today_()]);}
 else rows.reverse().forEach(r=>sh.deleteRow(r));
 return {personId:id,pinned:!!o.pinned};
},['EXTRA']);}
function halfPeriod_(d){const [y,m,day]=d.split('-').map(Number),end=new Date(y,m,0).getDate();return day<=15?{y,m,from:1,to:15}:{y,m,from:16,to:end};}
function nextHalf_(p){if(p.from===1)return {y:p.y,m:p.m,from:16,to:new Date(p.y,p.m,0).getDate()};const y=p.m===12?p.y+1:p.y,m=p.m===12?1:p.m+1;return {y,m,from:1,to:15};}
function periodEnd_(p){return p.y+'-'+String(p.m).padStart(2,'0')+'-'+String(p.to).padStart(2,'0');}
/** 기준일이 선택 연도인 이력의 항목별 실인원. 감사패키지는 포상과 분리. */
function recognitionSummary_(awards,year){
 const y=String(year),received=new Set(),pending=new Set(),prizes=new Set();
 (awards||[]).forEach(a=>{
  const id=String(a.personId||'').trim(),date=String(a.date||'');
  if(!id||!/^\d{4}-\d{2}-\d{2}$/.test(date)||date.slice(0,4)!==y)return;
  const done=['수령 완료','지급 완료','수상'].includes(a.status);
  if(a.type==='배지'){
   if(done)received.add(id);
   else if(['신청 중','예정','추천 완료','선정'].includes(a.status))pending.add(id);
  }else if(a.type==='포상'&&done)prizes.add(id);
 });
 return {year:Number(year),badgeReceived:received.size,badgePending:pending.size,prizeReceived:prizes.size};
}
function getDashboardHome_impl_(year){
 year=Number(year)||Number(today_().slice(0,4));
 const today=today_();
 return readCached_('home6:'+year+':'+today,()=>{
  const all=allData_(),stats=dashboardStats_(all,year,true),events=stats.events,c=stats.combined;
  const valid=d=>/^\d{4}-\d{2}-\d{2}$/.test(d),round=n=>Math.round(n*100)/100;
  // ① 실적 반영 현황 (진우 기준)
  const jDates=(all.jinwoo||[]).map(r=>normDate_(r.date)).filter(valid).sort(),lastJ=jDates[jDates.length-1]||'';
  const imported=(all.jinwoo||[]).map(r=>String(r.importedAt||'')).filter(Boolean).sort();
  let sync=null;
  if(lastJ){
   const p=halfPeriod_(lastJ),n=nextHalf_(p);
   sync={lastDate:lastJ,lastImported:imported[imported.length-1]||'',period:p,next:n,
    periodRows:jDates.filter(d=>d.slice(0,7)===lastJ.slice(0,7)&&Number(d.slice(8))>=p.from&&Number(d.slice(8))<=p.to).length,
    nextOverdue:today>periodEnd_(n)};
  }
  // ③ 보고용 숫자 — 활동 실적 기준, 교육·모집연계는 별도
  const presence=e=>!SEPARATE_TYPES.includes(e.type),yearOf=e=>e.date.slice(0,4),Y=String(year);
  const keySet=list=>new Set(list.map(e=>e.key).filter(Boolean));
  const curP=events.filter(e=>yearOf(e)===Y&&presence(e)),cur=curP.filter(isServiceEvent_);
  const ids=keySet(curP),prev=keySet(events.filter(e=>yearOf(e)===String(year-1)&&presence(e))),old=keySet(events.filter(e=>yearOf(e)<Y&&presence(e)));
  const separate=SEPARATE_TYPES.map(t=>{const list=events.filter(e=>yearOf(e)===Y&&e.type===t);return {type:t,count:list.length,real:keySet(list).size};});
  const months=Array.from({length:12},(_,i)=>({month:i+1,count:0,hours:0,keys:new Set()}));
  cur.forEach(e=>{if(!valid(e.date))return;const m=months[Number(e.date.slice(5,7))-1];m.count++;m.hours+=e.hours;if(e.key)m.keys.add(e.key);});
  months.forEach(m=>{m.hours=round(m.hours);m.real=m.keys.size;delete m.keys;});
  const byYear=new Map();
  events.filter(presence).forEach(e=>{const y=yearOf(e);if(!/^\d{4}$/.test(y))return;if(!byYear.has(y))byYear.set(y,{keys:new Set(),count:0,hours:0});const b=byYear.get(y);if(e.key)b.keys.add(e.key);if(isServiceEvent_(e))b.count++;b.hours+=e.hours;});
  const trend=Array.from(byYear.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([y,b])=>({year:Number(y),real:b.keys.size,count:b.count,hours:round(b.hours)}));
  const idList=Array.from(ids);
  const report={real:ids.size,count:cur.length,hours:round(cur.reduce((s,e)=>s+e.hours,0)),firstRecorded:idList.filter(k=>!old.has(k)).length,retained:idList.filter(k=>prev.has(k)).length,returned:idList.filter(k=>!prev.has(k)&&old.has(k)).length,unidentified:cur.filter(e=>!e.key).length,separate,months,trend};
  // ② 문자 대상
  const lastBy=new Map(),countBy=new Map();
  events.forEach(e=>{if(e.key&&e.key.startsWith('id:')&&valid(e.date)&&e.type!=='연도별 명단'){const id=e.key.slice(3);if(!lastBy.has(id)||lastBy.get(id)<e.date)lastBy.set(id,e.date);
   if(isServiceEvent_(e)){if(!countBy.has(id))countBy.set(id,{year:0,total:0});const c=countBy.get(id);c.total++;if(yearOf(e)===today.slice(0,4))c.year++;}}});
  const cut=new Date(today+'T00:00:00');cut.setMonth(cut.getMonth()-SMS_RECENT_MONTHS);
  const cutoff=Utilities.formatDate(cut,Session.getScriptTimeZone(),'yyyy-MM-dd'),pins=smsPins_();
  const people=(all.people||[]).map(p=>{
   const id=String(p.id),lastDate=lastBy.get(id)||'',reasons=[];
   if(p.status==='활동 중')reasons.push('활동 중');
   if(lastDate&&lastDate>=cutoff&&p.status!=='종결')reasons.push('최근 '+SMS_RECENT_MONTHS+'개월');
   const cnt=countBy.get(id)||{year:0,total:0};
   return {id,name:p.name,phone:p.phone,affiliation:p.affiliation,status:p.status,lastDate,reasons,pinned:pins.has(id),yearCount:cnt.year,totalCount:cnt.total};
  }).sort((a,b)=>String(a.name).localeCompare(String(b.name),'ko'));
  return {year,today,sync,report,recognition:recognitionSummary_(all.awards,year),registrationIssues:registrationIssues_(all,year),sms:{cutoff,months:SMS_RECENT_MONTHS,people}};
 });
}


/* ── 접근 권한 ──
   - 이 스크립트를 배포한 계정(min) = 모든 기능 + 연락처·생년월일
   - 앱의 「권한 관리」 탭에서 보기 범위를 골라 넣은 분
     · 숫자만 보기(또는 아래 VIEWER_EMAILS): 대시보드 숫자·그래프, 연간 현황 표만 (이름·연락처 없음)
     · 전체 보기(수정 불가): 모든 메뉴와 연락처·생년월일까지 보기만 (팀장·관장·국장 등). 저장·수정·삭제는 안 됨
     수정 기능과 권한 관리는 min만
   - 그 밖의 사람 = "접근 권한이 없습니다" 화면
   배포 설정: 실행 사용자 "나" / 액세스 권한 "도메인 내 모든 사용자" (기관 계정으로 배포해야 이메일 확인이 됩니다) */
const VIEWER_EMAILS=[
 // '관리자1@jpurme.org',
 // '관리자2@jpurme.org',
];
const PRIVATE_KEYS=['phone','birthDate'];
function currentEmail_(){try{return String(Session.getActiveUser().getEmail()||'').trim().toLowerCase();}catch(e){return '';}}
function ownerEmail_(){try{return String(Session.getEffectiveUser().getEmail()||'').trim().toLowerCase();}catch(e){return '';}}
/* 앱의 「권한 관리」 탭에서 넣고 빼는 '권한' 시트 (코드를 고치지 않아도 됨) */
const ACCESS_SHEET='권한',ACCESS_HEAD=['이메일','이름·역할','부여일','만료일','보기 범위'];
const SCOPE_NUMBERS='숫자만 보기',SCOPE_ALL='전체 보기(수정 불가)';
let _ROLE=null;
function accessSheet_(){
 const ss=ss_();let sh=ss.getSheetByName(ACCESS_SHEET);
 if(!sh){sh=ss.insertSheet(ACCESS_SHEET);sh.getRange(1,1,1,ACCESS_HEAD.length).setValues([ACCESS_HEAD]).setFontWeight('bold');sh.setFrozenRows(1);}
 return sh;
}
function fmtDay_(v){if(v instanceof Date)return Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM-dd');const m=String(v||'').trim().replace(/[.\/]/g,'-').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);return m?m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0'):'';}
function accessRows_(){
 const sh=ss_().getSheetByName(ACCESS_SHEET);if(!sh||sh.getLastRow()<2)return [];
 return sh.getRange(2,1,sh.getLastRow()-1,5).getValues().map(r=>({email:String(r[0]).trim().toLowerCase(),name:String(r[1]||''),date:fmtDay_(r[2]),until:fmtDay_(r[3]),scope:String(r[4]||'').trim()===SCOPE_ALL?SCOPE_ALL:SCOPE_NUMBERS})).filter(r=>r.email);   // 보기 범위가 비어 있으면(예전에 넣은 분) 숫자만 보기
}
function role_(){
 if(_ROLE!==null)return _ROLE;
 const me=currentEmail_(),owner=ownerEmail_();
 if(me&&owner&&me===owner)return (_ROLE='owner');
 if(me&&VIEWER_EMAILS.map(x=>String(x).trim().toLowerCase()).includes(me))return (_ROLE='viewer');
 const a=me?accessRows_().find(r=>r.email===me):null;
 if(a&&!(a.until&&today_()>a.until))return (_ROLE=a.scope===SCOPE_ALL?'viewerAll':'viewer');   // 만료일이 지나면 자동으로 권한 없음
 return (_ROLE='');
}
function listAccess(){requireOwner_();const t=today_();return accessRows_().map(r=>Object.assign(r,{expired:!!r.until&&t>r.until}));}
function addAccess(o){requireOwner_();return withLock_(()=>{
 const email=String(o&&o.email||'').trim().toLowerCase();
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))throw Error('이메일 주소를 확인해 주세요.');
 if(email===ownerEmail_())throw Error('담당자 본인은 이미 모든 권한이 있어요.');
 const sh=accessSheet_(),list=accessRows_(),i=list.findIndex(r=>r.email===email);
 const scope=o.scope===SCOPE_ALL?SCOPE_ALL:SCOPE_NUMBERS;
 if(sh.getRange(1,5).getValue()!=='보기 범위')sh.getRange(1,5).setValue('보기 범위').setFontWeight('bold');
 const row=[email,String(o.name||'').trim().slice(0,60),today_(),fmtDay_(o.until),scope];
 if(i>=0)sh.getRange(i+2,1,1,5).setValues([row]);else sh.appendRow(row);   // 같은 이메일이면 범위·기한을 새로 바꿈
 return {replaced:i>=0};
},['EXTRA']);}
function removeAccess(email){requireOwner_();return withLock_(()=>{
 email=String(email||'').trim().toLowerCase();const i=accessRows_().findIndex(r=>r.email===email);
 if(i<0)throw Error('목록에 없는 이메일이에요.');accessSheet_().deleteRow(i+2);return true;
},['EXTRA']);}
function requireOwner_(){if(role_()!=='owner')throw Error('이 기능은 담당자만 사용할 수 있습니다.');}
function requireRole_(){const r=role_();if(!r)throw Error('접근 권한이 없습니다.');return r;}
/** 명단·이름이 나오는 조회: min과 '전체 보기' 권한 */
function requireRead_(){const r=role_();if(r!=='owner'&&r!=='viewerAll')throw Error('이 화면은 볼 수 있는 권한이 없습니다.');return r;}
function scrub_(v){
 if(Array.isArray(v))return v.map(scrub_);
 if(v&&typeof v==='object'){const o={};Object.keys(v).forEach(k=>{o[k]=PRIVATE_KEYS.includes(k)?(v[k]?'비공개':''):scrub_(v[k]);});return o;}
 return v;
}
function forViewer_(result){return role_()==='viewer'?scrub_(result):result;}   // 숫자만 보기: 연락처·생년월일 숨김
function getMyRole(){return requireRole_();}
// 수정·가져오기: min만
function movePeopleStatusToB(){requireOwner_();return movePeopleStatusToB_impl_();}
function setup(){requireOwner_();return setup_impl_();}
function assignMissingPeopleIds(){requireOwner_();return assignMissingPeopleIds_impl_();}
function refreshPeopleAges(){requireOwner_();return refreshPeopleAges_impl_();}
function upsertPerson(p){requireOwner_();return upsertPerson_impl_(p);}
function addActivity(a){requireOwner_();return addActivity_impl_(a);}
function addAward(a){requireOwner_();return addAward_impl_(a);}
function addContact(c){requireOwner_();return addContact_impl_(c);}
function migratePeopleV2(){requireOwner_();return migratePeopleV2_impl_();}
function checkPersonDuplicate(p){requireOwner_();return checkPersonDuplicate_impl_(p);}
function importPeople(rows){requireOwner_();return importPeople_impl_(rows);}
function importJinwooFromRawSheet(n){requireOwner_();return importJinwooFromRawSheet_impl_(n);}
function organizeUnusedSheets(){requireOwner_();return organizeUnusedSheets_impl_();}
function previewHistoryImport(o){requireOwner_();return previewHistoryImport_impl_(o);}
function importHistory(o){requireOwner_();return importHistory_impl_(o);}
function refreshAllDataSheet(){requireOwner_();return refreshAllDataSheet_impl_();}
function openAllDataSheet(){requireOwner_();return openAllDataSheet_impl_();}
function refreshSheetDashboard(){requireOwner_();return refreshSheetDashboard_impl_();}
function updateAwardStatus(a){requireOwner_();return updateAwardStatus_impl_(a);}
/* ── 인정·포상 기록 지우기 ──
   지운 줄은 「삭제된 포상기록」 탭에 그대로 옮겨 두어요(되살릴 때 그 줄을 AWARDS에 다시 붙여넣으면 됨). */
const AWARD_TRASH='삭제된 포상기록';
function removeAwardRows_(pick){
 const sh=tab_('AWARDS'),values=sh.getDataRange().getValues(),head=values[0].map(x=>String(x).trim());
 const col=Object.fromEntries(['기록ID','봉사자ID','종류','명칭','기준일','입력일'].map(h=>[h,head.indexOf(h)]));
 if(col['기록ID']<0)throw Error('AWARDS에 기록ID 열이 필요합니다.');
 const rows=[];values.forEach((r,i)=>{if(i>0&&r[col['기록ID']]&&pick(r,col))rows.push(i+1);});
 if(!rows.length)return 0;
 const ss=ss_();let trash=ss.getSheetByName(AWARD_TRASH);
 if(!trash){trash=ss.insertSheet(AWARD_TRASH);trash.getRange(1,1,1,head.length+1).setValues([head.concat(['지운 날'])]).setFontWeight('bold');trash.setFrozenRows(1);}
 const today=today_();
 trash.getRange(trash.getLastRow()+1,1,rows.length,head.length+1).setValues(rows.map(n=>values[n-1].concat([today])));
 rows.reverse().forEach(n=>sh.deleteRow(n));   // 아래 줄부터 지워야 줄 번호가 안 밀림
 return rows.length;
}
function deleteAward_impl_(id){return withLock_(()=>{
 id=clean_(id,60);if(!id)throw Error('지울 기록을 확인해 주세요.');
 const n=removeAwardRows_((r,c)=>String(r[c['기록ID']])===id);
 if(!n)throw Error('기록을 찾지 못했습니다. 새로고침해 주세요.');return n;
},['AWARDS','EXTRA']);}
/** 감사명단: 그해 종류 '포상' + 같은 이름 기록을 지움. personIds를 주면 그분들 것만 */
function deleteThankAwards_impl_(o){return withLock_(()=>{
 const name=clean_(o&&o.name,120),y=String(Number(o&&o.year)||'');
 if(!name||!/^\d{4}$/.test(y))throw Error('지울 포상 이름과 연도를 확인해 주세요.');
 const only=o.personIds&&o.personIds.length?new Set(o.personIds.map(String)):null;
 const n=removeAwardRows_((r,c)=>String(r[c['종류']]).trim()==='포상'&&String(r[c['명칭']]).trim()===name
   &&String(serialize_(r[c['기준일']])||serialize_(r[c['입력일']])).slice(0,4)===y&&(!only||only.has(String(r[c['봉사자ID']]))));
 return {deleted:n};
},['AWARDS','EXTRA']);}
function deleteAward(id){requireOwner_();return deleteAward_impl_(id);}
function deleteThankAwards(o){requireOwner_();return deleteThankAwards_impl_(o);}
function setSmsPin(o){requireOwner_();return setSmsPin_impl_(o);}
function statsForYear(y,all){requireOwner_();return statsForYear_impl_(y,all);}
function getAll(){requireOwner_();return allData_();}
// 조회: min과 권한 받은 분 (숫자만 보기 → 이름·연락처 숨김 / 전체 보기 → 모두 보기)
function getAppData(y){const r=requireRole_(),d=forViewer_(getAppData_impl_(y));if(r==='viewer'){d.people=[];d.awards=[];}d.role=r;return d;}
function getJinwooYearStats(y){requireRole_();return getJinwooYearStats_impl_(y);}
function getJinwooSummary(){requireRole_();return getJinwooSummary_impl_();}
function getDashboardStats(y){requireRole_();return forViewer_(getDashboardStats_impl_(y));}
function getPersonDetail(id){requireRead_();return getPersonDetail_impl_(id);}
function getDashboardEvidence(o){requireRead_();return getDashboardEvidence_impl_(o);}
function getLookupData(y){requireRead_();return getLookupData_impl_(y);}
function getThankList(y){requireRead_();return getThankList_impl_(y);}
function getDashboardHome(y){const r=requireRole_(),d=getDashboardHome_impl_(y);if(r==='viewer'){d.sms=null;delete d.registrationIssues;return scrub_(d);}return d;}


/* ── 배지 신청 대상 ── 누적 활동시간(교육·모집연계 제외), 받은 배지는 AWARDS의 종류 '배지' 기록 기준 */
const BADGES=[['그린',200],['실버',500],['골드',1000],['골드2',2000],['골드3',3000],['골드4',5000],['골드5',10000]];
const BADGE_SOON_HOURS=50;
function badgeLevel_(awards){
 let lv=0;
 (awards||[]).forEach(a=>{if(a.type!=='배지'||!['수령 완료','지급 완료','수상'].includes(a.status))return;
  BADGES.forEach(([label],i)=>{if(new RegExp('(^|[^0-9A-Za-z가-힣])'+label+'(?![0-9])').test(String(a.name||''))&&i+1>lv)lv=i+1;});});
 return lv;
}
function getBadgeList_impl_(options){
 const o=options&&typeof options==='object'?options:{year:options},year=o.year==null||o.year===''?Number(today_().slice(0,4)):Number(o.year);
 if(!Number.isInteger(year)||year<1900||year>2200)throw Error('기준연도를 확인해 주세요.');
 return readCached_('badges-v5:'+year+':'+today_(),()=>{
 const all=allData_(),events=dashboardStats_(all,year,true).events,round=n=>Math.round(n*100)/100,Y=String(year);
 const service=events.filter(e=>isServiceEvent_(e)&&String(e.date||'').slice(0,4)<=Y),activeKeys=new Set(service.filter(e=>e.date.slice(0,4)===Y&&e.key).map(e=>e.key));
 const byId=new Map((all.people||[]).map(p=>[String(p.id),p])),awardsBy=new Map(),groups=new Map();
 (all.awards||[]).forEach(a=>{const k=String(a.personId);if(!awardsBy.has(k))awardsBy.set(k,[]);awardsBy.get(k).push(a);});
 service.forEach(e=>{if(!e.key)return;if(!groups.has(e.key))groups.set(e.key,{key:e.key,name:e.name,hours:0});groups.get(e.key).hours+=e.hours;});
 const rows=[];
 groups.forEach(g=>{
  if(!activeKeys.has(g.key))return;
  const personId=g.key.startsWith('id:')?g.key.slice(3):'',p=byId.get(personId)||{},hours=round(g.hours);
  const personAwards=awardsBy.get(personId)||[],pending=personAwards.filter(a=>a.type==='배지'&&['예정','추천 완료','선정','신청 중'].includes(a.status));
  const reached=BADGES.filter(([,h])=>hours>=h).length,received=badgeLevel_(personAwards),next=BADGES[reached];
  const pendingLevel=pending.reduce((lv,a)=>Math.max(lv,badgeNameLevel_(a.name)),0);
  const pendingRecord=pending.slice().reverse().find(a=>badgeNameLevel_(a.name)===pendingLevel);
  const remain=next?round(next[1]-hours):null,status=pendingLevel>received&&pendingLevel>=reached?'신청 중':reached>received?'신청 대상':(next&&remain<=BADGE_SOON_HOURS?'곧 도달':'');
  if(!status)return;
  rows.push({personId,name:p.name||g.name,affiliation:p.affiliation||'',hours,reachedBadge:reached?BADGES[reached-1][0]:'',receivedBadge:received?BADGES[received-1][0]:'',nextBadge:next?next[0]:'',remain,status,pendingBadge:pendingLevel?BADGES[pendingLevel-1][0]:'',pendingAwardId:pendingRecord?pendingRecord.id:''});
 });
 const order={'신청 대상':0,'신청 중':1,'곧 도달':2};rows.sort((a,b)=>order[a.status]-order[b.status]||(b.hours-a.hours));
 return {year,badges:BADGES,soonHours:BADGE_SOON_HOURS,rows};
});}
function recordBadge_impl_(o){return withLock_(()=>{
 const badge=BADGES.find(([label])=>label===String(o&&o.badge||''));
 if(!badge)throw Error('배지 이름을 확인해 주세요.');
 const id=String(o.personId||'');if(!personExists_(id))throw Error('봉사자를 먼저 등록해 주세요.');
 const same=records_('AWARDS').filter(a=>String(a.personId)===id&&a.type==='배지'&&badgeNameLevel_(a.name)>=badgeNameLevel_(badge[0])&&a.status!=='미선정');
 if(same.length)throw Error('같거나 더 높은 배지의 신청·수령 기록이 있어요. 인정·포상 기록을 확인해주세요.');
 append_('AWARDS',[Utilities.getUuid(),id,'배지',badge[0],'신청 중','',today_(),'VMS 누적시간 확인 후 신청 기록 ('+badge[1]+'시간 기준)',today_()]);return true;
},['AWARDS']);}

/* ── 연간 자원봉사 현황 (구청 제출용) ──
   개인/단체 구분 (아래 설정은 필요할 때 직접 고치면 됩니다)
   - PEOPLE에 소속이 입력되어 있으면 인원수와 관계없이 단체
   - GROUP_EXCLUDE: 단체로 보지 않을 소속 (프로그램 이름이 소속 칸에 들어간 경우 등)
   - GROUP_ALIAS: 같은 단체로 묶을 소속 이름 ('원래 소속':'묶을 이름')
   - 명단 구분이 '단체'이거나 진우에 '기업(단체) 활동' 표기가 있어도 단체 */
const GROUP_MIN_PEOPLE=1;
const GROUP_EXCLUDE=[];
const GROUP_ALIAS={};
function groupOrg_(raw){raw=String(raw||'').trim();if(!raw||GROUP_EXCLUDE.includes(raw))return '';return GROUP_ALIAS[raw]||raw;}
function getAnnualReport_impl_(year){
 year=Number(year)||Number(today_().slice(0,4));
 return readCached_('annual5:'+year,()=>{
  const all=allData_(),events=dashboardStats_(all,year,true).events,Y=String(year),round=n=>Math.round(n*100)/100;
  const byId=new Map((all.people||[]).map(p=>[String(p.id),p])),jinwooGroup=new Set();
  (all.jinwoo||[]).forEach(r=>{if(String(r.date||'').slice(0,4)===Y&&[r.field,r.activityType,r.bucket].some(v=>/단체|기업/.test(String(v||''))))jinwooGroup.add(String(r.volunteerName||'').trim());});
  const presence=e=>!SEPARATE_TYPES.includes(e.type),yearOf=e=>e.date.slice(0,4);
  const old=new Set(events.filter(e=>yearOf(e)<Y&&presence(e)&&e.key).map(e=>e.key));
  const people=new Map();
  events.filter(e=>yearOf(e)===Y&&presence(e)).forEach(e=>{
   const k=e.key||'unidentified:'+e.name;
   if(!people.has(k)){
    const personId=e.key&&e.key.startsWith('id:')?e.key.slice(3):'',p=byId.get(personId)||{},raw=String(p.affiliation||'').trim();
    people.set(k,{key:e.key,personId,name:p.name||e.name||'이름 없음',affiliation:raw,org:groupOrg_(raw),byPeople:p.kind==='단체',byJinwoo:jinwooGroup.has(String(e.name||'').trim()),count:0,hours:0,isNew:!!e.key&&!old.has(e.key),identified:!!e.key});
   }
   const r=people.get(k);if(isServiceEvent_(e)){r.count++;r.hours+=e.hours;}
  });
  // 같은 소속(정리된 이름) 인원 수
  const orgSize=new Map();people.forEach(r=>{if(r.org)orgSize.set(r.org,(orgSize.get(r.org)||0)+1);});
  const notGroup=new Map();
  people.forEach(r=>{
   const raw=r.affiliation,big=!!r.org;
   r.kind=r.byPeople||r.byJinwoo||big?'단체':'개인';
   r.kindReason=r.byPeople?'명단 구분':big?'소속 입력':r.byJinwoo?'진우 단체 표기':'';
   if(r.kind==='단체'&&!r.org)r.org=raw||'(소속 미입력)';
   if(r.kind==='개인'&&raw)notGroup.set(raw,GROUP_EXCLUDE.includes(raw)?'제외 목록(프로그램 이름)':'소속 확인 필요');
  });
  const list=Array.from(people.values()).map(r=>Object.assign(r,{hours:round(r.hours)})).sort((a,b)=>String(a.name).localeCompare(String(b.name),'ko'));
  const sum=rows=>{const ok=rows.filter(r=>r.identified);return {real:ok.length,newCount:ok.filter(r=>r.isNew).length,count:rows.reduce((s,r)=>s+r.count,0),hours:round(rows.reduce((s,r)=>s+r.hours,0))};};
  const individuals=list.filter(r=>r.kind==='개인'),members=list.filter(r=>r.kind==='단체'),orgs=new Map();
  members.forEach(r=>{const org=r.org||r.affiliation||'(소속 미입력)';if(!orgs.has(org))orgs.set(org,[]);orgs.get(org).push(r);});
  const groups=Array.from(orgs.entries()).map(([org,rows])=>Object.assign({org,people:rows},sum(rows))).sort((a,b)=>b.count-a.count||a.org.localeCompare(b.org,'ko'));
  const unidentified=list.filter(r=>!r.identified);
  return {year,summary:{all:sum(list),individual:sum(individuals),group:sum(members),orgCount:groups.length},groups,individuals,unidentified:unidentified.map(r=>r.name),rule:{minPeople:GROUP_MIN_PEOPLE,exclude:GROUP_EXCLUDE},notGroup:Array.from(notGroup.entries()).map(([org,reason])=>({org,reason})).sort((a,b)=>a.org.localeCompare(b.org,'ko'))};
 });
}
function getBadgeList(o){requireRead_();return getBadgeList_impl_(o);}
function recordBadge(o){requireOwner_();return recordBadge_impl_(o);}
function getAnnualReport(y){
 const r=requireRole_(),d=getAnnualReport_impl_(y);if(r!=='viewer')return d;
 // 관리자: 숫자만 (이름 없음)
 return {year:d.year,summary:d.summary,rule:d.rule,groups:d.groups.map(g=>({org:g.org,real:g.real,newCount:g.newCount,count:g.count,hours:g.hours})),individuals:[],unidentified:[],unidentifiedCount:d.unidentified.length,notGroup:[],viewer:true};
}

// 화면 개선용 진단: 명단 등록 여부와 통계 식별 여부를 혼동하지 않습니다.
function registrationIssues_(all,year){
 const names=new Map();(all.people||[]).forEach(p=>{const n=String(p.name||'').trim();if(!names.has(n))names.set(n,[]);names.get(n).push(p);});
 const groups=new Map();(all.jinwoo||[]).filter(r=>String(r.date||'').slice(0,4)===String(year)).forEach(r=>{
  const name=String(r.volunteerName||'').trim();if(!name)return;const people=names.get(name)||[];if(people.length===1)return;
  if(!groups.has(name))groups.set(name,{name,reason:people.length?'동명이인 확인 필요':'명단 등록 필요',firstDate:r.date,lastDate:r.date,activities:[],count:0});
  const g=groups.get(name);g.firstDate=[g.firstDate,r.date].sort()[0];g.lastDate=[g.lastDate,r.date].sort().pop();g.count++;
  if(jinwooType_(r)==='활동'&&r.activityType&&!g.activities.includes(r.activityType))g.activities.push(r.activityType);
 });return Array.from(groups.values()).sort((a,b)=>a.name.localeCompare(b.name,'ko'));
}
function validatedPersonBirth_(value){const b=birth_(value);if(b&&b>today_())throw Error('생년월일은 오늘 이후로 입력할 수 없어요.');return b;}
function personBirth_(payload,prior){
 const has=Object.prototype.hasOwnProperty.call(payload,'birthDate'),value=has?String(payload.birthDate||'').trim():prior?String(prior.birthDate||'').trim():'';
 const old=prior?String(prior.birthDate||'').trim():'';let oldInvalid=false;
 if(old)try{validatedPersonBirth_(old);}catch(e){oldInvalid=true;}
 if(oldInvalid&&value===old)return old;
 if(oldInvalid&&!value)throw Error('기존 생년월일 형식이 올바르지 않아요. 원래 값을 유지하거나 정확한 날짜로 수정해주세요.');
 return validatedPersonBirth_(value);
}
function sourceRowNumber_(v){
 if(v instanceof Date){const d=Utilities.formatDate(v,tz_(),'yyyy-MM-dd').split('-').map(Number);return Math.round((Date.UTC(d[0],d[1]-1,d[2])-Date.UTC(1899,11,30))/86400000);}
 const t=String(v==null?'':v).trim();if(!t)return '';
 const m=t.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return Math.round((Date.UTC(+m[1],+m[2]-1,+m[3])-Date.UTC(1899,11,30))/86400000);
 const n=Number(t);return Number.isInteger(n)&&n>0?n:'';
}
function badgeNameLevel_(name){let lv=0;BADGES.forEach(([label],i)=>{if(new RegExp('(^|[^0-9A-Za-z가-힣])'+label+'(?![0-9])').test(String(name||'')))lv=Math.max(lv,i+1);});return lv;}

/** 과거 명단에서 포상 기록할 사람 찾기. 검색만 하며 PEOPLE에는 쓰지 않음. */
function searchHistoricalAwardPeople(o){
 requireOwner_();
 const year=Number(o&&o.year),q=String(o&&o.query||'').trim().replace(/\s+/g,'').toLowerCase();
 if(!Number.isInteger(year)||year<1900||year>2200)throw Error('찾을 연도를 확인해 주세요.');
 if(!q||q.length>80)throw Error('이름을 1~80자로 입력해 주세요.');
 const all=allData_(),candidates=new Map(),norm=v=>String(v||'').trim().replace(/\s+/g,'');
 (all.history||[]).forEach(r=>{
  if(Number(r.year)!==year||!norm(r.name).toLowerCase().includes(q))return;
  const name=String(r.name||'').trim(),birth=String(r.birthDate||'').trim(),key=JSON.stringify([name,birth]);
  if(!candidates.has(key))candidates.set(key,{name,birthDate:birth,records:0});
  candidates.get(key).records++;
 });
 const rows=Array.from(candidates.values()).sort((a,b)=>a.name.localeCompare(b.name,'ko')||a.birthDate.localeCompare(b.birthDate)).map(r=>Object.assign(r,{
  matches:(all.people||[]).filter(p=>norm(p.name)===norm(r.name)).map(p=>({id:p.id,name:p.name,birthDate:p.birthDate||'',affiliation:p.affiliation||''}))
 }));
 return {year,total:rows.length,rows:rows.slice(0,50)};
}
