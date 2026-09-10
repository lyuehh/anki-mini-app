---
name: miniapp-multi-end
description: 微信「多端应用」（miniapp）多端能力与真机/模拟器调试参考。当在本 anki 小程序项目中处理 Android / iOS / HarmonyOS 多端差异、真机运行调试、需适配的 API/组件、设备权限或多端打包相关工作时使用。
---

# 微信多端能力（Multi-end / miniapp）

本项目是微信「多端应用」小程序（`project.miniapp.json` 中含 `mini-android` / `mini-ios` / `mini-ohos` 配置），一套代码可运行于 微信小程序、Android、iOS、HarmonyOS。做多端相关改动前先读本技能。

参考官方文档：<https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/miniapp/intro/intro>

## 支持的端

- 微信小程序（原生宿主）
- Android（`mini-android`，独立 App / APK/AAB）
- iOS（`mini-ios`，独立 App / IPA）
- HarmonyOS 鸿蒙（`mini-ohos`，独立 App / hap）

## 一套代码，多端表现

- 目标是「一套代码在多端运行」，但部分 API/组件在不同端行为不同，需做**条件编译或运行时判断**。
- 运行时判断用 `wx.getDeviceInfo()` / `wx.getAppBaseInfo()` 的平台字段区分端；避免硬编码只在某一端成立的假设。
- 需适配的能力主要集中在：登录、媒体选择、文件选择、设备信息、隐私授权、分享等。本项目当前只用到本地存储与 CSV 文件选择（`wx.chooseMessageFile` 类能力），改动这类文件/媒体能力时务必检查多端差异。

## 真机调试（核心流程）

三端流程一致：**用数据线连接真机 → 开发者工具「设备选择栏」刷新并选中设备 → 点击「运行」编译并安装 → 在「调试面板」查看/导出日志。**

- **Android**：手机开启「开发者选项 + USB 调试」；签名见 Android 证书签名管理。
- **iOS**：Mac 直连 / Windows 需装 iTunes+iCloud；开启「开发者模式」；首次运行需配置「证书签名」或「临时签名」，并在「设置 - 通用 - VPN 与设备管理」信任开发者。注意：临时签名以 `com.tencent.devtoolssaaademo.db.*` 构建，**上架前必须改用证书签名重新构建验证**。
- **HarmonyOS**：手机开启「开发者选项 + USB 调试」；注意**图片资源需用绝对路径，相对路径会报错**。

## 模拟器

开发者工具支持安装并运行 Android / iOS / HarmonyOS 模拟器；无真机时可用模拟器验证基础表现，但设备权限、原生插件等能力仍以真机为准。

## 打包

Android → APK/AAB，iOS → IPA（App Store），HarmonyOS → app/hap，可通过开发者工具或 CLI / miniprogram-ci 打包。

## 本项目注意事项

- 本项目功能以本地存储为主，跨端风险最低的是纯 JS 逻辑（`utils/*`）；风险集中在**文件选择/导入 CSV**与任何设备相关 API。
- 新增任何设备/媒体/文件/分享 API 前，先查官方「需适配的 API 汇总」，并在至少一个非微信端（Android/iOS/HarmonyOS）验证。
- HarmonyOS 端如引用图片资源，使用绝对路径。
