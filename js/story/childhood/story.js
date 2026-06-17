/**
 * 栖式特调 · 童年篇主入口
 * 整合所有童年篇章节脚本，统一提供给引擎
 */

// 童年篇章节数据（合并所有章节的 lines + meta）
window.CHILDHOOD_CHAPTERS = {
  childhood_01: window.CHAPTER_childhood_01,
  childhood_02: window.CHAPTER_childhood_02,
  childhood_03: window.CHAPTER_childhood_03,
  childhood_04: window.CHAPTER_childhood_04,
  childhood_05: window.CHAPTER_childhood_05,
  childhood_end: window.CHAPTER_childhood_end,
  childhood_side01: window.CHAPTER_childhood_side01,
  childhood_side02: window.CHAPTER_childhood_side02,
  childhood_side03: window.CHAPTER_childhood_side03,
  childhood_side04: window.CHAPTER_childhood_side04
};

// 童年篇阅读进度（存储在 localStorage 的独立 key）
window.CHILDHOOD_SAVE_KEY = "qi_shi_te_tiao_childhood_progress";

// 获取童年篇阅读进度
window.getChildhoodProgress = function() {
  try {
    const raw = localStorage.getItem(CHILDHOOD_SAVE_KEY);
    return raw ? JSON.parse(raw) : { chaptersRead: {}, currentChapter: null };
  } catch (e) {
    return { chaptersRead: {}, currentChapter: null };
  }
};

// 保存童年篇阅读进度
window.saveChildhoodProgress = function(progress) {
  try {
    localStorage.setItem(CHILDHOOD_SAVE_KEY, JSON.stringify(progress));
  } catch (e) {}
};

// 标记某章节已读
window.markChildhoodChapterRead = function(chapterId) {
  const progress = getChildhoodProgress();
  progress.chaptersRead[chapterId] = true;
  progress.currentChapter = chapterId;
  saveChildhoodProgress(progress);
};

console.log("童年篇脚本已加载，章节数：" + Object.keys(CHILDHOOD_CHAPTERS).length);
