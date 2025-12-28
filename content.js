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
  static getCurrentTimeFormatted(offsetSeconds = 15) {
    const video = document.querySelector('video');
    if (!video) return null;
    
    const time = Math.max(0, Math.floor(video.currentTime) - offsetSeconds);
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
      <div class="ts-inject-box">
        <input type="text" id="ts-input" placeholder="15秒前の内容を記録...">
        <button id="ts-add-btn">記録</button>
      </div>
    `;

    target.parentNode.insertBefore(container, target);
    this._setupEvents(container);
  }

  _setupEvents(container) {
    const btn = container.querySelector('#ts-add-btn');
    const input = container.querySelector('#ts-input');

    const handleSave = async () => {
      const text = input.value.trim();
      if (!text) return;

      btn.disabled = true;
      btn.textContent = "...";
      
      await this.onSave(text);
      
      input.value = '';
      btn.disabled = false;
      btn.textContent = "記録";
    };

    btn.onclick = (e) => { e.preventDefault(); handleSave(); };
    input.onkeypress = (e) => { if (e.key === 'Enter') handleSave(); };
  }
}

/**
 * 全体の実行を制御
 */
const App = {
  init() {
    const ui = new TimestampUI(async (text) => {
      const timeStr = YouTubeVideoControl.getCurrentTimeFormatted(15);
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