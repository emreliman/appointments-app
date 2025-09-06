<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { listAgents, type Agent } from '@/services/agents'

export interface FilterState {
  status: string
  agentIds: string[]
  query: string
  from: string
  to: string
  sortBy: 'date-desc' | 'date-asc'
}

const props = defineProps<{ 
  modelValue: FilterState
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: FilterState): void
  (e: 'search'): void
}>()

const agents = ref<Agent[]>([])
const searchTimeout = ref<NodeJS.Timeout | null>(null)

onMounted(async () => {
  try {
    agents.value = await listAgents()
  } catch (e) {
    console.error('Failed to load agents:', e)
    console.error('Error details:', e.message, e.stack)
    // No fallback data - show empty state
    agents.value = []
  }
})

// Watch for search query changes and debounce search
watch(() => props.modelValue.query, (newQuery) => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  
  searchTimeout.value = setTimeout(() => {
    emit('search')
  }, 300) // 300ms debounce
})

function updateFilter(updates: Partial<FilterState>) {
  emit('update:modelValue', { ...props.modelValue, ...updates })
  
  // Immediate search for everything except query (which is debounced)
  if (!('query' in updates)) {
    emit('search')
  }
}

function toggleAgent(agentId: string) {
  const current = props.modelValue.agentIds
  const newIds = current.includes(agentId) 
    ? current.filter(id => id !== agentId)
    : [...current, agentId]
  updateFilter({ agentIds: newIds })
}

function clearFilters() {
  emit('update:modelValue', {
    status: 'All Statuses',
    agentIds: [],
    query: '',
    from: '',
    to: '',
    sortBy: 'date-desc'
  })
  emit('search')
}

function hasActiveFilters() {
  const v = props.modelValue
  return v.status !== 'All Statuses' || v.agentIds.length > 0 || v.query || v.from || v.to || v.sortBy !== 'date-desc'
}
</script>

<template>
  <div class="filter-toolbar">
    <!-- Top Row: Agent Filters, Status and Date Range -->
    <div class="filter-row">
      <!-- Agent Avatars -->
      <div class="agent-filters">
        <div v-if="agents.length === 0" class="no-agents-message">
          No agents loaded
        </div>
        <div 
          v-for="(agent, index) in agents.slice(0, 6)" 
          :key="agent.id"
          class="agent-filter"
          :class="{ active: modelValue.agentIds.includes(agent.id) }"
          :style="{ 
            backgroundColor: agent.color || '#64748b',
            zIndex: agents.length - index,
            marginLeft: index > 0 ? '-8px' : '0'
          }"
          @click="toggleAgent(agent.id)"
          :title="`${agent.fullName} - ${agent.color || 'Default color'}`">
          {{ agent.fullName ? agent.fullName.substring(0, 2).toUpperCase() : '??' }}
        </div>
        <div v-if="agents.length > 6" class="agent-more" :style="{ marginLeft: agents.length > 0 ? '-8px' : '0' }">+{{ agents.length - 6 }}</div>
      </div>

      <!-- Status Dropdown -->
      <div class="status-filter">
        <select 
          :value="modelValue.status" 
          @change="updateFilter({ status: ($event.target as HTMLSelectElement).value })"
          class="status-select">
          <option value="All Statuses">All Statuses</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <svg class="select-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6,9 12,15 18,9"/>
        </svg>
      </div>

      <!-- Date Range -->
      <div class="date-filters">
        <div class="date-input-group">
          <div class="date-input-wrapper">
            <span v-if="!modelValue.from" class="date-placeholder">From</span>
            <input 
              type="date" 
              :value="modelValue.from"
              @change="updateFilter({ from: ($event.target as HTMLInputElement).value })"
              class="date-input" />
          </div>
        </div>
        <div class="date-input-group">
          <div class="date-input-wrapper">
            <span v-if="!modelValue.to" class="date-placeholder">To</span>
            <input 
              type="date" 
              :value="modelValue.to"
              @change="updateFilter({ to: ($event.target as HTMLInputElement).value })"
              class="date-input" />
          </div>
        </div>
      </div>

      <!-- Search Input -->
      <div class="search-filter">
        <div class="search-input-wrapper">
          <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input 
            type="text" 
            placeholder="Search..." 
            :value="modelValue.query"
            @input="updateFilter({ query: ($event.target as HTMLInputElement).value })"
            class="search-input" />
          <button 
            v-if="modelValue.query"
            @click="updateFilter({ query: '' })"
            class="clear-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Second Row: Clear Filters -->
    <div class="filter-row-secondary">
      <!-- Clear Filters -->
      <div class="filter-actions">
        <button v-if="hasActiveFilters()" @click="clearFilters" class="clear-filters">
          Clear all filters
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-toolbar {
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 0;
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: none;
  width: 100%;
  min-width: 0; /* Allow shrinking */
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: nowrap; /* Force single row */
  min-height: 60px; /* Minimum height to prevent collapsing */
  width: 100%;
  overflow-x: auto; /* Horizontal scroll if needed */
}

.filter-row-secondary {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.agent-filters {
  display: flex;
  align-items: center;
  padding-left: 8px; /* First element için space */
  flex-shrink: 0; /* Prevent shrinking */
  min-width: 200px; /* Fixed minimum width */
}

.no-agents-message {
  color: #64748b;
  font-size: 14px;
  font-style: italic;
  padding: 8px 12px;
}

.agent-filter {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white !important;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 3px solid transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  letter-spacing: 0.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  position: relative;
}

.agent-filter:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 100 !important;
}

.agent-filter.active {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2), 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: scale(1.05);
  z-index: 101 !important;
}

.agent-more {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
}

.status-filter {
  position: relative;
  min-width: 140px;
  width: 140px;
  flex-shrink: 0; /* Prevent shrinking */
}

.status-select {
  width: 100%;
  padding: 12px 44px 12px 18px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  background: white;
  font-size: 15px;
  font-weight: 500;
  color: #374151;
  appearance: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.status-select:hover {
  border-color: #9ca3af;
}

.select-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  pointer-events: none;
}

.search-filter {
  flex: 0 1 300px; /* Don't grow aggressively */
  min-width: 200px;
  max-width: 400px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #6b7280;
}

.search-input {
  width: 100%;
  padding: 12px 44px 12px 48px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 450;
  color: #374151;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-input:hover {
  border-color: #9ca3af;
}

.search-input::placeholder {
  color: #9ca3af;
  font-weight: 400;
}

.clear-search {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.clear-search:hover {
  background: #f3f4f6;
}

.date-filters {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-shrink: 0; /* Prevent shrinking */
  min-width: 300px; /* Fixed minimum width */
}

.date-input-group {
  display: flex;
  flex-direction: column;
}

.date-input-wrapper {
  position: relative;
}

.date-placeholder {
  position: absolute;
  top: -8px;
  left: 14px;
  color: #6b7280;
  font-size: 12px;
  font-weight: 500;
  pointer-events: none;
  z-index: 10;
  background: white;
  padding: 0 4px;
}

.date-input {
  padding: 12px 14px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 450;
  color: #374151;
  min-width: 140px;
  max-width: 140px;
  transition: all 0.2s ease;
  position: relative;
  background: white;
}

.date-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.date-input:hover {
  border-color: #9ca3af;
}

.results-info {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #6b7280;
  font-size: 14px;
}

.filter-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.clear-filters {
  background: none;
  border: 1px solid #d1d5db;
  color: #374151;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-filters:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

@media (max-width: 768px) {
  .filter-toolbar {
    padding: 0;
  }
  
  .filter-row {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
    overflow-x: visible;
    flex-wrap: wrap;
  }
  
  .filter-row-secondary {
    flex-direction: column;
    align-items: stretch;
  }
  
  .agent-filters {
    justify-content: center;
    padding-left: 0;
    min-width: auto;
  }
  
  .date-filters {
    justify-content: space-between;
    min-width: auto;
    gap: 12px;
  }
  
  .search-filter {
    min-width: auto;
    flex: 1;
    max-width: none;
  }
  
  .filter-actions {
    justify-content: center;
  }
}

/* Medium screens - more aggressive space saving */
@media (max-width: 1200px) and (min-width: 769px) {
  .filter-row {
    gap: 12px;
  }
  
  .status-filter {
    min-width: 160px;
  }
  
  .date-filters {
    gap: 8px;
    min-width: 280px;
  }
  
  .date-input {
    min-width: 130px;
    max-width: 130px;
  }
  
  .search-filter {
    flex: 0 1 250px;
    min-width: 180px;
    max-width: 300px;
  }
  
  .agent-filters {
    min-width: 180px;
  }
}
</style>


