const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const DIST_DIR = path.resolve(__dirname, '../dist');
const OUTPUT_FILE = path.resolve(DIST_DIR, 'yt-buzz-ext.zip');

async function packageExtension() {
  console.log('📦 Packaging extension...');

  // Ensure dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ dist directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  // Create output stream
  const output = fs.createWriteStream(OUTPUT_FILE);
  const archive = archiver('zip', {
    zlib: { level: 9 }, // Maximum compression
  });

  // Handle errors
  output.on('error', (err) => {
    console.error('❌ Error writing zip file:', err);
    process.exit(1);
  });

  archive.on('error', (err) => {
    console.error('❌ Error creating archive:', err);
    process.exit(1);
  });

  // Pipe archive to output
  archive.pipe(output);

  // Add files to archive
  archive.directory(DIST_DIR, false, (entry) => {
    // Exclude the zip file itself
    if (entry.name.endsWith('.zip')) {
      return false;
    }
    return entry;
  });

  // Finalize archive
  await archive.finalize();

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      const size = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`✅ Extension packaged successfully!`);
      console.log(`📁 Output: ${OUTPUT_FILE}`);
      console.log(`📊 Size: ${size} MB`);
      resolve();
    });

    output.on('error', reject);
  });
}

// Run if called directly
if (require.main === module) {
  packageExtension().catch((err) => {
    console.error('❌ Packaging failed:', err);
    process.exit(1);
  });
}

module.exports = packageExtension;
