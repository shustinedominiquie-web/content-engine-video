import { redirect } from "next/navigation";

// Root route always goes straight to the dashboard
export default function Home() {
  redirect("/dashboard");
}
