// Полные данные пользователей для верификации
const usersData = [
    {
        id: 1,
        name: "Петров Сергей Иванович",
        company: "ООО 'Золотые нивы'",
        avatar: "https://i.pravatar.cc/150?img=32",
        email: "petrov@agro.ru",
        phone: "+7 (912) 555-44-33",
        registrationDate: "15.03.2023",
        status: "waiting",
        role: "farmer",
        inn: "123456789012",
        // Данные для статуса "не подписан"
        personalData: {
            lastName: "Петров",
            firstName: "Сергей",
            middleName: "Иванович",
            birthDate: "15.08.1985",
            email: "petrov@agro.ru"
        },
        organizationData: {
            inn: "123456789012",
            ogrnip: "", // не заполнено
            companyName: "ООО 'Золотые нивы'",
            legalAddress: "", // не заполнено
            bankName: "ПАО 'Сбербанк'",
            bik: "044525225",
            correspondentAccount: "30101810400000000225",
            paymentAccount: "40817810099910004312"
        }
    },
    {
        id: 2,
        name: "Иванов Алексей Петрович",
        company: "КФХ 'Восход'",
        avatar: "https://i.pravatar.cc/150?img=33",
        email: "ivanov@agro.ru",
        phone: "+7 (912) 666-55-44",
        registrationDate: "20.02.2023",
        status: "not-started",
        role: "farmer",
        inn: "234567890123",
        personalData: {
            lastName: "Иванов",
            firstName: "Алексей",
            middleName: "Петрович",
            birthDate: "",
            email: "ivanov@agro.ru"
        },
        organizationData: {
            inn: "234567890123",
            ogrnip: "",
            companyName: "КФХ 'Восход'",
            legalAddress: "",
            bankName: "",
            bik: "",
            correspondentAccount: "",
            paymentAccount: ""
        }
    },
    {
        id: 3,
        name: "Сидоров Алексей Владимирович",
        company: "EuroGrain Trading",
        avatar: "https://i.pravatar.cc/150?img=45",
        email: "sidorov@eurograin.com",
        phone: "+7 (912) 777-88-99",
        registrationDate: "10.04.2023",
        status: "accepted",
        role: "exporter",
        inn: "345678901234"
    },
    {
        id: 4,
        name: "Козлова Мария Игоревна",
        company: "AgroTrade International",
        avatar: "https://i.pravatar.cc/150?img=46",
        email: "kozlov@agrotrade.com",
        phone: "+7 (912) 888-99-00",
        registrationDate: "05.05.2023",
        status: "rejected",
        role: "exporter",
        inn: "456789012345"
    },
    {
        id: 5,
        name: "Николаев Дмитрий Сергеевич",
        company: "ООО 'АгроПром'",
        avatar: "https://i.pravatar.cc/150?img=15",
        email: "nikolaev@agroprom.ru",
        phone: "+7 (912) 333-22-11",
        registrationDate: "12.01.2023",
        status: "not-signed",
        role: "farmer",
        inn: "567890123456",
        personalData: {
            lastName: "Николаев",
            firstName: "Дмитрий",
            middleName: "Сергеевич",
            birthDate: "20.05.1980",
            email: "nikolaev@agroprom.ru"
        },
        organizationData: {
            inn: "567890123456",
            ogrnip: "",
            companyName: "ООО 'АгроПром'",
            legalAddress: "",
            bankName: "Альфа-Банк",
            bik: "044525593",
            correspondentAccount: "",
            paymentAccount: "40702810000000012345"
        }
    },
    {
        id: 6,
        name: "Орлова Анна Викторовна",
        company: "Фермерское хозяйство 'Рассвет'",
        avatar: "https://i.pravatar.cc/150?img=28",
        email: "orlova@rassvet.ru",
        phone: "+7 (912) 444-33-22",
        registrationDate: "18.06.2023",
        status: "waiting",
        role: "farmer",
        inn: "678901234567"
    },
    {
        id: 7,
        name: "Громов Павел Александрович",
        company: "ИП 'Громов'",
        avatar: "https://i.pravatar.cc/150?img=19",
        email: "gromov@ip.ru",
        phone: "+7 (912) 999-88-77",
        registrationDate: "22.03.2023",
        status: "not-started",
        role: "exporter",
        inn: "789012345678"
    },
    {
        id: 8,
        name: "Волкова Елена Дмитриевна",
        company: "ООО 'Зерновая компания'",
        avatar: "https://i.pravatar.cc/150?img=52",
        email: "volkova@zk.ru",
        phone: "+7 (912) 111-22-33",
        registrationDate: "30.04.2023",
        status: "waiting",
        role: "exporter",
        inn: "890123456789"
    },
    {
        id: 9,
        name: "Федоров Игорь Васильевич",
        company: "СХП 'Нива'",
        avatar: "https://i.pravatar.cc/150?img=23",
        email: "fedorov@niva.ru",
        phone: "+7 (912) 222-33-44",
        registrationDate: "08.07.2023",
        status: "accepted",
        role: "farmer",
        inn: "901234567890"
    },
    {
        id: 10,
        name: "Морозова Светлана Петровна",
        company: "Global Agro Export",
        avatar: "https://i.pravatar.cc/150?img=61",
        email: "morozova@globalagro.com",
        phone: "+7 (912) 555-66-77",
        registrationDate: "25.05.2023",
        status: "not-signed",
        role: "exporter",
        inn: "012345678901",
        personalData: {
            lastName: "Морозова",
            firstName: "Светлана",
            middleName: "Петровна",
            birthDate: "12.11.1978",
            email: "morozova@globalagro.com"
        },
        organizationData: {
            inn: "012345678901",
            ogrnip: "",
            companyName: "Global Agro Export",
            legalAddress: "",
            bankName: "ВТБ",
            bik: "044525187",
            correspondentAccount: "30101810700000000187",
            paymentAccount: ""
        }
    },
    {
        id: 11,
        name: "Белов Андрей Николаевич",
        company: "КФХ 'Поля России'",
        avatar: "https://i.pravatar.cc/150?img=18",
        email: "belov@polyarus.ru",
        phone: "+7 (912) 777-11-22",
        registrationDate: "14.02.2023",
        status: "rejected",
        role: "farmer",
        inn: "112233445566"
    },
    {
        id: 12,
        name: "Семенова Ольга Викторовна",
        company: "AgriTrading Partners",
        avatar: "https://i.pravatar.cc/150?img=44",
        email: "semenova@agritrading.com",
        phone: "+7 (912) 888-44-55",
        registrationDate: "19.08.2023",
        status: "waiting",
        role: "exporter",
        inn: "223344556677"
    }
];

// Конфигурация статусов верификации
const statusConfig = {
    'not-started': {
        text: 'Не начата',
        class: 'status-not-started',
        icon: 'fas fa-clock'
    },
    'not-signed': {
        text: 'Не подписан',
        class: 'status-not-signed',
        icon: 'fas fa-signature'
    },
    'waiting': {
        text: 'В ожидании',
        class: 'status-waiting',
        icon: 'fas fa-hourglass-half'
    },
    'accepted': {
        text: 'Принята',
        class: 'status-accepted',
        icon: 'fas fa-check-circle'
    },
    'rejected': {
        text: 'Отклонена',
        class: 'status-rejected',
        icon: 'fas fa-times-circle'
    }
};

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

        this.init();
    }

    init() {
        this.hideLoading();
        this.renderUsers();
        this.addEventListeners();
        this.updateFilterCounts();
        this.initNotSignedModal();
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

        // Обработчики для анимированного статуса
        document.addEventListener('mouseover', (e) => {
            if (e.target.closest('.status-indicator')) {
                const indicator = e.target.closest('.status-indicator');
                if (!indicator.classList.contains('expanded')) {
                    indicator.classList.add('expanded');
                }
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (e.target.closest('.status-indicator')) {
                const indicator = e.target.closest('.status-indicator');
                if (indicator.classList.contains('expanded')) {
                    indicator.classList.remove('expanded');
                }
            }
        });

        // Клик по статусу для мобильных устройств
        document.addEventListener('click', (e) => {
            if (e.target.closest('.status-indicator')) {
                const indicator = e.target.closest('.status-indicator');
                indicator.classList.toggle('expanded');
            }
        });
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
        const status = statusConfig[user.status];
        const roleText = user.role === 'farmer' ? 'Фермер' : 'Экспортер';

        return `
            <div class="user-card" data-user-id="${user.id}" data-status="${user.status}" data-role="${user.role}">
                <!-- Анимированный статус в углу -->
                <div class="status-indicator ${user.status}" title="Нажмите для просмотра статуса">
                    <div class="status-content">
                        <i class="${status.icon} status-icon"></i>
                        <span class="status-text">${status.text}</span>
                    </div>
                </div>

                <div class="user-card-header">
                    <div class="user-avatar-container">
                        <div class="user-avatar">
                            <img src="${user.avatar}" alt="${user.name}" onerror="this.src='https://i.pravatar.cc/150?img=1'">
                        </div>
                        <div class="user-main-info">
                            <h3 class="user-name">${user.name}</h3>
                            <p class="user-company">${user.company}</p>
                            <span class="user-role">${roleText}</span>
                        </div>
                    </div>
                </div>

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
                            <div class="info-label">Регистрация</div>
                            <div class="info-value">${user.registrationDate}</div>
                        </div>
                    </div>
                </div>

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

    updateFilterCounts() {
        // Обновляем счетчики для ролей
        const farmerCount = usersData.filter(u => u.role === 'farmer').length;
        const exporterCount = usersData.filter(u => u.role === 'exporter').length;

        const farmerBtn = document.querySelector('[data-role="farmer"] .filter-count');
        const exporterBtn = document.querySelector('[data-role="exporter"] .filter-count');
        const allRolesBtn = document.querySelector('[data-role="all"] .filter-count');

        if (farmerBtn) farmerBtn.textContent = farmerCount;
        if (exporterBtn) exporterBtn.textContent = exporterCount;
        if (allRolesBtn) allRolesBtn.textContent = usersData.length;

        // Обновляем счетчики для статусов
        const statusCounts = {
            'not-started': usersData.filter(u => u.status === 'not-started').length,
            'not-signed': usersData.filter(u => u.status === 'not-signed').length,
            'waiting': usersData.filter(u => u.status === 'waiting').length,
            'accepted': usersData.filter(u => u.status === 'accepted').length,
            'rejected': usersData.filter(u => u.status === 'rejected').length,
            'all': usersData.length
        };

        Object.keys(statusCounts).forEach(status => {
            const element = document.querySelector(`[data-status="${status}"] .filter-count`);
            if (element) {
                element.textContent = statusCounts[status];
            }
        });

        // Обновляем статистику в заголовке
        const totalElement = document.querySelector('.stat-card:nth-child(1) .stat-value');
        const attentionElement = document.querySelector('.stat-card:nth-child(2) .stat-value');
        const activeDealsElement = document.querySelector('.stat-card:nth-child(3) .stat-value');
        const documentsElement = document.querySelector('.stat-card:nth-child(4) .stat-value');

        if (totalElement) totalElement.textContent = usersData.length;
        if (attentionElement) {
            const attentionCount = statusCounts['not-started'] + statusCounts['not-signed'] + statusCounts['waiting'];
            attentionElement.textContent = attentionCount;
        }
        if (activeDealsElement) activeDealsElement.textContent = '8';
        if (documentsElement) {
            // Теперь показываем количество пользователей с ИНН
            const usersWithInn = usersData.filter(user => user.inn).length;
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

        // Определяем страницу для перехода в зависимости от статуса
        let targetPage = 'verification.html'; // по умолчанию

        if (status === 'accepted') {
            targetPage = 'accepted_verification.html';
        } else if (status === 'rejected') {
            targetPage = 'cancel_verification.html';
        } else {
            targetPage = 'verification.html'; // для waiting, not-started
        }

        // Переходим на соответствующую страницу с параметром ID пользователя
        window.location.href = `${targetPage}?id=${userId}`;
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
    // Серверная логика выхода - перенаправление на /logout/
    window.location.href = '/logout/';
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