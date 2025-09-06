export interface AppointmentPayload {
  contactId: string
  address: string
  agentIds: string[]
  datetime: string // ISO
  status?: 'Upcoming' | 'Completed' | 'Cancelled'
}

import { airtableList } from './airtable'

const APPOINTMENTS_TABLE = 'Appointments'
const APPT_STATUS_FIELD = 'is_cancelled'
const APPT_DATE_FIELD = 'appointment_date'
const APPT_ADDRESS_FIELD = 'appointment_address'
const APPT_CONTACT_NAME_FIELD = 'contact_name'
const APPT_AGENT_NAMES_FIELD = 'agent_name'

export type AppointmentListItem = {
  id: string
  status: 'Upcoming' | 'Completed' | 'Cancelled'
  date: string
  address: string
  contact: { id?: string; name: string; email?: string; phone?: string }
  agents: Array<{ id: string; name: string }>
}

export async function listAppointments(params: { 
  pageSize?: number; 
  offset?: string; 
  query?: string; 
  status?: string; 
  agentNames?: string[]; 
  from?: string; 
  to?: string;
  sortDirection?: 'desc' | 'asc';
  fetchAll?: boolean; // New parameter to fetch all records
  page?: number; // New parameter for pagination
} = {}) {
  // Simple fetch without complex filtering - we'll filter on frontend
  const makeParams = (withSort: boolean, offset?: string) => {
    const qp: any = {} // No pageSize, let Airtable use default (100)
    if (withSort && APPT_DATE_FIELD) {
      qp['sort[0][field]'] = APPT_DATE_FIELD
      qp['sort[0][direction]'] = params.sortDirection || 'desc'
    }
    if (offset) qp.offset = offset
    else if (params.offset) qp.offset = params.offset
    return qp
  }
  
  let allRecords: any[] = []
  let offset: string | undefined = undefined
  
  // Fetch all records for frontend filtering and pagination
  do {
    let data
    try {
      data = await airtableList(APPOINTMENTS_TABLE, makeParams(true, offset))
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase()
      const isSortIssue = msg.includes('invalid sort') || msg.includes('could not find field') || msg.includes('unprocessable')
      if (!isSortIssue) throw err
      data = await airtableList(APPOINTMENTS_TABLE, makeParams(false, offset))
    }
    
    allRecords = allRecords.concat(data.records)
    offset = data.offset
    
  } while (offset) // Continue while there's more data
  
  let items: AppointmentListItem[] = allRecords.map((r: any) => {
    const isActiveCancelled = r.fields[APPT_STATUS_FIELD] === true
    let status: 'Upcoming' | 'Completed' | 'Cancelled' = 'Upcoming'
    if (isActiveCancelled) {
      status = 'Cancelled'
    } else {
      // Determine if completed based on date being in the past
      const appointmentDate = new Date(r.fields[APPT_DATE_FIELD] as string)
      const now = new Date()
      if (appointmentDate < now) {
        status = 'Completed'
      }
    }

    return {
      id: r.id,
      status,
      date: String(r.fields[APPT_DATE_FIELD] ?? new Date().toISOString()),
      address: String(r.fields[APPT_ADDRESS_FIELD] ?? ''),
      contact: { 
        id: Array.isArray(r.fields['contact_id']) 
          ? (r.fields['contact_id'] as string[])[0]
          : r.fields['contact_id'] as string,
        name: Array.isArray(r.fields[APPT_CONTACT_NAME_FIELD]) 
          ? (r.fields[APPT_CONTACT_NAME_FIELD] as string[])[0] || ''
          : String(r.fields[APPT_CONTACT_NAME_FIELD] ?? ''),
        email: Array.isArray(r.fields['contact_email']) 
          ? (r.fields['contact_email'] as string[])[0]
          : r.fields['contact_email'] as string,
        phone: String(r.fields['contact_phone'] || '')
      },
      agents: Array.isArray(r.fields['agent_id'])
        ? (r.fields['agent_id'] as string[]).map((agentId, i) => {
            const agentName = Array.isArray(r.fields[APPT_AGENT_NAMES_FIELD])
              ? (r.fields[APPT_AGENT_NAMES_FIELD] as string[])[i] || 'Unknown Agent'
              : 'Unknown Agent'
            return { 
              id: agentId, 
              name: agentName
            }
          })
        : [],
    }
  })

  // Apply frontend filtering
  let filteredItems = items

  // Filter by status
  if (params.status && params.status !== 'All Statuses') {
    filteredItems = filteredItems.filter(item => item.status === params.status)
  }

  // Filter by agent names
  if (params.agentNames && params.agentNames.length > 0) {
    filteredItems = filteredItems.filter(item => 
      item.agents.some(agent => 
        params.agentNames!.some(filterName => 
          agent.name.toLowerCase().includes(filterName.toLowerCase())
        )
      )
    )
  }

  // Filter by search query (address, contact name, email, phone - case insensitive)
  if (params.query && params.query.trim()) {
    const query = params.query.toLowerCase().trim()
    filteredItems = filteredItems.filter(item => 
      item.address.toLowerCase().includes(query) ||
      item.contact.name.toLowerCase().includes(query) ||
      (item.contact.email && item.contact.email.toLowerCase().includes(query)) ||
      (item.contact.phone && item.contact.phone.toLowerCase().includes(query))
    )
  }

  // Filter by date range
  if (params.from || params.to) {
    filteredItems = filteredItems.filter(item => {
      const itemDate = new Date(item.date)
      let inRange = true
      
      if (params.from) {
        const fromDate = new Date(params.from)
        if (itemDate < fromDate) inRange = false
      }
      
      if (params.to) {
        const toDate = new Date(params.to)
        if (itemDate > toDate) inRange = false
      }
      
      return inRange
    })
  }

  // Sort by date (newest to oldest by default)
  filteredItems.sort((a, b) => {
    const dateA = new Date(a.date)
    const dateB = new Date(b.date)
    return params.sortDirection === 'asc' ? 
      dateA.getTime() - dateB.getTime() : 
      dateB.getTime() - dateA.getTime()
  })

  // If no page parameter, return all data without pagination
  if (params.page === undefined) {
    return { 
      items: filteredItems, 
      totalItems: filteredItems.length,
      totalPages: 1,
      currentPage: 1,
      pageSize: filteredItems.length,
      hasNextPage: false,
      hasPrevPage: false,
      totalFetched: allRecords.length 
    }
  }

  // Apply pagination (10 items per page as per requirements)
  const pageSize = 10
  const currentPage = params.page || 1
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedItems = filteredItems.slice(startIndex, endIndex)

  // Calculate pagination info
  const totalItems = filteredItems.length
  const totalPages = Math.ceil(totalItems / pageSize)
  const hasNextPage = currentPage < totalPages
  const hasPrevPage = currentPage > 1

  return { 
    items: paginatedItems, 
    totalItems,
    totalPages,
    currentPage,
    pageSize,
    hasNextPage,
    hasPrevPage,
    totalFetched: allRecords.length 
  }
}

export async function createAppointment(payload: AppointmentPayload) {
  const baseId = import.meta.env.VITE_AIRTABLE_BASE_ID
  if (!baseId) {
    // Development fallback - just return mock data
    const id = 'tmp_' + Math.random().toString(36).slice(2)
    return { id, ...payload }
  }

  try {
    // Map payload to Airtable field names
    const fields: Record<string, any> = {
      [APPT_ADDRESS_FIELD]: payload.address,
      [APPT_DATE_FIELD]: payload.datetime,
    }

    // Set status field based on payload status
    if (payload.status === 'Cancelled') {
      fields[APPT_STATUS_FIELD] = true
    } else {
      fields[APPT_STATUS_FIELD] = false
    }

    // Add contact field - must be array of record IDs
    if (payload.contactId) {
      fields['contact_id'] = [payload.contactId] // Array format required by Airtable
    }

    // Add agent field - must be array of record IDs  
    if (payload.agentIds && payload.agentIds.length > 0) {
      fields['agent_id'] = payload.agentIds // Already an array
    }
    const { airtableCreate } = await import('./airtable')
    const result = await airtableCreate(APPOINTMENTS_TABLE, fields)
    
    return {
      id: result.id,
      ...payload
    }
  } catch (error) {
    console.error('Failed to create appointment:', error)
    throw error
  }
}

export async function updateAppointment(id: string, patch: Partial<AppointmentPayload>) {
  const baseId = import.meta.env.VITE_AIRTABLE_BASE_ID
  if (!baseId) {
    return { id, ...patch }
  }

  try {
    // Map patch to Airtable field names
    const fields: Record<string, any> = {}

    if (patch.address !== undefined) {
      fields[APPT_ADDRESS_FIELD] = patch.address
    }

    if (patch.datetime !== undefined) {
      fields[APPT_DATE_FIELD] = patch.datetime
    }

    if (patch.status !== undefined) {
      fields[APPT_STATUS_FIELD] = patch.status === 'Cancelled'
    }

    if (patch.contactId !== undefined) {
      fields['contact_id'] = [patch.contactId] // Array format required by Airtable
    }

    if (patch.agentIds !== undefined) {
      fields['agent_id'] = patch.agentIds // Already an array
    }

    const { airtableUpdate } = await import('./airtable')
    const result = await airtableUpdate(APPOINTMENTS_TABLE, id, fields)
    
    return {
      id: result.id,
      ...patch
    }
  } catch (error) {
    console.error('Failed to update appointment:', error)
    throw error
  }
}
