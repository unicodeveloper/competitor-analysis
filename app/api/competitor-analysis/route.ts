import { NextRequest, NextResponse } from 'next/server';
import { Valyu } from "valyu-js";
import { isSelfHostedMode } from "@/lib/mode";

// OAuth proxy URL for Valyu platform mode
const VALYU_OAUTH_PROXY_URL = `${process.env.VALYU_APP_URL || 'https://platform.valyu.ai'}/api/oauth/proxy`;

// Vercel Pro plan allows up to 800s (13.3 minutes)
export const maxDuration = 800;

/**
 * Call Valyu API - either through OAuth proxy or directly via SDK
 */
async function callValyuDeepResearch(
  input: string,
  urls: string[],
  valyuAccessToken?: string
) {
  if (valyuAccessToken) {
    // Use OAuth proxy in valyu mode
    const response = await fetch(VALYU_OAUTH_PROXY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${valyuAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: '/v1/deepresearch/tasks',
        method: 'POST',
        body: {
          input,
          model: "fast",
          urls,
          output_formats: ["markdown", "pdf"]
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Proxy request failed: ${response.status}`);
    }

    return response.json();
  } else {
    // Use SDK directly in self-hosted mode
    const valyu = new Valyu();
    return valyu.deepresearch.create({
      input,
      model: "fast",
      urls,
      outputFormats: ["markdown", "pdf"]
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isSelfHosted = isSelfHostedMode();

    // Get Valyu access token from Authorization header (for valyu mode)
    const authHeader = req.headers.get('Authorization');
    const valyuAccessToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;

    // In valyu mode, require authentication
    if (!isSelfHosted && !valyuAccessToken) {
      return NextResponse.json({
        error: "AUTH_REQUIRED",
        message: "Sign in with Valyu to continue.",
      }, { status: 401 });
    }

    const { websiteurl, summaryText } = await req.json();

    if (!websiteurl || !summaryText) {
      return NextResponse.json({ error: 'Website URL and summary text are required' }, { status: 400 });
    }

    // Construct research query for competitor analysis
    const researchQuery = `Analyze the competitor: ${websiteurl}. ${summaryText}.
    Provide a comprehensive analysis including:
    - Company overview and what they do
    - Key products and services
    - Target market and customer base
    - Competitive advantages and unique value propositions
    - Recent developments and news
    - Market positioning and strategy
    - Find other companies or products doing something similar to the competitor`;

    // Create deep research task
    const task = await callValyuDeepResearch(
      researchQuery,
      [websiteurl],
      isSelfHosted ? undefined : valyuAccessToken
    );

    if (!task.deepresearch_id) {
      throw new Error('Failed to create deep research task');
    }

    // Return task ID immediately for client-side polling
    return NextResponse.json({
      success: true,
      deepresearch_id: task.deepresearch_id,
      status: 'queued',
      message: 'Research task created. Poll the status endpoint to check progress.'
    });

  } catch (error) {
    console.error('Deep research error:', error);
    return NextResponse.json({
      error: `Failed to perform deep research: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}
