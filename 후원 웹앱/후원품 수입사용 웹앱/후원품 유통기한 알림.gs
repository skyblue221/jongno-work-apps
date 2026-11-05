/**
 * 후원품 유통기한 경과/임박 알림 메일 — 하루 한 번 시간 트리거로 sendExpiryAlertsOnly 실행
 * 앱과 같은 칸 설정(설정 탭)과 재고 계산을 써서, 아직 남아 있는 물품만 알려요.
 * (예전에는 후원물품등록의 B·K·M열 위치를 고정해서 읽어서, 칸이 바뀌면 틀렸어요)
 * 메일을 보내려면 appsscript.json oauthScopes에 script.send_mail 권한이 있어야 해요.
 */
const EXPIRY_ALERT_DAYS = 90;
const EXPIRY_ALERT_TO = 'smlee@jpurme.org, jykim@jpurme.org';

function sendExpiryAlertsOnly() {
  if (!setupDone_()) { Logger.log('설정 탭에서 시트 칸 확인을 먼저 해 주세요.'); return; }
  const today = dayNo_(today_());
  const list = stockCached_()
    .filter(l => l.remain > 0 && !l.done && !isNaN(dayNo_(l.expiry)))
    .map(l => ({ l: l, d: dayNo_(l.expiry) - today }))
    .filter(x => x.d <= EXPIRY_ALERT_DAYS)
    .sort((a, b) => a.d - b.d)
    .map(x => (x.d < 0 ? '❌ [경과] ' : '⚠️ [임박] ') + x.l.name + ' - ' + x.l.expiry
      + ' (' + (x.d < 0 ? -x.d + '일 지남' : x.d + '일 남음') + ') · 남은 ' + x.l.remain + (x.l.unit || ''));
  if (!list.length) { Logger.log('📭 유통기한 경과/임박 항목 없음 — 메일 발송 생략'); return; }
  MailApp.sendEmail(EXPIRY_ALERT_TO, '⚠️ 후원품 유통기한 경과/임박 알림',
    '다음 후원품의 유통기한이 임박했거나 이미 지났습니다. 시트를 확인해 주세요:\n\n' + list.join('\n'));
  Logger.log(list.length + '개 항목에 대한 알림 메일을 발송했습니다.');
}
