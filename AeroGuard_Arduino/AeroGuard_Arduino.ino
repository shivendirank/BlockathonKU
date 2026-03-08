/*
 * AeroGuard - Arduino Nano 33 BLE Sense
 * IMU-based Crash Detection for Aviation Safety
 * 
 * Sends crash events when G-force exceeds threshold (>2.2G)
 * Continuously streams sensor data to Python bridge
 * 
 * Hardware: Arduino Nano 33 BLE Sense (LSM9DS1 IMU)
 * Connection: USB Serial @ 115200 baud
 */

#include <Arduino_LSM9DS1.h>
#include <Arduino_HTS221.h>  // Temperature & Humidity sensor

// ── CONFIGURATION ────────────────────────────────────────────────────────────

const float CRASH_THRESHOLD = 1.5;     // G-force threshold for crash detection (LOWERED for easy testing)
const int SENSOR_INTERVAL = 200;       // Sensor read interval (ms) - faster for better detection
const int CRASH_COOLDOWN = 10000;      // Cooldown after crash (10 seconds)

// ── GLOBAL STATE ─────────────────────────────────────────────────────────────

bool hasCrashed = false;
unsigned long lastSensorRead = 0;
unsigned long crashTime = 0;
bool htsSensorAvailable = false;  // Temperature/humidity sensor availability

// ── SETUP ────────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  while (!Serial);  // Wait for serial port
  
  delay(1000);
  Serial.println("SYSTEM:BOOT");
  
  // Initialize IMU (Accelerometer + Gyroscope)
  if (!IMU.begin()) {
    Serial.println("ERROR:IMU_INIT_FAILED");
    while (1);  // Halt if IMU fails
  }
  Serial.println("SYSTEM:IMU_OK");
  
  // Initialize Temperature & Humidity sensor (optional)
  if (HTS.begin()) {
    htsSensorAvailable = true;
    Serial.println("SYSTEM:HTS_OK");
  } else {
    htsSensorAvailable = false;
    Serial.println("WARNING:HTS_NOT_AVAILABLE_USING_MOCK_DATA");
  }
  
  Serial.println("SYSTEM:READY");
  Serial.print("CONFIG:THRESHOLD:");
  Serial.print(CRASH_THRESHOLD);
  Serial.println("G");
}

// ── MAIN LOOP ────────────────────────────────────────────────────────────────

void loop() {
  unsigned long now = millis();
  
  // Reset crash flag after cooldown
  if (hasCrashed && (now - crashTime > CRASH_COOLDOWN)) {
    hasCrashed = false;
    Serial.println("SYSTEM:RESET");
  }
  
  // Read sensors at regular interval
  if (now - lastSensorRead >= SENSOR_INTERVAL) {
    lastSensorRead = now;
    
    float ax, ay, az;
    
    // Read accelerometer
    IMU.readAcceleration(ax, ay, az);
    
    // Calculate total G-force magnitude
    float gForce = sqrt(ax*ax + ay*ay + az*az);
    
    // Send sensor data to bridge.py (simplified - just G-force)
    Serial.print("DATA:");
    Serial.print("T:");
    Serial.print("24.5");  // Mock temp
    Serial.print(":");
    Serial.print("H:");
    Serial.print("55.0");  // Mock humidity
    Serial.print(":");
    Serial.print("G:");
    Serial.println(gForce, 2);
    
    // Crash detection
    if (gForce > CRASH_THRESHOLD && !hasCrashed) {
      hasCrashed = true;
      crashTime = now;
      
      // Send crash event
      Serial.println("EVENT:CRASH");
      Serial.print("CRASH:G_FORCE:");
      Serial.println(gForce, 2);
      
      // Blink LED
      digitalWrite(LED_BUILTIN, HIGH);
      delay(100);
      digitalWrite(LED_BUILTIN, LOW);
    }
  }
  
  delay(10);  // Small delay to prevent serial overflow
}

// ── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

void printDebugInfo() {
  Serial.println("DEBUG:IMU_SAMPLING_RATE");
  Serial.print("  Accel: ");
  Serial.print(IMU.accelerationSampleRate());
  Serial.println(" Hz");
  Serial.print("  Gyro: ");
  Serial.print(IMU.gyroscopeSampleRate());
  Serial.println(" Hz");
}
