# Appointments App

A modern web application for managing appointments, contacts, and agents built with Vue 3, TypeScript, and Vite. The app integrates with Airtable as a backend database to provide a seamless appointment scheduling experience.

## Features

- **Appointment Management**: Create, edit, and view appointments
- **Contact Integration**: Link appointments to contacts with detailed information
- **Agent Assignment**: Assign multiple agents to appointments
- **Filtering & Search**: Filter appointments by status, agent, date range, and search terms
- **Status Tracking**: Track appointment statuses (Upcoming, Completed, Cancelled)
- **Responsive Design**: Modern UI that works on desktop and mobile devices

## Tech Stack

- **Frontend**: Vue 3 with Composition API and `<script setup>`
- **Type Safety**: TypeScript
- **Build Tool**: Vite
- **Routing**: Vue Router
- **HTTP Client**: Axios
- **Backend**: Airtable (as database)

## Setup

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager
- Airtable account (for backend integration)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd appointments-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory and add your Airtable configuration:
```env
VITE_AIRTABLE_BASE_ID=your_airtable_base_id
VITE_AIRTABLE_API_KEY=your_airtable_api_key
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

## License

This project is private and not licensed for public use.
