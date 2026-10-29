/**
 * Direct Android SDK APK Builder (aapt2 + javac + d8 + zipalign + apksigner)
 * Compiles, packages, aligns, and signs con-cual-pago-uy.apk in <5 seconds.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ANDROID_APP = path.join(ROOT, 'android-app', 'app');
const BUILD_DIR = path.join(ANDROID_APP, 'build', 'fast-apk');
const APK_OUT_DIR = path.join(ANDROID_APP, 'build', 'outputs', 'apk', 'debug');

const SDK_DIR = path.join(process.env.LOCALAPPDATA || 'C:\\Users\\m.reboledo\\AppData\\Local', 'Android', 'Sdk');
const BUILD_TOOLS = path.join(SDK_DIR, 'build-tools', '35.0.0');
const ANDROID_JAR = path.join(SDK_DIR, 'platforms', 'android-36', 'android.jar');
const JDK_BIN = 'C:\\Users\\m.reboledo\\.gemini\\antigravity\\brain\\7f5c57d2-46f4-4dbd-8091-0a9e6db5d211\\scratch\\jdk17\\jdk-17.0.20.1+1\\bin';

const AAPT2 = path.join(BUILD_TOOLS, 'aapt2.exe');
const D8 = path.join(BUILD_TOOLS, 'd8.bat');
const ZIPALIGN = path.join(BUILD_TOOLS, 'zipalign.exe');
const APKSIGNER = path.join(BUILD_TOOLS, 'apksigner.bat');
const JAVAC = path.join(JDK_BIN, 'javac.exe');
const JAR = path.join(JDK_BIN, 'jar.exe');
const KEYTOOL = path.join(JDK_BIN, 'keytool.exe');

function ensureCleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function collectFiles(dir, filterFn = () => true) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(collectFiles(full, filterFn));
    } else if (filterFn(full)) {
      results.push(full);
    }
  }
  return results;
}

function main() {
  const startTime = Date.now();
  console.log('=== Building ¿Con Cuál Pago? UY Android APK (SDK 36 / Build-Tools 35.0.0) ===');

  ensureCleanDir(BUILD_DIR);
  fs.mkdirSync(APK_OUT_DIR, { recursive: true });

  const compiledResZip = path.join(BUILD_DIR, 'compiled_res.zip');
  const genJavaDir = path.join(BUILD_DIR, 'gen');
  const classesDir = path.join(BUILD_DIR, 'classes');
  const dexDir = path.join(BUILD_DIR, 'dex');
  fs.mkdirSync(genJavaDir, { recursive: true });
  fs.mkdirSync(classesDir, { recursive: true });
  fs.mkdirSync(dexDir, { recursive: true });

  const env = {
    ...process.env,
    JAVA_HOME: path.dirname(JDK_BIN),
    PATH: `${JDK_BIN};${BUILD_TOOLS};${process.env.PATH}`,
  };

  // 1. Compile Android resources with aapt2
  console.log('[1/6] Compiling resources with aapt2...');
  execFileSync(AAPT2, ['compile', '--dir', path.join(ANDROID_APP, 'src', 'main', 'res'), '-o', compiledResZip], {
    stdio: 'inherit',
    env,
  });

  // 2. Link resources + AndroidManifest.xml + bundled assets/index.html into unaligned APK
  console.log('[2/6] Linking APK & bundling assets/index.html...');
  const unalignedApk = path.join(BUILD_DIR, 'app-unaligned.apk');
  execFileSync(
    AAPT2,
    [
      'link',
      '-I',
      ANDROID_JAR,
      '--manifest',
      path.join(ANDROID_APP, 'src', 'main', 'AndroidManifest.xml'),
      '-A',
      path.join(ANDROID_APP, 'src', 'main', 'assets'),
      '--auto-add-overlay',
      '-R',
      compiledResZip,
      '--java',
      genJavaDir,
      '--custom-package',
      'com.example.concualpagouy',
      '--min-sdk-version',
      '24',
      '--target-sdk-version',
      '36',
      '--version-code',
      '1',
      '--version-name',
      '1.0.0',
      '-o',
      unalignedApk,
    ],
    { stdio: 'inherit', env }
  );

  // 3. Compile Java sources (MainActivity.java + generated R.java)
  console.log('[3/6] Compiling MainActivity.java & R.java (JDK 17)...');
  const rJavaFiles = collectFiles(genJavaDir, (f) => f.endsWith('.java'));
  const mainJava = path.join(ANDROID_APP, 'src', 'main', 'java', 'com', 'example', 'concualpagouy', 'MainActivity.java');
  execFileSync(
    JAVAC,
    ['-source', '11', '-target', '11', '-encoding', 'UTF-8', '-classpath', ANDROID_JAR, '-d', classesDir, mainJava, ...rJavaFiles],
    { stdio: 'inherit', env }
  );

  // 4. Convert .class files to classes.dex using d8
  console.log('[4/6] Compiling Dalvik bytecode (classes.dex) with d8...');
  const classFiles = collectFiles(classesDir, (f) => f.endsWith('.class'));
  execFileSync('cmd.exe', ['/c', D8, '--lib', ANDROID_JAR, '--min-api', '24', '--output', dexDir, ...classFiles], {
    stdio: 'inherit',
    env,
  });

  // Add classes.dex to the APK archive using jar -uf
  execFileSync(JAR, ['uf', unalignedApk, '-C', dexDir, 'classes.dex'], { stdio: 'inherit', env });

  // 5. Align APK with zipalign
  console.log('[5/6] Aligning APK (4-byte boundary) with zipalign...');
  const alignedApk = path.join(BUILD_DIR, 'app-aligned.apk');
  execFileSync(ZIPALIGN, ['-f', '-p', '4', unalignedApk, alignedApk], { stdio: 'inherit', env });

  // 6. Sign APK with apksigner (v1 + v2 + v3 schemes)
  console.log('[6/6] Signing APK with apksigner...');
  const keystorePath = path.join(BUILD_DIR, 'debug.keystore');
  execFileSync(
    KEYTOOL,
    [
      '-genkeypair',
      '-v',
      '-keystore',
      keystorePath,
      '-storepass',
      'android',
      '-alias',
      'androiddebugkey',
      '-keypass',
      'android',
      '-keyalg',
      'RSA',
      '-keysize',
      '2048',
      '-validity',
      '10000',
      '-dname',
      'CN=ConCualPagoUY,O=PrismaUY,C=UY',
    ],
    { stdio: 'ignore', env }
  );

  const rootApk = path.join(ROOT, 'con-cual-pago-uy.apk');
  const gradleApk = path.join(APK_OUT_DIR, 'app-debug.apk');

  execFileSync(
    'cmd.exe',
    [
      '/c',
      APKSIGNER,
      'sign',
      '--ks',
      keystorePath,
      '--ks-pass',
      'pass:android',
      '--key-pass',
      'pass:android',
      '--out',
      rootApk,
      alignedApk,
    ],
    { stdio: 'inherit', env }
  );

  fs.copyFileSync(rootApk, gradleApk);

  // Verify APK signature
  const verifyOut = execFileSync('cmd.exe', ['/c', APKSIGNER, 'verify', '--verbose', rootApk], { env }).toString();
  const sizeBytes = fs.statSync(rootApk).size;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n============================================================');
  console.log(`✓ APK BUILT & SIGNED IN ${elapsed}s`);
  console.log(`  File 1: ${rootApk} (${(sizeBytes / 1024).toFixed(1)} KB)`);
  console.log(`  File 2: ${gradleApk}`);
  console.log(`  Signature: ${verifyOut.split('\n')[0].trim()}`);
  console.log('============================================================');
}

main();
