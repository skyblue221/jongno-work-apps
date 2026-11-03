/******************************************************************
 * 백업정리.gs — 숨겨진 백업 탭 정리 도구 (편집기에서 직접 실행)
 *
 * 앱들이 자료를 가져오거나 정리할 때 만든 숨긴 백업 탭이 쌓이면
 * 파일이 무거워져서 모든 화면·저장이 느려져요. 이 도구로 정리해요.
 *
 * 쓰는 법 (Apps Script 편집기 위쪽 함수 목록에서 고르고 ▶ 실행)
 *   1) listBackupTabs    → 아래 '실행 로그'에 백업 탭 목록과 크기만 보여 줌 (아무것도 안 지움)
 *   2) cleanupBackupTabs → 종류마다 가장 최근 백업 1개만 남기고 나머지 삭제
 *
 * 지우지 않는 것
 *   - 원래 자료 탭 (이름 규칙에 맞는 백업 탭만 골라요)
 *   - 종류마다 가장 최근 백업 1개
 *   - 후원품 앱의 '복구_' 탭: 아직 끝나지 않은 저장 작업이 있으면 하나도 안 지움
 *
 * 이 파일은 후원품 나눔·후원 관리·자원봉사 관리 앱에 똑같이 넣으면 돼요.
 ******************************************************************/

/** 백업 탭 이름 규칙 → 종류 이름 */
const BACKUP_TAB_RULES_ = [
  { re: /^(CMS)_backup_/, kind: 'CMS 누적 백업' },
  { re: /^(PEOPLE|People)_backup_/, kind: '봉사자 명단 백업' },
  { re: /^(JINWOO)_backup_/, kind: '진우 실적 백업' },
  { re: /^(HISTORY)_backup_/, kind: '과거자료 백업' },
  { re: /^발급대장_정리전_/, kind: '발급대장 정리 전 백업' },
  { re: /^복구_/, kind: '후원품 저장 복구용', leftover: true }
];

function backupTabs_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheets().map(function (sh, index) {
    const name = sh.getName();
    const rule = BACKUP_TAB_RULES_.find(function (r) { return r.re.test(name); });
    if (!rule) return null;
    return { sheet: sh, name: name, kind: rule.kind, leftover: !!rule.leftover, index: index,
      cells: sh.getMaxRows() * sh.getMaxColumns(), hidden: sh.isSheetHidden() };
  }).filter(Boolean);
}

/** 후원품 앱: 끝나지 않은 저장 작업이 있으면 '복구_' 탭을 지우면 안 됨 */
function hasPendingSave_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('앱_작업기록');
  if (!sh || sh.getLastRow() < 2) return false;
  return sh.getRange(2, 4, sh.getLastRow() - 1, 1).getValues()
    .some(function (r) { return ['처리중', '준비중', '복구필요'].indexOf(String(r[0])) >= 0; });
}

/** 지울 탭 고르기: 종류마다 가장 뒤(가장 최근에 만든) 1개는 남김. '복구_'는 남기지 않음 */
function backupPlan_() {
  const tabs = backupTabs_(), byKind = {};
  tabs.forEach(function (t) { (byKind[t.kind] = byKind[t.kind] || []).push(t); });
  const pending = hasPendingSave_(), remove = [], keep = [];
  Object.keys(byKind).forEach(function (kind) {
    const list = byKind[kind].sort(function (a, b) { return a.index - b.index; });
    list.forEach(function (t, i) {
      if (t.leftover) { (pending ? keep : remove).push(t); return; }
      (i === list.length - 1 ? keep : remove).push(t);
    });
  });
  return { tabs: tabs, keep: keep, remove: remove, pending: pending };
}

function listBackupTabs() {
  const plan = backupPlan_();
  if (!plan.tabs.length) { console.log('백업 탭이 없어요. 정리할 게 없어요 👍'); return; }
  const total = plan.remove.reduce(function (s, t) { return s + t.cells; }, 0);
  console.log('백업 탭 ' + plan.tabs.length + '개 (지울 대상 ' + plan.remove.length + '개, 남길 것 ' + plan.keep.length + '개)');
  plan.remove.forEach(function (t) { console.log('  🗑 지움  ' + t.name + '  [' + t.kind + '] 칸 ' + t.cells.toLocaleString() + '개'); });
  plan.keep.forEach(function (t) { console.log('  ✅ 남김  ' + t.name + '  [' + t.kind + ']'); });
  if (plan.pending) console.log('※ 후원품 앱에 끝나지 않은 저장 작업이 있어 「복구_」 탭은 남겨요.');
  console.log('지우면 칸 ' + total.toLocaleString() + '개가 줄어요. 지우려면 cleanupBackupTabs 를 실행하세요.');
}

function cleanupBackupTabs() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);   // 앱이 저장하는 도중에는 기다렸다가 실행
  try {
    const plan = backupPlan_(), ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!plan.remove.length) { console.log('지울 백업 탭이 없어요.'); return; }
    plan.remove.forEach(function (t) { ss.deleteSheet(t.sheet); console.log('  🗑 지웠어요: ' + t.name); });
    console.log('백업 탭 ' + plan.remove.length + '개를 정리했어요. 남긴 백업: ' + (plan.keep.map(function (t) { return t.name; }).join(', ') || '없음'));
  } finally {
    lock.releaseLock();
  }
}
