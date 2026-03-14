import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

class WebSocketService {
    constructor() {
        this.client = null
        this.subscriptions = {}
    }

    connect(onConnect) {
        if (!this.onConnectCallbacks) this.onConnectCallbacks = []
        if (onConnect) this.onConnectCallbacks.push(onConnect)

        if (this.client && this.client.connected) {
            this.onConnectCallbacks.forEach(cb => cb())
            this.onConnectCallbacks = []
            return
        }
        if (this.client) return

        this.client = new Client({
            webSocketFactory: () => new SockJS('/ws'),
            debug: (str) => console.log(str),
            onConnect: () => {
                console.log('Connected to WebSocket')
                if (this.onConnectCallbacks) {
                    this.onConnectCallbacks.forEach(cb => cb())
                    this.onConnectCallbacks = []
                }
            },
            onStompError: (frame) => {
                console.error('STOMP error', frame)
            }
        })

        this.client.activate()
    }

    subscribe(destination, callback) {
        if (!this.client || !this.client.connected) {
            console.error('WebSocket not connected')
            return
        }

        const subId = this.client.subscribe(destination, (message) => {
            callback(JSON.parse(message.body))
        })

        this.subscriptions[destination] = subId
        return subId
    }

    unsubscribe(subId) {
        if (subId && typeof subId.unsubscribe === 'function') {
            subId.unsubscribe()
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
        }
    }
}

const wsService = new WebSocketService()
export default wsService
