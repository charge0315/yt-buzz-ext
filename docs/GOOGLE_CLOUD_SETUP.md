# Google Cloud Setup Guide

## 必要な手順

### 1. Google Cloud Project の作成
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成するか、既存のプロジェクトを選択
3. プロジェクト名を記録

### 2. YouTube Data API v3 の有効化
1. Google Cloud Console で「APIs & Services」→「Library」に移動
2. "YouTube Data API v3" を検索
3. API を有効化

### 3. OAuth 2.0 クライアント ID の作成
1. 「APIs & Services」→「Credentials」に移動
2. 「+ CREATE CREDENTIALS」→「OAuth client ID」をクリック
3. アプリケーションタイプ：「Chrome extension」を選択
4. 名前を入力（例：YouTube Buzz Extension）
5. Extension ID を入力：
   - 開発時：Chrome拡張機能の開発者モードで取得したID
   - 公開時：Chrome Web Storeから取得したID

### 4. クライアント ID の設定
1. `.env.example` を `.env` にコピー
2. `.env` ファイルで `GOOGLE_CLIENT_ID` を実際の値に更新
3. `manifest.json` の `oauth2.client_id` を更新

### 5. Extension ID の取得方法

#### 開発時（Unpacked Extension）
1. Chrome で `chrome://extensions/` を開く
2. 開発者モードを有効化
3. 「Load unpacked」で拡張機能フォルダを読み込み
4. 表示されたExtension IDをコピー

#### 公開時
1. Chrome Web Store Developer Dashboard でExtension IDを確認

## 重要な注意事項

- `.env` ファイルは Git で追跡されません（機密情報のため）
- 開発時と公開時でExtension IDが異なります
- OAuth設定はExtension IDと厳密に紐付けられています
- クライアントIDは公開されても問題ありませんが、Client Secretは秘匿してください

## トラブルシューティング

### "bad client id" エラー
- Client IDが正しく設定されているか確認
- Extension IDがOAuth設定と一致しているか確認
- YouTube Data API v3が有効化されているか確認

### Permission エラー
- manifest.json の permissions と host_permissions を確認
- OAuth scopes が正しく設定されているか確認