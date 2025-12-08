<template>
  <button 
    class="floating-button"
    @click="togglePanel"
    :class="{ 'active': isOpen }"
  >
    <svg viewBox="0 0 24 24" class="icon">
      <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.65-.07-.97l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.08-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.32-.07.64-.07.97c0 .33.03.65.07.97l-2.11 1.63c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.39 1.06.73 1.69.98l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.25 1.17-.59 1.69-.98l2.49 1c.22.08.49 0 .61-.22l2-3.46c.13-.22.07-.49-.12-.64l-2.11-1.63Z"/>
    </svg>
  </button>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean
}

interface Emits {
  (e: 'toggle'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

function togglePanel() {
  emit('toggle')
}
</script>

<style scoped>
.floating-button {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #007bff;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 1000;
}

.floating-button:hover {
  background: #0056b3;
  box-shadow: 0 6px 16px rgba(0, 123, 255, 0.4);
  transform: scale(1.05);
}

.floating-button.active {
  background: #dc3545;
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
}

.floating-button.active:hover {
  background: #c82333;
  box-shadow: 0 6px 16px rgba(220, 53, 69, 0.4);
}

.icon {
  width: 24px;
  height: 24px;
  fill: white;
  transition: transform 0.3s ease;
}

.floating-button.active .icon {
  transform: rotate(180deg);
}
</style>