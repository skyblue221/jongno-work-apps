/** 후원자 문자 명단 · 후원 업무 도우미에 붙는 새 파일
 *  - 연락처는 이 시트의 「후원자연락처」 탭에서 읽기만 해요 (앱이 따로 저장하지 않아요)
 *  - 자동 대상: 그 달 CMS 출금 대상 · 통장 정기후원 입금 · 그 달 신규후원자 · 📌 고정한 분
 *    (그 달 희망이음 후원금·후원품 후원자는 화면에서 파일을 올려 더해요)
 *  - 이 화면과 연락처는 min(배포한 계정)만 볼 수 있어요
 */
const SMS_CONTACT_TAB = '후원자연락처';
const SMS_CONTACT_HEAD = ['후원자명','연락처','이메일','소속(업체)','후원자번호','문자 수신(X면 안 보냄)','메모'];
const SMS_PIN_TAB = '문자고정';
const SMS_PIN_HEAD = ['후원자명','메모','고정일'];
const SMS_VERSION = '10/31 ③';   // 화면 제목 옆에 나와요 — 새 코드가 배포됐는지 확인용

/** 화면 조각(SmsTab.html)을 돌려줌 — min이 아니면 빈 값이라 탭이 아예 안 생겨요 */
function getSmsTab(){
  if(!owner_())return '';
  return HtmlService.createHtmlOutputFromFile('SmsTab').getContent();
}

function smsSheet_(name,head){
  const ss=ss_();let sh=ss.getSheetByName(name);
  if(!sh){
    sh=ss.insertSheet(name);
    sh.getRange(1,1,1,head.length).setValues([head]).setFontWeight('bold').setBackground('#143c48').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.getRange(2,1,sh.getMaxRows()-1,head.length).setNumberFormat('@');   // 연락처 앞자리 0이 사라지지 않게
  }
  return sh;
}
/** 이름 비교용: 띄어쓰기·'님'·(주)/㈜/주식회사를 빼고 비교 */
function smsName_(v){return String(v==null?'':v).replace(/\s+/g,'').replace(/님$/,'').replace(/\(주\)|㈜|주식회사|\(재\)|\(사\)|\(유\)/g,'').toLowerCase();}

/** 「후원자연락처」 탭 읽기: 1~5번째 줄에서 머리글을 찾아요 (칸 순서·이름이 조금 달라도 괜찮아요) */
function smsContacts_(){
  const sh=smsSheet_(SMS_CONTACT_TAB,SMS_CONTACT_HEAD),last=sh.getLastRow(),width=Math.max(sh.getLastColumn(),1);
  if(last<1)return {rows:[],cols:{},headerRow:0};
  const values=sh.getRange(1,1,last,width).getDisplayValues();
  const norm=v=>String(v).replace(/[\s()]/g,'');
  const TEST={
    name:v=>/^(후원자명|후원자|성명|이름|업체명|기관명|후원자\/업체명|업체및후원자명)$/.test(v),
    phone:v=>/^(연락처|휴대폰|핸드폰|휴대전화|휴대폰번호|전화번호|전화|핸드폰번호|휴대전화번호)$/.test(v),
    no:v=>/^(후원자번호|회원번호|납부자번호)$/.test(v),
    email:v=>/^(이메일|메일|e-?mail|이메일주소|메일주소|담당자이메일|담당자메일)$/i.test(v),
    org:v=>/^(소속|소속업체|업체|기관|소속기관|구분)$/.test(v),
    optOut:v=>/수신/.test(v),
    memo:v=>/^(메모|비고|참고)$/.test(v)};
  let headerRow=-1,cols={};
  for(let r=0;r<Math.min(values.length,5);r++){
    const c={};values[r].forEach((cell,i)=>{const v=norm(cell);Object.keys(TEST).forEach(k=>{if(c[k]===undefined&&TEST[k](v))c[k]=i;});});
    if(c.name!==undefined&&c.phone!==undefined){headerRow=r;cols=c;break;}
  }
  if(headerRow<0)return {rows:[],cols:{},headerRow:0,missing:true,seen:(values[0]||[]).filter(String).slice(0,20)};
  // 예전에 만든 탭이라 '이메일' 칸이 없으면 머리글 맨 뒤에 추가해 둠
  if(cols.email===undefined){sh.getRange(headerRow+1,width+1).setValue('이메일').setFontWeight('bold').setBackground('#143c48').setFontColor('#ffffff');cols.email=width;}
  const optHead=cols.optOut===undefined?'':norm(values[headerRow][cols.optOut]);
  const rows=[];
  values.slice(headerRow+1).forEach((r,i)=>{
    const name=String(r[cols.name]||'').trim();if(!name)return;
    const phoneRaw=String(r[cols.phone]||'').trim(),digits=phoneRaw.replace(/\D/g,'');
    const opt=cols.optOut===undefined?'':String(r[cols.optOut]||'').trim();
    // '수신거부' 칸이면 표시가 있을 때 제외, '문자 수신' 칸이면 X·N·거부·아니오일 때 제외
    const optOut=/거부/.test(optHead)?(opt!==''&&!/^(n|no|아니오|x|-)$/i.test(opt)):/^(x|n|no|거부|아니오|안함|미수신|수신거부|×)$/i.test(opt.replace(/\s/g,''));
    rows.push({id:'c'+(headerRow+2+i),name,key:smsName_(name),phone:smsPhone_(digits||phoneRaw),hasPhone:digits.length>=9,
      email:cols.email===undefined?'':String(r[cols.email]||'').trim(),
      org:cols.org===undefined?'':String(r[cols.org]||'').trim(),no:cols.no===undefined?'':normNo_(r[cols.no]),
      memo:cols.memo===undefined?'':String(r[cols.memo]||'').trim(),optOut});
  });
  return {rows,cols,headerRow:headerRow+1};
}
function smsPhone_(v){const d=String(v||'').replace(/\D/g,'');
  if(d.length===11)return d.replace(/(\d{3})(\d{4})(\d{4})/,'$1-$2-$3');
  if(d.length===10)return d.startsWith('02')?d.replace(/(\d{2})(\d{4})(\d{4})/,'$1-$2-$3'):d.replace(/(\d{3})(\d{3})(\d{4})/,'$1-$2-$3');
  if(d.length===9&&d.startsWith('02'))return d.replace(/(\d{2})(\d{3})(\d{4})/,'$1-$2-$3');
  return String(v||'').trim();}

function smsPins_(){
  const sh=smsSheet_(SMS_PIN_TAB,SMS_PIN_HEAD),last=sh.getLastRow();if(last<2)return [];
  return sh.getRange(2,1,last-1,3).getDisplayValues().map(r=>({name:String(r[0]).trim(),memo:String(r[1]),date:String(r[2])})).filter(r=>r.name);
}

/** 문자 명단 자료: 연락처 + 그 달 자동 대상 + 고정 */
function getSmsData(ym){requireOwner_();
  if(!/^\d{4}-\d{2}$/.test(String(ym||'')))throw Error('연도와 월을 골라 주세요.');
  const contacts=smsContacts_(),dm=donorMap_(),today=today_();
  const ended=no=>{const d=dm.get(no)||{};return !!(d.end&&d.end<=today);};
  const auto=[];   // {name, no, reasons:[...], warn}
  const add=(name,no,reason,warn)=>{const key=no?'no:'+normNo_(no):'nm:'+smsName_(name);
    let a=auto.find(x=>x.k===key);if(!a){a={k:key,name:String(name).trim(),no:no?normNo_(no):'',reasons:[],warn:''};auto.push(a);}
    if(!a.reasons.includes(reason))a.reasons.push(reason);if(warn&&!a.warn)a.warn=warn;};
  // 그 달 통장 입금이 있는 CMS 후원자 (CMS에서 통장 자동이체로 바꾼 분: 이름 + 생년월일로 맞춤)
  //    (그 달이나 지난달에 통장 입금이 있으면 통장으로 바꾼 분으로 봐요 — 통장 입력이 늦어도 오류로 안 뜨게)
  const [yy,mm]=ym.split('-').map(Number),prevYm=mm===1?(yy-1)+'-12':yy+'-'+String(mm-1).padStart(2,'0');
  const idx=cmsPersonIndex_(),allBank=bankObjects_(),bankMonth=allBank.filter(r=>r.date.slice(0,7)===ym),paidByBank=new Set();
  allBank.filter(r=>r.date.slice(0,7)===ym||r.date.slice(0,7)===prevYm).forEach(r=>{const k=bankDonorKey_(r,idx);if(k.cmsNo)paidByBank.add(normNo_(k.cmsNo));});
  // 1) 그 달 CMS 출금 대상 (정상 + 오류) — 종결한 분 제외
  //    출금 오류여도 같은 달 통장으로 들어왔으면 오류 표시 없이 '정기 통장'으로만 보여요
  const cms=cmsObjects_().filter(r=>r.date.slice(0,7)===ym);
  const byNo={};cms.forEach(r=>{(byNo[normNo_(r.no)]=byNo[normNo_(r.no)]||[]).push(r);});
  Object.keys(byNo).forEach(no=>{const list=byNo[no];if(ended(no))return;
    const okAny=list.some(r=>isOk_(r)&&r.paid>0);
    if(!okAny&&paidByBank.has(no)){add(list[0].name,no,'정기 통장');return;}   // 통장 자동이체로 바꾼 분
    add(list[0].name,no,'정기 CMS',okAny?'':'이달 출금 오류');});
  // 2) 그 달 통장 정기후원 (CMS와 같은 분이면 한 줄로)
  bankMonth.forEach(r=>{const k=bankDonorKey_(r,idx);
    if(ended(k.cmsNo||k.bankNo))return;
    if(k.cmsNo)add(r.name,k.cmsNo,'정기 통장');else add(r.name,'','정기 통장');});
  // 3) 그 달 신규후원자
  rows_('NEW').forEach(r=>{if(ymd_(r[1]).slice(0,7)===ym&&String(r[2]).trim())add(String(r[2]),'', '신규');});
  return {ym,version:SMS_VERSION,contacts:contacts.rows,contactInfo:{tab:SMS_CONTACT_TAB,count:contacts.rows.length,headerRow:contacts.headerRow,missing:!!contacts.missing,seen:contacts.seen||[],
      cols:Object.keys(contacts.cols)},
    auto:auto.map(a=>({name:a.name,no:a.no,key:smsName_(a.name),reasons:a.reasons,warn:a.warn})),pins:smsPins_()};
}

/** 📌 고정 / 고정 해제 — 이름만 저장해요 */
function setSmsPin(o){requireOwner_();return withLock_(()=>{
  const name=text_(o&&o.name,120);if(!name)throw Error('후원자명이 필요합니다.');
  const sh=smsSheet_(SMS_PIN_TAB,SMS_PIN_HEAD),pins=smsPins_(),i=pins.findIndex(p=>smsName_(p.name)===smsName_(name));
  if(o.on){if(i<0)sh.appendRow([name,text_(o.memo,200),today_()]);}
  else if(i>=0)sh.deleteRow(i+2);
  return {name,on:!!o.on};
},['NONE']);}
