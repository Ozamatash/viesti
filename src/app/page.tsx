import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/channels");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Welcome to Viesti</h1>
        <p className="mb-8 text-gray-600">A real-time chat application</p>
        <div className="space-x-4">
          <Link
            href="/sign-in"
            className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg border border-blue-500 px-4 py-2 text-blue-500 hover:bg-blue-50"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
