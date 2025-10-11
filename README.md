# yt-buzz-ext

[![CI](https://github.com/charge0315/yt-buzz-ext/actions/workflows/ci.yml/badge.svg)](https://github.com/charge0315/yt-buzz-ext/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

YouTube の「登録チャンネル」を走査し、各チャンネルの直近の動画を集めて
「<チャンネル名> - 最新Movie」プレイリストを作成 or 更新する Chrome 拡張（Manifest V3）です。

プロフェッショナルなアーキテクチャ、包括的なテスト、CI/CD、多言語対応を備えた本格的な Chrome 拡張機能です。

## ✨ 主な機能

- 📺 登録チャンネルごとに、直近の動画を最大 N 件（上限は 50 まで）収集
- 🔄 既存プレイリストがあれば更新（不足の追加・不要の削除・順序整列）、なければ作成
- 🎯 集約プレイリスト: 全チャンネルの最新動画を1つのプレイリストにまとめる
- 🧪 ドライラン: 実際の変更を行わず差分のみ確認
- ⏰ スケジュール実行: Chrome 起動時／毎日 指定時刻
- 📊 リアルタイムプログレス表示とログ確認
- 🌙 ダークモード対応
- 🌍 多言語対応（日本語、英語、中国語、韓国語、フランス語、ドイツ語、スペイン語）

## 🚀 クイックスタート

### 前提条件

- Node.js >= 18.0.0
- npm >= 9.0.0
- Chrome または Chromium ベースのブラウザ

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/charge0315/yt-buzz-ext.git
cd yt-buzz-ext

# 依存関係をインストール
npm install

# 拡張機能をビルド
npm run build
```

### Chrome で読み込む

1. `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `dist/` フォルダを選択

詳細なセットアップ手順は [SETUP.md](SETUP.md) をご覧ください。

## セットアップ（OAuth 2.0）

この拡張は `chrome.identity.getAuthToken` を利用して、ユーザーの Google アカウントで
YouTube Data API にアクセスします。以下の手順で OAuth クライアント ID を準備してください。

1) Google Cloud でプロジェクトを作成し、OAuth 同意画面を設定

- 外部ユーザー（External）で構成し、テストユーザーに自分のアカウントを追加
- スコープに `https://www.googleapis.com/auth/youtube` を追加（フル権限。テスト用途を想定）

2) OAuth クライアント ID を作成

- アプリケーションの種類は「Chrome アプリ」（Chrome 拡張用）を選択
- その際、拡張機能の拡張 ID を登録する必要があります
	- 開発中のアンパック拡張の拡張 ID は、`chrome://extensions` で本拡張を読み込むと確認できます
	- 拡張 ID を固定したい場合は、Manifest に `key` を設定して安定化することもできます

3) `manifest.json` の `oauth2.client_id` をあなたのクライアント ID に置き換え

4) Chrome で拡張を読み込む

- `chrome://extensions` を開き「デベロッパーモード」を ON
- 「パッケージ化されていない拡張機能を読み込む」でこのリポジトリの `yt-buzz-ext/` を指定

補足: 公開配布する場合は、OAuth 同意画面の審査（スコープの検証）や、拡張の公開要件に従ってください。

## 使い方（ポップアップ）

- 拡張アイコンをクリック → ポップアップで以下を設定して「実行」
	- 既存を更新: ON の場合、既存の「<チャンネル名> - 最新Movie」を更新、なければ作成
	- 1チャンネルあたりの上限: 1 ～ 50 の範囲
	- ドライラン: 実際の作成/更新/削除は行わず、ログに予定の操作を出力
- 初回実行時は Google ログインと権限付与の同意が必要です
- 実行中のログはポップアップ下部のログビューに表示されます

## オプション（スケジュール/既定値）

オプションページ（拡張の「詳細」→「拡張機能のオプション」）から、既定の挙動を設定できます。

- 既定の上限・既存更新・ドライランの保存
- Chrome 起動時に自動実行
- 毎日 指定時刻 に自動実行（`chrome.alarms` を使用）
- 「今すぐ実行」ボタン（バックグラウンドで開始）

## 🏗️ アーキテクチャ

プロフェッショナルなモジュール構造で設計されています:

```
src/
├── background/          # バックグラウンドサービスワーカー
│   ├── api.js          # YouTube Data API ラッパー
│   ├── auth.js         # OAuth2 認証管理
│   ├── playlist.js     # プレイリスト操作
│   └── scheduler.js    # スケジューリング
├── utils/              # 共通ユーティリティ
│   ├── cache.js        # 2層キャッシュシステム
│   ├── constants.js    # 定数管理
│   ├── logger.js       # ログ管理（永続化対応）
│   ├── rateLimiter.js  # APIレート制限とクォータ管理
│   └── retry.js        # 指数バックオフリトライ
└── background.new.js   # メインエントリポイント
```

詳細は [ARCHITECTURE.md](ARCHITECTURE.md) をご覧ください。

## 🎯 主要機能

### **高度なエラーハンドリング**
- 指数バックオフによる自動リトライ（403/429/5xx 対象）
- クォータ管理で日次制限を超えないよう制御
- 詳細なエラーログと通知

### **パフォーマンス最適化**
- メモリ＆ストレージの2層キャッシュ
- APIコール数の最小化
- 並行リクエストの制御
- バッチ処理による効率化

### **使いやすいUI**
- リアルタイムプログレス表示
- 色分けされたログビュー
- 成功/エラー通知
- ダークモード自動切替

## パーミッションと理由

- `identity`: Google アカウントでの OAuth トークン取得に必要
- `storage`: ユーザー設定（既定値、スケジュールなど）の保存に必要
- `alarms`: 毎日実行や起動時実行のスケジューリングに使用
- `host_permissions`（googleapis/accounts.google.com）: Google API と認証ページへのアクセスに必要

## 注意点 / クォータ

- YouTube Data API のクォータを消費します。実行頻度・上限を適切に調整してください
- 初回の同意時に「このアプリは確認されていません」等が表示される場合があります（テストユーザー運用中）
- 公開配布する場合は、スコープ検証やポリシー順守が必要です

## トラブルシューティング

- invalid_client / 拡張 ID が一致しない
	- 作成した OAuth クライアントが、現在の拡張 ID と一致しているか確認してください
	- アンパック拡張の ID は `chrome://extensions` で確認可能。ID を固定したい場合は Manifest の `key` を検討
- insufficientPermissions
	- 付与したスコープに `https://www.googleapis.com/auth/youtube` が含まれているか確認
	- いったん Chrome で本拡張のサイトデータ/権限を解除してから再同意すると解決する場合があります
- quotaExceeded / rateLimitExceeded
	- 実行頻度や 1 チャンネルの上限を下げる、ドライランで差分を確認する、時間をおいて再実行する

## 🛠️ 開発

### 開発モード（ウォッチモード）

```bash
npm run dev
```

### テスト

```bash
# すべてのテストを実行
npm test

# ウォッチモード
npm run test:watch

# カバレッジレポート
npm run test:coverage
```

### コード品質

```bash
# リント
npm run lint
npm run lint:fix

# フォーマット
npm run format
npm run format:check
```

### ビルドとパッケージング

```bash
# プロダクションビルド
npm run build

# ZIP パッケージを作成
npm run package
```

## 📚 ドキュメント

- [SETUP.md](SETUP.md) - 詳細なセットアップ手順
- [ARCHITECTURE.md](ARCHITECTURE.md) - アーキテクチャ設計
- [CONTRIBUTING.md](CONTRIBUTING.md) - 貢献ガイドライン
- [CHANGELOG.md](CHANGELOG.md) - 変更履歴
- [IMPROVEMENTS.md](IMPROVEMENTS.md) - 実装された改善項目

## 🧪 テスト

- ユニットテスト（Jest）
- Chrome API モック
- 自動 CI/CD（GitHub Actions）
- カバレッジレポート

## 🌍 国際化

以下の言語に対応しています:

- 🇯🇵 日本語
- 🇺🇸 英語
- 🇨🇳 中国語（簡体字・繁体字）
- 🇰🇷 韓国語
- 🇫🇷 フランス語
- 🇩🇪 ドイツ語
- 🇪🇸 スペイン語

## 🤝 貢献

貢献を歓迎します！詳細は [CONTRIBUTING.md](CONTRIBUTING.md) をご覧ください。

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'feat: add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルをご覧ください。

## 🙏 謝辞

- [YouTube Data API](https://developers.google.com/youtube/v3)
- Chrome Extensions Team
- すべての貢献者の皆様

## 📞 サポート

問題や質問がある場合は、[GitHub Issues](https://github.com/charge0315/yt-buzz-ext/issues) でお知らせください。
