import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase;

if (!supabaseUrl || !supabaseAnonKey) {
	// Provide a safe no-op stub to avoid runtime crashes in the browser when
	// environment variables are missing (e.g. during a misconfigured build).
	// Calls will return an error object so the app can show a friendly message.
	console.error('Supabase not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
	const err = new Error('Supabase not configured');

	const noopQuery = async () => ({ data: null, error: err });

	supabase = {
		auth: {
			getSession: async () => ({ data: { session: null } }),
			onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
			signInWithPassword: async () => ({ error: err }),
			signUp: async () => ({ error: err }),
			signOut: async () => ({ error: err })
		},
		from: () => ({ select: noopQuery, insert: noopQuery, update: noopQuery, delete: noopQuery })
	};
} else {
	supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };
