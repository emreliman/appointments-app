<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppointmentList from '@/components/appointments/AppointmentList.vue'
import type { AppointmentItem } from '@/components/appointments/AppointmentListItem.vue'
import { listAppointments} from '@/services/appointments'
import { listAgents } from '@/services/agents'

const allAppointments = ref<AppointmentItem[]>([]) // Cache all data
const loading = ref(false)
const agents = ref<any[]>([])

// Pagination state
const currentPage = ref(1)
const totalPages = ref(0)
const totalItems = ref(0)

async function fetchAllAppointments() {
  if (loading.value) return
  
  loading.value = true
  try {
    const res = await listAppointments()
    console.log('Fetched appointments:', res)
    // The API should return all items already processed
    allAppointments.value = res.items as any
    
  } catch (error) {
    console.error('Failed to fetch appointments:', error)
  } finally {
    loading.value = false
  }
}




onMounted(async () => {
  // Load agents first for filtering
  try {
    agents.value = await listAgents()
  } catch (error) {
    console.error('Failed to load agents:', error)
  }
  
  // Then load all appointments once
  fetchAllAppointments()
})

const showCreate = ref(false)


</script>

<template>
  <div class="home">
    <!-- Header -->
    <div class="home__header">
      <h1 class="page-title">Appointments</h1>
    </div>

    <!-- Main Content Container -->
    <div class="main-container">

      <!-- Separator -->
      <hr class="content-separator" />

      <!-- Action Bar -->
      <div class="action-bar">
        <div class="results-info">
          <span>{{ totalItems }} Appointments found</span>
        </div>
        <button class="btn-create" @click="showCreate = true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Create Appointment
        </button>
      </div>

      <!-- Appointments List -->
      <AppointmentList 
        :items="allAppointments" 
        :loading="loading"
        :totalPages="totalPages"
        :currentPage="currentPage"
        :totalItems="totalItems" />
    </div>

  </div>
</template>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
  background: #f8fafc;
  min-height: 100vh;
}

.home__header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e2e8f0;
}

.main-container {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow-x: auto; /* Allow horizontal scrolling if needed */
  width: 100%;
}

.content-separator {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 24px 0;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.results-info {
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
}

.page-title {
  font-size: 32px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.025em;
}

.btn-create {
  background: linear-gradient(135deg, #ec4899, #db2777);
  color: white;
  border: none;
  padding: 14px 24px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);
  letter-spacing: 0.025em;
}

.btn-create:hover {
  background: linear-gradient(135deg, #db2777, #be185d);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(236, 72, 153, 0.4);
}

.btn-create:active {
  transform: translateY(0);
  box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);
}

@media (max-width: 768px) {
  .home {
    padding: 16px;
  }
  
  .home__header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .page-title {
    font-size: 24px;
    text-align: center;
  }
  
  .main-container {
    padding: 16px;
  }
  
  .action-bar {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .btn-create {
    justify-content: center;
  }
  
  .results-info {
    text-align: center;
  }
}
</style>
