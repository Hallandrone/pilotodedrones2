/**
 * Security Log Filter
 * This utility filters out sensitive information from the browser console.
 * It intercepts console methods and checks for keywords related to database connections
 * and sensitive keys, preventing them from being displayed.
 */

const SENSITIVE_KEYWORDS = [
	'supabase.co',
	'apikey',
	'bearer',
	'postgres',
	'postgrest',
	'public-key',
	// Filter generic object dumps that might look like database rows if they contain sensitive fields
	'user_metadata',
	'encrypted_password',
	'auth.users',
	'sb-sncjozwmtjaltoituumx', // Project specific
];

const originalConsole = {
	log: console.log,
	info: console.info,
	warn: console.warn,
	error: console.error,
	debug: console.debug,
};

function hasSensitiveInfo(args: any[]): boolean {
	try {
		const jsonString = JSON.stringify(args).toLowerCase();
		return SENSITIVE_KEYWORDS.some(keyword => jsonString.includes(keyword.toLowerCase()));
	} catch (e) {
		// If strict serialization fails (circular ref), we can't easily check, so we let it pass 
		// or we could check string conversion.
		return false;
	}
}

export function initSecurityLogFilter() {
	if (import.meta.env.DEV) {
		// In development, we might act less strictly, or maybe the user WANTS this in dev too?
		// User complaint implies they see it now, so probably in dev.
		// We will apply it always if the user requested it specifically.
	}

	const wrapConsoleMethod = (methodName: keyof typeof originalConsole) => {
		console[methodName] = (...args: any[]) => {
			// Check if any argument contains sensitive info
			if (hasSensitiveInfo(args)) {
				// Option: Completely suppress, or Replace with [Redacted]
				// Suppressing entirely is cleaner for the "it should not appear" requirement.
				return;

				// specific generic message fallback:
				// originalConsole[methodName]('[Security Filter] Sensitive log suppressed');
			}

			// If safe, pass through to original method
			originalConsole[methodName].apply(console, args);
		};
	};

	wrapConsoleMethod('log');
	wrapConsoleMethod('info');
	wrapConsoleMethod('warn');
	wrapConsoleMethod('error');
	wrapConsoleMethod('debug');

	// Log a single secure message to indicate protection is active
	originalConsole.log('%c Security Filter Active ', 'background: #222; color: #bada55; padding: 2px; border-radius: 2px;');
}
