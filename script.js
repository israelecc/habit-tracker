import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBgnTqtyjaz_oiBfa5JnxxzhBA5U1azoMU",
  authDomain: "tracker-1abcd.firebaseapp.com",
  projectId: "tracker-1abcd",
  storageBucket: "tracker-1abcd.firebasestorage.app",
  messagingSenderId: "646698426313",
  appId: "1:646698426313:web:c34924b5da6576c1111218"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const habitsCollection = collection(db, "habits");

// REFERENCIAS DOM
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
const emptyStateText = document.getElementById('empty-state-text');
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
const weekTabsContainer = document.getElementById('week-tabs');

let googleAuthToken = localStorage.getItem('google_auth_token') || null;
const GOOGLE_CLIENT_ID = '518511122002-qnq37t3ua9unsj37n5n97k486j4m5lje.apps.googleusercontent.com';

// ESTADO DE LA APP
let habits = [];
let selectedDays = [];
let currentHabitId = null;
let focusTimer = null;
let focusSeconds = 0;
let focusTotalSeconds = 0;
let activeDayTab = getTodayName(); // Selecciona hoy por defecto

// ============================================
// SINCRONIZACIÓN EN TIEMPO REAL (FIREBASE)
// ============================================
function listenToFirestore() {
  onSnapshot(habitsCollection, (snapshot) => {
    habits = [];
    snapshot.forEach((doc) => {
      habits.push(doc.data());
    });
    renderWeekTabs();
    renderHabits();
    if (currentHabitId) {
      renderDetail();
    }
  });
}

async function saveHabitToFirestore(habit) {
  try {
    await setDoc(doc(db, "habits", String(habit.id)), habit);
  } catch (e) {
    console.error("Error al guardar en Firebase: ", e);
  }
}

async function deleteHabitFromFirestore(habitId) {
  try {
    await deleteDoc(doc(db, "habits", String(habitId)));
  } catch (e) {
    console.error("Error al eliminar en Firebase: ", e);
  }
}

// NAVEGACIÓN ENTRE PANTALLAS
function showMainScreen() {
  mainScreen.classList.remove('hidden');
  formScreen.classList.add('hidden');
  detailScreen.classList.add('hidden');
  focusScreen.classList.add('hidden');
  renderWeekTabs();
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

// TEMPORIZADOR DE CONCENTRACIÓN
function startFocusTimer(durationSeconds) {
  focusSeconds = durationSeconds;
  focusTotalSeconds = durationSeconds;
  
  if (focusTimer) clearInterval(focusTimer);
  
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

// MANEJO DE PESTAÑAS DE LA SEMANA
if (weekTabsContainer) {
  weekTabsContainer.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.week-tab-btn');
    if (!tabBtn) return;
    
    activeDayTab = tabBtn.dataset.day;
    renderWeekTabs();
    renderHabits();
  });
}

function renderWeekTabs() {
  const today = getTodayName();
  const tabs = weekTabsContainer.querySelectorAll('.week-tab-btn');
  
  tabs.forEach(tab => {
    const day = tab.dataset.day;
    
    // Marcar activo
    if (day === activeDayTab) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
    
    // Indicador del día actual
    if (day === today) {
      tab.classList.add('is-today-indicator');
    } else {
      tab.classList.remove('is-today-indicator');
    }
  });
}

// MANEJO DEL FORMULARIO
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

if (deleteHabitBtn) {
  deleteHabitBtn.addEventListener('click', async () => {
    const habit = habits.find(h => h.id === currentHabitId);
    if (!habit) return;

    const confirmDelete = confirm(`¿Estás seguro de que deseas eliminar el hábito "${habit.name}"?`);
    if (confirmDelete) {
      if (habit.googleEventId) {
        deleteGoogleCalendarEvent(habit.googleEventId);
      }

      await deleteHabitFromFirestore(currentHabitId);
      currentHabitId = null;
      showMainScreen();
    }
  });
}

habitForm.addEventListener('submit', async (e) => {
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

  if (calendarCheckbox.checked) {
    createGoogleCalendarEvent(habit);
  } else {
    await saveHabitToFirestore(habit);
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

// RENDERIZAR LISTA FILTRADA POR DÍA
function renderHabits() {
  habitsList.innerHTML = '';

  // Filtrar hábitos programados para la pestaña seleccionada
  const filteredHabits = habits.filter(habit => habit.days && habit.days.includes(activeDayTab));

  if (filteredHabits.length === 0) {
    emptyState.classList.remove('hidden');
    habitsList.classList.add('hidden');
    const today = getTodayName();
    if (activeDayTab === today) {
      emptyStateText.textContent = "¡Día libre! No tienes hábitos agendados para hoy.";
    } else {
      emptyStateText.textContent = `No tienes hábitos agendados para el ${activeDayTab}.`;
    }
    return;
  }

  emptyState.classList.add('hidden');
  habitsList.classList.remove('hidden');

  filteredHabits.forEach(habit => {
    const habitCard = document.createElement('div');
    habitCard.className = 'habit-card';
    habitCard.style.cursor = 'pointer';
    
    const daysText = habit.days ? habit.days.join(', ') : '';
    const completionsThisWeek = getCompletionsThisWeek(habit);
    const today = getTodayName();
    const isTodayTab = activeDayTab === today;
    
    habitCard.innerHTML = `
      <div class="habit-card-header">
        <h3>${habit.name}</h3>
        <span class="habit-duration">${habit.duration} min</span>
      </div>
      <p class="habit-days">📅 ${daysText} (${habit.type || 'recurrente'})</p>
      <p class="habit-completions">✅ ${completionsThisWeek} veces completado esta semana</p>
      ${habit.needFocus ? '<p class="habit-focus">🎯 Modo concentración</p>' : ''}
      ${isTodayTab ? '<p class="habit-today">✨ Programado para hoy</p>' : ''}
    `;
    
    habitCard.addEventListener('click', () => showDetailScreen(habit.id));
    habitsList.appendChild(habitCard);
  });
}

function renderDetail() {
  const habit = habits.find(h => h.id === currentHabitId);
  if (!habit) return;

  detailTitle.textContent = habit.name;
  detailDays.textContent = `${habit.days ? habit.days.join(', ') : ''} (${habit.type || 'recurrente'})`;
  detailDuration.textContent = `${habit.duration} minutos`;
  
  if (habit.needFocus) {
    detailFocusText.textContent = `${habit.allowedApps ? habit.allowedApps.join(', ') : 'Ninguna'}`;
    detailFocusText.parentElement.classList.remove('hidden');
  } else {
    detailFocusText.parentElement.classList.add('hidden');
  }

  renderLogs(habit);
}

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

// COMPLETAR HÁBITO
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

async function completeHabitWithNotes(notes, habit) {
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

  if (!habit.logs) habit.logs = [];
  habit.logs.push(logEntry);
  
  await saveHabitToFirestore(habit);
  
  stopFocusTimer();
  focusSeconds = 0;
  focusTotalSeconds = 0;
  
  showDetailScreen(habit.id);
}

finishFocusBtn.addEventListener('click', () => {
  const habit = habits.find(h => h.id === currentHabitId);
  if (!habit) return;
  
  const notes = prompt('¿Qué aprendiste o qué hiciste en esta sesión? (opcional)');
  completeHabitWithNotes(notes, habit);
});

// AUXILIARES
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

// INTEGRACIÓN CON GOOGLE CALENDAR
let tokenClient;

function initGoogleApi() {
  if (googleAuthToken) {
    updateConnectButtonState(true);
  }

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
        localStorage.setItem('google_auth_token', googleAuthToken);
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
    googleAuthToken = localStorage.getItem('google_auth_token');
  }

  if (!googleAuthToken) {
    alert('⚠️ No hay sesión activa. Haz clic primero en "📅 Conectar Google Calendar".');
    saveHabitToFirestore(habit);
    showMainScreen();
    return;
  }

  executeCalendarInsert(habit);
}

function executeCalendarInsert(habit) {
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
      habit.googleEventId = result.id;
      await saveHabitToFirestore(habit);
      showMainScreen();
      alert(`✅ ¡Confirmado! Evento "${habit.name}" creado en tu Google Calendar.`);
    } else {
      if (res.status === 401) {
        localStorage.removeItem('google_auth_token');
        googleAuthToken = null;
        updateConnectButtonState(false);
        alert('⚠️ La sesión de Google expiró. Vuelve a hacer clic en "Conectar Google Calendar".');
      } else {
        alert(`❌ Error de Google Calendar (${result.error.code}): ${result.error.message}`);
      }
      await saveHabitToFirestore(habit);
      showMainScreen();
    }
  })
  .catch(async (err) => {
    console.error('Error de red:', err);
    await saveHabitToFirestore(habit);
    showMainScreen();
    alert('❌ Error de conexión al enviar el evento.');
  });
}

function deleteGoogleCalendarEvent(eventId) {
  if (!googleAuthToken) {
    googleAuthToken = localStorage.getItem('google_auth_token');
  }

  if (!googleAuthToken) return;

  fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${googleAuthToken}`
    }
  })
  .then(res => {
    if (res.ok || res.status === 204) {
      console.log('Evento eliminado correctamente de Google Calendar.');
    }
  })
  .catch(err => {
    console.error('Error al intentar eliminar el evento de Google Calendar:', err);
  });
}

// INICIALIZACIÓN
listenToFirestore();
initGoogleApi();
