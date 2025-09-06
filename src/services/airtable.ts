import api from './api'

export function getBaseId() {
  const baseId = import.meta.env.VITE_AIRTABLE_BASE_ID as string | undefined
  if (!baseId) {
    console.warn('VITE_AIRTABLE_BASE_ID not set; Airtable requests will be skipped.')
  }
  return baseId
}

export async function airtableList(table: string, params: Record<string, any> = {}) {
  const baseId = getBaseId()
  if (!baseId) return { records: [] as any[], offset: undefined as string | undefined }
  try {
    const { data } = await api.get<{ records: Array<{ id: string; fields: any }>; offset?: string }>(`/${baseId}/${encodeURIComponent(table)}`, { params })
    return data
  } catch (e: any) {
    const msg = e?.response?.data?.error?.message || e?.message || String(e)
    console.error('Airtable error:', msg)
    throw new Error(msg)
  }
}

export async function airtableCreate(table: string, fields: Record<string, any>) {
  const baseId = getBaseId()
  if (!baseId) throw new Error('Airtable base ID not configured')
  
  try {
    const { data } = await api.post<{ id: string; fields: any }>(`/${baseId}/${encodeURIComponent(table)}`, {
      fields
    })
    return data
  } catch (e: any) {
    const msg = e?.response?.data?.error?.message || e?.message || String(e)
    console.error('Airtable create error:', msg)
    throw new Error(msg)
  }
}

export async function airtableUpdate(table: string, recordId: string, fields: Record<string, any>) {
  const baseId = getBaseId()
  if (!baseId) throw new Error('Airtable base ID not configured')
  
  try {
    // Airtable PATCH endpoint expects a records array format
    const { data } = await api.patch<{ records: Array<{ id: string; fields: any }> }>(`/${baseId}/${encodeURIComponent(table)}`, {
      records: [
        {
          id: recordId,
          fields
        }
      ]
    })
    
    // Return the first (and only) record from the response
    return data.records[0]
  } catch (e: any) {
    const msg = e?.response?.data?.error?.message || e?.message || String(e)
    console.error('Airtable update error:', msg)
    throw new Error(msg)
  }
}

export function buildFilterByFormula(clauses: string[]) {
  const f = clauses.filter(Boolean)
  if (!f.length) return undefined
  return `AND(${f.join(',')})`
}

export function contains(field: string, text: string) {
  // Use FIND for case-insensitive search, returns position > 0 if found
  return `FIND(UPPER("${escapeFormula(text)}"), UPPER({${field}}))`
}

export function equals(field: string, value: string | boolean) {
  if (typeof value === 'boolean') {
    return `({${field}} = ${value ? 'TRUE()' : 'FALSE()'})`
  }
  return `({${field}} = "${escapeFormula(value)}")`
}

export function dateBetween(field: string, from?: string, to?: string) {
  const parts: string[] = []
  if (from) parts.push(`IS_AFTER({${field}}, DATETIME_PARSE("${escapeFormula(from)}"))`)
  if (to) parts.push(`IS_BEFORE({${field}}, DATETIME_PARSE("${escapeFormula(to)}"))`)
  if (!parts.length) return ''
  return parts.length === 1 ? parts[0] : `AND(${parts.join(',')})`
}

function escapeFormula(v: string) {
  return v.replace(/"/g, '\\"')
}
