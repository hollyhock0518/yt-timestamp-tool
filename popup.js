class PopupUI {
  constructor() {
    this.listElement = document.getElementById('timestamp-list');
    this.clearBtn = document.getElementById('clear-btn');
    this.copyAllBtn = document.getElementById('copy-all-btn');
    this.toast = document.getElementById('ts-toast');
  }

  showToast(message) {
    this.toast.textContent = message;
    this.toast.classList.add('show');
    setTimeout(() => this.toast.classList.remove('show'), 2000);
  }

  renderList(list) {
    this.listElement.innerHTML = '';
    
    if (list.length === 0) {
      this.listElement.innerHTML = '<p style="text-align:center; color:#999; margin-top:20px;">まだ記録がありません🌸</p>';
      this.copyAllBtn.style.display = 'none';
      return;
    }

    this.copyAllBtn.style.display = 'inline-block';

    list.forEach((item) => {
      const li = this._createListItem(item);
      this.listElement.appendChild(li);
    });
  }

  _createListItem(item) {
    const li = document.createElement('li');
    const [time, ...restParts] = item.split(' ');
    const rest = restParts.join(' ');
    
    li.innerHTML = `<b>${time}</b> ${rest}`;
    li.style.cursor = "pointer";
    li.title = "この行をコピー";
    li.onclick = () => this.onItemClick(item);
    return li;
  }
}


const PopupController = {
  async init() {
    const ui = new PopupUI();

    const update = async () => {
      const { savedTimestamps } = await chrome.storage.local.get(['savedTimestamps']);
      ui.renderList(savedTimestamps || []);
    };

    ui.onItemClick = async (text) => {
      await navigator.clipboard.writeText(text);
      ui.showToast("１行コピーしたよ！✨");
    };

    ui.copyAllBtn.onclick = async () => {
      const { savedTimestamps } = await chrome.storage.local.get(['savedTimestamps']);
      if (!savedTimestamps?.length) return;
      
      await navigator.clipboard.writeText(savedTimestamps.join('\n'));
      ui.showToast("ぜんぶコピーしたよ！🍥");
    };

    ui.clearBtn.onclick = async () => {
      if (confirm('すべての記録を消去しますか？')) {
        await chrome.storage.local.set({ 'savedTimestamps': [] });
        update();
      }
    };

    update();
  }
};

document.addEventListener('DOMContentLoaded', PopupController.init);