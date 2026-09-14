# 楚河棋局 · 中国象棋

手机优先的网页版中国象棋：双人对战 / 简单 AI，可安装为 PWA。

## 本地运行

```bash
# 任意静态服务器均可
python -m http.server 8080
# 浏览器打开 http://localhost:8080
```

或直接双击 `index.html`（无 SW 时也能玩，安装能力需 http 服务）。

## 功能

- 完整中国象棋规则（将帅对脸、蹩马腿、塞象眼、炮翻山、过河兵）
- 双人同屏 / 人机对战（入门 / 普通 / 困难）
- 悔棋、再来一局、深浅色主题
- PWA：浏览器「添加到主屏幕」可离线使用

## 目录

```
index.html      入口
css/style.css   样式
js/chess.js     规则与 AI
js/app.js       界面逻辑
manifest.json   PWA
sw.js           Service Worker
icons/          应用图标
```

## 打包 APK

需要 Android SDK + JDK。项目若含 `android/`（Capacitor），可：

```bash
npx cap sync
cd android && ./gradlew assembleDebug
# 产物: android/app/build/outputs/apk/debug/app-debug.apk
```

## 说明

仅供学习娱乐，请遵守目标平台服务条款。
