import { Hono } from 'hono'
import { WSContext } from 'hono/ws'
import ejs from 'ejs'
import { todosTable } from './schema.js'
import { db } from './db.js'
import { eq } from 'drizzle-orm'
import {
    sendTodoDeletedToSubscribers,
    sendTodoDetailToSubscribers,
    sendTodosToAllWebSockets,
} from './websockets.js'

export const app = new Hono()

app.use(async (c, next) => {
    console.log(c.req.method, c.req.url);
    await next();
    console.log(c.res.status);
}) // parametr c = context, obsahuje informace o requestu a response

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