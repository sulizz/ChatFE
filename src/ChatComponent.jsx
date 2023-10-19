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
    const [editedMessage, setEditedMessage] = useState('');
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
                        console.log("---ReceiveDelivered is called", deliveredMessage)

                        setMessages(prevMessages => {
                            return prevMessages.map(msg => {
                                if (msg.id === deliveredMessage.id) {
                                    return {
                                        ...msg,
                                        isDelivered: deliveredMessage.isDelivered
                                    };
                                }
                                return msg;
                            });
                        });
                    });

                    newConnection.on('ReceiveSeen', (deliveredMessage) => {
                        console.log("---ReceiveSeen is called", deliveredMessage)

                        setMessages(prevMessages => {
                            return prevMessages.map(msg => {
                                if (msg.id === deliveredMessage.id) {
                                    return {
                                        ...msg,
                                        isRead: deliveredMessage.isRead
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

                    newConnection.on('ReceiveEdit', (editedMessage) => {
                        console.log("---ReceiveEdit called", editedMessage)
                        setMessages(prevMessages => {
                            return prevMessages.map(msg => {
                                if (msg.id === editedMessage.id) {
                                    return {
                                        ...msg,
                                        messageContent: editedMessage.messageContent
                                    };
                                }
                                return msg;
                            });
                        });
                    })
                })

                .catch(e => console.log('Connection failed: ', e));

            setConnection(newConnection);

            console.log("... onConnectedAsync end")

            return () => {
                console.log("...CONNECTION STOP CALLED....")

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

    const editMessage = async (id) => {
        try {
            if (connection) {
                console.log("Attempting to Edit message: ", editedMessage, id);
                const messageRequest = {
                    MessageContent: editedMessage,
                    MessageId: id
                };

                await connection.invoke('SendEdit', messageRequest);
                console.log("Edit Message: sent ",);
                setEditedMessage('');
            }
        } catch (error) {
            console.error("----Edit Message Error-----", error);
        }
    }

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
            <br />
            <div>
                {messages.map(msg => (
                    <div key={msg.id}>
                        <p>
                            {msg.senderId} {" ===> "}
                            {msg.messageContent} {" "}
                        </p>
                        <div>
                            <span><strong>Message Status:</strong></span>
                            {msg.senderId === id ? msg.isDelivered ? <span><u>Delivered</u></span> : <span><u>Not Delivered</u></span> : ''}
                            {" "}
                            {msg.senderId === id ?
                                msg.isRead ? <span><u>Read</u></span> : <span><u>Not Read</u></span>
                                :
                                <>
                                    <button onClick={() => viewMessage(msg.id)}>View</button>
                                </>
                            }
                        </div>
                        {msg.senderId === id ?
                            <>
                                <input
                                    type="text"
                                    value={editedMessage}
                                    onChange={(e) => setEditedMessage(e.target.value)}
                                    placeholder={msg.messageContent}
                                />
                                <button onClick={() => editMessage(msg.id)}>Edit Message</button>
                            </>
                            : ''}
                        <br />
                        {msg.senderId === id ?
                            <span>
                                <button onClick={() => deleteForBoth(msg.id)}>Delete for both </button>
                                <button onClick={() => deleteForSelf(msg.id)}>Delete for me </button>
                            </span>
                            :
                            <button onClick={() => deleteForSelf(msg.id)}> Delete for me </button>
                        }
                        <p>----------------------------------------------</p>
                    </div>
                ))}
            </div>
        </div >
    );

}