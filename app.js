// ===== FIREBASE INITIALIZATION =====
const firebaseConfig = {
  apiKey: "AIzaSyBteLLye81jNGLEwUTu57c5tgz5D-qw9_g",
  authDomain: "progress-pal-7713c.firebaseapp.com",
  projectId: "progress-pal-7713c",
  storageBucket: "progress-pal-7713c.firebasestorage.app",
  messagingSenderId: "376667237842",
  appId: "1:376667237842:web:9d20638b3f589add676c0b",
  measurementId: "G-7KDQ8BKF9K"
};

// IMPORTANT: this relies on the script tags in index.html:
// <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"></script>

if (typeof firebase === "undefined") {
  console.error("Firebase SDK not loaded. Check your script tags in index.html.");
}

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ===== GLOBAL STATE =====
let currentUser = null;       // string: username
let userEntries = [];         // array of entry objects loaded from Firestore

// ===== ELEMENTS =====
const splash = document.getElementById('splashScreen');
const login = document.getElementById('loginScreen');
const mainApp = document.getElementById('mainApp');

const usernameInput = document.getElementById('usernameInput');

const displayUsername = document.getElementById('displayUsername');
const profileUsername = document.getElementById('profileUsername');
const dateJoinedEl = document.getElementById('dateJoined');

const sections = [
  document.getElementById('homeSection'),
  document.getElementById('workoutSection'),
  document.getElementById('addSection'),
  document.getElementById('progressSection'),
  document.getElementById('profileSection')
];
const navItems = document.querySelectorAll('#bottomNav .nav-item');

// Add‑entry form
const entryForm = document.getElementById("newEntryForm");

// Calendar elements
let currentCalendarDate = new Date();
const calendarMonthEl = document.getElementById('calendarMonth');
const calendarDaysEl = document.getElementById('calendarDays');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');

// Modal
const closeModalBtn = document.getElementById('closeModal');
const entryModal = document.getElementById('entryModal');

// Clear data button
const clearDataBtn = document.getElementById('clearDataBtn');

// Chart
let weightChartInstance = null;

// ===== UI HELPERS =====

function showMainApp() {
  document.getElementById("usernameLoginScreen").style.display = "none";
  login.style.display = 'none';
  mainApp.style.display = 'flex';
  setTimeout(() => mainApp.classList.add('show'), 50);
  activateTab(0);
}

function showLogin() {
  login.style.display = 'flex';
  setTimeout(() => login.classList.add('show'), 50);
}

function activateTab(index) {
  sections.forEach(sec => sec && sec.classList.remove('active'));
  navItems.forEach(nav => {
    if (nav) nav.style.color = '#aaa';
  });

  const target = sections[index];
  if (target) target.classList.add('active');

  if (navItems[index]) {
    navItems[index].style.color = 'var(--primary-color)';
  }

  if (index === 0) {
    setTimeout(() => {
      updateHomePageBodyComposition();
    }, 50);
  }
}

// ===== SPLASH SCREEN =====
splash.style.display = 'flex';
login.style.display = 'none';
mainApp.style.display = 'none';

function goFromSplash() {
  splash.classList.add('fade-out');

  function hideSplash() {
    splash.style.display = 'none';
    // For now, always go to login screen (we're not doing auto‑login)
    document.getElementById("usernameLoginScreen").style.display = "flex";
  }

  splash.addEventListener('transitionend', hideSplash, { once: true });
  setTimeout(() => {
    splash.removeEventListener('transitionend', hideSplash);
    hideSplash();
  }, 700);
}

splash.addEventListener('click', goFromSplash);
setTimeout(goFromSplash, 2000);

// ===== PROFILE / USERNAME HANDLING (FIREBASE ONLY) =====

// Set profile UI from a profile object stored in Firestore
function setUserProfile(profile) {
  currentUser = profile.username;

  displayUsername.textContent = profile.username;
  profileUsername.textContent = profile.username;

  const firstNameEl = document.getElementById('displayFirstName');
  const lastNameEl = document.getElementById('displayLastName');
  const usernameCardEl = document.getElementById('displayUsernameCard');
  const dobEl = document.getElementById('displayDOB');
  const heightEl = document.getElementById('displayHeight');

  if (firstNameEl) firstNameEl.textContent = `First Name: ${profile.firstName || ''}`;
  if (lastNameEl) lastNameEl.textContent = `Last Name: ${profile.lastName || ''}`;
  if (usernameCardEl) usernameCardEl.textContent = `Username: ${profile.username || ''}`;

  if (profile.dob) {
    const dobDate = new Date(profile.dob + 'T00:00:00');
    const dobFormatted = dobDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    dobEl.textContent = `Date of Birth: ${dobFormatted}`;
  } else {
    dobEl.textContent = 'Date of Birth: -';
  }

  if (profile.height) {
    heightEl.textContent = `Height: ${profile.height} cm`;
  } else {
    heightEl.textContent = 'Height: -';
  }

  if (profile.dateJoined) {
    const joinedDate = new Date(profile.dateJoined);
    const joinedFormatted = joinedDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    dateJoinedEl.textContent = `Joined: ${joinedFormatted}`;
  } else {
    dateJoinedEl.textContent = '';
  }
}

// Save username & profile to Firestore, then show main app
function saveUsername() {
  const username = document.getElementById('usernameInput').value.trim();
  const firstName = document.getElementById('firstNameInput').value.trim();
  const lastName = document.getElementById('lastNameInput').value.trim();
  const dob = document.getElementById('dobInput').value.trim();
  const height = document.getElementById('heightInput').value.trim();

  if (!username || !firstName || !lastName || !dob || !height) {
    alert('Please fill in all fields: username, first name, last name, date of birth, and height');
    return;
  }

  const profileData = {
    username,
    firstName,
    lastName,
    dob,
    height,
    dateJoined: new Date().toISOString()
  };

  db.collection("users")
    .doc(username)
    .set({ profile: profileData }, { merge: true })
    .then(() => {
      console.log("Profile saved to Firebase");
      setUserProfile(profileData);

      login.classList.remove('show');
      login.classList.add('fade-out');

      login.addEventListener('transitionend', function handler() {
        login.style.display = 'none';
        login.classList.remove('fade-out');
        showMainApp();
        login.removeEventListener('transitionend', handler);
      });

      // Load entries for this user
      loadEntries(username);
    })
    .catch(err => {
      console.error("Error saving profile:", err);
      alert("There was an error saving your profile. Please try again.");
    });
}

// Attach saveUsername to the Continue button via HTML onclick
// <button type="button" onclick="saveUsername()" ...>Continue</button>

// ===== NAVIGATION =====
navItems.forEach((item, index) => {
  item.addEventListener('click', () => activateTab(index));
});

// ===== SVG FILL HELPERS =====
function fillSVG(objectElement, percentage) {
  const svgDoc = objectElement.contentDocument;
  if (!svgDoc) return;

  const clipRect = svgDoc.querySelector('.clip-rect');
  if (!clipRect) return;

  const svg = svgDoc.querySelector('svg');
  if (!svg) return;

  const viewBox = svg.getAttribute('viewBox');
  if (!viewBox) return;

  const viewBoxValues = viewBox.split(' ');
  const svgHeight = parseFloat(viewBoxValues[3]);
  const svgWidth = parseFloat(viewBoxValues[2]);

  const validPercentage = Math.max(0, Math.min(100, percentage));
  const fillHeight = (validPercentage / 100) * svgHeight;
  const clipY = svgHeight - fillHeight;

  clipRect.setAttribute('y', clipY);
  clipRect.setAttribute('height', fillHeight);
  clipRect.setAttribute('width', svgWidth);
}

function updateHomePageBodyComposition() {
  const fatPercentageEl = document.getElementById('fatPercentage');
  const musclePercentageEl = document.getElementById('musclePercentage');
  const h2oPercentageEl = document.getElementById('h2oPercentage');

  if (!userEntries || userEntries.length === 0) {
    fatPercentageEl.textContent = '-';
    musclePercentageEl.textContent = '-';
    h2oPercentageEl.textContent = '-';
    return;
  }

  const recentEntry = [...userEntries].sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  if (recentEntry.fat != null && recentEntry.fat !== '') {
    fatPercentageEl.textContent = recentEntry.fat + '%';
  } else {
    fatPercentageEl.textContent = '-';
  }

  if (recentEntry.muscle != null && recentEntry.muscle !== '') {
    musclePercentageEl.textContent = recentEntry.muscle + '%';
  } else {
    musclePercentageEl.textContent = '-';
  }

  if (recentEntry.h2o != null && recentEntry.h2o !== '') {
    h2oPercentageEl.textContent = recentEntry.h2o + '%';
  } else {
    h2oPercentageEl.textContent = '-';
  }

  const fatSVG = document.getElementById('fatSVG');
  const muscleSVG = document.getElementById('muscleSVG');
  const h2oSVG = document.getElementById('h2oSVG');

  const fillSVGWithRetry = (svg, value, retries = 3) => {
    if (!svg) return;

    const tryFill = () => {
      if (svg.contentDocument) {
        fillSVG(svg, value);
      } else if (retries > 0) {
        setTimeout(() => fillSVGWithRetry(svg, value, retries - 1), 100);
      }
    };

    tryFill();
    svg.addEventListener('load', () => tryFill(), { once: true });
  };

  if (fatSVG && recentEntry.fat != null && recentEntry.fat !== '') {
    fillSVGWithRetry(fatSVG, parseFloat(recentEntry.fat));
  }
  if (muscleSVG && recentEntry.muscle != null && recentEntry.muscle !== '') {
    fillSVGWithRetry(muscleSVG, parseFloat(recentEntry.muscle));
  }
  if (h2oSVG && recentEntry.h2o != null && recentEntry.h2o !== '') {
    fillSVGWithRetry(h2oSVG, parseFloat(recentEntry.h2o));
  }
}

// ===== HOME PAGE STATS =====
function updateHomePageWeight() {
  const homeWeightEl = document.getElementById('homeWeight');
  const homeWeightChangeEl = document.getElementById('homeWeightChange');

  const currentYear = new Date().getFullYear();
  const yearEntries = userEntries.filter(entry => {
    const entryYear = new Date(entry.date + 'T00:00:00').getFullYear();
    return entryYear === currentYear && entry.weight != null;
  });

  if (yearEntries.length === 0) {
    homeWeightEl.textContent = '- kg';
    homeWeightChangeEl.textContent = '- kg this year';
  } else if (yearEntries.length === 1) {
    const weight = yearEntries[0].weight;
    homeWeightEl.textContent = weight + ' kg';
    homeWeightChangeEl.textContent = '0 kg this year';
  } else {
    const sortedByDate = [...yearEntries].sort((a, b) => new Date(a.date) - new Date(b.date));
    const earliestWeight = sortedByDate[0].weight;
    const latestWeight = sortedByDate[sortedByDate.length - 1].weight;
    const weightChange = latestWeight - earliestWeight;
    const changeSign = weightChange >= 0 ? '+' : '';

    homeWeightEl.textContent = latestWeight + ' kg';
    homeWeightChangeEl.textContent = changeSign + weightChange.toFixed(1) + ' kg this year';
  }
}

function updateHomePageGymVisits() {
  const homeGymVisitsEl = document.getElementById('homeGymVisits');
  const currentYear = new Date().getFullYear();

  const gymVisitsCount = userEntries.filter(entry => {
    const entryYear = new Date(entry.date + 'T00:00:00').getFullYear();
    return entryYear === currentYear;
  }).length;

  homeGymVisitsEl.textContent = gymVisitsCount;
}

// ===== WEIGHT PROGRESS CHART (FROM FIRESTORE ENTRIES) =====
function initializeWeightChart() {
  const ctx = document.getElementById('progressChart');
  if (!ctx) return;

  if (weightChartInstance) {
    weightChartInstance.destroy();
  }

  const currentYear = new Date().getFullYear();

  const weightEntries = userEntries
    .filter(entry => {
      const entryYear = new Date(entry.date + 'T00:00:00').getFullYear();
      return entryYear === currentYear && entry.weight != null;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const labels = weightEntries.map(entry => {
    const date = new Date(entry.date + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const data = weightEntries.map(entry => entry.weight);

  weightChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length > 0 ? labels : ['No data'],
      datasets: [
        {
          label: 'Weight (kg)',
          data: data.length > 0 ? data : [0],
          tension: 0.4,
          fill: true,
          borderColor: '#FFD700',
          backgroundColor: 'rgba(255, 215, 0, 0.1)',
          borderWidth: 2,
          pointBackgroundColor: '#FFD700',
          pointRadius: 5,
          pointHoverRadius: 7
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: false,
          ticks: { color: '#ccc' },
          grid: { color: '#444' }
        },
        x: {
          ticks: { color: '#ccc' },
          grid: { color: '#444' }
        }
      }
    }
  });
}

// ===== CALENDAR (FROM FIRESTORE ENTRIES) =====
function generateCalendar(date = currentCalendarDate) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const monthName = new Date(year, month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  calendarMonthEl.textContent = monthName;
  calendarDaysEl.innerHTML = '';

  const today = new Date();

  const entries = userEntries || [];

  // Previous month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day other-month';
    dayEl.textContent = daysInPrevMonth - i;
    calendarDaysEl.appendChild(dayEl);
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    dayEl.textContent = day;

    if (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    ) {
      dayEl.classList.add('today');
    }

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const entryForDay = entries.find(entry => entry.date === dateStr);

    if (entryForDay) {
      dayEl.classList.add('has-entry');
      dayEl.style.cursor = 'pointer';
      dayEl.addEventListener('click', () => showEntryModal(entryForDay));
    }

    calendarDaysEl.appendChild(dayEl);
  }

  // Next month padding (to fill 6 rows)
  const totalCells = calendarDaysEl.children.length;
  const remainingCells = 42 - totalCells;
  for (let day = 1; day <= remainingCells; day++) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day other-month';
    dayEl.textContent = day;
    calendarDaysEl.appendChild(dayEl);
  }
}

function showEntryModal(entry) {
  const dateObj = new Date(entry.date + 'T00:00:00');
  const dateStr = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  document.getElementById('modalDate').textContent = dateStr;
  document.getElementById('modalWeight').textContent = entry.weight != null ? entry.weight + ' kg' : '-';
  document.getElementById('modalFat').textContent = entry.fat != null ? entry.fat + '%' : '-';
  document.getElementById('modalMuscle').textContent = entry.muscle != null ? entry.muscle + '%' : '-';
  document.getElementById('modalH2O').textContent = entry.h2o != null ? entry.h2o + '%' : '-';

  entryModal.style.display = 'flex';
}

if (closeModalBtn) {
  closeModalBtn.addEventListener('click', () => {
    entryModal.style.display = 'none';
  });
}

if (entryModal) {
  entryModal.addEventListener('click', (e) => {
    if (e.target === entryModal) {
      entryModal.style.display = 'none';
    }
  });
}

if (prevMonthBtn) {
  prevMonthBtn.addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    generateCalendar(currentCalendarDate);
  });
}

if (nextMonthBtn) {
  nextMonthBtn.addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    generateCalendar(currentCalendarDate);
  });
}

// ===== ENTRIES: LOAD & SAVE (FIREBASE ONLY) =====

function loadEntries(username) {
  if (!username) return;

  return db.collection("users")
    .doc(username)
    .collection("entries")
    .orderBy("date")
    .get()
    .then(snapshot => {
      userEntries = snapshot.docs.map(doc => doc.data());
      console.log("Loaded entries from Firebase:", userEntries.length);

      updateHomePageWeight();
      updateHomePageGymVisits();
      updateHomePageBodyComposition();
      generateCalendar(currentCalendarDate);
      initializeWeightChart();
    })
    .catch(err => {
      console.error("Error loading entries:", err);
    });
}

function saveEntry() {
  const username = displayUsername.textContent.trim();
  if (!username) {
    alert("No user logged in");
    return;
  }

  const date = document.getElementById("entryDate").value;
  const weight = document.getElementById("entryWeight").value;
  const fat = document.getElementById("entryFat").value;
  const muscle = document.getElementById("entryMuscle").value;
  const h2o = document.getElementById("entryH2O").value;

  if (!date) {
    alert("Please select a date");
    return;
  }

  if (!weight && !fat && !muscle && !h2o) {
    alert("Please fill in at least one field");
    return;
  }

  const entryData = {
    date,
    weight: weight ? parseFloat(weight) : null,
    fat: fat ? parseFloat(fat) : null,
    muscle: muscle ? parseFloat(muscle) : null,
    h2o: h2o ? parseFloat(h2o) : null,
    timestamp: new Date().toISOString()
  };

  db.collection("users")
    .doc(username)
    .collection("entries")
    .doc(date)
    .set(entryData, { merge: true })
    .then(() => {
      console.log("Entry saved to Firebase");

      // Update local in‑memory entries
      const idx = userEntries.findIndex(e => e.date === date);
      if (idx !== -1) {
        userEntries[idx] = entryData;
      } else {
        userEntries.push(entryData);
      }

      document.getElementById("newEntryForm").reset();

      updateHomePageWeight();
      updateHomePageGymVisits();
      updateHomePageBodyComposition();
      generateCalendar(currentCalendarDate);
      initializeWeightChart();

      alert("Entry saved!");
      activateTab(0);
    })
    .catch(err => {
      console.error("Error saving entry:", err);
      alert("There was an error saving your entry.");
    });
}

if (entryForm) {
  entryForm.addEventListener("submit", function (e) {
    e.preventDefault();
    saveEntry();
  });
}

// ===== CLEAR DATA (DELETE ENTRIES FROM FIREBASE) =====
if (clearDataBtn) {
  clearDataBtn.addEventListener('click', () => {
    if (!currentUser) {
      alert("No user logged in.");
      return;
    }

    const confirmed = confirm(
      'Are you sure you want to delete all saved entries? This cannot be undone.'
    );
    if (!confirmed) return;

    db.collection("users")
      .doc(currentUser)
      .collection("entries")
      .get()
      .then(snapshot => {
        const batch = db.batch();
        snapshot.forEach(doc => batch.delete(doc.ref));
        return batch.commit();
      })
      .then(() => {
        userEntries = [];
        updateHomePageWeight();
        updateHomePageGymVisits();
        updateHomePageBodyComposition();
        generateCalendar(currentCalendarDate);
        initializeWeightChart();
        alert('All saved entries have been cleared!');
      })
      .catch(err => {
        console.error("Error clearing data:", err);
        alert("There was an error clearing your data.");
      });
  });
}

// ===== INITIAL FALLBACK RENDERS (EMPTY STATE) =====
updateHomePageWeight();
updateHomePageGymVisits();
updateHomePageBodyComposition();
generateCalendar(currentCalendarDate);

function checkUsername() {
  const username = document.getElementById("loginUsernameInput").value.trim();
  if (!username) {
    alert("Please enter a username");
    return;
  }

  db.collection("users")
    .doc(username)
    .get()
    .then(doc => {
      if (doc.exists) {
        // USER EXISTS → LOGIN
        const profile = doc.data().profile;
        setUserProfile(profile);
        loadEntries(username);
        showMainApp();
      } else {
        // USER DOES NOT EXIST → SHOW SIGNUP FORM
        alert("Username not found. Please create an account.");

        // Hide username login screen
        document.getElementById("usernameLoginScreen").style.display = "none";

        // Show signup screen
        const signup = document.getElementById("loginScreen");
        signup.style.display = "flex";
        signup.classList.add("show");

        // Pre-fill username
        document.getElementById("usernameInput").value = username;
      }
    })
    .catch(err => {
      console.error("Error checking username:", err);
      alert("There was an error checking the username.");
    });

}
