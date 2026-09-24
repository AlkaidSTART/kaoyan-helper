# P3 · 质量验证与上线验收 (Verification)

> 阶段目标：严格的静态检查、单元测试、多端兼容性复核与性能度量，达标后方可交付。

---

## 目录结构与规范要求

**每个功能在交付前，必须在此目录下新建专属子文件夹：`<feature-name>/`。**

```
docs/p3-verification/
  ├── auth/               # 认证模块质量验收
  │   └── verification-report.md  # 测试结果、analyze 日志、多端兼容性与体验自查单
  ├── quiz/
  └── ...
```

---

## 验收清单 (Checklist)

1. **静态代码分析**：
   - `flutter analyze` 必须 0 errors, 0 warnings。
2. **测试覆盖**：
   - `flutter test` 全部通过。
   - 核心领域逻辑（如间隔复习算法、报录比趋势折线计算）必须具备用例覆盖。
3. **UI / UX 与动效合规复核**：
   - 检查是否有非系统规范图标或遗留系统 Emoji（全工程严禁）。
   - 检查动效时长是否均 `<= 400ms`。
   - 检查浅色底文字对比度是否达到 WCAG AA（>= 4.5:1）。
4. **多端适配验证**：
   - 移动端（iOS / Android）键盘弹起避让。
   - 桌面端（macOS / Windows / Web）快捷键与 Hover 状态响应。
