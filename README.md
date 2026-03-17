# CallDraft — AI Voice Agent for HVAC Businesses

A real-time voice agent prototype that allows users to have a live voice conversation with an AI receptionist named "Sarah" from Anderson Heating & Cooling.

## Features

✅ **Real-time Two-Way Voice Communication**
- User speaks → AI listens and responds naturally
- Live transcript showing both sides of the conversation
- Response latency indicator (in milliseconds)
- Call duration tracking

✅ **AI Agent Capabilities**
- Professional greeting and introduction
- Answers questions about services, hours, and pricing
- Collects customer information (name, phone, address)
- Describes HVAC issues and books appointments
- Natural, conversational responses

✅ **Tech Stack**
- **Framework**: Next.js 15+ (App Router) with TypeScript
- **Styling**: Tailwind CSS v4 + HeroUI component library
- **Voice API**: OpenAI Realtime API (speech-to-speech via WebSocket)
- **Audio**: Web Audio API + MediaRecorder
- **Deployment**: Vercel-ready

## Quick Start

### 1. Clone and Install

```bash
git clone <repo-url>
cd calldraft
npm install
```

### 2. Set Up API Key

Create `.env.local` in the project root:

```bash
cp .env.example .env.local
```

Then update `.env.local` with your OpenAI API key:

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
```

**Important**: You need OpenAI API access with the Realtime API preview enabled.
- Get your key: https://platform.openai.com/api-keys
- Ensure your account has Realtime API preview access

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

### Architecture

```
Browser (Frontend)
    ↓
    → /api/session (Next.js API Route)
        ↓
        → OpenAI API (creates ephemeral token)
            ↓
            ↓ token returned
            ↓
    ← WebSocket connected to OpenAI Realtime API
        ↓
    Two-way audio streaming + real-time transcription
```

### Call Flow

1. **User clicks "Start Call"**
   - Frontend requests ephemeral token from `/api/session`
   - Requests microphone permission (getUserMedia)

2. **WebSocket Connection**
   - Connects directly to OpenAI Realtime API
   - Sends system prompt, voice config, and transcription settings

3. **Real-time Communication**
   - User speaks → audio sent to OpenAI
   - OpenAI processes and responds
   - Transcript updated in real-time
   - Agent audio played through speakers

4. **Call Ends**
   - Summary shows transcript and performance metrics
   - Option to start new call

## Project Structure

```
calldraft/
├── src/
│   ├── lib/
│   │   ├── audioProcessor.ts      # Audio I/O (mic capture, speaker playback)
│   │   └── realtimeClient.ts      # WebSocket connection handler
│   ├── hooks/
│   │   ├── useAudio.ts            # Audio management hook
│   │   └── useCallSession.ts      # Complete call session hook
│   ├── components/
│   │   ├── CallIdleView.tsx       # Landing screen
│   │   ├── CallConnectingView.tsx # Loading state
│   │   ├── CallActiveView.tsx     # Live call UI
│   │   ├── CallEndedView.tsx      # Call summary
│   │   ├── TranscriptPanel.tsx    # Scrollable transcript
│   │   ├── TranscriptBubble.tsx   # Message bubbles
│   │   └── CallControls.tsx       # Mute, end, etc.
│   └── app/
│       ├── api/session/route.ts   # Ephemeral token endpoint
│       ├── page.tsx               # Main page (state management)
│       └── layout.tsx             # Root layout
├── public/
│   └── sarah.png                  # Robot avatar image
├── .env.example                   # Environment variable template
├── .env.local                     # Your actual API key (git-ignored)
└── package.json
```

## Key Components

### `useCallSession()` Hook

Main hook for managing the entire call experience:

```typescript
const {
  isConnecting,      // boolean: connection in progress
  isConnected,       // boolean: WebSocket connected
  transcript,        // TranscriptEntry[]: real-time conversation
  latency,           // number: response time in ms
  callDuration,      // string: MM:SS format
  error,             // string | null: error message
  startCall,         // async () => void: initiate call
  endCall,           // () => void: disconnect
  toggleMute,        // () => void: mute/unmute mic
  isMuted,           // boolean: current mute state
} = useCallSession();
```

### `useAudio()` Hook

Lower-level audio management:

```typescript
const {
  isReady,           // boolean: microphone initialized
  isMuted,           // boolean: mute status
  error,             // string | null: audio error
  initAudio,         // async () => void: request mic permission
  startRecording,    // (callback) => void: start capturing
  stopRecording,     // () => void: stop capturing
  toggleMute,        // () => void: pause/resume mic
  playAudio,         // (buffer) => Promise: play speaker audio
  cleanup,           // () => void: clean up resources
} = useAudio();
```

## Environment Variables

Create `.env.local`:

```env
# OpenAI API Key (required for voice features)
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-key-here
```

## Error Handling

The app gracefully handles:
- ✅ Missing/invalid API key
- ✅ Microphone permission denied
- ✅ WebSocket connection failures
- ✅ Audio playback errors
- ✅ Network issues

Errors are displayed to users with helpful messages.

## Testing Without Real API Key

During development, you can test the UI without OpenAI:

1. Set `OPENAI_API_KEY=sk-placeholder` in `.env.local`
2. The app will show connection errors but UI remains functional
3. When you add a real key, it works instantly

## Customization

### Change Sarah's Personality

Edit the system prompt in `src/lib/realtimeClient.ts`:

```typescript
instructions: `You are Sarah, a virtual receptionist...
// Customize here
```

### Change Voice

In the same file:

```typescript
voice: "sarah",  // Change to: alloy, echo, fable, onyx, nova, shimmer
```

### Adjust Response Latency Thresholds

In `src/components/CallActiveView.tsx`:

```typescript
color={
  latency < 800      // Good: under 800ms (green)
    ? "success"
    : latency < 1500 // Fair: under 1.5s (yellow)
      ? "warning"
      : "danger"     // Slow: over 1.5s (red)
}
```

## Performance Tips

1. **Reduce Background Noise**: Use `echoCancellation` and `noiseSuppression` (enabled by default)
2. **Network**: Connection quality affects latency
3. **Browser**: Use latest Chrome/Firefox for best WebRTC support
4. **Server**: Deploy to Vercel for lowest latency to OpenAI

## Troubleshooting

### "Microphone access denied"
- Check browser permissions
- Try in an incognito window
- Some browsers require HTTPS in production

### "Failed to create session"
- Verify OPENAI_API_KEY in `.env.local`
- Ensure key has Realtime API access
- Check API usage limits on your OpenAI account

### Latency is High
- Check your internet connection
- Try a different browser
- Ensure you're not running CPU-intensive tasks

### Audio Not Playing
- Check system volume
- Verify speakers are working
- Check browser audio permissions

## Deployment

### Deploy to Vercel

```bash
# Push to GitHub first
git add .
git commit -m "Initial commit"
git push origin main

# Then go to vercel.com and connect your repo
```

**Environment Variables on Vercel:**
1. Go to Project Settings → Environment Variables
2. Add: `OPENAI_API_KEY=sk-your-key`
3. Redeploy

## System Requirements

- Node.js 18+
- npm 9+
- Modern browser with:
  - WebRTC support (getUserMedia)
  - WebSocket support
  - Web Audio API
  - ArrayBuffer support

## License

MIT

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review OpenAI Realtime API docs: https://platform.openai.com/docs/guides/realtime
3. Check browser console for error messages


## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
