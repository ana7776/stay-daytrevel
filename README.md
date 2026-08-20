# stay.daytrevel.com

Daytrevel 하위도메인으로 운영하는 숙소·여행지 정보 사이트입니다.
메인 도메인 `daytrevel.com`의 하위도메인으로 붙여 애드센스 광고를 노출하는 것을 목표로 합니다.

## Stack

- Astro static site
- MDX content
- Cloudflare Pages 배포

## Commands

```bash
npm install
npm run dev
npm run build
```

## 콘텐츠 구조

| 컬렉션 | 경로 | 라우트 |
| --- | --- | --- |
| stays | `src/content/stays/*.mdx` | `/stays/{slug}/` |
| travel | `src/content/travel/*.mdx` | `/travel/{slug}/` |

프론트매터 필수 항목은 `src/content.config.ts`에 정의되어 있습니다.
`stays`는 `title, description, keyword, pubDate, city, country`,
`travel`은 여기에 `season`(선택)이 추가됩니다.
`faq` 항목을 채우면 상세 페이지에 FAQPage 구조화 데이터가 자동으로 들어갑니다.

## Environment Variables

로컬에서는 `cp .env.example .env` 후 값을 채웁니다. 실제 키는 저장소에 올리지 않습니다.

| 변수 | 용도 |
| --- | --- |
| `KTO_API_KEY` | 한국관광공사 API |
| `PEXELS_API_KEY` | Pexels 이미지 API |
| `PIXABAY_API_KEY` | Pixabay 이미지 API |
| `PUBLIC_ADSENSE_CLIENT` | 애드센스 게시자 ID (`ca-pub-...`) |

`PUBLIC_ADSENSE_CLIENT`는 빌드 시 값이 있을 때만 애드센스 스크립트를 페이지에 넣습니다.
값이 비어 있으면 광고 스크립트가 아예 출력되지 않으므로, 로컬 개발에서는 설정하지 않아도 됩니다.

## Deployment (Cloudflare Pages)

1. Cloudflare 대시보드 → Workers & Pages → Create → Pages → 이 저장소 연결
2. 빌드 설정
   - Project name: `stay-daytrevel`
   - Production branch: `main`
   - Build command: `npm run build`
   - Build output directory: `dist`
3. Settings → Variables and Secrets에 `PUBLIC_ADSENSE_CLIENT` 추가 (Production)
4. 변수 추가 후에는 광고 스크립트가 들어가도록 재배포(Retry deployment)

## 하위도메인 연결

1. Pages 프로젝트 → Custom domains → Set up a custom domain → `stay.daytrevel.com`
2. `daytrevel.com`이 Cloudflare DNS를 쓰는 경우 CNAME 레코드가 자동으로 생성됩니다.
   외부 DNS를 쓴다면 `stay` → `<project>.pages.dev` CNAME을 직접 추가합니다.
3. 인증서 발급까지 보통 수 분 걸리며, 발급 후 `https://stay.daytrevel.com`으로 접속됩니다.

## 애드센스

- 메인 도메인 `daytrevel.com`이 승인된 상태면 하위도메인도 같은 계정 사이트로 취급됩니다.
- `ads.txt`는 루트 도메인(`daytrevel.com/ads.txt`) 기준으로 확인되므로 이 저장소에는 두지 않습니다.
  하위도메인에 내용이 다른 `ads.txt`를 두면 오히려 판매자 인증에 문제가 될 수 있습니다.
- 광고 코드는 `PUBLIC_ADSENSE_CLIENT` 하나로 자동 광고(Auto ads) 스크립트만 넣는 구조입니다.
  개별 광고 단위를 쓰려면 `src/layouts/BaseLayout.astro`에 삽입 위치를 추가합니다.
- 배포 후 Search Console에 `https://stay.daytrevel.com` 속성을 등록하고
  `sitemap-index.xml`을 제출하면 색인이 빨라집니다.
