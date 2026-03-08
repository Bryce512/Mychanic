"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchUsers = void 0;
const functions = __importStar(require("firebase-functions"));
const appId = "HEQXLJD6DF";
const apiKey = "1e8353f82f10e88e61c68e1e53861573";
const indexName = "prod_MYCHANIC";
// Helper to normalize phone numbers (remove formatting)
const normalizePhone = (phone) => {
    return phone.replace(/\D/g, "");
};
exports.searchUsers = functions.https.onRequest(async (req, res) => {
    var _a, _b;
    // Enable CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        // Handle both direct body and wrapped data
        const query = (_b = (((_a = req.body.data) === null || _a === void 0 ? void 0 : _a.email) || req.body.email)) === null || _b === void 0 ? void 0 : _b.toLowerCase();
        if (!query) {
            res.status(400).json({
                error: "Email or phone is required",
                result: { success: false, data: [] },
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
        const algoliaData = (await response.json());
        // For all searches, do client-side filtering to support full substring
        // matching (not just prefix)
        const queryLower = query.toLowerCase();
        const filteredHits = algoliaData.hits.filter((hit) => {
            var _a, _b, _c;
            const email = (((_a = hit.profile) === null || _a === void 0 ? void 0 : _a.email) || "").toLowerCase();
            const phone = normalizePhone(((_b = hit.profile) === null || _b === void 0 ? void 0 : _b.phone) || "");
            const name = (((_c = hit.profile) === null || _c === void 0 ? void 0 : _c.name) || "").toLowerCase();
            if (isPhoneQuery) {
                // Numeric query: match BOTH email substring AND phone digits
                const emailMatch = email.includes(queryLower);
                const phoneMatch = phone.includes(normalizedQuery);
                return emailMatch || phoneMatch;
            }
            else {
                // Text query: match email, name, or phone substring
                const emailMatch = email.includes(queryLower);
                const nameMatch = name.includes(queryLower);
                const phoneMatch = phone.includes(normalizedQuery);
                return emailMatch || nameMatch || phoneMatch;
            }
        });
        const results = filteredHits
            .map((hit) => {
            var _a, _b, _c;
            return ({
                id: hit.objectID,
                email: ((_a = hit.profile) === null || _a === void 0 ? void 0 : _a.email) || "",
                phone: ((_b = hit.profile) === null || _b === void 0 ? void 0 : _b.phone) || "",
                firstName: ((_c = hit.profile) === null || _c === void 0 ? void 0 : _c.name) || "Car Owner",
            });
        })
            .slice(0, 20);
        res.json({
            result: {
                success: true,
                data: results,
            },
        });
    }
    catch (error) {
        console.error("Search error:", error);
        res.status(500).json({
            error: "Internal server error",
            result: { success: false, data: [] },
        });
    }
});
//# sourceMappingURL=searchUsers.js.map