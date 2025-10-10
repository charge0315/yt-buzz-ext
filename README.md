# yt-buzz-ext

YouTube の登録チャンネルから直近の Shorts（<= 61 秒）を集め、
「<チャンネル名> - 最新Shorts」プレイリストを作成/更新する Chrome 拡張（Manifest V3）です。

## セットアップ

1. Google Cloud Console で OAuth 同意画面を設定し、YouTube Data API のスコープを追加
2. Chrome 拡張用 OAuth クライアントを作成し、client_id を取得
3. `manifest.json` の `oauth2.client_id` に発行した client_id を設定
4. Chrome の拡張ページ（chrome://extensions）で「デベロッパーモード」を ON にして `yt-buzz-ext/` を読み込む

## 使い方

- 拡張アイコンをクリック → 「既存を更新」ON/OFF と「上限（1～50）」を設定 → 実行
- 初回は Google ログイン/権限許可を求められます

## 注意

- YouTube Data API のクォータを消費します。実行頻度・上限を適切に制御してください。
- 最小スケルトンのため、商用用途では例外処理・レート制限対策・UI/UX 改善の追加を推奨します。
