/**
 * 栖式特调 · 章节注册表
 * 引擎会按顺序加载下列章节。
 * 章节 ID 即文件名（不含后缀）。
 */

window.CHAPTER_ORDER = [
  // —— 序章 ——
  "prologue",

  // —— 共通线 · 一月 ~ 十二月 ——
  "common_01",   // 一月·寒假末
  "common_02",   // 二月·新学期准备
  "chap_03_march", // 三月·巴士站井字棋
  "common_04",   // 四月·晨光特调
  "common_05",   // 五月·粉笔灰与糖纸
  "chap_06_june", // 六月·走廊五子棋
  "common_07",   // 七月·梅雨·薄荷与芦荟
  "chap_08_august", // 八月·游戏厅贪吃蛇
  "common_09",   // 九月·文化祭准备
  "chap_10_october", // 十月·体育祭+错题玫瑰
  "common_11",   // 十一月·初冬
  "common_12",   // 十二月·跨年

  // —— 分岐点 ——
  "common_split",  // 选择四人中的一人进入个人路线

  // —— 个人路线（由分岐点跳转，不按顺序）——
  "route_shiraishi",
  "route_sato",
  "route_saionji",
  "route_mizuno",

  // —— 真终章（所有路线通关后解锁）——
  "finale"
];

/**
 * 章节元信息：供标题画面、章节列表显示
 * bgm 可选：title / daily / sunset / rain
 * bg  可选：bg_indoor_warm / bg_sunset / bg_rain / bg_outdoor_sky1 / bg_outdoor_sky2 / bg_outdoor_sky3 / bg_indoor_close
 */
window.CHAPTER_META = {
  prologue: {
    title: "序章 · 入学式",
    subtitle: "同一张课桌，四种温度。",
    tag: "序章",
    bgm: "礼堂仪式",
    bg: "冬日校门"
  },

  common_01: {
    title: "一月 · 寒假末",
    subtitle: "寒假最后一天，糖盒还没拆封。",
    tag: "一月",
    bgm: "冬日钢琴",
    bg: "教室暖光"
  },

  common_02: {
    title: "二月 · 新学期准备",
    subtitle: "他在笔记最后一页贴了一张糖纸。",
    tag: "二月",
    bgm: "教室安静",
    bg: "教室暖光"
  },

  chap_03_march: {
    title: "三月 · 巴士站的井字棋",
    subtitle: "樱花树下，一颗柠檬糖在石阶上等她。",
    tag: "三月 · 小游戏",
    bgm: "春日樱花",
    bg: "巴士站"
  },

  common_04: {
    title: "四月 · 晨光特调",
    subtitle: "柠檬糖在豆浆里慢慢化开。",
    tag: "四月",
    bgm: "春日樱花",
    bg: "食堂场景"
  },

  common_05: {
    title: "五月 · 粉笔灰与糖纸",
    subtitle: "他挑剔豆浆温度，也挑剔别人帮他擦黑板。",
    tag: "五月",
    bgm: "校园午后",
    bg: "五月粉笔灰"
  },

  chap_06_june: {
    title: "六月 · 走廊里的五子棋",
    subtitle: "输的人请喝一杯豆浆——折糖纸的人不好惹。",
    tag: "六月 · 小游戏",
    bgm: "天台微风",
    bg: "走廊储物柜"
  },

  common_07: {
    title: "七月 · 梅雨 · 薄荷与芦荟",
    subtitle: "数学月考的分数，被折成花。",
    tag: "七月",
    bgm: "雨天窗外",
    bg: "七月梅雨"
  },

  chap_08_august: {
    title: "八月 · 荧光屏的贪吃蛇",
    subtitle: "两台游戏机并排放——十五颗为胜。",
    tag: "八月 · 小游戏",
    bgm: "小游戏有趣",
    bg: "旧游戏机厅"
  },

  common_09: {
    title: "九月 · 文化祭准备",
    subtitle: "四个人第一次一起完成一件事。",
    tag: "九月",
    bgm: "文化祭欢快",
    bg: "九月文化祭"
  },

  chap_10_october: {
    title: "十月 · 体育祭与错题玫瑰",
    subtitle: "答对一题折一朵——纸玫瑰比公式更长久。",
    tag: "十月 · 小游戏",
    bgm: "小游戏挑战",
    bg: "体育祭操场"
  },

  common_11: {
    title: "十一月 · 初冬",
    subtitle: "第一场冷空气，来得比告白早。",
    tag: "十一月",
    bgm: "教室安静",
    bg: "十一月初冬"
  },

  common_12: {
    title: "十二月 · 跨年",
    subtitle: "旧台历最后一页，四个人各自写下一个名字。",
    tag: "十二月",
    bgm: "冬日钢琴",
    bg: "十二月跨年"
  },

  common_split: {
    title: "分岐点 · 四人的四种选择",
    subtitle: "新年后的校门口，四个人等着同一个答案。",
    tag: "分岐",
    bgm: "悬疑紧张",
    bg: "冬日校门"
  },

  route_shiraishi: {
    title: "白石雪乃路线 · 糖度公式",
    subtitle: "她在记事本最后一页写下：林栖 = 45°C + 柠檬糖。",
    tag: "白石雪乃",
    bgm: "校园黄昏",
    bg: "屋顶天台"
  },

  route_sato: {
    title: "佐藤健太路线 · 糖盒归还",
    subtitle: "他把糖盒收了一个学期，一次都没打开过。",
    tag: "佐藤健太",
    bgm: "回忆旧时光",
    bg: "走廊储物柜"
  },

  route_saionji: {
    title: "西园寺凛路线 · 再偏一点",
    subtitle: "伞沿下的十五度，是他能承认的最大温柔。",
    tag: "西园寺凛",
    bgm: "雨天钢琴",
    bg: "雨天校门"
  },

  route_mizuno: {
    title: "水野真理路线 · 验算星星",
    subtitle: "错误不该被答案框住，纸玫瑰比公式更长久。",
    tag: "水野真理",
    bgm: "晚自习安静",
    bg: "教室课桌特写"
  },

  finale: {
    title: "真终章 · 未署名的毕册",
    subtitle: "四种温度，一个人。",
    tag: "真终章",
    bgm: "结局温暖",
    bg: "学校礼堂"
  }
};
