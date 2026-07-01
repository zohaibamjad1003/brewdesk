"use client";

import Link from "next/link";
import { useBrew, Order } from "../../context/BrewContext";

export default function BrewerQueue() {
  const { orders, updateOrderStatus, currentUser, systemDate, loading } = useBrew();

  // Loading spinner during session checks
  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-[50vh] p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-800" />
        <p className="mt-4 text-sm font-semibold text-neutral-500">Checking authorization...</p>
      </div>
    );
  }

  // Role Guard: Access allowed only for Brewer and Admin
  if (!currentUser || (currentUser.role !== "Brewer" && currentUser.role !== "Admin")) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 shadow-sm">
          <span className="text-5xl">⛔</span>
          <h1 className="text-2xl font-bold text-red-950 mt-4">Access Denied</h1>
          <p className="text-sm text-red-700 mt-2">
            You do not have permissions to access the Brewer Queue.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex justify-center rounded-lg bg-neutral-950 px-4 py-2 text-sm font-bold text-white shadow hover:bg-neutral-800 transition-all"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  // FIFO Queue: orders that are Pending or On the way, sorted by oldest first, matching current active systemDate
  const activeOrders = orders
    .filter((order) => order.status !== "Delivered" && order.createdAt.startsWith(systemDate))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Completed Orders: orders that are Delivered, sorted by newest first, matching current active systemDate
  const completedOrders = orders
    .filter((order) => order.status === "Delivered" && order.createdAt.startsWith(systemDate))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Count summaries
  const pendingCount = activeOrders.filter((o) => o.status === "Pending").length;
  const onTheWayCount = activeOrders.filter((o) => o.status === "On the way").length;

  const handleNextStatus = (order: Order) => {
    if (order.status === "Pending") {
      updateOrderStatus(order.id, "On the way");
    } else if (order.status === "On the way") {
      updateOrderStatus(order.id, "Delivered");
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Info */}
      <div className="mb-8 border-b border-neutral-200 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">
            Brewer Workstation
          </h1>
          <p className="mt-2 text-sm text-neutral-500 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Manage beverage requests. Keep track of what needs brewing and what is on the way.</span>
            <span className="inline-flex items-center rounded bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600 border border-neutral-200">
              📅 Simulated Date: {systemDate}
            </span>
          </p>
        </div>

        {/* Live Counters */}
        <div className="flex gap-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 shadow-sm">
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Pending</p>
            <p className="text-2xl font-bold text-amber-950 mt-0.5">{pendingCount}</p>
          </div>
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 shadow-sm">
            <p className="text-xs font-semibold text-sky-800 uppercase tracking-wider">On The Way</p>
            <p className="text-2xl font-bold text-sky-950 mt-0.5">{onTheWayCount}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 shadow-sm">
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Delivered</p>
            <p className="text-2xl font-bold text-emerald-950 mt-0.5">{completedOrders.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* FIFO Active Queue (Left Side) */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-neutral-900 mb-6 flex items-center justify-between">
              <span>Brewer Order Queue (FIFO oldest first)</span>
              <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-800">
                ⚡ Brewer Mode
              </span>
            </h2>

            {activeOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-neutral-200 rounded-lg bg-neutral-50/50">
                <span className="text-5xl mb-4">💤</span>
                <h3 className="text-base font-bold text-neutral-900">All caught up!</h3>
                <p className="text-sm text-neutral-500 mt-1">No pending beverage orders at the moment.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeOrders.map((order, index) => (
                  <div
                    key={order.id}
                    className={`rounded-lg border p-5 transition-all shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                      order.status === "On the way"
                        ? "border-sky-200 bg-sky-50/30"
                        : "border-neutral-200 bg-white hover:border-neutral-300"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-bold text-white">
                          {index + 1}
                        </span>
                        <h3 className="font-bold text-base text-neutral-900">
                          {order.drink}
                          <span className="text-xs font-normal text-neutral-500 ml-2">
                            ({order.sugar})
                          </span>
                        </h3>
                      </div>
                      <p className="text-sm text-neutral-700 font-medium">
                        👤 Employee: <span className="text-neutral-900 font-semibold">{order.employeeName}</span>
                      </p>
                      <p className="text-sm text-neutral-600">
                        📍 Location: <span className="font-semibold text-neutral-800">{order.floor}</span>
                      </p>
                      <p className="text-xs text-neutral-400 mt-1.5 flex items-center gap-1">
                        ⏱️ Received at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <span className="text-neutral-300">•</span>
                        <span>{Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000)} mins ago</span>
                      </p>
                    </div>

                    <div className="flex sm:flex-col justify-end gap-2.5">
                      <div className="text-right hidden sm:block">
                        {order.status === "Pending" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                            Brewing
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">
                            Out for Delivery
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleNextStatus(order)}
                        className={`w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all text-center ${
                          order.status === "Pending"
                            ? "bg-amber-600 text-white hover:bg-amber-700"
                            : "bg-sky-600 text-white hover:bg-sky-700"
                        }`}
                      >
                        {order.status === "Pending" ? "🏁 Start Delivery" : "✅ Mark Delivered"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recently Completed Log (Right Side) */}
        <div>
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-neutral-900 mb-4 flex items-center justify-between">
              <span>Completed Today</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                Delivered
              </span>
            </h2>

            {completedOrders.length === 0 ? (
              <div className="py-12 text-center text-neutral-400">
                <span className="text-3xl block mb-2">☕</span>
                <p className="text-xs">No orders delivered yet during this session.</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 overflow-y-auto max-h-[500px]">
                {completedOrders.map((order) => (
                  <div key={order.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-sm text-neutral-900">
                          {order.drink}
                          <span className="text-xs font-normal text-neutral-500 ml-1">
                            ({order.sugar})
                          </span>
                        </h4>
                        <p className="text-xs text-neutral-600 mt-0.5">
                          👤 {order.employeeName} • 📍 {order.floor}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        Done ✓
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
