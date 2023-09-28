import { useState, useEffect } from 'react';
import { HubConnectionBuilder } from '@microsoft/signalr';
import { useLocation } from 'react-router-dom';
import { AllUsers } from "./AllUsers";

export const ChatComponent = () => {

    const location = useLocation();
    const { name, id } = location.state;
    const [connection, setConnection] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageToBeSent, setmessageToBeSent] = useState('');
    const [recipientId, setRecipientId] = useState('');

    // const [unreadCounts, setUnreadCounts] = useState({});


    const selectUser = (userId) => {
        setRecipientId(userId);
    }

    useEffect(() => {
        console.log(name, "....", name);
        const newConnection = new HubConnectionBuilder()
            // .withUrl(`http://localhost:5234/chat?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`)
            .withUrl(`http://localhost:5234/chat?userId=${encodeURIComponent(id)}`)
            .withAutomaticReconnect()
            .build();
        console.log(newConnection, "newConnection");
        setConnection(newConnection);
    }, []);

    useEffect(() => {
        if (connection) {
            console.log("starting the connection, invoking onConnectedAsync")
            connection.start()
                .then(() => {
                    console.log(`${name} Connected!`);

                    connection.on('ReceiveMessage', (user, message) => {
                        console.log("message Received from", user, "message", message);
                        setMessages(prevMessages => [...prevMessages, { user, message }]);
                    });

                    connection.on('MessageSentConfirmation')

                    // connection.on("MessageSent")
                })
                .catch(e => console.log('Connection failed: ', e));
        }
    }, [connection, name]);

    const sendMessage = async () => {
        try {
            if (connection) {
                console.log("Attempting to send message:", recipientId, messageToBeSent);

                await connection.invoke('SendMessage', recipientId, messageToBeSent);
                console.log("Message sent:", recipientId, messageToBeSent);
                console.log(recipientId, messageToBeSent);
                setmessageToBeSent('');
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div>
            <h2>Welcome, {name}</h2>
            {/* <AllUsers onUserSelect={selectUser} currentUserId={id} /> */}
            <div>
                <input
                    type="text"
                    value={messageToBeSent}
                    onChange={(e) => setmessageToBeSent(e.target.value)}
                    placeholder="Type your message..."
                />
                <button onClick={sendMessage}>Send</button>
            </div>
            <div>
                {messages.map((msg, index) => (
                    <div key={index}>
                        <strong>{msg.senderId === id ? "You" : msg.user}</strong>: {msg.message}
                    </div>
                ))}
            </div>
        </div>
    );

}