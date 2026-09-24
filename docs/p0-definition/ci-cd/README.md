# P0 阶段：CI/CD 自动化流水线需求定义

> **功能标识**: `ci-cd`  
> **归属阶段**: P0 需求定义 (Definition)  
> **负责人**: AlkaidSTART  
> **最后更新**: 2026-09-24  

---

## 1. 痛点与背景分析

1. **手工测试与合并风险**：当前本地提交缺乏强制门禁，合并 PR 时易引入格式不规范、静态类型告警或单元测试回归问题。
2. **多端发布成本高**：手动执行 Web 编译并部署至服务器耗时繁琐；Android APK 本地构建依赖开发者机器环境，无法实现版本发布自动化与统一归档。
3. **交付追溯缺失**：缺乏统一的 GitHub Release 资产（APK、Web 包）自动归档机制，版本发布日志不可追溯。

---

## 2. 本期目标 (Goals)

1. **CI 自动化质量门禁**：
   - 监听 `main` 与 `dev` 分支的 Push 和 PR 事件。
   - 严格执行代码格式检查 (`dart format`)、静态分析 (`flutter analyze`) 与单元测试 (`flutter test`)。
   - 收集测试覆盖率产物 (`coverage/lcov.info`) 并归档。
   - 门禁失败阻断分支合入。
2. **CD 持续交付与发布**：
   - **Web 端持续部署**：当代码合并至 `main` 主干分支时，自动构建 Web 生产包并自动化发布到 GitHub Pages。
   - **Android 产物打包**：支持编译 Android Release APK。
   - **版本 Release 自动化**：推送语义化版本标签 (`v*`) 或手动调度 (`workflow_dispatch`) 时，打包 Web 资源与 Android APK 并生成 GitHub Release。

---

## 3. 明确不做的范围 (Non-Goals)

1. **iOS App Store / TestFlight 自动化签名上传**：暂不包含 iOS 证书与 Provisioning Profile 的 CI/CD 自动化（后续在独立阶段引入 fastlane 处理）。
2. **多机真机集群集成测试**：本期不接入 Firebase Test Lab 等云真机设备农场，聚焦单元测试与组件测试。
3. **非官方第三方服务器部署**：暂不配置自定义私有服务器 SSH 镜像发布，统一使用 GitHub 官方生态（Pages & Releases）。

---

## 4. 验收指标 (Acceptance Criteria)

- [ ] 提交 PR 至 `main`/`dev` 时，GitHub Actions 自动触发并反馈 Check 状态。
- [ ] 代码存在任一 `analyze` 警告或未通过测试时，CI 步骤判定为 Failure 并阻止合入。
- [ ] Push 到 `main` 分支触发 Web 端自动构建并成功推送至 GitHub Pages 部署分支。
- [ ] 打 Tag `vX.Y.Z` 时自动生成 Release，包含 `app-release.apk` 与 `web-release.zip` 两个资产包。
