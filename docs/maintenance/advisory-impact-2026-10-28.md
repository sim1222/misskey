# Misskey 公式アドバイザリーの影響確認（2026-10-28）

対象は `v12-mod-maintain` の `d2ff8f6c20574fa3edb65c0465ef91beab109267`。公式一覧の1〜5ページに48件、6ページ目は空で、前回からの追加・消失はなかった。前回未確認だった37件をすべてソースと照合した。アプリ本体・依存・DB・本番環境の変更は行っていない。

| 判定 | 全48件 | 以前未確認の37件 |
| --- | ---: | ---: |
| 影響あり | 18 | 18 |
| 公表された経路には非該当 | 13 | 13 |
| 環境条件による | 2 | 2 |
| 既対応 | 12 | 1 |
| 個別の対応付けが未確定 | 3 | 3 |

「非該当」はそのアドバイザリーの方式への判定であり、その機能全体が安全という意味ではない。特に絵文字インポートとアップロードには、下記の別経路の問題が残る。「既対応」には、以前に修正した11件と、前回の署名パッチが別の署名回避アドバイザリーも塞いでいると確認した1件を含む。

機械可読の全48件の判定・前提・ソース位置・ファイルハッシュは [advisory-impact-2026-10-28.json](advisory-impact-2026-10-28.json)、既存台帳は [misskey-advisories.json](misskey-advisories.json)。固定された版から後でコードを変更した場合は再判定が必要。

## 確認方法と限界

- 公式の未確認37件の本文を再取得し、上流の2026.3.1、2026.5.4、2024.11.0-alpha.3、2025.2.1の差分、個別の修正コミット、公開CVE記録を照合した。版番号だけでは判定しない。
- [調査用スクリプト](../../scripts/security/advisory-impact-probes.mjs)で20件の小さな観測を行った。実ソースから TypeScript AST でメソッド・コールバックを取り出し、DB・認証境界・レート制限・HTTP応答等を検証用の値に置き換えた。ZIPとKoaのアダプターは本体が固定した版の実ライブラリを使う。結果は [probe-results.json](evidence/2026-10-28/probe-results.json)。
- Node は本体指定の24.22.1。スクリプトが通ることは脆弱性修正の成功ではない。未修正の挙動も、意図的に観測・assertする調査用スクリプトであり、通常のCIの安全性ゲートに追加していない。
- 今回、実アプリのビルド・実DB・ブラウザ・複数コンテナの全体試験は再実行していない。前回の233単体テスト・1,612観測・17連合シナリオの成功を、新しい全攻撃経路の安全性の証拠には使わない。
- 本番のコミット・設定・プロキシ・ネイティブライブラリは未確認。このリポジトリにパッチがあっても、稼働中の元v12-modへ適用済みとは扱わない。
- 依存監査全般・OS全般・未公表の脆弱性の発見は今回の範囲外。公開ページの取得証拠とハッシュは [source-snapshots.json](evidence/2026-10-28/source-snapshots.json)、本文は [official-descriptions.json](evidence/2026-10-28/official-descriptions.json) に保存した。

## 影響あり

| アドバイザリー | 判定根拠・成立条件 | ソース |
| --- | --- | --- |
| [GHSA-2m5x-5mp6-6vpq](https://github.com/misskey-dev/misskey/security/advisories/GHSA-2m5x-5mp6-6vpq) — TOTP tokens can be reused | signin は speakeasy.totp.verify の結果だけで成功し、使用済みステップを記録・排他消費しない。同じコードで2回成功する。 **条件:** TOTP 有効アカウントで、攻撃者がパスワードと有効期間内のコードを得た場合。 | [SigninApiService.ts:148](../../packages/backend/src/server/api/SigninApiService.ts#L148) |
| [GHSA-38w6-vx8g-67pp](https://github.com/misskey-dev/misskey/security/advisories/GHSA-38w6-vx8g-67pp) — CSRF vulnerability due to insecure configuration of authentication cookie attributes | Bull 認証用 token Cookie は Secure/SameSite を明示せずクライアントで設定する。/queue の認証は Cookie だけで、Origin・CSRF トークンの検査がない。 **条件:** 管理者またはモデレーターがログインしたブラウザ。成立条件はブラウザの既定 SameSite、同一 site の別オリジン、HTTPS・プロキシ設定にも依存する。クロスサイト攻撃のブラウザ再現は未実施。 | [account.ts:134](../../packages/client/src/account.ts#L134) |
| [GHSA-4x7v-qx8f-g3p8](https://github.com/misskey-dev/misskey/security/advisories/GHSA-4x7v-qx8f-g3p8) — Lack of rate limiting and size restrictions in RSS fetching API | fetch-rss は未認証 GET/POST を許し、meta.limit がない。本文の同期 XML 解析に到達する。ただし共通 getResponse に10MiB上限が既にあり、本文サイズまで無制限ではない。前回の SSRF 防御も有効。 **条件:** 公開された fetch-rss。RSS 取得の連続・並列要求による負荷。 | [fetch-rss.ts:13](../../packages/backend/src/server/api/endpoints/fetch-rss.ts#L13) |
| [GHSA-5c3q-jmv3-r6fx](https://github.com/misskey-dev/misskey/security/advisories/GHSA-5c3q-jmv3-r6fx) — Lack of proper permission checks | notes/reactions は未認証で noteId を直接検索し、ノートの存在・閲覧権を検査しない。serializer はリアクションしたユーザーと種類を返す。 **条件:** 閲覧権のないノートの ID が分かる場合。本文漏えいとは別の交流情報漏えい。 | [reactions.ts:14](../../packages/backend/src/server/api/endpoints/notes/reactions.ts#L14) |
| [GHSA-5h8r-gq97-xv69](https://github.com/misskey-dev/misskey/security/advisories/GHSA-5h8r-gq97-xv69) — Missing validation allows spoofed poll updates | Inbox update は活動の actor 自体だけを照合し、対象 Question の所有者と比較しない。インラインの他人の Question を updateQuestion へ渡し、保存済み投票数を書き換える。 **条件:** 任意のリモート Actor の正当な署名と、保存済みリモート投票の URI。ローカル投票は updateQuestion が拒否。 | [ApInboxService.ts:733](../../packages/backend/src/core/remote/activitypub/ApInboxService.ts#L733) |
| [GHSA-675w-hf2m-qwmj](https://github.com/misskey-dev/misskey/security/advisories/GHSA-675w-hf2m-qwmj) — Missing validation allows spoofed "origin" links | Person と Note の url を getOneApHrefNullable でそのまま保存し、id との同一ホスト・オリジンを確認しない。リモート表示リンクに使用される。 **条件:** 攻撃者が配信する AP オブジェクトの表示・更新。 | [ApPersonService.ts:312](../../packages/backend/src/core/remote/activitypub/models/ApPersonService.ts#L312) |
| [GHSA-6w2c-vf6f-xf26](https://github.com/misskey-dev/misskey/security/advisories/GHSA-6w2c-vf6f-xf26) — Incomplete Patch on CVE-2024-52591 leading to Forgery of Federated Notes | 不完全パッチの前段にある取得先と id/url の権威検査そのものがない。signedGet は最終応答 URL と id を照合せず JSON を返すため、この修正版の厳密な id・要求 URL・最終 URL 照合も満たさない。 **条件:** 攻撃者の AP 文書を取得させる経路、または他ホストへのリダイレクトを利用できる場合。署名/Digest の修正だけでは取得したオブジェクトの権威を保証しない。 | [ApRequestService.ts:181](../../packages/backend/src/core/remote/activitypub/ApRequestService.ts#L181) |
| [GHSA-7pxq-6xx9-xpgm](https://github.com/misskey-dev/misskey/security/advisories/GHSA-7pxq-6xx9-xpgm) — Improper authorization when accessing with third-party application | admin/meta に secure と kind がない。共通 API 認可は宣言された kind のみ検査するため、管理者に発行された permission=[] のアプリトークンが管理設定 executor へ到達する。実 executor は SMTP・ストレージの秘密値を返す。WebSocket の token.permission もチャンネル接続で確認しない。 **条件:** 利用者が第三者アプリを認可した場合。管理者が認可すると特に深刻。 | [meta.ts:12](../../packages/backend/src/server/api/endpoints/admin/meta.ts#L12) |
| [GHSA-g6hj-33h7-6fq8](https://github.com/misskey-dev/misskey/security/advisories/GHSA-g6hj-33h7-6fq8) — Lack of resource ownership validation | following/blocking/muting/user-lists の import API は fileId だけで取得し userId を検査しない。他人のファイル ID から自分の import job を作成できる。上流修正は検索条件への userId 追加。 **条件:** ログイン用の本人トークンと、サイズ制限等を満たす他人の Drive ファイル ID が必要。 | [import-following.ts:62](../../packages/backend/src/server/api/endpoints/i/import-following.ts#L62) |
| [GHSA-gmq6-738q-vjp2](https://github.com/misskey-dev/misskey/security/advisories/GHSA-gmq6-738q-vjp2) — Directory Traversal in AiScript via `Mk:api` | Mk:api の ep は文字列確認だけで rawApi へ渡り、/api/ に ../ を連結できる。URL 正規化で /proxy 等へ出る。要求16件の制限はパス検査ではない。 **条件:** 攻撃者の AiScript を利用者が実行する場合。AiScript 全体に既に与えられた能力との差は個別に評価する。 | [api.ts:38](../../packages/client/src/scripts/aiscript/api.ts#L38) |
| [GHSA-gq5q-c77c-v236](https://github.com/misskey-dev/misskey/security/advisories/GHSA-gq5q-c77c-v236) — Uncontrolled Recursion and Asymmetric Resource Consumption (Amplification) in media/file proxy | MediaProxyServerService は User-Agent が空または Misskey/ を含む要求を拒否せず、そのままダウンロードする。公開アドレス間の再帰は前回の非公開 IP 拒否では防げない。上流のループ防止検査がない。 **条件:** 公開 media proxy。外部プロキシを使う場合はその側も調査が必要。負荷をかける再帰ネットワーク実験は実行していない。 | [MediaProxyServerService.ts:55](../../packages/backend/src/server/MediaProxyServerService.ts#L55) |
| [GHSA-m2gq-69fp-6hv4](https://github.com/misskey-dev/misskey/security/advisories/GHSA-m2gq-69fp-6hv4) — Missing validation allows spoofed profiles and notes | AP の取得結果の最終 URL と id の権威関係を検証しない。Person/Note の初期要求ホスト確認だけでは、リダイレクト後の返答元と主張された id の不一致を防げない。 **条件:** 攻撃者の文書を取得させる経路、または利用可能なリダイレクト。 | [ApRequestService.ts:181](../../packages/backend/src/core/remote/activitypub/ApRequestService.ts#L181) |
| [GHSA-p73x-6qrq-34jc](https://github.com/misskey-dev/misskey/security/advisories/GHSA-p73x-6qrq-34jc) — Cross-site scripting in RSS feed item links | rss と rss-ticker の双方が未検証の item.link を href に渡す。RSS の取得・解析経路もリンクの HTTP(S) 制限をしない。 **条件:** 悪意のある項目を含む RSS を表示しリンクを操作した場合。ブラウザ依存の実行条件は未再現で、確認内容は危険な URL の受入れ経路。 | [rss.vue:9](../../packages/client/src/widgets/rss.vue#L9) |
| [GHSA-pfp5-r48x-fg25](https://github.com/misskey-dev/misskey/security/advisories/GHSA-pfp5-r48x-fg25) — XSS of ActivityPub URI | Actor/Note の url に HTTP(S) の制限がなく、javascript: が保存・リモート表示リンクに流れる。前回のプレビュー用 URL 検査はこのリンクに適用されない。 **条件:** 悪意のある AP プロフィール・投稿を表示しリモート表示を操作した場合。ブラウザでのスクリプト実行の再現は未実施。 | [ApPersonService.ts:312](../../packages/backend/src/core/remote/activitypub/models/ApPersonService.ts#L312) |
| [GHSA-qqrm-9grj-6v32](https://github.com/misskey-dev/misskey/security/advisories/GHSA-qqrm-9grj-6v32) — Lack of media type verification of Activity Streams objects allows impersonation and takeover of remote accounts | signedGet/汎用getJsonからAPを取得する両経路に、応答 Content-Type の ActivityStreams 検査がない。@context の存在確認はメディア型検査の代替にならない。 **条件:** ユーザーアップロード等を同じホストで返す他サーバーの JSON 文書を、AP として取得させられる場合。 | [ApRequestService.ts:181](../../packages/backend/src/core/remote/activitypub/ApRequestService.ts#L181) |
| [GHSA-vwfw-pgg7-5hg6](https://github.com/misskey-dev/misskey/security/advisories/GHSA-vwfw-pgg7-5hg6) — Lack of proper authorization checks | users/get-frequently-replied-users は未認証で全公開範囲の最近の返信と返信先の作者を集計する。閲覧権・公開範囲フィルターなしで相手と重みを返す。 **条件:** 対象ユーザーの ID と、非公開返信が存在する場合。本文自体とは別の交流情報。 | [get-frequently-replied-users.ts:14](../../packages/backend/src/server/api/endpoints/users/get-frequently-replied-users.ts#L14) |
| [GHSA-w98m-j6hq-cwjm](https://github.com/misskey-dev/misskey/security/advisories/GHSA-w98m-j6hq-cwjm) — Token remains valid in cookie after signing out | login は token Cookie を1年保持で設定するが signout は igi のみ書き換え、token を削除も失効もしない。Bull 認証用 token が残る。 **条件:** ログイン後にログアウトした端末を他人が使える場合。複数アカウントでの切替も別途考慮が必要。 | [account.ts:28](../../packages/client/src/account.ts#L28) |
| [GHSA-wmhf-m93m-rgmj](https://github.com/misskey-dev/misskey/security/advisories/GHSA-wmhf-m93m-rgmj) — Denial of Service via Uncontrolled Recursion in Theme Compilation | theme compile の getColor は @/$/関数参照を再帰解決するが訪問済み・深さの制限がない。@loop の自己参照で RangeError を再現。 **条件:** 不正なテーマをインポート・適用したクライアント。サーバー停止の実験ではない。 | [theme.ts:103](../../packages/client/src/scripts/theme.ts#L103) |

## 公表された経路には非該当

| アドバイザリー | 判定根拠・成立条件 | ソース |
| --- | --- | --- |
| [GHSA-2m3r-xx7x-63j6](https://github.com/misskey-dev/misskey/security/advisories/GHSA-2m3r-xx7x-63j6) — Lack of proper permission checks in Direct Messaging | 修正対象は新 Chat の chat/rooms/show とルーム情報の参加・招待確認。この版の旧 messaging/users/groups は別実装で、ChatService・ChatRoom・chat/rooms/show は存在しない。旧メッセージ機能全体の安全性を証明する判定ではない。 **条件:** このリポジトリの機能構成に限る。後から Chat を移植した派生版は再判定する。 | [endpoints.ts:215](../../packages/backend/src/server/api/endpoints.ts#L215) |
| [GHSA-496g-mmpw-j9x3](https://github.com/misskey-dev/misskey/security/advisories/GHSA-496g-mmpw-j9x3) — Export data contains private post data | この版にお気に入り・クリップのエクスポート API/ワーカーはない。i/export-notes は本人のノートの出力であり、当該の経路ではない。 **条件:** favorite/clip への追加や他の公開範囲検査を安全と判断するものではない。 | [endpoints.ts:177](../../packages/backend/src/server/api/endpoints.ts#L177) |
| [GHSA-6qw9-6jxq-xj3p](https://github.com/misskey-dev/misskey/security/advisories/GHSA-6qw9-6jxq-xj3p) — XSS vulnerability using app authentication form | アプリ認可画面は app.name/description を Vue のテキスト補間で表示し、HTML を実行する v-html がない。旧アプリ名注入経路の修正が既に含まれる。 **条件:** アプリ認可画面の当該 HTML 注入に限る。 | [auth.form.vue:5](../../packages/client/src/pages/auth.form.vue#L5) |
| [GHSA-7vgr-p3vc-p4h2](https://github.com/misskey-dev/misskey/security/advisories/GHSA-7vgr-p3vc-p4h2) — Missing validation allows spoofed profiles | 当該修正は HTML の link[rel=alternate] を signedGet が追跡するときのホスト検査。この版の signedGet に HTML 解析・alternate 追跡はなく、常に JSON として読む。 **条件:** この取得経路に限る。別の取得先/id 不一致と media type 未検査は m2gq/6w2c/qqrm として影響あり。 | [ApRequestService.ts:161](../../packages/backend/src/core/remote/activitypub/ApRequestService.ts#L161) |
| [GHSA-9fj2-gjcf-cqqc](https://github.com/misskey-dev/misskey/security/advisories/GHSA-9fj2-gjcf-cqqc) — Bypass authentication of Bull dashboard | Koa の /queue 完全一致・/queue/ 前方一致の認証は、KoaAdapter が同じリテラルで mount する全経路を覆う。大文字、エンコード、隣接 prefix、二重 slash の候補は401/404、認証済み対照は200となった。 **条件:** 同じ Koa 版・mount の構成。Fastify 等へ置換した構成や、未試験の正規化を行う本番プロキシまでは含まない。 | [ClientServerService.ts:113](../../packages/backend/src/server/web/ClientServerService.ts#L113) |
| [GHSA-g3ph-65m3-x625](https://github.com/misskey-dev/misskey/security/advisories/GHSA-g3ph-65m3-x625) — Passkey (WebAuthn) login flow can be disrupted | 当該の新 passkey 保存領域はない。旧 WebAuthn は DB の challenge を userId・id・challenge・registrationChallenge で照会し、取得できた後に同じ userId/id で削除する。他人の challengeId では削除に到達しない。 **条件:** 旧 WebAuthn の他ユーザー challenge 操作に限る。WebAuthn 全体の監査結果ではない。 | [SigninApiService.ts:174](../../packages/backend/src/server/api/SigninApiService.ts#L174) |
| [GHSA-h3mq-w9gq-6mwm](https://github.com/misskey-dev/misskey/security/advisories/GHSA-h3mq-w9gq-6mwm) — Insufficient validation in custom emoji ZIP import leads to arbitrary file read | 公表された slacc>=0.1.0 の書庫エントリー/シンボリックリンク経路は存在しない。固定された unzipper は Unix symlink エントリーを通常ファイルとして展開し、今回の実験でもリンクを作らない。ただし旧 importer の meta.json 参照に独立した任意ファイル読込があり、EMOJI-META-READ として影響確認済み。 **条件:** 当該 slacc 経路への非該当であり、絵文字インポート全体は安全ではない。未信頼パックの import は危険。 | [ImportCustomEmojisProcessorService.ts:4](../../packages/backend/src/queue/processors/ImportCustomEmojisProcessorService.ts#L4) |
| [GHSA-j49q-76hx-mv8f](https://github.com/misskey-dev/misskey/security/advisories/GHSA-j49q-76hx-mv8f) — Improper authorization in announcements API | 上流修正は userId を持つ個人向け announcement を匿名取得する問題。この版の Announcement に宛先 userId はなく、announcements/show もない。全体向けお知らせのみ。 **条件:** この版のお知らせモデルに限る。 | [Announcement.ts:5](../../packages/backend/src/models/entities/Announcement.ts#L5) |
| [GHSA-jx9q-24fh-4fxw](https://github.com/misskey-dev/misskey/security/advisories/GHSA-jx9q-24fh-4fxw) — Path traversal in custom emoji ZIP import leads to arbitrary file write | slacc による展開ではなく unzipper@0.12.5 を使用する。Extract は区切り文字を正規化し path.relative で展開先外を拒否する。親・隣接 prefix・逆 slash の書込を拒否し、普通のファイルは展開できた。 **条件:** ロックファイル通りの unzipper を用いた展開経路。meta.json による読込は別件 EMOJI-META-READ で未修正。 | [ImportCustomEmojisProcessorService.ts:75](../../packages/backend/src/queue/processors/ImportCustomEmojisProcessorService.ts#L75) |
| [GHSA-m9xp-2fvm-pfmq](https://github.com/misskey-dev/misskey/security/advisories/GHSA-m9xp-2fvm-pfmq) — Denial of service resulting from insufficient cleanup processing during file uploads | 公表の v13 以後の Fastify multipart cleanup 実装はない。この版は Koa/Multer と Endpoint の unlink を使う。ただし、アップロード成功後に認証で拒否すると Endpoint の cleanup に到達せずファイルが残る別経路を確認した。UPLOAD-AUTH-CLEANUP として別に扱う。 **条件:** 元アドバイザリーへの非該当はアップロード DoS 全体の解消を意味しない。 | [ApiServerService.ts:89](../../packages/backend/src/server/api/ApiServerService.ts#L89) |
| [GHSA-pj3p-xfwj-rwxv](https://github.com/misskey-dev/misskey/security/advisories/GHSA-pj3p-xfwj-rwxv) — Moderators can take over administrator account (privilege elevation) | admin/reset-password は呼出者がモデレーターでも、対象 user.isAdmin が true ならパスワード生成・更新より前に拒否する。旧 isAdmin モデルで対象管理者を保護している。 **条件:** このエンドポイントの管理者パスワード変更に限る。 | [reset-password.ts:53](../../packages/backend/src/server/api/endpoints/admin/reset-password.ts#L53) |
| [GHSA-pmmv-jwqh-f5ww](https://github.com/misskey-dev/misskey/security/advisories/GHSA-pmmv-jwqh-f5ww) — XSS vulnerability using dialog | MkDialog の title/text は既に Mfm コンポーネントに渡され、古い v-html 注入はない。公開された修正コミットと一致する構造。 **条件:** ダイアログの旧 HTML 注入に限る。MFM やリンク全体の監査とは別。 | [MkDialog.vue:15](../../packages/client/src/components/MkDialog.vue#L15) |
| [GHSA-xc6c-m4f7-jcc9](https://github.com/misskey-dev/misskey/security/advisories/GHSA-xc6c-m4f7-jcc9) — Unsanitized user-input values are injected into HTML notification emails | CreateNotificationService の follow/receiveFollowRequest メールメソッドは本文全体がコメントで、外部 Actor の名前をメール HTML に渡す経路が実行されない。関数の呼出しが残っていても送信は行わない。 **条件:** この保守ブランチのコードに限る。稼働中 fork でコメントを戻していれば影響ありとなる。 | [CreateNotificationService.ts:93](../../packages/backend/src/core/CreateNotificationService.ts#L93) |

## 環境条件による

| アドバイザリー | 判定根拠・成立条件 | ソース |
| --- | --- | --- |
| [GHSA-rrm8-pwmf-gxm3](https://github.com/misskey-dev/misskey/security/advisories/GHSA-rrm8-pwmf-gxm3) — Unexpected crashes, and potential other vulnerabilities via heap overflow due to a vulnerability in libheif (dependency) | 固定 sharp@0.35.5 は当該修正済みの >=0.35.4。ロックされた Linux x64 prebuilt を integrity 照合して確認し、libheif は修正版1.23.2より新しい1.23.5。system libvips の利用や別プラットフォームの実物、本番OSの libheif は未確認。 **条件:** 標準 Linux x64 prebuilt はこの指摘への対処済み。システム側の libvips/libheif をリンクする運用では実物の確認が必要。 | [package.json:106](../../packages/backend/package.json#L106) |
| [GHSA-wwrj-3hvj-prpm](https://github.com/misskey-dev/misskey/security/advisories/GHSA-wwrj-3hvj-prpm) — Login rate limit bypass via spoofed X-Forwarded-For header. | ServerService は koa.proxy=true を固定し、signin のレート制限は ctx.ip をキーにする。同じソケットでも X-Forwarded-For を変えると ctx.ip が変わる。信頼するプロキシの範囲をアプリで指定しない。 **条件:** 直接アクセス可能、またはプロキシが受信 X-Forwarded-For を安全に置換しない場合に影響あり。本番のプロキシ・アクセス制御は未調査。 | [ServerService.ts:63](../../packages/backend/src/server/ServerService.ts#L63) |

## 個別の対応付けを保留した3件

[GHSA-r33c-qg3g-v9cr](https://github.com/misskey-dev/misskey/security/advisories/GHSA-r33c-qg3g-v9cr)、[GHSA-cvf3-p7p2-27fh](https://github.com/misskey-dev/misskey/security/advisories/GHSA-cvf3-p7p2-27fh)、[GHSA-gg7j-c76w-8x3g](https://github.com/misskey-dev/misskey/security/advisories/GHSA-gg7j-c76w-8x3g) は同じCVE-2026-28431にまとめられている。公式本文は詳細を伏せ、公開CVE記録も各GHSAと具体的経路を対応付けていない。

2026.3.1の修正を個別コミットまで確認した。投稿イベントに閲覧権情報を加える修正、複数階層ノートの隠蔽、チャンネルの認可強化がある。この版には、閲覧権なしの投稿イベント購読と、未認証での他人のアンテナID購読があり、最小実験でも確認した。一方、返信・Renoteを既に再packして隠す箇所もあるため、3件すべてに同じ結論を機械的に割り当てない。

保留を安全の意味では使わない。次は実HTTP/WebSocketの公開範囲・所有者・匿名/認証・ネストした投稿の行列を各修正に対応させる。上流が追加情報を公開した場合は個別IDの判定を更新する。関連コミットとローカルの確認箇所は機械可読レポートに記録した。

## 同時に確認した別経路の問題

| 所見 | 確認したこと |
| --- | --- |
| EMOJI-META-READ | 旧絵文字 importer は meta.json の fileName を展開先に連結するだけで、任意の親ディレクトリの既存ファイルを DriveService.addFile に渡せる。自作 sentinel の読込を再現。slacc の symlink GHSA と同一経路とは扱わない。 **条件:** 信頼されない絵文字パックを管理者/モデレーターが import する場合。 |
| UPLOAD-AUTH-CLEANUP | Multer の書込完了後、API 認証で拒否すると Endpoint の cleanup に到達しない。自作のアップロード相当ファイルが403後に残ることを再現。Fastify の当該 GHSA と同一実装とは扱わない。 **条件:** 公開 multipart アップロード経路。実HTTPで大量送信は行っていない。 |
| STREAM-ACCESS-BOUNDARY | 未認証の投稿イベント購読と他人のアンテナID購読を再現。3つの公表GHSAへの個別割当は保留だが、このコードの欠落自体は確認済み。 **条件:** 対象の投稿/アンテナIDを知る場合。 |

これらは公式GHSAへの個別割当と分けて追跡する。重複する影響があるため、上の件数へ加算しない。絵文字の実験で読み込んだのは、このスクリプト自身が一時ディレクトリに作った sentinel のみ。任意ファイルの公開・実サーバー上の秘密値読込は行っていない。アップロードの実験も認証拒否処理と自作ファイルを使い、大量送信は行っていない。

## 既対応12件

以前の11件の対象と修正は [セキュリティパッチ報告](security-patches-2026-10-25.md) および MiAuth の台帳・既存テストに記録されている。今回はそのコードが対象コミットにあることを照合した。

追加で判定した GHSA-grwc-c762-gcvp は、上流2026.3.1では「署名にDigestがないときに401を設定してもreturnしていなかった」経路への修正。この版では前回のパッチが署名対象にdigestを必須指定し、本文のDigest不一致・欠落時もreturnするため、キューへ進まない。既存の `inbox-authentication.ts` の署名対象ヘッダー欠落テストに対応付けた。今回、新たなアプリ修正はしていない。

## 修正する順序

1. 第三者アプリによる管理設定への到達、ActivityPubの取得先・id・Content-Type・所有者検証、絵文字meta.jsonの展開先外参照。
2. 非公開情報のAPI/WebSocket境界、TOTP再使用、インポートの所有者、ログアウトCookie/CSRF、URLのスキームとオリジン、アップロード拒否時の後処理。
3. RSSのレート制限、media proxyのループ防止、テーマ再帰の上限。信頼プロキシと実際のlibheifの確認も本番投入前に行う。

各修正では、まず実経路の攻撃再現と正常系を追加し、既存の型検査・回帰比較・Postgres 18の連合試験を通す。今回の調査用assertを安全性ゲートへそのまま移すと、脆弱な挙動を固定してしまうため行わない。

## 最小実験の再実行

本体の依存ツリーは変更しない。隔離ディレクトリへ次の固定版だけをインストールし、本体指定のNodeで実行する。ネットワークは依存取得にだけ使用し、実験から外部への要求は送らない。実ライブラリの間接依存の解決記録は [probe-dependency-lock.json](evidence/2026-10-28/probe-dependency-lock.json) にも保存した。

```sh
mkdir -p /tmp/misskey-impact-runtime
npm install --prefix /tmp/misskey-impact-runtime --ignore-scripts --no-audit --no-fund \
  typescript@5.6.3 unzipper@0.12.5 @bull-board/koa@4.3.1 koa@2.16.4 speakeasy@2.0.0
node scripts/security/advisory-impact-probes.mjs \
  /tmp/misskey-impact-runtime /tmp/misskey-impact-results.json
```

これは影響確認時点の調査手順。修正後はassertの失敗を無視したり、本体を脆弱な挙動に戻したりせず、該当する判定・実験を見直す。
