"use client";
import {GoogleOauth} from "@0xpass/oauth";

export function Providers({ children }: { children: JSX.Element }) {
  return (
    <GoogleOauth
    >
      {children}
    </GoogleOauth>
  );
}
