document.addEventListener('DOMContentLoaded', function() {
    // Кнопка "Проверка качества"
    const qualityCheckBtn = document.getElementById('qualityCheckBtn');
    if (qualityCheckBtn) {
        qualityCheckBtn.addEventListener('click', () => {
            const url = qualityCheckBtn.dataset.url;
            if (url) {
                // Если URL не начинается с http, добавляем домен
                const fullUrl = url.startsWith('http') ? url : `http://localhost:8000${url}`;
                window.location.href = fullUrl;
            }
        });
    }

    // Кнопка "Новые участники"
    const newParticipantsBtn = document.getElementById('newParticipantsBtn');
    if (newParticipantsBtn) {
        newParticipantsBtn.addEventListener('click', () => {
            const url = newParticipantsBtn.dataset.url;
            if (url) {
                window.location.href = url;
            }
        });
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

    // Initialize
    const actionsToggle = new ActionsToggle();
    const adminActions = new AdminActions();
});
