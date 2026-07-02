"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useBrew } from "../context/BrewContext";

const EditGraceTrigger = ({ 
  order, 
  onEditClick 
}: { 
  order: any; 
  onEditClick: () => void 
}) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (order.status !== "Pending") {
      setTimeLeft(0);
      return;
    }

    const checkTime = () => {
      const created = new Date(order.createdAt).getTime();
      const elapsed = Date.now() - created;
      const remaining = Math.max(0, Math.ceil((30000 - elapsed) / 1000));
      setTimeLeft(remaining);
    };

    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [order.createdAt, order.status]);

  if (timeLeft <= 0) return null;

  return (
    <div className="flex items-center gap-2 mt-1 select-none">
      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded animate-pulse">
        ⏱️ Edit window: {timeLeft}s
      </span>
      <button
        type="button"
        onClick={onEditClick}
        className="text-[10px] font-bold text-neutral-900 bg-white hover:bg-neutral-100 px-2 py-0.5 rounded border border-neutral-300 cursor-pointer transition-all shadow-sm flex items-center gap-0.5"
      >
        <span>Edit Order</span> ✏️
      </button>
    </div>
  );
};

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
    serviceHours,
    getDailyOrderNumber,
    updateOrderDetails,
    cooldownLimitEnabled,
  } = useBrew();

  // Automatic client-side redirect based on user role (Only redirect Brewers)
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "Brewer") {
        router.push("/brewer");
      }
    }
  }, [currentUser, router]);

  // Login form states
  const [activeTab, setActiveTab] = useState<"login" | "signup">("signup");

  // Detect return visitors who have created an account or logged in before
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasAccount = localStorage.getItem("has_account");
      if (hasAccount === "true") {
        setActiveTab("login");
      } else {
        setActiveTab("signup");
      }
    }
  }, []);
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

  // Password Visibility toggles
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  // Forgot password flow states
  const [showForgotFlow, setShowForgotFlow] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotError, setForgotError] = useState("");

  // Submission spinner
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Order form states
  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedDrink, setSelectedDrink] = useState("");
  const [selectedSugar, setSelectedSugar] = useState("");
  const [orderName, setOrderName] = useState("");
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState("");

  // Review states
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComments, setReviewComments] = useState("");

  // Local state for editing order details
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editDrink, setEditDrink] = useState("");
  const [editSugar, setEditSugar] = useState("");
  const [editFloor, setEditFloor] = useState("");

  // Order limitation states (1 active order at a time, 1-hour cooldown)
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isAvailable, setIsAvailable] = useState(true);

  // Check current local time against ordering window settings slots
  useEffect(() => {
    const checkAvailability = () => {
      if (serviceHours.length === 0) {
        setIsAvailable(false); // If no slots configured, default to closed
        return;
      }
      const now = new Date();
      const currentHrs = now.getHours();
      const currentMins = now.getMinutes();
      const currentTimeVal = currentHrs * 60 + currentMins;

      const matched = serviceHours.some((slot) => {
        const [startHrs, startMins] = slot.start_time.split(":").map(Number);
        const [endHrs, endMins] = slot.end_time.split(":").map(Number);
        const startTimeVal = startHrs * 60 + startMins;
        const endTimeVal = endHrs * 60 + endMins;
        return currentTimeVal >= startTimeVal && currentTimeVal <= endTimeVal;
      });

      setIsAvailable(matched);
    };

    checkAvailability();
    const interval = setInterval(checkAvailability, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, [serviceHours]);

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
      if (!lastOrder || !cooldownLimitEnabled) {
        setCooldownRemaining(0);
        return;
      }
      const realNow = new Date();
      const currentSimTime = new Date(`${systemDate}T${realNow.toTimeString().split(" ")[0]}`);
      const lastOrderTime = new Date(lastOrder.createdAt);
      const diffMs = currentSimTime.getTime() - lastOrderTime.getTime();
      const diffMins = diffMs / (1000 * 60);

      const limitMins = 180; // 3-hour limit
      if (diffMins < limitMins) {
        setCooldownRemaining(Math.ceil(limitMins - diffMins));
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
    if (currentUser) {
      setOrderName(currentUser.name);
    }
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
      if (typeof window !== "undefined") {
        localStorage.setItem("has_account", "true");
      }
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
      if (typeof window !== "undefined") {
        localStorage.setItem("has_account", "true");
      }
      setSignUpName("");
      setSignUpEmail("");
      setSignUpPassword("");
      if (result.error) {
        alert(result.error); // Display signup confirmation emails details
      }
    }
  };

  // Handle Forgot Password submission
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMsg("");
    setForgotError("");
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) {
        setForgotError(error.message);
      } else {
        setForgotMsg("Password reset link sent! Please check your email inbox.");
      }
    } catch (err: any) {
      setForgotError(err.message || "Failed to trigger recovery email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle placing a new order
  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!isAvailable) {
      alert("Ordering is closed. Beverages are only available during the configured service hour slots.");
      return;
    }

    const isAnyBrewerActive = brewers.some((bwr) => bwr.status === "Active");
    if (!isAnyBrewerActive) {
      alert("Ordering is unavailable. No brewers are currently Active (all brewers are On Break or Off).");
      return;
    }

    // Safety checks (Bypassed for Admin)
    if (currentUser.role !== "Admin") {
      const myAllOrders = orders.filter((o) => o.employeeName === currentUser.name);
      const hasActive = myAllOrders.some((o) => o.status === "Pending" || o.status === "On the way");
      if (hasActive) return;

      const lastOrder = [...myAllOrders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      if (lastOrder && cooldownLimitEnabled) {
        const realNow = new Date();
        const currentSimTime = new Date(`${systemDate}T${realNow.toTimeString().split(" ")[0]}`);
        const diffMins = (currentSimTime.getTime() - new Date(lastOrder.createdAt).getTime()) / (1000 * 60);
        if (diffMins < 180) {
          alert(`3-Hour Cooldown limit is active. Please wait ${Math.ceil(180 - diffMins)} minutes before placing your next order.`);
          return;
        }
      }
    }

    if (!selectedFloor || !selectedDrink || !selectedSugar || !orderName.trim()) return;

    placeOrder(orderName, selectedFloor, selectedDrink, selectedSugar);

    if (currentUser.role === "Admin") {
      setOrderName(currentUser.name); // Reset back to default Admin name
    }

    setNotificationMsg(`Order placed successfully for ${selectedDrink}!`);
    setShowNotification(true);

    const timer = setTimeout(() => {
      setShowNotification(false);
    }, 4000);

    return () => clearTimeout(timer);
  };

  // Find any unreviewed delivered orders placed by the current user
  const unreviewedOrder = currentUser
    ? orders.find(
        (o) =>
          o.employeeId === currentUser.id &&
          o.status === "Delivered" &&
          (o.feedbackRating === undefined || o.feedbackRating === null)
      )
    : undefined;

  // Handle Review submission
  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = reviewOrderId || (unreviewedOrder ? unreviewedOrder.id : null);
    if (!targetId) return;

    submitReview(targetId, reviewRating, reviewComments);

    setReviewOrderId(null);
    setReviewRating(5);
    setReviewComments("");

    setNotificationMsg("Thank you for confirming delivery!");
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
  const getStatusBadge = (status: "Pending" | "On the way" | "Delivered" | "Not Found") => {
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
      case "Not Found":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-750 ring-1 ring-inset ring-red-650/20 select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Not Found ❌
          </span>
        );
    }
  };

  const formatCooldown = (mins: number) => {
    if (mins <= 0) return "";
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hrs > 0) {
      return `${hrs} hour${hrs > 1 ? "s" : ""}${remainingMins > 0 ? ` and ${remainingMins} minute${remainingMins !== 1 ? "s" : ""}` : ""}`;
    }
    return `${remainingMins} minute${remainingMins !== 1 ? "s" : ""}`;
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
          {showForgotFlow ? (
            /* FORGOT PASSWORD FLOW */
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="text-center">
                <span className="text-5xl select-none">📨</span>
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-neutral-900">
                  Forgot Password
                </h2>
                <p className="mt-1.5 text-xs text-neutral-500">
                  Send a password reset link to your email.
                </p>
              </div>

              {forgotError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3.5 text-xs font-semibold text-red-700">
                  {forgotError}
                </div>
              )}

              {forgotMsg && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-semibold text-emerald-700">
                  {forgotMsg}
                </div>
              )}

              <div>
                <label htmlFor="forgot-email" className="block text-sm font-semibold text-neutral-700">
                  Email Address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="e.g. alex@brewdesk.com"
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-950 focus:outline-none shadow-sm"
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-neutral-800 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Sending Reset..." : "Send Reset Email"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForgotFlow(false)}
                  className="w-full flex justify-center items-center rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-bold text-neutral-700 hover:bg-neutral-50 transition-all"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            <>
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

              <div className="relative">
                <label htmlFor="login-pass" className="block text-sm font-semibold text-neutral-700">
                  Password
                </label>
                <div className="mt-1.5 relative">
                  <input
                    id="login-pass"
                    type={showAuthPassword ? "text" : "password"}
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-950 focus:outline-none shadow-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthPassword(!showAuthPassword)}
                    className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600 outline-none"
                  >
                    {showAuthPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotFlow(true);
                      setForgotEmail(authEmail);
                      setForgotMsg("");
                      setForgotError("");
                    }}
                    className="text-xs font-bold text-neutral-500 hover:text-neutral-900 hover:underline outline-none"
                  >
                    Forgot Password?
                  </button>
                </div>
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
                <div className="mt-1.5 relative">
                  <input
                    id="signup-pass"
                    type={showSignUpPassword ? "text" : "password"}
                    required
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-950 focus:outline-none shadow-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600 outline-none"
                  >
                    {showSignUpPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
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
          </>
          )}
        </div>
      </div>
    );
  }

  // RENDER REDIRECTS: If Brewer landing on Home, display redirection options
  if (currentUser.role === "Brewer") {
    return (
      <div className="flex-grow flex items-center justify-center p-8 text-center">
        <div className="max-w-md w-full rounded-2xl border border-neutral-200 bg-white p-8 shadow-md">
          <span className="text-5xl select-none">🏢</span>
          <h2 className="text-xl font-bold text-neutral-950 mt-4">Workstation Selection</h2>
          <p className="text-sm text-neutral-500 mt-2">
            You are logged in as <span className="font-semibold text-neutral-800">{currentUser.name}</span> ({currentUser.role}).
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/brewer"
              className="w-full inline-flex justify-center rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-neutral-800 transition-all"
            >
              Go to Brewer Workstation 🚲
            </Link>
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
      <div className="mb-8 border-b border-neutral-200 dark:border-neutral-800 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
            Place a Beverage Order
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-300">
            Select your floor and beverage preferences. Your order goes straight to the Brewer workstation.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-4 py-2 shadow-sm text-left">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">Beverage service slots</span>
            <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-0.5 space-y-0.5 max-h-16 overflow-y-auto">
              {serviceHours.length === 0 ? (
                <span>Closed (No slots configured)</span>
              ) : (
                serviceHours.map((slot) => (
                  <div key={slot.id} className="flex justify-between gap-3 text-[11px]">
                    <span className="font-semibold text-neutral-600 dark:text-neutral-400">{slot.label}:</span>
                    <span>{slot.start_time} - {slot.end_time}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-4 py-2 text-center shadow-sm h-fit">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">Active Work Day</span>
            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{systemDate}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Order Form Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Review form is now handled globally via full-screen mandatory confirmation modal */}

          {/* Beverage request form */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-neutral-900 mb-6">Beverage Request Form</h2>

            <form onSubmit={handleOrderSubmit} className="space-y-6">
              {/* Employee Name / Details */}
              <div>
                <label htmlFor="order-name-input" className="block text-sm font-semibold text-neutral-700">
                  Employee Name / Details
                </label>
                <div className="mt-1.5 relative">
                  {currentUser.role === "Admin" ? (
                    <input
                      id="order-name-input"
                      type="text"
                      required
                      value={orderName}
                      onChange={(e) => setOrderName(e.target.value)}
                      placeholder="e.g. Guest Name, Meeting Room..."
                      className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-all shadow-sm outline-none"
                    />
                  ) : (
                    <>
                      <input
                        id="order-name-input"
                        type="text"
                        disabled
                        value={currentUser.name}
                        className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-600 outline-none cursor-not-allowed shadow-inner"
                      />
                      <span className="absolute right-3 top-3 text-xs font-semibold uppercase tracking-wider text-neutral-400 select-none">
                        Auto-Filled
                      </span>
                    </>
                  )}
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
              {!isAvailable ? (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3.5 text-xs font-semibold text-red-800 text-center select-none shadow-sm animate-pulse">
                  🚫 Ordering Closed: Beverages are only available during the configured service slots.
                </div>
              ) : !brewers.some((b) => b.status === "Active") ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3.5 text-xs font-semibold text-amber-800 text-center select-none shadow-sm animate-pulse">
                  ⚠️ Ordering Unavailable: No brewers are currently Active (all brewers are On Break or Off).
                </div>
              ) : currentUser.role !== "Admin" && hasActiveOrder ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3.5 text-xs font-semibold text-amber-800 text-center select-none shadow-sm animate-pulse">
                  ⏳ Active Order In Progress: You can order again once your current beverage is delivered.
                </div>
              ) : currentUser.role !== "Admin" && cooldownRemaining > 0 ? (
                <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-3.5 text-xs font-semibold text-neutral-550 text-center select-none shadow-sm">
                  ☕ 3-Hour Cooldown: Please wait {formatCooldown(cooldownRemaining)} before placing your next order.
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
                if (bwr.status === "Off") badgeClass = "bg-neutral-50 text-neutral-800 ring-neutral-600/20";

                return (
                  <div key={bwr.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0 border-neutral-100">
                    <span className="font-semibold text-neutral-800">{bwr.name}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${badgeClass}`}>
                      {bwr.status === "Active" ? "🟢 Active" : bwr.status === "On Break" ? "🟡 On Break" : "⚪ Off"}
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
                  const isEditing = editingOrderId === order.id;

                  return (
                    <div key={order.id} className="py-4 first:pt-0 last:pb-0">
                      {isEditing ? (
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          updateOrderDetails(order.id, editDrink, editSugar, editFloor);
                          setEditingOrderId(null);
                        }} className="w-full space-y-3 bg-neutral-50 p-3.5 rounded-lg border border-neutral-200 my-1">
                          <h4 className="text-xs font-bold text-neutral-800">Edit Order {getDailyOrderNumber(order.id, order.createdAt)}</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {/* Drink Select */}
                            <div>
                              <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wider mb-0.5">Drink</label>
                              <select
                                value={editDrink}
                                onChange={(e) => setEditDrink(e.target.value)}
                                className="w-full rounded border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900 focus:outline-none"
                              >
                                {drinks.map((d) => (
                                  <option key={d} value={d}>{d}</option>
                                ))}
                              </select>
                            </div>
                            
                            {/* Sugar Option */}
                            <div>
                              <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wider mb-0.5">Sugar</label>
                              <select
                                value={editSugar}
                                onChange={(e) => setEditSugar(e.target.value)}
                                className="w-full rounded border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900 focus:outline-none"
                              >
                                {sugarOptions.map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </div>

                            {/* Floor Option */}
                            <div>
                              <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wider mb-0.5">Floor</label>
                              <select
                                value={editFloor}
                                onChange={(e) => setEditFloor(e.target.value)}
                                className="w-full rounded border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900 focus:outline-none"
                              >
                                {floors.map((f) => (
                                  <option key={f} value={f}>{f}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setEditingOrderId(null)}
                              className="px-2.5 py-1 text-xs font-semibold bg-white border border-neutral-300 rounded text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-3 py-1 text-xs font-semibold bg-neutral-950 text-white rounded hover:bg-neutral-800 cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-sm text-neutral-900 flex items-center flex-wrap gap-1">
                              <span className="font-extrabold text-neutral-900 mr-1.5">{getDailyOrderNumber(order.id, order.createdAt)}</span>
                              {order.drink}
                              <span className="text-xs font-normal text-neutral-500">
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
                            
                            {/* Grace edit window countdown timer */}
                            <EditGraceTrigger
                              order={order}
                              onEditClick={() => {
                                setEditingOrderId(order.id);
                                setEditDrink(order.drink);
                                setEditSugar(order.sugar);
                                setEditFloor(order.floor);
                              }}
                            />

                            {order.status === "Not Found" && (
                              <p className="text-[10px] text-red-650 font-bold mt-2 bg-red-50/50 border border-red-200/50 rounded px-2.5 py-1.5 select-none animate-pulse max-w-xs leading-relaxed">
                                ⚠️ Brewer couldn't find you at Floor {order.floor}. Please place a new order or check the workstation.
                              </p>
                            )}
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
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mandatory Review Modal Overlay */}
      {(unreviewedOrder || reviewOrderId) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl animate-fade-in-up">
            {(() => {
              const activeOrderForRating = unreviewedOrder || (reviewOrderId ? orders.find((o) => o.id === reviewOrderId) : null);
              const dailyNum = activeOrderForRating ? getDailyOrderNumber(activeOrderForRating.id, activeOrderForRating.createdAt) : "";
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
                    <h3 className="text-lg font-bold text-neutral-950 mt-1">
                      {unreviewedOrder ? "Confirm Delivery & Rate" : "Leave Feedback for Order"}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1.5">
                      {activeOrderForRating 
                        ? `Your order of ${activeOrderForRating.drink} (${activeOrderForRating.sugar}) has been delivered! Please rate it to confirm delivery.`
                        : "Tell us how your beverage was and what improvements we can make."
                      }
                    </p>
                  </div>

                  <form onSubmit={handleReviewSubmit} className="mt-6 space-y-4 text-left">
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
                            onClick={() => setReviewRating(r.value)}
                            className={`flex flex-col items-center p-2 rounded-xl border transition-all cursor-pointer flex-1 ${
                              reviewRating === r.value
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
                        value={reviewComments}
                        onChange={(e) => setReviewComments(e.target.value)}
                        placeholder="e.g. Perfectly brewed! Thank you!"
                        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-950 focus:outline-none shadow-sm"
                      />
                    </div>

                    <div className="flex gap-3 justify-end mt-6">
                      {/* Only show Cancel button if this is NOT a mandatory unreviewedOrder popup */}
                      {!unreviewedOrder && (
                        <button
                          type="button"
                          onClick={() => {
                            setReviewOrderId(null);
                            setReviewComments("");
                          }}
                          className="px-4 py-2 rounded-lg border border-neutral-300 bg-white text-xs font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
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
