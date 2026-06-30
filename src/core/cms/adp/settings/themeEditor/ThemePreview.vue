<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { 
  Home, 
  Settings, 
  User, 
  Bell, 
  Search, 
  Menu,
  ChevronRight,
  FileText,
  Image,
  Video,
  Music,
  Folder,
  Download,
  Share2,
  MoreVertical,
  Eye,
} from 'lucide-vue-next'

// Получаем текущую тему из localStorage
const getCurrentTheme = () => {
  const stored = localStorage.getItem('theme') || 'auto'
  if (stored === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return stored
}

const currentTheme = ref(getCurrentTheme())

// Слушаем изменения темы
onMounted(() => {
  const observer = new MutationObserver(() => {
    currentTheme.value = getCurrentTheme()
  })
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-bs-theme']
  })

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    currentTheme.value = getCurrentTheme()
  })

  onUnmounted(() => {
    observer.disconnect()
  })
})
</script>

<template>
  <div class="theme-preview">
    <div class="card rounded-3 shadow-sm mb-4">
      <div class="card-header theme-preview__card-header">
        <div class="d-flex align-items-center">
          <Eye :size="24" class="text-primary me-2" />
          <h3 class="mb-0 text-primary">Предпросмотр темы</h3>
        </div>
      </div>

      <div class="card-body p-0">
        <!-- Шапка -->
        <div class="preview-header" style="background: var(--color-header-background);">
          <div class="container-fluid px-4 py-3">
            <div class="d-flex align-items-center justify-content-between">
              <div class="d-flex align-items-center gap-3">
                <div class="preview-logo">
                  <Home :size="24" />
                </div>
                <nav class="d-flex gap-3">
                  <a href="#" class="preview-nav-link" style="color: var(--color-primary-text);">Главная</a>
                  <a href="#" class="preview-nav-link" style="color: var(--color-primary-text);">О нас</a>
                  <a href="#" class="preview-nav-link" style="color: var(--color-primary-text);">Контакты</a>
                </nav>
              </div>
              <div class="d-flex align-items-center gap-2">
                <button class="preview-btn-icon" style="color: var(--color-primary-text);">
                  <Search :size="20" />
                </button>
                <button class="preview-btn-icon" style="color: var(--color-primary-text);">
                  <Bell :size="20" />
                </button>
                <button class="preview-btn-icon" style="color: var(--color-primary-text);">
                  <User :size="20" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Основной контент -->
        <div class="preview-content" style="background: var(--color-background); min-height: 600px;">
          <div class="container-fluid px-4 py-4">
            <!-- Карточки -->
            <div class="row g-4 mb-4">
              <div class="col-12 col-md-6 col-lg-4">
                <div class="preview-card" style="background: var(--color-primary-background); border-color: var(--color-border);">
                  <div class="preview-card-header" style="border-color: var(--color-border);">
                    <h5 style="color: var(--color-primary-text);">Карточка 1</h5>
                  </div>
                  <div class="preview-card-body">
                    <p style="color: var(--color-secondary-text);">Пример текста в карточке. Здесь может быть любой контент.</p>
                    <button class="preview-btn" style="background: var(--color-accent); color: white;">
                      Действие
                    </button>
                  </div>
                </div>
              </div>

              <div class="col-12 col-md-6 col-lg-4">
                <div class="preview-card" style="background: var(--color-primary-background); border-color: var(--color-border);">
                  <div class="preview-card-header" style="border-color: var(--color-border);">
                    <h5 style="color: var(--color-primary-text);">Карточка 2</h5>
                  </div>
                  <div class="preview-card-body">
                    <p style="color: var(--color-secondary-text);">Еще одна карточка с контентом для демонстрации темы.</p>
                    <button class="preview-btn-secondary" style="border-color: var(--color-border); color: var(--color-primary-text);">
                      Вторичная кнопка
                    </button>
                  </div>
                </div>
              </div>

              <div class="col-12 col-md-6 col-lg-4">
                <div class="preview-card" style="background: var(--color-secondary-background); border-color: var(--color-border);">
                  <div class="preview-card-header" style="border-color: var(--color-border);">
                    <h5 style="color: var(--color-primary-text);">Карточка 3</h5>
                  </div>
                  <div class="preview-card-body">
                    <p style="color: var(--color-secondary-text);">Карточка с вторичным фоном для разнообразия.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Форма -->
            <div class="row mb-4">
              <div class="col-12 col-lg-6">
                <div class="preview-card" style="background: var(--color-primary-background); border-color: var(--color-border);">
                  <div class="preview-card-header" style="border-color: var(--color-border);">
                    <h5 style="color: var(--color-primary-text);">Форма</h5>
                  </div>
                  <div class="preview-card-body">
                    <div class="mb-3">
                      <label class="form-label" style="color: var(--color-primary-text);">Имя</label>
                      <input 
                        type="text" 
                        class="form-control preview-input"
                        style="background: var(--color-secondary-background); border-color: var(--color-border); color: var(--color-primary-text);"
                        placeholder="Введите имя"
                      />
                    </div>
                    <div class="mb-3">
                      <label class="form-label" style="color: var(--color-primary-text);">Email</label>
                      <input 
                        type="email" 
                        class="form-control preview-input"
                        style="background: var(--color-secondary-background); border-color: var(--color-border); color: var(--color-primary-text);"
                        placeholder="email@example.com"
                      />
                    </div>
                    <button class="preview-btn" style="background: var(--color-accent); color: white;">
                      Отправить
                    </button>
                  </div>
                </div>
              </div>

              <div class="col-12 col-lg-6">
                <div class="preview-card" style="background: var(--color-primary-background); border-color: var(--color-border);">
                  <div class="preview-card-header" style="border-color: var(--color-border);">
                    <h5 style="color: var(--color-primary-text);">Список элементов</h5>
                  </div>
                  <div class="preview-list">
                    <div 
                      v-for="i in 5" 
                      :key="i"
                      class="preview-list-item"
                      style="border-color: var(--color-border); background: var(--color-primary-background);"
                      :style="{ '--hover-bg': 'var(--color-hover-background)' }"
                    >
                      <div class="d-flex align-items-center gap-3">
                        <div class="preview-icon" style="background: var(--color-secondary-background); color: var(--color-accent);">
                          <FileText :size="20" />
                        </div>
                        <div class="flex-grow-1">
                          <div style="color: var(--color-primary-text); font-weight: 500;">Элемент списка {{ i }}</div>
                          <div style="color: var(--color-secondary-text); font-size: 0.875rem;">Описание элемента</div>
                        </div>
                        <ChevronRight :size="20" style="color: var(--color-secondary-text);" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Таблица -->
            <div class="preview-card mb-4" style="background: var(--color-primary-background); border-color: var(--color-border);">
              <div class="preview-card-header" style="border-color: var(--color-border);">
                <h5 style="color: var(--color-primary-text);">Таблица данных</h5>
              </div>
              <div class="table-responsive">
                <table class="table preview-table">
                  <thead>
                    <tr style="background: var(--color-secondary-background);">
                      <th style="color: var(--color-primary-text); border-color: var(--color-border);">ID</th>
                      <th style="color: var(--color-primary-text); border-color: var(--color-border);">Название</th>
                      <th style="color: var(--color-primary-text); border-color: var(--color-border);">Статус</th>
                      <th style="color: var(--color-primary-text); border-color: var(--color-border);">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="i in 3" :key="i" style="border-color: var(--color-border);">
                      <td style="color: var(--color-primary-text);">{{ i }}</td>
                      <td style="color: var(--color-primary-text);">Элемент {{ i }}</td>
                      <td>
                        <span class="badge" style="background: var(--color-accent);">Активен</span>
                      </td>
                      <td>
                        <button class="preview-btn-icon-sm" style="color: var(--color-primary-text);">
                          <MoreVertical :size="16" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Кнопки -->
            <div class="preview-card" style="background: var(--color-primary-background); border-color: var(--color-border);">
              <div class="preview-card-header" style="border-color: var(--color-border);">
                <h5 style="color: var(--color-primary-text);">Кнопки и элементы управления</h5>
              </div>
              <div class="preview-card-body">
                <div class="d-flex flex-wrap gap-3 align-items-center">
                  <button class="preview-btn" style="background: var(--color-accent); color: white;">
                    Основная кнопка
                  </button>
                  <button class="preview-btn-secondary" style="border-color: var(--color-border); color: var(--color-primary-text);">
                    Вторичная кнопка
                  </button>
                  <button class="preview-btn-link" style="color: var(--color-accent);">
                    Ссылка-кнопка
                  </button>
                  <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="preview-check" checked />
                    <label class="form-check-label" for="preview-check" style="color: var(--color-primary-text);">
                      Чекбокс
                    </label>
                  </div>
                  <div class="form-check">
                    <input class="form-check-input" type="radio" name="preview-radio" id="preview-radio1" checked />
                    <label class="form-check-label" for="preview-radio1" style="color: var(--color-primary-text);">
                      Радио 1
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.theme-preview {
  .theme-preview__card-header {
    background-color: var(--color-primary-background);
    border-bottom: 1px solid var(--color-border);
    color: var(--color-primary-text);
  }

  .preview-header {
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--color-border, #e0e0e0);
  }

  .preview-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: var(--color-secondary-background, #f1f1f1);
    color: var(--color-accent, #d0322d);
  }

  .preview-nav-link {
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s;

    &:hover {
      color: var(--color-accent, #d0322d) !important;
    }
  }

  .preview-btn-icon {
    background: transparent;
    border: none;
    padding: 8px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: var(--color-hover-background, #e1e1e1);
    }
  }

  .preview-card {
    border: 1px solid;
    border-radius: 8px;
    overflow: hidden;
  }

  .preview-card-header {
    padding: 1rem;
    border-bottom: 1px solid;
  }

  .preview-card-body {
    padding: 1rem;
  }

  .preview-btn {
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.9;
    }
  }

  .preview-btn-secondary {
    border: 1px solid;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    background: transparent;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: var(--color-hover-background, #e1e1e1);
    }
  }

  .preview-btn-link {
    background: transparent;
    border: none;
    padding: 0.5rem 1rem;
    font-weight: 500;
    cursor: pointer;
    text-decoration: underline;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.8;
    }
  }

  .preview-input {
    &::placeholder {
      color: var(--color-secondary-text, #6e6e6e);
    }

    &:focus {
      border-color: var(--color-accent, #d0322d);
      box-shadow: 0 0 0 0.2rem rgba(208, 50, 45, 0.25);
    }
  }

  .preview-list {
    padding: 0.5rem 0;
  }

  .preview-list-item {
    padding: 1rem;
    border-bottom: 1px solid;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: var(--hover-bg, var(--color-hover-background, #e1e1e1)) !important;
    }

    &:last-child {
      border-bottom: none;
    }
  }

  .preview-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
  }

  .preview-table {
    margin: 0;

    th, td {
      padding: 0.75rem;
    }

    tbody tr {
      transition: background 0.2s;

      &:hover {
        background: var(--color-hover-background, #e1e1e1);
      }
    }
  }

  .preview-btn-icon-sm {
    background: transparent;
    border: none;
    padding: 4px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: var(--color-hover-background, #e1e1e1);
    }
  }

  .badge {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
  }
}
</style>

