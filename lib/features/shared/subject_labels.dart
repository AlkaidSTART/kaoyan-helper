/// 学科/题型的本地展示映射；后端为自由字符串，未知值原样返回。
abstract final class SubjectLabels {
  static const _subjects = {
    'politics': '政治',
    'english': '英语',
    'math': '数学',
    'professional': '专业课',
  };

  static const _types = {
    'single_choice': '单选',
    'multi_choice': '多选',
    'fill_blank': '填空',
    'essay': '解答',
  };

  static String subject(String raw) => _subjects[raw] ?? raw;

  static String type(String raw) => _types[raw] ?? raw;
}
