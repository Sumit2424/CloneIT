# CloneIT

A comprehensive web application that allows users to clone, analyze, and adapt websites. The project consists of four main components: Backend, Frontend, BrowserExtension, and SnapClone.

## Table of Contents
- [Overview](#overview)
- [Project Structure](#project-structure)
- [Backend](#backend)
- [Frontend](#frontend)
- [Browser Extension](#browser-extension)
- [SnapClone](#snapclone)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Features](#features)

## Overview
CloneIT is an advanced solution for web developers, designers, and content creators that enables you to:

Capture and clone websites using a custom Chrome extension

Analyze UI/UX design and structure with ScreenPipe and Terminator

Clean captured data for optimized usability

Adapt and enhance web components using Groq-based AI prompt analysis

Manage captured websites through an intuitive dashboard

Export, reuse, and adapt website components easily

## Project Structure

The project is structured into four main components, each serving a specific purpose:

```
CloneIT/
├── Backend/               # Server-side implementation
├── Frontend/              # React-based user interface
├── BrowserExtension/      # Chrome extension for capturing websites
└── SnapClone/             # Additional component for snapshot capabilities
```

## Backend

The Backend component provides the server-side functionality, handling data storage, processing, and API endpoints.

### Key Features:
- **MongoDB Integration**: Stores user data, projects, and captured website information
- **Express.js Server**: RESTful API endpoints for frontend communication
- **AI Processing**: Processes and analyzes captured HTML content using AI models
- **Session Management**: Tracks user sessions and capture sequences
- **File Storage**: Manages file uploads with GridFS for larger files
- **Authentication**: Secure user authentication and authorization

### Main Components:
- **server.js**: Core server implementation with Express
- **routes/**: API endpoint definitions including history routes
- **Database/**: MongoDB connection and schema models
- **ai-processor/**: AI processing utilities for HTML content
- **gridUploader/**: Handles file uploads to MongoDB GridFS
- **firebase/**: Firebase integration for additional storage options

## Frontend

The Frontend is a modern React-based application providing an intuitive user interface for interacting with the system.

### Key Features:
- **Responsive Dashboard**: User-friendly interface for all functionality
- **Authentication**: Secure login and registration system
- **Project Management**: View, create, and manage website cloning projects
- **History Tracking**: Review past captures and projects
- **Component Library**: Browse and use saved web components
- **AI Adaptation**: Apply AI modifications to captured content

### Main Components:
- **src/pages/**: Main application pages including Dashboard, History, and more
- **src/components/**: Reusable UI components
- **src/context/**: React context providers for state management
- **Tailwind CSS**: Styling framework for consistent and responsive design

## Browser Extension

The BrowserExtension is a Chrome extension that allows users to capture and analyze websites directly from their browser.

### Key Features:
- **Website Capture**: Screenshot and HTML capture of websites
- **Element Selection**: Select specific elements on a page
- **Integration**: Direct connection to the CloneIT backend
- **Real-time Processing**: Process captured content immediately

### Main Components:
- **manifest.json**: Extension configuration
- **popup.html/js/css**: Extension popup interface
- **content.js**: Content script for website interaction
- **background.js**: Background processes and event handling
- **html2canvas.min.js**: Library for capturing website screenshots

## SnapClone

SnapClone provides additional functionality for creating and managing website snapshots with specialized features.

### Key Features:
- **Snapshot Management**: Create and organize website snapshots
- **Backend Integration**: Specialized backend for snapshot processing
- **Frontend Interface**: Dedicated interface for snapshot viewing

### Main Components:
- **frontend/**: User interface specific to SnapClone
- **be/**: Backend implementation for SnapClone

## Getting Started

### Prerequisites
- Node.js (v14+ recommended)
- MongoDB
- Chrome browser (for extension)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Sumit2424/CloneIT.git
   cd CloneIT
   ```

2. **Set up Backend**:
   ```bash
   cd Backend
   npm install
   # Create a .env file with your MongoDB connection string and other configs
   npm start
   ```

3. **Set up Frontend**:
   ```bash
   cd Frontend
   npm install
   npm run dev
   ```

4. **Install Browser Extension**:
   - Open Chrome browser
   - Go to chrome://extensions/
   - Enable Developer mode
   - Click "Load unpacked"
   - Select the BrowserExtension folder

5. **Set up SnapClone** (optional):
   ```bash
   cd SnapClone/be
   npm install
   npm start
   
   cd ../frontend
   npm install
   npm start
   ```

## Usage

1. **Capture a Website**:
   - Click on the CloneIT extension icon in Chrome
   - Use the interface to capture full pages or specific elements
   - Save the capture to your CloneIT account

2. **Manage Projects**:
   - Log in to the CloneIT dashboard
   - View your captured websites in the "History" section
   - Organize captures into projects

3. **Process and Adapt**:
   - Use the AI adaptation tools to modify captured content
   - Export components for use in your projects

4. **View History**:
   - Access your capture history and project details
   - Filter and sort by date, type, or status

## Features

- **Secure Authentication**: User account management with Firebase authentication
- **Real-time Updates**: Instant feedback on capture and processing status
- **Responsive Design**: Works on desktop and mobile devices
- **AI Processing**: Intelligent analysis and adaptation of web content
- **Comprehensive History**: Detailed record of all captures and projects
- **Component Library**: Reusable web components from captures
- **Export Options**: Multiple formats for exporting captured content

---

For more information, please refer to the individual README files in each component directory.