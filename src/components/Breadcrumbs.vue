<template>
  <nav class="breadcrumbs" aria-label="Хлебные крошки">
    <ol class="breadcrumb-list">
      <template v-for="(item, index) in breadcrumbs" :key="index">
        <li class="breadcrumb-item" :class="{ active: index === breadcrumbs.length - 1 }" :aria-current="index === breadcrumbs.length - 1 ? 'page' : undefined">
          <template v-if="index < breadcrumbs.length - 1">
            <router-link v-if="item.to" :to="item.to" class="breadcrumb-link">
              <component v-if="item.icon" :is="item.icon" class="lucide breadcrumb-leading-icon" :size="18"/>
              {{ item.label }}
            </router-link>
            <span v-else class="breadcrumb-text">
              <component v-if="item.icon" :is="item.icon" class="lucide breadcrumb-leading-icon" :size="18"/>
              {{ item.label }}
            </span>
          </template>
          <template v-else>
            <span class="breadcrumb-current">
              <component v-if="item.icon" :is="item.icon" class="lucide breadcrumb-leading-icon" :size="18"/>
              {{ item.label }}
            </span>
          </template>
        </li>
        <li v-if="index < breadcrumbs.length - 1" class="breadcrumb-separator" aria-hidden="true">
          {{ separator }}
        </li>
      </template>
      <li v-if="trailingSeparator" class="breadcrumb-separator" aria-hidden="true">
        {{ separator }}
      </li>
    </ol>
  </nav>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true,
    validator: (items) =>
      items.every(
        (item) => typeof item === 'object' && typeof item.label === 'string',
      ),
  },
  separator: {
    type: String,
    default: '/',
  },
  trailingSeparator: {
    type: Boolean,
    default: false,
  },
})

const breadcrumbs = computed(() =>
  props.items.map((item) => ({
    label: item.label,
    to: item.to || null,
    icon: item.icon || null,
  })),
)
</script>

<style scoped lang="scss">
.breadcrumbs {
  margin-bottom: 0.5rem;
}

.breadcrumb-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.875rem;
  color: var(--color-secondary-text, #6b7280);
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  justify-content: center;
}

.breadcrumb-link {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-accent);
  text-decoration: none;
  transition: color 0.15s ease;

  &:hover {
    color: color-mix(in srgb, var(--color-accent) 85%, var(--color-primary-text));
    text-decoration: underline;
  }
}

.breadcrumb-text {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-secondary-text, #6b7280);
  text-decoration: none;
}

.breadcrumb-current {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary-text, #2d2d2d);
  font-weight: 500;
}

.breadcrumb-separator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 0.5rem;
  color: var(--color-secondary-text, #6b7280);
  user-select: none;
}

.lucide {
  display: flex;
  align-items: center;
  justify-content: center;
}

.breadcrumb-leading-icon {
  margin-inline-end: 0.25rem;
}

.breadcrumb-item.active {
  .breadcrumb-current {
    color: var(--color-primary-text, #2d2d2d);
    font-weight: 500;
  }
}
</style>