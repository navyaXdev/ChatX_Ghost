from flask import Flask, request, jsonify
from db import get_connection, init_db
import time
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
init_db()

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200

@app.route("/messages", methods=["POST"])
def send_message():
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Invalid JSON body"}), 400

    conversation_id = data.get("conversationId")
    sender_name = data.get("senderName")
    ciphertext = data.get("ciphertext") #The encrypted message content.
    iv = data.get("iv") #Initialization Vector for decrypting the message.

    if not all([conversation_id, sender_name, ciphertext, iv]):
        return jsonify({"error": "Missing required field"}), 400 #If missing, returns a JSON error message along with HTTP Status Code 400 Bad Request, stopping further execution.

    conn = get_connection()
    conn.execute(
        "INSERT INTO messages (conversationId, senderName, ciphertext, iv, timestamp) VALUES (?, ?, ?, ?, ?)",  #The ? placeholders tell SQLite "treat these as pure data, never as SQL code," no matter what the user typed.
        (conversation_id, sender_name, ciphertext, iv, int(time.time()))
    )
    conn.commit()
    conn.close()

    return jsonify({"status": "sent"}), 201 #with HTTP Status Code 201 Created, indicating the message was successfully stored.

@app.route("/messages", methods=["GET"])
def get_messages():
    conversation_id = request.args.get("conversationId") #request.args is an ImmutableMultiDict that holds the parsed query string parameters from the URL, which basically reads query parameters from the URL (e.g., /messages?conversationId=room123)
    since = request.args.get("since", default=0, type=int) #since parameter is typically used as a URL query parameter to filter data based on a specific timestamp or ID

    if not conversation_id:
        return jsonify({"error": "conversationId is required"}), 400

    conn = get_connection()
    rows = conn.execute(
        "SELECT messageId, senderName, ciphertext, iv, timestamp FROM messages WHERE conversationId = ? AND messageId > ? ORDER BY messageId ASC",
        (conversation_id, since)
    ).fetchall()
    conn.close()

    messages = [dict(row) for row in rows]
    return jsonify(messages), 200

@app.route("/messages", methods=["DELETE"])
def delete_conversation():
    conversation_id = request.args.get("conversationId")
    if not conversation_id:
        return jsonify({"error": "conversationId is required"}), 400

    conn = get_connection()
    conn.execute("DELETE FROM messages WHERE conversationId = ?", (conversation_id,))
    conn.commit()
    conn.close()

    return jsonify({"status": "deleted"}), 200

if __name__ == "__main__":
    app.run(debug=True, port=8000)