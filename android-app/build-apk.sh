#!/bin/bash
# Збірка APK додатка «Свідомий Вибір» без Gradle:
# aapt2 → javac → d8 → пакування → zipalign → підпис
set -e

BT=/c/android-sdk/build-tools/35.0.0
AJ=/c/android-sdk/platforms/android-35/android.jar
JAVA="/c/Program Files/Eclipse Adoptium/jdk-17.0.20.8-hotspot/bin"
APP=/c/Users/pavlivartem18/.zcode/workspace/default/org-site/android-app
cd "$APP"

rm -rf build
mkdir -p build/gen build/classes build/dex

echo "== 1/6 Ресурси (aapt2)"
"$BT/aapt2.exe" compile --dir app/src/main/res -o build/res.zip
"$BT/aapt2.exe" link -o build/base.apk -I "$AJ" \
  --manifest app/src/main/AndroidManifest.xml \
  --java build/gen \
  --min-sdk-version 24 --target-sdk-version 35 \
  --version-code 1 --version-name 1.0 \
  build/res.zip

echo "== 2/6 Компіляція Java"
find build/gen -name "*.java" > build/sources.txt
find app/src/main/java -name "*.java" >> build/sources.txt
"$JAVA/javac.exe" -source 8 -target 8 -nowarn \
  -classpath "$AJ" \
  -d build/classes @build/sources.txt 2>/dev/null || \
"$JAVA/javac.exe" -classpath "$AJ" -d build/classes @build/sources.txt

echo "== 3/6 DEX (d8)"
cd build/classes
find . -name "*.class" | sed 's|^\./||' > ../classlist.txt
"$JAVA/java.exe" -cp "$BT/lib/d8.jar" com.android.tools.r8.D8 \
  --lib "$AJ" --release --output ../dex $(cat ../classlist.txt | tr '\n' ' ')
cd ../..

echo "== 4/6 Пакування APK"
cd build
"$JAVA/jar.exe" uf base.apk -C dex classes.dex
cd ..

echo "== 5/6 Вирівнювання (zipalign)"
"$BT/zipalign.exe" -f 4 build/base.apk build/aligned.apk

echo "== 6/6 Підпис"
if [ ! -f sv.keystore ]; then
  "$JAVA/keytool.exe" -genkeypair -keystore sv.keystore -alias sv \
    -keyalg RSA -keysize 2048 -validity 10950 \
    -storepass svvybir2026 -keypass svvybir2026 \
    -dname "CN=Svidomyi Vybir, O=Svidomyi Vybir, L=Lviv, C=UA" >/dev/null 2>&1
fi
"$JAVA/java.exe" -cp "$BT/lib/apksigner.jar" com.android.apksigner.ApkSignerTool sign \
  --ks sv.keystore --ks-pass pass:svvybir2026 --key-pass pass:svvybir2026 \
  --out "Свідомий-Вибір.apk" build/aligned.apk

"$JAVA/java.exe" -cp "$BT/lib/apksigner.jar" com.android.apksigner.ApkSignerTool verify "Свідомий-Вибір.apk"
ls -la "Свідомий-Вибір.apk"
echo "APK ГОТОВИЙ"
