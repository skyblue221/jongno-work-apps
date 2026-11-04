/******************************************************************
 * 후원품 나눔 도우미 — Code.gs
 * 후원물품 스프레드시트 > 확장 프로그램 > Apps Script 에 붙여 넣어 써요.
 * 배포: 웹 앱 / 다음 사용자로 실행: 나 / 액세스: (기관 도메인) 내 모든 사용자
 *
 * - 시트의 칸 이름을 앱이 스스로 찾고, 설정 탭에서 min이 확인한 뒤에만 기록해요.
 * - 수식(ARRAYFORMULA)으로 채워지는 칸에는 절대 쓰지 않아요.
 * - 가정 배분 이용인 종이 서명 방식은 인원·수량만 전송합니다. 나중에 폰 서명은 명단을 임시 보관한 뒤 PDF 저장 후 휴지통으로 보냅니다.
 ******************************************************************/

const APP = {
  title: '후원품 나눔 도우미',
  org: '종로장애인복지관',
  tz: 'Asia/Seoul',
  sheets: { REG: '후원물품등록', DIST: '배분 기록', DISP: '폐기 목록', STAFF: '직원 명부', STOCK: '재고 현황', VOUCH: '상품권 관리대장', FAM: '이용인 명단' },
  own: { RCPT: '앱_수령증', ORG: '앱_유관기관', HOME: '앱_가정배분', DLOG: '앱_폐기' },
  rootFolder: '후원품 나눔 도우미',
  alertDays: 30   // 유통기한이 이 날짜 안으로 남으면 알림
};

/** 칸 이름 후보 (앞에 있을수록 우선) */
const FIELDS = {
  REG: {
    name: ['품명', '물품명', '품목'],
    date: ['입고일', '받은 날', '받은날', '받은일자', '입고일자', '후원일', '접수일'],
    given: ['지원수량'],
    done: ['사용완료'],
    qty: ['수량', '입고수량', '총수량'],
    unit: ['단위'],
    donor: ['후원처', '후원자', '기부처', '후원기관'],
    value: ['환가액', '금액'],
    expiry: ['유통기한', '소비기한'],
    photo: ['사진링크', '사진 링크', '사진']
  },
  DIST: {
    recordId: ['앱기록ID'],
    no: ['배분번호', '배분 번호'],
    label: ['배분품'],
    date: ['지출일', '배분일', '지급일', '날짜', '배분일자', '일자'],
    name: ['품명', '물품명', '품목'],
    person: ['수령인', '받는사람', '성명'],
    team: ['소속', '소속팀', '팀'],
    addr: ['주소', '배분처', '기관'],
    qty: ['사용수량', '수량', '배분수량', '지급수량'],
    inDate: ['입고일'],
    note: ['비고']
  },
  DISP: {
    recordId: ['앱기록ID'],
    date: ['폐기일', '폐기일자', '날짜', '일자'],
    name: ['품명', '물품명', '품목'],
    inDate: ['입고일'],
    donor: ['후원처'],
    total: ['총수량'],
    given: ['지원수량'],
    qty: ['수량', '폐기수량'],
    reason: ['사유', '폐기사유'],
    u1: ['1열'], u2: ['2열'], u3: ['3열'],
    photo: ['사진', '사진링크']
  },
  STOCK: {
    name: ['품명', '물품명', '품목'],
    inDate: ['입고일', '받은 날', '받은날'],
    remain: ['재고', '남은수량', '잔여수량', '현재고', '재고수량', '잔량', '남은개수'],
    inQty: ['입고', '입고수량', '총수량'],
    out: ['배분', '배분수량', '지출', '출고'],
    disp: ['폐기', '폐기수량']
  },
  VOUCH: {
    no: ['연번'],
    serial: ['일련번호'],
    kind: ['상품권종류', '종류'],
    face: ['면액', '금액'],
    inDate: ['입고일'],
    src: ['입고처'],
    inBy: ['입고담당자'],
    target: ['지정내용'],
    outDate: ['출고일'],
    purpose: ['사용목적'],
    person: ['수령자'],
    check: ['수령확인'],
    status: ['상태'],
    note: ['비고'],
    outBy: ['출고담당자']
  },
  FAM: {
    name: ['성명', '이름'],
    birth: ['생년월일'],
    addr: ['주소'],
    phone: ['연락처', '전화번호', '휴대폰', '핸드폰'],
    manager: ['담당자']
  },
  STAFF: {
    name: ['이름', '성명', '직원명'],
    team: ['소속', '소속팀', '팀', '부서']
  }
};
const LABELS = {
  REG: { name: '품명', date: '입고일', given: '지원수량 (직접 입력분)', done: '사용완료', qty: '수량', unit: '단위', donor: '후원처', value: '환가액', expiry: '유통기한', photo: '사진 링크' },
  DIST: { recordId:'앱기록ID (자동)', no: '배분번호', label: '배분품', date: '지출일', name: '품명', person: '수령인', team: '소속', addr: '주소(배분처)', qty: '수량', inDate: '입고일', note: '비고' },
  DISP: { recordId:'앱기록ID (자동)', date: '폐기일', name: '품명', inDate: '입고일', donor: '후원처', total: '총 수량', given: '지원수량', u1: '단위 (총 수량 옆)', u2: '단위 (지원수량 옆)', u3: '단위 (폐기 수량 옆)', qty: '폐기 수량', reason: '사유', photo: '사진' },
  STOCK: { name: '품명', inDate: '입고일', remain: '남은 수량', inQty: '입고 수량', out: '배분 수량', disp: '폐기 수량' },
  VOUCH: { no: '연번', serial: '일련번호', kind: '상품권 종류', face: '면액', inDate: '입고일', src: '입고처', inBy: '입고담당자', target: '지정내용', outDate: '출고일', purpose: '사용목적', person: '수령자', check: '수령확인', status: '상태', note: '비고', outBy: '출고담당자' },
  FAM: { name: '성명', birth: '생년월일', addr: '주소', phone: '연락처', manager: '담당자' },
  STAFF: { name: '이름', team: '소속팀' }
};
const REQUIRED = { REG: ['name', 'date', 'qty'], DIST: ['date', 'name', 'person', 'qty'], DISP: ['name', 'qty'], STOCK: ['name', 'remain'], VOUCH: ['serial', 'kind', 'face', 'status'], FAM: ['name'], STAFF: ['name'] };
const OWN_HEAD = {
  RCPT: ['ID', '유형', '배분번호', '배분일', '등록자', '상태', '품목', '받는곳', '파일', '메모', '등록시각'],
  ORG: ['기관명', '대표자', '주소', '연락처', '담당자', '메모'],
  HOME: ['ID', '요청일', '담당자', '요청자', '인원', '품목', '상태', '확인일', '메모', '서명', '수령증', '임시명단'],
  DLOG: ['ID', '폐기일', '품목', '사유', '사진', '등록자', '등록시각']
};

/* ───────── 웹 앱 ───────── */
function doGet(e) {
  if (e && e.parameter && e.parameter.s) return HtmlService.createHtmlOutputFromFile('Sign').setTitle('수령 서명').addMetaTag('viewport', 'width=device-width, initial-scale=1');
  if (!me_()) return HtmlService.createHtmlOutput('<meta charset="utf-8"><div style="font:17px/1.6 sans-serif;max-width:480px;margin:40px auto;padding:20px;border:1px solid #dfe5df;border-radius:14px"><b>후원품 수령 확인</b><p>이 주소는 복지관에서 문자나 카톡으로 보내드린 <b>서명 링크</b>로만 열 수 있어요. 받은 메시지의 링크를 눌러 주세요.</p><p style="color:#5f6b64;font-size:14px">직원은 기관용 앱 주소로 들어가 주세요.</p></div>').setTitle('후원품 수령 확인').addMetaTag('viewport', 'width=device-width, initial-scale=1');
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(APP.title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ───────── 공통 ───────── */
const ss_ = () => SpreadsheetApp.getActive();
const str_ = v => (v == null ? '' : String(v).trim());
const num_ = v => { const n = Number(String(v == null ? '' : v).replace(/[^\d.\-]/g, '')); return isFinite(n) ? n : 0; };
const norm_ = s => str_(s).replace(/[\s()（）]/g, '');
const today_ = () => Utilities.formatDate(new Date(), APP.tz, 'yyyy-MM-dd');
function ymd_(v) {
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, APP.tz, 'yyyy-MM-dd');
  const s = str_(v);
  const m = s.match(/(\d{4})\s*[.\-\/년]\s*(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})/);
  return m ? m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2) : s;
}
function toDate_(s) { const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : s; }
const colL_ = n => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
const props_ = () => PropertiesService.getScriptProperties();
const me_ = () => (Session.getActiveUser().getEmail() || '').toLowerCase();
function isAdmin_() {
  const me = me_(); if (!me) return false;
  const owner = (Session.getEffectiveUser().getEmail() || '').toLowerCase();
  const extra = str_(props_().getProperty('ADMINS')).toLowerCase().split(/[,\s]+/).filter(Boolean);
  return me === owner || extra.indexOf(me) >= 0;
}
function needAdmin_() { if (!isAdmin_()) throw new Error('관리자(min)만 할 수 있어요.'); }
/** 상품권 탭을 쓸 수 있는 직원 (관리자 + 설정에서 추가한 사람) */
function vouchUsers_() { return str_(props_().getProperty('VUSERS')).toLowerCase().split(/[,\s]+/).filter(Boolean); }
function canVouch_() { return isAdmin_() || vouchUsers_().indexOf(me_()) >= 0; }
function needVouch_() { if (!canVouch_()) throw new Error('상품권 권한이 없어요. 관리자에게 요청해 주세요.'); }
function getVoucherUsers() { needAdmin_(); return vouchUsers_(); }
/** 「이용인 명단」을 불러올 수 있는 직원 (관리자 + 설정에서 추가한 사람) */
function famUsers_() { return str_(props_().getProperty('FUSERS')).toLowerCase().split(/[,\s]+/).filter(Boolean); }
function canFam_() { return isAdmin_() || famUsers_().indexOf(me_()) >= 0; }
function getFamUsers() { needAdmin_(); return famUsers_(); }
function saveFamUsers(list) { needAdmin_(); const v = String(list || '').toLowerCase().split(/[,\s]+/).filter(x => /@/.test(x)); props_().setProperty('FUSERS', v.join(',')); return v; }
/** 기관 계정이 아니면(외부 서명용 배포로 들어온 경우) 서명 화면 말고는 아무것도 못 하게 막음 */
function needOrg_() { if (!me_()) throw new Error('기관 계정으로 로그인해야 쓸 수 있어요.'); }
function saveVoucherUsers(list) { needAdmin_(); const v = String(list || '').toLowerCase().split(/[,\s]+/).filter(x => /@/.test(x)); props_().setProperty('VUSERS', v.join(',')); return v; }
function withLock_(fn) { const l = LockService.getScriptLock(); l.waitLock(30000); clearCache_(); try { return fn(); } finally { clearCache_(); l.releaseLock(); } }
/* 속도: 한 번 실행 안에서 같은 탭을 여러 번 읽지 않게(MEMO), 재고 계산은 몇 분간 저장(CacheService) */
const MEMO = {};
const CACHE_SEC = 300;
function clearCache_() { Object.keys(MEMO).forEach(k => delete MEMO[k]); try { CacheService.getScriptCache().removeAll(['stock', 'staff']); } catch (e) {} }
function cached_(key, fn) {
  if (MEMO[key]) return MEMO[key];
  const c = CacheService.getScriptCache();
  try { const hit = c.get(key); if (hit) return (MEMO[key] = JSON.parse(hit)); } catch (e) {}
  const v = fn(); MEMO[key] = v;
  try { c.put(key, JSON.stringify(v), CACHE_SEC); } catch (e) {}
  return v;
}

/** 탭 이름 앞의 번호(「2. 폐기 목록」)나 띄어쓰기가 달라도 찾음 */
function sheet_(key) {
  const want = APP.sheets[key], ex = ss_().getSheetByName(want); if (ex) return ex;
  const n = s => String(s).replace(/^\s*\d+\s*[.)_\-]\s*/, '').replace(/\s+/g, '');
  return ss_().getSheets().find(s => n(s.getName()) === n(want)) || null;
}

/* ───────── 칸 찾기·확인 ───────── */
function detect_(key) {
  const sh = sheet_(key); if (!sh) return null;
  const lc = Math.min(sh.getLastColumn(), 40), lr = Math.min(sh.getLastRow(), 6);
  if (!lc || !lr) return null;
  const grid = sh.getRange(1, 1, lr, lc).getDisplayValues();
  let best = null;
  grid.forEach((row, ri) => {
    const cols = {}, used = {};
    [true, false].forEach(exact => {
      Object.keys(FIELDS[key]).forEach(f => {
        if (cols[f]) return;
        for (const a of FIELDS[key][f]) {
          const na = norm_(a);
          const ci = row.findIndex((h, i) => !used[i] && norm_(h) && (exact ? norm_(h) === na : norm_(h).indexOf(na) >= 0));
          if (ci >= 0) { cols[f] = ci + 1; used[ci] = 1; break; }
        }
      });
    });
    const score = Object.keys(cols).length;
    if (!best || score > best.score) best = { headerRow: ri + 1, cols: cols, score: score };
  });
  return best;
}
function map_(key) { const p = props_().getProperty('MAP_' + key); return p ? JSON.parse(p) : null; }
function mapOrThrow_(key) {
  const m = map_(key);
  if (!m) throw new Error('설정 탭에서 「' + APP.sheets[key] + '」 칸 확인을 먼저 해 주세요.');
  return m;
}
/** 첫 데이터 줄에 배열 수식이 있는 칸 = 수식이 알아서 채우는 칸 (앱이 쓰면 안 됨) */
function autoCols_(sh, headerRow) {
  const r = headerRow + 1; if (sh.getLastRow() < r || !sh.getLastColumn()) return {};
  const f = sh.getRange(r, 1, 1, sh.getLastColumn()).getFormulas()[0], o = {};
  f.forEach((x, i) => { if (/ARRAYFORMULA|^=\s*(MAP|BYROW|FILTER|QUERY|SORT|UNIQUE|IMPORTRANGE)\s*\(/i.test(x)) o[i + 1] = true; });
  return o;
}
function sheetInfo_(key, headerRow) {
  const sh = sheet_(key), name = sh ? sh.getName() : APP.sheets[key];
  const fields = Object.keys(FIELDS[key]).map(f => ({ f: f, label: LABELS[key][f], required: REQUIRED[key].indexOf(f) >= 0 }));
  if (!sh) return { key: key, sheet: name, missing: true, fields: fields };
  let saved = map_(key);
  // 예전에 저장한 설정이 새 짐작과 다르면(새로 생긴 칸, 빈 '타임스탬프'를 입고일로 잡았던 경우 등) 다시 확인하게 함
  if (saved) {
    const d = detect_(key);
    if (d && d.headerRow === saved.headerRow && Object.keys(d.cols).some(f => d.cols[f] !== saved.cols[f])) saved = null;
  }
  let det = saved || detect_(key) || { headerRow: 1, cols: {} };
  if (headerRow && headerRow !== det.headerRow) {
    det = { headerRow: headerRow, cols: {} };
    const d = detect_(key); if (d && d.headerRow === headerRow) det.cols = d.cols;
  }
  const lc = Math.min(sh.getLastColumn(), 40);
  const headers = lc ? sh.getRange(det.headerRow, 1, 1, lc).getDisplayValues()[0] : [];
  const auto = autoCols_(sh, det.headerRow);
  return {
    key: key, sheet: name, headerRow: det.headerRow, cols: det.cols, confirmed: !!saved && !headerRow,
    headers: headers.map((h, i) => ({ col: i + 1, letter: colL_(i + 1), text: h, auto: !!auto[i + 1] })),
    fields: fields
  };
}
function getSetup() { needAdmin_(); return ['REG', 'DIST', 'DISP', 'STOCK', 'VOUCH', 'FAM', 'STAFF'].map(k => sheetInfo_(k)); }
function getSheetInfo(key, headerRow) { needAdmin_(); return sheetInfo_(key, Number(headerRow) || 0); }
/** 수령증 위쪽 '배분처'에 들어갈 후원 담당 팀 */
function saveDept(name) { needAdmin_(); props_().setProperty('DEPT', str_(name) || '일상동행팀'); return str_(name) || '일상동행팀'; }
function saveSetup(key, headerRow, cols) {
  needAdmin_();
  const clean = {};
  Object.keys(FIELDS[key]).forEach(f => { const c = Number(cols[f]); if (c > 0) clean[f] = c; });
  const miss = REQUIRED[key].filter(f => !clean[f]);
  if (miss.length) throw new Error('꼭 필요한 칸을 골라 주세요: ' + miss.map(f => LABELS[key][f]).join(', '));
  props_().setProperty('MAP_' + key, JSON.stringify({ headerRow: Number(headerRow) || 1, cols: clean }));
  clearCache_();
  return sheetInfo_(key);
}
function setupDone_() { return ['REG', 'DIST', 'DISP', 'STAFF'].every(k => !!map_(k)); }

/* ───────── 시트 읽기·쓰기 ───────── */
function readSheet_(key, skip) {
  const m = map_(key), sh = sheet_(key);
  if (!m || !sh) return [];
  const last = sh.getLastRow(); if (last <= m.headerRow) return [];
  // 쓰는 칸만 이어지는 묶음으로 읽음 (사진 이미지 같은 무거운 칸은 건너뜀)
  const keys = Object.keys(m.cols).filter(f => !(skip || []).includes(f));
  const n = last - m.headerRow, cols = keys.map(f => m.cols[f]).sort((a, b) => a - b), byCol = {};
  for (let i = 0; i < cols.length;) {
    let j = i; while (j + 1 < cols.length && cols[j + 1] <= cols[j] + 1) j++;
    const v = sh.getRange(m.headerRow + 1, cols[i], n, cols[j] - cols[i] + 1).getValues();
    for (let c = cols[i]; c <= cols[j]; c++) byCol[c] = v.map(r => r[c - cols[i]]);
    i = j + 1;
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const o = { _row: m.headerRow + 1 + i };
    keys.forEach(f => { o[f] = byCol[m.cols[f]][i]; });
    out.push(o);
  }
  return out;
}
/** 마지막 실제 기록 줄 다음부터 씀. 수식 칸은 건너뛰거나(배열 수식) 윗줄 수식을 이어 씀. */
function appendRows_(key, objs) {
  if (!objs.length) return;
  const m = mapOrThrow_(key), sh = sheet_(key);
  const lastCol = sh.getLastColumn(), auto = autoCols_(sh, m.headerRow), keyCol = m.cols.name || m.cols.serial;
  const lr = sh.getLastRow();
  let last = m.headerRow;
  if (lr > m.headerRow) {
    const v = sh.getRange(m.headerRow + 1, keyCol, lr - m.headerRow, 1).getValues();
    for (let i = v.length - 1; i >= 0; i--) if (str_(v[i][0])) { last = m.headerRow + 1 + i; break; }
  }
  const tplF = last > m.headerRow ? sh.getRange(last, 1, 1, lastCol).getFormulasR1C1()[0] : [];
  const fieldOf = {}; Object.keys(m.cols).forEach(f => { fieldOf[m.cols[f]] = f; });
  // 입고일 칸에 쓸 수 없으면 비고에 남겨 같은 이름 물품을 구분
  const inDateWritable = m.cols.inDate && !auto[m.cols.inDate];
  const start = last + 1, n = objs.length;
  const block = sh.getRange(start, 1, n, lastCol), curF = block.getFormulas(), curV = block.getValues();
  guardBlock_(sh, start, curV, curF, auto); // 실패하면 이 줄들만 원래대로 되돌릴 수 있게 기억
  // 줄마다 칸별 할 일: 값 쓰기(v) / 윗줄 수식 이어 쓰기(f) / 그대로 두기(null)
  const plans = objs.map((o, i) => {
    if (o.inDate && !inDateWritable) o.note = ((o.note || '') + ' (입고 ' + o.inDate + ')').trim();
    const acts = [];
    for (let c = 1; c <= lastCol; c++) {
      const f = fieldOf[c];
      if (auto[c]) acts.push(null);
      else if (f && o[f] !== undefined && o[f] !== '') acts.push({ t: 'v', v: (f === 'date' || f === 'inDate') ? toDate_(o[f]) : o[f] });
      else if (tplF[c - 1] && tplF[c - 1].indexOf('#REF!') < 0 && !curF[i][c - 1] && curV[i][c - 1] === '') acts.push({ t: 'f', v: tplF[c - 1] });
      else acts.push(null);
    }
    // 같은 종류가 이어지는 칸 묶음 [시작, 끝, 종류]
    const segs = [];
    for (let c = 0; c < acts.length;) {
      if (!acts[c]) { c++; continue; }
      let e = c; while (e + 1 < acts.length && acts[e + 1] && acts[e + 1].t === acts[c].t) e++;
      segs.push([c, e, acts[c].t]); c = e + 1;
    }
    return { acts: acts, segs: segs, sig: JSON.stringify(segs) };
  });
  // 칸 모양이 같은 줄끼리는 여러 줄을 한 번에 씀 (줄마다 따로 쓰면 아주 느림)
  for (let i = 0; i < plans.length;) {
    let j = i; while (j + 1 < plans.length && plans[j + 1].sig === plans[i].sig) j++;
    plans[i].segs.forEach(([c, e, t]) => {
      const rg = sh.getRange(start + i, c + 1, j - i + 1, e - c + 1);
      const vals = plans.slice(i, j + 1).map(p => p.acts.slice(c, e + 1).map(a => a.v));
      if (t === 'v') rg.setValues(vals); else rg.setFormulasR1C1(vals);
    });
    i = j + 1;
  }
}
function own_(k) {
  delete MEMO['own_' + k]; // 이 탭에 쓰기 전에 읽어 둔 것을 비움
  let sh = ss_().getSheetByName(APP.own[k]);
  if (!sh) {
    sh = ss_().insertSheet(APP.own[k]);
    sh.appendRow(OWN_HEAD[k]); sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, OWN_HEAD[k].length).setFontWeight('bold').setBackground('#eef3ea');
  }
  else {
    const h = sh.getRange(1, 1, 1, OWN_HEAD[k].length).getValues()[0];
    if (h.some((v, n) => v !== OWN_HEAD[k][n])) sh.getRange(1, 1, 1, OWN_HEAD[k].length).setValues([OWN_HEAD[k]]).setFontWeight('bold').setBackground('#eef3ea');
  }
  return sh;
}
function ownRows_(k) {
  if (MEMO['own_' + k]) return MEMO['own_' + k];
  return (MEMO['own_' + k] = ownRowsRead_(k));
}
function ownRowsRead_(k) {
  const sh = own_(k), n = sh.getLastRow() - 1; if (n < 1) return [];
  return sh.getRange(2, 1, n, OWN_HEAD[k].length).getValues().map((r, i) => ({ row: i + 2, r: r }));
}
function folder_(path) {
  const p = props_(); let root = null;
  try { const id = p.getProperty('ROOT'); if (id) root = DriveApp.getFolderById(id); } catch (e) { root = null; }
  if (!root) { root = DriveApp.createFolder(APP.rootFolder); p.setProperty('ROOT', root.getId()); }
  return path.reduce((f, n) => { const it = f.getFoldersByName(n); return it.hasNext() ? it.next() : f.createFolder(n); }, root);
}
function saveDataUrl_(dataUrl, folderPath, name) {
  const m = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/); if (!m) throw new Error('파일을 읽을 수 없어요.');
  const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], name);
  return trackedFile_(folder_(folderPath),blob);
}

/* ───────── 직원·재고 ───────── */
function staff_() { return cached_('staff', staffRead_); }
function staffRead_() {
  const seen = {};
  return readSheet_('STAFF').map(r => ({ name: str_(r.name), team: str_(r.team) }))
    .filter(s => s.name && !seen[s.name] && (seen[s.name] = 1));
}
function stock_(compare) {
  const lots = {}, firstLot = {}, order = [];
  readSheet_('REG', ['photo', 'value']).forEach(r => {
    const name = str_(r.name); if (!name) return;
    const d = ymd_(r.date), k = name + '|' + d;
    if (!lots[k]) {
      lots[k] = { key: k, name: name, inDate: d, inQty: 0, unit: str_(r.unit), donor: str_(r.donor),
        expiry: ymd_(r.expiry), photo: str_(r.photo), out: 0, disp: 0, pending: 0 };
      order.push(k);
    }
    lots[k].inQty += num_(r.qty);
    lots[k].out += num_(r.given); // 수령증 없이 숫자만 넣은 배분(가정·사례)
    if (r.done === true || String(r.done).toUpperCase() === 'TRUE') lots[k].done = true;
    if (!firstLot[name]) firstLot[name] = d; // 예전 VLOOKUP과 같은 규칙: 첫 줄의 입고일
  });
  const lotOf = r => { const name = str_(r.name); if (!name) return null; const d = incomingDate_(r) || firstLot[name]; return lots[name + '|' + d] || lots[name + '|' + firstLot[name]] || null; };
  readSheet_('DIST').forEach(r => { const l = lotOf(r); if (l) l.out += num_(r.qty); });
  readSheet_('DISP').forEach(r => { const l = lotOf(r); if (l) l.disp += num_(r.qty); });
  ownRows_('HOME').forEach(x => {
    if (x.r[6] !== '확인 대기') return;
    JSON.parse(x.r[5] || '[]').forEach(it => { if (lots[it.key]) lots[it.key].pending += num_(it.qty); });
  });
  const list = order.map(k => { const l = lots[k]; l.remain = l.inQty - l.out - l.disp - l.pending; return l; });
  // 「재고 현황」 탭과 비교만 함 (관리자 재고 화면에 다른 숫자 표시)
  const sm = compare ? map_('STOCK') : null;
  if (sm) {
    const sheetRemain = {};
    readSheet_('STOCK').forEach(r => { const name = str_(r.name); if (!name) return; const k = name + '|' + (sm.cols.inDate ? ymd_(r.inDate) : firstLot[name]); sheetRemain[k] = (sheetRemain[k] || 0) + num_(r.remain); });
    list.forEach(l => { if (sheetRemain[l.key] !== undefined) l.sheetRemain = sheetRemain[l.key]; });
  }
  return list;
}
/** 배분 기록에 쓸 입고일: 재고 현황이 품명별이면 비워 두고 시트 수식에 맡김 */
const wIn_ = l => l.inDate;
function stockMap_() { const o = {}; stock_().forEach(l => { o[l.key] = l; }); return o; }
function stockCached_() { return cached_('stock', () => stock_(false)); }
function getStock(all, fresh) {
  needOrg_();
  if (!setupDone_()) return [];
  if (fresh) clearCache_();
  const full = !!(all && isAdmin_()), list = full ? stock_(true) : stockCached_();
  return full ? list : list.filter(l => l.remain > 0);
}

/* ───────── 시작 정보 ───────── */
function getBoot(receiptId) {
  needOrg_();
  const admin = isAdmin_(), ok = setupDone_();
  const out = { admin: admin, me: me_(), setupOk: ok, today: today_(), org: APP.org, url: ScriptApp.getService().getUrl() };
  if (ok) {
    out.staff = staff_();
    out.stock = getStock(false);
    out.alertDays = APP.alertDays;
    out.dept = props_().getProperty('DEPT') || '일상동행팀';
    out.vouch = canVouch_();
    out.fam = canFam_() && !!map_('FAM');
    if (admin) out.publicUrl = str_(props_().getProperty('PUBLIC_URL'));
    if (admin) out.counts = { sign: ownRows_('RCPT').filter(x => x.r[5] === '서명 대기').length, home: ownRows_('HOME').filter(x => x.r[6] === '확인 대기').length, org: ownRows_('RCPT').filter(x => x.r[5] === '회수 대기').length };
    out.counts = out.counts || {};
    out.counts.hsign = ownRows_('HOME').filter(x => x.r[9] === '서명 대기' && homeAccess_(x)).length;
  }
  if (receiptId) out.receipt = getReceipt(receiptId);
  return out;
}

function distNo_(date, lots,id) { return date + '_' + lots[0].name + (lots.length > 1 ? ' 외 ' + (lots.length - 1) : '')+(id?'_'+id.slice(-6):''); }
function checkStock_(lots, need) {
  lots.forEach(l => { if (need[l.key] > l.remain) throw new Error('「' + l.name + '」(' + l.inDate + ' 입고) 남은 수량은 ' + l.remain + '개예요.'); });
}
function pickLots_(st, keys) { return keys.map(k => { const l = st[k]; if (!l) throw new Error('물품을 찾을 수 없어요. 새로고침해 주세요.'); return l; }); }

/* ───────── A. 팀 배분 + 직원 서명 ───────── */
function createTeamReceipt(p,requestId) {
  needAdmin_();
  return withMutation_('createTeamReceipt',requestId,[p],() => {
    const st = stockMap_(), keys = p.items.map(i => i.key), lots = pickLots_(st, keys);
    const people = (p.people || []).filter(x => str_(x.name));
    if (!people.length) throw new Error('받는 사람을 한 명 이상 넣어 주세요.');
    const need = {};
    people.forEach(x => keys.forEach(k => { need[k] = (need[k] || 0) + num_(x.qty[k]); }));
    if (!keys.some(k => need[k] > 0)) throw new Error('수량을 넣어 주세요.');
    checkStock_(lots, need);
    const id=newRecordId_('R'),date = ymd_(p.date) || today_(), no = distNo_(date, lots,id);
    const rows = [];
    people.forEach(x => lots.forEach(l => {
      const q = num_(x.qty[l.key]);
      if (q > 0) rows.push({ no: no, date: date, name: l.name, label: l.name, person: str_(x.name), team: str_(x.team), addr: APP.org, qty: q, inDate: wIn_(l), note: str_(x.note) || str_(p.note) });
    }));
    appendDist_(id, rows);

    const items = lots.map(l => ({ key: l.key, name: l.name, inDate: l.inDate, donor: l.donor, unit: l.unit, inQty: l.inQty, give: need[l.key] || 0, remainAfter: l.remain - (need[l.key] || 0) }));
    const ppl = people.map(x => ({ name: str_(x.name), team: str_(x.team), note: str_(x.note), qty: x.qty, sig: '', at: '' }));
    appendOwn_('RCPT', [id, '팀', no, date, me_(), '서명 대기', JSON.stringify(items), JSON.stringify(ppl), '', str_(p.note), new Date()]);
    return { id: id, url: ScriptApp.getService().getUrl() + '?r=' + id };
  });
}
function findRcpt_(id) { const x = ownRows_('RCPT').find(y => y.r[0] === id); if (!x) throw new Error('수령증을 찾을 수 없어요.'); return x; }
function rcptObj_(x, withSig) {
  const r = x.r, o = { version:receiptVersion_(x.r), id: r[0], type: r[1], no: r[2], date: ymd_(r[3]), status: r[5], items: JSON.parse(r[6] || '[]'), note: r[9], file: r[8] ? 'https://drive.google.com/file/d/' + r[8] + '/view' : '' };
  if (r[1] === '팀' || r[1] === '상품권') {
    const raw = JSON.parse(r[7] || '[]'); let addrs = [];
    if (withSig && raw[0] && raw[0].af) { try { addrs = JSON.parse(DriveApp.getFileById(raw[0].af).getBlob().getDataAsString()); } catch (e) { addrs = []; } }
    o.people = raw.map((p, i) => {
      const q = { name: p.name, team: p.team, note: p.note || '', qty: p.qty, at: p.at, signed: !!p.sig, serials: p.serials || [], who: p.who || '직원', idType:p.idType==='생년월일'?'생년월일':'주소', addr: addrs[i] || '' };
      if (withSig && p.sig) { try { const b = DriveApp.getFileById(p.sig).getBlob(); q.sigUrl = 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()); } catch (e) { q.sigUrl = ''; } }
      return q;
    });
  } else o.orgInfo = JSON.parse(r[7] || '{}');
  return o;
}
function getReceipt(id) { needOrg_(); return rcptObj_(findRcpt_(id), true); }
function signReceipt(id, idx, dataUrl,requestId) {
  return withMutation_('signReceipt',requestId,[id,idx,dataUrl],() => {
    const x = findRcpt_(id), ppl = JSON.parse(x.r[7] || '[]'), p = ppl[idx];
    if (!p) throw new Error('받는 사람을 찾을 수 없어요.');
    if (p.sig) throw new Error(p.name + '님은 이미 서명했어요.');
    const f = saveDataUrl_(dataUrl, ['서명', x.r[0]], x.r[0] + '_' + (idx + 1) + '.png');
    p.sig = f.getId(); p.at = today_();
    const sh = own_('RCPT');
    guardRows_(sh, [x.row]);
    sh.getRange(x.row, 8).setValue(JSON.stringify(ppl));
    if (ppl.every(q => q.sig)) sh.getRange(x.row, 6).setValue('완료');
    x.r[7] = JSON.stringify(ppl); if (ppl.every(q => q.sig)) x.r[5] = '완료';
    return rcptObj_(x, true);
  });
}
/** 화면에서 만든 수령증·인수증 HTML을 PDF로 저장 (연도/월 폴더) */
function saveReceiptPdf(id, html, version,requestId) {
 return withMutation_('saveReceiptPdf',requestId,[id,html,version],()=>{
  const x = findRcpt_(id);
  if(version!==receiptVersion_(x.r))throw Error('수령증 내용이 바뀌었어요. 다시 열고 PDF를 저장해주세요.');
  if (!isAdmin_() && x.r[5] !== '완료') throw new Error('서명이 다 끝나면 저장돼요.');
  const d = ymd_(x.r[3]) || today_();
  const kind = x.r[1] === '기관' ? '인수증' : '수령증';
  const blob = Utilities.newBlob(pdfColorHtml_(html), 'text/html', 'r.html').getAs('application/pdf').setName(kind + '_' + x.r[2] + '.pdf');
  const f = trackedFile_(folder_([kind, d.slice(0, 4), d.slice(5, 7)]),blob);
  if (x.r[1] === '팀' || x.r[1] === '상품권') { const sh = own_('RCPT'); guardRows_(sh, [x.row]); sh.getRange(x.row, 9).setValue(f.getId()); }
  if (x.r[1] === '상품권' && x.r[5] === '완료') { const p0 = JSON.parse(x.r[7] || '[]')[0]; if (p0 && p0.af) { try { DriveApp.getFileById(p0.af).setTrashed(true); } catch (e) {} } }
  return 'https://drive.google.com/file/d/' + f.getId() + '/view';

 });
}
function listVoucherGives() {
  needVouch_();
  const admin = isAdmin_(), me = me_();
  return ownRows_('RCPT').filter(x => x.r[1] === '상품권' && x.r[5] !== '취소' && (admin || String(x.r[4]).toLowerCase() === me)).slice(-30).reverse().map(x => {
    const o = rcptObj_(x, false); o.total = o.people.length; o.done = o.people.filter(p => p.signed).length; o.names = o.people.map(p => p.name).join(', '); delete o.people; return o; });
}
function listReceipts() {
  needAdmin_();
  return ownRows_('RCPT').slice(-80).reverse().map(x => {
    const o = rcptObj_(x, false);
    if (o.people) { o.total = o.people.length; o.done = o.people.filter(p => p.signed).length; o.names = o.people.map(p => p.name).join(', '); delete o.people; }
    o.url = ScriptApp.getService().getUrl() + '?r=' + o.id;
    return o;
  });
}

/* ───────── B. 가정 배분 (숫자만 기록) ───────── */
function requestHome(p,requestId) {
  return withMutation_('requestHome',requestId,[p],() => {
    const st = stockMap_(), keys = p.items.map(i => i.key), lots = pickLots_(st, keys);
    const need = {}; p.items.forEach(i => { need[i.key] = num_(i.qty); });
    if (!keys.some(k => need[k] > 0)) throw new Error('수량을 넣어 주세요.');
    checkStock_(lots, need);
    if (!str_(p.manager)) throw new Error('담당자 이름을 골라 주세요.');
    const id = 'H' + Utilities.formatDate(new Date(), APP.tz, 'yyMMddHHmmss') + Math.random().toString(36).slice(2, 5);
    const items = lots.map(l => ({ key: l.key, name: l.name, inDate: wIn_(l), unit: l.unit, qty: need[l.key] || 0 })).filter(i => i.qty > 0);
    const row = [id, ymd_(p.date) || today_(), str_(p.manager), me_(), num_(p.count), JSON.stringify(items), '확인 대기', '', '', '', '', ''];
    if (p.later) {
      // 나중에 서명받기: 명단은 min 드라이브의 잠긴 임시 파일에만 둠 (시트에는 안 씀)
      const people = (p.people || []).filter(x => str_(x.name));
      if (!people.length) throw new Error('받는 분 명단을 넣어 주세요.');
      const data = { id: id, date: row[1], manager: row[2], dateMode: p.dateMode === 'fill' ? 'fill' : 'blank',
        items: lots.filter(l => need[l.key] > 0).map(l => ({ key: l.key, name: l.name, inDate: l.inDate, donor: l.donor, inQty: l.inQty, give: need[l.key], remainAfter: l.remain - need[l.key] })),
        people: people.map(x => ({ name: str_(x.name), addr: str_(x.addr), idType:x.idType==='생년월일'?'생년월일':'주소', phone: digits_(x.phone), birth: birth6_(x.birth) || (x.idType === '생년월일' ? birth6_(x.addr) : ''), qty: x.qty || {}, sig: '', at: '' })) };
      const f = trackedFile_(folder_(['가정배분_임시명단']),id + '.json', JSON.stringify(data), 'application/json');
      row[9] = '서명 대기'; row[11] = f.getId();
    }
    appendOwn_('HOME', row);
    return id;
  });
}
function listHome() {
  needAdmin_();
  return ownRows_('HOME').slice(-60).reverse().map(x => ({ id: x.r[0], date: ymd_(x.r[1]), manager: x.r[2], by: x.r[3], count: x.r[4], items: JSON.parse(x.r[5] || '[]'), status: x.r[6], done: ymd_(x.r[7]), sign: x.r[9] }));
}
function confirmHome(id, ok,requestId) {
  needAdmin_();
  return withMutation_('confirmHome',requestId,[id,ok],() => {
    const x = ownRows_('HOME').find(y => y.r[0] === id);
    if (!x || x.r[6] !== '확인 대기') throw new Error('이미 처리됐어요.');
    const sh = own_('HOME');
    guardRows_(sh, [x.row]);
    if (!ok) {
      sh.getRange(x.row, 7, 1, 2).setValues([['취소', today_()]]);
      if (x.r[11]) { try { DriveApp.getFileById(x.r[11]).setTrashed(true); } catch (e) {} sh.getRange(x.row, 10, 1, 3).setValues([['취소', '', '']]); }
      return true;
    }
    const items = JSON.parse(x.r[5] || '[]'), date = ymd_(x.r[1]) || today_();
    const team = (staff_().find(s => s.name === x.r[2]) || {}).team || '';
    const no = date + '_' + items[0].name + (items.length > 1 ? ' 외 ' + (items.length - 1) : '');
    appendDist_(id, items.map(i => ({ no: no, date: date, name: i.name, label: i.name, person: x.r[2], team: team, addr: '가정 배분', qty: i.qty, inDate: i.inDate, note: '가정 배분 ' + x.r[4] + '명' })));
    sh.getRange(x.row, 7, 1, 2).setValues([['확인', today_()]]);
    return true;
  });
}

/* ───────── B-2. 가정 배분 나중에 서명받기 ───────── */
function homeAccess_(x) { return isAdmin_() || String(x.r[3]).toLowerCase() === me_(); }
function findHome_(id) {
  const x = ownRows_('HOME').find(y => y.r[0] === id);
  if (!x) throw new Error('명단을 찾을 수 없어요.');
  if (!homeAccess_(x)) throw new Error('만든 사람과 관리자만 볼 수 있어요.');
  return x;
}
function homeData_(x) {
  if (!x.r[11]) throw new Error('임시 명단이 없어요. 이미 끝났거나 취소됐어요.');
  const f = DriveApp.getFileById(x.r[11]);
  return { f: f, d: JSON.parse(f.getBlob().getDataAsString()) };
}
function listHomeSign() {
  needOrg_();
  const rows = ownRows_('HOME').filter(x => (x.r[9] === '서명 대기' || x.r[9] === '서명 완료') && homeAccess_(x)).reverse();
  return rows.slice(0, 30).map(x => {
    const o = { id: x.r[0], date: ymd_(x.r[1]), manager: x.r[2], count: x.r[4], state: x.r[9], items: JSON.parse(x.r[5] || '[]') };
    if (x.r[9] === '서명 대기') { try { const d = homeData_(x).d; o.done = d.people.filter(p => p.sig).length; o.total = d.people.length; } catch (e) { o.done = 0; o.total = x.r[4]; } }
    else if (isAdmin_() && x.r[10]) o.file = 'https://drive.google.com/file/d/' + x.r[10] + '/view';
    return o;
  });
}
function getHomeSign(id) {
  const x = findHome_(id), d = homeData_(x).d;
  return { id: d.id, date: d.date, manager: d.manager, dateMode: d.dateMode || 'blank', items: d.items, people: d.people.map(p => ({ name: p.name, addr: p.addr, idType:p.idType==='생년월일'?'생년월일':'주소', qty: p.qty, at: p.at, sigUrl: p.sig, phone: p.phone || '', linked: !!(p.tok && (!p.tokExp || Date.now() < p.tokExp)), via: p.via || '' })) };
}
function signHome(id, idx, dataUrl,requestId) {
  return withMutation_('signHome',requestId,[id,idx,dataUrl],() => {
    const x = findHome_(id), h = homeData_(x), p = h.d.people[idx];
    if (!p) throw new Error('받는 분을 찾을 수 없어요.');
    if (p.sig) throw new Error(p.name + '님은 이미 서명했어요.');
    p.sig = dataUrl; p.at = today_();
    h.f.setContent(JSON.stringify(h.d));
    return getHomeSign(id);
  });
}
/** 가정 서명 중 수량·명단 고치기 (서명 대기 상태에서만) */
function updateHomeSign(id, list,requestId) {
  return withMutation_('updateHomeSign',requestId,[id,list],() => {
    const x = findHome_(id), h = homeData_(x), d = h.d;
    if (x.r[9] !== '서명 대기') throw new Error('서명이 끝난 명단은 고칠 수 없어요.');
    const people = (list || []).filter(p => str_(p.name));
    if (!people.length) throw new Error('받는 분을 한 명 이상 넣어 주세요.');
    const need = {}; people.forEach(p => d.items.forEach(it => { need[it.key] = (need[it.key] || 0) + num_(p.qty && p.qty[it.key]); }));
    // 이미 이 명단이 가져간 수량(it.give)까지 더해서 가능한지 확인
    checkEditStock_(d.items, need);
    const oldItems = JSON.parse(x.r[5] || '[]');
    if(x.r[6]==='확인'&&oldItems.length)linkLegacyDist_(id,distNo_(ymd_(x.r[1]),oldItems));
    d.people = people.map(p => {
      const o = p.i >= 0 ? d.people[p.i] : null;
      const same = o && o.sig && str_(o.name)===str_(p.name) && str_(o.addr)===str_(p.addr) && (o.idType||'주소')===(p.idType||'주소') && d.items.every(it => num_(o.qty[it.key]) === num_(p.qty && p.qty[it.key]));
      return { name: str_(p.name), addr: str_(p.addr), idType:p.idType==='생년월일'?'생년월일':'주소', phone: p.phone !== undefined ? digits_(p.phone) : (o ? o.phone || '' : ''), birth: (o && o.birth && str_(o.addr) === str_(p.addr)) ? o.birth : (p.idType === '생년월일' ? birth6_(p.addr) : (o ? o.birth || '' : '')), tok: o ? o.tok || '' : '', qty: p.qty || {}, sig: same ? o.sig : '', at: same ? o.at : '' };
    });
    d.items.forEach(it => { it.give = need[it.key] || 0; });
    h.f.setContent(JSON.stringify(d));
    const items = d.items.map(it => ({ key: it.key, name: it.name, inDate: it.inDate, unit: (oldItems.find(o => o.key === it.key) || {}).unit || '', qty: it.give }));
    own_('HOME').getRange(x.row, 5, 1, 2).setValues([[people.length, JSON.stringify(items.filter(i => i.qty > 0))]]);
    // min이 이미 확인해서 배분 기록에 들어간 경우엔 그 줄도 같이 고침
    if (x.r[6] === '확인' && oldItems.length) {
      const no = ymd_(x.r[1]) + '_' + oldItems[0].name + (oldItems.length > 1 ? ' 외 ' + (oldItems.length - 1) : '');
      syncDist_(no, oldItems.map(i => ({ person: x.r[2], name: i.name,inDate:i.inDate })),
        items.map(i => ({ no: no, date: ymd_(x.r[1]), name: i.name, label: i.name, person: x.r[2], addr: '가정 배분', qty: i.qty, inDate: i.inDate, note: '가정 배분 ' + people.length + '명' })),null,id);
    }
    return getHomeSign(id);
  });
}
/** 종이로 뽑아 간 가정 배분: 인원·총 수량만 고치기 (명단은 저장돼 있지 않음) */
function updateHomeTotals(id, p,requestId) {
  needAdmin_();
  return withMutation_('updateHomeTotals',requestId,[id,p],() => {
    const x = ownRows_('HOME').find(y => y.r[0] === id);
    if (!x) throw new Error('찾을 수 없어요.');
    if (x.r[6] === '취소') throw new Error('취소된 요청이에요.');
    if (x.r[9]) throw new Error('폰으로 서명받는 명단은 「가정 서명」 화면에서 고쳐 주세요.');
    const oldItems = JSON.parse(x.r[5] || '[]'), need = {};
    (p.items || []).forEach(i => { need[i.key] = num_(i.qty); });
    checkEditStock_(oldItems.map(i => ({ key: i.key, name: i.name, give: i.qty })), need);
    if(x.r[6]==='확인'&&oldItems.length)linkLegacyDist_(id,distNo_(ymd_(x.r[1]),oldItems));
    const count = num_(p.count) || num_(x.r[4]);
    const items = oldItems.map(i => Object.assign({}, i, { qty: need[i.key] || 0 }));
    own_('HOME').getRange(x.row, 5, 1, 2).setValues([[count, JSON.stringify(items.filter(i => i.qty > 0))]]);
    if (x.r[6] === '확인') {
      const no = ymd_(x.r[1]) + '_' + oldItems[0].name + (oldItems.length > 1 ? ' 외 ' + (oldItems.length - 1) : '');
      syncDist_(no, oldItems.map(i => ({ person: x.r[2], name: i.name,inDate:i.inDate })),
        items.map(i => ({ no: no, date: ymd_(x.r[1]), name: i.name, label: i.name, person: x.r[2], addr: '가정 배분', qty: i.qty, inDate: i.inDate, note: '가정 배분 ' + count + '명' })),null,id);
    }
    return true;
  });
}
/** 서명 마치기: 수령증 PDF를 보관하고 임시 명단은 지움 */
function finishHome(id, html,requestId) {
  return withMutation_('finishHome',requestId,[id,html],() => {
    const x = findHome_(id), h = homeData_(x), d = h.d;
    const blob = Utilities.newBlob(pdfColorHtml_(html), 'text/html', 'r.html').getAs('application/pdf').setName('가정배분 수령증_' + d.date + '_' + d.manager + '.pdf');
    const pdf = trackedFile_(folder_(['가정배분 수령증', d.date.slice(0, 4), d.date.slice(5, 7)]),blob);
    const sh = own_('HOME'); guardRows_(sh, [x.row]);
    sh.getRange(x.row, 10, 1, 3).setValues([['서명 완료', pdf.getId(), '']]);
    d.people.forEach(p => { if (p.tok) props_().deleteProperty('TOK_' + p.tok); });
    h.f.setTrashed(true);
    return true;
  });
}

/* ───────── C. 유관기관 인수증 ───────── */
function listOrgs() { needAdmin_(); return ownRows_('ORG').map(x => ({ name: x.r[0], ceo: x.r[1], addr: x.r[2], tel: x.r[3], contact: x.r[4] })).filter(o => o.name); }
function saveOrg_(o) {
  const sh = own_('ORG'), x = ownRows_('ORG').find(y => y.r[0] === o.name);
  const row = [o.name, o.ceo || '', o.addr || '', o.tel || '', o.contact || '', ''];
  if (x) { guardRows_(sh, [x.row]); sh.getRange(x.row, 1, 1, 6).setValues([row]); } else { guardTail_(sh); sh.appendRow(row); }
}
function createOrgReceipt(p,requestId) {
  needAdmin_();
  return withMutation_('createOrgReceipt',requestId,[p],() => {
    const org = p.org || {}; if (!str_(org.name)) throw new Error('기관명을 넣어 주세요.');
    saveOrg_(org);
    const st = stockMap_(), keys = p.items.map(i => i.key), lots = pickLots_(st, keys);
    const need = {}; p.items.forEach(i => { need[i.key] = num_(i.qty); });
    if (!keys.some(k => need[k] > 0)) throw new Error('수량을 넣어 주세요.');
    checkStock_(lots, need);
    const id=newRecordId_('O'),date = ymd_(p.date) || today_(), no = distNo_(date, lots,id);
    appendDist_(id, lots.filter(l => need[l.key] > 0).map(l => ({ no: no, date: date, name: l.name, label: l.name, person: org.name, team: '유관기관', addr: org.addr || org.name, qty: need[l.key], inDate: wIn_(l), note: str_(p.note) })));

    const units = {}; p.items.forEach(i => { units[i.key] = i.unit; });
    const items = lots.filter(l => need[l.key] > 0).map(l => ({ key: l.key, name: l.name, inDate: l.inDate, unit: str_(units[l.key]) || l.unit || '개', give: need[l.key] }));
    appendOwn_('RCPT', [id, '기관', no, date, me_(), '회수 대기', JSON.stringify(items), JSON.stringify(org), '', str_(p.note), new Date()]);
    return rcptObj_(findRcpt_(id), false);
  });
}
function markOrgReturned(id, scan,requestId) {
  needAdmin_();
 return withMutation_('markOrgReturned',requestId,[id,scan],()=>{
  const x = findRcpt_(id), sh = own_('RCPT');
  guardRows_(sh, [x.row]);
  if (scan && scan.dataUrl) {
    const d = ymd_(x.r[3]) || today_();
    const f = saveDataUrl_(scan.dataUrl, ['인수증', d.slice(0, 4), d.slice(5, 7)], '인수증_직인_' + x.r[2] + '_' + (scan.name || 'scan'));
    sh.getRange(x.row, 9).setValue(f.getId());
  }
  sh.getRange(x.row, 6).setValue('회수 완료');
  return true;

 });
}


/* ───────── 수령증·인수증 내용 고치기 ───────── */
/** 배분 기록에서 이 수령증 줄(배분번호 + 수령인 + 품목)을 찾아 고치고, 없어진 줄은 지우고, 새 줄은 더함 */
function syncDist_(no,oldPairs,rows,rename,recordId){
 if(!recordId)throw Error('배분 기록 연결번호가 없어요. 새로고침해주세요.');
 linkLegacyDist_(recordId,no);const m=mapOrThrow_('DIST'),sh=sheet_('DIST'),auto=autoCols_(sh,m.headerRow),cand=readSheet_('DIST').filter(r=>str_(r.recordId)===recordId&&oldPairs.some(p=>p.person===str_(r.person)&&p.name===str_(r.name)&&(!p.inDate||incomingDate_(r)===p.inDate))),keep=new Set(),add=[],w=cellWriter_(sh,auto);
 for(const o of rows){if(!(o.qty>0))continue;const before=(rename&&rename[o.person])||o.person;
  const hit=cand.find(r=>!keep.has(r._row)&&str_(r.name)===o.name&&str_(r.person)===before&&(!o.inDate||incomingDate_(r)===o.inDate));if(!hit){add.push(o);continue;}keep.add(hit._row);
  const data=Object.assign({},o);if(o.inDate&&(!m.cols.inDate||auto[m.cols.inDate]))data.note=((o.note||'')+' (입고 '+o.inDate+')').trim();
  ['date','person','team','addr','qty','note'].forEach(f=>{if(data[f]!==undefined)w.set(hit._row,m.cols[f],f==='date'?toDate_(data[f]):data[f]);});
 }
 w.flush(); // 줄을 지우기 전에 고친 칸부터 한 번에 씀
 cand.filter(r=>!keep.has(r._row)).map(r=>r._row).sort((a,b)=>b-a).forEach(row=>sh.deleteRow(row));if(add.length)appendDist_(recordId,add);
}
/** 수정할 때 쓸 수 있는 수량 = 지금 남은 수량 + 이 수령증이 이미 가져간 수량 */
function checkEditStock_(items, need) {
  const st = stockMap_();
  items.forEach(it => {
    const l = st[it.key]; if (!l) return;
    const can = l.remain + num_(it.give);
    if ((need[it.key] || 0) > can) throw new Error('「' + it.name + '」는 최대 ' + can + '개까지 가능해요.');
    it.remainAfter = can - (need[it.key] || 0);
  });
}
function updateTeamReceipt(id, p,requestId) {
  needAdmin_();
  return withMutation_('updateTeamReceipt',requestId,[id,p],() => {
    const x = findRcpt_(id); if (x.r[1] !== '팀') throw new Error('팀 수령증이 아니에요.');
    const items = JSON.parse(x.r[6] || '[]'), old = JSON.parse(x.r[7] || '[]');
    const people = (p.people || []).filter(q => str_(q.name));
    if (!people.length) throw new Error('받는 사람을 한 명 이상 넣어 주세요.');
    const need = {}; people.forEach(q => items.forEach(it => { need[it.key] = (need[it.key] || 0) + num_(q.qty[it.key]); }));
    checkEditStock_(items, need);
    const date = ymd_(p.date) || ymd_(x.r[3]);
    // 수량이 바뀐 사람은 서명을 다시 받아야 함
    const ppl = people.map(q => {
      const o = old.find(y => y.name === q.from) || old.find(y => y.name === q.name) || {};
      const same = o.sig && str_(o.name)===str_(q.name) && str_(o.team)===str_(q.team) && (ymd_(p.date)||ymd_(x.r[3]))===ymd_(x.r[3]) && items.every(it => num_(o.qty && o.qty[it.key]) === num_(q.qty[it.key]));
      return { name: str_(q.name), team: str_(q.team), note: str_(q.note), qty: q.qty, sig: same ? o.sig : '', at: same ? o.at : '' };
    });
    const rename = {}; people.forEach(q => { if (q.from && q.from !== q.name) rename[q.name] = q.from; });
    const oldPairs = []; old.forEach(o => items.forEach(it => oldPairs.push({ person: o.name, name: it.name,inDate:it.inDate })));
    const rows = []; ppl.forEach(q => items.forEach(it => rows.push({ no: x.r[2], date: date, name: it.name, label: it.name, person: q.name, team: q.team, addr: APP.org, qty: num_(q.qty[it.key]), inDate: it.inDate, note: str_(q.note) || str_(p.note) })));
    syncDist_(x.r[2], oldPairs, rows, rename,id);
    items.forEach(it => { it.give = need[it.key] || 0; });
    const done = ppl.every(q => q.sig);
    own_('RCPT').getRange(x.row, 4, 1, 7).setValues([[date, x.r[4], done ? '완료' : '서명 대기', JSON.stringify(items), JSON.stringify(ppl), '', str_(p.note)]]);
    return getReceipt(id);
  });
}
function updateOrgReceipt(id, p,requestId) {
  needAdmin_();
  return withMutation_('updateOrgReceipt',requestId,[id,p],() => {
    const x = findRcpt_(id); if (x.r[1] !== '기관') throw new Error('인수증이 아니에요.');
    const items = JSON.parse(x.r[6] || '[]'), oldOrg = JSON.parse(x.r[7] || '{}'), org = p.org || {};
    if (!str_(org.name)) throw new Error('기관명을 넣어 주세요.');
    const need = {}; (p.items || []).forEach(i => { need[i.key] = num_(i.qty); });
    checkEditStock_(items, need);
    const date = ymd_(p.date) || ymd_(x.r[3]);
    const rename = {}; if (org.name !== oldOrg.name) rename[org.name] = oldOrg.name;
    syncDist_(x.r[2], items.map(it => ({ person: oldOrg.name, name: it.name,inDate:it.inDate })),
      items.map(it => ({ no: x.r[2], date: date, name: it.name, label: it.name, person: org.name, team: '유관기관', addr: org.addr || org.name, qty: need[it.key] || 0, inDate: it.inDate, note: str_(p.note) })), rename,id);
    const printedChanged=['name','ceo','addr','tel','contact'].some(k=>str_(oldOrg[k])!==str_(org[k])) || date!==ymd_(x.r[3]) || str_(p.note)!==str_(x.r[9]) || items.some(it=>num_(need[it.key])!==num_(it.give)||(p.items||[]).some(i=>i.key===it.key&&str_(i.unit||it.unit)!==str_(it.unit)));
    const units = {}; (p.items || []).forEach(i => { units[i.key] = i.unit; });
    const kept = items.map(it => Object.assign(it, { give: need[it.key] || 0, unit: str_(units[it.key]) || it.unit })).filter(it => it.give > 0);
    saveOrg_(org);
    own_('RCPT').getRange(x.row, 4, 1, 7).setValues([[date, x.r[4], printedChanged?'회수 대기':x.r[5], JSON.stringify(kept), JSON.stringify(org), printedChanged?'':x.r[8], str_(p.note)]]);
    return rcptObj_(findRcpt_(id), false);
  });
}

/* ───────── D. 폐기 ───────── */
/** 폐기 등록: 품목 여러 개를 한 번에 (같은 날짜·사유·사진) */
function dispose(p,requestId) {
  needAdmin_();
  return withMutation_('dispose',requestId,[p],() => {
    const id=newRecordId_('D');
    const list = p.items || (p.key ? [{ key: p.key, qty: p.qty }] : []);
    const st = stockMap_(), date = ymd_(p.date) || today_();
    const items = list.filter(i => num_(i.qty) > 0).map(i => {
      const l = st[i.key]; if (!l) throw new Error('물품을 찾을 수 없어요.');
      if (num_(i.qty) > l.remain) throw new Error('「' + l.name + '」 남은 수량(' + l.remain + ')보다 많아요.');
      return { key: l.key, name: l.name, inDate: l.inDate, donor: l.donor, unit: l.unit || '개', inQty: l.inQty, given: l.out, qty: num_(i.qty) };
    });
    if (!items.length) throw new Error('폐기할 물품과 수량을 넣어 주세요.');
    let photoId = '', link = '';
    if (p.photo && p.photo.dataUrl) { const f = saveDataUrl_(p.photo.dataUrl, ['폐기사진', date.slice(0, 4)], date + '_' + items[0].name + '_' + (p.photo.name || 'photo.jpg')); photoId = f.getId(); link = f.getUrl(); }
    appendRows_('DISP', items.map(it => Object.assign(dispRow_(it, date, p.reason, link),{recordId:id})));

    appendOwn_('DLOG', [id, date, JSON.stringify(items), str_(p.reason), photoId, me_(), new Date()]);
    return getDisposal(id);
  });
}
function dispRow_(it, date, reason, link) {
  return { date: date, name: it.name, inDate: it.inDate, donor: it.donor, total: it.inQty, given: it.given, u1: it.unit, u2: it.unit, u3: it.unit, qty: it.qty, reason: str_(reason), photo: link };
}
function findDlog_(id) { const x = ownRows_('DLOG').find(y => y.r[0] === id); if (!x) throw new Error('폐기 기록을 찾을 수 없어요.'); return x; }
function listDisposals() {
  needAdmin_();
  return ownRows_('DLOG').slice(-50).reverse().map(x => ({ id: x.r[0], date: ymd_(x.r[1]), items: JSON.parse(x.r[2] || '[]').map(i => ({ name: i.name, qty: i.qty, unit: i.unit })), reason: x.r[3] }));
}
function getDisposal(id) {
  needAdmin_();
  const x = findDlog_(id), o = { id: x.r[0], date: ymd_(x.r[1]), items: JSON.parse(x.r[2] || '[]'), reason: x.r[3], photo: '' };
  if (x.r[4]) { try { const b = DriveApp.getFileById(x.r[4]).getBlob(); o.photo = 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()); } catch (e) {} }
  return o;
}
/** 폐기 고치기: 날짜·사유·수량·사진. 폐기 목록 줄도 같이 고침 */
function updateDisposal(id, p,requestId) {
  needAdmin_();
  return withMutation_('updateDisposal',requestId,[id,p],() => {
    linkLegacyDisposal_(id);
    const x = findDlog_(id), old = JSON.parse(x.r[2] || '[]'), oldDate = ymd_(x.r[1]);
    const date = ymd_(p.date) || oldDate, need = {};
    (p.items || []).forEach(i => { need[i.key] = num_(i.qty); });
    const st = stockMap_();
    old.forEach(it => { const l = st[it.key], can = (l ? l.remain : 0) + num_(it.qty); if ((need[it.key] || 0) > can) throw new Error('「' + it.name + '」는 최대 ' + can + '개까지 가능해요.'); });
    let photoId = x.r[4], link = '';
    if (p.photo && p.photo.dataUrl) { const f = saveDataUrl_(p.photo.dataUrl, ['폐기사진', date.slice(0, 4)], date + '_' + old[0].name + '_' + (p.photo.name || 'photo.jpg')); photoId = f.getId(); link = f.getUrl(); }
    else if (photoId) { try { link = DriveApp.getFileById(photoId).getUrl(); } catch (e) {} }
    // 폐기 목록에서 이 기록의 줄 찾기: 품목 + 입고일 + 폐기일 + 수량이 같은 줄
    const m = mapOrThrow_('DISP'), sh = sheet_('DISP'), auto = autoCols_(sh, m.headerRow), rows = readSheet_('DISP'), used = {}, del = [], add = [];
    const items = old.map(it => Object.assign({}, it, { qty: need[it.key] || 0 }));
    old.forEach((it, n) => {
      const hit = rows.find(r => str_(r.recordId)===id && !used[r._row] && str_(r.name) === it.name && (!m.cols.inDate || ymd_(r.inDate) === it.inDate) && (!m.cols.date || ymd_(r.date) === oldDate) && num_(r.qty) === num_(it.qty));
      const nw = items[n];
      if (!hit) { if (nw.qty > 0) add.push(dispRow_(nw, date, p.reason, link)); return; }
      used[hit._row] = 1;
      if (!(nw.qty > 0)) { del.push(hit._row); return; }
      const o = dispRow_(nw, date, p.reason, link);
      ['date', 'qty', 'reason', 'photo'].forEach(f => { const c = m.cols[f]; if (!c || auto[c] || o[f] === '' && f === 'photo') return; sh.getRange(hit._row, c).setValue(f === 'date' ? toDate_(o[f]) : o[f]); });
    });
    del.sort((a, b) => b - a).forEach(r => sh.deleteRow(r));
    if (add.length) appendRows_('DISP', add.map(o=>Object.assign({},o,{recordId:id})));
    own_('DLOG').getRange(x.row, 2, 1, 4).setValues([[date, JSON.stringify(items.filter(i => i.qty > 0)), str_(p.reason), photoId]]);
    return getDisposal(id);
  });
}


/* ───────── E. 상품권 (일련번호 관리대장) ───────── */
function vouchers_() {
  if (!map_('VOUCH')) return [];
  return readSheet_('VOUCH').filter(r => str_(r.serial)).map(r => ({ row: r._row, no: num_(r.no), serial: str_(r.serial), kind: str_(r.kind), face: num_(r.face),
    inDate: ymd_(r.inDate), src: str_(r.src), target: str_(r.target), outDate: ymd_(r.outDate), purpose: str_(r.purpose), person: str_(r.person), check: str_(r.check), outBy: str_(r.outBy), status: str_(r.status) || '보유' }));
}
const vGroup_ = v => v.kind + '|' + v.face + '|' + v.inDate;
function getVouchers() {
  needVouch_();
  if (!map_('VOUCH')) return { ready: false };
  const all = vouchers_(), held = all.filter(v => v.status === '보유'), sum = {};
  all.forEach(v => { const s = sum[v.kind] || (sum[v.kind] = { kind: v.kind, held: 0, heldAmt: 0, out: 0, outAmt: 0 });
    if (v.status === '보유') { s.held++; s.heldAmt += v.face; } else if (v.status === '지급완료') { s.out++; s.outAmt += v.face; } });
  return { ready: true, held: held, summary: Object.keys(sum).map(k => sum[k]), kinds: Object.keys(sum), srcs: [...new Set(all.map(v => v.src).filter(Boolean))] };
}
/** 입고: 상품권에 찍힌 일련번호를 그대로 붙여넣어 한 번에 등록 */
function addVouchers(p,requestId) {
  needAdmin_();
  return withMutation_('addVouchers',requestId,[p],() => {
    const serials = [...new Set((p.serials || []).map(x => String(x).replace(/\s/g, '')).filter(Boolean))];
    if (!serials.length) throw new Error('일련번호를 넣어 주세요.');
    if (!str_(p.kind) || !num_(p.face)) throw new Error('상품권 종류와 면액을 넣어 주세요.');
    const all = vouchers_(), have = {}; all.forEach(v => { have[v.serial] = 1; });
    const dup = serials.filter(x => have[x]);
    if (dup.length) throw new Error('이미 대장에 있는 번호예요: ' + dup.slice(0, 5).join(', ') + (dup.length > 5 ? ' 외 ' + (dup.length - 5) + '개' : ''));
    let no = all.reduce((mx, v) => Math.max(mx, v.no), 0);
    appendRows_('VOUCH', serials.map(x => ({ no: ++no, serial: "'" + x, kind: str_(p.kind), face: num_(p.face), inDate: ymd_(p.inDate) || today_(), src: str_(p.src), inBy: str_(p.inBy), target: str_(p.target), status: '보유' })));
    return serials.length;
  });
}
/** 지급: 고른 일련번호를 받는 사람별로 나눠 대장에 기록 + (연결한 후원품이 있으면) 배분 기록 + 수령증 */
function giveVouchers(p,requestId) {
  needVouch_();
  return withMutation_('giveVouchers',requestId,[p],() => {
    const m = mapOrThrow_('VOUCH'), sh = sheet_('VOUCH'), auto = autoCols_(sh, m.headerRow);
    const all = vouchers_(), bySerial = {}; all.forEach(v => { bySerial[v.serial] = v; });
    const people = (p.people || []).filter(x => str_(x.name) && (x.serials || []).length);
    if (!people.length) throw new Error('받는 사람과 상품권을 정해 주세요.');
    const date = ymd_(p.date) || today_(), groups = {}, order = [];
    people.forEach(x => x.serials.forEach(sr => {
      const v = bySerial[sr]; if (!v) throw new Error('대장에 없는 번호예요: ' + sr);
      if (v.status !== '보유') throw new Error(sr + ' 는 이미 ' + v.status + ' 상태예요.');
      const g = vGroup_(v); if (!groups[g]) { groups[g] = { key: g, kind: v.kind, face: v.face, inDate: v.inDate, src: v.src }; order.push(g); }
    }));
    // 연결한 후원품 재고 확인
    const link = p.link || {}, st = stockMap_(), need = {};
    people.forEach(x => x.serials.forEach(sr => { const l = link[vGroup_(bySerial[sr])]; if (l) need[l] = (need[l] || 0) + 1; }));
    Object.keys(need).forEach(k => { const l = st[k]; if (!l) throw new Error('연결한 후원품을 찾을 수 없어요.'); if (need[k] > l.remain) throw new Error('후원품 「' + l.name + '」 남은 수량(' + l.remain + ')보다 많아요. 후원품 기록이 맞지 않으면 「연결 안 함」으로 해 주세요.'); });
    // 관리대장 기록
    const w = cellWriter_(sh, auto), set = (row, f, val) => w.set(row, m.cols[f], f === 'outDate' ? toDate_(val) : val);
    people.forEach(x => x.serials.forEach(sr => { const row = bySerial[sr].row;
      set(row, 'outDate', date); set(row, 'purpose', str_(p.purpose)); set(row, 'person', str_(x.name)); set(row, 'check', str_(p.check) || '수령증 확인');
      set(row, 'status', '지급완료'); set(row, 'outBy', str_(p.outBy)); if (str_(p.note)) set(row, 'note', str_(p.note)); }));
    w.flush(); // 칸마다 따로 쓰지 않고 모아서 한 번에
    // 배분 기록 (연결한 후원품만)
    const id=newRecordId_('V'),no = date + '_' + groups[order[0]].kind + (order.length > 1 ? ' 외 ' + (order.length - 1) : '')+'_'+id.slice(-6);
    const dist = [];
    people.forEach(x => order.forEach(g => { const l = link[g] && st[link[g]]; if (!l) return;
      const q = x.serials.filter(sr => vGroup_(bySerial[sr]) === g).length;
      if (q > 0) dist.push({ no: no, date: date, name: l.name, label: l.name, person: str_(x.name), team: x.type === '당사자' ? '' : str_(x.team), addr: x.type === '당사자' ? '가정 지급' : APP.org, qty: q, inDate: l.inDate, note: str_(p.purpose) }); }));
    if (dist.length) appendDist_(id, dist);
    // 수령증
    const heldCnt = {}; all.forEach(v => { if (v.status === '보유') heldCnt[vGroup_(v)] = (heldCnt[vGroup_(v)] || 0) + 1; });
    const give = {}; people.forEach(x => x.serials.forEach(sr => { const g = vGroup_(bySerial[sr]); give[g] = (give[g] || 0) + 1; }));
    const items = order.map(g => ({ key: g, name: groups[g].kind + ' ' + groups[g].face.toLocaleString() + '원', inDate: groups[g].inDate, donor: groups[g].src, give: give[g], remainAfter: heldCnt[g] - give[g], link: link[g] || '' }));

    // 당사자 주소는 시트에 쓰지 않고 잠긴 드라이브 파일에만 (수령증 PDF가 보관되면 지움)
    const addrs = people.map(x => x.type === '당사자' ? str_(x.addr) : '');
    const af = addrs.some(Boolean) ? trackedFile_(folder_(['상품권_수령자주소']),id + '.json', JSON.stringify(addrs), 'application/json').getId() : '';
    const ppl = people.map(x => { const q = {}; order.forEach(g => { q[g] = x.serials.filter(sr => vGroup_(bySerial[sr]) === g).length; });
      return { name: str_(x.name), team: x.type === '당사자' ? '' : str_(x.team), who: x.type === '당사자' ? '당사자' : '직원', idType:x.idType==='생년월일'?'생년월일':'주소', qty: q, serials: x.serials, sig: '', at: '', af: af }; });
    appendOwn_('RCPT', [id, '상품권', no, date, me_(), '서명 대기', JSON.stringify(items), JSON.stringify(ppl), '', str_(p.purpose), new Date()]);
    return id;
  });
}
/** 상품권 지급 고치기 (서명 받는 중): 이름·소속·주소 바꾸기, 일부 상품권 돌려놓기, 사람 빼기 */
function updateVoucherGive(id, list,requestId) {
  needVouch_();
  return withMutation_('updateVoucherGive',requestId,[id,list],() => {
    const x = findRcpt_(id); if (x.r[1] !== '상품권') throw new Error('상품권 지급 기록이 아니에요.');
    if (!isAdmin_() && String(x.r[4]).toLowerCase() !== me_()) throw new Error('본인이 지급한 것만 고칠 수 있어요.');
    if (x.r[5] === '취소') throw new Error('취소된 지급이에요.');
    const items = JSON.parse(x.r[6] || '[]'), old = JSON.parse(x.r[7] || '[]');
    const m = mapOrThrow_('VOUCH'), sh = sheet_('VOUCH'), auto = autoCols_(sh, m.headerRow), bySerial = {};
    vouchers_().forEach(v => { bySerial[v.serial] = v; });
    const w = cellWriter_(sh, auto), set = (row, f, val) => w.set(row, m.cols[f], val);
    let af = old[0] && old[0].af,oldAddrs=[];if(af){oldAddrs=JSON.parse(DriveApp.getFileById(af).getBlob().getDataAsString());}
    const nu = (list || []).map(q => {
      const o = old[q.i]; if (!o) return null;
      const keep = (q.serials || []).filter(sr => o.serials.indexOf(sr) >= 0 || (bySerial[sr] && bySerial[sr].status === '보유' && items.some(it => it.key === vGroup_(bySerial[sr])))), name = str_(q.name) || o.name;
      const changed = !sameSerials_(keep,o.serials) || name !== o.name || str_(q.team)!==str_(o.team) || (o.who==='당사자'&&(str_(q.addr)!==str_(oldAddrs[q.i])||(o.idType||'주소')!==(q.idType||'주소')));
      const qty = {}; items.forEach(it => { qty[it.key] = keep.filter(sr => bySerial[sr] && vGroup_(bySerial[sr]) === it.key).length; });
      return { name: name, team: o.who === '당사자' ? '' : str_(q.team), who: o.who || '직원', idType:q.idType==='생년월일'?'생년월일':'주소', qty: qty, serials: keep, sig: changed ? '' : o.sig, at: changed ? '' : o.at, af: af, addr: o.who === '당사자' ? str_(q.addr) : '', from: o.name };
    }).filter(p => p && p.serials.length);
    if (!nu.length) throw new Error('모두 돌려놓으려면 「지급 취소」를 써 주세요.');
    // 관리대장: 돌려놓은 상품권은 '보유'로, 이름이 바뀐 사람은 수령자 고침
    const kept = {}; nu.forEach(p => p.serials.forEach(sr => { kept[sr] = p; }));
    const ref = old.reduce((a, o) => a || (o.serials[0] && bySerial[o.serials[0]]), null) || {};
    nu.forEach(p => p.serials.forEach(sr => { const v = bySerial[sr]; if (!v || v.status !== '보유') return;
      set(v.row, 'outDate', toDate_(ymd_(x.r[3]))); set(v.row, 'purpose', str_(x.r[9])); set(v.row, 'person', p.name);
      set(v.row, 'check', ref.check || '수령증 확인'); set(v.row, 'status', '지급완료'); set(v.row, 'outBy', ref.outBy || ''); }));
    old.forEach(o => o.serials.forEach(sr => { const v = bySerial[sr]; if (!v) return;
      if (!kept[sr]) { ['outDate', 'purpose', 'person', 'check', 'outBy'].forEach(f => set(v.row, f, '')); set(v.row, 'status', '보유'); }
      else if (kept[sr].name !== o.name) set(v.row, 'person', kept[sr].name); }));
    w.flush();
    // 배분 기록 (연결한 후원품)
    const st = stockMap_(), rename = {}; nu.forEach(p => { if (p.name !== p.from) rename[p.name] = p.from; });
    const oldPairs=[],distRows=[];
    items.forEach(it=>{if(!it.link)return;const l=st[it.link];if(!l)throw Error('연결한 후원품이 없어 수정할 수 없어요. 재고 기록을 확인해주세요.');
      old.forEach(o=>oldPairs.push({person:o.name,name:l.name,inDate:l.inDate}));
      nu.forEach(p=>distRows.push({no:x.r[2],date:ymd_(x.r[3]),name:l.name,label:l.name,person:p.name,team:p.team,addr:p.who==='당사자'?'가정 지급':APP.org,qty:p.qty[it.key],inDate:l.inDate,note:str_(x.r[9])}));
    });
    if(oldPairs.length)syncDist_(x.r[2],oldPairs,distRows,rename,id);
    // 당사자 주소 (시트 밖 파일)
    if(!af&&nu.some(p=>p.addr)){af=trackedFile_(folder_(['상품권_수령자주소']),id+'.json',JSON.stringify(nu.map(p=>p.addr)),'application/json').getId();nu.forEach(p=>p.af=af);}
    if(af)DriveApp.getFileById(af).setTrashed(false).setContent(JSON.stringify(nu.map(p=>p.addr)));
    items.forEach(it => { const g = nu.reduce((a, p) => a + (p.qty[it.key] || 0), 0); it.remainAfter = num_(it.remainAfter) + num_(it.give) - g; it.give = g; });
    const ppl = nu.map(p => ({ name: p.name, team: p.team, who: p.who, idType:p.idType||'주소', qty: p.qty, serials: p.serials, sig: p.sig, at: p.at, af: p.af }));
    own_('RCPT').getRange(x.row, 6, 1, 4).setValues([[ppl.every(p => p.sig) ? '완료' : '서명 대기', JSON.stringify(items), JSON.stringify(ppl), '']]);
    return getReceipt(id);
  });
}
/** 지급 취소: 상품권을 다시 '보유'로 돌리고, 배분 기록 줄도 지움 */
function cancelVoucherGive(id,requestId) {
  needVouch_();
  return withMutation_('cancelVoucherGive',requestId,[id],() => {
    const x = findRcpt_(id); if (x.r[1] !== '상품권') throw new Error('상품권 지급 기록이 아니에요.');
    if (!isAdmin_() && String(x.r[4]).toLowerCase() !== me_()) throw new Error('본인이 지급한 것만 취소할 수 있어요.');
    if (x.r[5] === '취소') throw new Error('이미 취소했어요.');
    const items = JSON.parse(x.r[6] || '[]'), ppl = JSON.parse(x.r[7] || '[]');
    const m = mapOrThrow_('VOUCH'), sh = sheet_('VOUCH'), auto = autoCols_(sh, m.headerRow), bySerial = {};
    vouchers_().forEach(v => { bySerial[v.serial] = v; });
    const w = cellWriter_(sh, auto);
    ppl.forEach(p => (p.serials || []).forEach(sr => { const v = bySerial[sr]; if (!v) return;
      ['outDate', 'purpose', 'person', 'check', 'outBy'].forEach(f => w.set(v.row, m.cols[f], ''));
      w.set(v.row, m.cols.status, '보유'); }));
    w.flush();
    const st = stockMap_(), pairs = [], rows = [];
    items.forEach(it => { const l = it.link && st[it.link]; if (!l) return; ppl.forEach(p => { pairs.push({ person: p.name, name: l.name,inDate:l.inDate }); rows.push({ name: l.name, person: p.name, qty: 0 }); }); });
    if (pairs.length) syncDist_(x.r[2], pairs, rows,null,id);
    own_('RCPT').getRange(x.row, 6).setValue('취소');
    return true;
  });
}



/* ───────── F. 이용인 명단 / 문자 링크로 원격 서명 ───────── */
const digits_ = v => String(v == null ? '' : v).replace(/\D/g, '');
function birth6_(v) {
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, APP.tz, 'yyMMdd');
  const d = digits_(v); return d.length === 8 ? d.slice(2) : d.length === 6 ? d : '';
}
function birthShow_(v) {
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, APP.tz, 'yyyy.MM.dd');
  const d = digits_(v); return d.length === 8 ? d.slice(0, 4) + '.' + d.slice(4, 6) + '.' + d.slice(6) : str_(v);
}
/** 숨기거나 잠근 탭이어도 앱(min 권한)이 읽어 옴. 캐시에 남기지 않음 */
function getFamilies() {
  needOrg_();
  if (!canFam_()) throw new Error('이용인 명단 권한이 없어요. 관리자에게 요청해 주세요.');
  if (!map_('FAM')) throw new Error('설정 탭에서 「이용인 명단」 칸을 먼저 확인해 주세요.');
  return readSheet_('FAM').filter(r => str_(r.name)).map(r => ({ name: str_(r.name), birth: birthShow_(r.birth), birth6: birth6_(r.birth), addr: str_(r.addr), phone: digits_(r.phone), manager: str_(r.manager) }));
}
function savePublicUrl(url) {
  needAdmin_();
  const u = str_(url);
  if (u && !/^https:\/\/script\.google\.com\/.+\/exec$/.test(u)) throw new Error('「…/exec」로 끝나는 웹 앱 주소를 넣어 주세요.');
  props_().setProperty('PUBLIC_URL', u); return u;
}
const SIGN_DAYS = 14;
/** 가정 서명 명단의 한 분에게 보낼 서명 링크 (한 분 = 링크 하나, 서명하면 닫힘) */
function makeSignLink(id, idx, phone) {
  needOrg_();
  return withLock_(() => {
    const base = str_(props_().getProperty('PUBLIC_URL'));
    if (!base) throw new Error('설정 탭에서 「외부 서명용 주소」를 먼저 넣어 주세요.');
    const x = findHome_(id), h = homeData_(x), p = h.d.people[idx];
    if (x.r[9] !== '서명 대기') throw new Error('서명이 끝난 명단이에요.');
    if (!p) throw new Error('받는 분을 찾을 수 없어요.');
    if (p.sig) throw new Error(p.name + '님은 이미 서명했어요.');
    if (phone !== undefined && digits_(phone)) p.phone = digits_(phone);
    if (!p.birth && p.idType === '생년월일') p.birth = birth6_(p.addr);
    if (!p.birth && !(p.phone && p.phone.length >= 4)) throw new Error('본인 확인용 생년월일이나 연락처가 없어요. 연락처를 넣어 주세요.');
    const alive = p.tok && (!p.tokExp || Date.now() < p.tokExp) && (p.tries || 0) < 5 && props_().getProperty('TOK_' + p.tok);
    if (!alive) {
      if (p.tok) props_().deleteProperty('TOK_' + p.tok);
      p.tok = Utilities.getUuid().replace(/-/g, '');
      p.tokExp = Date.now() + SIGN_DAYS * 864e5; p.tries = 0;
      props_().setProperty('TOK_' + p.tok, x.r[0]);
    }
    h.f.setContent(JSON.stringify(h.d));
    const url = base + '?s=' + p.tok;
    return { url: url, phone: p.phone || '', check: p.birth ? '생년월일 6자리' : '연락처 뒤 4자리',
      msg: '[' + APP.org + '] ' + p.name + '님, 보내드린 후원품 잘 받으셨나요? 아래 링크에서 수령 확인 서명을 부탁드려요. (' + (p.birth ? '생년월일 6자리' : '연락처 뒤 4자리') + '로 확인해요)\n' + url };
  });
}
/** 외부 서명 화면에서 쓰는 함수: 토큰 + 본인 확인. 이 두 함수만 기관 계정 없이 부를 수 있음 */
function signTarget_(token) {
  const t = String(token || '').replace(/[^a-f0-9]/gi, ''); if (t.length < 20) throw new Error('링크가 올바르지 않아요.');
  const homeId = props_().getProperty('TOK_' + t); if (!homeId) throw new Error('이미 서명했거나 만료된 링크예요. 복지관에 문의해 주세요.');
  const x = ownRows_('HOME').find(y => y.r[0] === homeId); if (!x || x.r[9] !== '서명 대기') throw new Error('이미 마감된 링크예요. 복지관에 문의해 주세요.');
  const h = homeData_(x), p = h.d.people.find(q => q.tok === t);
  if (!p) throw new Error('이미 서명했거나 만료된 링크예요. 복지관에 문의해 주세요.');
  if (p.tokExp && Date.now() > p.tokExp) throw new Error('링크 사용 기간이 지났어요. 복지관에 문의해 주세요.');
  return { x: x, h: h, p: p, t: t };
}
function checkWho_(c, code) {
  const p = c.p, want = p.birth || (p.phone || '').slice(-4), got = digits_(code);
  if ((p.tries || 0) >= 5) throw new Error('확인을 여러 번 틀려서 링크가 잠겼어요. 복지관에 문의해 주세요.');
  if (!want || got !== want) { p.tries = (p.tries || 0) + 1; c.h.f.setContent(JSON.stringify(c.h.d)); throw new Error('입력한 번호가 맞지 않아요. (' + (5 - p.tries) + '번 남음)'); }
}
function publicSignInfo(token, code) {
  return withLock_(() => {
    const c = signTarget_(token);
    if (code === undefined) return { name: c.p.name.slice(0, 1) + '○' + c.p.name.slice(2), check: c.p.birth ? '생년월일 6자리 (예: 1965년 3월 12일생 → 650312)' : '연락처 뒤 4자리' };
    checkWho_(c, code);
    return { name: c.p.name, org: APP.org, date: c.h.d.date, items: c.h.d.items.map(it => ({ name: it.name, qty: num_(c.p.qty[it.key]) })).filter(i => i.qty > 0) };
  });
}
function publicSign(token, code, dataUrl) {
  return withLock_(() => {
    const c = signTarget_(token);
    checkWho_(c, code);
    if (!/^data:image\/png;base64,/.test(String(dataUrl)) || String(dataUrl).length > 400000) throw new Error('서명을 다시 해 주세요.');
    c.p.sig = dataUrl; c.p.at = today_(); c.p.via = '링크 서명';
    props_().deleteProperty('TOK_' + c.t); c.p.tok = ''; c.p.tries = 0;
    c.h.f.setContent(JSON.stringify(c.h.d));
    return true;
  });
}

/* ───────── 엑셀로 내보내기 (모양 살려서) ───────── */
/** 화면에서 읽은 양식 모양(표·칸 너비·합치기·색·서명/사진)을 임시 시트에 그려 .xlsx로 */
function exportXlsx(model, name) {
  needOrg_();
  const fname = String(name || '문서').replace(/[\\/:*?"<>|]/g, '_');
  const ss = SpreadsheetApp.create(fname), sh = ss.getSheets()[0];
  try {
    sh.setHiddenGridlines(true);
    const tables = model.filter(b => b.type === 'table').map(layoutTable_);
    const base = tables.reduce((a, t) => (t.ncols > a.ncols ? t : a), { ncols: 1, widths: [700] });
    const W = base.ncols, widths = base.widths;
    if (sh.getMaxColumns() < W) sh.insertColumnsAfter(sh.getMaxColumns(), W - sh.getMaxColumns());
    widths.forEach((w, i) => sh.setColumnWidth(i + 1, Math.max(18, Math.round(w))));
    const B = [0]; widths.forEach(w => B.push(B[B.length - 1] + w));
    const near = x => { let k = 0; B.forEach((v, i) => { if (Math.abs(v - x) < Math.abs(B[k] - x)) k = i; }); return k; };
    const need = model.reduce((a, b) => a + (b.type === 'table' ? b.rows.length + 1 : 1), 2);
    if (sh.getMaxRows() < need) sh.insertRowsAfter(sh.getMaxRows(), need - sh.getMaxRows());
    let row = 1, ti = 0;
    model.forEach(b => {
      if (b.type !== 'table') {
        if (!String(b.t || '').trim()) { sh.setRowHeight(row, Math.max(8, Math.round(b.h || 12))); row++; return; }
        const r = sh.getRange(row, 1, 1, W); r.merge(); r.setNumberFormat('@').setValue(b.t).setHorizontalAlignment(b.al || 'left').setVerticalAlignment('middle')
          .setFontSize(b.fs || 11).setFontWeight(b.b ? 'bold' : 'normal').setWrap(true);
        sh.setRowHeight(row, Math.max(21, Math.round(b.h || 21))); row++; return;
      }
      const t = tables[ti++], tb = [0]; t.widths.forEach(w => tb.push(tb[tb.length - 1] + w));
      const sc = B[W] / tb[tb.length - 1], map = tb.map(x => near(x * sc));
      for (let i = 1; i < map.length; i++) if (map[i] <= map[i - 1]) map[i] = Math.min(W, map[i - 1] + 1);
      const R = t.nrows, val = [], bg = [], fw = [], al = [], fs = [];
      for (let i = 0; i < R; i++) { val.push(Array(W).fill('')); bg.push(Array(W).fill('#ffffff')); fw.push(Array(W).fill('normal')); al.push(Array(W).fill('center')); fs.push(Array(W).fill(10)); }
      const merges = [], imgs = [];
      t.cells.forEach(c => {
        const c0 = map[c.c], c1 = Math.max(map[Math.min(c.c + c.cs, t.ncols)], c0 + 1);
        val[c.r][c0] = c.img ? '' : c.t;
        for (let i = c.r; i < c.r + c.rs && i < R; i++) for (let j = c0; j < c1; j++) { bg[i][j] = c.bg || '#ffffff'; fw[i][j] = c.b ? 'bold' : 'normal'; al[i][j] = c.al || 'center'; fs[i][j] = c.fs || 10; }
        if (c.rs > 1 || c1 - c0 > 1) merges.push([row + c.r, c0 + 1, c.rs, c1 - c0]);
        if (c.img) imgs.push({ src: c.img, r: row + c.r, c: c0 + 1, w: B[c1] - B[c0], h: t.heights.slice(c.r, c.r + c.rs).reduce((a, x) => a + x, 0) });
      });
      const rg = sh.getRange(row, 1, R, W);
      rg.setNumberFormat('@').setValues(val).setBackgrounds(bg).setFontWeights(fw).setHorizontalAlignments(al).setFontSizes(fs).setVerticalAlignment('middle').setWrap(true);
      sh.getRange(row, map[0] + 1, R, map[map.length - 1] - map[0]).setBorder(true, true, true, true, true, true, '#333333', SpreadsheetApp.BorderStyle.SOLID);
      merges.forEach(m => sh.getRange(m[0], m[1], m[2], m[3]).merge());
      t.heights.forEach((h, i) => sh.setRowHeight(row + i, Math.max(21, Math.round(h))));
      imgs.forEach(im => {
        const mm = String(im.src).match(/^data:([^;]+);base64,(.+)$/); if (!mm) return;
        try {
          const pic = sh.insertImage(Utilities.newBlob(Utilities.base64Decode(mm[2]), mm[1], 'img'), im.c, im.r);
          const k = Math.min((im.w - 8) / pic.getWidth(), (im.h - 8) / pic.getHeight(), 1);
          pic.setWidth(Math.round(pic.getWidth() * k)).setHeight(Math.round(pic.getHeight() * k)).setAnchorCellXOffset(4).setAnchorCellYOffset(4);
        } catch (e) {}
      });
      row += R + 1;
    });
    SpreadsheetApp.flush();
    const blob = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx',
      { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getBlob().setName(fname + '.xlsx');
    const f = folder_(['엑셀']).createFile(blob);
    return { b64: Utilities.base64Encode(blob.getBytes()), name: fname + '.xlsx', url: f.getUrl() };
  } finally {
    try { DriveApp.getFileById(ss.getId()).setTrashed(true); } catch (e) {}
  }
}
/** 표의 칸 위치(행·열 합치기 포함)와 칸 너비를 계산 */
function layoutTable_(t) {
  const occ = [], cells = [];
  t.rows.forEach((row, r) => {
    occ[r] = occ[r] || []; let c = 0;
    row.cells.forEach(cell => {
      while (occ[r][c]) c++;
      const rs = Math.max(1, cell.rs || 1), cs = Math.max(1, cell.cs || 1);
      for (let i = r; i < r + rs; i++) { occ[i] = occ[i] || []; for (let j = c; j < c + cs; j++) occ[i][j] = 1; }
      cells.push(Object.assign({}, cell, { r: r, c: c, rs: rs, cs: cs })); c += cs;
    });
  });
  const ncols = Math.max(1, ...occ.map(x => x.length)), nrows = t.rows.length;
  const widths = Array(ncols).fill(0);
  cells.filter(c => c.cs === 1).forEach(c => { widths[c.c] = Math.max(widths[c.c], c.w || 0); });
  const known = widths.filter(Boolean), avg = known.length ? known.reduce((a, x) => a + x, 0) / known.length : 60;
  for (let i = 0; i < ncols; i++) if (!widths[i]) widths[i] = avg;
  return { cells: cells.filter(c => c.r < nrows), ncols: ncols, nrows: nrows, widths: widths, heights: t.rows.map(r => r.h || 24) };
}

/* ───────── 편집기에서 직접 실행하는 도구 ───────── */
/** 앱이 안 열릴 때: 편집기에서 실행 → 아래 '실행 로그'에 어디서 오래 걸리는지 나옴 */
function checkApp() {
  needAdmin_();
  const t0 = Date.now(), lap = m => console.log((Date.now() - t0) + 'ms  ' + m);
  lap('시작');
  ['REG', 'DIST', 'DISP', 'STOCK', 'STAFF'].forEach(k => {
    const sh = sheet_(k), m = map_(k);
    console.log(APP.sheets[k] + ' → 탭: ' + (sh ? sh.getName() + ' (' + sh.getLastRow() + '줄, ' + sh.getLastColumn() + '칸)' : '못 찾음') + ' / 저장된 설정: ' + (m ? JSON.stringify(m) : '없음'));
  });
  lap('설정 확인');
  ['REG', 'DIST', 'DISP', 'STAFF'].forEach(k => { const n = readSheet_(k).length; lap(APP.sheets[k] + ' 읽기 ' + n + '줄'); });
  ownRows_('HOME'); ownRows_('RCPT'); lap('앱 탭 읽기');
  const s = stock_(); lap('재고 계산 ' + s.length + '개, 남은 물품 ' + s.filter(l => l.remain > 0).length + '개');
  getBoot(''); lap('첫 화면 준비 끝');
}
/** 칸 설정을 지우고 처음부터 다시 짐작하게 함 (시트 내용은 그대로) */
function resetSetup() {
  needAdmin_();
  ['REG', 'DIST', 'DISP', 'STOCK', 'STAFF'].forEach(k => props_().deleteProperty('MAP_' + k));
  console.log('칸 설정을 지웠어요. 앱을 열면 설정 탭부터 나와요.');
}
/* ───────── 저장 안전장치: 같은 요청 재시도·중간 실패 복구 ───────── */
let ACTIVE_OP = null;
const MUTATION_TARGETS = {
 createTeamReceipt:['DIST','@RCPT'],createOrgReceipt:['DIST','@RCPT','@ORG'],requestHome:['@HOME'],confirmHome:['DIST','@HOME'],
 updateTeamReceipt:['DIST','@RCPT'],updateOrgReceipt:['DIST','@RCPT','@ORG'],updateHomeSign:['DIST','@HOME'],updateHomeTotals:['DIST','@HOME'],
 giveVouchers:['VOUCH','DIST','@RCPT'],updateVoucherGive:['VOUCH','DIST','@RCPT'],cancelVoucherGive:['VOUCH','DIST','@RCPT'],addVouchers:['VOUCH'],
 dispose:['DISP','@DLOG'],updateDisposal:['DISP','@DLOG'],signReceipt:['@RCPT'],signHome:['@HOME'],finishHome:['@HOME'],saveReceiptPdf:['@RCPT'],markOrgReturned:['@RCPT']
};
function hash_(v){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(v),Utilities.Charset.UTF_8).map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');}
function newRecordId_(prefix){return prefix+Utilities.getUuid().replace(/-/g,'');}
function quantity_(value,label){
 const s=String(value==null?'':value).trim().replace(/,/g,'');if(!s)return 0;
 if(!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(s)||!Number.isFinite(Number(s)))throw Error((label||'수량')+'은 0 이상의 숫자로 입력해주세요.');return Number(s);
}
function validateMutation_(kind,args){
 function walk(o){if(!o||typeof o!=='object')return;if(Array.isArray(o)){o.forEach(walk);return;}
  Object.keys(o).forEach(k=>{if(k==='qty'&&o[k]&&typeof o[k]==='object')Object.keys(o[k]).forEach(x=>quantity_(o[k][x]));
   else if(k==='qty')quantity_(o[k]);else if(k==='count'){const n=quantity_(o[k],'인원');if(!Number.isInteger(n)||n<1)throw Error('인원은 1명 이상의 정수로 입력해주세요.');}
   else if(typeof o[k]==='object')walk(o[k]);});}
 args.forEach(walk);
 const p=args[0];if(p&&p.items){const keys=p.items.map(i=>i.key);if(new Set(keys).size!==keys.length)throw Error('같은 물품이 중복 선택됐어요. 다시 선택해주세요.');}
 if(kind==='giveVouchers'||kind==='updateVoucherGive'){const people=kind==='giveVouchers'?(p.people||[]):(args[1]||[]),seen=new Set();people.forEach(x=>(x.serials||[]).forEach(sr=>{if(seen.has(sr))throw Error('같은 상품권 번호를 두 번 지급할 수 없어요: '+sr);seen.add(sr);}));}
 if(kind==='addVouchers'&&(!Number.isInteger(quantity_(p.face,'면액'))||quantity_(p.face)<1))throw Error('면액은 1원 이상의 정수로 입력해주세요.');
}
function journal_(){let sh=ss_().getSheetByName('앱_작업기록');if(!sh){sh=ss_().insertSheet('앱_작업기록');sh.appendRow(['요청ID','작업','입력지문','상태','결과','복구정보','오류','시각']);sh.setFrozenRows(1);sh.hideSheet();}return sh;}
/** 작업기록은 짧은 4칸(요청ID·작업·입력지문·상태)만 읽어요. 복구정보·결과는 필요한 줄만 따로 읽음 */
function journalIndex_(sh){return sh.getLastRow()<2?[]:sh.getRange(2,1,sh.getLastRow()-1,4).getValues().map((r,i)=>({row:i+2,r}));}
const JOURNAL_PENDING=['처리중','준비중','복구필요'],JOURNAL_MAX=500,JOURNAL_KEEP=200;
/** 작업기록이 길어지면 오래된(끝난) 기록을 한 번에 정리 — 매번 읽는 양이 늘지 않게 */
function pruneJournal_(sh,rows){
 if(rows.length<=JOURNAL_MAX)return false;
 const cut=rows.length-JOURNAL_KEEP;
 if(rows.slice(0,cut).some(x=>JOURNAL_PENDING.includes(x.r[3])))return false;
 sh.deleteRows(2,cut);return true;
}
function journalWrite_(ctx,status,result,error){ctx.sh.getRange(ctx.row,4,1,5).setValues([[status,result===undefined?'':JSON.stringify(result),JSON.stringify(ctx.meta),String(error||'').slice(0,4000),new Date()]]);SpreadsheetApp.flush();}
function sheetById_(id){const sh=ss_().getSheets().find(s=>s.getSheetId()===id);if(!sh)throw Error('복구할 시트가 없어요: '+id);return sh;}
function snapshotSheet_(ctx,key){
 const sh=key[0]==='@'?own_(key.slice(1)):sheet_(key);if(!sh)return;
 const range=sh.getDataRange(),formulas=range.getFormulas(),notes=range.getNotes(),copy=sh.copyTo(ss_());
 copy.setName('복구_'+ctx.id.slice(0,10)+'_'+sh.getSheetId());copy.hideSheet();
 const m=key[0]==='@'?null:map_(key),auto=m?autoCols_(sh,m.headerRow):{};
 ctx.meta.sheets.push({source:sh.getSheetId(),backup:copy.getSheetId(),rows:range.getNumRows(),cols:range.getNumColumns(),maxRows:sh.getMaxRows(),maxCols:sh.getMaxColumns(),header:m?m.headerRow:1,auto});
 copy.getRange(1,1,range.getNumRows(),range.getNumColumns()).setNotes(formulas.map((row,i)=>row.map((f,j)=>f||notes[i][j]?JSON.stringify({f,n:notes[i][j]}):'')));
 journalWrite_(ctx,'준비중');
}
function snapshotFiles_(ctx,kind,args){
 let ids=[];
 if(['signHome','updateHomeSign','finishHome'].includes(kind)){const x=findHome_(args[0]);if(x.r[11])ids.push(x.r[11]);}
 if(['updateVoucherGive','saveReceiptPdf'].includes(kind)){const x=findRcpt_(args[0]);if(x.r[1]==='상품권'){const p=JSON.parse(x.r[7]||'[]');if(p[0]&&p[0].af)ids.push(p[0].af);}}
 for(const id of [...new Set(ids)]){const f=DriveApp.getFileById(id),backup=f.makeCopy('복구_'+ctx.id.slice(0,10)+'_'+id,folder_(['작업복구']));ctx.meta.files.push({source:id,backup:backup.getId(),trashed:f.isTrashed()});journalWrite_(ctx,'준비중');}
}
function trackedFile_(folder,...args){const f=folder.createFile(...args);if(ACTIVE_OP){ACTIVE_OP.meta.created.push(f.getId());journalWrite_(ACTIVE_OP,'처리중');}return f;}
function restoreOperation_(meta){
 if(meta.light)restoreLight_(meta);
 for(const item of meta.sheets||[]){const sh=sheetById_(item.source),backup=sheetById_(item.backup),rg=backup.getRange(1,1,item.rows,item.cols),values=rg.getValues(),packed=rg.getNotes();
  const formulas=packed.map(row=>row.map(v=>v?JSON.parse(v).f:'')),notes=packed.map(row=>row.map(v=>v?JSON.parse(v).n:''));
  if(sh.getMaxRows()<item.maxRows)sh.insertRowsAfter(sh.getMaxRows(),item.maxRows-sh.getMaxRows());if(sh.getMaxColumns()<item.maxCols)sh.insertColumnsAfter(sh.getMaxColumns(),item.maxCols-sh.getMaxColumns());
  sh.getDataRange().clearContent();
  const actual=values.map((row,i)=>row.map((v,j)=>formulas[i][j]||((item.auto[j+1]&&i>=item.header)?'':typeof v==='string'&&v[0]==='='?"'"+v:v)));
  const target=sh.getRange(1,1,item.rows,item.cols);target.setValues(actual);target.setNotes(notes);rg.copyTo(target,SpreadsheetApp.CopyPasteType.PASTE_FORMAT,false);SpreadsheetApp.flush();
  const check=target.getValues(),checkF=target.getFormulas();values.forEach((row,i)=>row.forEach((v,j)=>{if(formulas[i][j]){if(checkF[i][j]!==formulas[i][j])throw Error('수식 복구 확인 실패');}else if(!(item.auto[j+1]&&i>=item.header)){const a=v instanceof Date?v.getTime():String(v),b=check[i][j] instanceof Date?check[i][j].getTime():String(check[i][j]);if(a!==b)throw Error('기존 자료 복구 확인 실패');}}));
 }
 for(const item of meta.files||[]){const f=DriveApp.getFileById(item.source);f.setTrashed(false);const content=DriveApp.getFileById(item.backup).getBlob().getDataAsString();f.setContent(content);f.setTrashed(!!item.trashed);if(f.getBlob().getDataAsString()!==content||f.isTrashed()!==!!item.trashed)throw Error('임시 파일 복구 확인 실패');}
 for(const id of meta.created||[])DriveApp.getFileById(id).setTrashed(true);
 clearCache_();
}
function cleanupOperation_(meta){for(const id of meta.stash||[]){try{DriveApp.getFileById(id).setTrashed(true);}catch(e){}}for(const item of meta.sheets||[]){try{ss_().deleteSheet(sheetById_(item.backup));}catch(e){}}for(const item of meta.files||[]){try{DriveApp.getFileById(item.backup).setTrashed(true);}catch(e){}}}
function resultRef_(kind,result){if(result&&result.id){if(['updateHomeSign','signHome'].includes(kind))return {ref:'home',id:result.id};if(['dispose','updateDisposal'].includes(kind))return {ref:'disposal',id:result.id};if(['createOrgReceipt','updateOrgReceipt','updateTeamReceipt','updateVoucherGive','signReceipt'].includes(kind))return {ref:'receipt',id:result.id};}return {value:result};}
function resolveResult_(r){return r.ref==='receipt'?getReceipt(r.id):r.ref==='home'?getHomeSign(r.id):r.ref==='disposal'?getDisposal(r.id):r.value;}
function withMutation_(kind,requestId,args,fn){
 needOrg_();
 if(!/^[A-Za-z0-9_-]{8,100}$/.test(String(requestId||'')))throw Error('앱을 새로고침한 뒤 다시 시도해주세요.');
 validateMutation_(kind,args);
 return withLock_(()=>{const sh=journal_(),id=hash_(me_()+'|'+kind+'|'+requestId),fingerprint=hash_(JSON.stringify(args));
  let rows=journalIndex_(sh);
  // 시간 초과된 이전 실행도 다음 저장 전에 복구합니다.
  for(const old of rows.filter(x=>JOURNAL_PENDING.includes(x.r[3]))){const previous={sh,row:old.row,id:old.r[0],meta:JSON.parse(sh.getRange(old.row,6).getValue()||'{}')};try{if(old.r[3]!=='준비중')restoreOperation_(previous.meta);finishJournal_(previous,'복구완료',undefined,'이전 실행 복구');}catch(e){journalWrite_(previous,'복구필요',undefined,e.message);throw Error('이전 저장 작업을 복구하지 못해 새 저장을 중단했어요. 관리자에게 알려주세요. 복구 기록: '+old.r[0]);}}
  if(pruneJournal_(sh,rows))rows=journalIndex_(sh);
  const old=rows.find(x=>x.r[0]===id);
  if(old&&old.r[2]!==fingerprint)throw Error('같은 요청의 입력 내용이 바뀌었어요. 이전 결과를 확인하고 새 화면에서 다시 작성해주세요.');
  if(old&&old.r[3]==='완료')return resolveResult_(JSON.parse(sh.getRange(old.row,5).getValue()));
  // 자주 쓰는 저장(새로 추가·서명·확인)은 시트를 통째로 복사하지 않고, 이번에 건드리는 줄만 기억했다가 실패하면 그 줄만 되돌려요.
  const light=LIGHT_OPS.includes(kind);
  const ctx={sh,id,seen:{},meta:light?{light:true,blocks:[],tails:{},stash:[],files:[],created:[]}:{sheets:[],files:[],created:[]}};
  if(old){ctx.row=old.row;journalWrite_(ctx,'준비중');}
  else{sh.appendRow([id,kind,fingerprint,'준비중','',JSON.stringify(ctx.meta),'',new Date()]);ctx.row=sh.getLastRow();}
  try{const targets=MUTATION_TARGETS[kind]||[];for(const key of targets)if(['DIST','DISP'].includes(key))ensureRecordColumn_(key);
   if(!light)for(const key of targets)snapshotSheet_(ctx,key);
   snapshotFiles_(ctx,kind,args);journalWrite_(ctx,'처리중');ACTIVE_OP=ctx;ctx.executing=true;
   const result=fn();SpreadsheetApp.flush();ACTIVE_OP=null;finishJournal_(ctx,'완료',resultRef_(kind,result));return result;
  }catch(e){ACTIVE_OP=null;try{if(ctx.executing)restoreOperation_(ctx.meta);finishJournal_(ctx,'복구완료',undefined,e.message);}catch(recovery){journalWrite_(ctx,'복구필요',undefined,recovery.message);throw Error('저장 중 오류가 났고 자동 복구를 확인하지 못했어요. 관리자에게 알려주세요. 복구 기록: '+id);}
   throw Error('저장하지 못해 이전 자료로 복구했어요. 같은 버튼으로 다시 시도할 수 있어요. ('+(e.message||e)+')');}
 });
}
/** 끝난 작업: 기록을 남기고 백업을 정리. 가벼운 저장은 되돌리기 정보를 비워 작업기록이 무거워지지 않게 함 */
function finishJournal_(ctx,status,result,error){const meta=ctx.meta;if(meta.light)ctx.meta={light:true};journalWrite_(ctx,status,result,error);cleanupOperation_(meta);}

/* ───────── 가벼운 되돌리기: 이번 저장이 건드리는 줄만 기억 ───────── */
const LIGHT_OPS=['createTeamReceipt','createOrgReceipt','requestHome','confirmHome','dispose','addVouchers','giveVouchers','signReceipt','signHome','finishHome','saveReceiptPdf','markOrgReturned'];
function lightCtx_(){return ACTIVE_OP&&ACTIVE_OP.meta.light?ACTIVE_OP:null;}
/** [3,4,5,8] → [[3,5],[8,8]] (이어지는 번호 묶음) */
function runs_(nums){const out=[];nums.forEach(n=>{const last=out[out.length-1];if(last&&n===last[1]+1)last[1]=n;else out.push([n,n]);});return out;}
const packCell_=v=>v instanceof Date?{d:v.getTime()}:v;
const unpackCell_=v=>v&&typeof v==='object'&&'d' in v?new Date(v.d):v;
function pushBlock_(ctx,sh,row,values,formulas,auto){
 const a=Object.keys(auto||{}).map(Number),base={s:sh.getSheetId(),r:row,n:values.length,w:values[0].length,a};
 const empty=values.every((r,i)=>r.every((v,j)=>v===''&&!formulas[i][j]));
 ctx.meta.blocks.push(empty?Object.assign(base,{e:1}):Object.assign(base,{v:values.map(r=>r.map(packCell_)),f:formulas}));
}
/** 고치기 전에 기억을 작업기록에 먼저 남김 (중간에 시간 초과돼도 다음 저장 때 되돌릴 수 있게). 너무 크면 드라이브 파일로 */
function saveLight_(ctx){
 if(JSON.stringify(ctx.meta).length>40000){
  const big=ctx.meta.blocks.map((b,i)=>[b,i]).filter(([b])=>b.v);
  if(big.length){const f=folder_(['작업복구']).createFile('되돌리기_'+ctx.id.slice(0,10)+'_'+Date.now()+'.json',JSON.stringify(big.map(([b])=>b)),'application/json');
   ctx.meta.stash.push(f.getId());big.forEach(([b,i],at)=>{ctx.meta.blocks[i]={ref:f.getId(),at};});}
 }
 journalWrite_(ctx,'처리중');
}
/** appendRows_가 쓸 칸(이미 읽어 둔 값)을 기억 */
function guardBlock_(sh,row,values,formulas,auto){
 const ctx=lightCtx_();if(!ctx||!values.length)return;
 const id=sh.getSheetId();for(let i=0;i<values.length;i++)ctx.seen[id+':'+(row+i)]=1;
 pushBlock_(ctx,sh,row,values,formulas,auto);saveLight_(ctx);
}
/** 이미 있는 줄을 고치기 전에 그 줄만 기억 */
function guardRows_(sh,rows,auto){
 const ctx=lightCtx_();if(!ctx)return;
 const id=sh.getSheetId(),todo=[...new Set(rows)].filter(r=>r>=1&&!ctx.seen[id+':'+r]).sort((a,b)=>a-b);if(!todo.length)return;
 const width=Math.max(sh.getLastColumn(),1);
 runs_(todo).forEach(([r0,r1])=>{const rg=sh.getRange(r0,1,r1-r0+1,width);for(let r=r0;r<=r1;r++)ctx.seen[id+':'+r]=1;pushBlock_(ctx,sh,r0,rg.getValues(),rg.getFormulas(),auto);});
 saveLight_(ctx);
}
/** 앱 탭 맨 아래에 줄을 붙이기 전에 마지막 줄 번호만 기억 */
function guardTail_(sh){const ctx=lightCtx_();if(!ctx)return;const id=String(sh.getSheetId());if(ctx.meta.tails[id]!==undefined)return;ctx.meta.tails[id]=sh.getLastRow();saveLight_(ctx);}
function appendOwn_(k,row){const sh=own_(k);guardTail_(sh);sh.appendRow(row);}
function restoreLight_(meta){
 const files={},load=b=>{if(!b.ref)return b;if(!files[b.ref])files[b.ref]=JSON.parse(DriveApp.getFileById(b.ref).getBlob().getDataAsString());return files[b.ref][b.at];};
 (meta.blocks||[]).slice().reverse().forEach(b0=>{
  const b=load(b0),sh=sheetById_(b.s),skip=new Set(b.a||[]),cols=[];
  for(let c=1;c<=b.w;c++)if(!skip.has(c))cols.push(c); // 배열 수식이 채우는 칸은 건드리지 않음
  runs_(cols).forEach(([c0,c1])=>{const rg=sh.getRange(b.r,c0,b.n,c1-c0+1);
   if(b.e){rg.clearContent();return;}
   rg.setValues(b.v.map((row,i)=>row.slice(c0-1,c1).map((v,j)=>{const f=b.f[i][c0-1+j];if(f)return f;v=unpackCell_(v);return typeof v==='string'&&v[0]==='='?"'"+v:v;})));});
 });
 Object.keys(meta.tails||{}).forEach(id=>{const sh=sheetById_(Number(id)),keep=Math.max(1,meta.tails[id]),last=sh.getLastRow();if(last>keep)sh.deleteRows(keep+1,last-keep);});
 SpreadsheetApp.flush();
}
/** 여러 칸을 모아 두었다가 한 번에 씀. 목록에 없는 칸은 원래 내용(수식 포함) 그대로 둠 */
function cellWriter_(sh,auto){
 const cells=new Map();
 return {
  set:(row,col,val)=>{if(col&&!(auto&&auto[col]))cells.set(row+':'+col,{r:row,c:col,v:val});},
  flush:()=>{
   if(!cells.size)return;
   const list=[...cells.values()],rows=[...new Set(list.map(x=>x.r))].sort((a,b)=>a-b),cols=[...new Set(list.map(x=>x.c))].sort((a,b)=>a-b);
   guardRows_(sh,rows,auto);
   runs_(rows).forEach(([r0,r1])=>runs_(cols).forEach(([c0,c1])=>{
    const touched=list.filter(x=>x.r>=r0&&x.r<=r1&&x.c>=c0&&x.c<=c1);if(!touched.length)return;
    const rg=sh.getRange(r0,c0,r1-r0+1,c1-c0+1),vals=rg.getValues(),fs=rg.getFormulas();
    const out=vals.map((row,i)=>row.map((v,j)=>fs[i][j]||(typeof v==='string'&&v[0]==='='?"'"+v:v)));
    touched.forEach(x=>{out[x.r-r0][x.c-c0]=x.v;});
    rg.setValues(out);
   }));
   cells.clear();
  }
 };
}
function ensureRecordColumn_(key){const sh=sheet_(key),m=map_(key);if(!sh||!m)return;const head=sh.getRange(m.headerRow,1,1,sh.getLastColumn()).getDisplayValues()[0],hits=head.map((v,i)=>str_(v)==='앱기록ID'?i+1:0).filter(Boolean);if(hits.length>1)throw Error('앱기록ID 열이 중복됐어요.');let col=hits[0];if(!col){col=sh.getLastColumn()+1;if(sh.getMaxColumns()<col)sh.insertColumnsAfter(sh.getMaxColumns(),col-sh.getMaxColumns());sh.getRange(m.headerRow,col).setValue('앱기록ID');}if(m.cols.recordId!==col){m.cols.recordId=col;props_().setProperty('MAP_'+key,JSON.stringify(m));}}
function appendDist_(id,rows){appendRows_('DIST',rows.map(o=>Object.assign({},o,{recordId:id})));}
function incomingDate_(r){const match=str_(r.note).match(/\(입고\s+(\d{4}-\d{2}-\d{2})\)/);return match?match[1]:ymd_(r.inDate);}
function sameSignedQuantities_(a,b,keys){return keys.every(k=>num_(a&&a[k])===num_(b&&b[k]));}
function sameSerials_(a,b){return JSON.stringify((a||[]).slice().sort())===JSON.stringify((b||[]).slice().sort());}
function receiptVersion_(r){return hash_(JSON.stringify(r.slice(0,8).concat([r[9]])));}
function expectedDistRows_(no){
 const all=[];ownRows_('RCPT').forEach(x=>{const r=x.r;if(r[2]!==no||r[5]==='취소')return;const items=JSON.parse(r[6]||'[]');
  if(r[1]==='기관'){const org=JSON.parse(r[7]||'{}');items.forEach(it=>all.push({id:r[0],name:it.name,person:org.name,qty:num_(it.give),inDate:it.inDate,date:ymd_(r[3])}));}
  else{const people=JSON.parse(r[7]||'[]');let st;items.forEach(it=>{let name=it.name,inDate=it.inDate;if(r[1]==='상품권'){if(!it.link)return;st=st||stockMap_();if(!st[it.link])throw Error('이전 상품권의 연결 물품을 찾을 수 없어요. 배분 기록을 먼저 대조해주세요.');name=st[it.link].name;inDate=st[it.link].inDate;}people.forEach(p=>all.push({id:r[0],name,person:p.name,qty:num_(p.qty&&p.qty[it.key]),inDate,date:ymd_(r[3])}));});}
 });
 ownRows_('HOME').forEach(x=>{if(x.r[6]!=='확인')return;const items=JSON.parse(x.r[5]||'[]');if(!items.length)return;const number=distNo_(ymd_(x.r[1]),items);if(number!==no)return;items.forEach(it=>all.push({id:x.r[0],name:it.name,person:x.r[2],qty:num_(it.qty),inDate:it.inDate,date:ymd_(x.r[1])}));});
 return all.filter(r=>r.qty>0);
}
function linkLegacyDist_(id,no){
 ensureRecordColumn_('DIST');const m=mapOrThrow_('DIST'),sh=sheet_('DIST'),allRows=readSheet_('DIST');if(allRows.some(r=>str_(r.recordId)===id))return;const rows=allRows.filter(r=>str_(r.no)===no),expected=expectedDistRows_(no),used=new Set(),bindings=[];
 for(const it of expected){const hit=rows.find(r=>!used.has(r._row)&&(!str_(r.recordId)||str_(r.recordId)===it.id)&&str_(r.name)===it.name&&str_(r.person)===it.person&&num_(r.qty)===it.qty&&(!incomingDate_(r)||!it.inDate||incomingDate_(r)===it.inDate)&&(!ymd_(r.date)||ymd_(r.date)===it.date));
  if(!hit)throw Error('예전 배분 기록과 수령증 수량이 맞지 않아 자동 연결을 중단했어요. 「'+no+'」 기록을 대조해주세요.');used.add(hit._row);if(!str_(hit.recordId))bindings.push({row:hit._row,id:it.id});}
 // 예상 밖의 같은 조합은 임의 삭제하지 않습니다.
 bindings.forEach(b=>sh.getRange(b.row,m.cols.recordId).setValue(b.id));
 const mine=expected.filter(it=>it.id===id);if(!mine.length&&rows.some(r=>str_(r.recordId)===id))return;
}
function linkLegacyDisposal_(id){
 ensureRecordColumn_('DISP');const m=mapOrThrow_('DISP'),sh=sheet_('DISP'),rows=readSheet_('DISP'),used=new Set(),bindings=[];
 const target=findDlog_(id),date=ymd_(target.r[1]);
 ownRows_('DLOG').filter(x=>ymd_(x.r[1])===date).forEach(x=>JSON.parse(x.r[2]||'[]').forEach(it=>{if(!(num_(it.qty)>0))return;const hit=rows.find(r=>!used.has(r._row)&&(!str_(r.recordId)||str_(r.recordId)===x.r[0])&&str_(r.name)===it.name&&num_(r.qty)===num_(it.qty)&&(!m.cols.date||ymd_(r.date)===date)&&(!m.cols.inDate||ymd_(r.inDate)===it.inDate));if(!hit)throw Error('예전 폐기 기록과 앱 기록이 맞지 않아 연결을 중단했어요. '+date+' 기록을 대조해주세요.');used.add(hit._row);if(!str_(hit.recordId))bindings.push({row:hit._row,id:x.r[0]});}));
 bindings.forEach(b=>sh.getRange(b.row,m.cols.recordId).setValue(b.id));
}

/** Keep table fills explicit for the server HTML-to-PDF converter. */
function pdfColorHtml_(html) {
  const content=String(html).replace(/<(th|td)\b[^>]*>/gi,function(tag){
    const style=tag.match(/\bstyle\s*=\s*(["'])([\s\S]*?)\1/i);
    if(!style)return tag;
    let color='';
    style[2].split(';').forEach(function(part){
      const m=part.match(/^\s*background(?:-color)?\s*:\s*(#[a-f0-9]{3,8}|rgb\([^)]*\)|[a-z]+)\s*(?:!important)?\s*$/i);
      if(m)color=m[1];
    });
    if(!color||color.toLowerCase()==='transparent')return tag;
    let css=style[2].replace(/\s*;?\s*$/, '')+';background-color:'+color+' !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;';
    let result=tag.replace(style[0],'style='+style[1]+css+style[1]);
    result=result.replace(/\s+bgcolor\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'');
    return result.replace(/>$/, ' bgcolor="'+color+'">');
  });
  return '<style>th,td{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style>'+content;
}
