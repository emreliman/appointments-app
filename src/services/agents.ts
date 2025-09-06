import { airtableList } from './airtable'

export interface Agent {
  id: string
  name: string
  surname?: string
  fullName: string
  color?: string
  number?: number
}

const AGENTS_TABLE = 'Agents'
const AGENT_NAME_FIELD = 'agent_name'
const AGENT_SURNAME_FIELD = 'agent_surname'
const AGENT_COLOR_FIELD = 'color'
const AGENT_NUMBER_FIELD = 'number'

export async function listAgents(): Promise<Agent[]> {
  try { 
    const data = await airtableList(AGENTS_TABLE, { pageSize: 100 })
    
    if (!data.records || data.records.length === 0) {
      return []
    }
    
    const agents = data.records.map(r => {  
      const name = String(r.fields[AGENT_NAME_FIELD] || '').trim()
      const surname = String(r.fields[AGENT_SURNAME_FIELD] || '').trim()
      const fullName = `${name} ${surname}`.trim()
      const color = r.fields[AGENT_COLOR_FIELD] as string
      const number = r.fields[AGENT_NUMBER_FIELD] as number
      
      return { 
        id: r.id, 
        name,
        surname: surname || undefined,
        fullName,
        color: color || undefined,
        number: number || undefined
      }
    })
    return agents
  } catch (error) {
    console.error('Error in listAgents:', error)
    console.error('This might be because Agents table does not exist or field names are different')
    return []
  }
}
