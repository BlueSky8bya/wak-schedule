# 우왁굳 일정표 파스텔 컬러 시스템 리서치

> 작성일: 2026-08-26  
> 성격: **색상 감사 + 디자인 제안서. 코드 변경 없음.**  
> 대상: 공개 포스터, 편집실, 인증/오프라인, 인사이트, 상태·피드백 색상  
> 명시적 제외: **태그 필터 내부의 태그별 색상과 동적 스와치**, 태그 팔레트 DB/샘플 데이터

---

## 0. 한 줄 결론

현재 화면이 칙칙한 가장 큰 이유는 색이 적어서가 아니라, **베이지·올리브 바탕 위에 보라·금색·연두·핑크 등 서로 다른 시기의 색 문법이 겹쳐 있기 때문**이다.

추천 방향은 **“왁물원 피크닉(Wakmu Garden Picnic)”**이다.

- 하늘색을 유일한 기본 상호작용 색으로 쓴다.
- 잎빛 초록은 브랜드와 성공 상태에 쓴다.
- 햇빛 노랑은 오늘·기대·보상 순간에만 쓴다.
- 코랄은 LIVE·오류·삭제처럼 즉시 주의가 필요한 곳에 쓴다.
- 핑크는 하트에만, 라벤더는 떡밥·인사이트처럼 상상/발견의 영역에만 쓴다.
- 화면의 70~80%는 차가운 백색·아주 옅은 하늘색 표면으로 남긴다.

즉 “파스텔”은 모든 카드를 알록달록 칠하는 방식이 아니라, **맑은 중립 표면 아래에 하늘·잎·라벤더 빛이 은은히 비치고, 실제 행동 지점에서만 색이 통통 튀는 방식**이어야 한다. 이것이 이 사이트에 가장 잘 맞는 애플식 감성이다.

---

## 1. 조사 범위와 방법

### 포함한 것

- `app/globals.css`의 전역 색 토큰과 전역 상태 UI
- `components/poster/public-poster.css`의 공개 포스터/모바일 아젠다/상세 팝오버/하트/LIVE/떡밥 색
- `components/studio/studio-shell.css`의 편집실 셸/캘린더/편집기/모달/상태 색
- `components/studio/insights.css`의 인사이트 카드·차트·추세·오버레이 색
- `components/skeleton/calendar-skeleton.css`의 토큰 상속 여부
- TSX/JS 안의 SVG, 파티클, 인라인 stroke/fill, PWA 오프라인 HTML 색
- 구글 로그인 로고처럼 외부 브랜드 규칙 때문에 보존해야 하는 색
- 현재 Accepted ADR과 디자인 토큰 규칙

### 제외한 것

- `components/tags/**`, `lib/tags/**`
- 태그 필터 버튼의 동적 `backgroundColor`, `borderColor`, `bgHex`, `colorKey`
- 이벤트 카드가 태그 색을 받아 그리는 `eventColorStyle()` 계열
- `db/seeds/**`의 태그 팔레트와 `lib/schedules/sample-public-data.ts`의 태그 샘플 색
- 태그 대비 계산을 위한 `lib/calendar/month.ts`의 동적 잉크 선택 로직

태그 필터의 **안쪽 색상은 그대로 둔다**. 다만 태그 필터를 둘러싼 공용 카드 표면·테두리·제목색이 다른 화면과 공유되는 경우에는 전역 표면 시스템의 일부로 본다.

### 조사 한계

- 런타임 CSS/TSX 전체를 정적 조사했다.
- 배포 화면을 브라우저로 직접 캡처하려 했으나 이번 실행 환경에는 연결 가능한 브라우저가 없었다. 따라서 이 문서는 픽셀 비교 보고서가 아니라 **실제 소스와 디자인 원칙을 기반으로 한 색상 시스템 감사**다.
- CSS 리터럴 집계에는 현재 렌더되지 않을 수 있는 오래된 테마/꾸미기 선택자도 포함된다. 따라서 집계값은 “현재 보이는 색의 수”가 아니라 “런타임 스타일시트가 소유한 색상 부채의 상한”이다.

---

## 2. 외부 레퍼런스에서 가져올 근거

### 2-1. Apple: 색은 많게가 아니라 일관되게

Apple HIG의 핵심은 다음과 같다.

1. 같은 색에 여러 의미를 주지 말고, 상태와 상호작용 의미를 일관되게 유지한다.
2. 여러 컨트롤에 각각 배경색을 넣지 말고, 중요한 행동 하나에만 틴트를 준다.
3. 색이 풍부한 콘텐츠 위의 툴바·탭바는 오히려 단색에 가깝게 유지한다.
4. 재질(material)은 장식 색이 아니라 전경/배경의 깊이와 위계를 만드는 수단이다.
5. 작은 텍스트에는 연한 파스텔 원색을 직접 쓰지 않고 충분한 대비의 짙은 짝을 쓴다.

출처:

- [Apple HIG — Color](https://developer.apple.com/design/human-interface-guidelines/color)
- [Apple HIG — Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Apple HIG — Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility/)

이 원칙을 이 프로젝트에 번역하면 **“표면은 맑고 조용하게, 상태와 행동만 선명하게”**가 된다. 현재처럼 초록 배경, 보라 선택, 금색 CTA, 갈색 텍스트가 한 화면에서 동시에 주도권을 가지면 애플식이 아니라 서로 다른 테마가 충돌하는 화면이 된다.

### 2-2. SOOP: 블루와 에너지 그린을 둘 다 사용할 근거가 있다

SOOP의 공식 ESG 보고서는 다음을 명시한다.

- 국내 SOOP CI는 기존 아프리카TV의 **블루**를 계승하고 화이트를 결합한다.
- 글로벌 SOOP 마크는 자연에서 영감을 받은 **에너지 그린**을 쓴다.
- 브랜드 의미는 스트리머와 유저가 더 넓은 세계와 연결되어 소통하는 것이다.

출처: [SOOP ESG Report 2023, p.19(PDF 페이지 표기상 18~19)](https://corp.sooplive.co.kr/download/SOOP_ESGReport_2023.pdf)

따라서 “SOOP이니까 무조건 초록”보다, **블루를 인터랙션·연결의 주색으로, 그린을 생태계·성공·브랜드 보조색으로 쓰는 이중 구조**가 공식 정체성과 더 잘 맞는다.

### 2-3. 왁물원: 하나의 고정 HEX보다 ‘하늘·잔디·놀이공원’ 장면이 중요하다

왁물원 로고와 여러 시기의 카페 메인은 계절 배너가 바뀌는 콘텐츠 중심 공간이다. 안정적으로 반복되는 시각 모티프는 다음과 같다.

- 밝은 하늘색
- 잔디/숲의 초록
- 나무 울타리 계열의 따뜻한 색
- `W`·헤드셋에 쓰이는 빨강
- 흑백의 굵은 제목
- 동물 캐릭터가 주는 유쾌함

참고:

- [왁물원 네이버 카페](https://cafe.naver.com/steamindiegame)
- [왁물원 메인 아카이브](https://archive.md/XpvTR)
- [왁물원 로고 시각 참고](https://librewiki.net/wiki/%EC%99%81%EB%AC%BC%EC%9B%90)

이것은 공식 컬러 가이드가 아니므로 특정 픽셀을 “우왁굳 공식색”이라고 단정하면 안 된다. 대신 **하늘·잔디·햇빛·빨간 포인트라는 장면 언어**를 제품 팔레트로 재해석하는 근거로만 사용한다.

### 2-4. 접근성: 파스텔은 배경, 짙은 짝은 글자

WCAG 2.2 AA는 일반 텍스트 4.5:1, 큰 텍스트 3:1 이상을 요구한다. 또한 상태를 색 하나로만 전달하면 안 된다.

- [W3C — Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [W3C — Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color)

이 문서의 팔레트는 “파스텔 자체를 작은 글자색으로 쓰는” 안이 아니다. 각 파스텔마다 `strong`과 `on-*` 짝을 따로 두며, 저장/오류/추세는 아이콘·문구·형태를 함께 사용한다.

---

## 3. 현재 색상 감사

### 3-1. 런타임 색상 소유 파일 전수 목록

태그 모듈과 태그 팔레트를 제외하고 색 리터럴 또는 색 토큰을 소유하는 런타임 파일은 다음과 같다.

| 파일 | 역할 | 조사 결과 |
|---|---|---|
| `app/globals.css` | 전역 토큰, 공용 상태, 인증/오류/월드컵 칩 | 토큰은 있으나 파일 안에도 별도 하드코딩 색이 많음 |
| `components/poster/public-poster.css` | 공개 포스터, 모바일 아젠다, 상세, LIVE, 하트, 떡밥 | 크림/갈색/보라/금색/핑크/초록 계열이 여러 세대에 걸쳐 혼재 |
| `components/studio/studio-shell.css` | 편집실 전체 | 가장 큰 색상 부채. 초기 올리브 팔레트와 후반 시맨틱 토큰 레이어가 동시에 존재 |
| `components/studio/insights.css` | 인사이트 카드·차트·모달 | 아보카도/연두 중심 단색성이 강하고 별도 블루·오렌지·보라가 산재 |
| `components/skeleton/calendar-skeleton.css` | 로딩 스켈레톤 | 색 리터럴 0, 전역 토큰만 사용. 모범 사례 |
| `app/page.tsx` | 구글 로그인 로고 | 구글 4색. 외부 브랜드 자산이라 보존 대상 |
| `components/poster/public-poster.tsx` | 하트 SVG, 축하 파티클, 상세 리더선 | 핑크·노랑·민트·블루·보라·빨강이 인라인 배열/속성으로 존재 |
| `components/studio/studio-shell.tsx` | 드래그/연결 SVG 선 | 보라와 빨강 stroke가 인라인 문자열로 존재 |
| `public/sw.js` | 오프라인 폴백 화면 | 옛 보라 텍스트 + 크림 배경이 HTML 문자열에 고정 |
| `components/poster/public-insights.tsx` | 태그색 fallback | 태그 파생이므로 이번 제안에서 제외 |
| `lib/schedules/insights-actions.ts` | 태그색 fallback | 태그 파생이므로 제외 |
| `lib/schedules/sample-public-data.ts` | 샘플 태그 팔레트 | 태그 팔레트이므로 제외 |
| `lib/calendar/month.ts` | 태그 배경 위 잉크/외곽선 계산 | 태그 파생이므로 제외. 대비 선택 로직은 유지 가치가 높음 |

### 3-2. 하드코딩 규모

CSS 주석을 제거하고 `hex/rgb/rgba/hsl/hsla` 리터럴을 센 결과다.

| 파일 | 색 리터럴 출현 | 고유 리터럴 |
|---|---:|---:|
| `app/globals.css` | 83 | 76 |
| `public-poster.css` | 633 | 389 |
| `studio-shell.css` | 1,136 | 584 |
| `insights.css` | 162 | 105 |
| `calendar-skeleton.css` | 0 | 0 |
| **합계** | **2,014** | **1,021** |

색을 토큰으로 완전히 통제하고 있다는 현재 문서의 의도와 실제 상태 사이에 큰 차이가 있다. 특히 색 리터럴이 들어간 줄만 보아도 `public-poster.css` 554줄, `studio-shell.css` 1,097줄, `insights.css` 144줄이다.

이 숫자를 모두 개별 색으로 바꾸는 것은 잘못된 접근이다. 먼저 **의미별 토큰 수를 25~35개로 고정**하고, 실제 활성 선택자부터 단계적으로 수렴해야 한다.

### 3-3. 지금 화면이 칙칙해지는 직접 원인

#### A. 페이지 바탕이 ‘맑은 파스텔’이 아니라 ‘회색 섞인 올리브 종이’다

- 편집실: `#F7F1DE → #E9EADD`
- 공개 페이지: `#F9F8EC → #EEF0D8`
- 포스터 표면: `#FDFCEF → #F7F5E2`
- 스튜디오 기본 글자: `#314027`

이 조합은 따뜻하고 차분하지만, 노란기와 회색기가 동시에 있어 화면 전체의 생동감을 낮춘다. 태그가 이미 여러 파스텔을 가지므로 배경까지 올리브색이면 색들이 깨끗하게 분리되지 않고 탁해진다.

#### B. 보라가 너무 많은 의미를 맡고 있다

현재 보라는 선택, 포커스, 단축키, 확대, 인사이트, 떡밥, 개발자 상태, 팝오버 등에 두루 쓰인다. `#5B34F0`, `#6B5BD6`, `#7C6CF0`, `#5B4BD0`, `#8B5CF6`처럼 가까운 보라가 여러 개라 통일감도 약하다.

#### C. 초록도 너무 많은 의미를 맡고 있다

배경 정체성, 저장 성공, 공개 상태, 팬 참여, 차트 상승, 인사이트 강조가 모두 초록/연두 계열이다. 특히 `insights.css`는 `#8ED65B`, `#ACF07C`, `#68D11D`, `#405035`, `#708064` 등이 반복되어 “싱그럽다”보다 “아보카도 대시보드”에 가깝게 보일 수 있다.

#### D. 표면마다 백색의 온도가 다르다

`#FFF`, `#FFFFFF`, `#FFFDF6`, `#FDFCEF`, `#FCFDFA`, `#FFF7ED`, `#FBFEF9`가 동시에 쓰인다. 미세한 차이가 개별 화면에서는 보이지 않지만, 나란히 놓이면 카드가 서로 다른 제품에서 온 것처럼 보인다.

#### E. 일부 중요한 색의 대비가 부족하다

현재 대표 토큰의 WCAG 대비비 계산:

| 조합 | 대비비 | 판정/용도 |
|---|---:|---|
| `--ink #1C2433` / `--surface #FFFEF6` | 15.38:1 | 좋음 |
| `--ink-soft #3B4255` / surface | 9.90:1 | 좋음 |
| `--muted #6B7384` / surface | 4.71:1 | AA 통과지만 여유가 작음 |
| `--on-accent #4A3500` / `--accent #FFC83D` | 7.54:1 | 좋음 |
| `--accent-strong #A9760A` / surface | 3.93:1 | 일반 작은 텍스트 실패 |
| white / `--violet #5B34F0` | 6.57:1 | 좋음 |
| `--pink #FF5F8F` / surface | 2.85:1 | 일반 텍스트 실패 |

따라서 핑크와 골드는 큰 아이콘/배경/테두리에는 쓸 수 있지만, 현재 값 그대로 작은 글자에 쓰면 안 된다.

#### F. 제거된 기능의 색 CSS가 여전히 팔레트 감사를 흐린다

Accepted ADR-0003은 달력 테마·꾸미기 UI를 제거한다고 결정했지만, `public-poster.css`에는 사쿠라/여름/가을/겨울/월드컵/선셋/민트/도트/별/콘페티 테마와 꾸미기 팔레트 선택자가 남아 있다. 로더는 현재 `posterTheme: "none"`을 주지만 데이터 타입과 조건부 CSS는 존재한다.

이 영역은 새 팔레트로 정성스럽게 다시 칠할 대상이 아니다. 구현 단계에서 실제 참조 여부를 확인한 뒤 **별도 정리 작업으로 제거하거나 명시적 보관**해야 한다.

### 3-4. 현재 잘하고 있는 부분

- 기본 잉크/표면 대비는 충분하다.
- 밝은 태그 배경 위에서 먹색/흰색 중 더 높은 대비를 고르는 `lib/calendar/month.ts` 로직은 합리적이다.
- `calendar-skeleton.css`는 색 리터럴 없이 토큰만 사용한다.
- 저장 성공/진행/실패에 텍스트와 점을 함께 사용하고 있어 색만으로 상태를 전달하지 않는다.
- `--glass`, `--material-bg`, `--material-blur`가 이미 있어 애플식 재질로 이동할 기반이 있다.
- 하트, 떡밥 공개, 축하 파티클처럼 감정이 필요한 순간이 코드상 분리되어 있어 색의 역할을 명확히 매핑하기 쉽다.

---

## 4. 추천 컨셉: “왁물원 피크닉”

### 이미지 문장

> 맑은 초여름 하늘 아래, 밝은 잔디와 햇빛이 비치는 왁물원. 일정 카드는 투명한 흰 유리판처럼 떠 있고, 하트와 LIVE, 오늘과 떡밥만 캐릭터처럼 튀어나온다.

### 이 컨셉이 맞는 이유

- 왁물원 로고의 하늘·잔디·동물·놀이공원 정서와 연결된다.
- SOOP 국내 블루와 글로벌 에너지 그린을 동시에 존중한다.
- 현재 올리브/크림보다 훨씬 맑고 현대적이다.
- 태그의 여러 파스텔을 방해하지 않는 차가운 중립 표면을 제공한다.
- Apple HIG처럼 상호작용 색 한 가지를 중심으로 잡고, 나머지 색은 의미별 순간에만 제한할 수 있다.

---

## 5. 제안 팔레트

### 5-1. 중립/표면

| 역할 | 제안값 | 사용 |
|---|---|---|
| Ink | `#253047` | 제목, 본문 기본. 순검정보다 부드러운 네이비 먹색 |
| Ink Soft | `#46566F` | 보조 본문, 라벨 |
| Muted | `#68778D` | 캡션, 비활성 설명. 백색 위 4.52:1 |
| Paper | `#F5F9FF` | 페이지 기본 바탕 |
| Surface | `#FFFEFD` | 카드, 모달, 캘린더 표면 |
| Surface 2 | `#EFF5FC` | 입력/세그먼트/중첩 표면 |
| Workbench | `#E8EFF7` | 편집실 캔버스/작업대 |
| Line | `#DBE6F2` | 조용한 구분선 |
| Line Soft | `#EDF2F7` | 내부 hairline |
| Shadow ink | `rgb(38 61 93 / 8%)` | 기본 그림자. 검정/올리브 대신 푸른 회색 |

중립색에 노란기 대신 아주 약한 파란기를 넣는다. 이 한 변화가 현재의 “낡은 종이” 인상을 “맑은 앱” 인상으로 바꾸는 가장 큰 레버다.

### 5-2. 브랜드/감정색

각 색은 `pastel(넓은 면) / soft(옅은 배경) / strong(텍스트·선) / on(파스텔 위 글자)` 네 역할을 가진다.

| 계열 | Pastel | Soft | Strong | On pastel | 의미 |
|---|---|---|---|---|---|
| Sky | `#76ADFF` | `#EAF3FF` | `#2F69C9` | `#102F5C` | 기본 상호작용, 링크, 선택, 포커스, 정보 |
| Leaf | `#82C965` | `#ECF9E8` | `#347625` | `#16330F` | 브랜드 생태계, 저장 성공, 공개/연결 |
| Sun | `#FFD66B` | `#FFF5CC` | `#8A5A00` | `#463300` | 오늘, 기대, 대기, 보상 |
| Coral | `#FF8588` | `#FFE9EA` | `#A83A47` | `#4C1720` | LIVE, 오류, 삭제, 즉시 주의 |
| Heart Pink | `#FF86AD` | `#FFEAF2` | `#A93863` | `#50172D` | 하트, 관심, 팬 반응만 |
| Dream Violet | `#AA9AF5` | `#F0EDFF` | `#5B4BC4` | `#271D61` | 떡밥, 기대돼요, 인사이트/발견 |

### 5-3. 검증된 대표 대비

| 글자 / 배경 | 대비비 |
|---|---:|
| Ink / Surface | 13.09:1 |
| Ink Soft / Surface | 7.39:1 |
| Muted / Surface | 4.52:1 |
| Sky On / Sky Pastel | 5.81:1 |
| Sky Strong / Surface | 5.23:1 |
| Leaf On / Leaf Pastel | 6.93:1 |
| Leaf Strong / Surface | 5.54:1 |
| Sun On / Sun Pastel | 8.70:1 |
| Sun Strong / Surface | 5.88:1 |
| Coral On / Coral Pastel | 6.18:1 |
| Coral Strong / Surface | 6.20:1 |
| Heart On / Heart Pastel | 6.17:1 |
| Heart Strong / Surface | 6.07:1 |
| Violet On / Violet Pastel | 6.03:1 |
| Violet Strong / Surface | 6.42:1 |

중요: `Pastel`은 배경/큰 채움용이고, 흰 글자를 얹는 색이 아니다. 파스텔 버튼에는 표의 `On pastel`을, 백색 카드 위 작은 색 글자에는 `Strong`을 쓴다.

### 5-4. 향후 토큰 구조 예시

아래는 구현 코드가 아니라, 값과 의미를 합의하기 위한 제안 구조다.

```css
:root {
  --ink: #253047;
  --ink-soft: #46566f;
  --muted: #68778d;
  --paper: #f5f9ff;
  --surface: #fffefd;
  --surface-2: #eff5fc;
  --studio-workbench: #e8eff7;
  --line: #dbe6f2;
  --line-soft: #edf2f7;

  --sky: #76adff;
  --sky-soft: #eaf3ff;
  --sky-strong: #2f69c9;
  --on-sky: #102f5c;

  --leaf: #82c965;
  --leaf-soft: #ecf9e8;
  --leaf-strong: #347625;
  --on-leaf: #16330f;

  --sun: #ffd66b;
  --sun-soft: #fff5cc;
  --sun-strong: #8a5a00;
  --on-sun: #463300;

  --coral: #ff8588;
  --coral-soft: #ffe9ea;
  --coral-strong: #a83a47;
  --on-coral: #4c1720;

  --heart: #ff86ad;
  --heart-soft: #ffeaf2;
  --heart-strong: #a93863;
  --on-heart: #50172d;

  --dream: #aa9af5;
  --dream-soft: #f0edff;
  --dream-strong: #5b4bc4;
  --on-dream: #271d61;

  --interactive: var(--sky-strong);
  --interactive-fill: var(--sky-soft);
  --focus-ring: var(--sky-strong);
  --selection-border: var(--sky-strong);
  --selection-fill: var(--sky-soft);

  --status-success: var(--leaf-strong);
  --status-success-fill: var(--leaf-soft);
  --status-warning: var(--sun-strong);
  --status-warning-fill: var(--sun-soft);
  --status-danger: var(--coral-strong);
  --status-danger-fill: var(--coral-soft);
}
```

기존 `--accent`, `--green`, `--violet`, `--pink` 값을 한 번에 갈아끼우면 안 된다. 지금 각 토큰이 너무 많은 의미를 공유하므로, **먼저 의미 토큰으로 분리한 뒤 화면별로 이동**해야 한다.

---

## 6. 화면별 사용 설계

### 6-1. 전역 페이지 바탕

추천:

- 기본 선형 그라데이션: `#F8FBFF → #F2F7FC`
- 왼쪽 위 하늘 glow: `#E5F1FF`
- 오른쪽 위 잎 glow: `#EAF8E5`
- 아주 작은 라벤더 glow: `#F1EDFF`
- glow 불투명도는 낮게 하고 카드 아래에서만 느껴지게 한다.

제거할 인상:

- 전체를 덮는 베이지/카키
- 노랑과 초록이 섞여 회색처럼 보이는 배경
- 페이지와 카드가 모두 크림이라 깊이가 사라지는 구조

### 6-2. 카드와 재질

- 기본 카드는 `Surface #FFFEFD`.
- 중첩 입력/세그먼트는 `Surface 2 #EFF5FC`.
- 팝오버·모달·상단바는 백색 76~86% + blur + 약한 하늘색 border.
- 카드마다 핑크/초록/보라 배경을 주지 않는다.
- 색이 필요한 카드는 전체를 칠하지 말고 상단 2~4px bar, 아이콘 배경, 작은 badge, 아주 옅은 6~10% wash 중 하나만 사용한다.
- 그림자는 검정이나 갈색이 아니라 푸른 네이비의 낮은 알파를 쓴다.

이렇게 해야 태그 카드의 고유색이 살아 있고, 화면 전체는 Apple Reminders/Weather처럼 맑은 층을 가진다.

### 6-3. 공개 포스터

| 대상 | 제안 |
|---|---|
| 페이지/포스터 바탕 | 올리브 크림을 Paper/Surface로 교체, 가장자리만 sky/leaf glow |
| 포스터 제목 | Ink. 장식 별은 Sun 또는 아주 옅은 Coral 1종만 |
| 월 이동/기본 버튼 | Sky Strong 아이콘 + Sky Soft hover/selected |
| 오늘 칸 | Sun Soft 배경 + Sun Strong 링/텍스트. 현재 금색 의미는 유지하되 더 맑게 |
| 평일/빈 날짜칸 | Surface/Surface 2, cool line |
| 일요일/공휴일 | Coral Strong |
| 토요일 | Sky Strong |
| 하트 비활성 | `#AAB6C5` 중립 회색 |
| 하트 활성/토스트 | Heart Pink/Strong. 삭제·오류에는 절대 핑크를 쓰지 않음 |
| 인기도 불꽃 | Sun → Coral의 짧은 그라데이션. 평소에는 강도를 낮추고 등급 상승 순간에만 선명 |
| LIVE | Coral Pastel + Coral On/Strong + 점/`LIVE` 텍스트. 색만으로 전달하지 않음 |
| VOD/다시보기 | Sky Soft + Sky Strong |
| 떡밥/기대돼요 | Dream Soft + Dream Strong. 선택 포커스 색과 분리 |
| 축하 파티클 | Sky/Leaf/Sun/Coral/Heart/Dream 6색만 사용해 현재 임의 배열을 시스템화 |
| 일정 상세 팝오버 | 현재 갈색/카키를 Surface + Sky interactive로 전환. 태그 accent 선은 제외 범위대로 유지 |
| 월드컵 일반 | Leaf Soft/Strong |
| 한국 경기 | Coral Soft/Strong + 국기/문구 |
| 결승 | Sun Soft/Strong |
| 태그 필터 내부 | **변경 제안 없음**. 동적 태그색 유지 |

### 6-4. 편집실

| 대상 | 제안 |
|---|---|
| 작업대 | Workbench/Paper의 차가운 블루 그레이. 현재 베이지-올리브 제거 |
| 상단바 | 강한 백색 glass, cool line, 네이비 그림자 |
| 기본 선택/포커스 | 전부 Sky Strong/Sky Soft로 통일 |
| 월 이동/단축키/확대 | 모두 Sky 계열. 현재 여러 보라를 제거 |
| 저장됨 | Leaf Soft + Leaf Strong + 체크/점 |
| 저장 중 | Sun Soft + Sun Strong + 회전/점 |
| 저장 실패 | Coral Soft + Coral Strong + 오류 아이콘 |
| 새 일정 작성 중 | Sky 또는 Leaf 중 하나만. 추천은 Sky 선택 링 + `새 일정` 텍스트 |
| 위험 버튼/삭제 | Coral Strong. Heart Pink와 완전히 분리 |
| 역할 배지 | 관리자 Sky, 개발자 Dream, 뷰어 중립 gray. 텍스트를 함께 유지 |
| 편집 패널/모달 | Surface, 내부 그룹 Surface 2, focus Sky |
| 메모 | Sun Soft를 4~6% 정도만 섞은 따뜻한 메모지. 갈색 본문 대신 Ink |
| 태그 관리/필터 | 태그별 색은 제외. 모달/입력의 공용 chrome만 Surface/Sky 적용 |

### 6-5. 인사이트

현재의 아보카도 단색 팔레트를 다음처럼 분해한다.

| 의미 | 색 |
|---|---|
| 일정 수/기본 데이터 | Sky |
| 성공/완료/공개 | Leaf |
| 기대/대기/오늘 가까움 | Sun |
| 하트/팬 반응 | Heart Pink |
| 발견/떡밥/특이값 | Dream Violet |
| 오류/감소/위험 | Coral |

권장 카드 문법:

- 모든 카드 배경은 Surface.
- 계열색은 아이콘 원, 작은 상단 bar, 숫자 일부에만 쓴다.
- 차트는 6색을 무작위로 쓰지 않고 의미가 같은 계열은 항상 같은 색을 쓴다.
- 상승/하락은 일반 서비스 맥락에 맞춰 `Leaf + ▲` / `Coral + ▼`로 바꾼다. 현재 주식식 빨강 상승/파랑 하락은 이 서비스의 의미 체계와 맞지 않는다.
- 동률은 Muted + `—`.
- 오버레이는 `rgb(23 35 55 / 42%)`처럼 네이비 기반으로 통일한다.

### 6-6. 인증, 오류, 오프라인/PWA

- 로그인 카드: Surface glass + Sky primary action.
- 구글 `G` 4색은 외부 브랜드 자산이므로 **재색칠하지 않는다**.
- 인증 오류: Coral Soft/Strong.
- 인앱 브라우저 안내: Sky Soft/Strong.
- 오프라인 폴백: Paper 배경 + Dream 달 아이콘 + Ink 본문 + Muted 설명.
- 향후 manifest/theme color를 추가한다면 기본은 `#F5F9FF`, 브라우저 상단 tint는 `#76ADFF` 후보가 적합하다.

### 6-7. 스켈레톤

현재처럼 리터럴 없이 토큰을 상속한다. 추천 shimmer는 `Surface 2 → #F8FBFF → Surface 2`; 과도한 회색 대비 없이 1회 이동이 느껴질 정도만 사용한다.

---

## 7. 애플식으로 보이게 만드는 색 사용 규칙

### 규칙 1. 한 화면의 주도색은 Sky 하나

한 화면에서 Leaf, Sun, Coral, Pink, Violet이 동시에 버튼 배경으로 경쟁하면 안 된다. 기본 버튼/링크/선택/포커스는 Sky 하나로 고정한다. 나머지는 상태가 실제로 발생했을 때만 등장한다.

### 규칙 2. 파스텔은 큰 면, Strong은 작은 글자

- 큰 카드 wash: Soft
- 채워진 주요 버튼: Pastel + On pastel
- 백색 위 작은 링크/라벨: Strong
- 흰 글자 + 파스텔 배경: 금지

### 규칙 3. 표면 70~80 / 옅은 틴트 15~20 / 강한 색 5~10

이 비율은 표준이 아니라 이 프로젝트를 위한 운영 규칙이다. 일정 카드 자체에 이미 태그색이 많으므로, 공용 chrome이 소비할 수 있는 강한 색 예산은 일반 앱보다 더 작아야 한다.

### 규칙 4. 색마다 의미 하나

- Sky = 누를 수 있음/선택됨/정보
- Leaf = 정상/저장됨/공개/연결
- Sun = 오늘/기대/대기/보상
- Coral = LIVE/오류/삭제/즉시 주의
- Pink = 하트/팬심
- Violet = 떡밥/발견/인사이트

### 규칙 5. 상태는 색 + 형태 + 문구

- 성공: 초록 점만이 아니라 `✓ 저장됨`
- 실패: 빨강만이 아니라 `! 저장 실패`
- 상승/하락: 색과 `▲/▼`
- LIVE: 코랄 점과 `LIVE`
- 오늘: 노란 링과 `오늘`/날짜 강조

### 규칙 6. 같은 깊이는 같은 표면색

동일 위계의 카드가 `#FFF`, `#FFFDF6`, `#FCFDFA`로 갈라지지 않게 한다.

- page = Paper
- workbench = Workbench
- card/modal = Surface
- nested/input = Surface 2
- selected = 해당 Surface + Sky Soft

### 규칙 7. 유리는 떠 있는 chrome에만

상단바, 팝오버, 모달, 모바일 바텀시트처럼 “떠 있는 것”에만 glass/material을 쓴다. 포스터 export surface 안에는 기존 프로젝트 규칙대로 blur 재질을 넣지 않는다.

---

## 8. 피해야 할 안

1. **전역 토큰 값만 한 번에 교체하기**  
   현재 `--violet`, `--green`, `--accent`의 의미가 너무 넓어 예상하지 못한 화면까지 함께 변한다.

2. **모든 카드를 파스텔로 칠하기**  
   태그 카드와 경쟁하고 Apple HIG의 “여러 컨트롤 배경색 남발 금지” 원칙에도 어긋난다.

3. **SOOP=숲이므로 전체를 초록으로 만들기**  
   이미 현재 화면이 이 문제를 겪고 있다. 공식 국내 CI는 블루/화이트이고 글로벌 CI만 에너지 그린이다.

4. **왁물원 로고의 나무 갈색을 공용 본문색으로 쓰기**  
   로고 장면에는 맞지만 제품 UI 전체를 다시 크림/갈색으로 되돌린다. 나무색은 필요하면 일러스트/기념일 장식의 극소량 포인트로만 쓴다.

5. **핑크를 오류와 하트에 같이 쓰기**  
   핑크는 팬 반응 전용으로 보호한다. 오류/삭제는 Coral Strong.

6. **태그색까지 한 팔레트로 강제하기**  
   이번 범위 밖이며 일정 구분이라는 별도 목적이 있다.

7. **구글 로고를 사이트 팔레트로 재색칠하기**  
   외부 브랜드 자산은 예외다.

8. **삭제된 테마/꾸미기 CSS를 새 팔레트로 다시 칠하기**  
   ADR-0003과 충돌할 수 있다. 먼저 활성 여부를 정리한다.

---

## 9. 향후 구현 순서 제안

이 문서는 구현하지 않지만, 실제 적용 시에는 다음 순서가 안전하다.

### P0. 의미 분리

- `--interactive`, `--today`, `--heart`, `--live`, `--teaser` 등 의미 토큰 추가
- 기존 `--accent/--violet/--green/--pink` 소비처를 의미별로 분류
- 태그 파생 색 경로에 손대지 않도록 테스트 경계 확정

### P1. 가장 큰 체감: 바탕과 표면

- `Paper/Surface/Surface 2/Workbench/Line/Ink/Shadow` 적용
- 공개/편집실의 올리브·베이지 그라데이션 제거
- 상단바/팝오버 material 통일

이 단계만으로도 화면의 칙칙함이 크게 줄어든다.

### P2. 기본 상호작용을 Sky로 통일

- 버튼, 링크, 포커스, 선택, 월 이동, 세그먼트
- 현재 보라 계열 다섯 가지 이상을 Sky 계열로 수렴

### P3. 감정/상태색 분리

- Leaf 저장 성공
- Sun 오늘/대기
- Coral LIVE/오류/삭제
- Heart Pink 하트
- Dream Violet 떡밥/인사이트

### P4. 인사이트와 인라인 색

- `insights.css`의 아보카도 단색 해소
- TSX의 파티클 배열, SVG fill/stroke, 상세 리더선 토큰화
- `public/sw.js` 오프라인 HTML 동기화

### P5. 부채 정리

- ADR-0003 기준으로 테마/꾸미기 선택자 실제 참조 확인
- 미사용이면 별도 변경으로 제거
- 색 리터럴 감사 스크립트에 “허용된 외부 브랜드 색” allowlist 추가

---

## 10. 구현 시 검증 기준

### 정적

- 새 컴포넌트 색 리터럴 0개. 모든 신규 색은 `app/globals.css :root` 토큰 사용.
- 예외 allowlist: 구글 로고, 태그 동적 색, 이미지/SVG 브랜드 자산.
- 일반 작은 텍스트 4.5:1 이상.
- 포커스 링과 주요 컨트롤 경계 3:1 이상을 목표.
- 상태가 색 하나로만 전달되지 않는지 확인.

### 화면

- 공개 웹/모바일
- 편집실 웹/모바일
- 로그인/오류/오프라인
- 일정이 없는 달/많은 달
- 하트 전/후, LIVE, 오늘, 떡밥, 저장 중/성공/실패
- 밝은 실내와 어두운 실내, 화면 밝기 낮음/높음
- 태그 필터 색이 새 공용 배경 위에서도 구별되는지 확인하되 태그색 자체는 변경하지 않음

### 프로젝트 게이트

실제 코드 적용 작업에서는 저장소 규칙대로 아래 명령이 모두 exit 0이어야 한다.

```text
npm run typecheck
npm run lint
npm test
npm run build
```

그리고 공개 포스터의 고정 폭/scale 기반 export geometry를 바꾸지 않아야 한다.

---

## 11. 최종 추천안 요약

### 선택할 것

- 컨셉: **왁물원 피크닉**
- 기본 상호작용: **Sky Blue**
- 브랜드/성공: **Leaf Green**
- 오늘/보상: **Sun Yellow**
- LIVE/오류/삭제: **Coral**
- 하트: **Heart Pink**
- 떡밥/발견: **Dream Violet**
- 바탕: **Cool Cloud White/Blue**, 카드: **Warm-neutral White Glass**

### 버릴 것

- 페이지 전체를 덮는 베이지/올리브
- 여러 보라·초록의 미세 변종
- 모든 카드에 서로 다른 파스텔 배경
- 백색 위의 연한 핑크/골드 작은 글자
- 하나의 `--accent`가 오늘·CTA·선택·상태를 모두 맡는 구조

이 방식이면 사이트는 현재의 “차분하지만 탁한 종이 달력”에서 **“맑은 하늘 아래 떠 있는 팬 커뮤니티 캘린더”**로 바뀐다. 우왁굳/왁물원의 유쾌함은 살리고, SOOP의 블루·그린 정체성과 애플식 절제·재질·접근성도 함께 가져갈 수 있다.

---

## 12. 참고한 내부 문서

- `app/globals.css`
- `components/poster/public-poster.css`
- `components/studio/studio-shell.css`
- `components/studio/insights.css`
- `docs/ux/apple-hci-benchmark-report.md`
- `docs/agent/decisions/ADR-0003-no-decoration.md`
- `.claude/rules/export.md`
- `agent-harness.yaml`의 `BR-DESIGN-001`

