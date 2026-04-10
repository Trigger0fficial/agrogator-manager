// Глобальные переменные для данных
let verificationStatuses = [];
let profileRoles = [];
let usersData = [];

// Функция для получения заголовков авторизации
async function getAuthHeaders() {
    try {
        // Проверяем, доступна ли функция getAuthTokens из total_post.js
        if (typeof getAuthTokens === 'function') {
            const authResult = await getAuthTokens();
            
            if (authResult.status === 403 || authResult.status === 409) {
                // Если токены отсутствуют или недействительны, выходим из системы
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
            console.warn('Функция getAuthTokens не найдена. Используем моковые данные для тестирования.');
            return null;
        }
    } catch (error) {
        console.error('Ошибка при получении заголовков авторизации:', error);
        // В случае ошибки используем моковые данные
        return null;
    }
}

// Функция для выполнения запроса к API с авторизацией
async function makeAuthenticatedRequest(url, options = {}) {
    try {
        const headers = await getAuthHeaders();
        if (!headers) {
            // Если нет заголовков авторизации, перенаправляем на главную страницу
            console.log('Нет токена авторизации, перенаправление на главную страницу');
            if (typeof logout === 'function') {
                logout();
            }
            window.location.href = '/';
            return null;
        }
        
        const response = await fetch(`${API_CONFIG.BASE_URL}${url}`, {
            ...options,
            headers: {
                ...headers,
                ...options.headers
            },
            timeout: API_CONFIG.TIMEOUT
        });
        
        if (response.status === 401 || response.status === 403) {
            // Токен истек или недействителен
            if (typeof logout === 'function') {
                logout();
            }
            window.location.href = '/';
            throw new Error('Авторизация не удалась');
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Ошибка запроса к ${url}:`, error);
        // В случае ошибки тоже перенаправляем на главную
        if (typeof logout === 'function') {
            logout();
        }
        window.location.href = '/';
        return null;
    }
}


// Функция для получения статусов верификации и ролей
async function loadVerificationData() {
    try {
        console.log('Загрузка данных верификации...');
        
        const response = await makeAuthenticatedRequest('/moderators-module/all-relations');
        
        if (response && response.verificationStatus && response.profileRoles) {
            verificationStatuses = response.verificationStatus;
            profileRoles = response.profileRoles;
            
            console.log('Статусы верификации:', verificationStatuses);
            console.log('Роли профилей:', profileRoles);
            
            return true;
        } else {
            console.error('Некорректный формат ответа для данных верификации');
            return false;
        }
    } catch (error) {
        console.error('Ошибка при загрузке данных верификации:', error);
        return false;
    }
}

// Функция для получения пользователей на верификации
async function loadUsersOnVerification() {
    try {
        console.log('Загрузка пользователей на верификации...');
        
        const response = await makeAuthenticatedRequest('/moderators-module/all-users-on-verification');
        
        if (response && Array.isArray(response)) {
            // Преобразуем данные API в формат, понятный для фронтенда
            usersData = response.map(user => transformUserData(user));
            
            console.log('Пользователи на верификации:', usersData);
            
            return true;
        } else {
            console.log('Пользователи на верификации не найдены');
            usersData = [];
            return true; // Возвращаем true, но с пустым массивом
        }
    } catch (error) {
        console.error('Ошибка при загрузке пользователей на верификации:', error);
        usersData = [];
        return true; // Возвращаем true, но с пустым массивом
    }
}

// Функция для преобразования данных пользователя из формата API в формат фронтенда
function transformUserData(apiUser) {
    // Определяем тип профиля и соответствующие данные
    let profileData = null;
    let companyName = '';
    let inn = '';
    let registrationDate = '';
    
    if (apiUser.profileType === 'entrepreneur' && apiUser.entrepreneurProfile) {
        profileData = apiUser.entrepreneurProfile;
        companyName = profileData.organizationName || '';
        inn = profileData.inn || '';
    } else if (apiUser.profileType === 'juridical' && apiUser.juridicalProfile) {
        profileData = apiUser.juridicalProfile;
        companyName = profileData.organizationName || '';
        inn = profileData.inn || '';
    }
    
    // Формируем ФИО
    let fullName = '';
    if (profileData) {
        const parts = [
            profileData.lastName || '',
            profileData.firstName || '',
            profileData.patronymic || ''
        ].filter(Boolean);
        fullName = parts.join(' ');
    }
    
    // Определяем роль
    let role = 'unknown';
    if (apiUser.profileType === 'entrepreneur') {
        role = 'farmer'; // Предполагаем, что ИП - это фермер
    } else if (apiUser.profileType === 'juridical') {
        role = 'exporter'; // Предполагаем, что юрлицо - это экспортер
    }
    
    // Преобразуем статус верификации из API во внутренний формат
    let status = 'unknown';
    if (apiUser.verificationStatus && apiUser.verificationStatus.name) {
        const statusName = apiUser.verificationStatus.name.toLowerCase();
        const statusId = apiUser.verificationStatus.id;
        
        // Преобразование на основе ID и имени статуса из API
        if (statusId === 1 || statusName.includes('не пройдена')) {
            status = 'rejected';
        } else if (statusId === 2 || statusName.includes('документ сформирован')) {
            status = 'document';
        } else if (statusId === 3 || statusName.includes('проверка')) {
            status = 'in-progress';
        } else if (statusId === 7 || statusName.includes('отказано')) {
            status = 'refused';
        } else if (statusId === 4 || statusName.includes('отправлен на подписание')) {
            status = 'sent';
        } else if (statusId === 5 || statusName.includes('пройдена')) {
            status = 'accepted';
        } else if (statusId === 6 || statusName.includes('доработке')) {
            status = 'draft';
        } else {
            status = 'unknown';
        }
    }
    
    // Формируем дату регистрации (если есть)
    if (apiUser.createdAt) {
        registrationDate = new Date(apiUser.createdAt).toLocaleDateString('ru-RU');
    } else {
        registrationDate = 'Не указано';
    }
    
    // Определяем банковские данные в зависимости от типа профиля
    let bankName = '';
    let bik = '';
    let correspondentAccount = '';
    let paymentAccount = '';
    
    if (profileData) {
        bankName = profileData.bankName || '';
        bik = profileData.bik || '';
        correspondentAccount = profileData.correspondentAccount || '';
        
        // Для ИП используем checkingAccount, для юрлиц - checkingAccount
        if (apiUser.profileType === 'entrepreneur') {
            paymentAccount = profileData.checkingAccount || '';
        } else if (apiUser.profileType === 'juridical') {
            paymentAccount = profileData.checkingAccount || '';
        }
    }
    
    return {
        id: apiUser.id,
        name: fullName || 'Не указано',
        company: companyName || 'Не указано',
        avatar: apiUser.photo || 'data:image/svg+xml,%3Csvg width="150" height="150" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="150" height="150" fill="%23F3F4F6"/%3E%3Ccircle cx="75" cy="60" r="20" fill="%239CA3AF"/%3E%3Cpath d="M55 90C55 82.2 62.2 75 75 75H87.5C100.2 75 107.5 82.2 107.5 90V100H55V90Z" fill="%239CA3AF"/%3E%3C/svg%3E', // Локальная заглушка
        email: apiUser.email || '',
        phone: apiUser.phone || '',
        registrationDate: registrationDate,
        status: status,
        role: role,
        inn: inn,
        rating: apiUser.rating || 0,
        isVerified: apiUser.isVerified || false,
        // Сохраняем полные данные для будущей работы
        _originalData: apiUser,
        // Для обратной совместимости с существующим кодом
        personalData: profileData ? {
            lastName: profileData.lastName || '',
            firstName: profileData.firstName || '',
            middleName: profileData.patronymic || '',
            birthDate: profileData.dateOfBirth ? new Date(profileData.dateOfBirth).toLocaleDateString('ru-RU') : '',
            email: apiUser.email || ''
        } : {},
        organizationData: profileData ? {
            inn: profileData.inn || '',
            ogrnip: profileData.ogrnip || '',
            companyName: companyName || '',
            legalAddress: profileData.legalAddress || '',
            bankName: bankName,
            bik: bik,
            correspondentAccount: correspondentAccount,
            paymentAccount: paymentAccount,
            // Дополнительные поля для юридических лиц
            kpp: profileData.kpp || '',
            ogrn: profileData.ogrn || ''
        } : {}
    };
}

// Конфигурация статусов верификации на основе данных API
const statusConfig = {
    // ID: 1 - "Верификация не пройдена"
    'rejected': {
        text: 'Верификация не пройдена',
        class: 'status-rejected',
        icon: 'fas fa-times-circle',
        color: '#dc3545'
    },
    // ID: 2 - "Документ сформирован"
    'document': {
        text: 'Документ сформирован',
        class: 'status-document',
        icon: 'fas fa-file-alt',
        color: '#6c757d'
    },
    // ID: 3 - "Проверка"
    'in-progress': {
        text: 'Проверка',
        class: 'status-in-progress',
        icon: 'fas fa-spinner fa-spin',
        color: '#fd7e14'
    },
    // ID: 7 - "Отказано"
    'refused': {
        text: 'Отказано',
        class: 'status-refused',
        icon: 'fas fa-ban',
        color: '#dc3545'
    },
    // ID: 4 - "Отправлен на подписание клиентом"
    'sent': {
        text: 'Отправлен на подписание',
        class: 'status-sent',
        icon: 'fas fa-paper-plane',
        color: '#007bff'
    },
    // ID: 5 - "Верификация пройдена"
    'accepted': {
        text: 'Верификация пройдена',
        class: 'status-accepted',
        icon: 'fas fa-check-circle',
        color: '#28a745'
    },
    // ID: 6 - "Документ на доработке"
    'draft': {
        text: 'Документ на доработке',
        class: 'status-draft',
        icon: 'fas fa-edit',
        color: '#ffc107'
    },
    // Дополнительные статусы для совместимости
    'not-started': {
        text: 'Не начата',
        class: 'status-not-started',
        icon: 'fas fa-clock',
        color: '#6c757d'
    },
    'not-signed': {
        text: 'Не подписан',
        class: 'status-not-signed',
        icon: 'fas fa-signature',
        color: '#6c757d'
    },
    'waiting': {
        text: 'В ожидании',
        class: 'status-waiting',
        icon: 'fas fa-hourglass-half',
        color: '#fd7e14'
    },
    'unknown': {
        text: 'Неизвестно',
        class: 'status-unknown',
        icon: 'fas fa-question-circle',
        color: '#6c757d'
    }
};

// Функция для безопасного получения конфигурации статуса
function getStatusConfig(status) {
    return statusConfig[status] || statusConfig['unknown'];
}

// Основной класс для управления страницей верификации
class VerificationPage {
    constructor() {
        this.usersGrid = document.getElementById('usersGrid');
        this.loadingState = document.getElementById('loadingState');
        this.emptyState = document.getElementById('emptyState');
        this.searchInput = document.querySelector('.search-input');
        this.searchClear = document.querySelector('.search-clear');
        this.filterTabs = document.querySelectorAll('.filter-tab');
        this.filterContents = document.querySelectorAll('.filter-content');
        this.resetButton = document.getElementById('resetAllFilters');

        this.currentRoleFilter = 'all';
        this.currentStatusFilter = 'all';
        this.currentSearch = '';
        this.filteredUsers = [...usersData];
        
        // Служебные роли, которые нужно исключить из отображения
        this.excludedRoles = ['manager', 'senior manager', 'logistician'];

        this.init();
    }

    async init() {
        try {
            // Показываем состояние загрузки
            this.showLoading();
            
            // Загружаем данные с API
            const statusLoaded = await loadVerificationData();
            if (!statusLoaded) {
                this.showError('Не удалось загрузить статусы верификации');
                return;
            }
            
            const usersLoaded = await loadUsersOnVerification();
            if (!usersLoaded) {
                this.showError('Не удалось загрузить пользователей');
                return;
            }
            
            // Создаем фильтры на основе данных из API
            this.createDynamicFilters();
            
            // Инициализируем интерфейс
            this.filteredUsers = [...usersData];
            this.hideLoading();
            this.renderUsers();
            this.addEventListeners();
            this.updateFilterCounts();
            this.initNotSignedModal();
            this.initVerificationNotPassedModal();
            
        } catch (error) {
            console.error('Ошибка при инициализации страницы верификации:', error);
            this.showError('Произошла ошибка при загрузке данных');
            this.hideLoading();
        }
    }

    createDynamicFilters() {
        // Создаем фильтры ролей
        this.createRoleFilters();
        
        // Создаем фильтры статусов
        this.createStatusFilters();
    }

    createRoleFilters() {
        const rolesFilterContainer = document.querySelector('#rolesFilter .filter-buttons');
        if (!rolesFilterContainer) return;

        // Устанавливаем горизонтальные стили
        rolesFilterContainer.style.display = 'flex';
        rolesFilterContainer.style.flexWrap = 'wrap';
        rolesFilterContainer.style.flexDirection = 'row';
        rolesFilterContainer.style.gap = '0.75rem';

        rolesFilterContainer.innerHTML = '';

        // Добавляем кнопку "Все роли"
        const allRolesBtn = this.createFilterButton('all', 'Все роли', 'role');
        rolesFilterContainer.appendChild(allRolesBtn);

        // Добавляем фильтры для каждой роли из API, исключая служебные роли
        profileRoles.forEach(role => {
            // Исключаем служебные роли: менеджер, старший менеджер, логист
            if (!this.excludedRoles.includes(role.name.toLowerCase())) {
                const roleBtn = this.createFilterButton(role.name, this.getRoleDisplayName(role.name), 'role');
                rolesFilterContainer.appendChild(roleBtn);
            }
        });
    }

    createStatusFilters() {
        const statusesFilterContainer = document.querySelector('#statusesFilter .filter-buttons');
        if (!statusesFilterContainer) return;

        // Устанавливаем горизонтальные стили
        statusesFilterContainer.style.display = 'flex';
        statusesFilterContainer.style.flexWrap = 'wrap';
        statusesFilterContainer.style.flexDirection = 'row';
        statusesFilterContainer.style.gap = '0.75rem';

        statusesFilterContainer.innerHTML = '';

        // Добавляем кнопку "Все статусы"
        const allStatusesBtn = this.createFilterButton('all', 'Все статусы', 'status');
        statusesFilterContainer.appendChild(allStatusesBtn);

        // Добавляем фильтры для каждого статуса из API
        verificationStatuses.forEach(status => {
            const internalStatus = this.convertApiStatusToInternal(status);
            const statusConfig = getStatusConfig(internalStatus);
            const statusBtn = this.createFilterButton(internalStatus, status.name, 'status');
            statusesFilterContainer.appendChild(statusBtn);
        });
    }

    createFilterButton(value, text, type) {
        const button = document.createElement('button');
        button.className = 'filter-btn';
        button.dataset[type] = value;
        
        // Добавляем иконку для статусов
        if (type === 'status') {
            const statusConfig = getStatusConfig(value);
            button.innerHTML = `
                <i class="${statusConfig.icon}"></i>
                <span>${text}</span>
                <span class="filter-count">0</span>
            `;
        } else {
            button.innerHTML = `
                <span>${text}</span>
                <span class="filter-count">0</span>
            `;
        }

        // Устанавливаем активную кнопку по умолчанию
        if (value === 'all') {
            button.classList.add('active');
        }

        return button;
    }

    getRoleDisplayName(roleName) {
        const roleNames = {
            'farmer': 'Фермер',
            'exporter': 'Экспортер',
            'transporter': 'Перевозчик',
            'supplier': 'Поставщик',
            'manager': 'Менеджер',
            'senior manager': 'Старший менеджер',
            'logistician': 'Логист'
        };
        return roleNames[roleName] || roleName;
    }

    convertApiStatusToInternal(apiStatus) {
        const statusName = apiStatus.name.toLowerCase();
        const statusId = apiStatus.id;
        
        if (statusId === 1 || statusName.includes('не пройдена')) {
            return 'rejected';
        } else if (statusId === 2 || statusName.includes('документ сформирован')) {
            return 'document';
        } else if (statusId === 3 || statusName.includes('проверка')) {
            return 'in-progress';
        } else if (statusId === 7 || statusName.includes('отказано')) {
            return 'refused';
        } else if (statusId === 4 || statusName.includes('отправлен на подписание')) {
            return 'sent';
        } else if (statusId === 5 || statusName.includes('пройдена')) {
            return 'accepted';
        } else if (statusId === 6 || statusName.includes('доработке')) {
            return 'draft';
        } else {
            return 'unknown';
        }
    }

    showLoading() {
        if (this.loadingState) {
            this.loadingState.style.display = 'flex';
        }
        if (this.usersGrid) {
            this.usersGrid.style.display = 'none';
        }
        if (this.emptyState) {
            this.emptyState.style.display = 'none';
        }
    }

    hideLoading() {
        if (this.loadingState) {
            this.loadingState.style.display = 'none';
        }
        if (this.usersGrid) {
            this.usersGrid.style.display = 'grid';
        }
    }

    showError(message) {
        if (this.usersGrid) {
            this.usersGrid.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">Попробовать снова</button>
                </div>
            `;
        }
    }

    addEventListeners() {
        // Переключение между фильтрами по ролям и статусам
        this.filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const filterType = tab.dataset.filterType;

                if (filterType === 'roles' || filterType === 'statuses') {
                    this.switchFilterTab(filterType);
                } else if (tab.id === 'resetAllFilters') {
                    this.resetAllFilters();
                }
            });
        });

        // Фильтры по ролям
        document.querySelectorAll('#rolesFilter .filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setRoleFilter(btn.dataset.role);
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

        // Обработчики для кнопок действий в карточках
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-chat')) {
                this.openChat(e.target.closest('.user-card'));
            }
            if (e.target.closest('.btn-details')) {
                this.openDetails(e.target.closest('.user-card'));
            }
        });
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
        // Сбрасываем фильтр ролей
        this.currentRoleFilter = 'all';
        document.querySelectorAll('#rolesFilter .filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.role === 'all');
        });

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

    setRoleFilter(role) {
        this.currentRoleFilter = role;

        // Обновляем активные кнопки в фильтре ролей
        document.querySelectorAll('#rolesFilter .filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.role === role);
        });

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
        this.filteredUsers = usersData.filter(user => {
            // Исключаем служебные роли: менеджер, старший менеджер, логист
            const isExcludedRole = this.excludedRoles.includes(user.role?.toLowerCase() || '');
            
            if (isExcludedRole) {
                return false;
            }
            
            // Фильтр по роли
            const roleMatch = this.currentRoleFilter === 'all' || user.role === this.currentRoleFilter;

            // Фильтр по статусу
            const statusMatch = this.currentStatusFilter === 'all' || user.status === this.currentStatusFilter;

            // Фильтр по поиску (ФИО, компания, ИНН)
            const searchMatch = !this.currentSearch ||
                user.name.toLowerCase().includes(this.currentSearch) ||
                user.company.toLowerCase().includes(this.currentSearch) ||
                (user.inn && user.inn.includes(this.currentSearch));

            return roleMatch && statusMatch && searchMatch;
        });

        this.renderUsers();
        this.updateFilterCounts();
    }

    renderUsers() {
        if (!this.usersGrid) return;

        if (this.filteredUsers.length === 0) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();

        const usersHTML = this.filteredUsers.map(user => this.createUserCard(user)).join('');
        this.usersGrid.innerHTML = usersHTML;
    }

    createUserCard(user) {
        const status = getStatusConfig(user.status);
        const roleText = this.getRoleDisplayName(user.role);

        return `
            <div class="user-card" data-user-id="${user.id}" data-status="${user.status}" data-role="${user.role}">
                <!-- Статус полоска -->
                <div class="user-status-bar ${user.status}"></div>
                
                <!-- Основная информация о пользователе -->
                <div class="user-card-header">
                    <div class="user-main-info">
                        <h3 class="user-name">${user.name}</h3>
                        <p class="user-company">${user.company}</p>
                        <div class="user-meta">
                            <div class="user-role-status-group">
                                <span class="user-role">${roleText}</span>
                                <div class="verification-time-badge ${this.getVerificationTimeClass(user._originalData.created_at)}">
                                    <i class="fas fa-clock"></i>
                                    <span>${this.getVerificationTimeText(user._originalData.created_at)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Детальная информация -->
                <div class="user-info-grid">
                    <div class="info-item">
                        <div class="info-icon">
                            <i class="fas fa-envelope"></i>
                        </div>
                        <div class="info-content">
                            <div class="info-label">Email</div>
                            <div class="info-value">${user.email}</div>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="info-icon">
                            <i class="fas fa-phone"></i>
                        </div>
                        <div class="info-content">
                            <div class="info-label">Телефон</div>
                            <div class="info-value">${user.phone}</div>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="info-icon">
                            <i class="fas fa-id-card"></i>
                        </div>
                        <div class="info-content">
                            <div class="info-label">ИНН</div>
                            <div class="info-value">${user.inn}</div>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="info-icon">
                            <i class="fas fa-calendar-alt"></i>
                        </div>
                        <div class="info-content">
                            <div class="info-label">Дата рождения</div>
                            <div class="info-value">${this.getBirthDate(user)}</div>
                        </div>
                    </div>
                </div>

                <!-- Кнопки действий -->
                <div class="user-actions">
                    <button class="btn-chat" title="Написать сообщение">
                        <i class="fas fa-comment-dots"></i>
                        <span class="btn-text">Чат</span>
                    </button>
                    <button class="btn-details" data-user-id="${user.id}" data-status="${user.status}">
                        <i class="fas fa-external-link-alt"></i>
                        Подробнее
                    </button>
                </div>
            </div>
        `;
    }

    getVerificationTimeClass(createdAt) {
        console.log('getVerificationTimeClass - createdAt:', createdAt);
        
        if (!createdAt) {
            console.log('createdAt is empty, returning time-green');
            return 'time-green';
        }
        
        const createdDate = new Date(createdAt);
        console.log('createdDate:', createdDate, 'isNaN:', isNaN(createdDate.getTime()));
        
        if (isNaN(createdDate.getTime())) {
            console.log('createdDate is invalid, returning time-green');
            return 'time-green';
        }
        
        const currentDate = new Date();
        // Приводим обе даты к началу дня в локальной timezone
        const createdDayStart = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
        const currentDayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        
        const daysDiff = Math.floor((currentDayStart - createdDayStart) / (1000 * 60 * 60 * 24));
        console.log('daysDiff:', daysDiff);
        
        // Обновляем логику согласно ТЗ: < 1 день - зеленая, 1-2 дня - желтая, > 2 дней - красная
        if (daysDiff < 1) {
            return 'time-green';
        } else if (daysDiff <= 2) {
            return 'time-yellow';
        } else {
            return 'time-red';
        }
    }

    getVerificationTimeText(createdAt) {
        console.log('getVerificationTimeText - createdAt:', createdAt);
        
        if (!createdAt) {
            console.log('createdAt is empty, returning Нет данных');
            return 'Нет данных';
        }
        
        const createdDate = new Date(createdAt);
        console.log('createdDate:', createdDate, 'isNaN:', isNaN(createdDate.getTime()));
        
        if (isNaN(createdDate.getTime())) {
            console.log('createdDate is invalid, returning Нет данных');
            return 'Нет данных';
        }
        
        const currentDate = new Date();
        // Приводим обе даты к началу дня в локальной timezone
        const createdDayStart = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
        const currentDayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        
        const daysDiff = Math.floor((currentDayStart - createdDayStart) / (1000 * 60 * 60 * 24));
        console.log('daysDiff:', daysDiff);
        
        if (daysDiff === 0) {
            return 'Сегодня';
        } else if (daysDiff === 1) {
            return '1 день';
        } else if (daysDiff <= 4) {
            return `${daysDiff} дня`;
        } else {
            return `${daysDiff} дней`;
        }
    }

    getBirthDate(user) {
        console.log('getBirthDate - user:', user);
        
        // Проверяем личные данные в первую очередь
        if (user.personalData && user.personalData.birthDate) {
            console.log('getBirthDate - found birthDate in personalData:', user.personalData.birthDate);
            return user.personalData.birthDate;
        }
        
        // Проверяем оригинальные данные из API
        if (user._originalData) {
            let dateOfBirth = null;
            
            if (user._originalData.profileType === 'entrepreneur' && user._originalData.entrepreneurProfile) {
                dateOfBirth = user._originalData.entrepreneurProfile.dateOfBirth;
            } else if (user._originalData.profileType === 'juridical' && user._originalData.juridicalProfile) {
                dateOfBirth = user._originalData.juridicalProfile.dateOfBirth;
            }
            
            if (dateOfBirth) {
                const birthDate = new Date(dateOfBirth);
                console.log('getBirthDate - birthDate from API:', birthDate, 'isNaN:', isNaN(birthDate.getTime()));
                
                if (!isNaN(birthDate.getTime())) {
                    const currentDate = new Date();
                    let age = currentDate.getFullYear() - birthDate.getFullYear();
                    
                    // Корректировка возраста, если день рождения еще не прошел в этом году
                    const monthDiff = currentDate.getMonth() - birthDate.getMonth();
                    if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())) {
                        age--;
                    }
                    
                    const formattedDate = birthDate.toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                    
                    const ageText = age % 10 === 1 && age % 100 !== 11 ? 'год' : 
                                   age % 10 >= 2 && age % 10 <= 4 && (age % 100 < 10 || age % 100 >= 20) ? 'года' : 'лет';
                    
                    return `${formattedDate} (${age} ${ageText})`;
                }
            }
        }
        
        console.log('getBirthDate - no valid date found, returning Нет данных');
        return 'Нет данных';
    }

    updateFilterCounts() {
        // Обновляем счетчики для ролей на основе данных из API
        const roleCounts = {};
        profileRoles.forEach(role => {
            if (!this.excludedRoles.includes(role.name.toLowerCase())) {
                roleCounts[role.name] = usersData.filter(u => u.role === role.name).length;
            }
        });
        
        // Обновляем счетчики в фильтре ролей
        profileRoles.forEach(role => {
            if (!this.excludedRoles.includes(role.name.toLowerCase())) {
                const roleBtn = document.querySelector(`[data-role="${role.name}"] .filter-count`);
                if (roleBtn) {
                    roleBtn.textContent = roleCounts[role.name] || 0;
                }
            }
        });
        
        // Обновляем счетчик "Все роли" - считаем только пользователей с неразрешенными ролями
        const allRolesBtn = document.querySelector('[data-role="all"] .filter-count');
        if (allRolesBtn) {
            const allowedUsersCount = usersData.filter(u => 
                !this.excludedRoles.includes(u.role?.toLowerCase() || '')
            ).length;
            allRolesBtn.textContent = allowedUsersCount;
        }

        // Обновляем счетчики для статусов на основе данных из API
        const statusCounts = {};
        verificationStatuses.forEach(status => {
            // Преобразуем имя статуса из API во внутренний формат для подсчета
            let internalStatus = 'unknown';
            const statusName = status.name.toLowerCase();
            const statusId = status.id;
            
            if (statusId === 1 || statusName.includes('не пройдена')) {
                internalStatus = 'rejected';
            } else if (statusId === 2 || statusName.includes('документ сформирован')) {
                internalStatus = 'document';
            } else if (statusId === 3 || statusName.includes('проверка')) {
                internalStatus = 'in-progress';
            } else if (statusId === 7 || statusName.includes('отказано')) {
                internalStatus = 'refused';
            } else if (statusId === 4 || statusName.includes('отправлен на подписание')) {
                internalStatus = 'sent';
            } else if (statusId === 5 || statusName.includes('пройдена')) {
                internalStatus = 'accepted';
            } else if (statusId === 6 || statusName.includes('доработке')) {
                internalStatus = 'draft';
            }
            
            statusCounts[internalStatus] = usersData.filter(u => u.status === internalStatus).length;
        });

        // Обновляем счетчики в фильтре статусов
        Object.keys(statusCounts).forEach(status => {
            const element = document.querySelector(`[data-status="${status}"] .filter-count`);
            if (element) {
                element.textContent = statusCounts[status];
            }
        });

        // Обновляем счетчик "Все статусы"
        const allStatusesBtn = document.querySelector('[data-status="all"] .filter-count');
        if (allStatusesBtn) {
            allStatusesBtn.textContent = usersData.length;
        }

        // Обновляем статистику в заголовке
        const totalElement = document.querySelector('.stat-card:nth-child(1) .stat-value');
        const attentionElement = document.querySelector('.stat-card:nth-child(2) .stat-value');
        const activeDealsElement = document.querySelector('.stat-card:nth-child(3) .stat-value');
        const documentsElement = document.querySelector('.stat-card:nth-child(4) .stat-value');

        // Исключаем служебные роли из статистики
        const allowedUsers = usersData.filter(u => !this.excludedRoles.includes(u.role?.toLowerCase() || ''));

        if (totalElement) totalElement.textContent = allowedUsers.length;
        if (attentionElement) {
            // Считаем пользователей требующих внимания: не пройдена, отказано, на доработке
            const attentionCount = allowedUsers.filter(u => 
                u.status === 'rejected' || u.status === 'refused' || u.status === 'draft'
            ).length;
            attentionElement.textContent = attentionCount;
        }
        if (activeDealsElement) activeDealsElement.textContent = '8'; // Пока статично
        if (documentsElement) {
            // Показываем количество пользователей с ИНН
            const usersWithInn = allowedUsers.filter(user => user.inn).length;
            documentsElement.textContent = usersWithInn;
        }
    }

    openChat(card) {
        const userId = card.dataset.userId;
        const userName = card.querySelector('.user-name').textContent;
        console.log(`Открыть чат с пользователем: ${userName} (ID: ${userId})`);
        // Здесь будет логика открытия чата
        alert(`Открытие чата с ${userName}`);
    }

    openDetails(card) {
        const userId = card.dataset.userId;
        const status = card.dataset.status;
        const userName = card.querySelector('.user-name').textContent;

        console.log(`Открыть детали пользователя: ${userName} (ID: ${userId}, Статус: ${status})`);

        // Для статуса "не подписан" показываем модальное окно
        if (status === 'not-signed') {
            this.showNotSignedModal(userId);
            return;
        }

        // Для статуса "Верификация не пройдена" (verificationStatus.id === 1) показываем специальное модальное окно
        const user = usersData.find(u => u.id == userId);
        if (user && user._originalData && user._originalData.verificationStatus && user._originalData.verificationStatus.id === 1) {
            this.showVerificationNotPassedModal(userId);
            return;
        }

        // Переходим на страницу деталей с правильным URL
        window.location.href = `/verification/detail/user/${userId}/`;
    }

    showEmptyState() {
        if (this.emptyState) {
            this.emptyState.style.display = 'flex';
        }
        if (this.usersGrid) {
            this.usersGrid.style.display = 'none';
        }
    }

    hideEmptyState() {
        if (this.emptyState) {
            this.emptyState.style.display = 'none';
            this.usersGrid.style.display = 'grid';
        }
    }

    initNotSignedModal() {
        // Создаем модальное окно для статуса "не подписан"
        const modalHTML = `
            <div class="modal" id="notSignedModal">
                <div class="modal-content not-signed-modal">
                    <div class="modal-header">
                        <div class="modal-icon">
                            <i class="fas fa-info-circle"></i>
                        </div>
                        <div class="modal-title">
                            <h3>Верификация не начата</h3>
                            <p>Пользователь еще не подал заявку на верификацию</p>
                        </div>
                        <button class="modal-close">&times;</button>
                    </div>

                    <div class="modal-body">
                        <div class="info-alert">
                            <div class="alert-icon">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                            <div class="alert-content">
                                <h4>Информация о заполненных полях</h4>
                                <p>На данный момент пользователь заполнил только следующие поля:</p>
                            </div>
                        </div>

                        <div class="user-data-sections">
                            <!-- Личные данные -->
                            <div class="data-section">
                                <h4><i class="fas fa-user"></i> Личные данные</h4>
                                <div class="data-grid" id="personalDataGrid">
                                    <!-- Данные будут заполнены динамически -->
                                </div>
                            </div>

                            <!-- Данные организации -->
                            <div class="data-section">
                                <h4><i class="fas fa-building"></i> Данные организации</h4>
                                <div class="data-grid" id="organizationDataGrid">
                                    <!-- Данные будут заполнены динамически -->
                                </div>
                            </div>

                            <!-- Договор -->
                            <div class="data-section">
                                <h4><i class="fas fa-file-signature"></i> Подписание договора</h4>
                                <div class="contract-status">
                                    <div class="status-indicator not-started">
                                        <div class="status-content">
                                            <i class="fas fa-clock status-icon"></i>
                                            <span class="status-text">Договор не отправлен</span>
                                        </div>
                                    </div>
                                    <p class="contract-hint">Договор будет отправлен на подписание после подачи заявки на верификацию</p>
                                </div>
                            </div>
                        </div>

                        <div class="modal-actions">
                            <button class="btn btn-outline" id="closeNotSignedModal">
                                <i class="fas fa-times"></i>
                                Закрыть
                            </button>
                            <button class="btn btn-primary" id="goToChatFromModal">
                                <i class="fas fa-comment-dots"></i>
                                Перейти в чат
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Добавляем модальное окно в DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Инициализируем обработчики для модального окна
        this.initNotSignedModalHandlers();
    }

    initNotSignedModalHandlers() {
        const modal = document.getElementById('notSignedModal');
        const closeBtn = document.getElementById('closeNotSignedModal');
        const chatBtn = document.getElementById('goToChatFromModal');
        const modalClose = modal.querySelector('.modal-close');

        // Закрытие модалки
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        if (modalClose) {
            modalClose.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        // Переход в чат
        if (chatBtn) {
            chatBtn.addEventListener('click', () => {
                const currentUserId = modal.dataset.currentUserId;
                this.openChatById(currentUserId);
                modal.style.display = 'none';
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
    }

    showNotSignedModal(userId) {
        const user = usersData.find(u => u.id == userId);
        if (!user) return;

        const modal = document.getElementById('notSignedModal');
        const personalDataGrid = document.getElementById('personalDataGrid');
        const organizationDataGrid = document.getElementById('organizationDataGrid');

        // Сохраняем ID текущего пользователя
        modal.dataset.currentUserId = userId;

        // Заполняем личные данные
        if (user.personalData) {
            personalDataGrid.innerHTML = this.createPersonalDataHTML(user.personalData);
        }

        // Заполняем данные организации
        if (user.organizationData) {
            organizationDataGrid.innerHTML = this.createOrganizationDataHTML(user.organizationData);
        }

        // Показываем модальное окно
        modal.style.display = 'block';
    }

    initVerificationNotPassedModal() {
        // Создаем модальное окно для статуса "Верификация не пройдена"
        const modalHTML = `
            <div class="modal" id="verificationNotPassedModal">
                <div class="modal-content verification-not-passed-modal">
                    <div class="modal-header">
                        <div class="modal-icon">
                            <i class="fas fa-info-circle"></i>
                        </div>
                        <div class="modal-title">
                            <h3>Верификация не пройдена</h3>
                            <p>Пользователь еще не подал заявку на верификацию</p>
                        </div>
                        <button class="modal-close">&times;</button>
                    </div>

                    <div class="modal-body">
                        <div class="info-alert">
                            <div class="info-alert-header">
                                <h4>Информация о статусе пользователя</h4>
                            </div>
                            
                            <div class="info-alert-content">
                                <div class="info-block manager-block">
                                    <div class="info-block-icon">
                                        <i class="fas fa-user-shield"></i>
                                    </div>
                                    <div class="info-block-content">
                                        <h5>Что можете вы</h5>
                                        <p>Вы не можете пока обработать этого пользователя, пока он не подаст заявку на верификацию. Дождитесь, когда пользователь будет готов к верификации.</p>
                                    </div>
                                </div>
                                
                                <div class="info-block user-block">
                                    <div class="info-block-icon">
                                        <i class="fas fa-eye"></i>
                                    </div>
                                    <div class="info-block-content">
                                        <h5>Что может пользователь</h5>
                                        <p>На данный момент пользователю доступна демо-версия сайта, где он может ознакомиться с возможностями платформы.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="user-contact-section">
                            <h4><i class="fas fa-address-book"></i> Контактные данные для связи</h4>
                            <div class="contact-info-grid" id="contactInfoGrid">
                                <!-- Контактные данные будут заполнены динамически -->
                            </div>
                        </div>

                        <div class="demo-info-section">
                            <div class="demo-info-card">
                                <div class="demo-icon">
                                    <i class="fas fa-eye"></i>
                                </div>
                                <div class="demo-content">
                                    <h5>Демо-доступ</h5>
                                    <p>Пользователь имеет доступ к демо-версии сайта для ознакомления с функционалом</p>
                                </div>
                            </div>
                        </div>

                        <div class="modal-actions">
                            <button class="btn btn-outline" id="closeVerificationNotPassedModal">
                                <i class="fas fa-times"></i>
                                Закрыть
                            </button>
                            <button class="btn btn-primary" id="goToChatFromNotPassedModal">
                                <i class="fas fa-comment-dots"></i>
                                Написать пользователю
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Добавляем модальное окно в DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Инициализируем обработчики для модального окна
        this.initVerificationNotPassedModalHandlers();
    }

    initVerificationNotPassedModalHandlers() {
        const modal = document.getElementById('verificationNotPassedModal');
        const closeBtn = document.getElementById('closeVerificationNotPassedModal');
        const chatBtn = document.getElementById('goToChatFromNotPassedModal');
        const modalClose = modal.querySelector('.modal-close');

        // Закрытие модалки
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        if (modalClose) {
            modalClose.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        // Переход в чат
        if (chatBtn) {
            chatBtn.addEventListener('click', () => {
                const currentUserId = modal.dataset.currentUserId;
                this.openChatById(currentUserId);
                modal.style.display = 'none';
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
    }

    showVerificationNotPassedModal(userId) {
        const user = usersData.find(u => u.id == userId);
        if (!user) return;

        const modal = document.getElementById('verificationNotPassedModal');
        const contactInfoGrid = document.getElementById('contactInfoGrid');

        // Сохраняем ID текущего пользователя
        modal.dataset.currentUserId = userId;

        // Заполняем контактные данные
        if (contactInfoGrid) {
            contactInfoGrid.innerHTML = `
                <div class="contact-item">
                    <div class="contact-icon">
                        <i class="fas fa-envelope"></i>
                    </div>
                    <div class="contact-details">
                        <div class="contact-label">Email</div>
                        <div class="contact-value">${user.email || 'Не указан'}</div>
                    </div>
                    <button class="contact-copy-btn" onclick="copyToClipboard('${user.email || ''}')" title="Копировать email">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
                <div class="contact-item">
                    <div class="contact-icon">
                        <i class="fas fa-phone"></i>
                    </div>
                    <div class="contact-details">
                        <div class="contact-label">Телефон</div>
                        <div class="contact-value">${user.phone || 'Не указан'}</div>
                    </div>
                    <button class="contact-copy-btn" onclick="copyToClipboard('${user.phone || ''}')" title="Копировать телефон">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            `;
        }

        // Показываем модальное окно
        modal.style.display = 'block';
    }

    createPersonalDataHTML(personalData) {
        const fields = [
            { label: 'Фамилия', value: personalData.lastName, key: 'lastName' },
            { label: 'Имя', value: personalData.firstName, key: 'firstName' },
            { label: 'Отчество', value: personalData.middleName, key: 'middleName' },
            { label: 'Дата рождения', value: personalData.birthDate, key: 'birthDate' },
            { label: 'Почта', value: personalData.email, key: 'email' }
        ];

        return fields.map(field => `
            <div class="data-item">
                <div class="data-label">${field.label}</div>
                <div class="data-value ${!field.value ? 'empty' : ''}">
                    ${field.value || '<span class="missing">Отсутствует</span>'}
                </div>
            </div>
        `).join('');
    }

    createOrganizationDataHTML(organizationData) {
        const fields = [
            { label: 'ИНН', value: organizationData.inn, key: 'inn' },
            { label: 'ОГРНИП', value: organizationData.ogrnip, key: 'ogrnip' },
            { label: 'Название организации', value: organizationData.companyName, key: 'companyName' },
            { label: 'Юридический адрес', value: organizationData.legalAddress, key: 'legalAddress' },
            { label: 'Наименование банка', value: organizationData.bankName, key: 'bankName' },
            { label: 'БИК', value: organizationData.bik, key: 'bik' },
            { label: 'Корреспондентский счет', value: organizationData.correspondentAccount, key: 'correspondentAccount' },
            { label: 'Расчетный счет', value: organizationData.paymentAccount, key: 'paymentAccount' }
        ];

        return fields.map(field => `
            <div class="data-item">
                <div class="data-label">${field.label}</div>
                <div class="data-value ${!field.value ? 'empty' : ''}">
                    ${field.value || '<span class="missing">Отсутствует</span>'}
                </div>
            </div>
        `).join('');
    }

    openChatById(userId) {
        const user = usersData.find(u => u.id == userId);
        if (user) {
            console.log(`Открыть чат с пользователем: ${user.name} (ID: ${userId})`);
            // Здесь будет логика открытия чата
            alert(`Открытие чата с ${user.name}`);
        }
    }
}

// Глобальная функция для копирования в буфер обмена
function copyToClipboard(text) {
    if (!text) {
        showNotification('Нечего копировать', 'warning');
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Скопировано в буфер обмена', 'success');
    }).catch(err => {
        console.error('Ошибка при копировании:', err);
        showNotification('Ошибка при копировании', 'error');
    });
}

// Функция для показа уведомлений
function showNotification(message, type = 'info') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Добавляем стили
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 500;
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
    `;
    
    // Добавляем в DOM
    document.body.appendChild(notification);
    
    // Удаляем через 3 секунды
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Добавляем анимации для уведомлений
if (!document.querySelector('#notification-animations')) {
    const style = document.createElement('style');
    style.id = 'notification-animations';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Функции для управления пользователем
function initUserDropdown() {
    const userAvatar = document.getElementById('userAvatar');
    const userDropdown = document.getElementById('userDropdown');
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutConfirmModal = document.getElementById('logoutConfirmModal');
    const cancelLogout = document.getElementById('cancelLogout');
    const confirmLogout = document.getElementById('confirmLogout');

    if (!userAvatar || !userDropdown) return;

    // Данные пользователя получаются с сервера через Django context
    const userNameElement = document.getElementById('headerUserName');
    const userRoleElement = document.getElementById('headerUserRole');
    
    // Если элементы существуют, можно установить значения из шаблона Django
    if (userNameElement && userNameElement.dataset.userName) {
        userNameElement.textContent = userNameElement.dataset.userName;
    }
    if (userRoleElement && userRoleElement.dataset.userRole) {
        userRoleElement.textContent = userRoleElement.dataset.userRole;
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
    // Используем функцию logout из total_post.js
    if (typeof logout === 'function') {
        logout();
    } else {
        // Fallback - очищаем localStorage вручную
        const CACHE_KEYS = {
            ACCESS_TOKEN: 'accessToken',
            REFRESH_TOKEN: 'refreshToken',
            USER_ROLE: 'role',
            USER_INFO: 'user_info',
            LAST_TOKEN_CHECK: 'lastTokenCheck'
        };
        
        Object.values(CACHE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    }
    
    // Перенаправляем на главную страницу (как в main приложении)
    window.location.href = '/';
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация страницы верификации
    new VerificationPage();
    
    // Инициализация выпадающего меню пользователя
    initUserDropdown();
    
    // Добавляем обработчик для кнопки "Назад"
    const backButton = document.querySelector('.btn-back');
    if (backButton) {
        backButton.addEventListener('click', function() {
            window.location.href = '/main/';
        });
    }
});
