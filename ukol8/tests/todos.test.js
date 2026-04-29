import test from 'ava'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { sql, eq } from 'drizzle-orm'
import { app } from '../src/app.js'
import { db } from '../src/db.js'
import { todosTable } from '../src/schema.js'

test.before('migrate database', async () => {
    await migrate(db, {
        migrationsFolder: './drizzle',
    })
})

test.beforeEach(async () => {
    await db.run(sql`DELETE FROM todos`)
})

test.serial('it shows proper title', async (t) => {
    const response = await app.request('/')
    const html = await response.text()

    t.is(response.status, 200)
    t.true(html.includes('TODO list'))
})

test.serial('it shows todos', async (t) => {
    await db.insert(todosTable).values({
        title: 'Moje todočko',
        priority: 'medium',
        done: false,
    })

    const response = await app.request('/')
    const html = await response.text()

    t.is(response.status, 200)
    t.true(html.includes('Moje todočko'))
})

test.serial('it allows creating todos', async (t) => {
    const formData = new FormData()
    formData.set('title', 'Testovací todočko')
    formData.set('priority', 'medium')

    const response = await app.request('/todos', {
        method: 'POST',
        body: formData,
    })

    t.is(response.status, 302)

    const location = response.headers.get('location')
    t.is(location, '/')

    const response2 = await app.request(location)
    const html = await response2.text()

    t.is(response2.status, 200)
    t.true(html.includes('Testovací todočko'))
})


// VLASTNÍ TESTY:
test.serial('it returns 404 for a missing todo detail', async (t) => {
    const response = await app.request('/todos/999999');
    const html = await response.text();

    t.is(response.status, 404);
    t.true(html.includes('Todo nenalezeno'));
});

test.serial('it shows todo detail', async (t) => {
    const inserted = await db.insert(todosTable).values({
        title: 'Detail todočka',
        priority: 'high',
        done: false,
    }).returning();

    const todo = inserted[0];

    const response = await app.request(`/todos/${todo.id}`);
    const html = await response.text();

    t.is(response.status, 200);
    t.true(html.includes('Detail todočka'));
    t.true(html.includes('high'));
});

test.serial('it allows deleting todo', async (t) => {
    const inserted = await db.insert(todosTable).values({
        title: 'Todo ke smazání',
        priority: 'low',
        done: false,
    }).returning();

    const todo = inserted[0];

    const response = await app.request(`/todos/${todo.id}/remove`);

    t.is(response.status, 302);
    t.is(response.headers.get('location'), '/');

    const todos = await db.select().from(todosTable).where(eq(todosTable.id, todo.id)).all();
    t.is(todos.length, 0);
});

test.serial('it shows todo priority on homepage', async (t) => {
    await db.insert(todosTable).values({
        title: 'Prioritní todočko',
        priority: 'high',
        done: true,
    });

    const response = await app.request('/');
    const html = await response.text();

    t.is(response.status, 200);
    t.true(html.includes('Prioritní todočko'));
    t.true(html.includes('high'));
});

test.serial('it allows editing todo', async (t) => {
    const inserted = await db.insert(todosTable).values({
        title: 'Původní název',
        priority: 'medium',
        done: false,
    }).returning();

    const todo = inserted[0];

    const formData = new FormData();
    formData.set('title', 'Upravený název');
    formData.set('priority', 'low');

    const response = await app.request(`/todos/${todo.id}`, {
        method: 'POST',
        body: formData,
        headers: {
            Referer: `/todos/${todo.id}`,
        },
    })

    t.is(response.status, 302);
    t.is(response.headers.get('location'), `/todos/${todo.id}`);

    const updatedTodo = await db
        .select()
        .from(todosTable)
        .where(eq(todosTable.id, todo.id))
        .get()

    t.is(updatedTodo.title, 'Upravený název');
    t.is(updatedTodo.priority, 'low');
});

test.serial('it allows toggling todo done state', async (t) => {
    const inserted = await db.insert(todosTable).values({
        title: 'Toggle todočko',
        priority: 'normal',
        done: false,
    }).returning();

    const todo = inserted[0];

    const response = await app.request(`/todos/${todo.id}/toggle`, {
        headers: {
            Referer: '/',
        },
    });

    t.is(response.status, 302);
    t.is(response.headers.get('location'), '/');

    const updatedTodo = await db
        .select()
        .from(todosTable)
        .where(eq(todosTable.id, todo.id))
        .get();

    t.is(updatedTodo.done, true);
});