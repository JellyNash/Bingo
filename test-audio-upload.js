// Test audio pack upload functionality
const fs = require('fs');
const AdmZip = require('adm-zip');
const path = require('path');

// Create a test audio pack
function createTestAudioPack() {
  const zip = new AdmZip();

  // Create manifest
  const manifest = {
    packId: "test-lobby-music",
    type: "MUSIC",
    scope: "LOBBY",
    name: "Test Lobby Music",
    description: "Test audio pack for lobby music",
    version: "1.0.0",
    assets: [
      {
        filename: "track1.mp3",
        cueKey: "lobby_track_1",
        duration: 180,
        fileSize: 1024
      },
      {
        filename: "track2.mp3",
        cueKey: "lobby_track_2",
        duration: 240,
        fileSize: 2048
      }
    ]
  };

  // Add manifest to zip
  zip.addFile('audio-pack.json', Buffer.from(JSON.stringify(manifest, null, 2)));

  // Add dummy mp3 files
  zip.addFile('track1.mp3', Buffer.from('dummy mp3 content 1'));
  zip.addFile('track2.mp3', Buffer.from('dummy mp3 content 2'));

  // Save to file
  const outputPath = path.join(__dirname, 'test-audio-pack.zip');
  zip.writeZip(outputPath);

  console.log('Created test audio pack:', outputPath);
  return outputPath;
}

// Test the upload
async function testUpload() {
  const zipPath = createTestAudioPack();

  // Read the file
  const fileBuffer = fs.readFileSync(zipPath);

  // Simulate the upload processing
  const { audioPacksService } = require('./backend/api/src/services/audio-packs.service.js');

  try {
    const result = await audioPacksService.uploadPack({
      filename: 'test-audio-pack.zip',
      mimetype: 'application/zip',
      buffer: fileBuffer
    });

    console.log('Upload result:', result);
  } catch (error) {
    console.error('Upload failed:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  testUpload();
}

module.exports = { createTestAudioPack, testUpload };