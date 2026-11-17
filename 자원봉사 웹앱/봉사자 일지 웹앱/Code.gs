/****************************************************************
 * 자원봉사 활동일지 웹앱 (전자 서명 일지)
 *  - 봉사자 화면(Index): 누구나 열 수 있는 배포 주소
 *  - 담당자 화면(Admin): 기관 구글 계정으로만 여는 배포 주소 (?page=admin)
 *
 * 흐름: 봉사자 서명 → 담당자 확인(대직 가능) → 팀장 확인 → (min) 실적 입력 체크
 *       서명이 모두 끝난 일지는 매달 봉사자별 PDF로 드라이브에 자동 보관
 ****************************************************************/

const ACTIVITY_LOG_BUILD = '활동일지 v2.3 · 담당자 출력';
const CONTENT_SHEET_NAME = '활동내용 문구';
const CONTENT_HEADERS = ['프로그램', '활동내용', '사용(Y/N)'];

const SPREADSHEET_ID = '1scZtNXhW6_6IaQhlEKGgfrd8ZXdaiZ_nql2PTYl0vMk';

const ACTIVITY_SHEET_NAME = '활동원본';
const VOLUNTEER_SHEET_NAME = '봉사자 명단';
const STAFF_SHEET_NAME = '담당자명단';
const REPORT_SHEET_NAME = '2026 자원봉사 활동일지(양식)';

const SIGNATURE_FOLDER_ID = '1IgfO7h7Uxn7cZyXcozxhDeA4DG3-SMnn';

/* PDF 보관 폴더 ID. 비워 두면 setupAll() 때 내 드라이브에 '자원봉사 활동일지 보관' 폴더를 자동으로 만들어요. */
const ARCHIVE_FOLDER_ID = '';

/* 담당자 화면 배포 주소(…/exec). 알림 메일의 '확인하러 가기' 링크로 들어가요. */
const ADMIN_URL = 'https://script.google.com/a/macros/jpurme.org/s/AKfycbylVUGsuwSKaghtvKRkRs35w0ToNb68r-MBeOpOS8y_mwGaFtCRtSiRZB-Lsi1YPdpq6w/exec?page=admin';

/* 알림 메일 보내는 날(매달). 13·28일 = 마감 전, 16·1일 = 마감 지난 일지 다시 알림 */
const REMIND_DAYS = [13, 16, 28, 1];

const ORG_NAME = '종로장애인복지관';

const ACTIVITY_COLUMNS = {
  LOG_ID: 1,
  SUBMITTED_AT: 2,
  VOLUNTEER_NAME: 3,
  BIRTH_DATE: 4,
  PHONE_LAST4: 5,
  ACTIVITY_DATE: 6,
  DAY_OF_WEEK: 7,
  PROGRAM: 8,
  ACTIVITY_CONTENT: 9,
  START_TIME: 10,
  END_TIME: 11,
  MEAL_STATUS: 12,
  CALCULATED_TIME: 13,
  FINAL_APPROVED_TIME: 14,
  SIGNATURE_FILE_ID: 15,
  SIGNATURE_FILE_URL: 16,
  STAFF_CONFIRM_STATUS: 17,
  STAFF_NAME: 18,
  STAFF_CONFIRMED_AT: 19,
  STAFF_SIGNATURE_FILE_ID: 20,
  STAFF_SIGNATURE_FILE_URL: 21,
  TEAM_LEADER_CONFIRM_STATUS: 22,
  TEAM_LEADER_NAME: 23,
  VMS_1365_REGISTRATION_STATUS: 24, // 실적 입력: '미등록' / '등록완료'
  NOTE: 25,
  REGISTRATION_TYPE: 26,
  ORGANIZATION: 27,
  // ── 새로 추가된 칸 ──
  ASSIGNED_STAFF: 28,          // 기본 담당자(프로그램 기준)
  CONFIRM_TYPE: 29,            // '대직' 이면 기본 담당자가 아닌 사람이 확인
  CONFIRM_TEAM: 30,            // 확인한 담당자의 팀 (팀장 확인 대상 결정)
  LEADER_CONFIRMED_AT: 31,
  LEADER_SIGNATURE_FILE_ID: 32,
  INPUT_AT: 33,                // 실적 입력 체크 일시
  INPUT_BY: 34,
  PERF_SYSTEM: 35,             // VMS / 1365
  PERF_ID: 36,
  PDF_FILE_ID: 37              // 월별 보관 PDF
};
const ACTIVITY_COLUMN_COUNT = 37;

const NEW_ACTIVITY_HEADERS = [
  '기본담당자', '확인구분', '확인팀', '팀장확인일시', '팀장서명파일ID',
  '실적입력일시', '실적입력자', '실적시스템', '실적ID', '보관PDF'
];

const STAFF_COLUMNS = {
  STAFF_ID: 1,
  STAFF_NAME: 2,
  EMAIL: 3,
  SIGNATURE_FILE_ID: 4,
  SIGNATURE_FILE_URL: 5,
  ACTIVE: 6,
  TEAM: 7,
  ROLE: 8,          // 담당자 / 팀장 / 관리자
  PROGRAMS: 9,      // 담당 프로그램 (쉼표로 구분)
  SUBSTITUTE: 10,   // 대직자 이름
  SUB_FROM: 11,
  SUB_TO: 12
};
const STAFF_COLUMN_COUNT = 12;
const STAFF_HEADERS = [
  '담당자ID', '이름', '이메일', '서명파일ID', '서명파일URL', '사용(Y/N)',
  '팀', '역할', '담당 프로그램', '대직자', '대직 시작', '대직 종료'
];

const ROLES = ['담당자', '팀장', '관리자'];


/* ============================================================
 * 화면 열기
 * ============================================================ */
function doGet(e) {
  const page = e && e.parameter && e.parameter.page
    ? String(e.parameter.page).trim().toLowerCase()
    : 'index';

  if (page === 'admin') {
    return HtmlService.createHtmlOutputFromFile('Admin')
      .setTitle('자원봉사 활동일지 담당자')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('자원봉사 활동일지')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}


/* ============================================================
 * 봉사자 화면 (누구나 호출 가능 → 개인정보를 돌려주지 않음)
 * ============================================================ */

/** 이름 + 연락처 뒤 4자리가 모두 맞을 때만 본인 확인. 생년월일은 돌려주지 않음 */
function findVolunteer(name, phoneLast4) {
  const targetName = normalizeName_(name);
  const targetPhone = cleanText(phoneLast4);

  if (!targetName || !/^\d{4}$/.test(targetPhone)) {
    throw new Error('이름과 연락처 뒤 4자리를 입력해 주세요.');
  }

  const sheet = getRequiredSheet(ss_(), VOLUNTEER_SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { found: false };

  const values = sheet.getRange(2, 1, lastRow - 1, 9).getValues();

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const rowName = normalizeName_(row[1]);
    const rowPhone = cleanText(row[3]).padStart(4, '0');
    const active = cleanText(row[4]).toUpperCase();

    if (active === 'Y' && rowName === targetName && rowPhone === targetPhone) {
      return {
        found: true,
        token: i + 2,
        name: cleanText(row[1]),
        organization: cleanText(row[7])
      };
    }
  }

  return { found: false };
}


function saveActivityLog(data) {
  validateActivityData(data);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const spreadsheet = ss_();
    const activitySheet = getRequiredSheet(spreadsheet, ACTIVITY_SHEET_NAME);
    const volunteerSheet = getRequiredSheet(spreadsheet, VOLUNTEER_SHEET_NAME);

    let volunteer;

    if (data.registrationType === '등록봉사자') {
      volunteer = findVolunteerByRow(volunteerSheet, Number(data.volunteerRow));

      if (
        !volunteer ||
        normalizeName_(volunteer.name) !== normalizeName_(data.verifyName) ||
        volunteer.phoneLast4 !== cleanText(data.verifyPhone)
      ) {
        throw new Error('봉사자 확인 정보가 맞지 않아요. 이름과 연락처 뒤 4자리로 다시 확인해 주세요.');
      }
    } else if (data.registrationType === '미등록봉사자') {
      volunteer = {
        name: cleanText(data.unregisteredName),
        birthDate: parseDate(data.unregisteredBirthDate),
        phoneLast4: cleanText(data.unregisteredPhoneLast4),
        organization: cleanText(data.unregisteredOrganization),
        performanceSystem: '',
        performanceId: ''
      };
    } else {
      throw new Error('봉사자 등록구분을 확인해 주세요.');
    }

    const activityDate = parseDate(data.activityDate);
    const calculatedMinutes = calculateActivityMinutes(data.startTime, data.endTime);

    if (cleanText(data.activityDate) > todayText_()) {
      throw new Error('오늘 이후 날짜는 고를 수 없어요. 활동일을 확인해 주세요.');
    }

    // 같은 사람·같은 날·같은 시간 일지가 이미 있으면 막기 (반려된 건 제외)
    const dup = readActivity_().find(function (r) {
      return r.staffStatus !== '반려' &&
        normalizeName_(r.name) === normalizeName_(volunteer.name) &&
        r.phone === cleanText(volunteer.phoneLast4).padStart(4, '0') &&
        r.dateText === cleanText(data.activityDate) &&
        r.start === cleanText(data.startTime) &&
        r.end === cleanText(data.endTime);
    });
    if (dup) {
      throw new Error('같은 날, 같은 시간으로 이미 제출된 일지가 있어요 (일지번호 ' + dup.logId + '). 다시 낼 필요 없어요!');
    }

    if (calculatedMinutes <= 0) {
      throw new Error('종료시간은 시작시간보다 늦어야 합니다.');
    }

    const program = cleanText(data.program);
    const assigned = findAssignedStaff_(readStaff_(), program);
    const logId = createLogId(activitySheet, activityDate);

    const signatureFile = saveSignatureImage_({
      signatureData: data.signature,
      activityDate: data.activityDate,
      name: volunteer.name,
      logId: logId
    });

    const row = new Array(ACTIVITY_COLUMN_COUNT).fill('');
    const C = ACTIVITY_COLUMNS;
    row[C.LOG_ID - 1] = logId;
    row[C.SUBMITTED_AT - 1] = new Date();
    row[C.VOLUNTEER_NAME - 1] = volunteer.name;
    row[C.BIRTH_DATE - 1] = volunteer.birthDate;
    row[C.PHONE_LAST4 - 1] = volunteer.phoneLast4;
    row[C.ACTIVITY_DATE - 1] = activityDate;
    row[C.DAY_OF_WEEK - 1] = getKoreanDay(activityDate);
    row[C.PROGRAM - 1] = program;
    row[C.ACTIVITY_CONTENT - 1] = cleanText(data.activityContent);
    row[C.START_TIME - 1] = cleanText(data.startTime);
    row[C.END_TIME - 1] = cleanText(data.endTime);
    row[C.MEAL_STATUS - 1] = cleanText(data.mealStatus);
    row[C.CALCULATED_TIME - 1] = minutesToSheetTime(calculatedMinutes);
    row[C.SIGNATURE_FILE_ID - 1] = signatureFile.getId();
    row[C.SIGNATURE_FILE_URL - 1] = signatureFile.getUrl();
    row[C.STAFF_CONFIRM_STATUS - 1] = '확인대기';
    row[C.TEAM_LEADER_CONFIRM_STATUS - 1] = '확인대기';
    row[C.VMS_1365_REGISTRATION_STATUS - 1] = '미등록';
    row[C.REGISTRATION_TYPE - 1] = data.registrationType;
    row[C.ORGANIZATION - 1] = volunteer.organization || '';
    row[C.ASSIGNED_STAFF - 1] = assigned ? assigned.name : '';
    row[C.PERF_SYSTEM - 1] = volunteer.performanceSystem || '';
    row[C.PERF_ID - 1] = volunteer.performanceId || '';

    ensureActivityColumns_(activitySheet);
    const newRow = activitySheet.getLastRow() + 1;
    activitySheet.getRange(newRow, 1, 1, ACTIVITY_COLUMN_COUNT).setValues([row]);
    formatActivityRow_(activitySheet, newRow);

    return {
      success: true,
      logId: logId,
      volunteerName: volunteer.name,
      activityTimeText: formatMinutes(calculatedMinutes),
      mealStatus: cleanText(data.mealStatus)
    };
  } finally {
    lock.releaseLock();
  }
}


function validateActivityData(data) {
  if (!data) throw new Error('제출된 정보가 없습니다.');
  if (!data.registrationType) throw new Error('등록 봉사자인지 명단에 없는지 선택해 주세요.');

  if (data.registrationType === '등록봉사자' && !data.volunteerRow) {
    throw new Error('이름과 연락처 뒤 4자리로 본인 확인을 먼저 해 주세요.');
  }

  if (data.registrationType === '미등록봉사자') {
    if (!cleanText(data.unregisteredName)) throw new Error('성명을 입력해 주세요.');
    if (!data.unregisteredBirthDate) throw new Error('생년월일을 입력해 주세요.');
    if (!/^\d{4}$/.test(cleanText(data.unregisteredPhoneLast4))) {
      throw new Error('연락처 뒤 4자리를 숫자 4자리로 입력해 주세요.');
    }
  }

  [
    ['activityDate', '활동일'],
    ['program', '봉사프로그램'],
    ['activityContent', '활동내용'],
    ['startTime', '시작시간'],
    ['endTime', '종료시간'],
    ['mealStatus', '식사 여부'],
    ['signature', '서명']
  ].forEach(function (item) {
    if (!data[item[0]] || String(data[item[0]]).trim() === '') {
      throw new Error(item[1] + '을(를) 입력해 주세요.');
    }
  });

  parseDate(data.activityDate);
  if(cleanText(data.activityDate)>todayText_())throw new Error('오늘 이후 날짜는 고를 수 없어요. 활동일을 확인해 주세요.');
  if(data.registrationType==='미등록봉사자'){
    parseDate(data.unregisteredBirthDate);
    if(cleanText(data.unregisteredBirthDate)>todayText_())throw new Error('생년월일은 오늘 이후 날짜로 입력할 수 없어요.');
  }

  if (!String(data.signature).startsWith('data:image/png;base64,')) {
    throw new Error('서명 이미지 형식이 올바르지 않습니다.');
  }
}


/** 봉사자 화면 프로그램 목록: 담당자 관리에 등록된 프로그램 (등록된 게 없으면 지금까지 제출된 프로그램) */
function getProgramList() {
  const set = new Set();

  readStaff_().forEach(function (s) {
    if (s.active) s.programs.forEach(function (p) { set.add(p); });
  });

  if (!set.size) {
    const sheet = getRequiredSheet(ss_(), ACTIVITY_SHEET_NAME);
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      sheet.getRange(2, ACTIVITY_COLUMNS.PROGRAM, lastRow - 1, 1)
        .getDisplayValues().flat()
        .forEach(function (v) { if (cleanText(v)) set.add(cleanText(v)); });
    }
  }

  return Array.from(set).sort(function (a, b) { return a.localeCompare(b, 'ko'); });
}


function getActivityContentList(program) {
  const sheet=ss_().getSheetByName(CONTENT_SHEET_NAME);
  if(!sheet||sheet.getLastRow()<2)return [];
  const target=normalizeName_(program);
  return Array.from(new Set(sheet.getRange(2,1,sheet.getLastRow()-1,3).getDisplayValues()
    .filter(r=>cleanText(r[2]).toUpperCase()==='Y')
    .filter(r=>!normalizeName_(r[0])||normalizeName_(r[0])==='*'||(target&&normalizeName_(r[0])===target))
    .map(r=>cleanText(r[1])).filter(Boolean))).slice(0,12);
}

function ensureActivityContentSheet_() {
  const book=ss_();let sheet=book.getSheetByName(CONTENT_SHEET_NAME);
  if(!sheet)sheet=book.insertSheet(CONTENT_SHEET_NAME);
  if(sheet.getLastRow()===0){sheet.getRange(1,1,1,3).setValues([CONTENT_HEADERS]);sheet.setFrozenRows(1);}
  const headers=sheet.getRange(1,1,1,3).getDisplayValues()[0];
  if(CONTENT_HEADERS.some((name,i)=>headers[i]!==name))throw new Error('활동내용 문구 탭의 첫 행을 프로그램 / 활동내용 / 사용(Y/N)으로 맞춰 주세요.');
  return sheet;
}

function getActivityLogBuildInfo(){return {buildVersion:ACTIVITY_LOG_BUILD};}


/* ============================================================
 * 담당자 화면 — 로그인(기관 구글 계정)
 * ============================================================ */

function getAdminInit() {
  const me = currentUser_();
  const staff = readStaff_().filter(function (s) { return s.active; });

  return {
    buildVersion:ACTIVITY_LOG_BUILD,
    me: publicMe_(me),
    staffNames: staff.map(function (s) { return s.name; }),
    teams: Array.from(new Set(staff.map(function (s) { return s.team; }).filter(Boolean))),
    period: currentPeriod_()
  };
}


function currentUser_() {
  const email = cleanText(Session.getActiveUser().getEmail()).toLowerCase();

  if (!email) {
    throw new Error('기관 구글 계정으로 로그인한 상태에서 담당자용 주소로 열어 주세요.');
  }

  const owner = cleanText(Session.getEffectiveUser().getEmail()).toLowerCase();
  const staff = readStaff_();
  let me = staff.find(function (s) { return s.active && s.email === email; });

  if (!me && email !== owner) {
    throw new Error('담당자로 등록되지 않은 계정이에요 (' + email + '). 자원봉사 담당자에게 등록을 요청해 주세요.');
  }

  if (!me) {
    me = {
      rowNumber: 0, staffId: '', name: '', email: email, team: '', role: '관리자',
      programs: [], signatureFileId: '', active: true, substitute: '', subFrom: '', subTo: ''
    };
  }

  me.isOwner = email === owner;
  me.isAdmin = me.isOwner || me.role === '관리자';
  me.isLeader = me.role === '팀장';
  return me;
}


function publicMe_(me) {
  return {
    name: me.name,
    email: me.email,
    team: me.team,
    role: me.role,
    isAdmin: me.isAdmin,
    isLeader: me.isLeader,
    registered: Boolean(me.rowNumber),
    hasSignature: Boolean(me.signatureFileId),
    programs: me.programs,
    substitute: me.substitute,
    subFrom: me.subFrom,
    subTo: me.subTo
  };
}


function requireAdmin_() {
  const me = currentUser_();
  if (!me.isAdmin) throw new Error('관리자만 할 수 있어요.');
  return me;
}


/* ============================================================
 * 담당자 확인
 * ============================================================ */

/** scope: 'mine'(기본) / 'all'(관리자) / 'unassigned'(관리자) */
function getStaffQueue(scope) {
  const me = currentUser_();
  const staff = readStaff_();
  const today = todayText_();

  const list = readActivity_()
    .filter(function (r) { return r.staffStatus === '확인대기'; })
    .map(function (r) {
      r.assignedEff = r.assigned || ((findAssignedStaff_(staff, r.program) || {}).name || '');
      return r;
    })
    .filter(function (r) {
      if (scope === 'all' && me.isAdmin) return true;
      if (scope === 'unassigned' && me.isAdmin) return !r.assignedEff;
      return canHandle_(me, r.assignedEff, staff, today);
    })
    .map(function (r) {
      return {
        rowNumber: r.rowNumber,
        logId: r.logId,
        volunteerName: r.name,
        activityDate: r.dateText,
        dayOfWeek: r.day,
        program: r.program,
        calculatedTimeText: formatMinutes(r.calcMin),
        mealStatus: r.meal,
        assigned: r.assignedEff,
        substituteFor: isSubstituteFor_(me, r.assignedEff, staff, today) ? r.assignedEff : '',
        returned: r.note.indexOf('팀장 반려') === 0 ? r.note : '',
        registrationType: r.regType
      };
    });

  list.sort(function (a, b) {
    return a.activityDate === b.activityDate
      ? a.volunteerName.localeCompare(b.volunteerName, 'ko')
      : (a.activityDate < b.activityDate ? -1 : 1);
  });

  return list;
}


/** 내가 그 담당자의 '대직자'로 지정된 기간인지 (관리자가 전체 보기로 보는 건 대직 아님) */
function isSubstituteFor_(me, assignedName, staff, today) {
  return Boolean(assignedName) && assignedName !== me.name && canHandle_(me, assignedName, staff, today);
}


/** 기본 담당자 본인이거나, 기본 담당자가 대직자로 나를 지정한 기간이면 확인 가능 */
function canHandle_(me, assignedName, staff, today) {
  if (!assignedName) return false;
  if (assignedName === me.name) return true;

  const owner = staff.find(function (s) { return s.active && s.name === assignedName; });
  if (!owner || owner.substitute !== me.name) return false;

  const from = owner.subFrom || '0000-00-00';
  const to = owner.subTo || '9999-12-31';
  return today >= from && today <= to;
}


function getLogDetail(rowNumber, logId) {
  const me = currentUser_();
  const r = getActivityRecord_(rowNumber, logId);

  const staff = readStaff_();
  const assignedEff = r.assigned || ((findAssignedStaff_(staff, r.program) || {}).name || '');

  if (!me.isAdmin && !canHandle_(me, assignedEff, staff, todayText_()) &&
      !(me.isLeader && leaderCanSee_(me, r, staff))) {
    throw new Error('이 일지를 볼 수 있는 권한이 없어요.');
  }

  return {
    rowNumber: r.rowNumber,
    logId: r.logId,
    volunteerName: r.name,
    phoneLast4: r.phone,
    registrationType: r.regType,
    organization: r.org,
    activityDate: r.dateText,
    dayOfWeek: r.day,
    program: r.program,
    activityContent: r.content,
    startTime: r.start,
    endTime: r.end,
    mealStatus: r.meal,
    calculatedMinutes: r.calcMin,
    calculatedTimeText: formatMinutes(r.calcMin),
    finalApprovedMinutes: r.finalMin || r.calcMin,
    staffConfirmStatus: r.staffStatus,
    staffName: r.staffName,
    staffSubstitute: r.confirmType === '대직',
    finalTimeText: formatMinutes(r.finalMin || r.calcMin),
    leaderStatus: r.leaderStatus,
    leaderName: r.leaderName,
    inputDone: r.inputDone,
    assigned: assignedEff,
    assignedManual: Boolean(r.assigned),
    canApprove: r.staffStatus === '확인대기' && (me.isAdmin || canHandle_(me, assignedEff, staff, todayText_())),
    canLeader: r.staffStatus === '확인완료' && r.leaderStatus !== '확인완료' && (me.isAdmin || leaderCanSee_(me, r, staff)),
    signatureImage: imageDataUrl_(r.sigId),
    note: r.note,
    meHasSignature: Boolean(me.signatureFileId),
    canReassign: me.isAdmin,
    staffNames: me.isAdmin
      ? staff.filter(function (s) { return s.active; }).map(function (s) { return s.name; })
      : []
  };
}


function approveLog(data) {
  const me = currentUser_();

  if (!me.rowNumber) throw new Error('담당자 관리에서 본인을 먼저 등록해 주세요.');
  if (!me.signatureFileId) throw new Error('「내 정보」에서 담당자 서명을 먼저 등록해 주세요.');

  const minutes = Number(data && data.finalApprovedMinutes);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new Error('인정시간을 올바르게 입력해 주세요.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const r = getActivityRecord_(Number(data.rowNumber), data.logId);
    if (r.staffStatus !== '확인대기') throw new Error('이미 처리된 일지예요. 목록을 새로고침해 주세요.');

    const staff = readStaff_();
    const assignedEff = r.assigned || ((findAssignedStaff_(staff, r.program) || {}).name || '');

    if (!me.isAdmin && !canHandle_(me, assignedEff, staff, todayText_())) {
      throw new Error('이 일지를 확인할 권한이 없어요.');
    }

    const sheet = getRequiredSheet(ss_(), ACTIVITY_SHEET_NAME);
    const C = ACTIVITY_COLUMNS;
    const n = r.rowNumber;

    sheet.getRange(n, C.FINAL_APPROVED_TIME).setValue(minutesToSheetTime(minutes));
    sheet.getRange(n, C.STAFF_CONFIRM_STATUS, 1, 5).setValues([[
      '확인완료', me.name, new Date(), me.signatureFileId, me.signatureFileUrl || ''
    ]]);
    // 팀장 확인은 프로그램(기본 담당자) 팀 기준 — 다른 팀 사람이 대직해도 원래 팀 팀장에게 감
    const owner = staff.find(function (s) { return s.name === assignedEff; });
    sheet.getRange(n, C.ASSIGNED_STAFF, 1, 3).setValues([[
      assignedEff,
      assignedEff && assignedEff !== me.name ? '대직' : '',
      (owner && owner.team) || me.team
    ]]);
    clearPdfMark_(sheet, n);
    formatActivityRow_(sheet, n);

    return { success: true, volunteerName: r.name, finalApprovedTimeText: formatMinutes(minutes) };
  } finally {
    lock.releaseLock();
  }
}


function rejectLog(data) {
  const me = currentUser_();
  const reason = cleanText(data && data.reason);
  if (!reason) throw new Error('반려 사유를 입력해 주세요.');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const r = getActivityRecord_(Number(data.rowNumber), data.logId);
    if (r.staffStatus !== '확인대기') throw new Error('이미 처리된 일지예요. 목록을 새로고침해 주세요.');

    const staff = readStaff_();
    const assignedEff = r.assigned || ((findAssignedStaff_(staff, r.program) || {}).name || '');
    if (!me.isAdmin && !canHandle_(me, assignedEff, staff, todayText_())) {
      throw new Error('이 일지를 처리할 권한이 없어요.');
    }

    const sheet = getRequiredSheet(ss_(), ACTIVITY_SHEET_NAME);
    const C = ACTIVITY_COLUMNS;
    sheet.getRange(r.rowNumber, C.FINAL_APPROVED_TIME).clearContent();
    sheet.getRange(r.rowNumber, C.STAFF_CONFIRM_STATUS, 1, 5).setValues([['반려', me.name, new Date(), '', '']]);
    sheet.getRange(r.rowNumber, C.NOTE).setValue('반려 사유: ' + reason);
    formatActivityRow_(sheet, r.rowNumber);

    return { success: true, volunteerName: r.name };
  } finally {
    lock.releaseLock();
  }
}


/** 관리자: 기본 담당자 바꾸기 */
function reassignLog(rowNumber, logId, staffName) {
  requireAdmin_();
  const r = getActivityRecord_(Number(rowNumber), logId);
  const sheet = getRequiredSheet(ss_(), ACTIVITY_SHEET_NAME);
  const staff = readStaff_();

  // 빈 값 = 직접 바꾼 담당자를 지우고, 프로그램에 등록된 담당자로 자동
  if (!cleanText(staffName)) {
    sheet.getRange(r.rowNumber, ACTIVITY_COLUMNS.ASSIGNED_STAFF).clearContent();
    const auto = findAssignedStaff_(staff, r.program);
    return { success: true, assigned: auto ? auto.name + ' (프로그램 담당자)' : '미배정' };
  }

  const target = staff.find(function (s) { return s.active && s.name === cleanText(staffName); });
  if (!target) throw new Error('담당자를 찾지 못했어요.');

  sheet.getRange(r.rowNumber, ACTIVITY_COLUMNS.ASSIGNED_STAFF).setValue(target.name);
  return { success: true, assigned: target.name };
}


/* ============================================================
 * 팀장 확인
 * ============================================================ */

function leaderCanSee_(me, r, staff) {
  return me.isLeader && me.team && rowTeam_(r, staff) === me.team;
}


function rowTeam_(r, staff) {
  if (r.confirmTeam) return r.confirmTeam;
  const s = staff.find(function (x) { return x.name === r.staffName; });
  return s ? s.team : '';
}


/** 담당자 확인이 끝났고 팀장 확인이 남은 일지 — 봉사자별로 묶어서 */
function getLeaderQueue(scopeAll) {
  const me = currentUser_();
  if (!me.isLeader && !me.isAdmin) throw new Error('팀장 확인 화면은 팀장님만 볼 수 있어요.');

  const staff = readStaff_();
  const rows = readActivity_().filter(function (r) {
    if (r.staffStatus !== '확인완료' || r.leaderStatus === '확인완료') return false;
    if (scopeAll && me.isAdmin) return true;
    return leaderCanSee_(me, r, staff);
  });

  const groups = {};
  rows.forEach(function (r) {
    const key = r.name + '|' + r.phone;
    if (!groups[key]) groups[key] = { volunteerName: r.name, phoneLast4: r.phone, items: [] };
    groups[key].items.push({
      rowNumber: r.rowNumber,
      logId: r.logId,
      activityDate: r.dateText,
      dayOfWeek: r.day,
      program: r.program,
      activityContent: r.content,
      timeRange: r.start + '~' + r.end,
      mealStatus: r.meal,
      finalTimeText: formatMinutes(r.finalMin || r.calcMin),
      staffName: r.staffName,
      substitute: r.confirmType === '대직',
      team: rowTeam_(r, staff)
    });
  });

  return Object.keys(groups).map(function (k) {
    const g = groups[k];
    g.items.sort(function (a, b) { return a.activityDate < b.activityDate ? -1 : 1; });
    g.from = g.items[0].activityDate;
    g.to = g.items[g.items.length - 1].activityDate;
    return g;
  }).sort(function (a, b) { return a.from < b.from ? -1 : 1; });
}


function leaderApprove(items) {
  const me = currentUser_();
  if (!me.isLeader && !me.isAdmin) throw new Error('팀장님만 확인할 수 있어요.');
  if (!me.signatureFileId) throw new Error('「내 정보」에서 서명을 먼저 등록해 주세요.');
  if (!items || !items.length) throw new Error('확인할 일지를 선택해 주세요.');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const staff = readStaff_();
    const sheet = getRequiredSheet(ss_(), ACTIVITY_SHEET_NAME);
    const C = ACTIVITY_COLUMNS;
    const now = new Date();
    let done = 0;

    items.forEach(function (it) {
      const r = getActivityRecord_(Number(it.rowNumber), it.logId);
      if (r.staffStatus !== '확인완료' || r.leaderStatus === '확인완료') return;
      if (!me.isAdmin && !leaderCanSee_(me, r, staff)) return;

      sheet.getRange(r.rowNumber, C.TEAM_LEADER_CONFIRM_STATUS, 1, 2).setValues([['확인완료', me.name]]);
      sheet.getRange(r.rowNumber, C.LEADER_CONFIRMED_AT, 1, 2).setValues([[now, me.signatureFileId]]);
      sheet.getRange(r.rowNumber, C.LEADER_CONFIRMED_AT).setNumberFormat('yyyy-mm-dd hh:mm');
      clearPdfMark_(sheet, r.rowNumber);
      done++;
    });

    return { success: true, count: done };
  } finally {
    lock.releaseLock();
  }
}


/** 팀장 반려: 담당자 확인 단계로 되돌림 (담당자 서명 지움, 인정시간은 남겨 둠) */
function leaderReturn(items, reason) {
  const me = currentUser_();
  if (!me.isLeader && !me.isAdmin) throw new Error('팀장님만 반려할 수 있어요.');
  if (!items || !items.length) throw new Error('반려할 일지를 선택해 주세요.');
  const why = cleanText(reason);
  if (!why) throw new Error('반려 사유를 입력해 주세요.');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const staff = readStaff_();
    const sheet = getRequiredSheet(ss_(), ACTIVITY_SHEET_NAME);
    const C = ACTIVITY_COLUMNS;
    let done = 0;

    items.forEach(function (it) {
      const r = getActivityRecord_(Number(it.rowNumber), it.logId);
      if (r.staffStatus !== '확인완료' || r.leaderStatus === '확인완료') return;
      if (!me.isAdmin && !leaderCanSee_(me, r, staff)) return;

      sheet.getRange(r.rowNumber, C.STAFF_CONFIRM_STATUS, 1, 5).setValues([['확인대기', '', '', '', '']]);
      sheet.getRange(r.rowNumber, C.CONFIRM_TYPE).clearContent();
      sheet.getRange(r.rowNumber, C.NOTE).setValue('팀장 반려(' + (me.name || '관리자') + '): ' + why);
      clearPdfMark_(sheet, r.rowNumber);
      done++;
    });

    return { success: true, count: done };
  } finally {
    lock.releaseLock();
  }
}


/* ============================================================
 * 현황판 · 실적 입력 (관리자)
 * ============================================================ */

function getDashboard(from, to) {
  requireAdmin_();
  const staff = readStaff_();
  const range = normalizeRange_(from, to);

  const allRows = readActivity_(); // 시트를 한 번만 읽어요
  const rows = allRows.filter(function (r) {
    return r.staffStatus !== '반려' && inRange_(r.dateText, range);
  });

  const byStaff = {};
  const byTeam = {};
  const early = [];
  let complete = 0;
  let inputTodo = 0;
  let inputDone = 0;

  rows.forEach(function (r) {
    const staffDone = r.staffStatus === '확인완료';
    const leaderDone = r.leaderStatus === '확인완료';

    if (!staffDone) {
      const who = r.assigned || ((findAssignedStaff_(staff, r.program) || {}).name || '') || '미배정';
      bump_(byStaff, who, r.dateText, r);
    } else if (!leaderDone) {
      bump_(byTeam, rowTeam_(r, staff) || '팀 미지정', r.dateText, r);
    }

    if (staffDone && leaderDone) complete++;
    if (r.inputDone) inputDone++;
    else if (staffDone) inputTodo++;

    if (r.inputDone && !(staffDone && leaderDone)) {
      early.push({
        rowNumber: r.rowNumber,
        logId: r.logId,
        activityDate: r.dateText,
        volunteerName: r.name,
        program: r.program,
        missing: !staffDone ? '담당자·팀장 서명' : '팀장 서명',
        who: !staffDone
          ? (r.assigned || ((findAssignedStaff_(staff, r.program) || {}).name || '미배정'))
          : leaderNames_(staff, rowTeam_(r, staff))
      });
    }
  });

  const rejected = allRows.filter(function (r) {
    return r.staffStatus === '반려' && inRange_(r.dateText, range);
  }).length;

  return {
    range: range,
    total: rows.length,
    complete: complete,
    inputDone: inputDone,
    inputTodo: inputTodo,
    rejected: rejected,
    byStaff: toList_(byStaff),
    byTeam: toList_(byTeam).map(function (t) {
      t.leaders = leaderNames_(staff, t.name);
      return t;
    }),
    early: early
  };
}


function bump_(obj, key, date, r) {
  if (!obj[key]) obj[key] = { name: key, count: 0, oldest: date, items: [] };
  obj[key].count++;
  if (date < obj[key].oldest) obj[key].oldest = date;
  if (r) {
    obj[key].items.push({
      rowNumber: r.rowNumber,
      logId: r.logId,
      activityDate: r.dateText,
      dayOfWeek: r.day,
      volunteerName: r.name,
      program: r.program,
      staffName: r.staffName
    });
  }
}

function toList_(obj) {
  return Object.keys(obj).map(function (k) { return obj[k]; })
    .sort(function (a, b) { return b.count - a.count; });
}

function leaderNames_(staff, team) {
  return staff.filter(function (s) { return s.active && s.role === '팀장' && s.team === team; })
    .map(function (s) { return s.name; }).join(', ') || '팀장 미지정';
}


function getInputList(from, to, onlyTodo) {
  requireAdmin_();
  const range = normalizeRange_(from, to);
  const staff = readStaff_();

  let all = readActivity_();
  if (linkRegisteredVolunteers_(all)) all = readActivity_(); // 새로 연결된 사람이 있을 때만 다시 읽음

  return all
    .filter(function (r) {
      if (r.staffStatus === '반려' || !inRange_(r.dateText, range)) return false;
      return onlyTodo ? !r.inputDone : true;
    })
    .map(function (r) {
      return {
        rowNumber: r.rowNumber,
        logId: r.logId,
        activityDate: r.dateText,
        dayOfWeek: r.day,
        volunteerName: r.name,
        phoneLast4: r.phone,
        perfSystem: r.perfSystem,
        perfId: r.perfId,
        program: r.program,
        timeRange: r.start + '~' + r.end,
        finalTimeText: formatMinutes(r.finalMin || r.calcMin),
        finalConfirmed: r.staffStatus === '확인완료',
        staffDone: r.staffStatus === '확인완료',
        leaderDone: r.leaderStatus === '확인완료',
        inputDone: r.inputDone,
        assigned: r.assigned || ((findAssignedStaff_(staff, r.program) || {}).name || '')
      };
    })
    .sort(function (a, b) {
      return a.activityDate === b.activityDate
        ? a.volunteerName.localeCompare(b.volunteerName, 'ko')
        : (a.activityDate < b.activityDate ? -1 : 1);
    });
}


/** 실적 입력 완료 체크 (서명이 빠져 있어도 먼저 체크 가능) */
function setInputDone(items, done) {
  const me = requireAdmin_();
  if (!items || !items.length) throw new Error('선택한 일지가 없어요.');

  const sheet = getRequiredSheet(ss_(), ACTIVITY_SHEET_NAME);
  const C = ACTIVITY_COLUMNS;
  const now = new Date();
  let count = 0;

  items.forEach(function (it) {
    const r = getActivityRecord_(Number(it.rowNumber), it.logId);
    sheet.getRange(r.rowNumber, C.VMS_1365_REGISTRATION_STATUS).setValue(done ? '등록완료' : '미등록');
    sheet.getRange(r.rowNumber, C.INPUT_AT, 1, 2).setValues([[done ? now : '', done ? (me.name || me.email) : '']]);
    if (done) sheet.getRange(r.rowNumber, C.INPUT_AT).setNumberFormat('yyyy-mm-dd hh:mm');
    count++;
  });

  return { success: true, count: count };
}


/* ============================================================
 * 담당자 관리 (관리자) · 내 정보
 * ============================================================ */

function getStaffAdmin() {
  requireAdmin_();
  return readStaff_().map(function (s) {
    return {
      rowNumber: s.rowNumber,
      staffId: s.staffId,
      name: s.name,
      email: s.email,
      team: s.team,
      role: s.role,
      programs: s.programs.join(', '),
      active: s.active,
      hasSignature: Boolean(s.signatureFileId),
      substitute: s.substitute,
      subFrom: s.subFrom,
      subTo: s.subTo
    };
  });
}


function saveStaffAdmin(data) {
  requireAdmin_();

  const name = cleanText(data && data.name);
  const email = cleanText(data && data.email).toLowerCase();
  const role = ROLES.indexOf(cleanText(data && data.role)) >= 0 ? cleanText(data.role) : '담당자';

  if (!name) throw new Error('이름을 입력해 주세요.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('이메일 주소를 확인해 주세요.');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const sheet = getRequiredSheet(ss_(), STAFF_SHEET_NAME);
    ensureStaffColumns_(sheet);
    const staff = readStaff_();
    const rowNumber = Number(data.rowNumber) || 0;

    const dupName = staff.find(function (s) { return s.active && s.name === name && s.rowNumber !== rowNumber; });
    if (dupName && data.active !== false) throw new Error('같은 이름의 담당자가 이미 있어요. 이름 뒤에 팀명 등을 붙여 구분해 주세요.');

    const dupEmail = staff.find(function (s) { return s.email === email && s.rowNumber !== rowNumber; });
    if (dupEmail) throw new Error('이미 등록된 이메일이에요 (' + dupEmail.name + ').');

    const programs = cleanText(data.programs).split(/[,，\n]/).map(cleanText).filter(Boolean).join(', ');
    const values = [
      name, email, null, null, data.active === false ? 'N' : 'Y',
      normalizeName_(data.team), role, programs
    ];

    if (rowNumber >= 2) {
      const C = STAFF_COLUMNS;
      sheet.getRange(rowNumber, C.STAFF_NAME, 1, 2).setValues([[values[0], values[1]]]);
      sheet.getRange(rowNumber, C.ACTIVE, 1, 4).setValues([[values[4], values[5], values[6], values[7]]]);
      STAFF_MEMO_ = null;
      return { success: true, message: name + ' 님 정보를 고쳤어요.' };
    }

    const row = new Array(STAFF_COLUMN_COUNT).fill('');
    row[STAFF_COLUMNS.STAFF_ID - 1] = createNextStaffId(staff);
    row[STAFF_COLUMNS.STAFF_NAME - 1] = name;
    row[STAFF_COLUMNS.EMAIL - 1] = email;
    row[STAFF_COLUMNS.ACTIVE - 1] = values[4];
    row[STAFF_COLUMNS.TEAM - 1] = values[5];
    row[STAFF_COLUMNS.ROLE - 1] = role;
    row[STAFF_COLUMNS.PROGRAMS - 1] = programs;
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, STAFF_COLUMN_COUNT).setValues([row]);
    STAFF_MEMO_ = null;

    return { success: true, message: name + ' 님을 등록했어요. 본인이 접속해서 서명을 등록하면 돼요.' };
  } finally {
    lock.releaseLock();
  }
}


function saveMySignature(signature) {
  const me = currentUser_();
  if (!me.rowNumber) throw new Error('담당자 관리에서 본인을 먼저 등록해 주세요.');
  if (!signature || !String(signature).startsWith('data:image/png;base64,')) {
    throw new Error('서명을 그려 주세요.');
  }

  const file = saveStaffSignatureImage_({ signatureData: signature, staffName: me.name, staffId: me.staffId });
  const sheet = getRequiredSheet(ss_(), STAFF_SHEET_NAME);
  sheet.getRange(me.rowNumber, STAFF_COLUMNS.SIGNATURE_FILE_ID, 1, 2).setValues([[file.getId(), file.getUrl()]]);
  STAFF_MEMO_ = null;

  return { success: true, image: imageDataUrl_(file.getId()) };
}


function getMySignature() {
  const me = currentUser_();
  return { image: me.signatureFileId ? imageDataUrl_(me.signatureFileId) : '' };
}


/** 휴가 등으로 자리를 비울 때 대직자 지정 (본인 또는 관리자) */
function saveSubstitute(data) {
  const me = currentUser_();
  const staff = readStaff_();
  const targetName = cleanText(data && data.staffName) || me.name;

  if (targetName !== me.name && !me.isAdmin) throw new Error('본인 대직만 지정할 수 있어요.');

  const owner = staff.find(function (s) { return s.active && s.name === targetName; });
  if (!owner) throw new Error('담당자를 찾지 못했어요.');

  const sub = cleanText(data.substitute);
  if (sub && !staff.find(function (s) { return s.active && s.name === sub; })) {
    throw new Error('대직자를 담당자 명단에서 골라 주세요.');
  }
  if (sub === owner.name) throw new Error('본인을 대직자로 지정할 수 없어요.');

  const from = cleanText(data.from);
  const to = cleanText(data.to);
  if (sub && from && to && from > to) throw new Error('대직 기간을 확인해 주세요.');

  getRequiredSheet(ss_(), STAFF_SHEET_NAME)
    .getRange(owner.rowNumber, STAFF_COLUMNS.SUBSTITUTE, 1, 3)
    .setValues([[sub, sub ? from : '', sub ? to : '']]);
  STAFF_MEMO_ = null;

  return { success: true };
}


/* ============================================================
 * PDF — 기간 지정 출력 · 월별 자동 보관
 * ============================================================ */

/**
 * 일지 출력 범위
 *  - 관리자: 모든 일지
 *  - 담당자: 내가 기본 담당자인 일지 + 내가 확인(서명)한 일지 + 지금 대직 중인 담당자의 일지
 *  - 팀장: 위에 더해 우리 팀 일지
 */
function printableFilter_(me) {
  if (me.isAdmin) return function () { return true; };
  const staff = readStaff_();
  const today = todayText_();
  return function (r) {
    const assignedEff = r.assigned || ((findAssignedStaff_(staff, r.program) || {}).name || '');
    if (assignedEff === me.name || (r.staffName && r.staffName === me.name)) return true;
    if (canHandle_(me, assignedEff, staff, today)) return true;
    return me.isLeader && leaderCanSee_(me, r, staff);
  };
}


/** 봉사자 검색 (출력용) — 담당자는 자기 범위의 봉사자만 */
function searchVolunteersForPrint(keyword) {
  const me = currentUser_();
  const canPrint = printableFilter_(me);
  const k = normalizeName_(keyword);
  const seen = {};

  readActivity_().forEach(function (r) {
    if (r.staffStatus === '반려' || !canPrint(r)) return;
    if (k && normalizeName_(r.name).indexOf(k) < 0 && r.phone.indexOf(k) < 0) return;
    const key = r.name + '|' + r.phone;
    if (!seen[key]) seen[key] = { key: key, name: r.name, phoneLast4: r.phone, count: 0, last: r.dateText };
    seen[key].count++;
    if (r.dateText > seen[key].last) seen[key].last = r.dateText;
  });

  return Object.keys(seen).map(function (x) { return seen[x]; })
    .sort(function (a, b) { return a.name.localeCompare(b.name, 'ko'); })
    .slice(0, 30);
}


/** 출력할 일지 모으기 (미리보기·PDF 저장 공용) */
function prepareLogPrint_(key, from, to) {
  const me = currentUser_();
  const canPrint = printableFilter_(me);
  const range = normalizeRange_(from, to);

  const all = readActivity_();
  if (me.isAdmin) linkRegisteredVolunteers_(all); // 출력에 쓰는 실적 ID는 명단에서 바로 찾으므로 다시 읽지 않아요

  const rows = all.filter(function (r) {
    if (r.staffStatus === '반려' || !inRange_(r.dateText, range) || !canPrint(r)) return false;
    return !key || (r.name + '|' + r.phone) === key;
  });

  if (!rows.length) throw new Error('이 기간에 출력할 일지가 없어요.');

  const groups = groupByVolunteer_(rows);
  if (groups.length > 60) throw new Error('한 번에 너무 많아요 (' + groups.length + '명). 기간을 줄이거나 봉사자를 골라 주세요.');

  return {
    html: buildLogPdfHtml_(groups, range),
    fileName: cleanFileName((key ? key.split('|')[0] + '_' : (me.isAdmin ? '전체_' : (me.name || '내담당') + '_담당_')) + range.from + '~' + range.to + '.pdf'),
    volunteers: groups.length,
    entries: rows.length
  };
}


/**
 * 미리보기용: 화면(HTML)만 만들어요.
 * 예전에는 미리보기 때마다 PDF 변환까지 해서 오래 걸렸어요. PDF는 [PDF 저장]을 누를 때만 만들어요.
 */
function makeLogPdf(key, from, to) {
  const p = prepareLogPrint_(key, from, to);
  return { html: p.html, fileName: p.fileName, volunteers: p.volunteers, entries: p.entries };
}


/** [PDF 저장]을 누를 때만 PDF로 변환 */
function makeLogPdfFile(key, from, to) {
  const p = prepareLogPrint_(key, from, to);
  const pdf = Utilities.newBlob(p.html, 'text/html', 'log.html').getAs('application/pdf').setName(p.fileName);
  return { fileName: pdf.getName(), base64: Utilities.base64Encode(pdf.getBytes()) };
}


/**
 * 명단에 없던 봉사자를 나중에 '봉사자 명단'에 등록하면, 그 전에 낸 일지도 자동으로 연결
 * (이름 + 연락처 뒤 4자리가 같고, 생년월일이 다르지 않을 때)
 * 실적 입력 화면을 열 때, 일지 출력 때, 매일 밤 자동으로 실행돼요.
 */
function linkRegisteredVolunteers_(rows) {
  const vSheet = ss_().getSheetByName(VOLUNTEER_SHEET_NAME);
  if (!vSheet || vSheet.getLastRow() < 2) return 0;

  const registry = {};
  vSheet.getRange(2, 1, vSheet.getLastRow() - 1, 9).getValues().forEach(function (row) {
    if (cleanText(row[4]).toUpperCase() !== 'Y') return;
    const key = normalizeName_(row[1]) + '|' + cleanText(row[3]).padStart(4, '0');
    registry[key] = {
      birth: formatDateForInput(row[2]),
      system: cleanText(row[5]),
      id: cleanText(row[6]),
      org: cleanText(row[7])
    };
  });

  const sheet = getRequiredSheet(ss_(), ACTIVITY_SHEET_NAME);
  const C = ACTIVITY_COLUMNS;
  let linked = 0;

  (rows || readActivity_()).forEach(function (r) {
    if (r.regType !== '미등록봉사자') return;

    const v = registry[normalizeName_(r.name) + '|' + r.phone];
    if (!v) return;

    const rowBirth = r.birthText.replace(/\./g, '-');
    if (v.birth && rowBirth && v.birth !== rowBirth) return; // 다른 사람일 수 있음

    sheet.getRange(r.rowNumber, C.REGISTRATION_TYPE).setValue('등록봉사자');
    if (!r.org && v.org) sheet.getRange(r.rowNumber, C.ORGANIZATION).setValue(v.org);
    if (sheet.getMaxColumns() >= C.PERF_ID && v.id) {
      sheet.getRange(r.rowNumber, C.PERF_SYSTEM, 1, 2).setValues([[v.system, v.id]]);
    }
    linked++;
  });

  return linked;
}


/** 매일 밤 실행: 지난달까지 서명이 모두 끝난 봉사자별 월 일지를 PDF로 보관 */
function archiveMonthlyPdfs() {
  requireAdmin_();
  return archiveMonthlyPdfs_();
}

function archiveMonthlyPdfs_() {
  const lock=LockService.getScriptLock();
  lock.waitLock(20000);
  try {return archiveMonthlyPdfsLocked_();} finally {lock.releaseLock();}
}

function archiveMonthlyPdfsLocked_() {
  linkRegisteredVolunteers_();
  const tz = Session.getScriptTimeZone();
  const thisMonth = Utilities.formatDate(new Date(), tz, 'yyyy-MM');
  const staffDoneAll = readActivity_().filter(function (r) {
    return r.staffStatus !== '반려' && r.dateText && r.dateText.slice(0, 7) < thisMonth;
  });

  const byKey = {};
  staffDoneAll.forEach(function (r) {
    const key = r.dateText.slice(0, 7) + '|' + r.name + '|' + r.phone;
    (byKey[key] = byKey[key] || []).push(r);
  });

  const sheet = getRequiredSheet(ss_(), ACTIVITY_SHEET_NAME);
  const root = archiveRootFolder_();
  const started = Date.now();
  let made = 0;

  Object.keys(byKey).sort().forEach(function (key) {
    if (Date.now() - started > 4.5 * 60 * 1000 || made >= 40) return;

    const rows = byKey[key];
    const allSigned = rows.every(function (r) {
      return r.staffStatus === '확인완료' && r.leaderStatus === '확인완료';
    });
    const needs = rows.some(function (r) { return !r.pdfId; }) || new Set(rows.map(r=>r.pdfId)).size>1;
    if (!allSigned || !needs) return;

    const month = key.split('|')[0];
    const old = rows.map(function (r) { return r.pdfId; }).filter(Boolean);
    const groups = groupByVolunteer_(rows);
    const range = { from: month + '-01', to: month + '-' + String(daysInMonth_(month)).padStart(2, '0') };
    const html = buildLogPdfHtml_(groups, range);
    const fileName = month + '_' + cleanFileName(rows[0].name) + '(' + rows[0].phone + ').pdf';
    const pdf = Utilities.newBlob(html, 'text/html', 'log.html').getAs('application/pdf').setName(fileName);
    const file = monthFolder_(root, month).createFile(pdf);

    if(file.getSize()<=0)throw new Error('새 PDF가 비어 있어요. 기존 PDF는 유지했어요.');
    rows.forEach(function (r) {
      sheet.getRange(r.rowNumber, ACTIVITY_COLUMNS.PDF_FILE_ID).setValue(file.getId());
    });
    SpreadsheetApp.flush();
    const verified=rows.every(r=>cleanText(sheet.getRange(r.rowNumber,ACTIVITY_COLUMNS.PDF_FILE_ID).getValue())===file.getId());
    if(!verified)throw new Error('보관 PDF의 시트 연결을 확인하지 못했어요. 기존 PDF는 유지했어요.');
    // 새 PDF 저장과 시트 연결이 끝난 뒤, 다른 일지가 참조하지 않는 이전 PDF만 정리합니다.
    const referenced=new Set(readActivity_().map(r=>r.pdfId).filter(Boolean));
    Array.from(new Set(old)).filter(id=>id!==file.getId()&&!referenced.has(id)).forEach(function(id){
      try {DriveApp.getFileById(id).setTrashed(true);}catch(e){/* 이전 PDF 정리 실패 시 파일을 유지합니다. */}
    });
    made++;
  });

  return made + '개 PDF를 보관했어요.';
}


function groupByVolunteer_(rows) {
  const map = {};
  const order = [];

  rows.forEach(function (r) {
    const key = r.name + '|' + r.phone;
    if (!map[key]) {
      map[key] = { name: r.name, phone: r.phone, birth: r.birthText, perfSystem: '', perfId: '', rows: [] };
      order.push(key);
    }
    if (r.perfId) { map[key].perfSystem = r.perfSystem; map[key].perfId = r.perfId; }
    map[key].rows.push(r);
  });

  const missing = order.filter(function (k) { return !map[k].perfId; });
  if (missing.length) {
    const info = volunteerPerfLookup_();
    missing.forEach(function (k) {
      const v = info[k];
      if (v) { map[k].perfSystem = v.system; map[k].perfId = v.id; }
    });
  }

  return order.map(function (k) {
    map[k].rows.sort(function (a, b) {
      return a.dateText === b.dateText ? (a.start < b.start ? -1 : 1) : (a.dateText < b.dateText ? -1 : 1);
    });
    return map[k];
  }).sort(function (a, b) { return a.name.localeCompare(b.name, 'ko'); });
}


function volunteerPerfLookup_() {
  const sheet = ss_().getSheetByName(VOLUNTEER_SHEET_NAME);
  const out = {};
  if (!sheet || sheet.getLastRow() < 2) return out;

  sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues().forEach(function (row) {
    const key = cleanText(row[1]) + '|' + cleanText(row[3]).padStart(4, '0');
    if (cleanText(row[6])) out[key] = { system: cleanText(row[5]), id: cleanText(row[6]) };
  });

  return out;
}


/** 종이 활동일지 양식과 같은 모양 (한 쪽에 8칸, 시간·식사 여부를 한 칸 안에 표시) */
function buildLogPdfHtml_(groups, range) {
  const cache = {};
  const img = function (id, h) {
    if (!id) return '';
    if (!(id in cache)) cache[id] = imageDataUrl_(id);
    return cache[id] ? '<img src="' + cache[id] + '" style="max-height:' + h + 'px;height:auto;max-width:95%">' : '';
  };

  const PER_PAGE = 10;
  const printed = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy.MM.dd');
  const year = range.from.slice(0, 4);
  const pages = [];

  groups.forEach(function (g) {
    const totalPages = Math.ceil(g.rows.length / PER_PAGE);

    for (let p = 0; p < g.rows.length; p += PER_PAGE) {
      const chunk = g.rows.slice(p, p + PER_PAGE);
      let body = '';

      for (let i = 0; i < PER_PAGE; i++) {
        const r=chunk[i],staffDone=!!r&&r.staffStatus==='확인완료',leaderDone=!!r&&r.leaderStatus==='확인완료';
        const date=r?r.dateText.split('-'):null;
        const dateCell=r?date[0]+'년<br>'+Number(date[1])+'/'+Number(date[2])+'<br>'+esc_(r.day)+'요일':year+'년<br>/<br>요일';
        const program=r?esc_(r.program)+(r.content?'<div class="sub">'+esc_(r.content.slice(0,40))+'</div>':''):'';
        const min=staffDone?(r.finalMin||r.calcMin):0;
        const duration=staffDone?'<b>'+Math.floor(min/60)+'</b>시간'+(min%60?' <b>'+min%60+'</b>분':''):'(&nbsp;&nbsp;&nbsp;)시간<br>(&nbsp;&nbsp;&nbsp;)분';
        const meal=!r?'O,&nbsp;&nbsp;&nbsp;X':r.meal==='식사함'?'<span class="on">O</span>,&nbsp;&nbsp;&nbsp;X':'O,&nbsp;&nbsp;&nbsp;<span class="on">X</span>';
        const timeGrid='<div class="time-block"><div class="clock">'+(r?esc_(r.start)+' ~ '+esc_(r.end):'')+'</div><div class="meal-row"><span class="meal-label">식사 여부</span><span>'+meal+'</span></div></div>';
        body+='<tr class="record"><td class="c">'+dateCell+'</td><td class="c">'+program+'</td><td colspan="2" class="timecell">'+timeGrid+'</td><td class="c hm">'+duration+'</td>'+
          '<td class="c">'+(r?img(r.sigId,36):'')+'</td><td class="c">'+(staffDone?img(r.staffSigId,34)+(r.confirmType==='대직'?'<div class="tag">대직</div>':''):'')+'</td>'+
          '<td class="c">'+(leaderDone?img(r.leaderSigId,34):'')+'</td></tr>';
      }

      const perf = g.perfId
        ? esc_(g.perfId) + (g.perfSystem ? '<br><span class="sm">(' + esc_(g.perfSystem) + ')</span>' : '')
        : '';
      const pageNo = totalPages > 1 ? ' (' + (p / PER_PAGE + 1) + '/' + totalPages + ')' : '';

      pages.push(
        '<div class="page">' +
        '<h1>자원봉사 활동 일지' + pageNo + '</h1>' +
        '<table class="info"><colgroup><col style="width:10%"><col style="width:16%"><col style="width:12%"><col style="width:16%">' +
        '<col style="width:12%"><col style="width:12%"><col style="width:10%"><col style="width:12%"></colgroup><tr>' +
        '<th>성명</th><td>' + esc_(g.name) + '</td>' +
        '<th>생년월일</th><td>' + esc_(g.birth) + '</td>' +
        '<th>연락처<br>뒷자리</th><td>' + esc_(g.phone) + '</td>' +
        '<th>ID<br>(VMS,1365)</th><td>' + perf + '</td>' +
        '</tr></table>' +
        '<div class="note">* VMS, 1365 중 해당 되는 곳에 동그라미 해주세요.</div>' +
        '<div class="note">* 본 활동일지는 자원봉사 실적 관리/확인을 위한 자료로 활용되며, 개인정보는 관련 법령 및 복지관 개인정보 처리 방침에 따라 관리됩니다.</div>' +
        '<table class="log"><colgroup>' +
        '<col style="width:10%"><col style="width:24%"><col style="width:8.5%"><col style="width:13.5%">' +
        '<col style="width:9%"><col style="width:13%"><col style="width:11%"><col style="width:11%"></colgroup>' +
        '<tr class="h"><th>일자</th><th>봉사프로그램</th><th colspan="3">활동시간</th><th>본인서명</th><th>담당자 확인</th><th>팀장확인</th></tr>' +
        body + '</table>' +
        '<div class="foot"><span class="pr">전자서명 일지 · 출력일 ' + printed + '</span>' +
        (LOGO_DATA_URL ? '<img class="logo" src="' + LOGO_DATA_URL + '">' : '<span class="org">' + ORG_NAME + '</span>') +
        '</div>' +
        '</div>'
      );
    }
  });

  return '<html><head><meta charset="utf-8"><style>' +
    '@page{size:A4;margin:12mm 13mm 10mm 13mm}' +
    '@media screen{body{padding:18px;max-width:760px;margin:0 auto}.page{margin-bottom:40px}}' +
    'body{font-family:"Noto Sans KR","Malgun Gothic",sans-serif;color:#000;margin:0;font-size:9.5pt}' +
    '.page{page-break-after:always}.page:last-child{page-break-after:auto}' +
    'h1{text-align:center;font-size:19pt;font-weight:bold;letter-spacing:1px;margin:4px 0 14px}' +
    'table{border-collapse:collapse;width:100%;table-layout:fixed}' +
    'th,td{border:1px solid #000;vertical-align:middle;padding:0 2px;word-wrap:break-word}' +
    'th{background:#dce4ef;font-weight:bold;text-align:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '@media print{html,body,table,th,td{-webkit-print-color-adjust:exact;print-color-adjust:exact}.info th,.log th{background-color:#dce4ef!important}}' +
    '.info th,.info td{height:11mm;font-size:9pt;line-height:1.25}.info td{text-align:center}' +
    '.sm{font-size:6.5pt}' +
    '.note{text-align:right;font-size:7pt;line-height:1.35;margin-top:2px}' +
    '.log{margin-top:8px}' +
    '.log tr.h th{height:9mm;font-size:9.5pt}' +
    '.log tr.record{height:20mm}.log td.timecell{padding:0}.time-block{height:20mm;text-align:center}.time-block .clock{height:13mm;line-height:13mm;border-bottom:1px solid #000;box-sizing:border-box}.time-block .meal-row{height:7mm;line-height:7mm;font-size:8pt;white-space:nowrap}.time-block .meal-row span{display:inline-block;width:50%;box-sizing:border-box}.time-block .meal-row .meal-label{border-right:1px solid #000}.time-block .meal-row span.on{display:inline;width:auto}' +
    '.log td{font-size:9pt;line-height:1.3;overflow:hidden}.log tr{page-break-inside:avoid}' +
    '.c{text-align:center}' +
    '.meal{font-size:8pt}' +
    '.hm{font-size:9pt;line-height:1.4}.hm b{font-size:10pt}' +
    '.sub{font-size:8.5pt;color:#333;line-height:1.3;margin-top:3px}' +
    '.on{font-weight:bold;border:1px solid #000;border-radius:50%;padding:0 3px}' +
    '.tag{font-size:6pt;color:#555}' +
    '.foot{margin-top:3mm;overflow:hidden;page-break-inside:avoid}' +
    '.foot .pr{float:left;font-size:7pt;color:#777;padding-top:6px}' +
    '.foot .logo{float:right;height:20px}' +
    '.foot .org{float:right;font-weight:bold;font-size:10pt}' +
    '</style></head><body>' + pages.join('') + '</body></html>';
}


function archiveRootFolder_() {
  if (ARCHIVE_FOLDER_ID) return DriveApp.getFolderById(ARCHIVE_FOLDER_ID);

  const props = PropertiesService.getScriptProperties();
  const saved = props.getProperty('ARCHIVE_FOLDER_ID');
  if (saved) {
    try { return DriveApp.getFolderById(saved); } catch (e) { /* 새로 만듦 */ }
  }

  const folder = DriveApp.createFolder('자원봉사 활동일지 보관');
  props.setProperty('ARCHIVE_FOLDER_ID', folder.getId());
  return folder;
}


function monthFolder_(root, month) {
  const year = month.slice(0, 4);
  const mm = Number(month.slice(5, 7)) + '월';
  const yearFolder = childFolder_(root, year + '년');
  return childFolder_(yearFolder, mm);
}

function childFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}


/* ============================================================
 * 알림 메일
 * ============================================================ */

/** 매일 아침 실행 → REMIND_DAYS 에 해당하는 날에만 보냄 (하루 한 번) */
function sendReminders(force) {
  requireAdmin_();
  return sendReminders_(force);
}

function scheduledActivityReminders_() {return sendReminders_(false);}

function sendReminders_(force) {
  const tz = Session.getScriptTimeZone();
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const day = Number(today.slice(8, 10));
  const props = PropertiesService.getScriptProperties();

  if (force === true) {
    requireAdmin_();
  } else {
    if (REMIND_DAYS.indexOf(day) < 0) return '오늘은 알림 날이 아니에요.';
    if (props.getProperty('LAST_REMIND') === today) return '오늘 이미 보냈어요.';
  }

  const overdue = day === 16 || day === 1;
  const staff = readStaff_().filter(function (s) { return s.active; });
  const rows = readActivity_().filter(function (r) { return r.staffStatus !== '반려' && r.dateText && r.dateText <= today; });
  const link = ADMIN_URL || '';
  const sent = [];

  // 담당자: 확인 대기 (대직 기간이면 대직자에게)
  const staffMap = {};
  rows.filter(function (r) { return r.staffStatus === '확인대기'; }).forEach(function (r) {
    let who = r.assigned || ((findAssignedStaff_(staff, r.program) || {}).name || '');
    const owner = staff.find(function (s) { return s.name === who; });
    if (owner && owner.substitute && today >= (owner.subFrom || '0000') && today <= (owner.subTo || '9999')) {
      who = owner.substitute;
    }
    if (!who) return;
    bump_(staffMap, who, r.dateText);
  });

  // 팀장: 팀장 확인 대기
  const teamMap = {};
  rows.filter(function (r) { return r.staffStatus === '확인완료' && r.leaderStatus !== '확인완료'; })
    .forEach(function (r) { bump_(teamMap, rowTeam_(r, staff), r.dateText); });

  Object.keys(staffMap).forEach(function (name) {
    const s = staff.find(function (x) { return x.name === name; });
    if (!s || !s.email) return;
    const m = staffMap[name];
    sendMail_(s.email,
      '[봉사일지] ' + (overdue ? '마감 지난 ' : '') + '확인 대기 ' + m.count + '건',
      name + ' 님, 확인을 기다리는 자원봉사 활동일지가 <b>' + m.count + '건</b> 있어요.<br>' +
      '가장 오래된 일지: ' + m.oldest, link);
    sent.push(name + ' ' + m.count);
  });

  Object.keys(teamMap).forEach(function (team) {
    if (!team) return;
    staff.filter(function (s) { return s.role === '팀장' && s.team === team && s.email; }).forEach(function (s) {
      const m = teamMap[team];
      sendMail_(s.email,
        '[봉사일지] 팀장 확인 대기 ' + m.count + '건',
        s.name + ' 님, 담당자 확인이 끝나고 팀장 확인을 기다리는 일지가 <b>' + m.count + '건</b> 있어요.<br>' +
        '가장 오래된 일지: ' + m.oldest, link);
      sent.push(s.name + '(팀장) ' + m.count);
    });
  });

  // 관리자 요약
  const admins = staff.filter(function (s) { return s.role === '관리자' && s.email; });
  const ownerEmail = Session.getEffectiveUser().getEmail();
  const adminEmails = admins.length ? admins.map(function (s) { return s.email; }) : [ownerEmail];
  const unassigned = rows.filter(function (r) {
    return r.staffStatus === '확인대기' && !(r.assigned || findAssignedStaff_(staff, r.program));
  }).length;

  const lines = toList_(staffMap).map(function (m) { return '· ' + m.name + ': 담당자 확인 ' + m.count + '건 (가장 오래된 ' + m.oldest + ')'; })
    .concat(toList_(teamMap).map(function (m) { return '· ' + (m.name || '팀 미지정') + ' 팀장 확인 ' + m.count + '건'; }));
  if (unassigned) lines.push('· 담당자 미배정 ' + unassigned + '건 — 현황판에서 배정해 주세요');

  if (lines.length) {
    adminEmails.forEach(function (email) {
      sendMail_(email, '[봉사일지] 미완료 현황 요약', lines.join('<br>'), link);
    });
  }

  props.setProperty('LAST_REMIND', today);
  return '보냄: ' + (sent.join(', ') || '없음');
}


function sendMail_(to, subject, html, link) {
  const button = link
    ? '<p style="margin:18px 0"><a href="' + link + '" style="background:#2457a7;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">확인하러 가기</a></p>'
    : '';
  MailApp.sendEmail({
    to: to,
    subject: subject,
    htmlBody: '<div style="font-family:sans-serif;font-size:14px;line-height:1.7">' + html + button +
      '<p style="color:#888;font-size:12px">' + ORG_NAME + ' 자원봉사 활동일지 자동 알림</p></div>'
  });
}


/* ============================================================
 * 처음 한 번 실행: setupAll()  (편집기에서 ▶ 실행)
 * ============================================================ */
function setupAll() {
  requireAdmin_();
  const spreadsheet = ss_();

  const staffSheet = getRequiredSheet(spreadsheet, STAFF_SHEET_NAME);
  ensureStaffColumns_(staffSheet);
  const header = staffSheet.getRange(1, 1, 1, STAFF_COLUMN_COUNT).getDisplayValues()[0];

  // 예전 PIN 칸 → 이메일 칸으로 (PIN은 더 이상 쓰지 않으므로 지움)
  if (cleanText(header[2]).toUpperCase() === 'PIN' || cleanText(header[2]) === '') {
    const last = staffSheet.getLastRow();
    if (last >= 2) {
      const col = staffSheet.getRange(2, 3, last - 1, 1);
      col.setValues(col.getValues().map(function (r) {
        return [String(r[0]).indexOf('@') > 0 ? r[0] : ''];
      }));
    }
  }
  staffSheet.getRange(1, 1, 1, STAFF_COLUMN_COUNT).setValues([STAFF_HEADERS]).setFontWeight('bold');
  staffSheet.setFrozenRows(1);

  const roleRule = SpreadsheetApp.newDataValidation().requireValueInList(ROLES, true).build();
  staffSheet.getRange(2, STAFF_COLUMNS.ROLE, Math.max(staffSheet.getMaxRows() - 1, 1), 1).setDataValidation(roleRule);

  const activitySheet = getRequiredSheet(spreadsheet, ACTIVITY_SHEET_NAME);
  ensureActivityColumns_(activitySheet);
  activitySheet.getRange(1, 28, 1, NEW_ACTIVITY_HEADERS.length).setValues([NEW_ACTIVITY_HEADERS]).setFontWeight('bold');

  const folder = archiveRootFolder_();

  installActivityLogMaintenance_();

  return '준비 완료! PDF 보관 폴더: ' + folder.getUrl();
}


/** 코드 교체 후 편집기에서 한 번 실행. 기존 자동 알림·보관의 시간과 폴더는 유지합니다. */
function installActivityLogMaintenance(){
  requireAdmin_();
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try {installActivityLogMaintenance_();return '설정 완료: 활동내용 문구 탭, 매일 오전 9시 알림 점검, 오전 2시 PDF 보관';}
  finally {lock.releaseLock();}
}
function installActivityLogMaintenance_(){
  ensureActivityContentSheet_();
  const tracked=['sendReminders','archiveMonthlyPdfs','scheduledActivityReminders_','archiveMonthlyPdfs_'];
  // 새 트리거 설치가 둘 다 성공한 다음 기존 트리거를 정리합니다.
  const old=ScriptApp.getProjectTriggers().filter(t=>tracked.indexOf(t.getHandlerFunction())>=0);
  const added=[];
  try {
    added.push(ScriptApp.newTrigger('scheduledActivityReminders_').timeBased().everyDays(1).atHour(9).create());
    added.push(ScriptApp.newTrigger('archiveMonthlyPdfs_').timeBased().everyDays(1).atHour(2).create());
  }catch(e){added.forEach(t=>{try{ScriptApp.deleteTrigger(t);}catch(ignore){}});throw e;}
  old.forEach(t=>ScriptApp.deleteTrigger(t));
}

function ensureActivityColumns_(sheet) {
  if (sheet.getMaxColumns() < ACTIVITY_COLUMN_COUNT) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), ACTIVITY_COLUMN_COUNT - sheet.getMaxColumns());
  }
  const head = sheet.getRange(1, 28).getDisplayValue();
  if (!cleanText(head)) {
    sheet.getRange(1, 28, 1, NEW_ACTIVITY_HEADERS.length).setValues([NEW_ACTIVITY_HEADERS]);
  }
}

function ensureStaffColumns_(sheet) {
  if (sheet.getMaxColumns() < STAFF_COLUMN_COUNT) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), STAFF_COLUMN_COUNT - sheet.getMaxColumns());
  }
}


/* ============================================================
 * 데이터 읽기
 * ============================================================ */

/** 스프레드시트는 한 번 실행에 한 번만 엶 (예전에는 읽을 때마다 새로 열어서 느렸어요) */
let SS_MEMO_ = null;
function ss_() {
  return SS_MEMO_ || (SS_MEMO_ = SpreadsheetApp.openById(SPREADSHEET_ID));
}


/** 담당자 명단도 한 번 실행에 한 번만 읽음 (담당자 저장 후에는 다시 읽게 비움) */
let STAFF_MEMO_ = null;
function readStaff_() {
  if (!STAFF_MEMO_) STAFF_MEMO_ = readStaffSheet_();
  return STAFF_MEMO_.slice();
}
function readStaffSheet_() {
  const sheet = getRequiredSheet(ss_(), STAFF_SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const width = Math.min(sheet.getMaxColumns(), STAFF_COLUMN_COUNT);
  const C = STAFF_COLUMNS;

  return sheet.getRange(2, 1, lastRow - 1, width).getValues().map(function (raw, i) {
    const row = pad_(raw, STAFF_COLUMN_COUNT);
    const email = cleanText(row[C.EMAIL - 1]).toLowerCase();
    return {
      rowNumber: i + 2,
      staffId: cleanText(row[C.STAFF_ID - 1]),
      name: cleanText(row[C.STAFF_NAME - 1]),
      email: email.indexOf('@') > 0 ? email : '',
      signatureFileId: cleanText(row[C.SIGNATURE_FILE_ID - 1]),
      signatureFileUrl: cleanText(row[C.SIGNATURE_FILE_URL - 1]),
      active: cleanText(row[C.ACTIVE - 1]).toUpperCase() === 'Y',
      team: normalizeName_(row[C.TEAM - 1]),
      role: ROLES.indexOf(cleanText(row[C.ROLE - 1])) >= 0 ? cleanText(row[C.ROLE - 1]) : '담당자',
      programs: cleanText(row[C.PROGRAMS - 1]).split(/[,，\n]/).map(cleanText).filter(Boolean),
      substitute: cleanText(row[C.SUBSTITUTE - 1]),
      subFrom: formatDateForInput(row[C.SUB_FROM - 1]),
      subTo: formatDateForInput(row[C.SUB_TO - 1])
    };
  }).filter(function (s) { return s.name; });
}


function findAssignedStaff_(staff, program) {
  const p = normalizeName_(program);
  if (!p) return null;
  return staff.find(function (s) {
    return s.active && s.programs.some(function (x) { return normalizeName_(x) === p; });
  }) || null;
}


function readActivity_() {
  const sheet = getRequiredSheet(ss_(), ACTIVITY_SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const width = Math.min(sheet.getMaxColumns(), ACTIVITY_COLUMN_COUNT);
  const range = sheet.getRange(2, 1, lastRow - 1, width);
  const shown = range.getDisplayValues();
  return range.getValues()
    .map(function (row, i) { return toRecord_(pad_(row, ACTIVITY_COLUMN_COUNT), i + 2, pad_(shown[i], ACTIVITY_COLUMN_COUNT)); })
    .filter(function (r) { return r.logId; });
}


function getActivityRecord_(rowNumber, logId) {
  if (!Number.isInteger(rowNumber) || rowNumber < 2) throw new Error('일지 번호가 올바르지 않아요.');

  const sheet = getRequiredSheet(ss_(), ACTIVITY_SHEET_NAME);
  if (rowNumber > sheet.getLastRow()) throw new Error('일지를 찾지 못했어요.');

  const width = Math.min(sheet.getMaxColumns(), ACTIVITY_COLUMN_COUNT);
  const range = sheet.getRange(rowNumber, 1, 1, width);
  const r = toRecord_(
    pad_(range.getValues()[0], ACTIVITY_COLUMN_COUNT),
    rowNumber,
    pad_(range.getDisplayValues()[0], ACTIVITY_COLUMN_COUNT)
  );

  if (!r.logId) throw new Error('일지를 찾지 못했어요.');
  if (logId && cleanText(logId) !== r.logId) throw new Error('일지 정보가 바뀌었어요. 목록을 새로고침해 주세요.');
  return r;
}


/**
 * 시간 칸은 '화면에 보이는 값'으로 읽어요.
 * (시트 시간값을 날짜로 바꾸면 1899년 기준 시간대 차이로 몇 분씩 어긋나는 문제가 있어서)
 */
function toRecord_(row, rowNumber, shown) {
  const C = ACTIVITY_COLUMNS;
  const g = function (c) { return row[c - 1]; };
  const s = function (c) { return shown ? cleanText(shown[c - 1]) : ''; };
  const dur = function (c) {
    const fromText = parseDurationText_(s(c));
    return fromText !== null ? fromText : (g(c) === '' ? 0 : sheetTimeToMinutes(g(c)));
  };
  const clock = function (c) {
    const m = s(c).match(/^(\d{1,2}):(\d{2})/);
    return m ? m[1].padStart(2, '0') + ':' + m[2] : formatTimeForInput(g(c));
  };
  const calc = dur(C.CALCULATED_TIME);

  return {
    rowNumber: rowNumber,
    logId: cleanText(g(C.LOG_ID)),
    name: cleanText(g(C.VOLUNTEER_NAME)),
    birthText: formatDateForInput(g(C.BIRTH_DATE)).replace(/-/g, '.'),
    phone: cleanText(g(C.PHONE_LAST4)).padStart(4, '0'),
    dateText: formatDateForInput(g(C.ACTIVITY_DATE)),
    day: cleanText(g(C.DAY_OF_WEEK)),
    program: cleanText(g(C.PROGRAM)),
    content: cleanText(g(C.ACTIVITY_CONTENT)),
    start: clock(C.START_TIME),
    end: clock(C.END_TIME),
    meal: cleanText(g(C.MEAL_STATUS)),
    calcMin: calc,
    finalMin: g(C.FINAL_APPROVED_TIME) === '' ? 0 : dur(C.FINAL_APPROVED_TIME),
    sigId: cleanText(g(C.SIGNATURE_FILE_ID)),
    staffStatus: cleanText(g(C.STAFF_CONFIRM_STATUS)) || '확인대기',
    staffName: cleanText(g(C.STAFF_NAME)),
    staffSigId: cleanText(g(C.STAFF_SIGNATURE_FILE_ID)),
    leaderStatus: cleanText(g(C.TEAM_LEADER_CONFIRM_STATUS)),
    leaderName: cleanText(g(C.TEAM_LEADER_NAME)),
    inputDone: cleanText(g(C.VMS_1365_REGISTRATION_STATUS)) === '등록완료',
    note: cleanText(g(C.NOTE)),
    regType: cleanText(g(C.REGISTRATION_TYPE)),
    org: cleanText(g(C.ORGANIZATION)),
    assigned: cleanText(g(C.ASSIGNED_STAFF)),
    confirmType: cleanText(g(C.CONFIRM_TYPE)),
    confirmTeam: normalizeName_(g(C.CONFIRM_TEAM)),
    leaderSigId: cleanText(g(C.LEADER_SIGNATURE_FILE_ID)),
    perfSystem: cleanText(g(C.PERF_SYSTEM)),
    perfId: cleanText(g(C.PERF_ID)),
    pdfId: cleanText(g(C.PDF_FILE_ID))
  };
}


/** '2시간 02분' / '2:00' / '2:00:00' / '45분' → 분. 못 읽으면 null */
function parseDurationText_(text) {
  if (!text) return null;
  let m = text.match(/^(\d+):(\d{2})(:\d{2})?$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const h = text.match(/(\d+)\s*시간/);
  const mi = text.match(/(\d+)\s*분/);
  if (h || mi) return (h ? Number(h[1]) * 60 : 0) + (mi ? Number(mi[1]) : 0);
  return null;
}


function clearPdfMark_(sheet, rowNumber) {
  if (sheet.getMaxColumns() >= ACTIVITY_COLUMNS.PDF_FILE_ID) {
    sheet.getRange(rowNumber, ACTIVITY_COLUMNS.PDF_FILE_ID).clearContent();
  }
}


function pad_(row, n) {
  const out = row.slice();
  while (out.length < n) out.push('');
  return out;
}


/* ============================================================
 * 공용 도구
 * ============================================================ */

/**
 * 서명 이미지를 드라이브에서 받아 오는 데 3초 넘게 걸려서 6시간 동안 기억해 둬요.
 * 서명을 새로 하면 파일 ID가 바뀌므로 예전 이미지가 보일 일은 없어요.
 * 한 칸에 100KB까지만 들어가서 30,000자씩 나눠 저장해요.
 */
function imageDataUrl_(fileId) {
  if (!fileId) return '';
  const cache = CacheService.getScriptCache();
  const prefix = 'sig-v1:' + fileId;
  try {
    const count = Number(cache.get(prefix));
    if (count > 0) {
      const keys = [];
      for (let i = 0; i < count; i++) keys.push(prefix + ':' + i);
      const parts = cache.getAll(keys);
      if (keys.every(function (k) { return typeof parts[k] === 'string'; })) {
        return keys.map(function (k) { return parts[k]; }).join('');
      }
    }
  } catch (e) {}
  let url;
  try {
    const blob = DriveApp.getFileById(fileId).getBlob();
    url = 'data:' + (blob.getContentType() || 'image/png') + ';base64,' + Utilities.base64Encode(blob.getBytes());
  } catch (e) {
    return '';
  }
  try {
    const count = Math.ceil(url.length / 30000);
    if (count <= 30) {
      const parts = {};
      for (let i = 0; i < count; i++) parts[prefix + ':' + i] = url.slice(i * 30000, (i + 1) * 30000);
      cache.putAll(parts, 21600);
      cache.put(prefix, String(count), 21600);
    }
  } catch (e) {}
  return url;
}


function currentPeriod_() {
  const tz = Session.getScriptTimeZone();
  const now = new Date();
  const month = Utilities.formatDate(now, tz, 'yyyy-MM');
  const day = Number(Utilities.formatDate(now, tz, 'd'));
  const last = daysInMonth_(month);
  return day <= 15
    ? { from: month + '-01', to: month + '-15', label: '1~15일' }
    : { from: month + '-16', to: month + '-' + String(last).padStart(2, '0'), label: '16~' + last + '일' };
}


function normalizeRange_(from, to) {
  const f = formatDateForInput(from) || '2000-01-01';
  const t = formatDateForInput(to) || '2999-12-31';
  return f <= t ? { from: f, to: t } : { from: t, to: f };
}

function inRange_(dateText, range) {
  return dateText && dateText >= range.from && dateText <= range.to;
}

function daysInMonth_(month) {
  return new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
}

function todayText_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function normalizeName_(v) {
  return cleanText(v).replace(/\s+/g, '');
}

function esc_(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


/** 날짜·시간 칸 표시 형식 — 칸마다 따로 하지 않고 한 줄을 한 번에 (6번 → 2번) */
function formatActivityRow_(sheet, rowNumber) {
  const C = ACTIVITY_COLUMNS;
  const want = {};
  want[C.SUBMITTED_AT] = 'yyyy-mm-dd hh:mm:ss';
  want[C.BIRTH_DATE] = 'yyyy-mm-dd';
  want[C.ACTIVITY_DATE] = 'yyyy-mm-dd';
  want[C.CALCULATED_TIME] = '[h]"시간 "mm"분"';
  want[C.FINAL_APPROVED_TIME] = '[h]"시간 "mm"분"';
  want[C.STAFF_CONFIRMED_AT] = 'yyyy-mm-dd hh:mm:ss';
  const cols = Object.keys(want).map(Number), first = Math.min.apply(null, cols), last = Math.max.apply(null, cols);
  const range = sheet.getRange(rowNumber, first, 1, last - first + 1);
  const formats = range.getNumberFormats();
  cols.forEach(function (c) { formats[0][c - first] = want[c]; });
  range.setNumberFormats(formats);
}


function findVolunteerByRow(sheet, rowNumber) {
  if (!Number.isInteger(rowNumber) || rowNumber < 2 || rowNumber > sheet.getLastRow()) return null;

  const row = sheet.getRange(rowNumber, 1, 1, 9).getValues()[0];
  const name = cleanText(row[1]);
  if (!name || cleanText(row[4]).toUpperCase() !== 'Y') return null;

  return {
    displayName: cleanText(row[0]),
    name: name,
    birthDate: normalizeSheetDate(row[2]),
    phoneLast4: cleanText(row[3]).padStart(4, '0'),
    performanceSystem: cleanText(row[5]),
    performanceId: cleanText(row[6]),
    organization: cleanText(row[7])
  };
}


function createNextStaffId(staff) {
  let max = 0;
  staff.forEach(function (s) {
    const m = String(s.staffId || '').match(/^STAFF(\d+)$/i);
    if (m) max = Math.max(max, Number(m[1]));
  });
  return 'STAFF' + String(max + 1).padStart(3, '0');
}


function saveSignatureImage_(options) {
  const folder = DriveApp.getFolderById(SIGNATURE_FOLDER_ID);
  const bytes = Utilities.base64Decode(options.signatureData.replace(/^data:image\/png;base64,/, ''));
  const fileName = String(options.activityDate).replace(/-/g, '') + '_' +
    cleanFileName(options.name) + '_' + options.logId + '_서명.png';
  return folder.createFile(Utilities.newBlob(bytes, 'image/png', fileName));
}


function saveStaffSignatureImage_(options) {
  const folder = DriveApp.getFolderById(SIGNATURE_FOLDER_ID);
  const bytes = Utilities.base64Decode(options.signatureData.replace(/^data:image\/png;base64,/, ''));
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const fileName = stamp + '_' + cleanFileName(options.staffId) + '_' + cleanFileName(options.staffName) + '_담당자서명.png';
  return folder.createFile(Utilities.newBlob(bytes, 'image/png', fileName));
}


function calculateActivityMinutes(startTime, endTime) {
  return timeToMinutes(endTime) - timeToMinutes(startTime);
}


function timeToMinutes(timeText) {
  const parts = String(timeText).split(':');
  if (parts.length !== 2) throw new Error('시간 형식이 올바르지 않습니다.');
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error('시간 형식이 올바르지 않습니다.');
  }
  return hour * 60 + minute;
}


function minutesToSheetTime(totalMinutes) {
  return totalMinutes / 1440;
}


function sheetTimeToMinutes(value) {
  if (typeof value === 'number') return Math.round(value * 1440);

  if (Object.prototype.toString.call(value) === '[object Date]' && !Number.isNaN(value.getTime())) {
    return value.getHours() * 60 + value.getMinutes();
  }

  const text = cleanText(value);
  if (!text) return 0;
  if (/^\d+:\d{2}$/.test(text)) {
    const p = text.split(':');
    return Number(p[0]) * 60 + Number(p[1]);
  }
  const h = text.match(/(\d+)\s*시간/);
  const m = text.match(/(\d+)\s*분/);
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
}


function createLogId(sheet, activityDate) {
  const dateText = Utilities.formatDate(activityDate, Session.getScriptTimeZone(), 'yyyyMMdd');
  const prefix = 'VL-' + dateText + '-';
  let max = 0;

  if (sheet.getLastRow() >= 2) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues().flat().forEach(function (id) {
      if (String(id).startsWith(prefix)) max = Math.max(max, Number(String(id).slice(prefix.length)) || 0);
    });
  }

  return prefix + String(max + 1).padStart(4, '0');
}


function parseDate(dateText) {
  const m=cleanText(dateText).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)throw new Error('날짜를 YYYY-MM-DD 형식으로 입력해 주세요.');
  const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]);
  if(y<1000||mo<1||mo>12||d<1||d>31)throw new Error('실제로 존재하는 날짜를 입력해 주세요.');
  const value=new Date(0);value.setHours(0,0,0,0);value.setFullYear(y,mo-1,d);
  if(value.getFullYear()!==y||value.getMonth()!==mo-1||value.getDate()!==d)throw new Error('실제로 존재하는 날짜를 입력해 주세요.');
  return value;
}

function normalizeSheetDate(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !Number.isNaN(value.getTime())) return value;
  const text = formatDateForInput(value);
  return text ? parseDate(text) : '';
}


function formatDateForInput(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !Number.isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  const numbers = String(value).trim().match(/\d+/g);
  if (!numbers || numbers.length < 3) return '';
  return numbers[0].padStart(4, '0') + '-' + numbers[1].padStart(2, '0') + '-' + numbers[2].padStart(2, '0');
}


function formatTimeForInput(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !Number.isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm');
  }
  return cleanText(value);
}


function getKoreanDay(date) {
  return ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
}


function formatMinutes(totalMinutes) {
  const n = Number(totalMinutes);
  if (!Number.isFinite(n) || n <= 0) return '0분';
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (h === 0) return m + '분';
  if (m === 0) return h + '시간';
  return h + '시간 ' + m + '분';
}


function cleanText(value) {
  return String(value == null ? '' : value).trim();
}


function cleanFileName(value) {
  return cleanText(value).replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
}


function getRequiredSheet(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error("'" + sheetName + "' 시트를 찾지 못했습니다.");
  return sheet;
}


/* ============================================================
 * 시트 양식·운영점검 (관리자가 편집기에서 실행)
 * ============================================================ */

function repairActivityReportSheetFormulas() {
  requireAdmin_();
  const reportSheet = getRequiredSheet(ss_(), REPORT_SHEET_NAME);

  reportSheet.getRange('L6:W6').setValues([[
    '활동일', '요일', '봉사프로그램', '활동내용', '시작시간', '종료시간',
    '식사여부', '인정활동시간', '서명파일ID', '담당자확인', '담당자서명파일ID', '팀장확인'
  ]]);

  reportSheet.getRange('L7').setFormula(
    '=IFERROR(SORT(FILTER({\'활동원본\'!F2:F,\'활동원본\'!G2:G,\'활동원본\'!H2:H,\'활동원본\'!I2:I,\'활동원본\'!J2:J,\'활동원본\'!K2:K,\'활동원본\'!L2:L,IF(\'활동원본\'!N2:N="",\'활동원본\'!M2:M,\'활동원본\'!N2:N),\'활동원본\'!O2:O,\'활동원본\'!Q2:Q,\'활동원본\'!T2:T,\'활동원본\'!V2:V},\'활동원본\'!C2:C=$B$3,\'활동원본\'!F2:F>=$K$3,\'활동원본\'!F2:F<=$K$4,\'활동원본\'!Q2:Q<>"반려"),1,TRUE,5,TRUE),"")'
  );

  [7, 9, 11, 13, 15, 17].forEach(function (row) {
    reportSheet.getRange(row, 1).setFormula('=IF(INDEX($L$7:$L$18,INT((ROW()-7)/2)+1)="","2026년"&CHAR(10)&"/"&CHAR(10)&"요일",TEXT(INDEX($L$7:$L$18,INT((ROW()-7)/2)+1),"yyyy년"&CHAR(10)&"m/d")&CHAR(10)&INDEX($M$7:$M$18,INT((ROW()-7)/2)+1)&"요일")');
    reportSheet.getRange(row, 2).setFormula('=IFERROR(INDEX($N$7:$N$18,INT((ROW()-7)/2)+1)&CHAR(10)&INDEX($O$7:$O$18,INT((ROW()-7)/2)+1),"")');
    reportSheet.getRange(row, 3).setFormula('=IFERROR(TEXT(INDEX($P$7:$P$18,INT((ROW()-7)/2)+1),"hh:mm")&" ~ "&TEXT(INDEX($Q$7:$Q$18,INT((ROW()-7)/2)+1),"hh:mm"),"")');
    reportSheet.getRange(row, 5).setFormula('=IF(INDEX($S$7:$S$18,INT((ROW()-7)/2)+1)="","(           )"&CHAR(10)&"시간"&CHAR(10)&"(           )"&CHAR(10)&"분",INT(INDEX($S$7:$S$18,INT((ROW()-7)/2)+1)*24)&"시간"&CHAR(10)&ROUND(MOD(INDEX($S$7:$S$18,INT((ROW()-7)/2)+1)*24,1)*60)&"분")');
    reportSheet.getRange(row, 6).setFormula('=IFERROR(IF(INDEX($T$7:$T$18,INT((ROW()-7)/2)+1)="","",IMAGE("https://drive.google.com/uc?export=view&id="&INDEX($T$7:$T$18,INT((ROW()-7)/2)+1),4,52,82)),"")');
    reportSheet.getRange(row, 7).setFormula('=IFERROR(IF(INDEX($U$7:$U$18,INT((ROW()-7)/2)+1)<>"확인완료","",IMAGE("https://drive.google.com/uc?export=view&id="&INDEX($V$7:$V$18,INT((ROW()-7)/2)+1),4,45,90)),"")');
    reportSheet.getRange(row, 8).setFormula('=IFERROR(IF(INDEX($W$7:$W$18,INT((ROW()-7)/2)+1)="확인대기","",INDEX($W$7:$W$18,INT((ROW()-7)/2)+1)),"")');
  });

  [8, 10, 12, 14, 16, 18].forEach(function (row) {
    reportSheet.getRange(row, 4).setFormula('=IFERROR(IF(INDEX($R$7:$R$18,INT((ROW()-8)/2)+1)="식사함","O","X"),"O,   X")');
  });

  reportSheet.hideColumns(12, 12);
  return '활동일지 양식 수식이 수정되었습니다.';
}


function setupOperationalReviewSheet() {
  requireAdmin_();
  const spreadsheet = ss_();
  let sheet = spreadsheet.getSheetByName('운영점검') || spreadsheet.insertSheet('운영점검');

  if (sheet.getMaxRows() < 90) sheet.insertRowsAfter(sheet.getMaxRows(), 90 - sheet.getMaxRows());
  if (sheet.getMaxColumns() < 12) sheet.insertColumnsAfter(sheet.getMaxColumns(), 12 - sheet.getMaxColumns());

  sheet.getRange('A1:L90').breakApart();
  sheet.getRange('A1:L90').clear();
  sheet.setFrozenRows(4);

  sheet.getRange('A1:L1').merge().setValue('운영점검').setFontSize(16).setFontWeight('bold').setBackground('#e5e7eb');
  sheet.getRange('A2:F2').setValues([['확인대기', '', '반려', '', '미등록봉사자', '']]);
  sheet.getRange('B2').setFormula('=COUNTIF(\'활동원본\'!Q2:Q,"확인대기")');
  sheet.getRange('D2').setFormula('=COUNTIF(\'활동원본\'!Q2:Q,"반려")');
  sheet.getRange('F2').setFormula('=COUNTIF(\'활동원본\'!Z2:Z,"미등록봉사자")');
  sheet.getRange('A3:L3').merge().setValue('월말에는 확인대기 0건인지 먼저 확인하고, 반려 건은 비고 사유를 확인하세요.');

  const base = "{'활동원본'!A2:A,'활동원본'!F2:F,'활동원본'!C2:C,'활동원본'!H2:H,'활동원본'!I2:I,'활동원본'!J2:J,'활동원본'!K2:K,IF('활동원본'!N2:N=\"\",'활동원본'!M2:M,'활동원본'!N2:N),'활동원본'!Q2:Q,'활동원본'!Y2:Y,'활동원본'!Z2:Z,'활동원본'!AA2:AA}";
  writeOperationalReviewSection_(sheet, 5, '확인대기 목록', '=IFERROR(QUERY(' + base + ",\"select * where Col9 = '확인대기' order by Col2 asc limit 20\",0),\"\")");
  writeOperationalReviewSection_(sheet, 32, '반려 목록', '=IFERROR(QUERY(' + base + ",\"select * where Col9 = '반려' order by Col2 desc limit 20\",0),\"\")");
  writeOperationalReviewSection_(sheet, 59, '미등록봉사자 목록', '=IFERROR(QUERY(' + base + ",\"select * where Col11 = '미등록봉사자' and Col9 <> '반려' order by Col2 desc limit 20\",0),\"\")");

  sheet.getRangeList(['A2:F2', 'A5:L5', 'A32:L32', 'A59:L59']).setFontWeight('bold').setBackground('#eeeeee');
  sheet.getRangeList(['A6:L6', 'A33:L33', 'A60:L60']).setFontWeight('bold').setBackground('#cccccc');
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 95);
  sheet.setColumnWidth(3, 90);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 150);
  sheet.setColumnWidths(6, 3, 80);
  sheet.setColumnWidths(9, 4, 120);
  sheet.getRange('A1:L90').setVerticalAlignment('middle');

  return '운영점검 시트가 준비되었습니다.';
}


function writeOperationalReviewSection_(sheet, startRow, title, formula) {
  sheet.getRange(startRow, 1, 1, 12).merge().setValue(title);
  sheet.getRange(startRow + 1, 1, 1, 12).setValues([[
    '일지ID', '활동일', '성명', '봉사프로그램', '활동내용', '시작', '종료', '인정시간', '상태', '비고', '등록구분', '소속'
  ]]);
  sheet.getRange(startRow + 2, 1).setFormula(formula);
}


/* 복지관 로고 (일지 PDF 아래쪽) — 비워 두면 글자로 표시 */
const LOGO_DATA_URL = 'data:image/png;base64,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';
