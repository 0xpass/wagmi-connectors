"use client";
import { GoogleOAuthProvider } from "@react-oauth/google";

export function Providers({ children }: { children: JSX.Element }) {
  return (
    <GoogleOAuthProvider
      clientId={
        "878158413281-7crfata4i7j1qvn3hesqa7qeqa48eavd.apps.googleusercontent.com"
      }
    >
      {children}
    </GoogleOAuthProvider>
  );
}
