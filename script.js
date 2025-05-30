// ======================
// CONSTANTS AND CONFIGURATION
// ======================

const MORSE_CODE = {
  A: ".-",
  B: "-...",
  C: "-.-.",
  D: "-..",
  E: ".",
  F: "..-.",
  G: "--.",
  H: "....",
  I: "..",
  J: ".---",
  K: "-.-",
  L: ".-..",
  M: "--",
  N: "-.",
  O: "---",
  P: ".--.",
  Q: "--.-",
  R: ".-.",
  S: "...",
  T: "-",
  U: "..-",
  V: "...-",
  W: ".--",
  X: "-..-",
  Y: "-.--",
  Z: "--..",
  1: ".----",
  2: "..---",
  3: "...--",
  4: "....-",
  5: ".....",
  6: "-....",
  7: "--...",
  8: "---..",
  9: "----.",
  0: "-----",
  ",": "--..--",
  ".": ".-.-.-",
  "?": "..--..",
  "'": ".----.",
  "!": "-.-.--",
  "/": "-..-.",
  "(": "-.--.",
  ")": "-.--.-",
  "&": ".-...",
  ":": "---...",
  ";": "-.-.-.",
  "=": "-...-",
  "+": ".-.-.",
  "-": "-....-",
  _: "..--.-",
  '"': ".-..-.",
  $: "...-..-",
  "@": ".--.-.",
  " ": "/",
};

// ======================
// INITIALIZATION
// ======================

// DOM Elements
const DOM = {
  inputText: document.getElementById("inputText"),
  outputText: document.getElementById("outputText"),
  translateBtn: document.getElementById("translateBtn"),
  clearBtn: document.getElementById("clearBtn"),
  copyBtn: document.getElementById("copyBtn"),
  playBtn: document.getElementById("playBtn"),
  toMorseBtn: document.getElementById("toMorseBtn"),
  toTextBtn: document.getElementById("toTextBtn"),
  inputTitle: document.getElementById("input-title"),
  outputTitle: document.getElementById("output-title"),
  speedControl: document.getElementById("speed"),
  speedValue: document.getElementById("speedValue"),
  toggleReference: document.getElementById("toggleReference"),
  referenceContent: document.getElementById("referenceContent"),
  referenceGrid: document.getElementById("referenceGrid"),
  historyList: document.getElementById("historyList"),
  clearHistoryBtn: document.getElementById("clearHistoryBtn"),
  startQuizBtn: document.getElementById("startQuizBtn"),
  quizContainer: document.getElementById("quizContainer"),
  quizQuestion: document.getElementById("quizQuestion"),
  quizAnswer: document.getElementById("quizAnswer"),
  submitQuizBtn: document.getElementById("submitQuizBtn"),
  quizFeedback: document.getElementById("quizFeedback"),
  quizScore: document.getElementById("quizScore"),
};

// Application State
const AppState = {
  translateToMorse: true,
  translationHistory: JSON.parse(localStorage.getItem("morseHistory")) || [],
  quizActive: false,
  currentQuestion: null,
  quizScore: { correct: 0, total: 0 },
  quizQuestions: [],
};

// Audio Context
let audioContext;
try {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
} catch (e) {
  console.error("Web Audio API not supported");
  DOM.playBtn.disabled = true;
  DOM.playBtn.title = "Audio not supported in your browser";
}

// ======================
// CORE FUNCTIONS
// ======================

/**
 * Initialize the Morse code reference grid
 */
function initReferenceGrid() {
  DOM.referenceGrid.innerHTML = "";
  for (const [char, code] of Object.entries(MORSE_CODE)) {
    const item = document.createElement("div");
    item.className = "morse-item";
    item.innerHTML = `
      <div class="morse-char">${char === " " ? "Space" : char}</div>
      <div class="morse-code">${code}</div>
    `;
    DOM.referenceGrid.appendChild(item);
  }
}

/**
 * Toggle translation direction between text and Morse
 * @param {boolean} toMorse - True for text to Morse, false for Morse to text
 */
function toggleDirection(toMorse) {
  AppState.translateToMorse = toMorse;
  DOM.toMorseBtn.classList.toggle("active", toMorse);
  DOM.toTextBtn.classList.toggle("active", !toMorse);

  if (toMorse) {
    DOM.inputTitle.textContent = "Text Input";
    DOM.outputTitle.textContent = "Morse Code Output";
    DOM.inputText.placeholder = "Enter your text here...";
    DOM.outputText.placeholder = "Translation will appear here...";
  } else {
    DOM.inputTitle.textContent = "Morse Code Input";
    DOM.outputTitle.textContent = "Text Output";
    DOM.inputText.placeholder =
      "Enter Morse code here (separate letters with space, words with /)...";
    DOM.outputText.placeholder = "Translation will appear here...";
  }

  if (DOM.inputText.value.trim()) {
    translate();
  }
}

/**
 * Translate text to Morse code or vice versa
 */
function translate() {
  const text = DOM.inputText.value.trim();
  if (!text) {
    DOM.outputText.value = "";
    return;
  }

  let result = "";

  if (AppState.translateToMorse) {
    // Text to Morse
    for (const char of text.toUpperCase()) {
      if (MORSE_CODE[char]) {
        result += MORSE_CODE[char] + " ";
      } else if (char === " ") {
        result += "/ ";
      } else {
        result += "? ";
      }
    }
  } else {
    // Morse to Text
    const words = text.split("/");
    for (const word of words) {
      const letters = word.trim().split(" ");
      for (const letter of letters) {
        const reverseMorse = Object.fromEntries(
          Object.entries(MORSE_CODE).map(([k, v]) => [v, k])
        );
        result += reverseMorse[letter] || "?";
      }
      result += " ";
    }
  }

  DOM.outputText.value = result.trim();
  saveToHistory(text, DOM.outputText.value);
}

// ======================
// AUDIO FUNCTIONS
// ======================

/**
 * Play Morse code as audio
 */
function playMorse() {
  if (!DOM.outputText.value.trim()) return;

  const wpm = parseInt(DOM.speedControl.value);
  DOM.speedValue.textContent = `${wpm} WPM`;

  // Timing calculations
  const dotDuration = 1.2 / wpm;
  const dashDuration = 3 * dotDuration;
  const symbolGap = dotDuration;
  const letterGap = 3 * dotDuration - symbolGap;
  const wordGap = 7 * dotDuration - letterGap;

  const morseString = DOM.outputText.value;
  let time = audioContext.currentTime + 0.1;

  // Stop if already playing
  if (DOM.playBtn.dataset.playing === "true") {
    DOM.playBtn.textContent = "Play";
    DOM.playBtn.dataset.playing = "false";
    return;
  }

  DOM.playBtn.textContent = "Stop";
  DOM.playBtn.dataset.playing = "true";

  // Visual feedback
  const visualFeedback = document.createElement("div");
  visualFeedback.className = "morse-visual-feedback";
  document.body.appendChild(visualFeedback);

  // Process each symbol
  for (const symbol of morseString) {
    switch (symbol) {
      case ".":
        playBeep(time, dotDuration);
        time += dotDuration;
        break;
      case "-":
        playBeep(time, dashDuration);
        time += dashDuration;
        break;
      case " ":
        time += letterGap;
        break;
      case "/":
        time += wordGap;
        break;
    }
    time += symbolGap;
  }

  // Clean up
  setTimeout(() => {
    DOM.playBtn.textContent = "Play";
    DOM.playBtn.dataset.playing = "false";
    document.body.removeChild(visualFeedback);
  }, (time - audioContext.currentTime) * 1000);
}

/**
 * Generate a beep sound
 * @param {number} startTime - When to start the beep
 * @param {number} duration - How long the beep should last
 */
function playBeep(startTime, duration) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = 700;
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Smooth audio envelope
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(1, startTime + 0.01);
  gainNode.gain.linearRampToValueAtTime(1, startTime + duration - 0.01);
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

// ======================
// HISTORY FUNCTIONS
// ======================

/**
 * Save translation to history
 * @param {string} text - Original text
 * @param {string} morse - Translated Morse code
 */
function saveToHistory(text, morse) {
  AppState.translationHistory.unshift({
    text,
    morse,
    timestamp: new Date().toLocaleString(),
  });

  // Keep only last 20 items
  if (AppState.translationHistory.length > 20) {
    AppState.translationHistory = AppState.translationHistory.slice(0, 20);
  }

  localStorage.setItem(
    "morseHistory",
    JSON.stringify(AppState.translationHistory)
  );
  renderHistory();
}

/**
 * Render translation history
 */
function renderHistory() {
  DOM.historyList.innerHTML = "";
  AppState.translationHistory.forEach((item) => {
    const historyItem = document.createElement("div");
    historyItem.className = "history-item";
    historyItem.innerHTML = `
      <div>
        <div class="history-text">${item.text}</div>
        <div class="history-morse">${item.morse}</div>
      </div>
      <div class="history-time">${item.timestamp}</div>
    `;
    DOM.historyList.appendChild(historyItem);
  });
}

// ======================
// QUIZ FUNCTIONS
// ======================

/**
 * Initialize quiz questions
 */
function initQuizQuestions() {
  for (const [char, code] of Object.entries(MORSE_CODE)) {
    AppState.quizQuestions.push(
      {
        type: "charToMorse",
        question: `What is the Morse code for "${
          char === " " ? "SPACE" : char
        }"?`,
        answer: code,
      },
      {
        type: "morseToChar",
        question: `What character is "${code}"?`,
        answer: char,
      }
    );
  }
}

/**
 * Start the quiz
 */
function startQuiz() {
  AppState.quizActive = true;
  AppState.quizScore = { correct: 0, total: 0 };
  DOM.startQuizBtn.textContent = "Restart Quiz";
  DOM.quizContainer.classList.remove("hidden");
  nextQuestion();
}

/**
 * Display next quiz question
 */
function nextQuestion() {
  if (!AppState.quizActive) return;

  const randomIndex = Math.floor(Math.random() * AppState.quizQuestions.length);
  AppState.currentQuestion = AppState.quizQuestions[randomIndex];
  DOM.quizQuestion.textContent = AppState.currentQuestion.question;
  DOM.quizAnswer.value = "";
  DOM.quizFeedback.textContent = "";
  DOM.quizAnswer.focus();
}

/**
 * Check the user's quiz answer
 */
function checkAnswer() {
  if (!AppState.currentQuestion) return;

  const userAnswer = DOM.quizAnswer.value.trim();
  let correctAnswer;

  if (AppState.currentQuestion.type === "charToMorse") {
    correctAnswer = AppState.currentQuestion.answer;
  } else {
    correctAnswer =
      AppState.currentQuestion.answer === " "
        ? "SPACE"
        : AppState.currentQuestion.answer;
  }

  AppState.quizScore.total++;

  if (userAnswer.toUpperCase() === correctAnswer.toUpperCase()) {
    DOM.quizFeedback.textContent = "Correct!";
    DOM.quizFeedback.className = "correct";
    AppState.quizScore.correct++;
  } else {
    DOM.quizFeedback.textContent = `Incorrect! The correct answer was: ${correctAnswer}`;
    DOM.quizFeedback.className = "incorrect";
  }

  DOM.quizScore.textContent = `Score: ${AppState.quizScore.correct}/${AppState.quizScore.total}`;
  setTimeout(nextQuestion, 1500);
}

// ======================
// EVENT LISTENERS
// ======================

function setupEventListeners() {
  // Translation
  DOM.translateBtn.addEventListener("click", translate);
  DOM.clearBtn.addEventListener("click", () => {
    DOM.inputText.value = "";
    DOM.outputText.value = "";
  });
  DOM.copyBtn.addEventListener("click", () => {
    DOM.outputText.select();
    document.execCommand("copy");
    DOM.copyBtn.textContent = "Copied!";
    setTimeout(() => {
      DOM.copyBtn.textContent = "Copy";
    }, 2000);
  });

  // Audio
  DOM.playBtn.addEventListener("click", playMorse);

  // Direction toggle
  DOM.toMorseBtn.addEventListener("click", () => toggleDirection(true));
  DOM.toTextBtn.addEventListener("click", () => toggleDirection(false));

  // Reference
  DOM.toggleReference.addEventListener("click", () => {
    DOM.referenceContent.classList.toggle("hidden");
    DOM.toggleReference.textContent = DOM.referenceContent.classList.contains(
      "hidden"
    )
      ? "Show"
      : "Hide";
  });

  // Speed control
  DOM.speedControl.addEventListener("input", () => {
    DOM.speedValue.textContent = `${DOM.speedControl.value} WPM`;
  });

  // History
  DOM.clearHistoryBtn.addEventListener("click", () => {
    AppState.translationHistory = [];
    localStorage.removeItem("morseHistory");
    renderHistory();
  });

  // Quiz
  DOM.startQuizBtn.addEventListener("click", startQuiz);
  DOM.submitQuizBtn.addEventListener("click", checkAnswer);
  DOM.quizAnswer.addEventListener("keypress", (e) => {
    if (e.key === "Enter") checkAnswer();
  });
}

// ======================
// INITIALIZATION
// ======================

function initializeApp() {
  initReferenceGrid();
  initQuizQuestions();
  toggleDirection(true);
  renderHistory();
  setupEventListeners();
}

// Start the application
initializeApp();
