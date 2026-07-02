"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// Define what an Order looks like
export interface Order {
  id: string;
  employeeId: string;
  employeeName: string;
  floor: string;
  drink: string;
  sugar: string; // "Sugar" or "No Sugar"
  status: "Pending" | "On the way" | "Delivered";
  createdAt: string; // ISO string date
  feedbackRating?: number | null;
  feedbackComments?: string | null;
}

// Define the Employee details
export interface EmployeeItem {
  id: string;
  name: string;
  contact: string; // Email or Phone/Contact info
  avatar_url?: string;
}

// Define the Brewer details
export interface BrewerItem {
  id: string;
  name: string;
  contact: string; // Email or Phone/Contact info
  status: "Active" | "On Break" | "Off";
  avatar_url?: string;
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
  currentUser: { id: string; name: string; role: "Employee" | "Brewer" | "Admin"; contact: string; floor?: string; status?: "Active" | "On Break" | "Off"; avatar_url?: string } | null;
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
  systemDate: string;
  serviceHours: { id: string; label: string; start_time: string; end_time: string }[];
  addServiceHour: (label: string, start: string, end: string) => Promise<void>;
  deleteServiceHour: (id: string) => Promise<void>;
  updateServiceHour: (id: string, label: string, start: string, end: string) => Promise<void>;
  updateAvatarUrl: (avatarUrl: string) => Promise<void>;
  getDailyOrderNumber: (orderId: string, createdAt: string) => string;
}

const BrewContext = createContext<BrewContextType | undefined>(undefined);

export const BrewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const drinks = ["Chai", "Coffee", "Green Tea"];
  const sugarOptions = ["Sugar", "No Sugar"];

  // Keep systemDate dynamically resolved to today's UTC-synced calendar date (YYYY-MM-DD)
  const systemDate = new Date().toISOString().split("T")[0];

  const [floors, setFloors] = useState<string[]>([]);

  const [employees, setEmployees] = useState<EmployeeItem[]>([]);

  const [brewers, setBrewers] = useState<BrewerItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  // Multiple Beverage service hours slots
  const [serviceHours, setServiceHours] = useState<{ id: string; label: string; start_time: string; end_time: string }[]>([]);

  // Authenticated user and profile resolution loading states
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: "Employee" | "Brewer" | "Admin"; contact: string; floor?: string; status?: "Active" | "On Break" | "Off"; avatar_url?: string } | null>(null);
  
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
          custom_name,
          profiles (
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error.message);
        return;
      }

      const mappedOrders = data.map((o: any) => ({
        id: o.id,
        employeeId: o.employee_id,
        employeeName: o.custom_name || o.profiles?.name || "Anonymous Employee",
        floor: o.floor_name,
        drink: o.drink_name,
        sugar: o.sugar,
        status: o.status,
        createdAt: o.created_at,
        feedbackRating: o.feedback_rating,
        feedbackComments: o.feedback_comments,
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
        .select("id, name, email, status, avatar_url")
        .eq("role", "brewer");

      if (error) {
        // Fallback if status column does not exist yet in profiles table
        if (error.message.includes("status") || error.code === "PGRST204" || error.code === "42703") {
          console.warn("status column missing in profiles table. Fetching without status.");
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("profiles")
            .select("id, name, email, avatar_url")
            .eq("role", "brewer");
          if (fallbackError) {
            console.error("Fallback brewers fetch error:", fallbackError.message);
            return;
          }
          if (fallbackData) {
            setBrewers(
              fallbackData.map((b: any) => ({
                id: b.id,
                name: b.name,
                contact: b.email || "",
                status: "Active" as "Active" | "On Break" | "Off",
                avatar_url: b.avatar_url || "",
              }))
            );
          }
        } else {
          console.error("Error fetching brewers:", error.message);
        }
        return;
      }

      if (data) {
        const mappedBrewers = data.map((b: any) => ({
          id: b.id,
          name: b.name,
          contact: b.email || "",
          status: (b.status === "On Break" ? "On Break" : b.status === "Off" ? "Off" : "Active") as "Active" | "On Break" | "Off",
          avatar_url: b.avatar_url || "",
        }));
        setBrewers(mappedBrewers);
      }
    } catch (err) {
      console.error("Brewers fetching exception:", err);
    }
  };

  // Fetch employees from database
  const fetchEmployeesList = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, avatar_url")
        .eq("role", "employee");

      if (error) {
        console.error("Error fetching employees:", error.message);
        return;
      }

      const mappedEmployees = data.map((e: any) => ({
        id: e.id,
        name: e.name,
        contact: e.email || "N/A",
        avatar_url: e.avatar_url || "",
      }));
      setEmployees(mappedEmployees);
    } catch (err) {
      console.error("Employees fetching exception:", err);
    }
  };

  // Fetch floors from database
  const fetchFloors = async () => {
    try {
      const { data, error } = await supabase
        .from("floors")
        .select("name")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching floors:", error.message);
        return;
      }
      if (data) {
        setFloors(data.map((f: any) => f.name));
      }
    } catch (err) {
      console.error("Floors fetching exception:", err);
    }
  };


  // Fetch service hours slots from database
  const fetchServiceHours = async () => {
    try {
      const { data, error } = await supabase
        .from("service_hours")
        .select("id, label, start_time, end_time")
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Error fetching service hours:", error.message);
        return;
      }
      if (data) {
        setServiceHours(data.map((slot: any) => ({
          id: slot.id,
          label: slot.label,
          start_time: slot.start_time.substring(0, 5),
          end_time: slot.end_time.substring(0, 5),
        })));
      }
    } catch (err) {
      console.error("Service hours fetching exception:", err);
    }
  };

  // Fetch initial database items and listen to real-time updates
  useEffect(() => {
    fetchOrders();
    fetchBrewersList();
    fetchEmployeesList();
    fetchFloors();
    fetchServiceHours();

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
          fetchEmployeesList();
        }
      )
      .subscribe();

    const floorsChannel = supabase
      .channel("realtime-floors")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "floors" },
        () => {
          fetchFloors();
        }
      )
      .subscribe();

    const settingsChannel = supabase
      .channel("realtime-settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_hours" },
        () => {
          fetchServiceHours();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(floorsChannel);
      supabase.removeChannel(settingsChannel);
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
            status: (profile?.status === "On Break" ? "On Break" : profile?.status === "Off" ? "Off" : "Active") as "Active" | "On Break" | "Off",
            avatar_url: profile?.avatar_url || "",
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
          status: (profile?.status === "On Break" ? "On Break" : profile?.status === "Off" ? "Off" : "Active") as "Active" | "On Break" | "Off",
          avatar_url: profile?.avatar_url || "",
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
      // 1. Try to insert with custom_name
      const { error } = await supabase.from("orders").insert({
        employee_id: currentUser.id,
        floor_name: floor,
        drink_name: drink,
        sugar: sugar, // enum 'Sugar' | 'No Sugar'
        status: "Pending",
        custom_name: employeeName,
      });

      if (error) {
        // If the custom_name column does not exist in the database, fall back
        if (error.message.includes("custom_name") || error.code === "PGRST204" || error.code === "42703") {
          console.warn("custom_name column missing in Supabase orders table. Falling back to default insert.");
          const { error: fallbackError } = await supabase.from("orders").insert({
            employee_id: currentUser.id,
            floor_name: floor,
            drink_name: drink,
            sugar: sugar,
            status: "Pending",
          });
          if (fallbackError) {
            console.error("Fallback insert error:", fallbackError.message);
            alert("Error placing order: " + fallbackError.message);
          }
        } else {
          console.error("Error inserting order:", error.message);
          alert("Error placing order: " + error.message);
        }
      }
    } catch (err: any) {
      console.error("Exception placing order:", err);
      alert("Error placing order: " + (err.message || err));
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
        alert("Error updating status: " + error.message);
      }
    } catch (err: any) {
      console.error("Exception updating status:", err);
      alert("Error updating status: " + (err.message || err));
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
  const addFloor = async (floorName: string) => {
    const name = floorName.trim();
    if (name === "") return;
    try {
      const { error } = await supabase
        .from("floors")
        .insert({ name });
      if (error) {
        console.error("Error adding floor:", error.message);
      }
    } catch (err) {
      console.error("Exception adding floor:", err);
    }
  };

  // Admin: Delete Floor
  const deleteFloor = async (floorName: string) => {
    try {
      const { error } = await supabase
        .from("floors")
        .delete()
        .eq("name", floorName);
      if (error) {
        console.error("Error deleting floor:", error.message);
      }
    } catch (err) {
      console.error("Exception deleting floor:", err);
    }
  };

  // Admin: Update Floor
  const updateFloor = async (oldFloorName: string, newFloorName: string) => {
    const name = newFloorName.trim();
    if (name === "") return;
    try {
      const { error } = await supabase
        .from("floors")
        .update({ name })
        .eq("name", oldFloorName);
      if (error) {
        console.error("Error updating floor:", error.message);
      }
    } catch (err) {
      console.error("Exception updating floor:", err);
    }
  };

  // Admin: Add Employee
  const addEmployee = (name: string, contact: string) => {
    alert("New employees must register an account using the Sign Up form on the main page to create their login credentials.");
  };

  // Admin: Delete Employee by ID
  const deleteEmployee = async (id: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", id);
      if (error) {
        console.error("Error deleting employee:", error.message);
      }
    } catch (err) {
      console.error("Exception deleting employee:", err);
    }
  };

  // Admin: Update Employee
  const updateEmployee = async (id: string, name: string, contact: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name, email: contact })
        .eq("id", id);
      if (error) {
        console.error("Error updating employee:", error.message);
      }
    } catch (err) {
      console.error("Exception updating employee:", err);
    }
  };

  // Admin: Add Brewer
  const addBrewer = (name: string, contact: string) => {
    alert("New brewers must register an account using the Sign Up form on the main page to create their login credentials.");
  };

  // Admin: Delete Brewer by ID
  const deleteBrewer = async (id: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", id);
      if (error) {
        console.error("Error deleting brewer:", error.message);
      }
    } catch (err) {
      console.error("Exception deleting brewer:", err);
    }
  };

  // Admin: Update Brewer
  const updateBrewer = async (id: string, name: string, contact: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name, email: contact })
        .eq("id", id);
      if (error) {
        console.error("Error updating brewer:", error.message);
      }
    } catch (err) {
      console.error("Exception updating brewer:", err);
    }
  };

  // Admin / Brewer: Update Brewer Status
  const updateBrewerStatus = async (id: string, status: "Active" | "On Break" | "Off") => {
    try {
      // Optimistically update local session state if this is the active user
      setCurrentUser((prev) => prev && prev.id === id ? { ...prev, status } : prev);

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

  // Admin: Add Service Hour Slot
  const addServiceHour = async (label: string, start: string, end: string) => {
    try {
      const { error } = await supabase
        .from("service_hours")
        .insert({
          label: label.trim(),
          start_time: `${start}:00`,
          end_time: `${end}:00`,
        });
      if (error) {
        console.error("Error adding service hour:", error.message);
      }
    } catch (err) {
      console.error("Exception adding service hour:", err);
    }
  };

  // Admin: Delete Service Hour Slot
  const deleteServiceHour = async (id: string) => {
    try {
      const { error } = await supabase
        .from("service_hours")
        .delete()
        .eq("id", id);
      if (error) {
        console.error("Error deleting service hour:", error.message);
      }
    } catch (err) {
      console.error("Exception deleting service hour:", err);
    }
  };

  // Admin: Update Service Hour Slot
  const updateServiceHour = async (id: string, label: string, start: string, end: string) => {
    try {
      const { error } = await supabase
        .from("service_hours")
        .update({
          label: label.trim(),
          start_time: start.split(":").length === 2 ? `${start}:00` : start,
          end_time: end.split(":").length === 2 ? `${end}:00` : end,
        })
        .eq("id", id);
      if (error) {
        console.error("Error updating service hour:", error.message);
      }
    } catch (err) {
      console.error("Exception updating service hour:", err);
    }
  };

  // Update current user's profile image
  const updateAvatarUrl = async (avatarUrl: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", currentUser?.id);
      if (error) {
        console.error("Error updating avatar:", error.message);
      }
    } catch (err) {
      console.error("Exception updating avatar:", err);
    }
  };

  // Helper to compute daily order number dynamically
  const getDailyOrderNumber = (orderId: string, createdAt: string) => {
    if (!createdAt) return "";
    const dateStr = createdAt.substring(0, 10);
    const dayOrders = [...orders]
      .filter((o) => o.createdAt && o.createdAt.substring(0, 10) === dateStr)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const index = dayOrders.findIndex((o) => o.id === orderId);
    return index !== -1 ? `#${index + 1}` : "";
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
        serviceHours,
        addServiceHour,
        deleteServiceHour,
        updateServiceHour,
        updateAvatarUrl,
        getDailyOrderNumber,
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
