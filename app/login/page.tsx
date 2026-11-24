import type { Metadata } from "next";
import LoginClient from "./login-client";

export const metadata: Metadata = {
  title: "Sign in | Cortex RAG",
  description: "Sign in, create an account, or try a sandboxed demo profile of the Cortex enterprise RAG workspace.",
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
  return <LoginClient />;
}
