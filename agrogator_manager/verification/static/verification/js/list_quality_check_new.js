// Класс для работы с верификацией культур
class QualityCheckPage {
    constructor() {
        this.culturesData = [];
        this.filteredCultures = [];
        this.selectedFarmers = [];
        this.selectedRegions = [];
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.farmersData = [];
        this.lastRequestedFarmerCultureId = null;
        
        // Справочники с бека
        this.statusesData = [];
        this.regionsData = [];
        
        this.init();
    }

    async init() {
        console.log('Инициализация страницы проверки качества культур');
        
        // Инициализация обработчиков событий
        this.initEventListeners();
        
        // Загрузка справочников и данных
        await this.loadReferenceData();
        await this.loadCulturesData();
        
        // Отображение данных
        this.renderCultures();
        this.updateStatistics();
    }

    initEventListeners() {
        // Кнопка "Назад к дашборду"
        const backToDashboardBtn = document.getElementById('backToDashboard');
        if (backToDashboardBtn) {
            backToDashboardBtn.addEventListener('click', () => {
                window.location.href = '/'; // Переход на главную страницу через прямой путь
            });
        }

        // Фильтры по статусам
        const statusButtons = document.querySelectorAll('[data-status]');
        statusButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterByStatus(btn.dataset.status);
                this.updateActiveFilterButton(btn);
            });
        });

        // Поиск
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
            
            // Добавляем обработчик на стирание текста
            searchInput.addEventListener('input', (e) => {
                if (e.target.value === '') {
                    // Если поле пустое, сбрасываем фильтр
                    this.searchQuery = '';
                    this.applyAllFilters();
                }
            });
        }

        // Сброс фильтров
        const resetBtn = document.getElementById('resetAllFilters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetAllFilters();
            });
        }

        // Кнопка повтора загрузки
        const retryBtn = document.getElementById('retryLoadBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.retryLoad();
            });
        }

        // Кнопка связи с администратором
        const contactBtn = document.getElementById('contactAdminBtn');
        if (contactBtn) {
            contactBtn.addEventListener('click', () => {
                this.contactAdmin();
            });
        }

        // Модалка информации о фермере
        const farmerModalClose = document.querySelector('#farmerInfoModal .modal-close');
        if (farmerModalClose) {
            farmerModalClose.addEventListener('click', () => {
                this.closeFarmerModal();
            });
        }

        // Кнопка повтора загрузки данных фермера
        const retryFarmerBtn = document.getElementById('retryLoadFarmer');
        if (retryFarmerBtn) {
            retryFarmerBtn.addEventListener('click', () => {
                // Повторная загрузка для последнего запрошенного фермера
                if (this.lastRequestedFarmerCultureId) {
                    this.showFarmerInfo(this.lastRequestedFarmerCultureId);
                }
            });
        }

        // Закрытие модалки по клику вне ее
        const farmerModal = document.getElementById('farmerInfoModal');
        if (farmerModal) {
            farmerModal.addEventListener('click', (e) => {
                if (e.target === farmerModal) {
                    this.closeFarmerModal();
                }
            });
        }

        // Переключение вкладок фильтров
        const filterTabs = document.querySelectorAll('.filter-tab:not(#resetAllFilters)');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchFilterTab(tab.dataset.filterType);
                this.updateActiveTab(tab);
            });
        });

        // Кнопка выбора фермеров
        const selectFarmersBtn = document.getElementById('selectFarmersBtn');
        if (selectFarmersBtn) {
            selectFarmersBtn.addEventListener('click', () => {
                this.showFarmersModal();
            });
        }

        // Модалка фермеров
        const farmersModalClose = document.querySelector('#farmersModal .modal-close');
        if (farmersModalClose) {
            farmersModalClose.addEventListener('click', () => {
                const modal = document.getElementById('farmersModal');
                if (modal) modal.style.display = 'none';
            });
        }

        const cancelFarmersBtn = document.getElementById('cancelFarmersSelection');
        if (cancelFarmersBtn) {
            cancelFarmersBtn.addEventListener('click', () => {
                const modal = document.getElementById('farmersModal');
                if (modal) modal.style.display = 'none';
            });
        }

        const applyFarmersBtn = document.getElementById('applyFarmersSelection');
        if (applyFarmersBtn) {
            applyFarmersBtn.addEventListener('click', () => {
                this.applyFarmersSelection();
            });
        }

        // Поиск фермеров в модалке
        const farmersSearchInput = document.getElementById('farmersSearch');
        const farmersSearchClear = document.querySelector('#farmersSearch + .search-clear');
        
        if (farmersSearchInput) {
            farmersSearchInput.addEventListener('input', (e) => {
                this.filterFarmersInModal(e.target.value);
            });
        }
        
        if (farmersSearchClear) {
            farmersSearchClear.addEventListener('click', () => {
                farmersSearchInput.value = '';
                this.filterFarmersInModal('');
            });
        }

        // Закрытие модалки фермеров по клику вне ее
        const farmersModal = document.getElementById('farmersModal');
        if (farmersModal) {
            farmersModal.addEventListener('click', (e) => {
                if (e.target === farmersModal) {
                    farmersModal.style.display = 'none';
                }
            });
        }
        const selectRegionsBtn = document.getElementById('selectRegionsBtn');
        if (selectRegionsBtn) {
            selectRegionsBtn.addEventListener('click', () => {
                this.openRegionsModal();
            });
        }

        // Модальное окно регионов
        this.initRegionsModal();
    }

    // Загрузка справочных данных
    async loadReferenceData() {
        try {
            const response = await this.makeAuthenticatedRequest('/farmer/crops/all-relations');
            if (response && response.cropsStatus && response.cropsOriginRegion) {
                this.statusesData = response.cropsStatus;
                this.regionsData = response.cropsOriginRegion;
                console.log('Загружено статусов:', this.statusesData.length);
                console.log('Загружено регионов:', this.regionsData.length);
                
                // Инициализация фильтров после загрузки данных
                this.initializeStatusFilters();
            } else {
                throw new Error('Не удалось загрузить справочные данные');
            }
        } catch (error) {
            console.error('Ошибка загрузки справочных данных:', error);
        }
    }

    // Инициализация фильтров статусов
    initializeStatusFilters() {
        const statusesContainer = document.querySelector('#statusesFilter .filter-buttons');
        if (!statusesContainer || this.statusesData.length === 0) return;
        
        // Очищаем существующие кнопки (кроме "Все статусы")
        const existingButtons = statusesContainer.querySelectorAll('.filter-btn:not([data-status="all"])');
        existingButtons.forEach(btn => btn.remove());
        
        // Добавляем кнопки для каждого статуса
        this.statusesData.forEach(status => {
            const button = document.createElement('button');
            button.className = 'filter-btn';
            
            // Правильный маппинг статусов
            const statusMapping = {
                'На проверке': 'на-проверке',
                'Активная': 'approved',
                'Требуются правки': 'требуются-правки'
            };
            
            button.dataset.status = statusMapping[status.name] || status.name.toLowerCase().replace(' ', '-');
            button.innerHTML = `
                <i class="fas fa-circle"></i>
                ${status.name}
                <span class="filter-count">0</span>
            `;
            
            button.addEventListener('click', () => {
                this.filterByStatus(button.dataset.status);
                this.updateActiveFilterButton(button);
            });
            
            // Вставляем перед кнопкой "Все статусы"
            const allButton = statusesContainer.querySelector('[data-status="all"]');
            statusesContainer.insertBefore(button, allButton);
        });
    }

    // Загрузка данных с бэкенда
    async loadCulturesData() {
        try {
            this.showLoadingState();
            
            const response = await this.makeAuthenticatedRequest('/moderators-module/crops/all-on-verification');
            
            // Данные приходят напрямую как массив, а не в response.data
            if (response && Array.isArray(response)) {
                this.culturesData = response;
                this.filteredCultures = [...this.culturesData];
                console.log('Загружено культур:', this.culturesData.length);
                
                // Инициализируем данные фермеров после загрузки культур
                this.initFarmersData();
            } else {
                throw new Error('Не удалось загрузить данные культур - некорректный формат ответа');
            }
        } catch (error) {
            console.error('Ошибка загрузки данных культур:', error);
            this.showErrorState();
            // Больше не используем моковые данные при ошибке
            this.culturesData = [];
            this.filteredCultures = [];
        } finally {
            this.hideLoadingState();
        }
    }

    // Функция для выполнения аутентифицированных запросов
    async makeAuthenticatedRequest(url, options = {}) {
        try {
            const headers = await this.getAuthHeaders();
            if (!headers) {
                console.log('Нет токена авторизации, используем моковые данные');
                return null;
            }
            
            console.log(`Отправка запроса к: ${API_CONFIG.BASE_URL}${url.replace('/api/', '')}`);
            
            const response = await fetch(`${API_CONFIG.BASE_URL}${url.replace('/api/', '')}`, {
                ...options,
                headers: {
                    ...headers,
                    ...options.headers
                },
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT)
            });
            
            console.log(`Ответ получен, статус: ${response.status}`);
            
            if (response.status === 401 || response.status === 403) {
                console.log('Токен истек или недействителен');
                if (typeof logout === 'function') {
                    logout();
                }
                return null;
            }
            
            if (!response.ok) {
                console.error(`HTTP ошибка! статус: ${response.status}`);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Данные успешно получены:', data);
            return data;
        } catch (error) {
            console.error(`Ошибка запроса к ${url}:`, error);
            return null;
        }
    }

    // Получение заголовков авторизации
    async getAuthHeaders() {
        try {
            if (typeof getAuthTokens === 'function') {
                const authResult = await getAuthTokens();
                
                if (authResult.status === 403 || authResult.status === 409) {
                    if (typeof logout === 'function') {
                        logout();
                    }
                    window.location.href = '/';
                    return null;
                }
                
                return {
                    'Authorization': `Bearer ${authResult.data.accessToken}`,
                    'Content-Type': 'application/json'
                };
            } else {
                console.warn('Функция getAuthTokens не найдена. Проверьте, что total_post.js подключен перед этим скриптом.');
                return null;
            }
        } catch (error) {
            console.error('Ошибка при получении заголовков авторизации:', error);
            return null;
        }
    }

    // Моковые данные для тестирования
    loadMockData() {
        this.culturesData = [
            {
                id: "62e2f24c-7efb-4472-be41-3535b7bcf018",
                uniqueCode: "879672",
                usersId: "2dfa61f7-c92c-4b84-8687-6d2c183cb808",
                isArchived: false,
                reviewMessage: "",
                cropsStatus: {
                    id: 3,
                    name: "Активная"
                },
                cropsType: {
                    id: 1,
                    name: "Пшеница 1 класса"
                },
                yearOfHarvest: 2024,
                cropsOriginRegion: {
                    id: 2,
                    name: "Амурская область"
                },
                cropsShelfLife: 2,
                qualityDocument: [],
                created_at: "2026-02-05T11:10:06.505Z"
            },
            {
                id: "4eaadd22-59b2-4ba1-a8b1-a848ec387fe1",
                uniqueCode: "131251",
                usersId: "2dfa61f7-c92c-4b84-8687-6d2c183cb808",
                isArchived: false,
                reviewMessage: "",
                cropsStatus: {
                    id: 3,
                    name: "Активная"
                },
                cropsType: {
                    id: 2,
                    name: "Пшеница 2 класса"
                },
                yearOfHarvest: 2024,
                cropsOriginRegion: {
                    id: 2,
                    name: "Амурская область"
                },
                cropsShelfLife: 2,
                qualityDocument: [
                    "https://fs.oblakoteka.ru/agrogatordev/uploads/files/5f44836f83163a5e3d9e996924c1ca7e.pdf"
                ],
                created_at: "2026-02-05T08:25:14.056Z"
            }
        ];
        this.filteredCultures = [...this.culturesData];
    }

    // Отображение карточек культур
    renderCultures() {
        const grid = document.getElementById('culturesGrid');
        if (!grid) {
            console.error('Элемент grid не найден!');
            return;
        }

        if (this.filteredCultures.length === 0) {
            this.showEmptyState();
            return;
        }

        // Показываем grid и скрываем другие состояния
        grid.style.display = 'grid';
        const emptyState = document.getElementById('emptyState');
        const loadingState = document.getElementById('loadingState');
        const errorState = document.getElementById('errorState');
        if (emptyState) emptyState.style.display = 'none';
        if (loadingState) loadingState.style.display = 'none';
        if (errorState) errorState.style.display = 'none';
        
        grid.innerHTML = this.filteredCultures.map(culture => this.createCultureCard(culture)).join('');
        
        // Добавляем обработчики событий для карточек
        this.addCardFlipHandlers();
    }

    // Добавление обработчиков для карточек
    addCardFlipHandlers() {
        // Обработчики для кнопки "Подробнее о культуре"
        document.querySelectorAll('.btn-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const cultureId = btn.dataset.cultureId;
                this.openDetails(cultureId);
            });
        });

        // Обработчики для кнопки "О фермере"
        document.querySelectorAll('.btn-show-farmer').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const cultureId = btn.dataset.cultureId;
                this.showFarmerInfo(cultureId);
            });
        });
    }

    // Создание карточки культуры с сохранением оригинальной структуры
    createCultureCard(culture) {
        // Маппинг реальных статусов с бека на фронтенд
        const statusMap = {
            'Активная': 'approved',      // зеленый
            'На проверке': 'checking',   // оранжевый  
            'Требуются правки': 'rejected' // красный
        };
        
        const frontendStatus = statusMap[culture.cropsStatus?.name] || 'checking';
        const status = this.getStatusConfig(frontendStatus);

        // Формируем данные для карточки на основе бэкенда, сохраняя оригинальную структуру
        const cardData = {
            id: culture.id,
            name: culture.cropsType?.name || 'Нет данных',
            cultureId: culture.uniqueCode || 'Нет данных',
            harvestYear: culture.yearOfHarvest || 'Нет данных',
            region: culture.cropsOriginRegion?.name || 'Нет данных',
            submissionDate: culture.created_at ? new Date(culture.created_at).toLocaleDateString('ru-RU') : 'Нет данных',
            farmer: {
                company: 'Загрузка...' // Будет загружено отдельно
            }
        };

        return `
            <div class="culture-card" data-culture-id="${cardData.id}">
                <div class="culture-card-content">
                    <div class="culture-card-header">
                        <div class="culture-main-info">
                            <div class="culture-text-info">
                                <h3 class="culture-name">${cardData.name}</h3>
                                <div class="culture-id">ID: ${cardData.cultureId}</div>
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
                            <div class="detail-value">${cardData.harvestYear}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Область</div>
                            <div class="detail-value">${cardData.region}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Дата подачи</div>
                            <div class="detail-value">${cardData.submissionDate}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Компания</div>
                            <div class="detail-value">${cardData.farmer.company}</div>
                        </div>
                    </div>

                    <!-- Действия на карточке -->
                    <div class="culture-actions">
                        <button class="btn-show-farmer" data-culture-id="${cardData.id}">
                            <i class="fas fa-user"></i>
                            О фермере
                        </button>
                        <button class="btn-details" data-culture-id="${cardData.id}">
                            <i class="fas fa-external-link-alt"></i>
                            Подробнее о культуре
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Получение конфигурации статуса
    getStatusConfig(status) {
        const statusConfig = {
            'checking': {
                text: 'На проверке',
                class: 'status-checking',
                icon: 'fas fa-hourglass-half'
            },
            'approved': {
                text: 'Активная',
                class: 'status-approved',
                icon: 'fas fa-check-circle'
            },
            'rejected': {
                text: 'Требуются правки',
                class: 'status-rejected',
                icon: 'fas fa-exclamation-circle'
            }
        };
        return statusConfig[status] || statusConfig['checking'];
    }

    // Фильтрация по статусу
    filterByStatus(status) {
        this.currentFilter = status;
        
        // Применяем все фильтры через единую функцию
        this.applyAllFilters();
    }

    // Применение всех фильтров
    applyAllFilters() {
        // Начинаем со всех данных, а не с отфильтрованных
        let filteredData = [...this.culturesData];
        
        // Применяем фильтр по фермерам
        if (this.selectedFarmers.length > 0) {
            const selectedFarmerIds = this.selectedFarmers.map(farmer => farmer.id);
            filteredData = filteredData.filter(culture => 
                culture.usersId && selectedFarmerIds.includes(culture.usersId)
            );
        }
        
        // Применяем фильтр по статусам
        if (this.currentFilter !== 'all') {
            const backendStatusMap = {
                'на-проверке': ['На проверке'],
                'approved': ['Активная'],
                'требуются-правки': ['Требуются правки']
            };
            
            const backendStatuses = backendStatusMap[this.currentFilter] || [];
            filteredData = filteredData.filter(culture => 
                backendStatuses.includes(culture.cropsStatus?.name)
            );
        }
        
        // Применяем фильтр по регионам
        if (this.selectedRegions.length > 0) {
            const selectedRegionIds = this.selectedRegions.map(region => region.id);
            filteredData = filteredData.filter(culture => 
                culture.cropsOriginRegion?.id && selectedRegionIds.includes(culture.cropsOriginRegion.id)
            );
        }
        
        // Применяем поисковый фильтр
        if (this.searchQuery) {
            const searchLower = this.searchQuery.toLowerCase().trim();
            filteredData = filteredData.filter(culture => {
                // Поиск по ID культуры
                if (culture.uniqueCode && culture.uniqueCode.toLowerCase().includes(searchLower)) {
                    return true;
                }
                
                // Поиск по названию культуры
                if (culture.cropsType?.name && culture.cropsType.name.toLowerCase().includes(searchLower)) {
                    return true;
                }
                
                // Поиск по статусу
                if (culture.cropsStatus?.name && culture.cropsStatus.name.toLowerCase().includes(searchLower)) {
                    return true;
                }
                
                // Поиск по региону
                if (culture.cropsOriginRegion?.name && culture.cropsOriginRegion.name.toLowerCase().includes(searchLower)) {
                    return true;
                }
                
                return false;
            });
        }
        
        // Обновляем отфильтрованные данные
        this.filteredCultures = filteredData;
        
        // Обновляем отображение
        this.renderCultures();
        this.updateStatistics();
    }

    // Поиск с оптимизацией и дебаггингом
    handleSearch(query) {
        // Очищаем поисковый запрос
        const cleanQuery = query.trim();
        this.searchQuery = cleanQuery.toLowerCase();
        
        // Если запрос пустой, не применяем фильтр
        if (!this.searchQuery) {
            this.applyAllFilters();
            return;
        }
        
        // Логирование для дебаггинга
        console.log(`Поиск по запросу: "${this.searchQuery}"`);
        
        // Применяем фильтрацию с оптимизацией
        this.applyAllFilters();
    }

    // Применение поискового фильтра
    applySearchFilter() {
        if (this.searchQuery) {
            const searchLower = this.searchQuery.toLowerCase().trim();
            this.filteredCultures = this.filteredCultures.filter(culture => {
                // Поиск по ID культуры
                if (culture.uniqueCode && culture.uniqueCode.toLowerCase().includes(searchLower)) {
                    return true;
                }
                
                // Поиск по названию культуры
                if (culture.cropsType?.name && culture.cropsType.name.toLowerCase().includes(searchLower)) {
                    return true;
                }
                
                // Поиск по статусу
                if (culture.cropsStatus?.name && culture.cropsStatus.name.toLowerCase().includes(searchLower)) {
                    return true;
                }
                
                // Поиск по региону
                if (culture.cropsOriginRegion?.name && culture.cropsOriginRegion.name.toLowerCase().includes(searchLower)) {
                    return true;
                }
                
                return false;
            });
        }
        
        // Обновляем отображение
        this.renderCultures();
        this.updateStatistics();
    }

    // Обновление счетчика выбранных фермеров
    updateSelectedFarmersCount() {
        const countElement = document.getElementById('selectedFarmersCount');
        if (countElement) {
            countElement.textContent = `Выбрано ${this.selectedFarmers.length} фермеров`;
        }
    }

    // Сброс всех фильтров
    resetAllFilters() {
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.selectedRegions = [];
        this.selectedFarmers = [];
        this.filteredCultures = [...this.culturesData];
        
        // Сброс активных кнопок статусов
        document.querySelectorAll('[data-status]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector('[data-status="all"]')?.classList.add('active');
        
        // Сброс активной вкладки
        document.querySelectorAll('.filter-tab:not(#resetAllFilters)').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector('[data-filter-type="farmers"]')?.classList.add('active');
        
        // Показываем фильтр фермеров (первый вкладка)
        this.switchFilterTab('farmers');
        
        // Очистка поиска
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        
        // Обновляем отображение после сброса
        this.renderCultures();
        this.updateStatistics();
        this.updateSelectedRegionsCount();
        this.updateSelectedFarmersCount();
    }

    // Обновление статистики
    updateStatistics() {
        const totalElement = document.getElementById('totalCultures');
        const checkingElement = document.getElementById('pendingCultures');
        const approvedElement = document.getElementById('approvedCultures');
        const rejectedElement = document.getElementById('rejectedCultures');
        
        if (totalElement) totalElement.textContent = this.culturesData.length;
        if (checkingElement) checkingElement.textContent = this.culturesData.filter(c => c.cropsStatus?.name === 'На проверке').length;
        if (approvedElement) approvedElement.textContent = this.culturesData.filter(c => c.cropsStatus?.name === 'Активная').length;
        if (rejectedElement) rejectedElement.textContent = this.culturesData.filter(c => c.cropsStatus?.name === 'Требуются правки').length;
        
        // Обновление счетчиков в фильтрах
        this.updateFilterCounts();
    }

    // Обновление счетчиков в фильтрах
    updateFilterCounts() {
        const filterButtons = document.querySelectorAll('[data-status]');
        filterButtons.forEach(btn => {
            const status = btn.dataset.status;
            const countElement = btn.querySelector('.filter-count');
            
            if (countElement) {
                let count = 0;
                if (status === 'all') {
                    count = this.culturesData.length;
                } else {
                    const backendStatusMap = {
                        'на-проверке': ['На проверке'],
                        'approved': ['Активная'],
                        'требуются-правки': ['Требуются правки']
                    };
                    const backendStatuses = backendStatusMap[status] || [];
                    count = this.culturesData.filter(c => backendStatuses.includes(c.cropsStatus?.name)).length;
                }
                countElement.textContent = count;
            }
        });
    }

    // Открытие деталей культуры
    openDetails(cultureId) {
        console.log('Открытие деталей культуры:', cultureId);
        // Переход на детальную страницу культуры
        window.location.href = `/verification/detail/quality/${cultureId}/`;
    }

    // Показ информации о фермере
    async showFarmerInfo(cultureId) {
        // Сохраняем ID для возможности повтора загрузки
        this.lastRequestedFarmerCultureId = cultureId;
        
        // Находим культуру по ID
        const culture = this.culturesData.find(c => c.id === cultureId);
        
        if (!culture) {
            console.error('Культура не найдена');
            return;
        }
        
        if (!culture.usersId) {
            console.error('У культуры отсутствует usersId');
            return;
        }
        
        const farmerId = culture.usersId;
        
        // Показываем модалку с состоянием загрузки
        this.openFarmerModal();
        this.showFarmerLoading();
        
        try {
            // Загружаем данные фермера с бека через общий метод
            const data = await this.makeAuthenticatedRequest(`/moderators-module/all-by-farmer?id=${farmerId}`);
            
            if (!data) {
                throw new Error('Не удалось загрузить данные фермера');
            }
            
            // Показываем данные фермера
            this.showFarmerData(data);
            
        } catch (error) {
            console.error('Ошибка загрузки данных фермера:', error);
            this.showFarmerError();
        }
    }

    // Закрытие модалки фермера
    closeFarmerModal() {
        const modal = document.getElementById('farmerInfoModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Открытие модалки фермера
    openFarmerModal() {
        const modal = document.getElementById('farmerInfoModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    // Показ состояния загрузки
    showFarmerLoading() {
        const loadingState = document.getElementById('farmerLoadingState');
        const contentState = document.getElementById('farmerInfoContent');
        const errorState = document.getElementById('farmerErrorState');
        
        if (loadingState) loadingState.style.display = 'flex';
        if (contentState) contentState.style.display = 'none';
        if (errorState) errorState.style.display = 'none';
    }

    // Показ данных фермера
    showFarmerData(data) {
        const loadingState = document.getElementById('farmerLoadingState');
        const contentState = document.getElementById('farmerInfoContent');
        const errorState = document.getElementById('farmerErrorState');
        
        // Скрываем загрузку и ошибку
        if (loadingState) loadingState.style.display = 'none';
        if (errorState) errorState.style.display = 'none';
        
        // Заполняем данными
        if (data.profile && data.profile.entrepreneurProfile) {
            const profile = data.profile.entrepreneurProfile;
            
            // ФИО фермера
            const fullName = `${profile.lastName || ''} ${profile.firstName || ''} ${profile.patronymic || ''}`.trim();
            document.getElementById('farmerName').textContent = fullName || 'Имя не указано';
            
            // ИНН
            document.getElementById('farmerInn').textContent = profile.inn || 'Не указан';
            
            // Организация
            document.getElementById('farmerOrganization').textContent = profile.organizationName || 'Не указана';
            
            // Телефон
            document.getElementById('farmerPhone').textContent = data.profile.phone || 'Не указан';
            
            // Email
            document.getElementById('farmerEmail').textContent = data.profile.email || 'Не указан';
            
            // Адрес
            document.getElementById('farmerAddress').textContent = profile.legalAddress || 'Не указан';
            
            // Дата регистрации (находим самую последнюю)
            if (data.profile.verificationHistory && data.profile.verificationHistory.length > 0) {
                const latestDate = data.profile.verificationHistory
                    .map(h => new Date(h.created_at))
                    .reduce((latest, current) => current > latest ? current : latest);
                
                const regDate = latestDate.toLocaleDateString('ru-RU');
                document.getElementById('farmerRegistrationDate').textContent = regDate;
                document.getElementById('lastVerificationDate').textContent = regDate;
            } else {
                document.getElementById('farmerRegistrationDate').textContent = 'Не указана';
                document.getElementById('lastVerificationDate').textContent = 'Не указана';
            }
        }
        
        // Статистика
        if (data.farmerProfile) {
            document.getElementById('cropsCount').textContent = data.farmerProfile.cropsCount || 0;
            document.getElementById('loadingPointsCount').textContent = data.farmerProfile.loadingPointsCount || 0;
        }
        
        // Показываем контент с анимацией
        if (contentState) {
            contentState.style.display = 'block';
            contentState.style.opacity = '0';
            contentState.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                contentState.style.transition = 'all 0.3s ease';
                contentState.style.opacity = '1';
                contentState.style.transform = 'translateY(0)';
            }, 100);
        }
    }

    // Показ состояния ошибки
    showFarmerError() {
        const loadingState = document.getElementById('farmerLoadingState');
        const contentState = document.getElementById('farmerInfoContent');
        const errorState = document.getElementById('farmerErrorState');
        
        if (loadingState) loadingState.style.display = 'none';
        if (contentState) contentState.style.display = 'none';
        if (errorState) errorState.style.display = 'flex';
    }

    // Показ состояния загрузки
    showLoadingState() {
        const loadingState = document.getElementById('loadingState');
        const grid = document.getElementById('culturesGrid');
        const emptyState = document.getElementById('emptyState');
        const errorState = document.getElementById('errorState');
        
        if (loadingState) loadingState.style.display = 'flex';
        if (grid) grid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';
        if (errorState) errorState.style.display = 'none';
    }

    // Скрытие состояния загрузки
    hideLoadingState() {
        const loadingState = document.getElementById('loadingState');
        const grid = document.getElementById('culturesGrid');
        
        if (loadingState) loadingState.style.display = 'none';
        if (grid && this.filteredCultures.length > 0) grid.style.display = 'grid';
    }

    // Показ пустого состояния
    showEmptyState() {
        const emptyState = document.getElementById('emptyState');
        const grid = document.getElementById('culturesGrid');
        const errorState = document.getElementById('errorState');
        
        if (emptyState) emptyState.style.display = 'flex';
        if (grid) grid.style.display = 'none';
        if (errorState) errorState.style.display = 'none';
    }

    // Показ состояния ошибки
    showErrorState() {
        console.error('Ошибка загрузки данных, показываем сообщение об ошибке');
        const errorState = document.getElementById('errorState');
        const grid = document.getElementById('culturesGrid');
        const loadingState = document.getElementById('loadingState');
        const emptyState = document.getElementById('emptyState');
        
        if (errorState) errorState.style.display = 'flex';
        if (grid) grid.style.display = 'none';
        if (loadingState) loadingState.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';
    }

    // Повторная загрузка данных
    async retryLoad() {
        await this.loadCulturesData();
        this.renderCultures();
        this.updateStatistics();
    }

    // Связь с администратором
    contactAdmin() {
        // Здесь можно добавить логику: открытие модального окна, переход на страницу поддержки и т.д.
        alert('Для связи с администратором, пожалуйста, напишите на email: admin@agrogator.ru или позвоните по телефону: +7 (XXX) XXX-XX-XX');
    }

    // Обновление активной кнопки фильтра
    updateActiveFilterButton(activeBtn) {
        document.querySelectorAll('[data-status]').forEach(btn => {
            btn.classList.remove('active');
        });
        activeBtn.classList.add('active');
    }

    // Переключение вкладок фильтров
    switchFilterTab(filterType) {
        // Скрываем все контентные блоки
        document.querySelectorAll('.filter-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        // Показываем нужный блок
        const targetContent = document.getElementById(`${filterType}Filter`);
        if (targetContent) {
            targetContent.classList.remove('hidden');
        }
    }

    // Обновление активной вкладки
    updateActiveTab(activeTab) {
        document.querySelectorAll('.filter-tab:not(#resetAllFilters)').forEach(tab => {
            tab.classList.remove('active');
        });
        activeTab.classList.add('active');
    }

    // Инициализация модального окна регионов
    initRegionsModal() {
        const modal = document.getElementById('regionsModal');
        const closeBtn = modal?.querySelector('.modal-close');
        const cancelBtn = document.getElementById('cancelRegionsSelection');
        const applyBtn = document.getElementById('applyRegionsSelection');
        const searchInput = document.getElementById('regionsSearch');

        // Закрытие модального окна
        const closeModal = () => {
            if (modal) modal.style.display = 'none';
        };

        closeBtn?.addEventListener('click', closeModal);
        cancelBtn?.addEventListener('click', closeModal);

        // Применить выбор регионов
        applyBtn?.addEventListener('click', () => {
            this.applyRegionsSelection();
        });

        // Поиск регионов
        searchInput?.addEventListener('input', (e) => {
            this.searchRegions(e.target.value);
        });

        // Закрытие по клику вне окна
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // Открытие модального окна регионов
    openRegionsModal() {
        const modal = document.getElementById('regionsModal');
        if (modal) {
            this.renderRegions();
            this.updateSelectedRegionsCount();
            modal.style.display = 'flex';
        }
    }

    // Отображение регионов
    renderRegions(searchQuery = '') {
        const regionsList = document.getElementById('regionsList');
        const emptyState = document.getElementById('regionsEmptyState');
        
        if (!regionsList) return;

        let filteredRegions = this.regionsData;
        
        if (searchQuery) {
            filteredRegions = this.regionsData.filter(region => 
                region.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (filteredRegions.length === 0) {
            regionsList.style.display = 'none';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }

        regionsList.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';

        regionsList.innerHTML = filteredRegions.map(region => this.createRegionItem(region)).join('');
        
        // Добавляем обработчики для элементов регионов
        this.addRegionItemHandlers();
    }

    // Создание элемента региона (улучшенный минималистичный дизайн)
    createRegionItem(region) {
        const isSelected = this.selectedRegions.some(selected => selected.id === region.id);
        
        return `
            <div class="region-card ${isSelected ? 'selected' : ''}" data-region-id="${region.id}" data-region-name="${region.name}">
                <div class="region-content">
                    <div class="region-header">
                        <div class="region-icon">
                            <i class="fas fa-map-pin"></i>
                        </div>
                        <div class="region-badge">
                            <i class="fas fa-check"></i>
                        </div>
                    </div>
                    <div class="region-body">
                        <div class="region-name">${region.name}</div>
                        <div class="region-subtitle">Регион Российской Федерации</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Добавление обработчиков для элементов регионов
    addRegionItemHandlers() {
        document.querySelectorAll('.region-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const regionId = parseInt(card.dataset.regionId);
                const regionName = card.dataset.regionName;
                
                this.toggleRegionSelection(regionId, regionName);
            });
        });
    }

    // Переключение выбора региона (обновленная версия для новых плашек)
    toggleRegionSelection(regionId, regionName) {
        const index = this.selectedRegions.findIndex(region => region.id === regionId);
        const card = document.querySelector(`[data-region-id="${regionId}"]`);
        
        if (index > -1) {
            // Удаляем из выбранных
            this.selectedRegions.splice(index, 1);
            if (card) card.classList.remove('selected');
        } else {
            // Добавляем в выбранные
            this.selectedRegions.push({ id: regionId, name: regionName });
            if (card) card.classList.add('selected');
        }
        
        // Применяем фильтрацию после изменения выбора
        this.applyAllFilters();
        this.updateSelectedRegionsCount();
    }

    // Поиск регионов
    searchRegions(query) {
        this.renderRegions(query);
    }

    // Обновление счетчика выбранных регионов
    updateSelectedRegionsCount() {
        const countElement = document.getElementById('selectedRegionsCount');
        const modalCountElement = document.getElementById('selectedRegionsModalText');
        
        const count = this.selectedRegions.length;
        const text = `Выбрано ${count} ${this.getRegionWordForm(count)}`;
        
        if (countElement) countElement.textContent = text;
        if (modalCountElement) modalCountElement.textContent = text;
    }

    // Получение правильной формы слова "регион"
    getRegionWordForm(count) {
        if (count === 1) return 'регион';
        if (count >= 2 && count <= 4) return 'региона';
        return 'регионов';
    }

    // Применение выбора регионов
    applyRegionsSelection() {
        const modal = document.getElementById('regionsModal');
        
        // Применяем фильтрацию через единую функцию
        this.applyAllFilters();
        
        // Закрываем модальное окно
        if (modal) modal.style.display = 'none';
    }

    // Инициализация моковых данных фермеров
    initFarmersData() {
        console.log('Инициализация данных фермеров...');
        console.log('Всего культур:', this.culturesData.length);
        
        // В реальном приложении здесь будет запрос к бекенду
        // Пока используем моковые данные на основе культур
        const uniqueFarmers = new Map();
        
        this.culturesData.forEach(culture => {
            if (culture.usersId && culture.usersId !== 'undefined') {
                const farmerId = culture.usersId;
                console.log('Найден фермер:', farmerId);
                
                if (!uniqueFarmers.has(farmerId)) {
                    uniqueFarmers.set(farmerId, {
                        id: farmerId,
                        name: culture.usersId.includes('2dfa61f7') ? 'Разработчиков Дмитрий Русланович' : `Фермер ${farmerId.slice(0, 8)}`,
                        organization: culture.usersId.includes('2dfa61f7') ? 'ООО "Агрогатор"' : 'Организация фермера',
                        inn: culture.usersId.includes('2dfa61f7') ? '314213828455' : '123456789012',
                        email: culture.usersId.includes('2dfa61f7') ? 'dmitrii@developersenior.ru' : `farmer${farmerId.slice(0, 8)}@example.com`,
                        phone: culture.usersId.includes('2dfa61f7') ? '+79649391119' : '+79001234567',
                        avatar: `https://ui-avatars.com/api/?name=${culture.usersId.includes('2dfa61f7') ? 'Dmitry' : 'Farmer'}&background=22c55e&color=ffffff`,
                        cropsCount: Math.floor(Math.random() * 30) + 5,
                        loadingPointsCount: Math.floor(Math.random() * 20) + 3
                    });
                }
            }
        });
        
        this.farmersData = Array.from(uniqueFarmers.values());
        console.log('Создано фермеров:', this.farmersData.length);
        console.log('Данные фермеров:', this.farmersData);
    }

    // Показ модалки выбора фермеров
    showFarmersModal() {
        console.log('Показ модалки фермеров...');
        console.log('Всего фермеров в данных:', this.farmersData.length);
        
        const modal = document.getElementById('farmersModal');
        const farmersGrid = document.getElementById('farmersGrid');
        const selectedText = document.getElementById('selectedFarmersModalText');
        const searchInput = document.getElementById('farmersSearch');
        
        console.log('Элементы найдены:', {
            modal: !!modal,
            farmersGrid: !!farmersGrid,
            selectedText: !!selectedText,
            searchInput: !!searchInput
        });
        
        if (!modal || !farmersGrid || !selectedText) return;
        
        // Сбрасываем поиск
        if (searchInput) {
            searchInput.value = '';
        }
        
        // Обновляем текст выбранных фермеров
        selectedText.textContent = `Выбрано ${this.selectedFarmers.length} фермеров`;
        
        // Отрисовываем всех фермеров
        const html = this.createFarmersGridHTML();
        console.log('Сгенерирован HTML для фермеров, длина:', html.length);
        farmersGrid.innerHTML = html;
        farmersGrid.style.display = 'grid';
        
        // Скрываем состояние пустого результата
        const emptyState = document.getElementById('farmersEmptyState');
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        
        // Показываем модальное окно
        modal.style.display = 'flex';
        console.log('Модалка фермеров показана');
        
        // Инициализируем обработчики для новых карточек
        this.initFarmersGridHandlers();
    }

    // Создание HTML для сетки фермеров
    createFarmersGridHTML() {
        return this.farmersData.map(farmer => `
            <div class="farmer-select-card ${this.selectedFarmers.some(f => f.id === farmer.id) ? 'selected' : ''}"
                 data-farmer-id="${farmer.id}">
                <img src="${farmer.avatar}" alt="${farmer.name}" class="farmer-select-avatar">
                <div class="farmer-select-info">
                    <div class="farmer-select-name">${farmer.name}</div>
                    <div class="farmer-select-details">
                        <span class="farmer-select-org">${farmer.organization}</span>
                        <span class="farmer-select-inn">ИНН: ${farmer.inn}</span>
                    </div>
                </div>
                <div class="farmer-select-checkbox">
                    <i class="fas fa-check"></i>
                </div>
            </div>
        `).join('');
    }

    // Инициализация обработчиков для сетки фермеров
    initFarmersGridHandlers() {
        const farmersGrid = document.getElementById('farmersGrid');
        if (!farmersGrid) return;
        
        farmersGrid.querySelectorAll('.farmer-select-card').forEach(card => {
            card.addEventListener('click', () => {
                const farmerId = card.dataset.farmerId;
                this.toggleFarmerSelection(farmerId);
            });
        });
    }

    // Переключение выбора фермера
    toggleFarmerSelection(farmerId) {
        const index = this.selectedFarmers.findIndex(f => f.id === farmerId);
        const card = document.querySelector(`[data-farmer-id="${farmerId}"]`);
        const selectedText = document.getElementById('selectedFarmersModalText');
        
        if (index > -1) {
            // Удаляем из выбранных
            this.selectedFarmers.splice(index, 1);
            if (card) card.classList.remove('selected');
        } else {
            // Добавляем в выбранные
            const farmer = this.farmersData.find(f => f.id === farmerId);
            if (farmer) {
                this.selectedFarmers.push(farmer);
                if (card) card.classList.add('selected');
            }
        }
        
        // Обновляем текст выбранных фермеров
        if (selectedText) {
            selectedText.textContent = `Выбрано ${this.selectedFarmers.length} фермеров`;
        }
        
        // Обновляем счетчик в основном интерфейсе
        this.updateSelectedFarmersCount();
        
        // Применяем фильтрацию
        this.applyAllFilters();
    }

    // Фильтрация фермеров в модалке
    filterFarmersInModal(query) {
        const farmersGrid = document.getElementById('farmersGrid');
        const emptyState = document.getElementById('farmersEmptyState');
        
        if (!farmersGrid || !emptyState) return;
        
        const searchQuery = query.toLowerCase().trim();
        
        if (!searchQuery) {
            // Показываем всех фермеров
            farmersGrid.innerHTML = this.createFarmersGridHTML();
            farmersGrid.style.display = 'grid';
            emptyState.style.display = 'none';
        } else {
            // Фильтруем фермеров
            const filteredFarmers = this.farmersData.filter(farmer => {
                return (
                    farmer.name.toLowerCase().includes(searchQuery) ||
                    farmer.organization.toLowerCase().includes(searchQuery) ||
                    farmer.inn.includes(searchQuery)
                );
            });
            
            if (filteredFarmers.length === 0) {
                farmersGrid.style.display = 'none';
                emptyState.style.display = 'flex';
            } else {
                farmersGrid.style.display = 'grid';
                emptyState.style.display = 'none';
                
                // Создаем HTML для отфильтрованных фермеров
                const filteredHTML = filteredFarmers.map(farmer => `
                    <div class="farmer-select-card ${this.selectedFarmers.some(f => f.id === farmer.id) ? 'selected' : ''}"
                         data-farmer-id="${farmer.id}">
                        <img src="${farmer.avatar}" alt="${farmer.name}" class="farmer-select-avatar">
                        <div class="farmer-select-info">
                            <div class="farmer-select-name">${farmer.name}</div>
                            <div class="farmer-select-details">
                                <span class="farmer-select-org">${farmer.organization}</span>
                                <span class="farmer-select-inn">ИНН: ${farmer.inn}</span>
                            </div>
                        </div>
                        <div class="farmer-select-checkbox">
                            <i class="fas fa-check"></i>
                        </div>
                    </div>
                `).join('');
                
                farmersGrid.innerHTML = filteredHTML;
            }
        }
        
        // Переинициализируем обработчики для новых карточек
        this.initFarmersGridHandlers();
    }

    // Применение выбора фермеров
    applyFarmersSelection() {
        const modal = document.getElementById('farmersModal');
        
        // Применяем фильтрацию
        this.applyAllFilters();
        
        // Закрываем модальное окно
        if (modal) modal.style.display = 'none';
    }
}

// Инициализация страницы при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    window.qualityCheckPage = new QualityCheckPage();
});
