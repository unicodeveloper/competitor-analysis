# Competitor Analysis

A competitor analysis tool built with Next.js and [Valyu Deep Research API](https://docs.valyu.ai/guides/deepresearch).

Get comprehensive insights about any competitor with detailed reports on products, market positioning, and strategy.

Try it [live now!](https://competitor-analysis.up.railway.app)

![Competitor Analysis](https://4ealzrotsszllxtz.public.blob.vercel-storage.com/Screenshot%202026-01-07%20at%2016.14.05.png)

![Processing result](https://4ealzrotsszllxtz.public.blob.vercel-storage.com/Screenshot%202026-01-07%20at%2016.07.42.png)

![Search results](https://4ealzrotsszllxtz.public.blob.vercel-storage.com/Screenshot%202026-01-07%20at%2016.13.41.png)


## Features

- **Deep Research**: Leverages Valyu's AI to search multiple sources and analyze content
- **Comprehensive Reports**: Detailed analysis including company overview, products, market positioning, and recent developments
- **Beautiful UI**: Modern, responsive side-by-side interface with dark mode support
- **Real-time Updates**: Live progress tracking with step-by-step status updates (5-10 minutes)
- **Progress Indicators**: Visual progress bar showing current step and completion percentage
- **Mobile Friendly**: Fully responsive design that adapts to all screen sizes
- **PDF Export**: Download research reports as PDF (auto-generated with results)
- **Source Citations**: All research backed by verifiable sources
- **Live Results**: Results appear in real-time on the right panel as research progresses

## Quick Start (Self-Hosted)

Self-hosted mode is the simplest way to run the app. You only need a Valyu API key.

### Prerequisites

- Node.js 20+ installed
- A Valyu API key (get one at [Valyu Platform](https://platform.valyu.ai))

### Steps

1. **Clone and install dependencies**:

```bash
pnpm install
```

2. **Set up environment variables**:

Create a `.env.local` file in the root directory:

```bash
VALYU_API_KEY=your_valyu_api_key_here
```

That's it! No other configuration needed.

3. **Run the development server**:

```bash
pnpm run dev
```

4. **Open your browser**:

Navigate to [http://localhost:3000](http://localhost:3000)

## Valyu Platform Mode (Optional)

For production deployments on the Valyu platform, you can enable OAuth authentication. In this mode, users sign in with their Valyu account and API usage is billed to their account.

### Configuration

Set the following environment variables:

```bash
# Enable Valyu platform mode
NEXT_PUBLIC_APP_MODE=valyu

# OAuth credentials (contact contact@valyu.ai)
NEXT_PUBLIC_VALYU_AUTH_URL=https://auth.valyu.ai
NEXT_PUBLIC_VALYU_CLIENT_ID=your_client_id
VALYU_CLIENT_SECRET=your_client_secret
VALYU_APP_URL=https://platform.valyu.ai
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/auth/valyu/callback
```

### Mode Comparison

| Feature | Self-Hosted | Valyu Platform |
|---------|-------------|----------------|
| API Key Required | Yes (server-side) | No |
| User Sign-in | Not required | Required |
| Billing | Your API key | User's Valyu account |
| Best For | Personal/team use | Public deployments |

## How to Use

1. **Enter Details** (Left Panel): Add competitor's website URL and initial context
2. **Start Analysis**: Click "Start Deep Research Analysis"
3. **Watch Progress** (Right Panel): Real-time progress updates appear immediately
   - See current step and percentage complete
   - Visual progress bar shows research status
   - Live status messages keep you informed
4. **Review Results**: Comprehensive report appears automatically when complete
   - Beautifully formatted markdown content
   - Clickable source citations
   - Download PDF report with one click

## Project Structure

```
app/
├── api/
│   └── competitor-analysis/
│       ├── route.ts              # API endpoint for creating research tasks
│       ├── cancel/
│       │   └── route.ts          # API endpoint for cancelling research tasks
│       └── status/
│           └── route.ts          # API endpoint for checking task status and progress
├── components/
│   ├── CompetitorAnalysisForm.tsx    # Input form with polling logic
│   ├── ResearchResults.tsx           # Results display with loading states
│   └── Sidebar.tsx                   # Navigation sidebar component
├── page.tsx                  # Main homepage with side-by-side layout
├── layout.tsx                # Root layout
└── globals.css               # Global styles and animations
lib/
└── mode.ts                   # App mode detection utilities
```

## API Configuration

The deep research API is configured in [route.ts](app/api/competitor-analysis/route.ts):

- **Model**: `fast` (~5 min) - Can change to `standard` (10-20 min) or `heavy` (up to 90 min)
- **Architecture**: Asynchronous with client-side polling (no server timeouts!)
- **Poll Interval**: Checks status every 10 seconds
- **Output Formats**: Markdown and PDF
- **Progress Tracking**: Real-time step-by-step progress updates
- **Max Duration**: No limit - polling continues until completion

## Deployment

### Deploy on Vercel

1. Push your code to GitHub
2. Import your repository on [Vercel](https://vercel.com)
3. Add your `VALYU_API_KEY` environment variable
4. Deploy!

**Note**: The free Vercel plan works perfectly! The app uses client-side polling, so there are no server timeout issues.

## Learn More

- [Valyu Deep Research Documentation](https://docs.valyu.ai/guides/deepresearch)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 with Typography plugin
- **Markdown Rendering**: react-markdown with GitHub Flavored Markdown
- **AI Research**: Valyu Deep Research API
- **Deployment**: Vercel

## Key Dependencies

- `valyu-js` - Official Valyu SDK for deep research
- `react-markdown` - Beautiful markdown rendering
- `remark-gfm` - GitHub Flavored Markdown support
- `@tailwindcss/typography` - Typography styles for prose content
