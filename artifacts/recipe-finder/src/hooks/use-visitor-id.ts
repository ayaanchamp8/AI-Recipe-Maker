import { useState, useEffect } from "react";

const VISITOR_ID_KEY = "visitor-id";

export function useVisitorId(): string {
  const [visitorId, setVisitorId] = useState("");

  useEffect(() => {
    try {
      let id = localStorage.getItem(VISITOR_ID_KEY);
      if (!id) {
        // Generate a new visitor ID
        id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(VISITOR_ID_KEY, id);
      }
      setVisitorId(id);
    } catch (e) {
      console.error("Failed to load visitor ID:", e);
      setVisitorId(`user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    }
  }, []);

  return visitorId;
}
