export const BASE_URL = import.meta.env.VITE_BASE_URL;

if (!BASE_URL) {
  throw new Error(
    "VITE_BASE_URL is missing. Check your environment variables."
  );
}
