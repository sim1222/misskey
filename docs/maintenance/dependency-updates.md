# 依存パッケージ更新（2026-10-23、日本時間）

起点: `fa74cb3723c558089dd98c520cf44599031c64e6`。保守ブランチだけを変更し、本番への反映は行っていない。

## 監査比較

[更新前](dependency-audit-before-update.json) と [更新後](dependency-audit-after-update.json) は同じ監査スクリプトで取得した。
スコープ内で GHSA を重複除去している。間接依存・開発用も含むため、スコープをまたいで合算しない。

| スコープ | 更新前 | 更新後 | Critical 前→後 | High 前→後 |
| --- | ---: | ---: | ---: | ---: |
| root | 90 | 7 | 1 → 0 | 41 → 3 |
| backend | 204 | 56 | 7 → 0 | 95 → 20 |
| client | 118 | 10 | 1 → 0 | 49 → 3 |
| sw | 23 | 0 | 0 → 0 | 15 → 0 |

Critical の監査警告は全スコープで 0 件になったが、High を含む残件がある。
この結果は Misskey 本体・設定・OS や、本番への攻撃可能性全体の安全性を証明するものではない。

## 更新内容

直接依存は次のとおり。固定された間接依存も、宣言済みの範囲内で更新した。

| パッケージ | 区分 | 依存名 | 更新前 | 更新後 |
| --- | --- | --- | --- | --- |
| . | dependencies | cssnano | — | 9.9.0 |
| . | dependencies | gulp | 4.0.2 | 5.0.1 |
| . | dependencies | gulp-cssnano | 2.1.3 | 削除（PostCSS/cssnano に置換） |
| . | dependencies | gulp-postcss | — | 10.0.0 |
| . | dependencies | js-yaml | 4.1.0 | 4.3.2 |
| . | dependencies | postcss | — | 8.5.31 |
| packages/backend | dependencies | @koa/cors | 3.1.0 | 5.0.0 |
| packages/backend | dependencies | @koa/multer | 3.0.0 | 4.0.0 |
| packages/backend | dependencies | @nestjs/common | 9.1.1 | 9.4.3 |
| packages/backend | dependencies | @nestjs/core | 9.1.1 | 9.4.3 |
| packages/backend | dependencies | @nestjs/testing | 9.1.1 | 9.4.3 |
| packages/backend | dependencies | ajv | 8.11.0 | 8.20.0 |
| packages/backend | dependencies | chokidar | 3.5.3 | ^3.3.1 |
| packages/backend | dependencies | file-type | 18.0.0 | 22.2.0 |
| packages/backend | dependencies | got | 12.5.0 | 12.6.1 |
| packages/backend | dependencies | ioredis | 4.28.5 | 4.31.0 |
| packages/backend | dependencies | js-yaml | 4.1.0 | 4.3.2 |
| packages/backend | dependencies | json5 | 2.2.1 | 2.2.3 |
| packages/backend | dependencies | jsrsasign | 10.5.27 | 11.1.5 |
| packages/backend | dependencies | koa | 2.13.4 | 2.16.4 |
| packages/backend | dependencies | koa-bodyparser | 4.3.0 | 4.4.1 |
| packages/backend | dependencies | lodash | — | ^4.17.21 |
| packages/backend | dependencies | multer | 1.4.4 | 2.5.0 |
| packages/backend | dependencies | node-fetch | 3.2.10 | 3.3.2 |
| packages/backend | dependencies | nodemailer | 6.7.8 | 10.2.1 |
| packages/backend | dependencies | pg | 8.8.0 | 8.23.1 |
| packages/backend | dependencies | probe-image-size | 7.2.3 | 7.4.0 |
| packages/backend | dependencies | pug | 3.0.2 | 3.0.4 |
| packages/backend | dependencies | punycode | 2.1.1 | 2.3.1 |
| packages/backend | dependencies | rss-parser | 3.12.0 | 3.13.0 |
| packages/backend | dependencies | sanitize-html | 2.7.2 | 2.18.1 |
| packages/backend | dependencies | semver | 7.3.7 | 7.8.5 |
| packages/backend | dependencies | sharp | 0.29.3 | 0.35.5 |
| packages/backend | dependencies | systeminformation | 5.12.6 | 5.33.16 |
| packages/backend | dependencies | tinycolor2 | 1.4.2 | 1.6.0 |
| packages/backend | dependencies | tmp | 0.2.1 | 0.2.7 |
| packages/backend | dependencies | typeorm | 0.3.10 | 0.3.31 |
| packages/backend | dependencies | unzipper | 0.10.11 | 0.12.5 |
| packages/backend | dependencies | uuid | 9.0.0 | 14.0.3 |
| packages/backend | dependencies | web-push | 3.5.0 | 3.6.7 |
| packages/backend | dependencies | ws | 8.8.1 | 8.22.0 |
| packages/backend | devDependencies | @swc/core | 1.3.2 | 1.16.20 |
| packages/backend | devDependencies | @swc/jest | 0.2.22 | 0.2.39 |
| packages/backend | devDependencies | @types/jest | 29.0.3 | 30.0.0 |
| packages/backend | devDependencies | @types/jsrsasign | 10.5.3 | 10.5.15 |
| packages/backend | devDependencies | @types/koa__multer | 2.0.4 | 2.0.8 |
| packages/backend | devDependencies | @types/node-fetch | 3.0.3 | 削除（本体同梱の型を使用） |
| packages/backend | devDependencies | @types/nodemailer | 6.4.6 | 8.0.2 |
| packages/backend | devDependencies | @types/pg | 8.6.5 | 8.23.1 |
| packages/backend | devDependencies | @types/sanitize-html | 2.6.2 | 2.16.2 |
| packages/backend | devDependencies | @types/sharp | 0.30.5 | 削除（本体同梱の型を使用） |
| packages/backend | devDependencies | @types/tmp | 0.2.3 | 0.2.6 |
| packages/backend | devDependencies | @types/uuid | 8.3.4 | 削除（本体同梱の型を使用） |
| packages/backend | devDependencies | @types/ws | 8.5.3 | 8.18.2 |
| packages/backend | devDependencies | jest | 29.0.3 | 30.5.2 |
| packages/backend | devDependencies | typescript | 4.8.3 | 5.6.3 |
| packages/client | dependencies | @vitejs/plugin-vue | 5.1.4 | 6.0.10 |
| packages/client | dependencies | @vue/compiler-sfc | 3.5.12 | 3.5.44 |
| packages/client | dependencies | katex | 0.16.11 | 0.19.0 |
| packages/client | dependencies | lodash | — | ^4.17.21 |
| packages/client | dependencies | prismjs | 1.29.0 | 1.30.0 |
| packages/client | dependencies | uuid | 10.0.0 | 14.0.3 |
| packages/client | dependencies | vite | 5.4.8 | 8.3.5 |
| packages/client | dependencies | vue | 3.5.12 | 3.5.44 |
| packages/client | devDependencies | @types/uuid | 10.0.0 | 削除（本体同梱の型を使用） |
| packages/client | devDependencies | rollup | 4.24.0 | 4.65.0 |
| packages/sw | dependencies | esbuild | ^0.14.13 | 0.28.2 |

## 互換性への対応

- Koa は 2.16.4、TypeORM は 0.3.31 に留めて既存 API と DB への影響を抑えた。
- `summaly` 2.7.0 は脆弱な Koa 2.13.4 を厳密に固定している。`summaly/koa` だけを 2.16.4 に限定して置き換えた。同じ Koa 2 系で、通常の Koa のリクエスト・Multer 統合・実アプリ起動を検証している。任意のメジャー版を全依存へ強制する設定ではない。
- TypeScript は backend も既存の root/client と同じ 5.6.3 に揃え、ライブラリ本体と重複する `@types/sharp`、`@types/node-fetch`、`@types/uuid` を削除した。
- 新しい sanitize-html/htmlparser2 は Node 24 の ESM 読み込みを使うため、Jest/SWC も現行版へ更新。通報メールでの sanitizer の default import も修正した。
- Yarn Classic が npm エイリアスと通常の CJS 依存をまとめて誤って配置する問題に遭遇した。backend のロックで該当する alias と通常の依存を別エントリにし、バージョン・取得 URL・integrity は変更していない。再インストールと frozen install を確認した。
- Vite 8/Rolldown 用の設定に移行し、不正だった optional 引数の型宣言を実行時の意味を変えずに修正した。
- クライアントの CSS が共有チャンクにも分かれるため、静的 imports をたどって CSS を重複除去し、HTML で stylesheet として適用する。元のテンプレートは preload を二重に指定していた。静的 manifest・サーバーレンダリングの回帰テストと実ブラウザーで検証した。
- esbuild の watch を context API に移行し、define の値を JavaScript の文字列式へ揃えた。開発用 watch の初回ビルドも確認。
- 古い gulp-cssnano を削除し、Gulp 5 + gulp-postcss + cssnano に置き換えた。フォント等のバイナリを変換しない設定を明示し、コピー元と出力の 2,155 ファイルの SHA-256 が一致した。

## 検証結果

- Node.js 24.22.1 で frozen install、本番モードのビルドが完了。
- 12 スイート、62 テストが成功。元のテストは除外していない。
- 実際の Koa/Multer で通常アップロード・サイズ超過・途中で切れた multipart と一時ファイル削除を確認。
- ローカル SMTP へ EmailService が multipart メールを送信することを確認。外部メールは送信していない。
- jsrsasign と Node の双方で証明書を検証し、WebAuthn の既存形式の公開鍵で署名検証・改ざん拒否を確認。
- 既存画像の読み取りに加え、JPEG/WebP/PNG サムネイルの形式・寸法・拡大しないことを確認。
- 小さなローカル DB の 97 テーブルを対象に、migration 前後の schema-only dump と行数・データハッシュが一致。migration は pending なし。本番 DB の検証ではない。
- 本番モードのアプリで HTML/meta API/JS/CSS/Web manifest の応答を検証。
- Chromium 154 で `/`、`/about`、`/explore` の初期表示と CSS 適用を確認。未捕捉 JavaScript エラー・ローカル HTTP 5xx はなし。外部画像・外部サービスへの通信は遮断しており、全画面・全機能のブラウザー E2E ではない。

## 残件

- 依存更新時点ではbackendの型検査に301件の診断が残っていた。その後の [型整合性の修正](type-safety.md) で0件になり、型エラーがあればビルド・CIを失敗させるよう変更した。
- NestJS のメジャー移行、AWS SDK v2 → v3、古い summaly と private-ip の置き換えなどは未完了。特に private-ip に修正版のない警告があり、単純なバージョン更新で SSRF の修正済みとは言えない。
- jsrsasign 11.1.5 は監査上の修正版だが、保守終了の警告がある。将来は Node の X509/crypto 等への置き換えを別途検証する。
- Misskey 本体の署名検証・認可・SSRF 等のアドバイザリー対応、連合相互運用、本番の大きな DB での性能・復元検証は引き続き必要。
- 外部 SMTP、オブジェクトストレージ、OAuth 等の実資格情報を必要とする接続先は検証していない。

GitHub Actions は `Maintenance validation` を確認する。ローカル成功と CI 成功は区別して扱う。

## CI 冷起動の再現とロックファイルの再発防止

最初の CI 失敗後、空のローカル DB で手順を再現し、TypeORM CLI が同じ npm エイリアス配置問題で起動できないことを確認した。
依存追加の後で Yarn が別名と通常名を再び一つにまとめていたため、更新作業の最後に以下を実行する。

```sh
node scripts/normalize-yarn-aliases.mjs
node --test scripts/test/normalize-yarn-aliases.test.mjs
```

正規化は artifact の version / resolved / integrity を保持する。曖昧な複数の別名は変更せずエラーにする。
CI は `node scripts/normalize-yarn-aliases.mjs --check` で、インストール前に未正規化のロックを拒否する。
3 件の Node テストで、artifact identity の維持・冪等性・曖昧な入力の拒否を確認した。
再配置後、空 DB からの全マイグレーション、通常モードでのアプリ起動・HTTP/CSS smoke、全 62 Jest テストまで成功した。
元のローカル起動設定は退避した内容へ復元済み。
