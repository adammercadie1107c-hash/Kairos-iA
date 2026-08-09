import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Data Deletion Status — Kairos iA",
};

export default async function DeletionStatusPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : null;

  if (!code) {
    return (
      <StatusLayout>
        <StatusCard
          title="Missing confirmation code"
          message="Please provide a valid confirmation code to check the status of your data deletion request."
          status="error"
        />
      </StatusLayout>
    );
  }

  const supabase = await createServiceClient();
  const { data: request } = await supabase
    .from("data_deletion_requests")
    .select("status, requested_at, completed_at")
    .eq("confirmation_code", code)
    .maybeSingle();

  if (!request) {
    return (
      <StatusLayout>
        <StatusCard
          title="Request not found"
          message="No data deletion request matches this confirmation code."
          status="error"
        />
      </StatusLayout>
    );
  }

  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: "In progress", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
    completed: { label: "Completed", color: "text-green-600 bg-green-50 border-green-200" },
    no_channel_found: { label: "No data found", color: "text-gray-600 bg-gray-50 border-gray-200" },
  };

  const { label, color } = statusMap[request.status] ?? statusMap.pending;

  return (
    <StatusLayout>
      <StatusCard
        title="Data Deletion Request"
        message={`Your data deletion request has been processed.`}
        status="info"
      >
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Status</span>
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${color}`}>
              {label}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Confirmation code</span>
            <span className="font-mono text-sm text-gray-900">{code}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Requested</span>
            <span className="text-sm text-gray-900">
              {new Date(request.requested_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          {request.completed_at && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Completed</span>
              <span className="text-sm text-gray-900">
                {new Date(request.completed_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
        </div>
      </StatusCard>
    </StatusLayout>
  );
}

function StatusLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

function StatusCard({
  title,
  message,
  status,
  children,
}: {
  title: string;
  message: string;
  status: "info" | "error";
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">
        Kairos iA
      </p>
      <h1 className="mt-2 text-xl font-bold text-gray-900">{title}</h1>
      <p className={`mt-2 text-sm ${status === "error" ? "text-red-600" : "text-gray-600"}`}>
        {message}
      </p>
      {children}
    </div>
  );
}
