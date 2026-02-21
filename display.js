const LOCAL_STORAGE_KEY = 'placar_jiujitsu_state';

const elements = {
  a: {
    name: document.getElementById('display-name-a'),
    points: document.getElementById('display-pts-a'),
    advantages: document.getElementById('display-adv-a'),
    punishments: document.getElementById('display-pun-a')
  },
  b: {
    name: document.getElementById('display-name-b'),
    points: document.getElementById('display-pts-b'),
    advantages: document.getElementById('display-adv-b'),
    punishments: document.getElementById('display-pun-b')
  },
  timer: document.getElementById('display-timer')
};

function formatTime(totalSeconds) {
  if (totalSeconds < 0) totalSeconds = 0;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateValueWithAnimation(el, newValue) {
  if (el.innerText !== String(newValue)) {
    el.innerText = newValue;
    el.classList.remove('color-pulse');
    // Force reflow to restart animation
    void el.offsetWidth;
    el.classList.add('color-pulse');
  }
}

function renderState(state) {
  if (!state) return;

  ['a', 'b'].forEach(athlete => {
    if (elements[athlete].name.innerText !== state[athlete].name) {
      elements[athlete].name.innerText = state[athlete].name;
    }
    
    updateValueWithAnimation(elements[athlete].points, state[athlete].points);
    updateValueWithAnimation(elements[athlete].advantages, state[athlete].advantages);
    updateValueWithAnimation(elements[athlete].punishments, state[athlete].punishments);
  });

  const formattedTime = formatTime(state.timer.remainingSeconds);
  if (elements.timer.innerText !== formattedTime) {
    elements.timer.innerText = formattedTime;
  }
}

function loadState() {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (data) {
    try {
      renderState(JSON.parse(data));
    } catch (e) {
      console.error('Erron on parsing state:', e);
    }
  }
}

// Listen to changes from Control screen
window.addEventListener('storage', (e) => {
  if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
    try {
      renderState(JSON.parse(e.newValue));
    } catch(err) {
      console.error("Storage parse error", err);
    }
  }
});

// Initial load
loadState();
