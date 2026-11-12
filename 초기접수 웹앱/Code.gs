const SHEETS = {
  criteria: '기준표',
  internalResources: '프로그램현황',
  internalResourceDraft: '프로그램현황_초안',
  externalResources: '외부자원목록',
  settings: '설정',
  checkRules: '확인주기',
  changeLog: '변경이력',
};

const CRITERIA_HEADERS = ['기준종류', '값', '설명', '사용여부', '정렬순서', '판단기준', '대표사례'];

const EXTERNAL_RESOURCE_HEADERS = [
  '외부자원ID', '기관명', '자원명', '자원유형', '주요지원내용',
  '이용대상', '생애주기', '장애유형', '욕구키워드', '상담목적태그',
  '지역', '운영상태', '연락처', '홈페이지', '상세링크', '이용방법', '비용',
  '담당자', '추천문구', '이런분께추천', '최종확인일', '비고', '활성여부',
  '최종수정일', '수정자',
];

const INTERNAL_RESOURCE_HEADERS = [
  '내부자원ID',
  '운영연도',
  '소속팀',
  '사업명',
  '자원명',
  '자원그룹',
  '자원유형',
  '이용대상',
  '생애주기',
  '장애유형',
  '상담목적태그',
  '욕구키워드',
  '일시',
  '회기/기간',
  '이용료',
  '장소',
  '모집상태',
  '담당자',
  '연락처',
  '홍보지링크',
  '추천문구',
  '활성여부',
  '비고',
  '모집유형',
  '다음확인일',
  '확인일',
  '확인자',
  '최종수정일',
  '수정자',
];

const PROGRAM_EDITABLE_HEADERS = [
  '자원명',
  '사업명',
  '소속팀',
  '자원그룹',
  '자원유형',
  '이용대상',
  '생애주기',
  '장애유형',
  '상담목적태그',
  '욕구키워드',
  '일시',
  '회기/기간',
  '이용료',
  '장소',
  '모집상태',
  '담당자',
  '연락처',
  '홍보지링크',
  '추천문구',
  '활성여부',
  '비고',
  '모집유형',
  '다음확인일',
];

const PROGRAM_RECRUIT_STATUSES = ['모집중', '대기', '모집예정', '상시', '확인필요', '마감', '종료'];
const DEFAULT_ADMIN_PIN = '7051';

const PROGRAM_STANDARD_CRITERIA = [
  ['상담목적', '프로그램/사업 문의', '복지관 프로그램, 사업, 모임, 교육, 활동에 대한 문의·신청·대기', 'O', 1, '복지관에서 운영하는 프로그램, 사업, 교육, 모임 등에 참여하거나 신청하려는 경우', '프로그램 신청, 사업 문의, 대기 등록'],
  ['상담목적', '치료 문의/대기', '치료서비스 이용, 대기, 절차 문의', 'O', 2, '치료서비스 이용, 대기, 절차를 문의하는 경우', '치료 대기, 치료 가능 여부, 절차 문의'],
  ['상담목적', '정보문의', '복지관 서비스, 복지제도, 지역자원, 이용 절차 등에 대한 정보 문의', 'O', 3, '정보만 얻고 싶은 경우', '복지제도 문의, 지역자원 안내'],
  ['상담목적', '취업문의/연계', '직업상담, 취업 준비, 직업훈련, 취업 유지, 일자리 연계 관련 문의', 'O', 4, '취업 준비, 직업훈련, 일자리 연계와 관련된 상담', '직업상담, 고용센터 연계'],
  ['상담목적', '사례관리/생활지원', '경제, 건강, 돌봄, 일상생활 등 복합적 어려움 또는 생활지원 문의', 'O', 5, '경제, 건강, 돌봄, 주거 등 복합적인 생활의 어려움을 해결하기 위한 상담', '생활지원, 긴급지원, 사례관리'],
  ['상담목적', '후원문의', '후원 신청, 후원금품, 기부금영수증 등', 'O', 6, '후원 신청, 후원금품, 기부금영수증 등 후원과 관련된 문의', 'CMS, 물품후원, 기부금영수증'],
  ['상담목적', '자원봉사문의', '자원봉사 신청, 활동, 확인서 관련 문의', 'O', 7, '자원봉사 신청, 활동, 확인서와 관련된 문의', 'VMS/1365, 봉사활동, 확인서'],
  ['상담목적', '재상담/진행확인', '이전 상담의 진행상황 확인', 'O', 8, '이전 상담의 안내, 연결, 후속조치 진행상황을 확인하는 경우', '이전 상담 확인, 담당자 전달 결과 확인'],
  ['상담목적', '기타', '위 항목으로 분류하기 어려운 상담', 'O', 9, '위 항목으로 분류하기 어려운 상담', '기타 상담'],

  ['욕구키워드', '일상생활', '일상생활 지원', 'O', 1, '식사, 이동, 생활관리 등 일상 유지와 관련된 욕구', '일상생활 지원'],
  ['욕구키워드', '경제지원', '경제적 어려움', 'O', 2, '생계비, 긴급지원, 후원 등 경제적 지원 욕구', '긴급지원, 후원'],
  ['욕구키워드', '건강', '건강관리', 'O', 3, '건강관리, 만성질환, 건강상담 등 건강과 관련된 욕구', '건강상담, 건강관리'],
  ['욕구키워드', '심리정서', '심리정서 지원', 'O', 4, '우울, 불안, 정서적 어려움, 심리상담 욕구', '심리상담, 정서지원'],
  ['욕구키워드', '발달재활', '발달재활/치료', 'O', 5, '발달재활, 언어, 감각, 치료 관련 욕구', '발달재활, 치료서비스'],
  ['욕구키워드', '운동', '운동/신체활동', 'O', 6, '체육활동, 운동컨설팅, 신체활동 욕구', 'AI운동컨설팅, 체육활동'],
  ['욕구키워드', '문화여가', '문화/여가 활동', 'O', 7, '사진, 영화, 미술, 취미, 여가활동 욕구', '사진모임, 영화, 미술'],
  ['욕구키워드', '교육', '교육/배움', 'O', 8, '디지털교육, 부모교육, 기초교육 등 배움 욕구', '디지털교육, 부모교육'],
  ['욕구키워드', '자기개발', '자기개발', 'O', 9, '역량 강화, 자기표현, 성장 활동 욕구', '자기표현, 역량강화'],
  ['욕구키워드', '가족지원', '가족/지원인 지원', 'O', 10, '가족, 보호자, 지원인 상담 및 교육 욕구', '부모교육, 가족상담'],
  ['욕구키워드', '돌봄', '돌봄 필요', 'O', 11, '돌봄, 보호, 일시지원 등 돌봄 욕구', '돌봄지원'],
  ['욕구키워드', '자립생활', '자립생활', 'O', 12, '자립생활, 생활기술, 지역사회 생활 관련 욕구', '자립생활 지원'],
  ['욕구키워드', '사회관계', '사회관계', 'O', 13, '자조모임, 주민모임, 동아리, 타임클라우드, 모니터링단 등 관계와 사회활동 욕구', '자조모임, 주민모임, 타임클라우드'],
  ['욕구키워드', '취업', '일자리/취업', 'O', 14, '취업, 직업훈련, 일자리 연계 욕구', '취업상담, 직업훈련'],
  ['욕구키워드', '주거', '주거 관련', 'O', 15, '주거 안정, 주거환경, 주거지원 욕구', '주거지원'],
  ['욕구키워드', '권익옹호', '권익옹호', 'O', 16, '권리침해, 차별, 법률, 옹호 지원 욕구', '권익옹호, 법률상담'],
  ['욕구키워드', '기타', '기타 욕구', 'O', 17, '위 기준으로 분류하기 어려운 욕구', '기타 욕구'],

  // 장애유형: ensureProgramStandardCriteria_가 기존 시트에도 자동 추가
  ['장애유형', '전체', '전체 장애유형 대상 / 제한 없음', 'O', 1],
  ['장애유형', '발달장애', '발달장애 (지적장애·자폐성장애 포함)', 'O', 2],
  ['장애유형', '지적장애', '지적장애 (발달장애와 상호 매칭)', 'O', 3],
  ['장애유형', '자폐성장애', '자폐성장애 (발달장애와 상호 매칭)', 'O', 4],
  ['장애유형', '지체장애', '지체장애', 'O', 5],
  ['장애유형', '뇌병변장애', '뇌병변장애', 'O', 6],
  ['장애유형', '시각장애', '시각장애', 'O', 7],
  ['장애유형', '청각장애', '청각장애', 'O', 8],
  ['장애유형', '정신장애', '정신장애', 'O', 9],
  ['장애유형', '기타', '기타 장애유형', 'O', 10],
];

const DEFAULT_CRITERIA = [
  ...PROGRAM_STANDARD_CRITERIA,

  ['모집상태', '모집중', '현재 모집 진행 중', 'O', 1],
  ['모집상태', '대기', '대기 중', 'O', 2],
  ['모집상태', '모집예정', '모집 예정', 'O', 3],
  ['모집상태', '상시', '상시 운영', 'O', 4],
  ['모집상태', '확인필요', '확인 필요', 'O', 5],
  ['모집상태', '마감', '모집 마감', 'O', 6],
  ['모집상태', '종료', '운영 종료', 'O', 7],

  ['생애주기', '미취학', '미취학 아동', 'O', 1],
  ['생애주기', '초등', '초등학생', 'O', 2],
  ['생애주기', '중등', '중학생', 'O', 3],
  ['생애주기', '고등', '고등학생', 'O', 4],
  ['생애주기', '성인', '성인', 'O', 5],
  ['생애주기', '전연령', '전 연령', 'O', 6],
  ['생애주기', '가족·지원인', '장애인 가족·보호자·지원인 대상', 'O', 7],



];

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('연결노트')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function setupSheets() { return withFinderRefresh_(setupSheets_impl_, arguments); }
function setupSheets_impl_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const criteria = getOrCreateSheet_(ss, SHEETS.criteria);
  const internalResources = getOrCreateSheet_(ss, SHEETS.internalResources);
  const externalResources = getOrCreateSheet_(ss, SHEETS.externalResources);

  ensureHeader_(criteria, CRITERIA_HEADERS);
  ensureHeader_(internalResources, INTERNAL_RESOURCE_HEADERS);
  ensureHeader_(externalResources, EXTERNAL_RESOURCE_HEADERS);

  if (criteria.getLastRow() < 2) {
    const defaultCriteriaRows = DEFAULT_CRITERIA.map((row) => padRow_(row, CRITERIA_HEADERS.length));
    criteria
      .getRange(2, 1, DEFAULT_CRITERIA.length, CRITERIA_HEADERS.length)
      .setValues(defaultCriteriaRows);
    criteria.autoResizeColumns(1, CRITERIA_HEADERS.length);
  }
  ensureDefaultCriteria_(criteria);
  ensureProgramStandardCriteria_(criteria);
  ensureStage2Sheets_(true);
}

function getProgramFinderData(year) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('연결된 스프레드시트를 찾을 수 없습니다. 시트에서 열린 Apps Script 프로젝트인지 확인해주세요.');
  if (!ss.getSheetByName(SHEETS.internalResources)) {
    throw new Error('프로그램현황 시트를 찾을 수 없습니다. 시트 이름을 확인해주세요.');
  }
  // 상담할 때 여는 화면이라 자주 불림 → 한 번 읽은 내용을 기억해 두고, 저장하거나 시트를 고치면 새로 읽음
  const wanted = /^\d{4}$/.test(normalizeText_(year)) ? normalizeText_(year) : '';
  return finderCached_(() => {
    const info = programYearInfo_(wanted);
    return {
      criteria: ss.getSheetByName(SHEETS.criteria) ? getCriteria_() : {},
      resources: getResources_(true, info.selectedYear),
      years: info.years,
      selectedYear: info.selectedYear,
      settings: publicSettings_(),
      checkRules: getCheckRules_(),
    };
  }, wanted || 'default');
}

// ── 빠른 찾기 화면 임시 저장(캐시) ──
function finderCached_(load, key) {
  let cache, prefix;
  try {
    cache = CacheService.getScriptCache();
    prefix = 'finder-v2:' + (key || 'default') + ':' + (PropertiesService.getDocumentProperties().getProperty('finderRev') || '0');
    const m = JSON.parse(cache.get(prefix) || 'null');
    if (m && m.count > 0) {
      const keys = Array.from({ length: m.count }, (_, i) => prefix + ':' + m.token + ':' + i), parts = cache.getAll(keys);
      if (keys.every((k) => typeof parts[k] === 'string')) return JSON.parse(keys.map((k) => parts[k]).join(''));
    }
  } catch (e) { cache = null; }
  const data = load();
  if (cache) try {
    const json = JSON.stringify(data), count = Math.ceil(json.length / 30000);
    if (count && count <= 60) {
      const token = Utilities.getUuid().slice(0, 8), parts = {};
      for (let i = 0; i < count; i++) parts[prefix + ':' + token + ':' + i] = json.slice(i * 30000, (i + 1) * 30000);
      cache.putAll(parts, 21600); cache.put(prefix, JSON.stringify({ count, token }), 21600);
    }
  } catch (e) { /* 임시 저장은 실패해도 괜찮아요 */ }
  return data;
}
function bumpFinder_() {
  try { PropertiesService.getDocumentProperties().setProperty('finderRev', Utilities.getUuid().slice(0, 8)); } catch (e) {}
}
/** 시트에서 직접 고치면 빠른 찾기 화면도 새 내용으로 */
function onEdit(e) { bumpFinder_(); }
/** 저장 기능: 저장이 끝나면(실패해도) 빠른 찾기 화면을 새로 읽게 함 */
function withFinderRefresh_(fn, args) { try { return fn.apply(null, args); } finally { bumpFinder_(); } }

function getProgramManagementData(adminPin, year) {
  requireEditor_(adminPin);
  ensureStage2Sheets_();
  const sheet = ensureInternalResourceSheet_();
  if (migrateProgramYears_(sheet)) bumpFinder_();
  const info = programYearInfo_(year);
  const rows = readTableWithRowNumber_(SHEETS.internalResources)
    .map((row) => programManagementRecordFromRow_(row))
    .filter((row) => (row.id || row.name) && row.year === info.selectedYear)
    .sort((a, b) => {
      const activeRank = (b.active === 'O' ? 1 : 0) - (a.active === 'O' ? 1 : 0);
      return activeRank || (a.name || '').localeCompare(b.name || '', 'ko');
    });

  const businessNames = [...new Set(rows.map((p) => p.business).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
  const teamNames = [...new Set(rows.map((p) => p.team).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));

  return {
    ok: true,
    sheetName: sheet.getName(),
    programs: rows,
    years: info.years,
    selectedYear: info.selectedYear,
    recruitStatuses: PROGRAM_RECRUIT_STATUSES,
    editableHeaders: PROGRAM_EDITABLE_HEADERS,
    unknownTags: findUnknownProgramTags_(rows),
    businessNames,
    teamNames,
  };
}


// ── 운영연도: 프로그램 목록을 연도별로 나눠요 (복지정보는 모든 연도 공통) ──
const LEGACY_PROGRAM_YEAR = '2026';   // 운영연도 칸이 비어 있던 예전 프로그램은 2026년으로 봐요
/** 입력 확인용: 비어 있으면 2026, 네 자리 연도가 아니면 오류 */
function programYear_(value) {
  const v = normalizeText_(value);
  if (!v) return LEGACY_PROGRAM_YEAR;
  if (!/^\d{4}$/.test(v) || Number(v) < 2000 || Number(v) > 2100) throw new Error('운영연도는 2026처럼 네 자리 숫자로 입력해주세요.');
  return v;
}
/** 읽기용: 이상한 값이어도 멈추지 않고 2026으로 봐요 */
function programYearOf_(value) {
  const v = normalizeText_(value).replace(/\.0+$/, '').replace(/년$/, '');
  return /^\d{4}$/.test(v) ? v : LEGACY_PROGRAM_YEAR;
}
/** 고를 수 있는 연도와 기본 연도: 오늘 이전 자료 중 가장 최근 연도 (2027년 자료가 생겨도 2027년이 되기 전까지는 2026년이 기본) */
function programYearInfo_(requested) {
  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyy');
  const stored = [...new Set(readTable_(SHEETS.internalResources)
    .filter((r) => normalizeText_(r['내부자원ID']) || normalizeText_(r['자원명']))
    .map((r) => programYearOf_(r['운영연도'])))].sort();
  const want = normalizeText_(requested);
  const past = stored.filter((y) => y <= now);
  const selected = /^\d{4}$/.test(want) ? want : (past.length ? past[past.length - 1] : (stored[0] || now));
  const years = [...new Set(stored.concat([selected, now]))].sort();
  return { years: years, selectedYear: selected };
}
/** 운영연도 칸이 빈 프로그램에 2026을 채워요 (정보 관리를 열 때 한 번). 채운 줄 수를 돌려줘요 */
function migrateProgramYears_(sheet) {
  const headers = getSheetHeaders_(sheet), col = headers.indexOf('운영연도') + 1;
  if (!col || sheet.getLastRow() < 2) return 0;
  const rows = readTableWithRowNumber_(SHEETS.internalResources)
    .filter((r) => (normalizeText_(r['내부자원ID']) || normalizeText_(r['자원명'])) && !normalizeText_(r['운영연도']))
    .map((r) => r.__rowNumber);
  let group = [];
  const flush = () => { if (group.length) sheet.getRange(group[0], col, group.length, 1).setValues(group.map(() => [LEGACY_PROGRAM_YEAR])); group = []; };
  rows.forEach((n) => { if (group.length && n !== group[group.length - 1] + 1) flush(); group.push(n); });
  flush();
  return rows.length;
}
/** 다음 연도 목록 준비: 올해 프로그램(숨김·종료 제외)을 복사해 내년 초안을 만들어요. 올해 자료는 그대로 */
function copyProgramsToYear(adminPin, fromYear, toYear) { return withFinderRefresh_(copyProgramsToYear_impl_, arguments); }
function copyProgramsToYear_impl_(adminPin, fromYear, toYear) {
  const user = requireAdmin_(adminPin);
  const from = programYear_(fromYear), to = programYear_(toYear);
  if (!normalizeText_(fromYear) || !normalizeText_(toYear) || Number(to) !== Number(from) + 1) throw new Error('지금 연도에서 바로 다음 연도로만 복사할 수 있어요.');
  ensureStage2Sheets_();
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = ensureInternalResourceSheet_();
    migrateProgramYears_(sheet);
    const headers = getSheetHeaders_(sheet);
    const all = readTableWithRowNumber_(SHEETS.internalResources).filter((r) => normalizeText_(r['내부자원ID']) || normalizeText_(r['자원명']));
    if (all.some((r) => programYearOf_(r['운영연도']) === to)) throw new Error(to + '년 자료가 이미 있어요. 겹치지 않게 복사하지 않았어요. ' + to + '년을 골라 확인해주세요.');
    const source = all.filter((r) => programYearOf_(r['운영연도']) === from && normalizeActiveValue_(r['활성여부']) !== 'X' && normalizeText_(r['모집상태']) !== '종료');
    if (!source.length) throw new Error(from + '년에 복사할 프로그램이 없어요.');
    let next = Number((generateNextInternalResourceId_(sheet).match(/(\d+)$/) || [0, 1])[1]);
    const today = today_();
    const values = source.map((r) => {
      const o = Object.assign({}, r);
      o['내부자원ID'] = 'IN-' + String(next++).padStart(3, '0');
      o['운영연도'] = to;
      o['모집상태'] = '확인필요';
      o['확인일'] = ''; o['확인자'] = ''; o['다음확인일'] = '';
      o['최종수정일'] = today; o['수정자'] = user;
      return headers.map((h) => {
        if (!h) return '';
        const v = cellValue_(h, o[h]);
        return typeof v === 'string' && /^[0+]\d/.test(v) ? "'" + v : v;   // 연락처 앞자리 0 지키기
      });
    });
    sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
    logChanges_(user, SHEETS.internalResources, '-', to + '년 목록 준비', [{ header: '다음 연도 목록 준비', before: from + '년', after: values.length + '건 복사' }]);
    return { ok: true, count: values.length, year: to };
  } finally {
    lock.releaseLock();
  }
}

function yearRollover(adminPin) { return withFinderRefresh_(yearRollover_impl_, arguments); }
function yearRollover_impl_(adminPin) {
  requireAdmin_(adminPin);
  const sheet = ensureInternalResourceSheet_();
  const headers = getSheetHeaders_(sheet);
  const activeCol = headers.indexOf('활성여부') + 1;
  const statusCol = headers.indexOf('모집상태') + 1;
  if (!activeCol || !statusCol) throw new Error('시트에 활성여부 또는 모집상태 열이 없습니다.');

  const rows = readTableWithRowNumber_(SHEETS.internalResources)
    .filter((row) => normalizeActiveValue_(row['활성여부']) === 'O');

  rows.forEach((row) => {
    sheet.getRange(row.__rowNumber, statusCol).setValue('확인필요');
  });

  return { ok: true, count: rows.length };
}


function generateProgramDraft() {
  setupSheets();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const draft = getOrCreateSheet_(ss, SHEETS.internalResourceDraft);
  const sourceSheets = getProgramDraftSourceSheets_(ss, 'summaryOnly');
  const rows = [];
  const seenKeys = {};
  let reviewCount = 0;

  sourceSheets.forEach((sheet) => {
    readProgramSourceRows_(sheet).forEach((sourceRow) => {
      const draftRow = buildProgramDraftRow_(sourceRow, rows.length + 1);
      const key = makeProgramDraftKey_(draftRow);
      if (key && seenKeys[key]) return;
      if (key) seenKeys[key] = true;
      if (draftRow.reviewStatus) reviewCount += 1;
      rows.push(INTERNAL_RESOURCE_HEADERS.map((header) => draftRow[header] || ''));
    });
  });

  if (!rows.length) {
    throw new Error('전체현황 탭에서 자원명이 있는 행을 찾지 못했습니다. 전체현황의 자원명/프로그램명/사업명 컬럼을 확인해주세요.');
  }

  draft.clearContents();
  draft.getRange(1, 1, 1, INTERNAL_RESOURCE_HEADERS.length).setValues([INTERNAL_RESOURCE_HEADERS]);
  draft.setFrozenRows(1);

  if (rows.length) {
    draft.getRange(2, 1, rows.length, INTERNAL_RESOURCE_HEADERS.length).setValues(rows);
  }
  draft.autoResizeColumns(1, INTERNAL_RESOURCE_HEADERS.length);

  return {
    ok: true,
    sheetName: SHEETS.internalResourceDraft,
    mode: '전체현황',
    sourceSheetCount: sourceSheets.length,
    rowCount: rows.length,
    reviewCount,
  };
}

function getProgramDraftSourceSheets_(ss, mode) {
  if (mode === 'summaryOnly') {
    const summarySheet = ss.getSheetByName('전체현황');
    if (!summarySheet) throw new Error('전체현황 탭을 찾을 수 없습니다. 탭 이름을 확인해주세요.');
    return [summarySheet];
  }

  return ss.getSheets().filter((sheet) => !isSystemSheet_(sheet.getName()));
}

function getCriteria_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.criteria);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};

  const values = sheet.getRange(2, 1, lastRow - 1, CRITERIA_HEADERS.length).getValues();
  const grouped = {};

  values
    .filter((row) => normalizeText_(row[3]) === 'O')
    .sort((a, b) => Number(a[4] || 999) - Number(b[4] || 999))
    .forEach((row) => {
      const type = normalizeText_(row[0]);
      const value = normalizeText_(row[1]);
      const description = normalizeText_(row[2]);
      const judgment = normalizeText_(row[5]);
      const representative = normalizeText_(row[6]);
      if (!type || !value) return;
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push({ value, description, judgment, representative });
    });

  return grouped;
}

function ensureProgramStandardCriteria_(criteriaSheet) {
  if (!criteriaSheet) return;
  const lastRow = criteriaSheet.getLastRow();
  const values = lastRow >= 2 ? criteriaSheet.getRange(2, 1, lastRow - 1, CRITERIA_HEADERS.length).getDisplayValues() : [];
  const existing = {};
  const standardKeys = {};
  PROGRAM_STANDARD_CRITERIA.forEach((row) => {
    standardKeys[`${row[0]}|${row[1]}`] = true;
  });

  values.forEach((row, index) => {
    const key = `${normalizeText_(row[0])}|${normalizeText_(row[1])}`;
    if (key !== '|') existing[key] = true;
    const type = normalizeText_(row[0]);
    if ((type === '상담목적' || type === '욕구키워드') && !standardKeys[key]) {
      criteriaSheet.getRange(index + 2, 4).setValue('X');
    }
  });

  PROGRAM_STANDARD_CRITERIA.forEach((row) => {
    const key = `${row[0]}|${row[1]}`;
    if (!existing[key]) return;
    const rowIndex = values.findIndex((valueRow) => `${normalizeText_(valueRow[0])}|${normalizeText_(valueRow[1])}` === key);
    if (rowIndex >= 0) {
      criteriaSheet.getRange(rowIndex + 2, 1, 1, CRITERIA_HEADERS.length).setValues([padRow_(row, CRITERIA_HEADERS.length)]);
    }
  });

  const rowsToAdd = PROGRAM_STANDARD_CRITERIA
    .filter((row) => !existing[`${row[0]}|${row[1]}`])
    .map((row) => padRow_(row, CRITERIA_HEADERS.length));

  if (!rowsToAdd.length) return;
  criteriaSheet
    .getRange(criteriaSheet.getLastRow() + 1, 1, rowsToAdd.length, CRITERIA_HEADERS.length)
    .setValues(rowsToAdd);
}

function ensureDefaultCriteria_(criteriaSheet) {
  if (!criteriaSheet) return;
  const lastRow = criteriaSheet.getLastRow();
  const values = lastRow >= 2 ? criteriaSheet.getRange(2, 1, lastRow - 1, CRITERIA_HEADERS.length).getDisplayValues() : [];
  const existing = {};
  values.forEach((row) => {
    const key = `${normalizeText_(row[0])}|${normalizeText_(row[1])}`;
    if (key !== '|') existing[key] = true;
  });

  const rowsToAdd = DEFAULT_CRITERIA
    .filter((row) => !existing[`${row[0]}|${row[1]}`])
    .map((row) => padRow_(row, CRITERIA_HEADERS.length));

  if (!rowsToAdd.length) return;
  criteriaSheet
    .getRange(criteriaSheet.getLastRow() + 1, 1, rowsToAdd.length, CRITERIA_HEADERS.length)
    .setValues(rowsToAdd);
}

function getResources_(forFinder, year) {
  return {
    internal: readTable_(SHEETS.internalResources)
      .filter((row) => !year || programYearOf_(row['운영연도']) === year)
      .filter((row) => forFinder
        ? normalizeText_(row['활성여부']).toUpperCase() !== 'X' && Boolean(normalizeText_(row['자원명']))
        : normalizeText_(row['활성여부']) === 'O')
      .map((row) => ({
        id: normalizeText_(row['내부자원ID']),
        name: normalizeText_(row['자원명']),
        sourceType: '내부자원',
        group: normalizeText_(row['자원그룹']),
        resourceType: normalizeText_(row['자원유형']),
        team: normalizeText_(row['소속팀']),
        business: normalizeText_(row['사업명']),
        target: normalizeText_(row['이용대상']),
        disabilityType: normalizeDisabilityType_(row['장애유형']),
        age: normalizeText_(row['연령'] || row['나이']),
        lifeStage: normalizeText_(row['생애주기']),
        purposeTags: normalizeText_(row['상담목적태그']),
        needTags: normalizeText_(row['욕구키워드']),
        schedule: normalizeText_(row['일시']),
        period: normalizeText_(row['회기/기간']),
        fee: normalizeText_(row['이용료']),
        place: normalizeText_(row['장소']),
        recruitStatus: normalizeText_(row['모집상태']),
        manager: normalizeText_(row['담당자']),
        phone: normalizeText_(row['연락처']),
        detailLink: normalizeText_(row['홍보지링크'] || row['상세링크']),
        message: normalizeText_(row['추천문구']),
        note: normalizeText_(row['비고']),
        recommendedFor: normalizeText_(row['이런분께추천'] || row['이런 분께 추천해요']),
        recruitType: normalizeText_(row['모집유형']),
        nextCheck: dateText_(row['다음확인일']),
        confirmedAt: dateText_(row['확인일']),
      })),
    external: readTable_(SHEETS.externalResources)
      .filter((row) => {
        const active = normalizeText_(row['활성여부']).toUpperCase();
        if (forFinder ? (active === 'X' || active === '검토중') : active !== 'O') return false;
        const opStatus = normalizeText_(row['운영상태']);
        return !opStatus || opStatus !== '종료';
      })
      .map((row) => {
        const institutionName = normalizeText_(row['기관명']);
        const serviceName = normalizeText_(row['자원명']);
        return {
          id: normalizeText_(row['외부자원ID']),
          name: serviceName || institutionName,
          institutionName,
          serviceName,
          sourceType: '외부자원',
          resourceType: normalizeText_(row['자원유형']),
          support: normalizeText_(row['주요지원내용']),
          purposeTags: normalizeText_(row['상담목적태그']),
          needTags: normalizeText_(row['욕구키워드']),
          target: normalizeText_(row['이용대상'] || row['대상']),
          disabilityType: normalizeDisabilityType_(row['장애유형']),
          age: normalizeText_(row['연령'] || row['나이']),
          lifeStage: normalizeText_(row['생애주기']),
          region: normalizeText_(row['지역']),
          operationStatus: normalizeText_(row['운영상태']),
          phone: normalizeText_(row['연락처']),
          link: normalizeText_(row['홈페이지'] || row['링크']),
          detailLink: normalizeText_(row['상세링크'] || row['홍보지링크'] || row['상세안내링크']),
          method: normalizeText_(row['이용방법']),
          cost: normalizeText_(row['비용']),
          manager: normalizeText_(row['담당자']),
          message: normalizeText_(row['추천문구']),
          note: normalizeText_(row['비고']),
          recommendedFor: normalizeText_(row['이런분께추천'] || row['이런 분께 추천해요']),
          checkedAt: dateText_(row['최종확인일']),
        };
      }),
  };
}

function readTable_(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values.shift().map(normalizeText_);
  return values
    .filter((row) => row.some((cell) => normalizeText_(cell)))
    .map((row) => {
      const record = {};
      headers.forEach((header, index) => {
        if (header) record[header] = row[index];
      });
      return record;
    });
}

function readTableWithRowNumber_(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getDisplayValues();
  const headers = values.shift().map(normalizeText_);
  return values
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter((entry) => entry.row.some((cell) => normalizeText_(cell)))
    .map((entry) => {
      const record = { __rowNumber: entry.rowNumber };
      headers.forEach((header, index) => {
        if (header) record[header] = entry.row[index];
      });
      return record;
    });
}

function ensureInternalResourceSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet_(ss, SHEETS.internalResources);
  ensureHeader_(sheet, INTERNAL_RESOURCE_HEADERS);
  return sheet;
}

function getSheetHeaders_(sheet) {
  if (!sheet || sheet.getLastColumn() < 1) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(normalizeText_);
}

function readSheetRowAsObject_(sheet, headers, rowNumber) {
  const values = sheet.getRange(rowNumber, 1, 1, headers.length).getDisplayValues()[0];
  const record = {};
  headers.forEach((header, index) => {
    if (header) record[header] = values[index];
  });
  return record;
}

function updateProgramEditableColumns_(sheet, headers, rowNumber, rowObject) {
  PROGRAM_EDITABLE_HEADERS.forEach((header) => {
    const col = headers.indexOf(header) + 1;
    if (col) sheet.getRange(rowNumber, col).setValue(rowObject[header] || '');
  });
}

function findInternalResourceRowById_(sheet, resourceId) {
  const id = normalizeText_(resourceId);
  const headers = getSheetHeaders_(sheet);
  const idCol = headers.indexOf('내부자원ID') + 1;
  if (!idCol || sheet.getLastRow() < 2) return 0;
  const values = sheet.getRange(2, idCol, sheet.getLastRow() - 1, 1).getDisplayValues();
  const index = values.findIndex((row) => normalizeText_(row[0]) === id);
  return index >= 0 ? index + 2 : 0;
}

function generateNextInternalResourceId_(sheet) {
  const headers = getSheetHeaders_(sheet);
  const idCol = headers.indexOf('내부자원ID') + 1;
  if (!idCol || sheet.getLastRow() < 2) return 'IN-001';

  const values = sheet.getRange(2, idCol, sheet.getLastRow() - 1, 1).getDisplayValues().flat();
  const maxNumber = values.reduce((max, value) => {
    const match = normalizeText_(value).match(/^IN-(\d+)$/i);
    if (!match) return max;
    return Math.max(max, Number(match[1] || 0));
  }, 0);
  return `IN-${String(maxNumber + 1).padStart(3, '0')}`;
}

function programManagementRecordFromRow_(row) {
  return {
    rowNumber: row.__rowNumber,
    id: normalizeText_(row['내부자원ID']),
    year: programYearOf_(row['운영연도']),
    name: normalizeText_(row['자원명']),
    business: normalizeText_(row['사업명']),
    team: normalizeText_(row['소속팀']),
    group: normalizeText_(row['자원그룹']),
    resourceType: normalizeText_(row['자원유형']),
    target: normalizeText_(row['이용대상']),
    lifeStage: normalizeText_(row['생애주기']),
    disabilityType: normalizeDisabilityType_(row['장애유형']),
    purposeTags: normalizeText_(row['상담목적태그']),
    needTags: normalizeText_(row['욕구키워드']),
    schedule: normalizeText_(row['일시']),
    period: normalizeText_(row['회기/기간']),
    fee: normalizeText_(row['이용료']),
    place: normalizeText_(row['장소']),
    recruitStatus: normalizeText_(row['모집상태']),
    manager: normalizeText_(row['담당자']),
    phone: normalizeText_(row['연락처']),
    detailLink: normalizeText_(row['홍보지링크'] || row['상세링크']),
    message: normalizeText_(row['추천문구']),
    active: normalizeActiveValue_(row['활성여부']),
    note: normalizeText_(row['비고']),
    recruitType: normalizeText_(row['모집유형']),
    nextCheck: dateText_(row['다음확인일']),
    confirmedAt: dateText_(row['확인일']),
    confirmedBy: normalizeText_(row['확인자']),
    modifiedAt: dateText_(row['최종수정일']),
    modifiedBy: normalizeText_(row['수정자']),
  };
}

function findUnknownProgramTags_(programs) {
  const criteria = getCriteria_();
  return {
    purposeTags: findUnknownTagsByType_(programs, 'purposeTags', criteria['상담목적']),
    needTags: findUnknownTagsByType_(programs, 'needTags', criteria['욕구키워드']),
  };
}

function findUnknownTagsByType_(programs, key, criteriaItems) {
  const allowed = (criteriaItems || []).map((item) => normalizeText_(item.value));
  const unknown = {};
  programs.forEach((program) => {
    splitTags_(program[key]).forEach((tag) => {
      if (!tag || allowed.indexOf(tag) !== -1) return;
      unknown[tag] = (unknown[tag] || 0) + 1;
    });
  });
  return Object.keys(unknown)
    .sort((a, b) => unknown[b] - unknown[a] || a.localeCompare(b, 'ko'))
    .map((tag) => ({ tag, count: unknown[tag] }));
}

function splitTags_(text) {
  return normalizeText_(text)
    .split(',')
    .map((item) => normalizeText_(item))
    .filter(Boolean);
}

function verifyAdminPin_(pin) {
  const savedPin = PropertiesService.getScriptProperties().getProperty('ADMIN_PIN') || DEFAULT_ADMIN_PIN;
  if (normalizeText_(pin) !== normalizeText_(savedPin)) {
    throw new Error('관리자 PIN이 맞지 않습니다.');
  }
}

function normalizeActiveValue_(value) {
  const text = normalizeText_(value);
  if (['O', 'Y', 'TRUE', '활성'].indexOf(text.toUpperCase()) !== -1) return 'O';
  if (['X', 'N', 'FALSE', '비활성'].indexOf(text.toUpperCase()) !== -1) return 'X';
  return text || 'O';
}

function normalizeDisabilityType_(value) {
  const text = normalizeText_(value);
  return (text === '무관' || text === '제한없음') ? '전체' : text;
}

function normalizeRecruitStatusValue_(value) {
  const text = normalizeText_(value);
  return PROGRAM_RECRUIT_STATUSES.indexOf(text) !== -1 ? text : (text || '확인필요');
}

function isSystemSheet_(sheetName) {
  const name = normalizeText_(sheetName);
  const excluded = [
    '상담기록',
    SHEETS.criteria,
    SHEETS.internalResources,
    SHEETS.internalResourceDraft,
    SHEETS.externalResources,
    '예약관리',
    '프로그램자료함',
    '매칭점수표',
    '욕구키워드매핑',
  ];
  if (!name || excluded.indexOf(name) !== -1) return true;
  return name.indexOf('외부') !== -1 || name.indexOf('상담기록') !== -1 || name.indexOf('예약') !== -1;
}

function readProgramSourceRows_(sheet) {
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 4) return [];

  const headerIndex = sheet.getName() === '전체현황' ? 2 : findHeaderRowIndex_(values);
  if (headerIndex < 0) return [];

  const headers = values[headerIndex].map(normalizeText_);
  const programNameIndex = findHeaderIndex_(headers, '프로그램명');
  const teamIndex = findHeaderIndex_(headers, '팀명');
  return values
    .slice(headerIndex + 1)
    .map((row, index) => ({ row, rowNumber: headerIndex + index + 2 }))
    .filter((entry) => {
      const programName = programNameIndex >= 0 ? normalizeText_(entry.row[programNameIndex]) : '';
      const teamName = teamIndex >= 0 ? normalizeText_(entry.row[teamIndex]) : '';
      const joined = entry.row.map(normalizeText_).join(' ');
      if (!programName || !teamName) return false;
      if (programName === '프로그램명' || teamName === '팀명') return false;
      if (joined.indexOf('※ 상담 필터') !== -1) return false;
      if (programName.indexOf('※ 상담 필터') !== -1) return false;
      if (programName === '전체 프로그램 현황') return false;
      if (programName === teamName) return false;
      return true;
    })
    .map((entry) => {
      const record = { __sheetName: sheet.getName(), __rowNumber: entry.rowNumber };
      headers.forEach((header, index) => {
        if (header) record[header] = entry.row[index];
      });
      return record;
    });
}

function findHeaderRowIndex_(values) {
  const candidates = ['프로그램', '사업', '서비스', '자원', '대상', '일시', '담당', '내용', '팀'];
  for (let i = 0; i < Math.min(values.length, 10); i += 1) {
    const headers = values[i].map(normalizeText_);
    const score = candidates.filter((candidate) => headers.some((header) => header.indexOf(candidate) !== -1)).length;
    if (score >= 1) return i;
  }
  return -1;
}

function buildProgramDraftRow_(source, index) {
  const name = getHeaderValue_(source, '프로그램명');
  const business = getHeaderValue_(source, '사업명');
  const sourceText = Object.keys(source).map((key) => source[key]).join(' ');
  const resourceType = inferResourceType_(sourceText, name);
  const needTags = inferNeedTags_(sourceText);
  const purposeTags = inferPurposeTags_(resourceType, needTags, sourceText);
  const lifeStage = inferLifeStageFromSummary_(source);
  const target = getHeaderValue_(source, '이용대상') || lifeStage;
  const recruitStatus = inferRecruitStatusFromSummary_(source);
  const reviewReasons = [];

  if (!name) reviewReasons.push('자원명 확인');
  if (!needTags) reviewReasons.push('욕구키워드 확인');
  if (!target && !lifeStage) reviewReasons.push('대상 확인');
  if (recruitStatus === '확인필요') reviewReasons.push('모집상태 확인');
  if (!resourceType) reviewReasons.push('자원유형 확인');

  return {
    '내부자원ID': `DRAFT-${String(index).padStart(3, '0')}`,
    '소속팀': getHeaderValue_(source, '팀명'),
    '사업명': business,
    '자원명': name,
    '자원그룹': inferResourceGroup_(resourceType),
    '자원유형': resourceType || '프로그램',
    '이용대상': target,
    '생애주기': lifeStage,
    '장애유형': '',
    '상담목적태그': purposeTags,
    '욕구키워드': needTags,
    '일시': getHeaderValue_(source, '일시'),
    '회기/기간': getHeaderValue_(source, '회기/기간'),
    '이용료': getHeaderValue_(source, '이용료'),
    '장소': getHeaderValue_(source, '장소'),
    '모집상태': recruitStatus,
    '담당자': getHeaderValue_(source, '담당자'),
    '연락처': getHeaderValue_(source, '연락처'),
    '홍보지링크': getHeaderValue_(source, '홍보지링크') || getHeaderValue_(source, '상세링크') || getHeaderValue_(source, '링크'),
    '추천문구': makeRecommendationMessage_(resourceType, needTags),
    '활성여부': 'O',
    '비고': buildDraftNote_(source, reviewReasons),
    reviewStatus: reviewReasons.length ? '검토필요' : '',
  };
}

function getFirstValue_(record, keys) {
  for (let i = 0; i < keys.length; i += 1) {
    const value = getHeaderValue_(record, keys[i]);
    if (value) return value;
  }
  return '';
}

function getHeaderValue_(record, wantedHeader) {
  const exact = normalizeText_(record[wantedHeader]);
  if (exact) return exact;

  const wantedKey = normalizeHeaderKey_(wantedHeader);
  const matchedHeader = Object.keys(record).find((header) => normalizeHeaderKey_(header) === wantedKey);
  return matchedHeader ? normalizeText_(record[matchedHeader]) : '';
}

function findHeaderIndex_(headers, wantedHeader) {
  const wantedKey = normalizeHeaderKey_(wantedHeader);
  return headers.findIndex((header) => normalizeHeaderKey_(header) === wantedKey);
}

function normalizeHeaderKey_(value) {
  return normalizeText_(value).replace(/\s+/g, '').replace(/\n/g, '');
}

function makeProgramDraftKey_(row) {
  return [
    row['자원명'],
    row['사업명'],
    row['이용대상'],
  ].map((value) => normalizeText_(value).replace(/\s+/g, '')).join('|');
}

function buildDraftNote_(source, reviewReasons) {
  const notes = [];
  const sourceNote = getHeaderValue_(source, '비고');
  if (sourceNote) notes.push(sourceNote);
  notes.push(`원본: ${source.__sheetName} ${source.__rowNumber}행`);
  if (reviewReasons.length) notes.push(`검토필요: ${reviewReasons.join(', ')}`);
  return notes.join(' / ');
}

function inferLifeStageFromSummary_(source) {
  const stages = [
    ['미취학 아동', '미취학'],
    ['초등', '초등'],
    ['중등', '중등'],
    ['고등', '고등'],
    ['성인', '성인'],
    ['전연령', '전연령'],
    ['가족/지원인', '가족·지원인'],
  ];
  return stages
    .filter((stage) => isChecked_(getHeaderValue_(source, stage[0])))
    .map((stage) => stage[1])
    .join(', ');
}

function inferRecruitStatusFromSummary_(source) {
  const toStatus = getHeaderValue_(source, 'TO 여부');
  const note = getHeaderValue_(source, '비고');
  if (containsAny_(note, ['종료'])) return '종료';
  if (containsAny_(note, ['마감'])) return '마감';
  if (containsAny_(note, ['대기'])) return '대기';
  if (containsAny_(`${toStatus} ${note}`, ['모집예정', '예정'])) return '모집예정';
  if (containsAny_(toStatus, ['상시'])) return '상시';
  if (containsAny_(toStatus, ['O', '○', '가능', '모집중'])) return '모집중';
  if (!toStatus) return '확인필요';
  return '확인필요';
}

function isChecked_(value) {
  const text = normalizeText_(value).toUpperCase();
  return text === 'O' || text === '○' || text === 'TRUE' || text === 'Y';
}

function inferResourceType_(text, name) {
  const source = `${text} ${name}`;
  if (containsAny_(source, ['자조', '모임', '동아리'])) return '자조모임';
  if (containsAny_(source, ['행사', '캠페인', '축제', '나들이'])) return '행사';
  if (containsAny_(source, ['상담', '컨설팅'])) return '상담';
  if (containsAny_(source, ['지원', '서비스', '연계', '돌봄'])) return '서비스';
  if (containsAny_(source, ['타임클라우드', '주민모임'])) return '주민모임';
  return '프로그램';
}

function inferResourceGroup_(resourceType) {
  if (['프로그램', '행사', '자조모임', '주민모임'].indexOf(resourceType) !== -1) return '참여자원';
  return '지원자원';
}

function inferPurposeTags_(resourceType, needTags, text) {
  if (containsAny_(text, ['취업', '직업', '일자리'])) return '취업문의/연계';
  if (containsAny_(text, ['치료', '발달재활', '언어', '감각'])) return '치료 문의/대기';
  if (containsAny_(text, ['상담', '사례관리', '긴급', '지원', '서비스'])) return '사례관리/생활지원, 정보문의';
  if (resourceType === '상담' || resourceType === '서비스') return '사례관리/생활지원, 정보문의';
  return '프로그램/사업 문의, 정보문의';
}

function inferNeedTags_(text) {
  const rules = [
    ['건강', ['건강', '보건', '재활', '운동', '체력']],
    ['운동', ['운동', '체육', '탁구', '헬스', '요가', '건강증진']],
    ['문화여가', ['문화', '여가', '사진', '미술', '음악', '공예', '노래', '여행', '나들이']],
    ['교육', ['교육', '학습', '교실', '강좌', '문해', '배움']],
    ['가족지원', ['가족', '부모', '보호자', '지원인']],
    ['돌봄', ['돌봄', '일상지원', '케어']],
    ['자립생활', ['자립', '생활훈련', '자기결정']],
    ['사회관계', ['관계', '친구', '모임', '자조', '동아리', '주민모임', '타임클라우드', '모니터링단']],
    ['취업', ['취업', '직업', '일자리', '훈련']],
    ['경제지원', ['경제', '후원', '비용', '긴급']],
    ['권익옹호', ['권익', '인권', '법률', '옹호']],
    ['심리정서', ['상담', '심리', '정서']],
    ['발달재활', ['발달재활', '치료', '언어', '감각']],
    ['자기개발', ['자기개발', '자기표현', '역량']],
    ['일상생활', ['일상', '생활', '복지관이용', '서비스']],
  ];
  return rules
    .filter((rule) => containsAny_(text, rule[1]))
    .map((rule) => rule[0])
    .filter((value, index, array) => array.indexOf(value) === index)
    .join(', ');
}

function makeRecommendationMessage_(resourceType, needTags) {
  const firstNeed = normalizeText_(needTags).split(',')[0].trim();
  if (firstNeed) return `${firstNeed}에 관심이 있는 분께 안내할 수 있어요.`;
  return `${resourceType || '자원'} 이용을 원하시는 분께 안내할 수 있어요.`;
}

function containsAny_(text, keywords) {
  const source = normalizeText_(text).toLowerCase();
  return keywords.some((keyword) => source.indexOf(String(keyword).toLowerCase()) !== -1);
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function ensureHeader_(sheet, headers) {
  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasHeader = current.some((value) => normalizeText_(value));
  if (!hasHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return;
  }

  const existingHeaders = sheet
    .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length))
    .getValues()[0]
    .map(normalizeText_);
  const missingHeaders = headers.filter((header) => existingHeaders.indexOf(header) === -1);
  if (missingHeaders.length) {
    sheet
      .getRange(1, existingHeaders.filter(Boolean).length + 1, 1, missingHeaders.length)
      .setValues([missingHeaders]);
  }
}

function padRow_(row, length) {
  const result = row.slice(0, length);
  while (result.length < length) result.push('');
  return result;
}

function normalizeText_(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function importOverallStatusSheet() { return withFinderRefresh_(importOverallStatusSheet_impl_, arguments); }
function importOverallStatusSheet_impl_() {
  const SOURCE_SPREADSHEET_ID = '18AQDL0EXV6ojnPd1tmt5De1zA8GDePoiUiK6WAQ_0q8';
  const TARGET_SHEET_NAME = '전체현황';

  const targetSs = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSs = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID);

  const sourceSheet =
    sourceSs.getSheetByName('전체현황') ||
    sourceSs.getSheets().find(sheet => {
      const values = sheet.getDataRange().getDisplayValues().slice(0, 5).flat().join(' ');
      return values.includes('전체 프로그램 현황') ||
             (values.includes('팀명') && values.includes('프로그램명'));
    });

  if (!sourceSheet) {
    throw new Error('원본 파일에서 전체 프로그램 현황 시트를 찾을 수 없습니다.');
  }

  let targetSheet = targetSs.getSheetByName(TARGET_SHEET_NAME);
  if (!targetSheet) {
    targetSheet = targetSs.insertSheet(TARGET_SHEET_NAME);
  } else {
    targetSheet.clear();
  }

  const values = sourceSheet.getDataRange().getDisplayValues();

  if (!values.length) {
    throw new Error('가져올 전체현황 데이터가 없습니다.');
  }

  targetSheet
    .getRange(1, 1, values.length, values[0].length)
    .setValues(values);

  targetSheet.setFrozenRows(2);

  return {
    success: true,
    message: `전체현황을 가져왔습니다. ${values.length}행`,
  };
}

// ── Gemini AI 상담비서 ──────────────────────────────────

function setGeminiApiKey(adminPin, key) {
  const user = requireAdmin_(adminPin);
  if (!key || !String(key).trim()) throw new Error('API 키를 입력해주세요.');
  const props = PropertiesService.getScriptProperties();
  props.setProperty('GEMINI_API_KEY', String(key).trim());
  props.setProperty('AI_ENABLED', 'true');
  logChanges_(user, SHEETS.settings, '', '설정', [{ header: 'Gemini API 키', before: '', after: '새로 저장됨' }]);
  return { ok: true };
}

function getAdminSettings(adminPin) {
  requireAdmin_(adminPin);
  ensureStage2Sheets_();
  return {
    ok: true,
    settings: getSettings_(),
    checkRules: getCheckRules_(),
    ai: getAiStatus(),
    user: getCurrentUser(),
    pinCustom: Boolean(PropertiesService.getScriptProperties().getProperty('ADMIN_PIN')),
  };
}

// 관리자 PIN 바꾸기 (처음 기본값을 그대로 쓰지 않도록)
function setAdminPin(adminPin, newPin) {
  const user = requireAdmin_(adminPin);
  const pin = normalizeText_(newPin);
  if (!/^\d{4,8}$/.test(pin)) throw new Error('PIN은 숫자 4~8자리로 입력해주세요.');
  if (pin === DEFAULT_ADMIN_PIN) throw new Error('처음 정해진 기본 PIN과 다른 숫자로 정해주세요.');
  PropertiesService.getScriptProperties().setProperty('ADMIN_PIN', pin);
  logChanges_(user, SHEETS.settings, '', '설정', [{ header: '관리자 PIN', before: '', after: '변경됨' }]);
  return { ok: true };
}

function getAiStatus() {
  const props = PropertiesService.getScriptProperties();
  const enabled = props.getProperty('AI_ENABLED');
  const key = props.getProperty('GEMINI_API_KEY');
  if (enabled !== 'true') return { enabled: false, reason: 'disabled' };
  if (!key || !key.trim()) return { enabled: false, reason: 'no_key' };
  return { enabled: true };
}

// 프로그램 수정 창의 "AI 초안 만들기" 버튼 — 프로그램을 관리하는 직원도 쓸 수 있음
function getProgramRecommendationSuggestion(adminPin, payload) {
  requireEditor_(adminPin);
  const status = getAiStatus();
  if (!status.enabled) {
    if (status.reason === 'no_key') throw new Error('__AI_NO_KEY__');
    throw new Error('__AI_DISABLED__');
  }
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  const prompt = buildProgramRecommendationPrompt_(payload || {});
  const rawText = callGemini_(key.trim(), prompt, null, { json: true, maxTokens: 2048 });
  return parseProgramRecommendationResponse_(rawText);
}

function buildProgramRecommendationPrompt_(payload) {
  return [
    '당신은 장애인복지관 상담자가 프로그램을 안내할 때 쓸 추천문구를 돕는 AI입니다.',
    '상담자의 판단을 대신하지 않고, 프로그램 관리 화면의 추천문구 초안을 짧게 작성하는 것이 목적입니다.',
    '아래 정보에 근거해서만 작성하고, 없는 효과나 성과를 만들지 마세요.',
    '반드시 순수 JSON으로만 응답하세요. Markdown 코드블록(```json) 없이.',
    '',
    '─ 문체 기준 ─',
    '상담자가 이용인에게 자연스럽게 안내할 수 있는 말투로 작성하세요.',
    '너무 홍보 문구처럼 쓰지 말고, 차분하고 구체적으로 쓰세요.',
    '"이런 분께 추천해요"에 들어가도 어색하지 않게 작성하세요.',
    '문장은 1~2문장, 전체 80자 안팎으로 작성하세요.',
    '가능하면 욕구키워드와 이용대상, 생애주기, 장애유형을 자연스럽게 반영하세요.',
    '이용인을 불쌍하게 그리거나 도움받는 대상으로만 표현하지 말고, 스스로 선택하고 참여하는 사람으로 써주세요.',
    '피해야 할 표현: "삶의 질 향상", "역량 강화", "전인적 성장", "최적의 서비스", "욕구를 충족".',
    '',
    '─ 프로그램 정보 ─',
    '자원명: ' + (payload['자원명'] || '(미입력)'),
    '자원그룹: ' + (payload['자원그룹'] || '(미입력)'),
    '자원유형: ' + (payload['자원유형'] || '(미입력)'),
    '상담목적태그: ' + (payload['상담목적태그'] || '(미입력)'),
    '욕구키워드: ' + (payload['욕구키워드'] || '(미입력)'),
    '생애주기: ' + (payload['생애주기'] || '(미입력)'),
    '장애유형: ' + (payload['장애유형'] || '(미입력)'),
    '모집상태: ' + (payload['모집상태'] || '(미입력)'),
    '이용대상: ' + (payload['이용대상'] || '(미입력)'),
    '일시: ' + (payload['일시'] || '(미입력)'),
    '회기/기간: ' + (payload['회기/기간'] || '(미입력)'),
    '이용료: ' + (payload['이용료'] || '(미입력)'),
    '비고: ' + (payload['비고'] || '(없음)'),
    '',
    '─ 출력 형식 ─',
    '{',
    '  "recommendationMessage": "추천문구 한 줄. 상담자가 프로그램 추천 카드에서 바로 볼 수 있는 문장."',
    '}',
  ].join('\n');
}

function callGemini_(key, prompt, model, options) {
  const opts = options || {};
  const targetModel = model || 'gemini-2.5-flash';
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + targetModel + ':generateContent?key=' + key;
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: Object.assign({ temperature: 0.3, maxOutputTokens: opts.maxTokens || 2048 }, opts.json ? { responseMimeType: 'application/json' } : {}),
    }),
    muteHttpExceptions: true,
  });

  const statusCode = response.getResponseCode();
  const text = response.getContentText();

  if (statusCode !== 200) {
    let msg = 'Gemini API 오류 (HTTP ' + statusCode + ')';
    try {
      const err = JSON.parse(text);
      if (err && err.error && err.error.message) msg += ': ' + err.error.message;
    } catch (_) {}
    throw new Error(msg);
  }

  const parsed = JSON.parse(text);
  const part = parsed
    && parsed.candidates
    && parsed.candidates[0]
    && parsed.candidates[0].content
    && parsed.candidates[0].content.parts
    && parsed.candidates[0].content.parts[0];
  if (!part || !part.text) throw new Error('Gemini에서 응답을 받지 못했습니다.');
  return part.text;
}

function parseProgramRecommendationResponse_(text) {
  const cleaned = text.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/```\s*$/, '')
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    return {
      recommendationMessage: normalizeText_(parsed.recommendationMessage || parsed.message || ''),
    };
  } catch (e) {
    return {
      recommendationMessage: normalizeText_(cleaned).slice(0, 200),
    };
  }
}

// ───────────────────────────────────────────────
// 2단계: 직원 계정 확인, 확인일·변경이력, 기관 설정, 복지정보 관리, 링크 분석
// ───────────────────────────────────────────────

const SETTINGS_HEADERS = ['항목', '값', '설명'];
const DEFAULT_SETTINGS = [
  ['기관명', '종로장애인복지관', '화면 위쪽에 표시되는 기관 이름'],
  ['부제', '필요한 정보를 찾고, 다음 연결을 준비합니다.', '기관 이름 아래 안내 문장'],
  ['기본재확인일수', '30', '모집유형이 비어 있거나 확인주기 탭에 없을 때 쓰는 재확인 기간(일)'],
  ['관리자이메일', '', '복지정보·링크 분석·설정을 관리할 이메일(쉼표로 구분). 앱을 배포한 계정은 항상 관리자'],
];
const CHECK_RULE_HEADERS = ['모집유형', '재확인일수', '설명'];
const DEFAULT_CHECK_RULES = [
  ['상시', '60', '상시 모집 프로그램'],
  ['정원제·대기', '30', '정원이 정해져 있거나 대기를 받는 프로그램'],
  ['정기', '', '분기·학기별 모집 — 다음확인일(다음 모집 전 날짜)을 입력해주세요'],
  ['단기', '', '단기·일회성 — 다음확인일(모집 종료일 등)을 입력해주세요'],
];
const CHANGE_LOG_HEADERS = ['일시', '사용자', '시트', 'ID', '자원명', '항목', '이전 값', '새 값'];
const DATE_HEADERS = ['다음확인일', '확인일', '최종수정일', '최종확인일'];
const EXTERNAL_EDITABLE_HEADERS = EXTERNAL_RESOURCE_HEADERS.filter((h) => ['외부자원ID', '최종수정일', '수정자'].indexOf(h) === -1);

// 시트 구조 점검은 6시간에 한 번만 (시트가 없어졌으면 바로 다시 점검)
// 시트 머리글(열 이름)을 코드에서 바꾸면 아래 숫자를 하나 올려주세요.
const SHEET_SCHEMA_VERSION = 'stage2-v2';   // v2: 프로그램현황에 운영연도 칸

function ensureStage2Sheets_(force) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cache = CacheService.getScriptCache();
  const cacheKey = 'sheetsReady_' + SHEET_SCHEMA_VERSION;
  const needed = [SHEETS.settings, SHEETS.checkRules, SHEETS.changeLog, SHEETS.internalResources, SHEETS.externalResources];
  if (!force && cache.get(cacheKey)) {
    const names = ss.getSheets().map((s) => s.getName());
    if (needed.every((n) => names.indexOf(n) !== -1)) return;
  }
  const settings = getOrCreateSheet_(ss, SHEETS.settings);
  ensureHeader_(settings, SETTINGS_HEADERS);
  if (settings.getLastRow() < 2) settings.getRange(2, 1, DEFAULT_SETTINGS.length, 3).setValues(DEFAULT_SETTINGS);
  const rules = getOrCreateSheet_(ss, SHEETS.checkRules);
  ensureHeader_(rules, CHECK_RULE_HEADERS);
  if (rules.getLastRow() < 2) rules.getRange(2, 1, DEFAULT_CHECK_RULES.length, 3).setValues(DEFAULT_CHECK_RULES);
  ensureHeader_(getOrCreateSheet_(ss, SHEETS.changeLog), CHANGE_LOG_HEADERS);
  ensureHeader_(ensureInternalResourceSheet_(), INTERNAL_RESOURCE_HEADERS);
  ensureHeader_(getOrCreateSheet_(ss, SHEETS.externalResources), EXTERNAL_RESOURCE_HEADERS);
  cache.put(cacheKey, '1', 21600);
}

// ── 사용자 확인 ──
function getCurrentUser() {
  const email = normalizeText_(Session.getActiveUser().getEmail());
  return { email: email, needsPin: !email, isAdmin: email ? isAdminEmail_(email) : true };
}

function adminEmails_() {
  return normalizeText_(getSettings_()['관리자이메일'])
    .split(/[,;\s]+/)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

// 앱을 배포한 계정은 항상 관리자 (관리자 목록을 비우거나 잘못 적어도 잠기지 않도록)
function isAdminEmail_(email) {
  const target = normalizeText_(email).toLowerCase();
  if (!target) return false;
  const owner = normalizeText_(Session.getEffectiveUser().getEmail()).toLowerCase();
  return target === owner || adminEmails_().indexOf(target) !== -1;
}

// 관리자 전용 작업: 복지정보 관리, 링크 분석, 설정
function requireAdmin_(pin) {
  const email = normalizeText_(Session.getActiveUser().getEmail());
  if (!email) {
    verifyAdminPin_(pin);
    return '관리자(PIN)';
  }
  if (!isAdminEmail_(email)) throw new Error('관리자만 할 수 있는 작업이에요. 필요하면 관리자에게 요청해주세요.');
  return email;
}

// 같은 조직 계정이면 이메일로, 아니면(개인 계정·익명 배포 등) 관리자 PIN으로 확인
function requireEditor_(pin) {
  const email = normalizeText_(Session.getActiveUser().getEmail());
  if (email) return email;
  verifyAdminPin_(pin);
  return '관리자(PIN)';
}

// ── 날짜·기록 도우미 ──
function today_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function nowText_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}

function dateText_(value) {
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  const text = normalizeText_(value);
  const m = text.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!m) return text;
  return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
}

// 날짜가 시트에서 자동 변환되지 않도록 텍스트로 저장
function cellValue_(header, value) {
  const text = normalizeText_(value);
  if (!text) return '';
  if (DATE_HEADERS.indexOf(header) !== -1) return "'" + dateText_(text);
  return text;
}

function sameValue_(header, a, b) {
  if (DATE_HEADERS.indexOf(header) !== -1) return dateText_(a) === dateText_(b);
  return normalizeText_(a) === normalizeText_(b);
}

function logChanges_(user, sheetName, id, name, changes) {
  if (!changes || !changes.length) return;
  const sheet = getOrCreateSheet_(SpreadsheetApp.getActiveSpreadsheet(), SHEETS.changeLog);
  ensureHeader_(sheet, CHANGE_LOG_HEADERS);
  const when = nowText_();
  const rows = changes.map((c) => [when, user, sheetName, id, name, c.header, cellValue_(c.header, dateText_(c.before) && DATE_HEADERS.indexOf(c.header) !== -1 ? dateText_(c.before) : c.before), cellValue_(c.header, c.after)]);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, CHANGE_LOG_HEADERS.length).setValues(rows);
}

function writeRow_(sheet, headers, rowNumber, rowObject, onlyHeaders) {
  (onlyHeaders || Object.keys(rowObject)).forEach((header) => {
    const col = headers.indexOf(header) + 1;
    if (col) sheet.getRange(rowNumber, col).setValue(cellValue_(header, rowObject[header]));
  });
}

// 실제로 바뀐 칸만 골라서 저장 (시트 접근 횟수를 줄여 저장 속도를 높임)
function changedOnly_(changes, next) {
  const result = {};
  changes.forEach((c) => { result[c.header] = next[c.header]; });
  return result;
}

/** 저장한 칸을 시트에서 다시 읽어 제대로 들어갔는지 확인해요 (다르면 오류로 알려요) */
function verifyRowWrite_(sheet, headers, rowNumber, rowObject) {
  SpreadsheetApp.flush();
  const saved = readSheetRowAsObject_(sheet, headers, rowNumber);
  const wrong = Object.keys(rowObject).filter((h) => headers.indexOf(h) !== -1 && !sameValue_(h, saved[h], rowObject[h]));
  if (wrong.length) throw new Error('저장한 내용을 다시 확인해 보니 다른 칸이 있어요: ' + wrong.join(', ') + '. 시트를 열어 확인해주세요.');
}

function appendRowObject_(sheet, headers, rowObject) {
  sheet.appendRow(headers.map((header) => cellValue_(header, rowObject[header])));
}

// ── 설정·확인주기 ──
function getSettings_() {
  const result = {};
  DEFAULT_SETTINGS.forEach((row) => { result[row[0]] = row[1]; });
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.settings);
  if (sheet && sheet.getLastRow() >= 2) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getDisplayValues().forEach((row) => {
      const key = normalizeText_(row[0]);
      if (key) result[key] = normalizeText_(row[1]);
    });
  }
  return result;
}

function publicSettings_() {
  const settings = getSettings_();
  delete settings['관리자이메일'];
  return settings;
}

function getCheckRules_() {
  const rules = {};
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.checkRules);
  const rows = sheet && sheet.getLastRow() >= 2
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getDisplayValues()
    : DEFAULT_CHECK_RULES;
  rows.forEach((row) => {
    const type = normalizeText_(row[0]);
    if (!type) return;
    const days = Number(normalizeText_(row[1]));
    rules[type] = days > 0 ? days : null;
  });
  return rules;
}

function saveSettings(pin, values) { return withFinderRefresh_(saveSettings_impl_, arguments); }
function saveSettings_impl_(pin, values) {
  const user = requireAdmin_(pin);
  ensureStage2Sheets_();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.settings);
  const data = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 2).getDisplayValues();
  const changes = [];
  Object.keys(values || {}).forEach((key) => {
    if (['기관명', '부제', '기본재확인일수', '관리자이메일'].indexOf(key) === -1) return;
    let value = normalizeText_(values[key]);
    if (key === '관리자이메일') {
      value = value.split(/[,;\s]+/).map((v) => v.trim().toLowerCase()).filter(Boolean).join(', ');
      const bad = value ? value.split(', ').filter((v) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) : [];
      if (bad.length) throw new Error('이메일 형식을 확인해주세요: ' + bad.join(', '));
    }
    if (key === '기본재확인일수' && !(Number(value) > 0)) throw new Error('기본 재확인 일수는 1 이상의 숫자로 입력해주세요.');
    const index = data.findIndex((row) => normalizeText_(row[0]) === key);
    if (index >= 0) {
      if (normalizeText_(data[index][1]) === value) return;
      changes.push({ header: key, before: data[index][1], after: value });
      sheet.getRange(index + 2, 2).setValue(value);
    } else {
      changes.push({ header: key, before: '', after: value });
      sheet.appendRow([key, value, '']);
    }
  });
  logChanges_(user, SHEETS.settings, '', '설정', changes);
  return { ok: true, settings: getSettings_() };
}

// ── 프로그램: 확인일·변경이력 ──
function updateProgramQuick(adminPin, resourceId, updates) { return withFinderRefresh_(updateProgramQuick_impl_, arguments); }
function updateProgramQuick_impl_(adminPin, resourceId, updates) {
  const user = requireEditor_(adminPin);
  ensureStage2Sheets_();
  const id = normalizeText_(resourceId);
  const sheet = ensureInternalResourceSheet_();
  const headers = getSheetHeaders_(sheet);
  const rowNumber = findInternalResourceRowById_(sheet, id);
  if (!rowNumber) throw new Error('수정할 프로그램을 찾지 못했습니다.');
  const existing = readSheetRowAsObject_(sheet, headers, rowNumber);
  const next = { '확인일': today_(), '확인자': user };
  if (updates && normalizeText_(updates['모집상태'])) next['모집상태'] = normalizeRecruitStatusValue_(updates['모집상태']);
  if (updates && normalizeText_(updates['활성여부'])) next['활성여부'] = normalizeActiveValue_(updates['활성여부']);
  const changes = Object.keys(next)
    .filter((h) => !sameValue_(h, existing[h], next[h]))
    .map((h) => ({ header: h, before: existing[h], after: next[h] }));
  writeRow_(sheet, headers, rowNumber, next);
  logChanges_(user, SHEETS.internalResources, id, existing['자원명'], changes);
  return { ok: true, id: id, confirmedAt: next['확인일'], confirmedBy: user };
}

// 상태 변화 없이 "담당자에게 확인했음"만 기록
function confirmProgram(adminPin, resourceId) {
  return updateProgramQuick(adminPin, resourceId, {});
}

function saveProgramResource(adminPin, payload) { return withFinderRefresh_(saveProgramResource_impl_, arguments); }
function saveProgramResource_impl_(adminPin, payload) {
  const user = requireEditor_(adminPin);
  ensureStage2Sheets_();
  const data = payload || {};
  const sheet = ensureInternalResourceSheet_();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const headers = getSheetHeaders_(sheet);
    const id = normalizeText_(data['내부자원ID'] || data.id);
    const name = normalizeText_(data['자원명'] || data.name);
    if (!name) throw new Error('자원명을 입력해주세요.');

    if (id) {
      const rowNumber = findInternalResourceRowById_(sheet, id);
      if (!rowNumber) throw new Error('수정할 프로그램을 찾지 못했습니다.');
      const existing = readSheetRowAsObject_(sheet, headers, rowNumber);
      const next = {};
      PROGRAM_EDITABLE_HEADERS.forEach((header) => {
        if (Object.prototype.hasOwnProperty.call(data, header)) next[header] = normalizeText_(data[header]);
      });
      next['자원명'] = name;
      if ('활성여부' in next) next['활성여부'] = normalizeActiveValue_(next['활성여부']);
      if ('모집상태' in next) next['모집상태'] = normalizeRecruitStatusValue_(next['모집상태']);
      const changes = Object.keys(next)
        .filter((h) => !sameValue_(h, existing[h], next[h]))
        .map((h) => ({ header: h, before: existing[h], after: next[h] }));
      // 수정 창에서 저장하면 내용이 그대로여도 「담당자에게 확인함」으로 기록해요
      const toWrite = changedOnly_(changes, next);
      toWrite['확인일'] = today_(); toWrite['확인자'] = user;
      if (changes.length) { toWrite['최종수정일'] = today_(); toWrite['수정자'] = user; }
      writeRow_(sheet, headers, rowNumber, toWrite);
      verifyRowWrite_(sheet, headers, rowNumber, toWrite);
      logChanges_(user, SHEETS.internalResources, id, name, changes.length ? changes : [{ header: '정보 확인', before: '', after: '내용 변경 없이 저장·확인' }]);
      return { ok: true, mode: changes.length ? 'updated' : 'confirmed', id: id };
    }

    const rowObject = {};
    INTERNAL_RESOURCE_HEADERS.forEach((header) => { rowObject[header] = normalizeText_(data[header]); });
    const newId = generateNextInternalResourceId_(sheet);
    rowObject['내부자원ID'] = newId;
    rowObject['운영연도'] = programYear_(data['운영연도'] || programYearInfo_().selectedYear);
    rowObject['자원명'] = name;
    rowObject['사업명'] = rowObject['사업명'] || name;
    rowObject['자원그룹'] = rowObject['자원그룹'] || '참여자원';
    rowObject['자원유형'] = rowObject['자원유형'] || '프로그램';
    rowObject['활성여부'] = normalizeActiveValue_(rowObject['활성여부']);
    rowObject['모집상태'] = normalizeRecruitStatusValue_(rowObject['모집상태']);
    rowObject['확인일'] = today_();
    rowObject['확인자'] = user;
    rowObject['최종수정일'] = today_();
    rowObject['수정자'] = user;
    appendRowObject_(sheet, headers, rowObject);
    verifyRowWrite_(sheet, headers, sheet.getLastRow(), rowObject);
    logChanges_(user, SHEETS.internalResources, newId, name, [{ header: '신규 등록', before: '', after: name }]);
    return { ok: true, mode: 'created', id: newId };
  } finally {
    lock.releaseLock();
  }
}

// ── 복지정보(외부자원) 관리 ──
function getExternalManagementData(adminPin) {
  requireEditor_(adminPin);
  ensureStage2Sheets_();
  const items = readTableWithRowNumber_(SHEETS.externalResources)
    .map((row) => {
      const record = {};
      EXTERNAL_RESOURCE_HEADERS.forEach((h) => {
        record[h] = DATE_HEADERS.indexOf(h) !== -1 ? dateText_(row[h]) : normalizeText_(row[h]);
      });
      record['활성여부'] = normalizeText_(row['활성여부']) || 'O';
      return record;
    })
    .filter((r) => r['외부자원ID'] || r['자원명'] || r['기관명']);
  return { ok: true, items: items };
}

function findRowById_(sheet, idHeader, id) {
  const headers = getSheetHeaders_(sheet);
  const col = headers.indexOf(idHeader) + 1;
  if (!col || sheet.getLastRow() < 2 || !id) return 0;
  const values = sheet.getRange(2, col, sheet.getLastRow() - 1, 1).getDisplayValues();
  const index = values.findIndex((row) => normalizeText_(row[0]) === id);
  return index >= 0 ? index + 2 : 0;
}

function generateNextExternalResourceId_(sheet) {
  const headers = getSheetHeaders_(sheet);
  const col = headers.indexOf('외부자원ID') + 1;
  if (!col || sheet.getLastRow() < 2) return 'EX-001';
  const max = sheet.getRange(2, col, sheet.getLastRow() - 1, 1).getDisplayValues().flat().reduce((m, v) => {
    const match = normalizeText_(v).match(/^EX-(\d+)$/i);
    return match ? Math.max(m, Number(match[1])) : m;
  }, 0);
  return 'EX-' + String(max + 1).padStart(3, '0');
}

function normalizeExternalActive_(value) {
  const text = normalizeText_(value);
  if (text === '검토중') return '검토중';
  return normalizeActiveValue_(text);
}

function saveExternalResource(adminPin, payload) { return withFinderRefresh_(saveExternalResource_impl_, arguments); }
function saveExternalResource_impl_(adminPin, payload) {
  const user = requireEditor_(adminPin);
  const isAdmin = user === '관리자(PIN)' || isAdminEmail_(user);
  ensureStage2Sheets_();
  const data = payload || {};
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.externalResources);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const headers = getSheetHeaders_(sheet);
    const id = normalizeText_(data['외부자원ID']);
    let name = normalizeText_(data['자원명']) || normalizeText_(data['기관명']);

    if (id) {
      const rowNumber = findRowById_(sheet, '외부자원ID', id);
      if (!rowNumber) throw new Error('수정할 복지정보를 찾지 못했습니다.');
      const existing = readSheetRowAsObject_(sheet, headers, rowNumber);
      const hasNameField = Object.prototype.hasOwnProperty.call(data, '자원명') || Object.prototype.hasOwnProperty.call(data, '기관명');
      if (hasNameField && !name) throw new Error('자원명이나 기관명 중 하나는 입력해주세요.');
      name = name || normalizeText_(existing['자원명']) || normalizeText_(existing['기관명']);
      const next = {};
      EXTERNAL_EDITABLE_HEADERS.forEach((header) => {
        if (Object.prototype.hasOwnProperty.call(data, header)) next[header] = normalizeText_(data[header]);
      });
      // 공개 여부(승인·숨김)는 관리자만 바꿀 수 있음
      if (!isAdmin) delete next['활성여부'];
      if ('활성여부' in next) next['활성여부'] = normalizeExternalActive_(next['활성여부']);
      const changes = Object.keys(next)
        .filter((h) => !sameValue_(h, existing[h], next[h]))
        .map((h) => ({ header: h, before: existing[h], after: next[h] }));
      if (!changes.length) return { ok: true, mode: 'unchanged', id: id };
      const toWrite = changedOnly_(changes, next);
      toWrite['최종수정일'] = today_();
      toWrite['수정자'] = user;
      writeRow_(sheet, headers, rowNumber, toWrite);
      logChanges_(user, SHEETS.externalResources, id, name, changes);
      return { ok: true, mode: 'updated', id: id };
    }

    if (!name) throw new Error('자원명이나 기관명 중 하나는 입력해주세요.');
    const rowObject = {};
    EXTERNAL_RESOURCE_HEADERS.forEach((header) => { rowObject[header] = normalizeText_(data[header]); });
    const newId = generateNextExternalResourceId_(sheet);
    rowObject['외부자원ID'] = newId;
    // 직원이 등록한 자료는 항상 검토중으로 들어가고, 관리자가 승인해야 공개됨
    rowObject['활성여부'] = isAdmin ? normalizeExternalActive_(rowObject['활성여부']) : '검토중';
    rowObject['최종수정일'] = today_();
    rowObject['수정자'] = user;
    appendRowObject_(sheet, headers, rowObject);
    logChanges_(user, SHEETS.externalResources, newId, name, [{ header: '신규 등록', before: '', after: name + (rowObject['활성여부'] === '검토중' ? ' (검토중)' : '') }]);
    return { ok: true, mode: 'created', id: newId };
  } finally {
    lock.releaseLock();
  }
}

// 검토중 → 승인(화면에 표시), 확인일 기록
function approveExternalResource(adminPin, resourceId) { return withFinderRefresh_(approveExternalResource_impl_, arguments); }
function approveExternalResource_impl_(adminPin, resourceId) {
  requireAdmin_(adminPin);
  return saveExternalResource(adminPin, { '외부자원ID': resourceId, '활성여부': 'O', '최종확인일': today_() });
}

// ── 사이트 링크 분석 ──
function analyzeWelfareLink(adminPin, url, pastedText) {
  requireEditor_(adminPin);
  const link = normalizeText_(url);
  let pageText = normalizeText_(pastedText);
  let pageTitle = '';
  let fetchNote = '';

  if (link) {
    if (!/^https?:\/\//i.test(link)) throw new Error('http:// 또는 https:// 로 시작하는 주소를 넣어주세요.');
    if (!pageText) {
      try {
        const page = fetchPageText_(link);
        pageText = page.text;
        pageTitle = page.title;
      } catch (e) {
        fetchNote = normalizeText_(e.message);
      }
    }
  }
  if (!pageText || pageText.length < 150) {
    throw new Error((fetchNote ? fetchNote + ' ' : '') + '페이지 내용을 읽지 못했어요. 페이지 본문을 복사해서 "내용 붙여넣기" 칸에 넣고 다시 분석해주세요.');
  }

  const status = getAiStatus();
  if (!status.enabled) throw new Error('AI 키가 설정되지 않았어요. 정보 관리 → 설정에서 Gemini API 키를 먼저 저장해주세요.');
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY').trim();
  const raw = callGemini_(key, buildLinkAnalysisPrompt_(pageText.slice(0, 30000), link, pageTitle), null, { maxTokens: 8192, json: true });
  const items = parseLinkAnalysis_(raw);

  // 이미 있는 자료와 겹치는지 표시
  const existing = readTable_(SHEETS.externalResources);
  const names = existing.map((r) => normalizeKey_(r['자원명'] || r['기관명']));
  items.forEach((item) => {
    item.duplicate = names.indexOf(normalizeKey_(item['자원명'] || item['기관명'])) !== -1;
  });
  return { ok: true, items: items, sourceUrl: link, pageTitle: pageTitle, analyzedAt: today_() };
}

function normalizeKey_(value) {
  return normalizeText_(value).replace(/\s+/g, '').toLowerCase();
}

function fetchPageText_(url) {
  const response = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    followRedirects: true,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; welfare-info-note/1.0)' },
  });
  const code = response.getResponseCode();
  if (code >= 400) throw new Error('사이트가 응답하지 않았어요(HTTP ' + code + ').');
  const blob = response.getBlob();
  const headerType = normalizeText_(response.getHeaders()['Content-Type'] || response.getHeaders()['content-type']);
  if (/pdf/i.test(headerType)) throw new Error('PDF 파일은 바로 읽을 수 없어요.');
  let charset = (headerType.match(/charset=([\w-]+)/i) || [])[1] || '';
  let html = blob.getDataAsString(charset || 'UTF-8');
  if (!charset) {
    const meta = html.slice(0, 3000).match(/charset=["']?([\w-]+)/i);
    if (meta && !/utf-?8/i.test(meta[1])) html = blob.getDataAsString(meta[1]);
  }
  const title = normalizeText_((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
  const text = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h\d|\/td|\/th)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
  return { title: decodeTitle_(title), text: text };
}

function decodeTitle_(title) {
  return title.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildLinkAnalysisPrompt_(text, url, title) {
  return [
    '당신은 장애인복지관 직원이 상담에서 안내할 복지서비스·제도 정보를 정리하는 도우미입니다.',
    '아래 웹페이지 본문에서 이용자에게 안내할 수 있는 복지서비스나 지원제도를 찾아 정리하세요.',
    '',
    '규칙:',
    '- 본문에 적힌 내용만 사용하고, 없는 내용은 추측하지 말고 빈 문자열로 두세요.',
    '- 서비스가 여러 개면 각각 나누되 최대 10개까지만 정리하세요.',
    '- 안내 문장은 상담자가 이용자에게 쉽게 설명할 수 있는 말투로 짧게 쓰세요.',
    '- 생애주기는 [미취학, 초등, 중등, 고등, 성인, 전연령, 가족·지원인] 중에서 쉼표로 고르세요. 장애인 가족·보호자를 위한 서비스는 가족·지원인으로 고르세요.',
    '- 장애유형은 [전체, 발달장애, 지적장애, 자폐성장애, 지체장애, 뇌병변장애, 시각장애, 청각장애, 정신장애, 기타] 중에서 고르세요.',
    '- 욕구키워드는 [일상생활, 경제지원, 건강, 심리정서, 발달재활, 운동, 문화여가, 교육, 자기개발, 가족지원, 돌봄, 자립생활, 사회관계, 취업, 주거, 권익옹호, 기타] 중에서 쉼표로 고르세요.',
    '- 확인필요에는 신청 전에 상담자가 꼭 확인해야 할 조건(소득 기준, 기간, 지역 제한 등)이나 본문에서 불분명한 점을 적으세요.',
    '',
    '반드시 아래 형식의 순수 JSON으로만 응답하세요.',
    '{"items":[{"자원명":"","기관명":"","자원유형":"","주요지원내용":"","이용대상":"","생애주기":"","장애유형":"","욕구키워드":"","지역":"","이용방법":"","비용":"","연락처":"","추천문구":"","확인필요":""}]}',
    '',
    '페이지 제목: ' + (title || '(없음)'),
    '페이지 주소: ' + (url || '(직접 붙여넣은 내용)'),
    '── 본문 ──',
    text,
  ].join('\n');
}

function parseLinkAnalysis_(text) {
  const cleaned = normalizeText_(text).replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    try { parsed = JSON.parse(cleaned.slice(start, end + 1)); } catch (e2) {
      throw new Error('AI 응답을 정리하지 못했어요. 다시 한 번 분석해주세요.');
    }
  }
  const list = Array.isArray(parsed) ? parsed : (parsed.items || []);
  const fields = ['자원명', '기관명', '자원유형', '주요지원내용', '이용대상', '생애주기', '장애유형', '욕구키워드', '지역', '이용방법', '비용', '연락처', '추천문구', '확인필요'];
  return list.slice(0, 10).map((item) => {
    const clean = {};
    fields.forEach((f) => { clean[f] = normalizeText_(item && item[f]); });
    return clean;
  }).filter((item) => item['자원명'] || item['기관명']);
}

// 분석 결과 중 고른 항목을 "검토중"으로 저장
function saveAnalyzedItems(adminPin, items, sourceUrl) { return withFinderRefresh_(saveAnalyzedItems_impl_, arguments); }
function saveAnalyzedItems_impl_(adminPin, items, sourceUrl) {
  requireEditor_(adminPin);
  const saved = [];
  (items || []).forEach((item) => {
    const note = ['AI 링크 분석으로 추가', item['확인필요'] ? '확인필요: ' + item['확인필요'] : ''].filter(Boolean).join(' · ');
    const result = saveExternalResource(adminPin, {
      '기관명': item['기관명'], '자원명': item['자원명'], '자원유형': item['자원유형'],
      '주요지원내용': item['주요지원내용'], '이용대상': item['이용대상'], '생애주기': item['생애주기'],
      '장애유형': item['장애유형'], '욕구키워드': item['욕구키워드'], '지역': item['지역'],
      '이용방법': item['이용방법'], '비용': item['비용'], '연락처': item['연락처'],
      '추천문구': item['추천문구'], '상세링크': normalizeText_(sourceUrl), '비고': note, '활성여부': '검토중',
    });
    saved.push(result.id);
  });
  return { ok: true, count: saved.length, ids: saved };
}
