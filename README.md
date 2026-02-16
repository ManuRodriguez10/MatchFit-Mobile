# MatchFit Mobile

A React Native application built with Expo for team management and events.

## Tech Stack

- **Expo** - React Native framework
- **Expo Router** - File-based navigation
- **TypeScript** - Type safety
- **NativeWind** - TailwindCSS for React Native
- **Supabase** - Backend and authentication

## Project Structure

```
app/
  (auth)/          # Authentication screens
  (tabs)/          # Main tab navigation screens
components/        # Reusable components
lib/              # Utilities and helpers
constants/        # App constants
types/            # TypeScript type definitions
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on specific platform:
```bash
npm run ios
npm run android
npm run web
```

## Development

- The app uses Expo Router for file-based navigation
- Styling is done with NativeWind (TailwindCSS)
- Authentication will be handled via Supabase