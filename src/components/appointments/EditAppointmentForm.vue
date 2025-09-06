<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import type { AppointmentPayload } from '@/services/appointments'
import { listAgents, type Agent } from '@/services/agents'
import { listContacts, type Contact } from '@/services/contacts'
import { listAppointments } from '@/services/appointments'
import type { AppointmentItem } from './AppointmentListItem.vue'
import AppointmentListItem from './AppointmentListItem.vue'

interface Props {
  appointment: AppointmentItem
}

const props = defineProps<Props>()
const emit = defineEmits<{ 
  (e: 'submit', id: string, payload: Partial<AppointmentPayload>): void; 
  (e: 'cancel'): void 
}>()

const contacts = ref<Contact[]>([])
const agents = ref<Agent[]>([])
const loading = ref(false)
const submitted = ref(false)
const relatedAppointments = ref<AppointmentItem[]>([])
const selectedContact = ref<Contact | null>(null)
const showContactSearch = ref(false)
const showAgentDropdown = ref(false)

const form = ref<AppointmentPayload>({
  contactId: '',
  address: '',
  agentIds: [],
  datetime: '',
  status: 'Upcoming',
})

const contactQuery = ref('')

// Computed property for available status options based on date
const availableStatuses = computed(() => {
  if (!form.value.datetime) return ['Upcoming', 'Cancelled']
  
  const appointmentDate = new Date(form.value.datetime)
  const now = new Date()
  
  if (appointmentDate > now) {
    // Future date: can be Upcoming or Cancelled
    return ['Upcoming', 'Cancelled']
  } else {
    // Past date: can be Completed or Cancelled
    return ['Completed', 'Cancelled']
  }
})

// Watch for date changes to auto-update status if needed
watch(() => form.value.datetime, (newDate) => {
  if (newDate) {
    const appointmentDate = new Date(newDate)
    const now = new Date()
    
    // If date changed from future to past, update status automatically
    if (appointmentDate <= now && form.value.status === 'Upcoming') {
      form.value.status = 'Completed'
    }
    // If date changed from past to future, update status automatically  
    else if (appointmentDate > now && form.value.status === 'Completed') {
      form.value.status = 'Upcoming'
    }
  }
})

// Initialize form with appointment data
watch(() => props.appointment, (appointment) => {
  if (appointment) {
    form.value = {
      contactId: appointment.contact.id || '',
      address: appointment.address,
      agentIds: appointment.agents.map(a => a.id),
      datetime: new Date(appointment.date).toISOString().slice(0, 16),
      status: appointment.status,
    }
    
    selectedContact.value = {
      id: appointment.contact.id || '',
      name: appointment.contact.name,
      email: appointment.contact.email,
      phone: appointment.contact.phone
    }
    
    showContactSearch.value = false
  }
}, { immediate: true })

// Watch for contact ID changes to load related appointments
watch(() => form.value.contactId, async (contactId) => {
  if (contactId && selectedContact.value) {
    await loadRelatedAppointments(contactId)
  }
}, { immediate: true })

async function loadRelatedAppointments(contactId: string) {
  try {
    const selectedContactRecord = contacts.value.find(c => c.id === contactId)
    if (!selectedContactRecord) return
    
    // Fetch all appointments and filter by contact ID or name
    const result = await listAppointments()
    relatedAppointments.value = (result.items as AppointmentItem[])
      .filter(app => {
        // Match by contact ID first, then by name as fallback
        const matchesId = app.contact && (app.contact as any).id === contactId
        const matchesName = app.contact.name === selectedContactRecord.name
        const isNotCurrent = app.id !== props.appointment.id
        
        return (matchesId || matchesName) && isNotCurrent
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sort by date desc

  } catch (error) {
    console.error('Failed to load related appointments:', error)
  }
}

const errors = computed(() => {
  const errs: Record<string, string> = {}
  
  if (submitted.value) {
    const hasContact = form.value.contactId || (selectedContact.value && !showContactSearch.value)
    if (!loading.value && !hasContact) {
      errs.contactId = 'Please select a contact'
    }
    if (!form.value.address.trim()) errs.address = 'Address is required'
    if (!form.value.datetime) errs.datetime = 'Date and time is required'
    if (form.value.agentIds.length === 0) errs.agentIds = 'Please select at least one agent'
    
    if (form.value.datetime) {
      const selectedDate = new Date(form.value.datetime)
      if (isNaN(selectedDate.getTime())) {
        errs.datetime = 'Please enter a valid date and time'
      } else {
        if (form.value.status === 'Upcoming') {
          const now = new Date()
          if (selectedDate <= now) {
            errs.datetime = 'Upcoming appointments must be scheduled for a future date'
          }
        }
        
        const twoYearsFromNow = new Date()
        twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2)
        if (selectedDate > twoYearsFromNow) {
          errs.datetime = 'Appointments cannot be scheduled more than 2 years in advance'
        }
      }
    }
    
    if (form.value.address.trim().length < 5) {
      errs.address = 'Address must be at least 5 characters long'
    }
    
    if (form.value.address.trim().length > 200) {
      errs.address = 'Address cannot exceed 200 characters'
    }
  }
  
  return errs
})

const isValid = computed(() => Object.keys(errors.value).length === 0)

const filteredContacts = computed(() => {
  if (!contactQuery.value) return contacts.value.slice(0, 10)
  const query = contactQuery.value.toLowerCase()
  return contacts.value.filter(contact => 
    contact.name.toLowerCase().includes(query) ||
    contact.email?.toLowerCase().includes(query) ||
    contact.phone?.includes(query)
  ).slice(0, 10)
})

function selectContact(contact: Contact) {
  selectedContact.value = contact
  form.value.contactId = contact.id
  contactQuery.value = contact.name
  showContactSearch.value = false
  loadRelatedAppointments(contact.id)
}

onMounted(async () => {
  loading.value = true
  try {
    const [agentsData, contactsData] = await Promise.all([
      listAgents(),
      listContacts()
    ])
    agents.value = agentsData
    contacts.value = contactsData
    
    // Load related appointments if we have a contact ID
    if (form.value.contactId) {
      await loadRelatedAppointments(form.value.contactId)
    }
  } catch (error) {
    console.error('Failed to load form data:', error)
  } finally {
    loading.value = false
  }
})

async function onSubmit(e: Event) {
  e.preventDefault()
  submitted.value = true
  
  if (!isValid.value) return
  
  loading.value = true
  try {
    const payload = {
      ...form.value,
      datetime: new Date(form.value.datetime).toISOString()
    }
    
    emit('submit', props.appointment.id, payload)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form @submit="onSubmit" class="form">
    <div class="field" :class="{ 'field--error': errors.contactId }">
      <!-- Loading state -->
      <div v-if="loading" class="loading-contact">
        <div class="loading-spinner"></div>
        <span>Loading contact...</span>
      </div>
      
      <!-- Always show selected contact in edit mode, allow changing if needed -->
      <div v-else-if="!showContactSearch" class="selected-contact">
        <div class="contact-info">
          <div class="contact-name">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            {{ selectedContact?.name || props.appointment.contact.name }}
          </div>
          <div class="contact-details">
            <div v-if="selectedContact?.email || props.appointment.contact.email" class="contact-detail-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              {{ selectedContact?.email || props.appointment.contact.email }}
            </div>
            <div v-if="selectedContact?.phone || props.appointment.contact.phone" class="contact-detail-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              {{ selectedContact?.phone || props.appointment.contact.phone }}
            </div>
          </div>
        </div>
        <button 
          type="button" 
          @click="showContactSearch = true; contactQuery = ''" 
          class="remove-contact-btn"
          :disabled="loading">
          ×
        </button>
      </div>

      <!-- Contact Search (only when user wants to change) -->
      <div v-else class="contact-search">
        <div class="search-header">
          <input 
            placeholder="Search contacts by name, email or phone..." 
            v-model="contactQuery" 
            :disabled="loading"
            class="search-input" />
          <button 
            type="button" 
            @click="showContactSearch = false; contactQuery = ''" 
            class="cancel-search-btn"
            :disabled="loading">
            Cancel
          </button>
        </div>
        
        <!-- Search Results -->
        <div v-if="contactQuery && filteredContacts.length > 0" class="search-results">
          <div 
            v-for="contact in filteredContacts" 
            :key="contact.id" 
            @click="selectContact(contact)"
            class="search-result-item">
            <div class="contact-name">{{ contact.name }}</div>
            <div class="contact-details">
              <span v-if="contact.email">{{ contact.email }}</span>
              <span v-if="contact.phone">{{ contact.phone }}</span>
            </div>
          </div>
        </div>
        
        <!-- No Results -->
        <div v-else-if="contactQuery && filteredContacts.length === 0" class="no-results">
          No contacts found matching "{{ contactQuery }}"
        </div>
      </div>
      
      <span v-if="errors.contactId" class="error-message">{{ errors.contactId }}</span>
    </div>

    <div class="field" :class="{ 'field--error': errors.address }">
      <div class="input-with-icon">
        <textarea 
          v-model="form.address" 
          placeholder="Enter complete property address (e.g., 123 Main Street, City, Postal Code)" 
          :disabled="loading"
          :class="{ 'error': errors.address }"
          rows="2"
          maxlength="200" />
        <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9,22 9,12 15,12 15,22"></polyline>
        </svg>
      </div>
      <div class="input-helper">
        <span v-if="errors.address" class="error-message">{{ errors.address }}</span>
        <span class="character-count" :class="{ 'warning': form.address.length > 180 }">
          {{ form.address.length }}/200
        </span>
      </div>
    </div>

    <div class="field" :class="{ 'field--error': errors.agentIds }">
      <div class="agents-dropdown">
        <div class="dropdown-trigger" @click="showAgentDropdown = !showAgentDropdown" :class="{ 'error': errors.agentIds }">
          <span v-if="form.agentIds.length === 0" class="placeholder">Select agents...</span>
          <span v-else class="selection-summary">{{ form.agentIds.length }} agent(s) selected</span>
          <svg class="dropdown-arrow" :class="{ 'open': showAgentDropdown }" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6,9 12,15 18,9"></polyline>
          </svg>
        </div>
        
        <div v-if="showAgentDropdown" class="dropdown-content">
          <label v-for="agent in agents" :key="agent.id" class="agent-option">
            <input 
              type="checkbox" 
              :value="agent.id" 
              v-model="form.agentIds" 
              :disabled="loading" />
            <span class="checkmark"></span>
            {{ agent.name }}
          </label>
        </div>
      </div>
      
      <span v-if="errors.agentIds" class="error-message">{{ errors.agentIds }}</span>
    </div>

    <div class="field" :class="{ 'field--error': errors.datetime }">
      <input 
        type="datetime-local" 
        v-model="form.datetime" 
        :disabled="loading"
        :min="new Date().toISOString().slice(0, 16)"
        :class="{ 'error': errors.datetime }" />
      <div class="input-helper" v-if="errors.datetime">
        <span class="error-message">{{ errors.datetime }}</span>
      </div>
    </div>

    <div class="field">
      <select v-model="form.status" :disabled="loading">
        <option v-for="status in availableStatuses" :key="status" :value="status">
          {{ status }}
        </option>
      </select>
    </div>

  
   <!-- Related Appointments -->
    <div v-if="relatedAppointments.length > 0" class="field">
      <label>Related Appointments ({{ relatedAppointments.length }}):</label>
      <div class="related-appointments">
        <AppointmentListItem 
          v-for="appointment in relatedAppointments"
          :key="appointment.id"
          :item="appointment" 
          :compact="true"
          class="compact-appointment-item" />
      </div>
    </div>

    <div class="actions">
      <button type="button" class="btn" @click="$emit('cancel')" :disabled="loading">
        Cancel
      </button>
      <button type="submit" class="btn btn-primary" :disabled="loading || !isValid">
        <span v-if="loading">Updating...</span>
        <span v-else>Save</span>
      </button>
    </div>
  </form>
</template>

<style scoped>
.form { 
  display: grid; 
  gap: 0.5rem; 
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
}

.field { 
  display: grid; 
  gap: 0.25rem; 
}

.field--error {
  position: relative;
}

label { 
  font-size: 0.8rem; 
  font-weight: 600;
  color: #374151; 
  letter-spacing: 0.025em;
}

input, select, textarea { 
  padding: 0.4rem 0.6rem; 
  border: 1px solid #d1d5db; 
  border-radius: 4px; 
  font-size: 13px;
  font-weight: 450;
  transition: all 0.2s ease;
  font-family: inherit;
  resize: vertical;
  width: 100%;
  box-sizing: border-box;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

input:hover:not(:disabled), select:hover:not(:disabled), textarea:hover:not(:disabled) {
  border-color: #9ca3af;
}

input:disabled, select:disabled, textarea:disabled {
  background-color: #f9fafb;
  color: #9ca3af;
  cursor: not-allowed;
}

input.error, select.error, textarea.error {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: flex-start;
}

.input-with-icon textarea {
  padding-right: 3rem;
  width: 100%;
}

.input-icon {
  position: absolute;
  right: 1rem;
  top: 1rem;
  color: #9ca3af;
  pointer-events: none;
  z-index: 1;
}

.input-helper {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-top: 0.25rem;
  gap: 1rem;
}

.character-count {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
  white-space: nowrap;
}

.character-count.warning {
  color: #f59e0b;
  font-weight: 600;
}

.loading-contact {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #64748b;
  font-size: 0.875rem;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e2e8f0;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.selected-contact {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  gap: 0.5rem;
}

.remove-contact-btn {
  background: transparent;
  color: #374151;
  border: none;
  padding: 0.3rem;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.remove-contact-btn:hover:not(:disabled) {
  color: #111827;
  transform: scale(1.1);
}

.remove-contact-btn:disabled {
  color: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

.contact-info {
  flex: 1;
}

.contact-name {
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.contact-name svg {
  width: 14px;
  flex-shrink: 0;
  color: #6b7280;
}

.contact-details {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.contact-detail-item {
  font-size: 0.8rem;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.contact-detail-item svg {
  width: 14px;
  flex-shrink: 0;
}

.contact-search {
  position: relative;
}

.search-header {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.search-input {
  flex: 1;
  margin-bottom: 0.5rem;
}

.cancel-search-btn {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.cancel-search-btn:hover:not(:disabled) {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.cancel-search-btn:disabled {
  background: #f9fafb;
  color: #9ca3af;
  cursor: not-allowed;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #d1d5db;
  border-top: none;
  border-radius: 0 0 12px 12px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.search-result-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid #f1f5f9;
}

.search-result-item:hover {
  background: #f8fafc;
}

.search-result-item:last-child {
  border-bottom: none;
  border-radius: 0 0 12px 12px;
}

.no-results {
  padding: 1rem;
  text-align: center;
  color: #64748b;
  font-style: italic;
  background: white;
  border: 1px solid #d1d5db;
  border-top: none;
  border-radius: 0 0 12px 12px;
}

.search-input {
  margin-bottom: 0.5rem;
}

.related-appointments {
  display: grid;
  gap: 0.3rem;
  max-height: 250px;
  overflow-y: auto;
  padding: 0.5rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-top: 0.2rem;
}

.compact-appointment-item {
  transform: scale(0.88);
  transform-origin: left top;
  margin-bottom: -12px;
  max-width: 100%;
  overflow: hidden;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.compact-appointment-item:hover {
  transform: scale(0.90);
  transform-origin: left top;
}

.error-message {
  color: #dc2626;
  font-size: 0.875rem;
  font-weight: 500;
  margin-top: -0.25rem;
}

.chips { 
  display: flex; 
  flex-wrap: wrap; 
  gap: 0.4rem; 
}

.chip { 
  display: inline-flex; 
  gap: 0.3rem; 
  align-items: center; 
  padding: 0.3rem 0.5rem; 
  background: linear-gradient(135deg, #f1f5f9, #e2e8f0); 
  border-radius: 6px; 
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
}

.chip:hover:not(.disabled) {
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
}

.chip.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.chip input[type="checkbox"] {
  width: 16px;
  height: 16px;
  margin: 0;
}

.chip input[type="checkbox"]:disabled {
  cursor: not-allowed;
}

.agents-select {
  min-height: 100px;
  resize: vertical;
}

.agents-select option {
  padding: 6px 8px;
  font-size: 13px;
}

.agents-dropdown {
  position: relative;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0.6rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  font-weight: 450;
}

.dropdown-trigger:hover {
  border-color: #9ca3af;
}

.dropdown-trigger.error {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

.placeholder {
  color: #9ca3af;
}

.selection-summary {
  color: #374151;
  font-weight: 500;
}

.dropdown-arrow {
  transition: transform 0.2s ease;
  color: #6b7280;
  width: 14px;
  height: 14px;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.dropdown-content {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #d1d5db;
  border-top: none;
  border-radius: 0 0 4px 4px;
  max-height: 150px;
  overflow-y: auto;
  z-index: 20;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.agent-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.6rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
}

.agent-option:hover {
  background: #f8fafc;
}

.agent-option:last-child {
  border-bottom: none;
  border-radius: 0 0 4px 4px;
}

.agent-option input[type="checkbox"] {
  width: 16px;
  height: 16px;
  margin: 0;
  cursor: pointer;
}

.actions { 
  display: flex; 
  justify-content: flex-end; 
  gap: 0.4rem; 
  margin-top: 0.5rem; 
  padding-top: 0.5rem;
  border-top: 1px solid #e2e8f0;
}

.btn { 
  background: #f8fafc; 
  border: 1px solid #e2e8f0; 
  padding: 0.4rem 0.8rem; 
  border-radius: 4px; 
  cursor: pointer; 
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s ease;
  letter-spacing: 0.025em;
  min-width: 70px;
}

.btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary { 
  background: linear-gradient(135deg, #ec4899, #db2777); 
  color: #fff; 
  border-color: #ec4899; 
  box-shadow: 0 2px 8px rgba(236, 72, 153, 0.3);
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #db2777, #be185d);
  box-shadow: 0 4px 12px rgba(236, 72, 153, 0.4);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  background: #9ca3af;
  border-color: #9ca3af;
  box-shadow: none;
  transform: none;
}
</style>
