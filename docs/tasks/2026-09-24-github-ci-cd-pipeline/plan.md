# 任务计划与决策记录 (Plan & Decisions)

> **任务标识**: `2026-09-24-github-ci-cd-pipeline`  
> **任务主题**: GitHub Actions CI 质量门禁流水线与 CD 持续交付/发版流水线建设  
> **执行日期**: 2026-09-24  
> **状态**: ✅ 已完成  

---

## 1. 任务背景与核心诉求

1. **CI 质量门禁**：
   - 增加代码格式化检查 (`dart format`)、静态代码分析 (`flutter analyze`) 与自动化测试 (`flutter test`)。
   - 统一覆盖 `main` 和 `dev` 分支的提交与 PR 请求，收集测试覆盖率产物。
2. **CD 持续交付与发布**：
   - 支持 Web 端自动打包并部署到 GitHub Pages（主干 `main` 自动上线）。
   - 支持 Android 端编译打包 Release APK。
   - 监听版本 Tag (`v*`) 或手动调度触发，自动化发布 GitHub Release，附带 APK 与 Web 压缩包。
3. **流程合规与研发规范**：
   - 严格按照工程 `CLAUDE.md` 执行 P0~P3 阶段流转。
   - 记录会话级任务与变更文件审计。

---

## 2. 方案与关键决策 (ADR)

1. **CI 门禁规范**：
   - 基于 `ubuntu-latest`，引入 `actions/setup-java@v4` (Java 17 Zulu) 与 `subosito/flutter-action@v2` (channel: stable, cache: true)。
   - 开启并发控制 `cancel-in-progress: true`，减少资源消耗。
   - 遇到任何代码分析警告 (`--fatal-infos`) 即阻断，确保质量底线。
2. **CD 持续交付规范**：
   - 采用 GitHub 官方现代 Pages 部署规范 (`actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4`)。
   - 针对 GitHub Pages 仓库路径配置 `--base-href "/kaoyan_helper/"`。
   - 针对 Tag 发布使用 `softprops/action-gh-release@v2`，自动归档重命名后的清晰资产包 (`kaoyan-helper-vX.Y.Z-android.apk` / `kaoyan-helper-vX.Y.Z-web.zip`)。
3. **文档与归档规范**：
   - P0~P3 四阶段分别创建 `docs/p*-*/ci-cd/` 专属文件夹。
   - 建立任务专属追溯目录 `docs/tasks/2026-09-24-github-ci-cd-pipeline/`。
