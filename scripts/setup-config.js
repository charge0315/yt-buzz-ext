/**
 * Configuration setup script
 * Google Cloud Project設定を読み込み、manifest.jsonを更新します
 */

const fs = require('fs');
const path = require('path');

// .envファイルの読み込み
function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ .envファイルが見つかりません');
    console.log('📝 .env.exampleを.envにコピーして、適切な値を設定してください');
    console.log('詳細: docs/GOOGLE_CLOUD_SETUP.md を参照');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      env[key.trim()] = value.trim();
    }
  });

  return env;
}

// manifest.jsonの更新
function updateManifest(env) {
  const manifestPath = path.join(__dirname, '../manifest.json');
  
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ manifest.jsonが見つかりません');
    process.exit(1);
  }

  let manifestContent = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestContent);

  // Client IDの設定
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_ID !== 'your-client-id.apps.googleusercontent.com') {
    manifest.oauth2.client_id = env.GOOGLE_CLIENT_ID;
    console.log('✅ Google Client ID updated');
  } else {
    console.error('❌ 有効なGOOGLE_CLIENT_IDが設定されていません');
    console.log('📝 .envファイルでGOOGLE_CLIENT_IDを設定してください');
    process.exit(1);
  }

  // manifest.jsonの保存
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('✅ manifest.json updated successfully');
}

// バリデーション
function validateConfig(env) {
  const requiredVars = ['GOOGLE_CLIENT_ID'];
  const missing = requiredVars.filter(variable => !env[variable]);
  
  if (missing.length > 0) {
    console.error(`❌ 必要な環境変数が設定されていません: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Client IDの形式チェック
  if (!env.GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com')) {
    console.error('❌ GOOGLE_CLIENT_IDの形式が正しくありません');
    console.log('正しい形式: xxxxx.apps.googleusercontent.com');
    process.exit(1);
  }
}

// メイン実行
function main() {
  console.log('🔧 Configuration setup starting...');
  
  try {
    const env = loadEnv();
    validateConfig(env);
    updateManifest(env);
    
    console.log('🎉 Configuration setup completed successfully!');
    console.log('次の手順:');
    console.log('1. npm run build でプロジェクトをビルド');
    console.log('2. chrome://extensions/ で拡張機能を読み込み');
    console.log('3. Extension IDを確認してGoogle Cloud Consoleで設定');
    
  } catch (error) {
    console.error('❌ Configuration setup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { loadEnv, updateManifest, validateConfig };