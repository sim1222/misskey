# クライアントの厳密な型検査と依存更新

起点は `a2bf98497eedc02a43c9fcce7d3f58eb169a26cb`、変更先は `v12-mod-maintain`。
`v12-mod`、本番サーバー、既存 DB・ファイルには変更していない。

## 検査する範囲

クライアントの 422 個の Vue SFC と 147 個の TypeScript ソース、Vue テンプレート、サービスワーカーを検査する。
`strict`、`noImplicitAny`、`strictTemplates` を有効にし、型エラーでビルドと CI を失敗させる。
ファイルの除外や `.vue` を `any` とみなす宣言で通していない。

312 個の登録 API の入力スキーマと実際の戻り値、v12 の packed entity、ストリームの送受信内容を定義した。
古い SDK の型が実装と異なる箇所は、このブランチの実装に合わせた型を使用する。SDK 自体の通信処理は変更していない。
モデル・定数・翻訳・保存設定の生成定義は `--check` でソースとのずれを検出する。
フォームの値、props、イベント、ページ情報、ページング、ウィジェットと保存設定も呼び出し先に結び付けた。

正常例がコンパイルできることに加え、不正な API 引数、公開範囲、配列レスポンスの誤用、必須 props の欠落、イベント値、ストリーム送受信、Vue の数値/文字列モデルを **23 個の負例**で検査する。
負例は一時ファイルに作り、実際に診断されることを要求する。production ソースへの `@ts-ignore` 等の追加はない。
既存の動的なスクリプト言語処理などに残るすべての `any` を撤去したという意味ではない。

## 比較と回帰検証

- Node テスト 12 件：フォームの null/false/0、キャンセル、保存設定・プラグイン、下書きの公開範囲、ポーリング日時、ドラッグ後のリスナー解除、SDK の実際の送受信フレームなど。
- Chromium の入力部品比較 12 ケースと、明示的な不具合修正 2 ケース。
- タブ（null 値を含む）、ラジオ選択、日付区切り・広告・アニメーション付き一覧を変更前と比較する 8 ケース。DOM 属性の転送とイベントも比較する。
- Chart.js の line/bar、座標・軸・ツールチップ、ズーム/復元、実際のドラッグによる並べ替えを更新前の `library-baseline.json` と比較する。
- 実アプリのブラウザ検証に、下書き保存→閉じる→再表示、CW の再表示、ハッシュタグ欄の操作と投稿を追加。
- Jest、既存の HTTP/API/DB/ブラウザ/ストリーム回帰比較、3 インスタンスの HTTPS 連合試験も継続する。テスト DB は Postgres 18。

更新前の型修正後には Jest 122 件、検証基盤 23 件、回帰観測 1,604 件が成功した。
回帰観測の既存の期待値は、以下の固定解除スキーマの変更だけを明示的に更新した。
クライアント全行の動作カバレッジや、本番の全データでの互換性を保証するものではない。

## 型検査で判明した動作の不具合

型の適用とは分けて、不具合を修正するコミットを作る。主な修正は次のとおり。

- 投稿の明示的な `initialLocalOnly: false` を保存設定より優先し、値が省略された場合には従来の保存設定を使う。
- 入力部品の focus 公開、パスワード表示切り替え、boolean の autocomplete 値を修正する。通常の入力・数値変換・イベント順序は変更前と比較する。
- native input と Vue コンポーネントの参照を区別し、投稿フォームの自動補完と下書き復元を実際の要素に接続する。
- ページの画像アップロードなどで失敗した Promise を完了させ、失敗後の状態も復元する。絵文字の取得失敗時に null の編集画面を開かない。
- 存在しない配列要素を削除して末尾の要素を失う処理、ドラッグ終了後に残るリスナーを修正する。
- 存在しないリトライ関数、API パスの誤記、Webhook 更新時の ID 欠落を修正する。存在しない `auth/deny` への送信はローカルのキャンセルにする。
- 一覧・アンテナの選択肢と初期値を同じ ID の型にする。タイムラインの未実装だった focus・日付移動と読み込みイベントを接続する。
- URL の変数名衝突、iframe の `heigth` 誤記、投票済みフラグの参照を修正する。
- バックエンドでは `i/update.pinnedPageId` の `null` を許可する。ハンドラーに既存の固定解除処理があるのに、入力スキーマが拒否していた。実 API で固定→解除を確認する。DB マイグレーションはない。

`apiWithDialog` の成功/失敗コールバック、投稿画面を閉じたときのコールバックも呼び出す。
無効な保存設定やプラグインメタデータは、定義した型を検証してから適用する。
不正なプロフィールはサーバーから自動削除せず、適用候補から外して診断を残す。

## 更新した依存

| パッケージ | 変更前 | 変更後 |
| --- | --- | --- |
| chart.js | 4.4.4 | 4.6.1 |
| chartjs-plugin-zoom | 2.0.1 | 2.2.0 |
| sass | 1.79.5 | 1.106.1 |
| vuedraggable | 4.0.1 | 4.1.0 |
| @fortawesome/fontawesome-free | 6.6.0 | 6.7.2 |
| @types/matter-js | 0.19.7 | 0.20.2 |
| @types/katex | 0.16.7 | 0.16.8 |
| typescript | 5.6.3 | 5.9.3 |
| vue-tsc | 2.1.6 | 3.3.13 |
| eslint | 9.12.0 | 9.39.5 |
| @typescript-eslint/parser | 8.8.1 | 8.72.0 |
| @typescript-eslint/eslint-plugin | 8.8.1 | 8.72.0 |
| eslint-plugin-vue | 9.29.0 | 9.33.0 |
| cypress | 13.15.0 | 13.17.0 |
| start-server-and-test | 2.0.8 | 2.1.5 |

型定義がなかったライブラリには対応する型定義を追加した。
Sass の要求する chokidar を古い v3 に固定するクライアントの resolution を外した。
Yarn Classic の npm alias 正規化と frozen install の検証を維持する。

`vuedraggable` の `latest` は Vue 2 用の v2 系を指すため、Vue 3 用 v4 を使う。
Font Awesome 7、Three.js の新しいリリース、Cropper.js の安定版への移行、MFM の独自 fork、AiScript、v12 の SDK は、個別の互換性検証が必要なため一括で変更しない。
ESLint 10 の flat config への移行、Cypress 16 のテスト移行も未実施であり、サポートが終了した開発ツールがすべてなくなったわけではない。
TypeScript は生成器で使うコンパイラ API と設定の互換性も考慮し、今回は 5 系の最新リリースまで更新する。
すべての直接・間接依存が最新になった、または既知の脆弱性がすべて解消したとは主張しない。
更新後の [クライアント依存監査](frontend-dependency-audit-2026-10-24.json) には固有アドバイザリー 7 件（High 2、Moderate 5）が残る。型検査・互換性の成功と、監査残件の解消は別の判定である。

## 再実行

```sh
yarn typecheck:frontend
yarn typecheck:backend
yarn build
yarn test:regression:harness
yarn jest
REGRESSION_CHROMIUM=/usr/bin/chromium yarn test:frontend:inputs
REGRESSION_CHROMIUM=/usr/bin/chromium yarn test:frontend:ui
REGRESSION_CHROMIUM=/usr/bin/chromium yarn test:frontend:libraries
REGRESSION_CHROMIUM=/usr/bin/chromium yarn test:regression
yarn test:federation
```

CI は同じ検査を保守ブランチで必須にし、ブラウザ比較の JSON を `.maintenance-frontend/latest` に保存する。
既存の AntennaService/Redis の実行時エラー 3 件と、調査で判明している LD-signature の問題は、この型検査・依存更新で解決したものとして扱わない。
