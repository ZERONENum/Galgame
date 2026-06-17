/* =============================================================
   栖式特调 · 游戏引擎
   -------------------------------------------------------------
   架构：
   - 章节 = 一个独立 JS 文件（js/story/*.js），导出 CHAPTER_xxx 对象
   - 章节注册表 _registry.js 提供章节顺序与 metadata
   - 引擎按顺序推进章节，每章节提供 lines[] 和可选 next / choices / ending
   ============================================================= */

// 音频上下文解锁（浏览器安全策略要求用户交互后才能播放音频）
let audioContext = null;
const unlockAudio = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
};

// =========================================================
// 角色声音合成器（Web Audio API）
// =========================================================
const VoiceSynth = {
  enabled: true,           // 总开关
  volume: 0.8,             // 音量系数
  currentProfile: null,    // 当前角色声音配置
  lastPlayTime: 0,         // 上次播放时间（防止过快）

  /**
   * 播放角色打字音效
   * @param {string} speaker - 角色名
   * @param {number} charIndex - 当前是第几个字（用于音高微调）
   */
  playTypeSound(speaker, charIndex) {
    if (!this.enabled) return;
    if (!audioContext) return;
    if (audioContext.state !== 'running') return;

    // 静默规则：无speaker = 内心独白，旁白/林栖 → 都静音
    // 只有明确的对话角色（如：小林栖、妈妈、白石雪乃等）才播放音效
    if (!speaker) return;
    if (speaker === '旁白' || speaker === '内心' || speaker === '林栖') return;

    // 获取角色声音配置
    const profile = (typeof getVoiceProfile === 'function')
      ? getVoiceProfile(speaker)
      : VOICE_PROFILES._default;

    if (!profile) return;

    // 防止连续触发过快（最小间隔30ms）
    const now = Date.now();
    if (now - this.lastPlayTime < 30) return;
    this.lastPlayTime = now;

    try {
      // 创建振荡器（声音源）
      const oscillator = audioContext.createOscillator();
      // 创建增益节点（控制音量衰减）
      const gainNode = audioContext.createGain();

      // 设置波形
      oscillator.type = profile.waveType || 'sine';

      // 计算音高（基础频率 + 随机微调 + 字符索引微调）
      const pitchVar = profile.pitchVar || 50;
      const charPitchShift = Math.sin(charIndex * 0.5) * (pitchVar * 0.2);
      const randomVar = (Math.random() - 0.5) * pitchVar;
      oscillator.frequency.value = profile.frequency + charPitchShift + randomVar;

      // 设置初始音量
      const volume = (profile.volume || 0.3) * this.volume;
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);

      // 设置衰减（声音逐渐变小）
      const decayTime = (profile.decay || 60) / 1000;
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + decayTime);

      // 连接节点：振荡器 -> 增益 -> 输出
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // 播放声音
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + decayTime);

    } catch (e) {
      // 静默失败，不影响游戏
    }
  },

  /**
   * 切换音效开关
   */
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  },

  /**
   * 设置音量
   * @param {number} vol - 音量 0~1
   */
  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }
};

(() => {

  /* =========================================================
     0. DOM 引用
     ========================================================= */
  const $game = document.getElementById("game");
  const $bg = document.getElementById("bg");
  const $transitionOverlay = document.getElementById("transitionOverlay");
  const $dialogueBox = document.getElementById("dialogueBox");
  const $charLeft = document.getElementById("charLeft");
  const $charCenter = document.getElementById("charCenter");
  const $charRight = document.getElementById("charRight");
  const $tag = document.getElementById("tag");
  const $speaker = document.getElementById("speaker");
  const $text = document.getElementById("text");
  const $nextBtn = document.getElementById("nextBtn");
  const $choices = document.getElementById("choices");
  const $endingScreen = document.getElementById("endingScreen");
  const $endingTitle = document.getElementById("endingTitle");
  const $endingText = document.getElementById("endingText");
  const $endingBonus = document.getElementById("endingBonus");
  const $cgOverlay = document.getElementById("cgOverlay");
  const $cgImage = document.getElementById("cgImage");
  const $cgCaption = document.getElementById("cgCaption");
  const $cgSeqSubtitle = document.getElementById("cgSeqSubtitle");
  const $cgSeqSpeaker = document.getElementById("cgSeqSpeaker");
  const $cgSeqText = document.getElementById("cgSeqText");
  const $titleScreen = document.getElementById("titleScreen");
  const $btnNew = document.getElementById("btnNew");
  const $btnContinue = document.getElementById("btnContinue");
  const $btnChapters = document.getElementById("btnChapters");
  const $btnChildTheater = document.getElementById("btnChildTheater");
  const $btnAbout = document.getElementById("btnAbout");
  const $menuBar = document.getElementById("menuBar");
  const $autoBtn = document.querySelector('[data-action="auto"]');
  const $toast = document.getElementById("toast");
  let $bgmPlayer = document.getElementById("bgmPlayer");

  // 各种 panels
  const $savePanel = document.getElementById("savePanel");
  const $loadPanel = document.getElementById("loadPanel");
  const $chapterPanel = document.getElementById("chapterPanel");
  const $childTheaterPanel = document.getElementById("childTheaterPanel");
  const $galleryPanel = document.getElementById("galleryPanel");
  const $galleryImage = document.getElementById("galleryImage");
  const $galleryImgWrap = document.getElementById("galleryImgWrap");
  const $galleryCaption = document.getElementById("galleryCaption");
  const $galleryPageNum = document.getElementById("galleryPageNum");
  const $galleryLocked = document.getElementById("galleryLocked");
  const $galleryPrev = document.getElementById("galleryPrev");
  const $galleryNext = document.getElementById("galleryNext");
  const $saveSlots = document.getElementById("saveSlots");
  const $loadSlots = document.getElementById("loadSlots");
  const $chapterList = document.getElementById("chapterList");

  // 小游戏相关
  const $miniGamePanel = document.getElementById("miniGamePanel");
  const $mgTitle = document.getElementById("mgTitle");
  const $mgDesc = document.getElementById("mgDesc");
  const $mgOpponent = document.getElementById("mgOpponent");
  const $mgStage = document.getElementById("mgStage");
  const $mgStatus = document.getElementById("mgStatus");
  const $mgButtons = document.getElementById("mgButtons");

  /* =========================================================
     1. 游戏状态
     ========================================================= */
  const state = {
    chapterId: (typeof CHAPTER_ORDER !== "undefined" && CHAPTER_ORDER[0]) || "prologue", // 当前章节
    lineIndex: 0,               // 当前行
    typing: false,              // 是否正在打字
    typingTimer: null,          // 打字机定时器
    currentLineText: "",        // 当前行完整文本
    currentChapter: null,       // 当前章节对象引用
    currentSpeaker: null,       // 当前说话者（用于打字音效）
    bg: null,                   // 当前背景 key
    bgm: null,                  // 当前 bgm key
    characterState: { left: null, center: null, right: null },
    cgShowing: false,
    cgAsBg: null,               // 当前作为背景使用的 CG key（Mode 2: CG当背景）
    cgSeq: null,                // 当前过场动画 CG key（Mode 3: cg_seq）
    routes: {                   // 选择过的路线 id 集合
      shiraishi: false,
      sato: false,
      saionji: false,
      mizuno: false
    },
    chaptersSeen: {},           // 已完成的章节 { chapterId: true }
    hasProgress: false,         // 是否有未读进度（决定"继续游戏"按钮）
    pendingBranch: [],          // 小游戏胜利/失败后的临时对话队列
    playingMiniGame: false,     // 防止重复推进
    autoRead: false,
    autoReadTimer: null,
    isChildhood: false          // 是否在阅读童年篇
  };

  /* =========================================================
     2. Toast 提示
     ========================================================= */
  const showToast = (msg, duration = 1800) => {
    $toast.textContent = msg;
    $toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => $toast.classList.remove("show"), duration);
  };

  /* =========================================================
     3. 资源加载（BGM / 背景 / 立绘 / CG）
     -----------------------------------------------------------
     这些 key 在 assets.js 中注册，例如 ASSETS.bg.bg_indoor_warm
     引擎直接按 key 查找；找不到时静默跳过，保证不报错。
     ========================================================= */
  const imageCache = new Map();
  let bgSwapToken = 0;
  let cgSwapToken = 0;
  let charSwapToken = 0;

  const preloadImage = (url) => {
    if (!url) return Promise.resolve(false);
    if (imageCache.has(url)) return imageCache.get(url);
    const task = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
    imageCache.set(url, task);
    return task;
  };

  const warmVisualAssets = () => {
    if (typeof ASSETS === "undefined") return;
    const urls = [];
    if (ASSETS.bg) urls.push(...Object.values(ASSETS.bg));
    if (ASSETS.cg) urls.push(...Object.values(ASSETS.cg));
    urls.forEach((url, index) => {
      setTimeout(() => preloadImage(url), index * 28);
    });
  };

  const setBG = (key) => {
    if (!key || state.bg === key) return Promise.resolve();
    state.bg = key;
    const token = ++bgSwapToken;
    const url = (typeof ASSETS !== "undefined" && ASSETS.bg && ASSETS.bg[key]) || key;
    if (!url) return Promise.resolve();
    $bg.classList.add("is-changing");
    return preloadImage(url).then((loaded) => {
      if (token !== bgSwapToken || state.bg !== key) return;
      if (loaded) {
        $bg.style.backgroundImage = `url("${url}")`;
      }
      return new Promise((resolve) => {
        requestAnimationFrame(() => {
          if (token !== bgSwapToken || state.bg !== key) return resolve();
          $bg.classList.remove("is-changing");
          $bg.classList.add("has-changed");
          clearTimeout(setBG._zoomTimer);
          setBG._zoomTimer = setTimeout(() => {
            $bg.classList.remove("has-changed");
            resolve();
          }, 720);
        });
      });
    });
  };

  let _bgmFadeTimer = null;       // 当前淡入/淡出定时器
  let _bgmFading = false;         // 是否正在过渡中
  const BGM_TARGET_VOLUME = 0.55; // BGM 目标音量
  
  const setBGM = (key) => {
    if (!key) return;
    // 同一首不重建，确保循环不中断
    if (state.bgm === key && $bgmPlayer) {
      // 如果已经在播放，什么都不做
      if (!$bgmPlayer.paused) return;
      // 如果之前被浏览器策略暂停了，尝试恢复播放
      unlockAudio();
      const p = $bgmPlayer.play();
      if (p && typeof p.then === 'function') {
        p.catch((err) => {
          console.warn("BGM 恢复播放失败:", err.message);
        });
      }
      return;
    }
    
    // 确保音频上下文已解锁
    unlockAudio();
    
    // 取消任何正在进行的淡入/淡出（rAF + setInterval 都要处理）
    if (_bgmFadeTimer) {
      if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(_bgmFadeTimer);
      clearInterval(_bgmFadeTimer);
      _bgmFadeTimer = null;
    }
    _bgmFading = false;
    
    // 如果在播放旧音乐，先淡出再清理（避免切换时撕裂感）
    const oldPlayer = $bgmPlayer;
    state.bgm = key;
    const url = (typeof ASSETS !== "undefined" && ASSETS.bgm && ASSETS.bgm[key]) || key;
    if (!url) return;
    
    try {
      const newPlayer = document.createElement('audio');
      // 关键：先设置属性再设置 src，确保浏览器以正确参数加载
      newPlayer.preload = 'auto';
      newPlayer.loop = true;                 // 声明式循环（大多数浏览器支持）
      newPlayer.volume = 0;                  // 先静音，淡入再出声
      newPlayer.style.display = 'none';
      // cache-bust 避免某些浏览器读取旧缓存时循环失效
      const finalUrl = url + (url.indexOf('?') >= 0 ? '&' : '?') + '_=' + Date.now();
      newPlayer.src = finalUrl;
      document.body.appendChild(newPlayer);
      
      // 循环双保险 1：元数据加载完成后重新确认 loop 并设置时长
      newPlayer.addEventListener('loadedmetadata', () => {
        try {
          newPlayer.loop = true;
          newPlayer.currentTime = 0;
        } catch (e) {}
      }, { once: true });
      
      // 循环双保险 2：ended 事件兜底 —— 如果 loop 失效，手动回到开头
      newPlayer.addEventListener('ended', () => {
        try {
          newPlayer.currentTime = 0;
          newPlayer.play().catch(() => {});
        } catch (e) {}
      });
      
      // 循环双保险 3：timeupdate 检查接近结尾时，重置 currentTime
      // 解决 MP3 编码首尾静音间隙的问题（所有编码器都会添加静音帧）
      let _loopLastResetAt = -1;
      newPlayer.addEventListener('timeupdate', () => {
        try {
          if (!newPlayer.duration || newPlayer.duration < 1.0) return;
          const remaining = newPlayer.duration - newPlayer.currentTime;
          // 到达最后 0.15 秒内，且距离上次重置至少 1 秒才触发
          if (remaining < 0.15 && (Date.now() - _loopLastResetAt) > 1000) {
            _loopLastResetAt = Date.now();
            newPlayer.currentTime = 0.03;
          }
        } catch (e) {}
      });
      
      // 加载失败时输出清晰日志
      newPlayer.addEventListener('error', (e) => {
        console.warn("BGM 加载失败:", url, newPlayer.error ? newPlayer.error.code : '');
      }, { once: true });
      
      $bgmPlayer = newPlayer;
      
      // 先淡出旧音乐，再播放新音乐 —— 避免切换时的音量突变
      const startNewBGM = () => {
        newPlayer.load();
        const p = newPlayer.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            // 平滑淡入：用 requestAnimationFrame 做指数式淡入，比 setInterval 更自然
            const fadeStart = performance.now();
            const fadeDuration = 1200; // 1.2 秒淡入
            _bgmFading = true;
            const fadeIn = (now) => {
              const progress = Math.min(1, (now - fadeStart) / fadeDuration);
              // easeOutCubic：开头快，结尾慢
              const eased = 1 - Math.pow(1 - progress, 3);
              try { newPlayer.volume = BGM_TARGET_VOLUME * eased; } catch (e) {}
              if (progress < 1 && newPlayer.parentNode) {
                _bgmFadeTimer = requestAnimationFrame(fadeIn);
              } else {
                try { newPlayer.volume = BGM_TARGET_VOLUME; } catch (e) {}
                _bgmFading = false;
                _bgmFadeTimer = null;
              }
            };
            _bgmFadeTimer = requestAnimationFrame(fadeIn);
          }).catch((err) => {
            console.warn("BGM 播放失败（浏览器策略，需要用户交互后才会播放）:", err.message);
          });
        }
      };
      
      // 旧音乐淡出（800ms）后启动新音乐
      if (oldPlayer && !oldPlayer.paused && oldPlayer.volume > 0) {
        const fadeOutStart = performance.now();
        const fadeOutDuration = 800;
        const startVol = oldPlayer.volume;
        const fadeOut = (now) => {
          const progress = Math.min(1, (now - fadeOutStart) / fadeOutDuration);
          const eased = 1 - Math.pow(1 - progress, 2);
          try { oldPlayer.volume = Math.max(0, startVol * (1 - eased)); } catch (e) {}
          if (progress < 1 && oldPlayer.parentNode) {
            requestAnimationFrame(fadeOut);
          } else {
            // 淡出完成：停止并清理旧播放器
            try {
              oldPlayer.pause();
              oldPlayer.volume = 0;
              oldPlayer.src = '';
              while (oldPlayer.firstChild) oldPlayer.removeChild(oldPlayer.firstChild);
              try { oldPlayer.remove(); } catch (e) {}
            } catch (e) {}
            startNewBGM();
          }
        };
        requestAnimationFrame(fadeOut);
      } else {
        // 没有旧音乐，直接启动
        if (oldPlayer) {
          try {
            oldPlayer.pause();
            oldPlayer.src = '';
            try { oldPlayer.remove(); } catch (e) {}
          } catch (e) {}
        }
        startNewBGM();
      }
    } catch (e) {
      console.warn("BGM 设置错误:", e.message);
    }
  };

  const setChar = (pos, key) => {
    if (!pos) return;
    const map = { left: $charLeft, center: $charCenter, right: $charRight };
    const el = map[pos];
    if (!el) return;
    // 每次调用都更新 token，包括 key=null 的情况，确保旧回调不会误触发
    const token = ++charSwapToken;
    el.dataset.charToken = String(token);
    state.characterState[pos] = key || null;
    if (!key) {
      el.classList.remove("show");
      // 延迟清空 src，让淡出动画完成后再移除，避免残留
      setTimeout(() => {
        if (Number(el.dataset.charToken) !== token) return;
        if (state.characterState[pos]) return;
        el.removeAttribute("src");
      }, 750);
      return;
    }
    const url = (typeof ASSETS !== "undefined" && ASSETS.char && ASSETS.char[key]) || key;
    if (!url) return;
    const tmp = new Image();
    tmp.onload = () => {
      if (Number(el.dataset.charToken) !== token || state.characterState[pos] !== key) return;
      el.src = url;
      el.classList.add("show");
    };
    tmp.onerror = () => {
      if (Number(el.dataset.charToken) !== token || state.characterState[pos] !== key) return;
    };
    tmp.src = url;
  };

  const clearChars = () => {
    setChar("left", null);
    setChar("center", null);
    setChar("right", null);
  };

  // 设置整组角色：除明确指定的位置外，其他位置自动清空，避免残留旧角色
  // char: {} 表示"清空所有位置的角色"
  // char: { left: "xxx" } 表示"设置 left 角色，清空其他位置"
  const setCharGroup = (charObj) => {
    if (!charObj) return;
    // 先清空其他位置，再设置指定位置，确保不会同时显示两个角色
    ["left", "center", "right"].forEach((pos) => {
      if (charObj[pos] === undefined && state.characterState[pos]) {
        setChar(pos, null);
      }
    });
    // 设置指定位置
    if (charObj.left !== undefined && charObj.left !== null) setChar("left", charObj.left);
    if (charObj.center !== undefined && charObj.center !== null) setChar("center", charObj.center);
    if (charObj.right !== undefined && charObj.right !== null) setChar("right", charObj.right);
  };

  // showCG: 显示一张 CG 照片（图片预加载 + 淡入，彻底消除闪烁）
  //   hasText = true  → 这一行同时有文字 → CG 作为背景装饰
  //   hasText = false → 这一行只有 CG → 全屏展示，2 秒后自动推进
  const CG_MIN_DISPLAY = 2000;         // 纯 CG 最小展示时间
  const CG_FADE_IN = 500;              // CG 层淡入时长（与 CSS 0.5s 对应）
  let _cgSetAt = 0;                    // CG 设置时间戳
  let _cgIsStandalone = false;         // 当前 CG 是否为"纯 CG 模式"
  let _cgAdvanceTimer = null;          // 纯 CG 模式下自动推进定时器
  let _cgHideTimer = null;             // CG 淡出后清理定时器

  const showCG = (key, caption, opts) => {
    const hasText = opts && opts.hasText === true;
    _cgIsStandalone = !hasText;
    state.cgShowing = true;
    _cgSetAt = Date.now();

    // 清理旧定时器
    if (_cgAdvanceTimer) { clearTimeout(_cgAdvanceTimer); _cgAdvanceTimer = null; }
    if (_cgHideTimer)    { clearTimeout(_cgHideTimer); _cgHideTimer = null; }

    // 对话框显隐控制
    if ($dialogueBox) {
      if (_cgIsStandalone) {
        $dialogueBox.classList.add("cg-hidden");
        $cgOverlay.classList.remove("has-text");
      } else {
        $dialogueBox.classList.remove("cg-hidden");
        $cgOverlay.classList.add("has-text");
      }
    }

    // caption 文本
    $cgCaption.textContent = caption || "";

    // 核心：先预加载图片 → 加载完成后设置 src → 然后淡入
    const cgUrl = (typeof ASSETS !== "undefined" && ASSETS.cg && ASSETS.cg[key]) || null;

    const doShow = (imageUrl) => {
      if (!state.cgShowing) return;
      // 设置图像 src
      if (imageUrl) {
        $cgImage.src = imageUrl;
        $cgImage.style.display = "";
      } else {
        $cgImage.style.display = "none";
      }
      // 下一帧：启动 overlay 淡入 + 图片 loaded 标记
      requestAnimationFrame(() => {
        if (!state.cgShowing) return;
        $cgOverlay.classList.add("show");
        if (imageUrl) $cgImage.classList.add("loaded");
      });
      // 纯 CG 模式自动推进
      if (_cgIsStandalone && state.autoRead) {
        _cgAdvanceTimer = setTimeout(() => {
          _cgAdvanceTimer = null;
          if (state.cgShowing && state.autoRead) advance();
        }, CG_MIN_DISPLAY);
      }
    };

    if (cgUrl) {
      preloadImage(cgUrl).then((loaded) => {
        if (loaded) doShow(cgUrl);
        else doShow(null);
      });
    } else {
      doShow(null);
      if (key) console.warn("CG 资源未注册:", key);
    }
  };

  // hideCG: 淡出 CG 照片（先淡出再清理，避免突然消失）
  const hideCG = () => {
    if (!state.cgShowing) return;
    state.cgShowing = false;
    _cgIsStandalone = false;
    // 清理定时器
    if (_cgAdvanceTimer) { clearTimeout(_cgAdvanceTimer); _cgAdvanceTimer = null; }
    // 淡出动画
    $cgOverlay.classList.remove("show");
    $cgOverlay.classList.add("hiding");
    if ($cgImage) $cgImage.classList.remove("loaded");
    if ($dialogueBox) $dialogueBox.classList.remove("cg-hidden");
    if ($cgOverlay) $cgOverlay.classList.remove("has-text");
    // 淡出完成后清理底层资源
    if (_cgHideTimer) clearTimeout(_cgHideTimer);
    _cgHideTimer = setTimeout(() => {
      _cgHideTimer = null;
      $cgOverlay.classList.remove("hiding");
      // 最后清空图像（避免闪烁）
      setTimeout(() => {
        $cgImage.removeAttribute("src");
        $cgImage.style.display = "none";
      }, 0);
    }, CG_FADE_IN);
  };

  // ===== CG Mode 2: 将 CG 图作为背景使用 =====
  // - 如果同行有 text，进入持续的文本叙述。
  const CG_BG_REVEAL_DELAY = 2500;    // 纯 CG 画面停留 2.5 秒
  let _cgBgRevealTimer = null;

  // 带文本的 CG 背景：对话框立即显示（透明背景 + 文字），文字叠加在 CG 画面之上
  // 不带文本的 CG 背景：纯 CG 过场阶段，对话框隐藏一段时间后再推进下一行
  //   opts.noReveal: true 表示同行有文字，直接进入文本模式；false 表示纯 CG 过场
  const setCGAsBG = (cgKey, opts) => {
    if (!cgKey) return;
    const url = (typeof ASSETS !== "undefined" && ASSETS.cg && ASSETS.cg[cgKey]) || null;
    if (!url) return;
    state.cgAsBg = cgKey;
    // 同时隐藏 CG 弹窗
    hideCG();
    // CG 本身已包含人物关系，隐藏所有人物立绘
    clearChars();
    // 设置为背景
    $bg.style.backgroundImage = `url("${url}")`;
    $bg.classList.add("has-changed");
    clearTimeout(setBG._zoomTimer);
    // 是否有同行文字？
    const hasText = opts && opts.noReveal === true;
    // 清理旧定时器
    if (_cgBgRevealTimer) { clearTimeout(_cgBgRevealTimer); _cgBgRevealTimer = null; }
    if (hasText) {
      // 有同行文字：对话框立即显示（透明背景 + 文字）
      $dialogueBox.classList.add("cg-bg-mode");
      $dialogueBox.classList.remove("cg-bg-reveal");
    } else {
      // 纯 CG 过场阶段：隐藏对话框
      $dialogueBox.classList.add("cg-bg-mode", "cg-bg-reveal");
      // 如果是自动播放模式，CG_BG_REVEAL_DELAY 后自动推进
      if (state.autoRead) {
        _cgBgRevealTimer = setTimeout(() => {
          _cgBgRevealTimer = null;
          // 检查：仍在过场阶段且自动播放
          if (state.cgAsBg && state.autoRead && $dialogueBox.classList.contains("cg-bg-reveal")) {
            $dialogueBox.classList.remove("cg-bg-reveal");
            advance();
          }
        }, CG_BG_REVEAL_DELAY);
      }
    }
  };

  const hideCGAsBG = () => {
    if (!state.cgAsBg) return;
    state.cgAsBg = null;
    clearTimeout(_cgBgRevealTimer);
    // 恢复对话框为不透明
    $dialogueBox.classList.remove("cg-bg-mode", "cg-bg-reveal");
    // 恢复之前的背景
    if (state.bg) {
      const url = (typeof ASSETS !== "undefined" && ASSETS.bg && ASSETS.bg[state.bg]) || state.bg;
      if (url) {
        $bg.style.backgroundImage = `url("${url}")`;
      }
    }
  };

  // ===== CG Mode 3: 过场动画序列（CG全屏 + 字幕叠加）=====
  let _cgSeqSetAt = 0;               // CG 设置时间戳，用于最小显示时间
  let _cgSeqAdvanceTimer = null;     // cg_seq 模式下自动推进定时器
  const CG_SEQ_MIN_DISPLAY = 1200;   // 每张 CG 最少显示 1.2 秒

  const setCGSeq = (cgKey) => {
    if (!cgKey) return;
    const url = (typeof ASSETS !== "undefined" && ASSETS.cg && ASSETS.cg[cgKey]) || null;
    if (!url) return;
    state.cgSeq = cgKey;
    _cgSeqSetAt = Date.now();
    // 清理旧定时器
    if (_cgSeqAdvanceTimer) { clearTimeout(_cgSeqAdvanceTimer); _cgSeqAdvanceTimer = null; }
    // 先退出其他 CG 模式
    hideCG();
    hideCGAsBG();
    clearChars(); // 过场动画时隐藏人物立绘，避免残留在 CG 上面
    // CG 设为全屏背景（带暗转过渡：先暗再淡入）
    $bg.classList.remove("has-changed");
    $bg.classList.add("cg-seq-fade");
    // 强制回流，确保暗态立即生效
    void $bg.offsetWidth;
    // 换图
    $bg.style.backgroundImage = `url("${url}")`;
    // 下一帧触发淡入过渡
    requestAnimationFrame(() => {
      $bg.classList.add("has-changed");
    });
    clearTimeout(setBG._zoomTimer);
    // 隐藏对话框，显示字幕层
    $dialogueBox.classList.add("cg-seq-mode");
    $cgSeqSubtitle.classList.add("show");
    // 添加过场边框
    $bg.classList.add("cg-seq-mode");
    // 自动播放模式下：CG_SEQ_MIN_DISPLAY 后自动推进到下一张
    if (state.autoRead) {
      _cgSeqAdvanceTimer = setTimeout(() => {
        _cgSeqAdvanceTimer = null;
        if (state.cgSeq && state.autoRead) advance();
      }, CG_SEQ_MIN_DISPLAY);
    }
  };

  const hideCGSeq = () => {
    if (!state.cgSeq) return;
    state.cgSeq = null;
    _cgSeqSetAt = 0;
    if (_cgSeqAdvanceTimer) { clearTimeout(_cgSeqAdvanceTimer); _cgSeqAdvanceTimer = null; }
    // 隐藏字幕层
    $cgSeqSubtitle.classList.remove("show");
    $cgSeqSpeaker.textContent = "";
    $cgSeqText.textContent = "";
    // 恢复对话框
    $dialogueBox.classList.remove("cg-seq-mode");
    // 移除 CG 过渡类
    $bg.classList.remove("cg-seq-fade", "has-changed", "cg-seq-mode");
    // 恢复之前的背景
    if (state.bg) {
      const url = (typeof ASSETS !== "undefined" && ASSETS.bg && ASSETS.bg[state.bg]) || state.bg;
      if (url) {
        $bg.style.backgroundImage = `url("${url}")`;
      }
    }
  };

  // ===== 播放一次性音效（不报错，找不到文件就静默）=====
  const playSFX = (key) => {
    try {
      const url = (typeof ASSETS !== "undefined" && ASSETS.sfx && ASSETS.sfx[key]) || null;
      if (!url) return;
      const audio = new Audio(url);
      audio.volume = 0.5;
      const p = audio.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (e) {}
  };

  /* =========================================================
     3.5 小游戏系统（井字棋 / 五子棋 / 贪吃蛇）
     -----------------------------------------------------------
     行内指令：
       {
         mini_game: { type: "ttt"|"gomoku"|"snake",
                       title, desc,
                       opponent, opponent_line,
                       win_threshold, time_limit }
         onWin: [ ...lines ],
         onLose: [ ...lines ],
         onDraw: [ ...lines ]  // 仅井字棋
       }
     游戏结束后，引擎会根据胜负结果跳转到 onWin / onLose / onDraw，
     再继续回到主线推进。
     ========================================================= */
  let mgActive = false;       // 是否有小游戏正在进行
  let mgDoneCallback = null;   // 完成回调

  const openMiniGame = (config, onDone) => {
    mgActive = true;
    mgDoneCallback = onDone;
    $miniGamePanel.classList.add("show");
    $mgTitle.textContent = config.title || "小游戏";
    $mgDesc.textContent = config.desc || "";

    // 对手信息
    if (config.opponent) {
      $mgOpponent.innerHTML =
        '<div class="mg-avatar"></div>' +
        '<div class="mg-opponent-name">' + config.opponent + '</div>' +
        (config.opponent_line ? '<div class="mg-opponent-line">「' + config.opponent_line + '」</div>' : '');
    } else {
      $mgOpponent.innerHTML = "";
    }

    // 清空舞台
    $mgStage.innerHTML = "";
    $mgStatus.textContent = "";
    $mgButtons.innerHTML = "";

    // 根据类型启动
    const t = config.type;
    if (t === "ttt") startTTT(config);
    else if (t === "gomoku") startGomoku(config);
    else if (t === "snake") startSnake(config);
    else if (t === "memory") startMemory(config);
    else if (t === "2048") start2048(config);
    else if (t === "minesweeper") startMinesweeper(config);
    else if (t === "whack") startWhack(config);
    else if (t === "sudoku") startSudoku(config);
    else if (t === "ghost") startGhost(config);
    else {
      $mgStatus.textContent = "未知游戏类型：" + t;
    }
  };

  const finishMiniGame = (result, config) => {
    mgActive = false;
    // 播放音效
    if (result === "win") playSFX("小游戏胜利");
    else if (result === "lose") playSFX("小游戏失败");
    // 2 秒后关闭面板并执行回调
    setTimeout(() => {
      $miniGamePanel.classList.remove("show");
      if (typeof mgDoneCallback === "function") mgDoneCallback(result, config);
    }, 1400);
  };

  // ===== 井字棋（AI 策略：先找自己赢的，再堵对方，中心/角/边；放水模式下随机落子）=====
  const startTTT = (config) => {
    const SIZE = 3;
    let board = Array(SIZE * SIZE).fill(null);
    let turn = "X"; // 玩家 X，AI O
    let finished = false;
    let holdback = false; // 放水模式

    const boardEl = document.createElement("div");
    boardEl.className = "ttt-board";
    $mgStage.appendChild(boardEl);

    const cells = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
      const c = document.createElement("div");
      c.className = "ttt-cell";
      c.dataset.i = i;
      c.addEventListener("click", () => {
        if (finished || turn !== "X" || board[i]) return;
        makeMove(i, "X");
      });
      boardEl.appendChild(c);
      cells.push(c);
    }

    $mgStatus.textContent = "你是 X，先出手。";

    // 放水按钮：让 AI 变弱，方便赢
    const hbBtn = document.createElement("button");
    hbBtn.className = "mg-btn mg-btn-holdback";
    hbBtn.textContent = "放水";
    hbBtn.title = "让对手变弱（点击后开启/关闭）";
    hbBtn.onclick = () => {
      if (finished) return;
      holdback = !holdback;
      if (holdback) {
        hbBtn.classList.add("active");
        hbBtn.textContent = "放水中";
        $mgStatus.textContent = "放水模式：对手将变得粗心。";
      } else {
        hbBtn.classList.remove("active");
        hbBtn.textContent = "放水";
        $mgStatus.textContent = "关闭放水，回到正常难度。";
      }
    };
    $mgButtons.appendChild(hbBtn);

    const mkBtn = document.createElement("button");
    mkBtn.className = "mg-btn";
    mkBtn.textContent = "认输";
    mkBtn.onclick = () => { if (!finished) finishMiniGame("lose", config); };
    $mgButtons.appendChild(mkBtn);

    function makeMove(i, who) {
      if (board[i]) return;
      board[i] = who;
      const cell = cells[i];
      cell.textContent = who;
      cell.classList.add("ttt-filled", who === "X" ? "ttt-x" : "ttt-o");
      playSFX("棋子落");

      const w = checkTTTWin(board, who);
      if (w) {
        w.forEach((idx) => cells[idx].classList.add("ttt-win"));
        finished = true;
        $mgStatus.textContent = (who === "X" ? "你赢了！" : "对手赢了……");
        setTimeout(() => finishMiniGame(who === "X" ? "win" : "lose", config), 900);
        return;
      }
      if (board.every((x) => x)) {
        finished = true;
        $mgStatus.textContent = "平局。";
        setTimeout(() => finishMiniGame("draw", config), 900);
        return;
      }
      turn = (who === "X") ? "O" : "X";
      $mgStatus.textContent = (turn === "X") ? "轮到你了（X）。" : "对手思考中……";
      if (turn === "O") setTimeout(aiMove, 400);
    }

    function aiMove() {
      let best;
      if (holdback) {
        // 放水：
        // - 不主动找自己赢点（或很低概率）
        // - 不堵对方（或很低概率）
        // - 优先走边角外围，留中心和关键位置给玩家
        const empty = [];
        for (let i = 0; i < 9; i++) if (!board[i]) empty.push(i);
        if (empty.length === 0) return;
        // 25% 概率随机；60% 概率走非关键位置；15% 概率正常 AI
        const roll = Math.random();
        if (roll < 0.25) {
          best = empty[Math.floor(Math.random() * empty.length)];
        } else if (roll < 0.85) {
          // 优先走非关键位置：避免堵对方，避免走自己的赢点
          const ai = "O", human = "X";
          // 收集非堵非赢的"安全"走法
          const safe = empty.filter((i) => {
            const copyWin = board.slice(); copyWin[i] = ai;
            if (checkTTTWin(copyWin, ai)) return false; // 自己能赢的也不赢
            const copyBlock = board.slice(); copyBlock[i] = human;
            if (checkTTTWin(copyBlock, human)) return false; // 不堵
            return true;
          });
          if (safe.length) {
            best = safe[Math.floor(Math.random() * safe.length)];
          } else {
            best = empty[Math.floor(Math.random() * empty.length)];
          }
        } else {
          best = tttAIPick(board, "O");
        }
      } else {
        best = tttAIPick(board, "O");
      }
      makeMove(best, "O");
    }
  };

  const checkTTTWin = (board, who) => {
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
    for (const l of lines) {
      if (l.every((i) => board[i] === who)) return l;
    }
    return null;
  };

  const tttAIPick = (board, ai) => {
    const human = ai === "O" ? "X" : "O";
    // 1) 自己能赢？
    for (let i = 0; i < 9; i++) if (!board[i]) {
      const copy = board.slice(); copy[i] = ai;
      if (checkTTTWin(copy, ai)) return i;
    }
    // 2) 堵对方赢
    for (let i = 0; i < 9; i++) if (!board[i]) {
      const copy = board.slice(); copy[i] = human;
      if (checkTTTWin(copy, human)) return i;
    }
    // 3) 中心
    if (!board[4]) return 4;
    // 4) 角
    const corners = [0,2,6,8].filter((i) => !board[i]);
    if (corners.length) return corners[Math.floor(Math.random()*corners.length)];
    // 5) 边
    const edges = [1,3,5,7].filter((i) => !board[i]);
    if (edges.length) return edges[Math.floor(Math.random()*edges.length)];
    return 0;
  };

  // ===== 五子棋（13x13，简单评估 AI；放水模式下变弱）=====
  const startGomoku = (config) => {
    const SIZE = 13;
    let board = Array(SIZE * SIZE).fill(null); // "black"(玩家) / "white"(AI)
    let turn = "black";
    let finished = false;
    let lastMove = -1;
    let holdback = false; // 放水模式

    const boardEl = document.createElement("div");
    boardEl.className = "gomoku-board";
    $mgStage.appendChild(boardEl);

    const cells = [];
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x;
        const c = document.createElement("div");
        c.className = "gomoku-cell";
        if (y === 0) c.classList.add("edge-top");
        if (y === SIZE-1) c.classList.add("edge-bottom");
        if (x === 0) c.classList.add("edge-left");
        if (x === SIZE-1) c.classList.add("edge-right");
        c.addEventListener("click", () => {
          if (finished || turn !== "black" || board[idx]) return;
          place(idx, "black");
        });
        boardEl.appendChild(c);
        cells.push(c);
      }
    }

    // 显示目标：五子连珠
    $mgStatus.textContent = "你是黑子，先下。连成 5 子即胜利。";

    // 放水按钮
    const hbBtn = document.createElement("button");
    hbBtn.className = "mg-btn mg-btn-holdback";
    hbBtn.textContent = "放水";
    hbBtn.title = "让对手变弱（点击后开启/关闭）";
    hbBtn.onclick = () => {
      if (finished) return;
      holdback = !holdback;
      if (holdback) {
        hbBtn.classList.add("active");
        hbBtn.textContent = "放水中";
        $mgStatus.textContent = "放水模式：对手将忽视威胁、乱下。";
      } else {
        hbBtn.classList.remove("active");
        hbBtn.textContent = "放水";
        $mgStatus.textContent = "关闭放水，回到正常难度。";
      }
    };
    $mgButtons.appendChild(hbBtn);

    const quitBtn = document.createElement("button");
    quitBtn.className = "mg-btn";
    quitBtn.textContent = "认输";
    quitBtn.onclick = () => { if (!finished) finishMiniGame("lose", config); };
    $mgButtons.appendChild(quitBtn);

    function place(idx, who) {
      if (board[idx]) return;
      board[idx] = who;
      const cell = cells[idx];
      const stone = document.createElement("div");
      stone.className = "gomoku-stone " + who;
      cell.appendChild(stone);
      playSFX("棋子落");
      lastMove = idx;

      const w = checkGomokuWin(SIZE, board, idx, who);
      if (w) {
        w.forEach((i) => {
          const st = cells[i].querySelector(".gomoku-stone");
          if (st) st.classList.add("win");
        });
        finished = true;
        $mgStatus.textContent = (who === "black" ? "连成 5 子！你赢了！" : "对手连成 5 子……");
        setTimeout(() => finishMiniGame(who === "black" ? "win" : "lose", config), 1200);
        return;
      }
      if (board.every((x) => x)) {
        finished = true;
        $mgStatus.textContent = "棋盘下满——平局。";
        setTimeout(() => finishMiniGame("draw", config), 1000);
        return;
      }
      turn = (who === "black") ? "white" : "black";
      $mgStatus.textContent = (turn === "black") ? "轮到你落子（黑）。" : "对手思考中……（白）";
      if (turn === "white") setTimeout(aiPlace, 350);
    }

    function aiPlace() {
      let bestIdx;
      if (holdback) {
        // 放水：大幅降低进攻与防守权重
        // 30% 概率随机；50% 概率评估时将自己分数减半且不防守；20% 正常
        const roll = Math.random();
        if (roll < 0.3) {
          const empty = [];
          for (let i = 0; i < SIZE*SIZE; i++) if (!board[i]) empty.push(i);
          if (empty.length === 0) return;
          // 限定在已有棋子附近 2 格（避免下太偏）
          const candidates = new Set();
          for (const i of empty) {
            const cx = i % SIZE, cy = Math.floor(i / SIZE);
            let near = false;
            for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2 && !near; dx++) {
              const nx = cx+dx, ny = cy+dy;
              if (nx>=0&&nx<SIZE&&ny>=0&&ny<SIZE && board[ny*SIZE+nx]) near = true;
            }
            if (near) candidates.add(i);
          }
          const pool = candidates.size > 0 ? Array.from(candidates) : empty;
          bestIdx = pool[Math.floor(Math.random()*pool.length)];
        } else if (roll < 0.8) {
          // 弱化评估：降低自己进攻分，并忽略对手威胁
          const candidates = new Set();
          for (let i = 0; i < SIZE*SIZE; i++) {
            if (board[i]) {
              const cx = i % SIZE, cy = Math.floor(i / SIZE);
              for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
                const nx = cx+dx, ny = cy+dy;
                if (nx>=0&&nx<SIZE&&ny>=0&&ny<SIZE && !board[ny*SIZE+nx]) candidates.add(ny*SIZE+nx);
              }
            }
          }
          if (candidates.size === 0) candidates.add(Math.floor(SIZE/2)*SIZE+Math.floor(SIZE/2));
          let bestScore = -Infinity;
          candidates.forEach((i) => {
            // 大幅降低自己进攻权重，完全忽视对手威胁（不防守）
            const s = gomokuScore(SIZE, board, i, "white") * 0.2 + gomokuScore(SIZE, board, i, "black") * 0.05;
            const noise = Math.random() * 15;
            if ((s + noise) > bestScore) { bestScore = s + noise; bestIdx = i; }
          });
        } else {
          bestIdx = normalAI();
        }
      } else {
        bestIdx = normalAI();
      }
      place(bestIdx, "white");
    }

    function normalAI() {
      // 简单启发式：评估每个空位给自己 + 给对方的威胁程度，取最大
      let bestScore = -Infinity;
      let bi = -1;
      const candidates = new Set();
      for (let i = 0; i < SIZE*SIZE; i++) {
        if (board[i]) {
          const cx = i % SIZE, cy = Math.floor(i / SIZE);
          for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
            const nx = cx+dx, ny = cy+dy;
            if (nx>=0&&nx<SIZE&&ny>=0&&ny<SIZE && !board[ny*SIZE+nx]) candidates.add(ny*SIZE+nx);
          }
        }
      }
      if (candidates.size === 0) candidates.add(Math.floor(SIZE/2)*SIZE+Math.floor(SIZE/2));
      candidates.forEach((i) => {
        const s = gomokuScore(SIZE, board, i, "white") + gomokuScore(SIZE, board, i, "black") * 0.85;
        if (s > bestScore) { bestScore = s; bi = i; }
      });
      return bi;
    }
  };

  const checkGomokuWin = (SIZE, board, idx, who) => {
    const cx = idx % SIZE, cy = Math.floor(idx / SIZE);
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    for (const [dx, dy] of dirs) {
      const line = [idx];
      for (let step = 1; step < 5; step++) {
        const nx = cx + dx*step, ny = cy + dy*step;
        if (nx<0||nx>=SIZE||ny<0||ny>=SIZE) break;
        if (board[ny*SIZE+nx] !== who) break;
        line.push(ny*SIZE+nx);
      }
      for (let step = 1; step < 5; step++) {
        const nx = cx - dx*step, ny = cy - dy*step;
        if (nx<0||nx>=SIZE||ny<0||ny>=SIZE) break;
        if (board[ny*SIZE+nx] !== who) break;
        line.push(ny*SIZE+nx);
      }
      if (line.length >= 5) return line;
    }
    return null;
  };

  const gomokuScore = (SIZE, board, idx, who) => {
    // 评估「如果在 idx 位置放上 who 的棋子，在各方向形成的连子威胁」
    const cx = idx % SIZE, cy = Math.floor(idx / SIZE);
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    let total = 0;
    for (const [dx, dy] of dirs) {
      let count = 1, openEnds = 0;
      // 前向
      let blockedFront = false;
      for (let step = 1; step < 5; step++) {
        const nx = cx+dx*step, ny = cy+dy*step;
        if (nx<0||nx>=SIZE||ny<0||ny>=SIZE) { blockedFront = true; break; }
        const v = board[ny*SIZE+nx];
        if (v === who) count++;
        else if (!v) { openEnds++; break; }
        else { blockedFront = true; break; }
      }
      // 后向
      let blockedBack = false;
      for (let step = 1; step < 5; step++) {
        const nx = cx-dx*step, ny = cy-dy*step;
        if (nx<0||nx>=SIZE||ny<0||ny>=SIZE) { blockedBack = true; break; }
        const v = board[ny*SIZE+nx];
        if (v === who) count++;
        else if (!v) { openEnds++; break; }
        else { blockedBack = true; break; }
      }
      if (count >= 5) total += 100000;
      else if (count === 4 && openEnds >= 2) total += 10000;
      else if (count === 4 && openEnds === 1) total += 1000;
      else if (count === 3 && openEnds >= 2) total += 800;
      else if (count === 3 && openEnds === 1) total += 80;
      else if (count === 2 && openEnds >= 2) total += 40;
      else if (count === 2 && openEnds === 1) total += 10;
      else total += count;
    }
    // 轻微随机，避免 AI 每局一样
    return total + Math.random() * 5;
  };

  // ===== 贪吃蛇（WASD / 方向键；达到目标分数视为胜，撞墙自撞视为负）=====
  let snakeState = null; // 当前贪吃蛇状态（给键盘监听用）

  const startSnake = (config) => {
    const W = 22, H = 14;
    const target = (config && config.win_threshold) || 10;
    let snake = [{x:Math.floor(W/2), y:Math.floor(H/2)}];
    let dir = {x:1, y:0};
    let nextDir = {x:1, y:0};
    let food = spawnFood(W, H, snake);
    let timer = null;
    let finished = false;
    let score = 0;

    const stage = document.createElement("div");
    stage.className = "snake-stage";
    const infoEl = document.createElement("div");
    infoEl.className = "snake-info";
    infoEl.innerHTML = '<span>分数：<b id="snakeScore">0</b> / ' + target + '</span>';
    stage.appendChild(infoEl);

    // 方向控制外壳：上/下/左/右 四个边缘区域
    const ctrlEl = document.createElement("div");
    ctrlEl.className = "snake-ctrl";

    const zoneUp = document.createElement("div");
    zoneUp.className = "snake-zone zone-up";
    zoneUp.innerHTML = '<span>▲</span>';

    const zoneLeft = document.createElement("div");
    zoneLeft.className = "snake-zone zone-left";
    zoneLeft.innerHTML = '<span>◀</span>';

    const zoneRight = document.createElement("div");
    zoneRight.className = "snake-zone zone-right";
    zoneRight.innerHTML = '<span>▶</span>';

    const zoneDown = document.createElement("div");
    zoneDown.className = "snake-zone zone-down";
    zoneDown.innerHTML = '<span>▼</span>';

    // 中央棋盘
    const boardEl = document.createElement("div");
    boardEl.className = "snake-board";
    for (let i = 0; i < W*H; i++) {
      const c = document.createElement("div");
      c.className = "snake-cell";
      boardEl.appendChild(c);
    }

    ctrlEl.appendChild(zoneUp);
    ctrlEl.appendChild(zoneLeft);
    ctrlEl.appendChild(boardEl);
    ctrlEl.appendChild(zoneRight);
    ctrlEl.appendChild(zoneDown);
    stage.appendChild(ctrlEl);

    const hint = document.createElement("div");
    hint.className = "snake-hint";
    hint.textContent = "点击棋盘四周的箭头 / 方向键 / WASD 控制";
    stage.appendChild(hint);

    $mgStage.appendChild(stage);

    const scoreEl = document.getElementById("snakeScore");
    const cells = boardEl.querySelectorAll(".snake-cell");

    // 方向变更函数（边缘区域点击）
    const setDir = (nd) => { nextDir = nd; };
    zoneUp.addEventListener("click", (e) => { e.stopPropagation(); setDir({x:0,y:-1}); });
    zoneDown.addEventListener("click", (e) => { e.stopPropagation(); setDir({x:0,y:1}); });
    zoneLeft.addEventListener("click", (e) => { e.stopPropagation(); setDir({x:-1,y:0}); });
    zoneRight.addEventListener("click", (e) => { e.stopPropagation(); setDir({x:1,y:0}); });

    // 触摸滑动支持：在棋盘上滑动也能改方向
    let touchStart = null;
    boardEl.addEventListener("touchstart", (e) => {
      const t = e.changedTouches[0];
      touchStart = { x: t.clientX, y: t.clientY };
    }, { passive: true });
    boardEl.addEventListener("touchend", (e) => {
      if (!touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        setDir({ x: dx > 0 ? 1 : -1, y: 0 });
      } else {
        setDir({ x: 0, y: dy > 0 ? 1 : -1 });
      }
      touchStart = null;
    }, { passive: true });

    const quitBtn = document.createElement("button");
    quitBtn.className = "mg-btn";
    quitBtn.textContent = "认输";
    quitBtn.onclick = () => { if (!finished) end("lose"); };
    $mgButtons.appendChild(quitBtn);

    $mgStatus.textContent = "准备开始……";
    snakeState = { W, H, setDir: (nd) => { nextDir = nd; } };

    const render = () => {
      cells.forEach((c) => { c.className = "snake-cell"; });
      snake.forEach((seg, i) => {
        const cell = cells[seg.y * W + seg.x];
        if (cell) cell.classList.add(i === 0 ? "snake-head" : "snake");
      });
      const fc = cells[food.y * W + food.x];
      if (fc) fc.classList.add("food");
    };

    function end(result) {
      if (finished) return;
      finished = true;
      clearInterval(timer);
      if (result === "win") {
        $mgStatus.textContent = "胜利！你吃到了 " + target + " 颗食物。";
      } else {
        $mgStatus.textContent = "撞到了！失败，分数：" + score;
      }
      setTimeout(() => finishMiniGame(result, config), 1100);
    }

    const tick = () => {
      if (finished) return;
      // 不允许 180 度反向
      if (nextDir.x !== -dir.x || nextDir.y !== -dir.y) dir = nextDir;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.x >= W || head.y < 0 || head.y >= H) {
        playSFX("贪吃蛇撞墙"); end("lose"); return;
      }
      if (snake.some((s) => s.x === head.x && s.y === head.y)) {
        playSFX("贪吃蛇撞墙"); end("lose"); return;
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score++;
        if (scoreEl) scoreEl.textContent = score;
        playSFX("贪吃蛇吃果");
        if (score >= target) { render(); end("win"); return; }
        food = spawnFood(W, H, snake);
      } else {
        snake.pop();
      }
      render();
    };

    render();
    $mgStatus.textContent = "开始！目标：" + target + " 颗食物。";
    timer = setInterval(tick, 160);
  };

  // ===== 翻牌记忆（4x4，16 张 / 8 对，30 秒或翻完即判定）=====
  const startMemory = (config) => {
    const ROWS = 4, COLS = 4;
    const icons = ["🌙","🌸","🍋","🌊","⭐","🗼","🍀","🐱"];
    const pairs = icons.concat(icons).slice(0, ROWS * COLS);
    for (let i = pairs.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [pairs[i],pairs[j]] = [pairs[j],pairs[i]]; }
    let revealed = Array(ROWS*COLS).fill(false);
    let matched = Array(ROWS*COLS).fill(false);
    let selection = [];
    let matchedCount = 0;
    let moves = 0;
    let finished = false;
    const winPairs = (config && config.win_threshold) || 7; // 至少完成 7 对为胜

    const stage = document.createElement("div");
    stage.className = "memory-stage";
    const info = document.createElement("div"); info.className = "memory-info";
    info.innerHTML = '<span>完成 <b>' + winPairs + '</b> 对为胜</span> <span id="memoryMoves" style="margin-left:20px;">步数：0</span>';
    stage.appendChild(info);
    const board = document.createElement("div"); board.className = "memory-board";
    for (let i = 0; i < ROWS*COLS; i++) {
      const c = document.createElement("div");
      c.className = "memory-card";
      c.dataset.i = i;
      c.textContent = pairs[i];
      c.addEventListener("click", () => {
        if (finished || matched[i] || revealed[i] || selection.length >= 2) return;
        playSFX("翻牌");
        revealed[i] = true;
        c.classList.add("show");
        selection.push(i);
        if (selection.length === 2) {
          moves++;
          const m1 = document.getElementById("memoryMoves"); if (m1) m1.textContent = "步数：" + moves;
          const [a, b] = selection;
          if (pairs[a] === pairs[b]) {
            playSFX("翻牌匹配");
            setTimeout(() => {
              matched[a] = true; matched[b] = true; matchedCount++;
              const cells2 = board.querySelectorAll(".memory-card");
              cells2[a].classList.add("matched"); cells2[b].classList.add("matched");
              selection = [];
              if (matchedCount >= winPairs) { $mgStatus.textContent = "胜！你完成了 " + matchedCount + " 对。"; finishMiniGame("win", config); finished = true; }
              else if (matchedCount === ROWS*COLS/2) { $mgStatus.textContent = "全部翻开！"; finishMiniGame("win", config); finished = true; }
            }, 400);
          } else {
            playSFX("翻牌不匹配");
            setTimeout(() => {
              revealed[a] = false; revealed[b] = false;
              const cells2 = board.querySelectorAll(".memory-card");
              cells2[a].classList.remove("show"); cells2[b].classList.remove("show");
              selection = [];
              // 步数太多判负
              if (moves > ROWS*COLS) {
                $mgStatus.textContent = "步数超过了……"; finishMiniGame("lose", config); finished = true;
              }
            }, 700);
          }
        }
      });
      board.appendChild(c);
    }
    stage.appendChild(board);
    $mgStage.appendChild(stage);
    $mgStatus.textContent = "翻开两张相同的牌即可配对。";
    const qBtn = document.createElement("button"); qBtn.className = "mg-btn"; qBtn.textContent = "认输";
    qBtn.onclick = () => { if (!finished) finishMiniGame("lose", config); finished = true; };
    $mgButtons.appendChild(qBtn);
  };

  // ===== 2048（4x4，合出 1024 为胜）=====
  const start2048 = (config) => {
    const SIZE = 4;
    let grid = Array(SIZE).fill(null).map(() => Array(SIZE).fill(0));
    let score = 0;
    let finished = false;
    const WIN = 1024;

    const stage = document.createElement("div");
    stage.className = "g2048-stage";
    const info = document.createElement("div"); info.className = "g2048-info";
    info.innerHTML = '<span>达到 <b>' + WIN + '</b> 为胜</span> <span id="g2048Score" style="margin-left:20px;">当前：2</span>';
    stage.appendChild(info);

    const board = document.createElement("div"); board.className = "g2048-board";
    for (let i = 0; i < SIZE*SIZE; i++) {
      const c = document.createElement("div"); c.className = "g2048-cell"; board.appendChild(c);
    }
    stage.appendChild(board);
    const hint = document.createElement("div"); hint.className = "g2048-hint";
    hint.textContent = "方向键 / WASD 移动，相同数字合并。";
    stage.appendChild(hint);
    $mgStage.appendChild(stage);

    const qBtn = document.createElement("button"); qBtn.className = "mg-btn"; qBtn.textContent = "认输";
    qBtn.onclick = () => { if (!finished) { finished = true; finishMiniGame("lose", config); } };
    $mgButtons.appendChild(qBtn);

    const addRandom = () => {
      const empty = [];
      for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (!grid[y][x]) empty.push({x,y});
      if (empty.length) { const {x, y} = empty[Math.floor(Math.random()*empty.length)]; grid[y][x] = Math.random() < 0.9 ? 2 : 4; }
    };
    const render = () => {
      const cells = board.querySelectorAll(".g2048-cell");
      for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        const c = cells[y*SIZE+x]; const v = grid[y][x];
        c.textContent = v ? v : "";
        c.className = "g2048-cell" + (v ? " g2048-filled g2048-lv" + Math.min(10, Math.floor(Math.log2(v))) : "");
      }
      const se = document.getElementById("g2048Score"); if (se) se.textContent = "当前：" + score;
    };
    const slide = (row) => {
      const nz = row.filter(v => v);
      for (let i = 0; i < nz.length - 1; i++) {
        if (nz[i] === nz[i+1]) {
          nz[i] *= 2; score = Math.max(score, nz[i]);
          nz.splice(i+1, 1);
          playSFX("2048合并");
        }
      }
      while (nz.length < SIZE) nz.push(0); return nz;
    };
    const move = (dir) => {
      const before = JSON.stringify(grid);
      if (dir === "left") for (let y = 0; y < SIZE; y++) grid[y] = slide(grid[y]);
      else if (dir === "right") for (let y = 0; y < SIZE; y++) grid[y] = slide(grid[y].slice().reverse()).reverse();
      else if (dir === "up") for (let x = 0; x < SIZE; x++) { let col = grid.map(r => r[x]); col = slide(col); for (let y = 0; y < SIZE; y++) grid[y][x] = col[y]; }
      else if (dir === "down") for (let x = 0; x < SIZE; x++) { let col = grid.map(r => r[x]).reverse(); col = slide(col).reverse(); for (let y = 0; y < SIZE; y++) grid[y][x] = col[y]; }
      return before !== JSON.stringify(grid);
    };
    const canMove = () => {
      for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        if (!grid[y][x]) return true;
        if (x+1 < SIZE && grid[y][x] === grid[y][x+1]) return true;
        if (y+1 < SIZE && grid[y][x] === grid[y+1][x]) return true;
      }
      return false;
    };
    const onKey = (e) => {
      if (finished) return;
      const k = e.key.toLowerCase();
      let d = null;
      if (k === "arrowup" || k === "w") d = "up";
      else if (k === "arrowdown" || k === "s") d = "down";
      else if (k === "arrowleft" || k === "a") d = "left";
      else if (k === "arrowright" || k === "d") d = "right";
      if (!d) return;
      e.preventDefault();
      if (move(d)) { playSFX("2048移动"); addRandom(); render();
        if (score >= WIN) { finished = true; $mgStatus.textContent = "合出 " + WIN + "！胜利。"; setTimeout(() => finishMiniGame("win", config), 500); return; }
        if (!canMove()) { finished = true; $mgStatus.textContent = "无法继续，失败。"; setTimeout(() => finishMiniGame("lose", config), 500); return; }
      }
    };
    addRandom(); addRandom(); render();
    g2048State = { onKey };
    if (!g2048KeyRegistered) { document.addEventListener("keydown", g2048KeyHandler); g2048KeyRegistered = true; }
    $mgStatus.textContent = "合出 " + WIN + " 即为胜利。";
  };
  let g2048State = null;
  let g2048KeyRegistered = false;
  const g2048KeyHandler = (e) => { if (g2048State && typeof g2048State.onKey === "function") g2048State.onKey(e); };

  // ===== 扫雷（8x8，10 颗雷，全部翻开即胜）=====
  const startMinesweeper = (config) => {
    const W = 8, H = 8, MINES = 10;
    let revealed = Array(W*H).fill(false);
    let flagged = Array(W*H).fill(false);
    let mineAt = Array(W*H).fill(false);
    const mines = [];
    while (mines.length < MINES) { const p = Math.floor(Math.random()*W*H); if (!mineAt[p]) { mineAt[p] = true; mines.push(p); } }
    let finished = false;
    const numbers = Array(W*H).fill(0);
    for (let p = 0; p < W*H; p++) {
      if (mineAt[p]) continue;
      const x = p % W, y = Math.floor(p / W);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x+dx, ny = y+dy;
        if (nx>=0&&nx<W&&ny>=0&&ny<H && mineAt[ny*W+nx]) numbers[p]++;
      }
    }

    const stage = document.createElement("div"); stage.className = "mine-stage";
    const info = document.createElement("div"); info.className = "mine-info";
    info.innerHTML = '<span>雷数 <b>' + MINES + '</b>，翻开所有非雷即胜</span>';
    stage.appendChild(info);
    const board = document.createElement("div"); board.className = "mine-board";
    for (let i = 0; i < W*H; i++) {
      const c = document.createElement("div"); c.className = "mine-cell";
      c.dataset.i = i;
      c.addEventListener("click", (e) => { if (e.shiftKey || e.ctrlKey) toggleFlag(i); else revealCell(i); });
      c.addEventListener("contextmenu", (e) => { e.preventDefault(); toggleFlag(i); });
      board.appendChild(c);
    }
    stage.appendChild(board);
    const hint2 = document.createElement("div"); hint2.className = "mine-hint";
    hint2.textContent = "点击翻开；右键 / Shift+点击 插旗。";
    stage.appendChild(hint2);
    $mgStage.appendChild(stage);

    const qBtn2 = document.createElement("button"); qBtn2.className = "mg-btn"; qBtn2.textContent = "认输";
    qBtn2.onclick = () => { if (!finished) { finished = true; finishMiniGame("lose", config); } };
    $mgButtons.appendChild(qBtn2);

    const cells = board.querySelectorAll(".mine-cell");
    const toggleFlag = (i) => {
      if (finished || revealed[i]) return;
      flagged[i] = !flagged[i];
      cells[i].textContent = flagged[i] ? "🚩" : "";
      cells[i].classList.toggle("flagged", flagged[i]);
      playSFX("扫雷插旗");
    };
    const revealCell = (i) => {
      if (finished || revealed[i] || flagged[i]) return;
      revealed[i] = true;
      const c = cells[i];
      if (mineAt[i]) {
        playSFX("扫雷爆炸"); c.classList.add("exploded"); c.textContent = "💥";
        // 显示所有雷
        for (let p = 0; p < W*H; p++) if (mineAt[p]) { cells[p].textContent = "💣"; cells[p].classList.add("mine"); }
        finished = true; $mgStatus.textContent = "踩到雷了……"; setTimeout(() => finishMiniGame("lose", config), 700);
        return;
      }
      playSFX("扫雷翻开");
      c.classList.add("revealed");
      if (numbers[i] > 0) { c.textContent = numbers[i]; c.classList.add("num" + numbers[i]); }
      else {
        // 0 展开
        const stack = [i];
        while (stack.length) {
          const p = stack.pop();
          const x = p % W, y = Math.floor(p / W);
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x+dx, ny = y+dy;
            if (nx>=0&&nx<W&&ny>=0&&ny<H) {
              const np = ny*W+nx;
              if (!revealed[np] && !flagged[np]) {
                revealed[np] = true;
                cells[np].classList.add("revealed");
                if (numbers[np] > 0) { cells[np].textContent = numbers[np]; cells[np].classList.add("num" + numbers[np]); }
                else { cells[np].textContent = ""; stack.push(np); }
              }
            }
          }
        }
      }
      // 胜利判定
      let ok = true;
      for (let p = 0; p < W*H; p++) if (!mineAt[p] && !revealed[p]) { ok = false; break; }
      if (ok) {
        finished = true;
        $mgStatus.textContent = "全部安全翻开！胜利。";
        setTimeout(() => finishMiniGame("win", config), 500);
      }
    };
    $mgStatus.textContent = "小心雷！左键翻开，右键插旗。";
  };

  // ===== 打地鼠（3x3，30 秒内击中 15 个为胜）=====
  const startWhack = (config) => {
    const W = 3, H = 3;
    const target = (config && config.win_threshold) || 15;
    let hits = 0, missed = 0;
    let finished = false;
    const timeLimit = 25000; // 25 秒
    let activeHole = -1;
    let popTimer = null, hideTimer = null, gameTimer = null;

    const stage = document.createElement("div"); stage.className = "whack-stage";
    const info = document.createElement("div"); info.className = "whack-info";
    info.innerHTML = '<span id="whackHits">击中：0 / ' + target + '</span> <span id="whackTime" style="margin-left:20px;">时间：25 秒</span>';
    stage.appendChild(info);
    const board = document.createElement("div"); board.className = "whack-board";
    const cells3 = [];
    for (let i = 0; i < W*H; i++) {
      const c = document.createElement("div"); c.className = "whack-hole";
      c.addEventListener("click", () => {
        if (finished) return;
        if (i === activeHole) {
          hits++;
          playSFX("打地鼠击中");
          c.classList.add("hit");
          setTimeout(() => c.classList.remove("hit"), 150);
          const h2 = document.getElementById("whackHits"); if (h2) h2.textContent = "击中：" + hits + " / " + target;
          activeHole = -1;
          if (hits >= target) { finish(); }
        } else {
          playSFX("click");
        }
      });
      board.appendChild(c); cells3.push(c);
    }
    stage.appendChild(board);
    $mgStage.appendChild(stage);

    const qBtn3 = document.createElement("button"); qBtn3.className = "mg-btn"; qBtn3.textContent = "放弃";
    qBtn3.onclick = () => { if (!finished) { finish("lose"); } };
    $mgButtons.appendChild(qBtn3);

    $mgStatus.textContent = "在 25 秒内击中 " + target + " 只地鼠。";

    let remaining = timeLimit / 1000;
    const pop = () => {
      if (finished) return;
      if (activeHole >= 0) cells3[activeHole].classList.remove("active");
      activeHole = Math.floor(Math.random()*W*H);
      cells3[activeHole].classList.add("active");
      playSFX("打地鼠冒出");
      popTimer = setTimeout(pop, 800 + Math.random()*400);
    };
    const tick2 = () => {
      remaining--;
      const tm = document.getElementById("whackTime"); if (tm) tm.textContent = "时间：" + remaining + " 秒";
      if (remaining <= 0) finish();
    };
    function finish(forceResult) {
      if (finished) return; finished = true;
      clearTimeout(popTimer); clearTimeout(hideTimer); clearInterval(gameTimer);
      const result = forceResult || (hits >= target ? "win" : "lose");
      $mgStatus.textContent = (result === "win" ? "胜利！击中 " : "时间到！击中 ") + hits + " 只。";
      setTimeout(() => finishMiniGame(result, config), 700);
    }
    pop(); gameTimer = setInterval(tick2, 1000);
  };

  // ===== 数独（4x4 简单版，4~5 格已填，玩家补满）=====
  const startSudoku = (config) => {
    // 使用简单 4x4 数独：每行每列每 2x2 宫，1~4 不重复
    const solution = [1,2,3,4, 3,4,1,2, 2,1,4,3, 4,3,2,1]; // 已验证为合法解
    // 随机选几格隐藏
    const puzzle = solution.slice();
    const hidden = [];
    while (hidden.length < 8) { const p = Math.floor(Math.random()*16); if (!hidden.includes(p)) hidden.push(p); }
    const given = puzzle.map((v,i) => hidden.includes(i) ? 0 : v);
    const userInput = given.slice();
    let finished2 = false;

    const stage = document.createElement("div"); stage.className = "sudoku-stage";
    const info = document.createElement("div"); info.className = "sudoku-info";
    info.innerHTML = '<span>每格点击输入 1~4，每行每列每 2×2 宫不重复</span>';
    stage.appendChild(info);
    const board = document.createElement("div"); board.className = "sudoku-board";
    const cells4 = [];
    for (let i = 0; i < 16; i++) {
      const c = document.createElement("div"); c.className = "sudoku-cell";
      if (given[i] > 0) { c.textContent = given[i]; c.classList.add("given"); }
      c.addEventListener("click", () => {
        if (finished2 || given[i] > 0) return;
        let v = userInput[i] || 0; v = v >= 4 ? 0 : v + 1;
        userInput[i] = v; c.textContent = v || "";
        c.classList.remove("wrong");
        playSFX("数独写字");
        if (v && v !== solution[i]) c.classList.add("wrong");
        // 检查完成
        let full = true; for (let p = 0; p < 16; p++) if (!userInput[p]) { full = false; break; }
        if (full) {
          let ok = true; for (let p = 0; p < 16; p++) if (userInput[p] !== solution[p]) { ok = false; break; }
          if (ok) { finished2 = true; $mgStatus.textContent = "解出！胜利。"; setTimeout(() => finishMiniGame("win", config), 500); }
          else { $mgStatus.textContent = "有错误，再看看……"; }
        }
      });
      // 右边框 & 下边框分隔宫
      const x = i % 4, y = Math.floor(i / 4);
      if (x === 1) c.classList.add("thick-right");
      if (y === 1) c.classList.add("thick-bottom");
      board.appendChild(c); cells4.push(c);
    }
    stage.appendChild(board);
    $mgStage.appendChild(stage);

    const qBtn4 = document.createElement("button"); qBtn4.className = "mg-btn"; qBtn4.textContent = "放弃";
    qBtn4.onclick = () => { if (!finished2) { finished2 = true; finishMiniGame("lose", config); } };
    $mgButtons.appendChild(qBtn4);
    $mgStatus.textContent = "点击空格循环输入 1 2 3 4。";
  };

  // ===== 抓鬼（简单反应游戏：3x3 网格，随机位置出现鬼，点中抓到，10 只胜）=====
  const startGhost = (config) => {
    const W = 3, H = 3;
    const target2 = (config && config.win_threshold) || 10;
    let catches = 0, escapes = 0;
    let finished3 = false;
    let activeIdx = -1;
    let popTimer2 = null, escapeTimer = null;

    const stage = document.createElement("div"); stage.className = "ghost-stage";
    const info = document.createElement("div"); info.className = "ghost-info";
    info.innerHTML = '<span id="ghostCatches">抓到：0 / ' + target2 + '</span> <span id="ghostEscapes" style="margin-left:18px;">逃脱：0</span>';
    stage.appendChild(info);
    const board = document.createElement("div"); board.className = "ghost-board";
    const cells5 = [];
    for (let i = 0; i < W*H; i++) {
      const c = document.createElement("div"); c.className = "ghost-hole";
      c.addEventListener("click", () => {
        if (finished3) return;
        if (i === activeIdx) {
          catches++; playSFX("抓鬼捕获");
          c.classList.add("caught");
          setTimeout(() => c.classList.remove("caught"), 150);
          activeIdx = -1; clearTimeout(escapeTimer); clearTimeout(popTimer2);
          const g1 = document.getElementById("ghostCatches"); if (g1) g1.textContent = "抓到：" + catches + " / " + target2;
          if (catches >= target2) { finishGame("win"); return; }
          popTimer2 = setTimeout(nextGhost, 300 + Math.random()*400);
        } else {
          playSFX("click");
        }
      });
      board.appendChild(c); cells5.push(c);
    }
    stage.appendChild(board);
    $mgStage.appendChild(stage);

    const qBtn5 = document.createElement("button"); qBtn5.className = "mg-btn"; qBtn5.textContent = "放弃";
    qBtn5.onclick = () => { if (!finished3) { finishGame("lose"); } };
    $mgButtons.appendChild(qBtn5);

    $mgStatus.textContent = "在鬼影消失前点中它。";

    function nextGhost() {
      if (finished3) return;
      if (activeIdx >= 0) cells5[activeIdx].classList.remove("active");
      activeIdx = Math.floor(Math.random()*W*H);
      cells5[activeIdx].classList.add("active");
      escapeTimer = setTimeout(() => {
        if (activeIdx >= 0) {
          cells5[activeIdx].classList.remove("active");
          activeIdx = -1; escapes++;
          playSFX("抓鬼逃脱");
          const ge = document.getElementById("ghostEscapes"); if (ge) ge.textContent = "逃脱：" + escapes;
          if (escapes >= 5) { finishGame("lose"); return; }
          popTimer2 = setTimeout(nextGhost, 400 + Math.random()*300);
        }
      }, 700 + Math.random()*400);
    }
    function finishGame(result) {
      if (finished3) return; finished3 = true;
      clearTimeout(popTimer2); clearTimeout(escapeTimer);
      $mgStatus.textContent = (result === "win" ? "胜利！抓到 " + catches + " 只。" : "逃脱了 " + escapes + " 只，失败。");
      setTimeout(() => finishMiniGame(result, config), 700);
    }
    nextGhost();
  };

  const spawnFood = (W, H, snake) => {
    while (true) {
      const x = Math.floor(Math.random()*W);
      const y = Math.floor(Math.random()*H);
      if (!snake.some((s) => s.x === x && s.y === y)) return { x, y };
    }
  };

  // 在键盘事件中接管方向键（仅贪吃蛇）
  const snakeKeyHandler = (e) => {
    if (!snakeState) return;
    const k = e.key.toLowerCase();
    if (k === "arrowup" || k === "w") { snakeState.setDir({x:0,y:-1}); e.preventDefault(); }
    else if (k === "arrowdown" || k === "s") { snakeState.setDir({x:0,y:1}); e.preventDefault(); }
    else if (k === "arrowleft" || k === "a") { snakeState.setDir({x:-1,y:0}); e.preventDefault(); }
    else if (k === "arrowright" || k === "d") { snakeState.setDir({x:1,y:0}); e.preventDefault(); }
  };
  document.addEventListener("keydown", snakeKeyHandler);

  /* =========================================================
     4. 章节系统
     ========================================================= */

  // 根据 id 取出章节对象（兼容 const 声明 & window 挂载两种写法）
  const getChapterById = (id) => {
    const name = "CHAPTER_" + id;
    try {
      return (new Function("", "return typeof " + name + ' !== "undefined" ? ' + name + " : null"))()
        || (typeof window[name] !== "undefined" ? window[name] : null);
    } catch (e) { return null; }
  };

  // 进入某章节（带转场动画：淡出 → 切换 → 淡入）
  const fadeOutTransition = () => {
    return new Promise((resolve) => {
      if (!$transitionOverlay) return resolve();
      $transitionOverlay.classList.add("show");
      setTimeout(resolve, 520);
    });
  };

  const fadeInTransition = () => {
    if ($transitionOverlay) $transitionOverlay.classList.remove("show");
  };

  let isTransitioning = false;

  const loadChapter = (id) => {
    console.log("加载章节", id);
    if (isTransitioning) return;
    const chapter = getChapterById(id);
    if (!chapter) {
      console.warn("找不到章节:", id);
      returnToTitle();
      return;
    }
    isTransitioning = true;
    state.chapterId = id;
    state.lineIndex = 0;
    state.currentChapter = chapter;
    state.hasProgress = true;
    saveToAuto();

    (async () => {
      // 1. 先淡出到黑幕
      if ($transitionOverlay) $transitionOverlay.classList.add("show");
      await new Promise((r) => setTimeout(r, 480));

      // 2. 在黑屏期间：切换背景、BGM、清空角色
      $tag.textContent = (chapter.meta && chapter.meta.tag) || "";
      $menuBar.style.display = "flex";
      $dialogueBox.classList.add("show");

      // 先隐藏 CG 和 选项
      $choices.classList.remove("show");
      $endingScreen.classList.remove("show");
      hideCG();
      hideCGAsBG();
      clearChars();

      // 设置背景 + BGM（等待背景图片加载）
      const bgKey = chapter.bg || (chapter.meta && chapter.meta.bg) || null;
      const bgmKey = chapter.bgm || (chapter.meta && chapter.meta.bgm) || null;
      await setBG(bgKey);
      if (bgmKey) {
        state.bgm = null; // 强制重启，确保章节切换时 BGM 可靠播放
        setBGM(bgmKey);
      }

      // 再等一下让视觉上更自然
      await new Promise((r) => setTimeout(r, 180));

      // 3. 淡出黑幕
      fadeInTransition();

      // 4. 渲染第一行
      renderLine();

      isTransitioning = false;
    })();
  };

  // 加载童年篇章节
  const loadChildhoodChapter = (id) => {
    console.log("加载童年篇章节:", id);
    if (isTransitioning) return;
    const chapter = getChapterById(id);
    if (!chapter) {
      console.warn("找不到童年篇章节:", id);
      returnToTitle();
      return;
    }
    isTransitioning = true;
    state.chapterId = id;
    state.lineIndex = 0;
    state.currentChapter = chapter;
    state.isChildhood = true;
    $titleScreen.style.display = "none";

    (async () => {
      // 1. 淡出到黑幕
      if ($transitionOverlay) $transitionOverlay.classList.add("show");
      await new Promise((r) => setTimeout(r, 480));

      // 2. 黑屏期间切换背景
      $tag.textContent = (chapter.meta && chapter.meta.tag) || "";
      $menuBar.style.display = "flex";
      $dialogueBox.classList.add("show");

      // 隐藏 CG 和角色
      $choices.classList.remove("show");
      $endingScreen.classList.remove("show");
      hideCG();
      hideCGAsBG();
      hideCGSeq();
      clearChars();

      // 设置背景和BGM
      const bgKey = chapter.bg || (chapter.meta && chapter.meta.bg) || null;
      const bgmKey = chapter.bgm || (chapter.meta && chapter.meta.bgm) || null;
      await setBG(bgKey);
      if (bgmKey) {
        state.bgm = null;
        setBGM(bgmKey);
      }

      await new Promise((r) => setTimeout(r, 180));

      // 3. 淡入
      fadeInTransition();

      // 4. 渲染第一行
      renderLine();

      isTransitioning = false;
    })();
  };

  // 推进到下一章节（自动完成）
  const advanceToNext = () => {
    const chapter = state.currentChapter;
    if (!chapter) return;

    // 章节已完成记录
    state.chaptersSeen[state.chapterId] = true;

    // —— 童年篇章节完成处理 ——
    if (state.chapterId && state.chapterId.indexOf("childhood") === 0) {
      const progress = _getChildhoodProgress();
      progress.chaptersRead[state.chapterId] = true;
      _saveChildhoodProgress(progress);

      if (chapter.ending) {
        // 童年篇没有 ending 处理，直接用标题式的结束
        returnToTitle();
        return;
      }
      if (chapter.next) {
        loadChildhoodChapter(chapter.next);
        return;
      }
      // 自动推进到下一章（根据童年篇顺序）
      const idx = _childhoodOrder.indexOf(state.chapterId);
      if (idx >= 0 && idx < _childhoodOrder.length - 1) {
        loadChildhoodChapter(_childhoodOrder[idx + 1]);
        return;
      }
      returnToTitle();
      return;
    }

    if (chapter.ending) {
      showEnding(chapter.ending);
      return;
    }
    if (chapter.next) {
      loadChapter(chapter.next);
      return;
    }
    // 没有 next 也没有 ending → 回到标题
    returnToTitle();
  };

  /* =========================================================
     5. 行渲染 / 打字机效果（智能变速 + 角色声音）
     ========================================================= */

  /**
   * 获取标点停顿时间
   * @param {string} char - 当前字符
   * @returns {number} 停顿时间(ms)
   */
  const getCharDelay = (char) => {
    if (typeof getPunctuationDelay === 'function') {
      return getPunctuationDelay(char);
    }
    // 默认标点停顿配置
    const punctDelays = {
      '。': 250, '！': 280, '？': 280,
      '，': 120, '；': 140, '：': 100,
      '……': 400, '...': 350,
      '、': 70,
      '「': 50, '」': 80, '『': 50, '』': 80,
      '——': 150, '-': 60,
      '!': 250, '?': 250, '.': 200, ';': 130, ':': 90
    };
    return punctDelays[char] || 0;
  };

  /**
   * 获取角色的基础打字速度
   * @returns {number} 基础延迟(ms)
   */
  const getBaseTypeDelay = () => {
    if (typeof getVoiceProfile === 'function' && state.currentSpeaker) {
      const profile = getVoiceProfile(state.currentSpeaker);
      return profile ? (profile.baseDelay || 42) : 42;
    }
    return 42;
  };

  /**
   * 智能变速打字机
   * 根据角色声音配置和标点符号自动调整打字速度和音效
   * @param {string} fullText - 完整文本
   * @param {function} onDone - 完成回调
   */
  const typeWrite = (fullText, onDone) => {
    state.typing = true;
    state.currentLineText = fullText;
    $text.textContent = "";
    let i = 0;
    const len = fullText.length;
    clearTimeout(state.typingTimer);

    // 获取角色基础打字速度
    const baseDelay = getBaseTypeDelay();

    // 打字函数
    const typeChar = () => {
      if (i >= len) {
        state.typing = false;
        if (typeof onDone === "function") onDone();
        return;
      }

      const char = fullText[i];
      $text.textContent += char;
      i++;

      // 播放角色打字音效
      VoiceSynth.playTypeSound(state.currentSpeaker, i);

      // 计算下一个字符的延迟
      let nextDelay = baseDelay;

      // 标点符号停顿
      const punctDelay = getCharDelay(char);
      if (punctDelay > 0) {
        nextDelay += punctDelay;
      }

      // 数字和英文字母稍快
      if (/[a-zA-Z0-9]/.test(char)) {
        nextDelay = Math.floor(nextDelay * 0.7);
      }

      // 空格跳过
      if (char === ' ' || char === '\n') {
        nextDelay = Math.floor(nextDelay * 0.3);
      }

      state.typingTimer = setTimeout(typeChar, nextDelay);
    };

    // 开始打字
    typeChar();
  };

  // 跳过打字，直接显示全文
  const skipTyping = () => {
    clearTimeout(state.typingTimer);
    state.typing = false;
    if (state.cgSeq) {
      $cgSeqText.textContent = state.currentLineText;
    } else {
      $text.textContent = state.currentLineText;
    }
  };

  // cg_seq 模式专用打字机：文字输出到字幕层（使用智能变速）
  const typeWriteSubtitle = (fullText, onDone) => {
    state.typing = true;
    state.currentLineText = fullText;
    $cgSeqText.textContent = "";
    let i = 0;
    const len = fullText.length;
    clearTimeout(state.typingTimer);

    // 获取角色基础打字速度
    const baseDelay = getBaseTypeDelay();

    const typeChar = () => {
      if (i >= len) {
        state.typing = false;
        if (typeof onDone === "function") onDone();
        return;
      }

      const char = fullText[i];
      $cgSeqText.textContent += char;
      i++;

      // 播放角色打字音效
      VoiceSynth.playTypeSound(state.currentSpeaker, i);

      // 计算下一个字符的延迟
      let nextDelay = baseDelay;

      // 标点符号停顿
      const punctDelay = getCharDelay(char);
      if (punctDelay > 0) {
        nextDelay += punctDelay;
      }

      // 数字和英文字母稍快
      if (/[a-zA-Z0-9]/.test(char)) {
        nextDelay = Math.floor(nextDelay * 0.7);
      }

      // 空格跳过
      if (char === ' ' || char === '\n') {
        nextDelay = Math.floor(nextDelay * 0.3);
      }

      state.typingTimer = setTimeout(typeChar, nextDelay);
    };

    typeChar();
  };

  // 渲染第 state.lineIndex 行
  const renderLine = () => {
    // ===== 分支对话优先（小游戏后的 onWin/onLose/onDraw）=====
    if (state.pendingBranch.length > 0) {
      const line = state.pendingBranch.shift();
      // 分支对话的行格式与普通行完全一致
      renderAnyLine(line, true);
      return;
    }

    const chapter = state.currentChapter;
    if (!chapter) return;

    const lines = chapter.lines || [];

    // 行读完：进入下一章 / 显示 ending / 显示选项
    if (state.lineIndex >= lines.length) {
      if (chapter.ending) {
        showEnding(chapter.ending);
        return;
      }
      if (chapter.choices && chapter.choices.length) {
        state.chaptersSeen[state.chapterId] = true;
        saveToAuto();
        showChoices(chapter.choices);
        return;
      }
      if (chapter.next) {
        loadChapter(chapter.next);
        return;
      }
      // 童年篇章节：自动推进到下一章
      if (state.isChildhood) {
        advanceToNext();
        return;
      }
      // 默认：回到标题
      returnToTitle();
      return;
    }

    const line = lines[state.lineIndex];

    // ===== 小游戏指令（优先执行，挡住后面的对话）=====
    if (line.mini_game) {
      if (state.playingMiniGame) return; // 防止重复
      state.playingMiniGame = true;
      // 行内的 bg / char 先应用
      if (line.bg) setBG(line.bg);
      if (line.bgm) setBGM(line.bgm);
      if (line.char) setCharGroup(line.char);
      if (line.cg) {
        showCG(line.cg, line.caption || "");
      } else if (line.clearCG !== false) {
        hideCG();
      }
      openMiniGame(line.mini_game, (result) => {
        state.playingMiniGame = false;
        // 选分支对话
        let branch = [];
        if (result === "win" && line.onWin) branch = line.onWin;
        else if (result === "lose" && line.onLose) branch = line.onLose;
        else if (result === "draw" && line.onDraw) branch = line.onDraw;
        else if (line.onLose) branch = line.onLose; // 默认走失败兜底
        // 入队
        state.pendingBranch = branch.slice();
        // 当前行处理完了，推进到下一行
        state.lineIndex++;
        // 如果有分支对话，先播放分支
        if (state.pendingBranch.length > 0) {
          renderLine();
        } else {
          renderLine(); // 分支为空，直接推进到主线下一行
        }
      });
      return;
    }

    // ===== 普通渲染 =====
    state.lineIndex++;
    renderAnyLine(line, false);

    // 自动保存（每 4 行存一次，避免写入太频繁）
    if (state.lineIndex % 4 === 0) saveToAuto();
  };

  // 统一渲染单行（既可以来自主章节，也可以来自小游戏后的分支对话）
  const renderAnyLine = (line, fromBranch) => {
    if (!line) { renderLine(); return; }

    // Mode 3 优先: 过场动画序列
    if (line.cg_seq) {
      setCGSeq(line.cg_seq);
    } else if (state.cgSeq && (line.bg || line.cg_bg || line.cg)) {
      // 在 cg_seq 模式中遇到其他 CG/背景指令 → 退出序列
      hideCGSeq();
    }

    // 行内指令（cg_seq 模式下跳过 bg/cg 指令，避免冲突）
    if (!state.cgSeq) {
      if (line.bg) {
        hideCG(); // 切换背景时关闭 CG 照片
        if (state.cgAsBg) hideCGAsBG(); // 从 CG 背景模式恢复到普通背景
        setBG(line.bg);
      }
      if (line.bgm) setBGM(line.bgm);
      if (line.cg_bg) {
        const hasText = (typeof line.text === "string" && line.text.length > 0);
        setCGAsBG(line.cg_bg, { noReveal: hasText });
      } else if (line.cg) {
        // ===== 关键修复 =====
        // 根据同行是否有文字区分两种 CG 模式：
        // 1. { cg: "xxx" } 纯 CG: 隐藏对话框，2 秒后自动推进（如同幻灯片）
        // 2. { cg: "xxx", text: "..." } CG+文字: 保留对话框可见，文字正常显示
        const hasText = (typeof line.text === "string" && line.text.length > 0);
        showCG(line.cg, line.caption || "", { hasText: hasText });
      } else {
        // 当前行没有 CG 相关指令，如果正在显示 CG 照片且当前行有文字 → 关闭 CG 让文字正常显示
        if (state.cgShowing && (typeof line.text === "string" && line.text.length > 0)) {
          hideCG();
        }
      }
      // CG 照片会在切换 bg / cg_bg / 新 cg / 出现文字时自动替换，不再每行隐藏
      if (line.char && !state.cgAsBg) {
        setCharGroup(line.char);
      }
    } else {
      // cg_seq 模式下 BGM 和角色仍然可用
      if (line.bgm) setBGM(line.bgm);
      if (line.char) {
        setCharGroup(line.char);
      }
    }

    // 渲染文本
    if (state.cgSeq) {
      // 更新当前说话者（用于打字音效）
      state.currentSpeaker = line.speaker || null;
      // cg_seq 模式：文字以字幕显示
      $cgSeqSpeaker.textContent = line.speaker || "";
      const text = (typeof line.text === "string") ? line.text : "";
      if (text) {
        typeWriteSubtitle(text);
      } else {
        // cg_seq 模式下没有文字时，不自动推进，等待用户点击（或自动模式定时器）
        // advance() 中会检查 CG_SEQ_MIN_DISPLAY 最小显示时间
      }
    } else {
      // 更新当前说话者（用于打字音效）
      state.currentSpeaker = line.speaker || null;
      $speaker.textContent = line.speaker || "";
      const text = (typeof line.text === "string") ? line.text : "";
      if (text) {
        // 如果当前对话框被 cg_bg 画面隐藏（过场中），等画面停留结束后再显示文本
        if (state.cgAsBg && $dialogueBox.classList.contains("cg-bg-reveal")) {
          const _doReveal = () => {
            $dialogueBox.classList.remove("cg-bg-reveal");
            typeWrite(text);
          };
          if (_cgBgRevealTimer) clearTimeout(_cgBgRevealTimer);
          _cgBgRevealTimer = setTimeout(_doReveal, CG_BG_REVEAL_DELAY);
        } else {
          typeWrite(text);
        }
      } else if (state.cgShowing) {
        // CG 照片已显示且当前行没有文字 → 由 showCG() 中的 _cgAdvanceTimer 处理自动推进（自动模式）
        // 或由用户点击推进（手动模式）
      } else if (state.cgAsBg && $dialogueBox.classList.contains("cg-bg-reveal")) {
        // 纯 CG 画面停留阶段 → 由 setCGAsBG() 中的 _cgBgRevealTimer 处理（自动模式）
        // 或由用户点击推进（手动模式）
      } else {
        setTimeout(renderLine, 0);
      }
    }
  };

  /* =========================================================
     6. 选项系统
     ========================================================= */
  const showChoices = (choices) => {
    $choices.innerHTML = "";
    choices.forEach((c) => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.textContent = c.text;
      btn.onclick = () => {
        // 选择只代表进入路线；读到个人线结局后才标记为完成
        $choices.innerHTML = "";
        $choices.classList.remove("show");
        // 直接跳转
        if (c.next) {
          loadChapter(c.next);
        } else if (typeof c.action === "function") {
          c.action();
        }
      };
      $choices.appendChild(btn);
    });
    $choices.classList.add("show");
  };

  /* =========================================================
     7. 结局画面
     ========================================================= */
  const showEnding = (ending) => {
    state.chaptersSeen[state.chapterId] = true;
    if (state.chapterId === "finale") {
      unlockChildTheater();
    }
    if (ending && ending._route && state.routes[ending._route] !== undefined) {
      state.routes[ending._route] = true;
    }
    saveToAuto();

    $endingTitle.textContent = ending.title || "";
    $endingText.textContent = ending.text || "";

    // 如果所有个人线都已读完，解锁真终章提示
    const allRoutes = allRoutesCompleted();

    let bonus = "";
    if (allRoutes && state.chapterId !== "finale") {
      bonus = "◆ 已解锁【真终章 · 栖式特调】，可从章节回顾进入 ◆";
    } else if (ending._route) {
      bonus = "◆ 一条路线已完成。回到章节回顾可以继续阅读其他路线 ◆";
    } else if (state.chapterId === "finale") {
      bonus = "◆ 已解锁【童年篇小剧场】入口，可从标题画面进入 ◆";
    }
    $endingBonus.textContent = bonus;

    $endingScreen.classList.add("show");

    // 结局操作按钮
    const actions = $endingScreen.querySelector(".ending-actions");
    if (actions) actions.innerHTML = "";
    // 动态注入按钮（避免在 HTML 中写死）
    const addBtn = (label, handler, primary) => {
      const b = document.createElement("button");
      b.className = primary ? "primary-btn" : "ghost-btn";
      b.textContent = label;
      b.onclick = handler;
      actions.appendChild(b);
    };

    if (ending && ending._route) {
      addBtn("章节回顾", () => {
        $endingScreen.classList.remove("show");
        returnToTitle();
        openPanel("chapters");
      }, true);
    } else if (state.chapterId === "finale") {
      addBtn("回到标题", () => {
        $endingScreen.classList.remove("show");
        returnToTitle();
      }, true);
    } else {
      addBtn("继续阅读", () => { $endingScreen.classList.remove("show"); advanceToNext(); }, true);
    }
    if (state.chapterId === "finale") {
      addBtn("毕业册", () => {
        $endingScreen.classList.remove("show");
        returnToTitle();
        openPanel("gallery");
      });
    }
    if (state.chapterId !== "finale") {
      addBtn("回到标题", () => { $endingScreen.classList.remove("show"); returnToTitle(); });
    }
  };

  /* =========================================================
     8. 存档 / 读档（localStorage）
     -----------------------------------------------------------
     saveSlot: 手动存档 3 个槽
     saveAuto: 自动存档（每 4 行 / 章节切换时）
     数据结构：
       {
         chapterId, lineIndex, bg, bgm,
         routes, chaptersSeen, hasProgress,
         savedAt
       }
     ========================================================= */
  const SAVE_KEY = "qi_shi_te_tiao_save";
  const AUTO_KEY = "qi_shi_te_tiao_auto";
  const CHILD_THEATER_KEY = "qi_shi_te_tiao_child_theater_unlocked";
  const ROUTE_CHAPTERS = {
    route_shiraishi: "shiraishi",
    route_sato: "sato",
    route_saionji: "saionji",
    route_mizuno: "mizuno"
  };

  const isRouteChapter = (id) => Object.prototype.hasOwnProperty.call(ROUTE_CHAPTERS, id);

  const markRouteCompleted = (routeKey) => {
    if (routeKey && state.routes && state.routes[routeKey] !== undefined) {
      state.routes[routeKey] = true;
    }
  };

  const refreshRouteCompletionFromChapters = () => {
    Object.keys(ROUTE_CHAPTERS).forEach((chapterId) => {
      if (state.chaptersSeen && state.chaptersSeen[chapterId]) {
        markRouteCompleted(ROUTE_CHAPTERS[chapterId]);
      }
    });
  };

  const allRoutesCompleted = () => {
    refreshRouteCompletionFromChapters();
    return Object.keys(ROUTE_CHAPTERS).every((chapterId) => {
      const routeKey = ROUTE_CHAPTERS[chapterId];
      return !!(
        (state.chaptersSeen && state.chaptersSeen[chapterId]) ||
        (state.routes && state.routes[routeKey])
      );
    });
  };

  const packSaveData = () => ({
    chapterId: state.chapterId,
    lineIndex: state.lineIndex,
    bg: state.bg,
    bgm: state.bgm,
    routes: { ...state.routes },
    chaptersSeen: { ...state.chaptersSeen },
    hasProgress: state.hasProgress,
    savedAt: Date.now()
  });

  const readSlot = (slot) => {
    try {
      const raw = localStorage.getItem(SAVE_KEY + ":" + slot);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  };

  const writeSlot = (slot, data) => {
    try {
      localStorage.setItem(SAVE_KEY + ":" + slot, JSON.stringify(data));
      return true;
    } catch (e) { return false; }
  };

  const deleteSlot = (slot) => {
    try { localStorage.removeItem(SAVE_KEY + ":" + slot); } catch (e) {}
  };

  const readAuto = () => {
    try {
      const raw = localStorage.getItem(AUTO_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  };

  const saveToAuto = () => {
    try { localStorage.setItem(AUTO_KEY, JSON.stringify(packSaveData())); } catch (e) {}
  };

  const unlockChildTheater = () => {
    state.chaptersSeen.finale = true;
    try { localStorage.setItem(CHILD_THEATER_KEY, "1"); } catch (e) {}
  };

  const isChildTheaterUnlocked = () => {
    if (state.chaptersSeen && state.chaptersSeen.finale) return true;
    try { return localStorage.getItem(CHILD_THEATER_KEY) === "1"; } catch (e) { return false; }
  };

  const updateChildTheaterButton = () => {
    if (!$btnChildTheater) return;
    $btnChildTheater.style.display = isChildTheaterUnlocked() ? "" : "none";
  };

  const syncProgressFromData = (data) => {
    if (!data) return;
    state.chaptersSeen = { ...state.chaptersSeen, ...(data.chaptersSeen || {}) };
    state.routes = { ...state.routes, ...(data.routes || {}) };
    const order = (typeof CHAPTER_ORDER !== "undefined") ? CHAPTER_ORDER : [];
    const id = data.chapterId;
    const idx = order.indexOf(id);
    const splitIdx = order.indexOf("common_split");
    if (idx < 0) return;
    if (id && id.indexOf("route_") === 0) {
      const end = splitIdx >= 0 ? splitIdx : idx;
      for (let i = 0; i <= end; i++) state.chaptersSeen[order[i]] = true;
      return;
    }
    if (id === "finale") {
      const end = splitIdx >= 0 ? splitIdx : idx;
      for (let i = 0; i <= end; i++) state.chaptersSeen[order[i]] = true;
      state.chaptersSeen.finale = true;
      return;
    }
    for (let i = 0; i <= idx; i++) {
      if (order[i] && order[i].indexOf("route_") !== 0) state.chaptersSeen[order[i]] = true;
    }
  };

  const hydrateProgressFromSaves = () => {
    syncProgressFromData(readAuto());
    [1, 2, 3].forEach((slot) => syncProgressFromData(readSlot(slot)));
  };

  // 把一份存档恢复为当前状态
  const applySave = (data) => {
    if (!data) return;
    state.chaptersSeen = data.chaptersSeen || {};
    state.routes = data.routes || { shiraishi: false, sato: false, saionji: false, mizuno: false };
    syncProgressFromData(data);
    state.hasProgress = true;
    // 显示游戏中元素
    $titleScreen.style.display = "none";
    $menuBar.style.display = "flex";
    $dialogueBox.classList.add("show");
    // 载入章节 & 跳至对应行
    const targetChapter = data.chapterId || "prologue";
    const chapter = getChapterById(targetChapter);
    if (!chapter) {
      // 目标章节找不到，回到序章
      loadChapter("prologue");
      return;
    }
    state.chapterId = targetChapter;
    state.currentChapter = chapter;
    state.lineIndex = 0;
    $tag.textContent = (chapter.meta && chapter.meta.tag) || "";
    setBG(chapter.bg || (chapter.meta && chapter.meta.bg) || null);
    setBGM(chapter.bgm || (chapter.meta && chapter.meta.bgm) || null);
    clearChars();
    hideCG();
    // 快速推进到目标行（不触发打字机）
    const lines = chapter.lines || [];
    const targetIdx = data.lineIndex || 0;
    // 逐行应用 bg / bgm / char.* / cg 指令（不显示文本）
    for (let i = 0; i < targetIdx; i++) {
      const line = lines[i] || {};
      if (line.bg) setBG(line.bg);
      if (line.bgm) setBGM(line.bgm);
      if (line.char) setCharGroup(line.char);
    }
    state.lineIndex = targetIdx;
    renderLine();
  };

  // —— 渲染存档/读档槽 ——
  const renderSlots = (mode) => {
    const container = (mode === "save") ? $saveSlots : $loadSlots;
    if (!container) return;
    container.innerHTML = "";
    const slots = [1, 2, 3];
    slots.forEach((slot) => {
      const data = readSlot(slot);
      const item = document.createElement("div");
      item.className = "slot-item" + (data ? "" : " empty");

      const info = document.createElement("div");
      info.className = "slot-info";
      if (data) {
        const meta = (typeof CHAPTER_META !== "undefined" && CHAPTER_META[data.chapterId]) || {};
        const d = new Date(data.savedAt);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;

        const dateDiv = document.createElement("div");
        dateDiv.className = "slot-date";
        dateDiv.textContent = dateStr;
        info.appendChild(dateDiv);

        const titleDiv = document.createElement("div");
        titleDiv.className = "slot-title";
        titleDiv.textContent = (meta.title) || `章节：${data.chapterId}`;
        info.appendChild(titleDiv);

        const progressDiv = document.createElement("div");
        progressDiv.className = "slot-progress";
        progressDiv.textContent = `第 ${data.lineIndex} 行`;
        info.appendChild(progressDiv);
      } else {
        const titleDiv = document.createElement("div");
        titleDiv.className = "slot-title";
        titleDiv.textContent = `存档槽位 ${slot}（空）`;
        info.appendChild(titleDiv);
      }

      const actions = document.createElement("div");
      actions.className = "slot-actions";
      const btn1 = document.createElement("button");
      btn1.className = "slot-btn";
      if (mode === "save") {
        btn1.textContent = "保存";
        btn1.onclick = () => {
          if (writeSlot(slot, packSaveData())) showToast(`已保存到 存档 ${slot}`);
          else showToast("保存失败");
          renderSlots("save");
        };
      } else {
        btn1.textContent = "读取";
        btn1.disabled = !data;
        btn1.onclick = () => {
          if (!data) return;
          closeAllPanels();
          $titleScreen.style.display = "none";
          applySave(data);
          showToast(`已从 存档 ${slot} 读取`);
        };
      }
      actions.appendChild(btn1);

      const btn2 = document.createElement("button");
      btn2.className = "slot-btn danger";
      btn2.textContent = "删除";
      btn2.disabled = !data;
      btn2.onclick = () => {
        if (!data) return;
        deleteSlot(slot);
        renderSlots(mode);
        showToast(`存档 ${slot} 已删除`);
      };
      actions.appendChild(btn2);

      item.appendChild(info);
      item.appendChild(actions);
      container.appendChild(item);
    });
  };

  /* =========================================================
     9. 章节回顾（高中篇 · 本子风格 · 可翻页）
     ========================================================= */
  const _calcItemsPerPage = () => {
    const isLandscape = window.innerWidth > window.innerHeight;
    const isShort = window.innerHeight < 600;
    if (isLandscape && isShort) return 3;
    if (isLandscape) return 4;
    return 4;
  };

  let _chapterPage  = 0;   // 当前页（0-based）
  let _chapterPages = 0;    // 总页数
  let _chapterOrder = [];   // 全部章节 id 数组

  const _getChapterMeta = (id, idx) => {
    const meta = (typeof CHAPTER_META !== "undefined" && CHAPTER_META[id]) || {};
    const seen = state.chaptersSeen[id];
    let unlocked = (id === "prologue") || !!seen;
    const splitReached = !!state.chaptersSeen.common_split;
    const routesDone = allRoutesCompleted();

    if (isRouteChapter(id)) {
      unlocked = splitReached || !!seen;
    } else if (id === "finale") {
      unlocked = routesDone || !!seen;
    } else if (!unlocked) {
      const prev = _chapterOrder[idx - 1];
      if (prev && state.chaptersSeen[prev]) unlocked = true;
    }
    return { meta, seen, unlocked };
  };

  const _renderChapterPage = (pageIdx) => {
    const $list  = document.getElementById("chapterList");
    const $pager = document.getElementById("chapterPageText");
    const $prev  = document.getElementById("chapterFlipPrev");
    const $next  = document.getElementById("chapterFlipNext");
    if (!$list) return;

    $list.innerHTML = "";
    const perPage = _calcItemsPerPage();
    const start = pageIdx * perPage;
    const end   = Math.min(start + perPage, _chapterOrder.length);

    for (let i = start; i < end; i++) {
      const id = _chapterOrder[i];
      const { meta, seen, unlocked } = _getChapterMeta(id, i);

      const item = document.createElement("button");
      item.className = "chapter-index-item" + (unlocked ? "" : " locked");

      const num = document.createElement("span");
      num.className = "chapter-index-num";
      num.textContent = String(i + 1).padStart(2, "0");
      item.appendChild(num);

      const main = document.createElement("span");
      main.className = "chapter-index-main";
      main.textContent = meta.title || id;
      item.appendChild(main);

      const sub = document.createElement("span");
      sub.className = "chapter-index-sub";
      if (unlocked) {
        sub.classList.add(seen ? "seen" : "new");
        sub.textContent = seen ? "已读" : "未读";
      } else {
        sub.classList.add("lock");
        sub.textContent = "未解锁";
      }
      item.appendChild(sub);

      if (unlocked) {
        item.addEventListener("click", () => {
          closeAllPanels();
          $titleScreen.style.display = "none";
          loadChapter(id);
        }, { passive: true });
      }

      $list.appendChild(item);
    }

    if ($pager) $pager.textContent = String(pageIdx + 1).padStart(2, "0") + " / " + String(_chapterPages).padStart(2, "0");
    if ($prev)  $prev.disabled  = pageIdx <= 0;
    if ($next)  $next.disabled  = pageIdx >= _chapterPages - 1;
  };

  const _flipChapterPage = (dir) => {
    const next = _chapterPage + dir;
    if (next < 0 || next >= _chapterPages) return;
    _chapterPage = next;
    const $list = document.getElementById("chapterList");
    if ($list) {
      $list.classList.remove("flipping");
      void $list.offsetWidth; // reflow 触发动画重播
      $list.classList.add("flipping");
    }
    _renderChapterPage(_chapterPage);
  };

  const renderChapterList = () => {
    hydrateProgressFromSaves();
    const $list = document.getElementById("chapterList");
    if (!$list) return;
    $list.innerHTML = "";

    if (typeof CHAPTER_ORDER === "undefined") {
      $list.innerHTML = `<div class="chapter-coming-soon">暂无章节信息</div>`;
      return;
    }

    _chapterOrder = CHAPTER_ORDER;
    _chapterPages = Math.ceil(_chapterOrder.length / _calcItemsPerPage());
    _chapterPage  = 0;

    const $prev = document.getElementById("chapterFlipPrev");
    const $next = document.getElementById("chapterFlipNext");
    if ($prev) $prev.onclick = () => _flipChapterPage(-1);
    if ($next) $next.onclick = () => _flipChapterPage(1);

    // 更新统计信息
    const $total = document.getElementById("chapterStatsTotal");
    const $read  = document.getElementById("chapterStatsRead");
    if ($total) $total.textContent = String(_chapterOrder.length);
    if ($read) {
      const readCount = _chapterOrder.filter(id => state.chaptersSeen[id]).length;
      $read.textContent = String(readCount);
    }

    // 宝丽来相框：加载第一章的第一张 CG 作为封面照片
    const $polaroid = document.getElementById("chapterPolaroidPhoto");
    const $caption  = document.getElementById("chapterPolaroidCaption");
    if ($polaroid && $polaroid.src === "") {
      // 从第一章或任意已读章节找封面CG
      let firstChapterData = null;
      for (const id of _chapterOrder) {
        const key = "chapter_" + id;
        if (typeof window !== "undefined" && window[key]) {
          firstChapterData = window[key];
          break;
        }
      }
      if (firstChapterData) {
        const chapterArray = Array.isArray(firstChapterData) ? firstChapterData : (firstChapterData.lines || []);
        for (const item of chapterArray) {
          if (item && item.cg_bg) {
            $polaroid.src = item.cg_bg;
            if (item.text) $caption.textContent = item.text.slice(0, 14);
            break;
          }
        }
      }
    }

    _renderChapterPage(0);
  };

  /* =========================================================
     10. 面板显示/隐藏
     ========================================================= */
  const closeAllPanels = () => {
    $savePanel && $savePanel.classList.remove("show");
    $loadPanel && $loadPanel.classList.remove("show");
    $chapterPanel && $chapterPanel.classList.remove("show");
    $childTheaterPanel && $childTheaterPanel.classList.remove("show");
    $galleryPanel && $galleryPanel.classList.remove("show");
  };

  // ——— 童年篇小剧场：渲染章节列表（支持翻页）———
  const _childhoodOrder = typeof CHILDHOOD_ORDER !== "undefined" ? CHILDHOOD_ORDER : [];
  const _childhoodMeta  = typeof CHILDHOOD_META  !== "undefined" ? CHILDHOOD_META  : {};

  let _childhoodPage  = 0;
  let _childhoodPages = 0;

  const _getChildhoodProgress = () => {
    try {
      const raw = localStorage.getItem("qi_shi_te_tiao_childhood_progress");
      return raw ? JSON.parse(raw) : { chaptersRead: {} };
    } catch (e) { return { chaptersRead: {} }; }
  };

  const _saveChildhoodProgress = (progress) => {
    try { localStorage.setItem("qi_shi_te_tiao_childhood_progress", JSON.stringify(progress)); } catch (e) {}
  };

  const _renderChildhoodPage = (pageIdx) => {
    const $list  = document.getElementById("childChapterList");
    const $pager = document.getElementById("childPageText");
    const $prev  = document.getElementById("childPrev");
    const $next  = document.getElementById("childNext");
    if (!$list) return;

    $list.innerHTML = "";
    const progress = _getChildhoodProgress();
    const perPage = _calcItemsPerPage();
    const start = pageIdx * perPage;
    const end   = Math.min(start + perPage, _childhoodOrder.length);

    for (let i = start; i < end; i++) {
      const id = _childhoodOrder[i];
      const meta = _childhoodMeta[id] || { title: id, subtitle: "", tag: "" };
      const isRead = progress.chaptersRead && progress.chaptersRead[id];

      const btn = document.createElement("button");
      btn.className = "child-index-item" + (isRead ? " read" : "");
      btn.innerHTML = `
        <span class="child-index-num">${String(i + 1).padStart(2, "0")}</span>
        <span class="child-index-main">${meta.title}</span>
        <span class="child-index-sub">${meta.subtitle}</span>
        ${isRead ? '<span class="child-check">✓</span>' : ""}
      `;
      btn.onclick = () => {
        closeAllPanels();
        if (typeof loadChildhoodChapter === "function") {
          loadChildhoodChapter(id);
        }
      };
      $list.appendChild(btn);
    }

    if ($pager) $pager.textContent = String(pageIdx + 1).padStart(2, "0") + " / " + String(_childhoodPages).padStart(2, "0");
    if ($prev)  $prev.disabled  = pageIdx <= 0;
    if ($next)  $next.disabled  = pageIdx >= _childhoodPages - 1;
  };

  const _flipChildhoodPage = (dir) => {
    const next = _childhoodPage + dir;
    if (next < 0 || next >= _childhoodPages) return;
    _childhoodPage = next;
    // 播放翻页动画（与章节书一致）
    const $list = document.getElementById("childChapterList");
    if ($list) {
      $list.classList.remove("flipping");
      void $list.offsetWidth;
      $list.classList.add("flipping");
    }
    _renderChildhoodPage(_childhoodPage);
  };

  const renderChildhoodChapterList = () => {
    _childhoodPages = Math.ceil(_childhoodOrder.length / _calcItemsPerPage());
    _childhoodPage  = 0;

    const $prev = document.getElementById("childPrev");
    const $next = document.getElementById("childNext");
    if ($prev) $prev.onclick = () => _flipChildhoodPage(-1);
    if ($next) $next.onclick = () => _flipChildhoodPage(1);

    _renderChildhoodPage(0);

    // 更新统计
    const progress = _getChildhoodProgress();
    const $total = document.getElementById("childStatsTotal");
    const $read  = document.getElementById("childStatsRead");
    const totalRead = _childhoodOrder.filter(id => progress.chaptersRead && progress.chaptersRead[id]).length;
    if ($total) $total.textContent = String(_childhoodOrder.length);
    if ($read)  $read.textContent  = String(totalRead);

    // 宝丽来相框：加载第一章的第一张 CG 作为封面照片
    const $polaroid = document.getElementById("childPolaroidPhoto");
    if ($polaroid && _childhoodOrder.length > 0) {
      const coverKey = "童年_彩虹入场券_小林栖踮脚看玻璃"; // 第一章第一张 CG
      const coverUrl = (typeof ASSETS !== "undefined" && ASSETS.cg && ASSETS.cg[coverKey]) || null;
      if (coverUrl) $polaroid.src = coverUrl;
    }
  };

  // ——— 相册（毕业册）：未通关时只显示关于本作文字，通关后可以翻页浏览 CG ———
  let galleryIndex = 0;
  let galleryList = [];

  const buildGalleryList = () => {
    if (typeof ASSETS !== "undefined" && ASSETS.cg) {
      galleryList = Object.entries(ASSETS.cg).map(([name, url]) => ({ name, url }));
    }
  };

  const isFinaleCleared = () => {
    return state.chaptersSeen && state.chaptersSeen.finale;
  };

  const renderGallery = (idx) => {
    if (galleryList.length === 0) buildGalleryList();

    // —— 未通关：只显示关于本作的文字，右页是锁定提示 ——
    if (!isFinaleCleared()) {
      if ($galleryLocked) $galleryLocked.style.display = "flex";
      if ($galleryImgWrap) $galleryImgWrap.style.display = "none";
      if ($galleryPageNum) $galleryPageNum.textContent = "——";
      if ($galleryPrev) { $galleryPrev.style.visibility = "hidden"; $galleryPrev.disabled = true; }
      if ($galleryNext) { $galleryNext.style.visibility = "hidden"; $galleryNext.disabled = true; }
      return;
    }

    // —— 已通关：CG 翻页模式 ——
    if (galleryList.length === 0) return;
    galleryIndex = Math.max(0, Math.min(idx, galleryList.length - 1));
    const item = galleryList[galleryIndex];

    if ($galleryLocked) $galleryLocked.style.display = "none";
    if ($galleryImgWrap) $galleryImgWrap.style.display = "flex";
    if ($galleryImage) {
      $galleryImage.src = item.url;
      $galleryImage.alt = item.name;
    }
    if ($galleryCaption) $galleryCaption.textContent = item.name;
    if ($galleryPageNum) $galleryPageNum.textContent = String(galleryIndex + 1).padStart(2, "0") + " / " + String(galleryList.length).padStart(2, "0");
    if ($galleryPrev) { $galleryPrev.style.visibility = "visible"; $galleryPrev.disabled = galleryIndex <= 0; }
    if ($galleryNext) { $galleryNext.style.visibility = "visible"; $galleryNext.disabled = galleryIndex >= galleryList.length - 1; }
  };

  const openPanel = (which) => {
    closeAllPanels();
    if (which === "save") { renderSlots("save"); $savePanel && $savePanel.classList.add("show"); }
    if (which === "load") { renderSlots("load"); $loadPanel && $loadPanel.classList.add("show"); }
    if (which === "chapters") { renderChapterList(); $chapterPanel && $chapterPanel.classList.add("show"); }
    if (which === "childTheater") { renderChildhoodChapterList(); $childTheaterPanel && $childTheaterPanel.classList.add("show"); }
    if (which === "gallery" || which === "about") { renderGallery(0); $galleryPanel && $galleryPanel.classList.add("show"); }
  };

  window.addEventListener("resize", () => {
    if ($chapterPanel && $chapterPanel.classList.contains("show")) {
      renderChapterList();
    }
    if ($childTheaterPanel && $childTheaterPanel.classList.contains("show")) {
      renderChildhoodChapterList();
    }
  });

  /* =========================================================
     11. 标题画面 & 返回标题
     ========================================================= */
  let firstInit = true;

  const returnToTitle = () => {
    stopAutoRead();
    clearChars();
    hideCG();
    $choices.classList.remove("show");
    $endingScreen.classList.remove("show");
    $text.textContent = "";
    $speaker.textContent = "";
    $tag.textContent = "";
    $menuBar.style.display = "none";
    state.isChildhood = false;
    state.cgAsBg = null;
    state.cgSeq = null;
    hideCGAsBG();
    hideCGSeq();

    (async () => {
      // 首次初始化不做转场
      if (!firstInit && $transitionOverlay) {
        $transitionOverlay.classList.add("show");
        await new Promise((r) => setTimeout(r, 480));
      }

      $dialogueBox.classList.remove("show");
      // 标题画面背景
      await setBG("标题画面");
      // 播放标题音乐（先重置 state.bgm 确保能切换）
      state.bgm = null;
      setBGM("标题音乐");

      // 恢复自动存档中的继续按钮状态
      const autoData = readAuto();
      if ($btnContinue) {
        if (autoData) {
          $btnContinue.style.display = "";
          $btnContinue.textContent = "继续阅读";
        } else {
          $btnContinue.style.display = "none";
        }
      }
      updateChildTheaterButton();

      $titleScreen.style.display = "flex";

      if (!firstInit) {
        fadeInTransition();
      }
      firstInit = false;
    })();
  };

  /* =========================================================
     12. 继续按钮 + 对话框点击 + CG 点击 = 推进剧情
         （注意：推进绑定在最上层的可见区域，不要绑定在被覆盖的 $bg 上）
     ========================================================= */
  const advance = () => {
    // 小游戏期间禁止推进主剧情
    if (state.playingMiniGame || ($miniGamePanel && $miniGamePanel.classList.contains("show"))) return;
    if (state.typing) {
      skipTyping();
      return;
    }
    // CG 背景纯画面停留（同行没有文字）：点击直接推进
    if (state.cgAsBg && $dialogueBox.classList.contains("cg-bg-reveal")) {
      clearTimeout(_cgBgRevealTimer);
      _cgBgRevealTimer = null;
      $dialogueBox.classList.remove("cg-bg-reveal");
      renderLine();
      return;
    }
    // cg_seq 模式：每张 CG 最少显示 CG_SEQ_MIN_DISPLAY 毫秒
    if (state.cgSeq) {
      const elapsed = Date.now() - _cgSeqSetAt;
      if (elapsed < CG_SEQ_MIN_DISPLAY) return;
    }
    // 纯 CG 照片模式（同行没有文字）：最少显示 CG_MIN_DISPLAY 毫秒
    if (state.cgShowing && _cgIsStandalone) {
      const elapsed = Date.now() - _cgSetAt;
      if (elapsed < CG_MIN_DISPLAY) return;
    }
    // 正常推进：渲染下一行
    renderLine();
  };

  const tryAdvance = () => {
    if (state.playingMiniGame || ($miniGamePanel && $miniGamePanel.classList.contains("show"))) { stopAutoRead(); return; }
    if ($choices && $choices.classList.contains("show")) { stopAutoRead(); return; }
    if ($endingScreen && $endingScreen.classList.contains("show")) { stopAutoRead(); return; }
    advance();
  };

  const stopAutoRead = () => {
    state.autoRead = false;
    if (state.autoReadTimer) {
      clearInterval(state.autoReadTimer);
      state.autoReadTimer = null;
    }
    // 清理 CG 模式下的自动推进定时器
    if (_cgAdvanceTimer) { clearTimeout(_cgAdvanceTimer); _cgAdvanceTimer = null; }
    if (_cgBgRevealTimer) { clearTimeout(_cgBgRevealTimer); _cgBgRevealTimer = null; }
    if (_cgSeqAdvanceTimer) { clearTimeout(_cgSeqAdvanceTimer); _cgSeqAdvanceTimer = null; }
    if ($autoBtn) {
      $autoBtn.classList.remove("active");
      $autoBtn.textContent = "自动";
    }
  };

  const startAutoRead = () => {
    if (state.autoRead) return;
    state.autoRead = true;
    if ($autoBtn) {
      $autoBtn.classList.add("active");
      $autoBtn.textContent = "自动中";
    }
    // 如果当前处于 CG 模式（纯 CG 无文字），启动定时器后自动推进
    if (state.cgShowing && _cgIsStandalone) {
      const remaining = CG_MIN_DISPLAY - (Date.now() - _cgSetAt);
      if (remaining > 0 && !_cgAdvanceTimer) {
        _cgAdvanceTimer = setTimeout(() => {
          _cgAdvanceTimer = null;
          if (state.cgShowing && state.autoRead) advance();
        }, remaining);
      }
    }
    // 如果当前处于 cg_bg 模式（无文字），定时器后自动推进
    if (state.cgAsBg && $dialogueBox.classList.contains("cg-bg-reveal") && !_cgBgRevealTimer) {
      _cgBgRevealTimer = setTimeout(() => {
        _cgBgRevealTimer = null;
        if (state.cgAsBg && state.autoRead && $dialogueBox.classList.contains("cg-bg-reveal")) {
          $dialogueBox.classList.remove("cg-bg-reveal");
          advance();
        }
      }, CG_BG_REVEAL_DELAY);
    }
    // 如果当前处于 cg_seq 模式，定时器后自动推进
    if (state.cgSeq && !_cgSeqAdvanceTimer) {
      const remaining = CG_SEQ_MIN_DISPLAY - (Date.now() - _cgSeqSetAt);
      if (remaining > 0) {
        _cgSeqAdvanceTimer = setTimeout(() => {
          _cgSeqAdvanceTimer = null;
          if (state.cgSeq && state.autoRead) advance();
        }, remaining);
      }
    }
    // 主定时器：处理普通文本行 + 兜底 CG 行推进
    state.autoReadTimer = setInterval(() => {
      if ($titleScreen.style.display !== "none") { stopAutoRead(); return; }
      if (document.querySelector(".panel-overlay.show:not(#cgOverlay)")) { stopAutoRead(); return; }
      if ($choices && $choices.classList.contains("show")) { stopAutoRead(); return; }
      if ($endingScreen && $endingScreen.classList.contains("show")) { stopAutoRead(); return; }
      if (state.playingMiniGame || ($miniGamePanel && $miniGamePanel.classList.contains("show"))) { stopAutoRead(); return; }
      // 纯 CG / cg_bg 模式下，有自己的 setTimeout 定时器处理自动推进；
      // 主定时器仅作为安全网：若定时时间够长时间未触发，也会尝试推进
      advance();
    }, 1500);
  };

  const toggleAutoRead = () => {
    if (state.autoRead) stopAutoRead();
    else startAutoRead();
  };

  $nextBtn && $nextBtn.addEventListener("click", (e) => { e.stopPropagation(); advance(); });
  // 整个对话框区域都可以点击推进
  $dialogueBox && $dialogueBox.addEventListener("click", (e) => {
    // 避免点击内部按钮时重复触发
    if (e.target === $nextBtn) return;
    tryAdvance();
  });
  // CG 层点击：推进剧情（CG 仅作为视觉叠加，不是阻挡层）
  $cgOverlay && $cgOverlay.addEventListener("click", (e) => {
    e.stopPropagation();
    // 纯 CG 模式（没有文字同行）: 点击直接关闭 CG 并推进（如果够最小显示时间）
    // CG+文字同行: 点击直接推进（如同点击对话框）
    tryAdvance();
  });
  // 游戏主区域点击推进（对话框上方的背景区域）
  $game && $game.addEventListener("click", (e) => {
    // 只处理点击到空白区域的情况，不要拦截菜单项和其他面板
    if (e.target.closest("#menuBar")) return;
    if (e.target.closest("#dialogueBox")) return;
    if (e.target.closest("#cgOverlay")) return;
    if (e.target.closest("#choices")) return;
    if (e.target.closest(".panel-overlay")) return;
    if (e.target.closest("#miniGamePanel")) return;
    if (e.target.closest("#titleScreen")) return;
    tryAdvance();
  });

  // 键盘：空格 / Enter 推进
  document.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") {
      // 标题画面不响应
      if ($titleScreen.style.display !== "none") return;
      // 面板显示时不响应
      if (document.querySelector(".panel-overlay.show:not(#cgOverlay)")) return;
      // 选项层显示时不响应
      if ($choices.classList.contains("show")) return;
      if ($endingScreen.classList.contains("show")) return;
      e.preventDefault();
      advance();
    }
    // ESC 关闭所有面板 & 返回标题
    if (e.key === "Escape") {
      if (document.querySelector(".panel-overlay.show")) {
        closeAllPanels();
      }
    }
    // S 键保存
    if ((e.key === "s" || e.key === "S") && $titleScreen.style.display === "none") {
      // 快速保存到槽 1
      if (writeSlot(1, packSaveData())) showToast("已保存到 存档 1");
    }
  });

  /* =========================================================
     13. 标题按钮绑定
     ========================================================= */
  if ($btnNew) {
    $btnNew.addEventListener("click", () => {
      // 解锁音频（浏览器安全策略要求）
      unlockAudio();
      // 新的开始：保留已读章节记录和路线，只重置当前进度
      state.chaptersSeen = state.chaptersSeen || {};
      state.routes = state.routes || {};
      state.lineIndex = 0;
      $titleScreen.style.display = "none";
      $menuBar.style.display = "flex";
      loadChapter((typeof CHAPTER_ORDER !== "undefined" && CHAPTER_ORDER[0]) || "prologue");
    });
  }

  if ($btnContinue) {
    $btnContinue.addEventListener("click", () => {
      // 解锁音频（浏览器安全策略要求）
      unlockAudio();
      const autoData = readAuto();
      if (!autoData) {
        showToast("没有可继续的进度");
        return;
      }
      $titleScreen.style.display = "none";
      $menuBar.style.display = "flex";
      applySave(autoData);
    });
  }

  if ($btnChapters) {
    $btnChapters.addEventListener("click", () => openPanel("chapters"));
  }
  if ($btnChildTheater) {
    $btnChildTheater.addEventListener("click", () => openPanel("childTheater"));
  }
  
  // 标题画面点击播放音乐（浏览器安全策略要求用户交互）
  if ($titleScreen) {
    $titleScreen.addEventListener("click", () => {
      unlockAudio();
      if (!state.bgm) setBGM("标题音乐");
    });
  }
  if ($btnAbout) {
    $btnAbout.addEventListener("click", () => openPanel("about"));
  }
  if ($galleryPrev) {
    $galleryPrev.addEventListener("click", () => {
      if (galleryIndex > 0) renderGallery(galleryIndex - 1);
    });
  }
  if ($galleryNext) {
    $galleryNext.addEventListener("click", () => {
      if (galleryList.length === 0) buildGalleryList();
      if (galleryIndex < galleryList.length - 1) renderGallery(galleryIndex + 1);
    });
  }

  /* =========================================================
     14. 菜单按钮（存档 / 读档 / 章节 / 标题）
     ========================================================= */
  // 菜单按钮直接挂在 HTML 上
  document.querySelectorAll("[data-action]").forEach((btn) => {
    const act = btn.getAttribute("data-action");
    btn.addEventListener("click", () => {
      if (act === "save") openPanel("save");
      else if (act === "load") openPanel("load");
      else if (act === "chapters") {
        // 童年篇阅读时，章节按钮打开童年篇小剧场
        if (state.isChildhood && typeof CHILDHOOD_ORDER !== "undefined" && CHILDHOOD_ORDER.length > 0) {
          openPanel("childTheater");
        } else {
          openPanel("chapters");
        }
      }
      else if (act === "auto") toggleAutoRead();
      else if (act === "title") returnToTitle();
    });
  });

  // 所有面板的 "返回 / 关闭"
  document.querySelectorAll(".panel-close").forEach((btn) => {
    btn.addEventListener("click", closeAllPanels);
  });
  document.querySelectorAll(".panel-overlay").forEach((p) => {
    p.addEventListener("click", (e) => {
      if (e.target === p) closeAllPanels();
    });
  });

  // 音效开关按钮
  const $btnVoiceSound = document.getElementById("btnVoiceSound");
  if ($btnVoiceSound) {
    $btnVoiceSound.addEventListener("click", () => {
      const enabled = VoiceSynth.toggle();
      $btnVoiceSound.classList.toggle("active", enabled);
      $btnVoiceSound.textContent = enabled ? "声音" : "静音";
      showToast(enabled ? "打字音效已开启" : "打字音效已关闭");
    });
    // 初始化按钮状态
    $btnVoiceSound.classList.toggle("active", VoiceSynth.enabled);
  }

  /* =========================================================
     15. 初始化
     ========================================================= */
  const init = () => {
    console.log("引擎启动", "已注册章节数:", (typeof CHAPTER_ORDER !== "undefined" ? CHAPTER_ORDER.length : 0));
    warmVisualAssets();

    // —— 测试模式：URL 参数 ?test=unlockAll / ?test=childhood / ?test=finale ——
    try {
      const params = new URLSearchParams(window.location.search);
      const testMode = params.get("test");
      if (testMode === "unlockAll") {
        state.chaptersSeen = {};
        (typeof CHAPTER_ORDER !== "undefined" ? CHAPTER_ORDER : []).forEach((ch) => { state.chaptersSeen[ch] = true; });
        state.chaptersSeen.route_shiraishi = true;
        state.chaptersSeen.route_sato = true;
        state.chaptersSeen.route_saionji = true;
        state.chaptersSeen.route_mizuno = true;
        state.chaptersSeen.finale = true;
        state.routes = { shiraishi: true, sato: true, saionji: true, mizuno: true };
        try { localStorage.setItem(CHILD_THEATER_KEY, "1"); localStorage.setItem(AUTO_KEY, JSON.stringify({ chapterId: "common_split", lineIndex: 0, bg: "标题画面", bgm: "回忆慢", routes: state.routes, chaptersSeen: state.chaptersSeen, hasProgress: true, savedAt: Date.now() })); } catch (e) {}
        console.log("测试模式：已解锁全部内容");
      } else if (testMode === "childhood") {
        try { localStorage.setItem(CHILD_THEATER_KEY, "1"); } catch (e) {}
        console.log("测试模式：已解锁童年篇");
      } else if (testMode === "finale") {
        (typeof CHAPTER_ORDER !== "undefined" ? CHAPTER_ORDER : []).forEach((ch) => { state.chaptersSeen[ch] = true; });
        state.chaptersSeen.route_shiraishi = true;
        state.chaptersSeen.route_sato = true;
        state.chaptersSeen.route_saionji = true;
        state.chaptersSeen.route_mizuno = true;
        state.chaptersSeen.finale = true;
        state.routes = { shiraishi: true, sato: true, saionji: true, mizuno: true };
        try { localStorage.setItem(AUTO_KEY, JSON.stringify({ chapterId: "common_split", lineIndex: 0, bg: "标题画面", bgm: "回忆慢", routes: state.routes, chaptersSeen: state.chaptersSeen, hasProgress: true, savedAt: Date.now() })); } catch (e) {}
        console.log("测试模式：已解锁真终章");
      }
    } catch (e) { /* 忽略 URL 参数解析错误 */ }

    // 恢复状态数据
    const autoData = readAuto();
    if (autoData) {
      syncProgressFromData(autoData);
      hydrateProgressFromSaves();
      state.hasProgress = true;
    }
    // 进入标题画面
    returnToTitle();
  };

  // 等待所有章节脚本加载完毕再初始化
  // 动态脚本加载时，等引擎自身加载完成后设置信号
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    // DOM 已就绪，引擎自身加载完成即可初始化
    // （因为 main.js 是动态加载列表的最后一个，此时其他章节脚本必然已加载）
    init();
  }
})();
