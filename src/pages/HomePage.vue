<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppointmentList from '@/components/appointments/AppointmentList.vue'
import type { AppointmentItem } from '@/components/appointments/AppointmentListItem.vue'
import FilterToolbar from '@/components/appointments/FilterToolbar.vue'
import type { FilterState } from '@/components/appointments/FilterToolbar'
import Modal from '@/components/ui/Modal.vue'
import CreateAppointmentForm from '@/components/appointments/CreateAppointmentForm.vue'
import EditAppointmentForm from '@/components/appointments/EditAppointmentForm.vue'
import { listAppointments, createAppointment, updateAppointment } from '@/services/appointments'
import { listAgents } from '@/services/agents'

const appointments = ref<AppointmentItem[]>([])
const allAppointments = ref<AppointmentItem[]>([]) // Cache all data
const loading = ref(false)
const agents = ref<any[]>([])

// Pagination state
const currentPage = ref(1)
const totalPages = ref(0)
const totalItems = ref(0)

const filters = ref<FilterState>({
  status: 'All Statuses',
  agentIds: [],
  query: '',
  from: '',
  to: '',
  sortBy: 'date-desc'
})

async function fetchAllAppointments() {
  if (loading.value) return
  
  loading.value = true
  try {
    const res = await listAppointments()
    
    // The API should return all items already processed
    allAppointments.value = res.items as any
    
    // Apply initial filtering and pagination
    applyFiltersAndPagination()
  } catch (error) {
    console.error('Failed to fetch appointments:', error)
  } finally {
    loading.value = false
  }
}

function applyFiltersAndPagination() {
  // This function does ALL filtering and pagination on cached data
  let filteredItems = [...allAppointments.value]
  
  // Apply status filter
  if (filters.value.status !== 'All Statuses') {
    filteredItems = filteredItems.filter(item => item.status === filters.value.status)
  }

  // Apply agent filter
  if (filters.value.agentIds.length) {
    const selectedAgentNames = filters.value.agentIds.map((id: string) => {
      const agent = agents.value.find(a => a.id === id)
      return agent ? agent.fullName : id
    })
    
    filteredItems = filteredItems.filter(item => 
      item.agents.some((appointmentAgent: any) => 
        selectedAgentNames.some((selectedName: string) => 
          appointmentAgent.name.toLowerCase().includes(selectedName.toLowerCase()) ||
          selectedName.toLowerCase().includes(appointmentAgent.name.toLowerCase())
        )
      )
    )
  }

  // Apply search query - case insensitive
  if (filters.value.query) {
    const q = filters.value.query.toLowerCase()
    filteredItems = filteredItems.filter(item => 
      item.address.toLowerCase().includes(q) ||
      item.contact.name.toLowerCase().includes(q) ||
      (item.contact.email && item.contact.email.toLowerCase().includes(q)) ||
      (item.contact.phone && item.contact.phone.toLowerCase().includes(q))
    )
  }

  // Apply date range filter
  if (filters.value.from || filters.value.to) {
    filteredItems = filteredItems.filter(item => {
      const itemDate = new Date(item.date)
      let matchesRange = true
      
      if (filters.value.from) {
        const fromDate = new Date(filters.value.from)
        matchesRange = matchesRange && itemDate >= fromDate
      }
      
      if (filters.value.to) {
        const toDate = new Date(filters.value.to)
        toDate.setHours(23, 59, 59, 999) // End of day
        matchesRange = matchesRange && itemDate <= toDate
      }
      
      return matchesRange
    })
  }

  // Apply sorting
  filteredItems.sort((a, b) => {
    const dateA = new Date(a.date)
    const dateB = new Date(b.date)
    return filters.value.sortBy === 'date-desc' ? 
      dateB.getTime() - dateA.getTime() : 
      dateA.getTime() - dateB.getTime()
  })

  // Calculate pagination
  const pageSize = 10
  const startIndex = (currentPage.value - 1) * pageSize
  const endIndex = startIndex + pageSize
  
  // Update reactive values
  totalItems.value = filteredItems.length
  totalPages.value = Math.ceil(filteredItems.length / pageSize)
  appointments.value = filteredItems.slice(startIndex, endIndex)
  
}

function onPageChange(page: number) {
  if (page >= 1 && page <= totalPages.value && page !== currentPage.value) {
    currentPage.value = page
    // NO API call needed - just re-apply filtering/pagination on cached data
    applyFiltersAndPagination()
  }
}

function applyFilters() {
  // Reset to first page when filters change
  currentPage.value = 1
  // NO API call needed - just re-apply filtering/pagination on cached data
  applyFiltersAndPagination()
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
const showEdit = ref(false)
const editingAppointment = ref<AppointmentItem | null>(null)
const createLoading = ref(false)
const updateLoading = ref(false)

async function onCreate(payload: { contactId: string; address: string; agentIds: string[]; datetime: string; status?: 'Upcoming' | 'Completed' | 'Cancelled' }) {
  createLoading.value = true
  try {
    await createAppointment(payload)
    showCreate.value = false
    
    // Refresh all data after create
    fetchAllAppointments()
  } catch (error) {
    console.error('Failed to create appointment:', error)
  } finally {
    createLoading.value = false
  }
}

function onEdit(appointment: AppointmentItem) {
  editingAppointment.value = appointment
  showEdit.value = true
}

async function onUpdate(id: string, payload: Partial<{ contactId: string; address: string; agentIds: string[]; datetime: string; status?: 'Upcoming' | 'Completed' | 'Cancelled' }>) {
  updateLoading.value = true
  try {
    await updateAppointment(id, payload)
    showEdit.value = false
    editingAppointment.value = null
    
    // Refresh all data after update
    fetchAllAppointments()
  } catch (error) {
    console.error('Failed to update appointment:', error)
  } finally {
    updateLoading.value = false
  }
}
</script>

<template>
  <div class="home">
    <!-- Header -->
    <div class="home__header">
      <h1 class="page-title">Appointments</h1>
    </div>

    <!-- Main Content Container -->
    <div class="main-container">
      <!-- Filters -->
      <FilterToolbar 
        v-model="filters" 
        @search="applyFilters" />

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
        :items="appointments" 
        :loading="loading"
        :totalPages="totalPages"
        :currentPage="currentPage"
        :totalItems="totalItems"
        @pageChange="onPageChange"
        @edit="onEdit" 
        @view="onEdit" />
    </div>

    <!-- Create Modal -->
    <Modal v-model="showCreate" title="Create an Appointment">
      <CreateAppointmentForm @submit="onCreate" @cancel="showCreate = false" />
    </Modal>

    <!-- Edit Modal -->
    <Modal v-model="showEdit" title="Edit Appointment">
      <EditAppointmentForm 
        v-if="editingAppointment" 
        :appointment="editingAppointment"
        @submit="onUpdate" 
        @cancel="showEdit = false; editingAppointment = null" />
    </Modal>
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
