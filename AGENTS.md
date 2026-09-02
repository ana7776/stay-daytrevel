# Stay Daytrevel — 작업 규칙

Astro 정적 사이트. 한국어 여행 정보 콘텐츠를 발행합니다.
이 문서는 사람과 코딩 에이전트(Codex, Claude Code 등)가 공통으로 따르는 규격입니다.

## 저장소 구조

```
src/content/stays/*.mdx   숙소 지역 가이드 (컬렉션: stays)
src/content/spots/*.mdx   여행 정보·가볼만한 곳 (컬렉션: spots)
src/content.config.ts     두 컬렉션의 프론트매터 스키마 (여기가 정답)
src/lib/seo.ts            JSON-LD 헬퍼
src/layouts/Layout.astro  메타태그·canonical·OG·JSON-LD 주입
src/pages/                라우트. 상세는 [slug].astro, 목록은 index.astro
templates/                새 글을 시작할 때 복사해 쓰는 뼈대
scripts/generate-og.mjs   OG 이미지 재생성 (npm run og)
```

## 콘텐츠 추가 절차 (반복 작업)

새 글 한 편을 추가할 때 하는 일은 **파일 하나 만드는 것뿐**입니다.
목록 페이지, 사이트맵, RSS, JSON-LD, canonical은 전부 자동으로 붙습니다.
페이지나 설정 파일은 건드리지 마세요.

1. 컬렉션을 고른다
   - 숙소를 어디에 잡을지 고르는 글 → `src/content/stays/`
   - 가볼만한 곳·산책 코스·관람 정보 → `src/content/spots/`
2. `templates/stay.mdx` 또는 `templates/spot.mdx`를 복사한다.
3. 파일명은 소문자 영문 슬러그, 하이픈 구분. 그대로 URL이 된다.
   예) `osaka-namba-hotel-area.mdx` → `/stays/osaka-namba-hotel-area/`
4. 프론트매터와 본문을 채운다 (아래 규격).
5. `npm run build`로 검증한다. 스키마 위반이면 빌드가 실패한다.

## 프론트매터 규격

`src/content.config.ts`가 강제하는 값입니다. 어기면 빌드가 깨집니다.

| 필드 | stays | spots | 규칙 |
| --- | --- | --- | --- |
| `title` | 필수 | 필수 | `타겟키워드 - 부제` 형태. 부제는 글의 판단 기준을 드러낼 것 |
| `description` | 필수 | 필수 | 한 문장, 80~120자. `~를 정리한 정보성 가이드` / `~ 여행 정보 가이드`로 끝냄 |
| `keyword` | 필수 | 필수 | 검색 타겟 키워드 하나. 제목 앞부분과 일치시킬 것 |
| `pubDate` | 필수 | 필수 | `YYYY-MM-DD`. 작성일 |
| `updatedDate` | 선택 | 선택 | 기존 글을 고칠 때만 추가 |
| `affiliateReady` | 필수 | 없음 | 신규 글은 `false` |
| `faq` | 필수 | 필수 | **4~6개**. 관례상 5개. `q`/`a` 쌍 |

작은따옴표로 감싸고, 값 안에 작은따옴표가 필요하면 `''`로 이스케이프합니다.

## 본문 규격

- 문체는 **평서형(`~이다`, `~하는 편이다`)**. 본문에서 `~습니다`를 쓰지 않습니다.
  FAQ 답변만 예외로 **`~습니다` 존댓말**입니다. 기존 글과 반드시 일치시키세요.
- 분량 4,000~5,500자. `##` 섹션 3개 고정, `#`(h1)은 쓰지 않습니다(제목이 자동 렌더).
  - stays: `## 지역·스팟 특징` / `## 이동 동선·접근성` / `## 숙소 체크리스트`
  - spots: `## 지역·스팟 특징`(또는 `## 코스·구간 특징`) / `## 이동 동선·접근성`(또는 `## 접근성·이동 방법`) / `## 방문 체크리스트`
- 도입부는 소제목 없이 2~4문장. 그 지역/장소가 어떤 일정에 맞는지로 시작합니다.
- 체크리스트는 `| 확인 항목 | 왜 확인해야 하나 |` 2열 표, 5~7행.
- 마지막은 `<p class="note">` 면책 문단으로 닫습니다. 템플릿 문구를 유지하세요.
- FAQ의 `q`는 실제 검색 질문 형태로, `a`는 2~3문장.

## 사실관계 원칙 (중요)

- **가격, 영업시간, 요금, 정확한 소요 시간, 별점, 객실 수는 쓰지 않습니다.** 금방 틀린 정보가 됩니다.
- 대신 "무엇을 확인해야 하는지"를 씁니다. 이 사이트의 가치는 최신 수치가 아니라 판단 기준입니다.
- 확실하지 않은 고유명사(역 이름, 노선명, 시설명)는 쓰지 말고, 아는 범위로 일반화하세요.
- 특정 호텔·숙소를 추천하거나 이름을 나열하지 않습니다. 지역 단위로만 다룹니다.

## 검증

```bash
npm install
npm run build      # 스키마 위반, 링크 깨짐, 빌드 오류를 잡는다
```

빌드가 통과하면 끝입니다. 아래도 자동으로 확인됩니다.
- `dist/sitemap-0.xml`에 새 URL이 포함
- `dist/rss.xml`에 새 항목이 포함
- 상세 페이지에 Article / BreadcrumbList / FAQPage JSON-LD 3종 생성

## 손대지 말 것

콘텐츠 추가 작업에서는 아래를 수정하지 않습니다. 구조 변경이 필요하면 사람에게 물으세요.

- `src/content.config.ts` (스키마)
- `src/layouts/`, `src/components/`, `src/pages/`, `src/lib/`
- `astro.config.mjs`, `package.json`
- `public/robots.txt`, `public/og-default.png`

## 커밋

- 메시지는 한국어. 콘텐츠 추가는 `content: add <제목 요약>` 형식.
- 한 커밋에 글 한 편, 또는 같은 주제 묶음 하나.
