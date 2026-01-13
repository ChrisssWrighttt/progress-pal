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
  navItems.forEach(nav => nav.style.color = '#aaa');

  const target = sections[index];
  if (target) target.classList.add('active');
  navItems[index].style.color = 'var(--primary-color)';

  if (index === 0) {
    setTimeout(updateHomePageBodyComposition, 50);
  }

  if (index === 1) {
    showMuscleGroups();   // ⭐ NEW
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

    // ⭐ AUTO‑LOGIN LOGIC ⭐
    const savedUsername = localStorage.getItem("savedUsername");

    if (savedUsername) {
      // Try to auto-load the user's profile
      db.collection("users").doc(savedUsername).get().then(doc => {
        if (doc.exists) {
          const profile = doc.data().profile;
          setUserProfile(profile);
          loadEntries(savedUsername);
          showMainApp();
        } else {
          // If somehow the saved username doesn't exist anymore
          localStorage.removeItem("savedUsername");
          document.getElementById("usernameLoginScreen").style.display = "flex";
        }
      });
    } else {
      // No saved username → show username login screen
      document.getElementById("usernameLoginScreen").style.display = "flex";
    }
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

  // ⭐ Save username on this device
  localStorage.setItem("savedUsername", username);

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

  // Helper: find the most recent entry that actually has this field filled
  function findMostRecentValue(key) {
    const sorted = [...userEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
    for (const entry of sorted) {
      if (entry[key] != null && entry[key] !== "") {
        return entry[key];
      }
    }
    return null;
  }

  // Get the most recent valid values
  const fat = findMostRecentValue("fat");
  const muscle = findMostRecentValue("muscle");
  const h2o = findMostRecentValue("h2o");

  // Update text
  fatPercentageEl.textContent = fat != null ? fat + "%" : "-";
  musclePercentageEl.textContent = muscle != null ? muscle + "%" : "-";
  h2oPercentageEl.textContent = h2o != null ? h2o + "%" : "-";

  // SVG elements
  const fatSVG = document.getElementById('fatSVG');
  const muscleSVG = document.getElementById('muscleSVG');
  const h2oSVG = document.getElementById('h2oSVG');

  // Retry logic stays the same
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

  // Update SVGs using the same most-recent-value logic
  if (fatSVG && fat != null) fillSVGWithRetry(fatSVG, parseFloat(fat));
  if (muscleSVG && muscle != null) fillSVGWithRetry(muscleSVG, parseFloat(muscle));
  if (h2oSVG && h2o != null) fillSVGWithRetry(h2oSVG, parseFloat(h2o));
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

  // Existing fields
  document.getElementById('modalWeight').textContent =
    entry.weight != null ? entry.weight + ' kg' : '-';

  document.getElementById('modalFat').textContent =
    entry.fat != null ? entry.fat + '%' : '-';

  document.getElementById('modalMuscle').textContent =
    entry.muscle != null ? entry.muscle + '%' : '-';

  document.getElementById('modalH2O').textContent =
    entry.h2o != null ? entry.h2o + '%' : '-';

  // ⭐ NEW MEASUREMENTS ⭐
  document.getElementById('modalLeftBicepRelaxed').textContent =
    entry.leftBicepRelaxed != null ? entry.leftBicepRelaxed + ' cm' : '-';

  document.getElementById('modalLeftBicepFlexed').textContent =
    entry.leftBicepFlexed != null ? entry.leftBicepFlexed + ' cm' : '-';

  document.getElementById('modalRightBicepRelaxed').textContent =
    entry.rightBicepRelaxed != null ? entry.rightBicepRelaxed + ' cm' : '-';

  document.getElementById('modalRightBicepFlexed').textContent =
    entry.rightBicepFlexed != null ? entry.rightBicepFlexed + ' cm' : '-';

  document.getElementById('modalChest').textContent =
    entry.chest != null ? entry.chest + ' cm' : '-';

  document.getElementById('modalWaist').textContent =
    entry.waist != null ? entry.waist + ' cm' : '-';

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
      updateHomePageMeasurements();
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
  const leftBicepRelaxed = document.getElementById("entryLeftBicepRelaxed").value;
  const leftBicepFlexed = document.getElementById("entryLeftBicepFlexed").value;
  const rightBicepRelaxed = document.getElementById("entryRightBicepRelaxed").value;
  const rightBicepFlexed = document.getElementById("entryRightBicepFlexed").value;
  const chest = document.getElementById("entryChest").value;
  const waist = document.getElementById("entryWaist").value;

  if (!date) {
    alert("Please select a date");
    return;
  }

  // Build entryData ONLY with fields the user actually filled in
  const entryData = { date, timestamp: new Date().toISOString() };

  function addIfFilled(key, value) {
    if (value !== "") entryData[key] = parseFloat(value);
  }

  addIfFilled("weight", weight);
  addIfFilled("fat", fat);
  addIfFilled("muscle", muscle);
  addIfFilled("h2o", h2o);
  addIfFilled("leftBicepRelaxed", leftBicepRelaxed);
  addIfFilled("leftBicepFlexed", leftBicepFlexed);
  addIfFilled("rightBicepRelaxed", rightBicepRelaxed);
  addIfFilled("rightBicepFlexed", rightBicepFlexed);
  addIfFilled("chest", chest);
  addIfFilled("waist", waist);

  if (Object.keys(entryData).length === 2) {
    alert("Please fill in at least one field");
    return;
  }

  db.collection("users")
    .doc(username)
    .collection("entries")
    .doc(date)
    .set(entryData, { merge: true })
    .then(() => {
      console.log("Entry saved to Firebase");

      // Update local memory version
      const idx = userEntries.findIndex(e => e.date === date);
      if (idx !== -1) {
        userEntries[idx] = { ...userEntries[idx], ...entryData };
      } else {
        userEntries.push(entryData);
      }

      document.getElementById("newEntryForm").reset();

      updateHomePageWeight();
      updateHomePageGymVisits();
      updateHomePageBodyComposition();
      updateHomePageMeasurements();
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
      'Are you sure you want to delete ALL saved data? This cannot be undone.'
    );
    if (!confirmed) return;

    const userRef = db.collection("users").doc(currentUser);

    Promise.all([
      deleteSubcollection(userRef, "entries"),
      deleteSubcollection(userRef, "workouts")
    ])
      .then(() => {
        // Clear local memory
        userEntries = [];

        // Reload from Firestore to confirm everything is gone
        return loadEntries(currentUser);
      })
      .then(() => {
        updateHomePageWeight();
        updateHomePageGymVisits();
        updateHomePageBodyComposition();
        updateHomePageMeasurements();
        generateCalendar(currentCalendarDate);
        initializeWeightChart();

        alert("All saved data has been cleared!");
      })
      .catch(err => {
        console.error("Error clearing data:", err);
        alert("There was an error clearing your data.");
      });
  });
}

// Helper to delete all docs in a subcollection
function deleteSubcollection(userRef, subcollectionName) {
  return userRef
    .collection(subcollectionName)
    .get()
    .then(snapshot => {
      const batch = db.batch();
      snapshot.forEach(doc => batch.delete(doc.ref));
      return batch.commit();
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

        // ⭐ REMEMBER USERNAME ON THIS DEVICE
        localStorage.setItem("savedUsername", username);

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

document.getElementById("logoutBtn").addEventListener("click", logoutUser);

function logoutUser() {
  // Remove saved username
  localStorage.removeItem("savedUsername");

  const app = document.getElementById("mainApp");
  const loginScreen = document.getElementById("usernameLoginScreen");

  // Add fade-out class
  app.classList.add("fade-out-screen");

  // Trigger fade-out
  setTimeout(() => {
    app.classList.add("hide");

    // After fade-out completes, hide main app and show login
    setTimeout(() => {
      app.style.display = "none";
      app.classList.remove("fade-out-screen", "hide");

      // Show username login screen
      loginScreen.style.display = "flex";
      document.getElementById("loginUsernameInput").value = "";

    }, 500); // matches CSS transition time

  }, 10);
}

const muscleGroupOptions = {
  chest: [
    "Butterfly",
    "Cable",
    "Chest Press",
    "Free Weights",
    "Pec Fly",
    "Upper Chest Press"
  ],

  shoulders: [
    // add later
  ],

  arms: [
    // add later
  ],

  legs: [
    // add later
  ],

  core: [
    // add later
  ],

  cardio: [
    // add later
  ]
};


function showMuscleGroups() {
  const container = document.getElementById("workoutContainer");
  const headerTitle = document.getElementById("workoutHeaderTitle");

  if (headerTitle) headerTitle.textContent = "Workout";

  container.innerHTML = `
    <h2>Select Muscle Group</h2>
    <div class="menu-list">
      <div class="menu-item" onclick="selectMuscleGroup('chest')">
        <i class="fas fa-dumbbell icon"></i> Chest
      </div>
      <div class="menu-item" onclick="selectMuscleGroup('shoulders')">
        <i class="fas fa-arrows-alt-v icon"></i> Shoulders
      </div>
      <div class="menu-item" onclick="selectMuscleGroup('arms')">
        <i class="fas fa-hand-rock icon"></i> Arms
      </div>
      <div class="menu-item" onclick="selectMuscleGroup('legs')">
        <i class="fas fa-running icon"></i> Legs
      </div>
      <div class="menu-item" onclick="selectMuscleGroup('core')">
        <i class="fas fa-bullseye icon"></i> Core
      </div>
      <div class="menu-item" onclick="selectMuscleGroup('cardio')">
        <i class="fas fa-heartbeat icon"></i> Cardio
      </div>
    </div>
  `;
}

function selectMuscleGroup(group) {
  window.selectedMuscleGroup = group;

  const container = document.getElementById("workoutContainer");
  const headerTitle = document.getElementById("workoutHeaderTitle");

  if (headerTitle) headerTitle.textContent = group.charAt(0).toUpperCase() + group.slice(1);

  const options = muscleGroupOptions[group] || [];

  container.innerHTML = `
    <h2>${group.toUpperCase()}</h2>
    <div class="menu-list">
      ${options.map(item => `
        <div class="menu-item" onclick="selectMachine('${item}')">${item}</div>
      `).join("")}
    </div>
  `;
}

function selectMachine(machine) {
  window.selectedMachine = machine;

  const container = document.getElementById("workoutContainer");
  const headerTitle = document.getElementById("workoutHeaderTitle");

  if (headerTitle) headerTitle.textContent = machine;

  // Chest → Cable → Upper/Middle/Lower
  if (window.selectedMuscleGroup === "chest" && machine === "Cable") {
    const options = ["Upper", "Middle", "Lower"];

    container.innerHTML = `
      <h2>${machine.toUpperCase()}</h2>
      <div class="menu-list">
        ${options.map(o => `
          <div class="menu-item" onclick="selectTargetMuscle('${o}')">${o}</div>
        `).join("")}
      </div>
    `;
    return;
  }

  // All other chest exercises go straight to the form
  if (window.selectedMuscleGroup === "chest") {
    return selectTargetMuscle(machine);
  }

  // Other muscle groups (future)
  container.innerHTML = `
    <h2>${machine.toUpperCase()}</h2>
    <div class="menu-list">
      <div class="menu-item">Coming soon</div>
    </div>
  `;
}

let workoutChart = null;

function selectTargetMuscle(target) {
  // ⭐ ALWAYS set both values explicitly
  window.selectedTarget = target;

  // If coming from Chest → Butterfly, machine = target
  if (!window.selectedMachine) {
    window.selectedMachine = target;
  }

  const container = document.getElementById("workoutContainer");
  const headerTitle = document.getElementById("workoutHeaderTitle");

  if (headerTitle) headerTitle.textContent = `${target} Chest`;

  container.innerHTML = `
    <h2>${target.toUpperCase()} Chest</h2>

    <canvas id="workoutChart"></canvas>

    <form id="workoutEntryForm" class="entry-form">
      <div class="form-group">
        <label>Date</label>
        <input type="date" id="workoutDate" required>
      </div>

      <div class="form-group">
        <label>Seat Height</label>
        <input type="number" id="workoutSeat" step="1">
      </div>

      <div class="form-group">
        <label>Weight (kg)</label>
        <input type="number" id="workoutWeight" step="0.1">
      </div>

      <button type="submit" class="submit-btn">Save</button>
    </form>
  `;

  loadWorkoutData();

  document.getElementById("workoutEntryForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUser) {
      alert("No user logged in");
      return;
    }

    const date = document.getElementById("workoutDate").value;

    const entry = {
      date: date,
      muscleGroup: window.selectedMuscleGroup,
      machine: window.selectedMachine,
      target: window.selectedTarget,
      seat: document.getElementById("workoutSeat").value
        ? Number(document.getElementById("workoutSeat").value)
        : null,
      weight: document.getElementById("workoutWeight").value
        ? Number(document.getElementById("workoutWeight").value)
        : null,
      timestamp: Date.now()
    };

    try {
      await db.collection("users")
        .doc(currentUser)
        .collection("workouts")
        .add(entry);

      document.getElementById("workoutEntryForm").reset();
      alert("Workout saved!");
      loadWorkoutData();

    } catch (err) {
      console.error("Error saving workout:", err);
      alert("There was an error saving your workout.");
    }
  });
}   // ⭐ THIS is the correct closing brace


async function loadWorkoutData() {
  if (!currentUser) return;

  const canvas = document.getElementById("workoutChart");
  if (!canvas) return;

  try {
    const snapshot = await db.collection("users")
      .doc(currentUser)
      .collection("workouts")
      .where("muscleGroup", "==", window.selectedMuscleGroup)
      .where("machine", "==", window.selectedMachine)
      .where("target", "==", window.selectedTarget)
      .get();

    const all = snapshot.docs.map(doc => doc.data());

    // Sort by date
    all.sort((a, b) => new Date(a.date) - new Date(b.date));

    // ⭐ Only keep the latest 15 entries
    const latest = all.slice(-15);

    // Send to chart
    renderWorkoutChart({
      labels: latest.map(x => x.date),
      weights: latest.map(x => x.weight),
      seats: latest.map(x => x.seat)
    });

  } catch (err) {
    console.error("Error loading workout data:", err);
  }
}


function renderWorkoutChart(data) {
  const canvas = document.getElementById("workoutChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  if (workoutChart) {
    workoutChart.destroy();
  }

  workoutChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.labels.length ? data.labels : ["No data"],
      datasets: [{
        label: "Weight (kg)",
        data: data.weights.length ? data.weights : [0],
        borderColor: "#FFD700",
        backgroundColor: "rgba(255, 215, 0, 0.1)",
        borderWidth: 2,
        tension: 0.3,
        pointBackgroundColor: "#FFD700",
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const weight = context.raw;
              const seat = data.seats[context.dataIndex];
              return [
                `Weight: ${weight} kg`,
                `Seat: ${seat !== null ? seat : "N/A"}`
              ];
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: { color: "#ccc" },
          grid: { color: "#444" }
        },
        x: {
          ticks: { color: "#ccc" },
          grid: { color: "#444" }
        }
      }
    }
  });
}


function workoutGoBack() {
  // For now, just go back to muscle group selection
  showMuscleGroups();
  const headerTitle = document.getElementById("workoutHeaderTitle");
  if (headerTitle) headerTitle.textContent = "Workout";
}

function updateHomePageMeasurements() {
  // RESET UI IF NO ENTRIES
  if (!userEntries || userEntries.length === 0) {
    const fields = [
      "homeLeftBicepRelaxed",
      "homeLeftBicepRelaxedChange",
      "homeLeftBicepFlexed",
      "homeLeftBicepFlexedChange",
      "homeRightBicepRelaxed",
      "homeRightBicepRelaxedChange",
      "homeRightBicepFlexed",
      "homeRightBicepFlexedChange",
      "homeChest",
      "homeChestChange",
      "homeWaist",
      "homeWaistChange"
    ];

    fields.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = "-";
    });

    return;
  }

  const currentYear = new Date().getFullYear();

  const yearEntries = userEntries.filter(e => {
    return new Date(e.date + "T00:00:00").getFullYear() === currentYear;
  });

  // RESET UI IF NO ENTRIES THIS YEAR
  if (yearEntries.length === 0) {
    const fields = [
      "homeLeftBicepRelaxed",
      "homeLeftBicepRelaxedChange",
      "homeLeftBicepFlexed",
      "homeLeftBicepFlexedChange",
      "homeRightBicepRelaxed",
      "homeRightBicepRelaxedChange",
      "homeRightBicepFlexed",
      "homeRightBicepFlexedChange",
      "homeChest",
      "homeChestChange",
      "homeWaist",
      "homeWaistChange"
    ];

    fields.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = "-";
    });

    return;
  }

  const sorted = [...yearEntries].sort((a, b) => new Date(a.date) - new Date(b.date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const set = (idValue, idChange, firstVal, lastVal) => {
    const valueEl = document.getElementById(idValue);
    const changeEl = document.getElementById(idChange);

    if (!lastVal) {
      valueEl.textContent = "-";
      changeEl.textContent = "- this year";
      return;
    }

    valueEl.textContent = lastVal + '"';

    if (!firstVal) {
      changeEl.textContent = "0 this year";
      return;
    }

    const diff = lastVal - firstVal;
    const sign = diff >= 0 ? "+" : "";
    changeEl.textContent = `${sign}${diff.toFixed(1)}" this year`;
  };

  set("homeLeftBicepRelaxed", "homeLeftBicepRelaxedChange", first.leftBicepRelaxed, last.leftBicepRelaxed);
  set("homeLeftBicepFlexed", "homeLeftBicepFlexedChange", first.leftBicepFlexed, last.leftBicepFlexed);
  set("homeRightBicepRelaxed", "homeRightBicepRelaxedChange", first.rightBicepRelaxed, last.rightBicepRelaxed);
  set("homeRightBicepFlexed", "homeRightBicepFlexedChange", first.rightBicepFlexed, last.rightBicepFlexed);
  set("homeChest", "homeChestChange", first.chest, last.chest);
  set("homeWaist", "homeWaistChange", first.waist, last.waist);
}


function saveMeasurements() {
  if (!currentUser) {
    alert("No user logged in");
    return;
  }

  const date = new Date().toISOString().split("T")[0];

  const entryData = {
    date,
    timestamp: new Date().toISOString(),
    leftBicepRelaxed: parseFloat(mLeftRelaxed.value) || null,
    leftBicepFlexed: parseFloat(mLeftFlexed.value) || null,
    rightBicepRelaxed: parseFloat(mRightRelaxed.value) || null,
    rightBicepFlexed: parseFloat(mRightFlexed.value) || null,
    chest: parseFloat(mChest.value) || null,
    waist: parseFloat(mWaist.value) || null,
    isMeasurementOnly: true
  };

  db.collection("users")
    .doc(currentUser)
    .collection("entries")
    .doc(date)
    .set(entryData, { merge: true })
    .then(() => {
      // Update local memory
      const idx = userEntries.findIndex(e => e.date === date);
      if (idx !== -1) {
        userEntries[idx] = { ...userEntries[idx], ...entryData };
      } else {
        userEntries.push(entryData);
      }

      updateHomePageMeasurements();
      generateCalendar(currentCalendarDate);

      alert("Measurements saved!");
    })
    .catch(err => {
      console.error("Error saving measurements:", err);
      alert("There was an error saving your measurements.");
    });
}

