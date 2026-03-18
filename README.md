# CallDraft

A real-time AI voice agent prototype for HVAC businesses. CallDraft lets users have a live voice conversation with "Sarah," an AI-powered virtual receptionist for Anderson Heating & Cooling (Dallas, TX). The entire call happens in the browser -- no phone line or backend WebSocket server required.

## What the AI Agent Does

Sarah handles inbound calls for a fictional HVAC company. During a conversation she will:

- Greet callers and ask how she can help
- Answer questions about services (AC repair, heating repair, installation, maintenance, duct cleaning), business hours (Mon--Fri 8 AM--6 PM, 24/7 emergency), and pricing ($89 service call fee)
- Collect the caller's name, phone number, and service address
- Walk through booking an appointment (no real booking occurs)
- Politely decline off-topic questions and stay focused on HVAC services

Conversations are fully speech-to-speech. A live transcript, call timer, and response-latency indicator are displayed alongside the call.

## Prerequisites

- **Node.js** 18 or later
- An **OpenAI API key** with access to the Realtime API (`gpt-realtime-mini`)

## Setup

1. **Clone the repository**

   ```bash
   git clone <repo-url>
   cd calldraft
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy the example file and add your key:

   ```bash
   cp .env.example .env.local
   ```

   Open `.env.local` and replace the placeholder with your real key:

   ```
   OPENAI_API_KEY=sk-your-key-here
   ```

   The key must have Realtime API access enabled. You can manage keys at https://platform.openai.com/api-keys.

4. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser. Click "Start Call," grant microphone access, and begin talking.

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) | Server-side API route keeps the OpenAI key hidden; static frontend deploys to Vercel with zero config |
| Language | TypeScript | Catches type errors at build time across event handlers and WebRTC payloads |
| Styling | Tailwind CSS v4 + HeroUI | Utility-first CSS for rapid prototyping; HeroUI provides accessible components out of the box |
| Voice | OpenAI Realtime API (WebRTC) | Direct browser-to-OpenAI audio stream -- no backend WebSocket server needed, reducing latency and infrastructure |
| AI Model | gpt-realtime-mini | Cheapest Realtime model; fast enough for scripted receptionist flows with low per-minute cost |
| Deployment | Vercel | One-click deploy, automatic HTTPS, serverless API routes -- matches the Next.js ecosystem |

## How It Works

1. The browser requests an ephemeral session token from the `/api/session` Next.js API route.
2. Using that token, the browser opens a direct WebRTC connection to the OpenAI Realtime API -- no persistent backend needed.
3. Audio streams both ways in real time: the user's microphone input goes to OpenAI, and the AI's spoken response plays back through the browser.
4. Transcription, latency measurement, and call state management all happen client-side.

## Deployment

The project is designed for Vercel. No special configuration is needed beyond setting the environment variable.

1. Push the repository to GitHub (or your preferred Git host).
2. Import the project in [Vercel](https://vercel.com).
3. Add `OPENAI_API_KEY` as an environment variable in the Vercel project settings.
4. Deploy. Vercel handles the serverless API route and static assets automatically.

You can also build and run manually:

```bash
npm run build
npm run start
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build locally |
| `npm run lint` | Run ESLint |

## Troubleshooting

**Microphone access denied** -- Check browser permissions. Some browsers require HTTPS in production. Try an incognito window if permissions are stuck.

**Failed to create session** -- Verify that `OPENAI_API_KEY` is set in `.env.local` and that the key has Realtime API access. Check your OpenAI account usage limits.

**High latency** -- Response time depends on network quality and OpenAI server load. Use a modern Chromium-based browser for the best WebRTC performance.

**No audio playback** -- Check system volume and browser audio permissions. The browser must allow autoplay for the AI's voice to come through.

## License

This project is a prototype and is not licensed for production use.
