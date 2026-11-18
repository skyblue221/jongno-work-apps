/****************************************************************
 * 자원봉사활동 신청서 (처음 오신 분)
 *  - 봉사자 화면 「처음 오셨나요?」 → 신청서 작성·서명 → 「자원봉사 신청서」 탭에 '확인대기'
 *  - 관리자 화면 「신청서」 → 확인(확인자 서명) → 「봉사자 명단」에 등록 + 그 전에 쓴 일지 자동 연결
 *  - 통합관리 PEOPLE에는 통합관리 쪽 명단연동(매일 밤)이 '등록완료' 신청서를 가져가 넣어요.
 *  - 종이 신청서와 같은 모양으로 출력(PDF)할 수 있고, 확인하면 드라이브에도 PDF로 보관돼요.
 ****************************************************************/

const APPLY_SHEET_NAME = '자원봉사 신청서';

/* 자원봉사 기본 교육 주소. 종이 신청서 QR이 가리키는 주소를 넣으면 신청 완료 화면에 「기본 교육 참여하기」 버튼이 생겨요. */
const BASIC_EDU_URL = '';

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

  sheet.getRange(n, AP['성명']).setValue(name);
  sheet.getRange(n, AP['생년월일']).setValue(birth);
  sheet.getRange(n, AP['연락처']).setValue(formatPhone_(phone));
  sheet.getRange(n, AP['소속']).setValue(org);
  sheet.getRange(n, AP['실적등록처'], 1, 2).setValues([[system, perfId]]);
  if (a.under14) sheet.getRange(n, AP['보호자확인']).setValue('Y');
  sheet.getRange(n, AP['상태'], 1, 4).setValues([['등록완료', me.name || me.email, now, me.signatureFileId]]);

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
  return { html: buildApplicationHtml_(apps), count: apps.length, fileName: applicationFileName_(apps) };
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


/** 종이 「자원봉사활동 신청서」와 같은 모양 (A4 한 장에 한 명) */
function buildApplicationHtml_(apps) {
  const box = function (on) { return '<span class="bx' + (on ? ' on' : '') + '">' + (on ? 'V' : '') + '</span>'; };
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
      '<h1>자원봉사활동 신청서</h1>' +
      '<p class="intro">자원봉사자님! 참 좋은 인연입니다. ' + ORG_NAME + '의 자원봉사자로 귀한 시간과 열정을 나누어주셔서 감사합니다.<br>' +
      '자원봉사활동을 시작하기에 앞서, 자원봉사자님의 수고가 잘 기록될 수 있도록 개인정보 등록과 함께 자원봉사 기본 교육에 참여해주세요.</p>' +

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
    'h1{text-align:center;font-size:18pt;margin:0 0 6px}' +
    '.intro{font-size:8.5pt;line-height:1.45;margin:0 0 6px}' +
    'table.t{width:100%;border-collapse:collapse;table-layout:fixed}' +
    'table.t th,table.t td{border:1px solid #000;padding:2px 4px;height:7mm;text-align:center;vertical-align:middle;font-size:9pt;word-wrap:break-word}' +
    'table.t th{background:#dce4ef;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '@media print{th,.lab{-webkit-print-color-adjust:exact;print-color-adjust:exact}}' +
    'td.l{text-align:left}.c{text-align:center}.sm{font-size:6.5pt;font-weight:normal}' +
    '.lab{background:#dce4ef;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.note{text-align:right;font-size:7.5pt;margin-top:2px}' +
    '.law{font-size:7.5pt;line-height:1.4;margin:4mm 0 1mm}' +
    '.q{font-weight:bold;font-size:8.5pt;margin:2mm 0 1mm}' +
    'table.yn td{height:6mm}table.kid{margin-top:3mm}table.kid td,table.kid th{height:6mm;font-size:8.5pt}' +
    '.bx{display:inline-block;width:11px;height:11px;line-height:11px;border:1.3px solid #000;font-size:8px;font-weight:bold;text-align:center}' +
    '.date{text-align:center;font-weight:bold;font-size:11pt;margin:4mm 0 2mm}' +
    'table.sign{margin-left:auto;border-collapse:collapse}table.sign td{padding:0 6px;height:12mm;vertical-align:middle;font-size:10.5pt}' +
    'td.who{font-weight:bold}td.nm{min-width:28mm}td.im{width:38mm;text-align:center}td.in{font-weight:bold}' +
    '.sig{max-height:11mm;max-width:36mm}' +
    '.foot{margin-top:3mm;overflow:hidden}.foot .pr{float:left;font-size:7pt;color:#777;padding-top:6px}.foot .logo{float:right;height:20px}' +
    '</style></head><body>' + pages.join('') + '</body></html>';
}
