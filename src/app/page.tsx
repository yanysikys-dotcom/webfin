import { redirect } from "next/navigation";

export default function Home() {
  // Фактично сюди не потрапляють: middleware перенаправляє раніше.
  redirect("/dashboard");
}
