import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import ejs from 'ejs'

const app = new Hono()

let id = 1;

let todos = [
    {
        id: id++,
        title: "Zajít do obchodu",
        done: true,
    },
    {
        id: id++,
        title: "Uvařit oběd",
        done: false,
    }
]

app.use(async (c, next) => {
    console.log(c.req.method, c.req.url);
    await next();
    console.log(c.res.status);
}) // parametr c = context, obsahuje informace o requestu a response


app.get('/', async (c) => {
    const html = await ejs.renderFile('views/index.html', {
        name: 'TODO list',
        todos,
    });
    return c.html(html);
})

app.post('/add-todo', async (c) => {
    const body = await c.req.formData();
    const title = body.get('title');

    todos.push({
        id: id++,
        title,
        done: false,
    })

    return c.redirect('/');
})

app.get('/remove-todo/:id', async (c) => {
    const id = Number(c.req.param('id'));

    todos = todos.filter((todo) => todo.id !== id);

    return c.redirect('/');
})

app.get('/toggle-todo/:id', async (c) => {
    const id = Number(c.req.param('id'));

    const todo = todos.find((todo) => todo.id === id);
    todo.done = !todo.done;

    return c.redirect('/');
})

app.get('/todo/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const todo = todos.find((todo) => todo.id === id);

    if (!todo) {
        c.status(404);
        return c.html('<h1>Todo nenalezeno</h1><a href="/">Zpět</a>')
    }

    const html = await ejs.renderFile('views/todo-detail.html', {
        todo,
    })

    return c.html(html);
});

app.post('/update-todo/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const body = await c.req.formData();
    const title = body.get('title');

    const todo = todos.find((todo) => todo.id === id);

    if (!todo) {
        c.status(404);
        return c.html('<h1>Todo nenalezeno</h1><a href="/">Zpět</a>')
    }

    if (title && String(title).trim() !== '') {
        todo.title = String(title).trim();
    }

    return c.redirect(`/todo/${id}`)
})

app.use((c) => {
    c.status(404);
    return c.html('<h1>404 Not Found</h1>');
})

serve({
    fetch: app.fetch,
    port: 8000,
})

