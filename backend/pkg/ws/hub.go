package ws

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/google/uuid"
)

// GlobalHub holds the singleton instance of Hub accessible across backend handlers
var GlobalHub *Hub

// RoomBroadcast holds a message targeted to a specific room/topic
type RoomBroadcast struct {
	Topic   string
	Message WSMessage
}

// UserBroadcast holds a message targeted to a specific user across all their devices
type UserBroadcast struct {
	UserID  uuid.UUID
	Message WSMessage
}

// SubscriptionRequest manages dynamic room subscription changes
type SubscriptionRequest struct {
	Client *Client
	Topic  string
}

// Hub maintains the set of active clients and broadcasts messages to the clients.
type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Rooms / Topics: map[topic]map[*Client]bool
	rooms map[string]map[*Client]bool

	// User client index: map[userID]map[*Client]bool
	userClients map[uuid.UUID]map[*Client]bool

	// Inbound message channels
	broadcast     chan WSMessage
	roomBroadcast chan RoomBroadcast
	userBroadcast chan UserBroadcast

	// Register / Unregister client channels
	register   chan *Client
	unregister chan *Client

	// Room subscription channels
	subscribe   chan SubscriptionRequest
	unsubscribe chan SubscriptionRequest

	mu sync.RWMutex
}

// NewHub creates a new Hub instance
func NewHub() *Hub {
	return &Hub{
		clients:       make(map[*Client]bool),
		rooms:         make(map[string]map[*Client]bool),
		userClients:   make(map[uuid.UUID]map[*Client]bool),
		broadcast:     make(chan WSMessage, 1024),
		roomBroadcast: make(chan RoomBroadcast, 1024),
		userBroadcast: make(chan UserBroadcast, 1024),
		register:      make(chan *Client, 256),
		unregister:    make(chan *Client, 256),
		subscribe:     make(chan SubscriptionRequest, 256),
		unsubscribe:   make(chan SubscriptionRequest, 256),
	}
}

// Run executes the central event loop in a dedicated Goroutine
func (h *Hub) Run() {
	log.Println("⚡ [WebSocket Hub] Real-Time Messaging Hub started.")

	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true

			// Register in userClients index if authenticated
			if client.UserID != nil {
				uid := *client.UserID
				if _, ok := h.userClients[uid]; !ok {
					h.userClients[uid] = make(map[*Client]bool)
				}
				h.userClients[uid][client] = true
			}
			h.mu.Unlock()

			// Send welcome acknowledgment
			client.SendJSON(NewMessage(EventConnected, "", map[string]interface{}{
				"status":        "CONNECTED",
				"authenticated": client.UserID != nil,
				"username":      client.Username,
				"role":          client.Role,
			}))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)

				// Remove from userClients index
				if client.UserID != nil {
					uid := *client.UserID
					if userSet, exists := h.userClients[uid]; exists {
						delete(userSet, client)
						if len(userSet) == 0 {
							delete(h.userClients, uid)
						}
					}
				}

				// Remove from all rooms
				for topic, roomSet := range h.rooms {
					if _, inRoom := roomSet[client]; inRoom {
						delete(roomSet, client)
						if len(roomSet) == 0 {
							delete(h.rooms, topic)
						}
					}
				}
			}
			h.mu.Unlock()

		case req := <-h.subscribe:
			h.mu.Lock()
			if _, ok := h.rooms[req.Topic]; !ok {
				h.rooms[req.Topic] = make(map[*Client]bool)
			}
			h.rooms[req.Topic][req.Client] = true
			req.Client.AddRoom(req.Topic)
			h.mu.Unlock()

		case req := <-h.unsubscribe:
			h.mu.Lock()
			if roomSet, ok := h.rooms[req.Topic]; ok {
				delete(roomSet, req.Client)
				if len(roomSet) == 0 {
					delete(h.rooms, req.Topic)
				}
			}
			req.Client.RemoveRoom(req.Topic)
			h.mu.Unlock()

		case msg := <-h.broadcast:
			// Broadcast to ALL connected clients
			bytes, err := json.Marshal(msg)
			if err != nil {
				continue
			}

			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- bytes:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()

		case rb := <-h.roomBroadcast:
			// Broadcast to subscribers of a specific room/topic
			bytes, err := json.Marshal(rb.Message)
			if err != nil {
				continue
			}

			h.mu.RLock()
			if roomSet, exists := h.rooms[rb.Topic]; exists {
				for client := range roomSet {
					select {
					case client.send <- bytes:
					default:
						close(client.send)
						delete(h.clients, client)
					}
				}
			}
			h.mu.RUnlock()

		case ub := <-h.userBroadcast:
			// Broadcast to all active sessions of a specific User
			bytes, err := json.Marshal(ub.Message)
			if err != nil {
				continue
			}

			h.mu.RLock()
			if userSet, exists := h.userClients[ub.UserID]; exists {
				for client := range userSet {
					select {
					case client.send <- bytes:
					default:
						close(client.send)
						delete(h.clients, client)
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Register queues a client registration
func (h *Hub) Register(client *Client) {
	h.register <- client
}

// Unregister queues a client removal
func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

// Subscribe queues a client subscription to a topic
func (h *Hub) Subscribe(client *Client, topic string) {
	h.subscribe <- SubscriptionRequest{Client: client, Topic: topic}
}

// Unsubscribe queues a client removal from a topic
func (h *Hub) Unsubscribe(client *Client, topic string) {
	h.unsubscribe <- SubscriptionRequest{Client: client, Topic: topic}
}

// BroadcastToRoom dispatches a message to all clients in a specific topic/room
func (h *Hub) BroadcastToRoom(topic string, event string, data interface{}) {
	if h == nil {
		return
	}
	msg := NewMessage(event, topic, data)
	h.roomBroadcast <- RoomBroadcast{Topic: topic, Message: msg}
}

// BroadcastToUser dispatches a message to all active sessions/tabs of a specific user
func (h *Hub) BroadcastToUser(userID uuid.UUID, event string, data interface{}) {
	if h == nil {
		return
	}
	msg := NewMessage(event, "user:"+userID.String(), data)
	h.userBroadcast <- UserBroadcast{UserID: userID, Message: msg}
}

// BroadcastAll dispatches a message to every connected client
func (h *Hub) BroadcastAll(event string, data interface{}) {
	if h == nil {
		return
	}
	msg := NewMessage(event, "global", data)
	h.broadcast <- msg
}

// GetOnlineStats returns real-time hub metrics
func (h *Hub) GetOnlineStats() map[string]interface{} {
	h.mu.RLock()
	defer h.mu.RUnlock()

	activeRooms := make(map[string]int)
	for topic, set := range h.rooms {
		activeRooms[topic] = len(set)
	}

	return map[string]interface{}{
		"total_connected_clients": len(h.clients),
		"authenticated_users":     len(h.userClients),
		"active_topics":           activeRooms,
	}
}
