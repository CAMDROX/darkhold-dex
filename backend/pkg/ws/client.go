package ws

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 512 * 1024
)

// Upgrader configures HTTP to WebSocket protocol upgrades
var Upgrader = websocket.Upgrader{
	ReadBufferSize:  2048,
	WriteBufferSize: 2048,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins in development and staging
		return true
	},
}

// Client represents a single connected WebSocket client (e.g. browser tab or bot)
type Client struct {
	hub *Hub

	// The actual websocket connection
	conn *websocket.Conn

	// Buffered channel of outbound messages
	send chan []byte

	// User Identity details extracted from verified JWT (if authenticated)
	UserID   *uuid.UUID
	Username string
	Role     string

	// Thread-safe map of active room subscriptions for this client
	mu    sync.RWMutex
	rooms map[string]bool
}

// NewClient initializes a new Client instance
func NewClient(hub *Hub, conn *websocket.Conn, userID *uuid.UUID, username, role string) *Client {
	return &Client{
		hub:      hub,
		conn:     conn,
		send:     make(chan []byte, 256),
		UserID:   userID,
		Username: username,
		Role:     role,
		rooms:    make(map[string]bool),
	}
}

// IsInRoom returns whether this client is currently subscribed to a room
func (c *Client) IsInRoom(topic string) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.rooms[topic]
}

// AddRoom marks the client as subscribed to a room
func (c *Client) AddRoom(topic string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.rooms[topic] = true
}

// RemoveRoom removes the room from the client's local subscription map
func (c *Client) RemoveRoom(topic string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.rooms, topic)
}

// SendJSON encodes and places a WSMessage on the client's send channel
func (c *Client) SendJSON(msg WSMessage) {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("⚠️  [WS Client] Failed to serialize message: %v", err)
		return
	}

	select {
	case c.send <- bytes:
	default:
		log.Printf("⚠️  [WS Client] Send buffer full for user %s, dropping frame", c.Username)
	}
}

// ReadPump pumps messages from the websocket connection to the hub.
func (c *Client) ReadPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("⚠️  [WS Read Error]: %v", err)
			}
			break
		}

		// Handle client inbound actions (e.g. subscribe, unsubscribe, ping)
		var action InboundAction
		if err := json.Unmarshal(message, &action); err != nil {
			c.SendJSON(NewMessage(EventError, "", map[string]string{
				"error": "Malformed JSON payload",
			}))
			continue
		}

		c.handleInboundAction(action)
	}
}

func (c *Client) handleInboundAction(action InboundAction) {
	switch action.Action {
	case "ping":
		c.SendJSON(NewMessage(EventPong, "", map[string]interface{}{
			"reply": "pong",
			"time":  time.Now().UTC(),
		}))

	case "subscribe":
		if action.Topic == "" {
			c.SendJSON(NewMessage(EventError, "", map[string]string{
				"error": "Topic is required to subscribe",
			}))
			return
		}

		// Authorization Guard: Only Admins can subscribe to admin:compliance
		if action.Topic == TopicAdminCompliance && c.Role != "admin" {
			c.SendJSON(NewMessage(EventError, action.Topic, map[string]string{
				"error": "Forbidden: Admin privileges required to subscribe to compliance room",
			}))
			return
		}

		c.hub.Subscribe(c, action.Topic)
		c.SendJSON(NewMessage(EventSubscribed, action.Topic, map[string]string{
			"status": "Subscribed to " + action.Topic,
		}))

	case "unsubscribe":
		if action.Topic != "" {
			c.hub.Unsubscribe(c, action.Topic)
			c.SendJSON(NewMessage(EventUnsubscribed, action.Topic, map[string]string{
				"status": "Unsubscribed from " + action.Topic,
			}))
		}

	default:
		c.SendJSON(NewMessage(EventError, "", map[string]string{
			"error": "Unknown action: " + action.Action,
		}))
	}
}

// WritePump pumps messages from the hub to the websocket connection.
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			_, _ = w.Write(message)

			// Add queued chat messages to the current websocket message.
			n := len(c.send)
			for i := 0; i < n; i++ {
				_, _ = w.Write([]byte{'\n'})
				_, _ = w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
