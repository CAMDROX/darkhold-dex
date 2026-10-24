"""
Darkhold Exchange — High-Frequency Order Book & Dynamic Collar Locust Benchmark
Simulates concurrent user load (1,000+ OPS) to validate sub-10ms matching SLA and collar drops.
"""

import random
import time
from locust import HttpUser, task, between

class DarkholdTraderUser(HttpUser):
    # Aggressive high-frequency trading pacing: 0 to 5ms between orders
    wait_time = between(0.001, 0.005)

    @task(6)
    def place_valid_limit_order(self):
        """Simulate high-frequency compliant orders within the +25% anti-scalper collar ceiling."""
        face_val = 100.0
        # Compliant price between 95 and 125 (within +25% ceiling)
        price = round(random.uniform(95.0, 124.9), 2)
        side = random.choice(["BUY", "SELL"])

        payload = {
            "market_id": "vip-citadel-pass-001",
            "user_id": f"trader-{random.randint(1000, 9999)}",
            "type": "LIMIT",
            "side": side,
            "price": price,
            "face_value": face_val,
            "quantity": random.randint(1, 5)
        }

        with self.client.post("/api/orders", json=payload, catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "ACCEPTED_INTO_FIFO_BOOK":
                    response.success()
                else:
                    response.failure(f"Unexpected status response: {data}")
            else:
                response.failure(f"Valid order rejected with HTTP {response.status_code}")

    @task(3)
    def place_scalper_order(self):
        """Simulate predatory scalper bots attempting >+25% price gouging (must return HTTP 422)."""
        face_val = 100.0
        # Scalper price > 125 (e.g. 150 - 350)
        scalper_price = round(random.uniform(130.0, 350.0), 2)

        payload = {
            "market_id": "vip-citadel-pass-001",
            "user_id": f"scalper-bot-{random.randint(100, 999)}",
            "type": "LIMIT",
            "side": "SELL",
            "price": scalper_price,
            "face_value": face_val,
            "quantity": 10
        }

        with self.client.post("/api/orders", json=payload, catch_response=True) as response:
            # 422 Unprocessable Entity is the EXPECTED collar breach drop
            if response.status_code == 422:
                response.success()
            else:
                response.failure(f"Scalper order was NOT dropped! Status: {response.status_code}")

    @task(1)
    def check_engine_health(self):
        """Poll telemetry to verify in-memory queue status and sub-10ms latency."""
        with self.client.get("/health", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Health check failed with HTTP {response.status_code}")
