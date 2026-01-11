/**
 * データの永続化
 */
class StorageManager {
  static async getTimestamps() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['savedTimestamps'], (res) => {
        resolve(res.savedTimestamps || []);
      });
    });
  }

  static async addTimestamp(entry) {
    const list = await this.getTimestamps();
    list.push(entry);
    return new Promise((resolve) => {
      chrome.storage.local.set({ 'savedTimestamps': list }, resolve);
    });
  }
}

/**
 * 外部翻訳APIとの通信
 */
class TranslationService {
  static async translate(text) {
    if (!text) return "";
    try {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ja|en`);
      const data = await res.json();
      return data.responseData ? data.responseData.translatedText : "Error";
    } catch (e) {
      return "Error";
    }
  }
}

/**
 * YouTubeの動画制御ユーティリティ
 */
class YouTubeVideoControl {
  static get video() {
    return document.querySelector('video');
  }

  static skip(seconds) {
    if (this.video) this.video.currentTime += seconds;
  }

  static getCurrentTimeFormatted(offsetSeconds = 0) {
    if (!this.video) return null;
    
    const time = Math.max(0, Math.floor(this.video.currentTime) - offsetSeconds);
    const h = Math.floor(time / 3600);
    const m = Math.floor((time % 3600) / 60);
    const s = Math.floor(time % 60);
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
  }
}

/**
 * UIの生成と管理
 */
class TimestampUI {
  constructor(onSave) {
    this.containerId = 'ts-helper-container';
    this.onSave = onSave;
  }

  remove() {
    const existing = document.getElementById(this.containerId);
    if (existing) existing.remove();
  }

  inject() {
    if (!window.location.pathname.startsWith('/watch')) return;
    if (document.getElementById(this.containerId)) return;

    const target = document.querySelector('ytd-watch-metadata #title');
    if (!target) return;

    const container = document.createElement('div');
    container.id = this.containerId;
    container.innerHTML = `
      <div class="ts-control-row">
        <button class="ts-skip-btn" data-skip="-10">10秒戻る</button>
        <button class="ts-skip-btn" data-skip="-5">5秒戻る</button>
        <button class="ts-skip-btn" data-skip="-1">1秒戻る</button>
        <button class="ts-skip-btn" data-skip="1">+1秒進む</button>
        <button class="ts-skip-btn" data-skip="5">5秒進む</button>
        <button class="ts-skip-btn" data-skip="10">10秒進む</button>
      </div>
      <div class="ts-inject-box">
        <input type="text" id="ts-input" placeholder="メモを入力...">
        <button id="ts-add-now-btn" class="ts-action-btn primary">現在</button>
        <button id="ts-add-15-btn" class="ts-action-btn primary">15秒前</button>
      </div>
    `;

    target.parentNode.insertBefore(container, target);
    this._setupEvents(container);
  }

  _setupEvents(container) {
    const input = container.querySelector('#ts-input');
    const btnNow = container.querySelector('#ts-add-now-btn');
    const btn15 = container.querySelector('#ts-add-15-btn');

    // スキップボタンの設定
    container.querySelectorAll('.ts-skip-btn').forEach(btn => {
      btn.onclick = () => YouTubeVideoControl.skip(parseInt(btn.dataset.skip));
    });

    // 記録処理
    const handleSave = async (offset) => {
      const text = input.value.trim();
      if (!text) return;

      [btnNow, btn15].forEach(b => b.disabled = true);
      
      await this.onSave(text, offset);
      
      input.value = '';
      [btnNow, btn15].forEach(b => b.disabled = false);
    };

    btnNow.onclick = () => handleSave(0);
    btn15.onclick = () => handleSave(15);
    input.onkeypress = (e) => { if (e.key === 'Enter') handleSave(15); };
  }
}

/**
 * 全体の実行を制御
 */
const App = {
  init() {
    const ui = new TimestampUI(async (text, offset) => {
      const timeStr = YouTubeVideoControl.getCurrentTimeFormatted(offset);
      if (!timeStr) return;

      const engText = await TranslationService.translate(text);
      const entry = `${timeStr} ${text} (${engText})`;
      await StorageManager.addTimestamp(entry);
    });

    setInterval(() => {
      if (window.location.pathname.startsWith('/watch')) {
        ui.inject();
      } else {
        ui.remove();
      }
    }, 500);

    ui.inject();
  }
};

App.init();