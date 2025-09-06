<script setup lang="ts">
defineProps<{ title?: string; modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()
function close() { emit('update:modelValue', false) }
</script>

<template>
  <teleport to="body">
    <div v-if="modelValue" class="overlay" @click.self="close">
      <div class="modal">
        <header class="modal__header">
          <div class="modal__title">
            <svg class="calendar-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <h3>{{ title }}</h3>
          </div>
          <button class="icon" @click="close">✕</button>
        </header>
        <div class="modal__body">
          <slot />
        </div>
      </div>
    </div>
  </teleport>
  
</template>

<style scoped>
.overlay { 
  position: fixed; 
  inset: 0; 
  background: rgba(0,0,0,.5); 
  display: grid; 
  place-items: center; 
  padding: 2rem; 
  backdrop-filter: blur(4px);
  z-index: 1000;
}

.modal { 
  background: white; 
  color: #0f172a; 
  width: 100%; 
  max-width: 550px; 
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 20px; 
  box-shadow: 0 20px 60px rgba(0,0,0,.3);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal__header { 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  position: relative;
  padding: 1.5rem 2rem; 
  border-bottom: 1px solid #e2e8f0; 
}

.modal__title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.calendar-icon {
  color: #3b82f6;
  flex-shrink: 0;
}

.modal__header h3 {
  font-size: 1.375rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.025em;
}

.modal__body { 
  padding: 2rem; 
}

.icon { 
  background: transparent; 
  border: none; 
  font-size: 1.25rem; 
  cursor: pointer; 
  color: #64748b;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  position: absolute;
  right: 2rem;
  top: 50%;
  transform: translateY(-50%);
}

.icon:hover {
  background: #f1f5f9;
  color: #334155;
}
</style>