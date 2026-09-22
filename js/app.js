/**
 * دليل - منصة القبول الذكي للجامعات والكليات السودانية 2023
 * Core Application Logic, Reactive Filtering, Student Matcher & Wishlist Builder
 */

(function () {
  'use strict';

  // State Management
  const state = {
    studentScore: 85.0,
    academicTrack: 'all',     // 'all' | 'علمي أحياء' | 'علمي هندسية' | 'أدبي' | 'تقني'
    admissionType: 'all',     // 'all' | 'القبول العام' | 'القبول الولائي' | 'شهادة السعودية'
    selectedCategory: 'all',  // 'all' | category name
    selectedUniversity: 'all',
    selectedState: 'all',
    selectedGender: 'all',
    selectedInstitution: 'all',
    searchQuery: '',
    scoreRange: 'all',        // 'all' | 'my-score-down' | 'custom-score-down' | '90-100' | ...
    customScoreDown: null,
    sortBy: 'closest',        // 'closest' (الافتراضي) | 'cutoff-desc' | 'cutoff-asc' | 'alpha' | 'alpha-desc'
    viewMode: 'grid',         // 'grid' | 'table'
    currentPage: 1,
    itemsPerPage: 18,
    wishlist: [],             // array of program IDs
    activeModalProgram: null
  };

  // DOM Elements Cache
  const elements = {
    // Nav & Theme
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    wishlistNavBtn: document.getElementById('wishlistNavBtn'),
    wishlistNavCount: document.getElementById('wishlistNavCount'),

    // Hero Quick Stats
    statProgramsCount: document.getElementById('statProgramsCount'),
    statUnisCount: document.getElementById('statUnisCount'),
    statStatesCount: document.getElementById('statStatesCount'),

    // Matcher Inputs
    scoreNumberInput: document.getElementById('scoreNumberInput'),
    scoreSliderInput: document.getElementById('scoreSliderInput'),
    scoreDisplayPill: document.getElementById('scoreDisplayPill'),
    trackSelect: document.getElementById('trackSelect'),
    admissionTypeSelect: document.getElementById('admissionTypeSelect'),
    stateSelect: document.getElementById('stateSelect'),
    presetPills: document.querySelectorAll('.preset-pill'),

    // Diagnosis Banner
    diagMessage: document.getElementById('diagMessage'),
    diagSubMessage: document.getElementById('diagSubMessage'),
    statEligibleCount: document.getElementById('statEligibleCount'),
    statCompetitiveCount: document.getElementById('statCompetitiveCount'),
    statTotalMatches: document.getElementById('statTotalMatches'),

    // Search & Categories
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    categoryPillsWrap: document.getElementById('categoryPillsWrap'),
    scoreRangeGroup: document.getElementById('scoreRangeGroup'),
    btnMyScoreDown: document.getElementById('btnMyScoreDown'),
    classifyStudentScoreText: document.getElementById('classifyStudentScoreText'),
    customScoreDownInput: document.getElementById('customScoreDownInput'),
    applyCustomScoreDownBtn: document.getElementById('applyCustomScoreDownBtn'),
    clearCustomScoreDownBtn: document.getElementById('clearCustomScoreDownBtn'),
    trackFilterGroup: document.getElementById('trackFilterGroup'),
    uniSelect: document.getElementById('uniSelect'),
    genderSelect: document.getElementById('genderSelect'),
    institutionSelect: document.getElementById('institutionSelect'),
    sortSelect: document.getElementById('sortSelect'),
    resultsCounter: document.getElementById('resultsCounter'),
    viewGridBtn: document.getElementById('viewGridBtn'),
    viewTableBtn: document.getElementById('viewTableBtn'),

    // Results Container
    resultsGrid: document.getElementById('resultsGrid'),
    paginationWrap: document.getElementById('paginationWrap'),

    // Modal
    detailModal: document.getElementById('detailModal'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    modalHeaderBadge: document.getElementById('modalHeaderBadge'),
    modalTitle: document.getElementById('modalTitle'),
    modalUniTitle: document.getElementById('modalUniTitle'),
    modalTabBtns: document.querySelectorAll('.modal-tab-btn'),
    modalTabContents: document.querySelectorAll('.modal-tab-content'),
    modalAddWishlistBtn: document.getElementById('modalAddWishlistBtn'),
    modalVisitWebsiteBtn: document.getElementById('modalVisitWebsiteBtn'),

    // Wishlist Drawer
    wishlistDrawer: document.getElementById('wishlistDrawer'),
    drawerCloseBtn: document.getElementById('drawerCloseBtn'),
    wishlistItemsList: document.getElementById('wishlistItemsList'),
    wishlistDrawerCount: document.getElementById('wishlistDrawerCount'),
    clearWishlistBtn: document.getElementById('clearWishlistBtn'),
    printWishlistBtn: document.getElementById('printWishlistBtn'),

    // Toast
    toastContainer: document.getElementById('toastContainer')
  };

  // Initialize App
  function init() {
    loadSavedSettings();
    populateSelectDropdowns();
    setupEventListeners();
    updateStudentDiagnosis();
    renderPrograms();
    updateWishlistUI();
    renderHeroStats();
  }

  // Load Saved Preferences from LocalStorage
  function loadSavedSettings() {
    // Theme
    const savedTheme = localStorage.getItem('dalil_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    // Wishlist
    try {
      const savedWishlist = JSON.parse(localStorage.getItem('dalil_wishlist') || '[]');
      state.wishlist = Array.isArray(savedWishlist) ? savedWishlist : [];
    } catch (e) {
      state.wishlist = [];
    }

    // Student Score
    const savedScore = localStorage.getItem('dalil_score');
    if (savedScore) {
      const score = parseFloat(savedScore);
      if (!isNaN(score) && score >= 50 && score <= 100) {
        state.studentScore = score;
        if (elements.scoreNumberInput) elements.scoreNumberInput.value = score;
        if (elements.classifyStudentScoreText) elements.classifyStudentScoreText.textContent = score.toFixed(1) + '%';
      }
    }
  }

  function updateThemeIcon(theme) {
    if (!elements.themeToggleBtn) return;
    const icon = elements.themeToggleBtn.querySelector('i');
    if (icon) {
      icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('dalil_theme', newTheme);
    updateThemeIcon(newTheme);
    showToast(newTheme === 'dark' ? 'تم تفعيل الوضع الليلي' : 'تم تفعيل الوضع النهاري', 'fa-circle-half-stroke');
  }

  // Populate Dropdown Selects dynamically from ADMISSION_DATA
  function populateSelectDropdowns() {
    if (typeof ADMISSION_DATA === 'undefined') return;

    const programs = ADMISSION_DATA.programs || [];
    
    // Universities
    const universities = Array.from(new Set(programs.map(p => p.university))).sort();
    if (elements.uniSelect) {
      elements.uniSelect.innerHTML = '<option value="all">كافة الجامعات والكليات</option>';
      universities.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u;
        opt.textContent = u;
        elements.uniSelect.appendChild(opt);
      });
    }

    // States
    const states = Array.from(new Set(programs.map(p => p.state).filter(Boolean))).sort();
    if (elements.stateSelect) {
      elements.stateSelect.innerHTML = '<option value="all">كافة الولايات السودانية</option>';
      states.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = `ولاية ${s}`;
        elements.stateSelect.appendChild(opt);
      });
    }
  }

  // Hero Quick Stats
  function renderHeroStats() {
    if (typeof ADMISSION_DATA === 'undefined') return;
    const programs = ADMISSION_DATA.programs || [];
    const uniqueUnis = new Set(programs.map(p => p.university)).size;
    const uniqueStates = new Set(programs.map(p => p.state).filter(Boolean)).size;

    if (elements.statProgramsCount) elements.statProgramsCount.textContent = programs.length.toLocaleString('ar-EG');
    if (elements.statUnisCount) elements.statUnisCount.textContent = uniqueUnis.toLocaleString('ar-EG') + '+';
    if (elements.statStatesCount) elements.statStatesCount.textContent = uniqueStates.toLocaleString('ar-EG');
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Theme Toggle
    if (elements.themeToggleBtn) {
      elements.themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Wishlist Drawer Open/Close
    if (elements.wishlistNavBtn) {
      elements.wishlistNavBtn.addEventListener('click', () => toggleWishlistDrawer(true));
    }
    if (elements.drawerCloseBtn) {
      elements.drawerCloseBtn.addEventListener('click', () => toggleWishlistDrawer(false));
    }
    if (elements.wishlistDrawer) {
      elements.wishlistDrawer.addEventListener('click', (e) => {
        if (e.target === elements.wishlistDrawer) toggleWishlistDrawer(false);
      });
    }

    // Score Input (number only now - slider removed)
    if (elements.scoreNumberInput) {
      elements.scoreNumberInput.addEventListener('input', (e) => {
        let val = parseFloat(e.target.value);
        if (isNaN(val)) return;
        if (val > 100) val = 100;
        if (val < 40) val = 40;
        state.studentScore = val;
        if (elements.classifyStudentScoreText) elements.classifyStudentScoreText.textContent = val.toFixed(1) + '%';
        localStorage.setItem('dalil_score', val);
        updateStudentDiagnosis();
        renderPrograms();
      });

      elements.scoreNumberInput.addEventListener('change', (e) => {
        let val = parseFloat(e.target.value);
        if (isNaN(val)) { e.target.value = state.studentScore; return; }
        if (val > 100) val = 100;
        if (val < 40) val = 40;
        state.studentScore = val;
        e.target.value = val.toFixed(1);
        if (elements.classifyStudentScoreText) elements.classifyStudentScoreText.textContent = val.toFixed(1) + '%';
        localStorage.setItem('dalil_score', val);
        updateStudentDiagnosis();
        renderPrograms();
      });
    }

    // Preset Pills (removed from HTML - no-op guard)
    if (elements.presetPills && elements.presetPills.length > 0) {
      elements.presetPills.forEach(pill => {
        pill.addEventListener('click', () => {
          elements.presetPills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          const score = parseFloat(pill.dataset.score);
          state.studentScore = score;
          if (elements.scoreNumberInput) elements.scoreNumberInput.value = score.toFixed(1);
          if (elements.classifyStudentScoreText) elements.classifyStudentScoreText.textContent = score.toFixed(1) + '%';
          localStorage.setItem('dalil_score', score);
          updateStudentDiagnosis();
          renderPrograms();
        });
      });
    }

    // Track Select
    if (elements.trackSelect) {
      elements.trackSelect.addEventListener('change', (e) => {
        state.academicTrack = e.target.value;
        state.currentPage = 1;
        updateStudentDiagnosis();
        renderPrograms();
      });
    }

    // Admission Type Select
    if (elements.admissionTypeSelect) {
      elements.admissionTypeSelect.addEventListener('change', (e) => {
        state.admissionType = e.target.value;
        state.currentPage = 1;

        // Enable stateSelect ONLY when Walai admission is selected
        const stateWrapper = document.getElementById('stateSelectWrapper');
        const stateEl = elements.stateSelect;
        const isWalai = state.admissionType === 'القبول الولائي';

        if (stateWrapper) stateWrapper.classList.toggle('disabled-state', !isWalai);
        if (stateEl) {
          stateEl.disabled = !isWalai;
          if (!isWalai) {
            stateEl.value = 'all';
            state.selectedState = 'all';
          }
        }

        renderPrograms();
      });
    }

    // State Select
    if (elements.stateSelect) {
      elements.stateSelect.addEventListener('change', (e) => {
        state.selectedState = e.target.value;
        state.currentPage = 1;
        renderPrograms();
      });
    }

    // University Select
    if (elements.uniSelect) {
      elements.uniSelect.addEventListener('change', (e) => {
        state.selectedUniversity = e.target.value;
        state.currentPage = 1;
        renderPrograms();
      });
    }

    // Gender Select
    if (elements.genderSelect) {
      elements.genderSelect.addEventListener('change', (e) => {
        state.selectedGender = e.target.value;
        state.currentPage = 1;
        renderPrograms();
      });
    }

    // Institution Select
    if (elements.institutionSelect) {
      elements.institutionSelect.addEventListener('change', (e) => {
        state.selectedInstitution = e.target.value;
        state.currentPage = 1;
        renderPrograms();
      });
    }

    // Sort Select
    if (elements.sortSelect) {
      elements.sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderPrograms();
      });
    }

    // Search Input with Debounce
    if (elements.searchInput) {
      let timeout;
      elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        const query = e.target.value.trim();
        if (elements.clearSearchBtn) {
          elements.clearSearchBtn.style.display = query ? 'block' : 'none';
        }
        timeout = setTimeout(() => {
          state.searchQuery = query;
          state.currentPage = 1;
          renderPrograms();
        }, 250);
      });
    }

    if (elements.clearSearchBtn) {
      elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchQuery = '';
        elements.clearSearchBtn.style.display = 'none';
        state.currentPage = 1;
        renderPrograms();
      });
    }

    // Category Pills Wrap Click
    if (elements.categoryPillsWrap) {
      elements.categoryPillsWrap.addEventListener('click', (e) => {
        const btn = e.target.closest('.category-pill-btn');
        if (!btn) return;
        const cat = btn.dataset.category;
        elements.categoryPillsWrap.querySelectorAll('.category-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.selectedCategory = cat;
        state.currentPage = 1;
        renderPrograms();
      });
    }

    // Score Range Group (classify strip)
    if (elements.scoreRangeGroup) {
      elements.scoreRangeGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('.classify-btn[data-range]');
        if (!btn) return;
        elements.scoreRangeGroup.querySelectorAll('.classify-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.scoreRange = btn.dataset.range;
        state.customScoreDown = null;
        if (elements.customScoreDownInput) elements.customScoreDownInput.value = '';
        
        if (state.scoreRange === 'my-score-down') {
          state.sortBy = 'cutoff-desc';
          if (elements.sortSelect) elements.sortSelect.value = 'closest';
          showToast(`تم تطبيق المفاضلة: الكليات المتاحة من نسبتك (${state.studentScore.toFixed(1)}%) فما دون`, 'info');
        }
        
        state.currentPage = 1;
        renderPrograms();
        if (typeof updateFilterDot === 'function') updateFilterDot();
      });
    }

    // Custom Score-Down Filter Controls
    if (elements.applyCustomScoreDownBtn && elements.customScoreDownInput) {
      const handleCustomScore = () => {
        let val = parseFloat(elements.customScoreDownInput.value);
        if (isNaN(val) || val < 40 || val > 100) {
          showToast('يرجى إدخال نسبة صحيحة بين 40% و 100% للمفاضلة', 'warning');
          return;
        }
        state.customScoreDown = val;
        state.scoreRange = 'custom-score-down';
        if (elements.scoreRangeGroup) {
          elements.scoreRangeGroup.querySelectorAll('.classify-btn').forEach(b => b.classList.remove('active'));
        }
        state.sortBy = 'cutoff-desc';
        if (elements.sortSelect) elements.sortSelect.value = 'closest';
        state.currentPage = 1;
        renderPrograms();
        showToast(`تمت المفاضلة: عرض الكليات بنسبة قبول ${val.toFixed(1)}% فما دون`, 'info');
      };

      elements.applyCustomScoreDownBtn.addEventListener('click', handleCustomScore);
      elements.customScoreDownInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleCustomScore();
        }
      });
    }

    if (elements.clearCustomScoreDownBtn) {
      elements.clearCustomScoreDownBtn.addEventListener('click', () => {
        if (elements.customScoreDownInput) elements.customScoreDownInput.value = '';
        state.customScoreDown = null;
        state.scoreRange = 'all';
        if (elements.scoreRangeGroup) {
          elements.scoreRangeGroup.querySelectorAll('.classify-btn').forEach(b => b.classList.remove('active'));
          const allBtn = elements.scoreRangeGroup.querySelector('[data-range="all"]');
          if (allBtn) allBtn.classList.add('active');
        }
        state.currentPage = 1;
        renderPrograms();
        showToast('تمت استعادة كافة نسب القبول', 'info');
      });
    }

    // Toggle Advanced Filters Strip
    const toggleFiltersBtn = document.getElementById('toggleFiltersBtn');
    const classifyStrip = document.getElementById('classifyStrip');
    const toggleFilterText = document.getElementById('toggleFilterText');
    const toggleFilterChevron = document.getElementById('toggleFilterChevron');

    if (toggleFiltersBtn && classifyStrip) {
      toggleFiltersBtn.addEventListener('click', () => {
        const isExpanded = toggleFiltersBtn.getAttribute('aria-expanded') === 'true';
        const newState = !isExpanded;
        toggleFiltersBtn.setAttribute('aria-expanded', newState);
        classifyStrip.classList.toggle('collapsed', !newState);

        if (toggleFilterText) toggleFilterText.textContent = newState ? 'إخفاء الفلاتر' : 'إظهار الفلاتر';
        if (toggleFilterChevron) {
          toggleFilterChevron.style.transform = newState ? 'rotate(180deg)' : 'rotate(0deg)';
        }
      });
    }

    // Helper: update active-filter-dot indicator
    function updateFilterDot() {
      const dot = document.getElementById('activeFilterDot');
      if (!dot) return;
      const hasFilters =
        state.scoreRange !== 'all' ||
        state.customScoreDown !== null ||
        state.academicTrack !== 'all' ||
        state.sortBy !== 'closest';
      dot.style.display = hasFilters ? 'inline-block' : 'none';
    }

    // Track Filter Group (classify strip) — synced with state.academicTrack
    if (elements.trackFilterGroup) {
      elements.trackFilterGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('.classify-btn[data-track]');
        if (!btn) return;
        elements.trackFilterGroup.querySelectorAll('.classify-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.academicTrack = btn.dataset.track;
        // Also sync the matcher trackSelect dropdown if present
        if (elements.trackSelect) elements.trackSelect.value = btn.dataset.track;
        state.currentPage = 1;
        updateStudentDiagnosis();
        renderPrograms();
      });
    }

    // Grid / Card Click Delegation (Ensures 100% reliable clicks on Mobile)
    if (elements.resultsGrid) {
      elements.resultsGrid.addEventListener('click', (e) => {
        if (e.target.closest('.favorite-card-btn')) return;
        const card = e.target.closest('.college-card, tr[data-prog-id]');
        if (card && card.dataset.progId) {
          openCollegeDetails(card.dataset.progId);
        }
      });
    }

    // View Mode Toggle
    if (elements.viewGridBtn && elements.viewTableBtn) {
      elements.viewGridBtn.addEventListener('click', () => {
        state.viewMode = 'grid';
        elements.viewGridBtn.classList.add('active');
        elements.viewTableBtn.classList.remove('active');
        renderPrograms();
      });
      elements.viewTableBtn.addEventListener('click', () => {
        state.viewMode = 'table';
        elements.viewTableBtn.classList.add('active');
        elements.viewGridBtn.classList.remove('active');
        renderPrograms();
      });
    }

    // Modal Tabs Navigation
    elements.modalTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.modalTabBtns.forEach(b => b.classList.remove('active'));
        elements.modalTabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const targetTab = document.getElementById(btn.dataset.tab);
        if (targetTab) targetTab.classList.add('active');
      });
    });

    // Modal Close
    if (elements.modalCloseBtn) {
      elements.modalCloseBtn.addEventListener('click', () => closeModal());
    }
    if (elements.detailModal) {
      elements.detailModal.addEventListener('click', (e) => {
        if (e.target === elements.detailModal) closeModal();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
        toggleWishlistDrawer(false);
      }
    });

    // Wishlist Drawer Actions
    if (elements.clearWishlistBtn) {
      elements.clearWishlistBtn.addEventListener('click', () => {
        if (!state.wishlist.length) return;
        if (confirm('هل أنت متأكد من مسح كافة الرغبات المسجلة؟')) {
          state.wishlist = [];
          saveWishlist();
          updateWishlistUI();
          renderPrograms();
          showToast('تم إفراغ قائمة الرغبات بنجاح', 'fa-trash-can');
        }
      });
    }

    if (elements.printWishlistBtn) {
      elements.printWishlistBtn.addEventListener('click', () => {
        window.print();
      });
    }

    if (elements.modalAddWishlistBtn) {
      elements.modalAddWishlistBtn.addEventListener('click', () => {
        if (state.activeModalProgram) {
          toggleWishlistItem(state.activeModalProgram.id);
          updateModalWishlistBtn();
        }
      });
    }
  }

  // Filter Programs Helper
  function getFilteredPrograms() {
    if (typeof ADMISSION_DATA === 'undefined') return [];
    let list = ADMISSION_DATA.programs || [];

    // Filter by Search Query
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      list = list.filter(p => 
        p.college.toLowerCase().includes(q) ||
        p.university.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.state && p.state.toLowerCase().includes(q))
      );
    }

    // Filter by Academic Track
    if (state.academicTrack !== 'all') {
      list = list.filter(p => p.tracks.includes(state.academicTrack));
    }

    // Filter by Admission Type
    if (state.admissionType !== 'all') {
      list = list.filter(p => p.admission_type === state.admissionType);
    }

    // Filter by Discipline / Category
    if (state.selectedCategory !== 'all') {
      list = list.filter(p => p.category === state.selectedCategory);
    }

    // Filter by University
    if (state.selectedUniversity !== 'all') {
      list = list.filter(p => p.university === state.selectedUniversity);
    }

    // Filter by State
    if (state.selectedState !== 'all') {
      list = list.filter(p => p.state === state.selectedState);
    }

    // Filter by Gender
    if (state.selectedGender !== 'all') {
      list = list.filter(p => p.gender === state.selectedGender || p.gender === 'مشترك');
    }

    // Filter by Institution Type
    if (state.selectedInstitution !== 'all') {
      list = list.filter(p => p.institution_type === state.selectedInstitution);
    }

    // Filter by Score Range & Rank Downwards (Classification Strip)
    if (state.scoreRange !== 'all') {
      if (state.scoreRange === 'my-score-down') {
        list = list.filter(p => p.cutoff <= state.studentScore);
      } else if (state.scoreRange === 'custom-score-down') {
        const threshold = state.customScoreDown !== null ? state.customScoreDown : state.studentScore;
        list = list.filter(p => p.cutoff <= threshold);
      } else if (state.scoreRange === '0-60') {
        list = list.filter(p => p.cutoff < 60);
      } else {
        const parts = state.scoreRange.split('-').map(Number);
        const [rangeMin, rangeMax] = parts;
        list = list.filter(p => p.cutoff >= rangeMin && p.cutoff < rangeMax);
      }
    }

    // Sort Logic
    list.sort((a, b) => {
      if (state.sortBy === 'cutoff-desc') {
        return b.cutoff - a.cutoff;
      } else if (state.sortBy === 'cutoff-asc') {
        return a.cutoff - b.cutoff;
      } else if (state.sortBy === 'closest') {
        const diffA = Math.abs(a.cutoff - state.studentScore);
        const diffB = Math.abs(b.cutoff - state.studentScore);
        if (Math.abs(diffA - diffB) > 0.0001) {
          return diffA - diffB;
        }
        return b.cutoff - a.cutoff;
      } else if (state.sortBy === 'alpha') {
        return a.college.localeCompare(b.college, 'ar');
      } else if (state.sortBy === 'alpha-desc') {
        return b.college.localeCompare(a.college, 'ar');
      }
      return 0;
    });

    return list;
  }

  // Update Student Diagnosis Banner
  function updateStudentDiagnosis() {
    if (typeof ADMISSION_DATA === 'undefined') return;
    const programs = ADMISSION_DATA.programs || [];

    // Filter according to current academic track
    let trackPrograms = programs;
    if (state.academicTrack !== 'all') {
      trackPrograms = programs.filter(p => p.tracks.includes(state.academicTrack));
    }

    const eligibleList = trackPrograms.filter(p => state.studentScore >= p.cutoff);
    const competitiveList = trackPrograms.filter(p => state.studentScore < p.cutoff && (p.cutoff - state.studentScore) <= 2.5);

    if (elements.statEligibleCount) {
      elements.statEligibleCount.textContent = eligibleList.length.toLocaleString('ar-EG');
    }
    if (elements.statCompetitiveCount) {
      elements.statCompetitiveCount.textContent = competitiveList.length.toLocaleString('ar-EG');
    }
    if (elements.statTotalMatches) {
      elements.statTotalMatches.textContent = (eligibleList.length + competitiveList.length).toLocaleString('ar-EG');
    }

    // Custom Messages
    if (elements.diagMessage && elements.diagSubMessage) {
      if (state.studentScore >= 90) {
        elements.diagMessage.textContent = `نسبة ممتازة جداً (${state.studentScore.toFixed(1)}%)! فرصك مكتملة في قمة كليات الطب والهندسة`;
        elements.diagSubMessage.textContent = 'أنت تنافس بأريحية في كليات الطب البشري، طب الأسنان، الصيدلة، والهندسة الكهربائية والمدنية بجامعة الخرطوم والجامعات الكبرى.';
      } else if (state.studentScore >= 80) {
        elements.diagMessage.textContent = `نسبة متميزة (${state.studentScore.toFixed(1)}%)! لديك خيارات واسعة في الهندسة والحاسوب والعلوم الصحية`;
        elements.diagSubMessage.textContent = 'مؤهل للمنافسة القوية في كليات الهندسة، علوم المختبرات، تقانة المعلومات، الاقتصاد، والقانون في أغلب الجامعات الحكومية.';
      } else if (state.studentScore >= 70) {
        elements.diagMessage.textContent = `نسبة جيدة جداً (${state.studentScore.toFixed(1)}%)! مؤهل لعشرات الكليات الأكاديمية والتقنية`;
        elements.diagSubMessage.textContent = 'فرص ممتازة في كليات العلوم، الحاسوب، التمريض، العلوم الإدارية، اللغات، والتربية بالجامعات الولائية والمركزية.';
      } else {
        elements.diagMessage.textContent = `نسبتك (${state.studentScore.toFixed(1)}%) تمنحك خيارات متنوعة في القبول العام والولائي`;
        elements.diagSubMessage.textContent = 'استكشف كليات التربية، العلوم الزراعية، الآداب، والدراسات التجارية بالإضافة إلى فرص القبول الولائي الميسرة.';
      }
    }
  }

  // Render Programs Grid / Table
  function renderPrograms() {
    const filtered = getFilteredPrograms();

    if (elements.resultsCounter) {
      elements.resultsCounter.innerHTML = `تم العثور على <strong>${filtered.length.toLocaleString('ar-EG')}</strong> تخصص وكلية متاحة`;
    }

    if (!elements.resultsGrid) return;

    if (filtered.length === 0) {
      elements.resultsGrid.innerHTML = `
        <div class="empty-results-box">
          <div class="empty-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
          <h3>لا توجد كليات مطابقة لمعايير البحث الحالية</h3>
          <p>جرّب تعديل الكلمات الدلالية، أو تغيير تصنيف التخصص، أو تعديل المساق ونسبة الطالب لإظهار نتائج أوسع.</p>
          <button class="btn-primary-action" style="margin: 0 auto;" onclick="window.resetAllFilters()">
            <i class="fa-solid fa-rotate-right"></i> إعادة ضبط كافة الفلاتر
          </button>
        </div>
      `;
      if (elements.paginationWrap) elements.paginationWrap.innerHTML = '';
      return;
    }

    // Pagination
    const totalPages = Math.ceil(filtered.length / state.itemsPerPage);
    if (state.currentPage > totalPages) state.currentPage = 1;
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = Math.min(startIndex + state.itemsPerPage, filtered.length);
    const paginatedItems = filtered.slice(startIndex, endIndex);

    if (state.viewMode === 'table') {
      renderTableView(paginatedItems);
    } else {
      renderGridView(paginatedItems);
    }

    renderPagination(totalPages);
  }

  // Render Grid View
  function renderGridView(items) {
    let html = '';
    const majorMeta = ADMISSION_DATA.major_details || {};

    items.forEach(prog => {
      const isFav = state.wishlist.includes(prog.id);
      const diff = (state.studentScore - prog.cutoff).toFixed(1);
      const diffNum = parseFloat(diff);

      let matchBadge = '';
      if (diffNum >= 0) {
        matchBadge = `<div class="match-status-pill status-eligible"><i class="fa-solid fa-circle-check"></i> مؤهل للقبول (${diffNum > 0 ? `+${diffNum}%` : 'مطابق'})</div>`;
      } else if (diffNum >= -2.5) {
        matchBadge = `<div class="match-status-pill status-competitive"><i class="fa-solid fa-circle-exclamation"></i> نطاق المنافسة والمفاضلة (${diffNum}%)</div>`;
      } else {
        matchBadge = `<div class="match-status-pill status-above"><i class="fa-solid fa-circle-xmark"></i> أعلى من نسبتك الحالية (${diffNum}%)</div>`;
      }

      const catInfo = majorMeta[prog.category] || { color: '#059669', icon: 'fa-graduation-cap' };

      html += `
        <div class="college-card" data-prog-id="${prog.id}" onclick="window.openCollegeDetails('${prog.id}')" role="button" tabindex="0">
          <div>
            <div class="card-top-header">
              <span class="category-tag" style="background: ${catInfo.color}18; color: ${catInfo.color}; border: 1px solid ${catInfo.color}35;">
                <i class="fa-solid ${catInfo.icon}"></i> ${prog.category}
              </span>
              <button type="button" class="favorite-card-btn ${isFav ? 'favorited' : ''}" 
                      title="${isFav ? 'إزالة من الرغبات' : 'إضافة للرغبات'}"
                      onclick="event.stopPropagation(); window.toggleWishlistItem('${prog.id}')">
                <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i>
              </button>
            </div>

            <h3 class="college-name">${prog.college}</h3>
            <div class="university-name-link">
              <i class="fa-solid fa-building-columns"></i> ${prog.university}
            </div>

            <div class="score-box-card">
              <div class="score-main">
                <span class="label">الحد الأدنى للقبول 2023</span>
                <span class="percentage-value">${prog.cutoff.toFixed(1)}%</span>
              </div>
              <div class="tiebreaker-tag">
                <span class="label">المفاضلة</span>
                <span class="value">${prog.tie_breaker > 0 ? prog.tie_breaker : 'بدون مفاضلة'}</span>
              </div>
            </div>

            ${matchBadge}

            <div class="card-meta-tags">
              <span class="meta-chip"><i class="fa-solid fa-location-dot"></i> ولاية ${prog.state}</span>
              <span class="meta-chip"><i class="fa-solid fa-award"></i> ${prog.admission_type}</span>
              ${prog.gender !== 'مشترك' ? `<span class="meta-chip" style="color: var(--accent-rose);"><i class="fa-solid fa-user-group"></i> ${prog.gender}</span>` : ''}
              <span class="meta-chip"><i class="fa-solid fa-landmark"></i> ${prog.institution_type}</span>
            </div>
          </div>

          <div class="card-action-footer">
            <button type="button" class="btn-card-details" onclick="event.stopPropagation(); window.openCollegeDetails('${prog.id}')">
              <span>عرض تفاصيل التخصص والجامعة</span>
              <i class="fa-solid fa-arrow-left"></i>
            </button>
          </div>
        </div>
      `;
    });

    elements.resultsGrid.className = 'results-grid';
    elements.resultsGrid.innerHTML = html;
  }

  // Render Table View
  function renderTableView(items) {
    let rows = '';
    items.forEach(prog => {
      const isFav = state.wishlist.includes(prog.id);
      const diff = (state.studentScore - prog.cutoff).toFixed(1);
      const diffNum = parseFloat(diff);

      let statusBadge = diffNum >= 0 ? 
        `<span style="color: var(--success); font-weight: 700;">مؤهل (+${diffNum}%)</span>` : 
        (diffNum >= -2.5 ? 
          `<span style="color: var(--warning); font-weight: 700;">منافسة (${diffNum}%)</span>` : 
          `<span style="color: var(--danger); font-weight: 700;">أعلى (${diffNum}%)</span>`);

      rows += `
        <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" onclick="window.openCollegeDetails('${prog.id}')">
          <td style="padding: 1rem; font-weight: 800; color: var(--text-main);">${prog.college}</td>
          <td style="padding: 1rem; font-weight: 700; color: var(--text-muted);">${prog.university}</td>
          <td style="padding: 1rem; text-align: center;"><span class="category-tag" style="background: var(--bg-subtle);">${prog.category}</span></td>
          <td style="padding: 1rem; text-align: center; font-size: 1.2rem; font-weight: 900; color: var(--primary);">${prog.cutoff.toFixed(1)}%</td>
          <td style="padding: 1rem; text-align: center; font-weight: 700;">${prog.tie_breaker > 0 ? prog.tie_breaker : '—'}</td>
          <td style="padding: 1rem; text-align: center;">${statusBadge}</td>
          <td style="padding: 1rem; text-align: center;">
            <button class="favorite-card-btn ${isFav ? 'favorited' : ''}" 
                    style="display: inline-flex;"
                    onclick="event.stopPropagation(); window.toggleWishlistItem('${prog.id}')">
              <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i>
            </button>
          </td>
        </tr>
      `;
    });

    elements.resultsGrid.className = '';
    elements.resultsGrid.innerHTML = `
      <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow-x: auto; box-shadow: var(--shadow-sm); margin-bottom: 2rem;">
        <table style="width: 100%; border-collapse: collapse; text-align: right; min-width: 750px;">
          <thead style="background: var(--bg-subtle); border-bottom: 2px solid var(--border); font-size: 0.88rem; font-weight: 800; color: var(--text-muted);">
            <tr>
              <th style="padding: 1rem;">الكلية والتخصص</th>
              <th style="padding: 1rem;">الجامعة</th>
              <th style="padding: 1rem; text-align: center;">التصنيف</th>
              <th style="padding: 1rem; text-align: center;">النسبة</th>
              <th style="padding: 1rem; text-align: center;">المفاضلة</th>
              <th style="padding: 1rem; text-align: center;">حالة القبول</th>
              <th style="padding: 1rem; text-align: center;">الرغبات</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  // Render Pagination Buttons
  function renderPagination(totalPages) {
    if (!elements.paginationWrap) return;
    if (totalPages <= 1) {
      elements.paginationWrap.innerHTML = '';
      return;
    }

    let html = '';
    html += `
      <button class="page-btn" ${state.currentPage === 1 ? 'disabled' : ''} onclick="window.changePage(${state.currentPage - 1})">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    `;

    const maxVisible = 5;
    let startPage = Math.max(1, state.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      html += `<button class="page-btn" onclick="window.changePage(1)">1</button>`;
      if (startPage > 2) html += `<span style="padding: 0 0.5rem;">...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
      html += `
        <button class="page-btn ${i === state.currentPage ? 'active' : ''}" onclick="window.changePage(${i})">${i}</button>
      `;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += `<span style="padding: 0 0.5rem;">...</span>`;
      html += `<button class="page-btn" onclick="window.changePage(${totalPages})">${totalPages}</button>`;
    }

    html += `
      <button class="page-btn" ${state.currentPage === totalPages ? 'disabled' : ''} onclick="window.changePage(${state.currentPage + 1})">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
    `;

    elements.paginationWrap.innerHTML = html;
  }

  function changePage(page) {
    state.currentPage = page;
    renderPrograms();
    window.scrollTo({ top: document.getElementById('resultsSection').offsetTop - 90, behavior: 'smooth' });
  }

  // Modal Functionality
  function openCollegeDetails(progId) {
    if (typeof ADMISSION_DATA === 'undefined') return;
    const prog = (ADMISSION_DATA.programs || []).find(p => p.id === progId || String(p.id) === String(progId));
    if (!prog) {
      console.warn('College program not found:', progId);
      return;
    }

    state.activeModalProgram = prog;
    const uniMeta = (ADMISSION_DATA.universities_meta || {})[prog.university] || {};
    const majorMeta = (ADMISSION_DATA.major_details || {})[prog.category] || {};
    const modalEl = elements.detailModal || document.getElementById('detailModal');
    if (!modalEl) return;

    // Header Info
    if (elements.modalHeaderBadge) {
      elements.modalHeaderBadge.style.background = (majorMeta.color || '#059669') + '20';
      elements.modalHeaderBadge.style.color = majorMeta.color || '#059669';
      elements.modalHeaderBadge.innerHTML = `<i class="fa-solid ${majorMeta.icon || 'fa-graduation-cap'}"></i> ${prog.category} - ${prog.degree}`;
    }

    if (elements.modalTitle) elements.modalTitle.textContent = prog.college;
    if (elements.modalUniTitle) {
      elements.modalUniTitle.innerHTML = `<i class="fa-solid fa-building-columns"></i> ${prog.university} (${uniMeta.type || prog.institution_type || 'مؤسسة تعليم عالي'})`;
    }

    // Populate Tab 1: About Major & Curriculum
    const tabMajor = document.getElementById('tab-major');
    if (tabMajor) {
      tabMajor.innerHTML = `
        <div class="detail-card-box">
          <h4><i class="fa-solid fa-book-open"></i> نبذة تعريفية عن التخصص وطبيعة الدراسة</h4>
          <p>${majorMeta.overview || 'برنامج أكاديمي متميز يهدف إلى تأهيل الطلاب علمياً وعملياً وفق أحدث المعايير الأكاديمية والمهنية المعتمدة دولياً.'}</p>
        </div>

        <div class="uni-meta-grid" style="margin-bottom: 1.25rem;">
          <div class="uni-meta-item">
            <div class="uni-meta-icon"><i class="fa-solid fa-clock"></i></div>
            <div class="uni-meta-text">
              <div class="label">مدة وسنوات الدراسة</div>
              <div class="val">${majorMeta.study_duration || '4 - 5 سنوات دراسية'}</div>
            </div>
          </div>
          <div class="uni-meta-item">
            <div class="uni-meta-icon"><i class="fa-solid fa-certificate"></i></div>
            <div class="uni-meta-text">
              <div class="label">الدرجة الممنوحة</div>
              <div class="val">${prog.degree}</div>
            </div>
          </div>
        </div>

        <div class="detail-card-box">
          <h4><i class="fa-solid fa-lightbulb"></i> أهم المهارات والخبرات التي يكتسبها الطالب</h4>
          <div class="skills-list-wrap">
            ${(majorMeta.key_skills || ['التحليل العلمي وحل المعضلات', 'التدريب العملي والميداني']).map(s => `
              <div class="career-item"><i class="fa-solid fa-check"></i> <span>${s}</span></div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Populate Tab 2: Career Opportunities & Jobs
    const tabCareers = document.getElementById('tab-careers');
    if (tabCareers) {
      tabCareers.innerHTML = `
        <div class="detail-card-box">
          <h4><i class="fa-solid fa-briefcase"></i> أين يعمل الخريج بعد التخرج؟ (مجالات وسوق العمل)</h4>
          <p style="margin-bottom: 1rem;">يتمتع خريجو هذا التخصص بطلب مرتفع وفرص عمل متنوعة في القطاعين العام والخاص محلياً وفي دول الخليج والعالم:</p>
          <div class="careers-list-wrap">
            ${(majorMeta.career_paths || ['المؤسسات الحكومية والخاصة', 'مراكز الأبحاث والتطوير']).map(c => `
              <div class="career-item">
                <i class="fa-solid fa-circle-arrow-left"></i>
                <span>${c}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="detail-card-box" style="background: rgba(2, 132, 199, 0.08); border-color: rgba(2, 132, 199, 0.25);">
          <h4><i class="fa-solid fa-globe" style="color: var(--secondary);"></i> فرص العمل الإقليمي والدولي والعمل الحر</h4>
          <p>تفتح هذه الدرجة آفاقاً واسعة للعمل بالمملكة العربية السعودية، والإمارات، وقطر، وسلطنة عمان، إلى جانب إمكانية العمل الحر عن بعد (Freelancing) مع كبرى المنصات والشركات العالمية ومواصلة الدراسات العليا (ماجستير ودكتوراه).</p>
        </div>
      `;
    }

    // Populate Tab 3: About University Profile
    const tabUni = document.getElementById('tab-university');
    if (tabUni) {
      tabUni.innerHTML = `
        <div class="detail-card-box">
          <h4><i class="fa-solid fa-landmark"></i> نبذة تاريخية عن الصرح الأكاديمي</h4>
          <p>${uniMeta.history || 'جامعة سودانية مرموقة تسهم بفاعلية في تطوير المعرفة والبحث العلمي وتخريج أجيال من الكفاءات الوطنية المتخصصة في شتى العلوم.'}</p>
        </div>

        <div class="uni-meta-grid" style="margin-bottom: 1.25rem;">
          <div class="uni-meta-item">
            <div class="uni-meta-icon"><i class="fa-solid fa-calendar-check"></i></div>
            <div class="uni-meta-text">
              <div class="label">سنة التأسيس</div>
              <div class="val">${uniMeta.founded ? uniMeta.founded + 'م' : 'عريقة'}</div>
            </div>
          </div>
          <div class="uni-meta-item">
            <div class="uni-meta-icon"><i class="fa-solid fa-map-location-dot"></i></div>
            <div class="uni-meta-text">
              <div class="label">الموقع والولاية</div>
              <div class="val">ولاية ${prog.state} (${uniMeta.location || prog.state})</div>
            </div>
          </div>
          <div class="uni-meta-item">
            <div class="uni-meta-icon"><i class="fa-solid fa-phone"></i></div>
            <div class="uni-meta-text">
              <div class="label">هاتف التواصل</div>
              <div class="val" style="direction: ltr; text-align: right;">${uniMeta.phone || '+249 183 770000'}</div>
            </div>
          </div>
          <div class="uni-meta-item">
            <div class="uni-meta-icon"><i class="fa-solid fa-envelope"></i></div>
            <div class="uni-meta-text">
              <div class="label">البريد الإلكتروني</div>
              <div class="val" style="direction: ltr; text-align: right;">${uniMeta.email || 'info@' + (uniMeta.website ? uniMeta.website.replace('http://', '').replace('https://', '').replace('www.', '').split('/')[0] : 'university.edu.sd')}</div>
            </div>
          </div>
        </div>

        ${uniMeta.campuses ? `
          <div class="detail-card-box">
            <h4><i class="fa-solid fa-map-pin"></i> مجمعات وفروع الجامعة</h4>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              ${uniMeta.campuses.map(cp => `<span class="meta-chip" style="font-size: 0.82rem; padding: 0.35rem 0.75rem;"><i class="fa-solid fa-check"></i> ${cp}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      `;
    }

    // Populate Tab 4: Admission Info & Comparison
    const tabAdmission = document.getElementById('tab-admission');
    if (tabAdmission) {
      const diff = (state.studentScore - prog.cutoff).toFixed(1);
      const diffNum = parseFloat(diff);

      tabAdmission.innerHTML = `
        <div class="score-box-card" style="padding: 1.25rem;">
          <div class="score-main">
            <span class="label">النسبة المعتمدة في قبول 2023</span>
            <span class="percentage-value" style="color: var(--primary); font-size: 2.2rem;">${prog.cutoff.toFixed(1)}%</span>
          </div>
          <div class="tiebreaker-tag">
            <span class="label">درجة المفاضلة المقررة</span>
            <span class="value" style="font-size: 1.25rem;">${prog.tie_breaker > 0 ? prog.tie_breaker : 'بدون مفاضلة'}</span>
          </div>
        </div>

        <div class="detail-card-box" style="margin-top: 1rem;">
          <h4><i class="fa-solid fa-user-check"></i> تحليل فرصتك بناءً على نسبتك (${state.studentScore.toFixed(1)}%)</h4>
          <p>
            ${diffNum >= 0 ? 
              `نسبتك تزيد عن الحد الأدنى للقبول بـ <strong>+${diffNum}%</strong> مما يمنحك <strong>أولوية وفرصة قبول قوية ومضمونة</strong> بمشيئة الله.` : 
              (diffNum >= -2.5 ? 
                `نسبتك أقل بفارق بسيط قدره <strong>${diffNum}%</strong>، وتعتبر الكلية ضمن <strong>نطاق المنافسة والمفاضلة</strong>، وتعتمد فرصة قبولك على مقاعد الشواغر ودرجة المفاضلة.` : 
                `نسبتك أقل من الحد الأدنى بفارق <strong>${diffNum}%</strong>، ينصح باختيار هذه الكلية كرغبة أولى أو ثانية فقط مع وضع كليات بديلة أكثر أماناً.`)}
          </p>
        </div>

        <div class="uni-meta-grid">
          <div class="uni-meta-item">
            <div class="uni-meta-icon"><i class="fa-solid fa-book-bookmark"></i></div>
            <div class="uni-meta-text">
              <div class="label">المساقات المؤهلة للتقديم</div>
              <div class="val">${prog.tracks.join(' ، ')}</div>
            </div>
          </div>
          <div class="uni-meta-item">
            <div class="uni-meta-icon"><i class="fa-solid fa-venus-mars"></i></div>
            <div class="uni-meta-text">
              <div class="label">الفئات المسموح لها</div>
              <div class="val">${prog.gender}</div>
            </div>
          </div>
        </div>
      `;
    }

    // Modal Links & Wishlist Button
    updateModalWishlistBtn();
    if (elements.modalVisitWebsiteBtn) {
      elements.modalVisitWebsiteBtn.href = uniMeta.website || 'http://admission.gov.sd';
    }

    // Activate First Tab by default
    const tabBtns = document.querySelectorAll('.modal-tab-btn');
    const tabContents = document.querySelectorAll('.modal-tab-content');
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    if (tabBtns[0]) tabBtns[0].classList.add('active');
    if (tabContents[0]) tabContents[0].classList.add('active');

    modalEl.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function updateModalWishlistBtn() {
    if (!elements.modalAddWishlistBtn || !state.activeModalProgram) return;
    const isFav = state.wishlist.includes(state.activeModalProgram.id);
    elements.modalAddWishlistBtn.innerHTML = `
      <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i>
      <span>${isFav ? 'في قائمة رغباتي' : 'إضافة للرغبات'}</span>
    `;
    if (isFav) {
      elements.modalAddWishlistBtn.style.background = 'var(--accent-rose)';
      elements.modalAddWishlistBtn.style.color = '#fff';
    } else {
      elements.modalAddWishlistBtn.style.background = '';
      elements.modalAddWishlistBtn.style.color = '';
    }
  }

  function closeModal() {
    if (elements.detailModal) elements.detailModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Wishlist / 10 Choices Functionality
  function toggleWishlistItem(progId) {
    const idx = state.wishlist.indexOf(progId);
    if (idx > -1) {
      state.wishlist.splice(idx, 1);
      showToast('تمت إزالة الكلية من قائمة رغباتك', 'fa-trash-can');
    } else {
      if (state.wishlist.length >= 15) {
        alert('لقد أضفت الحد الأقصى من الرغبات (15 رغبة). يمكنك تعديل أو حذف بعضها.');
        return;
      }
      state.wishlist.push(progId);
      showToast('تمت إضافة الكلية إلى قائمة رغباتك بنجاح', 'fa-heart');
    }

    saveWishlist();
    updateWishlistUI();
    renderPrograms();
  }

  function saveWishlist() {
    localStorage.setItem('dalil_wishlist', JSON.stringify(state.wishlist));
  }

  function updateWishlistUI() {
    const count = state.wishlist.length;
    if (elements.wishlistNavCount) elements.wishlistNavCount.textContent = count;
    if (elements.wishlistDrawerCount) elements.wishlistDrawerCount.textContent = count;

    renderWishlistDrawerItems();
  }

  function toggleWishlistDrawer(open) {
    if (!elements.wishlistDrawer) return;
    if (open) {
      elements.wishlistDrawer.classList.add('active');
      document.body.style.overflow = 'hidden';
    } else {
      elements.wishlistDrawer.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function renderWishlistDrawerItems() {
    if (!elements.wishlistItemsList || typeof ADMISSION_DATA === 'undefined') return;
    const allProgs = ADMISSION_DATA.programs || [];

    if (state.wishlist.length === 0) {
      elements.wishlistItemsList.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 1rem; color: var(--text-light);"><i class="fa-regular fa-heart"></i></div>
          <h4 style="font-size: 1.15rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem;">قائمة الرغبات فارغة</h4>
          <p style="font-size: 0.9rem;">تصفح الكليات واضغط على أيقونة القلب لإضافتها إلى قائمة رغباتك وترتيبها للتقديم الرسمي.</p>
        </div>
      `;
      return;
    }

    let html = '';
    state.wishlist.forEach((progId, index) => {
      const prog = allProgs.find(p => p.id === progId);
      if (!prog) return;

      const diff = (state.studentScore - prog.cutoff).toFixed(1);
      const diffNum = parseFloat(diff);

      html += `
        <div class="wishlist-item-card">
          <div class="wishlist-order-badge">${index + 1}</div>
          <div class="wishlist-item-info">
            <h5>${prog.college}</h5>
            <span><i class="fa-solid fa-building-columns"></i> ${prog.university}</span>
            <div style="font-size: 0.75rem; font-weight: 700; margin-top: 4px; color: ${diffNum >= 0 ? 'var(--success)' : (diffNum >= -2.5 ? 'var(--warning)' : 'var(--danger)')};">
              ${diffNum >= 0 ? `مؤهل (+${diffNum}%)` : `منافسة (${diffNum}%)`}
            </div>
          </div>
          <div class="wishlist-item-score">${prog.cutoff.toFixed(1)}%</div>
          <div class="wishlist-reorder-btns">
            <button class="reorder-btn" title="تحريك لأعلى" onclick="window.reorderWishlist(${index}, -1)" ${index === 0 ? 'disabled' : ''}>
              <i class="fa-solid fa-arrow-up"></i>
            </button>
            <button class="reorder-btn" title="تحريك لأسفل" onclick="window.reorderWishlist(${index}, 1)" ${index === state.wishlist.length - 1 ? 'disabled' : ''}>
              <i class="fa-solid fa-arrow-down"></i>
            </button>
            <button class="reorder-btn" style="color: var(--danger);" title="حذف" onclick="window.toggleWishlistItem('${prog.id}')">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      `;
    });

    elements.wishlistItemsList.innerHTML = html;
  }

  function reorderWishlist(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= state.wishlist.length) return;
    const item = state.wishlist.splice(index, 1)[0];
    state.wishlist.splice(newIndex, 0, item);
    saveWishlist();
    updateWishlistUI();
  }

  // Toast Notification Helper
  function showToast(message, iconClass = 'fa-circle-check') {
    if (!elements.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${message}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Reset All Filters Helper
  function resetAllFilters() {
    state.searchQuery = '';
    state.selectedCategory = 'all';
    state.selectedUniversity = 'all';
    state.selectedState = 'all';
    state.selectedGender = 'all';
    state.selectedInstitution = 'all';
    state.academicTrack = 'all';
    state.admissionType = 'all';
    state.scoreRange = 'all';
    state.customScoreDown = null;
    state.sortBy = 'closest';
    state.currentPage = 1;

    if (elements.searchInput) elements.searchInput.value = '';
    if (elements.clearSearchBtn) elements.clearSearchBtn.style.display = 'none';
    if (elements.trackSelect) elements.trackSelect.value = 'all';
    if (elements.admissionTypeSelect) elements.admissionTypeSelect.value = 'all';
    if (elements.stateSelect) elements.stateSelect.value = 'all';
    if (elements.uniSelect) elements.uniSelect.value = 'all';
    if (elements.genderSelect) elements.genderSelect.value = 'all';
    if (elements.institutionSelect) elements.institutionSelect.value = 'all';
    if (elements.sortSelect) elements.sortSelect.value = 'closest';

    if (elements.categoryPillsWrap) {
      elements.categoryPillsWrap.querySelectorAll('.category-pill-btn').forEach(b => b.classList.remove('active'));
      const allBtn = elements.categoryPillsWrap.querySelector('[data-category="all"]');
      if (allBtn) allBtn.classList.add('active');
    }

    // Reset classify strip buttons
    if (elements.customScoreDownInput) elements.customScoreDownInput.value = '';
    if (elements.scoreRangeGroup) {
      elements.scoreRangeGroup.querySelectorAll('.classify-btn').forEach(b => b.classList.remove('active'));
      const allRange = elements.scoreRangeGroup.querySelector('[data-range="all"]');
      if (allRange) allRange.classList.add('active');
    }
    if (elements.trackFilterGroup) {
      elements.trackFilterGroup.querySelectorAll('.classify-btn').forEach(b => b.classList.remove('active'));
      const allTrack = elements.trackFilterGroup.querySelector('[data-track="all"]');
      if (allTrack) allTrack.classList.add('active');
    }
    // Reset alpha sort buttons
    const az = document.getElementById('sortAlphaAZ');
    const za = document.getElementById('sortAlphaZA');
    if (az) az.classList.remove('active');
    if (za) za.classList.remove('active');

    updateStudentDiagnosis();
    renderPrograms();
    showToast('تمت استعادة كافة الفلاتر الافتراضية', 'fa-rotate-right');
  }

  // Set alphabetical sort from classify strip buttons
  function setSortAlpha(direction) {
    const newSort = direction === 'asc' ? 'alpha' : 'alpha-desc';
    state.sortBy = newSort;
    state.currentPage = 1;

    // Sync the main sortSelect dropdown
    if (elements.sortSelect) elements.sortSelect.value = (newSort === 'alpha' || newSort === 'alpha-desc') ? newSort : 'closest';

    // Toggle active on alpha buttons
    const az = document.getElementById('sortAlphaAZ');
    const za = document.getElementById('sortAlphaZA');
    if (az && za) {
      az.classList.toggle('active', direction === 'asc');
      za.classList.toggle('active', direction === 'desc');
    }
    renderPrograms();
  }

  // Export Globals to window for inline onclick handlers
  window.changePage = changePage;
  window.openCollegeDetails = openCollegeDetails;
  window.toggleWishlistItem = toggleWishlistItem;
  window.reorderWishlist = reorderWishlist;
  window.resetAllFilters = resetAllFilters;
  window.setSortAlpha = setSortAlpha;

  // Run on DOM Content Loaded
  document.addEventListener('DOMContentLoaded', init);
})();
