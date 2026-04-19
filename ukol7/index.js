import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import ejs from 'ejs'
import { drizzle } from 'drizzle-orm/libsql'
import { todosTable } from './src/schema.js'
import { eq } from 'drizzle-orm'
import { createNodeWebSocket } from '@hono/node-ws'
import { WSContext } from 'hono/ws'

const db = drizzle({
    connection: "file:db.sqlite",
    logger: true,
})

/**
 * @type {Map<WSContext<WebSocket>>}
 */
let webSockets = new Map()

const app = new Hono()

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

const sendTodosToAllWebSockets = async () => {
    try {
        const todos = await db.select().from(todosTable).all();

        const html = await ejs.renderFile('views/_todos.html', {
            todos,
        });

        // Pro každé spojení ze seznamu všech spojení odešleme html jako serializaci do JSON
        // webSocket je mapa, takže tam musí být []
        for (const [webSocket] of webSockets) {
            webSocket.send(
                JSON.stringify({
                    type: 'todos',
                    html,
                }),
            );
        };
    } catch (e) {
        console.error(e);
    }
};

const sendTodoDetailToSubscribers = async (todoId) => {
    try {
        const todo = await db.select().from(todosTable).where(eq(todosTable.id, todoId)).get();

        if (!todo) {
            return;
        }

        const html = await ejs.renderFile('views/_todo-detail.html', {
            todo,
        });

        for (const [webSocket, meta] of webSockets) {
            if (meta.todoId === todoId) {
                webSocket.send(
                    JSON.stringify({
                        type: 'todo-detail',
                        todoId,
                        html,
                    }),
                );
            }
        }
    } catch (e) {
        console.error(e);
    }
};

const sendTodoDeletedToSubscribers = async (todoId) => {
    try {
        for (const [webSocket, meta] of webSockets) {
            if (meta.todoId === todoId) {
                webSocket.send(
                    JSON.stringify({
                        type: 'todo-deleted',
                        todoId,
                    }),
                );
            }
        }
    } catch (e) {
        console.error(e);
    }
};

app.use(async (c, next) => {
    console.log(c.req.method, c.req.url);
    await next();
    console.log(c.res.status);
}) // parametr c = context, obsahuje informace o requestu a response

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

app.get('/', async (c) => {
    const todos = await db.select().from(todosTable).all();

    const index = await ejs.renderFile('views/index.html', {
        name: 'TODO list',
        todos,
    });
    return c.html(index);
})

app.post('/todos', async (c) => {
    const form = await c.req.formData();

    const title = String(form.get('title') || '').trim()
    const priority = String(form.get('priority') || 'normal')

    if (!title) {
        return c.redirect('/')
    }

    await db.insert(todosTable).values({
        title: title,
        done: false,
        priority: priority,
    })

    sendTodosToAllWebSockets();

    return c.redirect('/');
})

app.get('/todos/:id/remove', async (c) => {
    const id = Number(c.req.param('id'));

    const todo = await db.select().from(todosTable).where(eq(todosTable.id, id)).get();

    if (!todo) {
        c.status(404);
        return c.html('<h1>Todo nenalezeno</h1><a href="/">Zpět</a>')
    }

    await db.delete(todosTable).where(eq(todosTable.id, id))

    sendTodosToAllWebSockets();
    sendTodoDeletedToSubscribers(id);

    return c.redirect('/');
})

app.get('/todos/:id/toggle', async (c) => {
    const id = Number(c.req.param('id'));

    const todo = await db.select().from(todosTable).where(eq(todosTable.id, id)).get();

    await db.update(todosTable).set({ done: !todo.done }).where(eq(todosTable.id, id));

    sendTodosToAllWebSockets();
    sendTodoDetailToSubscribers(id);

    return c.redirect(c.req.header('Referer'));
})

app.get('/todos/:id', async (c) => {
    const id = Number(c.req.param('id'));

    const todo = await db.select().from(todosTable).where(eq(todosTable.id, id)).get();

    if (!todo) {
        c.status(404);
        return c.html('<h1>Todo nenalezeno</h1><a href="/">Zpět</a>')
    }

    const detail = await ejs.renderFile('views/todo-detail.html', {
        todo,
    })

    return c.html(detail);
});

app.post('/todos/:id', async (c) => {
    const id = Number(c.req.param('id'));

    const todo = await db.select().from(todosTable).where(eq(todosTable.id, id)).get();

    if (!todo) {
        c.status(404);
        return c.html('<h1>Todo nenalezeno</h1><a href="/">Zpět</a>')
    }

    const form = await c.req.formData();

    const title = String(form.get('title') || '').trim();
    const priority = String(form.get('priority') || 'normal');

    await db.update(todosTable).set({ title, priority }).where(eq(todosTable.id, id));

    sendTodosToAllWebSockets();
    sendTodoDetailToSubscribers(id);

    return c.redirect(c.req.header('Referer'));
})

app.use((c) => {
    c.status(404);
    return c.html('<h1>404 Not Found</h1>');
})

const server = serve({
    fetch: app.fetch,
    port: 8000,
}, (info) => {
    console.log(`Server started on http://localhost:${info.port}`);
})

injectWebSocket(server)
