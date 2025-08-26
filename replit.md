# Overview

TrashTalk Anthems is a fantasy football song generator application that creates custom trash talk songs based on team rosters and user preferences. The application uses advanced AI vision analysis for roster screenshot processing and provides an email-based song delivery system.

The project is built as a full-stack web application with a React frontend and Express backend, featuring a 4-step wizard interface: screenshot upload & analysis, roster review, style selection, and email submission. Songs are delivered within 24 hours via email, eliminating the need for real-time generation complexity.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development tooling
- **UI Library**: shadcn/ui components built on Radix UI primitives for accessible, customizable components
- **Styling**: TailwindCSS with custom CSS variables for theming and responsive design
- **State Management**: Zustand for global application state with devtools integration
- **Routing**: Wouter for lightweight client-side routing
- **Data Fetching**: TanStack Query for server state management and caching

## Backend Architecture
- **Framework**: Express.js with TypeScript for type-safe server development
- **Database ORM**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Job Queue**: BullMQ with Redis for background song generation processing
- **File Storage**: Supabase Storage for audio file management with signed URLs
- **API Design**: RESTful endpoints with comprehensive error handling and validation

## Database Design
- **Users Table**: Basic user information with username and email
- **Jobs Table**: Comprehensive job tracking with status, input parameters, and generated content
- **Purchases Table**: Payment tracking linked to jobs and users via Stripe sessions
- **Schema Validation**: Zod schemas for runtime type checking and API validation

## Authentication & Authorization
- **Guest Sessions**: Client ID-based sessions for anonymous users
- **User Management**: Optional user accounts through the users table
- **Payment Authorization**: Stripe-based payment verification for full song access

## File Processing Pipeline
- **AI Vision Analysis**: OpenAI GPT-4o vision capabilities for accurate fantasy football screenshot parsing
  - Dynamic roster detection that adapts to ANY lineup format (no forced standard positions)
  - Single screenshot analysis extracting team names and complete rosters for both teams
  - Comprehensive 474-player NFL database for validation and error correction
  - Fuzzy matching with position-aware validation for maximum accuracy
  - Supports all lineup formats: QB/RB/RB/WR/WR/WR/TE/WRT/WRT, traditional formats, SuperFlex, etc.
  - Filters out unavailable positions (K, DEF) when not present in screenshots
- **Audio Generation**: Suno AI integration for custom song creation
- **Audio Processing**: FFmpeg for creating 15-second preview clips with fade effects
- **Storage Management**: Supabase for secure file storage with time-limited access URLs

## Email Submission System
- **4-Step Wizard**: Upload → Analyze → Style → Email submission
- **Request Processing**: Backend endpoint for song request submissions with validation
- **Email Delivery**: 24-hour delivery promise for custom anthems
- **User Experience**: Clear confirmation screens and progress tracking

# External Dependencies

## Core Services
- **Neon Database**: PostgreSQL hosting with connection pooling
- **Upstash Redis**: Managed Redis for job queue and caching
- **Supabase**: Backend-as-a-Service for file storage and additional services
- **Stripe**: Payment processing with checkout sessions and webhook handling
- **Suno AI**: Music generation API for custom song creation

## Development Tools
- **Vite**: Build tool and development server with HMR
- **Drizzle Kit**: Database migration and schema management
- **ESBuild**: Production bundling for server code
- **TypeScript**: Type checking and compilation

## UI & Styling
- **Radix UI**: Headless component primitives for accessibility
- **TailwindCSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography
- **Framer Motion**: Animation library for enhanced user experience

## Media Processing
- **Tesseract.js**: OCR library for roster image text extraction
- **FFmpeg**: Audio processing for preview generation
- **Google Cloud Storage**: Alternative file storage option
- **Web Audio API**: Client-side audio visualization and playback

## Monitoring & Analytics
- **Replit Integration**: Development environment optimizations
- **Error Tracking**: Built-in error handling and logging
- **Performance Monitoring**: Query client configuration for optimal data fetching