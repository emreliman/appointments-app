<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { AppointmentPayload } from '@/services/appointments'
import { listAgents, type Agent } from '@/services/agents'
import { listContacts, type Contact } from '@/services/contacts'

const emit = defineEmits<{ (e: 'submit', payload: AppointmentPayload): void; (e: 'cancel'): void }>()

const contacts = ref<Contact[]>([])
const agents = ref<Agent[]>([])
const loading = ref(false)
const submitted = ref(false)

const form = ref<AppointmentPayload>({
  contactId: '',
  address: '',
  agentIds: [],
  datetime: new Date().toISOString().slice(0, 16),
  status: 'Upcoming',
})

const contactQuery = ref('')
const selectedContact = ref<Contact | null>(null)
const showContactDropdown = ref(false)
const showAgentDropdown = ref(false)

// Form validation
const errors = computed(() => {
  const errs: Record<string, string> = {}
  
  if (submitted.value) {
    if (!form.value.contactId) errs.contactId = 'Please select a contact'
    if (!form.value.address.trim()) errs.address = 'Address is required'
    if (!form.value.datetime) errs.datetime = 'Date and time is required'
    if (form.value.agentIds.length === 0) errs.agentIds = 'Please select at least one agent'
    
    // Validate datetime is in future for upcoming appointments
    if (form.value.datetime) {
      const selectedDate = new Date(form.value.datetime)
      const now = new Date()
      if (selectedDate <= now) {
        errs.datetime = 'Please select a future date and time'
      }
    }
  }
  
  return errs
})

const isValid = computed(() => Object.keys(errors.value).length === 0)

// Filter contacts based on search query
const filteredContacts = computed(() => {
  if (!contactQuery.value) return contacts.value.slice(0, 5) // Show first 5 by default
  const query = contactQuery.value.toLowerCase()
  return contacts.value.filter(contact => 
    contact.name.toLowerCase().includes(query) ||
    contact.email?.toLowerCase().includes(query) ||
    contact.phone?.includes(query)
  ).slice(0, 5) // Limit to 5 results for better UX
})

function selectContact(contact: Contact) {
  selectedContact.value = contact
  form.value.contactId = contact.id
  contactQuery.value = contact.name
  showContactDropdown.value = false
}

function clearContact() {
  selectedContact.value = null
  form.value.contactId = ''
  contactQuery.value = ''
  showContactDropdown.value = false
}

function onContactInputFocus() {
  showContactDropdown.value = true
  if (selectedContact.value) {
    // If a contact is selected, clear it to allow new search
    contactQuery.value = ''
    selectedContact.value = null
    form.value.contactId = ''
  }
}

function onContactInputBlur() {
  // Delay hiding dropdown to allow click on results
  setTimeout(() => {
    showContactDropdown.value = false
  }, 200)
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
    emit('submit', { ...form.value })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="form-container">
  
    <form @submit="onSubmit" class="form">
    <div class="field" :class="{ 'field--error': errors.contactId }">
      <!-- Contact Search Input -->
      <div class="contact-search">
        <input 
          placeholder="Search contacts by name, email or phone..." 
          v-model="contactQuery" 
          :disabled="loading"
          @focus="onContactInputFocus"
          @blur="onContactInputBlur"
          class="search-input" />
        
        <!-- Selected Contact Display (overlay style) -->
        <div v-if="selectedContact && !showContactDropdown" class="selected-contact-overlay">
          <div class="contact-info">
            <div class="contact-name">{{ selectedContact.name }}</div>
            <div class="contact-details">
              <span v-if="selectedContact.email">{{ selectedContact.email }}</span>
              <span v-if="selectedContact.phone">{{ selectedContact.phone }}</span>
            </div>
          </div>
          <button type="button" @click="clearContact" class="clear-btn" :disabled="loading">
            ×
          </button>
        </div>
        
        <!-- Search Results -->
        <div v-if="showContactDropdown && contactQuery && filteredContacts.length > 0" class="search-results">
          <div 
            v-for="contact in filteredContacts" 
            :key="contact.id" 
            @mousedown="selectContact(contact)"
            class="search-result-item">
            <div class="contact-name">{{ contact.name }}</div>
            <div class="contact-details">
              <span v-if="contact.email">{{ contact.email }}</span>
              <span v-if="contact.phone">{{ contact.phone }}</span>
            </div>
          </div>
        </div>
        
        <!-- No Results -->
        <div v-else-if="showContactDropdown && contactQuery && filteredContacts.length === 0" class="no-results">
          No contacts found matching "{{ contactQuery }}"
        </div>
        
        <!-- Initial state: show some contacts -->
        <div v-else-if="showContactDropdown && !contactQuery && contacts.length > 0" class="search-results">
          <div class="dropdown-header">Select a contact:</div>
          <div 
            v-for="contact in contacts.slice(0, 8)" 
            :key="contact.id" 
            @mousedown="selectContact(contact)"
            class="search-result-item">
            <div class="contact-name">{{ contact.name }}</div>
            <div class="contact-details">
              <span v-if="contact.email">{{ contact.email }}</span>
              <span v-if="contact.phone">{{ contact.phone }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <span v-if="errors.contactId" class="error-message">{{ errors.contactId }}</span>
    </div>

    <div class="field" :class="{ 'field--error': errors.address }">
      <div class="input-with-icon">
        <input 
          v-model="form.address" 
          placeholder="Enter appointment address" 
          :disabled="loading"
          :class="{ 'error': errors.address }" />
        <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9,22 9,12 15,12 15,22"></polyline>
        </svg>
      </div>
      <span v-if="errors.address" class="error-message">{{ errors.address }}</span>
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
        :class="{ 'error': errors.datetime }" />
      <span v-if="errors.datetime" class="error-message">{{ errors.datetime }}</span>
    </div>

    <div class="actions">
      <button type="button" class="btn" @click="$emit('cancel')" :disabled="loading">
        Cancel
      </button>
      <button type="submit" class="btn btn-primary" :disabled="loading || !isValid">
        <span v-if="loading">Creating...</span>
        <span v-else>Create an Appointment</span>
      </button>
    </div>
  </form>
  </div>
</template>

<style scoped>
.form-container {
  max-width: 600px;
  margin: 0 auto;
}

.form { 
  display: grid; 
  gap: 1.5rem; 
}

.field { 
  display: grid; 
  gap: 0.75rem; 
}

.field--error {
  position: relative;
}

input { 
  padding: 0.75rem 1rem; 
  border: 1px solid #d1d5db; 
  border-radius: 12px; 
  font-size: 15px;
  font-weight: 450;
  transition: all 0.2s ease;
}

input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

input:hover:not(:disabled) {
  border-color: #9ca3af;
}

input:disabled {
  background-color: #f9fafb;
  color: #9ca3af;
  cursor: not-allowed;
}

input.error {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-icon input {
  padding-right: 3rem;
  width: 100%;
}

.input-icon {
  position: absolute;
  right: 1rem;
  color: #9ca3af;
  pointer-events: none;
  z-index: 1;
}

.contact-search {
  position: relative;
}

.search-input {
  width: 100%;
  margin-bottom: 0.5rem;
}

.selected-contact-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  gap: 0.75rem;
  z-index: 2;
}

.contact-info {
  flex: 1;
}

.contact-name {
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 0.25rem;
}

.contact-details {
  font-size: 0.875rem;
  color: #64748b;
  display: flex;
  gap: 0.5rem;
}

.contact-details span {
  position: relative;
}

.contact-details span:not(:last-child)::after {
  content: '•';
  margin-left: 0.5rem;
  color: #cbd5e1;
}

.clear-btn {
  background: transparent;
  border: none;
  color: #6b7280;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  font-size: 18px;
  font-weight: bold;
}

.clear-btn:hover:not(:disabled) {
  color: #374151;
  background: #f3f4f6;
  transform: scale(1.05);
}

.clear-btn:disabled {
  opacity: 0.6;
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
  max-height: 250px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.dropdown-header {
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
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

.error-message {
  color: #dc2626;
  font-size: 0.875rem;
  font-weight: 500;
  margin-top: -0.25rem;
}

.agents-dropdown {
  position: relative;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 15px;
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
  border-radius: 0 0 12px 12px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 20;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.agent-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid #f1f5f9;
  font-size: 15px;
}

.agent-option:hover {
  background: #f8fafc;
}

.agent-option:last-child {
  border-bottom: none;
  border-radius: 0 0 12px 12px;
}

.agent-option input[type="checkbox"] {
  width: 18px;
  height: 18px;
  margin: 0;
  cursor: pointer;
}

.actions { 
  display: flex; 
  justify-content: flex-end; 
  gap: 0.75rem; 
  margin-top: 1rem; 
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.btn { 
  background: #f8fafc; 
  border: 1px solid #e2e8f0; 
  padding: 0.75rem 1.5rem; 
  border-radius: 12px; 
  cursor: pointer; 
  font-size: 15px;
  font-weight: 600;
  transition: all 0.2s ease;
  letter-spacing: 0.025em;
  min-width: 120px;
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
