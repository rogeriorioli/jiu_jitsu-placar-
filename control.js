const LOCAL_STORAGE_KEY = 'placar_jiujitsu_state';

const defaultState = {
  a: { name: 'Atleta A', points: 0, advantages: 0, punishments: 0 },
  b: { name: 'Atleta B', points: 0, advantages: 0, punishments: 0 },
  timer: { remainingSeconds: 300, isRunning: false },
  timestamp: Date.now()
};

let state = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || Object.assign({}, defaultState);
let timerInterval = null;

const elements = {
  a: {
    name: document.getElementById('name-a'),
    points: document.getElementById('display-pts-a'),
    advantages: document.getElementById('display-adv-a'),
    punishments: document.getElementById('display-pun-a')
  },
  b: {
    name: document.getElementById('name-b'),
    points: document.getElementById('display-pts-b'),
    advantages: document.getElementById('display-adv-b'),
    punishments: document.getElementById('display-pun-b')
  },
  timer: document.getElementById('control-timer'),
  btnStart: document.getElementById('btn-start'),
  btnPause: document.getElementById('btn-pause'),
  btnOpenDisplay: document.getElementById('btn-open-display')
};

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateUI() {
  ['a', 'b'].forEach(athlete => {
    if (document.activeElement !== elements[athlete].name) {
      elements[athlete].name.value = state[athlete].name;
    }
    elements[athlete].points.innerText = state[athlete].points;
    elements[athlete].advantages.innerText = state[athlete].advantages;
    elements[athlete].punishments.innerText = state[athlete].punishments;
  });

  elements.timer.innerText = formatTime(state.timer.remainingSeconds);

  if (state.timer.isRunning) {
    elements.btnStart.style.display = 'none';
    elements.btnPause.style.display = 'flex';
  } else {
    elements.btnStart.style.display = 'flex';
    elements.btnPause.style.display = 'none';
  }
}

function saveState() {
  state.timestamp = Date.now();
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  updateUI();
}

function addScore(athlete, type, amount) {
  state[athlete][type] += amount;
  if (state[athlete][type] < 0) state[athlete][type] = 0;
  saveState();
}

function setTimer(seconds) {
  state.timer.remainingSeconds = seconds;
  state.timer.isRunning = false;
  saveState();
}

function resetMatch() {
  state = JSON.parse(JSON.stringify(defaultState));
  saveState();
}

function tickTimer() {
  if (state.timer.isRunning && state.timer.remainingSeconds > 0) {
    state.timer.remainingSeconds--;
    saveState();
  } else if (state.timer.remainingSeconds <= 0 && state.timer.isRunning) {
    state.timer.isRunning = false;
    saveState();
  }
}

elements.btnStart.addEventListener('click', () => {
  if (state.timer.remainingSeconds > 0) {
    state.timer.isRunning = true;
    saveState();
  }
});

elements.btnPause.addEventListener('click', () => {
  state.timer.isRunning = false;
  saveState();
});

['a', 'b'].forEach(athlete => {
  elements[athlete].name.addEventListener('input', (e) => {
    state[athlete].name = e.target.value || `Atleta ${athlete.toUpperCase()}`;
    saveState();
  });
});

elements.btnOpenDisplay.addEventListener('click', () => {
  window.open('display.html', '_blank', 'width=1280,height=720,fullscreen=yes');
});

// Setup loop for timer
setInterval(tickTimer, 1000);

// Watch for manual local storage overrides (optional, to keep sync if 2 controls open)
window.addEventListener('storage', (e) => {
  if (e.key === LOCAL_STORAGE_KEY) {
    const newState = JSON.parse(e.newValue);
    if (newState) {
      state = newState;
      updateUI();
    }
  }
});

// Init
updateUI();
