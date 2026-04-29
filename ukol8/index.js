import { createNodeWebSocket } from '@hono/node-ws'
import { serve } from '@hono/node-server'
import { app } from './src/app.js'
import { webSockets } from './src/websockets.js'

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

app.get(
    '/ws',
    upgradeWebSocket((c) => ({
        onOpen: (evt, ws) => { //evt = event
            webSockets.set(ws, {
                todoId: null,
            });
            console.log('open web sockets: ', webSockets.size);
        },
        onMessage: (evt, ws) => {
            try {
                const json = JSON.parse(evt.data);

                if (json.type === 'subscribe-todo-detail') {
                    webSockets.set(ws, {
                        todoId: Number(json.todoId),
                    });
                }
            } catch (e) {
                console.error(e);
            }
        },
        onClose: (evt, ws) => {
            webSockets.delete(ws);
            console.log('close');
        },
    })),
)

const server = serve({
    fetch: app.fetch,
    port: 8000,
}, (info) => {
    console.log(`Server started on http://localhost:${info.port}`);
})

injectWebSocket(server)
