import { NextRequest, NextResponse } from 'next/server';
import { Valyu } from "valyu-js";
import { isSelfHostedMode } from "@/lib/mode";

// OAuth proxy URL for Valyu platform mode
const VALYU_OAUTH_PROXY_URL = `${process.env.VALYU_APP_URL || 'https://platform.valyu.ai'}/api/oauth/proxy`;

/**
 * Get deep research status - either through OAuth proxy or directly via SDK
 */
async function getDeepResearchStatus(
  taskId: string,
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
        path: `/v1/deepresearch/tasks/${taskId}/status`,
        method: 'GET',
        body: {}
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
    return valyu.deepresearch.status(taskId);
  }
}

export async function GET(req: NextRequest) {
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

    const searchParams = req.nextUrl.searchParams;
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Get the status of the research task
    const result = await getDeepResearchStatus(
      taskId,
      isSelfHosted ? undefined : valyuAccessToken
    );

    // Log progress for debugging
    if (result.progress) {
      console.log(`Progress: ${result.progress.current_step}/${result.progress.total_steps}`);
    }

    return NextResponse.json({
      success: true,
      deepresearch_id: result.deepresearch_id,
      status: result.status,
      output: result.output,
      sources: result.sources,
      usage: result.usage,
      pdf_url: result.pdf_url,
      progress: result.progress // Include progress information
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({
      error: `Failed to check status: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}
