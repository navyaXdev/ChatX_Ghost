import sqlite3

DB_PATH = "chatx.db"

def get_connection(): #function we'll call every time a route needs to talk to the database, instead of repeating connection code everywhere
    conn = sqlite3.connect(DB_PATH) #opens (or creates, if it doesn't exist) the file chatx.db and returns a connection object
    conn.row_factory = sqlite3.Row #this single line tells SQLite to give you query results as dictionary-like objects instead of plain tuples
    return conn

def init_db():
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            messageId INTEGER PRIMARY KEY AUTOINCREMENT,
            conversationId TEXT NOT NULL,
            senderName TEXT NOT NULL,
            ciphertext TEXT NOT NULL,
            iv TEXT NOT NULL,
            timestamp INTEGER NOT NULL
        )
    """) #Triple quotes allow multi-line strings.
    conn.commit() #Saves (commits) the changes to the database file permanently
    conn.close() #Closes the database connection to free up memory and prevent file lock issues.


if __name__ == "__main__":
    init_db()
    print("Database initialized: chatx.db, table 'messages' ready.")