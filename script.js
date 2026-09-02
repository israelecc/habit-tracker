// ============================================
// REFERENCIAS A ELEMENTOS HTML
// ============================================
const mainScreen = document.getElementById('main-screen');
const formScreen = document.getElementById('form-screen');
const detailScreen = document.getElementById('detail-screen');
const focusScreen = document.getElementById('focus-screen');
const addHabitBtn = document.getElementById('add-habit-btn');
const backBtn = document.getElementById('back-btn');
const backFromDetailBtn = document.getElementById('back-from-detail-btn');
const habitForm = document.getElementById('habit-form');
const daysSelector = document.getElementById('days-selector');
const focusCheckbox = document.getElementById('habit-focus');
const focusAppsContainer = document.getElementById('focus-apps-container');
const habitsList = document.getElementById('habits-list');
const emptyState = document.getElementById('empty-state');
const detailTitle = document.getElementById('detail-title');
const detailDays = document.getElementById('detail-days');
const detailDuration = document.getElementById('detail-duration');
const detailFocusText = document.getElementById('detail-focus-text');
const completeHabitBtn = document.getElementById('complete-habit-btn');
const logEntriesContainer = document.getElementById('log-entries');
const focusHabitName = document.getElementById('focus-habit-name');
const focusAppsInfo = document.getElementById('focus-apps-info');
const timerDisplay = document.getElementById('timer-display');
const finishFocusBtn = document.getElementById('finish-focus-btn');
const calendarCheckbox = document.getElementById('habit-calendar');
const deleteHabitBtn = document.getElementById('delete-habit-btn');
const calendarConnectBtn = document.getElementById('calendar-connect-btn');
let googleAuthToken = null;
let googleApiLoaded = false;
const GOOGLE_CLIENT_ID = '518511122002-qnq37t3ua9unsj37n5n97k486j4m5lje.apps.googleusercontent.com';

// ============================================
// ESTADO DE LA APP
// ============================================
let habits = [];
let selectedDays = [];
let currentHabitId = null;
let focusTimer = null;
let focusSeconds = 0;
let focusTotalSeconds = 0;

// ============================================
// FUNCIONES DE ALMACENAMIENTO
// ============================================
function saveHabits() {
  localStorage.setItem('habits', JSON.stringify(habits));
}

function loadHabits() {
  const saved = localStorage.getItem('habits');
  if (saved) {
    habits = JSON.parse(saved);
    habits.forEach(habit => {
      if (!habit.logs) {
        habit.logs = [];
      }
    });
  }
}

// ============================================
// NAVEGACIÓN ENTRE PANTALLAS
// ============================================
function showMainScreen() {
  mainScreen.classList.remove('hidden');
  formScreen.classList.add('hidden');
  detailScreen.classList.add('hidden');
  focusScreen.classList.add('hidden');
  renderHabits();
}

function showFormScreen() {
  mainScreen.classList.add('hidden');
  formScreen.classList.remove('hidden');
  detailScreen.classList.add('hidden');
  focusScreen.classList.add('hidden');
}

function showDetailScreen(habitId) {
  currentHabitId = habitId;
  mainScreen.classList.add('hidden');
  formScreen.classList.add('hidden');
  detailScreen.classList.remove('hidden');
  focusScreen.classList.add('hidden');
  renderDetail();
}

function showFocusScreen(habit) {
  mainScreen.classList.add('hidden');
  formScreen.classList.add('hidden');
  detailScreen.classList.add('hidden');
  focusScreen.classList.remove('hidden');
  
  focusHabitName.textContent = habit.name;
  
  if (habit.needFocus && habit.allowedApps.length > 0) {
    focusAppsInfo.textContent = `🔒 Apps permitidas: ${habit.allowedApps.join(', ')}`;
  } else {
    focusAppsInfo.textContent = '🔒 Modo concentración activado';
  }
  
  startFocusTimer(habit.duration * 60);
}

// ============================================
// TEMPORIZADOR DE CONCENTRACIÓN
// ============================================
function startFocusTimer(durationSeconds) {
  focusSeconds = durationSeconds;
  focusTotalSeconds = durationSeconds;
  
  if (focusTimer) {
    clearInterval(focusTimer);
  }
  
  updateTimerDisplay();
  
  focusTimer = setInterval(() => {
    focusSeconds--;
    
    if (focusSeconds <= 0) {
      clearInterval(focusTimer);
      focusTimer = null;
      completeHabitWithNotes('');
    } else {
      updateTimerDisplay();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const minutes = Math.floor(focusSeconds / 60);
  const seconds = focusSeconds % 60;
  timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function stopFocusTimer() {
  if (focusTimer) {
    clearInterval(focusTimer);
    focusTimer = null;
  }
}

// ============================================
// MANEJO DEL FORMULARIO DE HÁBITOS
// ============================================
daysSelector.addEventListener('click', (e) => {
  const dayBtn = e.target.closest('.day-btn');
  if (!dayBtn) return;

  const day = dayBtn.dataset.day;

  if (selectedDays.includes(day)) {
    selectedDays = selectedDays.filter(d => d !== day);
    dayBtn.classList.remove('selected');
  } else {
    selectedDays.push(day);
    dayBtn.classList.add('selected');
  }
});

focusCheckbox.addEventListener('change', () => {
  if (focusCheckbox.checked) {
    focusAppsContainer.classList.remove('hidden');
  } else {
    focusAppsContainer.classList.add('hidden');
  }
});

addHabitBtn.addEventListener('click', showFormScreen);
backBtn.addEventListener('click', showMainScreen);
backFromDetailBtn.addEventListener('click', showMainScreen);

if (calendarConnectBtn) {
  calendarConnectBtn.addEventListener('click', signInWithGoogle);
}

// Evento de Eliminar Hábito (con borrado en Google Calendar)
if (deleteHabitBtn) {
  deleteHabitBtn.addEventListener('click', () => {
    const habit = habits.find(h => h.id === currentHabitId);
    if (!habit) return;

    const confirmDelete = confirm(`¿Estás seguro de que deseas eliminar el hábito "${habit.name}"?`);
    if (confirmDelete) {
      // Si el hábito tiene un evento asociado en Google Calendar, lo eliminamos
      if (habit.googleEventId && googleAuthToken) {
        deleteGoogleCalendarEvent(habit.googleEventId);
      }

      habits = habits.filter(h => h.id !== currentHabitId);
      saveHabits();
      showMainScreen();
    }
  });
}

habitForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = document.getElementById('habit-name').value;
  const description = document.getElementById('habit-description').value;
  const duration = document.getElementById('habit-duration').value;
  const habitTypeElement = document.getElementById('habit-type');
  const type = habitTypeElement ? habitTypeElement.value : 'recurrente';
  const needFocus = focusCheckbox.checked;

  const selectedApps = [];
  document.querySelectorAll('.app-option input:checked').forEach(app => {
    selectedApps.push(app.value);
  });

  if (!name || selectedDays.length === 0) {
    alert('Por favor completa el nombre y selecciona al menos un día');
    return;
  }

  const habit = {
    id: Date.now(),
    name,
    description,
    duration: parseInt(duration) || 30,
    type,
    days: [...selectedDays],
    needFocus,
    allowedApps: needFocus ? selectedApps : [],
    createdAt: new Date().toISOString(),
    logs: [],
    googleEventId: null
  };

  habits.push(habit);
  
  if (calendarCheckbox.checked) {
    createGoogleCalendarEvent(habit);
  } else {
    saveHabits();
    showMainScreen();
  }

  // Limpiar formulario
  document.getElementById('habit-name').value = '';
  document.getElementById('habit-description').value = '';
  document.getElementById('habit-duration').value = '30';
  selectedDays = [];
  document.querySelectorAll('.day-btn').forEach(btn => btn.classList.remove('selected'));
  focusCheckbox.checked = false;
  focusAppsContainer.classList.add('hidden');
  document.querySelectorAll('.app-option input:checked').forEach(app => app.checked = false);
});

// ============================================
// RENDERIZAR LISTA DE HÁBITOS
// ============================================
function renderHabits() {
  habitsList.innerHTML = '';

  if (habits.length === 0) {
    emptyState.classList.remove('hidden');
    habitsList.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  habitsList.classList.remove('hidden');

  habits.forEach(habit => {
    const habitCard = document.createElement('div');
    habitCard.className = 'habit-card';
    habitCard.style.cursor = 'pointer';
    
    const daysText = habit.days.join(', ');
    const completionsThisWeek = getCompletionsThisWeek(habit);
    const today = getTodayName();
    const isToday = habit.days.includes(today);
    
    habitCard.innerHTML = `
      <div class="habit-card-header">
        <h3>${habit.name}</h3>
        <span class="habit-duration">${habit.duration} min</span>
      </div>
      <p class="habit-days">📅 ${daysText} (${habit.type || 'recurrente'})</p>
      <p class="habit-completions">✅ ${completionsThisWeek} veces esta semana</p>
      ${habit.needFocus ? '<p class="habit-focus">🎯 Modo concentración</p>' : ''}
      ${isToday ? '<p class="habit-today">✨ Hoy toca</p>' : ''}
    `;
    
    habitCard.addEventListener('click', () => showDetailScreen(habit.id));
    habitsList.appendChild(habitCard);
  });
}

// ============================================
// RENDERIZAR DETALLE DEL HÁBITO
// ============================================
function renderDetail() {
  const habit = habits.find(h => h.id === currentHabitId);
  if (!habit) return;

  detailTitle.textContent = habit.name;
  detailDays.textContent = `${habit.days.join(', ')} (${habit.type || 'recurrente'})`;
  detailDuration.textContent = `${habit.duration} minutos`;
  
  if (habit.needFocus) {
    detailFocusText.textContent = `${habit.allowedApps.join(', ') || 'Ninguna'}`;
    detailFocusText.parentElement.classList.remove('hidden');
  } else {
    detailFocusText.parentElement.classList.add('hidden');
  }

  renderLogs(habit);
}

// ============================================
// RENDERIZAR REGISTROS (DIARIO)
// ============================================
function renderLogs(habit) {
  logEntriesContainer.innerHTML = '';

  if (!habit.logs || habit.logs.length === 0) {
    logEntriesContainer.innerHTML = '<p class="no-logs">Aún no has registrado sesiones para este hábito.</p>';
    return;
  }

  const sortedLogs = [...habit.logs].sort((a, b) => new Date(b.date) - new Date(a.date));

  sortedLogs.forEach(log => {
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    const date = new Date(log.date);
    const dateStr = date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    logEntry.innerHTML = `
      <div class="log-header">
        <span class="log-date">${dateStr}</span>
        <span class="log-time">${timeStr}</span>
      </div>
      ${log.duration ? `<p class="log-duration">⏱️ ${log.duration} minutos</p>` : ''}
      ${log.notes ? `<p class="log-notes">${log.notes}</p>` : '<p class="log-notes">Sin notas</p>'}
    `;
    
    logEntriesContainer.appendChild(logEntry);
  });
}

// ============================================
// COMPLETAR HÁBITO
// ============================================
completeHabitBtn.addEventListener('click', () => {
  const habit = habits.find(h => h.id === currentHabitId);
  if (!habit) return;
  
  if (habit.needFocus) {
    showFocusScreen(habit);
  } else {
    showNotesModal(habit);
  }
});

function showNotesModal(habit) {
  const notes = prompt('¿Qué aprendiste o qué hiciste en esta sesión? (opcional)');
  completeHabitWithNotes(notes, habit);
}

function completeHabitWithNotes(notes, habit) {
  if (!habit) {
    habit = habits.find(h => h.id === currentHabitId);
  }
  
  if (!habit) return;
  
  let actualDuration = habit.duration;
  if (focusTotalSeconds > 0 && focusSeconds < focusTotalSeconds) {
    actualDuration = Math.round((focusTotalSeconds - focusSeconds) / 60);
  }
  
  const logEntry = {
    date: new Date().toISOString(),
    notes: notes || '',
    duration: actualDuration
  };

  habit.logs.push(logEntry);
  saveHabits();
  
  stopFocusTimer();
  focusSeconds = 0;
  focusTotalSeconds = 0;
  
  showDetailScreen(habit.id);
  renderDetail();
}

finishFocusBtn.addEventListener('click', () => {
  const habit = habits.find(h => h.id === currentHabitId);
  if (!habit) return;
  
  const notes = prompt('¿Qué aprendiste o qué hiciste en esta sesión? (opcional)');
  completeHabitWithNotes(notes, habit);
});

// ============================================
// FUNCIONES AUXILIARES
// ============================================
function getCompletionsThisWeek(habit) {
  if (!habit.logs || habit.logs.length === 0) return 0;

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  weekStart.setHours(0, 0, 0, 0);

  return habit.logs.filter(log => new Date(log.date) >= weekStart).length;
}

function getTodayName() {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const today = new Date();
  return days[today.getDay()];
}

// ============================================
// INTEGRACIÓN CON GOOGLE CALENDAR
// ============================================
let tokenClient;

function initGoogleApi() {
  if (window.google && window.google.accounts) {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/calendar.events',
      callback: (response) => {
        if (response.error !== undefined) {
          console.error('Error de autenticación Google:', response);
          alert('❌ Google no otorgó los permisos de escritura.');
          return;
        }
        
        googleAuthToken = response.access_token;
        updateConnectButtonState(true);
        alert('✅ Conexión establecida con tu cuenta de Google.');
      },
    });
  }
}

function updateConnectButtonState(isConnected) {
  if (calendarConnectBtn) {
    if (isConnected) {
      calendarConnectBtn.innerHTML = '✅ Conectado a Google Calendar';
      calendarConnectBtn.style.background = '#e6fffa';
      calendarConnectBtn.style.color = '#00a381';
      calendarConnectBtn.style.borderColor = '#00b894';
    } else {
      calendarConnectBtn.innerHTML = '📅 Conectar Google Calendar';
      calendarConnectBtn.style.background = '';
      calendarConnectBtn.style.color = '';
      calendarConnectBtn.style.borderColor = '';
    }
  }
}

function signInWithGoogle() {
  if (!tokenClient) {
    initGoogleApi();
  }

  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    alert('Cargando librería de Google... Reintenta en breve.');
  }
}

function createGoogleCalendarEvent(habit) {
  if (!googleAuthToken) {
    alert('⚠️ No hay sesión activa. Haz clic primero en "📅 Conectar Google Calendar".');
    saveHabits();
    showMainScreen();
    return;
  }

  const today = new Date();
  const daysMap = {
    'Dom': 0, 'Lun': 1, 'Mar': 2, 'Mié': 3, 'Jue': 4, 'Vie': 5, 'Sáb': 6
  };
  
  const habitDays = habit.days.map(d => daysMap[d]);
  let nextDate = new Date(today);
  
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + i);
    if (habitDays.includes(checkDate.getDay())) {
      nextDate = checkDate;
      break;
    }
  }
  
  const startTime = new Date(nextDate);
  startTime.setHours(9, 0, 0, 0);
  
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + (parseInt(habit.duration) || 30));

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const eventData = {
    summary: habit.name,
    description: habit.description || `Hábito de rutina: ${habit.name}`,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: userTimeZone
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: userTimeZone
    }
  };

  if (habit.type === 'recurrente') {
    eventData.recurrence = ['RRULE:FREQ=WEEKLY'];
  }

  fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${googleAuthToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventData)
  })
  .then(async (res) => {
    const result = await res.json();
    if (res.ok) {
      // Guardamos el ID del evento devuelto por Google en el hábito
      habit.googleEventId = result.id;
      saveHabits();
      showMainScreen();
      alert(`✅ ¡Confirmado! Evento "${habit.name}" creado en tu Google Calendar.`);
    } else {
      console.error('Error devuelto por la API de Google:', result);
      saveHabits();
      showMainScreen();
      alert(`❌ Error de Google Calendar (${result.error.code}): ${result.error.message}`);
    }
  })
  .catch(err => {
    console.error('Error de red:', err);
    saveHabits();
    showMainScreen();
    alert('❌ Error de conexión al enviar el evento.');
  });
}

// Función para eliminar el evento en Google Calendar
function deleteGoogleCalendarEvent(eventId) {
  fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${googleAuthToken}`
    }
  })
  .then(res => {
    if (res.ok || res.status === 204) {
      console.log('Evento eliminado correctamente de Google Calendar.');
    } else {
      console.error('No se pudo eliminar el evento de Google Calendar.');
    }
  })
  .catch(err => {
    console.error('Error al intentar eliminar el evento de Google Calendar:', err);
  });
}

// ============================================
// NOTIFICACIONES E INICIALIZACIÓN
// ============================================
function requestNotificationPermission() {
  if ('Notification' in window) {
    Notification.requestPermission();
  }
}

loadHabits();
renderHabits();
initGoogleApi();
requestNotificationPermission();