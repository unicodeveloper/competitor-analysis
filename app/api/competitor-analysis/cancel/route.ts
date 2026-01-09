import { NextRequest, NextResponse } from 'next/server';
import { Valyu } from "valyu-js";
import { isSelfHostedMode } from "@/lib/mode";

// OAuth proxy URL for Valyu platform mode
const VALYU_OAUTH_PROXY_URL = `${process.env.VALYU_APP_URL || 'https://platform.valyu.ai'}/api/oauth/proxy`;

/**
 * Cancel deep research task - either through OAuth proxy or directly via SDK
 */
async function cancelDeepResearch(
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
        path: `/v1/deepresearch/tasks/${taskId}/cancel`,
        method: 'POST',
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
    return valyu.deepresearch.cancel(taskId);
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

    const { taskId } = await req.json();

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Cancel the deep research task
    const result = await cancelDeepResearch(
      taskId,
      isSelfHosted ? undefined : valyuAccessToken
    );

    console.log("Cancellation result:", result);

    // Handle cases where task is already cancelled or completed
    if (!result.success && result.error) {
      // If task is already cancelled or completed, treat as success
      if (result.error.includes('cancelled') || result.error.includes('completed')) {
        return NextResponse.json({
          success: true,
          deepresearch_id: taskId,
          status: 'cancelled',
          message: 'Task was already cancelled or completed'
        });
      }
    }

    return NextResponse.json({
      success: true,
      deepresearch_id: taskId,
      status: 'cancelled',
      message: 'Research task cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel task error:', error);
    return NextResponse.json({
      error: `Failed to cancel task: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}
