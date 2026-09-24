# Changed Files: Core Business Modules

## 新建文件
- `lib/ui/features/quiz/widgets/quiz_option_card.dart`: 刷题选项卡片（含正确微弹与错误轻颤动效）。
- `lib/ui/features/quiz/quiz_view.dart`: 题库答题核心界面（居中限宽 768，折叠官方解析，AI 联动）。
- `lib/ui/features/mistakes/widgets/mistake_card.dart`: 错题卡片组件（消除状态徽标、连对条件、立即重做）。
- `lib/ui/features/mistakes/mistakes_view.dart`: 错题归纳界面（多维筛选栏、攻坚按钮、错题列表）。
- `lib/ui/features/schools/widgets/school_row_item.dart`: 院校报录比条目与历年趋势折叠展示。
- `lib/ui/features/schools/schools_view.dart`: 择校报录界面（组合检索、985/211 标签筛选、报录比表格）。
- `lib/ui/features/flashcards/widgets/flip_card.dart`: 3D 物理翻转背诵卡片（无镜像伪影，景深 0.0012）。
- `lib/ui/features/flashcards/flashcards_view.dart`: 记忆闪卡背诵界面（进度指示器、3D 翻转、评级按键）。
- `test/business_modules_test.dart`: 覆盖四大业务组件的自动化交互测试。

## 修改文件
- `lib/ui/shell/app_shell.dart`: 将真实的四大业务组件挂载至主外壳 5 个导航 Tab 中。
