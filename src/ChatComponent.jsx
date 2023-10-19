import { useState, useEffect } from 'react';
import { HubConnectionBuilder } from '@microsoft/signalr';
import { messageBaseUrl } from "./Url";
import * as signalR from "@microsoft/signalr";
// import Box from "./Box";

// eslint-disable-next-line react/prop-types
export const ChatComponent = ({ name, id, token }) => {
    const [connection, setConnection] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageToBeSent, setmessageToBeSent] = useState('');
    const [recipientId, setRecipientId] = useState('');

    useEffect(() => {
        if (id) {
            console.log("...HubConnectionBuilder started");
            const newConnection = new HubConnectionBuilder()
                .withUrl(messageBaseUrl + `chat?userId=${encodeURIComponent(id)}`, {
                    accessTokenFactory: () => token
                })
                .withAutomaticReconnect()
                .configureLogging(signalR.LogLevel.Trace)
                .build();
            console.log(newConnection, "newConnection");
            console.log("...HubConnectionBuilder end");

            console.log("... starting the connection, invoking onConnectedAsync")
            newConnection.start()
                .then(() => {
                    console.log(`${name} Connected!`);

                    // invoking ReceiveMessage here after receiving the message
                    newConnection.on('ReceiveMessage', (message) => {
                        console.log("message", message);
                        setMessages(prevMessages => [...prevMessages, message]);

                        // Invoke SendDelivered here after receiving the message
                        const messageId = message.id;
                        newConnection.invoke('SendDelivered', messageId)
                            .then(() => {
                                console.log('SendDelivered method invoked successfully for id: ', messageId);
                            })
                            .catch(error => {
                                console.error('Error invoking SendDelivered method:', error);
                            });
                    });

                    newConnection.on('ReceiveDelivered', (deliveredMessage) => {
                        setMessages(prevMessages => {
                            return prevMessages.map(msg => {
                                if (msg.id === deliveredMessage.id) {
                                    return {
                                        ...msg,
                                        isDelivered: true
                                    };
                                }
                                return msg;
                            });
                        });
                    });

                    newConnection.on('ReceiveSeen', (deliveredMessage) => {
                        setMessages(prevMessages => {
                            return prevMessages.map(msg => {
                                if (msg.id === deliveredMessage.id) {
                                    return {
                                        ...msg,
                                        isRead: true
                                    };
                                }
                                return msg;
                            });
                        });
                    });

                    newConnection.on('ReceiveDeleted', (message) => {
                        setMessages(prevMessages => {
                            return prevMessages.filter(msg => msg.id !== message.id)
                        });
                    });
                })

                .catch(e => console.log('Connection failed: ', e));

            setConnection(newConnection);

            console.log("... onConnectedAsync end")

            return () => {
                newConnection.stop();
            };
        }
    }, [id, name, token]);

    const sendMessage = async () => {
        try {
            if (connection) {
                console.log("Attempting to send message:", recipientId, messageToBeSent);

                const messageRequest = {
                    ReceiverId: recipientId,
                    MessageContent: messageToBeSent
                }

                await connection.invoke('SendMessage', messageRequest);
                console.log("Message sent:", recipientId, messageToBeSent);
                setmessageToBeSent('');
            }
        } catch (error) {
            console.error("----sendMessageError-----", error);
        }
    };

    const viewMessage = async (messageId) => {
        try {
            if (connection) {
                console.log("Attempting to send read message:", messageId);
                await connection.invoke('SendSeen', messageId);
            }
        } catch (error) {
            console.log("*** Error while sending read", error);
        }
    }

    const deleteForBoth = async (messageId) => {
        try {
            if (connection) {
                console.log("Attempting to delete message for both:", messageId);
                await connection.invoke('DeleteBoth', messageId);
            }
        } catch (error) {
            console.log("*** Error while deleting ", error);

        }
    }

    const deleteForSelf = async (messageId) => {
        try {
            if (connection) {
                console.log("Attempting to delete message for both:", messageId);
                await connection.invoke('DeleteSelf', messageId);
            }
        } catch (error) {
            console.log("*** Error while deleting ", error);
        }
    }

    return (
        <div>
            <div>
                <input
                    type="text"
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    placeholder="Id"
                />
                <input
                    type="text"
                    value={messageToBeSent}
                    onChange={(e) => setmessageToBeSent(e.target.value)}
                    placeholder="Type your message..."
                />
                <button onClick={sendMessage}>Send</button>
            </div>
            <div>
                {messages.map(msg => (
                    <div key={msg.id}>
                        {msg.messageContent} {" "}
                        {msg.senderId === id ? msg.isDelivered ? " Delivered " : "Not-Delivered " : ''}
                        {msg.senderId === id ?
                            msg.isRead
                                ? " Read " : " Not-Read " :
                            <span onClick={() => viewMessage(msg.id)}>
                                View
                            </span>
                        }
                        {msg.senderId === id ?
                            <span>
                                <span onClick={() => deleteForBoth(msg.id)}>Delete for both </span>
                                <span onClick={() => deleteForSelf(msg.id)}>Delete for me </span>
                            </span>
                            :
                            <span onClick={() => deleteForSelf(msg.id)}> Delete for me </span>
                        }
                        <p>----------------------------------------------</p>
                    </div>
                ))}
            </div>
        </div>
    );

}