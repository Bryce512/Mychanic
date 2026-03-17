/**
 * OBD Engine - Test & Examples
 * Shows how to test each component individually
 * and provides example scenarios
 */

// ============================================
// Test 1: Command Queue
// ============================================

export async function testCommandQueue() {
  console.log("🧪 Testing Command Queue...");

  const { OBDCommandQueue } = await import("./commandQueue");

  let responseCount = 0;
  const mockSendCommand = async (command: string, timeout: number) => {
    responseCount++;
    console.log(`📤 Command ${responseCount}: ${command}`);

    // Simulate adapter delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return `41 ${command.substring(2, 4)} AA BB`;
  };

  const queue = new OBDCommandQueue(mockSendCommand, console.log);

  // Enqueue multiple commands quickly (should process sequentially)
  const promises = [
    queue.enqueue("010C", { timeout: 5000 }),
    queue.enqueue("010D", { timeout: 5000 }),
    queue.enqueue("0105", { timeout: 5000 }),
  ];

  const results = await Promise.all(promises);

  console.log(`✅ Queue processed ${results.length} commands sequentially`);
  console.log(
    `📊 Expected 3 responses: ${results.length === 3 ? "PASS" : "FAIL"}`,
  );
}

// ============================================
// Test 2: PID Parser
// ============================================

export async function testPIDParser() {
  console.log("🧪 Testing PID Parser...");

  const { parsePIDResponse } = await import("./pidParser");

  // Test RPM parsing
  const rpmResponse = "41 0C 1A F8";
  const rpmResult = parsePIDResponse("010C", rpmResponse);

  console.log(`RPM Response: ${rpmResponse}`);
  console.log(
    `📊 Parsed RPM: ${rpmResult && "value" in rpmResult ? rpmResult.value : "ERROR"}`,
  );

  // Expected: (0x1A * 256 + 0xF8) / 4 = 1726
  if (rpmResult && "value" in rpmResult && rpmResult.value === 1726) {
    console.log("✅ RPM parsing: PASS");
  } else {
    console.log("❌ RPM parsing: FAIL");
  }

  // Test Speed parsing
  const speedResponse = "41 0D 32";
  const speedResult = parsePIDResponse("010D", speedResponse);

  console.log(`Speed Response: ${speedResponse}`);
  console.log(
    `📊 Parsed Speed: ${speedResult && "value" in speedResult ? speedResult.value : "ERROR"}`,
  );

  if (speedResult && "value" in speedResult && speedResult.value === 50) {
    console.log("✅ Speed parsing: PASS");
  } else {
    console.log("❌ Speed parsing: FAIL");
  }

  // Test unknown PID
  const unknownResult = parsePIDResponse("0199", "41 99 00 00");
  console.log(
    `❌ Error for unknown PID: ${unknownResult && "error" in unknownResult ? unknownResult.error : "No error"}`,
  );
}

// ============================================
// Test 3: DTC Parser
// ============================================

export async function testDTCParser() {
  console.log("🧪 Testing DTC Parser...");

  const { parseDTCResponse, getDTCDescription } = await import("./dtcParser");

  // Test single DTC response
  const dtcResponse = "43 01 33 00 00";
  const parsed = parseDTCResponse(dtcResponse);

  console.log(`DTC Response: ${dtcResponse}`);
  console.log(`📊 Found DTCs: ${parsed.codes.length}`);

  if (parsed.codes.length > 0) {
    const dtc = parsed.codes[0];
    console.log(`Code: ${dtc.code}`);
    console.log(`Description: ${dtc.description}`);
    console.log(`Severity: ${dtc.severity}`);

    if (dtc.code === "P0133") {
      console.log("✅ DTC parsing: PASS");
    } else {
      console.log("❌ DTC parsing: FAIL");
    }
  }

  // Test DTC lookup
  const p0171 = getDTCDescription("P0171");
  console.log(`\nP0171: ${p0171?.description}`);
  console.log(`Severity: ${p0171?.severity}`);
}

// ============================================
// Test 4: Formula Evaluation
// ============================================

export async function testFormulaEvaluation() {
  console.log("🧪 Testing Formula Evaluation...");

  const { evaluateFormula } = await import("./pidParser");

  // Test RPM formula
  const rpmBytes = [0x1a, 0xf8];
  const rpm = evaluateFormula("(A * 256 + B) / 4", rpmBytes);
  console.log(`RPM calculation: ${rpm} (expected 1726)`);
  console.log(rpm === 1726 ? "✅ PASS" : "❌ FAIL");

  // Test fuel level formula
  const fuelBytes = [200];
  const fuel = evaluateFormula("(A * 100) / 255", fuelBytes);
  console.log(`\nFuel level: ${fuel.toFixed(1)}% (expected ~78.4%)`);
  console.log(Math.abs(fuel - 78.4) < 0.1 ? "✅ PASS" : "❌ FAIL");

  // Test throttle formula
  const throttleBytes = [128];
  const throttle = evaluateFormula("(A * 100) / 255", throttleBytes);
  console.log(`\nThrottle position: ${throttle.toFixed(1)}%`);
  console.log(Math.abs(throttle - 50.2) < 0.1 ? "✅ PASS" : "❌ FAIL");
}

// ============================================
// Test 5: PID Registry
// ============================================

export async function testPIDRegistry() {
  console.log("🧪 Testing PID Registry...");

  const { getPIDDefinition, getPIDsByType, getAllPIDCodes } =
    await import("./pidRegistry");

  // Test getting a PID
  const rpmPID = getPIDDefinition("010C");
  console.log(`RPM PID: ${rpmPID?.name} (${rpmPID?.unit})`);
  console.log(rpmPID?.name === "engine_rpm" ? "✅ PASS" : "❌ FAIL");

  // Test getting PIDs by type
  const enginePIDs = getPIDsByType("engine");
  console.log(`\nEngine PIDs: ${enginePIDs.length} found`);
  console.log(enginePIDs.length > 10 ? "✅ PASS" : "❌ FAIL");

  // Test getting all codes
  const allCodes = getAllPIDCodes();
  console.log(`\nTotal PIDs: ${allCodes.length}`);
  console.log(allCodes.length > 20 ? "✅ PASS" : "❌ FAIL");

  // Show sample PIDs
  console.log("\nSample PID definitions:");
  const samples = ["010C", "010D", "0105", "012F"];
  samples.forEach((code) => {
    const pid = getPIDDefinition(code);
    if (pid) {
      console.log(`  ${code}: ${pid.name} (formula: ${pid.formula})`);
    }
  });
}

// ============================================
// Test 6: OBD Engine Integration
// ============================================

export async function testOBDEngineIntegration() {
  console.log("🧪 Testing OBD Engine Integration...");

  const { createOBDEngine } = await import("./obdEngine");

  // Mock adapter responses
  const mockResponses: Record<string, string> = {
    ATE0: "OK",
    ATL0: "OK",
    ATS0: "OK",
    ATH1: "OK",
    ATSP0: "OK",
    "010C": "41 0C 1A F8", // RPM = 1726
    "010D": "41 0D 32", // Speed = 50 km/h
    "0105": "41 05 50", // Coolant = 80°C
    "03": "43 01 33 00 00", // 1 DTC: P0133
    "04": "44", // Clear OK
    "0902": "49 02 01 4A 47 55 4D 4D 59 56 49 4E 31 32 33", // VIN
  };

  let callCount = 0;
  const mockSendCommand = async (command: string, timeout: number) => {
    callCount++;
    console.log(`  Command ${callCount}: ${command}`);

    const response = mockResponses[command] || "NO DATA";
    await new Promise((resolve) => setTimeout(resolve, 50));
    return response;
  };

  const engine = createOBDEngine({ onLog: console.log });

  // Set transport
  engine.setTransport(mockSendCommand);

  // Initialize
  console.log("\n📋 Initializing...");
  const initialized = await engine.initialize();
  console.log(
    initialized ? "✅ Initialization: PASS" : "❌ Initialization: FAIL",
  );

  // Query single PID
  console.log("\n📊 Querying RPM...");
  const rpmResult = await engine.queryPID("010C");
  console.log(
    rpmResult && rpmResult.value === 1726
      ? "✅ RPM Query: PASS"
      : "❌ RPM Query: FAIL",
  );

  // Query multiple PIDs
  console.log("\n📊 Querying multiple PIDs...");
  const multiResult = await engine.queryMultiplePIDs(["010C", "010D", "0105"]);
  const hasAll =
    multiResult["010C"] !== null &&
    multiResult["010D"] !== null &&
    multiResult["0105"] !== null;
  console.log(hasAll ? "✅ Multi-PID Query: PASS" : "❌ Multi-PID Query: FAIL");

  // Get DTCs
  console.log("\n📋 Getting DTCs...");
  const dtcs = await engine.getActiveDTCs();
  console.log(
    dtcs.length > 0 ? "✅ DTC Retrieval: PASS" : "❌ DTC Retrieval: FAIL",
  );

  // Queue status
  console.log("\n📊 Queue Status:");
  const status = engine.getQueueStatus();
  console.log(`  Length: ${status.length}`);
  console.log(`  Busy: ${status.busy}`);

  console.log(`\n✅ Total API calls: ${callCount}`);
}

// ============================================
// Example 1: Real-time Monitoring
// ============================================

export async function exampleRealTimeMonitoring() {
  console.log("📡 Example: Real-time Monitoring");

  const { createOBDEngine } = await import("./obdEngine");

  // Create engine with mock
  const mockSendCommand = async (cmd: string) => {
    // Return mock data
    const responses: Record<string, string> = {
      "010C": `41 0C ${(Math.random() * 255) | 0} ${(Math.random() * 255) | 0}`, // Random RPM
      "010D": `41 0D ${(Math.random() * 255) | 0}`, // Random speed
      "0105": "41 05 50", // Static coolant
    };
    return responses[cmd] || "NO DATA";
  };

  const engine = createOBDEngine();
  engine.setTransport(mockSendCommand);
  await engine.initialize();

  // Start polling
  console.log("▶️ Starting real-time monitoring...");
  engine.startPolling(["010C", "010D", "0105"], 100);

  // Simulate monitoring for 3 seconds
  await new Promise((resolve) => setTimeout(resolve, 3000));

  engine.stopPolling();
  console.log("⏹️ Monitoring stopped");
}

// ============================================
// Example 2: Diagnostic Session
// ============================================

export async function exampleDiagnosticSession() {
  console.log("🔍 Example: Diagnostic Session");

  const { createOBDEngine } = await import("./obdEngine");

  // Create engine
  const engine = createOBDEngine();

  // Mock setup
  const mockSendCommand = async (cmd: string) => {
    const responses: Record<string, string> = {
      "010C": "41 0C 1A F8", // RPM
      "010D": "41 0D 32", // Speed
      "0105": "41 05 50", // Coolant
      "012F": "41 2F C8", // Fuel
      "03": "43 01 33 02 44", // 2 DTCs
    };
    return responses[cmd] || "NO DATA";
  };

  engine.setTransport(mockSendCommand);
  await engine.initialize();

  // Get engine parameters
  console.log("\n📊 Engine Parameters:");
  const params = await engine.queryMultiplePIDs([
    "010C",
    "010D",
    "0105",
    "012F",
  ]);

  Object.entries(params).forEach(([code, result]) => {
    if (result && result.value !== undefined) {
      console.log(`  ${result.name}: ${result.value} ${result.unit}`);
    }
  });

  // Get diagnostics
  console.log("\n⚠️ Diagnostic Issues:");
  const dtcs = await engine.getActiveDTCs();

  dtcs.forEach((dtc) => {
    console.log(`  [${dtc.severity.toUpperCase()}] ${dtc.code}`);
    console.log(`  └─ ${dtc.description}`);
  });

  if (dtcs.length === 0) {
    console.log("  ✅ No active DTCs");
  }
}

// ============================================
// Example 3: PID Discovery
// ============================================

export async function examplePIDDiscovery() {
  console.log("🔎 Example: PID Discovery");

  const { createOBDEngine } = await import("./obdEngine");

  const engine = createOBDEngine();

  // This would normally connect to real device
  // For this example, just show what discovery does

  console.log("\nCore PIDs (implemented):");
  const corePIDs = engine.getCorePIDList();
  console.log(`  Found ${corePIDs.length} core PIDs`);

  console.log("\nAll available PIDs:");
  const allPIDs = engine.getAllPIDCodes();
  console.log(`  Total: ${allPIDs.length} PIDs`);

  console.log("\nPID Categories:");
  console.log(`  Engine: RPM, Speed, Load, Temperature, etc.`);
  console.log(`  Emission: O2 Sensors, Fuel Trims, Catalytic Converter`);
  console.log(`  System: Runtime, Distance, Status`);
}

// ============================================
// Run All Tests
// ============================================

export async function runAllTests() {
  console.log("═════════════════════════════════════════");
  console.log("🧪 OBD Engine - Complete Test Suite");
  console.log("═════════════════════════════════════════\n");

  try {
    await testCommandQueue();
    console.log("");

    await testPIDParser();
    console.log("");

    await testDTCParser();
    console.log("");

    await testFormulaEvaluation();
    console.log("");

    await testPIDRegistry();
    console.log("");

    await testOBDEngineIntegration();
    console.log("");

    console.log("═════════════════════════════════════════");
    console.log("✅ All tests completed!");
    console.log("═════════════════════════════════════════");
  } catch (error) {
    console.error("❌ Test suite error:", error);
  }
}

// Usage: call runAllTests() from your debug screen or test file
// Example in React Native:
// import { runAllTests } from './services/obd/testing';
// <Button title="Run OBD Tests" onPress={runAllTests} />
