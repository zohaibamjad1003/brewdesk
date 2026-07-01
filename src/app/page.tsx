"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBrew } from "../context/BrewContext";

export default function Home() {
  const router = useRouter();
  const {
    floors,
    drinks,
    sugarOptions,
    currentUser,
    loading,
    login,
    signUp,
    placeOrder,
    orders,
    reviews,
    submitReview,
    systemDate,
    brewers,
  } = useBrew();

  // Automatic client-side redirect based on user role
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "Brewer") {
        router.push("/brewer");
      } else if (currentUser.role === "Admin") {
        router.push("/admin");
      }
    }
  }, [currentUser, router]);

  // Login form states
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authRole, setAuthRole] = useState<"Employee" | "Brewer" | "Admin">("Employee");
  const [authError, setAuthError] = useState("");

  // Signup form states
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpRole, setSignUpRole] = useState<"Employee" | "Brewer">("Employee");
  const [signUpError, setSignUpError] = useState("");

  // Submission spinner
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Order form states
  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedDrink, setSelectedDrink] = useState("");
  const [selectedSugar, setSelectedSugar] = useState("");
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState("");

  // Review states
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComments, setReviewComments] = useState("");

  // Order limitation states (1 active order at a time, 1-hour cooldown)
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    if (!currentUser || !orders) {
      setHasActiveOrder(false);
      setCooldownRemaining(0);
      return;
    }

    const myAllOrders = orders.filter((o) => o.employeeName === currentUser.name);
    
    // Check for active orders (Pending or On the way)
    const hasActive = myAllOrders.some((o) => o.status === "Pending" || o.status === "On the way");
    setHasActiveOrder(hasActive);

    // Calculate hourly cooldown based on the last placed order
    const lastOrder = [...myAllOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    const calculateCooldown = () => {
      if (!lastOrder) {
        setCooldownRemaining(0);
        return;
      }
      const realNow = new Date();
      const currentSimTime = new Date(`${systemDate}T${realNow.toTimeString().split(" ")[0]}`);
      const lastOrderTime = new Date(lastOrder.createdAt);
      const diffMs = currentSimTime.getTime() - lastOrderTime.getTime();
      const diffMins = diffMs / (1000 * 60);

      if (diffMins < 60) {
        setCooldownRemaining(Math.ceil(60 - diffMins));
      } else {
        setCooldownRemaining(0);
      }
    };

    calculateCooldown();
    const interval = setInterval(calculateCooldown, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [currentUser, orders, systemDate]);

  // Sync default floor when the simulated user changes
  useEffect(() => {
    if (currentUser?.floor) {
      setSelectedFloor(currentUser.floor);
    } else {
      setSelectedFloor(floors[0] || "");
    }
    setSelectedDrink(drinks[0] || "");
    setSelectedSugar(sugarOptions[0] || "");
  }, [currentUser, floors, drinks, sugarOptions]);

  // Handle Login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsSubmitting(true);
    const result = await login(authEmail, authPassword, authRole);
    setIsSubmitting(false);
    if (!result.success) {
      setAuthError(result.error || "Login credentials failed.");
    } else {
      setAuthEmail("");
      setAuthPassword("");
    }
  };

  // Handle Signup submission
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError("");
    setIsSubmitting(true);
    const result = await signUp(signUpName, signUpEmail, signUpPassword, signUpRole);
    setIsSubmitting(false);
    if (!result.success) {
      setSignUpError(result.error || "Sign-up account creation failed.");
    } else {
      setSignUpName("");
      setSignUpEmail("");
      setSignUpPassword("");
      if (result.error) {
        alert(result.error); // Display signup confirmation emails details
      }
    }
  };

  // Handle placing a new order
  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    // Safety checks
    const myAllOrders = orders.filter((o) => o.employeeName === currentUser.name);
    const hasActive = myAllOrders.some((o) => o.status === "Pending" || o.status === "On the way");
    if (hasActive) return;

    const lastOrder = [...myAllOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    if (lastOrder) {
      const realNow = new Date();
      const currentSimTime = new Date(`${systemDate}T${realNow.toTimeString().split(" ")[0]}`);
      const diffMins = (currentSimTime.getTime() - new Date(lastOrder.createdAt).getTime()) / (1000 * 60);
      if (diffMins < 60) return;
    }

    if (!selectedFloor || !selectedDrink || !selectedSugar) return;

    placeOrder(currentUser.name, selectedFloor, selectedDrink, selectedSugar);

    setNotificationMsg(`Order placed successfully for ${selectedDrink}!`);
    setShowNotification(true);

    const timer = setTimeout(() => {
      setShowNotification(false);
    }, 4000);

    return () => clearTimeout(timer);
  };

  // Handle Review submission
  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewOrderId) return;

    submitReview(reviewOrderId, reviewRating, reviewComments);

    setReviewOrderId(null);
    setReviewRating(5);
    setReviewComments("");

    setNotificationMsg("Thank you for your feedback!");
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 4000);
  };

  // Get current user's orders placed on the active system date (newest first)
  const myOrders = currentUser
    ? orders
        .filter((order) => order.employeeName === currentUser.name && order.createdAt.startsWith(systemDate))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  // Helper to render status badge with tailored colors
  const getStatusBadge = (status: "Pending" | "On the way" | "Delivered") => {
    switch (status) {
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Pending
          </span>
        );
      case "On the way":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800 ring-1 ring-inset ring-sky-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
            On the way
          </span>
        );
      case "Delivered":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Delivered
          </span>
        );
    }
  };

  // Helper to fill pre-defined credentials for development bypasses
  const applyBypass = (email: string, role: "Employee" | "Brewer" | "Admin") => {
    setAuthEmail(email);
    setAuthPassword("123456"); // Assuming a default passcode is set up for seeded test users
    setAuthRole(role);
  };

  // RENDER LOADING: Display splash/spinner while resolving Supabase session
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-800" />
        <p className="mt-4 text-sm font-semibold text-neutral-500">Resolving auth session...</p>
      </div>
    );
  }

  // RENDER GATE: If not logged in, render Signup/Login form (Mobile Card Style)
  if (!currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl border border-neutral-200 shadow-lg">
          <div className="text-center">
            <span className="text-5xl select-none">☕</span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-neutral-900 animate-pulse">
              Welcome to BrewDesk
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              Supabase Auth Workstation Gate.
            </p>
          </div>

          {/* Form Tabs */}
          <div className="flex border-b border-neutral-200 select-none">
            <button
              onClick={() => {
                setActiveTab("login");
                setAuthError("");
              }}
              className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 ${
                activeTab === "login"
                  ? "border-neutral-950 text-neutral-900"
                  : "border-transparent text-neutral-400 hover:text-neutral-600"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab("signup");
                setSignUpError("");
              }}
              className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 ${
                activeTab === "signup"
                  ? "border-neutral-950 text-neutral-900"
                  : "border-transparent text-neutral-400 hover:text-neutral-600"
              }`}
            >
              Sign Up (Register)
            </button>
          </div>

          {/* Tab 1: SIGN IN */}
          {activeTab === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {authError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3.5 text-xs font-semibold text-red-700">
                  {authError}
                </div>
              )}
              
              <div>
                <label htmlFor="login-email" className="block text-sm font-semibold text-neutral-700">
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="e.g. alex@brewdesk.com"
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-950 focus:outline-none shadow-sm"
                />
              </div>

              <div>
                <label htmlFor="login-pass" className="block text-sm font-semibold text-neutral-700">
                  Password
                </label>
                <input
                  id="login-pass"
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-950 focus:outline-none shadow-sm"
                />
              </div>

              <div>
                <label htmlFor="login-role" className="block text-sm font-semibold text-neutral-700">
                  Sign In As Role
                </label>
                <select
                  id="login-role"
                  value={authRole}
                  onChange={(e) => setAuthRole(e.target.value as any)}
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-950 focus:outline-none shadow-sm"
                >
                  <option value="Employee">Employee</option>
                  <option value="Brewer">Brewer</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-neutral-800 transition-all mt-4 disabled:opacity-50"
              >
                {isSubmitting ? "Signing In..." : "Sign In"}
              </button>

              {/* Dev bypass helper fills */}
              <div className="mt-6 border-t border-neutral-100 pt-4 text-center">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Quick Autofill Logins</span>
                <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => applyBypass("alex@brewdesk.com", "Employee")}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded text-neutral-700 transition-all"
                  >
                    Employee (Alex)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBypass("raju@brewdesk.com", "Brewer")}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded text-neutral-700 transition-all"
                  >
                    Brewer (Raju)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBypass("admin@brewdesk.com", "Admin")}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded text-neutral-700 transition-all"
                  >
                    Admin Panel
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Tab 2: SIGN UP */}
          {activeTab === "signup" && (
            <form onSubmit={handleSignUpSubmit} className="space-y-4">
              {signUpError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3.5 text-xs font-semibold text-red-700">
                  {signUpError}
                </div>
              )}
              <div>
                <label htmlFor="signup-name" className="block text-sm font-semibold text-neutral-700">
                  Full Name
                </label>
                <input
                  id="signup-name"
                  type="text"
                  required
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  placeholder="e.g. Peter Parker"
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-950 focus:outline-none shadow-sm"
                />
              </div>

              <div>
                <label htmlFor="signup-email" className="block text-sm font-semibold text-neutral-700">
                  Email Address
                </label>
                <input
                  id="signup-email"
                  type="email"
                  required
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  placeholder="e.g. peter@brewdesk.com"
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-950 focus:outline-none shadow-sm"
                />
              </div>

              <div>
                <label htmlFor="signup-pass" className="block text-sm font-semibold text-neutral-700">
                  Password
                </label>
                <input
                  id="signup-pass"
                  type="password"
                  required
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-950 focus:outline-none shadow-sm"
                />
              </div>

              <div>
                <label htmlFor="signup-role" className="block text-sm font-semibold text-neutral-700">
                  Register As Role
                </label>
                <select
                  id="signup-role"
                  value={signUpRole}
                  onChange={(e) => setSignUpRole(e.target.value as any)}
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-950 focus:outline-none shadow-sm"
                >
                  <option value="Employee">Employee (Order Placement)</option>
                  <option value="Brewer">Brewer (Beverage Preparation)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-neutral-800 transition-all mt-4 disabled:opacity-50"
              >
                {isSubmitting ? "Creating Account..." : "Create Account & Log In"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // RENDER NON-EMPLOYEE REDIRECTS: If Brewer or Admin landing on Home, display redirection options
  if (currentUser.role !== "Employee") {
    return (
      <div className="flex-grow flex items-center justify-center p-8 text-center">
        <div className="max-w-md w-full rounded-2xl border border-neutral-200 bg-white p-8 shadow-md">
          <span className="text-5xl select-none">🏢</span>
          <h2 className="text-xl font-bold text-neutral-950 mt-4">Workstation Selection</h2>
          <p className="text-sm text-neutral-500 mt-2">
            You are logged in as <span className="font-semibold text-neutral-800">{currentUser.name}</span> ({currentUser.role}).
          </p>
          <div className="mt-6 flex flex-col gap-3">
            {currentUser.role === "Brewer" && (
              <Link
                href="/brewer"
                className="w-full inline-flex justify-center rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-neutral-800 transition-all"
              >
                Go to Brewer Workstation 🚲
              </Link>
            )}
            {currentUser.role === "Admin" && (
              <>
                <Link
                  href="/brewer"
                  className="w-full inline-flex justify-center rounded-lg bg-neutral-100 hover:bg-neutral-200 px-4 py-2.5 text-sm font-bold text-neutral-800 transition-all"
                >
                  View Brewer Queue 🚲
                </Link>
                <Link
                  href="/admin"
                  className="w-full inline-flex justify-center rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-neutral-800 transition-all"
                >
                  View Admin Dashboard 📊
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // RENDER EMPLOYEE PAGE (Order form and feedback triggers)
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {showNotification && (
        <div className="fixed bottom-5 right-5 z-50 flex max-w-md animate-bounce rounded-lg border border-emerald-100 bg-white p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-xl">✅</span>
            <p className="text-sm font-medium text-neutral-900">{notificationMsg}</p>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="mb-8 border-b border-neutral-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">
            Place a Beverage Order
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Select your floor and beverage preferences. Your order goes straight to the Brewer workstation.
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-center shadow-sm">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">Active Work Day</span>
          <span className="text-sm font-bold text-neutral-800">{systemDate}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Order Form Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Review Input Box (Shows only when reviewOrderId is set) */}
          {reviewOrderId && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
              <h3 className="text-base font-bold text-amber-950 flex items-center gap-2">
                <span>⭐ Leave Feedback for Delivered Order</span>
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Tell us how your beverage was and what improvements we can make.
              </p>

              <form onSubmit={handleReviewSubmit} className="mt-4 space-y-4">
                {/* 5-Star Selector */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Rating:
                  </label>
                  <div className="flex gap-2 text-2xl">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setReviewRating(star)}
                        className={`transition-all hover:scale-110 ${
                          star <= reviewRating ? "opacity-100" : "opacity-35"
                        }`}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feedback Comment */}
                <div>
                  <label htmlFor="comments-input" className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                    Improvements / Comments
                  </label>
                  <textarea
                    id="comments-input"
                    rows={3}
                    required
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    placeholder="e.g. Tea was perfect! Or maybe add more sugar options next time..."
                    className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-950 focus:outline-none shadow-sm"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setReviewOrderId(null);
                      setReviewComments("");
                    }}
                    className="px-3.5 py-1.5 rounded-lg border border-neutral-300 bg-white text-xs font-bold text-neutral-700 hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-neutral-950 text-xs font-bold text-white hover:bg-neutral-800 shadow"
                  >
                    Submit Review
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Beverage request form */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-neutral-900 mb-6">Beverage Request Form</h2>

            <form onSubmit={handleOrderSubmit} className="space-y-6">
              {/* Employee Name (Disabled Auto-fill) */}
              <div>
                <label className="block text-sm font-semibold text-neutral-700">
                  Employee Name
                </label>
                <div className="mt-1.5 relative">
                  <input
                    type="text"
                    disabled
                    value={currentUser.name}
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-600 outline-none cursor-not-allowed shadow-inner"
                  />
                  <span className="absolute right-3 top-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Auto-Filled
                  </span>
                </div>
              </div>

              {/* Floor Dropdown */}
              <div>
                <label htmlFor="floor-select" className="block text-sm font-semibold text-neutral-700">
                  Select Floor
                </label>
                <select
                  id="floor-select"
                  value={selectedFloor}
                  onChange={(e) => setSelectedFloor(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-all shadow-sm"
                >
                  {floors.map((floor) => (
                    <option key={floor} value={floor}>
                      {floor}
                    </option>
                  ))}
                </select>
              </div>

              {/* Drink Dropdown */}
              <div>
                <label htmlFor="drink-select" className="block text-sm font-semibold text-neutral-700">
                  Select Drink
                </label>
                <select
                  id="drink-select"
                  value={selectedDrink}
                  onChange={(e) => setSelectedDrink(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-all shadow-sm"
                >
                  {drinks.map((drink) => (
                    <option key={drink} value={drink}>
                      {drink}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sugar Preference Radio/Buttons */}
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                  Sugar Preference
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {sugarOptions.map((option) => {
                    const isSelected = selectedSugar === option;
                    return (
                      <button
                        type="button"
                        key={option}
                        onClick={() => setSelectedSugar(option)}
                        className={`flex items-center justify-center rounded-lg border px-4 py-3 text-sm font-medium transition-all shadow-sm ${
                          isSelected
                            ? "border-neutral-950 bg-neutral-950 text-white"
                            : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                        }`}
                      >
                        {option === "Sugar" ? "🍬 With Sugar" : "❌ Sugar-Free"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Place Order Button with Gating and Cooldown display */}
              {hasActiveOrder ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3.5 text-xs font-semibold text-amber-800 text-center select-none shadow-sm animate-pulse">
                  ⏳ Active Order In Progress: You can order again once your current beverage is delivered.
                </div>
              ) : cooldownRemaining > 0 ? (
                <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-3.5 text-xs font-semibold text-neutral-500 text-center select-none shadow-sm">
                  ☕ Hourly Cooldown: Please wait {cooldownRemaining} minutes before placing your next order.
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full flex justify-center items-center rounded-lg bg-amber-700 px-4 py-3 text-sm font-bold text-white shadow hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all"
                >
                  Place Order ☕
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Live Order Tracker (Right Side) */}
        <div className="space-y-6">
          {/* Brewer Status Board */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-neutral-900 mb-4">Brewers Board</h2>
            <div className="space-y-3">
              {brewers.map((bwr) => {
                let badgeClass = "";
                if (bwr.status === "Active") badgeClass = "bg-emerald-50 text-emerald-800 ring-emerald-600/20";
                if (bwr.status === "On Break") badgeClass = "bg-amber-50 text-amber-800 ring-amber-600/20";
                if (bwr.status === "Absent") badgeClass = "bg-red-50 text-red-800 ring-red-600/20";

                return (
                  <div key={bwr.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0 border-neutral-100">
                    <span className="font-semibold text-neutral-800">{bwr.name}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${badgeClass}`}>
                      {bwr.status === "Active" ? "🟢 Active" : bwr.status === "On Break" ? "🟡 On Break" : "🔴 Absent"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm flex flex-col">
            <h2 className="text-lg font-bold text-neutral-900 mb-4 flex items-center justify-between">
              <span>My Recent Orders</span>
              <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
                {myOrders.length} total
              </span>
            </h2>

            {myOrders.length === 0 ? (
              <div className="flex flex-col flex-1 items-center justify-center py-12 text-center">
                <span className="text-4xl mb-3">📭</span>
                <p className="text-sm font-medium text-neutral-500">No orders placed yet.</p>
                <p className="text-xs text-neutral-400 mt-1">Use the form on the left to order.</p>
              </div>
            ) : (
              <div className="flex-1 divide-y divide-neutral-100 overflow-y-auto max-h-[420px] pr-1">
                {myOrders.map((order) => {
                  const hasReview = reviews.some((r) => r.orderId === order.id);
                  return (
                    <div key={order.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-sm text-neutral-900">
                            {order.drink}
                            <span className="text-xs font-normal text-neutral-500 ml-1.5">
                              ({order.sugar})
                            </span>
                          </h3>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            📍 {order.floor}
                          </p>
                          <p className="text-[10px] text-neutral-400 mt-1">
                            Ordered at{" "}
                            {new Date(order.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(order.status)}

                          {/* Leave Feedback trigger for delivered orders */}
                          {order.status === "Delivered" && (
                            <div className="mt-1">
                              {hasReview ? (
                                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 select-none">
                                  <span>✓</span> Reviewed
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setReviewOrderId(order.id)}
                                  className="text-xs text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                                >
                                  ⭐ Rate Beverage
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
