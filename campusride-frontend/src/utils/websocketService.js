import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

class WebSocketService {
    constructor() {
        this.client = null
        this.subscriptions = {} // destination -> { callbacks: Set, subObj: null }
        this.onConnectCallbacks = []
    }

    connect(onConnect) {
        if (onConnect && !this.onConnectCallbacks.includes(onConnect)) {
            this.onConnectCallbacks.push(onConnect)
        }

        if (this.client && this.client.connected) {
            if (onConnect) onConnect()
            return
        }
        if (this.client) return

        this.client = new Client({
            webSocketFactory: () => new SockJS('/ws'),
            debug: (str) => console.log(str),
            onConnect: () => {
                console.log('Connected to WebSocket')
                
                // Re-subscribe to all existing destinations
                Object.keys(this.subscriptions).forEach(destination => {
                    this._doSubscribe(destination)
                })

                if (this.onConnectCallbacks) {
                    this.onConnectCallbacks.forEach(cb => cb())
                }
            },
            onStompError: (frame) => {
                console.error('STOMP error', frame)
            }
        })

        this.client.activate()
    }

    subscribe(destination, callback) {
        if (!this.subscriptions[destination]) {
            this.subscriptions[destination] = {
                callbacks: new Set(),
                subObj: null
            }
        }
        
        this.subscriptions[destination].callbacks.add(callback)

        if (this.client && this.client.connected) {
            this._doSubscribe(destination)
        }

        return {
            unsubscribe: () => {
                const sub = this.subscriptions[destination]
                if (sub) {
                    sub.callbacks.delete(callback)
                    if (sub.callbacks.size === 0) {
                        if (sub.subObj) sub.subObj.unsubscribe()
                        delete this.subscriptions[destination]
                    }
                }
            }
        }
    }

    _doSubscribe(destination) {
        const sub = this.subscriptions[destination]
        if (!sub) return

        // Unsubscribe existing if any (to avoid duplicates on manual re-sub)
        if (sub.subObj) {
            sub.subObj.unsubscribe()
        }

        sub.subObj = this.client.subscribe(destination, (message) => {
            const data = JSON.parse(message.body)
            sub.callbacks.forEach(cb => cb(data))
        })
    }

    unsubscribe(subHandle) {
        if (subHandle && typeof subHandle.unsubscribe === 'function') {
            subHandle.unsubscribe()
        }
    }

    send(destination, payload) {
        if (!this.client || !this.client.connected) {
            console.error('WebSocket not connected')
            return
        }
        this.client.publish({
            destination,
            body: JSON.stringify(payload)
        })
    }

    disconnect() {
        if (this.client) {
            this.client.deactivate()
            this.client = null
            // Clear internal state but keep callbacks for next connect? 
            // Usually, disconnect means we're done.
            this.subscriptions = {}
            this.onConnectCallbacks = []
        }
    }
}

const wsService = new WebSocketService()
export default wsService
