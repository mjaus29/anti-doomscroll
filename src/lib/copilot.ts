import type { PermissionRequestResult } from '@github/copilot-sdk';
import { CopilotClient } from '@github/copilot-sdk';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { ChallengeAiUsage } from './challenge-lab';

export const OAUTH_TOKEN_COOKIE = 'copilot_github_token';
export const DEFAULT_COPILOT_MODEL = process.env.COPILOT_CHALLENGE_MODEL?.trim() || 'gpt-6-luna';

export const denyAllPermissions = (): PermissionRequestResult => ({
	kind: 'denied-by-rules',
	rules: [],
});

function ensureDirectory(directoryPath: string): string {
	mkdirSync(directoryPath, { recursive: true });
	return directoryPath;
}

function resolveCopilotRuntimeDirectories() {
	const runtimeRoot = ensureDirectory(
		process.env.COPILOT_RUNTIME_DIR?.trim() || path.join(tmpdir(), 'copilot-sdk-runtime')
	);
	const homeDir = ensureDirectory(path.join(runtimeRoot, 'home'));
	const cacheRoot = ensureDirectory(path.join(runtimeRoot, 'cache'));

	return {
		homeDir,
		cacheRoot,
		copilotHomeDir: ensureDirectory(path.join(runtimeRoot, '.copilot')),
		copilotCacheDir: ensureDirectory(path.join(cacheRoot, 'copilot')),
	};
}

export function resolveCopilotCliPath(): string {
	const configuredPath = process.env.COPILOT_CLI_PATH?.trim();
	if (configuredPath) {
		return configuredPath;
	}

	const platformBinaryMap: Record<string, string> = {
		'linux:x64': path.join('.', 'node_modules', '@github', 'copilot-linux-x64', 'copilot'),
		'linux:arm64': path.join('.', 'node_modules', '@github', 'copilot-linux-arm64', 'copilot'),
		'win32:x64': path.join('.', 'node_modules', '@github', 'copilot-win32-x64', 'copilot.exe'),
		'win32:arm64': path.join('.', 'node_modules', '@github', 'copilot-win32-arm64', 'copilot.exe'),
		'darwin:x64': path.join('.', 'node_modules', '@github', 'copilot-darwin-x64', 'copilot'),
		'darwin:arm64': path.join('.', 'node_modules', '@github', 'copilot-darwin-arm64', 'copilot'),
	};

	const resolvedBinary = platformBinaryMap[`${process.platform}:${process.arch}`];
	if (resolvedBinary) {
		return resolvedBinary;
	}

	return path.join('.', 'node_modules', '@github', 'copilot', 'npm-loader.js');
}

export function createCopilotClient(githubToken: string): CopilotClient {
	const runtimeDirectories = resolveCopilotRuntimeDirectories();
	const runtimeTempDir = tmpdir();

	return new CopilotClient({
		cliPath: resolveCopilotCliPath(),
		githubToken,
		useLoggedInUser: false,
		env: {
			...process.env,
			COPILOT_GITHUB_TOKEN: githubToken,
			HOME: runtimeDirectories.homeDir,
			USERPROFILE: runtimeDirectories.homeDir,
			XDG_CACHE_HOME: runtimeDirectories.cacheRoot,
			COPILOT_HOME: runtimeDirectories.copilotHomeDir,
			COPILOT_CACHE_HOME: runtimeDirectories.copilotCacheDir,
			TMPDIR: runtimeTempDir,
			TMP: runtimeTempDir,
			TEMP: runtimeTempDir,
		},
	});
}

function toUsageSummary(event: {
	data: {
		inputTokens?: number;
		outputTokens?: number;
		duration?: number;
		ttftMs?: number;
		copilotUsage?: {
			tokenDetails: Array<{
				tokenCount: number;
			}>;
		};
	};
}): ChallengeAiUsage {
	const inputTokens =
		typeof event.data.inputTokens === 'number' ? event.data.inputTokens : undefined;
	const outputTokens =
		typeof event.data.outputTokens === 'number' ? event.data.outputTokens : undefined;
	const totalTokens =
		inputTokens !== undefined || outputTokens !== undefined
			? (inputTokens ?? 0) + (outputTokens ?? 0)
			: event.data.copilotUsage?.tokenDetails.reduce(
					(total, detail) => total + detail.tokenCount,
					0
				);

	return {
		inputTokens,
		outputTokens,
		totalTokens,
		durationMs: typeof event.data.duration === 'number' ? event.data.duration : undefined,
		ttftMs: typeof event.data.ttftMs === 'number' ? event.data.ttftMs : undefined,
	};
}

export async function runCopilotPrompt({
	githubToken,
	model = DEFAULT_COPILOT_MODEL,
	prompt,
	systemMessage,
	timeoutMs = 45000,
	onDelta,
}: {
	githubToken: string;
	model?: string;
	prompt: string;
	systemMessage: string;
	timeoutMs?: number;
	onDelta?: (delta: string) => void;
}): Promise<{
	message: string;
	usage: ChallengeAiUsage | null;
}> {
	const client = createCopilotClient(githubToken);
	let session: Awaited<ReturnType<CopilotClient['createSession']>> | null = null;
	let finalMessage = '';
	let streamedMessage = '';
	let usage: ChallengeAiUsage | null = null;

	try {
		session = await client.createSession({
			model,
			infiniteSessions: { enabled: false },
			streaming: true,
			onPermissionRequest: denyAllPermissions,
			systemMessage: {
				content: systemMessage,
			},
		});

		session.on('assistant.message_delta', (event) => {
			streamedMessage += event.data.deltaContent;
			onDelta?.(event.data.deltaContent);
		});

		session.on('assistant.message', (event) => {
			finalMessage = event.data.content.trim();
		});

		session.on('assistant.usage', (event) => {
			usage = toUsageSummary(event);
		});

		session.on('session.error', (error) => {
			console.error('[Copilot] Session error event:', error);
		});

		await session.sendAndWait({ prompt }, timeoutMs);

		const response = (finalMessage || streamedMessage).trim();
		if (!response) {
			throw new Error('Copilot returned an empty response.');
		}

		return {
			message: response,
			usage,
		};
	} finally {
		if (session) {
			await session.disconnect().catch((error) => {
				console.warn('[Copilot] Error disconnecting session:', error);
			});
		}

		await client.stop().catch((error) => {
			console.warn('[Copilot] Error stopping client:', error);
		});
	}
}
