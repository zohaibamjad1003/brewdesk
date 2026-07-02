"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useBrew } from "../../context/BrewContext";

export default function AdminDashboard() {
  const {
    orders,
    floors,
    employees,
    brewers,
    reviews,
    drinks,
    addFloor,
    deleteFloor,
    updateFloor,
    addEmployee,
    deleteEmployee,
    updateEmployee,
    addBrewer,
    deleteBrewer,
    updateBrewer,
    updateBrewerStatus,
    systemDate,
    currentUser,
    loading,
    serviceHours,
    addServiceHour,
    deleteServiceHour,
    updateServiceHour,
    getDailyOrderNumber,
    submitReview,
    cooldownLimitEnabled,
    toggleCooldownLimit,
  } = useBrew();

  // Analytics Filter States (Day vs All Time)
  const [filterMode, setFilterMode] = useState<"day" | "all">("day");
  const [selectedFilterDate, setSelectedFilterDate] = useState<string>("");
  const activeFilterDate = selectedFilterDate || systemDate;

  // Local state for management forms
  const [newFloorName, setNewFloorName] = useState("");

  // Floor inline edit state
  const [editingFloorName, setEditingFloorName] = useState<string | null>(null);
  const [editingFloorNewName, setEditingFloorNewName] = useState("");
  
  // Employee add form state
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeeContact, setNewEmployeeContact] = useState("");

  // Employee inline edit state
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [editingEmployeeName, setEditingEmployeeName] = useState("");
  const [editingEmployeeContact, setEditingEmployeeContact] = useState("");

  // Brewer add form state
  const [newBrewerName, setNewBrewerName] = useState("");
  const [newBrewerContact, setNewBrewerContact] = useState("");

  // Brewer inline edit state
  const [editingBrewerId, setEditingBrewerId] = useState<string | null>(null);
  const [editingBrewerName, setEditingBrewerName] = useState("");
  const [editingBrewerContact, setEditingBrewerContact] = useState("");
  const [editingBrewerStatus, setEditingBrewerStatus] = useState<"Active" | "On Break" | "Off">("Active");

  // Sorting options
  const [floorSortOrder, setFloorSortOrder] = useState<"default" | "alpha">("default");
  const [employeeSortOrder, setEmployeeSortOrder] = useState<"default" | "alpha">("default");
  const [brewerSortOrder, setBrewerSortOrder] = useState<"default" | "alpha">("default");

  // Toast for New Day Simulation
  const [showToast, setShowToast] = useState(false);

  // Multiple Beverage service hours slots input states
  const [newSlotLabel, setNewSlotLabel] = useState("");
  const [newSlotStartTime, setNewSlotStartTime] = useState("");
  const [newSlotEndTime, setNewSlotEndTime] = useState("");

  const handleAddSlotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotLabel.trim() || !newSlotStartTime || !newSlotEndTime) return;
    addServiceHour(newSlotLabel, newSlotStartTime, newSlotEndTime);
    setNewSlotLabel("");
    setNewSlotStartTime("");
    setNewSlotEndTime("");
  };

  // Edit service hours states
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editingSlotLabel, setEditingSlotLabel] = useState("");
  const [editingSlotStartTime, setEditingSlotStartTime] = useState("");
  const [editingSlotEndTime, setEditingSlotEndTime] = useState("");

  const handleEditSlotStart = (slot: { id: string; label: string; start_time: string; end_time: string }) => {
    setEditingSlotId(slot.id);
    setEditingSlotLabel(slot.label);
    setEditingSlotStartTime(slot.start_time);
    setEditingSlotEndTime(slot.end_time);
  };

  const handleEditSlotSave = (id: string) => {
    if (!editingSlotLabel.trim() || !editingSlotStartTime || !editingSlotEndTime) return;
    updateServiceHour(id, editingSlotLabel, editingSlotStartTime, editingSlotEndTime);
    setEditingSlotId(null);
  };

  // Mandatory feedback modal states for Admin
  const [adminReviewRating, setAdminReviewRating] = useState(5);
  const [adminReviewComments, setAdminReviewComments] = useState("");

  // Find any unreviewed delivered orders placed by the Admin
  const unreviewedOrder = currentUser
    ? orders.find(
        (o) =>
          o.employeeId === currentUser.id &&
          o.status === "Delivered" &&
          (o.feedbackRating === undefined || o.feedbackRating === null)
      )
    : undefined;

  const handleAdminReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unreviewedOrder) return;
    submitReview(unreviewedOrder.id, adminReviewRating, adminReviewComments);
    setAdminReviewRating(5);
    setAdminReviewComments("");
  };

  // Loading spinner during session checks
  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-[50vh] p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-800" />
        <p className="mt-4 text-sm font-semibold text-neutral-500">Checking authorization...</p>
      </div>
    );
  }

  // Role Guard: Access allowed only for Admin
  if (!currentUser || currentUser.role !== "Admin") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 shadow-sm">
          <span className="text-5xl">⛔</span>
          <h1 className="text-2xl font-bold text-red-950 mt-4">Access Denied</h1>
          <p className="text-sm text-red-700 mt-2">
            You do not have permissions to access the Admin Control Center.
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

  // Generate unique dates present in orders, plus the active systemDate
  const uniqueDates = Array.from(
    new Set([
      systemDate,
      ...orders.map((o) => o.createdAt.split("T")[0])
    ])
  ).sort((a, b) => b.localeCompare(a)); // Newest first

  // Filter orders to compute analytics matching Selection
  const dayOrders = filterMode === "all"
    ? orders
    : orders.filter((order) => order.createdAt.split("T")[0] === activeFilterDate);

  // 1. Stats calculations for selected day
  const totalOrders = dayOrders.length;
  const pendingOrders = dayOrders.filter((o) => o.status === "Pending").length;
  const onTheWayOrders = dayOrders.filter((o) => o.status === "On the way").length;
  const deliveredOrders = dayOrders.filter((o) => o.status === "Delivered").length;
  const notFoundOrders = dayOrders.filter((o) => o.status === "Not Found").length;

  // 2. Floor Breakdown for selected day
  const floorCounts = floors.reduce((acc, floor) => {
    acc[floor] = dayOrders.filter((o) => o.floor === floor).length;
    return acc;
  }, {} as Record<string, number>);

  // 3. Drink Breakdown for selected day
  const drinkCounts = drinks.reduce((acc, drink) => {
    acc[drink] = dayOrders.filter((o) => o.drink === drink).length;
    return acc;
  }, {} as Record<string, number>);

  // 4. Peak Time Analysis for selected day
  const hourBuckets = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: 0,
  }));

  dayOrders.forEach((order) => {
    const date = new Date(order.createdAt);
    const hr = date.getHours();
    if (hr >= 0 && hr < 24) {
      hourBuckets[hr].count += 1;
    }
  });

  const activeHours = hourBuckets.filter(
    (h) => h.count > 0 || (h.hour >= 8 && h.hour <= 18)
  );

  const maxHourCount = Math.max(...hourBuckets.map((h) => h.count), 1);

  const formatHour = (h: number) => {
    const ampm = h >= 12 ? "PM" : "AM";
    const displayHr = h % 12 === 0 ? 12 : h % 12;
    return `${displayHr}${ampm}`;
  };

  // Full history for the selected day sorted by newest first
  const sortedHistory = [...dayOrders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Reviews/Feedback calculations
  const totalReviews = reviews.length;
  const avgRating = totalReviews
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
    : "N/A";

  const handleAddFloorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFloorName.trim() === "") return;
    addFloor(newFloorName);
    setNewFloorName("");
  };

  const handleAddEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmployeeName.trim() === "") return;
    addEmployee(newEmployeeName, newEmployeeContact);
    setNewEmployeeName("");
    setNewEmployeeContact("");
  };

  const handleAddBrewerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBrewerName.trim() === "") return;
    addBrewer(newBrewerName, newBrewerContact);
    setNewBrewerName("");
    setNewBrewerContact("");
  };

  // Inline Edit Handlers for Floor
  const handleEditFloorStart = (floor: string) => {
    setEditingFloorName(floor);
    setEditingFloorNewName(floor);
  };

  const handleEditFloorSave = (oldFloor: string) => {
    if (editingFloorNewName.trim() === "") return;
    updateFloor(oldFloor, editingFloorNewName);
    setEditingFloorName(null);
  };

  // List sorting logic
  const sortedFloors = floorSortOrder === "alpha" 
    ? [...floors].sort((a, b) => a.localeCompare(b))
    : floors;

  const sortedEmployees = employeeSortOrder === "alpha"
    ? [...employees].sort((a, b) => a.name.localeCompare(b.name))
    : employees;

  const sortedBrewers = brewerSortOrder === "alpha"
    ? [...brewers].sort((a, b) => a.name.localeCompare(b.name))
    : brewers;

  // Inline Edit Handlers for Employee
  const handleEditEmployeeStart = (emp: { id: string; name: string; contact: string }) => {
    setEditingEmployeeId(emp.id);
    setEditingEmployeeName(emp.name);
    setEditingEmployeeContact(emp.contact);
  };

  const handleEditEmployeeSave = (id: string) => {
    if (editingEmployeeName.trim() === "") return;
    updateEmployee(id, editingEmployeeName, editingEmployeeContact);
    setEditingEmployeeId(null);
  };

  // Inline Edit Handlers for Brewer
  const handleEditBrewerStart = (bwr: { id: string; name: string; contact: string; status: "Active" | "On Break" | "Off" }) => {
    setEditingBrewerId(bwr.id);
    setEditingBrewerName(bwr.name);
    setEditingBrewerContact(bwr.contact);
    setEditingBrewerStatus(bwr.status);
  };

  const handleEditBrewerSave = (id: string) => {
    if (editingBrewerName.trim() === "") return;
    updateBrewer(id, editingBrewerName, editingBrewerContact);
    updateBrewerStatus(id, editingBrewerStatus);
    setEditingBrewerId(null);
  };

  // Date selection reset trigger
  const handleResetFilterDate = () => {
    setSelectedFilterDate("");
  };

  const getStatusTextClass = (status: "Pending" | "On the way" | "Delivered" | "Not Found") => {
    switch (status) {
      case "Pending":
        return "text-amber-700 bg-amber-50 ring-amber-600/20";
      case "On the way":
        return "text-sky-700 bg-sky-50 ring-sky-600/20";
      case "Delivered":
        return "text-emerald-700 bg-emerald-50 ring-emerald-600/20";
      case "Not Found":
        return "text-red-700 bg-red-50 ring-red-650/20";
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Info */}
      <div className="mb-8 border-b border-neutral-200 dark:border-neutral-800 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
            Admin Control Panel
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-300">
            Today's Date: <span className="font-semibold text-neutral-800 dark:text-neutral-200">{systemDate}</span>
          </p>
        </div>

        {/* Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Filter:
            </span>
            
            {/* Calendar input */}
            <input
              type="date"
              value={selectedFilterDate || systemDate}
              max={systemDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedFilterDate(e.target.value);
                  setFilterMode("day"); // Switch back to day mode when calendar is used
                }
              }}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold shadow-sm focus:outline-none transition-all cursor-pointer ${
                filterMode === "day"
                  ? "border-neutral-900 dark:border-neutral-100 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 ring-1 ring-neutral-900 dark:ring-neutral-100"
                  : "border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            />

            {/* Today shortcut button */}
            <button
              type="button"
              onClick={() => {
                setSelectedFilterDate(""); // Reset to systemDate (Today)
                setFilterMode("day");
              }}
              className={`rounded-lg border px-4 py-1.5 text-sm font-bold shadow-sm transition-all cursor-pointer ${
                filterMode === "day" && activeFilterDate === systemDate
                  ? "bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950 border-neutral-950 dark:border-neutral-100"
                  : "bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700"
              }`}
            >
              ☀️ Today
            </button>

            {/* All Time toggle button */}
            <button
              type="button"
              onClick={() => {
                setFilterMode("all");
              }}
              className={`rounded-lg border px-4 py-1.5 text-sm font-bold shadow-sm transition-all cursor-pointer ${
                filterMode === "all"
                  ? "bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950 border-neutral-950 dark:border-neutral-100"
                  : "bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700"
              }`}
            >
              🌎 All Time
            </button>

            {/* Link to Order Form */}
            <Link
              href="/"
              className="rounded-lg bg-amber-700 hover:bg-amber-800 px-4 py-1.5 text-sm font-bold text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ml-1"
            >
              ☕ Place Order
            </Link>
          </div>
        </div>
      </div>

      {/* Day Identifier Sub-banner */}
      <div className="rounded-lg bg-neutral-100 dark:bg-neutral-800 px-4 py-3 mb-6 flex items-center justify-between text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider shadow-inner">
        <span>
          Viewing Analytics for: {filterMode === "all" ? "All Time (Cumulative History)" : (activeFilterDate === systemDate ? `Today (${activeFilterDate})` : activeFilterDate)}
        </span>
        {filterMode === "all" ? (
          <span className="text-purple-800 bg-purple-50 dark:bg-purple-950/30 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800 uppercase">Cumulative Log</span>
        ) : (
          activeFilterDate !== systemDate && (
            <span className="text-amber-800 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 uppercase">Archived Log</span>
          )
        )}
      </div>

      {/* Grid: 6 Core Counters (Includes Rating and Not Found) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-6 mb-8">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <span className="text-sm font-medium text-neutral-500">Total Orders</span>
          <p className="text-3xl font-extrabold text-neutral-900 mt-1">{totalOrders}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <span className="text-sm font-medium text-amber-600">Pending Queue</span>
          <p className="text-3xl font-extrabold text-amber-600 mt-1">{pendingOrders}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <span className="text-sm font-medium text-sky-600">On The Way</span>
          <p className="text-3xl font-extrabold text-sky-600 mt-1">{onTheWayOrders}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <span className="text-sm font-medium text-emerald-600">Delivered</span>
          <p className="text-3xl font-extrabold text-emerald-600 mt-1">{deliveredOrders}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <span className="text-sm font-medium text-red-650">Not Found ❌</span>
          <p className="text-3xl font-extrabold text-red-650 mt-1">{notFoundOrders}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm col-span-2 sm:col-span-1">
          <span className="text-sm font-medium text-purple-600">Avg Satisfaction</span>
          <p className="text-3xl font-extrabold text-purple-600 mt-1">
            {avgRating} {avgRating !== "N/A" && "⭐"}
          </p>
        </div>
      </div>

      {/* Row 1: Analytics Charts */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 mb-8">
        {/* Peak Hours Chart */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-neutral-900 mb-4">Peak Orders Time Analysis</h3>
          <p className="text-xs text-neutral-500 mb-6">Distribution of orders throughout work hours.</p>

          <div className="flex h-48 items-end gap-1.5 border-b border-l border-neutral-200 pb-2 pl-2">
            {activeHours.map((bucket) => {
              const heightPercent = (bucket.count / maxHourCount) * 100;
              return (
                <div key={bucket.hour} className="flex flex-1 flex-col items-center group relative h-full justify-end">
                  <span className="absolute -top-7 scale-0 group-hover:scale-100 bg-neutral-900 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow transition-all duration-150 border border-neutral-800">
                    {bucket.count} order{bucket.count !== 1 ? "s" : ""}
                  </span>
                  <div
                    style={{ height: `${heightPercent || 4}%` }}
                    className={`w-full rounded-t ${
                      bucket.count > 0 ? "bg-amber-600 group-hover:bg-amber-700" : "bg-neutral-100"
                    } transition-all`}
                  />
                  <span className="text-[10px] text-neutral-400 mt-1.5 font-mono select-none">
                    {formatHour(bucket.hour)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Popularity Insights */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-neutral-900 mb-5">Popularity Insights</h3>

            {/* Drink Distribution */}
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Beverages Ordered</h4>
              <div className="space-y-2">
                {drinks.map((drink) => {
                  const count = drinkCounts[drink] || 0;
                  const pct = totalOrders ? (count / totalOrders) * 100 : 0;
                  return (
                    <div key={drink} className="flex items-center text-sm">
                      <span className="w-24 font-medium text-neutral-700">{drink}</span>
                      <div className="flex-1 h-3 bg-neutral-100 rounded overflow-hidden mx-3">
                        <div style={{ width: `${pct}%` }} className="h-full bg-amber-700 rounded" />
                      </div>
                      <span className="w-8 text-right font-semibold text-neutral-900">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Floor Distribution */}
            <div>
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Order Activity per Floor</h4>
              <div className="space-y-2">
                {floors.map((floor) => {
                  const count = floorCounts[floor] || 0;
                  const pct = totalOrders ? (count / totalOrders) * 100 : 0;
                  return (
                    <div key={floor} className="flex items-center text-sm">
                      <span className="w-24 truncate font-medium text-neutral-700" title={floor}>{floor}</span>
                      <div className="flex-1 h-3 bg-neutral-100 rounded overflow-hidden mx-3">
                        <div style={{ width: `${pct}%` }} className="h-full bg-neutral-600 rounded" />
                      </div>
                      <span className="w-8 text-right font-semibold text-neutral-900">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Customer Reviews Feed */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm mb-8">
        <h3 className="text-lg font-bold text-neutral-900 mb-2">Customer Feedback & Reviews</h3>
        <p className="text-xs text-neutral-500 mb-6">Real-time improvements and rating logs submitted by employees.</p>

        {reviews.length === 0 ? (
          <div className="text-center py-10 text-neutral-400 text-sm">No reviews submitted by employees yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[360px] overflow-y-auto pr-1">
            {[...reviews].map((rev) => (
              <div key={rev.id} className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-neutral-900 text-sm">{rev.employeeName}</span>
                    <span className="text-[10px] text-neutral-900 font-bold font-mono ml-2">({getDailyOrderNumber(rev.orderId, rev.createdAt)} - {rev.drinkName})</span>
                  </div>
                  <div className="flex items-center gap-1 select-none">
                    {(() => {
                      const reactionMap: Record<number, { emoji: string; label: string }> = {
                        1: { emoji: "😞", label: "Poor" },
                        2: { emoji: "😐", label: "OK" },
                        3: { emoji: "🙂", label: "Good" },
                        4: { emoji: "😋", label: "Delicious" },
                        5: { emoji: "🤩", label: "Amazing!" }
                      };
                      const reactObj = reactionMap[rev.rating] || { emoji: "❓", label: "" };
                      return (
                        <>
                          <span className="text-xl">{reactObj.emoji}</span>
                          <span className="text-[10px] bg-amber-100 px-1.5 py-0.5 rounded text-amber-900 font-bold">
                            {reactObj.label}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <p className="text-xs text-neutral-700 mt-2 bg-white rounded border border-neutral-100 p-2 shadow-inner">
                  &ldquo;{rev.comments}&rdquo;
                </p>
                <p className="text-[9px] text-neutral-400 mt-1.5 text-right font-mono">
                  {new Date(rev.createdAt).toLocaleDateString()} {new Date(rev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Row 3: Management Sections (4 Columns) */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Floor Management */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-base font-bold text-neutral-900">Manage Office Floors</h3>
              <select
                value={floorSortOrder}
                onChange={(e) => setFloorSortOrder(e.target.value as any)}
                className="text-xs border border-neutral-300 rounded px-1.5 py-0.5 bg-white text-neutral-600 outline-none"
              >
                <option value="default">Default</option>
                <option value="alpha">A-Z</option>
              </select>
            </div>
            
            <form onSubmit={handleAddFloorSubmit} className="space-y-2 mb-4">
              <input
                type="text"
                value={newFloorName}
                onChange={(e) => setNewFloorName(e.target.value)}
                placeholder="e.g. Floor 4"
                className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 focus:border-neutral-950 focus:outline-none focus:ring-1 focus:ring-neutral-950 shadow-sm"
              />
              <div className="flex">
                <button
                  type="submit"
                  className="bg-neutral-950 text-white rounded-lg px-4 py-1 text-xs font-bold shadow hover:bg-neutral-800 transition-all cursor-pointer w-fit"
                >
                  Add Floor +
                </button>
              </div>
            </form>

            <ul className="divide-y divide-neutral-100 max-h-56 overflow-y-auto pr-1">
              {sortedFloors.map((floor) => {
                const isEditing = editingFloorName === floor;
                return (
                  <li key={floor} className="py-2 text-sm">
                    {isEditing ? (
                      <div className="space-y-2 bg-neutral-50 p-2 rounded border border-neutral-200 shadow-inner">
                        <input
                          type="text"
                          required
                          value={editingFloorNewName}
                          onChange={(e) => setEditingFloorNewName(e.target.value)}
                          className="w-full rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-900 focus:border-neutral-950 focus:outline-none"
                        />
                        <div className="flex gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => setEditingFloorName(null)}
                            className="text-[11px] font-bold text-neutral-600 hover:text-neutral-800 px-2 py-1 bg-white border border-neutral-200 rounded transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditFloorSave(floor)}
                            className="text-[11px] font-bold text-white hover:bg-neutral-800 bg-neutral-950 px-2.5 py-1 rounded transition-all"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-neutral-800">{floor}</span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditFloorStart(floor)}
                            className="text-xs text-amber-700 hover:text-amber-900 font-semibold p-1 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteFloor(floor)}
                            className="text-xs text-red-500 hover:text-red-700 font-semibold p-1 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Employee Management */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-base font-bold text-neutral-900">Manage Employee List</h3>
              <select
                value={employeeSortOrder}
                onChange={(e) => setEmployeeSortOrder(e.target.value as any)}
                className="text-xs border border-neutral-300 rounded px-1.5 py-0.5 bg-white text-neutral-600 outline-none"
              >
                <option value="default">Default</option>
                <option value="alpha">A-Z</option>
              </select>
            </div>

            <form onSubmit={handleAddEmployeeSubmit} className="space-y-2 mb-4">
              <input
                type="text"
                required
                value={newEmployeeName}
                onChange={(e) => setNewEmployeeName(e.target.value)}
                placeholder="Employee Name"
                className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 focus:border-neutral-950 focus:outline-none focus:ring-1 focus:ring-neutral-950 shadow-sm"
              />
              <input
                type="text"
                value={newEmployeeContact}
                onChange={(e) => setNewEmployeeContact(e.target.value)}
                placeholder="Email/Mobile No"
                className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 focus:border-neutral-950 focus:outline-none focus:ring-1 focus:ring-neutral-950 shadow-sm"
              />
              <div className="flex">
                <button
                  type="submit"
                  className="bg-neutral-950 text-white rounded-lg px-4 py-1 text-xs font-bold shadow hover:bg-neutral-800 transition-all cursor-pointer w-fit"
                >
                  Add Employee +
                </button>
              </div>
            </form>

            <ul className="divide-y divide-neutral-100 max-h-56 overflow-y-auto pr-1">
              {sortedEmployees.map((emp) => (
                <li key={emp.id} className="py-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      {emp.avatar_url ? (
                        <img
                          src={emp.avatar_url}
                          alt={emp.name}
                          className="h-8 w-8 rounded-full object-cover border border-neutral-200 dark:border-neutral-800 shrink-0"
                        />
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold text-neutral-600 dark:text-neutral-300 uppercase">
                          {emp.name.substring(0, 2)}
                        </span>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-neutral-800 truncate">{emp.name}</span>
                        <span className="text-xs text-neutral-500 font-mono truncate max-w-[130px]" title={emp.contact}>
                          {emp.contact}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteEmployee(emp.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold p-1 hover:underline shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Brewer (Delivery) Management */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-base font-bold text-neutral-900">Manage Brewers</h3>
              <select
                value={brewerSortOrder}
                onChange={(e) => setBrewerSortOrder(e.target.value as any)}
                className="text-xs border border-neutral-300 rounded px-1.5 py-0.5 bg-white text-neutral-600 outline-none"
              >
                <option value="default">Default</option>
                <option value="alpha">A-Z</option>
              </select>
            </div>

            <form onSubmit={handleAddBrewerSubmit} className="space-y-2 mb-4">
              <input
                type="text"
                required
                value={newBrewerName}
                onChange={(e) => setNewBrewerName(e.target.value)}
                placeholder="Brewer Name"
                className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 focus:border-neutral-950 focus:outline-none focus:ring-1 focus:ring-neutral-950 shadow-sm"
              />
              <input
                type="text"
                value={newBrewerContact}
                onChange={(e) => setNewBrewerContact(e.target.value)}
                placeholder="Email/Mobile No"
                className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 focus:border-neutral-950 focus:outline-none focus:ring-1 focus:ring-neutral-950 shadow-sm"
              />
              <div className="flex">
                <button
                  type="submit"
                  className="bg-neutral-950 text-white rounded-lg px-4 py-1 text-xs font-bold shadow hover:bg-neutral-800 transition-all cursor-pointer w-fit"
                >
                  Add Brewer +
                </button>
              </div>
            </form>

            <ul className="divide-y divide-neutral-100 max-h-56 overflow-y-auto pr-1">
              {sortedBrewers.map((bwr) => {
                const isEditing = editingBrewerId === bwr.id;
                
                let badgeClass = "";
                if (bwr.status === "Active") badgeClass = "bg-emerald-50 text-emerald-700 ring-emerald-600/10";
                if (bwr.status === "On Break") badgeClass = "bg-amber-50 text-amber-700 ring-amber-600/10";
                if (bwr.status === "Off") badgeClass = "bg-neutral-50 text-neutral-700 ring-neutral-600/10";

                return (
                  <li key={bwr.id} className="py-2.5 text-sm">
                    {isEditing ? (
                      <div className="space-y-2 bg-neutral-50 p-2 rounded border border-neutral-200 shadow-inner">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase">Name</label>
                          <input
                            type="text"
                            required
                            value={editingBrewerName}
                            onChange={(e) => setEditingBrewerName(e.target.value)}
                            className="w-full rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-900 focus:border-neutral-950 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase">Email/Mobile</label>
                          <input
                            type="text"
                            value={editingBrewerContact}
                            onChange={(e) => setEditingBrewerContact(e.target.value)}
                            className="w-full rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-900 focus:border-neutral-950 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase">Status Availability</label>
                          <select
                            value={editingBrewerStatus}
                            onChange={(e) => setEditingBrewerStatus(e.target.value as any)}
                            className="w-full rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-900 focus:border-neutral-950 focus:outline-none bg-white"
                          >
                            <option value="Active">🟢 Active</option>
                            <option value="On Break">🟡 On Break</option>
                            <option value="Off">⚪ Off</option>
                          </select>
                        </div>
                        <div className="flex gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => setEditingBrewerId(null)}
                            className="text-[11px] font-bold text-neutral-600 hover:text-neutral-800 px-2 py-1 bg-white border border-neutral-200 rounded transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditBrewerSave(bwr.id)}
                            className="text-[11px] font-bold text-white hover:bg-neutral-800 bg-neutral-950 px-2.5 py-1 rounded transition-all"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          {bwr.avatar_url ? (
                            <img
                              src={bwr.avatar_url}
                              alt={bwr.name}
                              className="h-8 w-8 rounded-full object-cover border border-neutral-200 dark:border-neutral-800 shrink-0"
                            />
                          ) : (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold text-neutral-600 dark:text-neutral-300 uppercase">
                              {bwr.name.substring(0, 2)}
                            </span>
                          )}
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-neutral-800 truncate">{bwr.name}</span>
                              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold ring-1 ring-inset ${badgeClass}`}>
                                {bwr.status}
                              </span>
                            </div>
                            <span className="text-xs text-neutral-500 font-mono truncate max-w-[130px]" title={bwr.contact}>
                              {bwr.contact}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditBrewerStart(bwr)}
                            className="text-xs text-amber-700 hover:text-amber-900 font-semibold p-1 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteBrewer(bwr.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-semibold p-1 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Beverage Hours Configuration */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-neutral-900 mb-1">Service Availability</h3>
            <p className="text-xs text-neutral-500 mb-4">Set active ordering time slots. Employees can order if current time matches any slot.</p>
            
            {/* List of active slots */}
            {/* List of active slots */}
            <ul className="divide-y divide-neutral-200 max-h-36 overflow-y-auto p-3 mb-4 border border-neutral-200 rounded-lg bg-white">
              {serviceHours.length === 0 ? (
                <li className="text-xs text-neutral-500 text-center py-4 font-medium">No active service hours configured.</li>
              ) : (
                serviceHours.map((slot) => {
                  const isEditing = editingSlotId === slot.id;
                  return (
                    <li key={slot.id} className="py-2.5 first:pt-0 last:pb-0 text-sm">
                      {isEditing ? (
                        <div className="space-y-2 bg-neutral-50 p-2 rounded border border-neutral-200 shadow-inner">
                          <input
                            type="text"
                            value={editingSlotLabel}
                            onChange={(e) => setEditingSlotLabel(e.target.value)}
                            placeholder="Slot Label"
                            className="w-full rounded border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900 focus:outline-none"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-bold text-neutral-500 uppercase">Start:</label>
                              <input
                                type="time"
                                value={editingSlotStartTime}
                                onChange={(e) => setEditingSlotStartTime(e.target.value)}
                                className="w-full rounded border border-neutral-300 bg-white px-1 py-0.5 text-xs text-neutral-900 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-neutral-500 uppercase">End:</label>
                              <input
                                type="time"
                                value={editingSlotEndTime}
                                onChange={(e) => setEditingSlotEndTime(e.target.value)}
                                className="w-full rounded border border-neutral-300 bg-white px-1 py-0.5 text-xs text-neutral-900 focus:outline-none"
                              />
                            </div>
                          </div>
                          <div className="flex gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => setEditingSlotId(null)}
                              className="text-[10px] font-bold text-neutral-600 hover:text-neutral-800 px-2 py-1 bg-white border border-neutral-200 rounded transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditSlotSave(slot.id)}
                              className="text-[10px] font-bold text-white bg-neutral-950 px-2.5 py-1 rounded transition-all"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 pr-2">
                            <p className="font-bold text-neutral-900 truncate">{slot.label}</p>
                            <p className="text-xs font-bold text-neutral-900 font-mono mt-0.5">{slot.start_time} - {slot.end_time}</p>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleEditSlotStart(slot)}
                              className="text-xs text-amber-700 hover:text-amber-900 font-semibold p-1 hover:underline cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteServiceHour(slot.id)}
                              className="text-xs text-red-500 hover:text-red-700 font-semibold p-1 hover:underline cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })
              )}
            </ul>

            {/* Add new slot form */}
            <form onSubmit={handleAddSlotSubmit} className="space-y-2 border-t border-neutral-100 pt-3">
              <div>
                <input
                  type="text"
                  required
                  placeholder="Slot Label (e.g. Afternoon Tea)"
                  value={newSlotLabel}
                  onChange={(e) => setNewSlotLabel(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-neutral-950 focus:outline-none shadow-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Start:</label>
                  <input
                    type="time"
                    required
                    value={newSlotStartTime}
                    onChange={(e) => setNewSlotStartTime(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900 focus:border-neutral-950 focus:outline-none shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">End:</label>
                  <input
                    type="time"
                    required
                    value={newSlotEndTime}
                    onChange={(e) => setNewSlotEndTime(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900 focus:border-neutral-950 focus:outline-none shadow-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-neutral-950 text-white rounded-lg py-2 mt-2 text-xs font-bold shadow hover:bg-neutral-800 transition-all cursor-pointer"
              >
                Add Slot ⏰
              </button>
            </form>

            {/* 3-Hour Cooldown Limit Settings */}
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <h4 className="text-xs font-bold text-neutral-900 mb-1">Ordering Limitations</h4>
              <p className="text-[10px] text-neutral-500 mb-3">Enforce a strict 3-hour cooldown delay between beverage requests for employees.</p>
              <button
                type="button"
                onClick={() => toggleCooldownLimit(!cooldownLimitEnabled)}
                className={`w-full py-2 rounded-lg text-xs font-bold shadow transition-all cursor-pointer border ${
                  cooldownLimitEnabled 
                    ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" 
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                {cooldownLimitEnabled ? "Remove 3-Hour Limit 🔓" : "Add 3-Hour Limit 🔒"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Full Order History Log for Selected Day */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center justify-between">
          <span>Order Logs ({filterMode === "all" ? "All Time" : activeFilterDate})</span>
          <span className="text-xs font-semibold text-neutral-500">
            {sortedHistory.length} orders
          </span>
        </h3>
        
        {sortedHistory.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 text-sm">
            No orders recorded for {filterMode === "all" ? "All Time" : activeFilterDate}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 text-left text-sm text-neutral-500">
              <thead className="bg-neutral-50 text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Beverage Info</th>
                  <th className="px-4 py-3">Time Placed</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white text-neutral-800">
                {sortedHistory.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50/50">
                    <td className="px-4 py-3 font-bold text-neutral-900 font-mono" title={order.id}>
                      {getDailyOrderNumber(order.id, order.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-neutral-900">{order.employeeName}</td>
                    <td className="px-4 py-3 text-neutral-600">{order.floor}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-neutral-900">{order.drink}</span>
                      <span className="text-xs text-neutral-400 ml-1">({order.sugar})</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${getStatusTextClass(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    {/* Mandatory Review Modal Overlay */}
    {unreviewedOrder && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl animate-fade-in-up">
          {(() => {
            const dailyNum = getDailyOrderNumber(unreviewedOrder.id, unreviewedOrder.createdAt);
            const reactions = [
              { value: 1, emoji: "😞", label: "Poor" },
              { value: 2, emoji: "😐", label: "OK" },
              { value: 3, emoji: "🙂", label: "Good" },
              { value: 4, emoji: "😋", label: "Delicious" },
              { value: 5, emoji: "🤩", label: "Amazing!" }
            ];
            return (
              <>
                <div className="text-center">
                  <span className="text-5xl select-none">🎉</span>
                  {dailyNum && (
                    <div className="text-4xl font-extrabold text-neutral-900 mt-3 select-none">
                      {dailyNum}
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-neutral-955 mt-1">
                    Confirm Delivery & Rate
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1.5">
                    Your order of {unreviewedOrder.drink} ({unreviewedOrder.sugar}) has been delivered! Please rate it to confirm delivery.
                  </p>
                </div>

                <form onSubmit={handleAdminReviewSubmit} className="mt-6 space-y-4 text-left">
                  {/* Reaction-based Selector */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                      How was it?
                    </label>
                    <div className="flex gap-2">
                      {reactions.map((r) => (
                        <button
                          type="button"
                          key={r.value}
                          onClick={() => setAdminReviewRating(r.value)}
                          className={`flex flex-col items-center p-2 rounded-xl border transition-all cursor-pointer flex-1 ${
                            adminReviewRating === r.value
                              ? "bg-amber-50 border-amber-300 scale-105 shadow-sm font-semibold"
                              : "bg-white border-neutral-200 hover:bg-neutral-50"
                          }`}
                        >
                          <span className="text-2xl mb-1">{r.emoji}</span>
                          <span className="text-[10px] font-bold text-neutral-750">{r.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Feedback Comment */}
                  <div>
                    <label htmlFor="modal-comments" className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                      Review comments / suggestions:
                    </label>
                    <textarea
                      id="modal-comments"
                      rows={3}
                      required
                      value={adminReviewComments}
                      onChange={(e) => setAdminReviewComments(e.target.value)}
                      placeholder="e.g. Perfectly brewed! Thank you!"
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-950 focus:outline-none shadow-sm"
                    />
                  </div>

                  <div className="flex gap-3 justify-end mt-6">
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-xs font-bold text-white shadow transition-all cursor-pointer flex-grow text-center"
                    >
                      Confirm & Submit Review ✓
                    </button>
                  </div>
                </form>
              </>
            );
          })()}
        </div>
      </div>
    )}
  </div>
);
}
