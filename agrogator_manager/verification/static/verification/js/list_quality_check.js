// Данные для модуля проверки качества культур
const culturesData = [
    {
        id: 1,
        name: "Пшеница озимая",
        image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop",
        cultureId: "WHEAT-2023-001",
        harvestYear: 2023,
        region: "Краснодарский край",
        status: "checking",
        submissionDate: "15.03.2023",
        farmer: {
            id: 1,
            name: "Петров Сергей Иванович",
            company: "ООО 'Золотые нивы'",
            avatar: "https://i.pravatar.cc/150?img=32",
            inn: "123456789012",
            culturesCount: 8,
            pointsCount: 12,
            registrationDate: "15.03.2022"
        }
    },
    {
        id: 2,
        name: "Ячмень пивоваренный",
        image: "https://images.unsplash.com/photo-1592913401250-68a8a4ba8aa8?w=400&h=300&fit=crop",
        cultureId: "BARLEY-2023-002",
        harvestYear: 2023,
        region: "Ставропольский край",
        status: "approved",
        submissionDate: "20.03.2023",
        farmer: {
            id: 2,
            name: "Иванов Алексей Петрович",
            company: "КФХ 'Восход'",
            avatar: "https://i.pravatar.cc/150?img=33",
            inn: "234567890123",
            culturesCount: 5,
            pointsCount: 8,
            registrationDate: "20.02.2022"
        }
    },
    {
        id: 3,
        name: "Кукуруза зерновая",
        image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=300&fit=crop",
        cultureId: "CORN-2023-003",
        harvestYear: 2023,
        region: "Ростовская область",
        status: "rejected",
        submissionDate: "25.03.2023",
        farmer: {
            id: 3,
            name: "Сидоров Алексей Владимирович",
            company: "EuroGrain Trading",
            avatar: "https://i.pravatar.cc/150?img=45",
            inn: "345678901234",
            culturesCount: 12,
            pointsCount: 18,
            registrationDate: "10.04.2022"
        }
    },
    {
        id: 4,
        name: "Подсолнечник масличный",
        image: "https://images.unsplash.com/photo-1594736797933-d0e31f4a5c56?w=400&h=300&fit=crop",
        cultureId: "SUN-2023-004",
        harvestYear: 2023,
        region: "Воронежская область",
        status: "checking",
        submissionDate: "28.03.2023",
        farmer: {
            id: 4,
            name: "Козлова Мария Игоревна",
            company: "AgroTrade International",
            avatar: "https://i.pravatar.cc/150?img=46",
            inn: "456789012345",
            culturesCount: 6,
            pointsCount: 9,
            registrationDate: "05.05.2022"
        }
    },
    {
        id: 5,
        name: "Рапс озимый",
        image: "https://images.unsplash.com/photo-1594736797933-d0e31f4a5c56?w=400&h=300&fit=crop",
        cultureId: "RAPE-2023-005",
        harvestYear: 2023,
        region: "Белгородская область",
        status: "approved",
        submissionDate: "01.04.2023",
        farmer: {
            id: 5,
            name: "Николаев Дмитрий Сергеевич",
            company: "ООО 'АгроПром'",
            avatar: "https://i.pravatar.cc/150?img=15",
            inn: "567890123456",
            culturesCount: 7,
            pointsCount: 11,
            registrationDate: "12.01.2022"
        }
    },
    {
        id: 6,
        name: "Соя пищевая",
        image: "https://images.unsplash.com/photo-1592913401250-68a8a4ba8aa8?w=400&h=300&fit=crop",
        cultureId: "SOYA-2023-006",
        harvestYear: 2023,
        region: "Амурская область",
        status: "checking",
        submissionDate: "05.04.2023",
        farmer: {
            id: 6,
            name: "Орлова Анна Викторовна",
            company: "Фермерское хозяйство 'Рассвет'",
            avatar: "https://i.pravatar.cc/150?img=28",
            inn: "678901234567",
            culturesCount: 4,
            pointsCount: 6,
            registrationDate: "18.06.2022"
        }
    }
];

// Данные фермеров для фильтрации
const farmersData = [
    {
        id: 1,
        name: "Петров Сергей Иванович",
        company: "ООО 'Золотые нивы'",
        avatar: "https://i.pravatar.cc/150?img=32",
        inn: "123456789012"
    },
    {
        id: 2,
        name: "Иванов Алексей Петрович",
        company: "КФХ 'Восход'",
        avatar: "https://i.pravatar.cc/150?img=33",
        inn: "234567890123"
    },
    {
        id: 3,
        name: "Сидоров Алексей Владимирович",
        company: "EuroGrain Trading",
        avatar: "https://i.pravatar.cc/150?img=45",
        inn: "345678901234"
    },
    {
        id: 4,
        name: "Козлова Мария Игоревна",
        company: "AgroTrade International",
        avatar: "https://i.pravatar.cc/150?img=46",
        inn: "456789012345"
    },
    {
        id: 5,
        name: "Николаев Дмитрий Сергеевич",
        company: "ООО 'АгроПром'",
        avatar: "https://i.pravatar.cc/150?img=15",
        inn: "567890123456"
    },
    {
        id: 6,
        name: "Орлова Анна Викторовна",
        company: "Фермерское хозяйство 'Рассвет'",
        avatar: "https://i.pravatar.cc/150?img=28",
        inn: "678901234567"
    }
];

// Конфигурация статусов
const statusConfig = {
    'checking': {
        text: 'На проверке',
        class: 'status-checking',
        icon: 'fas fa-hourglass-half'
    },
    'approved': {
        text: 'Принят',
        class: 'status-approved',
        icon: 'fas fa-check-circle'
    },
    'rejected': {
        text: 'Отклонен',
        class: 'status-rejected',
        icon: 'fas fa-times-circle'
    }
};

// Основной класс для управления страницей проверки качества
// Основной класс для управления страницей проверки качества культур
class QualityCheckPage {
    constructor() {
        this.culturesGrid = document.getElementById('culturesGrid');
        this.loadingState = document.getElementById('loadingState');
        this.emptyState = document.getElementById('emptyState');
        this.searchInput = document.querySelector('.search-input');
        this.searchClear = document.querySelector('.search-clear');
        this.filterTabs = document.querySelectorAll('.filter-tab');
        this.filterContents = document.querySelectorAll('.filter-content');
        this.resetButton = document.getElementById('resetAllFilters');

        this.currentFarmersFilter = [];
        this.currentStatusFilter = 'all';
        this.currentSearch = '';
        this.filteredCultures = [...culturesData];

        this.init();
    }

    init() {
        this.hideLoading();
        this.renderCultures();
        this.addEventListeners();
        this.updateStats();
        this.initFarmersModal();
        this.initFarmerDetailsModal();
    }

    // Метод для открытия детальной страницы в зависимости от статуса
    openDetails(cultureId) {
        const culture = culturesData.find(c => c.id === cultureId);
        if (!culture) return;

        let targetPage = '';

        // Определяем страницу для перехода в зависимости от статуса
        switch (culture.status) {
            case 'approved':
                targetPage = 'accepted_quality.html';
                break;
            case 'checking':
                targetPage = 'quality.html';
                break;
            case 'rejected':
                targetPage = 'cancel_quality.html';
                break;
            default:
                targetPage = 'quality.html'; // по умолчанию
        }

        // Добавляем ID культуры в URL
        const url = `${targetPage}?id=${cultureId}`;

        // Переходим на страницу
        window.location.href = url;
    }

    // Обновляем метод createCultureCard - добавляем правильный обработчик для кнопки "Подробнее о культуре"
    createCultureCard(culture) {
        const status = statusConfig[culture.status];

        return `
            <div class="culture-card" data-culture-id="${culture.id}">
                <div class="culture-card-content">
                    <div class="culture-card-header">
                        <div class="culture-main-info">
                            <div class="culture-text-info">
                                <h3 class="culture-name">${culture.name}</h3>
                                <div class="culture-id">ID: ${culture.cultureId}</div>
                            </div>
                            <div class="culture-status ${status.class}">
                                <i class="${status.icon}"></i>
                                ${status.text}
                            </div>
                        </div>
                    </div>

                    <div class="culture-details">
                        <div class="detail-item">
                            <div class="detail-label">Год урожая</div>
                            <div class="detail-value">${culture.harvestYear}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Область</div>
                            <div class="detail-value">${culture.region}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Дата подачи</div>
                            <div class="detail-value">${culture.submissionDate}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Компания</div>
                            <div class="detail-value">${culture.farmer.company}</div>
                        </div>
                    </div>

                    <!-- Действия на карточке -->
                    <div class="culture-actions">
                        <button class="btn-show-farmer" data-culture-id="${culture.id}">
                            <i class="fas fa-user"></i>
                            О фермере
                        </button>
                        <button class="btn-details" data-culture-id="${culture.id}">
                            <i class="fas fa-external-link-alt"></i>
                            Подробнее о культуре
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Обновляем метод addCardFlipHandlers для правильной обработки кликов
    addCardFlipHandlers() {
        // Обработчики для кнопки "Подробнее о культуре" - переход на детальную страницу
        document.querySelectorAll('.btn-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const cultureId = parseInt(btn.dataset.cultureId);
                this.openDetails(cultureId);
            });
        });

        // Обработчики для кнопки "О фермере" - показываем модалку
        document.querySelectorAll('.btn-show-farmer').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const cultureId = parseInt(btn.dataset.cultureId);
                this.showFarmerDetailsModal(cultureId);
            });
        });

        // Клик по всей карточке - тоже переход на детальную страницу
        document.querySelectorAll('.culture-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Проверяем, что клик не по кнопке внутри карточки
                if (!e.target.closest('.btn-show-farmer') && !e.target.closest('.btn-details')) {
                    const cultureId = parseInt(card.dataset.cultureId);
                    this.openDetails(cultureId);
                }
            });
        });
    }

    // Метод для показа модалки с информацией о фермере
    showFarmerDetailsModal(cultureId) {
        const culture = culturesData.find(c => c.id === cultureId);
        if (culture && culture.farmer) {
            this.showFarmerDetails(culture.farmer);
        }
    }

    // Метод для показа информации о фермере
    showFarmerDetails(farmer) {
        const modal = document.getElementById('farmerDetailsModal');
        const content = document.getElementById('farmerDetailsContent');

        content.innerHTML = this.createFarmerDetailsHTML(farmer);
        modal.style.display = 'block';
    }

    // Создаем HTML для информации о фермере
    createFarmerDetailsHTML(farmer) {
        return `
            <div class="farmer-profile-card">
                <!-- Компактный хедер -->
                <div class="farmer-header-compact">
                    <div class="farmer-avatar-section">
                        <div class="avatar-wrapper">
                            <img src="${farmer.avatar}" alt="${farmer.name}" class="farmer-avatar">
                            <div class="verification-badge">
                                <i class="fas fa-check"></i>
                            </div>
                        </div>
                    </div>
                    <div class="farmer-basic-info">
                        <h2 class="farmer-name">${farmer.name}</h2>
                        <p class="farmer-company">${farmer.company}</p>
                        <div class="inn-tag">
                            <i class="fas fa-fingerprint"></i>
                            ИНН: ${farmer.inn}
                        </div>
                    </div>
                </div>

                <!-- Единый блок статистики и информации -->
                <div class="farmer-content-grid">
                    <!-- Левая колонка - ключевые метрики -->
                    <div class="metrics-section">
                        <div class="metric-card primary">
                            <div class="metric-icon">
                                <i class="fas fa-seedling"></i>
                            </div>
                            <div class="metric-content">
                                <div class="metric-value">${farmer.culturesCount}</div>
                                <div class="metric-label">культур</div>
                            </div>
                        </div>

                        <div class="metric-card secondary">
                            <div class="metric-icon">
                                <i class="fas fa-map-marked-alt"></i>
                            </div>
                            <div class="metric-content">
                                <div class="metric-value">${farmer.pointsCount}</div>
                                <div class="metric-label">точек сбора</div>
                            </div>
                        </div>
                    </div>

                    <!-- Правая колонка - детали -->
                    <div class="details-section">
                        <div class="detail-item">
                            <div class="detail-header">
                                <i class="fas fa-user-tie"></i>
                                <span>Фермер</span>
                            </div>
                            <div class="detail-value">${farmer.name}</div>
                        </div>

                        <div class="detail-item">
                            <div class="detail-header">
                                <i class="fas fa-building"></i>
                                <span>Организация</span>
                            </div>
                            <div class="detail-value">${farmer.company}</div>
                        </div>

                        <div class="detail-item">
                            <div class="detail-header">
                                <i class="fas fa-calendar-check"></i>
                                <span>В системе с</span>
                            </div>
                            <div class="detail-value">${farmer.registrationDate}</div>
                        </div>
                    </div>
                </div>

                <!-- Футер с общей информацией -->
                <div class="farmer-footer">
                    <div class="status-indicator">
                        <div class="status-dot active"></div>
                        <span>Активный фермер</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Инициализация модалки с информацией о фермере
    initFarmerDetailsModal() {
        const modalHTML = `
            <div class="modal" id="farmerDetailsModal">
                <div class="modal-content farmer-details-modal">
                    <div class="modal-header">
                        <div class="modal-icon">
                            <i class="fas fa-user-tie"></i>
                        </div>
                        <div class="modal-title">
                            <h3>Информация о фермере</h3>
                            <p>Подробные сведения о фермере</p>
                        </div>
                        <button class="modal-close">&times;</button>
                    </div>

                    <div class="modal-body">
                        <div class="farmer-details-content" id="farmerDetailsContent">
                            <!-- Содержимое будет заполнено динамически -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.initFarmerDetailsModalHandlers();
    }

    initFarmerDetailsModalHandlers() {
        const modal = document.getElementById('farmerDetailsModal');
        const modalClose = modal.querySelector('.modal-close');

        const closeModal = () => {
            modal.style.display = 'none';
        };

        if (modalClose) modalClose.addEventListener('click', closeModal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'block') closeModal();
        });
    }

    // Остальные методы остаются без изменений
    addEventListeners() {
        // Переключение между фильтрами
        this.filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const filterType = tab.dataset.filterType;

                if (filterType === 'farmers' || filterType === 'statuses') {
                    this.switchFilterTab(filterType);
                } else if (tab.id === 'resetAllFilters') {
                    this.resetAllFilters();
                }
            });
        });

        // Фильтры по статусам
        document.querySelectorAll('#statusesFilter .filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setStatusFilter(btn.dataset.status);
            });
        });

        // Поиск
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.setSearch(e.target.value);
            });
        }

        // Очистка поиска
        if (this.searchClear) {
            this.searchClear.addEventListener('click', () => {
                this.searchInput.value = '';
                this.setSearch('');
            });
        }

        // Кнопка выбора фермеров
        const selectFarmersBtn = document.getElementById('selectFarmersBtn');
        if (selectFarmersBtn) {
            selectFarmersBtn.addEventListener('click', () => {
                this.showFarmersModal();
            });
        }
    }

    initFarmersModal() {
        // Создаем модальное окно для выбора фермеров
        const modalHTML = `
            <div class="modal" id="farmersModal">
                <div class="modal-content farmers-modal">
                    <div class="modal-header">
                        <div class="modal-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="modal-title">
                            <h3>Выбор фермеров</h3>
                            <p id="selectedFarmersModalText">Выбрано 0 фермеров</p>
                        </div>
                        <button class="modal-close">&times;</button>
                    </div>

                    <div class="modal-body">
                        <div class="search-container modal-search">
                            <i class="fas fa-search search-icon"></i>
                            <input type="text" class="search-input" id="farmersSearch" placeholder="Поиск по ФИО, компании или ИНН...">
                            <button class="search-clear">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>

                        <div class="farmers-grid" id="farmersGrid">
                            <!-- Фермеры будут сгенерированы динамически -->
                        </div>

                        <div class="empty-state modal-empty" id="farmersEmptyState" style="display: none;">
                            <div class="empty-icon">
                                <i class="fas fa-user-slash"></i>
                            </div>
                            <h3>Фермеры не найдены</h3>
                            <p>Попробуйте изменить поисковый запрос</p>
                        </div>

                        <div class="modal-actions">
                            <button class="btn btn-outline" id="cancelFarmersSelection">
                                <i class="fas fa-times"></i>
                                Отмена
                            </button>
                            <button class="btn btn-primary" id="applyFarmersSelection">
                                <i class="fas fa-check"></i>
                                Применить выбор
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Добавляем модальное окно в DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Инициализируем обработчики для модального окна
        this.initFarmersModalHandlers();
    }

    initFarmersModalHandlers() {
        const modal = document.getElementById('farmersModal');
        const cancelBtn = document.getElementById('cancelFarmersSelection');
        const applyBtn = document.getElementById('applyFarmersSelection');
        const modalClose = modal.querySelector('.modal-close');
        const farmersSearch = document.getElementById('farmersSearch');
        const searchClear = modal.querySelector('.search-clear');

        // Закрытие модалки
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        if (modalClose) {
            modalClose.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        // Применение выбора
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applyFarmersFilter();
                modal.style.display = 'none';
            });
        }

        // Поиск в модалке
        if (farmersSearch) {
            farmersSearch.addEventListener('input', (e) => {
                this.filterFarmersInModal(e.target.value);
            });
        }

        // Очистка поиска в модалке
        if (searchClear) {
            searchClear.addEventListener('click', () => {
                farmersSearch.value = '';
                this.filterFarmersInModal('');
            });
        }

        // Закрытие по клику вне модалки
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Закрытие по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'block') {
                modal.style.display = 'none';
            }
        });

        // Инициализируем обработчики для карточек фермеров при первом открытии
        this.initFarmersGridHandlers();
    }

    initFarmersGridHandlers() {
        const farmersGrid = document.getElementById('farmersGrid');
        if (farmersGrid) {
            farmersGrid.querySelectorAll('.farmer-select-card').forEach(card => {
                card.addEventListener('click', () => {
                    this.toggleFarmerSelection(card);
                });
            });
        }
    }

    showFarmersModal() {
        const modal = document.getElementById('farmersModal');
        const farmersGrid = document.getElementById('farmersGrid');
        const selectedText = document.getElementById('selectedFarmersModalText');

        // Обновляем текст выбранных фермеров
        selectedText.textContent = `Выбрано ${this.currentFarmersFilter.length} фермеров`;

        // Отрисовываем фермеров
        farmersGrid.innerHTML = this.createFarmersGridHTML();

        // Инициализируем обработчики для новых карточек
        this.initFarmersGridHandlers();

        // Показываем модальное окно
        modal.style.display = 'block';
    }

    createFarmersGridHTML() {
        return farmersData.map(farmer => `
            <div class="farmer-select-card ${this.currentFarmersFilter.includes(farmer.id) ? 'selected' : ''}"
                 data-farmer-id="${farmer.id}">
                <img src="${farmer.avatar}" alt="${farmer.name}" class="farmer-select-avatar">
                <div class="farmer-select-info">
                    <div class="farmer-select-name">${farmer.name}</div>
                    <div class="farmer-select-company">${farmer.company}</div>
                    <div class="farmer-select-inn">ИНН: ${farmer.inn}</div>
                </div>
                <div class="farmer-select-check">
                    ${this.currentFarmersFilter.includes(farmer.id) ? '✓' : ''}
                </div>
            </div>
        `).join('');
    }

    filterFarmersInModal(query) {
        const farmersGrid = document.getElementById('farmersGrid');
        const emptyState = document.getElementById('farmersEmptyState');
        const filteredFarmers = farmersData.filter(farmer => {
            const searchTerm = query.toLowerCase();
            return farmer.name.toLowerCase().includes(searchTerm) ||
                   farmer.company.toLowerCase().includes(searchTerm) ||
                   farmer.inn.includes(query);
        });

        if (filteredFarmers.length === 0) {
            farmersGrid.style.display = 'none';
            emptyState.style.display = 'flex';
        } else {
            farmersGrid.style.display = 'grid';
            emptyState.style.display = 'none';
            farmersGrid.innerHTML = filteredFarmers.map(farmer => `
                <div class="farmer-select-card ${this.currentFarmersFilter.includes(farmer.id) ? 'selected' : ''}"
                     data-farmer-id="${farmer.id}">
                    <img src="${farmer.avatar}" alt="${farmer.name}" class="farmer-select-avatar">
                    <div class="farmer-select-info">
                        <div class="farmer-select-name">${farmer.name}</div>
                        <div class="farmer-select-company">${farmer.company}</div>
                        <div class="farmer-select-inn">ИНН: ${farmer.inn}</div>
                    </div>
                    <div class="farmer-select-check">
                        ${this.currentFarmersFilter.includes(farmer.id) ? '✓' : ''}
                    </div>
                </div>
            `).join('');

            // Добавляем обработчики клика для отфильтрованных карточек
            this.initFarmersGridHandlers();
        }
    }

    toggleFarmerSelection(card) {
        const farmerId = parseInt(card.dataset.farmerId);
        const selectedText = document.getElementById('selectedFarmersModalText');

        if (this.currentFarmersFilter.includes(farmerId)) {
            this.currentFarmersFilter = this.currentFarmersFilter.filter(id => id !== farmerId);
            card.classList.remove('selected');
        } else {
            this.currentFarmersFilter.push(farmerId);
            card.classList.add('selected');
        }

        // Обновляем текст
        selectedText.textContent = `Выбрано ${this.currentFarmersFilter.length} фермеров`;
    }

    applyFarmersFilter() {
        const selectedCount = document.getElementById('selectedFarmersCount');
        selectedCount.textContent = `Выбрано ${this.currentFarmersFilter.length} фермеров`;
        this.applyFilters();
    }

    switchFilterTab(filterType) {
        // Убираем активный класс со всех вкладок
        this.filterTabs.forEach(tab => {
            tab.classList.remove('active');
        });

        // Добавляем активный класс текущей вкладке
        const activeTab = Array.from(this.filterTabs).find(tab => tab.dataset.filterType === filterType);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Скрываем все содержимое фильтров
        this.filterContents.forEach(content => {
            content.classList.add('hidden');
        });

        // Показываем соответствующее содержимое
        const targetFilter = document.getElementById(`${filterType}Filter`);
        if (targetFilter) {
            targetFilter.classList.remove('hidden');
        }
    }

    resetAllFilters() {
        // Сбрасываем фильтр фермеров
        this.currentFarmersFilter = [];
        document.getElementById('selectedFarmersCount').textContent = 'Выбрано 0 фермеров';

        // Сбрасываем фильтр статусов
        this.currentStatusFilter = 'all';
        document.querySelectorAll('#statusesFilter .filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.status === 'all');
        });

        // Сбрасываем поиск
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        this.currentSearch = '';

        // Показываем/скрываем кнопку очистки поиска
        if (this.searchClear) {
            this.searchClear.style.opacity = '0';
            this.searchClear.style.visibility = 'hidden';
        }

        this.applyFilters();
    }

    setSearch(query) {
        this.currentSearch = query.toLowerCase();

        // Показываем/скрываем кнопку очистки
        const searchClear = document.querySelector('.search-clear');
        if (searchClear) {
            if (query.length > 0) {
                searchClear.style.opacity = '1';
                searchClear.style.visibility = 'visible';
            } else {
                searchClear.style.opacity = '0';
                searchClear.style.visibility = 'hidden';
            }
        }

        this.applyFilters();
    }

    setStatusFilter(status) {
        this.currentStatusFilter = status;

        // Обновляем активные кнопки в фильтре статусов
        document.querySelectorAll('#statusesFilter .filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.status === status);
        });

        this.applyFilters();
    }

    applyFilters() {
        this.filteredCultures = culturesData.filter(culture => {
            // Фильтр по фермерам
            const farmersMatch = this.currentFarmersFilter.length === 0 ||
                               this.currentFarmersFilter.includes(culture.farmer.id);

            // Фильтр по статусу
            const statusMatch = this.currentStatusFilter === 'all' ||
                              culture.status === this.currentStatusFilter;

            // Фильтр по поиску (ID культуры, название)
            const searchMatch = !this.currentSearch ||
                              culture.cultureId.toLowerCase().includes(this.currentSearch) ||
                              culture.name.toLowerCase().includes(this.currentSearch);

            return farmersMatch && statusMatch && searchMatch;
        });

        this.renderCultures();
        this.updateStats();
        this.updateFilterCounts();
    }

    renderCultures() {
        if (!this.culturesGrid) return;

        if (this.filteredCultures.length === 0) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();

        const culturesHTML = this.filteredCultures.map(culture => this.createCultureCard(culture)).join('');
        this.culturesGrid.innerHTML = culturesHTML;

        // Добавляем обработчики для карточек
        this.addCardFlipHandlers();
    }

    updateStats() {
        const total = culturesData.length;
        const pending = culturesData.filter(c => c.status === 'checking').length;
        const approved = culturesData.filter(c => c.status === 'approved').length;
        const rejected = culturesData.filter(c => c.status === 'rejected').length;

        document.getElementById('totalCultures').textContent = total;
        document.getElementById('pendingCultures').textContent = pending;
        document.getElementById('approvedCultures').textContent = approved;
        document.getElementById('rejectedCultures').textContent = rejected;
    }

    updateFilterCounts() {
        const statusCounts = {
            'checking': culturesData.filter(c => c.status === 'checking').length,
            'approved': culturesData.filter(c => c.status === 'approved').length,
            'rejected': culturesData.filter(c => c.status === 'rejected').length,
            'all': culturesData.length
        };

        Object.keys(statusCounts).forEach(status => {
            const element = document.querySelector(`[data-status="${status}"] .filter-count`);
            if (element) {
                element.textContent = statusCounts[status];
            }
        });
    }

    hideLoading() {
        if (this.loadingState) {
            this.loadingState.style.display = 'none';
        }
    }

    showEmptyState() {
        if (this.emptyState) {
            this.emptyState.style.display = 'flex';
        }
        if (this.culturesGrid) {
            this.culturesGrid.style.display = 'none';
        }
    }

    hideEmptyState() {
        if (this.emptyState) {
            this.emptyState.style.display = 'none';
        }
        if (this.culturesGrid) {
            this.culturesGrid.style.display = 'grid';
        }
    }
}

// Создаем глобальный экземпляр для доступа из HTML
let qualityCheckPage;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    qualityCheckPage = new QualityCheckPage();
    initUserDropdown();

    const backButton = document.querySelector('.btn-back');
    if (backButton) {
        backButton.addEventListener('click', function() {
            window.location.href = 'index.html';
        });
    }
});

// Функции для управления пользователем
function initUserDropdown() {
    const userAvatar = document.getElementById('userAvatar');
    const userDropdown = document.getElementById('userDropdown');
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutConfirmModal = document.getElementById('logoutConfirmModal');
    const cancelLogout = document.getElementById('cancelLogout');
    const confirmLogout = document.getElementById('confirmLogout');

    if (!userAvatar || !userDropdown) return;

    // Загрузка данных пользователя
    const userName = localStorage.getItem('userName');
    const userRole = localStorage.getItem('userRole');

    if (userName) {
        const userNameElement = document.getElementById('headerUserName');
        const userRoleElement = document.getElementById('headerUserRole');

        if (userNameElement) userNameElement.textContent = userName;
        if (userRoleElement) userRoleElement.textContent = userRole;
    }

    // Обработчики событий для выпадающего меню
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

    // Обработчик кнопки выхода
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            userDropdown.classList.remove('show');
            if (logoutConfirmModal) {
                logoutConfirmModal.style.display = 'block';
            }
        });
    }

    // Обработчики для модалки подтверждения выхода
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

    // Закрытие модалки по клику вне ее области
    if (logoutConfirmModal) {
        logoutConfirmModal.addEventListener('click', function(e) {
            if (e.target === logoutConfirmModal) {
                logoutConfirmModal.style.display = 'none';
            }
        });
    }
}

function performLogout() {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');

    const logoutConfirmModal = document.getElementById('logoutConfirmModal');
    if (logoutConfirmModal) {
        logoutConfirmModal.style.display = 'none';
    }

    window.location.href = 'login.html';
}

function checkAuth() {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) {
        window.location.href = 'login.html';
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Проверка авторизации
    checkAuth();

    // Инициализация страницы проверки качества
    new QualityCheckPage();

    // Инициализация выпадающего меню пользователя
    initUserDropdown();

    // Добавляем обработчик для кнопки "Назад"
    const backButton = document.querySelector('.btn-back');
    if (backButton) {
        backButton.addEventListener('click', function() {
            window.location.href = 'index.html';
        });
    }
});