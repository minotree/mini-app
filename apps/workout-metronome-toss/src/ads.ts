// 빌드 모드가 명시되지 않으면 광고를 호출하지 않는다.
// 테스트 번들과 운영 번들은 서로 다른 ID 하나만 포함해야 한다.
export const COMPLETION_AD_GROUP_ID = import.meta.env.MODE === 'ad-test'
  ? 'ait-ad-test-interstitial-id'
  : import.meta.env.MODE === 'ad-live'
    ? 'ait.v2.live.4b404baa190d4670'
    : null;
