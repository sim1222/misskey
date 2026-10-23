# DI移行前の未使用コードの整理

対象は `v12-mod-maintain`。稼働する連合処理やAI機能の有効・無効は変更しない。

`src/remote/activitypub` の6ファイルは、DI移行時に `src/core/remote/activitypub` へ移された実装の古い複製だった。productionソースからの参照はなく、既に削除されている `@/services`、旧モデル名、旧設定モジュールなどを参照していた。現在のプロバイダーは `CoreModule` に登録されている以下のサービスである。

| 整理した旧ファイル | 現在の実装 |
| --- | --- |
| `remote/activitypub/resolver.ts` | `core/remote/activitypub/ApResolverService.ts` |
| `remote/activitypub/models/note.ts` | `core/remote/activitypub/models/ApNoteService.ts` |
| `remote/activitypub/models/person.ts` | `core/remote/activitypub/models/ApPersonService.ts` |
| `remote/activitypub/models/question.ts` | `core/remote/activitypub/models/ApQuestionService.ts` |
| `remote/activitypub/models/mention.ts` | `core/remote/activitypub/models/ApMentionService.ts` |
| `remote/activitypub/kernel/update/index.ts` | `core/remote/activitypub/ApInboxService.ts` |

元の301件の診断のうち120件はこの旧ディレクトリにあった。これらは型定義の追加による解消には数えず、到達不能な複製の削除として区別する。TypeScriptのinclude/excludeを変更して隠す処理や、欠けたモジュールをダミーで置き換える処理は行っていない。

`AiService` は元ブランチでも `CoreModule` の登録がコメントアウトされ、`FileInfoService` からの呼び出しも無効だった。依存するTensorFlow/NSFWモジュールもインストール対象にない。未登録サービスと未使用の判定関数を整理し、既存の検出結果・動画処理は維持した。AI検出の復活はこの変更の対象外。

また、バックエンドの `type FIXME = any` はMFMのテキストノード1箇所でしか使われていなかった。`createTextNode` の実際の戻り値から型を導出し、このグローバルな型逃避口を削除した。

旧 `test/tests`・`test/misc` には移行前モジュールへの参照が残っている。この旧テスト群は作業前からJest実行対象外で、既に失われた他のモジュールにも依存していた。今回のためにテスト設定を変更したり、既存の実行対象テストを削除したりはしていない。現行DI実装の回帰テストは `test/unit/type-api-regressions.ts` に追加する。

元のコードは保護した `v12-mod` とGit履歴に残っている。
