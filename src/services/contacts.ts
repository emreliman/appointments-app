import { airtableList, buildFilterByFormula, contains } from './airtable'

export interface Contact {
  id: string
  name: string
  email?: string
  phone?: string
}

const CONTACTS_TABLE = 'Contacts'
const CONTACT_NAME_FIELD = 'contact_name'
const CONTACT_EMAIL_FIELD = 'contact_email'
const CONTACT_PHONE_FIELD = 'contact_phone'

export async function listContacts(query = ''): Promise<Contact[]> {
  const filter = query
    ? buildFilterByFormula([
        contains(CONTACT_NAME_FIELD, query),
        contains(CONTACT_EMAIL_FIELD, query),
        contains(CONTACT_PHONE_FIELD, query),
      ])
    : undefined
  const params: any = { pageSize: 50 }
  if (filter) params.filterByFormula = `OR(${contains(CONTACT_NAME_FIELD, query)},${contains(CONTACT_EMAIL_FIELD, query)},${contains(CONTACT_PHONE_FIELD, query)})`
  
  const data = await airtableList(CONTACTS_TABLE, params)
  return data.records.map(r => {
    // Combine contact_name and contact_surname if they exist
    const firstName = String(r.fields[CONTACT_NAME_FIELD] ?? '')
    const lastName = String(r.fields['contact_surname'] ?? '')
    const fullName = [firstName, lastName].filter(Boolean).join(' ')
    
    return {
      id: r.id,
      name: fullName || firstName || 'Unnamed Contact',
      email: r.fields[CONTACT_EMAIL_FIELD] as string | undefined,
      phone: String(r.fields[CONTACT_PHONE_FIELD] || ''),
    }
  })
}
