import { NextResponse } from 'next/server';
import versionData from '@/data/version.json';

export async function GET() {
  try {
    const currentCommit = versionData.commit;
    const currentRevisionDisplay = versionData.revisionDisplay;

    // Check remote GitHub repository
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('https://api.github.com/repos/Schello805/Qualitydeck/commits/main', {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'QualityDeck-UpdateChecker'
      },
      next: { revalidate: 60 },
      signal: controller.signal
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (res && res.ok) {
      const data = await res.json();
      const remoteSha = data.sha ? data.sha.slice(0, 7) : null;
      const remoteFullSha = data.sha || '';
      const remoteMsg = data.commit?.message?.split('\n')[0] || '';
      const remoteDate = data.commit?.committer?.date || '';

      const isUpdateAvailable = Boolean(
        remoteSha && 
        currentCommit && 
        !currentCommit.startsWith(remoteSha) && 
        !remoteSha.startsWith(currentCommit)
      );

      return NextResponse.json({
        success: true,
        updateAvailable: isUpdateAvailable,
        currentRevision: currentRevisionDisplay,
        currentCommit,
        latestCommit: remoteSha,
        latestFullSha: remoteFullSha,
        latestMessage: remoteMsg,
        latestDate: remoteDate,
        githubRepo: versionData.githubRepo,
        checkedAt: new Date().toISOString()
      });
    }

    // Fallback if GitHub API is unreachable or offline
    return NextResponse.json({
      success: true,
      updateAvailable: false,
      currentRevision: currentRevisionDisplay,
      currentCommit,
      githubRepo: versionData.githubRepo,
      offline: true,
      checkedAt: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      updateAvailable: false,
      error: error.message,
      currentRevision: versionData.revisionDisplay,
      currentCommit: versionData.commit
    });
  }
}
