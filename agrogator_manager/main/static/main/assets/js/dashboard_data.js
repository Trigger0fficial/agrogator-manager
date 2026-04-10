// Основной объект с данными дашборда
const dashboardData = {
    // Статистика
    statistics: {
        farmers: {
            count: 147,
            trend: '+12 за месяц',
            trendType: 'positive'
        },
        exporters: {
            count: 63,
            trend: '+5 за месяц',
            trendType: 'positive'
        },
        deals: {
            count: 892,
            trend: '+24 за неделю',
            trendType: 'positive'
        },
        soldGoods: {
            count: '15,840',
            unit: 'т',
            trend: '+420 т за неделю',
            trendType: 'positive'
        }
    },

    // Быстрые действия (url — ссылка на страницу для перехода)
    quickActions: [
        { id: 1, icon: 'user-plus', text: 'Новые участники', badge: 5, url: '/verification/list/' },
        { id: 2, icon: 'flask', text: 'Проверка качества', badge: 12, url: '/verification/list_quality/' },
        { id: 3, icon: 'comments', text: 'Индивидуальные запросы', badge: 3 },
        { id: 4, icon: 'handshake', text: 'Мои сделки', badge: 7, url: '/order/my-deals/' },
        { id: 5, icon: 'exclamation-triangle', text: 'Форс-мажоры', badge: 1 },
        { id: 6, icon: 'box-open', text: 'Мои лоты', badge: 4, url: '/order/my-lots/' }
    ],

    // Участники
    participants: {
        farmers: [
            {
                id: 1,
                name: 'Петров Сергей Иванович',
                avatar: 'https://i.pravatar.cc/80?img=32',
                status: 'online',
                verification: 'verified',
                inn: '987654321012',
                company: '"Золотые нивы"',
                email: 'petrov@agro.ru',
                phone: '+7 (912) 555-44-33',
                registrationDate: '10.04.2023',
                points: 3,
                crops: 2,
                deals: 9,
                requests: 5,
                alerts: [
                    { type: 'warning', text: 'Ожидает подтверждения документов' }
                ],
                // Неполные данные для демонстрации
                hasInn: true,
                hasCompany: true,
                hasEmail: true,
                hasPhone: true
            },
            {
                id: 2,
                name: 'Иванов Алексей Петрович',
                avatar: 'https://i.pravatar.cc/80?img=33',
                status: 'online',
                verification: 'verified',
                inn: '987654321013',
                company: '"Восход"',
                email: 'ivanov@agro.ru',
                phone: '+7 (912) 666-55-44',
                registrationDate: '15.03.2023',
                points: 2,
                crops: 1,
                deals: 6,
                requests: 3,
                alerts: [],
                // Неполные данные
                hasInn: true,
                hasCompany: true,
                hasEmail: false, // Нет email
                hasPhone: true
            }
        ],
        exporters: [
            {
                id: 1,
                name: 'Сидоров Алексей Владимирович',
                avatar: 'https://i.pravatar.cc/80?img=45',
                status: 'online',
                verification: 'verified',
                inn: '123987654321',
                company: 'EuroGrain Trading',
                email: 'sidorov@eurograin.com',
                phone: '+7 (912) 777-88-99',
                registrationDate: '05.05.2023',
                directions: 8,
                crops: 6,
                deals: 25,
                requests: 7,
                alerts: [],
                hasInn: true,
                hasCompany: true,
                hasEmail: true,
                hasPhone: true
            },
            {
                id: 2,
                name: 'Козлова Мария Игоревна',
                avatar: 'https://i.pravatar.cc/80?img=46',
                status: 'online',
                verification: 'pending',
                inn: '123987654322',
                company: 'AgroTrade International',
                email: 'kozlov@agrotrade.com',
                phone: '+7 (912) 888-99-00',
                registrationDate: '12.06.2023',
                directions: 5,
                crops: 4,
                deals: 18,
                requests: 4,
                alerts: [
                    { type: 'urgent', text: 'Требуется срочная верификация' }
                ],
                // Неполные данные
                hasInn: false, // Нет ИНН
                hasCompany: true,
                hasEmail: true,
                hasPhone: false // Нет телефона
            }
        ]
    },

    // Сделки
    deals: [
        {
            id: 'DEAL-4832',
            status: 'active',
            farmer: {
                company: 'ООО "Нива"',
                location: 'с. Новопавловка, склад №2'
            },
            exporter: {
                company: 'Global Grain Corp.',
                location: 'г. Новороссийск, порт'
            },
            distance: '1,250 км',
            crop: {
                name: 'Пшеница 3 класс',
                volume: '500 т',
                iconColor: 'linear-gradient(135deg, #f59e0b, #d97706)'
            },
            timeline: '15.10.2023 - 25.10.2023',
            metrics: {
                cost: '5,840,000 ₽',
                vat: '20%',
                logistics: 'С места'
            },
            transport: {
                required: true,
                vehicles: 8,
                status: 'required'
            },
            progress: 65,
            hasDocuments: true,
            hasTransportAlert: true
        },
        {
            id: 'DEAL-4831',
            status: 'search',
            farmer: {
                company: 'КФХ "Восход"',
                location: 'с. Красное, элеватор'
            },
            exporter: {
                company: 'AgroTrade Ltd.',
                location: 'г. Ростов-на-Дону, порт'
            },
            distance: '890 км',
            crop: {
                name: 'Ячмень пивоваренный',
                volume: '350 т',
                iconColor: 'linear-gradient(135deg, #10b981, #059669)'
            },
            timeline: '18.10.2023 - 28.10.2023',
            metrics: {
                cost: '3,250,000 ₽',
                vat: '20%',
                logistics: 'До двери'
            },
            transport: {
                required: true,
                vehicles: 6,
                status: 'search'
            },
            progress: 30,
            hasDocuments: false, // Нет документооборота
            hasTransportAlert: true
        },
        {
            id: 'DEAL-4830',
            status: 'work',
            farmer: {
                company: 'ООО "Зернотрейд"',
                location: 'с. Белое, склад №3'
            },
            exporter: {
                company: 'EuroGrain AG',
                location: 'г. Таганрог, порт'
            },
            distance: '1,100 км',
            crop: {
                name: 'Пшеница 4 класс',
                volume: '420 т',
                iconColor: 'linear-gradient(135deg, #f59e0b, #d97706)'
            },
            timeline: '12.10.2023 - 22.10.2023',
            metrics: {
                cost: '4,150,000 ₽',
                vat: '20%',
                logistics: 'С места'
            },
            transport: {
                required: false,
                vehicles: 5,
                status: 'working'
            },
            progress: 45,
            hasDocuments: true,
            hasTransportAlert: false // Нет алерта транспорта
        }
    ],

    // Модальные данные
    modals: {
        points: [
            {
                id: 'POINT-12345',
                name: 'Склад №1 "Центральный"',
                address: 'с. Новопавловка, ул. Центральная, 15'
            },
            {
                id: 'POINT-12346',
                name: 'Элеватор "Южный"',
                address: 'с. Новопавловка, ул. Южная, 8'
            }
        ],
        crops: [
            {
                id: 'CROP-78901',
                name: 'Пшеница 1 класс 15.5'
            },
            {
                id: 'CROP-78902',
                name: 'Ячмень пивоваренный'
            }
        ],
        requests: [
            {
                id: 'REQUEST-45678',
                cropName: 'Пшеница 1 класс 15.5',
                deliveryPeriod: '20.10.2023 - 30.10.2023',
                volume: '300 т',
                loadingPoint: 'Склад №1 "Центральный"',
                creationDate: '15.10.2023 14:30'
            },
            {
                id: 'REQUEST-45679',
                cropName: 'Ячмень пивоваренный',
                deliveryPeriod: '25.10.2023 - 05.11.2023',
                volume: '450 т',
                loadingPoint: 'Элеватор "Южный"',
                creationDate: '16.10.2023 10:15'
            }
        ],
        individualRequests: [
            {
                id: 'REQ-78901',
                cropName: 'Пшеница 3 класс',
                farmersCount: 8,
                location: 'с. Новопавловка, склад №2',
                volume: '500 т',
                createdDate: '18.10.2023'
            },
            {
                id: 'REQ-78902',
                cropName: 'Кукуруза фуражная',
                farmersCount: 12,
                location: 'г. Ростов-на-Дону, порт',
                volume: '750 т',
                createdDate: '19.10.2023'
            }
        ],
        deals: [
            {
                name: 'Пшеница 3 класс → Global Grain Corp.',
                status: 'active',
                crop: 'Пшеница 3 класс',
                buyer: 'Global Grain Corp.',
                period: '15.10.2023 - 25.10.2023',
                volume: '500 т',
                cost: '5,840,000 ₽',
                loading: 'с. Новопавловка, склад №2',
                unloading: 'г. Новороссийск, порт',
                distance: '1,250 км'
            }
        ],
        documents: [
            {
                name: 'Договор поставки №123',
                date: 'от 10.10.2023',
                status: 'signed'
            },
            {
                name: 'Счет на оплату №456',
                date: 'от 12.10.2023',
                status: 'pending'
            },
            {
                name: 'Акт приемки №789',
                date: 'от 15.10.2023',
                status: 'rejected'
            }
        ],
        transport: [
            {
                model: 'MAN TGS 18.400',
                number: 'А123БВ 777',
                capacity: '20 т',
                status: 'В пути'
            },
            {
                model: 'Volvo FH 540',
                number: 'О456МН 777',
                capacity: '22 т',
                status: 'Загрузка'
            }
        ]
    }
};

// Функции для работы с данными
const DashboardManager = {
    // Инициализация дашборда
    init() {
        this.renderStatistics();
        this.renderQuickActions();
        this.renderParticipants();
        this.renderDeals();
        this.bindEvents();
    },

    // Рендер статистики
    renderStatistics() {
        const stats = dashboardData.statistics;
        const statsGrid = document.querySelector('.stats-grid');

        if (!statsGrid) return;

        const statsHTML = `
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-user-farmer"></i>
                </div>
                <div class="stat-content">
                    <h3>Фермеры</h3>
                    <p class="stat-number">${stats.farmers.count}</p>
                    <span class="stat-trend ${stats.farmers.trendType}">${stats.farmers.trend}</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-globe"></i>
                </div>
                <div class="stat-content">
                    <h3>Экспортеры</h3>
                    <p class="stat-number">${stats.exporters.count}</p>
                    <span class="stat-trend ${stats.exporters.trendType}">${stats.exporters.trend}</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-file-contract"></i>
                </div>
                <div class="stat-content">
                    <h3>Заключено сделок</h3>
                    <p class="stat-number">${stats.deals.count}</p>
                    <span class="stat-trend ${stats.deals.trendType}">${stats.deals.trend}</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-weight-hanging"></i>
                </div>
                <div class="stat-content">
                    <h3>Продано товаров</h3>
                    <p class="stat-number">${stats.soldGoods.count} <small>${stats.soldGoods.unit}</small></p>
                    <span class="stat-trend ${stats.soldGoods.trendType}">${stats.soldGoods.trend}</span>
                </div>
            </div>
        `;

        statsGrid.innerHTML = statsHTML;
    },

    // Рендер быстрых действий
    renderQuickActions() {
        const actionsGrid = document.querySelector('.quick-actions-grid');

        if (!actionsGrid) return;

        const actionsHTML = dashboardData.quickActions.map(action => {
            const url = action.url || '';
            if (url) {
                return `<a href="${url}" class="action-btn" data-action="${action.id}" data-url="${url}">
                    <div class="action-icon">
                        <i class="fas fa-${action.icon}"></i>
                    </div>
                    <span class="action-text">${action.text}</span>
                    <span class="badge">${action.badge}</span>
                </a>`;
            }
            return `<button class="action-btn" data-action="${action.id}">
                <div class="action-icon">
                    <i class="fas fa-${action.icon}"></i>
                </div>
                <span class="action-text">${action.text}</span>
                <span class="badge">${action.badge}</span>
            </button>`;
        }).join('');

        actionsGrid.innerHTML = actionsHTML;
    },

    // Рендер участников
    renderParticipants() {
        const slider = document.querySelector('.participants-slider');
        if (!slider) return;

        // Обновляем счетчики
        this.updateParticipantCounts();

        // Рендерим карточки
        const allParticipants = [
            ...dashboardData.participants.farmers.map(p => ({ ...p, type: 'farmer' })),
            ...dashboardData.participants.exporters.map(p => ({ ...p, type: 'exporter' }))
        ];

        const participantsHTML = allParticipants.map(participant => `
            <div class="participant-card" data-type="${participant.type}" data-id="${participant.id}">
                <div class="card-background">
                    <div class="bg-shape shape-1"></div>
                    <div class="bg-shape shape-2"></div>
                </div>
                <div class="card-header">
                    <div class="user-main">
                        <div class="user-avatar">
                            <img src="${participant.avatar}" alt="${participant.name}">
                            <div class="status-indicator ${participant.status}"></div>
                        </div>
                        <div class="user-info">
                            <h3>${participant.name}</h3>
                            <span class="verification-status ${participant.verification}">
                                <i class="fas fa-${participant.verification === 'verified' ? 'check-circle' : 'clock'}"></i>
                                ${participant.verification === 'verified' ? 'Верификация пройдена' : 'На проверке'}
                            </span>
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="icon-btn" title="Написать сообщение">
                            <i class="fas fa-comment-dots"></i>
                        </button>
                        <button class="icon-btn" title="Перейти в профиль">
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                    </div>
                </div>

                <div class="card-content">
                    <div class="info-grid">
                        <div class="info-group">
                            ${participant.hasInn ? `
                                <div class="info-item">
                                    <i class="fas fa-fingerprint"></i>
                                    <div>
                                        <span class="info-label">ИНН</span>
                                        <span class="info-value">${participant.inn}</span>
                                    </div>
                                </div>
                            ` : '<div class="info-item empty">Нет данных ИНН</div>'}

                            ${participant.hasCompany ? `
                                <div class="info-item">
                                    <i class="fas fa-building"></i>
                                    <div>
                                        <span class="info-label">Компания</span>
                                        <span class="info-value">${participant.company}</span>
                                    </div>
                                </div>
                            ` : '<div class="info-item empty">Нет данных компании</div>'}
                        </div>
                        <div class="info-group">
                            ${participant.hasEmail ? `
                                <div class="info-item">
                                    <i class="fas fa-envelope"></i>
                                    <div>
                                        <span class="info-label">Email</span>
                                        <span class="info-value">${participant.email}</span>
                                    </div>
                                </div>
                            ` : '<div class="info-item empty">Нет email</div>'}

                            ${participant.hasPhone ? `
                                <div class="info-item">
                                    <i class="fas fa-phone"></i>
                                    <div>
                                        <span class="info-label">Телефон</span>
                                        <span class="info-value">${participant.phone}</span>
                                    </div>
                                </div>
                            ` : '<div class="info-item empty">Нет телефона</div>'}
                        </div>
                    </div>

                    <div class="additional-info">
                        <div class="info-item">
                            <i class="fas fa-calendar-alt"></i>
                            <div>
                                <span class="info-label">Дата регистрации</span>
                                <span class="info-value">${participant.registrationDate}</span>
                            </div>
                        </div>
                    </div>

                    <div class="card-stats">
                        <div class="stat" data-modal="points">
                            <div class="stat-icon">
                                <i class="fas fa-map-marker-alt"></i>
                            </div>
                            <div class="stat-content">
                                <span class="stat-value">${participant.type === 'farmer' ? participant.points : participant.directions}</span>
                                <span class="stat-label">${participant.type === 'farmer' ? 'Точек' : 'Направлений'}</span>
                            </div>
                        </div>
                        <div class="stat" data-modal="crops">
                            <div class="stat-icon">
                                <i class="fas fa-seedling"></i>
                            </div>
                            <div class="stat-content">
                                <span class="stat-value">${participant.crops}</span>
                                <span class="stat-label">Культур</span>
                            </div>
                        </div>
                        <div class="stat" data-modal="deals">
                            <div class="stat-icon">
                                <i class="fas fa-handshake"></i>
                            </div>
                            <div class="stat-content">
                                <span class="stat-value">${participant.deals}</span>
                                <span class="stat-label">Сделок</span>
                            </div>
                        </div>
                        <div class="stat" data-modal="${participant.type === 'farmer' ? 'requests' : 'individualRequests'}">
                            <div class="stat-icon">
                                <i class="fas ${participant.type === 'farmer' ? 'fa-tags' : 'fa-search'}"></i>
                            </div>
                            <div class="stat-content">
                                <span class="stat-value">${participant.requests}</span>
                                <span class="stat-label">${participant.type === 'farmer' ? 'Запросы на продажу' : 'Индивидуальные запросы'}</span>
                            </div>
                        </div>
                    </div>

                    ${participant.alerts.length > 0 ? `
                        <div class="quick-alerts">
                            ${participant.alerts.map(alert => `
                                <div class="alert-item ${alert.type}">
                                    <i class="fas fa-${alert.type === 'urgent' ? 'exclamation-triangle' : 'clock'}"></i>
                                    <span>${alert.text}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');

        slider.innerHTML = participantsHTML;

        // Показываем первую карточку
        const firstCard = slider.querySelector('.participant-card');
        if (firstCard) {
            firstCard.classList.add('active');
        }
    },

    // Обновление счетчиков участников
    updateParticipantCounts() {
        const farmerBtn = document.querySelector('.toggle-btn[data-type="farmer"]');
        const exporterBtn = document.querySelector('.toggle-btn[data-type="exporter"]');

        if (farmerBtn) {
            const farmerCount = farmerBtn.querySelector('.toggle-count');
            farmerCount.textContent = dashboardData.participants.farmers.length;
        }

        if (exporterBtn) {
            const exporterCount = exporterBtn.querySelector('.toggle-count');
            exporterCount.textContent = dashboardData.participants.exporters.length;
        }
    },

    // Рендер сделок (пропускаем, если на странице блок с API-сделками — главная с реальными сделками)
    renderDeals() {
        if (document.getElementById('loadingState')) return;
        const dealsGrid = document.querySelector('.deals-grid');
        if (!dealsGrid) return;

        const dealsHTML = dashboardData.deals.map(deal => `
            <div class="deal-card" data-status="${deal.status}" data-id="${deal.id}">
                <div class="deal-badge ${deal.status}">${this.getDealStatusText(deal.status)}</div>
                <div class="deal-header">
                    <span class="deal-id">#${deal.id}</span>
                </div>

                <div class="deal-parties">
                    <div class="party farmer">
                        <div class="party-avatar">
                            <i class="fas fa-tractor"></i>
                        </div>
                        <div class="party-info">
                            <span class="party-role">Фермер</span>
                            <span class="company-name">${deal.farmer.company}</span>
                            <span class="location">
                                <i class="fas fa-map-marker-alt"></i>
                                ${deal.farmer.location}
                            </span>
                        </div>
                    </div>

                    <div class="deal-route">
                        <div class="route-line"></div>
                        <div class="route-icon">
                            <i class="fas fa-shipping-fast"></i>
                        </div>
                        <div class="route-distance">${deal.distance}</div>
                    </div>

                    <div class="party exporter">
                        <div class="party-avatar">
                            <i class="fas fa-globe"></i>
                        </div>
                        <div class="party-info">
                            <span class="party-role">Экспортер</span>
                            <span class="company-name">${deal.exporter.company}</span>
                            <span class="location">
                                <i class="fas fa-map-marker-alt"></i>
                                ${deal.exporter.location}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="deal-details">
                    <div class="detail-main">
                        <div class="crop-info">
                            <div class="crop-icon" style="background: ${deal.crop.iconColor};">
                                <i class="fas fa-${deal.crop.name.includes('Пшеница') ? 'wheat' : 'seedling'}"></i>
                            </div>
                            <div>
                                <span class="crop-name">${deal.crop.name}</span>
                                <span class="crop-volume">${deal.crop.volume}</span>
                            </div>
                        </div>
                        <div class="timeline">
                            <i class="fas fa-calendar"></i>
                            <span>${deal.timeline}</span>
                        </div>
                    </div>

                    <div class="deal-metrics">
                        <div class="metric">
                            <span class="metric-label">Стоимость</span>
                            <span class="metric-value">${deal.metrics.cost}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">НДС</span>
                            <span class="metric-value">${deal.metrics.vat}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Логистика</span>
                            <span class="metric-value">${deal.metrics.logistics}</span>
                        </div>
                    </div>

                    ${deal.hasTransportAlert ? `
                        <div class="transport-alert ${deal.transport.status === 'working' ? 'working' : ''}">
                            <div class="alert-content">
                                <i class="fas fa-${deal.transport.status === 'working' ? 'truck-moving' : 'truck-loading'}"></i>
                                <div>
                                    <span class="alert-title">${this.getTransportAlertTitle(deal.transport.status)}</span>
                                    <span class="alert-desc">${this.getTransportAlertDesc(deal.transport)}</span>
                                </div>
                            </div>
                            <button class="btn-${deal.transport.status === 'required' ? 'alert' : 'details'}" data-modal="transport">
                                <i class="fas fa-${deal.transport.status === 'required' ? 'plus' : 'eye'}"></i>
                                ${deal.transport.status === 'required' ? 'Найти' : 'Подробнее'}
                            </button>
                        </div>
                    ` : ''}
                </div>

                <div class="deal-actions">
                    <button class="btn btn-secondary" ${!deal.hasDocuments ? 'disabled' : ''} data-modal="documents">
                        <i class="fas fa-file-contract"></i> Документооборот
                        ${!deal.hasDocuments ? ' (нет)' : ''}
                    </button>
                    <button class="btn btn-primary">
                        <i class="fas fa-external-link-alt"></i> Перейти к сделке
                    </button>
                </div>
            </div>
        `).join('');

        dealsGrid.innerHTML = dealsHTML;
    },

    // Вспомогательные методы
    getDealStatusText(status) {
        const statusMap = {
            'active': 'Активная',
            'search': 'Поиск машин',
            'work': 'В работе',
            'completed': 'Завершенная'
        };
        return statusMap[status] || status;
    },

    getTransportAlertTitle(status) {
        const titleMap = {
            'required': 'Требуется транспорт',
            'search': 'Требуется транспорт',
            'working': 'Транспорт в работе'
        };
        return titleMap[status] || 'Транспорт';
    },

    getTransportAlertDesc(transport) {
        if (transport.status === 'working') {
            return `${transport.vehicles} машин в пути`;
        }
        return `${transport.vehicles} машин <span class="warning">!</span>`;
    },

    // Биндинг событий
    bindEvents() {
        this.bindParticipantEvents();
        this.bindDealEvents();
        this.bindModalEvents();
    },

    bindParticipantEvents() {
        // Переключение между фермерами и экспортерами
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;

                // Обновляем активную кнопку
                document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');

                // Фильтруем карточки
                this.filterParticipants(type);
            });
        });

        // Навигация слайдера
        document.querySelector('.prev-btn')?.addEventListener('click', () => this.navigateSlider(-1));
        document.querySelector('.next-btn')?.addEventListener('click', () => this.navigateSlider(1));

        // Клик по статистике участника
        document.addEventListener('click', (e) => {
            const stat = e.target.closest('.card-stats .stat');
            if (stat) {
                const modalType = stat.dataset.modal;
                this.openModal(modalType);
            }
        });
    },

    bindDealEvents() {
        // Фильтрация сделок
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const status = e.currentTarget.dataset.status;

                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');

                this.filterDeals(status);
            });
        });
    },

    bindModalEvents() {
        // Закрытие модальных окон
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.closeModal(modal);
            });
        });

        // Закрытие по клику вне модального окна
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });

        // Аккордеоны
        document.addEventListener('click', (e) => {
            const accordionHeader = e.target.closest('.accordion-header');
            if (accordionHeader) {
                const accordionItem = accordionHeader.parentElement;
                accordionItem.classList.toggle('active');
            }
        });
    },

    // Методы для работы со слайдером участников
    filterParticipants(type) {
        const cards = document.querySelectorAll('.participant-card');
        const visibleCards = Array.from(cards).filter(card => card.dataset.type === type);

        cards.forEach(card => card.classList.remove('active'));
        if (visibleCards.length > 0) {
            visibleCards[0].classList.add('active');
        }

        this.updateSliderCounter();
    },

    navigateSlider(direction) {
        const activeCard = document.querySelector('.participant-card.active');
        if (!activeCard) return;

        const type = activeCard.dataset.type;
        const cards = Array.from(document.querySelectorAll(`.participant-card[data-type="${type}"]`));
        const currentIndex = cards.indexOf(activeCard);
        const nextIndex = (currentIndex + direction + cards.length) % cards.length;

        activeCard.classList.remove('active');
        cards[nextIndex].classList.add('active');

        this.updateSliderCounter();
    },

    updateSliderCounter() {
        const activeCard = document.querySelector('.participant-card.active');
        if (!activeCard) return;

        const type = activeCard.dataset.type;
        const cards = Array.from(document.querySelectorAll(`.participant-card[data-type="${type}"]`));
        const currentIndex = cards.indexOf(activeCard) + 1;
        const total = cards.length;

        const currentSlide = document.querySelector('.current-slide');
        const totalSlides = document.querySelector('.total-slides');

        if (currentSlide) currentSlide.textContent = currentIndex;
        if (totalSlides) totalSlides.textContent = total;
    },

    // Методы для фильтрации сделок
    filterDeals(status) {
        const cards = document.querySelectorAll('.deal-card');

        cards.forEach(card => {
            if (status === 'all' || card.dataset.status === status) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    },

    // Методы для работы с модальными окнами
    openModal(modalType) {
        const modal = document.getElementById(`${modalType}Modal`);
        if (modal) {
            this.renderModalContent(modalType);
            modal.style.display = 'block';
        }
    },

    closeModal(modal) {
        if (modal) {
            modal.style.display = 'none';
        }
    },

    renderModalContent(modalType) {
        const modalData = dashboardData.modals[modalType];
        if (!modalData) return;

        const modal = document.getElementById(`${modalType}Modal`);
        if (!modal) return;

        // Здесь можно добавить рендеринг специфичного контента для каждого модального окна
        console.log(`Rendering ${modalType} modal with data:`, modalData);
    }
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    DashboardManager.init();
});