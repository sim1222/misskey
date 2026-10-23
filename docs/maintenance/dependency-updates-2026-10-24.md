# 回帰比較を伴う依存更新（2026-10-24、日本時間）

起点: `5d53b9aa77b29c275c5fa570746099121a94a672`。
変更先は `v12-mod-maintain` のみ。本番への反映・既存 DB のコピーや接続は行っていない。

## 同一メジャー内の更新

21 パッケージ、23 か所の依存宣言を更新した。間接依存の変更も lockfile に含む。
同一メジャーという理由だけで互換性があるとは判断せず、以下の比較を行った。

| スコープ | パッケージ | 変更前 | 変更後 |
| --- | --- | --- | --- |
| root | execa | 9.4.0 | 9.6.1 |
| root | gulp-rename | 2.0.0 | 2.1.0 |
| backend | archiver | 5.3.1 | 5.3.2 |
| backend | chalk | 5.0.1 | 5.6.2 |
| backend | date-fns | 2.29.3 | 2.30.0 |
| backend | hpagent | 1.0.0 | 1.2.0 |
| backend | is-svg | 4.3.2 | 4.4.0 |
| backend | jsdom | 20.0.0 | 20.0.3 |
| backend | koa-mount | 4.0.0 | 4.2.0 |
| backend | parse5 | 7.1.1 | 7.3.0 |
| backend | qrcode | 1.5.1 | 1.5.4 |
| backend | rxjs | 7.5.6 | 7.8.2 |
| backend | ts-loader | 9.4.0 | 9.6.2 |
| backend | ts-node | 10.9.1 | 10.9.2 |
| backend | tsc-alias | 1.7.0 | 1.9.9 |
| backend | tsconfig-paths | 4.1.0 | 4.2.0 |
| backend | ulid | 2.3.0 | 2.4.0 |
| backend | websocket | 1.0.34 | 1.0.35 |
| client | broadcast-channel | 7.0.0 | 7.4.0 |
| client | eventemitter3 | 5.0.1 | 5.0.4 |
| client | idb-keyval | 6.2.1 | 6.3.0 |
| client | tsc-alias | 1.8.10 | 1.9.9 |
| sw | idb-keyval | ^6.0.3 | 6.3.0 |

### 差分を検出して見送った更新

`ip-cidr` 3.0.10 → 3.1.0 は撤回した。
`::ffff:192.0.2.0/120` に対する結果が次のように変わり、ネットワーク制限に影響する。

| 操作 | 3.0.10 | 3.1.0 |
| --- | --- | --- |
| `toRange()` | IPv6 表記の `…:0200` ～ `…:02ff` | `192.0.2.0` ～ `192.0.2.0` |
| `contains('192.0.2.0')` | `false` | `true` |

期待値を新結果に合わせて変更することはせず、旧版を維持した。
将来の修正では、IPv4-mapped IPv6 のネットワーク制限の仕様を明示し、許可・拒否双方を検証する。

## 検証

- 4 スコープの frozen-lockfile インストール、Yarn alias 整合性確認。
- バックエンドと型契約の型検査、クライアント・SW を含む全体ビルド。
- 既存 Jest: 14 スイート、88 テスト。
- 比較基盤テスト: 11 テスト。依存の比較テストを追加した。
- PostgreSQL 18 の使い捨て DB に全 migration を適用し、HTTP・保存行・WebSocket・ブラウザ等
  1,604 項目を更新前の基準と比較。差分 0。312 API の認証境界と 190 API の正常系を含む。
- 3 台の隔離サーバーと PostgreSQL 18 による実 HTTPS 連合試験も更新前後で実行。
  全 17 シナリオ成功、37 件の署名付きリクエストを検証。更新前後でアプリの観測基準は変更なし。

依存比較の期待値 [`dependency-baseline.json`](../../scripts/regression/dependency-baseline.json) は
起点 SHA の backend package.json / yarn.lock を別ディレクトリへ取り出し、
`--frozen-lockfile --ignore-scripts` でインストールした旧依存から生成した。
ZIP のバイト列・展開内容、TOTP 用 QR マトリクス、HTML の解析・シリアライズ、
SVG 分類、IPv4/IPv6 の範囲と包含、日時計算、Observable、実 HTTP CONNECT プロキシ通信を比較する。
CI の `yarn test:regression:harness` で固定した旧期待値を使い続ける。

アプリ全体の既存の基準やカバレッジ最低値は緩めていない。
回帰比較が以前から観測している AntennaService の未処理エラー 3 件も残っており、
テストが通ることを全機能・全脆弱性の解消や、未検証の本番データの互換性の証明とはしない。
AWS SDK、FFmpeg、AiScript/MFM、Nest/TypeORM 等の大きな移行は個別の正常・拒否系の検証が必要。
