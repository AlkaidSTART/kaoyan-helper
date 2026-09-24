# P2 阶段：CI/CD 开发任务拆解与实现决策

> **功能标识**: `ci-cd`  
> **归属阶段**: P2 开发执行 (Development)  
> **负责人**: AlkaidSTART  
> **最后更新**: 2026-09-24  

---

## 1. 原子任务拆解 (Todo List)

- [x] **Task 1: P0 需求定义与 P1 架构设计固化**
  - 完成痛点、目标、触发策略与架构时序文档编制。
- [x] **Task 2: 创建 GitHub Actions CI 质量门禁流水线**
  - 编写 `.github/workflows/ci.yml`。
  - 集成代码格式检查 (`dart format`)、静态分析 (`flutter analyze`)、测试覆盖率提取与归档。
- [x] **Task 3: 创建 GitHub Actions CD 持续交付流水线**
  - 编写 `.github/workflows/cd.yml`。
  - 实现 Web 生产构建与 GitHub Pages 官方部署任务 (`deploy-web`)。
  - 实现 Android Release APK 编译与产物归档任务 (`build-android`)。
  - 实现基于 Tag (`v*`) 的自动化 GitHub Release 发版与资产聚合任务 (`create-release`)。
- [x] **Task 4: 本地预检与工作流配置语法校验**
  - 验证本地 `dart format`、`flutter analyze` 与 `flutter test` 执行状态。
  - 静态检查 YAML 工作流语法结构。
- [x] **Task 5: 完成 P3 质量验证文档与任务追溯审计**
  - 编制 `docs/p3-verification/ci-cd/README.md`。
  - 编制 `docs/tasks/2026-09-24-github-ci-cd-pipeline/` 审计清单与变更文件。
  - 更新 `docs/README.md` 文档中心索引。

---

## 2. 关键开发决策 (Key Implementation Decisions)

1. **版本锁定与缓存机制**：
   - 采用 `subosito/flutter-action@v2`，配置 `channel: 'stable'` 并开启 `cache: true`。不仅缓存 Flutter SDK，同时自动缓存全局 pub-cache，将 CI 执行时间从 5+ 分钟缩减至 1.5 分钟以内。
2. **Web 构建 Base-href 处理**：
   - GitHub Pages 部署默认位于 `https://<owner>.github.io/<repo>/` 路径下，直接使用默认 `/` 会导致静态资源 404。因此 Web 构建参数注入 `--base-href "/kaoyan_helper/"`。
3. **Android APK 产物命名与归档规范**：
   - 构建后产物位于 `build/app/outputs/flutter-apk/app-release.apk`。
   - 上传 Release 资产时明确命名为 `kaoyan-helper-v${tag}-android.apk`，方便用户直接识别下载。
4. **统一采用官方/社区主流 Action v4 标准**：
   - Checkout 采用 `actions/checkout@v4`。
   - Java 环境采用 `actions/setup-java@v4` (Java 17 Zulu)。
   - Pages 部署采用官方 `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4`，符合现代 GitHub Pages 零配置部署标准。
