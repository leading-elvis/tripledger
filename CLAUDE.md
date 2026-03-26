# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TripLedger is a cross-platform group expense splitting system for travel scenarios. It supports social login (Apple, LINE, Google) and is designed for future integration with LINE and Discord bots.

- **Currency**: Supports 20 currencies (TWD default), with automatic exchange rate conversion
- **Language**: Traditional Chinese (繁體中文) for UI text and comments
- **Bundle ID**: `com.leadinginstr.tripledger`

## Tech Stack

- **Backend**: NestJS + TypeScript + Prisma ORM + PostgreSQL
- **Frontend**: Flutter + Riverpod state management
- **Containerization**: Docker

## Development Commands

### Backend (apps/api)

```bash
# From root directory
npm run api:dev        # Start dev server with hot reload
npm run api:build      # Build for production
npm run api:test       # Run tests

# Database commands
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run migrations
npm run db:studio      # Open Prisma Studio

# From apps/api directory
npm run lint           # Run ESLint with auto-fix
npm run test:watch     # Watch mode
npm run test:cov       # Coverage report
npm run test:e2e       # E2E tests
```

### Frontend (apps/mobile)

```bash
cd apps/mobile
flutter pub get                    # Install dependencies
flutter run                        # Run app
flutter build apk                  # Build Android APK
flutter build ios --no-codesign    # Build iOS (without signing)
flutter build ipa --release        # Build IPA for App Store
dart run build_runner build        # Generate code (Riverpod, Freezed, JSON)
dart run build_runner watch        # Watch mode for code generation
```

### Docker (infrastructure/docker)

```bash
docker-compose up -d               # Start PostgreSQL and Redis
docker-compose --profile dev up -d # Include pgAdmin
docker-compose down                # Stop containers
```

## Architecture

### Backend Module Structure

```
apps/api/src/
├── common/
│   ├── decorators/    # @CurrentUser decorator
│   ├── dto/           # PaginationDto, common DTOs
│   ├── guards/        # JwtAuthGuard
│   ├── prisma/        # PrismaService, PrismaModule
│   └── s3/            # S3Service for file uploads
└── modules/
    ├── auth/          # JWT authentication, Apple/LINE/Google OAuth, FCM tokens
    ├── users/         # User profile management, account deletion
    ├── trips/         # Trip CRUD, invite codes, member management
    ├── bills/         # Bill creation with split types
    ├── settlement/    # Balance calculation, optimized repayment paths
    ├── notifications/ # Push notifications (FCM)
    ├── einvoice/      # Taiwan e-invoice QR code parsing
    └── exchange-rate/ # Currency exchange rates
```

### API Response Patterns

**Paginated Lists**: Bills and notifications use paginated responses:
```json
{
  "data": [...],
  "pagination": { "total": 100, "limit": 20, "offset": 0, "hasMore": true }
}
```

### Frontend Architecture

```
apps/mobile/lib/
├── core/
│   ├── config/        # Theme, Router, API config, social_login_config
│   ├── network/       # ApiClient (Dio), ApiException
│   ├── services/      # FCM, AdMob services
│   ├── storage/       # Secure storage for auth tokens
│   └── utils/         # CurrencyUtils (20 currencies)
├── features/          # Feature-based organization
│   ├── auth/          # Login with Apple/LINE/Google
│   ├── trips/         # Trip list, detail, member management, stats
│   ├── bills/         # Add/edit/detail bill pages
│   ├── settlement/    # Settlement calculation and confirmation
│   ├── notifications/ # Push notifications
│   ├── einvoice/      # Taiwan e-invoice QR scanner
│   ├── purchase/      # In-app purchases (remove ads)
│   └── settings/      # User settings, theme toggle, account deletion
└── shared/
    ├── models/        # Data models (Freezed)
    ├── widgets/       # Reusable widgets (AnimatedWidgets, SkeletonLoading)
    └── utils/         # ErrorHandler, Validators
```

### Key Patterns

**State Management (Riverpod)**:
- Repositories use `Provider` for singleton instances
- Theme uses `StateNotifierProvider` for reactive updates
- API client automatically injects auth tokens via interceptors

**Error Handling**:
- `ApiException` wraps Dio errors with user-friendly messages
- `ErrorHandler` provides consistent SnackBar display methods
- `Validators` class for form validation (BillValidators, TripValidators)

**UI Patterns**:
- `AppTheme` contains all colors, gradients, and design tokens
- `flutter_animate` for entrance animations
- Skeleton loading for better perceived performance
- Dark mode support via `ThemeModeProvider`

### Key Domain Concepts

- **Trip**: A travel group with members, bills, and settlements
- **Bill**: An expense with a payer and split shares among members
- **BillShare**: How much each member owes for a bill
- **Settlement**: Payment record between two users (PENDING → CONFIRMED/CANCELLED)
- **Optimized Settlement**: Greedy algorithm minimizes number of transactions

### Database Enums (Prisma)

Enums are defined in `apps/api/prisma/schema.prisma` and imported from `@prisma/client`:

```typescript
import { MemberRole, BillCategory, SplitType, SettlementStatus } from '@prisma/client';
```

- `MemberRole`: OWNER, ADMIN, MEMBER
- `BillCategory`: FOOD, TRANSPORT, ACCOMMODATION, ATTRACTION, SHOPPING, OTHER
- `SplitType`: EQUAL, EXACT, PERCENTAGE, SHARES
- `SettlementStatus`: PENDING, CONFIRMED, CANCELLED
- `Currency`: TWD, USD, JPY, EUR, KRW, CNY, HKD, SGD, etc. (20 total)

**Important**: Run `npx prisma generate` after schema changes to update the client.

### API Documentation

Swagger docs available at `http://localhost:3000/docs` when API is running.

## Environment Setup

Run `scripts/setup.bat` (Windows) to:
1. Check Node.js and Docker installation
2. Start PostgreSQL via Docker
3. Install npm dependencies
4. Run Prisma migrations

Required environment variables in `apps/api/.env`:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT tokens
- `JWT_EXPIRES_IN`: Token expiration (e.g., "7d")

## Social Login Configuration

Social login requires native platform setup:

**Apple Sign-In** (iOS only):
- Requires Sign in with Apple capability in Xcode
- App ID must have Sign in with Apple enabled in Apple Developer Console
- Entitlement file: `ios/Runner/Runner.entitlements`
- Uses `sign_in_with_apple` Flutter package

**Google Sign-In**:
- Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- Android: Create Android OAuth client with SHA-1 fingerprint and package name `com.leadinginstr.tripledger`
- iOS: Create iOS OAuth client, update `Info.plist` with reversed client ID as URL scheme
- Enable **People API** in Google Cloud Console

**LINE Login** (Channel ID: `2008996178`):
- URL Scheme: `line3rdp.com.leadinginstr.tripledger` (both iOS and Android)
- Channel ID hardcoded in `core/config/social_login_config.dart`

**Key Files**:
- `lib/core/config/social_login_config.dart` - LINE Channel ID, Google config
- `lib/features/auth/data/auth_repository.dart` - OAuth login logic
- `android/app/src/main/AndroidManifest.xml` - Android URL schemes
- `ios/Runner/Info.plist` - iOS URL schemes, GIDClientID

## Account Deletion

Account deletion uses data anonymization (SetNull strategy):
- User record is deleted
- Financial records (Bills, BillShares, Settlements) keep `userId` as NULL
- Other trip members can still view expenses with "已刪除用戶" placeholder
- Endpoint: `DELETE /users/me`
- Frontend: Settings → 資料管理 → 刪除帳號 (with two-step confirmation)

## Production Deployment

### Google Cloud Run

**API URL**: `https://tripledger-api-297896850903.asia-east1.run.app`

```bash
# Deploy API to Cloud Run (from root directory)
gcloud builds submit --config cloudbuild.yaml
```

**Key Files**:
- `cloudbuild.yaml` - Cloud Build CI/CD configuration
- `apps/api/Dockerfile` - API container image (monorepo-aware)
- `.dockerignore` - Exclude files from Docker build

**Secrets (Secret Manager)**:
- `database-url` - Cloud SQL connection string
- `jwt-secret` - JWT signing key
- `jwt-refresh-secret` - Refresh token signing key

### Flutter Environment Switching

```dart
// apps/mobile/lib/core/config/api_config.dart
static const bool forceProduction = true;  // Connect to Cloud Run
static const bool forceProduction = false; // Connect to localhost
```

### Google OAuth Client IDs

| Platform | Configuration Location |
|----------|----------------------|
| Android | Auto-verified via package name + SHA-1 |
| iOS | `ios/Runner/Info.plist` → `GIDClientID` |
| Web | `web/index.html` → `<meta name="google-signin-client_id">` |

## Flutter Code Conventions

**Navigation**: Uses `go_router` with named routes defined in `core/config/router.dart`
- Pattern: `/trips/:tripId/bill/:billId/edit`
- Use `context.go()` for navigation, `context.pop()` for back

**Repository Pattern**: Each feature has a data layer with repository
- Repositories use `ref.read(apiClientProvider)` for HTTP calls
- Return typed models from `shared/models/`

**Form Pages**: Follow consistent patterns
- Use `GlobalKey<FormState>` for validation
- Use `BillValidators` / `TripValidators` for field validation
- Show loading state with `_isSaving` flag
- Use `ErrorHandler.showSuccessSnackBar()` / `showErrorSnackBar()` for feedback

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.
