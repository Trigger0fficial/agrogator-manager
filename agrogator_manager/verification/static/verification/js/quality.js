// Основной класс для управления детальной страницей проверки качества
class QualityDetailPage {
    constructor() {
        this.rejectionSection = document.getElementById('rejectionSection');
        this.rejectButton = document.getElementById('rejectQuality');
        this.acceptButton = document.getElementById('acceptQuality');
        this.cancelRejectionButton = document.getElementById('cancelRejection');
        this.confirmRejectionButton = document.getElementById('confirmRejection');
        this.goToChatButton = document.getElementById('goToChat');
        this.rejectionComment = document.getElementById('rejectionComment');

        // Модальные окна
        this.rejectionModal = document.getElementById('rejectionConfirmModal');
        this.cancelRejectionModal = document.getElementById('cancelRejectionModal');
        this.confirmRejectionModal = document.getElementById('confirmRejectionModal');
        this.rejectionModalText = document.getElementById('rejectionModalText');
        this.rejectionWarning = document.getElementById('rejectionWarning');

        // Кнопки скачивания документов
        this.downloadButtons = document.querySelectorAll('.download-document');

        this.init();
    }

    init() {
        this.addEventListeners();
        this.initRejectionModal();
    }

    addEventListeners() {
        // Обработчик кнопки отклонения
        if (this.rejectButton) {
            this.rejectButton.addEventListener('click', () => {
                this.showRejectionSection();
            });
        }

        // Обработчик кнопки принятия
        if (this.acceptButton) {
            this.acceptButton.addEventListener('click', () => {
                this.acceptQuality();
            });
        }

        // Обработчик отмены отклонения
        if (this.cancelRejectionButton) {
            this.cancelRejectionButton.addEventListener('click', () => {
                this.hideRejectionSection();
            });
        }

        // Обработчик подтверждения отклонения
        if (this.confirmRejectionButton) {
            this.confirmRejectionButton.addEventListener('click', () => {
                this.showRejectionModal();
            });
        }

        // Обработчик перехода в чат
        if (this.goToChatButton) {
            this.goToChatButton.addEventListener('click', () => {
                this.goToChat();
            });
        }

        // Валидация комментария отклонения
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

        // Обработчики скачивания документов
        this.downloadButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.downloadDocument(e.target.closest('.document-card'));
            });
        });
    }

    initRejectionModal() {
        // Обработчики для модалки отклонения
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
        if (this.rejectionSection) {
            this.rejectionSection.classList.remove('hidden');
            this.rejectionSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

            // Сбрасываем форму
            this.resetRejectionForm();
        }
    }

    hideRejectionSection() {
        if (this.rejectionSection) {
            this.rejectionSection.classList.add('hidden');
        }
    }

    showRejectionModal() {
        if (!this.validateRejectionForm()) {
            return;
        }

        const selectedFields = Array.from(document.querySelectorAll('input[name="rejectionFields"]:checked'));

        // Настраиваем текст модального окна в зависимости от выбранных полей
        if (selectedFields.length === 0) {
            this.rejectionModalText.textContent = 'Вы уверены, что хотите полностью отклонить качество культуры?';
            this.rejectionWarning.style.display = 'flex';
            this.rejectionWarning.querySelector('p').textContent = 'Вы не выбрали ни одного поля для исправления. Это означает полное отклонение качества культуры.';
        } else {
            this.rejectionModalText.textContent = 'Вы уверены, что хотите отправить качество на доработку?';
            this.rejectionWarning.style.display = 'flex';
            this.rejectionWarning.querySelector('p').textContent = `Фермеру будет отправлен запрос на исправление ${selectedFields.length} полей. После исправления качество будет проверено повторно.`;
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

    confirmRejection() {
        const comment = this.rejectionComment.value.trim();
        const selectedFields = Array.from(document.querySelectorAll('input[name="rejectionFields"]:checked'))
            .map(checkbox => checkbox.value);

        // Собираем данные для отправки
        const rejectionData = {
            comment: comment,
            fieldsToCorrect: selectedFields,
            timestamp: new Date().toISOString(),
            cultureId: this.getCultureIdFromURL() || 1
        };

        // В реальном приложении отправляем данные на сервер
        console.log('Отправка данных отклонения:', rejectionData);

        // Скрываем модальное окно
        this.hideRejectionModal();

        // Показываем уведомление в зависимости от типа отклонения
        if (selectedFields.length === 0) {
            this.showNotification('Качество культуры полностью отклонено.', 'error');
            this.updateQualityStatus('rejected');
        } else {
            this.showNotification('Качество отправлено на доработку', 'info');
            this.updateQualityStatus('waiting');
        }

        // Скрываем секцию отклонения
        this.hideRejectionSection();
    }

    acceptQuality() {
        // В реальном приложении здесь будет логика принятия качества
        console.log('Принятие качества культуры...');
        this.showNotification('Качество культуры подтверждено.', 'success');
        this.updateQualityStatus('accepted');
    }

    downloadDocument(documentCard) {
        const documentTitle = documentCard.querySelector('h4').textContent;

        // В реальном приложении здесь будет логика скачивания файла
        console.log(`Скачивание документа: ${documentTitle}`);

        // Имитация скачивания
        this.showNotification(`Документ "${documentTitle}" начинает скачиваться...`, 'info');

        // Через 1 секунду показываем успешное скачивание
        setTimeout(() => {
            this.showNotification(`Документ "${documentTitle}" успешно скачан`, 'success');
        }, 1000);
    }

    goToChat() {
        // В реальном приложении здесь будет переход в чат
        console.log('Переход в чат с фермером...');
        this.showNotification('Открывается чат с фермером...', 'info');

        // Имитация перехода
        setTimeout(() => {
            this.showNotification('Чат открыт в новой вкладке', 'success');
        }, 500);
    }

    updateQualityStatus(status) {
        const statusBadge = document.querySelector('.quality-status-badge .status-indicator');
        const statusConfig = {
            'rejected': {
                class: 'danger',
                icon: 'fas fa-times-circle',
                text: 'Отклонено'
            },
            'accepted': {
                class: 'success',
                icon: 'fas fa-check-circle',
                text: 'Подтверждено'
            },
            'waiting': {
                class: 'waiting',
                icon: 'fas fa-hourglass-half',
                text: 'На доработке'
            }
        };

        if (statusBadge && statusConfig[status]) {
            const config = statusConfig[status];
            statusBadge.className = `status-indicator ${config.class} expanded`;
            statusBadge.querySelector('.status-icon').className = `${config.icon} status-icon`;
            statusBadge.querySelector('.status-text').textContent = config.text;
        }

        // Обновляем бейджи в секциях
        document.querySelectorAll('.quality-badge.pending').forEach(badge => {
            if (status === 'accepted') {
                badge.className = 'quality-badge verified';
                badge.innerHTML = '<i class="fas fa-check-circle"></i> Проверено';
            } else if (status === 'rejected') {
                badge.className = 'quality-badge pending';
                badge.innerHTML = '<i class="fas fa-times-circle"></i> Отклонено';
            }
        });
    }

    getCultureIdFromURL() {
        // В реальном приложении получаем ID культуры из URL
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
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
            background: var(--white);
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
            'success': '#16a34a',
            'error': '#dc2626',
            'warning': '#d97706',
            'info': '#2563eb'
        };
        return colors[type] || '#2563eb';
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    new QualityDetailPage();

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
            background: var(--background);
            color: var(--text-color);
        }
    `;
    document.head.appendChild(style);
});