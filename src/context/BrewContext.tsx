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
  placeOrder: (employeeName: string, floor: string, drink: string, sugar: string) => void;
  updateOrderStatus: (id: string, status: "Pending" | "On the way" | "Delivered") => void;
  submitReview: (orderId: string, rating: number, comments: string) => void;
  addFloor: (floorName: string) => void;
  deleteFloor: (floorName: string) => void;
  addEmployee: (name: string, contact: string) => void;
  deleteEmployee: (id: string) => void;
  updateEmployee: (id: string, name: string, contact: string) => void;
  addBrewer: (name: string, contact: string) => void;
  deleteBrewer: (id: string) => void;
  updateBrewer: (id: string, name: string, contact: string) => void;
  systemDate: string; // YYYY-MM-DD
  advanceSystemDate: () => void;
}

const BrewContext = createContext<BrewContextType | undefined>(undefined);

export const BrewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const drinks = ["Chai", "Coffee", "Green Tea"];
  const sugarOptions = ["Sugar", "No Sugar"];

  // Initialize systemDate to today's real physical date
  const [systemDate, setSystemDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

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

  const [brewers, setBrewers] = useState<BrewerItem[]>([
    { id: "d1", name: "Raju Dev", contact: "raju@brewdesk.com" },
    { id: "d2", name: "Suresh Kumar", contact: "suresh@brewdesk.com" },
  ]);

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

  // Pre-populate orders dynamically on startup relative to the initial system date
  useEffect(() => {
    const today = new Date(systemDate);
    
    const getRelativeDateISO = (daysAgo: number, hour: number, minute: number) => {
      const date = new Date(today);
      date.setDate(date.getDate() - daysAgo);
      date.setHours(hour, minute, 0, 0);
      return date.toISOString();
    };

    const initialOrders: Order[] = [
      // 2 Days Ago orders (All delivered)
      {
        id: "hist-1",
        employeeName: "Alice Smith",
        floor: "Ground Floor",
        drink: "Chai",
        sugar: "Sugar",
        status: "Delivered",
        createdAt: getRelativeDateISO(2, 9, 30),
      },
      {
        id: "hist-2",
        employeeName: "Bob Johnson",
        floor: "Floor 2",
        drink: "Coffee",
        sugar: "No Sugar",
        status: "Delivered",
        createdAt: getRelativeDateISO(2, 11, 15),
      },
      // Yesterday orders (All delivered)
      {
        id: "hist-3",
        employeeName: "Charlie Brown",
        floor: "Floor 1",
        drink: "Green Tea",
        sugar: "No Sugar",
        status: "Delivered",
        createdAt: getRelativeDateISO(1, 10, 0),
      },
      {
        id: "hist-4",
        employeeName: "Diana Prince",
        floor: "Floor 3",
        drink: "Chai",
        sugar: "Sugar",
        status: "Delivered",
        createdAt: getRelativeDateISO(1, 14, 20),
      },
      {
        id: "hist-5",
        employeeName: "Ethan Hunt",
        floor: "Floor 2",
        drink: "Coffee",
        sugar: "Sugar",
        status: "Delivered",
        createdAt: getRelativeDateISO(1, 16, 45),
      },
      // Today orders (Mix of pending/on the way/delivered)
      {
        id: "hist-6",
        employeeName: "Alice Smith",
        floor: "Ground Floor",
        drink: "Chai",
        sugar: "Sugar",
        status: "Delivered",
        createdAt: getRelativeDateISO(0, 8, 15),
      },
      {
        id: "hist-7",
        employeeName: "Bob Johnson",
        floor: "Floor 2",
        drink: "Coffee",
        sugar: "No Sugar",
        status: "On the way",
        createdAt: getRelativeDateISO(0, 10, 30),
      },
      {
        id: "hist-8",
        employeeName: "Charlie Brown",
        floor: "Floor 1",
        drink: "Green Tea",
        sugar: "No Sugar",
        status: "Pending",
        createdAt: getRelativeDateISO(0, 11, 40),
      },
    ];

    setOrders(initialOrders);

    const initialReviews: Review[] = [
      {
        id: "r1",
        orderId: "hist-1",
        employeeName: "Alice Smith",
        drinkName: "Chai",
        rating: 5,
        comments: "Excellent chai, perfectly sweet!",
        createdAt: getRelativeDateISO(2, 9, 50),
      },
      {
        id: "r2",
        orderId: "hist-3",
        employeeName: "Charlie Brown",
        drinkName: "Green Tea",
        rating: 4,
        comments: "Quick delivery and nice aroma.",
        createdAt: getRelativeDateISO(1, 10, 15),
      },
    ];
    setReviews(initialReviews);
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
          if (profile) {
            const mappedRole = profile.role === "admin" ? "Admin" : profile.role === "brewer" ? "Brewer" : "Employee";
            setCurrentUser({
              id: session.user.id,
              name: profile.name,
              role: mappedRole,
              contact: profile.email || session.user.email || "",
              floor: profile.role === "employee" ? "Floor 2" : undefined,
            });
          }
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
        if (profile) {
          const mappedRole = profile.role === "admin" ? "Admin" : profile.role === "brewer" ? "Brewer" : "Employee";
          setCurrentUser({
            id: session.user.id,
            name: profile.name,
            role: mappedRole,
            contact: profile.email || session.user.email || "",
            floor: profile.role === "employee" ? "Floor 2" : undefined,
          });
        } else {
          setCurrentUser(null);
        }
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
        if (profile) {
          const dbRole = profile.role; // 'employee' | 'brewer' | 'admin'
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
  const placeOrder = (employeeName: string, floor: string, drink: string, sugar: string) => {
    const realNow = new Date();
    const orderDate = new Date(`${systemDate}T${realNow.toTimeString().split(" ")[0]}`);

    const newOrder: Order = {
      id: Math.random().toString(36).substring(2, 9),
      employeeName,
      floor,
      drink,
      sugar,
      status: "Pending",
      createdAt: orderDate.toISOString(),
    };
    setOrders((prevOrders) => [...prevOrders, newOrder]);
  };

  // Function to update an existing order's status
  const updateOrderStatus = (id: string, newStatus: "Pending" | "On the way" | "Delivered") => {
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === id ? { ...order, status: newStatus } : order
      )
    );
  };

  // Function to submit a review/improvement feedback
  const submitReview = (orderId: string, rating: number, comments: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    const newReview: Review = {
      id: Math.random().toString(36).substring(2, 9),
      orderId,
      employeeName: order.employeeName,
      drinkName: order.drink,
      rating,
      comments: comments.trim(),
      createdAt: new Date().toISOString(),
    };
    setReviews((prev) => [...prev, newReview]);
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

  // Admin: Simulate Next Day
  const advanceSystemDate = () => {
    setSystemDate((prevDate) => {
      const d = new Date(prevDate);
      d.setDate(d.getDate() + 1);
      return d.toISOString().split("T")[0];
    });
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
        addEmployee,
        deleteEmployee,
        updateEmployee,
        addBrewer,
        deleteBrewer,
        updateBrewer,
        systemDate,
        advanceSystemDate,
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
