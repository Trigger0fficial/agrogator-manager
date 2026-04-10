# Конфигурация API для авторизации

# Базовый URL
import os
from dotenv import load_dotenv

# Загружаем переменные окружения из .env файла
print("Loading .env file...")
load_dotenv()
print(".env file loaded successfully!")

# API Configuration
API_BASE_URL = os.getenv('API_BASE_URL')
AUTH_LOGIN_URL = os.getenv('AUTH_LOGIN_URL')
USER_ME_URL = os.getenv('USER_ME_URL')

print(f"API_BASE_URL: {API_BASE_URL}")
print(f"AUTH_LOGIN_URL: {AUTH_LOGIN_URL}")
print(f"USER_ME_URL: {USER_ME_URL}")

# Cache Keys
ACCESS_TOKEN_CACHE_KEY = os.getenv('ACCESS_TOKEN_CACHE_KEY')
REFRESH_TOKEN_CACHE_KEY = os.getenv('REFRESH_TOKEN_CACHE_KEY')
USER_ROLE_CACHE_KEY = os.getenv('USER_ROLE_CACHE_KEY')
USER_INFO_CACHE_KEY = os.getenv('USER_INFO_CACHE_KEY')

# Allowed Roles
ALLOWED_ROLES = os.getenv('ALLOWED_ROLES').split(',')

# Request Timeout
REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', 10))

print("Config loaded successfully!")
