<template>
  <div ref="pickerRef" class="msng-emoji">
    <div class="msng-emoji__tabs">
      <button
        v-for="cat in categories"
        :key="cat.key"
        type="button"
        class="msng-emoji__tab"
        :class="{ 'msng-emoji__tab--active': activeCategory === cat.key }"
        :title="cat.label"
        :aria-label="cat.label"
        :aria-pressed="activeCategory === cat.key"
        @click="activeCategory = cat.key"
      >
        <span aria-hidden="true">{{ cat.icon }}</span>
      </button>
    </div>

    <div class="msng-emoji__grid">
      <button v-for="emoji in currentEmojis" :key="emoji" type="button" class="msng-emoji__item" @click="$emit('select', emoji)">
        {{ emoji }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['select', 'close'])

const activeCategory = ref('smileys')
const pickerRef = ref(null)

const categories = [
  {
    key: 'smileys',
    label: 'Смайлики',
    icon: '\u{1F600}',
    emojis: [
      '\u{1F600}', '\u{1F603}', '\u{1F604}', '\u{1F601}', '\u{1F606}', '\u{1F605}',
      '\u{1F602}', '\u{1F923}', '\u{1F60A}', '\u{1F607}', '\u{1F642}', '\u{1F643}',
      '\u{1F609}', '\u{1F60C}', '\u{1F60D}', '\u{1F970}', '\u{1F618}', '\u{1F617}',
      '\u{1F619}', '\u{1F61A}', '\u{1F60B}', '\u{1F61B}', '\u{1F61C}', '\u{1F92A}',
      '\u{1F61D}', '\u{1F911}', '\u{1F917}', '\u{1F92D}', '\u{1F92B}', '\u{1F914}',
      '\u{1F910}', '\u{1F928}', '\u{1F610}', '\u{1F611}', '\u{1F636}', '\u{1F60F}',
      '\u{1F612}', '\u{1F644}', '\u{1F62C}', '\u{1F925}', '\u{1F60E}', '\u{1F913}',
      '\u{1F9D0}', '\u{1F615}', '\u{1F61F}', '\u{1F641}', '\u{2639}\u{FE0F}',
      '\u{1F62E}', '\u{1F62F}', '\u{1F632}', '\u{1F633}', '\u{1F97A}', '\u{1F626}',
      '\u{1F627}', '\u{1F628}', '\u{1F630}', '\u{1F625}', '\u{1F622}', '\u{1F62D}',
      '\u{1F631}', '\u{1F616}', '\u{1F623}', '\u{1F61E}', '\u{1F613}', '\u{1F629}',
      '\u{1F62A}', '\u{1F924}', '\u{1F634}', '\u{1F637}', '\u{1F912}', '\u{1F915}',
    ],
  },
  {
    key: 'gestures',
    label: 'Жесты',
    icon: '\u{1F44D}',
    emojis: [
      '\u{1F44D}', '\u{1F44E}', '\u{1F44A}', '\u270A', '\u{1F91B}', '\u{1F91C}',
      '\u{1F44F}', '\u{1F64C}', '\u{1F450}', '\u{1F932}', '\u{1F91D}', '\u{1F64F}',
      '\u270D\u{FE0F}', '\u{1F485}', '\u{1F933}', '\u{1F4AA}', '\u{1F9BE}',
      '\u{1F448}', '\u{1F449}', '\u{1F446}', '\u{1F447}', '\u261D\u{FE0F}',
      '\u270B', '\u{1F91A}', '\u{1F590}\u{FE0F}', '\u{1F596}', '\u{1F44B}',
      '\u{1F919}', '\u{1F918}', '\u270C\u{FE0F}', '\u{1F91E}', '\u{1F91F}',
      '\u{1F44C}', '\u{1F90F}', '\u{1F90C}',
    ],
  },
  {
    key: 'hearts',
    label: 'Сердечки',
    icon: '\u2764\u{FE0F}',
    emojis: [
      '\u2764\u{FE0F}', '\u{1F9E1}', '\u{1F49B}', '\u{1F49A}', '\u{1F499}',
      '\u{1F49C}', '\u{1F5A4}', '\u{1F90E}', '\u{1F90D}', '\u{1F498}',
      '\u{1F49D}', '\u{1F496}', '\u{1F497}', '\u{1F493}', '\u{1F49E}',
      '\u{1F495}', '\u{1F49F}', '\u2763\u{FE0F}', '\u{1F494}',
      '\u{1F48B}', '\u{1F4AF}', '\u{1F4A2}', '\u{1F4A5}', '\u{1F4AB}',
      '\u{1F4A6}', '\u{1F4A8}', '\u{1F573}\u{FE0F}', '\u{1F4A3}',
      '\u{1F4AC}', '\u{1F441}\u{FE0F}\u200D\u{1F5E8}\u{FE0F}',
    ],
  },
  {
    key: 'objects',
    label: 'Объекты',
    icon: '\u{1F4BB}',
    emojis: [
      '\u{1F4BB}', '\u{1F4F1}', '\u{1F4F7}', '\u{1F4DA}', '\u{1F4DD}',
      '\u{1F4CE}', '\u{1F4CB}', '\u{1F4C5}', '\u{1F4E7}', '\u2709\u{FE0F}',
      '\u{1F4E6}', '\u{1F50D}', '\u{1F512}', '\u{1F513}', '\u{1F527}',
      '\u{1F6E0}\u{FE0F}', '\u{1F4A1}', '\u{1F3AF}', '\u{1F3C6}',
      '\u{1F381}', '\u{1F389}', '\u{1F388}', '\u{1F380}', '\u{1F5C3}\u{FE0F}',
      '\u{1F4CC}', '\u{1F4CD}', '\u2702\u{FE0F}', '\u{1F4CF}',
      '\u{1F4D0}', '\u{1F5D1}\u{FE0F}', '\u2699\u{FE0F}', '\u{1F50E}',
    ],
  },
  {
    key: 'nature',
    label: 'Природа',
    icon: '\u{1F436}',
    emojis: [
      '\u{1F436}', '\u{1F431}', '\u{1F42D}', '\u{1F439}', '\u{1F430}',
      '\u{1F98A}', '\u{1F43B}', '\u{1F43C}', '\u{1F428}', '\u{1F42F}',
      '\u{1F981}', '\u{1F42E}', '\u{1F437}', '\u{1F438}', '\u{1F435}',
      '\u{1F333}', '\u{1F334}', '\u{1F335}', '\u{1F340}', '\u{1F341}',
      '\u{1F342}', '\u{1F33A}', '\u{1F33B}', '\u{1F337}', '\u{1F339}',
      '\u{1F338}', '\u{1F31E}', '\u{1F31D}', '\u2B50', '\u{1F308}',
      '\u26A1', '\u{1F525}', '\u2744\u{FE0F}', '\u{1F4A7}',
    ],
  },
]

const currentEmojis = computed(
  () => categories.find((c) => c.key === activeCategory.value)?.emojis || [],
)

function onClickOutside(e) {
  if (pickerRef.value && !pickerRef.value.contains(e.target)) {
    emit('close')
  }
}

onMounted(() => {
  setTimeout(() => document.addEventListener('click', onClickOutside), 0)
})
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<style lang="scss" scoped>
.msng-emoji {
  position: absolute;
  bottom: 100%;
  right: 0;
  width: min(320px, calc(100% - 0.5rem));
  max-width: min(320px, 90vw);
  max-height: 300px;
  background: var(--bs-body-bg, #fff);
  border: 1px solid var(--bs-border-color);
  border-radius: 0.75rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 100;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &__tabs {
    display: flex;
    border-bottom: 1px solid var(--bs-border-color);
    padding: 0.25rem 0.35rem;
    gap: 0.15rem;
  }

  &__tab {
    border: none;
    background: transparent;
    padding: 0.3rem 0.5rem;
    border-radius: 0.4rem;
    font-size: 1.1rem;
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
      background: var(--bs-tertiary-bg, #f0f2f5);
    }

    &--active {
      background: rgba(var(--bs-primary-rgb), 0.1);
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 0.1rem;
    padding: 0.35rem;
    overflow-y: auto;
    max-height: 220px;
  }

  &__item {
    border: none;
    background: transparent;
    font-size: 1.3rem;
    padding: 0.2rem;
    border-radius: 0.3rem;
    cursor: pointer;
    text-align: center;
    line-height: 1;
    transition: background 0.15s;

    &:hover {
      background: var(--bs-tertiary-bg, #f0f2f5);
    }
  }
}

@media (width < $ui-bp-sm) {
  .msng-emoji {
    width: min(320px, calc(100vw - 2rem));
    max-width: calc(100vw - 2rem);
    left: auto;
    right: 0;
  }
}
</style>
