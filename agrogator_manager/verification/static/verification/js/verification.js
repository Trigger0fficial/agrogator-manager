// Основной класс для управления детальной страницей верификации
class VerificationDetailPage {
    constructor() {
        this.userData = null;
        this.userId = this.getUserIdFromURL() || this.getUserIdFromTemplate();
        
        // Конфигурация статусов (такая же как в списке)
        this.statusConfig = {
            'rejected': {
                text: 'Верификация не пройдена',
                class: 'status-rejected',
                icon: 'fas fa-times-circle',
                color: '#dc3545'
            },
            'document': {
                text: 'Документ сформирован',
                class: 'status-document',
                icon: 'fas fa-file-alt',
                color: '#6c757d'
            },
            'in-progress': {
                text: 'Проверка',
                class: 'status-in-progress',
                icon: 'fas fa-spinner fa-spin',
                color: '#fd7e14'
            },
            'refused': {
                text: 'Отказано',
                class: 'status-refused',
                icon: 'fas fa-ban',
                color: '#dc3545'
            },
            'sent': {
                text: 'Отправлен на подписание',
                class: 'status-sent',
                icon: 'fas fa-paper-plane',
                color: '#007bff'
            },
            'accepted': {
                text: 'Верификация пройдена',
                class: 'status-accepted',
                icon: 'fas fa-check-circle',
                color: '#28a745'
            },
            'draft': {
                text: 'Документ на доработке',
                class: 'status-draft',
                icon: 'fas fa-edit',
                color: '#ffc107'
            },
            'unknown': {
                text: 'Неизвестно',
                class: 'status-unknown',
                icon: 'fas fa-question-circle',
                color: '#6c757d'
            }
        };
        
        // Маппинг для названий полей
        this.fieldNamesMap = {
            'last_name': 'Фамилия',
            'first_name': 'Имя',
            'middle_name': 'Отчество',
            'birth_date': 'Дата рождения',
            'email': 'Email',
            'inn': 'ИНН',
            'ogrnip': 'ОГРНИП',
            'company_name': 'Название организации',
            'legal_address': 'Юридический адрес',
            'bank_name': 'Наименование банка',
            'bik': 'БИК',
            'correspondent_account': 'Корреспондентский счет',
            'payment_account': 'Расчетный счет'
        };

        this.rejectionSection = document.getElementById('rejectionSection');
        this.rejectButton = document.getElementById('rejectVerification');
        this.rejectVerificationCard = document.getElementById('rejectVerificationCard');
        this.cancelRejectionButton = document.getElementById('cancelRejection');
        this.confirmRejectionButton = document.getElementById('confirmRejection');
        this.downloadContractButton = document.getElementById('downloadContract');
        this.goToChatButton = document.getElementById('goToChat');
        this.acceptVerificationButton = document.getElementById('acceptVerification');
        this.rejectionComment = document.getElementById('rejectionComment');

        // Проверяем что все элементы найдены
        console.log('Инициализация элементов:', {
            rejectionSection: !!this.rejectionSection,
            rejectButton: !!this.rejectButton,
            rejectVerificationCard: !!this.rejectVerificationCard,
            cancelRejectionButton: !!this.cancelRejectionButton,
            confirmRejectionButton: !!this.confirmRejectionButton,
            downloadContractButton: !!this.downloadContractButton,
            goToChatButton: !!this.goToChatButton,
            acceptVerificationButton: !!this.acceptVerificationButton,
            rejectionComment: !!this.rejectionComment
        });

        // Модальные окна
        this.rejectionModal = document.getElementById('rejectionConfirmModal');
        this.cancelRejectionModal = document.getElementById('cancelRejectionModal');
        this.confirmRejectionModal = document.getElementById('confirmRejectionModal');
        this.rejectionModalText = document.getElementById('rejectionModalText');
        this.rejectionWarning = document.getElementById('rejectionWarning');

        this.init();
    }

    async init() {
        try {
            // Показываем состояние загрузки
            this.showLoading();
            
            // Загружаем данные пользователя
            await this.loadUserData();
            
            // Инициализируем интерфейс с загруженными данными
            this.populateUserData();
            
            // Инициализируем обработчики событий
            this.addEventListeners();
            this.initUserDropdown();
            this.initLogoutModal();
            this.initRejectionModal();
            
            // Скрываем загрузку
            this.hideLoading();
            
        } catch (error) {
            console.error('Ошибка при инициализации страницы верификации:', error);
            this.showError('Не удалось загрузить данные пользователя');
            this.hideLoading();
        }
    }

    addEventListeners() {
        // Обработчик кнопки отказа
        if (this.rejectButton) {
            console.log('Привязываю обработчик к кнопке отказа:', this.rejectButton);
            this.rejectButton.addEventListener('click', (e) => {
                console.log('Клик по кнопке отказа сработал!', e);
                e.preventDefault();
                e.stopPropagation();
                this.showRejectionSection();
            });
        } else {
            console.log('Кнопка отказа не найдена при привязке обработчика');
        }

        // Обработчик кнопки отмены отказа
        if (this.cancelRejectionButton) {
            this.cancelRejectionButton.addEventListener('click', () => {
                this.hideRejectionSection();
            });
        }

        // Обработчик кнопки подтверждения отказа
        if (this.confirmRejectionButton) {
            this.confirmRejectionButton.addEventListener('click', () => {
                this.showRejectionModal(); // Показываем модалку подтверждения
            });
        }

        // Обработчик кнопки скачивания договора
        if (this.downloadContractButton) {
            this.downloadContractButton.addEventListener('click', () => {
                this.downloadContract();
            });
        }

        // Обработчик кнопки перехода в чат
        if (this.goToChatButton) {
            this.goToChatButton.addEventListener('click', () => {
                this.goToChat();
            });
        }

        // Обработчик принятия верификации
        if (this.acceptVerificationButton) {
            this.acceptVerificationButton.addEventListener('click', () => {
                this.acceptVerification();
            });
        }

        // Валидация комментария отказа
        if (this.rejectionComment) {
            this.rejectionComment.addEventListener('input', () => {
                this.validateRejectionForm();
            });
        }

        // Обработчики для чекбоксов
        document.querySelectorAll('input[name="rejectionFields"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.validateRejectionForm();
            });
        });
    }

    initRejectionModal() {
        // Обработчики для модалки отказа
        if (this.cancelRejectionModal) {
            this.cancelRejectionModal.addEventListener('click', () => {
                this.hideRejectionModal();
            });
        }

        if (this.confirmRejectionModal) {
            this.confirmRejectionModal.addEventListener('click', () => {
                this.confirmRejection();
            });
        }

        // Закрытие модалки по клику вне ее области
        if (this.rejectionModal) {
            this.rejectionModal.addEventListener('click', (e) => {
                if (e.target === this.rejectionModal) {
                    this.hideRejectionModal();
                }
            });
        }

        // Закрытие модалки по кнопке закрытия
        const rejectionModalClose = this.rejectionModal?.querySelector('.modal-close');
        if (rejectionModalClose) {
            rejectionModalClose.addEventListener('click', () => {
                this.hideRejectionModal();
            });
        }
    }

    showRejectionSection() {
        console.log('showRejectionSection вызван');
        console.log('this.rejectionSection:', this.rejectionSection);
        console.log('Классы до:', this.rejectionSection ? this.rejectionSection.className : 'not found');
        
        if (this.rejectionSection) {
            // Удаляем класс hidden
            this.rejectionSection.classList.remove('hidden');
            
            // Принудительно устанавливаем display: block чтобы переопределить инлайн стили
            this.rejectionSection.style.display = 'block';
            
            console.log('Классы после:', this.rejectionSection.className);
            console.log('Стили display после:', this.rejectionSection.style.display);
            
            this.rejectionSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

            // Сбрасываем форму
            this.resetRejectionForm();
            console.log('Форма сброшена');
        } else {
            console.error('rejectionSection не найден!');
        }
    }

    hideRejectionSection() {
        if (this.rejectionSection) {
            this.rejectionSection.classList.add('hidden');
            this.rejectionSection.style.display = 'none';
            console.log('Секция отказа скрыта');
        }
    }

    showRejectionModal() {
        if (!this.validateRejectionForm()) {
            return;
        }

        const selectedFields = Array.from(document.querySelectorAll('input[name="rejectionFields"]:checked'));

        // Настраиваем текст модального окна в зависимости от выбранных полей
        if (selectedFields.length === 0) {
            this.rejectionModalText.textContent = 'Вы уверены, что хотите отказать в регистрации данного пользователя?';
            this.rejectionWarning.style.display = 'flex';
            this.rejectionWarning.querySelector('p').textContent = 'Вы не выбрали ни одного поля для исправления. Это означает полный отказ в верификации, и пользователь не сможет работать на платформе АГРОГАТОР.';
        } else {
            this.rejectionModalText.textContent = 'Вы уверены, что хотите отправить верификацию на повторное заполнение?';
            this.rejectionWarning.style.display = 'flex';
            this.rejectionWarning.querySelector('p').textContent = `Пользователю будет отправлен запрос на исправление ${selectedFields.length} полей. После исправления верификация будет рассмотрена повторно.`;
        }

        if (this.rejectionModal) {
            this.rejectionModal.style.display = 'block';
        }
    }

    hideRejectionModal() {
        if (this.rejectionModal) {
            this.rejectionModal.style.display = 'none';
        }
    }

    resetRejectionForm() {
        // Сбрасываем комментарий
        if (this.rejectionComment) {
            this.rejectionComment.value = '';
        }

        // Сбрасываем чекбоксы
        document.querySelectorAll('input[name="rejectionFields"]').forEach(checkbox => {
            checkbox.checked = false;
        });

        // Сбрасываем валидацию
        this.validateRejectionForm();
    }

    validateRejectionForm() {
        const comment = this.rejectionComment ? this.rejectionComment.value.trim() : '';

        let isValid = true;
        let errorMessage = '';

        // Проверка комментария
        if (comment.length < 20) {
            isValid = false;
            errorMessage = 'Комментарий должен содержать минимум 20 символов';
        }

        // Обновляем состояние кнопки
        if (this.confirmRejectionButton) {
            this.confirmRejectionButton.disabled = !isValid;

            if (!isValid) {
                this.confirmRejectionButton.title = errorMessage;
            } else {
                this.confirmRejectionButton.title = '';
            }
        }

        return isValid;
    }

    async confirmRejection() {
        console.log('=== НАЧАЛО ПРОЦЕССА ОТКАЗА ===');
        
        const comment = this.rejectionComment.value.trim();
        const selectedFields = Array.from(document.querySelectorAll('input[name="rejectionFields"]:checked'))
            .map(checkbox => {
                const fieldValue = checkbox.value;
                // Используем маппинг для получения русского названия, если есть
                return this.fieldNamesMap[fieldValue] || fieldValue;
            });

        console.log('Комментарий менеджера:', comment);
        console.log('Выбранные поля:', selectedFields);

        // Определяем тип отказа и формируем итоговый комментарий
        const isRevision = selectedFields.length > 0;
        let finalComment = comment;
        
        if (isRevision) {
            // Для доработки добавляем автоматическую часть
            finalComment = `${comment}\n\nНеобходимо изменить следующие поля:\n${selectedFields.join(', ')}`;
        }

        console.log('Сформированный комментарий:', finalComment);
        console.log('Тип отказа:', isRevision ? 'на доработку' : 'полный отказ');
        console.log('userId:', this.userId);

        // Показываем загрузку на кнопке в модальном окне
        this.setButtonLoading(this.confirmRejectionModal, true);

        try {
            // Определяем эндпоинт и тело запроса
            const endpoint = isRevision 
                ? '/moderators-module/send-to-revision'
                : '/moderators-module/send-to-reject';

            const requestBody = {
                profile: this.userId,
                message: finalComment
            };

            console.log('Используемый эндпоинт:', endpoint);
            console.log('Тело запроса:', requestBody);
            console.log('Комментарий для сохранения:', finalComment);

            // Выполняем запрос
            const response = await this.makeAuthenticatedRequest(endpoint, {
                method: 'PATCH',
                body: JSON.stringify(requestBody)
            });

            console.log('Ответ от API:', response);

            if (response) {
                // Показываем уведомление об успехе
                const message = isRevision 
                    ? 'Заявка отправлена на доработку' 
                    : 'Заявка отклонена';
                this.showNotification(message, 'success');

                // Скрываем модальное окно и секцию отказа
                this.hideRejectionModal();
                this.hideRejectionCard();

                // Перенаправляем на страницу списка верификации
                setTimeout(() => {
                    window.location.href = '/verification/list/';
                }, 1500);
            } else {
                throw new Error('Пустой ответ от сервера');
            }
        } catch (error) {
            console.error('Ошибка при отправке отказа:', error);
            this.showNotification('Ошибка при отправке запроса', 'error');
        } finally {
            // Скрываем загрузку с кнопки
            this.setButtonLoading(this.confirmRejectionModal, false);
            console.log('=== КОНЕЦ ПРОЦЕССА ОТКАЗА ===');
        }
    }

    // Метод для отображения блоков в зависимости от статуса
    updateStatusSpecificSections(status) {
        console.log('updateStatusSpecificSections вызван со статусом:', status);
        
        // Скрываем все статусные блоки
        const rejectedSection = document.getElementById('rejectedInfoSection');
        const acceptedSection = document.getElementById('acceptedInfoSection');
        const rejectionSection = document.getElementById('rejectionSection'); // Секция с формой отказа
        const contractSection = document.getElementById('contractSigningSection'); // Блок с договором
        
        console.log('Найдены элементы:', {
            rejectButton: !!this.rejectButton,
            rejectVerificationCard: !!this.rejectVerificationCard,
            rejectButtonDisplay: this.rejectButton ? this.rejectButton.style.display : 'not found',
            rejectVerificationCardDisplay: this.rejectVerificationCard ? this.rejectVerificationCard.style.display : 'not found'
        });
        
        // Дополнительная проверка - ищем кнопки другими способами
        console.log('Все элементы с rejectVerification:', document.querySelectorAll('[id*="rejectVerification"]'));
        console.log('Все кнопки btn-action:', document.querySelectorAll('.btn-action'));
        
        if (rejectedSection) rejectedSection.style.display = 'none';
        if (acceptedSection) acceptedSection.style.display = 'none';
        if (rejectionSection) {
            rejectionSection.classList.add('hidden');
            rejectionSection.style.display = 'none';
        }
        
        // По умолчанию показываем блок с договором
        if (contractSection) contractSection.style.display = 'block';
        
        // Показываем соответствующий блок
        switch (status) {
            case 'rejected':
            case 'refused': // Полный отказ
            case 'Отказано': // Русское название статуса
                console.log('Обработка статуса: отклонено/отказано');
                this.showRejectedSection(false); // false = не показывать поля для исправления
                this.hideRejectionCard();
                if (contractSection) contractSection.style.display = 'none';
                this.updateContractSection('rejected');
                break;
            case 'accepted':
                console.log('Обработка статуса: принято');
                this.showAcceptedSection();
                this.hideRejectionCard();
                this.updateContractSection('accepted');
                break;
            case 'draft': // На доработке
            case 'Документ на доработке': // Русское название статуса
                console.log('Обработка статуса: на доработке');
                this.showRejectedSection(true); // true = показывать поля для исправления
                this.hideRejectionCard();
                if (contractSection) contractSection.style.display = 'block';
                this.updateContractSection('draft');
                break;
            case 'in-progress':
            case 'document':
            case 'sent':
            case 'waiting':
            default:
                console.log('Обработка статуса: в процессе', status);
                // Для статусов в процессе показываем кнопку отказа
                this.showRejectionCard();
                this.updateContractSection('waiting');
                break;
        }
    }

    // Обновление блока договора в зависимости от статуса
    updateContractSection(status) {
        const contractTitle = document.getElementById('contractStatusTitle');
        const contractBadge = document.getElementById('contractStatusBadge');
        const contractAlert = document.getElementById('contractAlert');
        const contractAlertTitle = document.getElementById('contractAlertTitle');
        const contractAlertText = document.getElementById('contractAlertText');
        const contractAlertIcon = document.getElementById('contractAlertIcon');

        // Обновляем плашку в блоке Данные организации
        const orgContractAlert = document.getElementById('organizationContractAlert');
        const orgContractAlertTitle = document.getElementById('organizationContractAlertTitle');
        const orgContractAlertText = document.getElementById('organizationContractAlertText');
        const orgContractAlertIcon = document.getElementById('organizationContractAlertIcon');

        switch (status) {
            case 'draft':
            case 'Документ на доработке':
                // Статус "Документ на доработке"
                if (contractTitle) contractTitle.textContent = 'Документ на доработке';
                if (contractBadge) {
                    contractBadge.className = 'verification-badge warning';
                    contractBadge.innerHTML = '<i class="fas fa-edit"></i> Документ на доработке';
                }
                if (contractAlert) {
                    contractAlert.style.borderLeft = '4px solid #fd7e14';
                }
                if (contractAlertIcon) {
                    contractAlertIcon.className = 'fas fa-exclamation-triangle';
                    contractAlertIcon.style.color = '#fd7e14';
                }
                if (contractAlertTitle) contractAlertTitle.textContent = 'Анкета на доработке';
                if (contractAlertText) contractAlertText.textContent = 'Анкета пользователя была отправлена на доработку. Если вы решили, что это было ошибкой, то вы можете подписать договор на Диадоке, который был раннее выслан при заполнении анкеты пользователем';

                // Обновляем плашку в блоке Данные организации
                if (orgContractAlert) {
                    orgContractAlert.style.borderLeft = '4px solid #fd7e14';
                }
                if (orgContractAlertIcon) {
                    orgContractAlertIcon.className = 'fas fa-exclamation-triangle';
                    orgContractAlertIcon.style.color = '#fd7e14';
                }
                if (orgContractAlertTitle) orgContractAlertTitle.textContent = 'Документ на доработке';
                if (orgContractAlertText) orgContractAlertText.textContent = 'Анкета пользователя была отправлена на доработку. Если вы решили, что это было ошибкой, то вы можете подписать договор на Диадоке, который был раннее выслан при заполнении анкеты пользователем';

                // Скрываем лишние плашки в блоке Данные организации
                const organizationDataSection = document.querySelector('.organization-data');
                if (organizationDataSection) {
                    // Скрываем плашку "Внимание: необходимо проверить данные"
                    const warningAlert = organizationDataSection.querySelector('.info-alert');
                    if (warningAlert && warningAlert.querySelector('h4')?.textContent?.includes('Внимание: необходимо проверить данные')) {
                        warningAlert.style.display = 'none';
                    }
                    
                    // Скрываем плашку "Требует проверки" в заголовке
                    const sectionActions = organizationDataSection.querySelector('.section-actions');
                    if (sectionActions) {
                        sectionActions.style.display = 'none';
                    }
                }
                break;
            case 'rejected':
                // Статус "Отказано"
                if (contractTitle) contractTitle.textContent = 'Отказано';
                if (contractBadge) {
                    contractBadge.className = 'verification-badge danger';
                    contractBadge.innerHTML = '<i class="fas fa-ban"></i> Отказано';
                }
                if (contractAlert) {
                    contractAlert.style.borderLeft = '4px solid #dc3545';
                }
                if (contractAlertIcon) {
                    contractAlertIcon.className = 'fas fa-ban';
                    contractAlertIcon.style.color = '#dc3545';
                }
                if (contractAlertTitle) contractAlertTitle.textContent = 'Пользователю отказано верификация';
                if (contractAlertText) contractAlertText.textContent = 'При полном отказе в верификации пользователю недоступен основной функционал "Введение сделок".';

                // Обновляем плашку в блоке Данные организации
                if (orgContractAlert) {
                    orgContractAlert.style.borderLeft = '4px solid #dc3545';
                }
                if (orgContractAlertIcon) {
                    orgContractAlertIcon.className = 'fas fa-ban';
                    orgContractAlertIcon.style.color = '#dc3545';
                }
                if (orgContractAlertTitle) orgContractAlertTitle.textContent = 'Пользователю отказано верификация';
                if (orgContractAlertText) orgContractAlertText.textContent = 'При полном отказе в верификации пользователю недоступен основной функционал "Введение сделок".';

                // Скрываем лишние плашки в блоке Данные организации
                const organizationDataSectionRejected = document.querySelector('.organization-data');
                if (organizationDataSectionRejected) {
                    // Скрываем плашку "Внимание: необходимо проверить данные"
                    const warningAlert = organizationDataSectionRejected.querySelector('.info-alert');
                    if (warningAlert && warningAlert.querySelector('h4')?.textContent?.includes('Внимание: необходимо проверить данные')) {
                        warningAlert.style.display = 'none';
                    }
                    
                    // Скрываем плашку "Требует проверки" в заголовке
                    const sectionActions = organizationDataSectionRejected.querySelector('.section-actions');
                    if (sectionActions) {
                        sectionActions.style.display = 'none';
                    }
                }
                break;
            case 'accepted':
                // Статус "Принято"
                if (contractTitle) contractTitle.textContent = 'Подписание договора';
                if (contractBadge) {
                    contractBadge.className = 'verification-badge success';
                    contractBadge.innerHTML = '<i class="fas fa-check-circle"></i> Верификация пройдена';
                }
                if (contractAlert) {
                    contractAlert.style.borderLeft = '4px solid #28a745';
                }
                if (contractAlertIcon) {
                    contractAlertIcon.className = 'fas fa-check-circle';
                    contractAlertIcon.style.color = '#28a745';
                }
                if (contractAlertTitle) contractAlertTitle.textContent = 'Верификация пройдена';
                if (contractAlertText) contractAlertText.textContent = 'Пользователь успешно прошел верификацию. Договор подписан и активен.';

                // Обновляем плашку в блоке Данные организации
                if (orgContractAlert) {
                    orgContractAlert.style.borderLeft = '4px solid #28a745';
                }
                if (orgContractAlertIcon) {
                    orgContractAlertIcon.className = 'fas fa-check-circle';
                    orgContractAlertIcon.style.color = '#28a745';
                }
                if (orgContractAlertTitle) orgContractAlertTitle.textContent = 'Верификация пройдена';
                if (orgContractAlertText) orgContractAlertText.textContent = 'Пользователь успешно прошел верификацию. Договор подписан и активен.';

                // Восстанавливаем плашки в блоке Данные организации
                const organizationDataSectionAccepted = document.querySelector('.organization-data');
                if (organizationDataSectionAccepted) {
                    // Показываем плашку "Внимание: необходимо проверить данные"
                    const warningAlert = organizationDataSectionAccepted.querySelector('.info-alert');
                    if (warningAlert && warningAlert.querySelector('h4')?.textContent?.includes('Внимание: необходимо проверить данные')) {
                        warningAlert.style.display = '';
                    }
                    
                    // Скрываем плашку "Требует проверки" в заголовке (для принятого статуса)
                    const sectionActions = organizationDataSectionAccepted.querySelector('.section-actions');
                    if (sectionActions) {
                        sectionActions.style.display = 'none';
                    }
                }
                break;
            case 'waiting':
            default:
                // Статус по умолчанию
                if (contractTitle) contractTitle.textContent = 'Подписание договора';
                if (contractBadge) {
                    contractBadge.className = 'verification-badge waiting';
                    contractBadge.innerHTML = '<i class="fas fa-hourglass-half"></i> Ожидает подписания';
                }
                if (contractAlert) {
                    contractAlert.style.borderLeft = '';
                }
                if (contractAlertIcon) {
                    contractAlertIcon.className = 'fas fa-info-circle';
                    contractAlertIcon.style.color = '';
                }
                if (contractAlertTitle) contractAlertTitle.textContent = 'Договор отправлен на подписание';
                if (contractAlertText) contractAlertText.textContent = 'Договор был отправлен на подписание через сервис Контур.Диадок. Для подтверждения верификации пользователя необходимо его подписание. В случае отказа нажмите кнопку "Отказать верификацию".';

                // Обновляем плашку в блоке Данные организации
                if (orgContractAlert) {
                    orgContractAlert.style.borderLeft = '';
                }
                if (orgContractAlertIcon) {
                    orgContractAlertIcon.className = 'fas fa-info-circle';
                    orgContractAlertIcon.style.color = '';
                }
                if (orgContractAlertTitle) orgContractAlertTitle.textContent = 'Договор отправлен на подписание';
                if (orgContractAlertText) orgContractAlertText.textContent = 'Договор был отправлен на подписание через сервис Контур.Диадок. Для подтверждения верификации пользователя необходимо его подписание. В случае отказа нажмите кнопку "Отказать верификацию".';

                // Восстанавливаем плашки в блоке Данные организации
                const organizationDataSectionDefault = document.querySelector('.organization-data');
                if (organizationDataSectionDefault) {
                    // Показываем плашку "Внимание: необходимо проверить данные"
                    const warningAlert = organizationDataSectionDefault.querySelector('.info-alert');
                    if (warningAlert && warningAlert.querySelector('h4')?.textContent?.includes('Внимание: необходимо проверить данные')) {
                        warningAlert.style.display = '';
                    }
                    
                    // Показываем плашку "Требует проверки" в заголовке
                    const sectionActions = organizationDataSectionDefault.querySelector('.section-actions');
                    if (sectionActions) {
                        sectionActions.style.display = '';
                    }
                }
                break;
        }
    }

    // Показать плашку отказа
    showRejectionCard() {
        if (this.rejectVerificationCard) {
            this.rejectVerificationCard.classList.remove('hidden');
            console.log('Плашка отказа показана');
        }
        if (this.rejectButton) {
            this.rejectButton.classList.remove('hidden');
            console.log('Кнопка отказа показана');
        }
    }

    // Скрыть плашку отказа
    hideRejectionCard() {
        if (this.rejectVerificationCard) {
            this.rejectVerificationCard.classList.add('hidden');
            console.log('Плашка отказа скрыта');
        }
        if (this.rejectButton) {
            this.rejectButton.classList.add('hidden');
            console.log('Кнопка отказа скрыта');
        }
    }

    // Показать блок для отклоненной верификации
    showRejectedSection(showFields = false) {
        console.log('showRejectedSection вызван с showFields =', showFields);
        
        const rejectedSection = document.getElementById('rejectedInfoSection');
        if (rejectedSection) {
            rejectedSection.style.display = 'block';
            
            // Обновляем моковые данные (позже будем получать с бэкенда)
            this.updateRejectedInfo(showFields);
            
            // Если это доработка, не подсвечиваем поля, а показываем реальные данные
            if (showFields) {
                console.log('Это статус доработки, поля не подсвечиваем');
            } else {
                console.log('Это статус отказа, очищаем подсветку полей');
                this.clearFieldHighlights();
            }
        } else {
            console.error('rejectedInfoSection не найден');
        }
    }

    // Показать блок для принятой верификации
    showAcceptedSection() {
        const acceptedSection = document.getElementById('acceptedInfoSection');
        if (acceptedSection) {
            acceptedSection.style.display = 'block';
            
            // Обновляем моковые данные (позже будем получать с бэкенда)
            this.updateAcceptedInfo();
        }
    }

    // Обновить информацию для отклоненной заявки
    updateRejectedInfo(showFields = false) {
        console.log('updateRejectedInfo вызван с showFields =', showFields);
        
        // Используем реальные данные из rejectProfile
        const rejectData = this.userData.rejectProfile ? {
            rejectionDate: this.userData.rejectProfile.created_at ? 
                new Date(this.userData.rejectProfile.created_at).toLocaleString('ru-RU') : 
                new Date().toLocaleString('ru-RU'),
            manager: this.userData.rejectProfile.manager && this.userData.rejectProfile.manager.managerProfile ? 
                `${this.userData.rejectProfile.manager.managerProfile.lastName || ''} ${this.userData.rejectProfile.manager.managerProfile.firstName || ''} ${this.userData.rejectProfile.manager.managerProfile.patronymic || ''}`.trim() :
                'Менеджер',
            reason: this.userData.rejectProfile.message || 'Причина отклонения не указана',
            fields: []
        } : {
            // Заглушка, если нет данных rejectProfile
            rejectionDate: new Date().toLocaleString('ru-RU'),
            manager: 'Не указан',
            reason: 'Причина отклонения не указана',
            fields: []
        };

        // Если нужно показать поля, парсим их из сообщения
        if (showFields && rejectData.reason) {
            rejectData.fields = this.parseFieldsFromMessage(rejectData.reason);
        }

        // Реорганизуем структуру полей для статусов доработки и отказано
        this.reorganizeRejectionFields();

        // Обновляем заголовок и иконку в зависимости от статуса
        const statusTitle = document.getElementById('rejectionStatusTitle');
        const statusIcon = document.getElementById('rejectionStatusIcon');
        const rejectedSection = document.getElementById('rejectedInfoSection');
        
        if (this.userData.verificationStatus && this.userData.verificationStatus.name) {
            if (statusTitle) statusTitle.textContent = this.userData.verificationStatus.name;
            
            // Меняем цвет и иконку для статуса "Документ на доработке"
            if (this.userData.verificationStatus.id === 6 || this.userData.verificationStatus.name === 'Документ на доработке') {
                if (statusIcon) {
                    statusIcon.className = 'fas fa-edit';
                    statusIcon.style.color = '#fd7e14'; // Оранжевый цвет
                }
                if (rejectedSection) {
                    rejectedSection.style.borderLeft = '4px solid #fd7e14';
                }
            }
            // Для статуса "Отказано" оставляем красный цвет и иконку запрета
            else if (this.userData.verificationStatus.name === 'Отказано') {
                if (statusIcon) {
                    statusIcon.className = 'fas fa-ban';
                    statusIcon.style.color = '#dc3545'; // Красный цвет
                }
                if (rejectedSection) {
                    rejectedSection.style.borderLeft = '4px solid #dc3545';
                }
            }
        }

        // Обновляем элементы
        const elements = {
            rejectionDate: document.getElementById('rejectionDate'),
            rejectionManager: document.getElementById('rejectionManager'),
            rejectionReason: document.getElementById('rejectionReason')
        };

        if (elements.rejectionDate) elements.rejectionDate.textContent = rejectData.rejectionDate;
        if (elements.rejectionManager) elements.rejectionManager.textContent = rejectData.manager;
        if (elements.rejectionReason) elements.rejectionReason.textContent = rejectData.reason;

        // Показываем/скрываем блок с полями для исправления
        const fieldsContainer = document.getElementById('rejectionFieldsContainer');
        if (fieldsContainer) {
            fieldsContainer.style.display = showFields && rejectData.fields.length > 0 ? 'flex' : 'none';
            console.log('Блок с полями исправления:', showFields && rejectData.fields.length > 0 ? 'показан' : 'скрыт');
        }

        // Обновить поля для исправления
        this.updateRejectionFields(rejectData.fields);
    }

    // Реорганизация полей в плашке отказа для статусов доработки и отказано
    reorganizeRejectionFields() {
        const statusName = this.userData.verificationStatus?.name;
        
        // Применяем только для статусов "Документ на доработке" и "Отказано"
        if (statusName === 'Документ на доработке' || statusName === 'Отказано') {
            const rejectionDetails = document.querySelector('.rejection-details');
            if (!rejectionDetails) return;

            // Проверяем, не реорганизовали ли уже
            if (rejectionDetails.querySelector('.rejection-detail-row')) return;

            const dateItem = rejectionDetails.querySelector('.rejection-detail-item:nth-child(1)');
            const managerItem = rejectionDetails.querySelector('.rejection-detail-item:nth-child(2)');
            
            if (dateItem && managerItem) {
                // Создаем обертку для двух полей
                const row = document.createElement('div');
                row.className = 'rejection-detail-row';
                row.style.display = 'flex';
                row.style.gap = '20px';
                
                // Перемещаем поля в обертку
                row.appendChild(dateItem.cloneNode(true));
                row.appendChild(managerItem.cloneNode(true));
                
                // Удаляем оригинальные элементы
                dateItem.remove();
                managerItem.remove();
                
                // Вставляем обертку в начало
                rejectionDetails.prepend(row);
                
                // Устанавливаем ширину для элементов в строке
                const itemsInRow = row.querySelectorAll('.rejection-detail-item');
                itemsInRow.forEach(item => {
                    item.style.flex = '1';
                });
            }
        }
    }

    // Распарсить поля из сообщения об отказе
    parseFieldsFromMessage(message) {
        const fields = [];
        
        // Ищем секцию с полями в сообщении
        const fieldsSectionRegex = /Необходимо изменить следующие поля:\s*([\s\S]*?)(?:\n\n|$)/;
        const match = message.match(fieldsSectionRegex);
        
        if (match && match[1]) {
            // Разделяем поля по запятым и убираем лишние пробелы
            const fieldNames = match[1].split(',').map(field => field.trim()).filter(field => field);
            
            // Маппинг названий полей на иконки
            const fieldIconMap = {
                'Фамилия': 'fa-user',
                'Имя': 'fa-user',
                'Отчество': 'fa-user',
                'Дата рождения': 'fa-calendar',
                'Email': 'fa-envelope',
                'ИНН': 'fa-id-card',
                'ОГРНИП': 'fa-certificate',
                'Название организации': 'fa-building',
                'Юридический адрес': 'fa-map-marker-alt',
                'Наименование банка': 'fa-university',
                'БИК': 'fa-link',
                'Корреспондентский счет': 'fa-landmark',
                'Расчетный счет': 'fa-wallet'
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

    // Обновить информацию для принятой заявки
    updateAcceptedInfo() {
        // Используем реальные данные менеджера
        const managerData = this.userData.manager ? {
            acceptanceDate: this.userData.verificationHistory && this.userData.verificationHistory.length > 0 ? 
                new Date(this.userData.verificationHistory[0].created_at).toLocaleString('ru-RU') : 
                new Date().toLocaleString('ru-RU'),
            manager: this.userData.manager.profileType === 'entrepreneur' && this.userData.manager.entrepreneurProfile ? 
                `${this.userData.manager.entrepreneurProfile.lastName || ''} ${this.userData.manager.entrepreneurProfile.firstName || ''} ${this.userData.manager.entrepreneurProfile.patronymic || ''}`.trim() :
                'Менеджер'
        } : {
            // Заглушка, если нет данных менеджера
            acceptanceDate: new Date().toLocaleString('ru-RU'),
            manager: 'Не указан'
        };

        const elements = {
            acceptanceDate: document.getElementById('acceptanceDate'),
            acceptanceManager: document.getElementById('acceptanceManager')
        };

        if (elements.acceptanceDate) elements.acceptanceDate.textContent = managerData.acceptanceDate;
        if (elements.acceptanceManager) elements.acceptanceManager.textContent = managerData.manager;
    }

    // Обновить поля для исправления
    updateRejectionFields(fields) {
        const fieldsList = document.getElementById('rejectionFieldsList');
        if (fieldsList && fields) {
            fieldsList.innerHTML = fields.map(field => `
                <span class="rejection-field-tag">
                    <i class="fas ${field.icon}"></i>
                    ${field.name}
                </span>
            `).join('');
        }
    }

    // Подсветить поля требующие корректировки
    highlightFieldsToCorrect() {
        // Моковые данные о полях для исправления
        const fieldsToCorrect = [
            'bank-corr-account', // Корреспондентский счет
            'organization-inn'   // ИНН
        ];

        console.log('Попытка подсветить поля:', fieldsToCorrect);

        fieldsToCorrect.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            console.log(`Ищем элемент с ID ${fieldId}:`, element);
            
            if (element) {
                // Применяем стили как в cancel_verification.html
                element.style.background = '#fee2e2';
                element.style.color = '#dc2626';
                element.style.border = '1px solid #fecaca';
                element.style.padding = '0.75rem';
                element.style.borderRadius = 'var(--border-radius-sm)';
                
                // Добавляем иконку и текст как в примере
                if (!element.querySelector('.fa-exclamation-triangle')) {
                    // Очищаем текущее содержимое
                    const originalText = element.textContent.trim();
                    element.innerHTML = '';
                    
                    // Добавляем иконку
                    const icon = document.createElement('i');
                    icon.className = 'fas fa-exclamation-triangle';
                    icon.style.marginRight = '0.5rem';
                    icon.style.color = '#dc2626';
                    element.appendChild(icon);
                    
                    // Добавляем текст
                    const textSpan = document.createElement('span');
                    textSpan.textContent = 'Требуется заполнение';
                    element.appendChild(textSpan);
                    
                    console.log(`Поле ${fieldId} обновлено с текстом "Требуется заполнение"`);
                }
                
                console.log(`Поле ${fieldId} успешно подсвечено`);
            } else {
                console.warn(`Элемент с ID ${fieldId} не найден`);
            }
        });
    }

    // Очистить подсветку полей
    clearFieldHighlights() {
        const fieldsToCorrect = [
            'bank-corr-account',
            'organization-inn'
        ];

        // Оригинальные значения для восстановления
        const originalValues = {
            'bank-corr-account': '30101810400000000225',
            'organization-inn': '123456789012'
        };

        console.log('Попытка очистить подсветку полей:', fieldsToCorrect);

        fieldsToCorrect.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            console.log(`Ищем элемент для очистки с ID ${fieldId}:`, element);
            
            if (element) {
                // Восстанавливаем стили
                element.style.background = '';
                element.style.color = '';
                element.style.border = '';
                element.style.padding = '';
                element.style.borderRadius = '';
                
                // Восстанавливаем оригинальное значение
                element.textContent = originalValues[fieldId];
                
                console.log(`Подсветка поля ${fieldId} успешно очищена, значение восстановлено`);
            } else {
                console.warn(`Элемент для очистки с ID ${fieldId} не найден`);
            }
        });
    }
    setButtonLoading(buttonElement, isLoading) {
        if (!buttonElement) return;
        
        if (isLoading) {
            buttonElement.disabled = true;
            const originalText = buttonElement.innerHTML;
            buttonElement.setAttribute('data-original-text', originalText);
            buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
        } else {
            buttonElement.disabled = false;
            const originalText = buttonElement.getAttribute('data-original-text');
            buttonElement.innerHTML = originalText || 'Подтвердить';
        }
    }

    // Обновление данных пользователя без перезагрузки страницы
    async refreshUserData() {
        try {
            // Показываем загрузку
            this.showLoading();
            
            // Загружаем свежие данные
            await this.loadUserData();
            
            // Обновляем интерфейс новыми данными
            this.populateUserData();
            
            // Скрываем загрузку
            this.hideLoading();
            
            console.log('Данные пользователя успешно обновлены');
        } catch (error) {
            console.error('Ошибка при обновлении данных:', error);
            this.showError('Не удалось обновить данные');
            this.hideLoading();
        }
    }

    downloadContract() {
        // В реальном приложении здесь будет логика скачивания файла
        console.log('Скачивание договора...');

        // Имитация скачивания
        this.showNotification('Договор начинает скачиваться...', 'info');

        // Через 1 секунду показываем успешное скачивание
        setTimeout(() => {
            this.showNotification('Договор успешно скачан', 'success');
        }, 1000);
    }

    goToChat() {
        // В реальном приложении здесь будет переход в чат
        console.log('Переход в чат с пользователем...');
        this.showNotification('Открывается чат с пользователем...', 'info');

        // Имитация перехода
        setTimeout(() => {
            this.showNotification('Чат открыт в новой вкладке', 'success');
        }, 500);
    }

    acceptVerification() {
        // В реальном приложении здесь будет логика принятия верификации
        console.log('Принятие верификации...');
        this.showNotification('Верификация принята. Пользователь активирован.', 'success');
        this.updateVerificationStatus('accepted');
    }

    updateVerificationStatus(status) {
        const statusBadge = document.querySelector('.verification-status-badge .status-indicator');
        const statusConfig = {
            'rejected': {
                class: 'rejected',
                icon: 'fas fa-times-circle',
                text: 'Отклонена'
            },
            'accepted': {
                class: 'accepted',
                icon: 'fas fa-check-circle',
                text: 'Принята'
            },
            'waiting': {
                class: 'waiting',
                icon: 'fas fa-hourglass-half',
                text: 'В ожидании'
            }
        };

        if (statusBadge && statusConfig[status]) {
            const config = statusConfig[status];
            statusBadge.className = `status-indicator ${config.class} expanded`;
            statusBadge.querySelector('.status-icon').className = `${config.icon} status-icon`;
            statusBadge.querySelector('.status-text').textContent = config.text;
        }

        // Обновляем статусные блоки
        this.updateStatusSpecificSections(status);
    }

    getUserIdFromURL() {
        // Получаем ID пользователя из URL формата /verification/detail/user/{user_id}/
        const urlPath = window.location.pathname;
        console.log('Current URL path:', urlPath);
        
        // Ищем совпадение с паттерном /verification/detail/user/{uuid}/
        const match = urlPath.match(/\/verification\/detail\/user\/([a-f0-9-]{36})\//);
        if (match && match[1]) {
            console.log('Found user ID from URL:', match[1]);
            return match[1];
        }
        
        // Альтернативный способ: получаем из query параметра
        const urlParams = new URLSearchParams(window.location.search);
        const queryId = urlParams.get('id');
        if (queryId) {
            console.log('Found user ID from query params:', queryId);
            return queryId;
        }
        
        console.log('User ID not found in URL');
        return null;
    }

    getUserIdFromTemplate() {
        // Получаем ID пользователя из Django template
        const userIdElement = document.getElementById('user_id');
        return userIdElement ? userIdElement.textContent.trim() : null;
    }

    // Функция для получения заголовков авторизации (такая же как в списке)
    async getAuthHeaders() {
        try {
            // Проверяем localStorage перед вызовом
            console.log('Содержимое localStorage перед getAuthTokens:', {
                accessToken: localStorage.getItem('accessToken'),
                refreshToken: localStorage.getItem('refreshToken'),
                allKeys: Object.keys(localStorage)
            });
            
            // Проверяем, доступна ли функция getAuthTokens из total_post.js
            if (typeof getAuthTokens === 'function') {
                const authResult = await getAuthTokens();
                console.log('Результат getAuthTokens:', authResult);
                
                if (authResult.status === 403 || authResult.status === 409) {
                    // Если токены отсутствуют или недействительны, выходим из системы
                    console.log('Токены недействительны, но НЕ выходим из системы для диагностики');
                    // Временно комментируем выход
                    // if (typeof logout === 'function') {
                    //     logout();
                    // }
                    // window.location.href = '/';
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
            console.log('localStorage после ошибки:', {
                accessToken: localStorage.getItem('accessToken'),
                refreshToken: localStorage.getItem('refreshToken'),
                allKeys: Object.keys(localStorage)
            });
            // В случае ошибки используем моковые данные
            return null;
        }
    }

    // Функция для выполнения запроса к API с авторизацией (такая же как в списке)
    async makeAuthenticatedRequest(url, options = {}) {
        try {
            const headers = await this.getAuthHeaders();
            if (!headers) {
                // Если нет заголовков авторизации, НЕ перенаправляем для диагностики
                console.log('Нет токена авторизации, но НЕ перенаправляем для диагностики');
                // Временно комментируем перенаправление
                // if (typeof logout === 'function') {
                //     logout();
                // }
                // window.location.href = '/';
                return null;
            }
            
            const response = await fetch(`${API_CONFIG.BASE_URL}${url.replace('/api/', '')}`, {
                ...options,
                headers: {
                    ...headers,
                    ...options.headers
                },
                timeout: API_CONFIG.TIMEOUT
            });
            
            if (response.status === 401 || response.status === 403) {
                // Токен истек или недействителен, но НЕ перенаправляем для диагностики
                console.log('Токен истек или недействителен, но НЕ перенаправляем для диагностики');
                // Временно комментируем перенаправление
                // if (typeof logout === 'function') {
                //     logout();
                // }
                // window.location.href = '/';
                throw new Error('Авторизация не удалась');
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`Ошибка запроса к ${url}:`, error);
            console.log('localStorage после ошибки запроса:', {
                accessToken: localStorage.getItem('accessToken'),
                refreshToken: localStorage.getItem('refreshToken'),
                allKeys: Object.keys(localStorage)
            });
            // В случае ошибки тоже НЕ перенаправляем для диагностики
            // if (typeof logout === 'function') {
            //     logout();
            // }
            // window.location.href = '/';
            return null;
        }
    }

    // Загрузка данных пользователя
    async loadUserData() {
        if (!this.userId) {
            throw new Error('ID пользователя не указан');
        }

        try {
            console.log(`Загрузка данных пользователя: ${this.userId}`);
            
            const response = await this.makeAuthenticatedRequest(`/moderators-module/all-by-user?id=${this.userId}`);
            
            console.log('Ответ от API:', response);
            
            // API возвращает объект пользователя напрямую
            if (response && typeof response === 'object' && response.id) {
                this.userData = response;
                console.log('Данные пользователя загружены:', this.userData);
                return this.userData;
            } else {
                throw new Error('Пользователь не найден или неверный формат ответа');
            }
        } catch (error) {
            console.error('Ошибка при загрузке данных пользователя:', error);
            throw error;
        }
    }

    // Заполнение интерфейса данными пользователя
    populateUserData() {
        if (!this.userData) {
            console.error('Нет данных пользователя для заполнения');
            return;
        }

        // Заполняем основную информацию
        this.populateMainInfo();
        
        // Заполняем личные данные
        this.populatePersonalData();
        
        // Заполняем данные организации
        this.populateOrganizationData();
        
        // Заполняем статус верификации
        this.populateVerificationStatus();
    }

    populateMainInfo() {
        // ФИО - собираем из отдельных полей
        const lastNameElements = document.querySelectorAll('.user-last-name');
        const firstNameElements = document.querySelectorAll('.user-first-name');
        const patronymicElements = document.querySelectorAll('.user-patronymic');
        const fullNameElements = document.querySelectorAll('.user-name, .user-full-name');
        
        let lastName = '', firstName = '', patronymic = '';
        
        if (this.userData.entrepreneurProfile) {
            const profile = this.userData.entrepreneurProfile;
            lastName = profile.lastName || '';
            firstName = profile.firstName || '';
            patronymic = profile.patronymic || '';
        } else if (this.userData.juridicalProfile) {
            const profile = this.userData.juridicalProfile;
            lastName = profile.lastName || '';
            firstName = profile.firstName || '';
            patronymic = profile.patronymic || '';
        }
        
        // Заполняем отдельные поля
        lastNameElements.forEach(el => { el.textContent = lastName || 'Не указано'; });
        firstNameElements.forEach(el => { el.textContent = firstName || 'Не указано'; });
        patronymicElements.forEach(el => { el.textContent = patronymic || 'Не указано'; });
        
        // Заполняем полное ФИО
        const fullName = `${lastName} ${firstName} ${patronymic}`.trim();
        fullNameElements.forEach(el => { el.textContent = fullName || 'Не указано'; });

        // Email
        const emailElements = document.querySelectorAll('.user-email');
        emailElements.forEach(el => {
            el.textContent = this.userData.email || 'Не указано';
        });

        // Телефон
        const phoneElements = document.querySelectorAll('.user-phone');
        phoneElements.forEach(el => {
            el.textContent = this.userData.phone || 'Не указано';
        });

        // Роль - берем из profileRoles.name
        const roleElements = document.querySelectorAll('.user-role');
        const roleText = this.getRoleDisplayName(this.userData.profileRoles?.name || 'unknown');
        roleElements.forEach(el => {
            el.textContent = roleText;
        });

        // Дата регистрации - пока не доступна в API, показываем заглушку
        const registrationElements = document.querySelectorAll('.user-registration-date');
        registrationElements.forEach(el => {
            el.textContent = 'Не указано';
        });

        // Рейтинг
        const ratingElements = document.querySelectorAll('.user-rating');
        ratingElements.forEach(el => {
            el.textContent = this.userData.rating || 0;
        });
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

    populatePersonalData() {
        let profile = null;
        
        if (this.userData.profileType === 'entrepreneur' && this.userData.entrepreneurProfile) {
            profile = this.userData.entrepreneurProfile;
        } else if (this.userData.profileType === 'juridical' && this.userData.juridicalProfile) {
            profile = this.userData.juridicalProfile;
        }

        if (!profile) return;

        // Дата рождения
        const birthDateElements = document.querySelectorAll('.birth-date');
        birthDateElements.forEach(el => {
            if (profile.dateOfBirth) {
                const birthDate = new Date(profile.dateOfBirth);
                if (!isNaN(birthDate.getTime())) {
                    const currentDate = new Date();
                    let age = currentDate.getFullYear() - birthDate.getFullYear();
                    
                    // Корректировка возраста
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
                    
                    el.textContent = `${formattedDate} (${age} ${ageText})`;
                } else {
                    el.textContent = 'Нет данных';
                }
            } else {
                el.textContent = 'Нет данных';
            }
        });
    }

    populateOrganizationData() {
        let profile = null;
        
        if (this.userData.profileType === 'entrepreneur' && this.userData.entrepreneurProfile) {
            profile = this.userData.entrepreneurProfile;
        } else if (this.userData.profileType === 'juridical' && this.userData.juridicalProfile) {
            profile = this.userData.juridicalProfile;
        }

        if (!profile) return;

        // Название организации
        const orgNameElements = document.querySelectorAll('.organization-name');
        orgNameElements.forEach(el => {
            el.textContent = profile.organizationName || 'Не указано';
        });

        // ИНН
        const innElements = document.querySelectorAll('.organization-inn');
        innElements.forEach(el => {
            el.textContent = profile.inn || 'Не указано';
        });

        // ОГРНИП/ОГРН
        const ogrnElements = document.querySelectorAll('.organization-ogrn');
        ogrnElements.forEach(el => {
            el.textContent = profile.ogrnip || profile.ogrn || 'Не указано';
        });

        // Юридический адрес
        const addressElements = document.querySelectorAll('.organization-address');
        addressElements.forEach(el => {
            el.textContent = profile.legalAddress || 'Не указано';
        });

        // Банковские данные
        const bankNameElements = document.querySelectorAll('.bank-name');
        bankNameElements.forEach(el => {
            el.textContent = profile.bankName || 'Не указано';
        });

        const bikElements = document.querySelectorAll('.bank-bik');
        bikElements.forEach(el => {
            el.textContent = profile.bik || 'Не указано';
        });

        const corrAccountElements = document.querySelectorAll('.bank-corr-account');
        corrAccountElements.forEach(el => {
            el.textContent = profile.correspondentAccount || 'Не указано';
        });

        const checkingAccountElements = document.querySelectorAll('.bank-checking-account');
        checkingAccountElements.forEach(el => {
            el.textContent = profile.checkingAccount || 'Не указано';
        });
    }

    populateVerificationStatus() {
        if (!this.userData.verificationStatus) return;

        // Конвертируем API статус во внутренний формат
        const internalStatus = this.convertApiStatusToInternal(this.userData.verificationStatus);
        const statusConfig = this.statusConfig[internalStatus] || this.statusConfig['unknown'];

        // Обновляем все элементы статуса
        const statusElements = document.querySelectorAll('.verification-status-text');
        statusElements.forEach(el => {
            el.textContent = statusConfig.text;
        });

        // Обновляем плашки статуса
        const statusBadges = document.querySelectorAll('.verification-status-badge');
        statusBadges.forEach(badge => {
            // Удаляем все классы статусов
            badge.className = badge.className.replace(/status-\w+/g, '');
            
            // Добавляем соответствующий класс
            badge.classList.add(statusConfig.class);
            
            // Обновляем иконку и текст
            const statusIcon = badge.querySelector('.status-icon');
            const statusText = badge.querySelector('.status-text');
            
            if (statusIcon) {
                statusIcon.className = `${statusConfig.icon} status-icon`;
            }
            
            if (statusText) {
                statusText.textContent = statusConfig.text;
            }
        });

        // Создаем плашку статуса в разделе личных данных
        this.createStatusBadge(statusConfig);

        // Обновляем статусные блоки в зависимости от статуса
        // Используем реальное название статуса с бэкенда
        const statusName = this.userData.verificationStatus?.name || internalStatus;
        this.updateStatusSpecificSections(statusName);
        
        // Заполняем данные менеджера, если они есть
        this.populateManagerData();
    }

    populateManagerData() {
        if (!this.userData.manager) return;

        const manager = this.userData.manager;
        
        // Элементы для отображения данных менеджера
        const managerNameElements = document.querySelectorAll('.manager-name');
        const managerEmailElements = document.querySelectorAll('.manager-email');
        const managerPhoneElements = document.querySelectorAll('.manager-phone');
        const managerRatingElements = document.querySelectorAll('.manager-rating');

        // Заполняем имя менеджера
        if (managerNameElements.length > 0) {
            const managerFullName = `${manager.profileType === 'entrepreneur' && manager.entrepreneurProfile ? 
                `${manager.entrepreneurProfile.lastName || ''} ${manager.entrepreneurProfile.firstName || ''} ${manager.entrepreneurProfile.patronymic || ''}`.trim() :
                'Менеджер'}`;
            managerNameElements.forEach(el => {
                el.textContent = managerFullName || 'Не указано';
            });
        }

        // Заполняем email менеджера
        if (managerEmailElements.length > 0) {
            managerEmailElements.forEach(el => {
                el.textContent = manager.email || 'Не указан';
            });
        }

        // Заполняем телефон менеджера
        if (managerPhoneElements.length > 0) {
            managerPhoneElements.forEach(el => {
                el.textContent = manager.phone || 'Не указан';
            });
        }

        // Заполняем рейтинг менеджера
        if (managerRatingElements.length > 0) {
            managerRatingElements.forEach(el => {
                el.textContent = manager.rating || 0;
            });
        }
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

    createStatusBadge(statusConfig) {
        // Находим контейнер для плашки статуса в личных данных
        const statusContainer = document.getElementById('verification-status-badge-container');
        
        if (statusContainer) {
            statusContainer.innerHTML = `
                <div class="verification-status-badge-detail ${statusConfig.class}">
                    <i class="${statusConfig.icon}"></i>
                    <span>${statusConfig.text}</span>
                </div>
            `;
        }
    }

    // Функции для управления состоянием загрузки
    showLoading() {
        const loadingElement = document.getElementById('loadingState');
        if (loadingElement) {
            loadingElement.style.display = 'flex';
        }
        
        const contentElement = document.getElementById('mainContent');
        if (contentElement) {
            contentElement.style.display = 'none';
        }
    }

    hideLoading() {
        const loadingElement = document.getElementById('loadingState');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        const contentElement = document.getElementById('mainContent');
        if (contentElement) {
            contentElement.style.display = 'block';
        }
    }

    showError(message) {
        const contentElement = document.getElementById('mainContent') || document.body;
        contentElement.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h3>Ошибка</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">Попробовать снова</button>
            </div>
        `;
    }

    showNotification(message, type = 'info') {
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Добавляем стили
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: var(--bg-color);
            border-radius: var(--border-radius);
            box-shadow: var(--shadow-lg);
            border-left: 4px solid ${this.getNotificationColor(type)};
            padding: 1rem 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            z-index: 10000;
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
        `;

        // Добавляем в DOM
        document.body.appendChild(notification);

        // Обработчик закрытия
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });

        // Автоматическое закрытие через 5 секунд
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    getNotificationColor(type) {
        const colors = {
            'success': '#28a745',
            'error': '#dc3545',
            'warning': '#ffc107',
            'info': '#17a2b8'
        };
        return colors[type] || '#17a2b8';
    }

    initUserDropdown() {
        const userAvatar = document.getElementById('userAvatar');
        const userDropdown = document.getElementById('userDropdown');

        if (userAvatar && userDropdown) {
            userAvatar.addEventListener('click', function(e) {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });

            document.addEventListener('click', function() {
                userDropdown.classList.remove('show');
            });
        }
    }

    initLogoutModal() {
        const logoutBtn = document.getElementById('logoutBtn');
        const logoutModal = document.getElementById('logoutConfirmModal');
        const cancelLogout = document.getElementById('cancelLogout');
        const confirmLogout = document.getElementById('confirmLogout');

        if (logoutBtn && logoutModal) {
            logoutBtn.addEventListener('click', function() {
                logoutModal.style.display = 'block';
            });

            if (cancelLogout) {
                cancelLogout.addEventListener('click', function() {
                    logoutModal.style.display = 'none';
                });
            }

            if (confirmLogout) {
                confirmLogout.addEventListener('click', function() {
                    // Логика выхода
                    window.location.href = 'login.html';
                });
            }

            // Закрытие по клику вне модалки
            window.addEventListener('click', function(e) {
                if (e.target === logoutModal) {
                    logoutModal.style.display = 'none';
                }
            });
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    new VerificationDetailPage();

    // Добавляем CSS анимации для уведомлений
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        @keyframes slideOutRight {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }

        .notification-close {
            background: none;
            border: none;
            color: var(--text-light);
            cursor: pointer;
            padding: 0.25rem;
            border-radius: 4px;
            transition: all 0.2s ease;
        }

        .notification-close:hover {
            background: var(--bg-light);
            color: var(--text-color);
        }
    `;
    document.head.appendChild(style);
});
