/****************************************************************
 * 명단 연동: 통합관리 PEOPLE → 활동일지 「봉사자 명단」
 *  - 두 시트를 주소(ID)로 직접 열기 때문에, 어느 Apps Script 프로젝트에 넣어도 동작해요.
 *  - 매일 밤 1시에 자동 실행 (처음 한 번 installVolunteerListSync 실행)
 *
 * 규칙
 *  - 같은 사람 판단: 성명(띄어쓰기 무시) + 연락처 뒤 4자리
 *  - PEOPLE 상태가 '종결'이면 활성여부 N, 그 밖에는 Y
 *  - PEOPLE에 값이 있으면 그 값으로 맞추고, PEOPLE이 비어 있으면 일지 쪽 값을 지우지 않음
 *  - 일지 명단에 없는 분은 새로 추가 (종결된 분은 추가하지 않음)
 *  - 일지 명단에만 있는 분은 그대로 둠
 *  - A열(표시이름 수식)은 건드리지 않음
 *  - 연락처가 없거나 4자리가 안 되는 분은 본인 확인을 할 수 없어 건너뜀
 ****************************************************************/

const LOG_SPREADSHEET_ID = '1scZtNXhW6_6IaQhlEKGgfrd8ZXdaiZ_nql2PTYl0vMk'; // 자원봉사일지서명 시트
const PEOPLE_SPREADSHEET_ID = '1xpSak_fNTMqHkcbawSKui86Y5rOhvYKO63LrbEKo3ac'; // ★ 자원봉사 통합관리 시트
const LOG_VOLUNTEER_SHEET = '봉사자 명단';
const LOG_VOLUNTEER_HEADERS = ['표시이름', '성명', '생년월일', '연락처뒤4자리', '활성여부', '실적등록처', 'VMS1365_ID', '소속', '비고'];
const SYNC_NOTE_NEW = '통합관리 연동';
const SYNC_RESULT_KEY = 'volunteerListSyncLast';

/** 편집기에서 직접 실행하거나 앱에서 부를 때 (min만) */
function syncVolunteerListToLog() {
  syncRequireOwner_();
  return syncVolunteerListToLog_impl_();
}

/** 매일 밤 자동 실행용 (결과 숫자만 돌려줌) — 신청서 → PEOPLE 먼저, 그다음 PEOPLE → 일지 명단 */
function syncVolunteerListNightly() {
  let imported = null;
  try { imported = importApplicationsToPeople_impl_(); } catch (e) { imported = { error: e.message }; }
  const r = syncVolunteerListToLog_impl_();
  return { added: r.added, updated: r.updated, applications: imported };
}

/** 편집기에서 바로 실행: 활동일지 「자원봉사 신청서」 중 등록완료된 분을 PEOPLE에 넣기 (min만) */
function importApplicationsToPeople() {
  syncRequireOwner_();
  return importApplicationsToPeople_impl_();
}

/** 처음 한 번 편집기에서 실행: 매일 오전 1시 자동 연동 */
function installVolunteerListSync() {
  syncRequireOwner_();
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'syncVolunteerListNightly')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('syncVolunteerListNightly').timeBased().everyDays(1).atHour(1).create();
  const first = syncVolunteerListToLog_impl_();
  return '설정 완료: 매일 오전 1시 자동 연동 / 지금 한 번 실행 결과 → ' + first.message;
}

/** 마지막 연동 결과 보기 (min만) */
function getVolunteerListSyncResult() {
  syncRequireOwner_();
  const raw = PropertiesService.getScriptProperties().getProperty(SYNC_RESULT_KEY);
  return raw ? JSON.parse(raw) : null;
}


function syncVolunteerListToLog_impl_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const people = syncReadPeople_();
    const sheet = SpreadsheetApp.openById(LOG_SPREADSHEET_ID).getSheetByName(LOG_VOLUNTEER_SHEET);
    if (!sheet) throw Error('활동일지 시트에서 「' + LOG_VOLUNTEER_SHEET + '」 탭을 찾지 못했습니다.');

    const header = sheet.getRange(1, 1, 1, 9).getDisplayValues()[0].map(x => String(x).trim());
    if (LOG_VOLUNTEER_HEADERS.some((h, i) => header[i] !== h)) {
      throw Error('「봉사자 명단」 첫 행이 예상과 달라요. 표시이름~비고 9칸 순서를 확인해 주세요. (아무것도 바꾸지 않았어요)');
    }

    const norm = v => String(v == null ? '' : v).replace(/\s+/g, '');
    const last4 = v => { const d = String(v == null ? '' : v).replace(/\D/g, ''); return d.length >= 4 ? d.slice(-4) : ''; };

    // 일지 명단: A열은 수식이므로 B열 기준으로 마지막 줄을 찾음
    const maxRow = Math.max(sheet.getLastRow(), 1);
    const colB = maxRow > 1 ? sheet.getRange(2, 2, maxRow - 1, 1).getValues() : [];
    let lastDataRow = 1;
    colB.forEach((r, i) => { if (String(r[0]).trim()) lastDataRow = i + 2; });
    const existing = lastDataRow > 1 ? sheet.getRange(2, 2, lastDataRow - 1, 8).getValues() : []; // B~I

    const logIndex = new Map();
    existing.forEach((r, i) => {
      const key = norm(r[0]) + '|' + String(r[2]).replace(/\D/g, '').padStart(4, '0');
      if (!norm(r[0])) return;
      if (!logIndex.has(key)) logIndex.set(key, []);
      logIndex.get(key).push(i);
    });

    // PEOPLE 쪽 같은 이름+뒤4자리가 두 명 이상이면 구분할 수 없어 건너뜀
    const peopleCount = new Map();
    people.forEach(p => {
      const k = norm(p.name) + '|' + last4(p.phone);
      peopleCount.set(k, (peopleCount.get(k) || 0) + 1);
    });

    const updatedRows = existing.map(r => r.slice());
    const changed = new Set();
    const newRows = [];
    const skipped = { noPhone: 0, ambiguous: [], closedNotInLog: 0 };
    let updated = 0;

    people.forEach(p => {
      const name = String(p.name || '').trim();
      if (!name) return;
      const four = last4(p.phone);
      if (!four) { skipped.noPhone++; return; }
      const key = norm(name) + '|' + four;
      if (peopleCount.get(key) > 1) { if (skipped.ambiguous.indexOf(name) < 0) skipped.ambiguous.push(name); return; }

      const closed = String(p.status || '').trim() === '종결';
      const system = p.vmsId ? 'VMS' : (p.vol1365Id ? '1365' : '');
      const perfId = String(p.vmsId || p.vol1365Id || '').trim();
      const birth = String(p.birthDate || '').trim();
      const org = String(p.affiliation || '').trim();
      const active = closed ? 'N' : 'Y';

      const hits = logIndex.get(key);
      if (hits && hits.length) {
        hits.forEach(i => {
          const row = updatedRows[i]; // [성명, 생년월일, 뒤4자리, 활성여부, 실적등록처, ID, 소속, 비고]
          const before = JSON.stringify(row.map(cellText_));
          row[3] = active;
          if (birth) row[1] = birth;
          if (system) row[4] = system;
          if (perfId) row[5] = perfId;
          if (org) row[6] = org;
          if (JSON.stringify(row.map(cellText_)) !== before) { changed.add(i); }
        });
        return;
      }

      if (closed) { skipped.closedNotInLog++; return; }
      newRows.push([name, birth, four, 'Y', system, perfId, org, SYNC_NOTE_NEW]);
      logIndex.set(key, [-1]); // 같은 실행 안에서 중복 추가 방지
    });

    // 바뀐 줄만 다시 씀 (B~I)
    changed.forEach(i => {
      sheet.getRange(i + 2, 2, 1, 8).setValues([updatedRows[i]]);
      updated++;
    });

    if (newRows.length) {
      const start = lastDataRow + 1;
      if (sheet.getMaxRows() < start + newRows.length - 1) {
        sheet.insertRowsAfter(sheet.getMaxRows(), start + newRows.length - 1 - sheet.getMaxRows());
      }
      sheet.getRange(start, 4, newRows.length, 1).setNumberFormat('@'); // 0으로 시작하는 뒤4자리 보존
      sheet.getRange(start, 2, newRows.length, 8).setValues(newRows);
    }

    const result = {
      at: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'),
      added: newRows.length,
      updated: updated,
      skippedNoPhone: skipped.noPhone,
      skippedAmbiguous: skipped.ambiguous,
      closedNotAdded: skipped.closedNotInLog
    };
    result.message = '새로 추가 ' + result.added + '명 · 정보 갱신 ' + result.updated + '명' +
      (result.skippedNoPhone ? ' · 연락처 없어 건너뜀 ' + result.skippedNoPhone + '명' : '') +
      (result.skippedAmbiguous.length ? ' · 같은 이름·뒤4자리라 확인 필요: ' + result.skippedAmbiguous.join(', ') : '');
    PropertiesService.getScriptProperties().setProperty(SYNC_RESULT_KEY, JSON.stringify(result));
    return result;
  } finally {
    lock.releaseLock();
  }
}

/** 이 파일만으로 동작하도록: 실행한 사람이 스크립트 주인(min)인지 확인 */
function syncRequireOwner_() {
  let me = '', owner = '';
  try { me = String(Session.getActiveUser().getEmail() || '').toLowerCase(); } catch (e) {}
  try { owner = String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (e) {}
  if (me && owner && me !== owner) throw Error('이 기능은 담당자만 사용할 수 있습니다.');
}

/** 통합관리 시트의 PEOPLE 탭을 직접 읽음 (머리글 이름으로 칸을 찾음) */
function syncReadPeople_() {
  const ss = SpreadsheetApp.openById(PEOPLE_SPREADSHEET_ID);
  const sh = ss.getSheetByName('PEOPLE');
  if (!sh) throw Error('「★ 자원봉사 통합관리」 시트에서 PEOPLE 탭을 찾지 못했어요.');
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const head = values[0].map(x => String(x).trim());
  const col = name => { const i = head.indexOf(name); if (i < 0) throw Error('PEOPLE에 「' + name + '」 열이 없어요.'); return i; };
  const c = { name: col('이름'), birth: col('생년월일'), phone: col('연락처'), vms: col('VMS ID'), v1365: col('1365 ID'), org: col('소속'), status: col('상태') };
  return values.slice(1).map(r => ({
    name: String(r[c.name] || '').trim(),
    birthDate: r[c.birth] instanceof Date ? cellText_(r[c.birth]) : String(r[c.birth] || '').trim(),
    phone: String(r[c.phone] || ''),
    vmsId: String(r[c.vms] || '').trim(),
    vol1365Id: String(r[c.v1365] || '').trim(),
    affiliation: String(r[c.org] || '').trim(),
    status: String(r[c.status] || '').trim()
  })).filter(p => p.name);
}

/** 비교용: 날짜는 yyyy-MM-dd 글자로 */
function cellText_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v == null ? '' : v).trim();
}



/****************************************************************
 * 활동일지 「자원봉사 신청서」 → 통합관리 PEOPLE
 *  - 활동일지 앱에서 확인(등록완료)됐고 'PEOPLE ID' 칸이 빈 신청서만 가져옴
 *  - PEOPLE에 같은 분이 이미 있으면(이름·생년월일 / 이름·연락처 / VMS·1365 ID) 새로 넣지 않고 그 ID만 적어 둠
 *  - 새로 넣을 때: 상태 '활동 중', 구분 '개인', 등록일 = 확인일, 관심활동 = 희망 활동 분야,
 *    참고사항 = '활동일지 신청서 AP-…' (+ 직업)
 *  - 결과는 신청서 탭의 'PEOPLE ID'와 '메모'에 남김
 ****************************************************************/
const LOG_APPLY_SHEET = '자원봉사 신청서';

function importApplicationsToPeople_impl_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const applySheet = SpreadsheetApp.openById(LOG_SPREADSHEET_ID).getSheetByName(LOG_APPLY_SHEET);
    if (!applySheet || applySheet.getLastRow() < 2) return { added: 0, matched: 0 };

    const head = applySheet.getRange(1, 1, 1, applySheet.getLastColumn()).getDisplayValues()[0].map(x => String(x).trim());
    const ac = name => { const i = head.indexOf(name); if (i < 0) throw Error('신청서 탭에 「' + name + '」 칸이 없어요.'); return i; };
    const A = {
      id: ac('신청번호'), name: ac('성명'), birth: ac('생년월일'), phone: ac('연락처'), org: ac('소속'),
      system: ac('실적등록처'), perfId: ac('실적ID'), job: ac('직업'), hope: ac('희망활동분야'),
      status: ac('상태'), confirmedAt: ac('확인일시'), memo: ac('메모'), peopleId: ac('PEOPLE ID')
    };
    const apps = applySheet.getRange(2, 1, applySheet.getLastRow() - 1, head.length).getDisplayValues();
    const todo = apps.map((r, i) => ({ r: r, row: i + 2 }))
      .filter(x => String(x.r[A.status]).trim() === '등록완료' && !String(x.r[A.peopleId]).trim() && String(x.r[A.name]).trim());
    if (!todo.length) return { added: 0, matched: 0 };

    const peopleSheet = SpreadsheetApp.openById(PEOPLE_SPREADSHEET_ID).getSheetByName('PEOPLE');
    if (!peopleSheet) throw Error('「★ 자원봉사 통합관리」 시트에서 PEOPLE 탭을 찾지 못했어요.');
    const pv = peopleSheet.getDataRange().getValues();
    const ph = pv[0].map(x => String(x).trim());
    const pc = name => { const i = ph.indexOf(name); if (i < 0) throw Error('PEOPLE에 「' + name + '」 열이 없어요.'); return i; };
    const P = {
      id: pc('ID'), name: pc('이름'), birth: pc('생년월일'), phone: pc('연락처'), vms: pc('VMS ID'), v1365: pc('1365 ID'),
      org: pc('소속'), kind: pc('구분'), reg: pc('등록일'), status: pc('상태'), interests: pc('관심활동'), notes: pc('참고사항'),
      updated: ph.indexOf('최종수정일')
    };
    const norm = v => String(v == null ? '' : v).replace(/\s+/g, '');
    const digits = v => String(v == null ? '' : v).replace(/\D/g, '');
    const people = pv.slice(1).filter(r => String(r[P.name]).trim()).map(r => ({
      id: String(r[P.id] || '').trim(), name: norm(r[P.name]), birth: cellText_(r[P.birth]),
      phone: digits(r[P.phone]), vms: String(r[P.vms] || '').trim(), v1365: String(r[P.v1365] || '').trim()
    }));

    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const newRows = [];
    let matched = 0;

    todo.forEach(x => {
      const r = x.r;
      const name = String(r[A.name]).trim();
      const birth = String(r[A.birth]).trim();
      const phone = digits(r[A.phone]);
      const system = String(r[A.system]).trim();
      const perfId = String(r[A.perfId]).trim();

      const hit = people.find(p =>
        (system === 'VMS' && perfId && p.vms === perfId) ||
        (system === '1365' && perfId && p.v1365 === perfId) ||
        (p.name === norm(name) && birth && p.birth === birth) ||
        (p.name === norm(name) && phone.length >= 9 && p.phone === phone));

      if (hit && hit.id) {
        applySheet.getRange(x.row, A.peopleId + 1).setValue(hit.id);
        const memo = String(r[A.memo] || '').trim();
        applySheet.getRange(x.row, A.memo + 1).setValue((memo ? memo + ' / ' : '') + 'PEOPLE에 이미 있던 분 — 새로 넣지 않음');
        matched++;
        return;
      }

      const id = Utilities.getUuid();
      const row = new Array(ph.length).fill('');
      row[P.id] = id;
      row[P.name] = name;
      row[P.birth] = birth;
      row[P.phone] = String(r[A.phone]).trim();
      if (system === 'VMS') row[P.vms] = perfId;
      if (system === '1365') row[P.v1365] = perfId;
      row[P.org] = String(r[A.org]).trim();
      row[P.kind] = '개인';
      row[P.reg] = String(r[A.confirmedAt]).slice(0, 10) || today;
      row[P.status] = '활동 중';
      row[P.interests] = String(r[A.hope]).trim();
      const job = String(r[A.job]).trim();
      row[P.notes] = '활동일지 신청서 ' + String(r[A.id]).trim() + (job ? ' · 직업: ' + job : '');
      if (P.updated >= 0) row[P.updated] = today;
      newRows.push(row);
      people.push({ id: id, name: norm(name), birth: birth, phone: phone, vms: row[P.vms], v1365: row[P.v1365] }); // 같은 실행 안 중복 방지
      applySheet.getRange(x.row, A.peopleId + 1).setValue(id);
    });

    if (newRows.length) {
      const start = peopleSheet.getLastRow() + 1;
      peopleSheet.getRange(start, 1, newRows.length, ph.length).setValues(newRows);
      // 같은 프로젝트에 있는 통합관리 도구로 연령 계산·화면 기억 지우기
      if (typeof fillPeopleAges_ === 'function') { try { fillPeopleAges_(peopleSheet, start, start + newRows.length - 1); } catch (e) {} }
    }
    if (typeof invalidateReadCache_ === 'function') { try { invalidateReadCache_(['PEOPLE']); } catch (e) {} }

    return { added: newRows.length, matched: matched };
  } finally {
    lock.releaseLock();
  }
}
