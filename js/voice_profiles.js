/**
 * 栖式特调 · 角色声音配置
 * =============================================================
 * 定义每个角色的打字音效特点
 *
 * 声音参数说明：
 * - frequency: 基频(Hz)，越高声音越清脆/年轻
 * - waveType: 波形
 *   · sine - 正弦波：柔和温暖（适合温柔角色）
 *   · triangle - 三角波：清亮清澈（适合少女/少年）
 *   · square - 方波：厚重有力（适合爽朗/成熟角色）
 *   · sawtooth - 锯齿波：尖锐金属感（少用）
 * - volume: 音量 (0.1 ~ 0.5)
 * - decay: 衰减时间(ms)，越短越干脆
 * - pitchVar: 音高随机变化范围 (±Hz)
 *
 * 打字速度说明：
 * - baseDelay: 基础打字延迟(ms/字)
 * - punctuationDelay: 标点停顿时间配置
 * =============================================================
 */

window.VOICE_PROFILES = {

  // ========== 主要角色 ==========

  "小林栖": {
    frequency: 1100,
    waveType: "sine",
    volume: 0.25,
    decay: 60,
    pitchVar: 80,
    baseDelay: 38,
    description: "7-8岁小男孩，清脆明亮"
  },

  "林栖": {
    frequency: 750,
    waveType: "sine",
    volume: 0.30,
    decay: 70,
    pitchVar: 50,
    baseDelay: 42,
    description: "高中生，沉稳略带沙哑"
  },

  "白石雪乃": {
    frequency: 950,
    waveType: "triangle",
    volume: 0.28,
    decay: 65,
    pitchVar: 70,
    baseDelay: 40,
    description: "清亮柔和，少女感"
  },

  "佐藤健太": {
    frequency: 550,
    waveType: "square",
    volume: 0.32,
    decay: 50,
    pitchVar: 40,
    baseDelay: 35,
    description: "爽朗男声，厚实有力"
  },

  "西园寺凛": {
    frequency: 880,
    waveType: "sine",
    volume: 0.26,
    decay: 75,
    pitchVar: 60,
    baseDelay: 45,
    description: "温柔细腻，略带成熟感"
  },

  "水野真理": {
    frequency: 1000,
    waveType: "triangle",
    volume: 0.27,
    decay: 55,
    pitchVar: 45,
    baseDelay: 38,
    description: "理性冷静，清晰有条理"
  },

  // ========== 次要角色 ==========

  "妈妈": {
    frequency: 650,
    waveType: "sine",
    volume: 0.28,
    decay: 70,
    pitchVar: 40,
    baseDelay: 42,
    description: "温柔成熟女性"
  },

  "小林栖妈妈": {
    frequency: 700,
    waveType: "sine",
    volume: 0.28,
    decay: 70,
    pitchVar: 50,
    baseDelay: 43,
    description: "童年篇的妈妈，温柔慈爱"
  },

  "检票员姐姐": {
    frequency: 900,
    waveType: "triangle",
    volume: 0.30,
    decay: 60,
    pitchVar: 80,
    baseDelay: 35,
    description: "热情活泼的年轻女性"
  },

  "检票员": {
    frequency: 850,
    waveType: "triangle",
    volume: 0.28,
    decay: 60,
    pitchVar: 70,
    baseDelay: 38,
    description: "游乐园检票员"
  },

  "护士": {
    frequency: 920,
    waveType: "sine",
    volume: 0.25,
    decay: 65,
    pitchVar: 50,
    baseDelay: 40,
    description: "温柔护士"
  },

  "童年护士": {
    frequency: 880,
    waveType: "sine",
    volume: 0.25,
    decay: 65,
    pitchVar: 60,
    baseDelay: 40,
    description: "儿童医院温柔护士"
  },

  "店员": {
    frequency: 800,
    waveType: "sine",
    volume: 0.27,
    decay: 60,
    pitchVar: 50,
    baseDelay: 38,
    description: "普通店员"
  },

  "童年街拍师": {
    frequency: 700,
    waveType: "square",
    volume: 0.30,
    decay: 50,
    pitchVar: 60,
    baseDelay: 32,
    description: "爽朗街拍摄影师"
  },

  "街拍师": {
    frequency: 680,
    waveType: "square",
    volume: 0.30,
    decay: 50,
    pitchVar: 60,
    baseDelay: 33,
    description: "街拍摄影师"
  },

  "高桥惠子": {
    frequency: 780,
    waveType: "triangle",
    volume: 0.28,
    decay: 55,
    pitchVar: 40,
    baseDelay: 40,
    description: "老师，成熟稳重"
  },

  "童年外婆": {
    frequency: 580,
    waveType: "sine",
    volume: 0.25,
    decay: 80,
    pitchVar: 30,
    baseDelay: 48,
    description: "慈祥老年女性"
  },

  "童年馆长": {
    frequency: 620,
    waveType: "sine",
    volume: 0.26,
    decay: 75,
    pitchVar: 35,
    baseDelay: 45,
    description: "美术馆白发馆长"
  },

  "馆长": {
    frequency: 600,
    waveType: "sine",
    volume: 0.26,
    decay: 75,
    pitchVar: 35,
    baseDelay: 45,
    description: "美术馆馆长"
  },

  "售货员小哥": {
    frequency: 850,
    waveType: "square",
    volume: 0.28,
    decay: 55,
    pitchVar: 70,
    baseDelay: 35,
    description: "纪念品商店售货员"
  },

  // ========== 旁白/特殊 ==========

  "旁白": {
    frequency: 380,
    waveType: "sine",
    volume: 0.20,
    decay: 100,
    pitchVar: 20,
    baseDelay: 55,
    description: "叙述者，空灵低沉"
  },

  "内心": {
    frequency: 350,
    waveType: "sine",
    volume: 0.18,
    decay: 120,
    pitchVar: 15,
    baseDelay: 60,
    description: "内心独白，更低沉缓慢"
  },

  // ========== NPC/群众 ==========

  "阿姨甲": {
    frequency: 750,
    waveType: "triangle",
    volume: 0.28,
    decay: 55,
    pitchVar: 80,
    baseDelay: 35,
    description: "热情阿姨"
  },

  "阿姨乙": {
    frequency: 780,
    waveType: "triangle",
    volume: 0.27,
    decay: 55,
    pitchVar: 75,
    baseDelay: 36,
    description: "热情阿姨"
  },

  "阿姨丙": {
    frequency: 720,
    waveType: "triangle",
    volume: 0.26,
    decay: 60,
    pitchVar: 70,
    baseDelay: 37,
    description: "温柔阿姨"
  },

  "学生A": {
    frequency: 850,
    waveType: "sine",
    volume: 0.22,
    decay: 50,
    pitchVar: 60,
    baseDelay: 38,
    description: "普通男生"
  },

  "学生B": {
    frequency: 920,
    waveType: "triangle",
    volume: 0.22,
    decay: 50,
    pitchVar: 70,
    baseDelay: 38,
    description: "普通女生"
  },

  "学生C": {
    frequency: 870,
    waveType: "sine",
    volume: 0.22,
    decay: 50,
    pitchVar: 55,
    baseDelay: 38,
    description: "普通学生"
  },

  "低年级学妹": {
    frequency: 1050,
    waveType: "sine",
    volume: 0.24,
    decay: 55,
    pitchVar: 90,
    baseDelay: 36,
    description: "低年级学妹，清脆"
  },

  "豆浆阿姨": {
    frequency: 680,
    waveType: "sine",
    volume: 0.28,
    decay: 60,
    pitchVar: 50,
    baseDelay: 40,
    description: "街边豆浆摊阿姨"
  },

  "食堂阿姨": {
    frequency: 700,
    waveType: "sine",
    volume: 0.28,
    decay: 55,
    pitchVar: 50,
    baseDelay: 38,
    description: "学校食堂阿姨"
  },

  // ========== 默认配置 ==========

  "_default": {
    frequency: 800,
    waveType: "sine",
    volume: 0.25,
    decay: 65,
    pitchVar: 50,
    baseDelay: 40,
    description: "默认声音"
  }
};

/**
 * 标点符号停顿配置
 * =============================================================
 * 在每个标点符号后的额外停顿时间
 * 可根据角色性格微调
 * =============================================================
 */
window.PUNCTUATION_DELAYS = {
  // 句号 - 最长停顿，标志句子结束
  "。": 250,
  "！": 280,
  "？": 280,

  // 逗号 - 中等停顿
  "，": 120,
  "；": 140,
  "：": 100,

  // 省略号 - 最长停顿，营造氛围
  "……": 400,
  "...": 350,

  // 顿号 - 短停顿
  "、": 70,

  // 引号内的停顿略短（对白中引用他人话语时）
  "「": 50,
  "」": 80,
  "『": 50,
  "』": 80,

  // 其他
  "——": 150,  // 破折号
  "-": 60,
  ",": 100,
  "!": 250,
  "?": 250,
  ".": 200,
  ";": 130,
  ":": 90
};

/**
 * 获取角色的声音配置
 * @param {string} speaker - 角色名
 * @returns {object} 声音配置
 */
function getVoiceProfile(speaker) {
  if (!speaker) return VOICE_PROFILES["_default"];
  return VOICE_PROFILES[speaker] || VOICE_PROFILES["_default"];
}

/**
 * 获取标点停顿时间
 * @param {string} char - 标点字符
 * @returns {number} 停顿时间(ms)
 */
function getPunctuationDelay(char) {
  return PUNCTUATION_DELAYS[char] || 0;
}

/**
 * 判断字符是否为标点符号
 * @param {string} char - 单个字符
 * @returns {boolean}
 */
function isPunctuation(char) {
  return PUNCTUATION_DELAYS.hasOwnProperty(char);
}

/**
 * 判断字符是否为中文标点
 * @param {string} char - 单个字符
 * @returns {boolean}
 */
function isChinesePunctuation(char) {
  const chinesePunct = "，。、；：！？……「」『』——''";
  return chinesePunct.indexOf(char) !== -1;
}
