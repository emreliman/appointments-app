<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listAgents, type Agent } from '@/services/agents'

export interface AppointmentItem {
  id: string
  status: 'Upcoming' | 'Completed' | 'Cancelled'
  date: string // ISO
  address: string
  contact: { name: string; email?: string; phone?: string; id?: string }
  agents: Array<{ id: string; name: string }>
}

interface Props {
  item: AppointmentItem
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  compact: false
})
defineEmits<{ 
  (e: 'edit', item: AppointmentItem): void
  (e: 'view', item: AppointmentItem): void
}>()

const agents = ref<Agent[]>([])

onMounted(async () => {
  try {
    agents.value = await listAgents()
  } catch (e) {
    console.error('Failed to load agents in AppointmentListItem:', e)
    agents.value = []
  }
})

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

function getAgentColor(agentId: string) {
  const agent = agents.value.find(a => a.id === agentId)
  return agent?.color || '#64748b' // fallback gri renk
}

function getAgentStyle(agentId: string) {
  return {
    backgroundColor: getAgentColor(agentId)
  }
}

function getRemainingDays(date: string) {
  const now = new Date()
  const appointmentDate = new Date(date)
  const diffMs = appointmentDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays <= 1) {
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))
    return diffHours <= 0 ? '0 hours' : `${diffHours} hours`
  }
  
  return `${diffDays} days`
}

function getStatusColor() {
  return '#ec4899' // pembe sabit kalacak
}

function getStatusTextColor(status: string) {
  switch (status) {
    case 'Upcoming':
      return '#f59e0b' // orange
    case 'Completed':
      return '#10b981' // green
    case 'Cancelled':
      return '#ef4444' // red
    default:
      return '#ec4899' // default pink
  }
}

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}
</script>

<template>
  <div class="appointment-item" :class="{ 'compact': props.compact }" @click="$emit('edit', item)">
    <!-- Left section with contact info -->
    <div class="left-section">
      <div class="contact-info">
        <div class="contact-details">
          <div class="contact-name">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            {{ item.contact.name }}
          </div>
          <div class="contact-email" v-if="item.contact.email">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <span class="contact-text">{{ truncateText(item.contact.email, 25) }}</span>
          </div>
          <div class="contact-phone" v-if="item.contact.phone">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <span class="contact-text">{{ truncateText(item.contact.phone, 20) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Center section with address -->
    <div class="center-section">
      <div class="address-info">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9,22 9,12 15,12 15,22"/>
        </svg>
        <span class="address-text">{{ truncateText(item.address, 40) }}</span>
      </div>
      
      <!-- Compact mode status bar -->
      <div v-if="props.compact" class="compact-status-bar">
        <div class="compact-status-pill" :style="{ color: getStatusTextColor(item.status) }">
          {{ item.status }}
          <div v-if="item.status === 'Upcoming'" class="compact-pill-remaining">
            {{ getRemainingDays(item.date) }}
          </div>
        </div>
        <span class="compact-date">{{ formatDate(item.date) }}</span>
      </div>
    </div>

    <!-- Right section with status, time and avatar -->
    <div class="status-section">
      <div class="status-time-container">
        <div class="status-time-badge" :style="{ backgroundColor: getStatusColor() }">
          <div class="status-pill" :style="{ color: getStatusTextColor(item.status) }">
            <span class="status-text">{{ item.status }}</span>
            <div v-if="item.status === 'Upcoming'" class="pill-remaining">
              {{ getRemainingDays(item.date) }}
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
          <span class="date-text">{{ formatDate(item.date) }}</span>
        </div>
      </div>
    </div>
      
    <!-- Agent Avatars -->
    <div class="agents-section" v-if="item.agents?.length">
      <div class="agents-container">
        <div class="agent-avatar" 
             v-for="agent in item.agents.slice(0, 3)" 
             :key="agent.id"
             :style="getAgentStyle(agent.id)">
          {{ agent.name.substring(0, 2).toUpperCase() }}
        </div>
        <div v-if="item.agents.length > 3" class="agent-more">+{{ item.agents.length - 3 }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.appointment-item {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 8px;
  display: grid;
  grid-template-columns: 280px 1fr minmax(200px, 250px) 120px;
  gap: 20px;
  align-items: center;
  transition: all 0.2s ease;
  min-height: 80px;
  cursor: pointer;
  width: 100%;
  box-sizing: border-box;
}

.appointment-item:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

.left-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  min-height: 60px;
  justify-content: flex-start;
  overflow: hidden;
  box-sizing: border-box;
}

.contact-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  overflow: hidden;
}

.contact-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  height: 100%;
  justify-content: flex-start;
  width: 100%;
  overflow: hidden;
}

.contact-name {
  font-weight: 600;
  color: #0f172a;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.contact-name svg {
  width: 14px;
  flex-shrink: 0;
  color: #6b7280;
}

.contact-email {
  color: #64748b;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.contact-email svg {
  width: 14px;
  flex-shrink: 0;
}

.contact-phone {
  color: #64748b;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.contact-phone svg {
  width: 14px;
  flex-shrink: 0;
}

.contact-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.center-section {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 60px;
  justify-content: center;
  overflow: hidden;
  box-sizing: border-box;
}

.address-info {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  overflow: hidden;
}

.address-text {
  color: #475569;
  font-size: 14px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.right-section {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 60px;
  justify-content: flex-end;
}

.status-section {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60px;
  width: 100%;
  overflow: hidden;
  box-sizing: border-box;
  white-space: nowrap;
}

.status-time-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  white-space: nowrap;
  flex-shrink: 0;
  gap: 4px;
}

.status-time-badge {
  background: #ec4899;
  color: white;
  padding: 12px 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-pill {
  background: rgba(255, 255, 255, 0.9);
  color: #ec4899;
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: 600;
}

.status-text {
  font-size: 12px;
  white-space: nowrap;
}

.pill-remaining {
  font-size: 10px;
  color: #000000;
  font-weight: 500;
  text-align: center;
  line-height: 1;
}

.separator {
  font-size: 12px;
  opacity: 0.9;
}

.date-text {
  font-size: 12px;
  opacity: 0.9;
  white-space: nowrap;
}

.agents-section {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  min-height: 60px;
  overflow: hidden;
  box-sizing: border-box;
}

.agents-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.agent-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-left: -6px;
  position: relative;
  z-index: 1;
}

.agent-avatar:first-child {
  margin-left: 0;
}

.agent-more {
  background: #f1f5f9;
  color: #64748b;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-left: -6px;
  position: relative;
  z-index: 0;
}

@media (max-width: 768px) {
  .appointment-item {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto auto;
    gap: 12px;
    padding: 16px;
  }
  
  .left-section, .center-section, .status-section, .agents-section {
    max-width: none;
    width: 100%;
    margin: 0;
    min-height: auto;
  }
  
  .status-time-container {
    flex-direction: row;
    gap: 12px;
  }
}

/* Compact view specific styles */
.appointment-item.compact {
  grid-template-columns: 1fr auto;
  gap: 12px;
  padding: 8px 12px;
  min-height: 50px;
  font-size: 0.85rem;
}

.appointment-item.compact .left-section {
  display: none;
}

.appointment-item.compact .center-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: auto;
}

.appointment-item.compact .status-section {
  display: none;
}

.appointment-item.compact .status-time-container {
  white-space: nowrap;
  flex-shrink: 0;
  min-width: fit-content;
  overflow: visible;
}

.appointment-item.compact .status-pill {
  border-radius: 15px;
  padding: 3px 8px;
  white-space: nowrap;
  flex-shrink: 0;
}

.appointment-item.compact .agents-section {
  min-height: auto;
  align-self: center;
}

.appointment-item.compact .contact-name {
  font-size: 0.75rem;
  gap: 2px;
  margin-bottom: 1px;
}

.appointment-item.compact .contact-email,
.appointment-item.compact .contact-phone {
  font-size: 0.65rem;
  gap: 2px;
  line-height: 1.1;
}

.appointment-item.compact .contact-details {
  gap: 1px;
}

.appointment-item.compact .contact-info {
  gap: 2px;
}

.appointment-item.compact .address-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.appointment-item.compact .address-info svg {
  width: 16px;
  height: 16px;
  color: #6b7280;
  flex-shrink: 0;
}

.appointment-item.compact .address-text {
  font-size: 0.8rem;
  line-height: 1.3;
  color: #374151;
  font-weight: 500;
}

.appointment-item.compact .compact-status-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.appointment-item.compact .compact-status-pill {
  background: #ec4899;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.appointment-item.compact .compact-pill-remaining {
  font-size: 0.6rem;
  color: #000000;
  font-weight: 500;
  line-height: 1;
}

.appointment-item.compact .compact-date {
  font-size: 0.7rem;
  color: #6b7280;
  white-space: nowrap;
}

.appointment-item.compact .agent-avatar {
  width: 24px;
  height: 24px;
  font-size: 0.6rem;
  margin-left: -3px;
}

.appointment-item.compact .agent-more {
  width: 24px;
  height: 24px;
  font-size: 0.55rem;
  margin-left: -3px;
}

.appointment-item.compact .status-time-badge {
  padding: 4px 8px;
  border-radius: 20px;
  gap: 3px;
  font-size: 0.7rem;
  white-space: nowrap;
  flex-shrink: 0;
  min-width: fit-content;
}

.appointment-item.compact .status-text,
.appointment-item.compact .date-text {
  font-size: 0.7rem;
  white-space: nowrap;
}

.appointment-item.compact .agent-avatar {
  width: 20px;
  height: 20px;
  font-size: 0.55rem;
  margin-left: -2px;
}

.appointment-item.compact .agent-more {
  width: 20px;
  height: 20px;
  font-size: 0.5rem;
  margin-left: -2px;
}
</style>