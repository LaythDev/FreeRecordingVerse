# Overview

Free Recording Verse is a professional browser-based screen recording application that provides users with the ability to capture screen content, webcam video, and audio recordings directly in their browser without requiring any downloads, installations, or user accounts. The application features a luxurious white UI design and offers professional-grade recording capabilities with multiple export formats and quality settings.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The application uses a modern React-based frontend architecture built with Vite for fast development and optimized builds. The frontend is structured as a single-page application (SPA) using React 18 with TypeScript for type safety. The UI is built using shadcn/ui components combined with Radix UI primitives for accessible, customizable interface elements.

The styling system leverages Tailwind CSS with custom CSS variables for theming, providing a professional white-themed design with customizable color schemes. The application uses a component-based architecture with reusable UI components organized in a clear directory structure.

## Backend Architecture
The backend is implemented using Express.js with TypeScript, following a minimalist approach since the application is primarily client-side focused. The server serves as a static file server and provides basic API endpoints for health checks. The backend uses ES modules and is configured for production deployment with esbuild bundling.

## State Management
The application uses React's built-in state management through hooks (useState, useRef, useEffect) combined with custom hooks for complex recording logic. TanStack Query is integrated for server state management, though the application primarily operates client-side. The recording state is managed through custom hooks that encapsulate media recording logic and browser API interactions.

## Media Recording Architecture
The core recording functionality leverages the browser's native MediaRecorder API and WebRTC APIs for capturing screen, camera, and audio content. The application implements multiple recording modes (screen, camera, audio) with customizable settings for quality, frame rate, and audio inclusion. Video processing and format conversion are handled client-side using FFmpeg.wasm for advanced video manipulation capabilities.

## Database Design
The application includes Drizzle ORM configuration with PostgreSQL schema definitions for user management, though the current implementation focuses on client-side functionality without requiring user accounts. The database schema includes basic user tables with username/password fields, prepared for future authentication features if needed.

## Build and Deployment Strategy
The project is configured for multiple deployment scenarios: full-stack deployment with both frontend and backend, or frontend-only static deployment. Vercel configuration files support both approaches, with the frontend-only option serving the React application as static files. The build process separates client and server builds, allowing for flexible deployment options.

# External Dependencies

## UI and Styling Dependencies
- **Tailwind CSS**: Utility-first CSS framework for styling and responsive design
- **shadcn/ui**: Pre-built, customizable UI component library
- **Radix UI**: Low-level UI primitives for building accessible interfaces
- **Lucide React**: Icon library providing consistent iconography
- **class-variance-authority**: Utility for creating component variants
- **clsx**: Conditional className utility

## Media Processing Dependencies
- **@ffmpeg/ffmpeg**: WebAssembly-based FFmpeg for client-side video processing
- **@ffmpeg/util**: Utilities for FFmpeg operations
- **Browser MediaRecorder API**: Native browser API for media recording
- **WebRTC APIs**: For camera and microphone access

## State and Data Management
- **TanStack React Query**: Server state management and caching
- **React Hook Form**: Form state management and validation
- **@hookform/resolvers**: Form validation resolvers
- **Drizzle ORM**: Type-safe SQL database toolkit
- **@neondatabase/serverless**: Serverless PostgreSQL database driver

## Development and Build Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Static type checking
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Autoprefixer
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Development tooling for Replit environment

## Framework and Runtime
- **React 18**: Frontend framework with modern features
- **Express.js**: Minimal backend web framework
- **Node.js**: JavaScript runtime environment
- **Wouter**: Lightweight client-side routing library

## Additional Utilities
- **date-fns**: Date manipulation and formatting
- **nanoid**: Unique ID generation
- **cmdk**: Command palette component for enhanced UX