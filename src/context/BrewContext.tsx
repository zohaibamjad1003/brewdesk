"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// Define what an Order looks like
export interface Order {
  id: string;
  employeeName: string;
  floor: string;
  drink: string;
  sugar: string; // "Sugar" or "No Sugar"
  status: "Pending" | "On the way" | "Delivered";
  createdAt: string; // ISO string date
}

// Define the Employee details
export interface EmployeeItem {
  id: string;
  name: string;
  contact: string; // Email or Phone/Contact info
}

// Define the Brewer details
export interface BrewerItem {
  id: string;
  name: string;
  contact: string; // Email or Phone/Contact info
  status: "Active" | "On Break" | "Off";
}

// Define the Order Review details
export interface Review {
  id: string;
  orderId: string;
  employeeName: string;
  drinkName: string;
  rating: number; // 1 to 5 stars
  comments: string;
  createdAt: string; // ISO string date
}

// Define the shape of our context state
interface BrewContextType {
  orders: Order[];
  floors: string[];
  drinks: string[];
  sugarOptions: string[];
  employees: EmployeeItem[];
  brewers: BrewerItem[];
  reviews: Review[];
  currentUser: { id: string; name: string; role: "Employee" | "Brewer" | "Admin"; contact: string; floor?: string } | null;
  loading: boolean;
  login: (email: string, password: string, role: "Employee" | "Brewer" | "Admin") => Promise<{ success: boolean; error?: string }>;
  signUp: (name: string, email: string, password: string, role: "Employee" | "Brewer") => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  placeOrder: (employeeName: string, floor: string, drink: string, sugar: string) => Promise<void>;
  updateOrderStatus: (id: string, status: "Pending" | "On the way" | "Delivered") => Promise<void>;
  submitReview: (orderId: string, rating: number, comments: string) => Promise<void>;
  addFloor: (floorName: string) => void;
  deleteFloor: (floorName: string) => void;
  updateFloor: (oldFloorName: string, newFloorName: string) => void;
  addEmployee: (name: string, contact: string) => void;
  deleteEmployee: (id: string) => void;
  updateEmployee: (id: string, name: string, contact: string) => void;
  addBrewer: (name: string, contact: string) => void;
  deleteBrewer: (id: string) => void;
  updateBrewer: (id: string, name: string, contact: string) => void;
  updateBrewerStatus: (id: string, status: "Active" | "On Break" | "Off") => Promise<void>;
  systemDate: string; // YYYY-MM-DD
}

const BrewContext = createContext<BrewContextType | undefined>(undefined);

export const BrewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const drinks = ["Chai", "Coffee", "Green Tea"];
  const sugarOptions = ["Sugar", "No Sugar"];

  // Keep systemDate dynamically resolved to today's UTC-synced calendar date (YYYY-MM-DD)
  const systemDate = new Date().toISOString().split("T")[0];

  const [floors, setFloors] = useState<string[]>([
    "Ground Floor",
    "Floor 1",
    "Floor 2",
    "Floor 3",
  ]);

  const [employees, setEmployees] = useState<EmployeeItem[]>([
    { id: "e1", name: "Alex Mercer", contact: "alex@brewdesk.com" },
    { id: "e2", name: "Alice Smith", contact: "alice@brewdesk.com" },
    { id: "e3", name: "Bob Johnson", contact: "bob@brewdesk.com" },
    { id: "e4", name: "Charlie Brown", contact: "charlie@brewdesk.com" },
    { id: "e5", name: "Diana Prince", contact: "diana@brewdesk.com" },
    { id: "e6", name: "Ethan Hunt", contact: "ethan@brewdesk.com" },
  ]);

  const [brewers, setBrewers] = useState<BrewerItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  // Authenticated user and profile resolution loading states
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    role: "Employee" | "Brewer" | "Admin";
    contact: string;
    floor?: string;
  } | null>(null);
  
  const [loading, setLoading] = useState(true);

  // State to hold list of orders
  const [orders, setOrders] = useState<Order[]>([]);

  // Fetch orders from database
  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          floor_name,
          drink_name,
          sugar,
          status,
          created_at,
          feedback_rating,
          feedback_comments,
          employee_id,
          profiles ( name, email )
        `)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching orders:", error.message);
        return;
      }

      const mappedOrders = data.map((o: any) => ({
        id: o.id,
        employeeName: o.profiles?.name || "Anonymous Employee",
        floor: o.floor_name,
        drink: o.drink_name,
        sugar: o.sugar,
        status: o.status,
        createdAt: o.created_at,
      }));
      setOrders(mappedOrders);

      const mappedReviews = data
        .filter((o: any) => o.feedback_rating !== null)
        .map((o: any) => ({
          id: o.id,
          orderId: o.id,
          employeeName: o.profiles?.name || "Anonymous Employee",
          drinkName: o.drink_name,
          rating: o.feedback_rating,
          comments: o.feedback_comments || "",
          createdAt: o.created_at,
        }));
      setReviews(mappedReviews);
    } catch (err) {
      console.error("Orders fetching exception:", err);
    }
  };

  // Fetch brewers from database
  const fetchBrewersList = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, status")
        .eq("role", "brewer");

      if (error) {
        console.error("Error fetching brewers:", error.message);
        return;
      }

      const mappedBrewers = data.map((b: any) => ({
        id: b.id,
        name: b.name,
        contact: b.email || "",
        status: (b.status === "On Break" ? "On Break" : b.status === "Off" ? "Off" : "Active") as "Active" | "On Break" | "Off",
      }));
      setBrewers(mappedBrewers);
    } catch (err) {
      console.error("Brewers fetching exception:", err);
    }
  };

  // Fetch initial database items and listen to real-time updates
  useEffect(() => {
    fetchOrders();
    fetchBrewersList();

    const ordersChannel = supabase
      .channel("realtime-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel("realtime-profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          fetchBrewersList();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  // Fetch public user profile matching Auth user ID
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (error) {
        console.error("Error retrieving profile:", error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error("Database query failed:", err);
      return null;
    }
  };

  // Auth state event subscription
  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          const metadata = session.user.user_metadata;
          const name = profile?.name || metadata?.name || "Anonymous Employee";
          const roleStr = profile?.role || metadata?.role || "employee";
          const mappedRole = roleStr === "admin" ? "Admin" : roleStr === "brewer" ? "Brewer" : "Employee";

          setCurrentUser({
            id: session.user.id,
            name,
            role: mappedRole,
            contact: profile?.email || session.user.email || "",
            floor: roleStr === "employee" ? "Floor 2" : undefined,
          });
        }
      } catch (err) {
        console.error("Session lookup error:", err);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen to real-time auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        const metadata = session.user.user_metadata;
        const name = profile?.name || metadata?.name || "Anonymous Employee";
        const roleStr = profile?.role || metadata?.role || "employee";
        const mappedRole = roleStr === "admin" ? "Admin" : roleStr === "brewer" ? "Brewer" : "Employee";

        setCurrentUser({
          id: session.user.id,
          name,
          role: mappedRole,
          contact: profile?.email || session.user.email || "",
          floor: roleStr === "employee" ? "Floor 2" : undefined,
        });
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Async Login with Role validation
  const login = async (email: string, password: string, role: "Employee" | "Brewer" | "Admin"): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        setLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        const profile = await fetchUserProfile(data.user.id);
        const metadata = data.user.user_metadata;
        const dbRole = profile?.role || metadata?.role || "employee";
        const requestedDbRole = role === "Admin" ? "admin" : role === "Brewer" ? "brewer" : "employee";

        if (dbRole !== requestedDbRole) {
          // Sign out immediately due to credentials/role mismatch
          await supabase.auth.signOut();
          setLoading(false);
          return { 
            success: false, 
            error: `Role Mismatch. This account is registered as a '${dbRole}', not '${requestedDbRole}'.` 
          };
        }
      }

      setLoading(false);
      return { success: true };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err.message || "An unexpected error occurred." };
    }
  };

  // Async Sign Up (Automatically creates profile entry via trigger)
  const signUp = async (name: string, email: string, password: string, role: "Employee" | "Brewer"): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const dbRole = role === "Employee" ? "employee" : "brewer";

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            name: name.trim(),
            role: dbRole,
          },
        },
      });

      if (error) {
        setLoading(false);
        return { success: false, error: error.message };
      }

      // If email confirmation is enabled, session will be null on signup
      if (!data.session) {
        setLoading(false);
        return { success: true, error: "Signup successful! Please check your email inbox to confirm your account." };
      }

      setLoading(false);
      return { success: true };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err.message || "An unexpected error occurred." };
    }
  };

  // Async Logout
  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setCurrentUser(null);
    setLoading(false);
  };

  // Function to place a new order
  const placeOrder = async (employeeName: string, floor: string, drink: string, sugar: string) => {
    if (!currentUser) return;
    try {
      const { error } = await supabase.from("orders").insert({
        employee_id: currentUser.id,
        floor_name: floor,
        drink_name: drink,
        sugar: sugar, // enum 'Sugar' | 'No Sugar'
        status: "Pending",
      });
      if (error) {
        console.error("Error inserting order:", error.message);
      }
    } catch (err) {
      console.error("Exception placing order:", err);
    }
  };

  // Function to update an existing order's status
  const updateOrderStatus = async (id: string, newStatus: "Pending" | "On the way" | "Delivered") => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) {
        console.error("Error updating status:", error.message);
      }
    } catch (err) {
      console.error("Exception updating status:", err);
    }
  };

  // Function to submit a review/improvement feedback
  const submitReview = async (orderId: string, rating: number, comments: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          feedback_rating: rating,
          feedback_comments: comments,
        })
        .eq("id", orderId);
      if (error) {
        console.error("Error submitting review:", error.message);
      }
    } catch (err) {
      console.error("Exception submitting review:", err);
    }
  };

  // Admin: Add Floor
  const addFloor = (floorName: string) => {
    if (!floors.includes(floorName) && floorName.trim() !== "") {
      setFloors((prev) => [...prev, floorName.trim()]);
    }
  };

  // Admin: Delete Floor
  const deleteFloor = (floorName: string) => {
    setFloors((prev) => prev.filter((f) => f !== floorName));
  };

  // Admin: Update Floor
  const updateFloor = (oldFloorName: string, newFloorName: string) => {
    const trimmedNew = newFloorName.trim();
    if (trimmedNew !== "" && !floors.includes(trimmedNew)) {
      setFloors((prev) => prev.map((f) => (f === oldFloorName ? trimmedNew : f)));
    }
  };

  // Admin: Add Employee
  const addEmployee = (name: string, contact: string) => {
    const trimmedName = name.trim();
    const trimmedContact = contact.trim();
    if (trimmedName !== "" && !employees.some((e) => e.name.toLowerCase() === trimmedName.toLowerCase())) {
      const newEmp: EmployeeItem = {
        id: Math.random().toString(36).substring(2, 9),
        name: trimmedName,
        contact: trimmedContact || "N/A",
      };
      setEmployees((prev) => [...prev, newEmp]);
    }
  };

  // Admin: Delete Employee by ID
  const deleteEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  // Admin: Update Employee
  const updateEmployee = (id: string, name: string, contact: string) => {
    const trimmedName = name.trim();
    const trimmedContact = contact.trim();
    if (trimmedName !== "") {
      setEmployees((prev) =>
        prev.map((e) => (e.id === id ? { ...e, name: trimmedName, contact: trimmedContact || "N/A" } : e))
      );
    }
  };

  // Admin: Add Brewer
  const addBrewer = (name: string, contact: string) => {
    const trimmedName = name.trim();
    const trimmedContact = contact.trim();
    if (trimmedName !== "" && !brewers.some((b) => b.name.toLowerCase() === trimmedName.toLowerCase())) {
      const newStaff: BrewerItem = {
        id: Math.random().toString(36).substring(2, 9),
        name: trimmedName,
        contact: trimmedContact || "N/A",
        status: "Active",
      };
      setBrewers((prev) => [...prev, newStaff]);
    }
  };

  // Admin: Delete Brewer by ID
  const deleteBrewer = (id: string) => {
    setBrewers((prev) => prev.filter((b) => b.id !== id));
  };

  // Admin: Update Brewer
  const updateBrewer = (id: string, name: string, contact: string) => {
    const trimmedName = name.trim();
    const trimmedContact = contact.trim();
    if (trimmedName !== "") {
      setBrewers((prev) =>
        prev.map((b) => (b.id === id ? { ...b, name: trimmedName, contact: trimmedContact || "N/A" } : b))
      );
    }
  };

  // Admin / Brewer: Update Brewer Status
  const updateBrewerStatus = async (id: string, status: "Active" | "On Break" | "Off") => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status })
        .eq("id", id);
      if (error) {
        console.error("Error updating status:", error.message);
      }
    } catch (err) {
      console.error("Exception updating status:", err);
    }
  };

  return (
    <BrewContext.Provider
      value={{
        orders,
        floors,
        drinks,
        sugarOptions,
        employees,
        brewers,
        reviews,
        currentUser,
        loading,
        login,
        signUp,
        logout,
        placeOrder,
        updateOrderStatus,
        submitReview,
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
      }}
    >
      {children}
    </BrewContext.Provider>
  );
};

// Custom hook to easily use this context in other components
export const useBrew = () => {
  const context = useContext(BrewContext);
  if (context === undefined) {
    throw new Error("useBrew must be used within a BrewProvider");
  }
  return context;
};
