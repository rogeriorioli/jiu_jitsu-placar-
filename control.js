const LOCAL_STORAGE_KEY = 'placar_jiujitsu_state';
const DEFAULT_MATCH_DURATION_SECONDS = 5 * 60;
const MAX_CUSTOM_DURATION_SECONDS = (99 * 60) + 59;

const defaultState = {
  a: { name: 'Atleta A', points: 0, advantages: 0, punishments: 0 },
  b: { name: 'Atleta B', points: 0, advantages: 0, punishments: 0 },
  timer: { remainingSeconds: DEFAULT_MATCH_DURATION_SECONDS, isRunning: false, endsAt: null },
  timestamp: Date.now()
};

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(defaultState));
}

function normalizeState(savedState) {
  const fallback = cloneDefaultState();

  if (!savedState || typeof savedState !== 'object') return fallback;

  ['a', 'b'].forEach(athlete => {
    const savedAthlete = savedState[athlete];
    if (!savedAthlete || typeof savedAthlete !== 'object') return;

    fallback[athlete].name = typeof savedAthlete.name === 'string'
      ? savedAthlete.name
      : fallback[athlete].name;

    ['points', 'advantages', 'punishments'].forEach(scoreType => {
      const score = Number(savedAthlete[scoreType]);
      fallback[athlete][scoreType] = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
    });
  });

  const savedTimer = savedState.timer;
  if (savedTimer && typeof savedTimer === 'object') {
    const remaining = Number(savedTimer.remainingSeconds);
    fallback.timer.remainingSeconds = Number.isFinite(remaining)
      ? Math.min(MAX_CUSTOM_DURATION_SECONDS, Math.max(0, Math.floor(remaining)))
      : DEFAULT_MATCH_DURATION_SECONDS;

    fallback.timer.isRunning = Boolean(savedTimer.isRunning) && fallback.timer.remainingSeconds > 0;

    if (fallback.timer.isRunning) {
      const savedEndsAt = Number(savedTimer.endsAt);
      const savedTimestamp = Number(savedState.timestamp);
      fallback.timer.endsAt = Number.isFinite(savedEndsAt) && savedEndsAt > 0
        ? savedEndsAt
        : (Number.isFinite(savedTimestamp) ? savedTimestamp : Date.now())
          + (fallback.timer.remainingSeconds * 1000);

      fallback.timer.remainingSeconds = Math.max(
        0,
        Math.ceil((fallback.timer.endsAt - Date.now()) / 1000)
      );

      if (fallback.timer.remainingSeconds === 0) {
        fallback.timer.isRunning = false;
        fallback.timer.endsAt = null;
      }
    }
  }

  return fallback;
}

function loadSavedState() {
  try {
    return normalizeState(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)));
  } catch (error) {
    console.warn('Não foi possível carregar o estado salvo do placar.', error);
    return cloneDefaultState();
  }
}

let state = loadSavedState();
let stateHistory = [];

function saveToHistory() {
  stateHistory.push(JSON.parse(JSON.stringify(state)));
  if (stateHistory.length > 30) stateHistory.shift();
}

function undo() {
  if (stateHistory.length > 0) {
    state = normalizeState(stateHistory.pop());
    saveState();
  }
}

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
  btnOpenDisplay: document.getElementById('btn-open-display'),
  customTimerForm: document.getElementById('custom-timer-form'),
  customTimerInput: document.getElementById('custom-timer'),
  customTimerMessage: document.getElementById('custom-timer-message')
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
  saveToHistory();
  state[athlete][type] += amount;
  if (state[athlete][type] < 0) state[athlete][type] = 0;
  saveState();
}

function setTimer(seconds) {
  const safeSeconds = Math.min(MAX_CUSTOM_DURATION_SECONDS, Math.max(1, Math.floor(Number(seconds))));
  if (!Number.isFinite(safeSeconds)) return;

  saveToHistory();
  state.timer.remainingSeconds = safeSeconds;
  state.timer.isRunning = false;
  state.timer.endsAt = null;
  elements.customTimerInput.value = formatTime(safeSeconds);
  setCustomTimerMessage();
  saveState();
}

function resetMatch() {
  saveToHistory();
  state = cloneDefaultState();
  elements.customTimerInput.value = formatTime(DEFAULT_MATCH_DURATION_SECONDS);
  setCustomTimerMessage();
  saveState();
}

function tickTimer() {
  if (!state.timer.isRunning) return;

  const nextRemainingSeconds = Math.max(
    0,
    Math.ceil((state.timer.endsAt - Date.now()) / 1000)
  );

  if (nextRemainingSeconds !== state.timer.remainingSeconds) {
    state.timer.remainingSeconds = nextRemainingSeconds;

    if (nextRemainingSeconds === 0) {
      state.timer.isRunning = false;
      state.timer.endsAt = null;
    }

    saveState();
  }
}

function parseCustomTime(value) {
  const match = value.trim().match(/^(\d{1,2})(?::([0-5]\d))?$/);
  if (!match) return null;

  const minutes = Number(match[1]);
  const seconds = match[2] ? Number(match[2]) : 0;
  const totalSeconds = (minutes * 60) + seconds;

  return totalSeconds >= 1 && totalSeconds <= MAX_CUSTOM_DURATION_SECONDS
    ? totalSeconds
    : null;
}

function setCustomTimerMessage(message = 'Informe de 00:01 a 99:59.') {
  const hasError = message !== 'Informe de 00:01 a 99:59.';
  elements.customTimerMessage.textContent = message;
  elements.customTimerMessage.classList.toggle('is-error', hasError);
  elements.customTimerInput.setAttribute('aria-invalid', String(hasError));
}

elements.btnStart.addEventListener('click', () => {
  if (state.timer.remainingSeconds > 0) {
    state.timer.isRunning = true;
    state.timer.endsAt = Date.now() + (state.timer.remainingSeconds * 1000);
    saveState();
  }
});

elements.btnPause.addEventListener('click', () => {
  if (state.timer.isRunning) {
    state.timer.remainingSeconds = Math.max(
      0,
      Math.ceil((state.timer.endsAt - Date.now()) / 1000)
    );
  }
  state.timer.isRunning = false;
  state.timer.endsAt = null;
  saveState();
});

elements.customTimerForm.addEventListener('submit', event => {
  event.preventDefault();
  const totalSeconds = parseCustomTime(elements.customTimerInput.value);

  if (totalSeconds === null) {
    setCustomTimerMessage('Tempo inválido. Use MM:SS, entre 00:01 e 99:59.');
    elements.customTimerInput.focus();
    return;
  }

  setTimer(totalSeconds);
});

elements.customTimerInput.addEventListener('input', () => {
  if (elements.customTimerInput.getAttribute('aria-invalid') === 'true') {
    setCustomTimerMessage();
  }
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
    try {
      state = normalizeState(JSON.parse(e.newValue));
      updateUI();
    } catch (error) {
      console.warn('Não foi possível sincronizar o estado do placar.', error);
    }
  }
});

// Init
elements.customTimerInput.value = formatTime(state.timer.remainingSeconds);
updateUI();
