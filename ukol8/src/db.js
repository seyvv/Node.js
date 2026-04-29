import { drizzle } from 'drizzle-orm/libsql'

export const db = drizzle({
    connection: {
        url: process.env.NODE_ENV === 'test'
            ? ":memory:"
            : "file:db.sqlite",
    },
    logger: process.env.NODE_ENV !== 'test',
})