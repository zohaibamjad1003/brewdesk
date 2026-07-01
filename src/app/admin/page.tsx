"use client";

import { useState } from "react";
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
    advanceSystemDate,
    currentUser,
    loading,
  } = useBrew();

  // Selected date filter (empty string falls back to systemDate)
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
  const [editingBrewerStatus, setEditingBrewerStatus] = useState<"Active" | "On Break" | "Absent">("Active");

  // Sorting options
  const [floorSortOrder, setFloorSortOrder] = useState<"default" | "alpha">("default");
  const [employeeSortOrder, setEmployeeSortOrder] = useState<"default" | "alpha">("default");
  const [brewerSortOrder, setBrewerSortOrder] = useState<"default" | "alpha">("default");

  // Toast for New Day Simulation
  const [showToast, setShowToast] = useState(false);

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

  // Filter orders to compute analytics matching the active day
  const dayOrders = orders.filter(
    (order) => order.createdAt.split("T")[0] === activeFilterDate
  );

  // 1. Stats calculations for selected day
  const totalOrders = dayOrders.length;
  const pendingOrders = dayOrders.filter((o) => o.status === "Pending").length;
  const onTheWayOrders = dayOrders.filter((o) => o.status === "On the way").length;
  const deliveredOrders = dayOrders.filter((o) => o.status === "Delivered").length;

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
  const handleEditBrewerStart = (bwr: { id: string; name: string; contact: string; status: "Active" | "On Break" | "Absent" }) => {
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

  // Trigger simulated new day
  const handleNewDayClick = () => {
    advanceSystemDate();
    setSelectedFilterDate(""); // automatically focus back to the new systemDate
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  const getStatusTextClass = (status: "Pending" | "On the way" | "Delivered") => {
    switch (status) {
      case "Pending":
        return "text-amber-700 bg-amber-50 ring-amber-600/20";
      case "On the way":
        return "text-sky-700 bg-sky-50 ring-sky-600/20";
      case "Delivered":
        return "text-emerald-700 bg-emerald-50 ring-emerald-600/20";
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-5 right-5 z-50 flex max-w-md animate-bounce rounded-lg border border-amber-100 bg-white p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-xl">☀️</span>
            <div>
              <p className="text-sm font-bold text-neutral-900">New Day Started!</p>
              <p className="text-xs text-neutral-500 mt-0.5">Today's orders set to 0. Yesterday's records archived.</p>
            </div>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="mb-8 border-b border-neutral-200 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">
            Admin Control Panel
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Active Simulated Date: <span className="font-semibold text-neutral-800">{systemDate}</span>
          </p>
        </div>

        {/* Date Filter & New Day Sim Action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="date-select" className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Filter Day:
            </label>
            <select
              id="date-select"
              value={activeFilterDate}
              onChange={(e) => setSelectedFilterDate(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-700 shadow-sm focus:border-neutral-950 focus:outline-none"
            >
              {uniqueDates.map((d) => (
                <option key={d} value={d}>
                  {d === systemDate ? `Today (${d})` : d}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleNewDayClick}
            className="flex items-center gap-1.5 rounded-lg bg-amber-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-amber-800 transition-all focus:outline-none"
          >
            ☀️ Start New Day
          </button>
        </div>
      </div>

      {/* Day Identifier Sub-banner */}
      <div className="rounded-lg bg-neutral-100 px-4 py-3 mb-6 flex items-center justify-between text-xs font-bold text-neutral-600 uppercase tracking-wider shadow-inner">
        <span>Viewing Analytics for: {activeFilterDate === systemDate ? "Today" : activeFilterDate}</span>
        {activeFilterDate !== systemDate && (
          <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase">Archived Log</span>
        )}
      </div>

      {/* Grid: 5 Core Counters (Includes Rating) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 mb-8">
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
            {[...reviews].reverse().map((rev) => (
              <div key={rev.id} className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-neutral-900 text-sm">{rev.employeeName}</span>
                    <span className="text-[10px] text-neutral-400 font-mono ml-2">({rev.drinkName})</span>
                  </div>
                  <div className="text-amber-500 text-sm font-semibold select-none">
                    {"⭐".repeat(rev.rating)}
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

      {/* Row 3: Management Sections (3 Columns) */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3 mb-8">
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
            
            <form onSubmit={handleAddFloorSubmit} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newFloorName}
                onChange={(e) => setNewFloorName(e.target.value)}
                placeholder="e.g. Floor 4"
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-neutral-950 focus:outline-none focus:ring-1 focus:ring-neutral-950 shadow-sm"
              />
              <button
                type="submit"
                className="bg-neutral-950 text-white rounded-lg px-3 py-1.5 text-sm font-bold shadow hover:bg-neutral-800 transition-all"
              >
                Add
              </button>
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
                className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-neutral-950 focus:outline-none focus:ring-1 focus:ring-neutral-950 shadow-sm"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newEmployeeContact}
                  onChange={(e) => setNewEmployeeContact(e.target.value)}
                  placeholder="Email/Mobile No"
                  className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-neutral-950 focus:outline-none focus:ring-1 focus:ring-neutral-950 shadow-sm"
                />
                <button
                  type="submit"
                  className="bg-neutral-950 text-white rounded-lg px-3 py-1.5 text-sm font-bold shadow hover:bg-neutral-800 transition-all"
                >
                  Add
                </button>
              </div>
            </form>

            <ul className="divide-y divide-neutral-100 max-h-56 overflow-y-auto pr-1">
              {sortedEmployees.map((emp) => {
                const isEditing = editingEmployeeId === emp.id;
                return (
                  <li key={emp.id} className="py-2.5 text-sm">
                    {isEditing ? (
                      <div className="space-y-2 bg-neutral-50 p-2 rounded border border-neutral-200 shadow-inner">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase">Name</label>
                          <input
                            type="text"
                            required
                            value={editingEmployeeName}
                            onChange={(e) => setEditingEmployeeName(e.target.value)}
                            className="w-full rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-900 focus:border-neutral-950 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase">Email/Mobile</label>
                          <input
                            type="text"
                            value={editingEmployeeContact}
                            onChange={(e) => setEditingEmployeeContact(e.target.value)}
                            className="w-full rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-900 focus:border-neutral-950 focus:outline-none"
                          />
                        </div>
                        <div className="flex gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => setEditingEmployeeId(null)}
                            className="text-[11px] font-bold text-neutral-600 hover:text-neutral-800 px-2 py-1 bg-white border border-neutral-200 rounded transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditEmployeeSave(emp.id)}
                            className="text-[11px] font-bold text-white hover:bg-neutral-800 bg-neutral-950 px-2.5 py-1 rounded transition-all"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="font-semibold text-neutral-800 truncate">{emp.name}</span>
                          <span className="text-xs text-neutral-500 font-mono truncate max-w-[130px]" title={emp.contact}>
                            {emp.contact}
                          </span>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditEmployeeStart(emp)}
                            className="text-xs text-amber-700 hover:text-amber-900 font-semibold p-1 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteEmployee(emp.id)}
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
                className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-neutral-950 focus:outline-none focus:ring-1 focus:ring-neutral-950 shadow-sm"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBrewerContact}
                  onChange={(e) => setNewBrewerContact(e.target.value)}
                  placeholder="Email/Mobile No"
                  className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-neutral-950 focus:outline-none focus:ring-1 focus:ring-neutral-950 shadow-sm"
                />
                <button
                  type="submit"
                  className="bg-neutral-950 text-white rounded-lg px-3 py-1.5 text-sm font-bold shadow hover:bg-neutral-800 transition-all"
                >
                  Add
                </button>
              </div>
            </form>

            <ul className="divide-y divide-neutral-100 max-h-56 overflow-y-auto pr-1">
              {sortedBrewers.map((bwr) => {
                const isEditing = editingBrewerId === bwr.id;
                
                let badgeClass = "";
                if (bwr.status === "Active") badgeClass = "bg-emerald-50 text-emerald-700 ring-emerald-600/10";
                if (bwr.status === "On Break") badgeClass = "bg-amber-50 text-amber-700 ring-amber-600/10";
                if (bwr.status === "Absent") badgeClass = "bg-red-50 text-red-700 ring-red-600/10";

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
                            <option value="Absent">🔴 Absent</option>
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
                        <div className="flex flex-col min-w-0 pr-2">
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
      </div>

      {/* Row 4: Full Order History Log for Selected Day */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center justify-between">
          <span>Order Logs ({activeFilterDate})</span>
          <span className="text-xs font-semibold text-neutral-500">
            {sortedHistory.length} orders
          </span>
        </h3>
        
        {sortedHistory.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 text-sm">
            No orders recorded for {activeFilterDate}.
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
                    <td className="px-4 py-3 font-mono text-xs text-neutral-400">{order.id}</td>
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
    </div>
  );
}
