/**
 * 보고서 만들기 웹앱 — 활동계획서 / 결과보고서 / 장애이해교육 결과보고서를 칸 채우고 한글(HWPX)로 내려받기
 * 구글시트에 붙어 있는(바인딩) Apps Script 프로젝트로 사용합니다.
 * 저장 시트: 「보고서」 (없으면 자동으로 만들어요)
 */
var SHEET_NAME = '보고서';
var HEADERS = ['ID', '종류', '프로그램명', '날짜', '제목', '수정일', '데이터'];

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('보고서 만들기')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#F2F2F2');
    sh.setFrozenRows(1);
    sh.setColumnWidth(5, 360);
    sh.hideColumns(7);
  }
  return sh;
}

/** 틀 파일 내려주기 */
function getTemplate(kind) {
  return kind === 'edu' ? TEMPLATE_EDU_B64 : TEMPLATE_PLAN_B64;
}

/** 저장된 보고서 목록 (최근 수정 순) */
function listReports() {
  var sh = getSheet_();
  var n = sh.getLastRow() - 1;
  if (n < 1) return [];
  var rows = sh.getRange(2, 1, n, 6).getDisplayValues();
  return rows.filter(function (r) { return r[0]; }).map(function (r) {
    return { id: r[0], type: r[1], programName: r[2], date: r[3], title: r[4], updated: r[5] };
  }).sort(function (a, b) { return a.updated < b.updated ? 1 : -1; });
}

/** 보고서 하나 불러오기 */
function getReport(id) {
  var sh = getSheet_();
  var row = findRow_(sh, id);
  if (!row) throw new Error('보고서를 찾을 수 없어요.');
  return JSON.parse(sh.getRange(row, 7).getValue());
}

/** 저장 (새 보고서면 추가, 있으면 덮어쓰기) → id 돌려줌 */
function saveReport(data) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = getSheet_();
    if (!data.id) data.id = Utilities.getUuid().slice(0, 8);
    var json = JSON.stringify(data);
    if (json.length > 49000) throw new Error('내용이 너무 길어서 저장할 수 없어요. (글자 수를 조금 줄여주세요)');
    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    var values = [data.id, data.type === 'edu' ? '장애이해교육' : data.type === 'result' ? '결과보고서' : '활동계획서', data.programName || '',
      data.date || '', data.title || '', now, json];
    var row = findRow_(sh, data.id);
    if (row) sh.getRange(row, 1, 1, values.length).setValues([values]);
    else sh.appendRow(values);
    sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).setNumberFormat('@');
    return { id: data.id, updated: now };
  } finally {
    lock.releaseLock();
  }
}

function deleteReport(id) {
  var sh = getSheet_();
  var row = findRow_(sh, id);
  if (row) sh.deleteRow(row);
  return true;
}

function findRow_(sh, id) {
  var n = sh.getLastRow() - 1;
  if (n < 1) return 0;
  var ids = sh.getRange(2, 1, n, 1).getDisplayValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return 0;
}

/* ── 사진·첨부 그림: 구글 드라이브 「보고서 만들기_사진」 폴더에 보관 ── */
function imgFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('IMG_FOLDER');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder('보고서 만들기_사진');
  props.setProperty('IMG_FOLDER', f.getId());
  return f;
}
function saveImage(b64, name) {
  var blob = Utilities.newBlob(Utilities.base64Decode(b64), 'image/jpeg', (name || 'photo').replace(/\.[^.]+$/, '') + '.jpg');
  return imgFolder_().createFile(blob).getId();
}
function getImage(id) {
  try { return Utilities.base64Encode(DriveApp.getFileById(id).getBlob().getBytes()); }
  catch (e) { return null; }
}

/** 처음 한 번: 편집기에서 이 함수를 골라 ▶실행 → 권한 허용 (사진 저장 폴더도 만들어요) */
function setup() {
  getSheet_();
  var f = imgFolder_();
  Logger.log('준비 완료! 사진 폴더: ' + f.getName());
}
