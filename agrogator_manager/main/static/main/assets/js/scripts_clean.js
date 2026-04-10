document.addEventListener('DOMContentLoaded', function() {
    // Participants Slider Class
    class ParticipantsSlider {
        constructor() {
            this.currentType = 'farmer';
            this.currentIndex = 0;
            this.slides = [];
            this.currentSlideElement = document.querySelector('.current-slide');
            this.totalSlidesElement = document.querySelector('.total-slides');
            this.prevBtn = document.querySelector('.prev-btn');
            this.nextBtn = document.querySelector('.next-btn');
            this.toggleButtons = document.querySelectorAll('.toggle-btn');

            this.init();
        }

        init() {
            this.setType('farmer');
            this.addEventListeners();
        }

        setType(type) {
            this.currentType = type;
            this.currentIndex = 0;

            const allCards = document.querySelectorAll('.participant-card');
            this.slides = Array.from(allCards).filter(card => card.dataset.type === type);

            allCards.forEach(card => {
                card.style.display = 'none';
                card.classList.remove('active');
            });

            if (this.slides.length > 0) {
                this.showSlide(0);
            }

            this.updateCounter();
            this.updateToggleButtons();
        }

        addEventListeners() {
            if (this.prevBtn && this.nextBtn) {
                this.prevBtn.addEventListener('click', () => this.prevSlide());
                this.nextBtn.addEventListener('click', () => this.nextSlide());
            }

            this.toggleButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const type = button.dataset.type;
                    if (type !== this.currentType) {
                        this.setType(type);
                    }
                });
            });
        }

        prevSlide() {
            if (this.slides.length === 0) return;
            this.currentIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
            this.showSlide(this.currentIndex);
        }

        nextSlide() {
            if (this.slides.length === 0) return;
            this.currentIndex = (this.currentIndex + 1) % this.slides.length;
            this.showSlide(this.currentIndex);
        }

        showSlide(index) {
            this.slides.forEach(slide => {
                slide.style.display = 'none';
                slide.classList.remove('active');
            });

            if (this.slides[index]) {
                this.slides[index].style.display = 'block';
                this.slides[index].classList.add('active');
                this.currentIndex = index;
            }

            this.updateCounter();
        }

        updateCounter() {
            if (this.currentSlideElement && this.totalSlidesElement) {
                this.currentSlideElement.textContent = this.slides.length > 0 ? this.currentIndex + 1 : 0;
                this.totalSlidesElement.textContent = this.slides.length;
            }
        }

        updateToggleButtons() {
            this.toggleButtons.forEach(button => {
                if (button.dataset.type === this.currentType) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            });
        }
    }

    // Actions Toggle Class
    class ActionsToggle {
        constructor() {
            this.currentMode = 'quick';
            this.init();
        }

        init() {
            this.addEventListeners();
        }

        addEventListeners() {
            document.querySelectorAll('.toggle-action').forEach(btn => {
                btn.addEventListener('click', () => {
                    const mode = btn.dataset.mode;
                    this.switchMode(mode);
                });
            });
        }

        switchMode(mode) {
            if (mode === this.currentMode) return;

            document.querySelectorAll('.toggle-action').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector(`[data-mode="${mode}"]`).classList.add('active');

            document.querySelectorAll('.actions-content').forEach(content => {
                content.classList.add('hidden');
            });

            if (mode === 'quick') {
                document.getElementById('quickActions').classList.remove('hidden');
            } else if (mode === 'admin') {
                document.getElementById('adminActions').classList.remove('hidden');
            }

            this.currentMode = mode;
        }
    }

    // Admin Actions Class
    class AdminActions {
        constructor() {
            this.init();
        }

        init() {
            this.addEventListeners();
        }

        addEventListeners() {
            document.querySelectorAll('.action-btn[data-action]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const action = btn.dataset.action;
                    this.handleAdminAction(action);
                });
            });
        }

        handleAdminAction(action) {
            switch (action) {
                case 'add-manager':
                    window.location.href = 'register_manager.html';
                    break;
                case 'logistics-tariff':
                    window.location.href = '/logistics/tariff-grid/';
                    break;
                default:
                    console.log('Действие:', action);
            }
        }
    }

    // Modal functionality
    class ModalManager {
        constructor() {
            this.modals = document.querySelectorAll('.modal');
            this.init();
        }

        init() {
            this.addEventListeners();
            this.addAccordionFunctionality();
        }

        addEventListeners() {
            document.querySelectorAll('.modal-close').forEach(closeBtn => {
                closeBtn.addEventListener('click', (e) => {
                    this.closeModal(e.target.closest('.modal'));
                });
            });

            this.modals.forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeModal(modal);
                    }
                });
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeAllModals();
                }
            });
        }

        addAccordionFunctionality() {
            document.querySelectorAll('.accordion-header').forEach(header => {
                header.addEventListener('click', () => {
                    const item = header.parentElement;
                    item.classList.toggle('active');
                });
            });

            document.querySelectorAll('.deal-accordion-header').forEach(header => {
                header.addEventListener('click', () => {
                    const item = header.parentElement;
                    item.classList.toggle('active');
                });
            });
        }

        openModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }
        }

        closeModal(modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }

        closeAllModals() {
            this.modals.forEach(modal => {
                this.closeModal(modal);
            });
        }
    }

    // User dropdown functionality
    function initUserDropdown() {
        const userAvatar = document.getElementById('userAvatar');
        const userDropdown = document.getElementById('userDropdown');
        const logoutBtn = document.getElementById('logoutBtn');
        const logoutConfirmModal = document.getElementById('logoutConfirmModal');
        const cancelLogout = document.getElementById('cancelLogout');
        const confirmLogout = document.getElementById('confirmLogout');

        if (!userAvatar || !userDropdown) return;

        // Данные пользователя получаются с сервера через Django context
        // Если нужно отобразить данные пользователя, они должны быть переданы в шаблоне
        
        // Пример: можно получить данные из data-атрибутов или глобальных переменных
        const userNameElement = document.getElementById('headerUserName');
        const userRoleElement = document.getElementById('headerUserRole');
        
        // Если элементы существуют, можно установить значения из шаблона Django
        if (userNameElement && userNameElement.dataset.userName) {
            userNameElement.textContent = userNameElement.dataset.userName;
        }
        if (userRoleElement && userRoleElement.dataset.userRole) {
            userRoleElement.textContent = userRoleElement.dataset.userRole;
        }

        userAvatar.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });

        document.addEventListener('click', function() {
            userDropdown.classList.remove('show');
        });

        userDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                userDropdown.classList.remove('show');
                if (logoutConfirmModal && logoutConfirmModal.style.display === 'block') {
                    logoutConfirmModal.style.display = 'none';
                }
            }
        });

        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                userDropdown.classList.remove('show');
                if (logoutConfirmModal) {
                    logoutConfirmModal.style.display = 'block';
                }
            });
        }

        if (cancelLogout) {
            cancelLogout.addEventListener('click', function() {
                if (logoutConfirmModal) {
                    logoutConfirmModal.style.display = 'none';
                }
            });
        }

        if (confirmLogout) {
            confirmLogout.addEventListener('click', function() {
                performLogout();
            });
        }

        if (logoutConfirmModal) {
            logoutConfirmModal.addEventListener('click', function(e) {
                if (e.target === logoutConfirmModal) {
                    logoutConfirmModal.style.display = 'none';
                }
            });
        }

        const logoutModalClose = logoutConfirmModal?.querySelector('.modal-close');
        if (logoutModalClose) {
            logoutModalClose.addEventListener('click', function() {
                logoutConfirmModal.style.display = 'none';
            });
        }
    }

    function performLogout() {
        // Серверная логика выхода - перенаправление на /logout/
        window.location.href = '/logout/';
    }

    // Проверка авторизации (отключена - серверная логика)
    // function checkAuth() {
    //     const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    //     if (!isAuthenticated && !window.location.pathname.includes('login.html')) {
    //         window.location.href = 'login.html';
    //     }
    // }

    function initQuickActions() {
        const actionButtons = document.querySelectorAll('.action-btn');

        actionButtons.forEach(button => {
            if (button.tagName === 'A' && button.getAttribute('href')) {
                return;
            }
            const actionText = button.querySelector('.action-text');
            if (!actionText) return;
            const text = actionText.textContent;

            if (text.includes('Индивидуальные запросы')) {
                button.addEventListener('click', function() {
                    console.log('Переход к индивидуальным запросам');
                });
            }

            if (text.includes('Форс-мажоры')) {
                button.addEventListener('click', function() {
                    console.log('Переход к форс-мажорам');
                });
            }

            if (text.includes('Мои лоты')) {
                button.addEventListener('click', function(e) {
                    // Делаем переход так же надёжно, как и на других плитках
                    // (на случай если плитка отрендерилась как <button>, или браузер открыл страницу как файл).
                    e.preventDefault();
                    window.location.href = '/order/my-lots/';
                });
            }
        });
    }

    // Deal filters
    function initDealFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        const dealCards = document.querySelectorAll('.deal-card');

        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                const status = this.dataset.status;

                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');

                dealCards.forEach(card => {
                    if (status === 'all' || card.dataset.status === status) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    }

    // Initialize all components
    const slider = new ParticipantsSlider();
    const actionsToggle = new ActionsToggle();
    const adminActions = new AdminActions();
    const modalManager = new ModalManager();

    // Инициализация других компонентов
    initUserDropdown();
    initQuickActions();
    initDealFilters();

    // Add click handlers to participant stats
    document.addEventListener('click', function(e) {
        const stat = e.target.closest('.card-stats .stat');
        if (stat) {
            const index = Array.from(stat.parentElement.children).indexOf(stat);
            const participantCard = stat.closest('.participant-card');

            if (participantCard) {
                const type = participantCard.dataset.type;
                const modals = ['pointsModal', 'cropsModal', 'dealsModal', 'requestsModal'];

                if (type === 'exporter' && index === 3) {
                    modalManager.openModal('individualRequestsModal');
                } else if (modals[index]) {
                    modalManager.openModal(modals[index]);
                }
            }
        }
    });

    // Add click handlers to transport alerts
    document.querySelectorAll('.btn-alert, .btn-details').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const card = this.closest('.deal-card');

            if (card) {
                const status = card.dataset.status;

                if (status === 'search') {
                    modalManager.openModal('transportModal');
                } else if (status === 'work') {
                    modalManager.openModal('workingTransportModal');
                }
            }
        });
    });

    // Add click handler to documents button
    document.querySelectorAll('.btn-secondary').forEach(btn => {
        if (btn.textContent.includes('Документооборот')) {
            btn.addEventListener('click', function() {
                modalManager.openModal('documentsModal');
            });
        }
    });
});
