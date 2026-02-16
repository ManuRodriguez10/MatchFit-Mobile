# MatchFit Mobile

A React Native application built with Expo for team management and events.

## Tech Stack

- **Expo** (~52.0.0) - React Native framework
- **Expo Router** (v4) - File-based navigation
- **TypeScript** - Type safety
- **NativeWind** (v4) - TailwindCSS for React Native
- **Supabase** - Backend, database, and authentication
- **Expo Secure Store** - Secure session persistence

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Expo CLI**: `npm install -g expo-cli`
- **iOS Simulator** (Mac only) or **Android Studio** (for Android emulator)
- **Expo Go app** (for physical device testing)

## Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd MatchFit-Mobile
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

#### Create a Supabase project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the database to be provisioned

#### Set up the database schema

**Option 1: Using Migration Files (Recommended)**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open and copy the contents of `supabase/migrations/20250217000000_initial_schema.sql`
4. Paste and run the SQL in the SQL Editor
5. Open and copy the contents of `supabase/migrations/20250217000001_rls_policies.sql`
6. Paste and run the SQL in the SQL Editor

**Option 2: Using Supabase CLI**

If you have the Supabase CLI installed:

```bash
# Link your project (first time only)
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

See `supabase/migrations/README.md` for more details on migrations.

### 4. Configure environment variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Get your Supabase credentials from: `https://supabase.com/dashboard/project/_/settings/api`

3. Update `.env` with your actual values:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

⚠️ **Important**: Never commit the `.env` file to version control!

## Running the App

### Start the development server

```bash
npx expo start
```

### Run on different platforms

- **iOS Simulator**: Press `i` in the terminal or run `npm run ios`
- **Android Emulator**: Press `a` in the terminal or run `npm run android`
- **Web Browser**: Press `w` in the terminal or run `npm run web`
- **Physical Device**: Scan the QR code with Expo Go app

## Project Structure

```
MatchFit-Mobile/
├── app/
│   ├── (auth)/              # Authentication screens
│   │   ├── _layout.tsx      # Auth stack navigator
│   │   ├── login.tsx        # Login screen
│   │   └── signup.tsx       # Sign up screen
│   ├── (tabs)/              # Main tab navigation
│   │   ├── _layout.tsx      # Tabs navigator
│   │   ├── index.tsx        # Home screen
│   │   ├── team.tsx         # Team screen
│   │   ├── events.tsx       # Events screen
│   │   └── profile.tsx      # Profile screen
│   └── _layout.tsx          # Root layout with AuthProvider
├── components/              # Reusable components
│   └── LoadingScreen.tsx    # Loading spinner component
├── contexts/                # React contexts
│   └── AuthContext.tsx      # Authentication context & hooks
├── lib/                     # Utilities and configurations
│   └── supabase.ts          # Supabase client configuration
├── types/                   # TypeScript type definitions
│   └── database.ts          # Supabase database types
├── constants/               # App constants
├── assets/                  # Images, fonts, etc.
├── .env                     # Environment variables (not committed)
├── .env.example             # Environment variables template
├── app.json                 # Expo configuration
├── tailwind.config.js       # TailwindCSS configuration
└── tsconfig.json            # TypeScript configuration
```

## Authentication Flow

The app uses Supabase Auth with the following flow:

1. **App Launch** → Loading screen checks auth state
2. **Not Authenticated** → Redirects to `/login`
3. **Sign In/Sign Up** → Creates session with Supabase
4. **Authenticated** → Redirects to main tabs
5. **Sign Out** → Clears session and redirects to `/login`

### Using the Auth Context

```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, profile, signIn, signUp, signOut, loading } = useAuth();

  // Sign in
  await signIn('email@example.com', 'password');

  // Sign up
  await signUp('email@example.com', 'password', 'John Doe', 'athlete');

  // Sign out
  await signOut();
}
```

## Available Scripts

- `npm start` - Start Expo dev server
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator
- `npm run web` - Run in web browser

## Development Guidelines

### Styling

- Use NativeWind (TailwindCSS) for styling
- Example: `<View className="flex-1 items-center justify-center">`

### Navigation

- File-based routing with Expo Router
- Use `router.push()`, `router.replace()`, or `Link` component
- Protected routes handled automatically by `_layout.tsx`

### Type Safety

- Always define types in `types/` directory
- Use TypeScript interfaces for props
- Leverage Supabase generated types for database operations

## Troubleshooting

### "Database error saving new user" during signup

This error typically means the database migrations haven't been applied. To fix:

1. **Quick Verification (Recommended):**
   - Go to your Supabase dashboard → SQL Editor
   - Copy and run the contents of `supabase/migrations/verify_setup.sql`
   - This will show you exactly what's missing

2. **Apply migrations:**
   - Copy the contents of `supabase/migrations/20250217000000_initial_schema.sql`
   - Paste and run in Supabase SQL Editor
   - Copy the contents of `supabase/migrations/20250217000001_rls_policies.sql`
   - Paste and run in Supabase SQL Editor

3. **Verify again:**
   - Re-run `verify_setup.sql` to confirm everything is set up correctly
   - All checks should show ✅

4. **Common Issues:**
   - **Trigger missing**: Re-run `initial_schema.sql` - the trigger is created at the end
   - **RLS blocking**: Ensure `profiles_insert_own` policy exists (from RLS migration)
   - **Function error**: Check Supabase logs for detailed error messages

### Port already in use
```bash
# Kill the process using port 8081
lsof -ti:8081 | xargs kill -9
```

### Metro bundler cache issues
```bash
npx expo start -c
```

### iOS Simulator not opening
```bash
# Install Xcode command line tools
xcode-select --install
```

### Dependencies issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT