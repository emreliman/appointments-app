<script setup lang="ts">
import AppointmentListItem, { type AppointmentItem } from './AppointmentListItem.vue'

const props = withDefaults(defineProps<{ 
  items: AppointmentItem[]
  loading?: boolean
  totalItems?: number
}>(), { 
  loading: false,
  totalPages: 0,
  currentPage: 1,
  totalItems: 0
})

defineEmits<{ 
  (e: 'pageChange', page: number): void
  (e: 'edit', item: AppointmentItem): void
  (e: 'view', item: AppointmentItem): void
}>()



</script>

<template>
  <div class="appointment-list">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading appointments...</p>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="!items?.length" class="empty-state">
      <div class="empty-icon">📅</div>
      <h3>No appointments found</h3>
      <p>Try adjusting your filters or create a new appointment</p>
    </div>
    
    <!-- Content -->
    <div v-else class="list-container">
      <AppointmentListItem 
        v-for="appointment in items" 
        :key="appointment.id" 
        :item="appointment"
        @edit="$emit('edit', $event)"
        @view="$emit('view', $event)"
      />
        
    </div>
  </div>
</template>

<style scoped>
.appointment-list {
  width: 100%;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #64748b;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  opacity: 0.8;
}

.empty-state h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #334155;
  letter-spacing: -0.025em;
}

.empty-state p {
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
  max-width: 400px;
  margin: 0 auto;
}

.list-container {
  display: flex;
  flex-direction: column;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #64748b;
}

.loading-state p {
  margin-top: 16px;
  font-size: 16px;
  font-weight: 500;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e2e8f0;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.pagination-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem 0;
  border-top: 1px solid #e2e8f0;
  margin-top: 1.5rem;
}

.pagination-info {
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pagination-btn {
  background: #ffffff;
  border: 1px solid #d1d5db;
  color: #374151;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pagination-btn:hover:not(:disabled):not(.disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.pagination-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.pagination-btn.disabled,
.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f9fafb;
}

.pagination-number {
  min-width: 40px;
}

.pagination-ellipsis {
  padding: 8px 4px;
  color: #9ca3af;
  font-weight: 500;
  font-size: 14px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .pagination-container {
    padding: 1.5rem 1rem;
  }
  
  .pagination {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .pagination-btn {
    padding: 6px 10px;
    font-size: 13px;
    min-width: 36px;
    height: 36px;
  }
  
  .pagination-info {
    font-size: 13px;
  }
}
</style>