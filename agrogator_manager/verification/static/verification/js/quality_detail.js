// Класс для работы с детальной страницей культуры
class QualityDetailPage {
    constructor() {
        this.cultureData = null;
        this.farmerData = null;
        this.cropsProperties = null;
        this.cultureId = this.getCultureIdFromTemplate();
        
        // Конфигурация статусов (такая же как в списке)
        this.statusConfig = {
            'checking': {
                text: 'На проверке',
                class: 'status-checking',
                icon: 'fas fa-clock',
                color: '#fd7e14'
            },
            'approved': {
                text: 'Активная',
                class: 'status-approved',
                icon: 'fas fa-check-circle',
                color: '#28a745'
            },
            'rejected': {
                text: 'Требуются правки',
                class: 'status-rejected',
                icon: 'fas fa-exclamation-circle',
                color: '#dc3545'
            }
        };
        
        this.init();
    }

    async init() {
        console.log('Инициализация детальной страницы качества культуры');
        
        // Получаем ID культуры из шаблона Django
        this.cultureId = this.getCultureIdFromTemplate();
        
        if (!this.cultureId) {
            console.error('ID культуры не найден');
            this.showError('ID культуры не указан');
            return;
        }
        
        console.log('ID культуры:', this.cultureId);
        
        // Инициализация обработчиков событий
        this.initEventListeners();
        
        // Загрузка данных
        await this.loadData();
    }

    // Получение ID культуры из шаблона Django
    getCultureIdFromTemplate() {
        // Сначала проверяем window.culture_id (установлено в шаблоне)
        if (window.culture_id && window.culture_id !== 'None') {
            return window.culture_id;
        }
        
        // Ищем скрипт с данными от Django
        const scripts = document.querySelectorAll('script');
        for (let script of scripts) {
            if (script.textContent.includes('culture_id')) {
                const match = script.textContent.match(/culture_id\s*:\s*['"`]([^'"`]+)['"`]/);
                if (match) {
                    return match[1];
                }
            }
        }
        
        // Альтернативный способ - поиск в data-атрибутах
        const body = document.body;
        if (body.dataset.cultureId) {
            return body.dataset.cultureId;
        }
        
        return null;
    }

    initEventListeners() {
        // Кнопка "Назад к списку"
        const backBtn = document.querySelector('.btn-back');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = '/verification/list_quality/';
            });
        }

        // Кнопка "Чат с фермером"
        const chatBtn = document.getElementById('goToChat');
        if (chatBtn) {
            chatBtn.addEventListener('click', () => {
                this.openChat();
            });
        }

        // Кнопка "Подтвердить качество"
        const acceptBtn = document.getElementById('acceptQuality');
        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => {
                this.acceptQuality();
            });
        }

        // Кнопка "Отклонить качество"
        const rejectBtn = document.getElementById('rejectQuality');
        if (rejectBtn) {
            rejectBtn.addEventListener('click', () => {
                this.showRejectionSection();
            });
        }

        // Кнопка "Отмена отклонения"
        const cancelRejectionBtn = document.getElementById('cancelRejection');
        if (cancelRejectionBtn) {
            cancelRejectionBtn.addEventListener('click', () => {
                this.hideRejectionSection();
            });
        }

        // Кнопка "Подтвердить отклонение"
        const confirmRejectionBtn = document.getElementById('confirmRejection');
        if (confirmRejectionBtn) {
            confirmRejectionBtn.addEventListener('click', () => {
                this.confirmRejection();
            });
        }
        
        // Обработчики для модального окна подтверждения
        const cancelRejectionModalBtn = document.getElementById('cancelRejectionModal');
        const confirmRejectionModalBtn = document.getElementById('confirmRejectionModal');
        const modalCloseBtn = document.querySelector('.modal-close');
        
        if (cancelRejectionModalBtn) {
            cancelRejectionModalBtn.addEventListener('click', () => {
                this.closeRejectionConfirmModal();
            });
        }
        
        if (confirmRejectionModalBtn) {
            confirmRejectionModalBtn.addEventListener('click', () => {
                this.executeRejection();
            });
        }
        
        // Закрытие модального окна по клику на крестик
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', () => {
                this.closeRejectionConfirmModal();
            });
        }
        
        // Закрытие модального окна по клику вне его области
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('rejectionConfirmModal');
            if (modal && e.target === modal) {
                this.closeRejectionConfirmModal();
            }
        });
        
        // Обработчики для чекбоксов полей
        this.initFieldCheckboxes();
    }

    // Загрузка всех данных
    async loadData() {
        try {
            this.showLoadingState(true);
            
            // Сначала загружаем данные культуры
            const cultureData = await this.loadCultureData();
            if (!cultureData) {
                throw new Error('Не удалось загрузить данные культуры');
            }
            
            // Сохраняем данные культуры сразу
            this.cultureData = cultureData;
            
            // Затем загружаем данные фермера и свойства в параллели
            const [farmerData, cropsProperties] = await Promise.all([
                this.loadFarmerData(),
                this.loadCropsProperties()
            ]);
            
            if (!farmerData) {
                throw new Error('Не удалось загрузить данные фермера');
            }
            
            if (!cropsProperties) {
                throw new Error('Не удалось загрузить свойства культур');
            }
            
            // Сохраняем остальные данные
            this.farmerData = farmerData;
            this.cropsProperties = cropsProperties;
            
            // Отображаем данные
            this.renderData();
            
        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
            // Показываем ошибку вместо моковых данных
            this.showDataLoadError();
        } finally {
            this.showLoadingState(false);
        }
    }

    // Загрузка данных культуры
    async loadCultureData() {
        const response = await this.makeAuthenticatedRequest(`/moderators-module/crops/by-id/${this.cultureId}`);
        if (!response) {
            throw new Error('Не удалось загрузить данные культуры');
        }
        return response;
    }

    // Загрузка данных фермера
    async loadFarmerData() {
        if (!this.cultureData || !this.cultureData.usersId) {
            throw new Error('Не найден ID фермера');
        }
        
        const farmerId = this.cultureData.usersId;
        const response = await this.makeAuthenticatedRequest(`/moderators-module/all-by-farmer?id=${farmerId}`);
        if (!response) {
            throw new Error('Не удалось загрузить данные фермера');
        }
        return response;
    }

    // Загрузка свойств культур
    async loadCropsProperties() {
        const response = await this.makeAuthenticatedRequest('/farmer/crops/all-relations');
        if (!response || !response.cropsProperty) {
            throw new Error('Не удалось загрузить свойства культур');
        }
        return response.cropsProperty;
    }

    // Функция для выполнения аутентифицированных запросов
    async makeAuthenticatedRequest(url, options = {}) {
        try {
            const headers = await this.getAuthHeaders();
            if (!headers) {
                console.log('Нет токена авторизации');
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

    // Отображение всех данных
    renderData() {
        // Проверяем, есть ли данные для отображения
        if (!this.cultureData || !this.farmerData || !this.cropsProperties) {
            this.showDataLoadError();
            return;
        }
        
        // Показываем информационное окно статуса если нужно
        this.showStatusInfoWindow();
        // Кнопки «Подтвердить»/«Отклонить» показываем только когда ни одна доп. плашка не видна
        this.updateActionButtonsByInfoSections();
        
        this.renderFarmerInfo();
        this.renderCultureInfo();
        this.renderQualityProperties();
        this.renderDocuments();
        this.updatePageMetadata();
        
        // Обновляем поля в форме отклонения после загрузки данных
        this.updateRejectionFields();
    }

    // Показать информационное окно статуса
    showStatusInfoWindow() {
        const statusName = this.cultureData.cropsStatus?.name;
        const frontendStatus = this.getFrontendStatus(statusName);
        
        // Показываем окно только для статусов "Активная" и "Требуются правки"
        if (frontendStatus === 'approved' || frontendStatus === 'rejected') {
            if (frontendStatus === 'approved') {
                this.showAcceptedInfoWindow();
            } else if (frontendStatus === 'rejected') {
                this.showRejectedInfoWindow();
            }
        } else {
            // Скрываем оба окна если статус другой
            this.hideStatusInfoWindows();
        }
    }

    // Скрыть все информационные окна статусов
    hideStatusInfoWindows() {
        const acceptedSection = document.getElementById('acceptedInfoSection');
        const rejectedSection = document.getElementById('rejectedInfoSection');
        
        if (acceptedSection) acceptedSection.style.display = 'none';
        if (rejectedSection) rejectedSection.style.display = 'none';
    }

    // Получить фронтенд статус
    getFrontendStatus(statusName) {
        const statusMap = {
            'Активная': 'approved',
            'На проверке': 'checking',
            'Требуются правки': 'rejected'
        };
        return statusMap[statusName] || 'checking';
    }

    // Показать окно для принятой культуры
    showAcceptedInfoWindow() {
        const acceptedSection = document.getElementById('acceptedInfoSection');
        if (!acceptedSection) {
            console.warn('Секция acceptedInfoSection не найдена');
            return;
        }
        
        // Проверяем, не показывается ли уже окно
        if (acceptedSection.style.display !== 'none') {
            console.log('Окно принятой культуры уже отображается');
            return;
        }
        
        // Работаем с реальной структурой данных
        const manager = this.cultureData.manager || {};
        const managerProfile = manager.managerProfile || {};
        
        const managerName = managerProfile.firstName || managerProfile.lastName ? 
            `${managerProfile.lastName || ''} ${managerProfile.firstName || ''} ${managerProfile.patronymic || ''}`.trim() :
            'Менеджер';
        
        // Используем created_at из данных культуры как дату принятия
        const acceptedDate = this.cultureData.created_at ? 
            new Date(this.cultureData.created_at).toLocaleString('ru-RU') :
            new Date().toLocaleString('ru-RU');
        
        // Обновляем данные в существующих элементах
        const acceptDateElement = document.getElementById('acceptanceDate');
        const acceptManagerElement = document.getElementById('acceptanceManager');
        
        if (acceptDateElement) acceptDateElement.textContent = acceptedDate;
        if (acceptManagerElement) acceptManagerElement.textContent = managerName;
        
        // Показываем секцию
        acceptedSection.style.display = 'block';
        
        console.log('Показано окно принятой культуры:', { managerName, acceptedDate });
    }

    // Показать окно для отклоненной культуры
    showRejectedInfoWindow() {
        const rejectedSection = document.getElementById('rejectedInfoSection');
        if (!rejectedSection) {
            console.warn('Секция rejectedInfoSection не найдена');
            return;
        }
        
        // Проверяем, не показывается ли уже окно
        if (rejectedSection.style.display !== 'none') {
            console.log('Окно отклоненной культуры уже отображается');
            return;
        }
        
        // Работаем с реальной структурой данных
        const manager = this.cultureData.manager || {};
        const managerProfile = manager.managerProfile || {};
        
        const managerName = managerProfile.firstName || managerProfile.lastName ? 
            `${managerProfile.lastName || ''} ${managerProfile.firstName || ''} ${managerProfile.patronymic || ''}`.trim() :
            'Менеджер';
        
        // Используем created_at как дату отклонения
        const rejectedDate = this.cultureData.created_at ? 
            new Date(this.cultureData.created_at).toLocaleString('ru-RU') :
            new Date().toLocaleString('ru-RU');
        
        // Используем reviewMessage как причину отклонения
        const reason = this.cultureData.reviewMessage || 'Причина отклонения не указана';
        
        // Парсим поля из сообщения
        const fields = this.parseFieldsFromMessage(reason);
        
        // Обновляем иконку и заголовок в зависимости от статуса
        const statusIcon = document.getElementById('rejectionStatusIcon');
        const statusTitle = document.getElementById('rejectionStatusTitle');
        
        if (this.cultureData.cropsStatus?.name === 'Требуются правки') {
            if (statusIcon) {
                statusIcon.className = 'fas fa-edit';
                statusIcon.style.color = '#fd7e14'; // Оранжевый цвет
            }
            if (statusTitle) statusTitle.textContent = 'Требуются правки';
        } else {
            if (statusIcon) {
                statusIcon.className = 'fas fa-exclamation-circle';
                statusIcon.style.color = '#dc3545'; // Красный цвет
            }
            if (statusTitle) statusTitle.textContent = 'Качество культуры отклонено';
        }
        
        // Обновляем данные в элементах
        const rejectionDateElement = document.getElementById('rejectionDate');
        const rejectionManagerElement = document.getElementById('rejectionManager');
        const rejectionReasonElement = document.getElementById('rejectionReason');
        const rejectionFieldsListElement = document.getElementById('rejectionFieldsList');
        
        if (rejectionDateElement) rejectionDateElement.textContent = rejectedDate;
        if (rejectionManagerElement) rejectionManagerElement.textContent = managerName;
        if (rejectionReasonElement) rejectionReasonElement.textContent = reason;
        
        // Отображаем поля для исправления, если они есть
        if (rejectionFieldsListElement && fields.length > 0) {
            rejectionFieldsListElement.innerHTML = fields.map(field => `
                <span class="rejection-field-tag">
                    <i class="fas ${field.icon}"></i>
                    ${field.name}
                </span>
            `).join('');
        } else {
            // Если поля не найдены, скрываем контейнер полей
            const fieldsContainer = document.getElementById('rejectionFieldsContainer');
            if (fieldsContainer) {
                fieldsContainer.style.display = 'none';
            }
        }
        
        // Показываем секцию
        rejectedSection.style.display = 'block';
        
        console.log('Показано окно отклоненной культуры:', { managerName, rejectedDate, reason, fieldsCount: fields.length });
    }

    // Распарсить поля из сообщения об отклонении
    parseFieldsFromMessage(message) {
        const fields = [];
        
        // Ищем секцию с полями в сообщении
        const fieldsSectionRegex = /Необходимо исправить следующие поля:\s*([\s\S]*?)(?:\n\n|$)/;
        const match = message.match(fieldsSectionRegex);
        
        if (match && match[1]) {
            // Разделяем поля по запятым и убираем лишние пробелы
            const fieldNames = match[1].split(',').map(field => field.trim()).filter(field => field);
            
            // Маппинг названий полей на иконки для культур
            const fieldIconMap = {
                'Культура': 'fa-seedling',
                'Год урожая': 'fa-calendar-alt',
                'Регион происхождения': 'fa-map-marker-alt',
                'Срок хранения': 'fa-clock',
                'Точка погрузки': 'fa-map-pin',
                'Протеин': 'fa-flask',
                'ИДК': 'fa-vial',
                'Влажность': 'fa-tint',
                'Натура': 'fa-weight',
                'Клейковина': 'fa-bread-slice',
                'Стекловидность': 'fa-eye',
                'Запах': 'fa-nose',
                'Протокол испытаний': 'fa-file-pdf',
                'Сертификат соответствия': 'fa-certificate',
                'Документы качества': 'fa-file-contract'
            };
            
            fieldNames.forEach(fieldName => {
                fields.push({
                    icon: fieldIconMap[fieldName] || 'fa-edit',
                    name: fieldName
                });
            });
        }
        
        console.log('Распарсенные поля из сообщения:', fields);
        return fields;
    }

    // Показать ошибку загрузки данных
    showDataLoadError() {
        const mainContent = document.querySelector('.detail-content');
        if (!mainContent) return;
        
        mainContent.innerHTML = `
            <div class="error-container">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h2>Не удалось загрузить данные</h2>
                <p>Произошла ошибка при загрузке информации о культуре. Пожалуйста, попробуйте обновить страницу или обратитесь к администратору.</p>
                <div class="error-actions">
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="fas fa-sync-alt"></i>
                        Обновить страницу
                    </button>
                    <button class="btn btn-secondary" onclick="history.back()">
                        <i class="fas fa-arrow-left"></i>
                        Вернуться назад
                    </button>
                </div>
            </div>
        `;
        
        // Добавляем стили для ошибки
        const errorStyle = document.createElement('style');
        errorStyle.textContent = `
            .error-container {
                text-align: center;
                padding: 4rem 2rem;
                background: white;
                border-radius: 12px;
                margin: 2rem auto;
                max-width: 600px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .error-icon {
                width: 80px;
                height: 80px;
                background: #fee2e2;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 2rem auto;
                color: #ef4444;
                font-size: 2rem;
            }
            .error-container h2 {
                margin: 0 0 1rem 0;
                color: #1f2937;
                font-size: 1.5rem;
            }
            .error-container p {
                margin: 0 0 2rem 0;
                color: #6b7280;
                line-height: 1.6;
                font-size: 1rem;
            }
            .error-actions {
                display: flex;
                gap: 1rem;
                justify-content: center;
                flex-wrap: wrap;
            }
            .error-actions .btn {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .error-actions .btn-primary {
                background: #3b82f6;
                color: white;
                border: none;
            }
            .error-actions .btn-primary:hover {
                background: #2563eb;
            }
            .error-actions .btn-secondary {
                background: #f3f4f6;
                color: #374151;
                border: 1px solid #d1d5db;
            }
            .error-actions .btn-secondary:hover {
                background: #e5e7eb;
            }
        `;
        document.head.appendChild(errorStyle);
    }

    // Отображение информации о фермере
    renderFarmerInfo() {
        if (!this.farmerData || !this.farmerData.profile) {
            console.warn('Нет данных фермера для отображения');
            return;
        }
        
        const profile = this.farmerData.profile;
        const entrepreneurProfile = profile.entrepreneurProfile;
        
        if (entrepreneurProfile) {
            // ФИО
            const fullName = `${entrepreneurProfile.lastName || ''} ${entrepreneurProfile.firstName || ''} ${entrepreneurProfile.patronymic || ''}`.trim();
            this.updateElement('.farmer-fields .form-group:nth-child(1) .form-value', fullName || 'Отсутствует');
            
            // Дата рождения
            const birthDate = entrepreneurProfile.dateOfBirth ? 
                new Date(entrepreneurProfile.dateOfBirth).toLocaleDateString('ru-RU') : 'Отсутствует';
            this.updateElement('.farmer-fields .form-group:nth-child(2) .form-value', birthDate);
            
            // ИНН
            this.updateElement('.farmer-fields .form-group.full-width:nth-child(3) .form-value', 
                entrepreneurProfile.inn || 'Отсутствует');
            
            // Организация
            this.updateElement('.farmer-fields .form-group.full-width:nth-child(4) .form-value', 
                entrepreneurProfile.organizationName || 'Отсутствует');
            
            // Дата регистрации
            const regDate = profile.created_at ? 
                new Date(profile.created_at).toLocaleDateString('ru-RU') : 'Отсутствует';
            this.updateElement('.farmer-fields .form-row:nth-child(4) .form-group:nth-child(1) .form-value', regDate);
            
            // Статус верификации
            const statusText = profile.isVerified ? 'Верифицирован' : 'Не верифицирован';
            const statusClass = profile.isVerified ? 'verified' : '';
            this.updateElement('.farmer-fields .form-row:nth-child(4) .form-group:nth-child(2) .form-value', 
                `<i class="fas fa-check-circle"></i> ${statusText}`, true);
            
            // Дополнительная информация
            if (this.farmerData.farmerProfile) {
                this.updateElement('.farmer-meta-info .meta-item:nth-child(2) span', 
                    `Культур: ${this.farmerData.farmerProfile.cropsCount || 0}`);
                this.updateElement('.farmer-meta-info .meta-item:nth-child(3) span', 
                    `Точек выгрузки: ${this.farmerData.farmerProfile.loadingPointsCount || 0}`);
                
                // Дата регистрации в мета-информации
                const metaRegDate = profile.created_at ? 
                    new Date(profile.created_at).toLocaleDateString('ru-RU') : 'Отсутствует';
                this.updateElement('.farmer-meta-info .meta-item:nth-child(1) span', 
                    `Зарегистрирован: ${metaRegDate}`);
            }
        } else {
            console.warn('Нет данных entrepreneurProfile');
            // Если нет данных предпринимателя, выводим "Отсутствует" для всех полей
            this.updateElement('.farmer-fields .form-group:nth-child(1) .form-value', 'Отсутствует');
            this.updateElement('.farmer-fields .form-group:nth-child(2) .form-value', 'Отсутствует');
            this.updateElement('.farmer-fields .form-group.full-width:nth-child(3) .form-value', 'Отсутствует');
            this.updateElement('.farmer-fields .form-group.full-width:nth-child(4) .form-value', 'Отсутствует');
            this.updateElement('.farmer-fields .form-row:nth-child(4) .form-group:nth-child(1) .form-value', 'Отсутствует');
            this.updateElement('.farmer-fields .form-row:nth-child(4) .form-group:nth-child(2) .form-value', 'Отсутствует');
        }
    }

    // Отображение информации о культуре
    renderCultureInfo() {
        if (!this.cultureData) {
            console.warn('Нет данных культуры для отображения');
            return;
        }
        
        // Название культуры
        this.updateElement('.culture-fields .form-group:nth-child(1) .form-value', 
            this.cultureData.cropsType?.name || 'Отсутствует');
        
        // Год урожая
        this.updateElement('.culture-fields .form-group:nth-child(2) .form-value', 
            this.cultureData.yearOfHarvest || 'Отсутствует');
        
        // Срок хранения (поменяли местами с регионом)
        const shelfLifeText = this.cultureData.cropsShelfLife ? 
            `${this.cultureData.cropsShelfLife} ${this.getStoragePeriodText(this.cultureData.cropsShelfLife)}` : 
            'Отсутствует';
        this.updateElement('.culture-fields .form-group.full-width:nth-child(1) .form-value', shelfLifeText);
        
        // Регион происхождения (поменяли местами со сроком хранения)
        this.updateElement('.culture-fields .form-group.full-width:nth-child(2) .form-value', 
            this.cultureData.cropsOriginRegion?.name || 'Отсутствует');
        
        // Точки погрузки
        if (this.cultureData.loadingPoints && this.cultureData.loadingPoints.length > 0) {
            const loadingPoints = this.cultureData.loadingPoints.map(point => 
                `${point.name || ''}, ${point.address || ''}`.trim()
            ).filter(Boolean).join('; ');
            this.updateElement('.culture-fields .form-group.full-width:nth-child(3) .form-value', loadingPoints);
        } else {
            this.updateElement('.culture-fields .form-group.full-width:nth-child(3) .form-value', 'Отсутствует');
        }
    }

    // Отображение показателей качества
    renderQualityProperties() {
        if (!this.cultureData || !this.cropsProperties) {
            console.warn('Нет данных для отображения показателей качества');
            // Показываем сообщение об отсутствии данных
            const qualityFields = document.querySelector('.quality-fields');
            if (qualityFields) {
                qualityFields.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #666;">Данные о качестве отсутствуют</p>';
            }
            return;
        }
        
        const cultureTypeId = this.cultureData.cropsType?.id;
        if (!cultureTypeId) {
            console.warn('Не определен тип культуры');
            const qualityFields = document.querySelector('.quality-fields');
            if (qualityFields) {
                qualityFields.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #666;">Тип культуры не определен</p>';
            }
            return;
        }
        
        // Фильтруем свойства для текущего типа культуры
        const cultureProperties = this.cropsProperties.filter(prop => 
            prop.cropsType && prop.cropsType.id === cultureTypeId
        );
        
        if (cultureProperties.length === 0) {
            console.warn('Не найдены свойства для типа культуры:', cultureTypeId);
            const qualityFields = document.querySelector('.quality-fields');
            if (qualityFields) {
                qualityFields.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #666;">Свойства для данного типа культуры не найдены</p>';
            }
            return;
        }
        
        // Получаем значения свойств из данных культуры
        const cultureValues = this.cultureData.cropsPropertyValue || [];
        
        // Создаем контейнер для динамических полей
        const qualityFields = document.querySelector('.quality-fields');
        if (!qualityFields) return;
        
        // Очищаем существующие поля
        qualityFields.innerHTML = '';
        
        // Создаем строки по 2 поля в каждой
        let currentRow = document.createElement('div');
        currentRow.className = 'form-row';
        
        cultureProperties.forEach((property, index) => {
            // Ищем значение для этого свойства
            const valueObj = cultureValues.find(val => val.cropsProperty?.id === property.id);
            const value = valueObj ? valueObj.value : null;
            const displayValue = value !== null ? value : 'Фермер не указал качество';
            
            // Создаем поле
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            
            const label = document.createElement('label');
            label.className = 'form-label';
            label.textContent = `${property.name}${property.unit ? `, ${property.unit}` : ''}`;
            
            const valueDiv = document.createElement('div');
            valueDiv.className = 'form-value';
            valueDiv.textContent = displayValue;
            
            // Если значение отсутствует, добавляем специальный стиль
            if (value === null) {
                valueDiv.style.color = '#999';
                valueDiv.style.fontStyle = 'italic';
            }
            
            formGroup.appendChild(label);
            formGroup.appendChild(valueDiv);
            
            currentRow.appendChild(formGroup);
            
            // Если набралось 2 поля или это последнее поле, закрываем строку
            if ((index + 1) % 2 === 0 || index === cultureProperties.length - 1) {
                qualityFields.appendChild(currentRow);
                currentRow = document.createElement('div');
                currentRow.className = 'form-row';
            }
        });
        
        // Если остались пустые строки, удаляем их
        if (currentRow.children.length === 0) {
            currentRow.remove();
        }
    }

    // Отображение документов
    renderDocuments() {
        const documentsGrid = document.querySelector('.documents-grid');
        if (!documentsGrid) {
            console.warn('Контейнер для документов не найден');
            return;
        }
        
        if (!this.cultureData) {
            console.warn('Нет данных культуры для отображения документов');
            documentsGrid.innerHTML = `
                <div class="no-documents-message">
                    <div class="no-documents-icon">
                        <i class="fas fa-inbox"></i>
                    </div>
                    <h4>Документы отсутствуют</h4>
                    <p>Фермер не добавил документы о качестве</p>
                </div>
            `;
            return;
        }
        
        // Очищаем существующие документы
        documentsGrid.innerHTML = '';
        
        const qualityDocument = this.cultureData.qualityDocument || [];
        
        if (qualityDocument.length === 0) {
            // Показываем красивое сообщение об отсутствии документов
            documentsGrid.innerHTML = `
                <div class="no-documents-message">
                    <div class="no-documents-icon">
                        <i class="fas fa-inbox"></i>
                    </div>
                    <h4>Документы отсутствуют</h4>
                    <p>Фермер не добавил документы о качестве</p>
                </div>
            `;
            return;
        }
        
        // Отображаем документы
        qualityDocument.forEach((docUrl, index) => {
            const docCard = this.createDocumentCard(docUrl, index);
            documentsGrid.appendChild(docCard);
        });
    }

    // Создание карточки документа
    createDocumentCard(url, index) {
        const card = document.createElement('div');
        card.className = 'document-card';
        
        // Извлекаем имя файла из URL
        const fileName = url.split('/').pop() || `Документ ${index + 1}`;
        
        card.innerHTML = `
            <div class="document-icon">
                <i class="fas fa-file-pdf"></i>
            </div>
            <div class="document-info">
                <h4>${fileName}</h4>
                <p>Документ качества</p>
                <div class="document-meta">
                    <span class="document-date">
                        <i class="fas fa-link"></i>
                        Доступен онлайн
                    </span>
                </div>
            </div>
            <div class="document-actions">
                <button class="btn btn-primary download-document" onclick="window.open('${url}', '_blank')">
                    <i class="fas fa-external-link-alt"></i>
                    Открыть
                </button>
            </div>
        `;
        
        return card;
    }

    // Обновление метаданных страницы
    updatePageMetadata() {
        if (!this.cultureData) {
            console.warn('Нет данных культуры для обновления метаданных');
            return;
        }
        
        // Обновляем заголовок страницы
        const titleElement = document.querySelector('.title-text h1');
        if (titleElement) {
            titleElement.textContent = 'Проверка качества культуры';
        }
        
        // Обновляем подзаголовок
        const subtitleElement = document.querySelector('.title-text p');
        if (subtitleElement) {
            const cultureName = this.cultureData.cropsType?.name || 'Культура';
            const farmerName = this.getFarmerShortName();
            subtitleElement.textContent = `${cultureName} • ${farmerName}`;
        }
        
        // Обновляем статус
        this.updateStatusBadge();
    }

    // Получение краткого имени фермера
    getFarmerShortName() {
        if (!this.farmerData || !this.farmerData.profile || !this.farmerData.profile.entrepreneurProfile) {
            return 'Фермер';
        }
        
        const ep = this.farmerData.profile.entrepreneurProfile;
        return ep.organizationName || `${ep.lastName || ''} ${ep.firstName || ''}`.trim() || 'Фермер';
    }

    // Обновление статуса в заголовке
    updateStatusBadge() {
        const statusIndicator = document.querySelector('.quality-status-badge .status-indicator');
        const statusIcon = document.querySelector('.quality-status-badge .status-icon');
        const statusText = document.querySelector('.quality-status-badge .status-text');
        
        if (!statusIndicator || !statusIcon || !statusText) {
            console.warn('Элементы статуса не найдены:', {
                statusIndicator: !!statusIndicator,
                statusIcon: !!statusIcon,
                statusText: !!statusText
            });
            this.updateActionButtonsByInfoSections();
            const sn = this.cultureData?.cropsStatus?.name;
            const cfg = sn ? (this.statusConfig[this.getFrontendStatus(sn)] || this.statusConfig['checking']) : null;
            this.updateActionsSectionStatusBadge(cfg);
            return;
        }
        
        console.log('updateStatusBadge вызван:', {
            cultureData: this.cultureData,
            cropsStatus: this.cultureData?.cropsStatus,
            statusName: this.cultureData?.cropsStatus?.name
        });
        
        const statusName = this.cultureData.cropsStatus?.name;
        if (!statusName) {
            console.warn('Имя статуса не найдено');
            this.updateActionButtonsByInfoSections();
            this.updateActionsSectionStatusBadge(this.statusConfig['checking']);
            return;
        }
        
        const frontendStatus = this.getFrontendStatus(statusName);
        const statusConfig = this.statusConfig[frontendStatus];
        
        console.log('Обновление статуса:', {
            statusName,
            frontendStatus,
            statusConfig
        });
        
        if (statusConfig) {
            // Обновляем класс индикатора
            statusIndicator.className = `status-indicator ${statusConfig.class} expanded`;
            
            // Обновляем иконку
            statusIcon.className = `${statusConfig.icon} status-icon`;
            
            // Обновляем текст
            statusText.textContent = statusConfig.text;
            
            // Обновляем цвет индикатора
            statusIndicator.style.color = statusConfig.color;
            
            // Показать соответствующее информационное окно в зависимости от статуса
            this.hideStatusInfoWindows();

            if (statusName === 'Активная') {
                this.showAcceptedInfoWindow();
            } else if (statusName === 'Требуются правки' || statusName === 'Отправлена на доработку') {
                this.showRejectedInfoWindow();
            }
            this.updateActionButtonsByInfoSections();
            this.updateActionsSectionStatusBadge(statusConfig);
        } else {
            console.warn('Конфигурация статуса не найдена для:', frontendStatus);
            this.updateActionButtonsByInfoSections();
            const fallbackConfig = this.statusConfig[frontendStatus] || this.statusConfig['checking'];
            this.updateActionsSectionStatusBadge(fallbackConfig);
        }
    }

    // Статус справа в блоке «Действия» (те же цвета, что на списке культур)
    updateActionsSectionStatusBadge(statusConfig) {
        const el = document.getElementById('actionsSectionStatusBadge');
        if (!el) return;
        if (!statusConfig) {
            el.textContent = '';
            el.className = 'actions-section-status';
            return;
        }
        el.className = `actions-section-status ${statusConfig.class}`;
        el.innerHTML = `<i class="${statusConfig.icon}"></i><span>${statusConfig.text}</span>`;
    }

    // Если доп. плашка («Качество подтверждено» или «Требуются правки») видна — скрываем кнопки; иначе — показываем
    updateActionButtonsByInfoSections() {
        const acceptedSection = document.getElementById('acceptedInfoSection');
        const rejectedSection = document.getElementById('rejectedInfoSection');
        const isVisible = (el) => el && window.getComputedStyle(el).display !== 'none';
        const acceptedVisible = isVisible(acceptedSection);
        const rejectedVisible = isVisible(rejectedSection);
        if (acceptedVisible || rejectedVisible) {
            this.hideStatusDependentElements();
        } else {
            this.showStatusDependentElements();
        }
    }

    // Вспомогательные функции
    // Скрыть элементы, зависящие от статуса (кнопки "Подтвердить качество" и "Отклонить качество" — показываются только при статусе "На проверке")
    hideStatusDependentElements() {
        // Скрываем бейджи "Требует проверки"
        const statusBadges = document.querySelectorAll('.quality-badge.pending');
        statusBadges.forEach(badge => {
            badge.style.display = 'none';
        });
        
        // Скрываем карточки "Подтвердить качество" и "Отклонить качество"
        const acceptCard = document.getElementById('acceptQualityCard');
        const rejectCard = document.getElementById('rejectQualityCard');
        if (acceptCard) acceptCard.style.display = 'none';
        if (rejectCard) rejectCard.style.display = 'none';
        
        const acceptBtn = document.getElementById('acceptQuality');
        const rejectBtn = document.getElementById('rejectQuality');
        if (acceptBtn) acceptBtn.style.display = 'none';
        if (rejectBtn) rejectBtn.style.display = 'none';
        
        console.log('Скрыты кнопки "Подтвердить качество" и "Отклонить качество" (статус не "На проверке")');
    }
    
    // Показать элементы, зависящие от статуса (только для "На проверке")
    showStatusDependentElements() {
        // Показываем бейджи "Требует проверки"
        const statusBadges = document.querySelectorAll('.quality-badge.pending');
        statusBadges.forEach(badge => {
            badge.style.display = 'inline-flex';
        });
        
        // Показываем карточки "Подтвердить качество" и "Отклонить качество"
        const acceptCard = document.getElementById('acceptQualityCard');
        const rejectCard = document.getElementById('rejectQualityCard');
        if (acceptCard) acceptCard.style.display = 'flex';
        if (rejectCard) rejectCard.style.display = 'flex';
        
        const acceptBtn = document.getElementById('acceptQuality');
        const rejectBtn = document.getElementById('rejectQuality');
        if (acceptBtn) acceptBtn.style.display = 'flex';
        if (rejectBtn) rejectBtn.style.display = 'flex';
        
        console.log('Показаны кнопки "Подтвердить качество" и "Отклонить качество" (статус "На проверке")');
    }

    // Вспомогательные функции
    updateElement(selector, content, isHtml = false) {
        const element = document.querySelector(selector);
        if (element) {
            if (isHtml) {
                element.innerHTML = content;
            } else {
                element.textContent = content;
            }
        }
    }

    getStoragePeriodText(months) {
        if (months === 1) return 'месяц';
        if (months >= 2 && months <= 4) return 'месяца';
        return 'месяцев';
    }

    showLoadingState(show, customText = null) {
        if (show) {
            // Создаем полноэкранный индикатор загрузки
            let loadingOverlay = document.getElementById('globalLoadingOverlay');
            if (!loadingOverlay) {
                loadingOverlay = document.createElement('div');
                loadingOverlay.id = 'globalLoadingOverlay';
                loadingOverlay.innerHTML = `
                    <div class="loading-overlay-content">
                        <div class="loading-spinner">
                            <div class="spinner-circle"></div>
                            <div class="spinner-circle"></div>
                            <div class="spinner-circle"></div>
                        </div>
                        <p class="loading-text">${customText || 'Загрузка данных...'}</p>
                    </div>
                `;
                loadingOverlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(5px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                `;
                
                // Добавляем стили для спиннера и сообщений
                const style = document.createElement('style');
                style.textContent = `
                    #globalLoadingOverlay .loading-overlay-content {
                        text-align: center;
                        color: #333;
                    }
                    #globalLoadingOverlay .loading-spinner {
                        display: flex;
                        gap: 4px;
                        margin-bottom: 20px;
                        justify-content: center;
                    }
                    #globalLoadingOverlay .spinner-circle {
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                        background: #4CAF50;
                        animation: spinner-bounce 1.4s infinite ease-in-out both;
                    }
                    #globalLoadingOverlay .spinner-circle:nth-child(1) {
                        animation-delay: -0.32s;
                    }
                    #globalLoadingOverlay .spinner-circle:nth-child(2) {
                        animation-delay: -0.16s;
                    }
                    #globalLoadingOverlay .spinner-circle:nth-child(3) {
                        animation-delay: 0s;
                    }
                    #globalLoadingOverlay .loading-text {
                        font-size: 16px;
                        font-weight: 500;
                        color: #666;
                        margin: 0;
                    }
                    @keyframes spinner-bounce {
                        0%, 80%, 100% {
                            transform: scale(0);
                            opacity: 0.5;
                        }
                        40% {
                            transform: scale(1);
                            opacity: 1;
                        }
                    }
                    
                    /* Стили для сообщения об отсутствии документов */
                    .no-documents-message {
                        text-align: center;
                        padding: 3rem 2rem;
                        background: #f9fafb;
                        border: 2px dashed #d1d5db;
                        border-radius: 12px;
                        color: #6b7280;
                    }
                    .no-documents-icon {
                        width: 64px;
                        height: 64px;
                        background: #fee2e2;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 1.5rem auto;
                        color: #ef4444;
                        font-size: 1.5rem;
                    }
                    .no-documents-message h4 {
                        margin: 0 0 0.75rem 0;
                        font-size: 1.125rem;
                        font-weight: 600;
                        color: #374151;
                    }
                    .no-documents-message p {
                        margin: 0;
                        font-size: 0.95rem;
                        color: #6b7280;
                        line-height: 1.5;
                    }
                `;
                document.head.appendChild(style);
                document.body.appendChild(loadingOverlay);
            }
            
            // Показываем загрузку с анимацией
            setTimeout(() => {
                loadingOverlay.style.opacity = '1';
            }, 10);
            
        } else {
            // Скрываем загрузку
            const loadingOverlay = document.getElementById('globalLoadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.style.opacity = '0';
                setTimeout(() => {
                    loadingOverlay.style.display = 'none';
                }, 300);
            }
        }
    }

    showErrorMessage(message) {
        // Создаем или обновляем блок ошибки
        let errorBlock = document.getElementById('errorMessage');
        if (!errorBlock) {
            errorBlock = document.createElement('div');
            errorBlock.id = 'errorMessage';
            errorBlock.className = 'error-message';
            errorBlock.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #f44336;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 1000;
                max-width: 400px;
                font-size: 14px;
            `;
            document.body.appendChild(errorBlock);
        }
        
        errorBlock.textContent = message;
        errorBlock.style.display = 'block';
        
        // Автоматически скрываем через 5 секунд
        setTimeout(() => {
            if (errorBlock) {
                errorBlock.style.display = 'none';
            }
        }, 5000);
    }

    showError(message) {
        // Для обратной совместимости, но используем showErrorMessage
        this.showErrorMessage(message);
    }

    // Действия с качеством
    openChat() {
        console.log('Открытие чата с фермером');
        // Здесь будет логика открытия чата
    }

    acceptQuality() {
        // Показываем модалку подтверждения
        this.showAcceptConfirmationModal();
    }

    // Показать модалку подтверждения верификации
    showAcceptConfirmationModal() {
        // Создаем модалку
        const modal = document.createElement('div');
        modal.className = 'accept-confirmation-modal';
        modal.innerHTML = `
            <div class="accept-modal-content">
                <div class="accept-modal-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3>Подтверждение качества культуры</h3>
                <p>Вы точно хотите верифицировать качество культуры?</p>
                <p class="accept-modal-description">
                    После верификации фермер сможет сделать запрос на продажу и качество культуры увидит экспортер. 
                    В случае последующего отклонения вы сможете сделать это действие через администратора.
                </p>
                <div class="accept-modal-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.accept-confirmation-modal').remove()">
                        Отмена
                    </button>
                    <button class="btn btn-success" onclick="window.qualityDetailPage.confirmAcceptQuality()">
                        Да, подтвердить
                    </button>
                </div>
            </div>
        `;
        
        // Добавляем стили для модалки
        const modalStyle = document.createElement('style');
        modalStyle.textContent = `
            .accept-confirmation-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }
            .accept-modal-content {
                background: white;
                border-radius: 12px;
                padding: 2rem;
                max-width: 500px;
                width: 90%;
                text-align: center;
                animation: slideUp 0.3s ease;
            }
            .accept-modal-icon {
                width: 64px;
                height: 64px;
                background: #10b981;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 1.5rem auto;
                color: white;
                font-size: 1.5rem;
            }
            .accept-modal-content h3 {
                margin: 0 0 1rem 0;
                color: #1f2937;
                font-size: 1.25rem;
            }
            .accept-modal-content p {
                margin: 0 0 1rem 0;
                color: #6b7280;
                line-height: 1.5;
            }
            .accept-modal-description {
                font-size: 0.9rem;
                color: #374151;
                background: #f9fafb;
                padding: 1rem;
                border-radius: 8px;
                border-left: 4px solid #10b981;
            }
            .accept-modal-actions {
                display: flex;
                gap: 1rem;
                justify-content: center;
                margin-top: 1.5rem;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        
        document.head.appendChild(modalStyle);
        document.body.appendChild(modal);
        
        // Сохраняем ссылку на страницу для глобального доступа
        window.qualityDetailPage = this;
        
        // Закрытие по клику на фон
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Подтвердить принятие качества
    async confirmAcceptQuality() {
        try {
            this.showLoadingState(true);
            
            // Отправляем запрос на бек
            const response = await this.sendToAccept();
            
            if (response) {
                // Показываем модалку успеха
                this.showAcceptSuccessModal();
            } else {
                throw new Error('Не удалось подтвердить качество');
            }
            
        } catch (error) {
            console.error('Ошибка при подтверждении качества:', error);
            this.showErrorMessage('Не удалось подтвердить качество. Попробуйте еще раз.');
        } finally {
            this.showLoadingState(false);
        }
    }

    // Отправка на подтверждение
    async sendToAccept() {
        const url = `/moderators-module/crops/send-to-accept/${this.cultureId}`;
        
        try {
            const headers = await this.getAuthHeaders();
            if (!headers) {
                throw new Error('Нет токена авторизации');
            }
            
            const response = await fetch(`${API_CONFIG.BASE_URL}${url.replace('/api/', '')}`, {
                method: 'PATCH',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({}),
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT)
            });
            
            if (response.status === 401 || response.status === 403) {
                console.log('Токен истек или недействителен');
                if (typeof logout === 'function') {
                    logout();
                }
                return null;
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error(`Ошибка запроса к ${url}:`, error);
            return null;
        }
    }

    // Показать модалку успешного подтверждения
    showAcceptSuccessModal() {
        // Закрываем модалку подтверждения если открыта
        const confirmModal = document.querySelector('.accept-confirmation-modal');
        if (confirmModal) {
            confirmModal.remove();
        }
        
        // Создаем модалку успеха
        const modal = document.createElement('div');
        modal.className = 'success-modal';
        modal.innerHTML = `
            <div class="success-modal-content">
                <div class="success-modal-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3>Качество культуры подтверждено</h3>
                <p>Культура успешно верифицирована и доступна для продажи</p>
                <div class="success-modal-actions">
                    <button class="btn btn-primary" onclick="this.closest('.success-modal').remove()">
                        Закрыть
                    </button>
                </div>
            </div>
        `;
        
        // Добавляем стили если еще не добавлены
        if (!document.querySelector('style[data-success-modal]')) {
            const modalStyle = document.createElement('style');
            modalStyle.setAttribute('data-success-modal', 'true');
            modalStyle.textContent = `
                .success-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    animation: fadeIn 0.3s ease;
                }
                .success-modal-content {
                    background: white;
                    border-radius: 12px;
                    padding: 2rem;
                    max-width: 400px;
                    width: 90%;
                    text-align: center;
                    animation: slideUp 0.3s ease;
                }
                .success-modal-icon {
                    width: 64px;
                    height: 64px;
                    background: #10b981;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem auto;
                    color: white;
                    font-size: 1.5rem;
                }
                .success-modal-content h3 {
                    margin: 0 0 1rem 0;
                    color: #1f2937;
                    font-size: 1.25rem;
                }
                .success-modal-content p {
                    margin: 0 0 1.5rem 0;
                    color: #6b7280;
                    line-height: 1.5;
                }
                .success-modal-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(modalStyle);
        }
        
        document.body.appendChild(modal);
        
        // Закрытие по клику на фон
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Обновляем данные после успешного подтверждения
        this.refreshDataAfterAction();
    }

    // Обновление данных после действия без перезагрузки страницы
    async refreshDataAfterAction() {
        try {
            // Показываем загрузку с текстом "Обновляем данные"
            this.showLoadingState(true, 'Обновляем данные...');
            
            // Повторно загружаем все данные
            const [cultureData, farmerData, cropsProperties] = await Promise.all([
                this.loadCultureData(),
                this.loadFarmerData(),
                this.loadCropsProperties()
            ]);
            
            // Проверяем успешность загрузки
            if (!cultureData || !farmerData || !cropsProperties) {
                throw new Error('Не удалось загрузить обновленные данные');
            }
            
            this.cultureData = cultureData;
            this.farmerData = farmerData;
            this.cropsProperties = cropsProperties;
            
            // Обновляем отображение
            this.renderData();
            
        } catch (error) {
            console.error('Ошибка при обновлении данных:', error);
            // Показываем ошибку вместо старых данных
            this.showDataLoadError();
        } finally {
            this.showLoadingState(false);
        }
    }

    // Обновление полей в форме отклонения на основе данных культуры
    updateRejectionFields() {
        if (!this.cultureData) return;
        
        // Обновляем поля показателей качества
        this.updateQualityFieldsCheckboxes();
        
        // Обновляем поля документов
        this.updateDocumentsCheckboxes();
    }

    // Обновление чекбоксов показателей качества
    updateQualityFieldsCheckboxes() {
        // Ищем группу "Показатели качества"
        const qualityGroups = Array.from(document.querySelectorAll('.checklist-group'));
        const qualityGroup = qualityGroups.find(group => {
            const h4 = group.querySelector('h4');
            return h4 && h4.textContent.trim() === 'Показатели качества';
        });
        
        if (!qualityGroup) {
            console.warn('Группа "Показатели качества" не найдена');
            return;
        }
        
        const qualityContainer = qualityGroup;
        const qualityRows = qualityContainer.querySelectorAll('.checklist-row');
        
        // Очищаем существующие поля
        qualityRows.forEach(row => row.remove());
        
        if (!this.cropsProperties) {
            console.warn('Нет данных о свойствах культур');
            return;
        }
        
        const cultureTypeId = this.cultureData.cropsType?.id;
        if (!cultureTypeId) return;
        
        // Фильтруем свойства для текущего типа культуры
        const cultureProperties = this.cropsProperties.filter(prop => 
            prop.cropsType && prop.cropsType.id === cultureTypeId
        );
        
        // Получаем значения свойств из данных культуры
        const cultureValues = this.cultureData.cropsPropertyValue || [];
        
        // Создаем новые чекбоксы
        let currentRow = document.createElement('div');
        currentRow.className = 'checklist-row';
        
        cultureProperties.forEach((property, index) => {
            // Ищем значение для этого свойства
            const valueObj = cultureValues.find(val => val.cropsProperty?.id === property.id);
            const hasValue = valueObj && valueObj.value !== null;
            
            // Создаем элемент чекбокса
            const checklistItem = document.createElement('div');
            checklistItem.className = 'checklist-item';
            
            const label = document.createElement('label');
            label.className = 'checkbox-label';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'rejectionFields';
            checkbox.value = property.id;
            checkbox.disabled = !hasValue; // Дизейблим если значение не заполнено
            
            const span = document.createElement('span');
            span.className = 'checkbox-custom';
            
            const text = document.createTextNode(`${property.name}${property.unit ? `, ${property.unit}` : ''}`);
            
            label.appendChild(checkbox);
            label.appendChild(span);
            label.appendChild(text);
            
            // Добавляем подсказку если поле не заполнено
            if (!hasValue) {
                const hint = document.createElement('small');
                hint.style.color = '#999';
                hint.style.fontSize = '0.8rem';
                hint.style.display = 'block';
                hint.textContent = '(не заполнено фермером)';
                label.appendChild(hint);
            }
            
            checklistItem.appendChild(label);
            currentRow.appendChild(checklistItem);
            
            // Распределяем по 3 поля в ряду
            if ((index + 1) % 3 === 0 || index === cultureProperties.length - 1) {
                qualityContainer.appendChild(currentRow);
                currentRow = document.createElement('div');
                currentRow.className = 'checklist-row';
            }
        });
        
        // Удаляем пустую строку если осталась
        if (currentRow.children.length === 0) {
            currentRow.remove();
        }
    }

    // Обновление чекбоксов документов
    updateDocumentsCheckboxes() {
        const documentsGroup = Array.from(document.querySelectorAll('.checklist-group h4'))
            .find(h4 => h4.textContent === 'Документы качества');
        
        if (!documentsGroup) return;
        
        const documentsContainer = documentsGroup.parentElement;
        const documentsRow = documentsContainer.querySelector('.checklist-row');
        
        if (!documentsRow) return;
        
        // Очищаем существующие документы
        documentsRow.innerHTML = '';
        
        const qualityDocument = this.cultureData.qualityDocument || [];
        
        if (qualityDocument.length === 0) {
            // Если документов нет, скрываем всю группу
            documentsGroup.parentElement.style.display = 'none';
            return;
        }
        
        // Показываем группу если есть документы
        documentsGroup.parentElement.style.display = 'block';
        
        // Создаем чекбоксы для документов
        qualityDocument.forEach((docUrl, index) => {
            const fileName = docUrl.split('/').pop() || `Документ ${index + 1}`;
            
            const checklistItem = document.createElement('div');
            checklistItem.className = 'checklist-item';
            
            const label = document.createElement('label');
            label.className = 'checkbox-label';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'rejectionFields';
            checkbox.value = `doc_${index}`;
            
            const span = document.createElement('span');
            span.className = 'checkbox-custom';
            
            const text = document.createTextNode(fileName);
            
            label.appendChild(checkbox);
            label.appendChild(span);
            label.appendChild(text);
            
            checklistItem.appendChild(label);
            documentsRow.appendChild(checklistItem);
        });
    }

    showRejectionSection() {
        const rejectionSection = document.getElementById('rejectionSection');
        if (rejectionSection) {
            rejectionSection.classList.remove('hidden');
            // Плавный скролл к секции отклонения
            setTimeout(() => {
                rejectionSection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }, 100);
        }
    }

    hideRejectionSection() {
        const rejectionSection = document.getElementById('rejectionSection');
        if (rejectionSection) {
            rejectionSection.classList.add('hidden');
            // Сбрасываем форму
            this.resetRejectionForm();
        }
    }

    // Сброс формы отклонения
    resetRejectionForm() {
        const commentTextarea = document.getElementById('rejectionComment');
        const checkboxes = document.querySelectorAll('input[name="rejectionFields"]');
        
        if (commentTextarea) commentTextarea.value = '';
        checkboxes.forEach(checkbox => checkbox.checked = false);
        
        this.updateRejectionButton();
    }

    // Обновить состояние кнопки подтверждения отклонения
    updateRejectionButton() {
        const confirmBtn = document.getElementById('confirmRejection');
        const commentTextarea = document.getElementById('rejectionComment');
        const checkedBoxes = document.querySelectorAll('input[name="rejectionFields"]:checked');
        
        const hasComment = commentTextarea && commentTextarea.value.trim().length > 0;
        const hasCheckedFields = checkedBoxes.length > 0;
        
        if (confirmBtn) {
            confirmBtn.disabled = !hasComment || !hasCheckedFields;
        }
    }

    // Инициализация чекбоксов для полей
    initFieldCheckboxes() {
        const checkboxes = document.querySelectorAll('input[name="rejectionFields"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateRejectionButton();
            });
        });
    }

    // Подтвердить отклонение
    async confirmRejection() {
        const commentTextarea = document.getElementById('rejectionComment');
        const checkedBoxes = document.querySelectorAll('input[name="rejectionFields"]:checked');
        
        if (!commentTextarea || !commentTextarea.value.trim()) {
            this.showErrorMessage('Пожалуйста, добавьте комментарий');
            return;
        }
        
        if (checkedBoxes.length === 0) {
            this.showErrorMessage('Пожалуйста, выберите хотя бы одно поле для исправления');
            return;
        }
        
        // Показываем модальное окно подтверждения
        this.showRejectionConfirmModal();
    }
    
    // Показать модальное окно подтверждения отклонения
    showRejectionConfirmModal() {
        const modal = document.getElementById('rejectionConfirmModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }
    
    // Закрыть модальное окно подтверждения отклонения
    closeRejectionConfirmModal() {
        const modal = document.getElementById('rejectionConfirmModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    // Выполнить отклонение (из модального окна)
    async executeRejection() {
        const commentTextarea = document.getElementById('rejectionComment');
        const checkedBoxes = document.querySelectorAll('input[name="rejectionFields"]:checked');
        const confirmModalBtn = document.getElementById('confirmRejectionModal');
        const cancelModalBtn = document.getElementById('cancelRejectionModal');
        
        // Блокируем кнопки и добавляем индикацию загрузки
        if (confirmModalBtn) {
            confirmModalBtn.disabled = true;
            confirmModalBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отклоняю...';
        }
        
        if (cancelModalBtn) {
            cancelModalBtn.disabled = true;
        }
        
        try {
            // Формируем итоговый комментарий
            const baseComment = commentTextarea.value.trim();
            const fieldNames = Array.from(checkedBoxes)
                .filter(cb => cb.value !== 'other_reasons') // Исключаем "Иные причины"
                .map(cb => {
                    // Ищем текстовое содержимое после checkbox-custom
                    const label = cb.parentElement;
                    const textNode = Array.from(label.childNodes).find(node => 
                        node.nodeType === Node.TEXT_NODE && node.textContent.trim()
                    );
                    return textNode ? textNode.textContent.trim() : '';
                })
                .filter(name => name.length > 0); // Фильтруем пустые значения
            
            let finalComment = baseComment;
            
            // Добавляем перечисление полей только если есть выбранные поля кроме "Иные причины"
            if (fieldNames.length > 0) {
                finalComment += `\n\nНеобходимо исправить следующие поля: ${fieldNames.join(', ')}`;
            }
            
            // Отправляем запрос на бек
            const response = await this.sendToRevision(finalComment);
            
            if (response) {
                // Закрываем модальное окно
                this.closeRejectionConfirmModal();
                // Показываем модалку успеха
                this.showRejectionSuccessModal(finalComment);
            } else {
                throw new Error('Не удалось отправить на доработку');
            }
            
        } catch (error) {
            console.error('Ошибка при отправке на доработку:', error);
            this.showErrorMessage('Не удалось отправить культуру на доработку. Попробуйте еще раз.');
        } finally {
            // Возвращаем кнопкам исходное состояние
            if (confirmModalBtn) {
                confirmModalBtn.disabled = false;
                confirmModalBtn.innerHTML = '<i class="fas fa-check"></i> Да, уверен';
            }
            
            if (cancelModalBtn) {
                cancelModalBtn.disabled = false;
            }
        }
    }

    // Отправка на доработку
    async sendToRevision(message) {
        const url = `/moderators-module/crops/send-to-revision/${this.cultureId}`;
        
        try {
            const headers = await this.getAuthHeaders();
            if (!headers) {
                throw new Error('Нет токена авторизации');
            }
            
            const response = await fetch(`${API_CONFIG.BASE_URL}${url.replace('/api/', '')}`, {
                method: 'PATCH',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message
                }),
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT)
            });
            
            if (response.status === 401 || response.status === 403) {
                console.log('Токен истек или недействителен');
                if (typeof logout === 'function') {
                    logout();
                }
                return null;
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error(`Ошибка запроса к ${url}:`, error);
            return null;
        }
    }

    // Показать модалку успешного отклонения
    showRejectionSuccessModal(comment) {
        // Закрываем секцию отклонения
        this.hideRejectionSection();
        
        // Создаем модалку
        const modal = document.createElement('div');
        modal.className = 'success-modal';
        modal.innerHTML = `
            <div class="success-modal-content">
                <div class="success-modal-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3>Культура успешно отправлена на доработку</h3>
                <div class="success-modal-comment">
                    <strong>Комментарий:</strong>
                    <p>${comment.replace(/\n/g, '<br>')}</p>
                </div>
                <div class="success-modal-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.success-modal').remove(); window.location.href='/verification/list_quality/'">
                        К списку культур
                    </button>
                    <button class="btn btn-primary" onclick="this.closest('.success-modal').remove()">
                        Остаться
                    </button>
                </div>
            </div>
        `;
        
        // Добавляем стили для модалки
        const modalStyle = document.createElement('style');
        modalStyle.textContent = `
            .success-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }
            .success-modal-content {
                background: white;
                border-radius: 12px;
                padding: 2rem;
                max-width: 500px;
                width: 90%;
                text-align: center;
                animation: slideUp 0.3s ease;
            }
            .success-modal-icon {
                width: 64px;
                height: 64px;
                background: #10b981;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 1.5rem auto;
                color: white;
                font-size: 1.5rem;
            }
            .success-modal-content h3 {
                margin: 0 0 1rem 0;
                color: #1f2937;
                font-size: 1.25rem;
            }
            .success-modal-comment {
                background: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 1rem;
                margin: 1rem 0 1.5rem 0;
                text-align: left;
            }
            .success-modal-comment strong {
                color: #374151;
                display: block;
                margin-bottom: 0.5rem;
            }
            .success-modal-comment p {
                margin: 0;
                color: #6b7280;
                line-height: 1.5;
            }
            .success-modal-actions {
                display: flex;
                gap: 1rem;
                justify-content: center;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        
        document.head.appendChild(modalStyle);
        document.body.appendChild(modal);
        
        // Закрытие по клику на фон
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Обновляем данные после успешного отклонения
        this.refreshDataAfterAction();
    }
}

// Инициализация страницы при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    new QualityDetailPage();
});
