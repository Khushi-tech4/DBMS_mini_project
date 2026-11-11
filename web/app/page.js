"use client";
// Home page: send the visitor to the right place.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/me").then(async (res) => {
      if (!res.ok) return router.replace("/login");
      const me = await res.json();
      router.replace(me.role === "ADMIN" ? "/admin" : "/dashboard");
    });
  }, [router]);

  return <p className="p-8 text-gray-600">Loading...</p>;
}
