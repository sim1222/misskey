# 既知の脆弱性に対するパッチ

起点は `09f033c754941fb505d1335ab5b1aa132620afc3`。作業先は `v12-mod-maintain`。
`v12-mod`、本番サーバー、本番 DB・ファイルには変更していない。DB マイグレーションの追加はない。

## 修正範囲

公式アドバイザリー 10 件と、この fork に固有の LD-signature の検証不備を対象にした。
アドバイザリーごとのテストは [advisory-tests.json](../../scripts/regression/advisory-tests.json) に対応付ける。

| 対象 | 修正 |
| --- | --- |
| [GHSA-3f39-6537-3cgc](https://github.com/misskey-dev/misskey/security/advisories/GHSA-3f39-6537-3cgc) | 受信 HTTP 署名に対象パス・Host・日付・Digest を要求し、Host と本文の SHA-256 をキュー投入前に検証する。 |
| [GHSA-2vxv-pv3m-3wvj](https://github.com/misskey-dev/misskey/security/advisories/GHSA-2vxv-pv3m-3wvj) | 転送された LD 署名付きアクティビティを正規化し、署名で検証した意味のオブジェクトだけを処理する。 |
| [GHSA-38jx-423m-g387](https://github.com/misskey-dev/misskey/security/advisories/GHSA-38jx-423m-g387) | JSON-LD のコンテキストを処理単位で共有・固定し、検証途中の取得内容の変更を防ぐ。 |
| [GHSA-w8x2-gpq6-jxvf](https://github.com/misskey-dev/misskey/security/advisories/GHSA-w8x2-gpq6-jxvf) | 正規化後の `@included`、`@graph`、`@reverse` を含む転送を拒否する。 |
| [GHSA-cgwp-vmr4-wx4q](https://github.com/misskey-dev/misskey/security/advisories/GHSA-cgwp-vmr4-wx4q) | Unicode 正規化したタグを SQL パラメーターで渡す。従来の入力検査、AND/OR 検索、公開範囲の条件は維持する。 |
| [GHSA-5q3h-wpfw-hjjw](https://github.com/misskey-dev/misskey/security/advisories/GHSA-5q3h-wpfw-hjjw) | HTTP 取得の送信先を、接続前に検査する。 |
| [GHSA-mqv7-gxh4-r5vf](https://github.com/misskey-dev/misskey/security/advisories/GHSA-mqv7-gxh4-r5vf) | ダウンロードも検査済みエージェントを通し、レスポンス受信後の IP 検査に依存しない。 |
| [GHSA-jvcx-f39m-5xrj](https://github.com/misskey-dev/misskey/security/advisories/GHSA-jvcx-f39m-5xrj) | URL プレビュー本体・プラグイン・アイコン等の確認要求にも同じ接続前検査を適用する。 |
| [GHSA-3p2w-xmv5-jm95](https://github.com/misskey-dev/misskey/security/advisories/GHSA-3p2w-xmv5-jm95) | HTTP(S) 以外のプレビュー画像を返さず、画像 URL を CSS 宣言全体へ連結しない。 |
| [GHSA-vc39-c453-67g3](https://github.com/misskey-dev/misskey/security/advisories/GHSA-vc39-c453-67g3) | インライン・ウィンドウの両プレイヤーで、絶対 HTTP(S) URL だけを許可する。 |

この fork の `LdSignatureService.normalize()` は定数 `42` を返していたため、本文を変更しても署名検証が成功していた。
URDNA2015 / N-Quads による正規化を復旧し、本文・送信者・宛先・ID・署名時刻・domain・nonce の変更を検出する。
正規化の計算量と外部コンテキストの数にも上限を設ける。

JSON-LD の処理順・コンテキスト固定・禁止ディレクティブは、上流 `2026.5.4` の
[JsonLdService](https://github.com/misskey-dev/misskey/blob/2026.5.4/packages/backend/src/core/activitypub/JsonLdService.ts) と
[InboxProcessorService](https://github.com/misskey-dev/misskey/blob/2026.5.4/packages/backend/src/queue/processors/InboxProcessorService.ts) に照合した。

## 許容した挙動変更

- 受信先と異なる Host、署名されていない必須ヘッダー、本文に一致しない Digest の要求は 401 にする。
- 署名が検証できない転送、解釈を固定できない JSON-LD、危険なディレクティブは処理しない。
- 既定では非公開 IP・ループバック・リンクローカル等への送信を接続前に拒否する。
  明示された `allowedPrivateNetworks` の例外は維持する。DNS の回答を検査した後、その IP 自体へ接続する。
  リダイレクト先も検査し、プロキシの CONNECT 先も検査済み IP に固定する。
  このため、プロキシ利用時も対象の名前解決をアプリ側で行い、検証できない送信先は拒否する。
- 実行可能なプレイヤー URL と、CSS 宣言へ脱出する画像の扱いを拒否・無害化する。
- Unicode で SQL 条件を改変する入力は文字列データとして検索し、SQL へ展開しない。

正常な署名のキー順の違い、署名付き `X-Date`、Authorization の HTTP Signature、Host の DNS 名の大文字小文字は維持する。
送信署名には Host のポートとクエリーも含め、既定以外のポートやクエリー付きの送信先でも検証が成立するようにした。
鍵・ActivityPub ID・既存の保存データは変更しない。

## URL プレビューの互換性

既存の `summaly@2.7.0` を [小さなローカル修正版](../../packages/backend/vendor/summaly/MAINTENANCE.md) にした。
HTTP エージェントを要求単位で渡す部分を追加し、既存の解析器・プラグイン・文字コード処理は保持している。
元のパッケージとのハッシュ比較もテストする。User-Agent も従来の `SummalyBot/2.7.0` を維持する。
ライブラリのメジャー更新で表示の変化を取り込むことはしていない。

IP 判定は、サポート対象の `ipaddr.js@2.5.0` を直接依存に固定した。
脆弱な `private-ip` の直接・間接依存は削除した。

## 検証

- 修正前のコードで、LD 署名の改ざん成功、Host/Digest 検査の不足、Unicode による SQL 条件の改変を再現する。
- HTTP サーバー・DNS・リダイレクト・CONNECT プロキシを使い、接続前の拒否と通常の Host・TLS 名の保持を検査する。
- 転送アクティビティは、実 HTTP 受信と受信ワーカーを通して正常転送・改ざん・正規化失敗を観測する。
- Chromium では変更前の実部品を凍結した参照と比較する。変更前だけで CSS 注入とスクリプト実行が再現し、正常な両プレイヤーは一致することを要求する。
- 型検査、既存 Jest、固定インストールとマイグレーション CLI、既存 API/DB/ブラウザの比較、Postgres 18 の 3 インスタンス連合試験を継続する。

既存の回帰期待値は、不正な Host の要求を 202 から 401 にする箇所だけ変更した。
新しい攻撃テストは追加の観測として記録する。他の比較結果を一括で取り直して承認する手順は使っていない。
既存の AntennaService の実行時エラー 3 件は今回の脆弱性と無関係なため、引き続き明示的に観測する。

変更箇所の実行行・分岐の検査には、実アプリ・連合に加えて再現単体テストのカバレッジを使う。
単体テストのソース・依存・レポートのハッシュと Node の版を検証し、古い結果を受け入れない。
実行コードを生成しない `.d.ts` は、必須の型検査で検証する。

## 残る対象

今回の変更で全脆弱性の対応が完了したとは扱わない。
公式一覧 48 件のうち、以前の MiAuth 修正と今回の 10 件以外の 37 件は、引き続き影響・修正範囲の確認が必要である。
件数はこの派生版への影響が確定した脆弱性の数ではない。
TOTP の再使用、所有権・公開範囲・権限検査、ActivityPub の取得と所有者検証、ZIP インポート等は別の修正対象として残る。

依存監査の固有アドバイザリーは root 6、backend 53、client 7、SW 0。
スコープ間の重複があるため合算しない。対応する監査記録は `security-dependency-audit-2026-10-25.json` を参照。
正常系の比較成功を、本番の全データや他実装を含む全連合の互換性の証明として扱わない。
