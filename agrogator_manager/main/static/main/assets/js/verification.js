// Основной класс для управления детальной страницей верификации
class VerificationDetailPage {
    constructor() {
        this.rejectionSection = document.getElementById('rejectionSection');
        this.rejectButton = document.getElementById('rejectVerification');
        this.cancelRejectionButton = document.getElementById('cancelRejection');
        this.confirmRejectionButton = document.getElementById('confirmRejection');
        this.downloadContractButton = document.getElementById('downloadContract');
        this.goToChatButton = document.getElementById('goToChat');
        this.acceptVerificationButton = document.getElementById('acceptVerification');
        this.rejectionComment = document.getElementById('rejectionComment');

        // Модальные окна
        this.rejectionModal = document.getElementById('rejectionConfirmModal');
        this.cancelRejectionModal = document.getElementById('cancelRejectionModal');
        this.confirmRejectionModal = document.getElementById('confirmRejectionModal');
        this.rejectionModalText = document.getElementById('rejectionModalText');
        this.rejectionWarning = document.getElementById('rejectionWarning');

        this.init();
    }

    init() {
        this.addEventListeners();
        this.initUserDropdown();
        this.initLogoutModal();
        this.initRejectionModal();
    }

    addEventListeners() {
        // Обработчик кнопки отказа
        if (this.rejectButton) {
            this.rejectButton.addEventListener('click', () => {
                this.showRejectionSection();
            });
        }

        // Обработчик отмены отказа
        if (this.cancelRejectionButton) {
            this.cancelRejectionButton.addEventListener('click', () => {
                this.hideRejectionSection();
            });
        }

        // Обработчик подтверждения отказа
        if (this.confirmRejectionButton) {
            this.confirmRejectionButton.addEventListener('click', () => {
                this.showRejectionModal();
            });
        }

        // Обработчик скачивания договора
        if (this.downloadContractButton) {
            this.downloadContractButton.addEventListener('click', () => {
                this.downloadContract();
            });
        }

        // Обработчик перехода в чат
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

    confirmRejection() {
        const comment = this.rejectionComment.value.trim();
        const selectedFields = Array.from(document.querySelectorAll('input[name="rejectionFields"]:checked'))
            .map(checkbox => checkbox.value);

        // Собираем данные для отправки
        const rejectionData = {
            comment: comment,
            fieldsToCorrect: selectedFields,
            timestamp: new Date().toISOString(),
            userId: this.getUserIdFromURL() || 1
        };

        // В реальном приложении отправляем данные на сервер
        console.log('Отправка данных отказа:', rejectionData);

        // Скрываем модальное окно
        this.hideRejectionModal();

        // Показываем уведомление в зависимости от типа отказа
        if (selectedFields.length === 0) {
            this.showNotification('Верификация отклонена. Пользователь заблокирован.', 'error');
            this.updateVerificationStatus('rejected');
        } else {
            this.showNotification('Верификация отправлена на повторное заполнение', 'info');
            this.updateVerificationStatus('waiting');
        }

        // Скрываем секцию отказа
        this.hideRejectionSection();
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
    }

    getUserIdFromURL() {
        // В реальном приложении получаем ID пользователя из URL
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
                    // Логика выхода (серверная)
                    window.location.href = '/logout/';
                });
            }
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