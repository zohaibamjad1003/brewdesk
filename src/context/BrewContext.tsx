"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

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

// Define the Brewer (formerly Chai Wala) details
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
  currentUser: { name: string; role: "Employee" | "Brewer" | "Admin"; contact: string; floor?: string } | null;
  login: (email: string, role: "Employee" | "Brewer" | "Admin") => boolean;
  signUp: (name: string, contact: string, role: "Employee" | "Brewer") => boolean;
  logout: () => void;
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

  // Simulated logged-in user state (Starts as null/logged out)
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    role: "Employee" | "Brewer" | "Admin";
    contact: string;
    floor?: string;
  } | null>(null);

  // State to hold list of orders
  const [orders, setOrders] = useState<Order[]>([]);

  // Pre-populate orders dynamically on startup relative to the initial system date
  useEffect(() => {
    const today = new Date(systemDate);
    
    // Helper to generate a date relative to systemDate
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

    // Populate dynamic mock reviews
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

  // Authentication Handlers
  const login = (email: string, role: "Employee" | "Brewer" | "Admin"): boolean => {
    const cleanedEmail = email.trim().toLowerCase();
    
    if (role === "Admin") {
      if (cleanedEmail === "admin@brewdesk.com" || cleanedEmail === "admin") {
        setCurrentUser({ name: "Sarah Connor", role: "Admin", contact: "admin@brewdesk.com" });
        return true;
      }
      return false;
    }

    if (role === "Employee") {
      const emp = employees.find(
        (e) => e.contact.toLowerCase() === cleanedEmail || e.name.toLowerCase() === cleanedEmail
      );
      if (emp) {
        setCurrentUser({ name: emp.name, role: "Employee", contact: emp.contact, floor: "Floor 2" });
        return true;
      }
      return false;
    }

    if (role === "Brewer") {
      const bwr = brewers.find(
        (b) => b.contact.toLowerCase() === cleanedEmail || b.name.toLowerCase() === cleanedEmail
      );
      if (bwr) {
        setCurrentUser({ name: bwr.name, role: "Brewer", contact: bwr.contact });
        return true;
      }
      return false;
    }

    return false;
  };

  const signUp = (name: string, contact: string, role: "Employee" | "Brewer"): boolean => {
    const trimmedName = name.trim();
    const trimmedContact = contact.trim();
    if (trimmedName === "" || trimmedContact === "") return false;

    const cleanedContact = trimmedContact.toLowerCase();

    if (role === "Employee") {
      if (employees.some((e) => e.contact.toLowerCase() === cleanedContact)) return false;
      const newEmp: EmployeeItem = {
        id: Math.random().toString(36).substring(2, 9),
        name: trimmedName,
        contact: trimmedContact,
      };
      setEmployees((prev) => [...prev, newEmp]);
      setCurrentUser({ name: trimmedName, role: "Employee", contact: trimmedContact, floor: "Floor 1" });
      return true;
    }

    if (role === "Brewer") {
      if (brewers.some((b) => b.contact.toLowerCase() === cleanedContact)) return false;
      const newBwr: BrewerItem = {
        id: Math.random().toString(36).substring(2, 9),
        name: trimmedName,
        contact: trimmedContact,
      };
      setBrewers((prev) => [...prev, newBwr]);
      setCurrentUser({ name: trimmedName, role: "Brewer", contact: trimmedContact });
      return true;
    }

    return false;
  };

  const logout = () => {
    setCurrentUser(null);
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
