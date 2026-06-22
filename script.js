const STATE_KEY = 'nustEntryTestState';
const THEME_KEY = 'nustEntryTestTheme';
const TOTAL_DURATION = 3 * 60 * 60; // 3 hours in seconds

const welcomeScreen = document.getElementById('welcome-screen');
const instructionsScreen = document.getElementById('instructions-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const welcomeStartBtn = document.getElementById('welcome-start-btn');
const instructionStartBtn = document.getElementById('instruction-start-btn');
const backToWelcomeBtn = document.getElementById('back-to-welcome');
const resumeBanner = document.getElementById('resume-banner');
const resumeTestBtn = document.getElementById('resume-test-btn');
const themeToggle = document.getElementById('theme-toggle');
const candidateNameInput = document.getElementById('candidate-name');
const rollNumberInput = document.getElementById('roll-number');
const subjectOrderSelect = document.getElementById('subject-order');
const candidateDetails = document.getElementById('candidate-details');
const questionTag = document.getElementById('question-tag');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const questionPalette = document.getElementById('question-palette');
const questionProgress = document.getElementById('question-progress');
const progressLabel = document.getElementById('progress-label');
const attemptedCount = document.getElementById('attempted-count');
const reviewCount = document.getElementById('review-count');
const skippedCount = document.getElementById('skipped-count');
const countdownTimer = document.getElementById('countdown-timer');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const skipBtn = document.getElementById('skip-btn');
const reviewBtn = document.getElementById('review-btn');
const submitBtn = document.getElementById('submit-btn');
const resultCandidateName = document.getElementById('result-candidate-name');
const resultRollNumber = document.getElementById('result-roll-number');
const resultTotal = document.getElementById('result-total');
const resultAttempted = document.getElementById('result-attempted');
const resultCorrect = document.getElementById('result-correct');
const resultWrong = document.getElementById('result-wrong');
const resultSkipped = document.getElementById('result-skipped');
const resultPercentage = document.getElementById('result-percentage');
const resultPassFail = document.getElementById('result-passfail');
const performanceEnglish = document.getElementById('performance-english');
const performancePhysics = document.getElementById('performance-physics');
const performanceMath = document.getElementById('performance-math');
const downloadPdfBtn = document.getElementById('download-pdf-btn');
const printBtn = document.getElementById('print-btn');
const restartBtn = document.getElementById('restart-btn');
const scoreChart = document.getElementById('score-chart');

let orderIds = [];
let currentIndex = 0;
let answers = {};
let reviewMarks = {};
let skipped = {};
let remainingSeconds = TOTAL_DURATION;
let timerInterval = null;
let candidate = { name: '', roll: '' };
let subjectOrder = ['Mathematics', 'Physics', 'English'];

const questionMap = new Map(QUESTIONS.map((question) => [question.id, question]));

function setTheme(theme) {
  document.body.classList.toggle('dark-mode', theme === 'dark');
  themeToggle.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
  localStorage.setItem(THEME_KEY, theme);
}

function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
  setTheme(savedTheme);
}

function showScreen(screen) {
  [welcomeScreen, instructionsScreen, quizScreen, resultScreen].forEach((element) => {
    element.classList.toggle('active', element === screen);
    element.classList.toggle('hidden', element !== screen);
  });
}

function shuffleArray(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildOrderedQuestionIds(order) {
  const grouped = { Mathematics: [], Physics: [], English: [] };
  QUESTIONS.forEach((question) => {
    if (grouped[question.subject]) {
      grouped[question.subject].push(question.id);
    }
  });
  Object.keys(grouped).forEach((subject) => {
    grouped[subject] = shuffleArray(grouped[subject]);
  });
  return order.flatMap((subject) => grouped[subject] || []);
}

function rebuildQuestions(ids) {
  return ids.map((id) => questionMap.get(id)).filter(Boolean);
}

function saveState() {
  const state = {
    candidate,
    orderIds,
    subjectOrder,
    currentIndex,
    answers,
    reviewMarks,
    skipped,
    remainingSeconds,
  };
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem(STATE_KEY);
  if (!saved) {
    orderIds = [];
    return false;
  }
  try {
    const state = JSON.parse(saved);
    if (!state.orderIds || !Array.isArray(state.orderIds)) {
      orderIds = getRandomOrder();
      return false;
    }

    candidate = state.candidate || candidate;
    orderIds = state.orderIds;
    subjectOrder = state.subjectOrder || subjectOrder;
    currentIndex = state.currentIndex || 0;
    answers = state.answers || {};
    reviewMarks = state.reviewMarks || {};
    skipped = state.skipped || {};
    remainingSeconds = state.remainingSeconds || TOTAL_DURATION;

    if (Object.keys(answers).length > 0 || candidate.name || candidate.roll) {
      showResumeBanner();
      candidateNameInput.value = candidate.name;
      rollNumberInput.value = candidate.roll;
      subjectOrderSelect.value = subjectOrder.join(',');
      return true;
    }

    return false;
  } catch (error) {
    orderIds = getRandomOrder();
    return false;
  }
}

function showResumeBanner() {
  resumeBanner.classList.remove('hidden');
}

function hideResumeBanner() {
  resumeBanner.classList.add('hidden');
}

function initializeQuiz() {
  if (orderIds.length !== QUESTIONS.length) {
    orderIds = buildOrderedQuestionIds(subjectOrder);
  }
  buildPalette();
  updateQuestion();
  updateStatusCounts();
}

function updateCandidateLabel() {
  candidateDetails.textContent = `${candidate.name} · Roll Number ${candidate.roll}`;
}

function updateQuestion() {
  const currentId = orderIds[currentIndex];
  const question = questionMap.get(currentId);
  if (!question) return;

  questionTag.textContent = `Subject: ${question.subject} | Topic: ${question.topic}`;
  questionText.textContent = `${currentIndex + 1}. ${question.question}`;
  optionsContainer.innerHTML = '';

  Object.entries(question.options).forEach(([key, value]) => {
    const button = document.createElement('button');
    button.className = 'option-card';
    button.type = 'button';
    button.dataset.option = key;
    button.innerHTML = `
      <span class="option-label">${key}</span>
      <span class="option-text">${value}</span>
    `;
    button.addEventListener('click', () => selectOption(key));
    if (answers[currentId] === key) {
      button.classList.add('selected');
    }
    optionsContainer.appendChild(button);
  });

  progressLabel.textContent = `${currentIndex + 1} / ${orderIds.length}`;
  questionProgress.style.width = `${((currentIndex + 1) / orderIds.length) * 100}%`;
  updatePaletteStyles();
}

function updatePaletteStyles() {
  const paletteButtons = Array.from(questionPalette.children);
  paletteButtons.forEach((button, index) => {
    const questionId = orderIds[index];
    button.className = 'palette-button';
    if (answers[questionId]) button.classList.add('answered');
    if (reviewMarks[questionId]) button.classList.add('review');
    if (skipped[questionId] && !answers[questionId]) button.classList.add('skipped');
    if (index === currentIndex) button.classList.add('current');
  });
}

function buildPalette() {
  questionPalette.innerHTML = '';
  orderIds.forEach((questionId, index) => {
    const button = document.createElement('button');
    button.className = 'palette-button';
    button.type = 'button';
    button.textContent = index + 1;
    button.addEventListener('click', () => goToQuestion(index));
    questionPalette.appendChild(button);
  });
}

function selectOption(optionKey) {
  const questionId = orderIds[currentIndex];
  answers[questionId] = optionKey;
  if (skipped[questionId]) {
    delete skipped[questionId];
  }
  saveState();
  updateQuestion();
  updateStatusCounts();
}

function goToQuestion(index) {
  if (index < 0 || index >= orderIds.length) return;
  currentIndex = index;
  saveState();
  updateQuestion();
}

function goNext() {
  if (currentIndex < orderIds.length - 1) {
    currentIndex += 1;
    saveState();
    updateQuestion();
  }
}

function goPrevious() {
  if (currentIndex > 0) {
    currentIndex -= 1;
    saveState();
    updateQuestion();
  }
}

function skipQuestion() {
  const questionId = orderIds[currentIndex];
  if (!answers[questionId]) {
    skipped[questionId] = true;
  }
  if (currentIndex < orderIds.length - 1) {
    currentIndex += 1;
  }
  saveState();
  updateQuestion();
  updateStatusCounts();
}

function toggleReview() {
  const questionId = orderIds[currentIndex];
  if (reviewMarks[questionId]) {
    delete reviewMarks[questionId];
  } else {
    reviewMarks[questionId] = true;
  }
  saveState();
  updatePaletteStyles();
  updateStatusCounts();
}

function updateStatusCounts() {
  const attempted = Object.keys(answers).length;
  const reviewCountValue = Object.keys(reviewMarks).length;
  const skippedCountValue = Object.keys(skipped).length;
  attemptedCount.textContent = attempted;
  reviewCount.textContent = reviewCountValue;
  skippedCount.textContent = skippedCountValue;
}

function formatTime(seconds) {
  const hr = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const min = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${hr}:${min}:${sec}`;
}

function startTimer() {
  clearInterval(timerInterval);
  countdownTimer.textContent = formatTime(remainingSeconds);
  timerInterval = setInterval(() => {
    remainingSeconds -= 1;
    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      remainingSeconds = 0;
      countdownTimer.textContent = formatTime(remainingSeconds);
      finishTest();
      return;
    }
    countdownTimer.textContent = formatTime(remainingSeconds);
    saveState();
  }, 1000);
}

function finishTest() {
  clearInterval(timerInterval);
  const total = orderIds.length;
  const attempted = Object.keys(answers).length;
  let correct = 0;
  const subjectScores = { English: 0, Physics: 0, Mathematics: 0 };
  const subjectTotals = { English: 40, Physics: 60, Mathematics: 100 };

  orderIds.forEach((questionId) => {
    const question = questionMap.get(questionId);
    if (answers[questionId] === question.answer) {
      correct += 1;
      if (subjectScores[question.subject] !== undefined) {
        subjectScores[question.subject] += 1;
      }
    }
  });

  const wrong = attempted - correct;
  const skippedQuestions = total - attempted;
  const percentage = ((correct / total) * 100).toFixed(2);
  const passFail = percentage >= 50 ? 'Pass' : 'Fail';

  resultCandidateName.textContent = candidate.name;
  resultRollNumber.textContent = `Roll Number: ${candidate.roll}`;
  resultTotal.textContent = total;
  resultAttempted.textContent = attempted;
  resultCorrect.textContent = correct;
  resultWrong.textContent = wrong;
  resultSkipped.textContent = skippedQuestions;
  resultPercentage.textContent = `${percentage}%`;
  resultPassFail.textContent = passFail;
  performanceEnglish.textContent = `${subjectScores.English} / ${subjectTotals.English}`;
  performancePhysics.textContent = `${subjectScores.Physics} / ${subjectTotals.Physics}`;
  performanceMath.textContent = `${subjectScores.Mathematics} / ${subjectTotals.Mathematics}`;
  drawChart(subjectScores);
  showScreen(resultScreen);
  saveState();
}

function drawChart(subjectScores) {
  const ctx = scoreChart.getContext('2d');
  const labels = ['English', 'Physics', 'Mathematics'];
  const values = [subjectScores.English, subjectScores.Physics, subjectScores.Mathematics];
  const maxValue = 100;
  const width = scoreChart.width;
  const height = scoreChart.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(0, 0, width, height);
  const margin = 48;
  const barWidth = (width - margin * 2) / labels.length / 1.5;
  values.forEach((value, index) => {
    const x = margin + index * (barWidth * 2);
    const barHeight = ((height - margin * 2) * value) / maxValue;
    ctx.fillStyle = ['#4f7dff', '#2ed0a0', '#7b89ff'][index];
    ctx.fillRect(x, height - margin - barHeight, barWidth, barHeight);
    ctx.fillStyle = '#eef2ff';
    ctx.font = '500 16px Inter, sans-serif';
    ctx.fillText(labels[index], x, height - margin + 28);
    ctx.fillText(`${value}`, x, height - margin - barHeight - 12);
  });
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath();
  ctx.moveTo(margin, margin);
  ctx.lineTo(margin, height - margin);
  ctx.lineTo(width - margin, height - margin);
  ctx.stroke();
}

function downloadResult() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 40;
  let y = 60;

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text('NUST Entry Test Result', pageWidth / 2, y, { align: 'center' });
  y += 36;

  pdf.setFontSize(12);
  pdf.setFont('Helvetica', 'normal');
  pdf.text(`Name: ${candidate.name}`, margin, y);
  y += 18;
  pdf.text(`Roll Number: ${candidate.roll}`, margin, y);
  y += 18;
  pdf.text(`Percentage: ${resultPercentage.textContent}`, margin, y);
  y += 18;
  pdf.text(`Status: ${resultPassFail.textContent}`, margin, y);
  y += 32;

  pdf.setDrawColor(95, 129, 255);
  pdf.setFillColor(245, 246, 255);
  pdf.roundedRect(margin, y, pageWidth - margin * 2, 140, 10, 10, 'FD');
  pdf.setFont('Helvetica', 'bold');
  pdf.text('Summary', margin + 12, y + 24);
  pdf.setFont('Helvetica', 'normal');
  pdf.text(`Total Questions: ${resultTotal.textContent}`, margin + 12, y + 48);
  pdf.text(`Attempted: ${resultAttempted.textContent}`, margin + 12, y + 68);
  pdf.text(`Correct: ${resultCorrect.textContent}`, margin + 12, y + 88);
  pdf.text(`Wrong: ${resultWrong.textContent}`, margin + 12, y + 108);
  pdf.text(`Skipped: ${resultSkipped.textContent}`, margin + 12, y + 128);

  const subjectX = margin + 250;
  pdf.setFont('Helvetica', 'bold');
  pdf.text('Subject Performance', subjectX, y + 24);
  pdf.setFont('Helvetica', 'normal');
  pdf.text(`English: ${performanceEnglish.textContent}`, subjectX, y + 48);
  pdf.text(`Physics: ${performancePhysics.textContent}`, subjectX, y + 68);
  pdf.text(`Mathematics: ${performanceMath.textContent}`, subjectX, y + 88);

  y += 180;
  pdf.setFont('Helvetica', 'bold');
  pdf.text('Score Chart', margin, y);
  y += 18;

  const chartX = margin;
  const chartY = y + 10;
  const chartWidth = pageWidth - margin * 2;
  const chartHeight = 140;
  const labels = ['English', 'Physics', 'Mathematics'];
  const values = [
    parseInt(performanceEnglish.textContent.split(' / ')[0], 10),
    parseInt(performancePhysics.textContent.split(' / ')[0], 10),
    parseInt(performanceMath.textContent.split(' / ')[0], 10),
  ];
  const barWidth = (chartWidth - 80) / labels.length;

  pdf.setDrawColor(208, 208, 208);
  pdf.rect(chartX, chartY, chartWidth, chartHeight);
  values.forEach((value, index) => {
    const barHeight = (value / 100) * (chartHeight - 40);
    const x = chartX + 20 + index * (barWidth + 20);
    const yBar = chartY + chartHeight - barHeight - 20;
    const colors = [[79, 125, 255], [46, 208, 160], [123, 137, 255]];
    pdf.setFillColor(...colors[index]);
    pdf.roundedRect(x, yBar, barWidth, barHeight, 6, 6, 'F');
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text(labels[index], x + barWidth / 2, chartY + chartHeight - 4, { align: 'center' });
    pdf.text(`${value}`, x + barWidth / 2, yBar - 6, { align: 'center' });
  });

  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text('Generated by NUST Entry Test Portal', margin, pageWidth / 2 - 70);
  pdf.save(`NUST_Result_${candidate.roll || 'candidate'}.pdf`);
}

function printResult() {
  window.print();
}

function restartTest() {
  localStorage.removeItem(STATE_KEY);
  location.reload();
}

function validateWelcomeForm() {
  const name = candidateNameInput.value.trim();
  const roll = rollNumberInput.value.trim();
  const selectedOrder = subjectOrderSelect.value.split(',').map((item) => item.trim());
  if (!name || !roll) {
    alert('Please enter both candidate name and roll number.');
    return false;
  }
  candidate.name = name;
  candidate.roll = roll;
  subjectOrder = selectedOrder;
  saveState();
  return true;
}

welcomeStartBtn.addEventListener('click', () => {
  if (!validateWelcomeForm()) return;
  hideResumeBanner();
  showScreen(instructionsScreen);
});

resumeTestBtn.addEventListener('click', () => {
  candidateNameInput.value = candidate.name;
  rollNumberInput.value = candidate.roll;
  showScreen(quizScreen);
  updateCandidateLabel();
  initializeQuiz();
  startTimer();
});

backToWelcomeBtn.addEventListener('click', () => showScreen(welcomeScreen));
instructionStartBtn.addEventListener('click', () => {
  if (!validateWelcomeForm()) return;
  updateCandidateLabel();
  initializeQuiz();
  startTimer();
  showScreen(quizScreen);
});

themeToggle.addEventListener('click', () => {
  const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
  setTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

prevBtn.addEventListener('click', goPrevious);
nextBtn.addEventListener('click', goNext);
skipBtn.addEventListener('click', skipQuestion);
reviewBtn.addEventListener('click', () => {
  toggleReview();
});
submitBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to submit the test now?')) {
    finishTest();
  }
});
downloadPdfBtn.addEventListener('click', downloadResult);
printBtn.addEventListener('click', printResult);
restartBtn.addEventListener('click', () => {
  if (confirm('This will clear your current test and restart. Continue?')) {
    restartTest();
  }
});

window.addEventListener('beforeunload', () => {
  saveState();
});

window.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  loadState();
  subjectOrderSelect.value = subjectOrder.join(',');
});
