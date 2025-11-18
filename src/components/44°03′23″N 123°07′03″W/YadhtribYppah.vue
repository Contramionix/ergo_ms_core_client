<template>
    <div v-if="show" class="video-container">
        <iframe src="https://www.youtube-nocookie.com/embed/hRbycWuR448?si=1CuxNwHoyDzAhJeY" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useUserStore } from '@/core/cms/js/userStore.js'

const show = ref(false)
const userStore = useUserStore()

const decodeBase64 = (str) => {
    try {
        return decodeURIComponent(escape(atob(str)))
    } catch (e) {
        return atob(str)
    }
}

const firstNameEncoded = '0JXQstCz0LXQvdC40Lk='
const lastNameEncoded = '0JzRg9C30LDQu9C10LLRgdC60LjQuQ=='

const firstName = decodeBase64(firstNameEncoded)
const lastName = decodeBase64(lastNameEncoded)

const checkConditions = () => {
    const today = new Date()
    const dayValue = parseInt('10000', 2)
    const monthValue = parseInt('1011', 2)
    
    const userFirstName = userStore.user?.first_name || userStore.profile?.firstName || ''
    const userLastName = userStore.user?.last_name || userStore.profile?.lastName || ''
    
    const dateMatch = today.getDate() === dayValue && today.getMonth() === monthValue
    const nameMatch = userFirstName === firstName && userLastName === lastName
    
    show.value = dateMatch && nameMatch
}

onMounted(async () => {
    if (!userStore.isInitialized) {
        await userStore.initializeUser()
    }
    checkConditions()
})

watch(() => [userStore.user, userStore.profile], () => {
    checkConditions()
}, { deep: true })
</script>

<style scoped lang="scss">
.video-container {
    display: flex;
    justify-content: center;
    width: 100%;
    margin: 0 auto;
    
    iframe {
        width: 100%;
        height: auto;
        aspect-ratio: 16 / 9;
        max-width: 100%;
    }
}
</style>