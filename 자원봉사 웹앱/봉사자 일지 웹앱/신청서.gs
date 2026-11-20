/****************************************************************
 * 자원봉사활동 신청서 (처음 오신 분)
 *  - 봉사자 화면 「처음 오셨나요?」 → 신청서 작성·서명 → 「자원봉사 신청서」 탭에 '확인대기'
 *  - 관리자 화면 「신청서」 → 확인(확인자 서명) → 「봉사자 명단」에 등록 + 그 전에 쓴 일지 자동 연결
 *  - 통합관리 PEOPLE에는 통합관리 쪽 명단연동(매일 밤)이 '등록완료' 신청서를 가져가 넣어요.
 *  - 종이 신청서와 같은 모양으로 출력(PDF)할 수 있고, 확인하면 드라이브에도 PDF로 보관돼요.
 ****************************************************************/

const APPLY_SHEET_NAME = '자원봉사 신청서';

/* 자원봉사 기본 교육 (종이 신청서 오른쪽 위 QR과 같은 주소·같은 QR 그림)
 * 출력 양식 오른쪽 위, 봉사자 신청서 화면, 신청 완료 화면에 들어가요.
 * 교육 주소가 바뀌면 두 줄을 같이 바꿔 주세요. (QR 그림은 새 QR 이미지를 base64로) */
const BASIC_EDU_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdNi-eijetQUD0lMLY5hBK3W566xIxLYCubsQ7FS7yfsWzQsg/viewform';
const BASIC_EDU_QR = 'data:image/png;base64,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';


/** 봉사자 화면이 처음 열릴 때 기본 교육 안내(주소·QR)를 가져감 */
function getApplyInfo() {
  return { eduUrl: BASIC_EDU_URL, eduQr: BASIC_EDU_QR };
}

const APPLY_HEADERS = [
  '신청번호', '신청일시', '성명', '성별', '생년월일', '연락처', '소속',
  '실적등록처', '실적ID', '직업', '주소', '이메일', '희망활동분야',
  '개인정보동의', '활동일지동의', '소식수신동의', '14세미만', '보호자동의', '보호자연락처', '보호자관계', '보호자확인',
  '신청자서명파일ID', '상태', '확인자', '확인일시', '확인자서명파일ID', '메모', 'PEOPLE ID', '보관PDF'
];
const AP = {};
APPLY_HEADERS.forEach(function (h, i) { AP[h] = i + 1; });
const APPLY_COLUMN_COUNT = APPLY_HEADERS.length;

const AGREE = '동의함';
const DISAGREE = '동의하지않음';


/* ============================================================
 * 봉사자 화면 (누구나 호출) — 개인정보를 돌려주지 않음
 * ============================================================ */

function submitApplication(data) {
  const d = data || {};
  // 누구나 쓰는 화면이라 시트 수식으로 읽힐 수 있는 글자(=, +, @)로 시작하면 글자로 저장
  const t = function (x) { const c = cleanText(x).slice(0, 300); return /^[=+@]/.test(c) ? "'" + c : c; };
  const v = {
    name: t(d.name),
    gender: cleanText(d.gender),
    birth: cleanText(d.birthDate),
    phone: cleanText(d.phone).replace(/[^\d]/g, ''),
    org: t(d.organization),
    system: cleanText(d.perfSystem),
    perfId: t(d.perfId),
    job: t(d.job),
    address: t(d.address),
    email: cleanText(d.email),
    hope: t(d.hope),
    c1: cleanText(d.consentPrivacy),
    c2: cleanText(d.consentLog),
    c3: cleanText(d.consentNews),
    gConsent: cleanText(d.guardianConsent),
    gPhone: cleanText(d.guardianPhone),
    gRelation: t(d.guardianRelation)
  };

  if (!v.name) throw new Error('성명을 입력해 주세요.');
  if (['남', '여'].indexOf(v.gender) < 0) throw new Error('성별을 골라 주세요.');
  parseDate(v.birth);
  if (v.birth > todayText_()) throw new Error('생년월일을 확인해 주세요.');
  if (!/^0\d{8,10}$/.test(v.phone)) throw new Error('연락처를 숫자로 정확히 입력해 주세요. (예: 010-1234-5678)');
  if (!v.org) throw new Error('소속을 입력해 주세요. 없으면 「개인」이라고 써 주세요.');
  if (v.system && ['VMS', '1365'].indexOf(v.system) < 0) v.system = '';
  if (v.system && !v.perfId) throw new Error(v.system + ' 아이디를 입력해 주세요.');
  if (!v.system) v.perfId = '';
  if (v.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) throw new Error('이메일 주소를 확인해 주세요.');
  if (v.c1 !== AGREE) throw new Error('개인정보 수집·이용에 동의해야 신청할 수 있어요. 동의하기 어려우시면 담당자에게 말씀해 주세요.');
  [v.c2, v.c3].forEach(function (c) {
    if ([AGREE, DISAGREE].indexOf(c) < 0) throw new Error('동의 여부를 모두 골라 주세요.');
  });

  const under14 = ageOn_(v.birth, todayText_()) < 14;
  if (under14) {
    if (v.gConsent !== AGREE) throw new Error('14세 미만은 보호자 동의가 있어야 신청할 수 있어요.');
    if (!/^0\d{8,10}$/.test(v.gPhone.replace(/[^\d]/g, ''))) throw new Error('보호자 연락처를 입력해 주세요.');
    if (!v.gRelation) throw new Error('보호자와의 관계를 입력해 주세요.');
  } else {
    v.gConsent = ''; v.gPhone = ''; v.gRelation = '';
  }

  if (!d.signature || !String(d.signature).startsWith('data:image/png;base64,')) {
    throw new Error('신청자 서명을 해 주세요.');
  }

  const four = v.phone.slice(-4);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    // 이미 등록된 봉사자면 신청서 대신 일지를 바로 쓰게 안내
    const vSheet = ss_().getSheetByName(VOLUNTEER_SHEET_NAME);
    if (vSheet && vSheet.getLastRow() >= 2) {
      const registered = vSheet.getRange(2, 1, vSheet.getLastRow() - 1, 5).getValues().some(function (r) {
        return cleanText(r[4]).toUpperCase() === 'Y' &&
          normalizeName_(r[1]) === normalizeName_(v.name) &&
          cleanText(r[3]).padStart(4, '0') === four;
      });
      if (registered) {
        throw new Error('이미 등록된 봉사자예요. 신청서는 안 쓰셔도 돼요. 「등록 봉사자」로 활동일지를 써 주세요.');
      }
    }

    const sheet = ensureApplySheet_();
    const dup = readApplications_(sheet).find(function (a) {
      return a.status !== '보류' && normalizeName_(a.name) === normalizeName_(v.name) && a.phone === v.phone;
    });
    if (dup) {
      throw new Error('이미 접수된 신청서가 있어요 (신청번호 ' + dup.id + '). 다시 쓰지 않으셔도 돼요.');
    }

    const id = createApplyId_(sheet);
    const sig = saveSignatureImage_({ signatureData: d.signature, activityDate: todayText_(), name: v.name, logId: id });

    const row = new Array(APPLY_COLUMN_COUNT).fill('');
    const put = function (h, val) { row[AP[h] - 1] = val; };
    put('신청번호', id);
    put('신청일시', new Date());
    put('성명', v.name);
    put('성별', v.gender);
    put('생년월일', v.birth);
    put('연락처', formatPhone_(v.phone));
    put('소속', v.org);
    put('실적등록처', v.system);
    put('실적ID', v.perfId);
    put('직업', v.job);
    put('주소', v.address);
    put('이메일', v.email);
    put('희망활동분야', v.hope);
    put('개인정보동의', v.c1);
    put('활동일지동의', v.c2);
    put('소식수신동의', v.c3);
    put('14세미만', under14 ? 'Y' : '');
    put('보호자동의', v.gConsent);
    put('보호자연락처', v.gPhone ? formatPhone_(v.gPhone.replace(/[^\d]/g, '')) : '');
    put('보호자관계', v.gRelation);
    put('신청자서명파일ID', sig.getId());
    put('상태', '확인대기');

    const n = sheet.getLastRow() + 1;
    sheet.getRange(n, 1, 1, APPLY_COLUMN_COUNT).setNumberFormat('@').setValues([row.map(function (x) {
      return x instanceof Date ? Utilities.formatDate(x, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm') : x;
    })]);

    return {
      success: true,
      applicationId: id,
      name: v.name,
      birthDate: v.birth,
      phoneLast4: four,
      organization: v.org,
      logAllowed: v.c2 === AGREE,
      eduUrl: BASIC_EDU_URL
    };
  } finally {
    lock.releaseLock();
  }
}


/* ============================================================
 * 관리자 화면
 * ============================================================ */

/** status: '확인대기'(기본) / '전체' */
function getApplications(status) {
  requireAdmin_();
  const list = readApplications_(ensureApplySheet_())
    .filter(function (a) { return status === '전체' ? true : a.status !== '등록완료'; })
    .map(function (a) {
      return {
        rowNumber: a.rowNumber, id: a.id, submittedAt: a.submittedAt, name: a.name,
        birthDate: a.birthDate, organization: a.org, status: a.status, under14: a.under14,
        logAllowed: a.c2 === AGREE, confirmer: a.confirmer, memo: a.memo
      };
    });
  list.sort(function (a, b) { return a.submittedAt < b.submittedAt ? 1 : -1; });
  return list;
}


function getApplicationDetail(rowNumber, id) {
  requireAdmin_();
  const a = getApplication_(Number(rowNumber), id);
  const out = Object.assign({}, a);
  out.signatureImage = imageDataUrl_(a.sigId);
  out.confirmerSignatureImage = a.confirmerSigId ? imageDataUrl_(a.confirmerSigId) : '';
  return out;
}


/**
 * 확인(확인자 서명) → 봉사자 명단 등록 → 그 전에 쓴 '명단에 없음' 일지 자동 연결 → PDF 보관
 * data: { rowNumber, id, edits:{...}, guardianVerified }
 */
function approveApplication(data) {
  const me = requireAdmin_();
  if (!me.signatureFileId) throw new Error('「내 정보」에서 확인자 서명을 먼저 등록해 주세요.');

  // 1) 시트 정리는 잠금 안에서 (PDF 만들기는 오래 걸려서 잠금 밖에서)
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let done;
  try {
    done = approveLocked_(me, data);
  } finally {
    lock.releaseLock();
  }

  // 2) PDF 보관 (실패해도 등록은 유지)
  let pdfNote = '';
  try {
    const file = saveApplicationPdf_(done.app);
    ensureApplySheet_().getRange(done.app.rowNumber, AP['보관PDF']).setValue(file.getId());
  } catch (err) {
    pdfNote = ' (PDF 보관은 실패했어요: ' + err.message + ' — 신청서 탭에서 다시 출력할 수 있어요)';
  }

  return {
    success: true,
    message: done.app.name + ' 님을 ' + (done.added ? '봉사자 명단에 등록했어요.' : '확인했어요. (봉사자 명단에는 이미 있었어요)') +
      (done.linked ? ' 그 전에 쓴 일지 ' + done.linked + '건도 연결했어요.' : '') + pdfNote
  };
}


function approveLocked_(me, data) {
  const sheet = ensureApplySheet_();
  const a = getApplication_(Number(data.rowNumber), data.id);
  if (a.status === '등록완료') throw new Error('이미 등록된 신청서예요.');

  // 담당자가 고친 내용 반영 (오타 등)
  const e = data.edits || {};
  const name = cleanText(e.name || a.name);
  const birth = cleanText(e.birthDate || a.birthDate);
  const phone = cleanText(e.phone || a.phone).replace(/[^\d]/g, '');
  const org = cleanText(e.organization != null ? e.organization : a.org);
  const system = e.perfSystem == null ? a.system : (['VMS', '1365'].indexOf(cleanText(e.perfSystem)) >= 0 ? cleanText(e.perfSystem) : '');
  const perfId = system ? cleanText(e.perfId != null ? e.perfId : a.perfId) : '';
  if (!name) throw new Error('성명이 비어 있어요.');
  parseDate(birth);
  if (!/^0\d{8,10}$/.test(phone)) throw new Error('연락처를 확인해 주세요.');
  if (system && !perfId) throw new Error(system + ' 아이디를 입력하거나, 실적등록처를 「없음」으로 바꿔 주세요.');
  if (a.under14 && !data.guardianVerified) throw new Error('14세 미만이에요. 보호자 동의를 확인한 뒤 「보호자 확인」에 체크해 주세요.');

  const four = phone.slice(-4);
  const n = a.rowNumber;
  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');

  // 신청서 한 줄을 읽어서 고칠 칸만 바꾼 뒤 한 번에 씀 (예전에는 칸마다 7번 따로 썼어요). 수식 칸은 그대로 둬요.
  const rowRange = sheet.getRange(n, 1, 1, APPLY_COLUMN_COUNT);
  const formulas = rowRange.getFormulas()[0];
  const row = rowRange.getValues()[0].map(function (v, i) { return formulas[i] || v; });
  const put = function (h, val) { row[AP[h] - 1] = val; };
  put('성명', name);
  put('생년월일', birth);
  put('연락처', formatPhone_(phone));
  put('소속', org);
  put('실적등록처', system);
  put('실적ID', perfId);
  if (a.under14) put('보호자확인', 'Y');
  put('상태', '등록완료');
  put('확인자', me.name || me.email);
  put('확인일시', now);
  put('확인자서명파일ID', me.signatureFileId);
  rowRange.setValues([row]);

  // 활동일지 「봉사자 명단」에 추가 (이미 있으면 그대로) → 그 전에 쓴 '명단에 없음' 일지 연결
  const added = addToVolunteerList_(name, birth, four, system, perfId, org, a.id);
  SpreadsheetApp.flush();
  const linked = linkRegisteredVolunteers_();

  return { app: getApplication_(n, a.id), added: added, linked: linked };
}


/** 보류 (메모 남김). 보류한 신청서도 나중에 확인할 수 있어요. */
function holdApplication(rowNumber, id, memo) {
  requireAdmin_();
  const a = getApplication_(Number(rowNumber), id);
  if (a.status === '등록완료') throw new Error('이미 등록된 신청서예요.');
  const sheet = ensureApplySheet_();
  sheet.getRange(a.rowNumber, AP['상태']).setValue('보류');
  sheet.getRange(a.rowNumber, AP['메모']).setValue(cleanText(memo));
  return { success: true };
}


/** 출력용 미리보기 (HTML만) */
function makeApplicationPrint(ids) {
  requireAdmin_();
  const apps = pickApplications_(ids);
  return { html: buildApplicationHtml_(apps, 'print'), count: apps.length, fileName: applicationFileName_(apps) };
}

/** [PDF 저장]을 누를 때만 변환 */
function makeApplicationPdfFile(ids) {
  requireAdmin_();
  const apps = pickApplications_(ids);
  const pdf = Utilities.newBlob(buildApplicationHtml_(apps), 'text/html', 'apply.html')
    .getAs('application/pdf').setName(applicationFileName_(apps));
  return { fileName: pdf.getName(), base64: Utilities.base64Encode(pdf.getBytes()) };
}


/* ============================================================
 * 내부 도구
 * ============================================================ */

function ensureApplySheet_() {
  const book = ss_();
  let sheet = book.getSheetByName(APPLY_SHEET_NAME);
  if (!sheet) {
    sheet = book.insertSheet(APPLY_SHEET_NAME);
    sheet.getRange(1, 1, 1, APPLY_COLUMN_COUNT).setValues([APPLY_HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return sheet;
  }
  const head = sheet.getRange(1, 1, 1, APPLY_COLUMN_COUNT).getDisplayValues()[0];
  if (APPLY_HEADERS.some(function (h, i) { return head[i] !== h; })) {
    throw new Error('「' + APPLY_SHEET_NAME + '」 탭 첫 행이 예상과 달라요. 칸 순서를 바꾸지 말아 주세요.');
  }
  return sheet;
}


function readApplications_(sheet) {
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, APPLY_COLUMN_COUNT).getDisplayValues()
    .map(function (r, i) { return toApplication_(r, i + 2); })
    .filter(function (a) { return a.id; });
}


function getApplication_(rowNumber, id) {
  const sheet = ensureApplySheet_();
  if (!Number.isInteger(rowNumber) || rowNumber < 2 || rowNumber > sheet.getLastRow()) throw new Error('신청서를 찾지 못했어요.');
  const a = toApplication_(sheet.getRange(rowNumber, 1, 1, APPLY_COLUMN_COUNT).getDisplayValues()[0], rowNumber);
  if (!a.id || (id && a.id !== cleanText(id))) throw new Error('신청서 정보가 바뀌었어요. 목록을 새로고침해 주세요.');
  return a;
}


function toApplication_(r, rowNumber) {
  const g = function (h) { return cleanText(r[AP[h] - 1]); };
  return {
    rowNumber: rowNumber,
    id: g('신청번호'),
    submittedAt: g('신청일시'),
    name: g('성명'),
    gender: g('성별'),
    birthDate: formatDateForInput(g('생년월일')),
    phone: g('연락처').replace(/[^\d]/g, ''),
    phoneText: g('연락처'),
    org: g('소속'),
    system: g('실적등록처'),
    perfId: g('실적ID'),
    job: g('직업'),
    address: g('주소'),
    email: g('이메일'),
    hope: g('희망활동분야'),
    c1: g('개인정보동의'),
    c2: g('활동일지동의'),
    c3: g('소식수신동의'),
    under14: g('14세미만') === 'Y',
    gConsent: g('보호자동의'),
    gPhone: g('보호자연락처'),
    gRelation: g('보호자관계'),
    gVerified: g('보호자확인') === 'Y',
    sigId: g('신청자서명파일ID'),
    status: g('상태') || '확인대기',
    confirmer: g('확인자'),
    confirmedAt: g('확인일시'),
    confirmerSigId: g('확인자서명파일ID'),
    memo: g('메모'),
    peopleId: g('PEOPLE ID'),
    pdfId: g('보관PDF')
  };
}


function pickApplications_(ids) {
  const want = (ids || []).map(cleanText).filter(Boolean);
  if (!want.length) throw new Error('출력할 신청서를 골라 주세요.');
  if (want.length > 50) throw new Error('한 번에 50장까지 출력할 수 있어요.');
  const all = readApplications_(ensureApplySheet_());
  const apps = want.map(function (id) { return all.find(function (a) { return a.id === id; }); }).filter(Boolean);
  if (!apps.length) throw new Error('신청서를 찾지 못했어요.');
  return apps;
}


function applicationFileName_(apps) {
  return cleanFileName(apps.length === 1
    ? '자원봉사신청서_' + apps[0].name + '_' + apps[0].submittedAt.slice(0, 10) + '.pdf'
    : '자원봉사신청서_' + apps.length + '명_' + todayText_() + '.pdf');
}


function createApplyId_(sheet) {
  const prefix = 'AP-' + todayText_().replace(/-/g, '') + '-';
  let max = 0;
  if (sheet.getLastRow() >= 2) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues().flat().forEach(function (id) {
      if (String(id).startsWith(prefix)) max = Math.max(max, Number(String(id).slice(prefix.length)) || 0);
    });
  }
  return prefix + String(max + 1).padStart(3, '0');
}


/** 「봉사자 명단」에 한 줄 추가. A열(표시이름 수식)은 건드리지 않음. 이미 있으면 false */
function addToVolunteerList_(name, birth, four, system, perfId, org, applyId) {
  const sheet = getRequiredSheet(ss_(), VOLUNTEER_SHEET_NAME);
  const maxRow = Math.max(sheet.getLastRow(), 1);
  const rows = maxRow > 1 ? sheet.getRange(2, 2, maxRow - 1, 4).getValues() : []; // B~E
  let lastDataRow = 1;
  let exists = -1;
  rows.forEach(function (r, i) {
    if (cleanText(r[0])) lastDataRow = i + 2;
    if (normalizeName_(r[0]) === normalizeName_(name) && cleanText(r[2]).padStart(4, '0') === four) exists = i + 2;
  });

  if (exists > 0) {
    // 이미 있음 → 사용 중으로 바꾸고 빈 칸만 채움
    const cur = sheet.getRange(exists, 2, 1, 7).getValues()[0]; // B~H
    sheet.getRange(exists, 5).setValue('Y');
    if (!cleanText(cur[1])) sheet.getRange(exists, 3).setValue(birth);
    if (!cleanText(cur[4]) && system) sheet.getRange(exists, 6, 1, 2).setValues([[system, perfId]]);
    if (!cleanText(cur[6]) && org) sheet.getRange(exists, 8).setValue(org);
    return false;
  }

  const n = lastDataRow + 1;
  if (sheet.getMaxRows() < n) sheet.insertRowsAfter(sheet.getMaxRows(), n - sheet.getMaxRows());
  sheet.getRange(n, 4).setNumberFormat('@'); // 0으로 시작하는 뒤4자리 보존
  sheet.getRange(n, 2, 1, 8).setValues([[name, birth, four, 'Y', system, perfId, org, '신청서 ' + applyId]]);
  return true;
}


function saveApplicationPdf_(a) {
  const html = buildApplicationHtml_([a]);
  const pdf = Utilities.newBlob(html, 'text/html', 'apply.html').getAs('application/pdf')
    .setName(applicationFileName_([a]));
  const folder = childFolder_(childFolder_(archiveRootFolder_(), '신청서'), a.submittedAt.slice(0, 4) + '년');
  if (a.pdfId) {
    try { DriveApp.getFileById(a.pdfId).setTrashed(true); } catch (e) { /* 예전 파일이 없으면 넘어감 */ }
  }
  return folder.createFile(pdf);
}


function ageOn_(birth, onDate) {
  const b = birth.split('-').map(Number);
  const t = onDate.split('-').map(Number);
  return t[0] - b[0] - ((t[1] < b[1] || (t[1] === b[1] && t[2] < b[2])) ? 1 : 0);
}

function formatPhone_(digits) {
  const d = String(digits).replace(/[^\d]/g, '');
  if (d.length === 11) return d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7);
  if (d.length === 10) return d.startsWith('02') ? d.slice(0, 2) + '-' + d.slice(2, 6) + '-' + d.slice(6) : d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6);
  if (d.length === 9) return d.slice(0, 2) + '-' + d.slice(2, 5) + '-' + d.slice(5);
  return d;
}


/** 종이 「자원봉사활동 신청서」와 같은 모양 (A4 한 장에 한 명)
 *  mode 'print' = 화면에서 바로 인쇄: 컴퓨터 글꼴에 따라 조금 커질 수 있어서 간격을 덜 늘려요 (PDF 저장은 한 장을 더 꽉 채워요) */
function buildApplicationHtml_(apps, mode) {
  const box = function (on) { return '<span class="bx' + (on ? ' on' : '') + '">' + (on ? '■' : '') + '</span>'; };
  const yn = function (v) {
    return '<tr><td class="lab">동의함</td><td class="c">' + box(v === AGREE) + '</td>' +
      '<td class="lab">동의하지않음</td><td class="c">' + box(v === DISAGREE) + '</td></tr>';
  };
  const img = function (id) {
    const url = id ? imageDataUrl_(id) : '';
    return url ? '<img src="' + url + '" class="sig">' : '';
  };

  const pages = apps.map(function (a) {
    const date = (a.submittedAt || '').slice(0, 10).split('-');
    return '<div class="page">' +
      '<div class="top">' + (BASIC_EDU_QR ? '<img class="qr" src="' + BASIC_EDU_QR + '">' : '') +
      '<h1>자원봉사활동 신청서</h1>' +
      '<p class="intro">자원봉사자님! 참 좋은 인연입니다. ' + ORG_NAME + '의 자원봉사자로 귀한 시간과 열정을 나누어주셔서 감사합니다.<br>' +
      '자원봉사활동을 시작하기에 앞서, 자원봉사자님의 수고가 잘 기록될 수 있도록 개인정보 등록과 함께 자원봉사 기본 교육에 참여해주세요.' +
      (BASIC_EDU_QR ? '<br>오른쪽 QR코드로 바로 참여 가능합니다.' : '') + '</p></div>' +

      '<table class="t"><colgroup><col style="width:11%"><col style="width:16%"><col style="width:25%"><col style="width:20%"><col style="width:8%"><col style="width:20%"></colgroup>' +
      '<tr><th rowspan="4">필수정보</th><th>성명</th><td>' + esc_(a.name) + '</td><th>성별</th><td colspan="2">' + esc_(a.gender) + '</td></tr>' +
      '<tr><th>생년월일</th><td>' + esc_(a.birthDate) + '</td><th rowspan="2">VMS / 1365 ID<div class="sm">(봉사시간 인증 필요 시)</div></th>' +
      '<td class="c">' + box(a.system === 'VMS') + '</td><td>VMS</td></tr>' +
      '<tr><th>연락처</th><td>' + esc_(a.phoneText) + '</td><td class="c">' + box(a.system === '1365') + '</td><td>1365</td></tr>' +
      '<tr><th>소속</th><td>' + esc_(a.org) + '</td><td colspan="3" class="l">ID: ' + esc_(a.perfId) + '</td></tr>' +
      '</table>' +
      '<div class="note">※ 필수 정보는 자원봉사자 확인 및 활동 관리, 실적 인증을 위해 필요합니다.</div>' +

      '<table class="t" style="margin-top:4mm"><colgroup><col style="width:11%"><col style="width:16%"><col></colgroup>' +
      '<tr><th rowspan="4">선택정보</th><th>직업</th><td class="l">' + esc_(a.job) + '</td></tr>' +
      '<tr><th>주소</th><td class="l">' + esc_(a.address) + '</td></tr>' +
      '<tr><th>이메일</th><td class="l">' + esc_(a.email) + '</td></tr>' +
      '<tr><th>희망 활동 분야</th><td class="l">' + esc_(a.hope) + '</td></tr>' +
      '</table>' +

      '<div class="law">' + ORG_NAME + '은 「개인정보보호법」 등 관계 법령에 따라 자원봉사자 이력관리, 봉사활동 배치 및 실적 등록, 확인서 발급을 위하여 아래와 같이 개인정보를 수집 및 이용하고자 합니다.<br>' +
      '1. 개인정보의 수집·이용 목적 : 자원봉사 신청 및 관리, 봉사활동 배치, 실적 등록 및 확인서 발급<br>' +
      '2. 수집하는 개인정보의 항목<br>&nbsp;- 필수정보 : 성명, 성별, 생년월일, VMS ID, 연락처, 소속<br>&nbsp;- 선택정보 : 직업, 주소, 이메일, 희망 활동 분야<br>' +
      '3. 개인정보의 보유·이용 기간 : 봉사활동일로부터 3년<br>' +
      '4. 개인정보 제3자 제공에 관한 사항<br>&nbsp;- 자원봉사 실적 등록 및 행정 관리를 위하여 1365 자원봉사포털 및 VMS에 개인정보가 제공될 수 있습니다.<br>' +
      '5. 귀하는 개인정보 수집·이용에 동의하지 않으실 수 있습니다. 동의 거부 시에도 봉사신청은 가능하나 서비스는 제한될 수 있습니다. (단, 최소한의 정보인 필수정보 미 입력 시에는 신청불가)</div>' +

      '<div class="q">□ 위와 같이 개인정보를 수집 및 이용하는데 동의하십니까?</div><table class="t yn">' + yn(a.c1) + '</table>' +
      '<div class="q">□ 자원봉사활동 후 활동일지에 성명, 생년월일, 연락처 등의 개인정보를 수집 및 이용하는데 동의하십니까?</div><table class="t yn">' + yn(a.c2) + '</table>' +
      '<div class="q">□ 귀하의 연락처 포함 정보를 활용하여 복지관 자원봉사 관련 소식을 받아보시는데 동의하십니까?</div><table class="t yn">' + yn(a.c3) + '</table>' +

      '<table class="t kid"><tr><td colspan="6" class="l">※ 14세 미만 아동의 경우<br>□ 14세 미만 아동의 개인정보를 처리하기 위해서는 보호자의 동의가 필요합니다. 해당 아동의 개인정보를 수집 및 이용하는데 동의하십니까?</td></tr>' +
      '<tr><td class="lab">동의함</td><td class="c">' + box(a.under14 && a.gConsent === AGREE) + '</td><td class="lab" colspan="2">동의하지않음</td><td class="c" colspan="2">' + box(false) + '</td></tr>' +
      '<tr><th>보호자 :</th><td class="lab">연락처</td><td>' + esc_(a.gPhone) + '</td><td class="lab">관계 ' + esc_(a.gRelation) + '</td><td class="lab">보호자확인</td><td class="c">' + box(a.gVerified) + '</td></tr></table>' +

      '<div class="date">' + (date.length === 3 ? date[0] + ' 년 &nbsp; ' + Number(date[1]) + ' 월 &nbsp; ' + Number(date[2]) + ' 일' : '년 &nbsp; 월 &nbsp; 일') + '</div>' +
      '<table class="sign"><tr><td class="who">신청자</td><td class="nm">' + esc_(a.name) + '</td><td class="im">' + img(a.sigId) + '</td><td class="in">(인)</td></tr>' +
      '<tr><td class="who">확인자</td><td class="nm">' + esc_(a.confirmer) + '</td><td class="im">' + img(a.confirmerSigId) + '</td><td class="in">(인)</td></tr></table>' +
      '<div class="foot"><span class="pr">전자 신청서 · 신청번호 ' + esc_(a.id) + '</span>' +
      (LOGO_DATA_URL ? '<img class="logo" src="' + LOGO_DATA_URL + '">' : '<b>' + ORG_NAME + '</b>') + '</div>' +
      '</div>';
  });

  return '<html><head><meta charset="utf-8"><style>' +
    '@page{size:A4;margin:11mm 13mm 9mm 13mm}' +
    '@media screen{body{padding:18px;max-width:760px;margin:0 auto}.page{margin-bottom:40px}}' +
    'body{font-family:"Noto Sans KR","Malgun Gothic",sans-serif;color:#000;margin:0;font-size:9pt}' +
    '.page{page-break-after:always}.page:last-child{page-break-after:auto}' +
    '.top{overflow:hidden;margin-bottom:6px}' +
    '.top .qr{float:right;width:25mm;height:25mm;margin-left:4mm}' +
    'h1{text-align:center;font-size:18pt;margin:0 0 6px}' +
    '.intro{font-size:8.5pt;line-height:1.45;margin:0}' +
    'table.t{width:100%;border-collapse:collapse;table-layout:fixed}' +
    'table.t th,table.t td{border:1px solid #000;padding:2px 4px;height:8mm;text-align:center;vertical-align:middle;font-size:9pt;word-wrap:break-word}' +
    'table.t th{background:#dce4ef;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '@media print{th,.lab{-webkit-print-color-adjust:exact;print-color-adjust:exact}}' +
    'td.l{text-align:left}.c{text-align:center}.sm{font-size:6.5pt;font-weight:normal}' +
    '.lab{background:#dce4ef;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.note{text-align:right;font-size:7.5pt;margin-top:2px}' +
    '.law{font-size:7.5pt;line-height:1.4;margin:5mm 0 1mm}' +
    '.q{font-weight:bold;font-size:8.5pt;margin:2.5mm 0 1.5mm}' +
    'table.yn td{height:7mm}table.kid{margin-top:4mm}table.kid td,table.kid th{height:7mm;font-size:8.5pt}' +
    '.bx{display:inline-block;width:11px;height:11px;line-height:10px;border:1.3px solid #000;font-size:12px;text-align:center;overflow:hidden;font-family:"Malgun Gothic","Noto Sans KR",sans-serif}' +
    '.bx.on{background:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.date{text-align:center;font-weight:bold;font-size:11pt;margin:6mm 0 2mm}' +
    'table.sign{margin-left:auto;border-collapse:collapse}table.sign td{padding:0 6px;height:12mm;vertical-align:middle;font-size:10.5pt}' +
    'td.who{font-weight:bold}td.nm{min-width:28mm}td.im{width:38mm;text-align:center}td.in{font-weight:bold}' +
    '.sig{max-height:11mm;max-width:36mm}' +
    '.foot{margin-top:3mm;overflow:hidden}.foot .pr{float:left;font-size:7pt;color:#777;padding-top:6px}.foot .logo{float:right;height:20px}' +
    (mode === 'print' ? 'table.t th,table.t td{height:7.5mm}table.yn td,table.kid td,table.kid th{height:6.5mm}table.kid{margin-top:3mm}' +
      '.law{margin:4mm 0 1mm}.q{margin:2mm 0 1mm}.date{margin:4mm 0 2mm}' : '') +
    '</style></head><body>' + pages.join('') + '</body></html>';
}
