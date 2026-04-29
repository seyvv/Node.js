import ejs from 'ejs'
import { todosTable } from './schema.js'
import { db } from './db.js'
import { eq } from 'drizzle-orm'

/**
 * @type {Map<WSContext<WebSocket>>}
 */
export const webSockets = new Map()

export const sendTodosToAllWebSockets = async () => {
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

export const sendTodoDetailToSubscribers = async (todoId) => {
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

export const sendTodoDeletedToSubscribers = async (todoId) => {
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