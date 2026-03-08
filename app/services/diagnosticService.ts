/**
 * Diagnostic Service
 * Handles AI-powered diagnostic analysis and integration
 * This service will be extended to integrate with AI chatbot APIs
 */

import { AI_CONFIG, validateAIConfig } from "../config/aiConfig";

export interface DiagnosticData {
  symptoms: string;
  vehicleDetails: string;
  dtcCodes: string;
  mechanicNotes: string;
}

export interface DiagnosticResult {
  analysis: string;
  suggestedSteps: string[];
  estimatedTime: string;
  requiredParts: string[];
  priority: "low" | "medium" | "high" | "critical";
  confidence: number; // 0-100
  generatedAt: Date;
}

export interface AIResponse {
  success: boolean;
  data?: DiagnosticResult;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Mock diagnostic knowledge base for demonstration
const mockDiagnosticKnowledge = {
  symptoms: {
    "engine misfire": {
      priority: "high" as const,
      commonCauses: ["ignition coils", "spark plugs", "fuel injectors"],
      estimatedTime: "2-4 hours",
    },
    "check engine light": {
      priority: "medium" as const,
      commonCauses: [
        "emissions system",
        "engine sensors",
        "catalytic converter",
      ],
      estimatedTime: "1-3 hours",
    },
    overheating: {
      priority: "critical" as const,
      commonCauses: ["cooling system", "thermostat", "water pump"],
      estimatedTime: "2-6 hours",
    },
    "brake noise": {
      priority: "high" as const,
      commonCauses: ["brake pads", "brake rotors", "brake calipers"],
      estimatedTime: "1-2 hours",
    },
  },
  dtcCodes: {
    P0301: "Cylinder 1 misfire detected",
    P0171: "System too lean (Bank 1)",
    P0420: "Catalyst system efficiency below threshold",
    P0128:
      "Coolant thermostat (coolant temperature below thermostat regulating temperature)",
    P0442: "Evaporative emission control system leak detected (small leak)",
  },
};

class DiagnosticService {
  private apiKey: string | null = null;
  private apiEndpoint: string | null = null;
  private requestTimeout: number = 30000; // 30 seconds

  constructor() {
    // Auto-initialize with config if available
    if (validateAIConfig()) {
      this.apiKey = AI_CONFIG.OPENAI_API_KEY;
      this.apiEndpoint = AI_CONFIG.OPENAI_API_URL;
      this.requestTimeout = AI_CONFIG.TIMEOUT;
    }
  }

  /**
   * Initialize the service with AI API credentials
   */
  initialize(apiKey: string, apiEndpoint: string) {
    this.apiKey = apiKey;
    this.apiEndpoint = apiEndpoint;
  }

  /**
   * Set the API request timeout
   */
  setTimeout(timeout: number) {
    this.requestTimeout = timeout;
  }

  /**
   * Analyze diagnostic data using AI
   */
  async analyzeDiagnostic(data: DiagnosticData): Promise<DiagnosticResult> {
    try {
      // For now, use mock analysis until AI integration is ready
      if (!this.apiKey || !this.apiEndpoint) {
        console.log(
          "🤖 [DIAGNOSTIC] Using MOCK DATA - No OpenAI API key configured"
        );
        return this.mockAnalyzeDiagnostic(data);
      }

      console.log("🤖 [DIAGNOSTIC] Using OPENAI API - Consuming tokens");

      // TODO: Replace with actual AI API call
      const aiResponse = await this.callAIAPI(data);

      if (!aiResponse.success || !aiResponse.data) {
        console.log(
          "🤖 [DIAGNOSTIC] OpenAI API failed, falling back to MOCK DATA"
        );
        console.log("❌ API Error:", aiResponse.error);
        throw new Error(aiResponse.error || "AI analysis failed");
      }

      console.log(
        "✅ [DIAGNOSTIC] OpenAI API success - Tokens used:",
        aiResponse.usage
      );
      return aiResponse.data;
    } catch (error) {
      console.error("Diagnostic analysis error:", error);
      console.log(
        "🤖 [DIAGNOSTIC] Exception occurred, falling back to MOCK DATA"
      );
      // Fallback to mock analysis if AI fails
      return this.mockAnalyzeDiagnostic(data);
    }
  }

  /**
   * Analyze conversation context and provide AI response
   */
  async analyzeConversation(
    context: any,
    userMessage: string
  ): Promise<{
    content: string;
    priority?: "low" | "medium" | "high" | "critical";
  }> {
    try {
      if (!this.apiKey || !this.apiEndpoint) {
        console.log(
          "💬 [CONVERSATION] Using MOCK DATA - No OpenAI API key configured"
        );
        return this.mockConversationResponse(userMessage);
      }

      console.log("💬 [CONVERSATION] Using OPENAI API - Consuming tokens");

      const conversationPrompt = this.buildConversationPrompt(
        context,
        userMessage
      );

      // Create a timeout promise for React Native compatibility
      const conversationTimeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Request timeout")),
          this.requestTimeout
        )
      );

      const conversationFetchPromise = fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: AI_CONFIG.MODEL,
          messages: [
            {
              role: "system",
              content: `You are an automotive diagnostic expert. Be concise and helpful.

Rules:
- Keep answers brief (under 100 words)
- Use bullet points for lists
- Give 1-2 specific actions
- Avoid lengthy explanations
- Focus on practical next steps`,
            },
            {
              role: "user",
              content: conversationPrompt,
            },
          ],
          max_tokens: 300, // Reduced for shorter follow-up responses
          temperature: 0.7,
        }),
      });

      // Race between fetch and timeout
      const response = await Promise.race([
        conversationFetchPromise,
        conversationTimeoutPromise,
      ]);

      if (!response.ok) {
        console.log("❌ [CONVERSATION] OpenAI API error:", response.status);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      console.log(
        "✅ [CONVERSATION] OpenAI API success - Tokens used:",
        result.usage
      );

      const content =
        result.choices?.[0]?.message?.content ||
        "I'm having trouble processing that. Could you rephrase?";

      // Determine priority based on keywords in the conversation
      const priority = this.detectPriorityFromConversation(
        userMessage,
        content
      );

      return { content, priority };
    } catch (error) {
      console.error("Conversation analysis error:", error);
      console.log(
        "💬 [CONVERSATION] Exception occurred, falling back to MOCK DATA"
      );
      return this.mockConversationResponse(userMessage);
    }
  }

  /**
   * Mock conversation response for fallback
   */
  private mockConversationResponse(userMessage: string): {
    content: string;
    priority?: "low" | "medium" | "high" | "critical";
  } {
    console.log(
      "🤖 [MOCK] Generating mock conversation response for:",
      userMessage.substring(0, 50) + "..."
    );

    const lowerMessage = userMessage.toLowerCase();

    // Generate contextual responses based on keywords
    if (
      lowerMessage.includes("overheating") ||
      lowerMessage.includes("smoke")
    ) {
      return {
        content:
          "Overheating is a serious issue that needs immediate attention. Have you checked the coolant level? Is the engine temperature gauge reading high? Please stop driving the vehicle until we can diagnose this properly.",
        priority: "critical",
      };
    }

    if (
      lowerMessage.includes("brake") ||
      lowerMessage.includes("grinding") ||
      lowerMessage.includes("squealing")
    ) {
      return {
        content:
          "Brake issues are safety-critical. Can you describe the noise more specifically? When does it occur - during braking, while driving, or when stationary? Have you checked the brake pad thickness?",
        priority: "high",
      };
    }

    if (
      lowerMessage.includes("p0") ||
      lowerMessage.includes("dtc") ||
      lowerMessage.includes("code")
    ) {
      return {
        content:
          "I see you have diagnostic trouble codes. Which specific codes are you seeing? Each code points to different systems, so knowing the exact codes will help me guide you through the proper diagnostic steps.",
        priority: "medium",
      };
    }

    if (lowerMessage.includes("noise") || lowerMessage.includes("sound")) {
      return {
        content:
          "Engine noises can indicate various issues. Can you describe when the noise occurs? Is it during startup, idle, acceleration, or deceleration? Is it a knocking, ticking, grinding, or squealing sound?",
        priority: "medium",
      };
    }

    // Default response
    return {
      content:
        "I understand. Can you provide more details about the vehicle's symptoms? The more specific information you can share about when the problem occurs and what you're observing, the better I can help guide your diagnosis.",
      priority: undefined,
    };
  }

  /**
   * Build conversation prompt with context
   */
  private buildConversationPrompt(context: any, userMessage: string): string {
    let prompt = `Current conversation context:\n`;

    if (context.symptoms) {
      prompt += `Symptoms reported: ${context.symptoms}\n`;
    }
    if (context.vehicleDetails) {
      prompt += `Vehicle: ${context.vehicleDetails}\n`;
    }
    if (context.dtcCodes) {
      prompt += `DTC Codes: ${context.dtcCodes}\n`;
    }
    if (context.mechanicNotes) {
      prompt += `Notes: ${context.mechanicNotes}\n`;
    }

    if (context.conversationHistory && context.conversationHistory.length > 0) {
      prompt += `\nRecent conversation:\n`;
      context.conversationHistory.forEach((msg: any) => {
        prompt += `${msg.type === "user" ? "Mechanic" : "AI"}: ${
          msg.content
        }\n`;
      });
    }

    prompt += `\nMechanic's current message: ${userMessage}\n\nPlease respond as the AI diagnostic assistant:`;

    return prompt;
  }

  /**
   * Detect priority level from conversation content
   */
  private detectPriorityFromConversation(
    userMessage: string,
    aiResponse: string
  ): "low" | "medium" | "high" | "critical" | undefined {
    const combined = (userMessage + " " + aiResponse).toLowerCase();

    if (
      combined.includes("critical") ||
      combined.includes("emergency") ||
      combined.includes("stop driving") ||
      combined.includes("immediately")
    ) {
      return "critical";
    }
    if (
      combined.includes("safety") ||
      combined.includes("brake") ||
      combined.includes("steering") ||
      combined.includes("high priority")
    ) {
      return "high";
    }
    if (
      combined.includes("check engine") ||
      combined.includes("warning") ||
      combined.includes("soon")
    ) {
      return "medium";
    }

    return undefined;
  }

  /**
   * Mock diagnostic analysis for demonstration and fallback
   */
  private mockAnalyzeDiagnostic(data: DiagnosticData): DiagnosticResult {
    console.log("🤖 [MOCK] Generating mock diagnostic analysis for:", {
      symptomsLength: data.symptoms.length,
      vehicleDetails: data.vehicleDetails,
      dtcCodes: data.dtcCodes,
      notesLength: data.mechanicNotes.length,
    });

    const symptoms = data.symptoms.toLowerCase();
    const dtcCodes = data.dtcCodes.toLowerCase();

    // Determine priority based on symptoms and DTC codes
    let priority: DiagnosticResult["priority"] = "medium";
    let suggestedSteps: string[] = [];
    let requiredParts: string[] = [];
    let estimatedTime = "2-3 hours";
    let analysis = "";

    // Check for critical conditions
    if (symptoms.includes("overheating") || symptoms.includes("overheat")) {
      priority = "critical";
      estimatedTime = "3-6 hours";
      analysis =
        "CRITICAL: Vehicle overheating detected. This can cause severe engine damage if not addressed immediately.";
      suggestedSteps = [
        "Stop driving immediately and allow engine to cool",
        "Check coolant level and look for leaks",
        "Inspect cooling system components (radiator, hoses, water pump)",
        "Test thermostat operation",
        "Pressure test cooling system",
        "Replace faulty components as needed",
      ];
      requiredParts = ["coolant", "thermostat", "radiator hoses"];
    }
    // Check for engine misfire
    else if (
      symptoms.includes("misfire") ||
      symptoms.includes("rough") ||
      dtcCodes.includes("p030")
    ) {
      priority = "high";
      estimatedTime = "2-4 hours";
      analysis =
        "Engine misfire detected. This can lead to catalytic converter damage and poor fuel economy if not repaired soon.";
      suggestedSteps = [
        "Scan for diagnostic trouble codes",
        "Check ignition coils and spark plugs",
        "Test fuel injector operation",
        "Inspect vacuum lines for leaks",
        "Check compression on affected cylinders",
        "Replace faulty ignition components",
      ];
      requiredParts = ["spark plugs", "ignition coils"];
    }
    // Check for brake issues
    else if (
      symptoms.includes("brake") ||
      symptoms.includes("squeal") ||
      symptoms.includes("grinding")
    ) {
      priority = "high";
      estimatedTime = "1-2 hours";
      analysis =
        "Brake system issue detected. Safety-critical repair needed to ensure proper stopping performance.";
      suggestedSteps = [
        "Inspect brake pads for wear",
        "Check brake rotor condition",
        "Test brake fluid level and condition",
        "Inspect brake lines and hoses",
        "Replace worn brake pads and resurface rotors if needed",
        "Bleed brake system if fluid is contaminated",
      ];
      requiredParts = ["brake pads", "brake fluid"];
    }
    // Check engine light scenarios
    else if (symptoms.includes("check engine") || dtcCodes.includes("p0")) {
      priority = "medium";
      estimatedTime = "1-3 hours";
      analysis =
        "Check engine light indicates an emissions or engine management issue. Diagnosis required to determine root cause.";
      suggestedSteps = [
        "Retrieve and analyze diagnostic trouble codes",
        "Perform visual inspection of related components",
        "Use diagnostic equipment to test system operation",
        "Check for technical service bulletins",
        "Repair or replace faulty components",
        "Clear codes and verify repair",
      ];
      requiredParts = ["varies based on diagnosis"];
    }
    // General diagnostic approach
    else {
      analysis =
        "General diagnostic evaluation needed. Multiple symptoms may indicate interconnected issues requiring systematic diagnosis.";
      suggestedSteps = [
        "Perform comprehensive vehicle inspection",
        "Scan all vehicle systems for diagnostic codes",
        "Road test vehicle to confirm symptoms",
        "Research known issues for this vehicle",
        "Follow manufacturer diagnostic procedures",
        "Provide estimate for necessary repairs",
      ];
      requiredParts = ["to be determined"];
    }

    // Add vehicle-specific considerations
    if (data.vehicleDetails) {
      const vehicleInfo = data.vehicleDetails.toLowerCase();
      if (
        vehicleInfo.includes("high mileage") ||
        vehicleInfo.includes("miles")
      ) {
        suggestedSteps.push(
          "Consider preventive maintenance items due to vehicle age/mileage"
        );
      }
    }

    // Add DTC code analysis
    if (data.dtcCodes) {
      const codes = data.dtcCodes.match(/P\d{4}/gi) || [];
      if (codes.length > 0) {
        analysis += `\n\nDTC Analysis: ${codes.length} diagnostic trouble code(s) found. `;
        codes.forEach((code) => {
          const codeDescription =
            mockDiagnosticKnowledge.dtcCodes[
              code.toUpperCase() as keyof typeof mockDiagnosticKnowledge.dtcCodes
            ];
          if (codeDescription) {
            analysis += `${code}: ${codeDescription}. `;
          }
        });
      }
    }

    return {
      analysis,
      suggestedSteps,
      estimatedTime,
      requiredParts,
      priority,
      confidence: 75, // Mock confidence score
      generatedAt: new Date(),
    };
  }

  /**
   * Call AI API for diagnostic analysis
   * This will be implemented when AI integration is ready
   */
  private async callAIAPI(data: DiagnosticData): Promise<AIResponse> {
    if (!this.apiKey || !this.apiEndpoint) {
      return {
        success: false,
        error: "AI API not configured",
      };
    }

    try {
      const prompt = this.buildDiagnosticPrompt(data);

      console.log("🤖 [OPENAI] Calling OpenAI API for diagnostic analysis...");
      console.log("📝 [OPENAI] Prompt length:", prompt.length, "characters");

      // Create a timeout promise for React Native compatibility
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Request timeout")),
          this.requestTimeout
        )
      );

      // Create a timeout promise for React Native compatibility
      const diagnosticTimeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Request timeout")),
          this.requestTimeout
        )
      );

      const fetchPromise = fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: AI_CONFIG.MODEL,
          messages: [
            {
              role: "system",
              content: AI_CONFIG.SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: AI_CONFIG.MAX_TOKENS,
          temperature: AI_CONFIG.TEMPERATURE,
        }),
      });

      // Race between fetch and timeout
      const response = await Promise.race([
        fetchPromise,
        diagnosticTimeoutPromise,
      ]);

      if (!response.ok) {
        console.log(
          "❌ [OPENAI] API error:",
          response.status,
          response.statusText
        );
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log(
        "✅ [OPENAI] API response received. Tokens used:",
        result.usage
      );
      console.log("💰 [OPENAI] Token breakdown:", {
        prompt: result.usage?.prompt_tokens,
        completion: result.usage?.completion_tokens,
        total: result.usage?.total_tokens,
      });

      // Parse AI response and convert to DiagnosticResult format
      return {
        success: true,
        data: this.parseAIResponse(result),
        usage: result.usage,
      };
    } catch (error) {
      console.error("❌ [OPENAI] API call failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown AI API error",
      };
    }
  }

  /**
   * Build diagnostic prompt for AI
   */
  private buildDiagnosticPrompt(data: DiagnosticData): string {
    let prompt =
      "Please analyze the following automotive diagnostic information:\n\n";

    if (data.symptoms) {
      prompt += `SYMPTOMS:\n${data.symptoms}\n\n`;
    }

    if (data.vehicleDetails) {
      prompt += `VEHICLE DETAILS:\n${data.vehicleDetails}\n\n`;
    }

    if (data.dtcCodes) {
      prompt += `DTC CODES:\n${data.dtcCodes}\n\n`;
    }

    if (data.mechanicNotes) {
      prompt += `MECHANIC NOTES:\n${data.mechanicNotes}\n\n`;
    }

    prompt += `Please provide:
1. A concise analysis of the likely problem(s)
2. Step-by-step diagnostic procedure
3. Estimated repair time
4. Required parts/components
5. Priority level (low/medium/high/critical)

Format your response as JSON with these fields: analysis, suggestedSteps (array), estimatedTime, requiredParts (array), priority.`;

    return prompt;
  }

  /**
   * Parse AI response into DiagnosticResult format
   */
  private parseAIResponse(aiResponse: any): DiagnosticResult {
    try {
      // Extract the content from OpenAI response
      const content = aiResponse.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("No content in AI response");
      }

      // Try to parse JSON response
      let parsedResult;
      try {
        // Remove any code block markers if present
        const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
        parsedResult = JSON.parse(cleanContent);
      } catch (parseError) {
        // If JSON parsing fails, extract information manually
        console.warn("Failed to parse JSON, extracting manually:", parseError);
        return this.extractFromPlainText(content);
      }

      // Validate and format the parsed result
      return {
        analysis: parsedResult.analysis || "AI analysis completed",
        suggestedSteps: Array.isArray(parsedResult.suggestedSteps)
          ? parsedResult.suggestedSteps
          : ["Follow AI recommendations"],
        estimatedTime: parsedResult.estimatedTime || "2-3 hours",
        requiredParts: Array.isArray(parsedResult.requiredParts)
          ? parsedResult.requiredParts
          : ["To be determined"],
        priority: this.validatePriority(parsedResult.priority),
        confidence: parsedResult.confidence || 85,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error("Error parsing AI response:", error);
      // Fallback to mock analysis
      return {
        analysis: "AI analysis error - using fallback diagnostic",
        suggestedSteps: [
          "Perform basic diagnostic scan",
          "Consult service manual",
        ],
        estimatedTime: "2-3 hours",
        requiredParts: ["To be determined"],
        priority: "medium",
        confidence: 50,
        generatedAt: new Date(),
      };
    }
  }

  /**
   * Extract diagnostic information from plain text response
   */
  private extractFromPlainText(content: string): DiagnosticResult {
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    return {
      analysis: content.substring(0, 200) + "...",
      suggestedSteps: lines.slice(0, 5),
      estimatedTime: "2-4 hours",
      requiredParts: ["To be determined based on diagnosis"],
      priority: "medium",
      confidence: 75,
      generatedAt: new Date(),
    };
  }

  /**
   * Validate priority level
   */
  private validatePriority(priority: any): DiagnosticResult["priority"] {
    const validPriorities = ["low", "medium", "high", "critical"];
    return validPriorities.includes(priority) ? priority : "medium";
  }


  /**
   * Save diagnostic session for future reference
   */
  async saveDiagnosticSession(
    data: DiagnosticData,
    result: DiagnosticResult
  ): Promise<void> {
    try {
      // TODO: Implement diagnostic session storage
      // This could save to local storage, Firebase, or other backend
      console.log("Diagnostic session saved:", { data, result });
    } catch (error) {
      console.error("Failed to save diagnostic session:", error);
    }
  }

  /**
   * Get diagnostic history for a vehicle
   */
  async getDiagnosticHistory(vehicleId: string): Promise<any[]> {
    try {
      // TODO: Implement diagnostic history retrieval
      return [];
    } catch (error) {
      console.error("Failed to get diagnostic history:", error);
      return [];
    }
  }
}

export const diagnosticService = new DiagnosticService();
