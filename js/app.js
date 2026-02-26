// =====================
// Quiz App - V6 Ultimate Edition
// With V6 Features: Confetti, Search, Theme, PWA
// =====================

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDonMWKNpK1RDWiWSosN5HebMTCALZ-4Y0",
    authDomain: "quiz-microeconomia.firebaseapp.com",
    databaseURL: "https://quiz-microeconomia-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "quiz-microeconomia",
    storageBucket: "quiz-microeconomia.firebasestorage.app",
    messagingSenderId: "17626414656",
    appId: "1:17626414656:web:a68231ec8be62555e229a5"
};

class QuizApp {
    constructor() {
        this.allQuestions = [];
        this.questions = [];
        this.mode = 'quiz';
        this.selectedUnits = new Set();
        this.unitQuestionCounts = {};
        this.sessionCode = '';
        this.firebaseInitialized = false;
        this.resumeAvailable = false;

        // Per-mode data — each mode tracks its own progress independently
        this.modeData = {
            quiz: {
                userAnswers: {}, score: 0, currentQuestionIndex: 0, selectedUnits: [], pendingQuestions: [],
                globalStats: { totalAttempts: 0, totalCorrect: 0, unitStats: {}, questionHistory: {}, srsData: {} }
            },
            exam: { userAnswers: {}, score: 0, currentQuestionIndex: 0, selectedUnits: [], pendingQuestions: [] },
            smart: { userAnswers: {}, score: 0, currentQuestionIndex: 0, selectedUnits: [], pendingQuestions: [] },
            study: { currentQuestionIndex: 0, selectedUnits: [] }
        };

        // Swipe vars
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.longPressTimer = null;

        // Convenience getters (always point to current mode's data)
        // Use getModeData() / getQuizStats() in methods instead.

        this.ui = {
            // Splash
            splashScreen: document.getElementById('splash-screen'),
            quizApp: document.getElementById('quiz-app'),
            sessionCodeInput: document.getElementById('session-code'),
            btnLoadSession: document.getElementById('btn-load-session'),
            btnExport: document.getElementById('btn-export'),
            btnImport: document.getElementById('btn-import'),

            // Header Buttons
            btnTheme: document.getElementById('btn-theme'),
            btnSearch: document.getElementById('btn-search'),

            // Modes
            modeBtns: document.querySelectorAll('.mode-btn'),
            modeDescription: document.getElementById('mode-description'),

            // Unit Grid
            unitGrid: document.getElementById('unit-grid'),
            btnSelectAll: document.getElementById('btn-select-all'),
            btnSelectNone: document.getElementById('btn-select-none'),
            btnStart: document.getElementById('btn-start'),
            selectedCount: document.getElementById('selected-count'),

            // Stats
            btnStats: document.getElementById('btn-stats'),
            modalStats: document.getElementById('modal-stats'),
            btnCloseStats: document.getElementById('btn-close-stats'),
            btnResetProgress: document.getElementById('btn-reset-progress'),
            statGlobalAccuracy: document.getElementById('global-accuracy'),
            statTotalAnswered: document.getElementById('total-answered'),
            weakUnitsList: document.getElementById('weak-units-list'),

            // Search Modal
            modalSearch: document.getElementById('modal-search'),
            searchInput: document.getElementById('search-input'),
            searchResults: document.getElementById('search-results'),
            btnCloseSearch: document.getElementById('btn-close-search'),

            // Quiz
            questionCounter: document.getElementById('question-counter'),
            unitBadge: document.getElementById('unit-badge'),
            scoreVal: document.getElementById('score-val'),
            modeBtn: document.getElementById('btn-mode-toggle'),
            btnNewExam: document.getElementById('btn-new-exam'),
            btnHome: document.getElementById('btn-home'),
            progressBar: document.getElementById('progress-fill'),
            questionText: document.getElementById('question-text'),
            optionsContainer: document.getElementById('options-container'),
            feedbackArea: document.getElementById('feedback-area'),
            feedbackText: document.getElementById('feedback-text'),
            explanationContainer: document.getElementById('explanation-container'),
            explanationText: document.getElementById('explanation-text'),
            btnPrev: document.getElementById('btn-prev'),
            btnNext: document.getElementById('btn-next'),
            btnPending: document.getElementById('btn-pending'),
            btnWrong: document.getElementById('btn-wrong'),
            pendingCount: document.getElementById('pending-count'),
            wrongCount: document.getElementById('wrong-count'),
            btnViewMarked: document.getElementById('btn-view-marked'),
            questionArea: document.querySelector('.question-area'),

            // Modals
            modalPending: document.getElementById('modal-pending'),
            pendingList: document.getElementById('pending-list'),
            btnCloseModal: document.getElementById('btn-close-modal'),
            modalWrong: document.getElementById('modal-wrong'),
            wrongList: document.getElementById('wrong-list'),
            btnCloseWrongModal: document.getElementById('btn-close-wrong-modal'),
            modalResults: document.getElementById('modal-results'),
            resultsTitle: document.getElementById('results-title'),
            statCorrect: document.getElementById('stat-correct'),
            statWrong: document.getElementById('stat-wrong'),
            statScore: document.getElementById('stat-score'),
            btnRestartResults: document.getElementById('btn-restart-results'),
            btnReviewWrong: document.getElementById('btn-review-wrong'),

            // V7 Visuals Zoom
            modalImageZoom: document.getElementById('modal-image-zoom'),
            zoomedImage: document.getElementById('zoomed-image'),
            btnCloseZoom: document.querySelector('.close-zoom'),

            // V7 Leaderboard
            btnRanking: document.getElementById('btn-ranking'),
            modalLeaderboard: document.getElementById('modal-leaderboard'),
            leaderboardList: document.getElementById('leaderboard-list'),
            usernameInput: document.getElementById('username-input'),
            btnSubmitScore: document.getElementById('btn-submit-score'),
            btnCloseLeaderboard: document.getElementById('btn-close-leaderboard')
        };

        this.init();
    }

    async init() {
        this.setupTheme(); // V6
        await this.loadData();
        this.initFirebase();
        this.loadStoredSessionCode();
        this.setupSplash();
        this.bindQuizEvents();
        this.setupSwipe();

        // V7 Visuals Zoom Bind
        if (this.ui.btnCloseZoom) {
            this.ui.btnCloseZoom.onclick = () => this.ui.modalImageZoom.classList.add('hidden');
            this.ui.modalImageZoom.onclick = (e) => {
                if (e.target === this.ui.modalImageZoom) this.ui.modalImageZoom.classList.add('hidden');
            }
        }
    }

    openZoom(src) {
        this.ui.zoomedImage.src = src;
        this.ui.modalImageZoom.classList.remove('hidden');
    }

    // =====================
    // V6: THEME & SEARCH
    // =====================
    setupTheme() {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme === 'light') {
            document.body.classList.add('light-theme');
            this.ui.btnTheme.innerText = '☀️';
        }

        this.ui.btnTheme.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const isLight = document.body.classList.contains('light-theme');
            this.ui.btnTheme.innerText = isLight ? '☀️' : '🌙';
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
        });
    }

    setupSplash() {
        // ... existing setup ...
        this.ui.btnLoadSession.addEventListener('click', async () => {
            this.saveSessionCode();
            if (await this.loadProgress()) {
                this.updateUnitGridFromSelection();
                alert('✅ Sesión cargada');
            } else {
                alert('No hay progreso guardado.');
            }
        });

        // Search Setup
        this.ui.btnSearch.addEventListener('click', () => {
            this.ui.modalSearch.classList.remove('hidden');
            this.ui.searchInput.focus();
        });

        this.ui.btnCloseSearch.addEventListener('click', () => {
            this.ui.modalSearch.classList.add('hidden');
        });

        this.ui.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

        // ... existing listeners ...
        this.ui.modeBtns.forEach(btn => {
            btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
        });

        const units = Object.keys(this.unitQuestionCounts).map(Number).sort((a, b) => a - b);
        units.forEach(u => {
            const chip = document.createElement('div');
            chip.className = 'unit-chip selected';
            chip.textContent = u;
            chip.dataset.unit = u;
            chip.addEventListener('click', () => this.toggleUnit(u, chip));
            this.ui.unitGrid.appendChild(chip);
            this.selectedUnits.add(u);
        });

        this.ui.btnStart.addEventListener('click', () => {
            this.startQuiz(this.resumeAvailable);
        });
        /* Smart Stats Button: Auto-load if code is typed but not loaded */
        this.ui.btnStats.addEventListener('click', async () => {
            const inputCode = this.ui.sessionCodeInput.value.trim().toLowerCase();
            if (inputCode && inputCode !== this.sessionCode) {
                this.saveSessionCode();
                await this.loadProgress();
            }
            this.showStats();
        });
        this.ui.btnCloseStats.addEventListener('click', () => this.ui.modalStats.classList.add('hidden'));

        // Reset Progress
        if (this.ui.btnResetProgress) {
            this.ui.btnResetProgress.addEventListener('click', () => this.resetProgress());
        }

        // Ver Marcadas desde el splash
        if (this.ui.btnViewMarked) {
            this.ui.btnViewMarked.addEventListener('click', async () => {
                const inputCode = this.ui.sessionCodeInput.value.trim().toLowerCase();
                if (inputCode && inputCode !== this.sessionCode) {
                    this.saveSessionCode();
                    await this.loadProgress();
                }
                this.showMarkedFromSplash();
            });
        }
        if (this.ui.btnRanking) {
            this.ui.btnRanking.addEventListener('click', () => this.openLeaderboard());
        }
        if (this.ui.btnCloseLeaderboard) {
            this.ui.btnCloseLeaderboard.addEventListener('click', () => this.ui.modalLeaderboard.classList.add('hidden'));
        }
        if (this.ui.btnSubmitScore) {
            this.ui.btnSubmitScore.addEventListener('click', () => this.submitScore());
        }

        this.ui.btnSelectAll.addEventListener('click', () => {
            document.querySelectorAll('.unit-chip').forEach(c => {
                c.classList.add('selected');
                this.selectedUnits.add(Number(c.dataset.unit));
            });
            this.updateSelectedCount();
        });

        this.ui.btnSelectNone.addEventListener('click', () => {
            document.querySelectorAll('.unit-chip').forEach(c => {
                c.classList.remove('selected');
            });
            this.selectedUnits.clear();
            this.updateSelectedCount();
        });

        if (this.sessionCode) this.updateUnitGridFromSelection();
        this.updateSelectedCount();
    }

    handleSearch(query) {
        query = query.toLowerCase().trim();
        const container = this.ui.searchResults;
        container.innerHTML = '';

        if (query.length < 3) {
            container.innerHTML = '<div class="empty-state">Escribe al menos 3 caracteres...</div>';
            return;
        }

        const matches = this.allQuestions.filter(q =>
            q.pregunta.toLowerCase().includes(query)
        ).slice(0, 50); // Limit results

        if (matches.length === 0) {
            container.innerHTML = '<div class="empty-state">No se encontraron resultados.</div>';
            return;
        }

        matches.forEach(q => {
            const el = document.createElement('div');
            el.className = 'search-item';
            el.style.cursor = 'pointer';
            el.innerHTML = `
                <span class="search-item-unit">Unidad ${q.unidad} · Pregunta ${q.numero}</span>
                <div>${q.pregunta}</div>
            `;
            el.addEventListener('click', () => {
                // Find this question in the currently active question list
                const idx = this.questions.findIndex(aq => aq.id === q.id);
                if (idx === -1) {
                    alert(`Esta pregunta (U${q.unidad}·P${q.numero}) no está en el set activo. Añade la unidad ${q.unidad} a la selección y reinicia.`);
                    return;
                }
                this.getModeData().currentQuestionIndex = idx;
                this.ui.modalSearch.classList.add('hidden');
                this.ui.searchInput.value = '';
                this.renderQuestion();
            });
            container.appendChild(el);
        });
    }

    // =====================
    // CORE LOGIC (V5/V6 Integration)
    // =====================

    // ... Firebase methods same as V5 ...
    initFirebase() {
        try {
            if (typeof firebase !== 'undefined') {
                firebase.initializeApp(firebaseConfig);
                this.firebaseInitialized = true;
                console.log('Firebase initialized');
            }
        } catch (e) { console.warn(e); }
    }

    // =====================
    // Per-mode helpers
    // =====================
    getModeData(mode) {
        mode = mode || this.mode;
        if (!this.modeData[mode]) {
            this.modeData[mode] = { userAnswers: {}, score: 0, currentQuestionIndex: 0, selectedUnits: [], pendingQuestions: [] };
        }
        return this.modeData[mode];
    }

    getQuizStats() {
        if (!this.modeData.quiz.globalStats) {
            this.modeData.quiz.globalStats = { totalAttempts: 0, totalCorrect: 0, unitStats: {}, questionHistory: {}, srsData: {} };
        }
        return this.modeData.quiz.globalStats;
    }

    // =====================
    // Firebase / Storage
    // =====================
    getFirebaseRef() {
        if (!this.firebaseInitialized || !this.sessionCode) return null;
        return firebase.database().ref(`sessions_conta2/${this.sessionCode}`);
    }

    async syncToCloud() {
        const ref = this.getFirebaseRef();
        if (!ref) return;
        // Serialize pendingQuestions (Sets) before saving
        const serialized = this._serializeModeData();
        try { await ref.set({ modeData: serialized, timestamp: Date.now() }); } catch (e) { }
    }

    _serializeModeData() {
        const out = {};
        for (const [mode, data] of Object.entries(this.modeData)) {
            out[mode] = { ...data, pendingQuestions: Array.from(data.pendingQuestions || []) };
        }
        return out;
    }

    _deserializeModeData(raw) {
        const defaults = {
            quiz: {
                userAnswers: {}, score: 0, currentQuestionIndex: 0, selectedUnits: [], pendingQuestions: [],
                globalStats: { totalAttempts: 0, totalCorrect: 0, unitStats: {}, questionHistory: {}, srsData: {} }
            },
            exam: { userAnswers: {}, score: 0, currentQuestionIndex: 0, selectedUnits: [], pendingQuestions: [] },
            smart: { userAnswers: {}, score: 0, currentQuestionIndex: 0, selectedUnits: [], pendingQuestions: [] },
            study: { currentQuestionIndex: 0, selectedUnits: [] }
        };
        for (const mode of Object.keys(defaults)) {
            if (raw[mode]) {
                defaults[mode] = { ...defaults[mode], ...raw[mode] };
                defaults[mode].pendingQuestions = raw[mode].pendingQuestions || [];
            }
        }
        return defaults;
    }

    async loadFromCloud() {
        const ref = this.getFirebaseRef();
        if (!ref) return false;
        try {
            const snapshot = await ref.once('value');
            const data = snapshot.val();
            if (data) { this.applyData(data); return true; }
        } catch (e) { }
        return false;
    }

    setupCloudListener() {
        const ref = this.getFirebaseRef();
        if (!ref) return;
        ref.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data && data.timestamp > (this.lastSyncTimestamp || 0)) {
                this.lastSyncTimestamp = data.timestamp;
                if (document.hidden) this.applyData(data);
            }
        });
    }

    applyData(data) {
        // Support both new format (modeData) and legacy flat format
        if (data.modeData) {
            this.modeData = this._deserializeModeData(data.modeData);
        } else if (data.userAnswers !== undefined) {
            // Legacy: migrate flat data into quiz mode
            this.modeData.quiz.userAnswers = data.userAnswers || {};
            this.modeData.quiz.score = data.score || 0;
            this.modeData.quiz.currentQuestionIndex = data.currentQuestionIndex || 0;
            this.modeData.quiz.pendingQuestions = data.pendingQuestions || [];
            if (data.selectedUnits) this.modeData.quiz.selectedUnits = data.selectedUnits;
            if (data.globalStats) this.modeData.quiz.globalStats = data.globalStats;
        }
        // Restore selected units from active mode if available
        const md = this.getModeData();
        if (md.selectedUnits && md.selectedUnits.length > 0) {
            this.selectedUnits = new Set(md.selectedUnits);
        }
        this.resumeAvailable = true;
    }

    loadStoredSessionCode() {
        const stored = localStorage.getItem('quizSessionCode_conta2');
        if (stored) {
            this.sessionCode = stored;
            this.ui.sessionCodeInput.value = stored;
            this.loadProgress();
        }
    }

    saveSessionCode() {
        this.sessionCode = this.ui.sessionCodeInput.value.trim().toLowerCase();
        if (this.sessionCode) localStorage.setItem('quizSessionCode_conta2', this.sessionCode);
    }

    getStorageKey() {
        return this.sessionCode ? `conta2_progress_${this.sessionCode}` : 'conta2_progress_default';
    }

    saveProgress() {
        const serialized = this._serializeModeData();
        localStorage.setItem(this.getStorageKey(), JSON.stringify({ modeData: serialized, timestamp: Date.now() }));
        this.syncToCloud();
    }

    async loadProgress() {
        if (this.firebaseInitialized && this.sessionCode) {
            const cloud = await this.loadFromCloud();
            if (cloud) {
                this.setupCloudListener();
                return true;
            }
        }
        const stored = localStorage.getItem(this.getStorageKey());
        if (stored) {
            this.applyData(JSON.parse(stored));
            return true;
        }
        return false;
    }

    async loadData() {
        try {
            const manifestRes = await fetch('data/questions_index.json');
            const files = await manifestRes.json();
            const promises = files.map(f => fetch(`data/${f}`).then(r => r.json()));
            const results = await Promise.all(promises);

            this.allQuestions = [];
            this.unitQuestionCounts = {};

            results.forEach(data => {
                let unit = data.unidad || '?';
                let items = Array.isArray(data) ? data : (data.preguntas || []);
                items.forEach(q => {
                    const unitNum = Number(q.unidad || unit);
                    const qNum = Number(q.numero || 0);
                    this.allQuestions.push({
                        unidad: unitNum,
                        numero: qNum,
                        pregunta: q.pregunta || q.enunciado || q.texto,
                        opciones: q.opciones,
                        respuesta_correcta: (q.respuesta_correcta || q.correcta || '').toLowerCase().trim(),
                        id: `u${unitNum}_q${qNum}`,
                        explicacion: q.explicacion
                    });
                    this.unitQuestionCounts[unitNum] = (this.unitQuestionCounts[unitNum] || 0) + 1;
                });
            });

            this.allQuestions.sort((a, b) => a.unidad - b.unidad || a.numero - b.numero);

            // Update subtitle counts
            const sub = document.getElementById('subject-questions-summary');
            if (sub) {
                const totalQ = this.allQuestions.length;
                const totalU = Object.keys(this.unitQuestionCounts).length;
                sub.textContent = `${totalQ} preguntas · ${totalU} unidades`;
            }
        } catch (err) { console.error(err); }
    }

    setMode(mode) {
        this.mode = mode;
        this.ui.modeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
        const d = {
            'quiz': 'Responde preguntas y obtén tu puntuación.',
            'exam': '40 preguntas aleatorias. Simulación real.',
            'smart': 'Repaso inteligente de tus fallos más frecuentes.',
            'study': 'Ve directamente la respuesta correcta.'
        };
        this.ui.modeDescription.textContent = d[mode] || d['quiz'];
    }

    toggleUnit(unitNum, chip) {
        if (this.selectedUnits.has(unitNum)) {
            this.selectedUnits.delete(unitNum);
            chip.classList.remove('selected');
        } else {
            this.selectedUnits.add(unitNum);
            chip.classList.add('selected');
        }
        this.updateSelectedCount();
    }

    updateUnitGridFromSelection() {
        document.querySelectorAll('.unit-chip').forEach(c => {
            const u = Number(c.dataset.unit);
            if (this.selectedUnits.has(u)) c.classList.add('selected');
            else c.classList.remove('selected');
        });
        this.updateSelectedCount();
    }

    updateSelectedCount() {
        let count = 0;
        this.selectedUnits.forEach(u => count += this.unitQuestionCounts[u] || 0);
        this.ui.selectedCount.textContent = `Preguntas seleccionadas: ${count}`;
        this.ui.btnStart.disabled = count === 0;
        this.ui.btnStart.style.opacity = count === 0 ? '0.5' : '1';
    }

    showSplash() {
        this.ui.quizApp.classList.add('hidden');
        this.ui.splashScreen.classList.remove('hidden');
        this.ui.modalResults.classList.add('hidden');
        this.ui.modalPending.classList.add('hidden');
        this.ui.modalWrong.classList.add('hidden');
        this.ui.modalStats.classList.add('hidden');
        this.ui.modalSearch.classList.add('hidden');

        // Update selection if needed (e.g. if we want to refresh grid)
        this.updateSelectedCount();
    }

    startQuiz(resume = false) {
        this.saveSessionCode();
        const md = this.getModeData();
        let filtered = this.allQuestions.filter(q => this.selectedUnits.has(Number(q.unidad)));
        if (filtered.length === 0) { alert('Selecciona al menos una unidad.'); return; }

        if (this.mode === 'exam') {
            if (!resume) {
                // Fresh exam: pick 40 random questions
                const shuffled = filtered.sort(() => 0.5 - Math.random());
                filtered = shuffled.slice(0, Math.min(40, shuffled.length));
                filtered.sort((a, b) => a.unidad - b.unidad || a.numero - b.numero);
            }
        } else if (this.mode === 'smart') {
            const stats = this.getQuizStats(); // Smart repaso uses quiz's SRS data
            const now = Date.now();
            if (stats.srsData && Object.keys(stats.srsData).length > 0) {
                let due = filtered.filter(q => {
                    const srs = stats.srsData[q.id];
                    return !srs || srs.nextReview <= now;
                });
                if (due.length === 0) {
                    alert('¡No tienes repasos pendientes! Usando preguntas difíciles.');
                } else {
                    filtered = due;
                    filtered.sort((a, b) => {
                        const sA = stats.srsData[a.id] ? (now - stats.srsData[a.id].nextReview) : 0;
                        const sB = stats.srsData[b.id] ? (now - stats.srsData[b.id].nextReview) : 0;
                        return sB - sA;
                    });
                }
            } else {
                // Fallback: most wrong in quiz mode
                filtered.sort((a, b) => {
                    const sA = (stats.questionHistory[a.id] || { wrong: 0 }).wrong;
                    const sB = (stats.questionHistory[b.id] || { wrong: 0 }).wrong;
                    return sB - sA;
                });
            }
            if (filtered.length > 50) filtered = filtered.slice(0, 50);
        }

        this.questions = filtered;

        // Save selected units per mode
        md.selectedUnits = Array.from(this.selectedUnits);

        if (!resume) {
            md.userAnswers = {};
            md.score = 0;
            md.currentQuestionIndex = 0;
            md.pendingQuestions = [];
            if (this.mode === 'exam') md._examQuestionIds = filtered.map(q => q.id);
        } else {
            // Restore exam question list from saved ids
            if (this.mode === 'exam' && md._examQuestionIds) {
                const idSet = new Set(md._examQuestionIds);
                const ordered = md._examQuestionIds.map(id => this.allQuestions.find(q => q.id === id)).filter(Boolean);
                if (ordered.length > 0) this.questions = ordered;
            }
            if (md.currentQuestionIndex >= this.questions.length) md.currentQuestionIndex = 0;
        }

        this.ui.splashScreen.classList.add('hidden');
        this.ui.quizApp.classList.remove('hidden');
        const icons = { quiz: '🎓', exam: '⏱️', smart: '🧠', study: '📖' };
        this.ui.modeBtn.innerText = icons[this.mode] || '🎓';

        // Show/hide Nuevo Examen button
        if (this.ui.btnNewExam) {
            this.ui.btnNewExam.style.display = this.mode === 'exam' ? '' : 'none';
        }

        this.setupCloudListener();
        requestAnimationFrame(() => this.renderQuestion());
    }

    newExam() {
        if (!confirm('¿Generar un examen nuevo? Se perderá el progreso del examen actual.')) return;
        // Reset only exam mode data
        this.modeData.exam = { userAnswers: {}, score: 0, currentQuestionIndex: 0, selectedUnits: Array.from(this.selectedUnits), pendingQuestions: [] };
        this.saveProgress();
        this.startQuiz(false); // false = fresh start for exam
    }

    renderQuestion() {
        const md = this.getModeData();
        const idx = md.currentQuestionIndex || 0;
        const q = this.questions[idx];
        if (!q) return;

        this.ui.questionCounter.innerText = `${idx + 1} / ${this.questions.length}`;
        this.ui.unitBadge.innerText = `Unidad ${q.unidad} · Pregunta ${q.numero}`;
        this.ui.scoreVal.innerText = md.score || 0;
        this.ui.progressBar.style.width = `${((idx + 1) / this.questions.length) * 100}%`;

        let html = '';
        if (q.imagen) {
            html += `<div class="question-image-container">
                <img src="data/img/${q.imagen}" class="question-image" alt="Imagen pregunta">
            </div>`;
        }
        html += q.pregunta;
        this.ui.questionText.innerHTML = html;

        const imgEl = this.ui.questionText.querySelector('.question-image');
        if (imgEl) imgEl.onclick = () => this.openZoom(`data/img/${q.imagen}`);

        const pendingSet = new Set(md.pendingQuestions || []);
        const isPending = pendingSet.has(q.id);
        this.ui.btnPending.style.background = isPending ? 'rgba(255, 167, 38, 0.3)' : '';
        this.ui.pendingCount.innerText = pendingSet.size || '';
        this.ui.wrongCount.innerText = this.getWrongAnswerIndices().length || '';

        this.ui.optionsContainer.innerHTML = '';
        this.ui.feedbackArea.className = 'feedback-area hidden';

        const userAnswer = (md.userAnswers || {})[q.id];
        const showCorrect = this.mode === 'study' || !!userAnswer;

        Object.entries(q.opciones).forEach(([key, text]) => {
            const btn = document.createElement('div');
            btn.className = 'option-card';
            btn.innerHTML = `<span class="option-letter">${key.toUpperCase()}</span> <span>${text}</span>`;

            const isCorrect = key.toLowerCase() === q.respuesta_correcta;
            const isSelected = userAnswer === key.toLowerCase();

            if (showCorrect) {
                if (isCorrect) btn.classList.add('correct');
                else {
                    if (this.mode === 'study') btn.style.display = 'none';
                    else if (isSelected) btn.classList.add('incorrect');
                    else btn.classList.add('disabled');
                }
                btn.style.pointerEvents = 'none';
            } else {
                btn.onclick = () => this.handleOptionSelect(key);
            }
            this.ui.optionsContainer.appendChild(btn);
        });

        if (userAnswer) {
            const isCorrect = userAnswer === q.respuesta_correcta;
            this.ui.feedbackArea.classList.remove('hidden');
            this.ui.feedbackText.innerText = isCorrect ? '¡Correcto!' : `Incorrecto. Era ${q.respuesta_correcta.toUpperCase()}`;
            this.ui.feedbackArea.style.borderLeft = `4px solid ${isCorrect ? 'var(--correct-color)' : 'var(--incorrect-color)'}`;
        }

        if (showCorrect && q.explicacion) {
            this.ui.explanationContainer.classList.remove('hidden');
            this.ui.explanationText.innerText = q.explicacion;
            if (this.mode === 'study' && !userAnswer) {
                this.ui.feedbackArea.classList.remove('hidden');
                this.ui.feedbackText.innerText = 'Modo Estudio: Ver explicación abajo';
                this.ui.feedbackArea.style.borderLeft = 'solid 4px var(--accent-color)';
            }
        } else {
            this.ui.explanationContainer.classList.add('hidden');
        }
        this.saveProgress();
    }

    handleOptionSelect(key) {
        const md = this.getModeData();
        const idx = md.currentQuestionIndex || 0;
        const q = this.questions[idx];
        if ((md.userAnswers || {})[q.id]) return; // already answered
        const isCorrect = key.toLowerCase() === q.respuesta_correcta;
        if (!md.userAnswers) md.userAnswers = {};
        md.userAnswers[q.id] = key.toLowerCase(); // keyed by stable question ID
        if (isCorrect) md.score = (md.score || 0) + 1;
        // Stats only tracked in Quiz mode
        if (this.mode === 'quiz') this.updateGlobalStats(q, isCorrect);
        this.renderQuestion();
    }

    updateGlobalStats(q, isCorrect) {
        // Only ever called for Quiz mode — writes to modeData.quiz.globalStats
        const stats = this.getQuizStats();
        stats.totalAttempts = (stats.totalAttempts || 0) + 1;
        if (isCorrect) stats.totalCorrect = (stats.totalCorrect || 0) + 1;

        const u = q.unidad;
        if (!stats.unitStats[u]) stats.unitStats[u] = { correct: 0, attempts: 0 };
        stats.unitStats[u].attempts++;
        if (isCorrect) stats.unitStats[u].correct++;

        const qid = q.id;
        if (!stats.questionHistory[qid]) stats.questionHistory[qid] = { correct: 0, wrong: 0 };
        if (isCorrect) stats.questionHistory[qid].correct++;
        else stats.questionHistory[qid].wrong++;

        this.updateSRS(qid, isCorrect);
        this.saveProgress();
    }

    // V7: SM-2 Simplified Algorithm — always in quiz's SRS data
    updateSRS(qid, isCorrect) {
        const stats = this.getQuizStats();
        if (!stats.srsData) stats.srsData = {};
        let item = stats.srsData[qid] || { interval: 0, repetitions: 0, ef: 2.5, nextReview: 0 };

        if (isCorrect) {
            if (item.repetitions === 0) item.interval = 1;
            else if (item.repetitions === 1) item.interval = 6;
            else item.interval = Math.round(item.interval * item.ef);
            item.repetitions++;
            if (item.ef < 2.5) item.ef += 0.1;
        } else {
            item.repetitions = 0;
            item.interval = 0;
            item.ef = Math.max(1.3, item.ef - 0.2);
        }
        item.nextReview = Date.now() + (item.interval * 24 * 60 * 60 * 1000);
        stats.srsData[qid] = item;
    }

    showStats() {
        // Stats are ONLY for Quiz mode
        const stats = this.getQuizStats();
        const total = stats.totalAttempts || 0;
        const correct = stats.totalCorrect || 0;
        const acc = total > 0 ? Math.round((correct / total) * 100) : 0;

        this.ui.statGlobalAccuracy.innerText = `${acc}%`;
        this.ui.statTotalAnswered.innerText = total;

        const units = [];
        for (const [u, data] of Object.entries(stats.unitStats || {})) {
            const rate = data.attempts > 0 ? (data.correct / data.attempts) : 1;
            units.push({ u, rate, attempts: data.attempts });
        }
        units.sort((a, b) => a.rate - b.rate);

        this.ui.weakUnitsList.innerHTML = '';
        if (units.length === 0) {
            this.ui.weakUnitsList.innerHTML = '<div class="empty-state">No hay datos de Quiz aún.</div>';
        } else {
            units.slice(0, 5).forEach(item => {
                const p = Math.round(item.rate * 100);
                const d = document.createElement('div');
                d.className = 'weak-item';
                d.innerHTML = `<span>Unidad ${item.u} (${item.attempts} pregs)</span><span class="weak-score">${p}%</span>`;
                this.ui.weakUnitsList.appendChild(d);
            });
        }
        this.ui.modalStats.classList.remove('hidden');
    }

    resetProgress() {
        if (!confirm('⚠️ ¿Estás seguro? Se borrarán TODAS las estadísticas y el progreso de todos los modos.')) return;

        localStorage.removeItem(this.getStorageKey());

        if (this.firebaseInitialized && this.sessionCode) {
            try { const ref = this.getFirebaseRef(); if (ref) ref.remove(); } catch (e) { }
        }

        this.modeData = {
            quiz: {
                userAnswers: {}, score: 0, currentQuestionIndex: 0, selectedUnits: [], pendingQuestions: [],
                globalStats: { totalAttempts: 0, totalCorrect: 0, unitStats: {}, questionHistory: {}, srsData: {} }
            },
            exam: { userAnswers: {}, score: 0, currentQuestionIndex: 0, selectedUnits: [], pendingQuestions: [] },
            smart: { userAnswers: {}, score: 0, currentQuestionIndex: 0, selectedUnits: [], pendingQuestions: [] },
            study: { currentQuestionIndex: 0, selectedUnits: [] }
        };
        this.resumeAvailable = false;
        this.ui.modalStats.classList.add('hidden');
        this.showSplash();
        alert('✅ Progreso eliminado correctamente.');
    }

    bindQuizEvents() {
        this.ui.btnNext.addEventListener('click', () => this.nextQuestion());
        this.ui.btnPrev.addEventListener('click', () => this.prevQuestion());
        this.ui.btnPending.addEventListener('click', () => this.showPendingList());
        this.ui.btnWrong.addEventListener('click', () => this.showWrongList());
        this.ui.btnHome.addEventListener('click', () => this.showSplash());

        // Nuevo Examen button (exam mode only)
        if (this.ui.btnNewExam) {
            this.ui.btnNewExam.addEventListener('click', () => this.newExam());
            this.ui.btnNewExam.style.display = 'none'; // hidden by default
        }

        this.ui.modeBtn.addEventListener('click', () => {
            const currentIdx = this.getModeData().currentQuestionIndex || 0; // save position
            const newMode = this.mode === 'study' ? 'quiz' : 'study';
            this.setMode(newMode);
            this.getModeData().currentQuestionIndex = currentIdx; // restore in new mode
            const icons = { quiz: '🎓', exam: '⏱️', smart: '🧠', study: '📖' };
            this.ui.modeBtn.innerText = icons[this.mode] || '🎓';
            this.renderQuestion();
        });

        this.ui.btnCloseModal.addEventListener('click', () => this.ui.modalPending.classList.add('hidden'));
        this.ui.btnCloseWrongModal.addEventListener('click', () => this.ui.modalWrong.classList.add('hidden'));

        this.ui.btnReviewWrong.addEventListener('click', () => {
            this.ui.modalResults.classList.add('hidden');
            this.showWrongList();
        });
        this.ui.btnRestartResults.addEventListener('click', () => {
            this.ui.modalResults.classList.add('hidden');
            this.showSplash();
        });

        // 📝 Single click = toggle mark; long-press / right-click = open list
        this.ui.btnPending.addEventListener('click', () => {
            const md = this.getModeData();
            const idx = md.currentQuestionIndex || 0;
            const q = this.questions[idx];
            if (!q) return;
            const pending = new Set(md.pendingQuestions || []);
            if (pending.has(q.id)) {
                pending.delete(q.id);
                this.ui.btnPending.title = 'Marcar pregunta';
            } else {
                pending.add(q.id);
                this.ui.btnPending.title = 'Desmarcar pregunta';
            }
            md.pendingQuestions = Array.from(pending);
            this.saveProgress();
            this.renderQuestion();
        });

        const showMarkedList = () => this.showPendingList();
        this.ui.btnPending.addEventListener('contextmenu', (e) => { e.preventDefault(); showMarkedList(); });
        this.ui.btnPending.addEventListener('touchstart', () => { this.longPressTimer = setTimeout(showMarkedList, 600); });
        this.ui.btnPending.addEventListener('touchend', () => clearTimeout(this.longPressTimer));

        document.addEventListener('keydown', (e) => {
            if (!this.ui.splashScreen.classList.contains('hidden')) return;
            if (e.key === 'ArrowRight') this.nextQuestion();
            if (e.key === 'ArrowLeft') this.prevQuestion();
            if (e.key === 'p' || e.key === 'P') togglePending();
            if (['a', 'b', 'c', 'd'].includes(e.key.toLowerCase())) this.handleOptionSelect(e.key.toLowerCase());
        });
    }

    nextQuestion() {
        const md = this.getModeData();
        const idx = md.currentQuestionIndex || 0;
        if (idx < this.questions.length - 1) {
            md.currentQuestionIndex = idx + 1;
            this.renderQuestion();
        } else {
            this.showResults();
        }
    }

    prevQuestion() {
        const md = this.getModeData();
        const idx = md.currentQuestionIndex || 0;
        if (idx > 0) {
            md.currentQuestionIndex = idx - 1;
            this.renderQuestion();
        }
    }

    getWrongAnswerIndices() {
        const md = this.getModeData();
        const answers = md.userAnswers || {};
        const ids = [];
        this.questions.forEach((q, idx) => {
            const ans = answers[q.id];
            if (ans && ans !== q.respuesta_correcta) ids.push(idx);
        });
        return ids.sort((a, b) => a - b);
    }

    showList(indices, modal, container) {
        if (indices.length === 0) { alert('Lista vacía'); return; }
        container.innerHTML = '';
        indices.forEach(idx => {
            const q = this.questions[idx];
            const d = document.createElement('div');
            d.className = 'pending-item';
            d.innerText = `U${q.unidad} · P${q.numero} - ${q.pregunta.substring(0, 40)}...`;
            d.onclick = () => {
                this.getModeData().currentQuestionIndex = idx;
                this.renderQuestion();
                modal.classList.add('hidden');
            };
            container.appendChild(d);
        });
        modal.classList.remove('hidden');
    }

    showPendingList() {
        const md = this.getModeData();
        const pendingIds = new Set(md.pendingQuestions || []);
        const indices = [];
        this.questions.forEach((q, idx) => { if (pendingIds.has(q.id)) indices.push(idx); });
        indices.sort((a, b) => a - b);
        if (indices.length === 0) { alert('No tienes preguntas marcadas en este modo.'); return; }
        this.showList(indices, this.ui.modalPending, this.ui.pendingList);
    }

    showMarkedFromSplash() {
        // Called from splash — uses allQuestions as reference since quiz may not be active
        const md = this.getModeData('quiz'); // show quiz marks by default from splash
        const pendingIds = new Set(md.pendingQuestions || []);
        if (pendingIds.size === 0) { alert('No tienes preguntas marcadas aún.'); return; }

        const container = this.ui.pendingList;
        container.innerHTML = '';
        this.allQuestions.forEach(q => {
            if (!pendingIds.has(q.id)) return;
            const d = document.createElement('div');
            d.className = 'pending-item';
            d.style.display = 'flex';
            d.style.justifyContent = 'space-between';
            d.style.alignItems = 'center';
            d.innerHTML = `
                <span>U${q.unidad} · P${q.numero} — ${q.pregunta.substring(0, 50)}${q.pregunta.length > 50 ? '...' : ''}</span>
                <button style="background:none;border:none;color:#e74c3c;cursor:pointer;font-size:1.1rem;" data-qid="${q.id}" title="Quitar marca">✕</button>
            `;
            d.querySelector('button').addEventListener('click', (e) => {
                e.stopPropagation();
                const qid = e.currentTarget.dataset.qid;
                const p = new Set(md.pendingQuestions || []);
                p.delete(qid);
                md.pendingQuestions = Array.from(p);
                this.saveProgress();
                // refresh list
                this.showMarkedFromSplash();
            });
            container.appendChild(d);
        });
        this.ui.modalPending.classList.remove('hidden');
    }
    showWrongList() { this.showList(this.getWrongAnswerIndices(), this.ui.modalWrong, this.ui.wrongList); }

    showResults() {
        const md = this.getModeData();
        const total = this.questions.length;
        const correct = md.score || 0;
        const answered = Object.keys(md.userAnswers || {}).length;
        const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

        this.ui.statCorrect.innerText = correct;
        this.ui.statWrong.innerText = answered - correct;
        this.ui.statScore.innerText = percent + '%';
        this.ui.modalResults.classList.remove('hidden');
        this.ui.btnReviewWrong.style.display = (this.getWrongAnswerIndices().length > 0) ? 'block' : 'none';

        // V6 Confetti
        if (percent >= 50 && typeof confetti === 'function') {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }

    setupSwipe() {
        const area = this.ui.questionArea;
        if (!area) return;
        area.addEventListener('touchstart', e => this.touchStartX = e.changedTouches[0].screenX, { passive: true });
        area.addEventListener('touchend', e => {
            if (this.touchStartX - e.changedTouches[0].screenX > 80) this.nextQuestion();
            if (e.changedTouches[0].screenX - this.touchStartX > 80) this.prevQuestion();
        }, { passive: true });
    }

    // V7 Leaderboard Methods
    async openLeaderboard() {
        this.ui.modalLeaderboard.classList.remove('hidden');
        this.ui.leaderboardList.innerHTML = '<div class="empty-state">Cargando ranking...</div>';

        if (!this.firebaseInitialized) {
            this.ui.leaderboardList.innerHTML = '<div class="empty-state">Error: No conectado a la nube.</div>';
            return;
        }

        try {
            const ref = firebase.database().ref('leaderboard_conta2');
            const snapshot = await ref.orderByChild('score').limitToLast(20).once('value');

            const entries = [];
            snapshot.forEach(child => entries.push(child.val()));
            entries.reverse(); // Highest first

            this.ui.leaderboardList.innerHTML = '';
            if (entries.length === 0) {
                this.ui.leaderboardList.innerHTML = '<div class="empty-state">Aún no hay puntuaciones. ¡Sé el primero!</div>';
                return;
            }

            entries.forEach((entry, index) => {
                const div = document.createElement('div');
                div.className = 'leaderboard-item'; // Styles needed
                // Calculate simple efficiency or just show raw
                const acc = entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : 0;

                div.innerHTML = `
                    <div class="rank-badge ${index < 3 ? 'top-rank' : ''}">${index + 1}</div>
                    <div class="rank-info">
                        <div class="rank-name">${entry.username}</div>
                        <div class="rank-details">${entry.correct} aciertos · ${acc}% precisión</div>
                    </div>
                    <div class="rank-score">${entry.score} pts</div>
                `;
                this.ui.leaderboardList.appendChild(div);
            });

        } catch (e) {
            console.error(e);
            this.ui.leaderboardList.innerHTML = '<div class="empty-state">Error al cargar datos.</div>';
        }
    }

    async submitScore() {
        const username = this.ui.usernameInput.value.trim();
        if (username.length < 3) { alert("Nombre muy corto"); return; }

        if (!this.firebaseInitialized) return;

        // Custom Score Algo: Correct * 10 + (Correct/Total * 100)
        const total = this.globalStats.totalAttempts || 0;
        const correct = this.globalStats.totalCorrect || 0;
        if (total < 10) { alert("Responde al menos 10 preguntas para aparecer en el ranking."); return; }

        const accuracy = total > 0 ? (correct / total) : 0;
        const points = Math.round((correct * 10) + (accuracy * 100));

        const data = {
            username: username,
            correct: correct,
            total: total,
            score: points,
            timestamp: Date.now()
        };

        try {
            // Use push to create unique ID
            // Ideally we check if user exists to update, but simple push is okay for v1
            await firebase.database().ref('leaderboard_conta2').push(data);
            alert("¡Puntuación enviada!");
            this.ui.usernameInput.value = '';
            this.openLeaderboard(); // refresh
        } catch (e) {
            alert("Error al enviar");
        }
    }
}

window.addEventListener('DOMContentLoaded', () => { new QuizApp(); });
