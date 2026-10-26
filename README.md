# Market Alert PC

QLD · TQQQ · SOXL · QQQM을 하나의 Windows 창에서 사용하는 PC 통합 앱입니다.

[Windows 설치 파일 다운로드](https://github.com/nnn46099080-dotcom/market-alert-desktop/releases/download/pc-v1.0.0/QLD-1.0.0%2B1-PC-Setup.exe) · [PC 홈페이지](https://qld-market-alert-pc.web.app/#download)

- Windows 10/11 64비트, 버전 1.0.0 (빌드 1)
- 상단 종목 탭, 큰 차트와 전략 카드, 작은 창 모드
- 밝기·창 투명도 조절, 항상 위 표시, 트레이에서 다시 열기
- 종목별 PC 보유 기록, 기존 전체 웹앱 연결
- 기존 카카오 AdFit 웹 광고

`Ctrl+Shift+R`로 밝기와 불투명도를 100%로 복원할 수 있습니다. 닫기 버튼은 기본적으로 트레이 보관이며, 트레이 메뉴나 설정에서 완전히 종료할 수 있습니다.

보유 기록은 이 PC에만 저장되며 모바일 계정과 자동 동기화되지 않습니다. 초기 설치 파일은 코드 서명이 없습니다. 투자 참고 정보이며 수익을 보장하지 않습니다.

## 전체 소스

[QLD-1.0.0+1-PC-Source.zip](./QLD-1.0.0%2B1-PC-Source.zip)에 PC 소스, 디자인, 종목 설정, 테스트와 개발 안내가 들어 있습니다. 압축을 푼 후 `desktop/README.md`를 참고하세요.

```text
cd desktop
npm ci
npm test
npm start
npm run dist
```

이 저장소의 루트 파일은 PC 다운로드 홈페이지입니다. 전체 앱 소스는 위 소스 ZIP에서 확인할 수 있습니다.
