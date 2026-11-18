/****************************************************************
 * 초기접수지 (연결노트 안의 기능)
 *  - min 화면: 연결노트 첫 화면 「초기접수지」 → 목록 · 새로 쓰기 · 신청 링크
 *  - 신청 링크(?page=apply): 방문이 어려운 분이 직접(또는 가족이 대신) 작성·서명 → 「신청받음」으로 들어옴
 *  - 종이 「종로장애인복지관 초기접수지」와 같은 모양으로 인쇄 · PDF 저장
 *
 *  개인정보 보관
 *  - 연결노트 시트(직원이 함께 보는 시트)가 아니라, 처음 쓸 때 min 드라이브에 따로 만드는
 *    「연결노트 초기접수 기록 (비공개)」 시트에만 저장해요. 그 파일은 공유하지 마세요.
 *  - 목록·내용을 보는 건 앱을 배포한 계정(min)과, 아래 「초기접수 담당 이메일」에 적은 계정만 돼요.
 *    관리자 PIN으로는 열리지 않아요.
 *  - 삭제 기능은 없어요. 필요 없으면 「보류」로 두거나 비공개 시트에서 직접 지워 주세요.
 ****************************************************************/

const INTAKE_PROP_FILE = 'INTAKE_SPREADSHEET_ID';     // 비공개 시트 ID (처음 쓸 때 자동으로 생김)
const INTAKE_PROP_LINK = 'INTAKE_APPLY_URL';          // 신청 링크(공개용 배포 주소)
const INTAKE_PROP_PHONE = 'INTAKE_CONTACT_PHONE';     // 신청 화면·안내 문자에 쓰는 문의 전화
const INTAKE_PROP_STAFF = 'INTAKE_STAFF_EMAILS';      // min 말고 초기접수를 볼 수 있는 계정 (쉼표)
const INTAKE_SHEET = '초기접수';
const INTAKE_ORG = '종로장애인복지관';

const INTAKE_HEADERS = [
  '접수ID', '접수일', '경로', '상태', '접수상담번호', '1인가구',
  '이름', '생년월일', '성별', '핸드폰1', '핸드폰2', '주소',
  '장애여부', '장애유형', '장애급수', '장애정도', '중복장애', '중복장애유형', '보조기', '보조기내용',
  '공공부조', '수급종류', '공공부조기타', '희망프로그램',
  '동의1', '동의2', '안내확인1', '안내확인2', '서명일', '작성자', '대리인관계',
  '메모', '처음작성', '최종수정',
  '본인서명', '대리인서명'           // 서명 그림(글자가 길어서 맨 뒤에 둬요)
];
const IK = {};
INTAKE_HEADERS.forEach(function (h, i) { IK[h] = i + 1; });
const IK_COLS = INTAKE_HEADERS.length;
const IK_LIST_COLS = IK['최종수정'];   // 목록은 서명 칸을 빼고 읽어요 (빠르게)

const IK_STATUS = ['신청받음', '작성중', '접수완료', '보류'];
const IK_AGREE = '동의';
const IK_DISAGREE = '동의하지않음';
const IK_DIS_REG = ['장애등록', '장애미등록', '비장애'];
const IK_DIS_LEVEL = ['심한장애', '심하지않은장애'];
const IK_AID = ['일반', '수급자', '차상위', '한부모', '기타'];
const IK_BENEFIT = ['생계', '의료', '주거', '교육'];
const IK_DIS_TYPES = ['지체', '뇌병변', '시각', '청각', '언어', '안면', '신장', '심장', '간', '호흡기', '장루·요루', '뇌전증', '지적', '자폐성', '정신'];

/* 종이 양식의 동의서 문구 (2025.06.20 양식) — 양식이 바뀌면 여기만 고치면 돼요 */
const IK_CONSENT = {
  title: '개인정보 수집 · 활용 및 제3자 제공 동의서',
  intro: '종로장애인복지관은 개인정보보호법 제15조에 의거하여 개인정보의 수집 및 이용에 관한 정보주체의 동의절차를 준수하며, 정보주체의 동의 후 수집된 정보는 종로장애인복지관의 개인정보 수집 및 이용목적 외의 용도로는 절대 이용, 제공되지 않습니다.(주민등록번호는 개인정보보호법 제24조의 2에 따라 수집 및 이용, 제공하지 않음) 신청인(만 14세 미만 아동의 경우 법정대리인)은 정보주체로서 개인정보의 삭제·처리 정지요구와 개인정보의 수집·활용 및 제공에 대한 동의 거부를 할 수 있고, 이 경우 종로장애인복지관의 서비스 제공이 어려울 수 있음을 알려드립니다.',
  q1: '본인은 종로장애인복지관이 「개인정보 보호법」 제15조, 제1항 및 제24조, 제1항, 제1호에 의거 다음과 같이 본인의 개인정보 및 고유식별정보(이하 “개인정보”라 함)를 수집ㆍ이용하는 것에 대하여',
  q1Items: [
    '가. 개인정보의 수집ㆍ이용자(개인정보처리자): 종로장애인복지관',
    '나. 개인정보수집이용목적: 장애인복지관업무전산시스템 정보입력, 복지관 사업 홍보',
    '다. 개인정보의 수집 이용항목: 주민등록번호를 제외한 나머지 개인정보(성명·주소 등 인적 사항, 경제상황, 장애정보, 질병관련 이력, 사회복지 서비스 제공을 위한 욕구조사, 기타 사회복지서비스 계획 수립과 관련된 정보 등)',
    '라. 개인정보 보유 및 이용기간: 종로장애인복지관이 정한 보존기간 동안'
  ],
  q2: '본인은 종로장애인복지관이 「개인정보 보호법」 제17조, 제1항, 제1호에 의거 다음과 같이 본인의 개인정보를 제3자에게 제공하는 것에 대하여',
  q2Items: [
    '가. 개인정보를 제공받는 자: 엔컴(주) - 장애인복지관업무전산시스템',
    '나. 개인정보를 제공받는 자의 이용 목적: 이용자 정보 입력',
    '다. 제공하는 개인정보의 항목: 위 1호 다목에 해당하는 개인정보',
    '라. 개인정보를 제공받는 자의 보유 및 이용기간: 종로장애인복지관이 정한 보존기간 동안'
  ],
  q3a: '본인은 위 1∼2호에 대해 동의를 거부할 수 있다는 안내를 받았으며',
  q3b: '본인의 동의가 없을 때에는 종로장애인복지관의 지원이 어려울 수 있다는 안내를 받았습니다.',
  q4: '이용자가 제공한 모든 정보는 방화벽 등 보안장비에 의해 안전하게 보호되고 있습니다. 또한 개인정보를 처리하는 인원을 최소한으로 제한하고 정기적인 교육과 비밀번호 갱신을 통해 개인정보가 유출되지 않도록 안전하게 관리하고 있습니다.',
  closing: '본인은 본 동의서의 내용과 개인정보 수집ㆍ처리 및 제3자 제공에 관한 본인의 권리에 대하여 이해하고 서명합니다.'
};

/* 출력 양식 아래쪽 기관 로고 (활동일지 앱과 같은 그림) */
const INTAKE_LOGO = 'data:image/png;base64,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';


/* ============================================================
 * 권한 · 설정
 * ============================================================ */

function intakeStaffEmails_() {
  return normalizeText_(PropertiesService.getScriptProperties().getProperty(INTAKE_PROP_STAFF))
    .split(/[,;\s]+/).map(function (v) { return v.trim().toLowerCase(); }).filter(Boolean);
}

/** 초기접수를 볼 수 있는 계정인가: 앱을 배포한 계정(min) + 초기접수 담당 이메일. PIN으로는 안 돼요 */
function isIntakeOwner_(email) {
  const target = normalizeText_(email).toLowerCase();
  if (!target) return false;
  const owner = normalizeText_(Session.getEffectiveUser().getEmail()).toLowerCase();
  return target === owner || intakeStaffEmails_().indexOf(target) !== -1;
}

function requireIntakeOwner_() {
  const email = normalizeText_(Session.getActiveUser().getEmail());
  if (!isIntakeOwner_(email)) throw new Error('초기접수지는 담당자 계정으로만 볼 수 있어요.');
  return email;
}

function intakeLinkInfo_() {
  const p = PropertiesService.getScriptProperties();
  return {
    url: normalizeText_(p.getProperty(INTAKE_PROP_LINK)),
    phone: normalizeText_(p.getProperty(INTAKE_PROP_PHONE)),
    staff: intakeStaffEmails_().join(', ')
  };
}

/** 신청 링크 주소 · 문의 전화 · 담당 이메일 저장 (min만) */
function saveIntakeSettings(values) {
  requireIntakeOwner_();
  const v = values || {};
  const url = normalizeText_(v.url);
  if (url && !/^https:\/\/script\.google\.com\/.+\/exec(\?.*)?$/.test(url)) {
    throw new Error('신청 링크는 배포 관리에서 복사한 웹앱 주소(https://script.google.com/…/exec)를 붙여 넣어 주세요.');
  }
  const phone = normalizeText_(v.phone).slice(0, 40);
  const staff = normalizeText_(v.staff).split(/[,;\s]+/).map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean);
  staff.forEach(function (e) { if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error('담당 이메일을 확인해 주세요: ' + e); });
  const p = PropertiesService.getScriptProperties();
  p.setProperty(INTAKE_PROP_LINK, url);
  p.setProperty(INTAKE_PROP_PHONE, phone);
  p.setProperty(INTAKE_PROP_STAFF, staff.join(','));
  return intakeLinkInfo_();
}


/* ============================================================
 * 비공개 시트
 * ============================================================ */

function intakeBook_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty(INTAKE_PROP_FILE);
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) {
      throw new Error('초기접수 기록 시트를 열지 못했어요. 드라이브 휴지통에 들어갔는지 확인해 주세요. (' + e.message + ')');
    }
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const again = props.getProperty(INTAKE_PROP_FILE);
    if (again) return SpreadsheetApp.openById(again);
    const book = SpreadsheetApp.create('연결노트 초기접수 기록 (비공개)');
    const sheet = book.getSheets()[0].setName(INTAKE_SHEET);
    sheet.getRange(1, 1, 1, IK_COLS).setValues([INTAKE_HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, sheet.getMaxRows(), IK_COLS).setNumberFormat('@');
    props.setProperty(INTAKE_PROP_FILE, book.getId());
    return book;
  } finally {
    lock.releaseLock();
  }
}

function intakeSheet_() {
  const book = intakeBook_();
  const sheet = book.getSheetByName(INTAKE_SHEET);
  if (!sheet) throw new Error('초기접수 기록 시트에 「' + INTAKE_SHEET + '」 탭이 없어요. 탭 이름을 바꾸지 말아 주세요.');
  const head = sheet.getRange(1, 1, 1, IK_COLS).getDisplayValues()[0];
  if (INTAKE_HEADERS.some(function (h, i) { return head[i] !== h; })) {
    throw new Error('초기접수 기록 시트 첫 행이 예상과 달라요. 칸 순서를 바꾸지 말아 주세요.');
  }
  return sheet;
}

function intakeRows_(sheet, withSignatures) {
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, withSignatures ? IK_COLS : IK_LIST_COLS).getDisplayValues()
    .map(function (r, i) { return intakeFromRow_(r, i + 2); })
    .filter(function (x) { return x.id; });
}

function intakeFromRow_(r, rowNumber) {
  const g = function (h) { return r[IK[h] - 1] == null ? '' : String(r[IK[h] - 1]); };
  const list = function (h) { return g(h).split(',').map(function (x) { return x.trim(); }).filter(Boolean); };
  return {
    rowNumber: rowNumber,
    id: g('접수ID'), date: g('접수일'), route: g('경로'), status: g('상태') || '작성중',
    no: g('접수상담번호'), alone: g('1인가구'),
    name: g('이름'), birth: g('생년월일'), gender: g('성별'),
    phone1: g('핸드폰1'), phone2: g('핸드폰2'), address: g('주소'),
    disReg: g('장애여부'), disType: g('장애유형'), disGrade: g('장애급수'), disLevel: g('장애정도'),
    multi: g('중복장애'), multiType: g('중복장애유형'), aid: g('보조기'), aidText: g('보조기내용'),
    support: list('공공부조'), benefits: list('수급종류'), supportEtc: g('공공부조기타'),
    hope: g('희망프로그램'),
    c1: g('동의1'), c2: g('동의2'), ack1: g('안내확인1') === 'Y', ack2: g('안내확인2') === 'Y',
    signDate: g('서명일'), writer: g('작성자') || '본인', relation: g('대리인관계'),
    memo: g('메모'), created: g('처음작성'), updated: g('최종수정'),
    sigSelf: g('본인서명'), sigProxy: g('대리인서명')
  };
}

function intakeRowFrom_(x) {
  const row = new Array(IK_COLS).fill('');
  const put = function (h, v) { row[IK[h] - 1] = v == null ? '' : String(v); };
  put('접수ID', x.id); put('접수일', x.date); put('경로', x.route); put('상태', x.status);
  put('접수상담번호', x.no); put('1인가구', x.alone);
  put('이름', x.name); put('생년월일', x.birth); put('성별', x.gender);
  put('핸드폰1', x.phone1); put('핸드폰2', x.phone2); put('주소', x.address);
  put('장애여부', x.disReg); put('장애유형', x.disType); put('장애급수', x.disGrade); put('장애정도', x.disLevel);
  put('중복장애', x.multi); put('중복장애유형', x.multiType); put('보조기', x.aid); put('보조기내용', x.aidText);
  put('공공부조', (x.support || []).join(', ')); put('수급종류', (x.benefits || []).join(', ')); put('공공부조기타', x.supportEtc);
  put('희망프로그램', x.hope);
  put('동의1', x.c1); put('동의2', x.c2); put('안내확인1', x.ack1 ? 'Y' : ''); put('안내확인2', x.ack2 ? 'Y' : '');
  put('서명일', x.signDate); put('작성자', x.writer); put('대리인관계', x.relation);
  put('메모', x.memo); put('처음작성', x.created); put('최종수정', x.updated);
  put('본인서명', x.sigSelf); put('대리인서명', x.sigProxy);
  return row;
}

function nextIntakeId_(sheet) {
  const prefix = 'IN-' + today_().replace(/-/g, '') + '-';
  let max = 0;
  if (sheet.getLastRow() >= 2) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues().forEach(function (r) {
      const id = String(r[0]);
      if (id.indexOf(prefix) === 0) max = Math.max(max, Number(id.slice(prefix.length)) || 0);
    });
  }
  return prefix + String(max + 1).padStart(3, '0');
}

function findIntakeRow_(sheet, id) {
  const want = normalizeText_(id);
  if (!want || sheet.getLastRow() < 2) return 0;
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) if (ids[i][0] === want) return i + 2;
  return 0;
}


/* ============================================================
 * 입력 정리 (min 화면 · 신청 링크 공통)
 * ============================================================ */

function ikText_(value, max) {
  const t = normalizeText_(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max || 200);
  return /^[=+@]/.test(t) ? "'" + t : t;   // 시트 수식으로 읽히지 않게
}
function ikPick_(value, allowed) { const v = normalizeText_(value); return allowed.indexOf(v) !== -1 ? v : ''; }
function ikPhone_(value) {
  const d = normalizeText_(value).replace(/[^\d]/g, '');
  if (!d) return '';
  if (!/^0\d{8,10}$/.test(d)) throw new Error('연락처를 숫자로 정확히 입력해 주세요. (예: 010-1234-5678)');
  if (d.length === 11) return d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7);
  if (d.indexOf('02') === 0) return d.length === 9 ? d.slice(0, 2) + '-' + d.slice(2, 5) + '-' + d.slice(5) : d.slice(0, 2) + '-' + d.slice(2, 6) + '-' + d.slice(6);
  return d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6);
}
function ikDate_(value, label) {
  const v = normalizeText_(value);
  if (!v) return '';
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error('「' + label + '」 칸을 날짜로 입력해 주세요.');
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) {
    throw new Error('「' + label + '」 칸을 다시 확인해 주세요. 달력에 없는 날짜예요.');
  }
  return v;
}
function ikSig_(value) {
  const v = normalizeText_(value);
  if (!v) return '';
  if (v.indexOf('data:image/png;base64,') !== 0) throw new Error('서명을 다시 해 주세요.');
  if (v.length > 45000) throw new Error('서명 그림이 너무 커요. 지우고 조금 작게 다시 서명해 주세요.');
  return v;
}

/** 만 나이 (기준일 기준) */
function ikAge_(birth, onDate) {
  if (!birth) return '';
  const b = birth.split('-').map(Number), t = (onDate || today_()).split('-').map(Number);
  if (b.length !== 3 || t.length !== 3) return '';
  return t[0] - b[0] - ((t[1] < b[1] || (t[1] === b[1] && t[2] < b[2])) ? 1 : 0);
}

/** 화면에서 받은 값 → 저장할 값 (검사는 따로) */
function ikClean_(d) {
  const support = (Array.isArray(d.support) ? d.support : []).map(normalizeText_).filter(function (s) { return IK_AID.indexOf(s) !== -1; });
  const benefits = support.indexOf('수급자') !== -1
    ? (Array.isArray(d.benefits) ? d.benefits : []).map(normalizeText_).filter(function (s) { return IK_BENEFIT.indexOf(s) !== -1; })
    : [];
  const disReg = ikPick_(d.disReg, IK_DIS_REG);
  const multi = ikPick_(d.multi, ['있음', '없음']);
  const aid = ikPick_(d.aid, ['사용', '미사용']);
  const writer = ikPick_(d.writer, ['본인', '대리']) || '본인';
  return {
    no: ikText_(d.no, 40),
    alone: ikPick_(d.alone, ['예', '아니오']),
    name: ikText_(d.name, 40),
    birth: ikDate_(d.birth, '생년월일'),
    gender: ikPick_(d.gender, ['남', '여']),
    phone1: ikPhone_(d.phone1),
    phone2: ikPhone_(d.phone2),
    address: ikText_(d.address, 200),
    disReg: disReg,
    disType: disReg === '장애등록' ? ikText_(d.disType, 30) : '',
    disGrade: disReg === '장애등록' ? ikText_(d.disGrade, 10) : '',
    disLevel: disReg === '장애등록' ? ikPick_(d.disLevel, IK_DIS_LEVEL) : '',
    multi: multi,
    multiType: multi === '있음' ? ikText_(d.multiType, 40) : '',
    aid: aid,
    aidText: aid === '사용' ? ikText_(d.aidText, 60) : '',
    support: support.indexOf('일반') !== -1 ? ['일반'] : support,
    benefits: support.indexOf('일반') !== -1 ? [] : benefits,
    supportEtc: support.indexOf('기타') !== -1 ? ikText_(d.supportEtc, 40) : '',
    hope: ikText_(d.hope, 500),
    c1: ikPick_(d.c1, [IK_AGREE, IK_DISAGREE]),
    c2: ikPick_(d.c2, [IK_AGREE, IK_DISAGREE]),
    ack1: d.ack1 === true || d.ack1 === 'Y',
    ack2: d.ack2 === true || d.ack2 === 'Y',
    signDate: ikDate_(d.signDate, '서명 날짜'),
    writer: writer,
    relation: writer === '대리' ? ikText_(d.relation, 20) : '',
    memo: ikText_(d.memo, 500)
  };
}


/* ============================================================
 * min 화면
 * ============================================================ */

/** 초기접수 화면을 열 때 한 번: 목록 + 설정 + 프로그램 이름(희망 프로그램 고르기용) */
function getIntakeBoot() {
  const me = requireIntakeOwner_();
  let programs = [];
  try {
    const year = programYearInfo_().selectedYear;
    programs = getResources_(true, year).internal
      .filter(function (p) { return ['종료', '마감'].indexOf(p.recruitStatus) === -1; })
      .map(function (p) { return { name: p.name, status: p.recruitStatus, team: p.team, target: p.target }; });
  } catch (e) { programs = []; }
  return {
    me: me,
    list: listIntakes_(),
    link: intakeLinkInfo_(),
    fileUrl: intakeBook_().getUrl(),
    programs: programs,
    today: today_(),
    disTypes: IK_DIS_TYPES,
    consent: IK_CONSENT
  };
}

function listIntakes() { requireIntakeOwner_(); return listIntakes_(); }

function listIntakes_() {
  const today = today_();
  return intakeRows_(intakeSheet_(), false).map(function (x) {
    return {
      id: x.id, date: x.date, route: x.route, status: x.status, no: x.no, name: x.name,
      birth: x.birth, age: ikAge_(x.birth, x.date || today), phone: x.phone1 || x.phone2,
      hope: x.hope, updated: x.updated, writer: x.writer
    };
  }).sort(function (a, b) { return (b.date + b.id) < (a.date + a.id) ? -1 : 1; });
}

function getIntake(id) {
  requireIntakeOwner_();
  const sheet = intakeSheet_();
  const n = findIntakeRow_(sheet, id);
  if (!n) throw new Error('접수지를 찾지 못했어요. 목록을 새로고침해 주세요.');
  return intakeFromRow_(sheet.getRange(n, 1, 1, IK_COLS).getDisplayValues()[0], n);
}

/**
 * 저장 (새로 쓰기 / 고치기)
 * data: 화면 값 + { id(고칠 때), status, date, sigSelf, sigProxy, keepSigSelf, keepSigProxy }
 *  - 서명은 새로 하면 바꾸고, 「지우기」를 누르면 비워요. 손대지 않으면 그대로.
 */
function saveIntake(data) {
  const me = requireIntakeOwner_();
  const d = data || {};
  const v = ikClean_(d);
  if (!v.name) throw new Error('이름을 입력해 주세요.');
  const status = ikPick_(d.status, IK_STATUS) || '작성중';
  if (status === '접수완료') {
    if (!v.birth) throw new Error('접수완료로 하려면 생년월일이 필요해요.');
    if (!v.c1) throw new Error('접수완료로 하려면 개인정보 수집·이용 동의 여부를 골라 주세요.');
  }
  const date = ikDate_(d.date, '접수일') || today_();
  if (v.birth && v.birth > date) throw new Error('생년월일이 접수일보다 늦어요. 확인해 주세요.');
  if (v.writer === '대리' && !v.relation) throw new Error('대신 작성한 분의 관계를 적어 주세요. (예: 어머니)');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = intakeSheet_();
    const now = nowText_();
    let n = 0, old = null;
    if (d.id) {
      n = findIntakeRow_(sheet, d.id);
      if (!n) throw new Error('접수지를 찾지 못했어요. 목록을 새로고침해 주세요.');
      old = intakeFromRow_(sheet.getRange(n, 1, 1, IK_COLS).getDisplayValues()[0], n);
      if (d.updated && old.updated && d.updated !== old.updated) {
        throw new Error('그 사이에 다른 곳에서 고쳐졌어요. 창을 닫고 다시 열어 주세요.');
      }
    }
    const x = Object.assign({}, v, {
      id: old ? old.id : nextIntakeId_(sheet),
      date: date,
      route: old ? old.route : '직접작성',
      status: status,
      created: old ? old.created : now + ' ' + me,
      updated: now,
      sigSelf: d.sigSelf === 'keep' && old ? old.sigSelf : ikSig_(d.sigSelf === 'keep' ? '' : d.sigSelf),
      sigProxy: d.sigProxy === 'keep' && old ? old.sigProxy : ikSig_(d.sigProxy === 'keep' ? '' : d.sigProxy)
    });
    if (!n) n = Math.max(sheet.getLastRow(), 1) + 1;
    const range = sheet.getRange(n, 1, 1, IK_COLS);
    range.setNumberFormat('@').setValues([intakeRowFrom_(x)]);
    return { id: x.id, status: x.status, updated: x.updated, created: !old };
  } finally {
    lock.releaseLock();
  }
}

/** 상태만 바꾸기 (접수완료 · 보류 · 작성중) */
function setIntakeStatus(id, status, memo) {
  requireIntakeOwner_();
  const s = ikPick_(status, IK_STATUS);
  if (!s) throw new Error('상태를 다시 골라 주세요.');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = intakeSheet_();
    const n = findIntakeRow_(sheet, id);
    if (!n) throw new Error('접수지를 찾지 못했어요.');
    const x = intakeFromRow_(sheet.getRange(n, 1, 1, IK_LIST_COLS).getDisplayValues()[0], n);
    if (s === '접수완료' && (!x.birth || !x.c1)) throw new Error('생년월일과 개인정보 동의 여부가 있어야 접수완료로 할 수 있어요. 열어서 채워 주세요.');
    sheet.getRange(n, IK['상태']).setValue(s);
    if (memo != null) sheet.getRange(n, IK['메모']).setValue(ikText_(memo, 500));
    sheet.getRange(n, IK['최종수정']).setValue(nowText_());
    return { id: x.id, status: s };
  } finally {
    lock.releaseLock();
  }
}

/** 인쇄 미리보기용 HTML (여러 장 가능) */
function makeIntakePrint(ids, blank) {
  requireIntakeOwner_();
  const list = blank ? [ikBlank_()] : pickIntakes_(ids);
  return { html: buildIntakeHtml_(list), fileName: intakeFileName_(list, blank) };
}

/** [PDF 저장]을 누를 때만 변환 */
function makeIntakePdfFile(ids, blank) {
  requireIntakeOwner_();
  const list = blank ? [ikBlank_()] : pickIntakes_(ids);
  const pdf = Utilities.newBlob(buildIntakeHtml_(list), 'text/html', 'intake.html')
    .getAs('application/pdf').setName(intakeFileName_(list, blank));
  return { fileName: pdf.getName(), base64: Utilities.base64Encode(pdf.getBytes()) };
}

function pickIntakes_(ids) {
  const want = (Array.isArray(ids) ? ids : [ids]).map(normalizeText_).filter(Boolean);
  if (!want.length) throw new Error('출력할 접수지를 골라 주세요.');
  if (want.length > 30) throw new Error('한 번에 30장까지 출력할 수 있어요.');
  const all = intakeRows_(intakeSheet_(), true);
  const list = want.map(function (id) { return all.find(function (x) { return x.id === id; }); }).filter(Boolean);
  if (!list.length) throw new Error('접수지를 찾지 못했어요.');
  return list;
}

function intakeFileName_(list, blank) {
  const clean = function (s) { return String(s).replace(/[\\/:*?"<>|]/g, '').trim(); };
  if (blank) return '초기접수지_빈양식.pdf';
  return clean(list.length === 1
    ? '초기접수지_' + list[0].name + '_' + (list[0].date || today_()) + '.pdf'
    : '초기접수지_' + list.length + '명_' + today_() + '.pdf');
}

function ikBlank_() {
  return { id: '', date: '', no: '', alone: '', name: '', birth: '', gender: '', phone1: '', phone2: '', address: '',
    disReg: '', disType: '', disGrade: '', disLevel: '', multi: '', multiType: '', aid: '', aidText: '',
    support: [], benefits: [], supportEtc: '', hope: '', c1: '', c2: '', ack1: false, ack2: false,
    signDate: '', writer: '본인', relation: '', sigSelf: '', sigProxy: '' };
}


/* ============================================================
 * 신청 링크 화면 (누구나 호출) — 저장된 개인정보를 돌려주지 않아요
 * ============================================================ */

/** 신청 화면을 열 때 쓰는 정보 (개인정보 없음) */
function intakeApplyPageData_() {
  const link = intakeLinkInfo_();
  return { org: INTAKE_ORG, phone: link.phone, consent: IK_CONSENT, disTypes: IK_DIS_TYPES, today: today_() };
}

function submitIntakeApplication(data) {
  const d = data || {};
  // 한꺼번에 많이 들어오는 것 막기 (한 시간에 40건)
  const cache = CacheService.getScriptCache();
  const hourKey = 'ikApply_' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMddHH');
  const count = Number(cache.get(hourKey) || 0);
  if (count >= 40) throw new Error('지금 신청이 많아 잠시 받을 수 없어요. 조금 뒤에 다시 해 주시거나 복지관으로 전화 주세요.');

  const v = ikClean_(Object.assign({}, d, { no: '', memo: '' }));
  v.signDate = today_();
  if (!v.name) throw new Error('이름을 입력해 주세요.');
  if (!v.birth) throw new Error('생년월일을 입력해 주세요.');
  if (v.birth > today_()) throw new Error('생년월일을 다시 확인해 주세요.');
  if (!v.phone1 && !v.phone2) throw new Error('연락받을 전화번호를 하나 이상 적어 주세요.');
  if (v.c1 !== IK_AGREE) throw new Error('개인정보 수집·이용에 동의해야 접수할 수 있어요. 동의가 어려우시면 복지관으로 전화 주세요.');
  if (!v.c2) throw new Error('제3자 제공 동의 여부를 골라 주세요.');
  if (!v.ack1 || !v.ack2) throw new Error('3번 안내 두 가지를 읽고 확인에 체크해 주세요.');
  const under14 = ikAge_(v.birth, today_()) < 14;
  if (under14 && v.writer !== '대리') throw new Error('만 14세 미만은 법정대리인(부모님 등)이 작성하고 서명해 주세요.');
  if (v.writer === '대리' && !v.relation) throw new Error('작성하시는 분과 신청인의 관계를 적어 주세요. (예: 어머니)');
  const sig = ikSig_(d.signature);
  if (!sig) throw new Error('서명을 해 주세요.');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = intakeSheet_();
    const dup = intakeRows_(sheet, false).find(function (x) {
      return x.status === '신청받음' && x.name.replace(/\s/g, '') === v.name.replace(/\s/g, '') && x.birth === v.birth;
    });
    if (dup) throw new Error('이미 접수된 신청이 있어요. 담당자가 확인 후 연락드릴게요. 고칠 내용이 있으면 복지관으로 전화 주세요.');

    const now = nowText_();
    const x = Object.assign({}, v, {
      id: nextIntakeId_(sheet), date: today_(), route: '링크신청', status: '신청받음',
      created: now + ' 신청 링크', updated: now,
      sigSelf: v.writer === '대리' ? '' : sig,
      sigProxy: v.writer === '대리' ? sig : ''
    });
    const n = Math.max(sheet.getLastRow(), 1) + 1;
    sheet.getRange(n, 1, 1, IK_COLS).setNumberFormat('@').setValues([intakeRowFrom_(x)]);
    cache.put(hourKey, String(count + 1), 3700);
    // 신청한 분이 바로 내려받을 수 있게, 방금 쓴 내용만 양식으로 돌려줘요
    return { id: x.id, name: x.name, html: buildIntakeHtml_([x]), fileName: intakeFileName_([x]) };
  } finally {
    lock.releaseLock();
  }
}


/* ============================================================
 * 종이 양식과 같은 모양 (A4 한 장에 한 명)
 * ============================================================ */

function ikEsc_(value) {
  return String(value == null ? '' : value).replace(/^'/, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildIntakeHtml_(list) {
  const C = IK_CONSENT;
  const bx = function (on) { return '<span class="bx' + (on ? ' on' : '') + '">' + (on ? 'V' : '') + '</span>'; };
  const sp = function (n) { return new Array(n + 1).join('&nbsp;'); };
  const fill = function (value, width) {
    return '<span class="fl" style="min-width:' + width + 'mm">' + (value ? ikEsc_(value) : '') + '</span>';
  };
  const sig = function (src) { return src && String(src).indexOf('data:image/png;base64,') === 0 ? '<img class="sig" src="' + src + '">' : ''; };

  const pages = list.map(function (x) {
    const has = function (arr, v) { return (arr || []).indexOf(v) !== -1; };
    const age = ikAge_(x.birth, x.date || today_());
    const sd = (x.signDate || '').split('-');
    const proxy = x.writer === '대리';
    return '<div class="page">' +
      '<h1>종 로 장 애 인 복 지 관 &nbsp; 초 기 접 수 지</h1>' +
      '<table class="hd"><tr><td class="no"><b>접수상담번호 :</b> ' + ikEsc_(x.no) + '</td>' +
      '<td class="al"><b>1인 가구</b></td><td class="alv">' + bx(x.alone === '예') + ' 예' + sp(4) + bx(x.alone === '아니오') + ' 아니오</td></tr></table>' +

      '<table class="t"><colgroup><col style="width:11%"><col style="width:31%"><col style="width:12%"><col style="width:22%"><col style="width:9%"><col style="width:15%"></colgroup>' +
      '<tr><th>이름</th><td>' + ikEsc_(x.name) + '</td><th>생년월일</th><td>' + ikEsc_(x.birth ? x.birth.replace(/-/g, '. ') + '.' : '') + '</td><th>나이</th><td class="r">' + (age === '' ? '' : age) + ' 세</td></tr>' +
      '<tr><th>성별</th><td>' + bx(x.gender === '남') + ' 남' + sp(8) + bx(x.gender === '여') + ' 여</td><th>연락처</th>' +
      '<td colspan="3" class="ph"><div class="p1">핸드폰1(본인) &nbsp;' + ikEsc_(x.phone1) + '</div><div>핸드폰2(보호자) &nbsp;' + ikEsc_(x.phone2) + '</div></td></tr>' +
      '<tr><th>주소</th><td colspan="5">' + ikEsc_(x.address) + '</td></tr>' +
      '<tr><th>장애여부</th><td class="two">' +
        '<div>' + bx(x.disReg === '장애등록') + ' 장애등록(' + fill(x.disType, 14) + ' 장애 ' + fill(x.disGrade, 5) + ' 급)</div>' +
        '<div>' + bx(x.disReg === '장애미등록') + ' 장애 미등록' + sp(10) + bx(x.disReg === '비장애') + ' 비장애</div></td>' +
      '<th>장애정도</th><td colspan="3" class="two"><div>' + bx(x.disLevel === '심한장애') + ' 장애의 정도가 심한 장애인</div>' +
        '<div>' + bx(x.disLevel === '심하지않은장애') + ' 장애의 정도가 심하지 않은 장애인</div></td></tr>' +
      '<tr><th>중복장애</th><td class="two"><div>' + bx(x.multi === '있음') + ' 있음(' + fill(x.multiType, 22) + ' 장애 )</div>' +
        '<div>' + bx(x.multi === '없음') + ' 없음</div></td>' +
      '<th>보조기</th><td colspan="3" class="two"><div>' + bx(x.aid === '사용') + ' 사용(' + fill(x.aidText, 30) + ' )</div>' +
        '<div>' + bx(x.aid === '미사용') + ' 미사용</div></td></tr>' +
      '<tr><th>공공부조</th><td colspan="5" class="two">' +
        '<div class="aid"><span style="width:44%">' + bx(has(x.support, '일반')) + ' 일반</span><span>' + bx(has(x.support, '수급자')) + ' 국민기초생활보장수급자 (' +
          IK_BENEFIT.map(function (b) { return bx(has(x.benefits, b)) + ' ' + b; }).join(', ') + ')</span></div>' +
        '<div class="aid"><span style="width:44%">' + bx(has(x.support, '차상위')) + ' 차상위(조건부 수급자 포함)</span><span style="width:30%">' + bx(has(x.support, '한부모')) + ' 한부모 가정</span><span>' +
          bx(has(x.support, '기타')) + ' 기타: ' + ikEsc_(x.supportEtc) + '</span></div></td></tr>' +
      '<tr><th class="hp">희망<br>프로그램</th><td colspan="5" class="hope">' + ikEsc_(x.hope).replace(/\n/g, '<br>') + '</td></tr>' +
      '<tr><th colspan="6" class="ct">' + C.title + '</th></tr>' +
      '<tr><td colspan="6" class="law">' +
        '<p class="in">' + C.intro + '</p>' +
        '<p class="q">1. ' + C.q1 + ' &nbsp;<b class="yn">' + bx(x.c1 === IK_AGREE) + ' 동의합니다. &nbsp;' + bx(x.c1 === IK_DISAGREE) + ' 동의하지 않습니다.</b></p>' +
        C.q1Items.map(function (s) { return '<p class="it">' + s + '</p>'; }).join('') +
        '<p class="q">2. ' + C.q2 + '</p><p class="yn2"><b class="yn">' + bx(x.c2 === IK_AGREE) + ' 동의합니다. &nbsp;' + bx(x.c2 === IK_DISAGREE) + ' 동의하지 않습니다.</b></p>' +
        C.q2Items.map(function (s) { return '<p class="it">' + s + '</p>'; }).join('') +
        '<p class="q">3. ' + C.q3a + bx(x.ack1) + ' ' + C.q3b + bx(x.ack2) + '</p>' +
        '<p class="q">4. ' + C.q4 + '</p>' +
        '<p class="cl">' + C.closing + '</p>' +
        '<p class="dt">' + (sd.length === 3 ? sd[0] + ' 년 &nbsp; ' + Number(sd[1]) + ' 월 &nbsp; ' + Number(sd[2]) + ' 일' : '20' + sp(8) + '년' + sp(8) + '월' + sp(8) + '일') + '</p>' +
        '<table class="sg">' +
          '<tr><td class="w">신청인(본인)</td><td class="n">' + (proxy ? '' : ikEsc_(x.name)) + '</td><td class="s">' + sig(x.sigSelf) + '(인)</td></tr>' +
          '<tr><td class="w">신청인(관계: ' + fill(proxy ? x.relation : '', 14) + ')</td><td class="n"></td><td class="s">' + sig(x.sigProxy) + '(인)</td></tr>' +
          '<tr><td colspan="3" class="kid">※ 만 14세미만 아동의 경우는 법정대리인</td></tr>' +
        '</table>' +
      '</td></tr></table>' +
      '<table class="foot"><tr><td class="pr">' + (x.id ? (x.route === '링크신청' ? '온라인 신청' : '전자 작성') + ' · ' + ikEsc_(x.id) : '') + '</td>' +
        '<td class="lg"><img class="logo" src="' + INTAKE_LOGO + '"></td><td class="pr"></td></tr></table>' +
      '</div>';
  });

  return '<html><head><meta charset="utf-8"><title>초기접수지</title><style>' +
    '@page{size:A4;margin:10mm 11mm 8mm 11mm}' +
    '@media screen{body{padding:16px;max-width:780px;margin:0 auto;background:#fff}.page{margin-bottom:36px}}' +
    'body{font-family:"Noto Sans KR","Malgun Gothic",sans-serif;color:#000;margin:0;font-size:9.5pt}' +
    '*{-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.page{page-break-after:always}.page:last-child{page-break-after:auto}' +
    'h1{text-align:center;font-size:19pt;margin:0 0 2.5mm;letter-spacing:1px}' +
    'table{border-collapse:collapse}' +
    'table.hd{width:100%;margin-bottom:-1px}table.hd td{font-size:9pt;padding:2px 4px;height:6.5mm}' +
    'table.hd .no{border:0}table.hd .al{border:1px solid #000;border-bottom:0;text-align:center;width:13%;background:#e8e8e8}table.hd .alv{border:1px solid #000;border-bottom:0;width:24%;text-align:center}' +
    'table.t{width:100%;table-layout:fixed;border:2px solid #000}' +
    'table.t th,table.t td{border:1px solid #000;padding:2px 6px;vertical-align:middle;word-wrap:break-word}' +
    'table.t th{background:#e8e8e8;font-size:10.5pt;height:8mm}table.t td{font-size:9.5pt;height:8mm}' +
    'td.r{text-align:right}td.two div{line-height:1.55}' +
    'td.ph{padding:0}td.ph div{padding:2px 6px;height:4.6mm;line-height:4.6mm}td.ph .p1{border-bottom:1px dotted #000}' +
    '.aid span{display:inline-block}' +
    'th.hp{font-size:10pt;line-height:1.25}td.hope{height:11mm;vertical-align:top}' +
    'th.ct{font-size:10.5pt;height:7mm}' +
    'td.law{padding:1.6mm 3mm 0;font-size:7.5pt;line-height:1.45;vertical-align:top}' +
    'td.law p{margin:0}p.in{text-indent:1em;margin-bottom:2mm!important}p.q{margin-top:1.6mm!important}p.it{padding-left:1.6em}' +
    'b.yn{font-size:9.5pt;white-space:nowrap}p.yn2{padding-left:1em}p.cl{text-align:center;font-weight:bold;font-size:8pt;margin-top:3mm!important}' +
    'p.dt{text-align:center;font-size:11pt;margin:2mm 0 0!important}' +
    'table.sg{margin-left:auto;margin-right:6mm}table.t table.sg td{border:0;font-size:10.5pt;height:8.5mm;padding:0 3mm;vertical-align:middle}' +
    'td.n{min-width:26mm;text-align:center}table.t table.sg td.s{width:42mm;text-align:right;white-space:nowrap}' +
    '.sig{height:9mm;max-width:30mm;vertical-align:middle;margin-right:1mm}' +
    'table.t table.sg td.kid{font-size:7.5pt;text-align:right;height:5mm}' +
    '.fl{display:inline-block;text-align:center;white-space:nowrap}td.two div{white-space:nowrap;overflow:hidden}' +
    '.bx{display:inline-block;width:10px;height:10px;line-height:10px;border:1.2px solid #000;font-size:8px;font-weight:bold;text-align:center;vertical-align:-1px}' +
    'table.foot{width:100%;margin-top:2mm;table-layout:fixed}table.foot td{padding:0;vertical-align:middle}table.foot .pr{width:30%;font-size:7pt;color:#777}table.foot .lg{text-align:center}.logo{height:6.5mm}' +
    '</style></head><body>' + pages.join('') + '</body></html>';
}
