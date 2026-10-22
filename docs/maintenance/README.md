# v12-mod 保守作業

このブランチは `v12-mod` の `bc19d4568ac1ee3a3e8d89d6e11d82449bbde444` を起点とする。
本番サーバーへの操作・接続・デプロイは行っていない。本番投入の承認を意味しない。
既存の DB・ファイル・公開 URL・ActivityPub の識別子と鍵を維持することを優先する。
DB 全体を開発環境へコピーする必要はない。

## 調査結果（2026-10-23、日本時間）

公式の [Misskey Security Advisories](https://github.com/misskey-dev/misskey/security/advisories) を
一覧の 1〜5 ページから 48 件取得した。6 ページ目は空だった。
本文・URL・確認状態は [misskey-advisories.json](misskey-advisories.json) に保存している。
版番号だけでは派生版への影響を確定できないため、修正済みと確認したもの以外は
`requires-source-review` としている。この件数は影響が確定した脆弱性の数ではない。

起点のロックファイルを npm registry の Yarn Classic audit で監査した。
[dependency-audit-baseline.json](dependency-audit-baseline.json) は修正前の記録であり、
最新の残件一覧ではない。直接・間接・開発用の依存を含む。同じ GHSA はスコープ内で重複を除いている。
スコープをまたいだ合算はできない。

| スコープ | 固有アドバイザリー | Critical | High | Moderate | Low |
| --- | ---: | ---: | ---: | ---: | ---: |
| root | 91 | 1 | 41 | 43 | 6 |
| backend | 224 | 8 | 105 | 89 | 22 |
| client | 118 | 1 | 49 | 55 | 13 |
| service worker | 23 | 0 | 15 | 7 | 1 |

監査警告だけでは、外部からの到達性、攻撃条件、ランタイムでの使用の有無は確定しない。
逆に、監査がゼロでも Misskey 本体、OS、ネイティブライブラリ、設定の安全性は証明できない。
この段階では、全脆弱性が修正済み・全機能の互換性確認済みとは言えない。

再監査は、指定の Node を有効にしてリポジトリ直下で実行する。
ネットワークエラーや結果の欠落は成功扱いにしない。

```sh
node scripts/maintenance-audit.mjs /tmp/misskey-dependency-audit.json
```

## この段階の変更

- Node.js 24.22.1（調査時の最新 24 系 LTS）を `.node-version` と Dockerfile に指定。
  Node 26 系 Current は本番の第一候補にしない。将来の 24 系セキュリティ更新は継続する。
- Node 24 で廃止された JSON import assertion を通常の JSON 読み込みへ置き換え、
  同じ manifest をビルド時にコピーする。manifest の内容や DB は変えない。
- Node 24 対応の `re2` と、現行 Node に対応する `@sinonjs/fake-timers` に更新。
- Bull を 4.16.5 に更新し、Node 24 でエラーになる旧 msgpackr を更新。
  日本語・絵文字を含むジョブの Redis 保存・再読込を検証する。
- グラフのテストは日付だけを仮想化し、PostgreSQL の I/O に必要なスケジューリングを止めない。
- FileInfo のテストから、すでに本体では無効化されている AiService の誤った依存を除去。
  AI 判定機能の再実装・復活は行わない。
- 空だった MetaService のスイートに DB 初期化・キャッシュ・設定更新・旧データ選択の検証を実装。
- **GHSA-cc6r-chgr-8r5m**: MiAuth コールバックの XSS を修正。
  [上流 13.3.1 の修正](https://github.com/misskey-dev/misskey/blob/13.3.1/packages/frontend/src/pages/miauth.vue)
  に合わせて絶対 HTTP/HTTPS URL のみ許可する。トークン発行前に検証する。
  正常なクエリと fragment は保持し、session を正しく更新する。
  JavaScript/data/file などの URL と相対 URL は拒否するため、これらに依存した連携アプリは見直しが必要。
- 子パッケージも frozen lockfile でインストールする。
- 保守ブランチの CI はローカル DB/Redis でビルド・マイグレーション・HTTP smoke・全 Jest を実行。
  本番の鍵・資格情報や外部の連合サーバーを必要としない。

## 検証方法と限界

Node は `.node-version`、Yarn はルート `package.json` の指定に合わせる。

```sh
yarn install --frozen-lockfile --non-interactive
yarn clean
yarn build
yarn jest
```

`.config/test.yml` は必ず使い捨ての小さな DB と専用 Redis を指すこと。
この版のテストは **DB のスキーマを削除・再作成する**。
本番の設定・DB・Redis を使ってはいけない。
CI は `.github/misskey/test.yml` の隔離サービスだけを使用する。

本体の既存 build スクリプトは TypeScript エラーを許して JavaScript を出力するため、
ビルド終了コードだけを型チェック成功と解釈しない。起点には 220 件の診断があった。
型エラーを見える形で減らし、後で厳密な型チェックを CI の必須条件にする。
ブラウザー操作の E2E、連合相互運用、大規模データの性能、本番環境の復元は別途検証が必要。

マイグレーションは、通常起動用の小さな DB で実行する。
テスト用 DB はテストが自動同期するので、テスト実行後にそこへ migration を適用しない。
起動中のアプリは以下で HTML・API・実際のクライアント bundle・Web manifest を検証できる。

```sh
MAINTENANCE_SMOKE_URL=http://127.0.0.1:3000 node scripts/maintenance-smoke.mjs
```

## 次の修正順序

1. **連合の入力検証**: HTTP 署名の必須ヘッダーと Digest、署名対象と本文の対応、
   JSON-LD の正規化・検証順序、actor / object / id / url の権限境界を照合する。
   関連: GHSA-3f39-6537-3cgc、GHSA-2vxv-pv3m-3wvj、GHSA-38jx-423m-g387、
   GHSA-w8x2-gpq6-jxvf、GHSA-m2gq-69fp-6hv4、GHSA-qqrm-9grj-6v32 など。
   拒否する攻撃と、引き続き受理する正当な署名を両方テストする。
2. **SSRF と外部取得**: DNS 再解決、リダイレクト、IPv4/IPv6、プロキシ経由を含めて
   HttpRequestService / DownloadService / URL preview の実経路を確認する。
   単純な URL 文字列のブロックだけでは解決済みにしない。
3. **認可・XSS・ファイル処理**: Bull dashboard、第三者アプリ権限、投稿公開範囲、RSS リンク、
   MiAuth 以外の遷移先、カスタム絵文字 ZIP の展開・meta.json 内のファイル参照を確認する。
   旧コードには `outputPath + '/' + record.fileName` があり、書庫外の参照を優先調査する。
4. **依存パッケージ**: 到達可能な高リスク依存から更新する。koa、multer、sanitize-html、
   form-data、jsrsasign、systeminformation、sharp とそのネイティブ依存等を個別に検証する。
   一律の強制 resolutions や監査を黙らせる除外だけでは修正済みと扱わない。
5. **互換性と本番移行**: 復元可能なバックアップをサーバー側で確保し、
   小さな匿名化フィクスチャと schema-only 情報で実 DB の構造差を確認する。
   本番の PostgreSQL/Redis/OS の版、プロキシ、ファイル保存先、実コミット、独自変更はまだ未確認。
   DB スキーマの変更が必要なら個別に説明・検証する。

## 本番反映前の条件

- 影響するアドバイザリーをすべて個別に判定し、残件・回避策・未検証を明記する。
- ログイン、投稿、公開範囲、添付、通知、検索、管理機能の比較テストを行う。
- 管理下の検証用連合相手と送受信・署名・再配送を確認する。
- 本番側でバックアップの復元・切り戻しを確認する。公開 URL、ユーザー/投稿 URI、鍵を保持する。
- 大きな DB のロック・実行時間は小さな DB で証明できない。必要なクエリを現地で評価する。
- OS、PostgreSQL、Redis、リバースプロキシもサポート中の版と安全な設定にする。

本番の情報は秘密値や個人データをチャットに貼らず、値を含まない構造・版情報から確認する。

## 今回のローカル検証結果

- Node.js 24.22.1、Yarn 1.22.19 で frozen install と clean build が完了。
- Jest: 6 スイート、45 テストすべて成功。テストの除外・無効化は行っていない。
- Node 24 のプロセスを専用ポートで起動し、HTML、meta API、クライアント JS、Web manifest の応答を確認。
- ローカルの起動用フィクスチャ DB は migration が pending なし。
  Node 更新の前後で schema-only dump を比較し、スキーマが変わらないことを確認。
  これは本番 DB の検証ではない。
- 現在の backend build には 219 件の TypeScript 診断が残る。型チェック成功とは扱わない。
- CI の結果は GitHub Actions の `Maintenance validation` を確認する。
  ローカル成功は Actions 完了や本番の動作保証を意味しない。
