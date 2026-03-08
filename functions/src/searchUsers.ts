import * as functions from "firebase-functions";

interface UserResult {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  // lastName: string;
}

const appId = "HEQXLJD6DF";
const apiKey = "1e8353f82f10e88e61c68e1e53861573";
const indexName = "prod_MYCHANIC";

// Helper to normalize phone numbers (remove formatting)
const normalizePhone = (phone: string): string => {
  return phone.replace(/\D/g, "");
};

export const searchUsers = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed"});
    return;
  }

  try {
    // Handle both direct body and wrapped data
    const query = (req.body.data?.email || req.body.email)?.toLowerCase();

    if (!query) {
      res.status(400).json({
        error: "Email or phone is required",
        result: {success: false, data: []},
      });
      return;
    }

    // Normalize phone number if it looks like a phone (contains mostly digits)
    const normalizedQuery = normalizePhone(query);
    // If query has letters, treat as email search only
    const hasLetters = /[a-z]/i.test(query);
    const isPhoneQuery = !hasLetters && normalizedQuery.length > 0;

    console.log("Query analysis:", {
      originalQuery: query,
      normalizedQuery,
      hasLetters,
      isPhoneQuery,
    });

    // Search using Algolia REST API for fast, scalable full-text search
    const url = `https://${appId}-dsn.algolia.net/1/indexes/${indexName}/query`;
    const requestBody = {
      query: hasLetters ? query : "",
      hitsPerPage: 100,
      attributesToRetrieve: ["objectID", "profile"],
    };

    console.log("Algolia request:", {
      url,
      query: hasLetters ? query : "",
      isPhoneQuery,
      normalizedQuery,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-Algolia-API-Key": apiKey,
        "X-Algolia-Application-Id": appId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Algolia API error: ${response.status}`, errorText);
      throw new Error(`Algolia API error: ${response.status} - ${errorText}`);
    }

    const algoliaData = (await response.json()) as any;

    // For all searches, do client-side filtering to support full substring
    // matching (not just prefix)
    const queryLower = query.toLowerCase();
    const filteredHits = algoliaData.hits.filter((hit: any) => {
      const email = (hit.profile?.email || "").toLowerCase();
      const phone = normalizePhone(hit.profile?.phone || "");
      const name = (hit.profile?.name || "").toLowerCase();

      if (isPhoneQuery) {
        // Numeric query: match BOTH email substring AND phone digits
        const emailMatch = email.includes(queryLower);
        const phoneMatch = phone.includes(normalizedQuery);
        return emailMatch || phoneMatch;
      } else {
        // Text query: match email, name, or phone substring
        const emailMatch = email.includes(queryLower);
        const nameMatch = name.includes(queryLower);
        const phoneMatch = phone.includes(normalizedQuery);
        return emailMatch || nameMatch || phoneMatch;
      }
    });

    const results: UserResult[] = filteredHits
      .map((hit: any) => ({
        id: hit.objectID,
        email: hit.profile?.email || "",
        phone: hit.profile?.phone || "",
        firstName: hit.profile?.name || "Car Owner",
      }))
      .slice(0, 20);

    res.json({
      result: {
        success: true,
        data: results,
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      error: "Internal server error",
      result: {success: false, data: []},
    });
  }
});
